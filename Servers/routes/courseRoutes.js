import express from "express";
const router = express.Router();

import upload from "../middlewares/uploadMiddleware.js";

import {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} from "../controllers/courseController.js";

import { protect, isApprovedTeacher } from "../middlewares/authMiddleware.js";

router.use(protect);

// 🟢 1. ROUTE RACINE (/api/courses)
router
  .route("/")
  .get(getCourses)
  .post(isApprovedTeacher, upload.single("pdfFile"), createCourse);

// 🟢 2. ROUTE ALIAS POUR LES FORMATEURS (/api/courses/teacher)
// Réutilise getCourses car il filtre déjà automatiquement selon req.user._id si le rôle est teacher
router.get("/teacher", getCourses);
router.get("/teacher/my-courses", getCourses);

// 🟢 3. ROUTE AVEC PARAMÈTRE PAR ID (/api/courses/:id)
router
  .route("/:id")
  .get(getCourseById)
  .put(isApprovedTeacher, upload.single("pdfFile"), updateCourse)
  .delete(isApprovedTeacher, deleteCourse);

export default router;
