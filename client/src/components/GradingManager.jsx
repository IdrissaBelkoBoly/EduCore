import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

// Helper pour récupérer le token de manière fiable
const getToken = () => {
  let token = localStorage.getItem("token");
  if (token) return token;

  try {
    const userObj = JSON.parse(
      localStorage.getItem("user") || localStorage.getItem("userInfo") || "{}",
    );
    if (userObj && userObj.token) return userObj.token;
  } catch (e) {
    // Ignorer si échec du parse
  }
  return null;
};

const GradingManager = () => {
  // États principaux
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  // Filtres et Recherche
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Formulaire de correction
  const [reviewData, setReviewData] = useState({
    status: "approved",
    grade: "",
    feedback: "",
    feedbackFile: null,
  });

  // Aperçu du fichier de correction (vocal ou document)
  const [filePreview, setFilePreview] = useState(null);

  // Enregistreur vocal
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Helper pour extraire le nom complet de l'élève de manière robuste
  const getStudentDisplayName = (item) => {
    if (item?.studentName && item.studentName !== "Élève anonyme") {
      return item.studentName;
    }
    const s = item?.student || item?.user;
    if (!s) return "Élève anonyme";

    const full = `${s.firstName || ""} ${s.lastName || ""}`.trim();
    return full || s.name || s.nom || s.email || "Élève anonyme";
  };

  // 1. Charger les devoirs reçus
  const fetchSubmissions = async () => {
    try {
      setLoadingSubmissions(true);
      const token = getToken();

      if (!token) {
        console.warn("Aucun token disponible.");
        setLoadingSubmissions(false);
        return;
      }

      const res = await axios.get(
        "http://localhost:5000/api/submissions/admin/all",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // Sécurité pour bien cibler le tableau dans la réponse
      if (res.data && Array.isArray(res.data.data)) {
        setSubmissions(res.data.data);
      } else if (Array.isArray(res.data)) {
        setSubmissions(res.data);
      } else {
        setSubmissions([]);
      }
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des devoirs :",
        error.response?.data || error.message,
      );
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // 2. Supprimer une soumission / un devoir
  const handleDeleteSubmission = async (id, e) => {
    e.stopPropagation();
    if (
      !window.confirm(
        "Êtes-vous sûre de vouloir supprimer ce devoir ? Cette action est irréversible.",
      )
    ) {
      return;
    }

    try {
      const token = getToken();
      await axios.delete(`http://localhost:5000/api/submissions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("Devoir supprimé avec succès.");
      setSubmissions((prev) => prev.filter((item) => item._id !== id));
      if (selectedSubmission?._id === id) {
        setSelectedSubmission(null);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
      alert("Erreur lors de la suppression du devoir.");
    }
  };

  // 3. Gestion de l'enregistrement vocal
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const audioFile = new File(
          [audioBlob],
          `vocal_feedback_${Date.now()}.webm`,
          { type: "audio/webm" },
        );

        setReviewData((prev) => ({ ...prev, feedbackFile: audioFile }));
        setFilePreview({
          url: URL.createObjectURL(audioBlob),
          name: audioFile.name,
          type: "audio/webm",
        });

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert("Accès au microphone refusé ou non supporté.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReviewData((prev) => ({ ...prev, feedbackFile: file }));
      setFilePreview({
        url: URL.createObjectURL(file),
        name: file.name,
        type: file.type,
      });
    }
  };

  const removeFeedbackFile = () => {
    setReviewData((prev) => ({ ...prev, feedbackFile: null }));
    setFilePreview(null);
  };

  // 4. Ouvrir la modal de correction
  const handleOpenReviewModal = (item) => {
    setSelectedSubmission(item);
    setReviewData({
      status: item.status === "pending" ? "approved" : item.status,
      grade: item.grade !== null && item.grade !== undefined ? item.grade : "",
      feedback: item.feedback || item.commentAdmin || "",
      feedbackFile: null,
    });
    setFilePreview(null);
    setIsRecording(false);
  };

  // 5. Soumettre la correction
  // 5. Soumettre la correction
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append("status", reviewData.status);
      formData.append("grade", reviewData.grade);
      formData.append("feedback", reviewData.feedback);

      // Envoi sous le bon nom de champ selon le type de fichier
      if (reviewData.feedbackFile) {
        if (reviewData.feedbackFile.type.startsWith("audio/")) {
          // Pour les enregistrements vocaux
          formData.append("audio", reviewData.feedbackFile);
        } else {
          // Pour les PDF ou documents de correction
          formData.append("feedbackFile", reviewData.feedbackFile);
        }
      }

      await axios.put(
        `http://localhost:5000/api/submissions/grade/${selectedSubmission._id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      alert("Correction enregistrée avec succès !");
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error) {
      console.error(
        "Erreur d'enregistrement :",
        error.response?.data || error.message,
      );
      alert(
        `Erreur lors de la sauvegarde : ${
          error.response?.data?.message || "Vérifiez vos champs backend."
        }`,
      );
    }
  };

  // Helper d'URL pour affichage d'image/vidéo
  const formatMediaUrl = (url) => {
    if (!url) return "";
    return url.startsWith("http") ? url : `http://localhost:5000${url}`;
  };

  // Extraire l'URL du fichier du devoir quelle que soit sa clé
  const getSubmissionFileUrl = (item) => {
    return item?.fileUrl || item?.submissionUrl || item?.file || "";
  };

  // Filtrage intelligent de la liste
  const filteredSubmissions = submissions.filter((item) => {
    const studentName = getStudentDisplayName(item).toLowerCase();

    const courseTitle = (
      item.courseId?.title ||
      item.assignment?.title ||
      item.course?.title ||
      ""
    ).toLowerCase();

    const matchesSearch =
      studentName.includes(searchTerm.toLowerCase()) ||
      courseTitle.includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* EN-TÊTE ET STATISTIQUES */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-neutral-900">
            Correction des Devoirs
          </h2>
          <p className="text-sm text-neutral-500">
            Gérez les rendus des étudiantes, visionnez leurs travaux et
            attribuez les notes.
          </p>
        </div>
        <div className="flex space-x-2 text-xs font-semibold">
          <span className="bg-amber-100 text-[#d97736] px-3 py-1.5 rounded-full flex items-center">
            ⏳ {submissions.filter((s) => s.status === "pending").length} En
            attente
          </span>
          <span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-full flex items-center">
            ✅ {submissions.filter((s) => s.status !== "pending").length}{" "}
            Traités
          </span>
        </div>
      </div>

      {/* BARRE DE RECHERCHE ET FILTRES RAPIDES */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-100 flex flex-col md:flex-row gap-3 justify-between items-center shadow-xs">
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="🔍 Rechercher une élève ou un cours..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3.5 py-2 text-xs border rounded-xl bg-neutral-50 focus:bg-white focus:outline-hidden focus:border-[#d97736] transition"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "Tous" },
            { id: "pending", label: "À corriger" },
            { id: "approved", label: "Validés" },
            { id: "rejected", label: "À revoir" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-[#d97736] text-white shadow-xs"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENU / LISTE DES DEVOIRS AVEC SCROLLBAR */}
      {loadingSubmissions ? (
        <p className="text-center py-8 text-neutral-500">
          Chargement des devoirs reçus...
        </p>
      ) : filteredSubmissions.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-neutral-100 text-neutral-500">
          Aucun devoir ne correspond à vos critères.
        </div>
      ) : (
        <div className="max-h-150 overflow-y-auto pr-1 space-y-3">
          {filteredSubmissions.map((copie) => {
            const displayName = getStudentDisplayName(copie);
            const initial = displayName.charAt(0).toUpperCase();

            return (
              <div
                key={copie._id}
                className="bg-white rounded-2xl shadow-xs border border-neutral-100 p-5 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Infos étudiante & cours */}
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-full bg-[#f3ede4] text-[#d97736] flex items-center justify-center font-bold text-sm shrink-0">
                    {initial}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-neutral-800 text-sm">
                        {displayName}
                      </h3>
                      <span className="text-xs text-neutral-400">•</span>
                      <span className="text-xs text-neutral-400">
                        {new Date(copie.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600 mt-0.5">
                      <span className="text-neutral-400 font-medium">
                        Cours :{" "}
                      </span>
                      {copie.courseId?.title ||
                        copie.assignment?.title ||
                        copie.course?.title ||
                        "Cours non spécifié"}
                    </p>

                    <div className="flex items-center space-x-1.5 mt-2 text-xs text-neutral-500 bg-neutral-50 px-2.5 py-1 rounded-md w-fit">
                      <span>{copie.fileType === "video" ? "🎬" : "🖼️"}</span>
                      <span className="capitalize">
                        {copie.fileType || "Fichier"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Statuts, Action Correction & Bouton Supprimer */}
                <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-neutral-50">
                  {copie.status === "pending" ? (
                    <>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                        À corriger
                      </span>
                      <button
                        onClick={() => handleOpenReviewModal(copie)}
                        className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
                      >
                        Ouvrir la copie ✍️
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-right">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border block w-fit ml-auto mb-1 ${
                            copie.status === "approved"
                              ? "bg-green-50 text-green-700 border-green-100"
                              : "bg-red-50 text-red-700 border-red-100"
                          }`}
                        >
                          {copie.status === "approved" ? "Validé" : "À revoir"}
                        </span>
                        <p className="text-xs font-bold text-neutral-800">
                          Note :{" "}
                          {copie.grade !== null && copie.grade !== undefined
                            ? `${copie.grade}/20`
                            : "Non noté"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenReviewModal(copie)}
                        className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                      >
                        Modifier 👁️
                      </button>
                    </>
                  )}

                  {/* BOUTON SUPPRIMER */}
                  <button
                    onClick={(e) => handleDeleteSubmission(copie._id, e)}
                    title="Supprimer ce devoir"
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CORRECTION */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h3 className="text-lg font-bold text-neutral-800">
                  Devoir de {getStudentDisplayName(selectedSubmission)}
                </h3>
                <p className="text-xs text-neutral-400">
                  Cours :{" "}
                  {selectedSubmission.courseId?.title ||
                    selectedSubmission.assignment?.title ||
                    selectedSubmission.course?.title}
                </p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-neutral-400 hover:text-neutral-600 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* APERÇU DU DEVOIR ÉTUDIANTE */}
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
              {selectedSubmission.comment && (
                <p className="text-sm italic text-neutral-700 mb-3 bg-white p-3 rounded-lg border border-neutral-100">
                  Remarque de l'élève : "{selectedSubmission.comment}"
                </p>
              )}

              {getSubmissionFileUrl(selectedSubmission) && (
                <>
                  {selectedSubmission.fileType === "video" ||
                  getSubmissionFileUrl(selectedSubmission).match(
                    /\.(mp4|webm)$/i,
                  ) ? (
                    <video
                      src={formatMediaUrl(
                        getSubmissionFileUrl(selectedSubmission),
                      )}
                      controls
                      className="w-full max-h-80 rounded-lg bg-black"
                    />
                  ) : getSubmissionFileUrl(selectedSubmission).match(
                      /\.(mp3|wav|ogg)$/i,
                    ) ? (
                    <audio
                      src={formatMediaUrl(
                        getSubmissionFileUrl(selectedSubmission),
                      )}
                      controls
                      className="w-full"
                    />
                  ) : (
                    <img
                      src={formatMediaUrl(
                        getSubmissionFileUrl(selectedSubmission),
                      )}
                      alt="Rendu de l'élève"
                      className="max-h-80 rounded-lg mx-auto object-contain"
                    />
                  )}
                </>
              )}
            </div>

            {/* FORMULAIRE DE CORRECTION */}
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-500 mb-1">
                    Décision
                  </label>
                  <select
                    value={reviewData.status}
                    onChange={(e) =>
                      setReviewData({ ...reviewData, status: e.target.value })
                    }
                    className="w-full p-3 border rounded-xl bg-neutral-50 text-sm outline-hidden focus:border-[#d97736]"
                  >
                    <option value="approved">✅ Valider (Approved)</option>
                    <option value="rejected">❌ À revoir (Rejected)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-500 mb-1">
                    Note (/20)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={reviewData.grade}
                    onChange={(e) =>
                      setReviewData({ ...reviewData, grade: e.target.value })
                    }
                    placeholder="Ex: 16"
                    className="w-full p-3 border rounded-xl bg-neutral-50 text-sm outline-hidden focus:border-[#d97736]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-neutral-500 mb-1">
                  Commentaires & Conseils
                </label>
                <textarea
                  rows="3"
                  value={reviewData.feedback}
                  onChange={(e) =>
                    setReviewData({ ...reviewData, feedback: e.target.value })
                  }
                  placeholder="Ex: Excellent travail..."
                  className="w-full p-3 border rounded-xl bg-neutral-50 text-sm outline-hidden focus:border-[#d97736] resize-none"
                ></textarea>
              </div>

              {/* CORRECTION VOCALE OU FICHIER JOINT */}
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">
                  Feedback audio ou pièce jointe
                </label>

                {!filePreview ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 p-3 bg-amber-50/50 border border-amber-200 rounded-xl text-center">
                      {!isRecording ? (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="px-3 py-1.5 bg-[#d97736] hover:bg-[#c2652a] text-white text-xs font-medium rounded-lg shadow-xs transition cursor-pointer"
                        >
                          🎙️ Enregistrer une note vocale
                        </button>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-xs text-red-600 font-bold animate-pulse block">
                            🔴 Enregistrement ({recordingTime}s)
                          </span>
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="px-3 py-1 bg-neutral-800 text-white text-xs rounded-lg cursor-pointer"
                          >
                            Stop
                          </button>
                        </div>
                      )}
                    </div>

                    <label className="flex-1 border-2 border-dashed border-neutral-200 rounded-xl p-3 bg-neutral-50 hover:bg-neutral-100 transition text-center cursor-pointer flex items-center justify-center">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.png,.mp3,.webm"
                        className="hidden"
                      />
                      <span className="text-xs text-neutral-600 font-medium">
                        📎 Joindre un fichier
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="p-3 border rounded-xl bg-neutral-50 flex items-center justify-between">
                    {filePreview.type.startsWith("audio/") ? (
                      <audio
                        src={filePreview.url}
                        controls
                        className="h-8 w-64"
                      />
                    ) : (
                      <span className="text-xs font-medium text-neutral-700 truncate max-w-55">
                        📄 {filePreview.name}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={removeFeedbackFile}
                      className="text-red-500 text-xs font-semibold hover:underline cursor-pointer"
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedSubmission(null)}
                  className="px-4 py-2 border rounded-xl text-neutral-600 text-sm hover:bg-neutral-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#d97736] hover:bg-[#c2652a] text-white text-sm font-medium rounded-xl shadow-md cursor-pointer"
                >
                  Enregistrer la correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};;

export default GradingManager;
