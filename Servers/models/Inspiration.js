import mongoose from "mongoose";

const InspirationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Le titre de l'inspiration est obligatoire"],
      trim: true,
    },
    imageUrl: {
      type: String,
      required: [true, "L'URL de l'image est obligatoire"],
      trim: true, // Stockera le lien de l'image (hébergée sur Cloudinary, Firebase Storage, S3, etc.)
    },
    category: {
      type: String,
      enum: [
        "Nail Art",
        "Pose Complète",
        "Formes & Limage",
        "Tendances",
        "Capsules",
      ],
      required: [true, "La catégorie est obligatoire"],
    },
    tags: [
      {
        type: String, // Permet de filtrer (ex: "Paillettes", "French", "Gel", "Nude")
        trim: true,
      },
    ],

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // AJOUT : Permet de lier une inspiration à un cours existant
    linkedCourse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
    
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Référence l'admin qui a posté l'image
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true, // Permet à l'admin de masquer une photo de la grille si besoin
    },
  },
  {
    timestamps: true, // Permet d'afficher les nouveautés en premier dans la grille
  },
);

const Inspiration = mongoose.model("Inspiration", InspirationSchema);
export default Inspiration;
