import mongoose from "mongoose";

// Pour rendre le plan du module dynamique, chaque cours aura une sous-liste d'étapes (steps)
const StepSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Le titre de l'étape est obligatoire"],
    trim: true,
  },
  order: {
    type: Number,
    required: true, // Permet de s'assurer que les étapes s'affichent dans le bon ordre
  },
});

const CourseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Le titre du cours/module est obligatoire"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    // 🎯 Choix du type de support : "video", "pdf" ou "both"
    contentType: {
      type: String,
      enum: ["video", "pdf", "both"],
      default: "video",
    },

    videoUrl: {
      type: String,
      required: [
        function () {
          return this.contentType === "video" || this.contentType === "both";
        },
        "L'URL de la vidéo technique est obligatoire pour ce format de cours",
      ],
      trim: true,
      default: "",
    },

    pdfUrl: {
      type: String,
      trim: true, // Lien du PDF
    },

    thumbnailUrl: {
      type: String,
      default: "default-course.png", // Image de couverture de la vidéo
    },
    duration: {
      type: String,
      default: "00:00", // Exemple: "12:45"
    },

    // Le plan du module : un tableau d'étapes basé sur le sous-schéma ci-dessus
    steps: [StepSchema],

    level: {
      type: String,
      enum: ["Débutant", "Intermédiaire", "Avancé"],
      default: "Débutant",
    },

    category: {
      type: String,
      enum: ["Base", "Nail Art", "Rallongement", "Dépose", "Autre", "Autres"],
      default: "Base",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // 📜 NOUVEAU : Message de félicitations par défaut pour ce cours
    defaultCertificateMessage: {
      type: String,
      default:
        "Félicitations pour la validation de ce module ! Vous avez fait preuve de rigueur et d'engagement tout au long de la formation.",
    },

    // 🔑 Lien vers l'utilisateur (formateur ou admin) qui a créé le cours
    formateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    recommendedCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
  },
  {
    timestamps: true,
  },
);

const Course = mongoose.model("Course", CourseSchema);
export default Course;
