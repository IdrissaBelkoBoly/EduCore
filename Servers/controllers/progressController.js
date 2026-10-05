import mongoose from "mongoose";
import Progress from "../models/Progress.js";
import Course from "../models/Course.js";

/**
 * @desc    Helper pour calculer le nombre TOTAL réel de leçons/étapes d'un cours
 */
const getTotalStepsFromCourse = (course) => {
  if (!course) return 0;

  // 1. Si le cours contient un tableau d'étapes (steps) non vide
  if (Array.isArray(course.steps) && course.steps.length > 0) {
    return course.steps.length;
  }

  // 2. Si le cours contient des modules
  if (Array.isArray(course.modules) && course.modules.length > 0) {
    const total = course.modules.reduce((acc, module) => {
      const moduleSteps = module.steps || module.lessons || [];
      return acc + moduleSteps.length;
    }, 0);
    if (total > 0) return total;
  }

  // 3. Si aucune sous-étape/module n'est configuré, le cours lui-même vaut 1 étape/leçon
  return 1;
};
/**
 * @desc    Récupérer toutes les progressions de l'étudiante connectée
 * @route   GET /api/progress/my-progress
 * @access  Private (Étudiante uniquement)
 */
export const getMyProgress = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const progressList = await Progress.find({ student: userId }).populate(
      "course",
    );

    return res.status(200).json({
      success: true,
      count: progressList.length,
      data: progressList,
    });
  } catch (error) {
    console.error("🔥 ERREUR DANS GET_MY_PROGRESS :", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de l'ensemble des progressions.",
      error: error.message,
    });
  }
};

/**
 * @desc    Récupérer toutes les progressions d'une étudiante spécifique (Pour la vue Formateur)
 * @route   GET /api/progress/student/:studentId
 * @access  Private (Formateur / Admin)
 */
export const getStudentProgressForTeacher = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: "L'identifiant de l'étudiante est invalide.",
      });
    }

    const progressList = await Progress.find({
      student: new mongoose.Types.ObjectId(studentId),
    }).populate("course");

    const formattedData = progressList.map((prog) => {
      const course = prog.course;

      if (!course) {
        return {
          ...prog.toObject(),
          totalStepsCount: 0,
          completedStepsCount: prog.completedSteps?.length || 0,
          globalPercentage: 0,
          percentage: 0,
        };
      }

      let totalStepsCount = getTotalStepsFromCourse(course);
      const completedCount = prog.completedSteps?.length || 0;

      let calculatedPercentage = 0;
      if (totalStepsCount > 0) {
        calculatedPercentage = Math.round(
          (completedCount / totalStepsCount) * 100,
        );
        if (calculatedPercentage > 100) calculatedPercentage = 100;
      }

      return {
        ...prog.toObject(),
        completedStepsCount: completedCount,
        totalStepsCount: totalStepsCount,
        globalPercentage: calculatedPercentage,
        percentage: calculatedPercentage, // 🟢 Ajout pour compatibilité frontend
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedData.length,
      data: formattedData,
    });
  } catch (error) {
    console.error("🔥 ERREUR DANS GET_STUDENT_PROGRESS_FOR_TEACHER :", error);
    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la récupération des progressions de l'étudiante.",
      error: error.message,
    });
  }
};

/**
 * @desc    Récupérer la progression d'une étudiante pour un cours spécifique
 * @route   GET /api/progress/:courseId
 * @access  Private (Étudiante ou Admin)
 */
export const getCourseProgress = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.params.id;
    const userId = req.user._id || req.user.id;

    if (
      !courseId ||
      !mongoose.Types.ObjectId.isValid(courseId) ||
      String(courseId).includes("[object")
    ) {
      return res.status(400).json({
        success: false,
        message: "L'identifiant du cours fourni est invalide.",
      });
    }

    let progress = await Progress.findOne({
      student: userId,
      course: courseId,
    });

    if (!progress) {
      const courseExists = await Course.findById(courseId);
      if (!courseExists) {
        return res.status(404).json({
          success: false,
          message: "Le cours demandé n'existe pas.",
        });
      }

      progress = await Progress.create({
        student: userId,
        course: courseId,
        completedSteps: [],
        globalPercentage: 0,
        detailedStats: {
          theorie: 0,
          pratique: 0,
          nailArt: 0,
          precision: 0,
        },
        lastViewedStep: "",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Progression récupérée avec succès.",
      data: progress,
    });
  } catch (error) {
    console.error("🔥 ERREUR DANS GET_COURSE_PROGRESS :", error);
    return res.status(500).json({
      success: false,
      message:
        "Erreur interne du serveur lors de la récupération de la progression.",
      error: error.message,
    });
  }
};

/**
 * @desc    Valider ou dévalider une étape du module et mettre à jour le pourcentage
 * @route   PUT /api/progress/:courseId/step
 * @access  Private (Étudiante uniquement)
 */
export const toggleStepProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { stepId, statisticsUpdate } = req.body;
    const studentId = req.user._id || req.user.id;

    if (!mongoose.Types.ObjectId.isValid(courseId) || !stepId) {
      return res.status(400).json({
        success: false,
        message: "L'identifiant du cours ou de l'étape est invalide.",
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Cours non trouvé.",
      });
    }

    let progress = await Progress.findOne({
      student: studentId,
      course: courseId,
    });

    if (!progress) {
      progress = new Progress({
        student: studentId,
        course: courseId,
        completedSteps: [],
      });
    }

    const stringStepId = String(stepId);
    const stringSteps = progress.completedSteps.map((id) => String(id));
    const stepIndex = stringSteps.indexOf(stringStepId);

    if (stepIndex > -1) {
      progress.completedSteps.splice(stepIndex, 1);
    } else {
      progress.completedSteps.push(stringStepId);
    }

    progress.lastViewedStep = stringStepId;

    const totalStepsCount = getTotalStepsFromCourse(course);

    if (totalStepsCount > 0) {
      progress.globalPercentage = Math.round(
        (progress.completedSteps.length / totalStepsCount) * 100,
      );
      if (progress.globalPercentage > 100) progress.globalPercentage = 100;
    } else {
      progress.globalPercentage = 0;
    }

    if (statisticsUpdate) {
      if (statisticsUpdate.theorie !== undefined)
        progress.detailedStats.theorie = statisticsUpdate.theorie;
      if (statisticsUpdate.pratique !== undefined)
        progress.detailedStats.pratique = statisticsUpdate.pratique;
      if (statisticsUpdate.nailArt !== undefined)
        progress.detailedStats.nailArt = statisticsUpdate.nailArt;
      if (statisticsUpdate.precision !== undefined)
        progress.detailedStats.precision = statisticsUpdate.precision;
    }

    await progress.save();

    return res.status(200).json({
      success: true,
      message: "Progression mise à jour avec succès",
      data: progress,
    });
  } catch (error) {
    console.error("🔥 ERREUR DANS TOGGLE_STEP_PROGRESS :", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour de la progression",
      error: error.message,
    });
  }
};
