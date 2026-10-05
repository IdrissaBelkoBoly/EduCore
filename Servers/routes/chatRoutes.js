import express from "express";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js"; // 🟢 1. IMPORT DU MODÈLE NOTIFICATION
import { protect } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/chatUpload.js";
import Course from "../models/Course.js";

const router = express.Router();

// =========================================================================
// 1. Récupérer les conversations récentes
// =========================================================================
router.get("/recent", protect, async (req, res) => {
  try {
    const recentConversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: req.user._id }, { receiver: req.user._id }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ["$sender", req.user._id] }, "$receiver", "$sender"],
          },
          lastMessageDate: { $first: "$createdAt" },
        },
      },
      { $sort: { lastMessageDate: -1 } },
    ]);

    const studentIds = recentConversations.map((c) => c._id);

    const students = await User.find({ _id: { $in: studentIds } }).select(
      "nom email avatar role",
    );

    const sortedStudents = studentIds
      .map((id) => students.find((s) => s._id.toString() === id.toString()))
      .filter(Boolean);

    res.json(sortedStudents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =========================================================================
// 2. Annuaire / Recherche de contacts (Élèves, Admins, Formateurs)
// =========================================================================
router.get("/contacts", protect, async (req, res) => {
  try {
    const { role, _id } = req.user;
    const search = req.query.search || "";

    let query = { _id: { $ne: _id } };

    if (role === "teacher") {
      query.role = { $in: ["student", "admin"] };
    } else if (role === "admin") {
      query.role = { $in: ["student", "teacher", "admin"] };
    }

    if (search.trim() !== "") {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { nom: searchRegex },
        { name: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
      ];
    }

    const contacts = await User.find(query).select("-password");
    return res.status(200).json({ success: true, data: contacts });
  } catch (err) {
    console.error("Erreur backend /contacts :", err);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des contacts",
      error: err.message,
    });
  }
});

// =========================================================================
// 3. Messages non lus & Compteurs
// =========================================================================
router.get("/unread", protect, async (req, res) => {
  try {
    const unreadMsgs = await Message.find({
      receiver: req.user._id,
      isRead: false,
    })
      .populate("sender", "nom avatar")
      .sort({ createdAt: -1 });

    const formatted = unreadMsgs.map((msg) => ({
      id: msg._id,
      _id: msg._id,
      sender: msg.sender?.nom || "Élève",
      avatar: msg.sender?.avatar || null,
      text:
        msg.text ||
        (msg.messageType === "audio" ? "🎤 Enregistrement vocal" : null) ||
        (msg.mediaUrl ? "📎 Fichier joint" : "Nouveau message"),
      createdAt: msg.createdAt,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/unread-count", protect, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user._id,
      isRead: false,
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/read-all", protect, async (req, res) => {
  try {
    await Message.updateMany(
      { receiver: req.user._id, isRead: false },
      { $set: { isRead: true } },
    );
    res.json({
      message: "Toutes les notifications ont été marquées comme lues",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =========================================================================
// 4. Actions d'envoi & Questions (MODIFIÉES AVEC NOTIFICATIONS)
// =========================================================================
router.post("/send", protect, upload.single("file"), async (req, res) => {
  try {
    const { receiverId, text, messageType } = req.body;
    let mediaUrl = "";

    if (req.file) {
      mediaUrl = req.file.path.replace(/\\/g, "/");
    }

    const newMsg = await Message.create({
      sender: req.user._id,
      receiver: receiverId,
      text: text || "",
      mediaUrl,
      messageType: messageType || (req.file ? "file" : "text"),
      isRead: false,
    });

    // 🟢 CREATION DE LA NOTIFICATION EN BDD POUR LE DESTINATAIRE
    const senderName = req.user.nom || req.user.firstName || "Un utilisateur";
    await Notification.create({
      recipient: receiverId,
      type: "CHAT",
      title: "Nouveau message 💬",
      message: `${senderName} vous a envoyé un message.`,
      targetTab: "chat",
    });

    res.status(201).json({
      ...newMsg.toObject(),
      mediaUrl: mediaUrl ? `http://localhost:5000/${mediaUrl}` : null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/question", protect, upload.single("file"), async (req, res) => {
  try {
    const { question, stepTitle, courseId } = req.body;
    let mediaUrl = "";

    if (req.file) {
      mediaUrl = req.file.path.replace(/\\/g, "/");
    }

    if (!question && !mediaUrl) {
      return res.status(400).json({
        message: "Veuillez fournir un texte ou un enregistrement vocal.",
      });
    }

    let teacherId = null;

    if (courseId) {
      const course = await Course.findById(courseId);
      if (course && course.formateur) {
        teacherId = course.formateur;
      }
    }

    if (!teacherId) {
      const teacher = await User.findOne({
        role: { $in: ["admin", "teacher", "formateur"] },
      });
      if (teacher) {
        teacherId = teacher._id;
      }
    }

    if (!teacherId) {
      return res.status(404).json({
        message: "Aucune formatrice trouvée pour recevoir votre question.",
      });
    }

    const messageContent = stepTitle
      ? `[Question sur : ${stepTitle}]\n${question || ""}`
      : question || "";

    const newMsg = await Message.create({
      sender: req.user._id,
      receiver: teacherId,
      text: messageContent.trim(),
      mediaUrl,
      messageType: mediaUrl ? "audio" : "text",
      isRead: false,
    });

    // 🟢 CREATION DE LA NOTIFICATION POUR LA FORMATRICE / FORMATEUR
    const studentName = req.user.nom || req.user.firstName || "Un élève";
    await Notification.create({
      recipient: teacherId,
      type: "CHAT",
      title: "Nouvelle question ❓",
      message: `${studentName} vous a posé une question sur un cours.`,
      targetTab: "chat",
    });

    res.status(201).json({
      success: true,
      message: "Question envoyée à votre formatrice avec succès !",
      data: {
        ...newMsg.toObject(),
        mediaUrl: mediaUrl ? `http://localhost:5000/${mediaUrl}` : null,
      },
    });
  } catch (err) {
    console.error("Erreur dans POST /question :", err);
    res.status(500).json({ message: err.message });
  }
});

// =========================================================================
// 5. Suppression de conversation complète
// =========================================================================
router.delete("/conversation/:studentId", protect, async (req, res) => {
  try {
    const { studentId } = req.params;

    await Message.deleteMany({
      $or: [
        { sender: req.user._id, receiver: studentId },
        { sender: studentId, receiver: req.user._id },
      ],
    });

    res.status(200).json({
      message: "La conversation a été supprimée avec succès.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Route de fallback racine pour l'API Chat
router.get("/", protect, async (req, res) => {
  try {
    // Redirige la logique ou renvoie les conversations récentes
    const recent = await Message.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }]
    }).sort({ createdAt: -1 }).limit(20);

    res.status(200).json(recent);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =========================================================================
// 6. Routes avec paramètre dynamique (TOUJOURS EN DERNIER)
// =========================================================================
router.get("/:studentId", protect, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: req.params.studentId },
        { sender: req.params.studentId, receiver: req.user._id },
      ],
    }).sort({ createdAt: 1 });

    await Message.updateMany(
      { sender: req.params.studentId, receiver: req.user._id, isRead: false },
      { $set: { isRead: true } },
    );

    const formatted = messages.map((msg) => ({
      _id: msg._id,
      sender:
        msg.sender.toString() === req.user._id.toString() ? "me" : "student",
      text: msg.text,
      mediaUrl: msg.mediaUrl ? `http://localhost:5000/${msg.mediaUrl}` : null,
      messageType: msg.messageType,
      createdAt: msg.createdAt,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
