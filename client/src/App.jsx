import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import AdminHomeworks from "./pages/AdminHomeworks";
import Login from "./components/Login";
import Register from "./components/Register";
import AdminDashboard from "./components/AdminDashboard";
import StudentDashboard from "./components/StudentDashboard";
import Profil from "./components/Profil";
import Devoirs from "./components/Devoirs";
import MesCours from "./components/MesCours";
import BecomeTeacher from "./components/BecomeTeacher";
import TeacherDashboard from "./components/TeacherDashboard";
import AdminCertificatesManager from "./components/AdminCertificatesManager";
import CourseLearning from "./pages/CourseLearning";

// Gardien de sécurité
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem("token");
  const userJson = localStorage.getItem("user");
  const user = userJson ? JSON.parse(userJson) : null;

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    alert("⛔ Accès refusé !");
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* 🌐 Routes Publiques */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/devenir-formateur" element={<BecomeTeacher />} />

        {/* 🔐 Dashboard Élève */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["student", "admin"]}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        {/* 🎓 Dashboard Formateur */}
        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute allowedRoles={["formateur", "teacher", "admin"]}>
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />

        {/* 🔐 Dashboard Admin */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/homeworks"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminHomeworks />
            </ProtectedRoute>
          }
        />

        {/* 🎓 Espace d'apprentissage des cours (Appelle la page conteneur CourseLearning) */}
        <Route
          path="/learning/:courseId"
          element={
            <ProtectedRoute
              allowedRoles={["student", "admin", "formateur", "teacher"]}
            >
              <CourseLearning />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profil"
          element={
            <ProtectedRoute
              allowedRoles={["student", "formateur", "teacher", "admin"]}
            >
              <Profil />
            </ProtectedRoute>
          }
        />
        <Route
          path="/devoirs"
          element={
            <ProtectedRoute
              allowedRoles={["student", "admin", "formateur", "teacher"]}
            >
              <Devoirs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cours"
          element={
            <ProtectedRoute
              allowedRoles={["student", "admin", "formateur", "teacher"]}
            >
              <MesCours />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/certificates"
          element={<AdminCertificatesManager />}
        />

        {/* 🔄 Redirection par défaut si la route n'existe pas (TOUJOURS EN DERNIER) */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
