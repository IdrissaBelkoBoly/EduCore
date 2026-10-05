import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// Fonction d'aide pour générer le JWT token
const generateToken = (id) => {
  // L'ID de l'utilisateur est encodé dans le token
  // Pensez à ajouter JWT_SECRET et JWT_EXPIRES_IN dans votre fichier .env
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
};

/**
 * @desc    Inscription d'une nouvelle étudiante (ou admin)
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res) => {
  try {
    const { nom, email, password, telephone, role } = req.body;

    // 1. Vérifier si l'utilisateur existe déjà
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Cet email est déjà utilisé" });
    }

    // 2. Créer le nouvel utilisateur
    // Le mot de passe sera hashé automatiquement grâce au middleware pre('save') du modèle
    const user = await User.create({
      nom,
      email,
      password,
      telephone,
      role, // S'il n'est pas fourni, le modèle appliquera 'student' par défaut
    });

    // 3. Envoyer la réponse avec le token
    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        telephone: user.telephone,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur serveur lors de l'inscription",
      error: error.message,
    });
  }
};

/**
 * @desc    Connexion de l'utilisateur
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Veuillez fournir un email et un mot de passe" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    console.log("--> Tentative de connexion pour :", user.email);
    console.log("--> Rôle :", user.role);
    console.log("--> Statut :", user.status);
    console.log("--> isActive :", user.isActive);

    // 🟢 1. VÉRIFICATION DU RÔLE FORMATEUR / TEACHER
    const isTeacher = user.role === "formateur" || user.role === "teacher";

    if (isTeacher) {
      // Si l'utilisateur a le statut 'pending' ET n'est pas actif
      if (user.status === "pending" && !user.isActive) {
        return res.status(403).json({
          message:
            "Votre compte formateur est en attente de validation par l'administration.",
        });
      }
    }

    // 🟢 2. VÉRIFICATION DU BLOCAGE GÉNÉRAL OU SUSPENSION
    if (user.status === "suspended" || user.isBlocked) {
      return res.status(403).json({
        message: "Votre compte a été suspendu par l'administration.",
      });
    }

    // 🟢 3. RÈGLES DE PAIEMENT POUR ÉTUDIANTS UNIQUEMENT
    if (user.role === "student") {
      if (
        user.paymentDeadline &&
        new Date() > new Date(user.paymentDeadline) &&
        (user.pricePaid || 0) < (user.totalPrice || 0)
      ) {
        user.status = "suspended";
        user.isActive = false;
        await user.save();
        return res.status(403).json({
          message:
            "Accès bloqué. La date limite de paiement de votre tranche est dépassée.",
        });
      }

      if (user.status === "completed") {
        return res.status(403).json({
          message:
            "Votre accès a expiré car vous avez terminé votre formation.",
        });
      }
    }

    // 🟢 4. VERIFICATION MOT DE PASSE
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    // 🟢 5. RÉPONSE DE SUCCÈS
    res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        allowedCourses: user.allowedCourses || [],
      },
    });
  } catch (error) {
    console.error("Erreur lors du login :", error);
    res.status(500).json({
      message: "Erreur serveur lors de la connexion",
      error: error.message,
    });
  }
};
/**
 * @desc    Obtenir le profil de l'utilisateur connecté (Sophie Martin ou Amélie Legrand)
 * @route   GET /api/auth/me
 * @access  Private (Nécessite un middleware de protection)
 */
export const getMe = async (req, res) => {
  try {
    // ✅ CORRECTION : Sécurité accrue, on s'assure de récupérer le tableau d'accès à jour
    const user = await User.findById(req.user.id)
      .populate("lastAccessedCourse")
      .select("-password");

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.status(200).json({
      success: true,
      // ✅ Renvoie l'objet entier nettoyé (qui contient allowedCourses mis à jour en BDD)
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur serveur lors de la récupération du profil",
      error: error.message,
    });
  }
};

// Remplacez par votre Client ID Google (à récupérer sur la console Google plus tard)
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res
        .status(400)
        .json({ message: "Le jeton Google (idToken) est requis." });
    }

    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // 1. Chercher l'utilisateur dans la base
    const user = await User.findOne({ email });

    // ⛔ SI L'UTILISATEUR N'EXISTE PAS (OU A ÉTÉ SUPPRIMÉ) : On refuse l'accès !
    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Aucun compte n'est associé à cette adresse e-mail. Veuillez vous inscrire ou contacter l'administrateur.",
      });
    }

    // 2. Si l'utilisateur existe, on génère le token
    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Connexion Google réussie",
      token,
      user: {
        _id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        allowedCourses: user.allowedCourses || [],
      },
    });
  } catch (error) {
    console.error("🔥 ERREUR DANS GOOGLE_LOGIN :", error);
    return res.status(500).json({
      message: "Échec de l'authentification Google",
      error: error.message,
    });
  }
};
/**
 * @desc    Obtenir les détails d'une étudiante spécifique (Admin uniquement)
 * @route   GET /api/auth/admin/students/:id
 * @access  Private/Admin
 */
export const getStudentDetails = async (req, res) => {
  try {
    const student = await User.findById(req.params.id)
      .select("-password") // Sécurité : on masque le mot de passe
      .populate("lastAccessedCourse", "title category"); // Jointure automatique avec le modèle Course

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Étudiante non trouvée" });
    }

    res.status(200).json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * @desc    Suspendre/Supprimer une étudiante (Admin uniquement)
 * @route   DELETE /api/auth/admin/students/:id
 * @access  Private/Admin
 */
export const deleteStudent = async (req, res) => {
  try {
    const student = await User.findById(req.params.id);

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Étudiante non trouvée" });
    }

    await student.deleteOne();
    res
      .status(200)
      .json({ success: true, message: "Étudiante supprimée avec succès" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression",
      error: error.message,
    });
  }
};

/**
 * @desc    Mettre à jour le profil de l'utilisateur connecté (Admin ou Élève)
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Récupéré par ton middleware de protection 'protect'
    const { nom, email, password } = req.body;

    // 1. Rechercher l'utilisateur dans MongoDB
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }

    // 2. Mettre à jour les informations textuelles si elles sont fournies
    if (nom) user.nom = nom;
    if (email) user.email = email;

    // Si un nouveau mot de passe est fourni, on le met à jour
    // (ton modèle User doit avoir un middleware .pre('save') pour le hasher automatiquement)
    if (password) user.password = password;

    // 3. Gestion de l'avatar si un nouveau fichier est envoyé
    if (req.file) {
      // PRO : Supprimer l'ancienne image locale du serveur si elle existe
      if (user.avatar) {
        // On extrait le nom du fichier depuis l'URL de l'ancienne image
        const oldFileName = user.avatar.substring(
          user.avatar.lastIndexOf("/") + 1,
        );
        const oldFilePath = path.join("uploads", oldFileName);

        // Si le fichier existe physiquement sur le serveur, on le supprime
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      // Enregistrer l'URL de la nouvelle image
      user.avatar = `http://localhost:5000/uploads/${req.file.filename}`;
    }

    // 4. Sauvegarder les modifications dans la base de données
    await user.save();

    // 5. Renvoyer l'utilisateur mis à jour au frontend (sans son mot de passe)
    res.status(200).json({
      success: true,
      message: "Profil mis à jour avec succès !",
      user: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Erreur dans updateProfile :", error);
    res.status(500).json({
      success: false,
      message:
        "Une erreur interne est survenue lors de la mise à jour du profil",
    });
  }
};

/**
 * @desc    Valider le paiement en cash et activer une étudiante
 * @route   PUT /api/auth/admin/students/:id/activate
 * @access  Private/Admin
 */
export const activateStudentWithPayment = async (req, res) => {
  try {
    // 🚨 Accepte "amount" OU "amountToAdd"
    const { amount, amountToAdd, nextDeadline, isFinished } = req.body;
    const addedPayment = Number(amount || amountToAdd || 0);

    const student = await User.findById(req.params.id);
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Étudiante non trouvée" });
    }

    // 1. Clôture si la formation est terminée
    if (isFinished) {
      student.status = "completed";
      student.isActive = false;
      await student.save();
      return res.status(200).json({
        success: true,
        message: "Formation marquée comme terminée.",
        data: student,
      });
    }

    // 2. Calcul du cumul du prix payé
    student.pricePaid = (student.pricePaid || 0) + addedPayment;
    student.status = "active";
    student.isActive = true;

    const formationPrice = student.totalPrice || 1000;

    // 3. Mise à jour de la date limite
    if (nextDeadline) {
      student.paymentDeadline = new Date(nextDeadline);
    }

    // Si tout est soldé, réinitialisation de la date limite
    if (student.pricePaid >= formationPrice) {
      student.paymentDeadline = null;
    }

    await student.save();

    res.status(200).json({
      success: true,
      message: `Opération réussie. Total payé: ${student.pricePaid}/${formationPrice} DH.`,
      data: student,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Inscription d'un Formateur (Formulaire Classique)
 * @route   POST /api/auth/register-formateur
 * @access  Public
 */
// 🟢 Inscription Enseignant Classique
export const registerTeacher = async (req, res) => {
  try {
    const { name, email, password, phone, speciality, bio } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Cet email est déjà utilisé." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newTeacher = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      speciality,
      bio,
      role: "teacher", // 👈 Forcé à "teacher"
      status: "pending",
    });

    await newTeacher.save();
    res
      .status(201)
      .json({
        message: "Candidature envoyée avec succès ! En attente de validation.",
      });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur lors de l'inscription." });
  }
};

/**
 * @desc    Inscription d'un Formateur (Via Google)
 * @route   POST /api/auth/register-formateur-google
 * @access  Public
 */
// 🟢 Inscription Enseignant via Google
export const registerTeacherGoogle = async (req, res) => {
  try {
    const { idToken, phone, speciality, bio } = req.body;

    // Vérification du token Google...
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name } = payload;

    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ message: "Un compte existe déjà avec cet email." });
    }

    user = new User({
      name,
      email,
      phone,
      speciality,
      bio,
      role: "teacher", // 👈 Forcé à "teacher"
      status: "pending",
    });

    await user.save();
    res
      .status(201)
      .json({
        message: "Candidature Google enregistrée ! En attente de validation.",
      });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'inscription Google." });
  }
};

/**
 * @desc    Récupérer les formateurs en attente de validation (Admin)
 * @route   GET /api/auth/admin/pending-formateurs
 * @access  Private/Admin
 */
// 🟢 Récupérer les enseignants en attente (Espace Admin)
export const getPendingTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: "teacher", status: "pending" });
    res.status(200).json({ teachers }); // 👈 Renvoie la clé "teachers"
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération des enseignants." });
  }
};


/**
 * @desc    Valider un formateur et lui donner accès (Admin)
 * @route   PUT /api/auth/admin/approve-formateur/:id
 * @access  Private/Admin
 */
export const updateTeacherStatus = async (req, res) => {
  try {
    const { status } = req.body; // Récupère "active" ou "rejected" envoyé par le frontend

    // 1. Recherche et mise à jour du statut
    const teacher = await User.findById(req.params.id);

    if (!teacher) {
      return res.status(404).json({ message: "Enseignant non trouvé" });
    }

    // 2. Mise à jour des champs (gestion active/rejected + variable isActive)
    teacher.status = status;
    teacher.isActive = status === "active";

    await teacher.save();

    res.status(200).json({
      success: true,
      message: `Statut de l'enseignant ${teacher.name || teacher.nom} mis à jour (${status}).`,
      data: teacher,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la modification du statut",
      error: error.message,
    });
  }
};

/**
 * @desc    Obtenir la liste de tous les élèves
 * @route   GET /api/auth/students  OU  GET /api/users/students
 * @access  Private (Teacher/Admin)
 */
export const getStudents = async (req, res) => {
  try {
    // Récupère les utilisateurs qui ont le rôle "eleve" ou "student"
    const students = await User.find({
      role: { $in: ["eleve", "student"] },
    }).select("-password");

    res.status(200).json({
      success: true,
      count: students.length,
      data: students,
      students, // Alias pour la compatibilité
    });
  } catch (error) {
    console.error("Erreur getStudents:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des élèves",
      error: error.message,
    });
  }
};