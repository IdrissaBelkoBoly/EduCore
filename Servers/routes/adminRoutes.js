import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import User from "../models/User.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// 1. S'assurer que le dossier 'uploads/' existe bien sur le serveur
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. Configuration du stockage Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

// 3. Récupérer le profil admin connecté
router.get("/profile", protect, authorize("admin"), async (req, res) => {
  try {
    const admin = await User.findById(req.user._id).select("-password");
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. Mettre à jour le profil admin + photo
router.put(
  "/profile",
  protect,
  authorize("admin"),
  upload.single("avatar"),
  async (req, res) => {
    try {
      const admin = await User.findById(req.user._id).select("+password");

      if (!admin) {
        return res.status(404).json({ message: "Administrateur non trouvé" });
      }

      admin.nom = req.body.nom || admin.nom;
      admin.email = req.body.email || admin.email;
      admin.telephone = req.body.telephone || admin.telephone;

      if (req.file) {
        admin.avatar = req.file.filename;
      }

      if (req.body.newPassword && req.body.newPassword.trim() !== "") {
        if (req.body.currentPassword) {
          const isMatch = await admin.matchPassword(req.body.currentPassword);
          if (!isMatch) {
            return res
              .status(400)
              .json({ message: "Le mot de passe actuel est incorrect" });
          }
        }
        admin.password = req.body.newPassword;
      }

      await admin.save();

      res.json({
        success: true,
        message: "Profil mis à jour avec succès",
        admin: {
          _id: admin._id,
          nom: admin.nom,
          email: admin.email,
          telephone: admin.telephone,
          avatar: admin.avatar,
        },
      });
    } catch (error) {
      console.error("Erreur serveur lors de la mise à jour du profil :", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// -------------------------------------------------------------
// 🟢 NOUVELLES ROUTES : CONFIGURATION PAIEMENT EN BASE DE DONNÉES
// -------------------------------------------------------------

// Récupérer le prix par défaut enregistré pour l'admin
router.get("/config", protect, authorize("admin"), async (req, res) => {
  try {
    const admin = await User.findById(req.user._id);
    res.json({
      defaultCoursePrice: admin?.totalPrice ?? 1000,
      defaultPaymentDeadlineDays: 30,
      bankInfo: "",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Sauvegarder la nouvelle valeur du prix
router.put("/config", protect, authorize("admin"), async (req, res) => {
  try {
    const { defaultCoursePrice } = req.body;
    await User.findByIdAndUpdate(req.user._id, {
      totalPrice: defaultCoursePrice,
    });
    res.json({
      success: true,
      message: "Paramètres de paiement mis à jour et enregistrés !",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 1. Récupérer tous les formateurs (en attente et approuvés)
router.get("/teachers", protect, authorize("admin"), async (req, res) => {
  try {
    const teachers = await User.find({ role: "formateur" }).select("-password");
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des formateurs" });
  }
});

// 2. Valider ou Refuser un formateur
router.put("/teachers/:id/status", protect, authorize("admin"), async (req, res) => {
  const { status } = req.body; // "approved" ou "rejected"

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Statut invalide" });
  }

  try {
    const teacher = await User.findById(req.params.id);
    if (!teacher || teacher.role !== "formateur") {
      return res.status(404).json({ message: "Formateur non trouvé" });
    }

    teacher.status = status;
    await teacher.save();

    res.json({ message: `Statut mis à jour avec succès : ${status}`, teacher });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du statut" });
  }
});

export default router;
