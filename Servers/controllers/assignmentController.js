import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import Course from "../models/Course.js";

// 🟢 1. Obtenir les devoirs du formateur connecté
export const getTeacherAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.find({ createdBy: req.user._id })
      .populate("course", "title")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    console.error("Erreur getTeacherAssignments :", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🟢 2. Obtenir tous les devoirs (Requis par assignmentRoutes.js)
export const getAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.find()
      .populate("course", "title")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🟢 3. Créer un devoir (Admin & Teacher) - MODIFIÉ AVEC NOTIFICATIONS
export const createAssignment = async (req, res) => {
  try {
    const { title, description, instructions, courseId, course, dueDate } =
      req.body;

    const targetCourse = course || courseId;
    const targetInstructions = instructions || description;

    if (!title || !targetCourse) {
      return res.status(400).json({
        success: false,
        message: "Le titre et le cours sont obligatoires.",
      });
    }

    // 🟢 Récupération des fichiers via req.files (Multer upload.fields)
    let resourceUrl = "";
    let instructionAudioUrl = "";
    let annotatedImageUrl = "";

    if (req.files) {
      if (req.files.resourceFile && req.files.resourceFile[0]) {
        resourceUrl = `/${req.files.resourceFile[0].path.replace(/\\/g, "/")}`;
      }
      if (req.files.audio && req.files.audio[0]) {
        instructionAudioUrl = `/${req.files.audio[0].path.replace(/\\/g, "/")}`;
      }
      if (req.files.annotatedImage && req.files.annotatedImage[0]) {
        annotatedImageUrl = `/${req.files.annotatedImage[0].path.replace(/\\/g, "/")}`;
      }
    }

    const newAssignment = new Assignment({
      title,
      course: targetCourse,
      instructions: targetInstructions,
      dueDate: dueDate || null,
      createdBy: req.user._id,
      resourceUrl,
      instructionAudioUrl,
      annotatedImageUrl,
    });

    await newAssignment.save();

    // 🟢 CREATION DES NOTIFICATIONS POUR TOUS LES ÉTUDIANTS
    try {
      let courseTitle = "";
      if (targetCourse) {
        const foundCourse = await Course.findById(targetCourse);
        if (foundCourse) courseTitle = foundCourse.title;
      }

      const students = await User.find({ role: "student" }).select("_id");

      if (students.length > 0) {
        const notificationsToCreate = students.map((student) => ({
          recipient: student._id,
          type: "HOMEWORK",
          title: "Nouveau devoir publié 📝",
          message: `Un nouveau devoir "${newAssignment.title}" a été publié${
            courseTitle ? ` dans le cours ${courseTitle}` : ""
          }.`,
          targetTab: "assignments",
        }));

        await Notification.insertMany(notificationsToCreate);
      }
    } catch (notifErr) {
      console.error(
        "Erreur notification lors de la création du devoir :",
        notifErr,
      );
    }

    res.status(201).json({
      success: true,
      message: "Devoir créé avec succès et étudiants notifiés !",
      data: newAssignment,
    });
  } catch (error) {
    console.error("Erreur création devoir :", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la création du devoir",
    });
  }
};

// 🔴 4. Supprimer un devoir
export const deleteAssignment = async (req, res) => {
  try {
    await Assignment.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Devoir supprimé" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🟢 5. Obtenir toutes les soumissions en attente de correction (Pour le dashboard Admin)
export const getPendingSubmissions = async (req, res) => {
  try {
    const pendingSubmissions = await Submission.find({ status: "pending" })
      .populate("student", "firstName lastName name nom prenom email username") // 👈 Ajout de tous les champs possibles
      .populate({
        path: "assignment",
        select: "title course",
        populate: {
          path: "course",
          select: "title",
        },
      })
      .populate("courseId", "title")
      .sort({ createdAt: -1 });

    const formattedData = pendingSubmissions.map((sub) => {
      // 1. Détermination ultra-flexible du nom de l'élève
      let studentName = "";

      if (sub.student && typeof sub.student === "object") {
        const fn = sub.student.firstName || sub.student.prenom || "";
        const ln = sub.student.lastName || sub.student.nom || "";
        const full = `${fn} ${ln}`.trim();

        studentName =
          full ||
          sub.student.name ||
          sub.student.username ||
          sub.student.email ||
          "Étudiante";
      } else if (typeof sub.student === "string") {
        studentName = sub.student;
      } else {
        studentName = "Élève anonyme";
      }

      // 2. Détermination du titre du cours
      const courseTitle =
        sub.courseId?.title ||
        sub.assignment?.course?.title ||
        "Module de cours";

      return {
        _id: sub._id,
        studentName: studentName,
        student: sub.student, // 👈 On renvoie aussi l'objet étudiant complet au cas où
        courseTitle,
        lessonTitle: sub.assignment?.title || "Devoir en attente",
        createdAt: sub.createdAt,
      };
    });

    res.status(200).json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Erreur getPendingSubmissions :", error);
    res.status(500).json({ success: false, message: error.message });
  }
};