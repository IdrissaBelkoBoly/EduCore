import React, { useState, useEffect } from "react";
import axios from "axios";
import { BookOpen, Clock, Users, PlusCircle, CheckSquare } from "lucide-react";

const TeacherOverview = ({ setActiveTab }) => {
  const [stats, setStats] = useState({
    publishedCourses: 0,
    pendingDevoirs: 0,
    activeStudents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "http://localhost:5000/api/teacher/dashboard-stats",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setStats(res.data);
    } catch (err) {
      console.error("Erreur lors de la récupération des statistiques :", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Stat cartes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Carte 1 : Cours publiés */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-neutral-900">
              {loading ? "..." : stats.publishedCourses}
            </div>
            <div className="text-xs font-medium text-neutral-400">
              Cours publiés
            </div>
          </div>
        </div>

        {/* Carte 2 : Devoirs en attente */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-neutral-900">
              {loading ? "..." : stats.pendingDevoirs}
            </div>
            <div className="text-xs font-medium text-neutral-400">
              Devoirs en attente
            </div>
          </div>
        </div>

        {/* Carte 3 : Élèves actives */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-neutral-900">
              {loading ? "..." : stats.activeStudents}
            </div>
            <div className="text-xs font-medium text-neutral-400">
              Élèves actives
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
        <h3 className="text-lg font-bold text-neutral-900 mb-4">
          Actions Rapides
        </h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setActiveTab("courses")}
            className="flex items-center space-x-2 px-4 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-semibold hover:bg-pink-700 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Ajouter un nouveau cours</span>
          </button>

          <button
            onClick={() => setActiveTab("homeworks")}
            className="flex items-center space-x-2 px-4 py-2.5 bg-neutral-100 text-neutral-700 rounded-xl text-sm font-semibold hover:bg-neutral-200 transition-all cursor-pointer"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Corriger les devoirs</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherOverview;
