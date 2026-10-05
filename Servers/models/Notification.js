import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["COURSE", "HOMEWORK", "CORRECTION", "CHAT", "CERTIFICATE"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    targetTab: { type: String, default: "overview" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model("Notification", notificationSchema);
