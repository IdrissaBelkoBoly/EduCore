import express from "express";
import Course from "../models/Course.js";
import Submission from "../models/Submission.js";
import User from "../models/User.js";
import {
  protect,
  authorize,
  isApprovedTeacher,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

// Middleware de protection global pour ce routeur
router.use(
  protect,
  authorize("teacher", "formateur", "admin"),
  isApprovedTeacher,
);

// 🟢 1. GET /api/teacher/students - Liste des élèves inscrites aux cours du formateur
router.get("/students", async (req, res) => {
  try {
    const teacherId = req.user._id;

    const teacherCourses = await Course.find({ formateur: teacherId }).select(
      "_id",
    );
    const teacherCourseIds = teacherCourses.map((c) => c._id);

    const students = await User.find({
      role: "student",
      allowedCourses: { $in: teacherCourseIds },
    })
      .select("-password")
      .populate("allowedCourses", "title titre");

    return res.status(200).json({
      success: true,
      data: students,
    });
  } catch (err) {
    console.error("Erreur GET /api/teacher/students:", err);
    return res.status(500).json({ message: err.message });
  }
});

// 🟢 2. GET /api/teacher/courses - Cours du formateur
router.get("/courses", async (req, res) => {
  try {
    const teacherId = req.user._id;
    const courses = await Course.find({ formateur: teacherId });
    return res.json({ success: true, data: courses });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 🟢 3. GET /api/teacher/all-students - Liste de TOUTES les élèves pour l'inscription
router.get("/all-students", async (req, res) => {
  try {
    const students = await User.find({ role: "student" }).select("-password");
    return res.status(200).json({
      success: true,
      data: students,
    });
  } catch (err) {
    console.error("Erreur GET /api/teacher/all-students:", err);
    return res.status(500).json({ message: err.message });
  }
});

// 🟢 4. POST /api/teacher/toggle-access - Accorder ou retirer l'accès à un cours
router.post("/toggle-access", async (req, res) => {
  try {
    const { studentId, courseId, action } = req.body;

    if (!studentId || !courseId || !action) {
      return res.status(400).json({ message: "Paramètres manquants." });
    }

    let updateQuery = {};

    if (action === "grant") {
      updateQuery = { $addToSet: { allowedCourses: courseId } };
    } else if (action === "revoke") {
      updateQuery = { $pull: { allowedCourses: courseId } };
    } else {
      return res.status(400).json({ message: "Action invalide." });
    }

    const updatedStudent = await User.findByIdAndUpdate(
      studentId,
      updateQuery,
      { returnDocument: "after" }
    )
      .select("-password") // Masque le mot de passe
      .populate("allowedCourses", "title titre");

    if (!updatedStudent) {
      return res.status(404).json({ message: "Élève non trouvée." });
    }

    // 🟢 RENVOI DE L'ÉLÈVE COMPLET AVEC SES INFOS (NOM, EMAIL, ETC.)
    return res.status(200).json({
      success: true,
      message: `Accès ${action === "grant" ? "accordé" : "retiré"} avec succès.`,
      data: updatedStudent,
      student: updatedStudent,
      allowedCourses: updatedStudent.allowedCourses,
    });
  } catch (err) {
    console.error("Erreur POST /api/teacher/toggle-access:", err);
    return res.status(500).json({ message: err.message });
  }
});

// 🟢 5. GET /api/teacher/student-progress/:studentId - Obtenir la progression d'une élève
router.get("/student-progress/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const teacherId = req.user._id;

    // Récupérer les cours du formateur
    const teacherCourses = await Course.find({ formateur: teacherId });
    const student = await User.findById(studentId);

    if (!student) {
      return res.status(404).json({ message: "Élève non trouvée." });
    }

    // Calculer la progression pour chaque cours du formateur
    const progressData = teacherCourses.map((course) => {
      // Ex. de structure pour les étapes complétées par l'élève (à adapter selon votre Schema User/Progress)
      const completedSteps = student.completedSteps || [];
      const courseSteps = course.modules?.flatMap((m) => m.lessons) || [];
      const totalSteps = courseSteps.length || 1;

      // Calculer le nombre d'étapes validées par l'élève dans ce cours
      const completedCount = completedSteps.filter((stepId) =>
        courseSteps.some(
          (lesson) => lesson._id.toString() === stepId.toString(),
        ),
      ).length;

      const percentage = Math.round((completedCount / totalSteps) * 100);

      return {
        courseId: course._id,
        courseTitle: course.title || course.titre,
        completedCount,
        totalSteps,
        percentage: Math.min(percentage, 100),
      };
    });

    return res.status(200).json({
      success: true,
      progress: progressData,
    });
  } catch (err) {
    console.error("Erreur GET /api/teacher/student-progress:", err);
    return res.status(500).json({ message: err.message });
  }
});

// 🟢 6. GET /api/teacher/dashboard-stats
// 🟢 6. GET /api/teacher/dashboard-stats
router.get("/dashboard-stats", async (req, res) => {
  try {
    const teacherId = req.user._id;

    // 1. Nombre de cours publiés par le formateur
    const publishedCourses = await Course.countDocuments({
      formateur: teacherId,
    });

    // 2. Récupérer les IDs des devoirs créés par ce formateur
    const Assignment = (await import("../models/Assignment.js")).default;
    const myAssignments = await Assignment.find({
      createdBy: teacherId,
    }).select("_id");
    const myAssignmentIds = myAssignments.map((a) => a._id);

    // 3. Compter les soumissions en attente de validation ("pending")
    const pendingDevoirs = await Submission.countDocuments({
      status: "pending",
      $or: [
        { assignment: { $in: myAssignmentIds } },
        { assignment: null },
        { assignment: { $exists: false } },
      ],
    });

    // 4. Nombre d'élèves inscrites aux cours du formateur
    let activeStudentsCount = 0;
    const teacherCourses = await Course.find({ formateur: teacherId }).select(
      "_id",
    );
    const teacherCourseIds = teacherCourses.map((c) => c._id);

    if (teacherCourseIds.length > 0) {
      activeStudentsCount = await User.countDocuments({
        role: "student",
        allowedCourses: { $in: teacherCourseIds },
      });
    }

    return res.json({
      publishedCourses,
      pendingDevoirs,
      activeStudents: activeStudentsCount,
    });
  } catch (err) {
    console.error("Erreur Dashboard Stats:", err);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
