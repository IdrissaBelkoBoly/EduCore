import express from "express";
import multer from "multer";
import path from "path";
import Assignment from "../models/Assignment.js";
import {
  createAssignment,
  getAssignments,
  getTeacherAssignments,
  deleteAssignment,
  getPendingSubmissions,
} from "../controllers/assignmentController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// 🟢 Obtenir les devoirs soumis par les élèves en attente de correction
router.get(
  "/pending-submissions",
  protect,
  authorize("admin", "teacher"),
  getPendingSubmissions
);

// 🟢 Obtenir les devoirs posés par le formateur connecté
router.get(
  "/teacher/my-assignments",
  protect,
  authorize("admin", "teacher"),
  getTeacherAssignments,
);

// 🟢 Obtenir les devoirs (public / authentifié)
router.get("/", protect, getAssignments);

// 🟢 Créer un devoir avec fichiers multiples (Ressource, Audio et Photo annotée)
router.post(
  "/",
  protect,
  authorize("admin", "teacher"),
  upload.fields([
    { name: "resourceFile", maxCount: 1 },
    { name: "audio", maxCount: 1 },
    { name: "annotatedImage", maxCount: 1 },
  ]),
  createAssignment,
);

// 🔴 Supprimer un devoir (Prof & Admin)
router.delete("/:id", protect, authorize("admin", "teacher"), deleteAssignment);

export default router;
