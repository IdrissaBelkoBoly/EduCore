import React, { useState, useEffect } from "react";
import axios from "axios";

const getToken = () => {
  let token = localStorage.getItem("token");
  if (token) return token;
  try {
    const userObj = JSON.parse(
      localStorage.getItem("user") || localStorage.getItem("userInfo"),
    );
    if (userObj && userObj.token) return userObj.token;
  } catch (e) {}
  return null;
};

const AnalyticsDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const res = await axios.get(
        "http://localhost:5000/api/analytics/dashboard",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.data && res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques :", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-neutral-500 animate-pulse">
        Chargement des données analytiques et financières...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center text-neutral-500">
        Impossible de charger les données analytiques.
      </div>
    );
  }

  const { students, financials, homeworks, submissionsByCourse } = stats;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-neutral-900">
          Analytiques & Statistiques
        </h2>
        <p className="text-sm text-neutral-500">
          Aperçu financier, suivi des inscriptions et performances académiques.
        </p>
      </div>

      {/* 1. CARTES FINANCIÈRES & ÉTUDIANTES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Revenus encaissés */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Revenus Encaissés
            </p>
            <h3 className="text-2xl font-bold text-green-600 mt-2">
              {financials.totalRevenuePaid} €
            </h3>
            <p className="text-xs text-neutral-400 mt-1 font-medium">
              Sur {financials.totalRevenueExpected} € attendus
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-xl">
            💳
          </div>
        </div>

        {/* Reste à recouvrer */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Reste à Percevoir
            </p>
            <h3 className="text-2xl font-bold text-amber-600 mt-2">
              {financials.remainingToCollect} €
            </h3>
            <p className="text-xs text-neutral-400 mt-1 font-medium">
              Relances / Échéances
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
            ⏳
          </div>
        </div>

        {/* Élèves inscrites */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Étudiantes Total
            </p>
            <h3 className="text-2xl font-bold text-neutral-800 mt-2">
              {students.totalStudents}
            </h3>
            <p className="text-xs text-neutral-400 mt-1 font-medium">
              {students.fullyPaidCount} formation(s) soldée(s)
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
            👥
          </div>
        </div>

        {/* Moyenne Générale */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Moyenne Générale
            </p>
            <h3 className="text-2xl font-bold text-[#d97736] mt-2">
              {homeworks.averageGrade} / 20
            </h3>
            <p className="text-xs text-neutral-400 mt-1 font-medium">
              Taux validation: {homeworks.passRate}%
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl">
            ⭐
          </div>
        </div>
      </div>

      {/* 2. TABLEAU D'ACTIVITÉ ET CORRECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Statut des Devoirs */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-4">
          <h3 className="font-semibold text-neutral-800 text-sm">
            Statut des Devoirs Soumis ({homeworks.totalSubmissions})
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-green-700">
                  Validés ({homeworks.approvedCount})
                </span>
                <span>
                  {homeworks.totalSubmissions > 0
                    ? Math.round(
                        (homeworks.approvedCount / homeworks.totalSubmissions) *
                          100,
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${
                      homeworks.totalSubmissions > 0
                        ? (homeworks.approvedCount /
                            homeworks.totalSubmissions) *
                          100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-amber-700">
                  En attente ({homeworks.pendingCount})
                </span>
                <span>
                  {homeworks.totalSubmissions > 0
                    ? Math.round(
                        (homeworks.pendingCount / homeworks.totalSubmissions) *
                          100,
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-2 rounded-full"
                  style={{
                    width: `${
                      homeworks.totalSubmissions > 0
                        ? (homeworks.pendingCount /
                            homeworks.totalSubmissions) *
                          100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-red-700">
                  À revoir ({homeworks.rejectedCount})
                </span>
                <span>
                  {homeworks.totalSubmissions > 0
                    ? Math.round(
                        (homeworks.rejectedCount / homeworks.totalSubmissions) *
                          100,
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{
                    width: `${
                      homeworks.totalSubmissions > 0
                        ? (homeworks.rejectedCount /
                            homeworks.totalSubmissions) *
                          100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Détails des devoirs par cours */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-4">
          <h3 className="font-semibold text-neutral-800 text-sm">
            Rendus et Moyennes par Module
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-xs font-semibold text-neutral-400 uppercase">
                  <th className="pb-3">Cours</th>
                  <th className="pb-3 text-center">Devoirs Rendus</th>
                  <th className="pb-3 text-right">Moyenne</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {submissionsByCourse && submissionsByCourse.length > 0 ? (
                  submissionsByCourse.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-neutral-50/50 transition-colors"
                    >
                      <td className="py-3 font-medium text-neutral-800">
                        {item.courseTitle}
                      </td>
                      <td className="py-3 text-center text-neutral-600">
                        {item.count}
                      </td>
                      <td className="py-3 text-right font-semibold text-[#d97736]">
                        {item.avgGrade ? `${item.avgGrade} / 20` : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="3"
                      className="py-4 text-center text-neutral-400"
                    >
                      Aucune donnée de rendu disponible.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
