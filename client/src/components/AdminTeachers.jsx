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

const AdminTeachers = () => {
  // Navigation & États principaux
  const [subTab, setSubTab] = useState("active"); // "active" ou "pending"
  const [selectedTeacher, setSelectedTeacher] = useState(null); // Formateur sélectionné pour la vue détaillée

  // Données
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [activeTeachers, setActiveTeachers] = useState([]);
  const [teacherDetails, setTeacherDetails] = useState(null); // Stats du formateur sélectionné

  // États UI
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState("");

  // 1. Chargement des enseignants en attente de validation
  const fetchPendingTeachers = async () => {
    try {
      const token = getToken();
      const res = await axios.get(
        "http://localhost:5000/api/auth/admin/pending-teachers",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = res.data.teachers || res.data.data || res.data;
      setPendingTeachers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur de chargement des enseignants en attente :", err);
    }
  };

  // 2. Chargement des enseignants déjà actifs (Existant ou à connecter à votre API)
  const fetchActiveTeachers = async () => {
    try {
      const token = getToken();
      const res = await axios.get(
        "http://localhost:5000/api/auth/admin/teachers?status=active",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = res.data.teachers || res.data.data || res.data;
      setActiveTeachers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur de chargement des enseignants actifs :", err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchPendingTeachers(), fetchActiveTeachers()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  // 3. Charger les métriques d'un formateur spécifique lors du clic sur "Analyser"
  const handleSelectTeacher = async (teacher) => {
    setSelectedTeacher(teacher);
    setLoadingDetails(true);
    try {
      const token = getToken();
      const res = await axios.get(
        `http://localhost:5000/api/auth/admin/teachers/${teacher._id}/analytics`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setTeacherDetails(res.data);
    } catch (err) {
      console.error("Erreur métriques formateur :", err);
      // Données de secours mises à jour
      setTeacherDetails({
        stats: {
          totalCourses: teacher.coursesCount || 0,
          totalStudents: teacher.studentsCount || 0,
          recommendedCertificates: 0,
        },
        courses: teacher.courses || [],
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  // 4. Validation / Refus de statut
  const handleStatusChange = async (teacherId, newStatus) => {
    setUpdatingId(teacherId);
    try {
      const token = getToken();
      await axios.put(
        `http://localhost:5000/api/auth/admin/teachers/${teacherId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setMessage(
        `L'enseignant a été ${newStatus === "active" ? "approuvé" : "refusé"}.`,
      );

      setTimeout(() => setMessage(""), 4000);

      // Recharger la liste
      fetchPendingTeachers();
      fetchActiveTeachers();
    } catch (err) {
      console.error("Erreur mise à jour statut :", err);
      setMessage("Erreur lors de la modification du statut.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-neutral-500">Chargement des enseignants...</div>
    );
  }

  // ==========================================
  // VUE 1 : DÉTAILS ET ANALYTIQUES DU FORMATEUR
  // ==========================================
  if (selectedTeacher) {
    return (
      <div className="space-y-6 max-w-5xl">
        {/* Bouton retour */}
        <button
          onClick={() => {
            setSelectedTeacher(null);
            setTeacherDetails(null);
          }}
          className="text-sm font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-2 transition-colors"
        >
          ← Retour à la liste des enseignants
        </button>

        {/* En-tête profil */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">
              {selectedTeacher.name || selectedTeacher.nom}
            </h2>
            <p className="text-sm text-neutral-500">
              {selectedTeacher.email} • Spécialité :{" "}
              <span className="font-medium text-neutral-700">
                {selectedTeacher.specialite ||
                  selectedTeacher.speciality ||
                  "N/A"}
              </span>
            </p>
          </div>
          <button
            onClick={() => handleStatusChange(selectedTeacher._id, "rejected")}
            className="px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-200 hover:bg-red-100 transition-all"
          >
            Suspendre le compte
          </button>
        </div>

        {/* Cartes KPI */}
        {loadingDetails ? (
          <div className="p-4 text-neutral-400 text-sm">
            Chargement des statistiques...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Carte 1 : Cours créés */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold">
                  📖
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Cours créés
                  </p>
                  <p className="text-2xl font-black text-neutral-800">
                    {teacherDetails?.stats?.totalCourses || 0}
                  </p>
                </div>
              </div>

              {/* Carte 2 : Élèves inscrits */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl font-bold">
                  👥
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Élèves inscrits
                  </p>
                  <p className="text-2xl font-black text-neutral-800">
                    {teacherDetails?.stats?.totalStudents || 0}
                  </p>
                </div>
              </div>

              {/* Carte 3 : Certificats Recommandés */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl font-bold">
                  🎓
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Certificats Recommandés
                  </p>
                  <p className="text-2xl font-black text-amber-600">
                    {teacherDetails?.stats?.recommendedCertificates || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Tableau des cours du formateur */}
            {/* Tableau des cours du formateur avec liste des élèves */}
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-neutral-900 text-lg">
                Cours dispensés par cet enseignant
              </h3>

              {teacherDetails?.courses && teacherDetails.courses.length > 0 ? (
                <div className="space-y-4">
                  {teacherDetails.courses.map((course) => (
                    <details
                      key={course._id}
                      className="group border border-neutral-100 rounded-xl bg-neutral-50/50 p-4 transition-all"
                    >
                      <summary className="flex items-center justify-between cursor-pointer list-none">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-neutral-800">
                            {course.title}
                          </span>
                          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-green-50 text-green-700 border border-green-200">
                            Publié
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-neutral-600">
                          <span>
                            👥 <strong>{course.enrolledStudents || 0}</strong>{" "}
                            élève(s)
                          </span>
                          <span className="text-xs text-indigo-600 font-medium group-open:rotate-180 transition-transform">
                            ▼
                          </span>
                        </div>
                      </summary>

                      {/* Liste déroulante des élèves inscrits à ce cours */}
                      <div className="mt-4 pt-3 border-t border-neutral-200/60 text-sm">
                        <p className="font-medium text-neutral-700 mb-2">
                          Élèves ayant accès à ce cours :
                        </p>
                        {course.studentsList &&
                        course.studentsList.length > 0 ? (
                          <ul className="grid grid-cols-1 gap-2">
                            {course.studentsList.map((student) => (
                              <li
                                key={student._id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-white border border-neutral-100 gap-2"
                              >
                                <div>
                                  <p className="font-semibold text-neutral-800 text-xs">
                                    👤{" "}
                                    {student.nom ||
                                      student.name ||
                                      "Élève sans nom"}
                                  </p>
                                  <p className="text-xs text-neutral-400">
                                    {student.email}
                                  </p>
                                </div>

                                {/* Affichage du statut de recommandation et action */}
                                {student.isRecommendedForThisCourse ? (
                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                      📜 Recommandée par le formateur
                                    </span>
                                    <button
                                      onClick={() =>
                                        alert(
                                          `Génération du certificat pour ${student.nom || student.name}...`,
                                        )
                                      }
                                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors shadow-xs cursor-pointer"
                                    >
                                      Délivrer
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-neutral-400 italic">
                                    En cours d'apprentissage
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-neutral-400 italic">
                            Aucune élève n'est encore inscrite à ce cours.
                          </p>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">
                  Aucun cours publié pour le moment.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ==========================================
  // VUE 2 : LISTE AVEC SOUS-ONGLETS (ACTIFS / ATTESTATION)
  // ==========================================
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-serif font-bold text-neutral-900">
          Gestion des Enseignants
        </h2>
        <p className="text-sm text-neutral-500">
          Suivez les performances des formateurs ou validez les candidatures
          d'inscription.
        </p>
      </div>

      {message && (
        <div className="p-3 bg-blue-50 text-blue-700 rounded-xl text-sm border border-blue-200 transition-all">
          {message}
        </div>
      )}

      {/* Navigation par sous-onglets */}
      <div className="flex gap-4 border-b border-neutral-200">
        <button
          onClick={() => setSubTab("active")}
          className={`pb-3 px-4 text-sm font-semibold transition-all ${
            subTab === "active"
              ? "border-b-2 border-pink-500 text-pink-600"
              : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          Formateurs Actifs ({activeTeachers.length})
        </button>

        <button
          onClick={() => setSubTab("pending")}
          className={`pb-3 px-4 text-sm font-semibold transition-all flex items-center gap-2 ${
            subTab === "pending"
              ? "border-b-2 border-pink-500 text-pink-600"
              : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          Validation Candidatures
          {pendingTeachers.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full font-bold">
              {pendingTeachers.length}
            </span>
          )}
        </button>
      </div>

      {/* ONGLET 1 : FORMATEURS ACTIFS (Suivi & Statistiques) */}
      {subTab === "active" && (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-xs font-semibold text-neutral-500 border-b border-neutral-100">
                <th className="p-4">Enseignant</th>
                <th className="p-4">Spécialité</th>
                <th className="p-4">Téléphone</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-sm">
              {activeTeachers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-neutral-400">
                    Aucun formateur actif pour le moment.
                  </td>
                </tr>
              ) : (
                activeTeachers.map((teacher) => (
                  <tr
                    key={teacher._id}
                    className="hover:bg-neutral-50/50 transition-all"
                  >
                    <td className="p-4 font-medium text-neutral-800">
                      <div className="font-semibold">
                        {teacher.name || teacher.nom}
                      </div>
                      <div className="text-xs text-neutral-400">
                        {teacher.email}
                      </div>
                    </td>
                    <td className="p-4 text-neutral-600">
                      {teacher.specialite ||
                        teacher.speciality ||
                        "Non renseignée"}
                    </td>
                    <td className="p-4 text-neutral-600">
                      {teacher.phone || teacher.telephone || "N/A"}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleSelectTeacher(teacher)}
                        className="px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold rounded-lg transition-all shadow-xs"
                      >
                        📊 Analyser / Détails
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ONGLET 2 : VALIDATION CANDIDATURES (Votre code d'origine) */}
      {subTab === "pending" && (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-xs font-semibold text-neutral-500 border-b border-neutral-100">
                <th className="p-4">Enseignant</th>
                <th className="p-4">Spécialité & Bio</th>
                <th className="p-4">Téléphone</th>
                <th className="p-4">Statut</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-sm">
              {pendingTeachers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-neutral-400">
                    Aucune demande d'enseignant en attente pour le moment.
                  </td>
                </tr>
              ) : (
                pendingTeachers.map((teacher) => (
                  <tr
                    key={teacher._id}
                    className="hover:bg-neutral-50/50 transition-all"
                  >
                    <td className="p-4 font-medium text-neutral-800">
                      <div className="font-semibold">
                        {teacher.name || teacher.nom}
                      </div>
                      <div className="text-xs text-neutral-400">
                        {teacher.email}
                      </div>
                    </td>
                    <td className="p-4 text-neutral-600 max-w-xs">
                      <div className="font-medium text-neutral-700">
                        {teacher.specialite ||
                          teacher.speciality ||
                          "Non renseignée"}
                      </div>
                      {teacher.bio && (
                        <div
                          className="text-xs text-neutral-400 truncate mt-0.5"
                          title={teacher.bio}
                        >
                          {teacher.bio}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-neutral-600">
                      {teacher.phone || teacher.telephone || "N/A"}
                    </td>
                    <td className="p-4">
                      {(teacher.status === "pending" || !teacher.status) && (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          ⏳ En attente
                        </span>
                      )}
                      {(teacher.status === "active" ||
                        teacher.status === "approved") && (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700 border border-green-200">
                          ✅ Approuvé
                        </span>
                      )}
                      {teacher.status === "rejected" && (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">
                          ❌ Refusé
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {teacher.status !== "active" &&
                        teacher.status !== "approved" && (
                          <button
                            disabled={updatingId === teacher._id}
                            onClick={() =>
                              handleStatusChange(teacher._id, "active")
                            }
                            className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all"
                          >
                            Accepter
                          </button>
                        )}
                      {teacher.status !== "rejected" && (
                        <button
                          disabled={updatingId === teacher._id}
                          onClick={() =>
                            handleStatusChange(teacher._id, "rejected")
                          }
                          className="px-3 py-1.5 bg-neutral-100 text-neutral-600 text-xs font-bold rounded-lg hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-all border border-neutral-200"
                        >
                          Refuser
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminTeachers;
