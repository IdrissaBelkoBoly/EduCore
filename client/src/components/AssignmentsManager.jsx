import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const AssignmentsManager = () => {
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);

  // 🔍 Filtres, Recherche & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Plus d'éléments par page grâce à la vue tableau compacte

  // Formulaire d'état
  const [formData, setFormData] = useState({
    title: "",
    courseId: "",
    dueDate: "",
    instructions: "",
    resourceFile: null,
  });

  // Aperçu du fichier sélectionné
  const [filePreview, setFilePreview] = useState(null);

  // 🎙️ Enregistrement vocal
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (filePreview?.url && filePreview.url.startsWith("blob:")) {
        URL.revokeObjectURL(filePreview.url);
      }
    };
  }, [filePreview]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopMediaTracks();
    };
  }, []);

  const stopMediaTracks = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
  };

  // 🔄 Charger les cours et devoirs
  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/api/courses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fetchedCourses = res.data?.data || res.data?.courses || res.data;
      setCourses(Array.isArray(fetchedCourses) ? fetchedCourses : []);
    } catch (error) {
      console.error("Erreur cours :", error);
      setCourses([]);
    }
  };

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/api/assignments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fetchedAssignments =
        res.data?.data || res.data?.assignments || res.data;
      setAssignments(
        Array.isArray(fetchedAssignments) ? fetchedAssignments : [],
      );
    } catch (error) {
      console.error("Erreur devoirs :", error);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchAssignments();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        alert("Le fichier est trop volumineux (50 Mo max).");
        return;
      }
      if (filePreview?.url?.startsWith("blob:")) {
        URL.revokeObjectURL(filePreview.url);
      }
      setFormData((prev) => ({ ...prev, resourceFile: file }));
      setFilePreview({
        url: URL.createObjectURL(file),
        name: file.name,
        type: file.type,
      });
    }
  };

  const removeFile = () => {
    if (filePreview?.url?.startsWith("blob:")) {
      URL.revokeObjectURL(filePreview.url);
    }
    setFormData((prev) => ({ ...prev, resourceFile: null }));
    setFilePreview(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const audioFile = new File(
          [audioBlob],
          `consigne_audio_${Date.now()}.webm`,
          { type: "audio/webm" },
        );

        if (filePreview?.url?.startsWith("blob:")) {
          URL.revokeObjectURL(filePreview.url);
        }

        setFormData((prev) => ({ ...prev, resourceFile: audioFile }));
        setFilePreview({
          url: URL.createObjectURL(audioBlob),
          name: audioFile.name,
          type: "audio/webm",
        });

        stopMediaTracks();
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert("Accès microphone non autorisé ou indisponible.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const closeModal = () => {
    if (isRecording) stopRecording();
    stopMediaTracks();
    setShowModal(false);
  };

  const handleOpenAddModal = () => {
    setEditingAssignment(null);
    setFormData({
      title: "",
      courseId:
        Array.isArray(courses) && courses.length > 0 ? courses[0]._id : "",
      dueDate: "",
      instructions: "",
      resourceFile: null,
    });
    removeFile();
    setIsRecording(false);
    setShowModal(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingAssignment(item);
    const formattedDate = item.dueDate
      ? new Date(item.dueDate).toISOString().split("T")[0]
      : "";

    setFormData({
      title: item.title || "",
      courseId: item.course?._id || item.course || "",
      dueDate: formattedDate,
      instructions: item.instructions || "",
      resourceFile: null,
    });
    removeFile();
    setIsRecording(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return alert("Veuillez saisir un titre.");
    if (!formData.courseId) return alert("Veuillez sélectionner un cours.");

    try {
      const token = localStorage.getItem("token");
      const data = new FormData();
      data.append("title", formData.title);
      data.append("course", formData.courseId);
      data.append("dueDate", formData.dueDate);
      data.append("instructions", formData.instructions);

      if (formData.resourceFile) {
        data.append("resourceFile", formData.resourceFile);
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (editingAssignment) {
        await axios.put(
          `http://localhost:5000/api/assignments/${editingAssignment._id}`,
          data,
          config,
        );
        alert("Devoir mis à jour !");
      } else {
        await axios.post("http://localhost:5000/api/assignments", data, config);
        alert("Devoir publié avec succès !");
      }

      closeModal();
      fetchAssignments();
    } catch (error) {
      console.error("Erreur d'envoi :", error);
      alert(`Erreur : ${error.response?.data?.message || "Erreur serveur"}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce devoir ?")) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`http://localhost:5000/api/assignments/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchAssignments();
      } catch (error) {
        alert("Erreur de suppression.");
      }
    }
  };

  const safeAssignments = Array.isArray(assignments) ? assignments : [];
  const filteredAssignments = safeAssignments.filter((item) => {
    const matchesQuery = (item.title || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const itemCourseId = item.course?._id || item.course;
    const matchesCourse =
      filterCourse === "all" || itemCourseId === filterCourse;
    return matchesQuery && matchesCourse;
  });

  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage) || 1;
  const currentAssignments = filteredAssignments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const safeCourses = Array.isArray(courses) ? courses : [];

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Espace Devoirs 📝
          </h1>
          <p className="text-gray-500 text-xs">
            Gérez et organisez l'ensemble des exercices assignés aux élèves
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <span>➕</span> Créer un Devoir
        </button>
      </div>

      {/* FILTRES & RECHERCHE */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="🔎 Rechercher un devoir..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full border border-gray-300 rounded-lg pl-3 pr-3 py-2 text-xs focus:border-amber-500 outline-hidden"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <select
            value={filterCourse}
            onChange={(e) => {
              setFilterCourse(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded-lg p-2 text-xs bg-white cursor-pointer max-w-56"
          >
            <option value="all">📚 Tous les cours</option>
            {safeCourses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title || c.name || "Cours sans titre"}
              </option>
            ))}
          </select>

          {(searchQuery || filterCourse !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setFilterCourse("all");
                setCurrentPage(1);
              }}
              className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg font-medium hover:bg-amber-100 transition cursor-pointer"
            >
              🔄 Reinitialiser
            </button>
          )}
        </div>
      </div>

      {/* TABLEAU ADMIN PROFESSIONNEL */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl text-center border border-gray-200 text-gray-500 text-sm">
          Chargement des devoirs...
        </div>
      ) : currentAssignments.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-xs text-center border border-gray-200">
          <p className="text-gray-500 text-sm">Aucun devoir enregistré.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider font-semibold border-b border-gray-200">
                  <th className="p-3.5">Devoir & Consigne</th>
                  <th className="p-3.5">Cours Associé</th>
                  <th className="p-3.5">Date limite</th>
                  <th className="p-3.5">Ressource / Audio</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {currentAssignments.map((item) => {
                  const isExpired =
                    item.dueDate && new Date(item.dueDate) < new Date();
                  return (
                    <tr
                      key={item._id}
                      className="hover:bg-amber-50/40 transition"
                    >
                      {/* Titre et consigne */}
                      <td className="p-3.5 max-w-xs">
                        <p className="font-bold text-gray-800 text-sm">
                          {item.title}
                        </p>
                        <p
                          className="text-gray-500 truncate mt-0.5"
                          title={item.instructions}
                        >
                          {item.instructions || "Aucune consigne rédigée"}
                        </p>
                      </td>

                      {/* Badge Cours */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-md border border-slate-200 inline-block">
                          📚{" "}
                          {item.course?.title ||
                            item.course?.name ||
                            "Non spécifié"}
                        </span>
                      </td>

                      {/* Échéance */}
                      <td className="p-3.5 whitespace-nowrap">
                        {item.dueDate ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-gray-700">
                              {new Date(item.dueDate).toLocaleDateString(
                                "fr-FR",
                              )}
                            </span>
                            {isExpired ? (
                              <span className="bg-red-50 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                Expiré
                              </span>
                            ) : (
                              <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                En cours
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Sans échéance</span>
                        )}
                      </td>

                      {/* Fichier ou Enregistrement Audio */}
                      <td className="p-3.5 whitespace-nowrap">
                        {item.resourceUrl ? (
                          item.resourceUrl.match(
                            /\.(mp3|wav|ogg|m4a|webm)$/i,
                          ) ? (
                            <audio
                              src={`http://localhost:5000${item.resourceUrl}`}
                              controls
                              className="h-7 w-44 inline-block align-middle"
                            />
                          ) : (
                            <a
                              href={`http://localhost:5000${item.resourceUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded hover:bg-amber-100 font-semibold transition"
                            >
                              <span>📎</span> Fichier joint
                            </a>
                          )
                        ) : (
                          <span className="text-gray-400 italic">Aucun</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                            title="Modifier"
                          >
                            ✏️{" "}
                            <span className="hidden sm:inline">Modifier</span>
                          </button>
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition cursor-pointer"
                            title="Supprimer"
                          >
                            🗑️{" "}
                            <span className="hidden sm:inline">Supprimer</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="p-3.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between text-xs text-gray-600 shadow-xs">
          <span>
            Affichage de <strong>{currentAssignments.length}</strong> sur{" "}
            <strong>{filteredAssignments.length}</strong> devoirs
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 cursor-pointer font-medium"
            >
              ◀ Précédent
            </button>
            <span className="font-bold text-gray-800 px-2">
              Page {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 cursor-pointer font-medium"
            >
              Suivant ▶
            </button>
          </div>
        </div>
      )}

      {/* MODAL (CREATION / MODIFICATION) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editingAssignment
                ? "✏️ Modifier le Devoir"
                : "➕ Publier un Nouveau Devoir"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Titre du devoir *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:border-amber-500 outline-hidden"
                  placeholder="Ex: Pratique des techniques de limage"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Associer à un cours *
                </label>
                <select
                  name="courseId"
                  required
                  value={formData.courseId}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white cursor-pointer"
                >
                  <option value="">-- Choisir un cours --</option>
                  {safeCourses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.title || course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Date limite de rendu
                </label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:border-amber-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Consignes & Instructions
                </label>
                <textarea
                  name="instructions"
                  rows="3"
                  value={formData.instructions}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:border-amber-500 outline-hidden"
                  placeholder="Explication étape par étape..."
                ></textarea>
              </div>

              {/* RESSOCURCES AUDIO ET FICHIERS */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Document, Vidéo ou Audio de consigne
                </label>

                {!filePreview && (
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                      <p className="text-xs font-semibold text-amber-900 mb-2">
                        🎙️ Consigne vocale rapide :
                      </p>
                      {!isRecording ? (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-md shadow-xs transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                        >
                          🔴 Démarrer l'enregistrement
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-2 text-red-600 text-xs font-bold animate-pulse">
                            <span className="w-2.5 h-2.5 bg-red-600 rounded-full"></span>
                            Enregistrement... ({recordingTime}s)
                          </div>
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="px-3 py-1.5 bg-gray-800 hover:bg-black text-white text-xs font-medium rounded-md cursor-pointer"
                          >
                            ⏹️ Arrêter
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition text-center cursor-pointer">
                      <input
                        type="file"
                        id="file-upload"
                        accept=".pdf,.jpg,.jpeg,.png,.mp4,.mov,.mkv,.mp3,.wav,.ogg,.m4a"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer block"
                      >
                        <span className="text-xs font-medium text-gray-600 block">
                          📎 Importer un fichier (PDF, MP4, MP3...)
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {filePreview && (
                  <div className="p-3 border rounded-lg bg-gray-50 flex flex-col items-center gap-2">
                    {filePreview.type.startsWith("audio/") && (
                      <div className="w-full text-center">
                        <span className="text-xl block mb-1">🎧</span>
                        <p className="text-xs font-medium text-gray-700 mb-1">
                          {filePreview.name}
                        </p>
                        <audio
                          src={filePreview.url}
                          controls
                          className="w-full h-8"
                        />
                      </div>
                    )}
                    {filePreview.type.startsWith("video/") && (
                      <video
                        src={filePreview.url}
                        controls
                        className="w-full max-h-36 rounded bg-black"
                      />
                    )}
                    {filePreview.type === "application/pdf" && (
                      <p className="font-medium text-gray-700 text-xs">
                        📄 {filePreview.name}
                      </p>
                    )}
                    {filePreview.type.startsWith("image/") && (
                      <img
                        src={filePreview.url}
                        alt="Aperçu"
                        className="max-h-28 rounded object-contain"
                      />
                    )}

                    <button
                      type="button"
                      onClick={removeFile}
                      className="text-red-500 text-xs font-semibold hover:underline cursor-pointer"
                    >
                      ✕ Retirer le fichier
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium shadow-xs cursor-pointer"
                >
                  {editingAssignment
                    ? "Enregistrer les modifications"
                    : "Publier le devoir"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentsManager;
