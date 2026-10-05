import express from "express";
import Notification from "../models/Notification.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// 🟢 GET /api/notifications - Récupérer les notifications de l'élève connecté
router.get("/", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({
      message: "Erreur récupération notifications",
      error: error.message,
    });
  }
});

// 🟢 PATCH /api/notifications/read-all - Tout marquer comme lu
// (Attention : Placer cette route AVANT la route avec :id)
router.patch("/read-all", protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id },
      { isRead: true },
    );
    res.json({ success: true });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erreur mise à jour globale", error: error.message });
  }
});

// 🟢 PATCH /api/notifications/:id/read - Marquer une notification comme lue
router.patch("/:id/read", protect, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      message: "Erreur mise à jour notification",
      error: error.message,
    });
  }
});

// 🔴 DELETE /api/notifications/clear-all - Supprimer TOUTES les notifications
// (Placé avant /:id pour éviter les conflits d'URL Express)
router.delete("/clear-all", protect, async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user._id });
    res.json({
      success: true,
      message: "Toutes les notifications ont été supprimées",
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la suppression globale",
      error: error.message,
    });
  }
});

// 🔴 DELETE /api/notifications/:id - Supprimer UNE notification spécifique
router.delete("/:id", protect, async (req, res) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id, // Sécurité : vérifie que la notif appartient bien à l'utilisateur
    });
    res.json({ success: true, message: "Notification supprimée" });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la suppression de la notification",
      error: error.message,
    });
  }
});

export default router;
