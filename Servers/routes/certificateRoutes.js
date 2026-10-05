import express from "express";
import {
  requestCertificate,
  updateCertificateStatus,
  getPendingCertificates,
  getStudentCertificates,
} from "../controllers/certificateController.js";

import {
  protect,
  authorize,
  isApprovedTeacher,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @route   POST /api/certificates/recommend
 * @route   POST /api/certificates/request
 * @desc    Un enseignant/formateur demande un certificat (Module ou Final)
 * @access  Private (Teacher / Formateur / Admin)
 */
router.post(
  "/recommend",
  protect,
  authorize("teacher", "formateur", "admin"),
  isApprovedTeacher,
  requestCertificate,
);

router.post(
  "/request",
  protect,
  authorize("teacher", "formateur", "admin"),
  isApprovedTeacher,
  requestCertificate,
);

/**
 * @route   GET /api/certificates/pending
 * @desc    L'administrateur récupère toutes les demandes
 * @access  Private (Admin)
 */
router.get("/pending", protect, authorize("admin"), getPendingCertificates);

/**
 * @route   PUT /api/certificates/:id/status
 * @desc    L'administrateur valide ou refuse un certificat
 * @access  Private (Admin)
 */
router.put("/:id/status", protect, authorize("admin"), updateCertificateStatus);

/**
 * @route   GET /api/certificates/my-certificates
 * @desc    L'élève récupère ses certificats validés
 * @access  Private (Tous les utilisateurs connectés)
 */
router.get("/my-certificates", protect, getStudentCertificates);

export default router;
