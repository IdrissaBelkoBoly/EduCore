import React, { useState } from "react";

const ITEMS_PER_PAGE = 3;

const CorrectionsTab = ({ homeworks = [], formatUrl, onDelete }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [hiddenIds, setHiddenIds] = useState([]);

  // Filtrer les devoirs corrigés et exclure ceux que l'élève a supprimés/masqués
  const correctedHomeworks = homeworks.filter((h) => {
    const isCorrected =
      h.status === "approved" ||
      h.status === "rejected" ||
      h.status === "graded" ||
      h.grade !== undefined ||
      h.submission?.grade !== undefined;

    const submissionId = h._id || h.id;
    return isCorrected && !hiddenIds.includes(submissionId);
  });

  // Gestion de la suppression (Masquage direct + appel onDelete si fourni)
  const handleDelete = (id) => {
    if (
      window.confirm(
        "Voulez-vous supprimer cette correction de votre affichage ?",
      )
    ) {
      setHiddenIds((prev) => [...prev, id]);
      if (onDelete) {
        onDelete(id);
      }
    }
  };

  // Logique de pagination
  const totalPages = Math.ceil(correctedHomeworks.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentHomeworks = correctedHomeworks.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  // Helper d'URL
  const extractUrl = (val) => {
    if (!val) return null;
    if (
      typeof val === "string" &&
      val.trim() !== "" &&
      val !== "undefined" &&
      val !== "null"
    ) {
      return val.trim();
    }
    if (Array.isArray(val) && val.length > 0) return extractUrl(val[0]);
    if (typeof val === "object")
      return val.url || val.path || val.secure_url || null;
    return null;
  };

  const buildUrl = (url) => {
    const cleanUrl = extractUrl(url);
    if (!cleanUrl) return "";
    if (formatUrl) return formatUrl(cleanUrl);
    if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://"))
      return cleanUrl;
    const path = cleanUrl.startsWith("/") ? cleanUrl : `/${cleanUrl}`;
    return `http://localhost:5000${path}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-serif font-bold text-neutral-900">
            Corrections & Retours Formateur
          </h2>
          <p className="text-sm text-neutral-500">
            Consultez les appréciations, notes et feedbacks vocaux laissés par
            vos formateurs.
          </p>
        </div>
        {correctedHomeworks.length > 0 && (
          <span className="text-xs text-neutral-400 font-medium">
            {correctedHomeworks.length} correction(s) au total
          </span>
        )}
      </div>

      <div className="space-y-4">
        {correctedHomeworks.length === 0 ? (
          <p className="text-sm text-neutral-400 bg-white p-6 rounded-2xl text-center border border-neutral-100">
            Vous n'avez pas de devoirs corrigés affichés. 📝
          </p>
        ) : (
          currentHomeworks.map((hw) => {
            const submission = hw.submission || hw;
            const grade = submission.grade ?? hw.grade;
            const feedback = submission.feedback || hw.feedback;
            const submissionId = hw._id || hw.id;

            const assignmentTitle =
              hw.assignment?.title ||
              hw.assignmentId?.title ||
              hw.title ||
              "Devoir pratique";

            const courseTitle =
              hw.assignment?.course?.title || hw.courseId?.title || "";

            const rawAudioUrl = extractUrl(
              submission.feedbackAudioUrl ||
                submission.feedbackAudio ||
                submission.audioUrl ||
                submission.audio ||
                hw.feedbackAudioUrl ||
                hw.feedbackAudio ||
                hw.audioUrl,
            );

            const rawAnnotatedUrl = extractUrl(
              submission.annotatedImageUrl ||
                submission.annotatedImage ||
                hw.annotatedImageUrl ||
                hw.annotatedImage,
            );

            const finalAudioUrl = buildUrl(rawAudioUrl);
            const finalAnnotatedUrl = buildUrl(rawAnnotatedUrl);

            return (
              <div
                key={submissionId}
                className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-4 relative group"
              >
                <div className="flex justify-between items-start border-b pb-3">
                  <div>
                    <h3 className="font-bold text-neutral-800 text-sm">
                      {assignmentTitle}
                    </h3>
                    {courseTitle && (
                      <p className="text-xs text-neutral-500 font-medium mt-0.5">
                        Cours : {courseTitle}
                      </p>
                    )}
                    <p className="text-xs text-neutral-400 mt-1">
                      Corrigé le{" "}
                      {hw.updatedAt || submission.correctedAt
                        ? new Date(
                            hw.updatedAt || submission.correctedAt,
                          ).toLocaleDateString("fr-FR")
                        : "Récemment"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-[#d97736]">
                      {grade !== undefined && grade !== null
                        ? `${grade}/20`
                        : "Corrigé"}
                    </span>

                    {/* Bouton Supprimer / Masquer */}
                    <button
                      onClick={() => handleDelete(submissionId)}
                      className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      title="Supprimer cette correction de la liste"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* 1. Remarque Textuelle */}
                {feedback && (
                  <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 text-xs text-neutral-700">
                    <strong className="block text-neutral-900 mb-1">
                      💬 Remarque du formateur :
                    </strong>
                    "{feedback}"
                  </div>
                )}

                {/* 2. Audio du Formateur */}
                {finalAudioUrl ? (
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-amber-900 flex items-center gap-1">
                      🎙️ Note vocale du formateur :
                    </span>
                    <audio
                      src={finalAudioUrl}
                      controls
                      preload="metadata"
                      className="h-9 w-full sm:w-64"
                    />
                  </div>
                ) : null}

                {/* 3. Image Annotée */}
                {finalAnnotatedUrl ? (
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-800">
                      🖼️ Correction visuelle / Photo annotée :
                    </span>
                    <a
                      href={finalAnnotatedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#d97736] underline font-bold hover:text-[#c2652a]"
                    >
                      Consulter l'image 📄
                    </a>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {/* Barre de Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4 border-t border-neutral-100">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
            className="px-3 py-1.5 rounded-lg border text-xs font-medium disabled:opacity-40 hover:bg-neutral-50"
          >
            Précédent
          </button>

          <span className="text-xs text-neutral-600 font-semibold px-2">
            Page {currentPage} sur {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
            className="px-3 py-1.5 rounded-lg border text-xs font-medium disabled:opacity-40 hover:bg-neutral-50"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
};

export default CorrectionsTab;
