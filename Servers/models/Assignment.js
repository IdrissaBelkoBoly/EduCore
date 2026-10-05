import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Le titre est obligatoire"],
      trim: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Le cours associé est obligatoire"],
    },

    // 🟢 Qui a créé ce devoir ? (Formateur ou Admin)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    dueDate: {
      type: Date,
    },
    instructions: {
      type: String,
      trim: true,
    },
    resourceUrl: {
      type: String, // URL de la vidéo, du PDF ou de l'image
      default: "",
    },

    // 🟢 AJOUT : URL pour le vocal des consignes
    instructionAudioUrl: {
      type: String,
      default: "",
    },

    // 🟢 AJOUT : URL pour l'image / schéma d'exemple annoté
    annotatedImageUrl: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Assignment", assignmentSchema);
