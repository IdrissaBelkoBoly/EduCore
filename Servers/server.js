import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

// Importation des fichiers de routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import inspirationRoutes from "./routes/inspirationRoutes.js";
import homeworkRoutes from "./routes/homeworkRoutes.js";
import assignmentRoutes from "./routes/assignmentRoutes.js";
import submissionRoutes from "./routes/submissionRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import teacherRoutes from "./routes/teacherRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
// 📜 NOUVEAU : Importation des routes de certificats
import certificateRoutes from "./routes/certificateRoutes.js";

dotenv.config();

// 1. Initialisation d'Express
const app = express();
const PORT = process.env.PORT || 5000;

// 2. Connexion à MongoDB
connectDB();

// 3. Middlewares Globaux
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// Route de test
app.get("/", (req, res) => {
  res.send("API de l'Écosystème d'Onglerie est en cours d'exécution...");
});

// 4. Endpoints API
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/inspirations", inspirationRoutes);
app.use("/api/homework", homeworkRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/notifications", notificationRoutes);
// 📜 NOUVEAU : Route pour la gestion des certificats
app.use("/api/certificates", certificateRoutes);

// 5. Middlewares de gestion des erreurs
app.use((req, res, next) => {
  res
    .status(404)
    .json({ message: `Ressource non trouvée - ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

// 6. Lancement du serveur
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
