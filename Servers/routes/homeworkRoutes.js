import express from "express";
import multer from "multer";
import Homework from "../models/Homework.js";
import Assignment from "../models/Assignment.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

/* =========================================================
   PARTIE 1 : CONSIGNES ET CRÉATION DE DEVOIRS (PROF & ADMIN)
   ========================================================= */

// 🟢 A. CRÉER / POSER UN DEVOIR (Professeur et Admin)
router.post(
  "/create",
  protect,
  authorize("admin", "teacher"),
  async (req, res) => {
    try {
      const { title, description, courseId, dueDate } = req.body;

      if (!title || !description || !courseId || !dueDate) {
        return res
          .status(400)
          .json({ message: "Tous les champs sont obligatoires." });
      }

      const newAssignment = new Assignment({
        title,
        description,
        courseId,
        dueDate,
        createdBy: req.user._id,
      });

      await newAssignment.save();
      res.status(201).json({ success: true, data: newAssignment });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

// 🟢 B. OBTENIR TOUS LES DEVOIRS D'UN COURS
router.get("/course/:courseId", protect, async (req, res) => {
  try {
    const assignments = await Assignment.find({
      courseId: req.params.courseId,
    }).sort({ dueDate: 1 });
    res.json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 🔴 C. SUPPRIMER UN DEVOIR POSÉ (Prof ou Admin)
router.delete(
  "/assignment/:id",
  protect,
  authorize("admin", "teacher"),
  async (req, res) => {
    try {
      await Assignment.findByIdAndDelete(req.params.id);
      res.json({ success: true, message: "Devoir supprimé avec succès." });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

/* =========================================================
   PARTIE 2 : SOUMISSIONS & CORRECTIONS (ÉLÈVES / PROF / ADMIN)
   ========================================================= */

// 1. L'ÉTUDIANTE ENVOIE SON DEVOIR
router.post("/submit", protect, upload.single("file"), async (req, res) => {
  try {
    const { courseId, assignmentId, comment } = req.body;
    if (!req.file)
      return res.status(400).json({ message: "Fichier manquant." });

    const isVideo = req.file.mimetype.startsWith("video/");

    const newHomework = new Homework({
      student: req.user._id,
      courseId,
      assignmentId: assignmentId || null,
      comment,
      fileUrl: `/uploads/${req.file.filename}`,
      fileType: isVideo ? "video" : "image",
    });

    await newHomework.save();
    res.status(201).json({ success: true, data: newHomework });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. L'ÉTUDIANTE VOIT SES DEVOIRS RENDUS
router.get("/my-submissions", protect, async (req, res) => {
  try {
    const submissions = await Homework.find({ student: req.user._id })
      .populate("courseId", "title")
      .populate("assignmentId", "title description dueDate")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: submissions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 🟢 3. LE FORMATEUR VOIT SEULEMENT LES DEVOIRS DESTINÉS À SES DEVOIRS POSÉS
router.get(
  "/teacher/my-submissions",
  protect,
  authorize("admin", "teacher"),
  async (req, res) => {
    try {
      // 1. Récupérer les devoirs posés par l'utilisateur connecté
      const myAssignments = await Assignment.find({
        createdBy: req.user._id,
      }).select("_id");
      const assignmentIds = myAssignments.map((a) => a._id);

      // 2. Récupérer uniquement les devoirs soumis pour ces consignes
      const submissions = await Homework.find({
        assignmentId: { $in: assignmentIds },
      })
        .populate("student", "nom email name")
        .populate("courseId", "title")
        .populate("assignmentId", "title")
        .sort({ createdAt: -1 });

      res.json({ success: true, data: submissions });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

// 4. L'ADMIN VOIT TOUS LES DEVOIRS REÇUS DU SYSTÈME
router.get("/admin/all", protect, authorize("admin"), async (req, res) => {
  try {
    const allSubmissions = await Homework.find()
      .populate("student", "nom email name")
      .populate("courseId", "title")
      .populate("assignmentId", "title")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: allSubmissions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 5. L'ADMIN ET LE PROFESSEUR CORRIGENT UN DEVOIR (Approuver / Rejeter + Note + Commentaire)
router.put(
  "/admin/review/:id",
  protect,
  authorize("admin", "teacher"),
  async (req, res) => {
    try {
      const { status, feedback, grade } = req.body;
      const homework = await Homework.findById(req.params.id);

      if (!homework)
        return res.status(404).json({ message: "Devoir introuvable." });

      if (status) homework.status = status;
      if (feedback !== undefined) homework.feedback = feedback;
      if (grade !== undefined) homework.grade = grade;

      await homework.save();

      res.json({ success: true, data: homework });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

export default router;
