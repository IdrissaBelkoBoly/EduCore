import mongoose from "mongoose";

const progressSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    completedSteps: [
      {
        type: String,
        required: true,
      },
    ],
    globalPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    detailedStats: {
      theorie: { type: Number, default: 0, min: 0, max: 100 },
      pratique: { type: Number, default: 0, min: 0, max: 100 },
      nailArt: { type: Number, default: 0, min: 0, max: 100 },
      precision: { type: Number, default: 0, min: 0, max: 100 },
    },
    lastViewedStep: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

progressSchema.index({ student: 1, course: 1 }, { unique: true });

// 🔴 CORRECTION ICI : Pas de paramètre `next` quand la fonction est `async`
progressSchema.pre("save", async function () {
  try {
    if (this.isModified("completedSteps")) {
      const Course = mongoose.model("Course");
      const courseData = await Course.findById(this.course);

      let totalStepsCount = 1; // Valeur par défaut : 1 leçon pour le cours

      if (courseData) {
        if (Array.isArray(courseData.steps) && courseData.steps.length > 0) {
          totalStepsCount = courseData.steps.length;
        } else if (
          Array.isArray(courseData.modules) &&
          courseData.modules.length > 0
        ) {
          const count = courseData.modules.reduce((acc, module) => {
            const steps = module.steps || module.lessons || [];
            return acc + steps.length;
          }, 0);
          if (count > 0) totalStepsCount = count;
        }
      }

      if (totalStepsCount > 0) {
        this.globalPercentage = Math.round(
          (this.completedSteps.length / totalStepsCount) * 100,
        );
        if (this.globalPercentage > 100) this.globalPercentage = 100;
      } else {
        this.globalPercentage = 0;
      }
    }
  } catch (error) {
    throw error;
  }
});
const Progress =
  mongoose.models.Progress || mongoose.model("Progress", progressSchema);

export default Progress;
