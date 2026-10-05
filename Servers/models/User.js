import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, "Le nom est obligatoire"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "L'adresse email est obligatoire"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Veuillez fournir une adresse email valide",
      ],
    },
    password: {
      type: String,
      required: [false, "Le mot de passe n'est pas obligatoire"],
      minlength: [6, "Le mot de passe doit contenir au moins 6 caractères"],
      select: false,
    },
    authMethod: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      default: "student",
    },
    avatar: {
      type: String,
      default: "default-avatar.png",
    },
    isActive: {
      type: Boolean,
      default: function () {
        return this.role !== "teacher"; // true pour student/admin, false pour formateur
      },
    },

    // 🟢 CHAMPS PAIEMENT & DATES
    totalPrice: {
      type: Number,
      default: 1000,
    },
    pricePaid: {
      type: Number,
      default: 0,
    },
    paymentDeadline: {
      type: Date,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },

    // 🟢 CHAMPS DE BLOCAGE
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isManuallyUnblocked: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["active", "suspended", "completed", "pending"],
      default: "pending",
    },

    lastAccessedCourse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
    allowedCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],

    completedSteps: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Step", // ou simplement stocker les ID des étapes validées
      },
    ],

    recommendedCertificates: [
      {
        course: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Course",
        },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        recommendedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    speciality: { type: String, default: "" },
    bio: { type: String, default: "" },
  },
  {
    timestamps: true,
  },
);

// Middleware Mongoose pour le hachage du mot de passe
UserSchema.pre("save", async function () {
  if (!this.password || !this.isModified("password")) {
    return;
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw new Error(error);
  }
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", UserSchema);
export default User;
