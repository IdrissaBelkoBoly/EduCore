import mongoose from "mongoose";

const CertificateSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "L'étudiante est obligatoire"],
    },
    // Rendu optionnel pour gérer les certificats finaux de cursus complet
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
    formateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Le formateur est obligatoire"],
    },
    type: {
      type: String,
      enum: ["module", "final"],
      default: "module",
    },
    isFinal: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    encouragementMessage: {
      type: String,
      default: "",
    },
    pdfUrl: {
      type: String,
      default: "",
    },
    issuedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Index composé pour l'unicité
CertificateSchema.index(
  { student: 1, course: 1 },
  { unique: true, sparse: true },
);

const Certificate = mongoose.model("Certificate", CertificateSchema);
export default Certificate;
