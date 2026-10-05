import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  LayoutDashboard,
  BookOpen,
  FilePlus,
  CheckSquare,
  Users,
  MessageSquare,
  User,
  LogOut,
  Bell,
  MessageCircle,
  FileText,
  X,
  Trash2,
} from "lucide-react";

const TeacherSidebar = ({ activeTab, setActiveTab }) => {
  const navigate = useNavigate();

  // 1. Infos utilisateur
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // 2. États des notifications
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifTab, setNotifTab] = useState("chat"); // 'chat' ou 'homework'
  const [notifications, setNotifications] = useState([]);

  const notifRef = useRef(null);

  // Fermer le popover au clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. Charger les notifications centralisées (Polling toutes les 10s)
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await axios.get("http://localhost:5000/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error("Erreur récupération notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  // FILTRAGE AMÉLIORÉ (Insensible à la casse + vérification multicitères)
  const chatNotifs = notifications.filter((n) => {
    const type = (n.type || "").toUpperCase();
    return type === "CHAT" || type === "MESSAGE";
  });

  const homeworkNotifs = notifications.filter((n) => {
    const type = (n.type || "").toUpperCase();
    const model = (n.relatedModel || "").toUpperCase();
    const link = (n.link || "").toLowerCase();

    // Vérification par type explicite
    const isHomeworkType = [
      "HOMEWORK",
      "CORRECTION",
      "SUBMISSION",
      "ASSIGNMENT",
      "DEVOIR",
    ].includes(type);

    // Vérification par relations/liens
    const isHomeworkModel =
      model === "SUBMISSION" ||
      model === "HOMEWORK" ||
      link.includes("homework");

    return isHomeworkType || isHomeworkModel;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // 🗑️ Supprimer TOUTES les notifications côté serveur
  const handleClearAll = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      await axios.delete("http://localhost:5000/api/notifications/clear-all", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications([]);
    } catch (err) {
      console.error("Erreur suppression globale :", err);
    }
  };

  // 🗑️ Supprimer UNE notification spécifique
  const handleDeleteOne = async (e, id) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem("token");
      if (token) {
        await axios.delete(`http://localhost:5000/api/notifications/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setNotifications((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      console.error("Erreur suppression de la notification :", err);
    }
  };

  // 👁️ Marquer une notification comme lue et naviguer
  const handleNotificationClick = async (notif, targetTab) => {
    try {
      const token = localStorage.getItem("token");
      if (token && !notif.isRead) {
        await axios.patch(
          `http://localhost:5000/api/notifications/${notif._id}/read`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }
      setNotifications((prev) =>
        prev.map((item) =>
          item._id === notif._id ? { ...item, isRead: true } : item,
        ),
      );
    } catch (err) {
      console.error("Erreur lors de la lecture :", err);
    } finally {
      setActiveTab(targetTab);
      setShowNotifications(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const avatarUrl = user?.avatar
    ? user.avatar.startsWith("http")
      ? user.avatar
      : `http://localhost:5000/${user.avatar}`
    : null;

  const navItems = [
    { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
    { id: "courses", label: "Mes Cours", icon: BookOpen },
    { id: "assignments", label: "Poser un devoir", icon: FilePlus },
    { id: "homeworks", label: "Devoirs à corriger", icon: CheckSquare },
    { id: "students", label: "Mes Élèves", icon: Users },
    { id: "messages", label: "Questions & Chat", icon: MessageSquare },
    { id: "profile", label: "Mon Profil", icon: User },
  ];

  return (
    <aside className="w-64 bg-white border-r border-neutral-200/80 flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* HEADER : LOGO + CLOCHE */}
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-lg shadow-sm">
              ✨
            </div>
            <div>
              <h1 className="font-serif font-bold text-lg text-neutral-900 leading-tight">
                Aesthetics
              </h1>
              <p className="text-xs text-neutral-400 font-medium">
                Espace Formateur
              </p>
            </div>
          </div>

          {/* CLOCHE NOTIFICATION */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-pink-600 transition-all relative cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-pink-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* DÉROULANT DES NOTIFICATIONS */}
            {showNotifications && (
              <div className="absolute left-10 top-0 w-80 bg-white rounded-2xl shadow-xl border border-neutral-100 p-4 z-50">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <h3 className="font-semibold text-sm text-neutral-800">
                    Notifications
                  </h3>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="cursor-pointer"
                  >
                    <X className="w-4 h-4 text-neutral-400 hover:text-neutral-600" />
                  </button>
                </div>

                {/* ONGLETS CHAT / DEVOIRS */}
                <div className="flex bg-neutral-100 p-1 rounded-xl my-3 text-xs font-medium">
                  <button
                    onClick={() => setNotifTab("chat")}
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                      notifTab === "chat"
                        ? "bg-white text-pink-600 shadow-sm font-semibold"
                        : "text-neutral-500"
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Chat ({chatNotifs.length})</span>
                  </button>
                  <button
                    onClick={() => setNotifTab("homework")}
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                      notifTab === "homework"
                        ? "bg-white text-pink-600 shadow-sm font-semibold"
                        : "text-neutral-500"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Devoirs ({homeworkNotifs.length})</span>
                  </button>
                </div>

                {/* TOUT EFFACER */}
                {notifications.length > 0 && (
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={handleClearAll}
                      className="text-[11px] text-neutral-400 hover:text-red-500 flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Tout effacer</span>
                    </button>
                  </div>
                )}

                {/* LISTE DES NOTIFICATIONS */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {notifTab === "chat" && (
                    <>
                      {chatNotifs.length === 0 ? (
                        <p className="text-xs text-neutral-400 text-center py-6">
                          Aucun nouveau message
                        </p>
                      ) : (
                        chatNotifs.map((item) => (
                          <div
                            key={item._id}
                            onClick={() =>
                              handleNotificationClick(item, "messages")
                            }
                            className={`group p-2.5 rounded-xl transition-all border flex justify-between items-start cursor-pointer ${
                              item.isRead
                                ? "bg-gray-50/50 border-gray-100 opacity-70"
                                : "bg-pink-50/50 hover:bg-pink-50 border-pink-100/50"
                            }`}
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="text-xs font-semibold text-neutral-800">
                                {item.title}
                              </p>
                              <p className="text-xs text-neutral-500 truncate">
                                {item.message}
                              </p>
                            </div>
                            <button
                              onClick={(e) => handleDeleteOne(e, item._id)}
                              className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-red-500 transition-all p-1 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {notifTab === "homework" && (
                    <>
                      {homeworkNotifs.length === 0 ? (
                        <p className="text-xs text-neutral-400 text-center py-6">
                          Aucun devoir en attente
                        </p>
                      ) : (
                        homeworkNotifs.map((item) => (
                          <div
                            key={item._id}
                            onClick={() =>
                              handleNotificationClick(item, "homeworks")
                            }
                            className={`group p-2.5 rounded-xl transition-all border flex justify-between items-start cursor-pointer ${
                              item.isRead
                                ? "bg-gray-50/50 border-gray-100 opacity-70"
                                : "bg-amber-50/50 hover:bg-amber-50 border-amber-100/50"
                            }`}
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="text-xs font-semibold text-neutral-800">
                                {item.title}
                              </p>
                              <p className="text-xs text-neutral-500 truncate">
                                {item.message}
                              </p>
                            </div>
                            <button
                              onClick={(e) => handleDeleteOne(e, item._id)}
                              className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-red-500 transition-all p-1 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PROFIL */}
        <div className="p-4 mx-3 my-3 bg-neutral-50/80 rounded-2xl border border-neutral-100 flex items-center space-x-3">
          <div className="relative shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user?.nom || "Formateur"}
                className="w-11 h-11 rounded-full object-cover border-2 border-pink-500 shadow-sm"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-pink-500 text-white font-bold flex items-center justify-center text-base border-2 border-pink-200 shadow-sm">
                {user?.nom ? user.nom.charAt(0).toUpperCase() : "A"}
              </div>
            )}
            <span className="w-3 h-3 bg-emerald-500 border-2 border-white rounded-full absolute bottom-0 right-0"></span>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-neutral-800 truncate">
              {user?.nom || "Formateur"}
            </h2>
            <p className="text-xs text-neutral-400 truncate">Formateur Agréé</p>
          </div>
        </div>

        {/* MENU NAVIGATION */}
        <nav className="px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-pink-50 text-pink-700 font-semibold shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100/60"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? "text-pink-600" : "text-neutral-500"
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* DÉCONNEXION */}
      <div className="p-4 border-t border-neutral-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};

export default TeacherSidebar;
