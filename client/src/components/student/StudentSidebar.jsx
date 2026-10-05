import React, { useState, useEffect } from "react";
import axios from "axios";

const navItems = [
  { id: "overview", label: "Vue d'ensemble", icon: "📐" },
  { id: "courses", label: "Mes Cours", icon: "📖" },
  { id: "homeworks", label: "Mes Devoirs", icon: "📝" },
  { id: "corrections", label: "Corrections & Notes", icon: "✍️" },
  { id: "certificates", label: "Mes Certificats", icon: "📜" },
  { id: "chat", label: "Questions & Chat", icon: "💬" },
  { id: "profile", label: "Mon Profil", icon: "👤" },
];

// 🟢 Onglets autorisés pour éviter tout écran blanc au clic
const VALID_TABS = [
  "overview",
  "courses",
  "homeworks",
  "corrections",
  "certificates",
  "chat",
  "profile",
];

const StudentSidebar = ({
  activeTab,
  setActiveTab,
  studentInfo,
  notificationsData = [],
}) => {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const user = studentInfo || storedUser;

  const firstName = user.firstName || user.name?.split(" ")[0] || "";
  const lastName = user.lastName || user.name?.split(" ")[1] || "";
  const fullName = `${firstName} ${lastName}`.trim() || user.email || "Élève";
  const initial = firstName ? firstName[0].toUpperCase() : "É";

  const avatarUrl = user.avatarUrl || user.avatar;
  const resolvedAvatar = avatarUrl
    ? avatarUrl.startsWith("http")
      ? avatarUrl
      : `http://localhost:5000${avatarUrl}`
    : null;

  // --- GESTION DYNAMIQUE DES NOTIFICATIONS ---
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(notificationsData);

  // 🟢 Récupération dynamique depuis l'API Backend au chargement
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await axios.get("http://localhost:5000/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Formatage sécurisé des données BDD pour l'affichage Frontend
      const formatted = res.data.map((n) => {
        let resolvedTab = n.targetTab;
        if (!VALID_TABS.includes(resolvedTab)) {
          const type = n.type?.toUpperCase() || "";
          if (type === "COURSE") resolvedTab = "courses";
          else if (type === "HOMEWORK") resolvedTab = "homeworks";
          else if (type === "CORRECTION") resolvedTab = "corrections";
          else if (type === "CHAT") resolvedTab = "chat";
          else if (type === "CERTIFICATE") resolvedTab = "certificates";
          else resolvedTab = "overview";
        }

        return {
          id: n._id,
          title: n.title,
          message: n.message,
          read: n.isRead ?? n.read ?? false, // 💡 Corrigé : Récupère isRead du schéma Mongoose
          targetTab: resolvedTab,
          icon:
            n.type === "CHAT"
              ? "💬"
              : n.type === "CORRECTION" || n.type === "GRADE"
                ? "✍️"
                : n.type === "COURSE"
                  ? "📖"
                  : n.type === "HOMEWORK"
                    ? "📝"
                    : n.type === "CERTIFICATE"
                      ? "🎓"
                      : "🔔",
          time: new Date(n.createdAt).toLocaleDateString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
      });

      setNotifications(formatted);
    } catch (err) {
      console.error("Erreur chargement notifications élève:", err);
    }
  };

  useEffect(() => {
    if (notificationsData && notificationsData.length > 0) {
      setNotifications(notificationsData);
    } else {
      fetchNotifications();
    }
  }, [notificationsData]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // 🟢 MARQUER UNE NOTIFICATION COMME LUE EN BDD ET REDIRIGER SANS ÉCRAN BLANC
  const handleNotificationClick = async (notif) => {
    // 1. Mise à jour visuelle immédiate
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
    );

    // 2. Envoi de la requête au backend
    if (notif.id && !notif.id.includes("-")) {
      try {
        const token = localStorage.getItem("token");
        await axios.patch(
          `http://localhost:5000/api/notifications/${notif.id}/read`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } catch (err) {
        console.error("Erreur lors de la mise à jour de la notification:", err);
      }
    }

    // 3. Navigation sécurisée vers l'onglet cible
    const tabToSet = VALID_TABS.includes(notif.targetTab)
      ? notif.targetTab
      : "overview";
    setActiveTab(tabToSet);
    setShowNotifications(false);
  };

  // 🟢 TOUT MARQUER COMME LU EN BDD
  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        "http://localhost:5000/api/notifications/read-all",
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (err) {
      console.error("Erreur lors de la lecture globale:", err);
    }
  };

  // 🔴 SUPPRIMER UNE NOTIFICATION INDIVIDUELLE
  const deleteNotification = async (e, id) => {
    e.stopPropagation(); // Empêche de déclencher handleNotificationClick

    setNotifications((prev) => prev.filter((n) => n.id !== id));

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Erreur lors de la suppression de la notification:", err);
    }
  };

  // 🔴 SUPPRIMER TOUTES LES NOTIFICATIONS
  const deleteAllNotifications = async () => {
    if (
      !window.confirm("Voulez-vous vraiment effacer toutes les notifications ?")
    )
      return;

    setNotifications([]);

    try {
      const token = localStorage.getItem("token");
      await axios.delete("http://localhost:5000/api/notifications/clear-all", {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Erreur lors de la suppression globale:", err);
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-neutral-100 flex flex-col justify-between p-5 shrink-0 shadow-xs relative">
      <div className="space-y-5">
        {/* Logo */}
        <div className="flex items-center space-x-3 px-2">
          <div className="w-10 h-10 rounded-2xl bg-pink-100 flex items-center justify-center text-xl">
            ✨
          </div>
          <div>
            <h1 className="font-serif font-bold text-lg text-neutral-900 leading-tight">
              Aesthetics
            </h1>
            <p className="text-xs text-neutral-400 font-medium">Espace Élève</p>
          </div>
        </div>

        {/* Info profil */}
        <div className="bg-[#fcf8f5] p-3 rounded-2xl border border-[#f3e6dc] flex items-center space-x-3 overflow-hidden">
          {resolvedAvatar ? (
            <img
              src={resolvedAvatar}
              alt={fullName}
              className="w-10 h-10 rounded-full object-cover border border-[#d97736]/20 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#d97736] text-white flex items-center justify-center font-bold text-sm shrink-0">
              {initial}
            </div>
          )}

          <div className="overflow-hidden">
            <p
              className="text-xs font-bold text-neutral-800 truncate"
              title={fullName}
            >
              {fullName}
            </p>
            <span className="text-[11px] text-[#d97736] font-medium block truncate">
              Élève Inscrite 🌸
            </span>
          </div>
        </div>

        {/* Section Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-semibold bg-neutral-50 hover:bg-neutral-100 text-neutral-700 transition cursor-pointer border border-neutral-100"
          >
            <div className="flex items-center space-x-2.5">
              <span className="text-base">🔔</span>
              <span>Notifications</span>
            </div>
            {unreadCount > 0 ? (
              <span className="bg-[#d97736] text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                {unreadCount}
              </span>
            ) : (
              <span className="text-neutral-400 text-[10px]">0</span>
            )}
          </button>

          {/* Menu déroulant des notifications */}
          {showNotifications && (
            <div className="absolute left-0 top-12 w-80 bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <div className="flex items-center space-x-1.5">
                  <h4 className="text-xs font-bold text-neutral-900">
                    Notifications
                  </h4>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-[#d97736]/10 text-[#d97736] font-bold px-1.5 py-0.5 rounded-md">
                      {unreadCount}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[10px] text-[#d97736] hover:underline cursor-pointer font-medium"
                    >
                      Tout lire
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={deleteAllNotifications}
                      className="text-[10px] text-red-500 hover:underline cursor-pointer font-medium"
                      title="Effacer toutes les notifications"
                    >
                      Effacer tout
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center py-4">
                    Aucune notification pour le moment.
                  </p>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-2.5 rounded-xl text-left transition cursor-pointer border relative group ${
                        notif.read
                          ? "bg-white border-neutral-100 text-neutral-600 hover:bg-neutral-50"
                          : "bg-[#fcf8f5] border-[#f3e6dc] text-neutral-900 font-medium hover:bg-[#f9f0ea]"
                      }`}
                    >
                      <div className="flex items-start space-x-2.5">
                        <span className="text-sm shrink-0 mt-0.5">
                          {notif.icon}
                        </span>
                        <div className="flex-1 overflow-hidden pr-4">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-neutral-800 truncate">
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#d97736] shrink-0"></span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-500 line-clamp-2 mt-0.5 leading-snug">
                            {notif.message}
                          </p>
                          <span className="text-[9px] text-neutral-400 mt-1 block">
                            {notif.time}
                          </span>
                        </div>

                        {/* 🔴 BOUTON SUPPRIMER UNE NOTIFICATION */}
                        <button
                          onClick={(e) => deleteNotification(e, notif.id)}
                          className="absolute top-2 right-2 text-neutral-400 hover:text-red-500 text-xs p-1 rounded-full hover:bg-neutral-100 transition opacity-60 hover:opacity-100"
                          title="Supprimer cette notification"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation principale */}
        <nav className="space-y-1.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === item.id
                  ? "bg-[#fcf0ea] text-[#d97736] shadow-xs"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <button
        onClick={() => {
          localStorage.clear();
          window.location.href = "/login";
        }}
        className="w-full flex items-center space-x-3 px-4 py-3 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-2xl transition cursor-pointer"
      >
        <span className="text-base">🚪</span>
        <span>Déconnexion</span>
      </button>
    </aside>
  );
};

export default StudentSidebar;
