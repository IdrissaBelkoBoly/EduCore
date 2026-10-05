import React, { useState, useEffect, useCallback, useMemo } from "react";
import API from "../../api";

const TeacherStudents = () => {
  const [loading, setLoading] = useState(true);
  const [myStudents, setMyStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [teacherCourses, setTeacherCourses] = useState([]);

  // Modales
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  // Progression dynamique
  const [selectedProgressStudent, setSelectedProgressStudent] = useState(null);
  const [studentProgressList, setStudentProgressList] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // Recherches
  const [searchTerm, setSearchTerm] = useState("");
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");

  // Recommandation & Certification
  const [certType, setCertType] = useState("course_completion");
  const [selectedCourseForCert, setSelectedCourseForCert] = useState("");
  const [certComment, setCertComment] = useState("");
  const [certSubmitting, setCertSubmitting] = useState(false);

  // --- HELPERS DE SÉCURITÉ ---
  const getStudentId = (student) => {
    if (!student) return null;
    if (typeof student === "string") return student;

    const rawId =
      student._id ||
      student.id ||
      student.studentId?._id ||
      student.studentId ||
      student.userId?._id ||
      student.userId ||
      student.student?._id ||
      student.student?.id ||
      student.user?._id ||
      student.user?.id ||
      student._doc?._id ||
      student._doc?.id ||
      null;

    if (!rawId) return null;
    return typeof rawId === "object" ? rawId.toString() : String(rawId);
  };

  const getCourseId = (course) => {
    if (!course) return null;
    if (typeof course === "string") return course;

    const rawId =
      course._id ||
      course.id ||
      course.courseId?._id ||
      course.courseId ||
      course._doc?._id ||
      null;

    return rawId
      ? typeof rawId === "object"
        ? rawId.toString()
        : String(rawId)
      : null;
  };

  const getStudentName = (student) =>
    student?.nom ||
    student?.name ||
    student?.user?.name ||
    student?.student?.name ||
    student?.studentId?.name ||
    "Élève sans nom";

  const getUnlockedCoursesCount = (student) => {
    const allowed = student?.allowedCourses || [];
    const teacherCourseIds = new Set(
      teacherCourses.map((c) => String(getCourseId(c))),
    );

    return allowed.filter((ac) => {
      const id = String(getCourseId(ac));
      return teacherCourseIds.has(id);
    }).length;
  };

  // Fermer les modales avec la touche Échap
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedStudent(null);
        setIsAddModalOpen(false);
        setIsCertModalOpen(false);
        setSelectedProgressStudent(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // --- CHARGER LES DONNÉES INITIALES ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [coursesRes, allStudentsRes] = await Promise.all([
        API.get("/courses/teacher"),
        API.get("/auth/students"),
      ]);

      const courses =
        coursesRes.data.data ||
        coursesRes.data.courses ||
        coursesRes.data ||
        [];
      setTeacherCourses(courses);

      const all =
        allStudentsRes.data.data ||
        allStudentsRes.data.students ||
        allStudentsRes.data ||
        [];
      setAllStudents(all);

      const teacherCourseIds = new Set(
        courses.map((c) => String(getCourseId(c))),
      );

      const filteredMyStudents = all.filter((student) => {
        const allowed = student.allowedCourses || [];
        return allowed.some((allowedCourse) => {
          const cId = String(getCourseId(allowedCourse));
          return teacherCourseIds.has(cId);
        });
      });

      setMyStudents(filteredMyStudents);
    } catch (error) {
      console.error("Erreur lors du chargement des données :", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- GÉRER L'ACCÈS AUX COURS ---
  const handleToggleAccess = async (studentToToggle, courseId) => {
    const studentId = getStudentId(studentToToggle);
    const cIdStr = getCourseId(courseId);

    if (!studentId || !cIdStr) {
      alert(
        "Erreur: L'identifiant de l'élève ou du cours n'a pas pu être résolu.",
      );
      return;
    }

    const sIdStr = String(studentId);
    const currentAllowed = studentToToggle.allowedCourses || [];
    const hasAccess = currentAllowed.some(
      (ac) => String(getCourseId(ac)) === cIdStr,
    );

    try {
      const res = await API.post("/teacher/toggle-access", {
        studentId: sIdStr,
        courseId: cIdStr,
        action: hasAccess ? "revoke" : "grant",
      });

      const updatedStudent = res.data.data || res.data.student || res.data;

      // Mise à jour de la liste globale
      setAllStudents((prev) =>
        prev.map((s) =>
          String(getStudentId(s)) === sIdStr ? updatedStudent : s,
        ),
      );

      // Mise à jour de "Mes élèves"
      const teacherCourseIds = new Set(
        teacherCourses.map((c) => String(getCourseId(c))),
      );
      const stillHasAccess = (updatedStudent.allowedCourses || []).some((ac) =>
        teacherCourseIds.has(String(getCourseId(ac))),
      );

      setMyStudents((prev) => {
        const exists = prev.some((s) => String(getStudentId(s)) === sIdStr);
        if (stillHasAccess) {
          return exists
            ? prev.map((s) =>
                String(getStudentId(s)) === sIdStr ? updatedStudent : s,
              )
            : [...prev, updatedStudent];
        }
        return prev.filter((s) => String(getStudentId(s)) !== sIdStr);
      });

      if (selectedStudent && String(getStudentId(selectedStudent)) === sIdStr) {
        setSelectedStudent(updatedStudent);
      }
    } catch (error) {
      console.error("Erreur lors de la modification de l'accès :", error);
      alert(
        error.response?.data?.message ||
          "Erreur lors de la mise à jour des accès.",
      );
    }
  };

  // --- OUVRIR MODALE PROGRESSION ---
  const handleOpenProgressModal = async (student) => {
    const studentId = getStudentId(student);

    if (!studentId) {
      alert("Erreur: Impossible d'identifier cet élève (ID manquant).");
      return;
    }

    setSelectedProgressStudent(student);
    setLoadingProgress(true);
    setStudentProgressList([]);

    try {
      const res = await API.get(`/progress/student/${studentId}`);
      const progressData = res.data?.data || [];
      setStudentProgressList(progressData);
    } catch (error) {
      console.error("Erreur chargement progression :", error);
      alert(
        error.response?.data?.message ||
          "Erreur serveur lors de la récupération de la progression.",
      );
    } finally {
      setLoadingProgress(false);
    }
  };

  // --- RECOMMANDATION & CERTIFICATION ---
  const handleOpenCertModal = (student) => {
    setSelectedStudent(student);
    setCertType("course_completion");
    setSelectedCourseForCert(
      teacherCourses.length > 0 ? String(getCourseId(teacherCourses[0])) : "",
    );
    setCertComment("");
    setIsCertModalOpen(true);
  };

  const handleCloseCertModal = () => {
    setIsCertModalOpen(false);
    setSelectedStudent(null);
  };

  const handleSubmitCertRecommendation = async (e) => {
    e.preventDefault();
    const studentId = getStudentId(selectedStudent);
    if (!studentId) return;

    const isGlobal =
      certType === "global_certification" ||
      certType === "final" ||
      certType === "certification_globale";

    if (!isGlobal && !selectedCourseForCert) {
      alert("Veuillez sélectionner un cours pour le certificat de module.");
      return;
    }

    try {
      setCertSubmitting(true);

      const payload = {
        studentId,
        type: isGlobal ? "final" : "module",
        isFinal: isGlobal,
        courseId: isGlobal ? null : selectedCourseForCert,
        customNote:
          certComment ||
          (isGlobal
            ? "L'élève a validé l'ensemble du parcours pratique et théorique avec succès."
            : ""),
      };

      await API.post("/certificates/recommend", payload);

      alert(
        isGlobal
          ? "Recommandation de certification globale transmise avec succès !"
          : "Message d'encouragement/félicitations envoyé avec succès !",
      );
      handleCloseCertModal();
    } catch (error) {
      console.error("Erreur recommandation:", error.response?.data);
      alert(error.response?.data?.message || "Erreur lors de l'envoi.");
    } finally {
      setCertSubmitting(false);
    }
  };

  // --- FILTRES DE RECHERCHE ---
  const filteredMyStudents = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return myStudents.filter((s) => {
      return (
        getStudentName(s).toLowerCase().includes(q) ||
        (s.email || s.user?.email || s.studentId?.email || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [myStudents, searchTerm]);

  const filteredAllStudents = useMemo(() => {
    const q = globalSearchTerm.toLowerCase().trim();
    return allStudents.filter((s) => {
      return (
        getStudentName(s).toLowerCase().includes(q) ||
        (s.email || s.user?.email || s.studentId?.email || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [allStudents, globalSearchTerm]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>🧑‍🏫</span> Mes Élèves & Suivi
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Gérez les accès aux cours et suivez la progression de vos élèves.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 bg-[#e91e63] hover:bg-[#d81b60] text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition cursor-pointer text-sm"
        >
          <span>+</span> Inscrire une élève à mes cours
        </button>
      </div>

      {/* Barre de recherche */}
      <div>
        <input
          type="text"
          placeholder="Rechercher parmi mes élèves..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 text-sm text-gray-600 placeholder-gray-400 shadow-sm"
        />
      </div>

      {/* Tableau des élèves */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-900 uppercase tracking-wider">
                <th className="py-4 px-6">Élève</th>
                <th className="py-4 px-6">Email</th>
                <th className="py-4 px-6">Cours Débloqués</th>
                <th className="py-4 px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredMyStudents.length > 0 ? (
                filteredMyStudents.map((student, index) => {
                  const studentId = getStudentId(student) || `student-${index}`;
                  return (
                    <tr
                      key={studentId}
                      className="hover:bg-gray-50/50 transition"
                    >
                      <td className="py-4 px-6 font-semibold text-gray-900">
                        {getStudentName(student)}
                      </td>
                      <td className="py-4 px-6 text-gray-500">
                        {student.email ||
                          student.user?.email ||
                          student.studentId?.email ||
                          "—"}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-100">
                          {getUnlockedCoursesCount(student)} /{" "}
                          {teacherCourses.length} cours
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleOpenProgressModal(student)}
                            className="bg-[#17a2b8] hover:bg-[#138496] text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                          >
                            📊 Progression
                          </button>
                          <button
                            onClick={() => setSelectedStudent(student)}
                            className="bg-[#007bff] hover:bg-[#0069d9] text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                          >
                            ⚙️ Gérer les accès
                          </button>
                          <button
                            onClick={() => handleOpenCertModal(student)}
                            className="bg-[#ff9800] hover:bg-[#e68a00] text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                          >
                            🎓 Certification & Félicitations
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="4"
                    className="py-8 text-center text-gray-400 text-sm"
                  >
                    Aucune élève trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALE 1 : GÉRER LES ACCÈS --- */}
      {selectedStudent && !isCertModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg">
                Accès aux cours de : {getStudentName(selectedStudent)}
              </h3>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-500">
              Cochez ou décochez les cours pour accorder ou retirer l'accès :
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {teacherCourses.map((course, idx) => {
                const cId = String(getCourseId(course) || idx);
                const allowedCourses = selectedStudent.allowedCourses || [];
                const hasAccess = allowedCourses.some(
                  (ac) => String(getCourseId(ac)) === cId,
                );

                return (
                  <label
                    key={cId}
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100/80 rounded-xl border border-gray-100 cursor-pointer transition"
                  >
                    <span className="text-sm font-semibold text-gray-800 truncate max-w-[80%]">
                      {course.title}
                    </span>
                    <input
                      type="checkbox"
                      checked={hasAccess}
                      onChange={() =>
                        handleToggleAccess(selectedStudent, course)
                      }
                      className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500 accent-pink-600 cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedStudent(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALE 2 : INSCRIRE UNE ÉLÈVE --- */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg">
                Inscrire un élève
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              placeholder="Rechercher un élève par nom ou email..."
              value={globalSearchTerm}
              onChange={(e) => setGlobalSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20"
            />

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredAllStudents.map((st, idx) => {
                const stId = getStudentId(st) || `all-st-${idx}`;
                return (
                  <div
                    key={stId}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {getStudentName(st)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {st.email ||
                          st.user?.email ||
                          st.studentId?.email ||
                          "—"}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedStudent(st);
                        setIsAddModalOpen(false);
                      }}
                      className="bg-pink-50 text-pink-600 hover:bg-pink-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      Gérer les accès ⚙️
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALE 3 : CERTIFICATION ET ENCOURAGEMENT --- */}
      {isCertModalOpen && selectedStudent && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
          onClick={handleCloseCertModal}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg">
                Recommander / Certifier
              </h3>
              <button
                onClick={handleCloseCertModal}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmitCertRecommendation}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Élève
                </label>
                <input
                  type="text"
                  disabled
                  value={getStudentName(selectedStudent)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Type de demande
                </label>
                <select
                  value={certType}
                  onChange={(e) => setCertType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                >
                  <option value="course_completion">
                    🎉 Félicitations / Fin d'un cours spécifique
                  </option>
                  <option value="global_certification">
                    🎓 Certification globale de fin de formation
                  </option>
                </select>
              </div>

              {certType === "course_completion" && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Cours concerné
                  </label>
                  <select
                    value={selectedCourseForCert}
                    onChange={(e) => setSelectedCourseForCert(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                  >
                    {teacherCourses.map((c, idx) => {
                      const cid = getCourseId(c) || idx;
                      return (
                        <option key={cid} value={cid}>
                          {c.title}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {certType === "course_completion"
                    ? "Mot d'encouragement / Remarque"
                    : "Avis pour la certification globale"}
                </label>
                <textarea
                  rows="3"
                  placeholder={
                    certType === "course_completion"
                      ? "Bravo pour avoir fini ce module ! Continue ainsi..."
                      : "L'élève a validé l'ensemble du parcours pratique et théorique avec succès."
                  }
                  value={certComment}
                  onChange={(e) => setCertComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseCertModal}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={certSubmitting}
                  className="bg-[#ff9800] hover:bg-[#e68a00] text-white px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer disabled:opacity-50"
                >
                  {certSubmitting ? "Envoi..." : "Envoyer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODALE 4 : SUIVI PROGRESSION DYNAMIQUE --- */}
      {/* --- MODALE 4 : SUIVI PROGRESSION DYNAMIQUE --- */}
      {selectedProgressStudent && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
          onClick={() => setSelectedProgressStudent(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg">
                Progression de : {getStudentName(selectedProgressStudent)}
              </h3>
              <button
                onClick={() => setSelectedProgressStudent(null)}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600">
              Cours débloqués :{" "}
              <strong>
                {getUnlockedCoursesCount(selectedProgressStudent)} /{" "}
                {teacherCourses.length}
              </strong>
            </p>

            {loadingProgress ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {teacherCourses.map((course, idx) => {
                  const rawCourseId = course._id || course.id || course;
                  const currentCourseId = String(
                    rawCourseId?._id || rawCourseId,
                  ).trim();

                  // Recherche de la progression correspondant au cours
                  const progressObj = studentProgressList.find((p) => {
                    const rawProgCourse = p.course || p.courseId;
                    const progCourseId = String(
                      rawProgCourse?._id || rawProgCourse || "",
                    ).trim();

                    return progCourseId === currentCourseId;
                  });

                  // 1. Récupération ultra-blindée du Pourcentage (%)
                  let pct = 0;
                  if (progressObj) {
                    pct =
                      progressObj.globalPercentage ??
                      progressObj.percentage ??
                      progressObj.progression ??
                      progressObj.progress ??
                      progressObj.completionRate ??
                      0;
                  }

                  // 2. Leçons complétées (validées)
                  let completedCount = 0;
                  if (progressObj) {
                    completedCount =
                      progressObj.completedStepsCount ??
                      (Array.isArray(progressObj.completedSteps)
                        ? progressObj.completedSteps.length
                        : null) ??
                      (Array.isArray(progressObj.completedLessons)
                        ? progressObj.completedLessons.length
                        : null) ??
                      progressObj.completedCount ??
                      0;
                  }

                  // 3. Nombre total de leçons du cours
                  let totalSteps = 0;
                  if (progressObj?.totalStepsCount) {
                    totalSteps = progressObj.totalStepsCount;
                  } else if (progressObj?.totalSteps) {
                    totalSteps = progressObj.totalSteps;
                  } else if (
                    Array.isArray(course.steps) &&
                    course.steps.length > 0
                  ) {
                    totalSteps = course.steps.length;
                  } else if (
                    Array.isArray(course.modules) &&
                    course.modules.length > 0
                  ) {
                    totalSteps = course.modules.reduce(
                      (acc, m) =>
                        acc + (m.steps?.length || m.lessons?.length || 0),
                      0,
                    );
                  } else if (Array.isArray(course.lessons)) {
                    totalSteps = course.lessons.length;
                  }

                  // Secours : Si le total est trouvé et des leçons sont validées mais pct reste à 0
                  if (pct === 0 && completedCount > 0 && totalSteps > 0) {
                    pct = Math.round((completedCount / totalSteps) * 100);
                  }

                  return (
                    <div
                      key={currentCourseId || idx}
                      className="p-3 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      <div className="flex justify-between items-center text-xs font-semibold text-gray-700 mb-1">
                        <span className="truncate max-w-50">
                          {course.title || course.nom}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-[11px]">
                            ({completedCount}/{totalSteps} leçons)
                          </span>
                          <span className="text-pink-600 font-bold">
                            {Math.round(pct)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-pink-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.round(pct))}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedProgressStudent(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherStudents;
