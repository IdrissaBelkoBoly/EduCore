import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const CoursesManager = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  // 🔍 Filtres, Recherche & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Initialisation du formulaire
  const initialFormState = {
    title: "",
    description: "",
    contentType: "video",
    videoUrl: "",
    pdfFile: null,
    thumbnailUrl: "",
    duration: "10:00",
    level: "Débutant",
    category: "Base",
    steps: [{ title: "", order: 1 }],
  };

  const [formData, setFormData] = useState(initialFormState);

  // 🔄 Charger les cours
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/api/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 🎯 Extraction de res.data.courses
      setCourses(
        res.data.courses ||
          res.data.data ||
          (Array.isArray(res.data) ? res.data : []),
      );
    } catch (error) {
      console.error("Erreur lors de la récupération des cours:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // 🔍 1. Filtrage dynamique selon la recherche, le niveau et la catégorie
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLevel = filterLevel === "all" || course.level === filterLevel;

    const matchesCategory =
      filterCategory === "all" || course.category === filterCategory;

    return matchesSearch && matchesLevel && matchesCategory;
  });

  // 📄 2. Calculs de la pagination
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCourses = filteredCourses.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  // 🎯 Revenir à la page 1 automatiquement lorsque l'utilisateur applique un filtre
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterLevel, filterCategory]);

  // ✍️ Gérer les modifications des champs simples
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 📝 Gérer les Étapes (Steps)
  const handleStepChange = (index, value) => {
    const updatedSteps = [...formData.steps];
    updatedSteps[index].title = value;
    setFormData({ ...formData, steps: updatedSteps });
  };

  const addStepField = () => {
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        { title: "", order: formData.steps.length + 1 },
      ],
    });
  };

  const removeStepField = (index) => {
    const updatedSteps = formData.steps.filter((_, i) => i !== index);
    setFormData({ ...formData, steps: updatedSteps });
  };

  // ➕ Ouvrir Modal pour Ajouter
  const handleOpenAddModal = () => {
    setEditingCourse(null);
    setFormData(initialFormState);
    setShowModal(true);
  };

  // ✏️ Ouvrir Modal pour Modifier
  const handleOpenEditModal = (course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title || "",
      description: course.description || "",
      contentType: course.contentType || "video",
      videoUrl: course.videoUrl || "",
      pdfFile: null,
      thumbnailUrl: course.thumbnailUrl || "",
      duration: course.duration || "10:00",
      level: course.level || "Débutant",
      category: course.category || "Base",
      steps:
        course.steps && course.steps.length > 0
          ? course.steps
          : [{ title: "", order: 1 }],
    });
    setShowModal(true);
  };

  // 💾 Soumettre le Formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("token");

      const selectedContentType =
        formData.contentType && formData.contentType !== "undefined"
          ? formData.contentType
          : editingCourse?.contentType || "both";

      if (
        (selectedContentType === "video" || selectedContentType === "both") &&
        (!formData.videoUrl || !formData.videoUrl.trim())
      ) {
        alert("Veuillez saisir l'URL de la vidéo.");
        setIsSubmitting(false);
        return;
      }

      const hasExistingPdf = editingCourse && editingCourse.pdfUrl;
      if (
        (selectedContentType === "pdf" || selectedContentType === "both") &&
        !formData.pdfFile &&
        !hasExistingPdf
      ) {
        alert("Veuillez sélectionner un fichier PDF depuis votre appareil.");
        setIsSubmitting(false);
        return;
      }

      const data = new FormData();
      data.append("title", formData.title || "");
      data.append("description", formData.description || "");
      data.append("contentType", selectedContentType);
      data.append("level", formData.level || "Débutant");
      data.append("category", formData.category || "Base");
      data.append("duration", formData.duration || "");
      data.append("thumbnailUrl", formData.thumbnailUrl || "");
      data.append("videoUrl", formData.videoUrl || "");

      if (formData.pdfFile) {
        data.append("pdfFile", formData.pdfFile);
      }

      if (formData.steps) {
        const cleanedSteps = formData.steps.filter(
          (s) => s.title.trim() !== "",
        );
        data.append("steps", JSON.stringify(cleanedSteps));
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      };

      if (editingCourse) {
        await axios.put(
          `${API_BASE_URL}/api/courses/${editingCourse._id}`,
          data,
          config,
        );
        alert("Cours modifié avec succès !");
      } else {
        await axios.post(`${API_BASE_URL}/api/courses`, data, config);
        alert("Cours ajouté avec succès !");
      }

      setShowModal(false);
      fetchCourses();
    } catch (error) {
      console.error("Erreur d'envoi :", error);
      const serverMessage =
        error.response?.data?.message || "Une erreur est survenue.";
      alert(`Erreur Backend : ${serverMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🗑️ Supprimer un cours
  const handleDelete = async (courseId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce cours ?")) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${API_BASE_URL}/api/courses/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchCourses();
      } catch (error) {
        alert("Erreur lors de la suppression.");
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Gestion des Cours 📚
          </h1>
          <p className="text-gray-500 text-sm">
            Gérez et organisez vos modules de formation
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 rounded-lg shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <span>➕</span> Ajouter un Cours
        </button>
      </div>

      {/* 🔍 BARRE DE FILTRES ET RECHERCHE */}
      <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <input
          type="text"
          placeholder="🔎 Rechercher un cours par titre..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full sm:w-72 border border-gray-300 rounded-lg p-2.5 text-xs outline-hidden focus:border-amber-500"
        />

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* Filtre Niveau */}
          <select
            value={filterLevel}
            onChange={(e) => {
              setFilterLevel(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded-lg p-2 text-xs bg-white cursor-pointer"
          >
            <option value="all">📊 Tous les niveaux</option>
            <option value="Débutant">Débutant</option>
            <option value="Intermédiaire">Intermédiaire</option>
            <option value="Avancé">Avancé</option>
          </select>

          {/* Filtre Catégorie */}
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded-lg p-2 text-xs bg-white cursor-pointer"
          >
            <option value="all">🏷️ Toutes les catégories</option>
            <option value="Base">Base</option>
            <option value="Nail Art">Nail Art</option>
            <option value="Rallongement">Rallongement</option>
            <option value="Dépose">Dépose</option>
            <option value="Autre">Autre</option>
          </select>

          {/* Bouton Réinitialiser */}
          {(searchQuery ||
            filterLevel !== "all" ||
            filterCategory !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setFilterLevel("all");
                setFilterCategory("all");
                setCurrentPage(1);
              }}
              className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg font-medium hover:bg-amber-100 transition cursor-pointer"
            >
              🔄 Effacer
            </button>
          )}
        </div>
      </div>

      {/* 2. GRILLE / TABLEAU DES COURS */}
      {loading ? (
        <div className="text-center py-10 text-gray-500">
          Chargement des cours...
        </div>
      ) : currentCourses.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-xs text-center border border-gray-100">
          <p className="text-gray-500 text-sm">
            Aucun cours ne correspond à vos critères.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="p-4">Cours</th>
                <th className="p-4">Formateur</th>
                <th className="p-4">Niveau</th>
                <th className="p-4">Catégorie</th>
                <th className="p-4">Format</th>
                <th className="p-4">Durée / Étapes</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {currentCourses.map((course) => (
                <tr key={course._id} className="hover:bg-gray-50/80 transition">
                  {/* 1. COURS */}
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {course.thumbnailUrl ? (
                        <img
                          src={course.thumbnailUrl}
                          alt={course.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <span className="text-xl">💅</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 line-clamp-1">
                        {course.title}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {course.description || "Aucune description"}
                      </p>
                    </div>
                  </td>

                  {/* 2. FORMATEUR */}
                  <td className="p-4 font-medium text-gray-700">
                    {course.formateur?.nom || "Non spécifié"}
                  </td>

                  {/* 3. NIVEAU */}
                  <td className="p-4">
                    <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-md">
                      {course.level || "Débutant"}
                    </span>
                  </td>

                  {/* 4. CATÉGORIE */}
                  <td className="p-4 font-medium text-gray-600">
                    {course.category}
                  </td>

                  {/* 5. FORMAT */}
                  <td className="p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-slate-100 text-slate-700">
                      {course.contentType === "pdf"
                        ? "📄 PDF"
                        : course.contentType === "both"
                          ? "🎬 Vidéo + PDF"
                          : "🎥 Vidéo"}
                    </span>
                  </td>

                  {/* 6. DURÉE / ÉTAPES */}
                  <td className="p-4 text-xs text-gray-500">
                    <div>⏱️ {course.duration || "00:00"}</div>
                    <div>📍 {course.steps?.length || 0} étape(s)</div>
                  </td>

                  {/* 7. ACTIONS */}
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenEditModal(course)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                        title="Éditer"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(course._id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 📄 PAGINATION */}
      {totalPages > 1 && (
        <div className="p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between text-xs text-gray-600 shadow-xs">
          <span>
            Affichage de <strong>{currentCourses.length}</strong> sur{" "}
            <strong>{filteredCourses.length}</strong> cours
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

      {/* 3. MODAL DE CRÉATION / MODIFICATION */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {editingCourse
                ? "✏️ Modifier le Cours"
                : "➕ Ajouter un Nouveau Cours"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titre du cours *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-amber-500 focus:border-amber-500"
                  placeholder="ex: Maîtrise de la pose de Chablon"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Niveau
                  </label>
                  <select
                    name="level"
                    value={formData.level}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                  >
                    <option value="Débutant">Débutant</option>
                    <option value="Intermédiaire">Intermédiaire</option>
                    <option value="Avancé">Avancé</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                  >
                    <option value="Base">Base</option>
                    <option value="Nail Art">Nail Art</option>
                    <option value="Rallongement">Rallongement</option>
                    <option value="Dépose">Dépose</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format du contenu *
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg flex-1 hover:bg-gray-50 transition">
                    <input
                      type="radio"
                      name="contentType"
                      value="video"
                      checked={formData.contentType === "video"}
                      onChange={handleChange}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm font-medium">🎥 Vidéo</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg flex-1 hover:bg-gray-50 transition">
                    <input
                      type="radio"
                      name="contentType"
                      value="pdf"
                      checked={formData.contentType === "pdf"}
                      onChange={handleChange}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm font-medium">📄 PDF</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg flex-1 hover:bg-gray-50 transition">
                    <input
                      type="radio"
                      name="contentType"
                      value="both"
                      checked={formData.contentType === "both"}
                      onChange={handleChange}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm font-medium">🎬 Vidéo + PDF</span>
                  </label>
                </div>
              </div>

              {(formData.contentType === "video" ||
                formData.contentType === "both") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL de la vidéo *
                  </label>
                  <input
                    type="text"
                    name="videoUrl"
                    required
                    value={formData.videoUrl || ""}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
              )}

              {(formData.contentType === "pdf" ||
                formData.contentType === "both") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document PDF (depuis votre appareil) *
                  </label>

                  <input
                    type="file"
                    name="pdfFile"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setFormData((prev) => ({
                          ...prev,
                          pdfFile: file,
                        }));
                      }
                    }}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 border border-gray-300 rounded-lg cursor-pointer"
                  />

                  {formData.pdfFile && (
                    <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                      <span>✅</span> Fichier prêt :{" "}
                      <strong>{formData.pdfFile.name}</strong>
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL de la miniature (Image)
                  </label>
                  <input
                    type="text"
                    name="thumbnailUrl"
                    value={formData.thumbnailUrl}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durée (ex: 12:30 ou 10 pages)
                  </label>
                  <input
                    type="text"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                    placeholder="12:30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows="2"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                  placeholder="Résumé du contenu du cours..."
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan du module (Étapes)
                </label>
                {formData.steps.map((step, index) => (
                  <div key={index} className="flex gap-2 mb-2 items-center">
                    <span className="text-xs font-bold text-gray-400">
                      {index + 1}.
                    </span>
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => handleStepChange(index, e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg p-2 text-sm"
                      placeholder={`Nom de l'étape ${index + 1}`}
                    />
                    {formData.steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStepField(index)}
                        className="text-red-500 hover:text-red-700 font-bold px-2 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addStepField}
                  className="text-xs text-amber-600 hover:text-amber-800 font-medium mt-1 cursor-pointer"
                >
                  + Ajouter une étape
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <span className="animate-spin">⏳</span>}
                  {editingCourse ? "Enregistrer" : "Créer le cours"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesManager;
