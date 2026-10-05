import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

const HomeworkReviewList = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  // 🟢 FILTRE PAR ONGLETS : "pending" | "graded" | "all"
  const [activeTab, setActiveTab] = useState("pending");

  // 📄 PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [reviewData, setReviewData] = useState({
    status: "",
    grade: "",
    feedback: "",
  });
  const [annotatedFile, setAnnotatedFile] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const fetchSubmissions = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get(
        `http://localhost:5000/api/submissions/teacher/submissions?t=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      );

      const dataList =
        res.data?.data ||
        res.data?.submissions ||
        (Array.isArray(res.data) ? res.data : []);

      setSubmissions(dataList);
    } catch (err) {
      console.error("Erreur chargement travaux:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Re-réinitialise la page lors du changement d'onglet
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

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

  const handleEditClick = (sub) => {
    setEditingId(sub._id);
    setReviewData({
      status: sub.status || "graded",
      grade: sub.grade !== null && sub.grade !== undefined ? sub.grade : "",
      feedback: sub.feedback || "",
    });
    setAudioBlob(null);
    setAnnotatedFile(null);
  };

  const handleSaveReview = async (id) => {
    try {
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("status", reviewData.status || "graded");
      formData.append("grade", reviewData.grade);
      formData.append("feedback", reviewData.feedback);

      if (audioBlob) {
        formData.append("audio", audioBlob, "feedback-vocal.webm");
      }

      if (annotatedFile) {
        formData.append("annotatedImage", annotatedFile);
      }

      const res = await axios.put(
        `http://localhost:5000/api/submissions/grade/${id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (res.data.success) {
        setSubmissions((prev) =>
          prev.map((item) => (item._id === id ? res.data.data : item)),
        );
        setEditingId(null);
        setAudioBlob(null);
        setAnnotatedFile(null);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la sauvegarde de la correction");
    }
  };

  const handleDeleteSubmission = async (id) => {
    if (!window.confirm("Voulez-vous supprimer cette soumission d'élève ?"))
      return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/submissions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const updated = submissions.filter((s) => s._id !== id);
      setSubmissions(updated);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression de la soumission.");
    }
  };

  // 🔴 LOGIQUE DE FILTRAGE
  const filteredSubmissions = submissions.filter((sub) => {
    const isGraded = sub.status === "graded" || sub.status === "approved";
    if (activeTab === "pending") return !isGraded;
    if (activeTab === "graded") return isGraded;
    return true; // tab "all"
  });

  // 📄 LOGIQUE DE PAGINATION
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSubmissions.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  const countPending = submissions.filter(
    (s) => s.status !== "graded" && s.status !== "approved",
  ).length;
  const countGraded = submissions.length - countPending;

  if (loading)
    return (
      <div className="p-4 text-center text-gray-500">
        Chargement des devoirs...
      </div>
    );

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
      {/* En-tête + Titre */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Devoirs des étudiantes à corriger
          </h2>
          <p className="text-xs text-gray-500">
            Examinez et notez les travaux rendus par vos étudiantes.
          </p>
        </div>

        {/* Onglets de filtrage */}
        <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
              activeTab === "pending"
                ? "bg-pink-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            A corriger ({countPending})
          </button>
          <button
            onClick={() => setActiveTab("graded")}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
              activeTab === "graded"
                ? "bg-pink-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Corrigés ({countGraded})
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
              activeTab === "all"
                ? "bg-pink-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Tous ({submissions.length})
          </button>
        </div>
      </div>

      {filteredSubmissions.length === 0 ? (
        <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed">
          {activeTab === "pending"
            ? "🎉 Aucun devoir en attente de correction !"
            : activeTab === "graded"
              ? "Aucun devoir corrigé pour le moment."
              : "Aucune soumission trouvée."}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 border-b text-gray-600 text-xs font-semibold uppercase">
                <tr>
                  <th className="p-3">Étudiante</th>
                  <th className="p-3">Devoir / Cours</th>
                  <th className="p-3">Fichier & Audio élève</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3">Note (/20)</th>
                  <th className="p-3">Correction (Formateur)</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {currentItems.map((sub) => {
                  const studentName =
                    sub.student?.name ||
                    sub.student?.nom ||
                    sub.student?.firstname ||
                    "Élève";
                  const assignmentTitle =
                    sub.assignment?.title ||
                    sub.assignmentId?.title ||
                    "Devoir";
                  const courseTitle =
                    sub.assignment?.course?.title || sub.courseId?.title || "";

                  const mainFile =
                    sub.submissionUrl || sub.fileUrl || sub.documentUrl;
                  const studentAudio =
                    sub.studentAudioUrl || sub.studentAudio || sub.audioUrl;

                  return (
                    <tr
                      key={sub._id}
                      className="hover:bg-gray-50 text-sm align-top transition-colors"
                    >
                      <td className="p-3 font-medium">
                        {studentName}
                        <div className="text-xs text-gray-400">
                          {sub.student?.email}
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="font-semibold block">
                          {assignmentTitle}
                        </span>
                        {courseTitle && (
                          <span className="text-xs text-gray-500">
                            {courseTitle}
                          </span>
                        )}
                      </td>

                      <td className="p-3 min-w-52">
                        {mainFile &&
                        !mainFile.endsWith(".webm") &&
                        !mainFile.endsWith(".mp3") &&
                        !mainFile.endsWith(".wav") ? (
                          <a
                            href={`http://localhost:5000${mainFile}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pink-600 underline text-xs font-semibold block mb-2"
                          >
                            📄 Voir le fichier soumis
                          </a>
                        ) : null}

                        {(studentAudio ||
                          (mainFile &&
                            (mainFile.endsWith(".webm") ||
                              mainFile.endsWith(".mp3") ||
                              mainFile.endsWith(".wav")))) && (
                          <div className="bg-pink-50 p-2 rounded border border-pink-200">
                            <span className="font-semibold block text-[11px] text-pink-700 mb-1">
                              🎙️ Remarque audio de l'élève :
                            </span>
                            <audio
                              controls
                              src={`http://localhost:5000${studentAudio || mainFile}`}
                              className="w-48 h-7"
                            />
                          </div>
                        )}

                        {!mainFile && !studentAudio && (
                          <span className="text-xs text-gray-400">
                            Aucun contenu
                          </span>
                        )}
                      </td>

                      {editingId === sub._id ? (
                        <>
                          <td className="p-3">
                            <select
                              value={reviewData.status}
                              onChange={(e) =>
                                setReviewData({
                                  ...reviewData,
                                  status: e.target.value,
                                })
                              }
                              className="border rounded p-1 text-xs"
                            >
                              <option value="graded">Corrigé</option>
                              <option value="pending">En attente</option>
                              <option value="rejected">Rejeté</option>
                            </select>
                          </td>

                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={reviewData.grade}
                              onChange={(e) =>
                                setReviewData({
                                  ...reviewData,
                                  grade: e.target.value,
                                })
                              }
                              className="w-16 border rounded p-1 text-xs font-bold text-center"
                              placeholder="/20"
                            />
                          </td>

                          <td className="p-3 space-y-2 min-w-60">
                            <input
                              type="text"
                              value={reviewData.feedback}
                              onChange={(e) =>
                                setReviewData({
                                  ...reviewData,
                                  feedback: e.target.value,
                                })
                              }
                              className="w-full border rounded p-1.5 text-xs"
                              placeholder="Commentaire..."
                            />

                            <div className="bg-pink-50 border border-pink-200 p-2 rounded-lg">
                              <p className="text-[11px] font-bold text-pink-700 mb-1">
                                🎙️ Enregistrer une remarque vocale :
                              </p>
                              {!isRecording ? (
                                <button
                                  type="button"
                                  onClick={startRecording}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-2 py-1 rounded font-semibold cursor-pointer"
                                >
                                  🔴 Enregistrer audio
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={stopRecording}
                                  className="bg-red-600 hover:bg-red-700 text-white text-[11px] px-2 py-1 rounded font-semibold animate-pulse cursor-pointer"
                                >
                                  ⏹️ Arrêter enregistrement
                                </button>
                              )}

                              {audioBlob && (
                                <div className="mt-2">
                                  <p className="text-[10px] text-emerald-600 font-semibold">
                                    Audio prêt !
                                  </p>
                                  <audio
                                    controls
                                    src={URL.createObjectURL(audioBlob)}
                                    className="w-full h-7 mt-1"
                                  />
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-gray-600 mb-1">
                                🖼️ Photo annotée :
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                  setAnnotatedFile(e.target.files[0])
                                }
                                className="text-[11px] w-full text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-pink-100 file:text-pink-700"
                              />
                            </div>
                          </td>

                          <td className="p-3 text-right space-y-1">
                            <button
                              onClick={() => handleSaveReview(sub._id)}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs px-2.5 py-1 rounded block w-full transition cursor-pointer"
                            >
                              Enregistrer
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="bg-gray-200 text-gray-700 text-xs px-2.5 py-1 rounded block w-full transition cursor-pointer"
                            >
                              Annuler
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                                sub.status === "approved" ||
                                sub.status === "graded"
                                  ? "bg-green-100 text-green-700"
                                  : sub.status === "rejected"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {sub.status === "approved" ||
                              sub.status === "graded"
                                ? "Corrigé"
                                : sub.status === "rejected"
                                  ? "Rejeté"
                                  : "En attente"}
                            </span>
                          </td>

                          <td className="p-3 font-bold text-gray-800">
                            {sub.grade !== null && sub.grade !== undefined
                              ? `${sub.grade}/20`
                              : "—"}
                          </td>

                          <td className="p-3 text-gray-600 text-xs space-y-2 max-w-xs">
                            <p className="line-clamp-2">
                              {sub.feedback || "—"}
                            </p>

                            {sub.feedbackAudioUrl && (
                              <div className="bg-gray-100 p-1.5 rounded">
                                <span className="font-semibold block text-[10px] text-pink-700">
                                  🎙️ Votre remarque vocale :
                                </span>
                                <audio
                                  controls
                                  src={`http://localhost:5000${sub.feedbackAudioUrl}`}
                                  className="w-full h-7 mt-1"
                                />
                              </div>
                            )}

                            {sub.annotatedImageUrl && (
                              <div>
                                <a
                                  href={`http://localhost:5000${sub.annotatedImageUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-pink-600 underline font-semibold text-[11px] block"
                                >
                                  🖼️ Voir la photo annotée
                                </a>
                              </div>
                            )}
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditClick(sub)}
                                className="bg-pink-600 hover:bg-pink-700 text-white text-xs px-3 py-1.5 rounded font-medium transition cursor-pointer"
                              >
                                {sub.status === "graded" ||
                                sub.status === "approved"
                                  ? "Modifier"
                                  : "Corriger"}
                              </button>
                              <button
                                onClick={() => handleDeleteSubmission(sub._id)}
                                title="Supprimer le devoir"
                                className="p-1.5 text-gray-400 hover:text-red-600 transition cursor-pointer"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 🟢 BARRE DE PAGINATION */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-3 bg-white gap-3 border-t">
              <p className="text-xs text-gray-500">
                Affichage de{" "}
                <span className="font-semibold text-gray-800">
                  {indexOfFirstItem + 1}
                </span>{" "}
                à{" "}
                <span className="font-semibold text-gray-800">
                  {Math.min(indexOfLastItem, filteredSubmissions.length)}
                </span>{" "}
                sur{" "}
                <span className="font-semibold text-gray-800">
                  {filteredSubmissions.length}
                </span>{" "}
                soumissions
              </p>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        currentPage === pageNum
                          ? "bg-pink-600 text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ),
                )}

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HomeworkReviewList;
