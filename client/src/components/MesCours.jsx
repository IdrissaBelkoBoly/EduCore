import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const MesCours = () => {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLockModal, setShowLockModal] = useState(false);
  const [selectedLockedCourse, setSelectedLockedCourse] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  useEffect(() => {
    const fetchCoursesAndUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        // Récupérer l'utilisateur
        const profileResponse = await fetch(
          "http://localhost:5000/api/auth/me",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const profileResult = await profileResponse.json();
        if (profileResult.success) {
          setStudent(profileResult.data);
        }

        // Récupérer les cours
        const coursesResponse = await fetch(
          "http://localhost:5000/api/courses",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const coursesResult = await coursesResponse.json();
        if (coursesResult.success) {
          setCourses(coursesResult.data);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des cours :", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoursesAndUser();
  }, [navigate]);

  const handleCourseClick = (course, isAllowed) => {
    if (isAllowed) {
      navigate(`/learning/${course._id}`);
    } else {
      setSelectedLockedCourse(course);
      setShowLockModal(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-pink-500 font-bold text-lg animate-pulse">
          Chargement de vos cours... 💅
        </p>
      </div>
    );
  }

  const allowedCourseIds = student?.allowedCourses || [];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* SIDEBAR ÉTUDIANTE */}
      <aside className="w-64 bg-[#1E2530] text-white hidden md:flex flex-col justify-between p-6 shrink-0">
        <div>
          <div className="mb-8">
            <h1 className="text-lg font-extrabold text-white flex items-center gap-2">
              💅 <span className="text-pink-500">Onglerie</span> Académie
            </h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">
              Espace Étudiante
            </p>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 font-semibold text-sm transition-all text-left cursor-pointer"
            >
              📊 Mon Dashboard
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-pink-600 text-white font-semibold text-sm transition-all shadow-md shadow-pink-600/20 text-left cursor-pointer">
              📖 Mes Cours
            </button>
            <button
              onClick={() => navigate("/devoirs")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 font-semibold text-sm transition-all text-left cursor-pointer"
            >
              📝 Mes Pratiques
            </button>
            <button
              onClick={() => navigate("/profil")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 font-semibold text-sm transition-all text-left cursor-pointer"
            >
              👤 Mon Profil
            </button>
          </nav>
        </div>

        <div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 font-semibold text-sm transition-all text-left cursor-pointer"
          >
            🚪 Déconnexion
          </button>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <header className="mb-10">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Mon Programme de Formation 📖
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-1">
            Retrouvez l'ensemble de vos modules théoriques et pratiques
          </p>
        </header>

        {/* GRILLE DES COURS */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.length > 0 ? (
            courses.map((course) => {
              const isAllowed =
                allowedCourseIds.includes(course._id) ||
                student?.role === "admin";

              return (
                <div
                  key={course._id}
                  onClick={() => handleCourseClick(course, isAllowed)}
                  className={`bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between transition-all duration-300 transform hover:scale-[1.01] ${
                    isAllowed
                      ? "cursor-pointer hover:shadow-md"
                      : "opacity-75 cursor-not-allowed"
                  }`}
                >
                  {/* Image de couverture */}
                  <div className="relative aspect-video bg-gray-100">
                    <img
                      src={
                        course.thumbnailUrl &&
                        course.thumbnailUrl !== "default-course.png" &&
                        course.thumbnailUrl.trim() !== ""
                          ? course.thumbnailUrl
                          : "https://picsum.photos/400/225"
                      }
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      {isAllowed ? (
                        <span className="bg-green-100 text-green-700 font-extrabold text-[10px] uppercase px-2.5 py-1 rounded-full tracking-wider">
                          Disponible 🔓
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-600 font-extrabold text-[10px] uppercase px-2.5 py-1 rounded-full tracking-wider">
                          Verrouillé 🔒
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Détail du cours */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-[10px] font-black tracking-widest text-[#C48F7A] uppercase">
                        {course.category} • {course.level}
                      </span>
                      <h3 className="text-base font-bold text-slate-800 mt-1 leading-tight line-clamp-2">
                        {course.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                        {course.description ||
                          "Aucune description fournie pour ce module."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-bold text-gray-400">
                      <span>⏱️ {course.duration || "00:00"}</span>
                      <span
                        className={
                          isAllowed ? "text-pink-600" : "text-gray-400"
                        }
                      >
                        {isAllowed ? "Suivre le cours →" : "Non disponible"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full bg-white p-8 rounded-3xl text-center border border-slate-100">
              <p className="text-gray-500 text-sm font-semibold">
                Aucun cours n'est actuellement disponible dans votre catalogue.
                💅
              </p>
            </div>
          )}
        </section>
      </main>

      {/* MODALE ACCÈS COURS VERROUILLÉ */}
      {showLockModal && selectedLockedCourse && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 relative text-center space-y-6">
            <button
              onClick={() => setShowLockModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 text-sm font-bold transition-colors cursor-pointer"
            >
              ✕
            </button>
            <div className="mx-auto w-16 h-16 bg-slate-50 text-pink-500 rounded-full flex items-center justify-center text-2xl border border-pink-100">
              🔒
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black tracking-widest text-[#C48F7A] uppercase">
                Module Verrouillé
              </span>
              <h3 className="text-xl font-black text-slate-800 leading-snug px-2">
                {selectedLockedCourse.title}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed pt-2 px-4">
                Ce module fait partie de votre parcours, mais votre formatrice
                l'activera dès que vous aurez validé l'étape précédente ! 💅✨
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setShowLockModal(false)}
                className="w-full py-3.5 bg-[#1E2530] hover:bg-[#2e3745] text-white rounded-2xl text-xs font-bold shadow-lg cursor-pointer transition-all"
              >
                Continuer mon apprentissage 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MesCours;
