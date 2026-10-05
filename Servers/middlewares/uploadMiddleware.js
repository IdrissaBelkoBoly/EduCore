import multer from "multer";
import path from "path";

// Configuration du stockage local pour les PDF, images et fichiers AUDIO
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads/");
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`);
  },
});

// Filtre pour accepter PDF, Images ET Audio
const fileFilter = (req, file, cb) => {
  // 🟢 Ajout des extensions et types audio (webm, wav, mp3, ogg, m4a, etc.)
  const allowedTypes = /pdf|png|jpg|jpeg|webp|webm|wav|mp3|ogg|m4a|mpeg|audio/;

  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );

  // Autoriser si l'extension correspond OU si le type MIME commence par "audio/"
  const mimetype =
    allowedTypes.test(file.mimetype) || file.mimetype.startsWith("audio/");

  if (extname || mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Seuls les fichiers PDF, images et audio sont autorisés !"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // Limite à 25 Mo
});

export default upload;
