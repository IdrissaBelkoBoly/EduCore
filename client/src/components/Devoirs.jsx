import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Devoirs = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [homeworkList, setHomeworkList] = useState([]);

  // États du formulaire
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [courses, setCourses] = useState([]);
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [fileType, setFileType] = useState("");

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return navigate("/login");

        // 1. Récupération des cours
        const coursesRes = await fetch(`${API_BASE}/api/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const coursesData = await coursesRes.json();
        if (coursesData.success && coursesData.data.length > 0) {
          setCourses(coursesData.data);
          setSelectedCourseId(coursesData.data[0]._id);
        }

        // 2. Historique des soumissions de l'étudiant
        const homeworkRes = await fetch(
          `${API_BASE}/api/submissions/my-submissions`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const homeworkData = await homeworkRes.json();
        if (homeworkData.success) {
          setHomeworkList(homeworkData.data);
        }
      } catch (error) {
        console.error("Erreur de chargement des données :", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Charger les consignes spécifiques au cours sélectionné
  useEffect(() => {
    if (!selectedCourseId) return;

    const fetchAssignments = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${API_BASE}/api/homework/course/${selectedCourseId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await res.json();
        if (data.success) {
          setAssignments(data.data);
          setSelectedAssignmentId(data.data.length > 0 ? data.data[0]._id : "");
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des consignes :", err);
      }
    };

    fetchAssignments();
  }, [selectedCourseId]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setFileType(file.type.startsWith("video/") ? "video" : "image");
    }
  };

  const handleSubmitHomework = async (e) => {
    e.preventDefault();
    if (!photo) {
      setMessage({
        type: "error",
        text: "Veuillez ajouter un fichier (photo/vidéo) !",
      });
      return;
    }

    setSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      formData.append("courseId", selectedCourseId);

      // 🟢 On n'ajoute l'assignmentId QUE s'il n'est pas vide !
      if (selectedAssignmentId && selectedAssignmentId.trim() !== "") {
        formData.append("assignmentId", selectedAssignmentId);
        formData.append("homeworkId", selectedAssignmentId);
      }

      formData.append("comment", comment);
      formData.append("submissionFile", photo);
      formData.append("file", photo);

      const response = await fetch(`${API_BASE}/api/submissions/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMessage({
          type: "success",
          text: "Travail envoyé avec succès ! 💅🚀",
        });
        setHomeworkList([result.data, ...homeworkList]);
        setComment("");
        setPhoto(null);
        setPhotoPreview("");
      } else {
        setMessage({
          type: "error",
          text: result.message || "Erreur lors de l'envoi.",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erreur de connexion au serveur." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-pink-500 font-bold text-lg animate-pulse">
          Chargement... 💅
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <header className="mb-10">
          <h1 className="text-2xl font-black text-slate-800">
            Espace Pratique & Devoirs 📝
          </h1>
          <p className="text-xs text-gray-400 font-medium">
            Soumettez vos travaux et consultez vos notes
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Formulaire d'envoi */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase">
              Envoyer une pratique 💅
            </h3>

            {message.text && (
              <div
                className={`p-4 rounded-xl text-xs font-semibold ${
                  message.type === "success"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmitHomework} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Cours
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 border text-xs font-bold"
                >
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {assignments.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Consigne spécifique
                  </label>
                  <select
                    value={selectedAssignmentId}
                    onChange={(e) => setSelectedAssignmentId(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 border text-xs font-bold"
                  >
                    <option value="">Devoir libre (sans consigne)</option>
                    {assignments.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Commentaire
                </label>
                <textarea
                  rows="3"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Remarques sur votre travail..."
                  className="w-full p-3 rounded-xl bg-slate-50 border text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Fichier (Photo / Vidéo)
                </label>
                <div className="border-2 border-dashed rounded-2xl p-6 text-center bg-slate-50 relative flex justify-center items-center">
                  {photoPreview ? (
                    fileType === "video" ? (
                      <video
                        src={photoPreview}
                        controls
                        className="max-h-28 rounded-lg"
                      />
                    ) : (
                      <img
                        src={photoPreview}
                        alt="Aperçu"
                        className="max-h-28 rounded-lg object-contain"
                      />
                    )
                  ) : (
                    <p className="text-xs text-gray-500 font-bold">
                      Cliquez pour ajouter un média
                    </p>
                  )}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold"
              >
                {submitting ? "Envoi en cours..." : "Soumettre la pratique 🚀"}
              </button>
            </form>
          </div>

          {/* Liste des rendus */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase">
              Historique & Corrections
            </h3>
            {homeworkList.map((sub) => (
              <div
                key={sub._id}
                className="bg-white rounded-2xl p-5 border shadow-sm flex gap-4 items-start"
              >
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 border shrink-0">
                  {sub.fileType === "video" ? (
                    <video
                      src={`${API_BASE}${sub.fileUrl || sub.submissionUrl}`}
                      className="w-full h-full object-cover"
                      controls
                    />
                  ) : (
                    <img
                      src={`${API_BASE}${sub.fileUrl || sub.submissionUrl}`}
                      alt="Devoir"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-pink-500">
                      {sub.courseId?.title ||
                        sub.assignment?.course?.title ||
                        "Module"}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        sub.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : sub.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {sub.status === "approved"
                        ? "Validé ✓"
                        : sub.status === "rejected"
                          ? "À retravailler ✕"
                          : "En attente ⏱️"}
                    </span>
                  </div>

                  {sub.grade !== null && sub.grade !== undefined && (
                    <span className="inline-block bg-slate-100 text-slate-800 text-[11px] font-extrabold px-2 py-0.5 rounded-md">
                      Note : {sub.grade} / 20
                    </span>
                  )}

                  <p className="text-[11px] text-gray-500 italic">
                    "{sub.comment || "Aucun commentaire."}"
                  </p>

                  {sub.status !== "pending" && (
                    <div className="bg-slate-50 p-3 rounded-xl text-[10px]">
                      <p className="font-bold text-slate-800">
                        💅 Retour Formatrice :
                      </p>
                      <p className="text-gray-600">
                        {sub.feedback || "Aucun détail supplémentaire."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Devoirs;
