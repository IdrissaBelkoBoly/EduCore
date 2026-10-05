import mongoose from "mongoose";

const homeworkSchema = new mongoose.Schema(
  {
    // 🟢 AJOUT : Lien vers la consigne créée par le formateur (facultatif si devoir libre)
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      default: null,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    comment: {
      type: String,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    grade: {
      type: Number, // Note attribuée par le Formateur / Admin
      min: 0,
      max: 20,
      default: null,
    },
    feedback: {
      type: String, // Commentaire de correction
      default: "",
    },
  },
  { timestamps: true },
);

// Sécurisation Mongoose
const Homework =
  mongoose.models.Homework || mongoose.model("Homework", homeworkSchema);

export default Homework;
