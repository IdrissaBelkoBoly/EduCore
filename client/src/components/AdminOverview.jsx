import React from "react";

export default function AdminOverview({
  students = [],
  courses = [],
  pendingHomeworks = [],
  onNavigateTab,
  onDeleteSubmission, // 👈 Fonction pour supprimer manuellement un devoir si besoin
}) {
  const totalStudents = students.length;
  const totalCourses = courses.length;
  const totalPendingHomeworks = pendingHomeworks.length;

  const totalRevenue = students.reduce(
    (acc, curr) => acc + (Number(curr.pricePaid) || 0),
    0,
  );

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
      {/* 1. BANNIÈRE DE BIENVENUE */}
      <div className="bg-linear-to-r from-[#d97736] to-[#e89052] p-6 rounded-2xl text-white shadow-sm">
        <h2 className="text-2xl font-serif font-bold">Bonjour Admin 👋</h2>
        <p className="text-xs md:text-sm opacity-90 mt-1">
          Voici le résumé en temps réel de votre plateforme et les devoirs en
          attente de correction.
        </p>
      </div>

      {/* 2. STATISTIQUES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Élèves Inscrites
            </p>
            <h3 className="text-2xl font-bold text-neutral-900 mt-1">
              {totalStudents}
            </h3>
          </div>
          <span className="text-2xl bg-orange-50 p-3 rounded-2xl">👩‍🎓</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Modules de Cours
            </p>
            <h3 className="text-2xl font-bold text-neutral-900 mt-1">
              {totalCourses}
            </h3>
          </div>
          <span className="text-2xl bg-blue-50 p-3 rounded-2xl">📚</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Devoirs à corriger
            </p>
            <h3 className="text-2xl font-bold text-[#d97736] mt-1">
              {totalPendingHomeworks}
            </h3>
          </div>
          <span className="text-2xl bg-amber-50 p-3 rounded-2xl">📝</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Revenus Encaissés
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">
              {totalRevenue.toLocaleString()} DH
            </h3>
          </div>
          <span className="text-2xl bg-emerald-50 p-3 rounded-2xl">💳</span>
        </div>
      </div>

      {/* 3. LISTE DES DEVOIRS ET ACCÈS RAPIDES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
            <div>
              <h3 className="font-serif font-bold text-neutral-900 text-lg">
                📝 Devoirs à corriger
              </h3>
              <p className="text-xs text-neutral-400">
                Soumissions récentes nécessitant votre évaluation.
              </p>
            </div>
            <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full">
              {totalPendingHomeworks} en attente
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {pendingHomeworks.length > 0 ? (
              pendingHomeworks.map((hw, idx) => {
                // Extraction sécurisée du nom de l'élève
                const displayName =
                  hw.studentName ||
                  (typeof hw.student === "object" && hw.student !== null
                    ? `${hw.student.firstName || ""} ${hw.student.lastName || ""}`.trim() ||
                      hw.student.name ||
                      hw.student.nom ||
                      hw.student.email
                    : hw.student) ||
                  "Élève anonyme";

                const initials =
                  displayName
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase() || "ET";

                return (
                  <div
                    key={hw._id || idx}
                    className="flex items-center justify-between p-4 bg-neutral-50/80 rounded-xl border border-neutral-100 hover:border-neutral-200 transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-[#d97736]/10 text-[#d97736] font-bold flex items-center justify-center text-sm uppercase">
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-neutral-800">
                          {displayName}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {hw.courseTitle ||
                            hw.courseId?.title ||
                            "Module de cours"}{" "}
                          • {hw.lessonTitle || hw.assignmentTitle || "Devoir"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {onDeleteSubmission && (
                        <button
                          onClick={() => onDeleteSubmission(hw._id)}
                          title="Supprimer la soumission"
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all text-xs"
                        >
                          🗑️
                        </button>
                      )}

                      <button
                        onClick={() =>
                          onNavigateTab && onNavigateTab("homework")
                        }
                        className="px-4 py-2 bg-[#d97736] text-white rounded-xl text-xs font-bold hover:bg-[#c66628] transition-all shadow-xs cursor-pointer"
                      >
                        Corriger
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-neutral-400 text-xs">
                🎉 Aucun devoir en attente de correction pour le moment.
              </div>
            )}
          </div>
        </div>

        {/* ACCÈS RAPIDES */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-4">
          <div className="border-b border-neutral-100 pb-3">
            <h3 className="font-serif font-bold text-neutral-900 text-lg">
              ⚡ Accès Rapides
            </h3>
            <p className="text-xs text-neutral-400">
              Raccourcis vers vos espaces de gestion.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            <button
              onClick={() => onNavigateTab && onNavigateTab("students")}
              className="w-full text-left p-3.5 bg-neutral-50 hover:bg-neutral-100 rounded-xl text-xs font-bold text-neutral-700 transition-all border border-neutral-200/60 flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <span className="text-base">👩‍🎓</span>
                <span>Gestion des Élèves</span>
              </div>
              <span className="text-neutral-400 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </button>

            <button
              onClick={() => onNavigateTab && onNavigateTab("courses")}
              className="w-full text-left p-3.5 bg-neutral-50 hover:bg-neutral-100 rounded-xl text-xs font-bold text-neutral-700 transition-all border border-neutral-200/60 flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <span className="text-base">📚</span>
                <span>Gestion des Cours</span>
              </div>
              <span className="text-neutral-400 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </button>

            <button
              onClick={() => onNavigateTab && onNavigateTab("homework")}
              className="w-full text-left p-3.5 bg-neutral-50 hover:bg-neutral-100 rounded-xl text-xs font-bold text-neutral-700 transition-all border border-neutral-200/60 flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <span className="text-base">📂</span>
                <span>Espace Devoirs</span>
              </div>
              <span className="text-neutral-400 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </button>

            <button
              onClick={() => onNavigateTab && onNavigateTab("analytics")}
              className="w-full text-left p-3.5 bg-neutral-50 hover:bg-neutral-100 rounded-xl text-xs font-bold text-neutral-700 transition-all border border-neutral-200/60 flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <span className="text-base">📊</span>
                <span>Consulter les Analytiques</span>
              </div>
              <span className="text-neutral-400 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
