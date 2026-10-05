import express from "express";
import upload from "../middlewares/uploadMiddleware.js";
import {
  submitAssignment,
  getMySubmissions,
  getTeacherSubmissions,
  gradeSubmission,
  deleteSubmission,
  deleteMySubmission,
  archiveMySubmission,
} from "../controllers/submissionController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

// ==========================================
// 🎓 ROUTES ÉLÈVES
// ==========================================

router.get("/my-submissions", authorize("student"), getMySubmissions);

router.post(
  "/submit",
  authorize("student"),
  upload.fields([
    { name: "submissionFile", maxCount: 1 },
    { name: "file", maxCount: 1 },
    { name: "audio", maxCount: 1 },
  ]),
  submitAssignment,
);

// 🟢 Route pour masquer/archiver un devoir de sa liste
router.patch(
  "/my-submissions/:id/archive",
  authorize("student"),
  archiveMySubmission,
);

// 🟢 Route pour supprimer son devoir (uniquement statut "pending")
router.delete("/my-submissions/:id", authorize("student"), deleteMySubmission);

// ==========================================
// 👩‍🏫 ROUTES FORMATEUR / ADMIN
// ==========================================

router.get("/pending", authorize("admin", "teacher"), getTeacherSubmissions);
router.get("/admin/all", authorize("admin", "teacher"), getTeacherSubmissions);
router.get(
  "/teacher/submissions",
  authorize("admin", "teacher"),
  getTeacherSubmissions,
);

router.put(
  "/grade/:id",
  authorize("admin", "teacher"),
  upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "annotatedImage", maxCount: 1 },
    { name: "feedbackFile", maxCount: 1 },
  ]),
  gradeSubmission,
);

router.put(
  "/admin/review/:id",
  authorize("admin", "teacher"),
  upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "annotatedImage", maxCount: 1 },
    { name: "feedbackFile", maxCount: 1 },
  ]),
  gradeSubmission,
);

router.delete("/:id", authorize("admin", "teacher"), deleteSubmission);

export default router;
