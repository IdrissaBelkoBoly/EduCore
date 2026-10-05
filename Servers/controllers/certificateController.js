import Certificate from "../models/Certificate.js";
import Course from "../models/Course.js";

/**
 * 1. Le Formateur soumet une demande de certificat (Module ou Final)
 */
export const requestCertificate = async (req, res) => {
  try {
    const { studentId, courseId, isFinal, type, customNote, customMessage } =
      req.body;
    const formateurId = req.user._id || req.user.id;

    const messageToSave = (customNote || customMessage || "").trim();
    const isFinalCertificate = isFinal === true || type === "final";

    // 🟢 CAS 1 : CERTIFICAT FINAL
    if (isFinalCertificate) {
      const certificate = await Certificate.findOneAndUpdate(
        { student: studentId, isFinal: true },
        {
          student: studentId,
          formateur: formateurId,
          course: null,
          isFinal: true,
          type: "final",
          status: "pending",
          encouragementMessage:
            messageToSave ||
            "Félicitations pour la réussite globale et l'obtention de votre diplôme final !",
        },
        { upsert: true, returnDocument: "after", runValidators: true },
      );

      return res.status(200).json({
        success: true,
        message:
          "Recommandation pour le certificat final transmise à l'administration.",
        certificate,
        data: certificate, // Pour rétrocompatibilité avec le front
      });
    }

    // 🟢 CAS 2 : CERTIFICAT DE MODULE
    if (!courseId) {
      return res
        .status(400)
        .json({ message: "Veuillez sélectionner un cours pour ce module." });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Cours introuvable." });
    }

    const finalMessage =
      messageToSave !== ""
        ? messageToSave
        : course.defaultCertificateMessage ||
          "Félicitations pour la validation de ce module !";

    const certificate = await Certificate.findOneAndUpdate(
      { student: studentId, course: courseId },
      {
        student: studentId,
        formateur: formateurId,
        course: courseId,
        isFinal: false,
        type: "module",
        status: "pending",
        encouragementMessage: finalMessage,
      },
      { upsert: true, returnDocument: "after", runValidators: true },
    );

    return res.status(200).json({
      success: true,
      message: "Demande de certificat de module transmise à l'administration.",
      certificate,
      data: certificate,
    });
  } catch (error) {
    console.error("Erreur requestCertificate:", error);
    return res
      .status(500)
      .json({ message: "Erreur serveur", error: error.message });
  }
};

/**
 * 2. L'Admin valide ou refuse un certificat
 */
export const updateCertificateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message, pdfUrl } = req.body;

    const updateData = { status };
    if (message !== undefined) {
      updateData.encouragementMessage = message;
    }
    if (pdfUrl) {
      updateData.pdfUrl = pdfUrl;
    }
    if (status === "approved") {
      updateData.issuedAt = new Date();
    }

    const certificate = await Certificate.findByIdAndUpdate(id, updateData, {
      returnDocument: "after",
    })
      .populate("student", "nom name email")
      .populate("course", "title titre thumbnail thumbnailUrl coverImage image")
      .populate("formateur", "nom name");

    if (!certificate) {
      return res.status(404).json({ message: "Certificat introuvable." });
    }

    return res.status(200).json({
      success: true,
      message: `Certificat ${status === "approved" ? "validé" : "refusé"} avec succès.`,
      certificate,
      data: certificate,
    });
  } catch (error) {
    console.error("Erreur updateCertificateStatus:", error);
    return res
      .status(500)
      .json({ message: "Erreur serveur", error: error.message });
  }
};

/**
 * 3. L'Admin récupère toutes les demandes
 */
export const getPendingCertificates = async (req, res) => {
  try {
    const recommendations = await Certificate.find()
      .populate("student", "nom name email")
      .populate("course", "title titre thumbnail thumbnailUrl coverImage image")
      .populate("formateur", "nom name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      recommendations,
      data: recommendations, // Sécurité si le front lit `res.data.data`
    });
  } catch (error) {
    console.error("Erreur getPendingCertificates:", error);
    return res
      .status(500)
      .json({ message: "Erreur serveur", error: error.message });
  }
};

/**
 * 4. L'Élève récupère ses certificats validés
 */
export const getStudentCertificates = async (req, res) => {
  try {
    const studentId = req.user._id || req.user.id;

    const certificates = await Certificate.find({
      student: studentId,
      status: "approved", // Seuls les certificats validés par l'admin
    })
      .populate("student", "nom prenom name firstName lastName email")
      .populate(
        "course",
        "title titre description thumbnail thumbnailUrl coverImage image duration",
      )
      .populate("formateur", "nom name")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      certificates,
      data: certificates, // 🎯 CRUCIAL : Fournit aussi la clé `data` si React lit `res.data.data`
    });
  } catch (error) {
    console.error("Erreur getStudentCertificates:", error);
    return res
      .status(500)
      .json({ message: "Erreur serveur", error: error.message });
  }
};
