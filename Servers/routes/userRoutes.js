import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { protect } from "../middlewares/authMiddleware.js";
import User from "../models/User.js";
import { updateProfile } from "../controllers/authController.js";

const router = express.Router();

// Configuration Multer
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "avatar-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Toutes les routes utilisateurs nécessitent d'être connecté
router.use(protect);

// 👤 Obtenir son profil complet
router.get("/me", async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const user = await User.findById(userId)
      .select("-password")
      .populate("allowedCourses", "title description thumbnail category")
      .populate(
        "recommendedCertificates.course",
        "title description thumbnail",
      );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Utilisateur introuvable" });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        nom: user.nom,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
        isBlocked: user.isBlocked,
        isManuallyUnblocked: user.isManuallyUnblocked,
        status: user.status,

        // 🟢 Données de paiement & échéances
        totalPrice: user.totalPrice ?? 1000,
        pricePaid: user.pricePaid ?? 0,
        dueDate: user.dueDate || null,
        paymentDeadline: user.paymentDeadline || null,

        // 🟢 Pédagogie & Certificats
        completedSteps: user.completedSteps || [],
        allowedCourses: user.allowedCourses || [],
        lastAccessedCourse: user.lastAccessedCourse || null,
        recommendedCertificates: user.recommendedCertificates || [],

        speciality: user.speciality || "",
        bio: user.bio || "",
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Erreur GET /me :", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✏️ Modifier son profil (Nom, Téléphone, Bio, Avatar)
router.put("/profile", upload.single("avatar"), updateProfile);

// 🔒 Changer son mot de passe
router.put("/change-password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Utilisateur introuvable" });
    }

    // Vérification du mot de passe actuel
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Mot de passe actuel incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Mot de passe mis à jour !" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
