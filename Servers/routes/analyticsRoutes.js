import express from "express";
import Homework from "../models/Homework.js";
import User from "../models/User.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/dashboard", protect, authorize("admin"), async (req, res) => {
  try {
    // 1. STATISTIQUES ÉTUDIANTES & FINANCIÈRES 💳
    const students = await User.find({ role: "student" });
    const totalStudents = students.length;

    // Calculs financiers basés sur ton schéma User
    const totalRevenuePaid = students.reduce(
      (sum, s) => sum + (s.pricePaid || 0),
      0,
    );
    const totalRevenueExpected = students.reduce(
      (sum, s) => sum + (s.totalPrice || 0),
      0,
    );
    const remainingToCollect = totalRevenueExpected - totalRevenuePaid;

    // Compter les étudiantes à jour vs en retard/bloquées
    const fullyPaidCount = students.filter(
      (s) => s.pricePaid >= s.totalPrice && s.totalPrice > 0,
    ).length;
    const blockedStudentsCount = students.filter((s) => s.isBlocked).length;

    // 2. STATISTIQUES DEVOIRS & RÉSULTATS 📝
    const totalSubmissions = await Homework.countDocuments();
    const pendingCount = await Homework.countDocuments({ status: "pending" });
    const approvedCount = await Homework.countDocuments({ status: "approved" });
    const rejectedCount = await Homework.countDocuments({ status: "rejected" });

    // Taux de réussite global (% de devoirs validés sur le total soumis)
    const passRate =
      totalSubmissions > 0
        ? ((approvedCount / totalSubmissions) * 100).toFixed(1)
        : 0;

    // Moyenne générale des notes attribuées
    const gradedHomeworks = await Homework.find({
      grade: { $ne: null, $exists: true },
    });
    const averageGrade =
      gradedHomeworks.length > 0
        ? (
            gradedHomeworks.reduce((acc, h) => acc + (h.grade || 0), 0) /
            gradedHomeworks.length
          ).toFixed(2)
        : 0;

    // 3. RÉPARTITION DES RENDUS ET MOYENNES PAR COURS 📚
    const submissionsByCourse = await Homework.aggregate([
      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$course.title",
          count: { $sum: 1 },
          avgGrade: { $avg: "$grade" },
        },
      },
      {
        $project: {
          courseTitle: { $ifNull: ["$_id", "Sans cours attribué"] },
          count: 1,
          avgGrade: { $round: ["$avgGrade", 2] },
        },
      },
    ]);

    // Envoi de la réponse complète
    res.json({
      success: true,
      stats: {
        students: {
          totalStudents,
          fullyPaidCount,
          blockedStudentsCount,
        },
        financials: {
          totalRevenuePaid, // Encaissé (ex: pricePaid)
          totalRevenueExpected, // Total prévu (ex: totalPrice)
          remainingToCollect, // Reste à percevoir
        },
        homeworks: {
          totalSubmissions,
          pendingCount,
          approvedCount,
          rejectedCount,
          passRate: Number(passRate),
          averageGrade: Number(averageGrade),
        },
        submissionsByCourse,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
