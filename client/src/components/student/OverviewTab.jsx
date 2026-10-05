import React from "react";

const OverviewTab = ({
  user, // Injecté depuis le profil backend (getMe)
  courses = [],
  homeworks = [], // Reçoit les soumissions (getMySubmissions)
  assignments = [], // Reçoit tous les devoirs (getAssignments)
  userProgress = [], // 🟢 Reçoit la liste des progressions (Progress Schema)
  certificates = [],
  setActiveTab,
  formatUrl,
}) => {
  // Helper pour formater proprement l'URL de l'image
  const getCleanUrl = (url) => {
    if (!url) return "";
    if (typeof formatUrl === "function") return formatUrl(url);
    if (url.startsWith("http://") || url.startsWith("https://")) return url;

    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return `http://localhost:5000${cleanPath}`;
  };

  // 1. Extraction des leçons / étapes complétées depuis userProgress
  const totalFromProgress = Array.isArray(userProgress)
    ? userProgress.reduce(
        (acc, curr) => acc + (curr?.completedSteps?.length || 0),
        0,
      )
    : 0;

  const completedLessonsCount =
    totalFromProgress ||
    user?.completedSteps?.length ||
    user?.completedLessons?.length ||
    user?.progression?.length ||
    (Array.isArray(user?.completed) ? user.completed.length : 0);

  // 📈 Calcul du pourcentage global moyen de l'étudiante
  const averageGlobalPercentage =
    Array.isArray(userProgress) && userProgress.length > 0
      ? Math.round(
          userProgress.reduce(
            (acc, curr) => acc + (curr?.globalPercentage || 0),
            0,
          ) / userProgress.length,
        )
      : 0;

  // 2. Récupérer la liste des ID de devoirs déjà rendus par l'élève
  const submittedAssignmentIds = homeworks
    .map((h) => {
      if (typeof h.assignment === "object" && h.assignment?._id) {
        return h.assignment._id.toString();
      }
      return h.assignment ? h.assignment.toString() : null;
    })
    .filter(Boolean);

  // 3. Filtrer les devoirs de l'école qu'il reste à effectuer
  const pendingAssignments = assignments.filter((assign) => {
    const assignId = (assign._id || assign.id)?.toString();
    return !submittedAssignmentIds.includes(assignId);
  });

  // Calculs financiers
  const pricePaid = user?.pricePaid || user?.amountPaid || 0;
  const totalPrice = user?.totalPrice || user?.price || 1000;
  const remainingPrice = Math.max(0, totalPrice - pricePaid);
  const paymentPercentage = Math.min(
    100,
    Math.round((pricePaid / totalPrice) * 100),
  );

  // Déterminer le cours récent actif
  const activeCourse = courses.length > 0 ? courses[0] : null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-neutral-900">
            Ravi de vous revoir, {user?.nom || user?.name || "Élève"} ! 👋
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Voici un aperçu de votre avancement, vos paiements et vos devoirs à
            venir.
          </p>
        </div>

        {/* Badge d'état du compte */}
        {user?.isBlocked ? (
          <span className="self-start sm:self-auto px-3 py-1.5 bg-red-100 text-red-700 font-semibold text-xs rounded-full border border-red-200">
            🔒 Accès Restreint (Paiement)
          </span>
        ) : (
          <span className="self-start sm:self-auto px-3 py-1.5 bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-full border border-emerald-200">
            🟢 Compte Actif
          </span>
        )}
      </div>

      {/* Cartes Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cours */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0">
            📚
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-medium">
              Cours accessibles
            </p>
            <h3 className="text-xl font-bold text-neutral-800">
              {courses.length}
            </h3>
          </div>
        </div>

        {/* Leçons validées & Progression moyenne */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">
            ✅
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-medium">
              Leçons validées
            </p>
            <div className="flex items-baseline space-x-2">
              <h3 className="text-xl font-bold text-neutral-800">
                {completedLessonsCount}
              </h3>
              <span className="text-xs font-semibold text-emerald-600">
                ({averageGlobalPercentage}%)
              </span>
            </div>
          </div>
        </div>

        {/* Devoirs en attente */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#d97736] flex items-center justify-center text-xl shrink-0">
            ⏳
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-medium">
              Devoirs en attente
            </p>
            <h3 className="text-xl font-bold text-neutral-800">
              {pendingAssignments.length}
            </h3>
          </div>
        </div>

        {/* Certificats */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0">
            🏆
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-medium">
              Certificats obtenus
            </p>
            <h3 className="text-xl font-bold text-neutral-800">
              {certificates.length || user?.certificates?.length || 0}
            </h3>
          </div>
        </div>
      </div>

      {/* Bloc Statut de Paiement */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-serif font-bold text-base text-neutral-900">
            Paiement de la Formation
          </h3>
          <span className="text-xs font-semibold text-neutral-600">
            {pricePaid} FCFA / {totalPrice} FCFA ({paymentPercentage}%)
          </span>
        </div>

        {/* Barre de progression du paiement */}
        <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#d97736] transition-all duration-500 rounded-full"
            style={{ width: `${paymentPercentage}%` }}
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-between sm:items-center text-xs text-neutral-500 pt-1 gap-2">
          {remainingPrice > 0 ? (
            <p>
              Reste à payer :{" "}
              <strong className="text-neutral-800">
                {remainingPrice} FCFA
              </strong>
            </p>
          ) : (
            <p className="text-emerald-600 font-semibold">
              Formation intégralement réglée ! 🎉
            </p>
          )}

          {(user?.dueDate || user?.paymentDeadline) && (
            <p className="text-neutral-400">
              Prochaine échéance :{" "}
              <span className="text-neutral-700 font-medium">
                {new Date(
                  user.dueDate || user.paymentDeadline,
                ).toLocaleDateString("fr-FR")}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dernière activité / Cours récent */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-4">
          <h3 className="font-serif font-bold text-lg text-neutral-900">
            Dernière activité
          </h3>

          {activeCourse ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#fcf8f5] rounded-xl border border-[#f3e6dc] gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-lg bg-neutral-200 overflow-hidden shrink-0 border border-neutral-200">
                  {activeCourse.thumbnailUrl ||
                  activeCourse.thumbnail ||
                  activeCourse.image ? (
                    <img
                      src={getCleanUrl(
                        activeCourse.thumbnailUrl ||
                          activeCourse.thumbnail ||
                          activeCourse.image,
                      )}
                      alt={activeCourse.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                        if (e.target.parentElement) {
                          e.target.parentElement.innerHTML =
                            '<div class="w-full h-full flex items-center justify-center text-2xl">💅</div>';
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      💅
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-neutral-800">
                    {activeCourse.title}
                  </h4>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {activeCourse.category || "Formation Spécialisée"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab("courses")}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#d97736] hover:bg-[#c2652a] text-white text-xs font-semibold rounded-xl transition cursor-pointer text-center shrink-0"
              >
                Continuer ➔
              </button>
            </div>
          ) : (
            <p className="text-xs text-neutral-400 py-4">
              Aucun cours accessible pour le moment. Contactez l'administration
              si vous venez de vous inscrire.
            </p>
          )}
        </div>

        {/* Devoirs à rendre */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-serif font-bold text-lg text-neutral-900">
              Devoirs Récents
            </h3>
            <button
              onClick={() => setActiveTab("homeworks")}
              className="text-xs text-[#d97736] hover:underline font-medium cursor-pointer"
            >
              Voir tout
            </button>
          </div>

          {pendingAssignments.length > 0 ? (
            <div className="space-y-3">
              {pendingAssignments.slice(0, 3).map((assign) => (
                <div
                  key={assign._id || assign.id}
                  className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex justify-between items-center text-xs"
                >
                  <div className="truncate pr-2">
                    <p className="font-semibold text-neutral-800 truncate">
                      {assign.title || "Exercice pratique"}
                    </p>
                    <p className="text-neutral-400 text-[11px] mt-0.5">
                      En attente de rendu
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 font-semibold rounded-md shrink-0 text-[10px]">
                    À faire
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 py-4">
              Aucun devoir en attente pour le moment. Excellent travail ! 🎉
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
