import express from "express";
import mongoose from "mongoose";
import Progress from "../models/Progress.js";
const router = express.Router();

// Importation des fonctions du contrôleur (noms harmonisés)
import {
  register,
  login,
  googleLogin,
  getMe,
  getStudentDetails,
  getStudents,
  deleteStudent,
  updateProfile,
  activateStudentWithPayment,
  registerTeacher,
  registerTeacherGoogle,
  getPendingTeachers,
  updateTeacherStatus,
} from "../controllers/authController.js";

// Importation des middlewares de protection
import { protect, authorize } from "../middlewares/authMiddleware.js";

import User from "../models/User.js";
import Course from "../models/Course.js";

import multer from "multer";
import path from "path";
import fs from "fs";

// Configuration Multer pour les images
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "avatar-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Le fichier doit être une image !"), false);
  }
};

const upload = multer({ storage, fileFilter });

/* ==========================================================================
   1. ROUTES PUBLIQUES (Authentification & Inscriptions)
   ========================================================================== */

// 🎓 Inscription Élève / Admin
router.post("/register", register);

// 🔑 Connexion Classique (Élève, Enseignant, Admin)
router.post("/login", login);

// 🌐 Connexion avec Google
router.post("/google", googleLogin);

// 👩‍🏫 Inscription Enseignant (Formulaire Classique)
router.post("/register-teacher", registerTeacher);

// 👩‍🏫 Inscription Enseignant (Via Google)
router.post("/register-teacher-google", registerTeacherGoogle);

/* ==========================================================================
   2. ROUTES PRIVÉES UTILISATEURS CONNECTÉS
   ========================================================================== */

// 👤 Obtenir son propre profil
router.get("/me", protect, getMe);

// ✏️ Mettre à jour son propre profil
router.put("/profile", protect, upload.single("avatar"), updateProfile);

// 📸 Mettre à jour uniquement la photo de profil / avatar
router.put(
  "/profile/avatar",
  protect,
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "Aucun fichier envoyé" });
      }

      const avatarUrl = `http://localhost:5000/uploads/${req.file.filename}`;

      const user = await User.findById(req.user.id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Utilisateur non trouvé" });
      }

      user.avatar = avatarUrl;
      await user.save();

      res.status(200).json({
        success: true,
        message: "Photo de profil mise à jour avec succès ! ✨",
        user: {
          id: user._id,
          nom: user.nom,
          email: user.email,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

/* ==========================================================================
   3. ROUTES D'ADMINISTRATION (Réservées au rôle "admin")
   ========================================================================== */

// 📋 👩‍🏫 Récupérer la liste des enseignants en attente de validation
router.get(
  "/admin/pending-teachers",
  protect,
  authorize("admin"),
  getPendingTeachers,
);

// 🟢 ✅ 👩‍🏫 Valider / Refuser le compte d'un enseignant
router.put(
  "/admin/teachers/:id/status",
  protect,
  authorize("admin"),
  updateTeacherStatus,
);

// 👩‍🏫 Récupérer la liste des enseignants (filtrés par statut si demandé, ex: active)
router.get(
  "/admin/teachers",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const { status } = req.query;

      // Cherche les utilisateurs avec le rôle formateur / teacher
      const filter = {
        role: { $in: ["formateur", "teacher"] },
      };

      // Si la requête contient ?status=active
      if (status) {
        filter.status = status;
      }

      const teachers = await User.find(filter).select("-password");

      res.status(200).json({
        success: true,
        count: teachers.length,
        teachers,
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des enseignants :", error);
      res.status(500).json({
        success: false,
        message: "Erreur serveur lors de la récupération des enseignants",
      });
    }
  }
);

// 👥 Récupérer la liste de tous les élèves
router.get("/admin/students", protect, authorize("admin"), async (req, res) => {
  try {
    // 1. Récupérer les élèves en populant les cours autorisés pour avoir leurs titres
    const students = await User.find({ role: "student" })
      .select("-password")
      .populate("allowedCourses", "title titre nom")
      .lean();

    // 2. Récupérer et calculer la progression moyenne pour chaque élève
    const studentsWithProgress = await Promise.all(
      students.map(async (student) => {
        // On cherche toutes les progressions enregistrées pour cette élève
        const progresses = await Progress.find({ student: student._id });

        let globalProgress = 0;
        if (progresses.length > 0) {
          const totalPercentage = progresses.reduce(
            (acc, curr) =>
              acc + (curr.globalPercentage || curr.percentage || 0),
            0,
          );
          globalProgress = Math.round(totalPercentage / progresses.length);
        }

        return {
          ...student,
          globalProgress, // Ajoute la progression globale calculée en %
        };
      }),
    );

    res.json({
      success: true,
      students: studentsWithProgress,
    });
  } catch (error) {
    console.error("Erreur récupération élèves :", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

router.get(
  "/students",
  protect,
  authorize("formateur", "teacher", "admin"),
  getStudents,
);

// 🔍 & 🗑️ Récupérer les détails d'une étudiante OU la supprimer
router
  .route("/admin/students/:id")
  .get(protect, authorize("admin"), getStudentDetails)
  .delete(protect, authorize("admin"), deleteStudent);

// 💰 Valider un paiement cash
router.put(
  "/admin/students/:id/activate",
  protect,
  authorize("admin"),
  activateStudentWithPayment,
);

// 🔑 Gérer les cours débloqués et dates limites
router.put(
  "/admin/students/:id/courses",
  protect,
  authorize("admin" , "teacher" , "formateur"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { allowedCourses, dueDate } = req.body;

      const updateFields = {};
      if (allowedCourses !== undefined)
        updateFields.allowedCourses = allowedCourses;

      if (dueDate) {
        updateFields.dueDate = dueDate;
        updateFields.paymentDeadline = dueDate;
      }

      const student = await User.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { returnDocument: "after" },
      ).select("-password");

      if (!student) {
        return res
          .status(404)
          .json({ success: false, message: "Étudiante introuvable" });
      }

      res.status(200).json({
        success: true,
        message: "Accès et date mis à jour avec succès !",
        data: student,
      });
    } catch (error) {
      console.error("Erreur mise à jour accès cours et date :", error);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  },
);

// 🔒 / 🔓 Bloquer ou débloquer manuellement une étudiante
router.put(
  "/admin/students/:id/block",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { isBlocked, isManuallyUnblocked } = req.body;

      const updateFields = {};
      if (typeof isBlocked === "boolean") updateFields.isBlocked = isBlocked;
      if (typeof isManuallyUnblocked === "boolean")
        updateFields.isManuallyUnblocked = isManuallyUnblocked;

      const student = await User.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { returnDocument: "after" },
      ).select("-password");

      if (!student) {
        return res
          .status(404)
          .json({ success: false, message: "Étudiante introuvable" });
      }

      res.status(200).json({
        success: true,
        message: isBlocked ? "Étudiante bloquée" : "Étudiante débloquée",
        data: student,
      });
    } catch (error) {
      console.error("Erreur blocage/déblocage :", error);
      res.status(500).json({
        success: false,
        message: "Erreur serveur lors de la mise à jour",
      });
    }
  },
);

// ✏️ Modifier les informations d'une étudiante
router.put(
  "/admin/students/:id/profile",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { nom, name, email, telephone, phone, adresse, address } = req.body;

      const updateFields = {};
      if (nom || name) updateFields.nom = nom || name;
      if (email) updateFields.email = email;
      if (telephone || phone) updateFields.telephone = telephone || phone;
      if (adresse || address) updateFields.adresse = adresse || address;

      const updatedStudent = await User.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { returnDocument: "after" },
      ).select("-password");

      if (!updatedStudent) {
        return res
          .status(404)
          .json({ success: false, message: "Étudiante introuvable" });
      }

      res.status(200).json({
        success: true,
        message: "Profil de l'étudiante mis à jour avec succès !",
        data: updatedStudent,
      });
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour du profil de l'étudiante :",
        error,
      );
      res.status(500).json({
        success: false,
        message: "Erreur serveur lors de la mise à jour",
      });
    }
  },
);

// 📊 Route Backend pour les statistiques & cours d'un enseignant spécifique
router.get(
  "/admin/teachers/:id/analytics",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const teacherId = req.params.id;

      // 1. Récupérer tous les cours du formateur
      const courses = await Course.find({ formateur: teacherId });
      const courseIds = courses.map((c) => c._id);

      // 2. Compter le total d'élèves uniques ayant accès à ces cours
      const totalStudents = await User.countDocuments({
        role: "student",
        allowedCourses: { $in: courseIds },
      });

      let totalRecommendedCertificates = 0;

      // 3. Récupérer les élèves pour chaque cours avec leur statut de recommandation
      const enrichedCourses = await Promise.all(
        courses.map(async (course) => {
          const students = await User.find({
            role: "student",
            allowedCourses: course._id,
          }).select("nom name email telephone recommendedCertificates");

          const courseIdStr = course._id.toString();

          // Formater les élèves pour savoir s'ils ont été recommandés pour CE cours spécifique
          const studentsList = students.map((student) => {
            // 🟢 Vérification prenant en compte l'objet { _id: courseId }
            const isRecommended = student.recommendedCertificates?.some(
              (rec) => {
                if (!rec) return false;

                // Si rec est une string ou un ObjectId direct
                if (
                  typeof rec === "string" ||
                  rec instanceof mongoose.Types.ObjectId
                ) {
                  return rec.toString() === courseIdStr;
                }

                // Si rec est un objet avec _id, course ou courseId
                const targetId = rec._id || rec.course || rec.courseId;
                return targetId ? targetId.toString() === courseIdStr : false;
              },
            );

            if (isRecommended) {
              totalRecommendedCertificates++;
            }

            return {
              _id: student._id,
              nom: student.nom || student.name || "Élève sans nom",
              email: student.email,
              isRecommendedForThisCourse: Boolean(isRecommended),
            };
          });

          const courseObj = course.toObject();
          courseObj.studentsList = studentsList;
          courseObj.enrolledStudents = students.length;
          return courseObj;
        }),
      );

      // 4. Réponse au frontend
      res.status(200).json({
        success: true,
        stats: {
          totalCourses: courses.length,
          totalStudents,
          recommendedCertificates: totalRecommendedCertificates,
        },
        courses: enrichedCourses,
      });
    } catch (error) {
      console.error("Erreur serveur métriques enseignant :", error);
      res.status(500).json({
        success: false,
        message: "Erreur serveur lors de la récupération des analytics",
      });
    }
  },
);

// 🟢 ROUTE 1 : Récupérer la liste des recommandations pour l'admin
router.get(
  "/admin/certificates/pending",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      // 1. Trouver les élèves qui ont au moins 1 certificat recommandé
      const students = await User.find({
        "recommendedCertificates.0": { $exists: true },
      }).select("nom name email recommendedCertificates");

      const recommendations = [];

      for (const student of students) {
        // 🟢 Utilisation de .entries() pour obtenir l'index de chaque recommandation
        for (const [index, rec] of student.recommendedCertificates.entries()) {
          // Extraire l'ID du cours (qu'il soit stocké en String, ObjectId ou Objet)
          const courseId = rec._id || rec.course || rec.courseId || rec;

          if (!courseId) continue;

          // Récupérer le cours et les infos du formateur
          const course = await Course.findById(courseId).populate(
            "formateur",
            "nom name email",
          );

          if (course) {
            recommendations.push({
              // 🟢 Ajout de _${index} et _${rec._id || ''} pour éviter tout doublon de clé React
              _id: `${student._id}_${course._id}_${index}`,
              student: {
                _id: student._id,
                nom: student.nom || student.name || "Élève sans nom",
                email: student.email,
              },
              course: {
                _id: course._id,
                title: course.title || course.titre || "Sans titre",
              },
              teacher: {
                _id: course.formateur?._id,
                nom:
                  course.formateur?.nom ||
                  course.formateur?.name ||
                  "Formateur inconnu",
              },
              status: rec.status || "pending", // "pending" | "approved" | "rejected"
              recommendedAt: rec.recommendedAt || new Date(),
            });
          }
        }
      }

      res.status(200).json({ success: true, recommendations });
    } catch (error) {
      console.error("Erreur serveur cartes certificats :", error);
      res.status(500).json({
        success: false,
        message: "Erreur serveur lors de la récupération des certificats.",
      });
    }
  },
);

// 🟢 ROUTE 2 : Valider ou Refuser une recommandation
router.put(
  "/admin/certificates/:id/status",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const { status } = req.body; // "approved" ou "rejected"

      // Découper l'identifiant (ex: "studentId_courseId_index")
      const [studentId, courseId, recIndexStr] = req.params.id.split("_");
      const recIndex =
        recIndexStr !== undefined ? parseInt(recIndexStr, 10) : null;

      const student = await User.findById(studentId);
      if (!student) {
        return res
          .status(404)
          .json({ success: false, message: "Élève introuvable" });
      }

      // 1. Si on a l'index exact envoyé par la clé React
      if (recIndex !== null && student.recommendedCertificates[recIndex]) {
        student.recommendedCertificates[recIndex].status = status;
      } else {
        // 2. Sinon, on parcourt par ID de cours
        student.recommendedCertificates.forEach((rec) => {
          const currentCourseId = (
            rec.course?._id ||
            rec.course ||
            rec._id ||
            rec
          ).toString();
          if (currentCourseId === courseId) {
            rec.status = status;
          }
        });
      }

      // 🚨 CRUCIAL : Signaler à Mongoose que le tableau d'objets a été modifié
      student.markModified("recommendedCertificates");

      await student.save();

      res.status(200).json({
        success: true,
        message: `Statut du certificat mis à jour : ${status}`,
      });
    } catch (error) {
      console.error("Erreur mise à jour statut certificat :", error);
      res.status(500).json({
        success: false,
        message: "Erreur serveur lors de la mise à jour.",
      });
    }
  },
);

export default router;
