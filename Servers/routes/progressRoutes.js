import express from "express";
const router = express.Router();

// Importation des méthodes du contrôleur de progression
import {
  getCourseProgress,
  toggleStepProgress,
  getMyProgress,
  getStudentProgressForTeacher, // 🟢 Import de la fonction pour le formateur
} from "../controllers/progressController.js";

// Importation du middleware pour s'assurer que l'utilisateur est connecté
import { protect } from "../middlewares/authMiddleware.js";

// Toutes ces routes requièrent une authentification par token JWT
router.use(protect);

/**
 * @route   GET /api/progress/my-progress
 * @desc    Récupérer toutes les progressions de l'étudiante connectée
 * @access  Privé (Étudiante uniquement)
 * ⚠️ PLACÉE AVANT LES ROUTES PAR ID POUR ÉVITER QU'ELLE SOIT INTERPRÉTÉE COMME UN courseId
 */
router.get("/my-progress", getMyProgress);

/**
 * @route   GET /api/progress/student/:studentId
 * @desc    Récupérer l'ensemble des progressions d'une étudiante spécifique (Pour la vue Formateur)
 * @access  Privé (Formateur / Admin)
 * ⚠️ PLACÉE ÉGALEMENT AVANT /:courseId
 */
router.get("/student/:studentId", getStudentProgressForTeacher);

/**
 * @route   GET /api/progress/:courseId
 * @desc    Récupérer le pourcentage et l'état des étapes pour un cours donné
 * @access  Privé
 */
router.get("/:courseId", getCourseProgress);

/**
 * @route   PUT /api/progress/:courseId/step
 * @desc    Cocher/Décocher une étape et recalculer la progression
 * @access  Privé (Étudiante uniquement)
 */
router.put("/:courseId/step", toggleStepProgress);

export default router;
