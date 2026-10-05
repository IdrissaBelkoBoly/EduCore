import React, { useState, useEffect } from "react";
import axios from "axios";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CourseAssignmentModal from "./CourseAssignmentModal";

const TeacherAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 📄 ETAT PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4; // 4 devoirs par page (grille 2x2)

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // 1. Récupérer les cours de ce formateur via la route /api/courses/teacher
      try {
        const coursesRes = await axios.get(
          "http://localhost:5000/api/courses/teacher",
          config,
        );

        // Extraction sécurisée selon la structure de getCourses ({ success, data, courses })
        const courseData =
          coursesRes.data.data || coursesRes.data.courses || [];
        if (Array.isArray(courseData)) {
          setCourses(courseData);
        }
      } catch (err) {
        console.error("Erreur chargement de mes cours:", err);
      }

      // 2. Récupérer les devoirs publiés par ce formateur
      try {
        const assignmentsRes = await axios.get(
          "http://localhost:5000/api/assignments/teacher/my-assignments",
          config,
        );
        if (assignmentsRes.data.success) {
          setAssignments(assignmentsRes.data.data || []);
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des devoirs:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce devoir ?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(
        `http://localhost:5000/api/assignments/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.data.success) {
        const updatedAssignments = assignments.filter(
          (item) => item._id !== id,
        );
        setAssignments(updatedAssignments);

        // Si la page actuelle devient vide après suppression, on recule d'une page
        const newTotalPages = Math.ceil(
          updatedAssignments.length / itemsPerPage,
        );
        if (currentPage > newTotalPages && newTotalPages > 0) {
          setCurrentPage(newTotalPages);
        }
      }
    } catch (err) {
      alert("Erreur lors de la suppression du devoir.");
    }
  };

  // 🟢 LOGIQUE DE PAGINATION
  const totalPages = Math.ceil(assignments.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAssignments = assignments.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        Chargement de vos devoirs...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Devoirs publiés</h1>
          <p className="text-sm text-gray-500">
            Gérez les devoirs attribués à vos élèves ({assignments.length} au
            total)
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-pink-600 hover:bg-pink-700 text-white font-medium px-4 py-2 rounded-lg shadow text-sm transition cursor-pointer"
        >
          + Poser un nouveau devoir
        </button>
      </div>

      {/* Contenu principal */}
      {assignments.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500 shadow-sm border">
          Aucun devoir publié pour le moment.
        </div>
      ) : (
        <>
          {/* Grille des devoirs affichés sur la page courante */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentAssignments.map((item) => {
              const courseTitle =
                item.course?.title ||
                item.courseId?.title ||
                "Cours non spécifié";
              return (
                <div
                  key={item._id}
                  className="bg-white border rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-semibold uppercase bg-pink-100 text-pink-700 px-2.5 py-1 rounded-full">
                          {courseTitle}
                        </span>
                        <h3 className="text-lg font-bold text-gray-800 mt-2">
                          {item.title}
                        </h3>
                      </div>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="text-red-500 hover:text-red-700 text-sm font-semibold transition cursor-pointer"
                      >
                        Supprimer
                      </button>
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-3">
                      {item.instructions || item.description}
                    </p>

                    {/* Consigne vocale */}
                    {item.instructionAudioUrl && (
                      <div className="bg-pink-50 border border-pink-100 rounded-lg p-2.5 mt-2">
                        <span className="text-xs font-bold text-pink-700 block mb-1">
                          🎙️ Consigne vocale :
                        </span>
                        <audio
                          controls
                          src={`http://localhost:5000${item.instructionAudioUrl}`}
                          className="w-full h-8"
                        />
                      </div>
                    )}

                    {/* Photo / Schéma annoté */}
                    {item.annotatedImageUrl && (
                      <div className="mt-2">
                        <a
                          href={`http://localhost:5000${item.annotatedImageUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pink-600 font-semibold underline text-xs flex items-center gap-1 hover:text-pink-700"
                        >
                          🖼️ Voir le schéma / la photo annotée
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Pied de carte */}
                  <div className="text-xs text-gray-400 border-t pt-3 flex justify-between items-center mt-4">
                    <span>
                      📅 Date limite :{" "}
                      {item.dueDate
                        ? new Date(item.dueDate).toLocaleDateString("fr-FR")
                        : "Non définie"}
                    </span>

                    {item.resourceUrl && (
                      <a
                        href={`http://localhost:5000${item.resourceUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-600 font-semibold underline hover:text-pink-700"
                      >
                        📎 Voir la ressource
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 🟢 BARRE DE PAGINATION */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm gap-3 mt-6">
              <p className="text-xs text-gray-500">
                Affichage de{" "}
                <span className="font-semibold text-gray-800">
                  {indexOfFirstItem + 1}
                </span>{" "}
                à{" "}
                <span className="font-semibold text-gray-800">
                  {Math.min(indexOfLastItem, assignments.length)}
                </span>{" "}
                sur{" "}
                <span className="font-semibold text-gray-800">
                  {assignments.length}
                </span>{" "}
                devoirs
              </p>

              <div className="flex items-center space-x-1">
                {/* Bouton Précédent */}
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
                          : "text-gray-600 hover:bg-gray-100"
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
                  className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <CourseAssignmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        courses={courses}
        onAssignmentCreated={fetchData}
      />
    </div>
  );
};

export default TeacherAssignments;
