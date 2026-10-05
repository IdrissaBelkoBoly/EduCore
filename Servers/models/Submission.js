import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },

    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    submissionUrl: {
      type: String, // Lien vers le fichier envoyé par l'étudiante (PDF/Image)
      required: true,
    },

    studentAudioUrl: {
      type: String,
      default: "",
    },

    comment: {
      type: String, // Message/Texte d'accompagnement de l'étudiante
    },
    status: {
      type: String,
      enum: ["pending", "graded", "approved", "rejected"],
      default: "pending",
    },
    grade: {
      type: Number, // Note attribuée par le formateur (ex: /20)
    },
    feedback: {
      type: String, // Remarque ou correction du formateur
    },

    // 🟢 AJOUT : Feedback Audio & Photo Annotée par le formateur
    feedbackAudioUrl: {
      type: String, // Lien vers le fichier audio enregistre/uploade
      default: "",
    },
    annotatedImageUrl: {
      type: String, // Lien vers la photo ou image corrigee/annotee
      default: "",
    },

    correctedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // ID du formateur qui a corrigé
    },
    correctedAt: {
      type: Date,
    },

    // 🟢 Nouveau champ pour masquer/archiver le devoir côté élève
    isArchivedByStudent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Submission", submissionSchema);
