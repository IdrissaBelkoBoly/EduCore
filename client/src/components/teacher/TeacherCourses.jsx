import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Plus,
  Video,
  FileText,
  X,
  Edit3,
  Trash2,
  Search,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const TeacherCourses = () => {
  const [courses, setCourses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [editingCourseId, setEditingCourseId] = useState(null);

  // 🟢 Etats UI : Recherche, Filtre & Mode d'affichage
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toutes");
  const [viewMode, setViewMode] = useState("grid"); // "grid" ou "table"

  // 📄 ETAT PAGINATION
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState({
    title: "",
    category: "Base",
    contentType: "video",
    videoUrl: "",
    thumbnailUrl: "",
    description: "",
    level: "Débutant",
    isActive: true,
  });

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchCourses();
  }, []);

  // Reset de la page à 1 lorsque les filtres ou la vue changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, viewMode]);

  // 1. Chargement des cours
  const fetchCourses = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/courses/teacher", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data && res.data.data) {
        setCourses(res.data.data);
      } else if (Array.isArray(res.data)) {
        setCourses(res.data);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération de vos cours:", err);
    }
  };

  // 2. Ouverture Modal Création
  const handleOpenCreateModal = () => {
    setEditingCourseId(null);
    setFormData({
      title: "",
      category: "Base",
      contentType: "video",
      videoUrl: "",
      thumbnailUrl: "",
      description: "",
      level: "Débutant",
      isActive: true,
    });
    setPdfFile(null);
    setIsModalOpen(true);
  };

  // 3. Ouverture Modal Édition
  const handleOpenEditModal = (course) => {
    setEditingCourseId(course._id);
    setFormData({
      title: course.title || "",
      category: course.category || "Base",
      contentType: course.contentType || "video",
      videoUrl: course.videoUrl || "",
      thumbnailUrl: course.thumbnailUrl || "",
      description: course.description || "",
      level: course.level || "Débutant",
      isActive: course.isActive !== undefined ? course.isActive : true,
    });
    setPdfFile(null);
    setIsModalOpen(true);
  };

  // 4. Suppression
  const handleDelete = async (courseId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce cours ?"))
      return;

    try {
      await axios.delete(`http://localhost:5000/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCourses();
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Erreur lors de la suppression du cours.",
      );
    }
  };

  // 5. Soumission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      data.append("title", formData.title);
      data.append("category", formData.category);
      data.append("contentType", formData.contentType);
      data.append("videoUrl", formData.videoUrl);
      data.append("thumbnailUrl", formData.thumbnailUrl);
      data.append("description", formData.description);
      data.append("level", formData.level);
      data.append("isActive", formData.isActive);

      if (pdfFile) {
        data.append("pdfFile", pdfFile);
      }

      if (editingCourseId) {
        await axios.put(
          `http://localhost:5000/api/courses/${editingCourseId}`,
          data,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          },
        );
      } else {
        await axios.post("http://localhost:5000/api/courses", data, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
      }

      setIsModalOpen(false);
      fetchCourses();
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  // 🟢 1. Filtrage des Cours
  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "Toutes" || course.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 🟢 2. Logique de Pagination
  const itemsPerPage = viewMode === "grid" ? 6 : 10; // 6 cours en mode carte, 10 en mode liste
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCourses = filteredCourses.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  const categories = [
    "Toutes",
    "Base",
    "Nail Art",
    "Rallongement",
    "Dépose",
    "Autres",
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Mes Cours</h1>
          <p className="text-sm text-neutral-500">
            Gérez vos modules de formation personnels ({filteredCourses.length}{" "}
            cours au total)
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center space-x-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-sm cursor-pointer"
        >
          <Plus size={18} />
          <span>Créer un cours</span>
        </button>
      </div>

      {/* Barre de Filtres et Recherche */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
        {/* Champ de recherche */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Rechercher un module..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-pink-500 bg-neutral-50/50"
          />
        </div>

        {/* Filtres par catégories */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-pink-50 text-pink-600 border border-pink-200"
                  : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Choix Mode de vue (Grille vs Liste) */}
        <div className="flex items-center bg-neutral-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === "grid"
                ? "bg-white text-neutral-800 shadow-sm"
                : "text-neutral-400 hover:text-neutral-600"
            }`}
            title="Vue Grille"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === "table"
                ? "bg-white text-neutral-800 shadow-sm"
                : "text-neutral-400 hover:text-neutral-600"
            }`}
            title="Vue Liste"
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Affichage des Cours */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-12 text-neutral-400 bg-white rounded-2xl border border-dashed border-neutral-200">
          Aucun cours ne correspond à votre recherche.
        </div>
      ) : viewMode === "grid" ? (
        /* VUE GRILLE COMPACTE */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentCourses.map((course) => (
            <div
              key={course._id}
              className="bg-white rounded-2xl overflow-hidden border border-neutral-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="h-40 bg-neutral-100 relative overflow-hidden">
                  <img
                    src={
                      course.thumbnailUrl ||
                      "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500"
                    }
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/90 text-pink-600 backdrop-blur-sm">
                    {course.category}
                  </span>

                  <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-sm">
                    {course.level || "Débutant"}
                  </span>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-neutral-800 line-clamp-1 text-base">
                      {course.title}
                    </h3>

                    <div className="flex space-x-1 text-neutral-400 ml-2">
                      {(course.contentType === "video" ||
                        course.contentType === "both") && <Video size={16} />}
                      {(course.contentType === "pdf" ||
                        course.contentType === "both") && (
                        <FileText size={16} />
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-neutral-500 line-clamp-2">
                    {course.description ||
                      "Aucune description de module fournie."}
                  </p>
                </div>
              </div>

              <div className="p-4 pt-2 border-t border-neutral-50 flex items-center justify-between">
                <span className="text-[11px] text-neutral-400">
                  {course.steps?.length || 0} étape(s)
                </span>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleOpenEditModal(course)}
                    className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                    title="Modifier"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(course._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* VUE TABLEAU / LISTE */
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-400 border-b border-neutral-100">
                  <th className="py-3 px-4">Cours</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Niveau</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {currentCourses.map((course) => (
                  <tr
                    key={course._id}
                    className="hover:bg-neutral-50/50 transition-colors"
                  >
                    <td className="py-3 px-4 flex items-center space-x-3">
                      <img
                        src={
                          course.thumbnailUrl ||
                          "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500"
                        }
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div>
                        <div className="font-semibold text-neutral-800 line-clamp-1">
                          {course.title}
                        </div>
                        <div className="text-xs text-neutral-400">
                          {course.steps?.length || 0} étapes
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-pink-50 text-pink-600 font-medium">
                        {course.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-500">
                      <div className="flex items-center space-x-1">
                        {(course.contentType === "video" ||
                          course.contentType === "both") && <Video size={15} />}
                        {(course.contentType === "pdf" ||
                          course.contentType === "both") && (
                          <FileText size={15} />
                        )}
                        <span className="text-xs capitalize ml-1">
                          {course.contentType}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-neutral-600">
                      {course.level}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(course)}
                          className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg cursor-pointer"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(course._id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🟢 BARRE DE PAGINATION */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-white px-4 py-3 rounded-2xl border border-neutral-100 shadow-sm gap-3">
          <p className="text-xs text-neutral-500">
            Affichage de{" "}
            <span className="font-semibold text-neutral-800">
              {indexOfFirstItem + 1}
            </span>{" "}
            à{" "}
            <span className="font-semibold text-neutral-800">
              {Math.min(indexOfLastItem, filteredCourses.length)}
            </span>{" "}
            sur{" "}
            <span className="font-semibold text-neutral-800">
              {filteredCourses.length}
            </span>{" "}
            cours
          </p>

          <div className="flex items-center space-x-1">
            {/* Bouton Précédent */}
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Numéros de page */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPage === pageNum
                      ? "bg-pink-600 text-white"
                      : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  {pageNum}
                </button>
              ),
            )}

            {/* Bouton Suivant */}
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modal Création / Édition */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-neutral-800">
                {editingCourseId
                  ? "Modifier le cours"
                  : "Créer un nouveau cours"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Titre du cours
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pose Gel Chablon Débutant"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Lien de la miniature (URL de l'image)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={formData.thumbnailUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, thumbnailUrl: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Catégorie
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-pink-500 bg-white"
                  >
                    <option value="Base">Base</option>
                    <option value="Nail Art">Nail Art</option>
                    <option value="Rallongement">Rallongement</option>
                    <option value="Dépose">Dépose</option>
                    <option value="Autres">Autres</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Niveau
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) =>
                      setFormData({ ...formData, level: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-pink-500 bg-white"
                  >
                    <option value="Débutant">Débutant</option>
                    <option value="Intermédiaire">Intermédiaire</option>
                    <option value="Avancé">Avancé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Format du contenu
                </label>
                <select
                  value={formData.contentType}
                  onChange={(e) =>
                    setFormData({ ...formData, contentType: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-pink-500 bg-white"
                >
                  <option value="video">Vidéo uniquement</option>
                  <option value="pdf">Document PDF uniquement</option>
                  <option value="both">Vidéo + PDF</option>
                </select>
              </div>

              {(formData.contentType === "video" ||
                formData.contentType === "both") && (
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Lien de la vidéo (URL)
                  </label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/..."
                    value={formData.videoUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, videoUrl: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>
              )}

              {(formData.contentType === "pdf" ||
                formData.contentType === "both") && (
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Fichier PDF
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files[0])}
                    className="w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-pink-50 file:text-pink-600 hover:file:bg-pink-100"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Description
                </label>
                <textarea
                  rows="3"
                  placeholder="Décrivez brièvement le contenu..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-pink-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-pink-600 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50 cursor-pointer"
                >
                  {loading
                    ? "Enregistrement..."
                    : editingCourseId
                      ? "Mettre à jour"
                      : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherCourses;
