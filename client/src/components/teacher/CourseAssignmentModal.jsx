import React, { useState, useRef } from "react";
import axios from "axios";

const CourseAssignmentModal = ({
  isOpen,
  onClose,
  courses,
  onAssignmentCreated,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    courseId: "",
    dueDate: "",
  });
  const [resourceFile, setResourceFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🟢 AJOUT 1 : États pour l'audio et la photo annotée/schéma de consigne
  const [annotatedInstructionFile, setAnnotatedInstructionFile] =
    useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setResourceFile(e.target.files[0]);
  };

  // 🟢 AJOUT 2 : Fonctions pour enregistrer la consigne vocale
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert("Impossible d'accéder au micro : " + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      // 🟢 Utilisation de FormData pour envoyer le fichier ressource
      const data = new FormData();
      data.append("title", formData.title);
      data.append("description", formData.description);
      data.append("courseId", formData.courseId);
      data.append("dueDate", formData.dueDate);

      if (resourceFile) {
        // Le nom "resourceFile" doit correspondre à upload.single("resourceFile") dans assignmentRoutes.js
        data.append("resourceFile", resourceFile);
      }

      // 🟢 AJOUT 3 : Ajout du fichier audio et de l'image annotée si présents
      if (audioBlob) {
        data.append("audio", audioBlob, "consigne-vocale.webm");
      }
      if (annotatedInstructionFile) {
        data.append("annotatedImage", annotatedInstructionFile);
      }

      // 🟢 URL corrigée : /api/assignments (sans /create)
      const res = await axios.post(
        "http://localhost:5000/api/assignments",
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (res.data.success || res.data._id) {
        alert("Devoir publié avec succès !");
        if (onAssignmentCreated) onAssignmentCreated();
        onClose();
      }
    } catch (error) {
      console.error("Erreur lors de la création du devoir:", error);
      alert(error.response?.data?.message || "Erreur lors de la publication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Publier un devoir
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Titre du devoir */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre du devoir
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-pink-500 outline-none"
              placeholder="Ex: Exercice de pratique"
            />
          </div>

          {/* Sélection du cours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cours associé
            </label>
            <select
              name="courseId"
              value={formData.courseId}
              onChange={handleChange}
              required
              className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-pink-500 outline-none"
            >
              <option value="">Sélectionner un cours</option>
              {courses?.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          {/* Date limite */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date limite de rendu
            </label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              required
              className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-pink-500 outline-none"
            />
          </div>

          {/* Consignes / Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Consignes
            </label>
            <textarea
              name="description"
              rows="3"
              value={formData.description}
              onChange={handleChange}
              required
              className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-pink-500 outline-none"
              placeholder="Décrivez les attentes pour ce devoir..."
            />
          </div>

          {/* 🟢 AJOUT 4 : Option Audio pour les consignes */}
          <div className="bg-pink-50 border border-pink-200 p-3 rounded-xl">
            <label className="block text-xs font-bold text-pink-700 mb-2">
              🎙️ Explication vocale des consignes (Optionnel) :
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-semibold"
                >
                  🔴 Enregistrer une consigne orale
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg font-semibold animate-pulse"
                >
                  ⏹️ Arrêter l'enregistrement
                </button>
              )}

              {audioBlob && (
                <div className="w-full mt-2">
                  <p className="text-xs text-emerald-600 font-semibold mb-1">
                    ✅ Audio enregistré :
                  </p>
                  <audio
                    controls
                    src={URL.createObjectURL(audioBlob)}
                    className="w-full h-8"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 🟢 AJOUT 5 : Option Photo / Schéma d'exemple annoté */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🖼️ Photo / Schéma d'exemple annoté (Optionnel)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAnnotatedInstructionFile(e.target.files[0])}
              className="w-full border rounded-lg p-2 text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"
            />
          </div>

          {/* 🟢 CHAMP POUR LES FICHIERS & VIDÉOS (Inchangé) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fichier ressource / Vidéo (Optionnel)
            </label>
            <input
              type="file"
              accept="image/*,video/*,.pdf,.zip,.doc,.docx"
              onChange={handleFileChange}
              className="w-full border rounded-lg p-2 text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"
            />
            {resourceFile && (
              <p className="text-xs text-emerald-600 mt-1">
                Fichier sélectionné : {resourceFile.name}
              </p>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end space-x-3 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-lg disabled:opacity-50"
            >
              {loading ? "Publication..." : "Publier le devoir"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CourseAssignmentModal;
