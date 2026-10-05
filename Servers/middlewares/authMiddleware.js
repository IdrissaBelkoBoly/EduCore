import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Middleware pour vérifier si l'utilisateur est connecté via JWT
 */
export const protect = async (req, res, next) => {
  let token;

  // Verification du token dans les headers HTTP (Authorization: Bearer <token>)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extraction du token
      token = req.headers.authorization.split(" ")[1];

      // Vérification et décodage du token avec la clé secrète
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // On récupère l'utilisateur lié à l'ID du token (sans son mot de passe)
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res
          .status(401)
          .json({ message: "Utilisateur non trouvé avec ce token" });
      }

      next(); // On passe au middleware ou contrôleur suivant
    } catch (error) {
      return res
        .status(401)
        .json({ message: "Accès non autorisé, token invalide" });
    }
  }

  // Si aucun token n'est trouvé
  if (!token) {
    return res
      .status(401)
      .json({ message: "Accès non autorisé, aucun token fourni" });
  }
};

/**
 * Middleware pour restreindre l'accès selon le rôle (ex: 'admin', 'teacher')
 * @param  {...string} roles - Les rôles autorisés (ex: 'admin', 'teacher')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    // req.user a été injecté juste avant par le middleware 'protect'
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Le rôle '${req.user?.role || "Inconnu"}' n'est pas autorisé à accéder à cette ressource`,
      });
    }
    next();
  };
};

/**
 * Middleware pour vérifier qu'un enseignant (teacher) est bien validé par l'admin
 */
export const isApprovedTeacher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Non autorisé" });
  }

  // L'admin passe toujours
  if (req.user.role === "admin") {
    return next();
  }

  // 🟢 Vérification mise à jour : rôle "teacher" ET statut "active" ou "approved"
  const isTeacherRole = req.user.role === "teacher";
  const isApproved =
    req.user.status === "active" ||
    req.user.status === "approved" ||
    req.user.isActive === true;

  if (isTeacherRole && isApproved) {
    return next();
  }

  return res.status(403).json({
    message:
      "Accès refusé. Votre compte enseignant est en attente d'approbation par l'administrateur.",
  });
};
