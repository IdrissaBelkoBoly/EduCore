import Course from "../models/Course.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import Notification from "../models/Notification.js";

/**
 * @desc    Récupérer les cours (Filtrés selon le rôle)
 * @route   GET /api/courses
 * @access  Private
 */
export const getCourses = async (req, res) => {
  try {
    let query = {};
    const userRole = req.user?.role?.toLowerCase();

    if (userRole === "admin") {
      query = {};
    } else if (userRole === "teacher" || userRole === "formateur") {
      query = { formateur: req.user._id };
    } else {
      // Élève : Récupérer les cours spécifiquement autorisés
      const user = await User.findById(req.user._id || req.user.id);

      const allowed = Array.isArray(user?.allowedCourses)
        ? user.allowedCourses
        : [];

      query = {
        isActive: true,
        _id: { $in: allowed },
      };
    }

    const courses = await Course.find(query)
      .populate("formateur", "nom email avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses, // "data" garantit la compatibilité avec Axios (res.data.data)
      courses,
    });
  } catch (error) {
    console.error("Erreur dans getCourses :", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des cours",
      error: error.message,
    });
  }
};

/**
 * @desc    Récupérer un cours par ID
 * @route   GET /api/courses/:id
 * @access  Private
 */
export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate(
      "formateur",
      "nom email avatar",
    );

    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Cours non trouvé" });
    }

    if (req.user.role === "student" || req.user.role === "eleve") {
      await User.findByIdAndUpdate(req.user.id, {
        lastAccessedCourse: course._id,
      });
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du cours",
      error: error.message,
    });
  }
};

/**
 * @desc    Créer un cours (Admin & Formateurs approuvés)
 * @route   POST /api/courses
 * @access  Private/Formateur/Admin
 */
export const createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      contentType,
      formatType,
      format,
      videoUrl,
      thumbnailUrl,
      duration,
      steps,
      level,
      category,
    } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Le titre du cours est obligatoire.",
      });
    }

    // Format du cours
    let rawFormat = contentType || formatType || format || "video";
    let type = "video";
    if (rawFormat.includes("pdf") && rawFormat.includes("video")) type = "both";
    else if (rawFormat.includes("pdf")) type = "pdf";

    // Fichier PDF s'il existe
    let finalPdfUrl = req.body.pdfUrl || "";
    if (req.file) {
      finalPdfUrl = `/${req.file.path.replace(/\\/g, "/")}`;
    }

    // Valider Vidéo / PDF
    if (
      (type === "video" || type === "both") &&
      (!videoUrl || !videoUrl.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "L'URL de la vidéo est obligatoire.",
      });
    }

    if ((type === "pdf" || type === "both") && !finalPdfUrl) {
      return res.status(400).json({
        success: false,
        message: "Veuillez téléverser un fichier PDF.",
      });
    }

    // Traitement des étapes
    let parsedSteps = steps;
    if (typeof steps === "string") {
      try {
        parsedSteps = JSON.parse(steps);
      } catch (e) {
        parsedSteps = [];
      }
    }

    let cleanedSteps = [];
    if (parsedSteps && Array.isArray(parsedSteps)) {
      cleanedSteps = parsedSteps
        .filter((step) => step && step.title && step.title.trim() !== "")
        .map((step, index) => ({
          ...step,
          title: step.title.trim(),
          order: step.order || index + 1,
          _id:
            step._id && mongoose.Types.ObjectId.isValid(step._id)
              ? step._id
              : new mongoose.Types.ObjectId(),
        }));
    }

    // Lien de l'image miniature ou image par défaut
    const finalThumbnail =
      thumbnailUrl && thumbnailUrl.trim()
        ? thumbnailUrl.trim()
        : "default-course.png";

    // Enregistrement du cours
    const course = await Course.create({
      title: title.trim(),
      description: description ? description.trim() : "",
      contentType: type,
      videoUrl: type === "video" || type === "both" ? videoUrl.trim() : "",
      pdfUrl: type === "pdf" || type === "both" ? finalPdfUrl : "",
      thumbnailUrl: finalThumbnail,
      duration: duration || "00:00",
      steps: cleanedSteps,
      level: level || "Débutant",
      category: category || "Base",
      formateur: req.user._id,
    });

    // Notifier tous les étudiants
    try {
      const students = await User.find({ role: "student" }).select("_id");
      if (students.length > 0) {
        const notificationsToCreate = students.map((student) => ({
          recipient: student._id,
          type: "COURSE",
          title: "Nouveau cours disponible 📖",
          message: `Le cours "${course.title}" a été publié !`,
          targetTab: "courses",
        }));
        await Notification.insertMany(notificationsToCreate);
      }
    } catch (notifErr) {
      console.error("Erreur création notification cours:", notifErr);
    }

    res.status(201).json({
      success: true,
      message: "Cours créé avec succès",
      data: course,
    });
  } catch (error) {
    console.error("🔥 ERREUR DANS CREATE_COURSE :", error);
    res.status(400).json({
      success: false,
      message: "Erreur lors de la création du cours",
      error: error.message,
    });
  }
};

/**
 * @desc    Modifier un cours (Admin & Formateur propriétaire)
 * @route   PUT /api/courses/:id
 * @access  Private/Formateur/Admin
 */
export const updateCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      contentType,
      videoUrl,
      thumbnailUrl,
      duration,
      steps,
      level,
      category,
    } = req.body;

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Cours non trouvé",
      });
    }

    // Vérification des droits
    if (
      req.user.role !== "admin" &&
      course.formateur.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Vous n'avez pas l'autorisation de modifier ce cours.",
      });
    }

    // Validation du contentType
    let validContentType = course.contentType;
    if (
      contentType &&
      contentType !== "undefined" &&
      contentType !== "null" &&
      ["video", "pdf", "both"].includes(contentType)
    ) {
      validContentType = contentType;
    }

    // Traitement du fichier PDF
    let pdfUrl = course.pdfUrl;
    if (req.file) {
      pdfUrl = `/${req.file.path.replace(/\\/g, "/")}`;
    }

    // Parsing des étapes
    let parsedSteps = [];
    if (steps) {
      if (typeof steps === "string") {
        try {
          parsedSteps = JSON.parse(steps);
        } catch (e) {
          parsedSteps = course.steps;
        }
      } else if (Array.isArray(steps)) {
        parsedSteps = steps;
      }
    } else {
      parsedSteps = course.steps;
    }

    const cleanedSteps = parsedSteps
      .filter((step) => step && step.title && step.title.trim() !== "")
      .map((step, index) => ({
        title: step.title.trim(),
        order: step.order || index + 1,
        ...(step._id && mongoose.Types.ObjectId.isValid(step._id)
          ? { _id: step._id }
          : {}),
      }));

    const updateData = {
      title: title ? title.trim() : course.title,
      description:
        description !== undefined ? description.trim() : course.description,
      contentType: validContentType,
      videoUrl:
        validContentType === "video" || validContentType === "both"
          ? videoUrl !== undefined
            ? videoUrl.trim()
            : course.videoUrl
          : "",
      pdfUrl:
        validContentType === "pdf" || validContentType === "both" ? pdfUrl : "",
      thumbnailUrl:
        thumbnailUrl !== undefined ? thumbnailUrl : course.thumbnailUrl,
      duration: duration || course.duration,
      steps: cleanedSteps,
      level: level || course.level,
      category: category || course.category,
    };

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      updateData,
      { returnDocument: "after", runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Cours mis à jour avec succès",
      data: updatedCourse,
    });
  } catch (error) {
    console.error("🔥 ERREUR DANS UPDATE_COURSE :", error);
    res.status(400).json({
      success: false,
      message: error.message || "Erreur lors de la modification du cours",
    });
  }
};

/**
 * @desc    Supprimer un cours (Admin & Formateur propriétaire)
 * @route   DELETE /api/courses/:id
 * @access  Private/Formateur/Admin
 */
export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Cours non trouvé" });
    }

    if (
      req.user.role !== "admin" &&
      course.formateur.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Vous n'avez pas l'autorisation de supprimer ce cours.",
      });
    }

    await course.deleteOne();

    res.status(200).json({
      success: true,
      message: "Cours supprimé avec succès",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression du cours",
      error: error.message,
    });
  }
};
