import React from "react";

// Formateur d'URL pour le lecteur vidéo (Supporte Youtube iframe & Vidéos MP4/Locales)
const renderVideoSource = (url) => {
  if (!url) return null;

  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    let embedUrl = url;
    if (url.includes("watch?v=")) {
      embedUrl = url.replace("watch?v=", "embed/");
    } else if (url.includes("youtu.be/")) {
      embedUrl = url.replace("youtu.be/", "youtube.com/embed/");
    }
    return (
      <iframe
        src={embedUrl}
        title="Vidéo de cours"
        className="w-full h-full rounded-3xl"
        allowFullScreen
      />
    );
  }

  const fullUrl = url.startsWith("http") ? url : `http://localhost:5000${url}`;
  return (
    <video
      controls
      controlsList="nodownload"
      className="w-full h-full rounded-3xl object-cover"
    >
      <source src={fullUrl} type="video/mp4" />
      Votre navigateur ne supporte pas la lecture vidéo.
    </video>
  );
};

const LearningSpace = ({
  course,
  completedSteps = [],
  activeStepIndex = 0,
  setActiveStepIndex,
  savingProgress,
  onToggleComplete,
  showHomeworkModal,
  setShowHomeworkModal,
  homeworkFile,
  setHomeworkFile,
  homeworkComment,
  setHomeworkComment,
  uploadingHomework,
  onHomeworkSubmit,
  showQuestionModal,
  setShowQuestionModal,
  questionText,
  setQuestionText,
  sendingQuestion,
  onQuestionSubmit,
  isRecording,
  audioUrl,
  audioBlob,
  startRecording,
  stopRecording,
  resetAudio,
  onBack,
}) => {
  // 🟢 Garde pour éviter le crash écran blanc pendant le chargement des données
  if (!course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF6F0] p-4">
        <p className="text-[#C48F7A] font-bold text-sm animate-pulse mb-4">
          Chargement du cours... 🌸
        </p>
        <button
          onClick={onBack}
          className="text-xs font-bold text-[#2A2E43]/70 hover:underline cursor-pointer"
        >
          ← Retour au Dashboard
        </button>
      </div>
    );
  }

  const stepsList = course?.steps || course?.lessons || course?.modules || [];
  const currentStep = stepsList[activeStepIndex] || null;
  const currentVideoUrl = currentStep?.videoUrl || course?.videoUrl;

  const currentStepId = currentStep?._id || currentStep?.id || course?._id;
  const isCurrentStepCompleted = Array.isArray(completedSteps)
    ? completedSteps.includes(currentStepId)
    : false;

  const progressPercentage =
    stepsList.length > 0 && Array.isArray(completedSteps)
      ? Math.round((completedSteps.length / stepsList.length) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col items-center justify-center p-4 md:p-8 font-sans text-[#2A2E43]">
      {/* Navigation supérieure */}
      <div className="w-full max-w-5xl mb-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs font-bold text-[#C48F7A] hover:underline cursor-pointer flex items-center space-x-1"
        >
          <span>← Retour au Dashboard</span>
        </button>

        {/* Barre de progression globale */}
        {stepsList.length > 0 && (
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-[#2A2E43]/70">
              Progression : {progressPercentage}%
            </span>
            <div className="w-28 bg-[#EFE3D8] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#D3A28F] h-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* CONTENEUR PRINCIPAL */}
      <div className="w-full max-w-5xl bg-[#FAF6F3] rounded-[40px] p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-[#F1E6DA] grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative">
        {/* COLONNE GAUCHE : Lecteur Vidéo & Infos */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div className="text-center w-full">
            {/* 🟢 Titre sécurisé */}
            <h2 className="text-xl font-bold text-[#2A2E43] tracking-wide mb-4">
              {currentStep?.title || course?.title || "Titre du cours"}
            </h2>

            {/* Lecteur Vidéo */}
            <div className="aspect-video bg-[#1E1E26] rounded-3xl overflow-hidden shadow-inner relative border border-gray-200 flex items-center justify-center">
              {currentVideoUrl ? (
                renderVideoSource(currentVideoUrl)
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4">
                  <span className="text-3xl mb-2">📹</span>
                  <span className="text-sm">
                    Aucune vidéo associée à cette étape
                  </span>
                </div>
              )}
            </div>

            {/* 🟢 Support de cours / PDF sécurisé */}
            {course?.pdfUrl && (
              <div className="mt-4 text-left">
                <a
                  href={
                    course.pdfUrl.startsWith("http")
                      ? course.pdfUrl
                      : `http://localhost:5000${course.pdfUrl}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-2 text-xs font-bold text-[#C48F7A] bg-[#F7EBE4] hover:bg-[#F2DFC3] px-4 py-2.5 rounded-xl border border-[#EACFC3] transition"
                >
                  <span>📄 Télécharger le livret pédagogique (PDF)</span>
                </a>
              </div>
            )}
          </div>

          {/* Action complémentaire : Poser une question */}
          <div className="bg-[#F1F3F9] py-4 px-6 rounded-2xl text-center border border-gray-100 shadow-xs flex justify-between items-center">
            <p className="text-xs font-bold text-[#2A2E43]/80 tracking-wide">
              Une question ou un doute sur cette leçon ?
            </p>
            <button
              onClick={() => setShowQuestionModal && setShowQuestionModal(true)}
              className="px-3 py-1.5 bg-[#C48F7A] text-white text-xs font-bold rounded-lg hover:bg-[#b07b66] transition cursor-pointer flex items-center gap-1.5"
            >
              <span>💬</span>
              <span>Poser une question</span>
            </button>
          </div>
        </div>

        {/* COLONNE DROITE : Plan du Module */}
        <div className="lg:col-span-5 flex flex-col justify-between pt-2">
          <div>
            <h2 className="text-xl font-bold text-[#2A2E43] tracking-wide text-center mb-6">
              Plan du Module
            </h2>

            <div className="space-y-4">
              <span className="text-xs font-black text-[#2A2E43]/60 tracking-wider block uppercase mb-2">
                Leçons & Exercices
              </span>

              {/* Liste des Leçons */}
              <div className="space-y-3.5 max-h-75 overflow-y-auto pr-2">
                {stepsList.length > 0 ? (
                  stepsList.map((step, sIdx) => {
                    if (!step) return null;
                    const stepId = step._id || step.id || sIdx;
                    const isCompleted =
                      Array.isArray(completedSteps) &&
                      completedSteps.includes(stepId);
                    const isActive = activeStepIndex === sIdx;

                    return (
                      <button
                        key={stepId}
                        type="button"
                        onClick={() => setActiveStepIndex(sIdx)}
                        className={`w-full flex items-center space-x-3 text-left transition-all p-2 rounded-xl cursor-pointer ${
                          isActive ? "bg-white shadow-xs" : "hover:bg-white/50"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                            isCompleted
                              ? "bg-[#D3A28F] border-[#D3A28F] text-white"
                              : isActive
                                ? "border-[#D3A28F] bg-white text-[#D3A28F]"
                                : "border-gray-300 bg-white"
                          }`}
                        >
                          {isCompleted && (
                            <span className="text-[10px]">✓</span>
                          )}
                        </div>

                        <span
                          className={`text-xs font-bold tracking-wide truncate ${
                            isActive
                              ? "text-[#D3A28F] font-black"
                              : isCompleted
                                ? "text-[#2A2E43]/50 line-through"
                                : "text-[#2A2E43]/80"
                          }`}
                        >
                          Leçon {sIdx + 1} : {step.title || `Étape ${sIdx + 1}`}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-500 italic">
                    Module unique (Pas de sous-étapes).
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* BOUTON DE SOUMISSION / VALIDATION */}
          <div className="flex justify-end pt-6">
            <button
              type="button"
              onClick={onToggleComplete}
              disabled={savingProgress || isCurrentStepCompleted}
              className={`px-10 py-3 font-extrabold rounded-xl text-xs tracking-widest lowercase shadow-md transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                isCurrentStepCompleted
                  ? "bg-emerald-600 text-white cursor-not-allowed shadow-none"
                  : savingProgress
                    ? "bg-[#E6D4CB] text-[#9A7566] cursor-wait"
                    : "bg-[#D3A28F] hover:bg-[#C48F7A] text-white hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              {savingProgress ? (
                <>
                  <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full"></span>
                  <span>Enregistrement...</span>
                </>
              ) : isCurrentStepCompleted ? (
                <span>✓ Validée ! ✨</span>
              ) : (
                "Valider cette étape"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MODALE DÉPÔT DE DEVOIR PRATIQUE */}
      {showHomeworkModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-[#2A2E43] text-base">
                Soumettre ma réalisation pratique 📸
              </h3>
              <button
                onClick={() => setShowHomeworkModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onHomeworkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Photo ou Vidéo du résultat
                </label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setHomeworkFile(e.target.files[0])}
                  className="w-full text-xs p-2 border rounded-xl bg-gray-50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Remarque / Question (optionnel)
                </label>
                <textarea
                  rows="3"
                  value={homeworkComment}
                  onChange={(e) => setHomeworkComment(e.target.value)}
                  placeholder="Ex: J'ai eu un peu de mal avec le bombé..."
                  className="w-full text-xs p-2 border rounded-xl bg-gray-50 resize-none outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHomeworkModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={uploadingHomework}
                  className="px-4 py-2 text-xs font-bold bg-[#D3A28F] text-white rounded-xl hover:bg-[#C48F7A] transition cursor-pointer"
                >
                  {uploadingHomework ? "Envoi..." : "Envoyer le devoir"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE POSER UNE QUESTION */}
      {/* MODALE POSER UNE QUESTION */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-[#EACFC3]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-[#2A2E43]">
                💬 Poser une question au formateur
              </h3>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Cours :{" "}
              <span className="font-bold text-[#C48F7A]">{course?.title}</span>
            </p>

            <form onSubmit={onQuestionSubmit} className="space-y-4">
              <textarea
                rows={3}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Posez votre question par écrit..."
                className="w-full p-3 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#C48F7A]"
              />

              {/* SECTION ENREGISTREMENT VOCAL */}
              <div className="p-3 bg-[#FAF6F3] rounded-xl border border-[#EACFC3]/50">
                <label className="block text-[11px] font-bold text-gray-600 mb-2">
                  🎙️ Ajouter un message vocal :
                </label>

                <div className="flex items-center gap-3">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="px-3 py-1.5 bg-[#C48F7A] text-white text-xs font-bold rounded-lg hover:bg-[#b07b66] transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>🔴</span> Enregistrer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg animate-pulse flex items-center gap-1 cursor-pointer"
                    >
                      <span>⏹️</span> Arrêter
                    </button>
                  )}

                  {audioUrl && (
                    <button
                      type="button"
                      onClick={resetAudio}
                      className="text-xs text-red-500 font-bold hover:underline cursor-pointer"
                    >
                      Effacer
                    </button>
                  )}
                </div>

                {audioUrl && (
                  <div className="mt-3">
                    <audio src={audioUrl} controls className="w-full h-8" />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={
                    sendingQuestion || (!questionText.trim() && !audioBlob)
                  }
                  className="px-4 py-2 text-xs font-bold text-white bg-[#C48F7A] hover:bg-[#b07b66] disabled:opacity-50 rounded-xl transition cursor-pointer"
                >
                  {sendingQuestion ? "Envoi..." : "Envoyer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningSpace;
