import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  text: { type: String, default: "" },
  mediaUrl: { type: String, default: "" }, // URL de l'image, vidéo, audio ou document
  messageType: {
    type: String,
    enum: ["text", "image", "video", "audio", "file"],
    default: "text",
  },
  isRead: { type: Boolean, default: false }, // 👈 Ajouté pour gérer les notifications
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Message", messageSchema);
