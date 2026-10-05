import React, { useState, useEffect } from "react";
import axios from "axios";

const getToken = () => {
  let token = localStorage.getItem("token");
  if (token) return token;
  try {
    const userObj = JSON.parse(
      localStorage.getItem("user") || localStorage.getItem("userInfo") || "{}",
    );
    if (userObj?.token) return userObj.token;
  } catch (e) {}
  return null;
};

const SubmitHomeworkModal = ({
  selectedHomework,
  setSelectedHomework,
  onSuccess,
}) => {
  const [submissionComment, setSubmissionComment] = useState("");
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Enregistrement Audio en direct
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);

  const isAlreadySubmitted = Boolean(selectedHomework?.submission);
  // 🟢 Vérification du statut de la soumission
  const submissionStatus = selectedHomework?.submission?.status || "pending";
  const isPending = submissionStatus === "pending";

  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioPreviewUrl(null);
    }
  }, [audioBlob]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      alert("Accès au microphone refusé ou non supporté par votre navigateur.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const fileToSend =
      submissionFile ||
      (audioBlob
        ? new File([audioBlob], "vocal-rendu.webm", { type: "audio/webm" })
        : null);

    if (!fileToSend && !isAlreadySubmitted) {
      alert(
        "Veuillez sélectionner un fichier (photo, vidéo, audio) ou enregistrer un message vocal.",
      );
      return;
    }

    try {
      setSubmitting(true);
      const token = getToken();
      const formData = new FormData();

      const homeworkId =
        selectedHomework?.assignment?._id ||
        selectedHomework?.assignment ||
        selectedHomework?._id ||
        selectedHomework?.id;

      const courseId =
        selectedHomework?.course?._id ||
        selectedHomework?.course ||
        selectedHomework?.courseId;

      if (homeworkId) {
        formData.append("assignmentId", homeworkId);
        formData.append("homeworkId", homeworkId);
      }

      if (courseId) {
        formData.append("courseId", courseId);
      }

      formData.append("comment", submissionComment);

      if (submissionFile) {
        formData.append("submissionFile", submissionFile);
      }

      if (audioBlob) {
        formData.append("audio", audioBlob, "vocal-rendu.webm");
      }

      await axios.post(
        "http://localhost:5000/api/submissions/submit",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      alert("Votre devoir a été envoyé avec succès au formateur ! 🎉");
      setSelectedHomework(null);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Erreur lors de l'envoi du devoir:", err);
      alert(
        err.response?.data?.message ||
          "Une erreur s'est produite lors de l'envoi.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 🟢 1. Supprimer le devoir (Uniquement si non corrigé)
  const handleDeleteSubmission = async () => {
    if (
      !window.confirm(
        "Êtes-vous sûr de vouloir supprimer votre devoir déposé ? Le devoir repassera dans la liste 'À faire'.",
      )
    ) {
      return;
    }

    try {
      setSubmitting(true);
      const token = getToken();
      const submissionId =
        selectedHomework.submission?._id ||
        selectedHomework.submission?.id ||
        selectedHomework._id;

      await axios.delete(
        `http://localhost:5000/api/submissions/my-submissions/${submissionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      alert("Votre dépôt a bien été supprimé.");
      setSelectedHomework(null);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Erreur lors de la suppression :", err);
      alert(
        err.response?.data?.message ||
          "Impossible de supprimer ce dépôt pour le moment.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 🟢 2. Masquer / Archiver le devoir (Si déjà corrigé)
  const handleArchiveSubmission = async () => {
    try {
      setSubmitting(true);
      const token = getToken();
      const submissionId =
        selectedHomework.submission?._id ||
        selectedHomework.submission?.id ||
        selectedHomework._id;

      await axios.patch(
        `http://localhost:5000/api/submissions/my-submissions/${submissionId}/archive`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      alert("Devoir masqué de votre liste avec succès.");
      setSelectedHomework(null);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Erreur lors de l'archivage :", err);
      alert("Impossible de masquer ce devoir.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-bold text-neutral-800 text-sm">
            {isAlreadySubmitted ? "Gérer mon dépôt" : "Déposer mon devoir"}
          </h3>
          <button
            type="button"
            onClick={() => setSelectedHomework(null)}
            className="text-neutral-400 hover:text-neutral-600 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-600 mb-1">
              Fichier (Photo, Vidéo ou Document)
            </label>
            <input
              type="file"
              accept="image/*,video/*,audio/*,.pdf"
              onChange={(e) => setSubmissionFile(e.target.files[0])}
              className="w-full p-2 border border-neutral-200 rounded-xl bg-neutral-50 text-xs"
            />
          </div>

          <div className="bg-[#fcf8f5] border border-[#f3e6dc] p-3 rounded-xl space-y-2">
            <span className="text-xs font-bold text-[#d97736] block">
              🎙️ Enregistrer une réponse vocale :
            </span>
            <div className="flex items-center gap-2">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="px-3 py-1.5 bg-[#d97736] hover:bg-[#c2652a] text-white text-xs font-medium rounded-lg transition cursor-pointer"
                >
                  🔴 Enregistrer un vocal
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg animate-pulse cursor-pointer"
                >
                  ⏹️ Arrêter
                </button>
              )}

              {audioPreviewUrl && (
                <span className="text-xs text-green-600 font-semibold">
                  Audio prêt ! 🎵
                </span>
              )}
            </div>

            {audioPreviewUrl && (
              <audio
                controls
                src={audioPreviewUrl}
                className="w-full h-8 mt-2"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-600 mb-1">
              Remarque / Question pour le formateur
            </label>
            <textarea
              rows="3"
              value={submissionComment}
              onChange={(e) => setSubmissionComment(e.target.value)}
              placeholder="Ex: J'ai rencontré une petite difficulté lors de la pose du chablon..."
              className="w-full p-3 border border-neutral-200 rounded-xl bg-neutral-50 text-xs outline-hidden focus:border-[#d97736]"
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            {/* 🟢 Actions sur les soumissions existantes */}
            {isAlreadySubmitted ? (
              isPending ? (
                /* 1. Si pas encore corrigé -> Bouton Supprimer */
                <button
                  type="button"
                  onClick={handleDeleteSubmission}
                  disabled={submitting}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold hover:underline cursor-pointer"
                >
                  🗑️ Supprimer le rendu
                </button>
              ) : (
                /* 2. Si déjà corrigé -> Bouton Masquer */
                <button
                  type="button"
                  onClick={handleArchiveSubmission}
                  disabled={submitting}
                  className="text-xs text-neutral-600 hover:text-neutral-800 font-semibold hover:underline cursor-pointer"
                >
                  👁️ Masquer de ma liste
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setSelectedHomework(null)}
                className="px-4 py-2 border rounded-xl text-neutral-600 text-xs cursor-pointer hover:bg-neutral-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-[#d97736] hover:bg-[#c2652a] text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                {submitting ? "Envoi..." : "Envoyer 🚀"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitHomeworkModal;
