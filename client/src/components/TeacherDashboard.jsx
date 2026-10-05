import React, { useState, useEffect } from "react";
import TeacherSidebar from "./teacher/TeacherSidebar";
import TeacherOverview from "./teacher/TeacherOverview";
import TeacherCourses from "./teacher/TeacherCourses";
import TeacherAssignments from "./teacher/TeacherAssignments"; // 👈 1. Ajout de l'import
import TeacherHomeworks from "./teacher/TeacherHomeworks";
import TeacherStudents from "./teacher/TeacherStudents";
import TeacherProfile from "./teacher/TeacherProfile";
import TeacherChat from "./teacher/TeacherChat";

const TeacherDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userJson = localStorage.getItem("user");
    if (userJson) {
      setUser(JSON.parse(userJson));
    }
  }, []);

  return (
    <div className="flex h-screen bg-neutral-50 font-sans">
      {/* 1. Sidebar */}
      <TeacherSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. Contenu Dynamique */}
      <main className="flex-1 overflow-y-auto p-8">
        {/* Header global */}
        <div className="bg-white border border-neutral-100 shadow-sm rounded-2xl p-6 mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif font-bold text-neutral-900">
              Bonjour, {user?.nom || user?.name || "Formateur"} 👋
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              Bienvenue dans votre espace d'enseignement.
            </p>
          </div>
          <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-semibold rounded-full">
            Compte Actif
          </span>
        </div>
        {/* Affichage conditionnel des composants */}
        {activeTab === "overview" && (
          <TeacherOverview setActiveTab={setActiveTab} />
        )}
        {activeTab === "courses" && <TeacherCourses />}
        {/* 👈 2. Onglet "Poser un devoir" (les consignes créées) */}
        {activeTab === "assignments" && <TeacherAssignments />}
        {/* Onglet "Devoirs à corriger" (les rendus reçus) */}
        {activeTab === "homeworks" && <TeacherHomeworks />}
        {activeTab === "students" && <TeacherStudents />}
        {activeTab === "profile" && <TeacherProfile user={user} />}
        {activeTab === "messages" && <TeacherChat />}
      </main>
    </div>
  );
};

export default TeacherDashboard;
