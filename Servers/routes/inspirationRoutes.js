import express from "express";
const router = express.Router();

import {
  getInspirations,
  createInspiration,
  toggleLikeInspiration,
  deleteInspiration,
} from "../controllers/inspirationController.js";

import { protect, authorize } from "../middlewares/authMiddleware.js";

// Sécurité : Toutes les routes nécessitent d'être connecté
router.use(protect);

// Accès à la galerie globale (GET pour tout le monde, POST pour l'admin)
router
  .route("/")
  .get(getInspirations)
  .post(authorize("admin"), createInspiration);

// Liker une photo (PUT accessible uniquement aux étudiantes)
router.route("/:id/like").put(authorize("student"), toggleLikeInspiration);

// Supprimer une photo de la galerie (DELETE pour l'admin)
router.route("/:id").delete(authorize("admin"), deleteInspiration);

export default router;
