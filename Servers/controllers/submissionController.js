import Submission from "../models/Submission.js";
import Assignment from "../models/Assignment.js";
import Homework from "../models/Homework.js";
import Notification from "../models/Notification.js";
import fs from "fs";
import path from "path";

// 1. L'étudiante soumet son devoir
// 1. L'étudiante soumet son devoir
// 1. L'étudiante soumet son devoir
export const submitAssignment = async (req, res) => {
  try {
    const rawAssignmentId =
      req.body.assignmentId ||
      req.body.homeworkId ||
      req.body.assignment ||
      req.body.homework;

    const assignmentId =
      rawAssignmentId && rawAssignmentId.trim() !== "" ? rawAssignmentId : null;
    const courseId = req.body.courseId || null;

    let fileObj = null;
    let audioObj = null;

    if (req.files) {
      if (req.files.submissionFile && req.files.submissionFile[0]) {
        fileObj = req.files.submissionFile[0];
      } else if (req.files.file && req.files.file[0]) {
        fileObj = req.files.file[0];
      }

      if (req.files.audio && req.files.audio[0]) {
        audioObj = req.files.audio[0];
      }
    } else if (req.file) {
      fileObj = req.file;
    }

    let computedSubmissionUrl = fileObj
      ? `/${fileObj.path.replace(/\\/g, "/")}`
      : req.body.submissionUrl || req.body.fileUrl || null;

    let computedStudentAudioUrl = audioObj
      ? `/${audioObj.path.replace(/\\/g, "/")}`
      : req.body.studentAudioUrl || null;

    const finalSubmissionUrl =
      computedSubmissionUrl ||
      computedStudentAudioUrl ||
      "/uploads/submissions/default-submission";

    const submission = new Submission({
      assignment: assignmentId,
      courseId: courseId,
      student: req.user._id,
      submissionUrl: finalSubmissionUrl,
      studentAudioUrl: computedStudentAudioUrl || "",
      comment: req.body.comment || "",
      status: "pending",
    });

    await submission.save();

    // 🔴 AJOUT CRUCIAL : Notification envoyée au(x) formateur(s)
    try {
      const studentName = `${req.user.firstName || req.user.nom || "Une élève"} ${req.user.lastName || ""}`.trim();
      let teacherRecipientId = null;
      let assignmentTitle = "Pratique libre";

      if (assignmentId) {
        const assignmentDoc = await Assignment.findById(assignmentId);
        if (assignmentDoc) {
          teacherRecipientId = assignmentDoc.createdBy; // Récupère le formateur créateur du devoir
          assignmentTitle = assignmentDoc.title || assignmentTitle;
        }
      }

      // Si le devoir est libre sans assignmentId, on cherche l'admin ou le premier formateur
      if (!teacherRecipientId) {
        const User = (await import("../models/User.js")).default;
        const teacherUser = await User.findOne({ role: { $in: ["teacher", "admin", "formateur"] } });
        if (teacherUser) {
          teacherRecipientId = teacherUser._id;
        }
      }

      // Si un formateur destinataire a été trouvé, on enregistre la notification
      if (teacherRecipientId) {
        await Notification.create({
          recipient: teacherRecipientId,
          type: "HOMEWORK",
          title: "Nouveau devoir rendu 📝",
          message: `${studentName} a rendu un devoir : "${assignmentTitle}".`,
          targetTab: "homeworks",
        });
      }
    } catch (notifErr) {
      console.error("Erreur création notification devoir :", notifErr);
    }

    res.status(201).json({
      success: true,
      message: "Devoir rendu avec succès !",
      data: submission,
    });
  } catch (error) {
    console.error("Erreur submitAssignment:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Le formateur récupère TOUS les devoirs rendus
export const getTeacherSubmissions = async (req, res) => {
  try {
    const currentUserId = req.user._id || req.user.id;
    const currentUserRole = req.user.role;

    let filter = {};

    if (currentUserRole !== "admin") {
      const myAssignments = await Assignment.find({
        createdBy: currentUserId,
      }).select("_id");
      const myAssignmentIds = myAssignments.map((a) => a._id);

      filter = {
        $or: [
          { assignment: { $in: myAssignmentIds } },
          { assignment: null },
          { assignment: { $exists: false } },
        ],
      };
    }

    const submissions = await Submission.find(filter)
      .populate("student", "firstName lastName name email nom")
      .populate({
        path: "assignment",
        select: "title course createdBy",
        populate: {
          path: "course",
          select: "title",
        },
      })
      .populate("courseId", "title")
      .sort({ createdAt: -1 })
      .lean();

    const formattedSubmissions = submissions.map((sub) => {
      const url = sub.submissionUrl || sub.fileUrl || "";

      const studentName = sub.student
        ? `${sub.student.firstName || ""} ${sub.student.lastName || ""}`.trim() ||
          sub.student.name ||
          sub.student.nom ||
          sub.student.email
        : "Élève anonyme";

      return {
        ...sub,
        studentName,
        fileUrl: url,
        submissionUrl: url,
        fileType: url.match(/\.(mp4|webm|mov|mkv)$/i) ? "video" : "image",
        courseId: sub.courseId || sub.assignment?.course || null,
        assignmentTitle:
          sub.assignment?.title || "Pratique libre / Sans consigne",
      };
    });

    res.status(200).json({ success: true, data: formattedSubmissions });
  } catch (error) {
    console.error("Erreur getTeacherSubmissions:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Le formateur attribue une note et un feedback
export const gradeSubmission = async (req, res) => {
  try {
    const { grade, feedback, status } = req.body;
    const { id } = req.params;

    const submission = await Submission.findById(id).populate(
      "assignment",
      "title",
    );
    if (!submission) {
      return res
        .status(404)
        .json({ success: false, message: "Soumission introuvable" });
    }

    if (req.file) {
      const cleanPath = req.file.path.replace(/\\/g, "/");
      submission.feedbackAudioUrl = cleanPath.startsWith("/")
        ? cleanPath
        : `/${cleanPath}`;
    } else if (req.files) {
      const file = req.files.feedbackFile?.[0] || req.files.audio?.[0];
      if (file) {
        const cleanPath = file.path.replace(/\\/g, "/");
        submission.feedbackAudioUrl = cleanPath.startsWith("/")
          ? cleanPath
          : `/${cleanPath}`;
      }
    }

    if (grade !== undefined && grade !== "") submission.grade = Number(grade);
    if (feedback !== undefined) submission.feedback = feedback;

    submission.status =
      status === "approved"
        ? "approved"
        : status === "rejected"
          ? "rejected"
          : "graded";
    submission.correctedBy = req.user._id;
    submission.correctedAt = new Date();

    await submission.save();

    try {
      const assignmentTitle =
        submission.assignment?.title || "votre devoir libre";
      const noteMessage =
        grade !== undefined && grade !== "" ? ` Note : ${grade}/20.` : "";

      await Notification.create({
        recipient: submission.student,
        type: "CORRECTION",
        title: "Devoir corrigé 💯",
        message: `Votre travail pour "${assignmentTitle}" a été corrigé par votre formatrice.${noteMessage}`,
        targetTab: "corrections",
      });
    } catch (notifErr) {
      console.error("Erreur création notification correction :", notifErr);
    }

    res.status(200).json({
      success: true,
      message: "Devoir corrigé avec succès !",
      data: submission,
    });
  } catch (error) {
    console.error("Erreur gradeSubmission:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Récupérer les devoirs rendus par l'élève connecté (Exclut les éléments masqués)
export const getMySubmissions = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const submissions = await Submission.find({
      student: userId,
      isArchivedByStudent: { $ne: true }, // 🟢 Ne renvoie pas les devoirs masqués par l'élève
    })
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

    res.status(200).json({
      success: true,
      data: submissions,
      submissions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Supprimer une soumission (Admin / Formateur)
export const deleteSubmission = async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await Submission.findById(id);
    if (!submission) {
      return res
        .status(404)
        .json({ success: false, message: "Soumission introuvable." });
    }

    await Submission.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Soumission supprimée avec succès !",
    });
  } catch (error) {
    console.error("Erreur deleteSubmission:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Supprimer son dépôt (Élève - Uniquement si NON corrigé / pending)
export const deleteMySubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    const submission = await Submission.findById(id);

    if (!submission) {
      return res
        .status(404)
        .json({ success: false, message: "Soumission introuvable." });
    }

    if (submission.student.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Non autorisé." });
    }

    // 🟢 Bloquer la suppression si le devoir est déjà corrigé
    if (submission.status !== "pending") {
      return res.status(400).json({
        success: false,
        message:
          "Impossible de supprimer un devoir déjà corrigé. Utilisez le bouton masquer.",
      });
    }

    // Suppression physique du fichier s'il existe sur le serveur
    if (
      submission.submissionUrl &&
      submission.submissionUrl.startsWith("/uploads")
    ) {
      const filePath = path.join(process.cwd(), submission.submissionUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Submission.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Soumission supprimée avec succès !",
    });
  } catch (error) {
    console.error("Erreur deleteMySubmission:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Masquer/Archiver un devoir corrigé de sa liste (Élève)
export const archiveMySubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    const submission = await Submission.findOne({ _id: id, student: userId });

    if (!submission) {
      return res
        .status(404)
        .json({ success: false, message: "Soumission introuvable." });
    }

    submission.isArchivedByStudent = true;
    await submission.save();

    res.status(200).json({
      success: true,
      message: "Devoir masqué de votre liste avec succès !",
    });
  } catch (error) {
    console.error("Erreur archiveMySubmission:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
