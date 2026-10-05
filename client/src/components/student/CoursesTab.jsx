import React, { useState, useEffect } from "react";
import axios from "axios";

const CoursesTab = ({ courses = [], formatUrl }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [currentPage, setCurrentPage] = useState(1);
  const [userProgress, setUserProgress] = useState({}); // Stocke la progression par courseId
  const coursesPerPage = 6;

  // Sécurisation de la liste des cours
  const courseList = Array.isArray(courses) ? courses : [];

  // 🔄 Chargement des progressions de l'étudiante connectée
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/progress/my-progress", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data && Array.isArray(response.data.data)) {
          const progressMap = {};

          response.data.data.forEach((p) => {
            // 🟢 SÉCURISATION : Utilisation de Optional Chaining (?.) pour éviter d'accéder à _id sur un objet null
            const courseId =
              p?.course?._id ||
              (typeof p?.course === "string" ? p.course : null);

            // On n'enregistre la progression que si l'ID du cours est valide
            if (courseId) {
              progressMap[courseId] = p.globalPercentage || 0;
            }
          });

          setUserProgress(progressMap);
        }
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des progressions :",
          error,
        );
      }
    };

    fetchProgress();
  }, []);

  // Extraction automatique des catégories uniques
  const categories = [
    "Tous",
    ...new Set(
      courseList
        .map((c) => c.category)
        .filter((cat) => cat && cat.trim() !== ""),
    ),
  ];

  // Filtrage selon la recherche et la catégorie sélectionnée
  const filteredCourses = courseList.filter((course) => {
    const matchesSearch =
      course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "Tous" || course.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Calcul des données de pagination
  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);
  const indexOfLastCourse = currentPage * coursesPerPage;
  const indexOfFirstCourse = indexOfLastCourse - coursesPerPage;
  const currentCourses = filteredCourses.slice(
    indexOfFirstCourse,
    indexOfLastCourse,
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-neutral-900">
          Mes Formations
        </h2>
        <p className="text-sm text-neutral-500">
          Accédez à vos modules vidéo, fiches pratiques et ressources
          pédagogiques.
        </p>
      </div>

      {/* Barre de Recherche et Filtres */}
      {courseList.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-neutral-100 shadow-xs">
          {/* Champ de recherche */}
          <div className="relative w-full md:w-80">
            <span className="absolute left-3 top-2.5 text-neutral-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Rechercher un cours..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-neutral-50 rounded-xl text-xs border border-neutral-200 focus:outline-none focus:border-[#d97736]"
            />
          </div>

          {/* Boutons de filtres par catégorie */}
          <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-[#d97736] text-white"
                    : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grille des cours */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentCourses.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-2xl text-center border border-neutral-100 text-neutral-400 text-sm">
            {courseList.length === 0
              ? "Vous n'êtes inscrite à aucun cours pour le moment. 📚"
              : "Aucun cours ne correspond à votre recherche. 🔍"}
          </div>
        ) : (
          currentCourses.map((course) => {
            const courseId = course._id || course.id;
            const imageSrc = course.thumbnailUrl || course.thumbnail;
            const percentage = userProgress[courseId] || 0;

            let formateurName = "Non spécifié";

            if (course.formateur && typeof course.formateur === "object") {
              formateurName =
                course.formateur.nom?.trim() ||
                course.formateur.email ||
                "Non spécifié";
            } else if (
              typeof course.formateur === "string" &&
              course.formateur.trim() !== ""
            ) {
              formateurName = course.formateur;
            } else if (course.creatorName) {
              formateurName = course.creatorName;
            }

            return (
              <div
                key={courseId}
                className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="h-40 bg-neutral-100 relative">
                    {imageSrc ? (
                      <img
                        src={
                          typeof formatUrl === "function"
                            ? formatUrl(imageSrc)
                            : imageSrc
                        }
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        💅
                      </div>
                    )}
                  </div>
                  <div className="p-5 space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#d97736] bg-orange-50 px-2 py-1 rounded-md inline-block">
                      {course.category || "Module"}
                    </span>
                    <h3 className="font-bold text-neutral-800 text-sm line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-xs text-neutral-500 line-clamp-2">
                      {course.description}
                    </p>

                    {/* Barre de progression */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-neutral-600">
                          Progression
                        </span>
                        <span className="font-bold text-[#d97736]">
                          {percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#d97736] h-full rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                      <span className="font-medium text-neutral-600">
                        Formateur : {formateurName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <button
                    onClick={() =>
                      (window.location.href = `/learning/${courseId}`)
                    }
                    className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    {percentage > 0
                      ? "Continuer la leçon ▶"
                      : "Démarrer le cours ▶"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 pt-4">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
            className="px-3 py-1.5 rounded-xl border border-neutral-200 text-xs disabled:opacity-40 cursor-pointer"
          >
            Précédent
          </button>
          <span className="text-xs text-neutral-500 font-medium">
            Page {currentPage} sur {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
            className="px-3 py-1.5 rounded-xl border border-neutral-200 text-xs disabled:opacity-40 cursor-pointer"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
};

export default CoursesTab;
