import React, { useState, useMemo, useCallback } from "react";

const HomeworksTab = ({
  assignments = [],
  homeworks = [], // Liste des soumissions
  setSelectedHomework,
  onDeleteSubmission, // Pour supprimer un rendu non corrigé
  onArchiveSubmission, // Pour masquer/archiver un rendu corrigé
  formatUrl,
}) => {
  const [filter, setFilter] = useState("todo"); // 'todo', 'done', 'archived'
  const [visibleCount, setVisibleCount] = useState(5);

  const resolveUrl = useCallback(
    (url) => {
      if (!url) return "";
      if (formatUrl) return formatUrl(url);
      return url.startsWith("http") ? url : `http://localhost:5000${url}`;
    },
    [formatUrl],
  );

  // Indexation rapide des soumissions (Map $O(1)$ au lieu de find $O(N)$)
  const submissionsMap = useMemo(() => {
    const map = new Map();
    homeworks.forEach((sub) => {
      const subAssignmentId =
        sub.homeworkId ||
        sub.assignment?._id ||
        sub.assignment ||
        sub.assignmentId;
      if (subAssignmentId) {
        map.set(String(subAssignmentId), sub);
      }
    });
    return map;
  }, [homeworks]);

  // Séparation dynamique des devoirs
  const { todoAssignments, doneAssignments, archivedAssignments } =
    useMemo(() => {
      const todo = [];
      const done = [];
      const archived = [];

      assignments.forEach((item) => {
        const id = String(item._id || item.id);
        const sub = submissionsMap.get(id);

        if (!sub) {
          todo.push(item);
        } else if (sub.isArchivedByStudent) {
          archived.push(item);
        } else {
          done.push(item);
        }
      });

      return {
        todoAssignments: todo,
        doneAssignments: done,
        archivedAssignments: archived,
      };
    }, [assignments, submissionsMap]);

  const displayedAssignments = useMemo(() => {
    if (filter === "todo") return todoAssignments;
    if (filter === "done") return doneAssignments;
    return archivedAssignments;
  }, [filter, todoAssignments, doneAssignments, archivedAssignments]);

  const paginatedAssignments = useMemo(
    () => displayedAssignments.slice(0, visibleCount),
    [displayedAssignments, visibleCount],
  );

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setVisibleCount(5);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* En-tête & Onglets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-neutral-900">
            Mes Devoirs
          </h2>
          <p className="text-sm text-neutral-500">
            Réalisez vos exercices pratiques et consultez vos corrections.
          </p>
        </div>

        {/* Navigation Onglets */}
        <div className="flex bg-neutral-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleFilterChange("todo")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filter === "todo"
                ? "bg-white text-neutral-900 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            À faire ({todoAssignments.length})
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange("done")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filter === "done"
                ? "bg-white text-neutral-900 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            Déposés ({doneAssignments.length})
          </button>
          {archivedAssignments.length > 0 && (
            <button
              type="button"
              onClick={() => handleFilterChange("archived")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filter === "archived"
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              Masqués ({archivedAssignments.length})
            </button>
          )}
        </div>
      </div>

      {/* Liste des devoirs */}
      <div className="space-y-4">
        {displayedAssignments.length === 0 ? (
          <p className="text-sm text-neutral-400 bg-white p-6 rounded-2xl text-center border border-neutral-100">
            {filter === "todo" && "Aucun devoir à faire pour le moment. ✨"}
            {filter === "done" && "Aucun devoir déposé en attente ou révisé."}
            {filter === "archived" && "Aucun devoir masqué."}
          </p>
        ) : (
          paginatedAssignments.map((item) => {
            const courseTitle =
              item.course?.title || item.courseId?.title || "Module pratique";
            const itemId = String(item._id || item.id);
            const submission = submissionsMap.get(itemId);

            // Vérifier si le professeur a déjà corrigé le devoir
            const isGraded = Boolean(
              submission?.grade || submission?.feedback || submission?.isGraded,
            );

            return (
              <div
                key={itemId}
                className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-[#d97736] bg-[#fcf0ea] px-2.5 py-1 rounded-full uppercase">
                      {courseTitle}
                    </span>
                    <span className="text-xs text-neutral-300">•</span>
                    {submission ? (
                      isGraded ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          Corrigé ⭐
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          En attente de correction ⏳
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        À faire ⏳
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-neutral-800 text-base mt-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                      {item.instructions || item.description}
                    </p>
                  </div>
                </div>

                {/* Pied de carte : Actions */}
                <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-neutral-400">
                    📅 Date limite :{" "}
                    {item.dueDate
                      ? new Date(item.dueDate).toLocaleDateString("fr-FR")
                      : "Non définie"}
                  </span>

                  <div className="flex items-center gap-2">
                    {filter === "done" && submission && (
                      <>
                        {isGraded ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Ce devoir a été corrigé. Souhaitez-vous le masquer de votre liste principale ? Vous pourrez toujours le retrouver dans la section 'Masqués'.",
                                )
                              ) {
                                onArchiveSubmission?.(
                                  submission._id || submission.id,
                                );
                              }
                            }}
                            className="px-3 py-2 text-xs font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition cursor-pointer"
                          >
                            📦 Nettoyer la vue
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Votre devoir n'a pas encore été corrigé. Le supprimer annulera votre rendu et le remettra dans la liste 'À faire'. Continuer ?",
                                )
                              ) {
                                onDeleteSubmission?.(
                                  submission._id || submission.id,
                                );
                              }
                            }}
                            className="px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition cursor-pointer"
                          >
                            🗑️ Annuler mon dépôt
                          </button>
                        )}
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedHomework({ ...item, submission })
                      }
                      className={`px-4 py-2 text-xs font-semibold rounded-xl transition shrink-0 cursor-pointer ${
                        submission
                          ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                          : "bg-[#d97736] hover:bg-[#c2652a] text-white"
                      }`}
                    >
                      {submission
                        ? "Voir la note / détails 👁️"
                        : "Déposer mon travail 📤"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination (5 par 5) */}
      {displayedAssignments.length > visibleCount && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 5)}
            className="px-6 py-2.5 text-xs font-semibold text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-xl shadow-xs transition cursor-pointer"
          >
            Afficher plus ({displayedAssignments.length - visibleCount}{" "}
            restants)
          </button>
        </div>
      )}
    </div>
  );
};

export default HomeworksTab;
