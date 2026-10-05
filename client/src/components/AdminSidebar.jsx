import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Bell, MessageCircle, FileText, X, Trash2 } from "lucide-react";

const AdminSidebar = ({ activeTab, setActiveTab, user }) => {
  // 1. Récupération des informations utilisateur si non fournies en prop
  const currentUser = user || JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = currentUser?.role || "admin";

  // 2. États pour le menu de notifications
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifTab, setNotifTab] = useState("chat"); // 'chat' ou 'homework'

  // Listes des notifications (Chat et Devoirs)
  const [unreadMessages, setUnreadMessages] = useState([]);
  const [pendingHomeworks, setPendingHomeworks] = useState([]);

  const notifRef = useRef(null);

  // Fermer le menu déroulant si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. Charger les notifications depuis le backend (Polling toutes les 10s)
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const [chatRes, homeworkRes] = await Promise.all([
          axios
            .get("http://localhost:5000/api/chat/unread", config)
            .catch(() => null),
          axios
            .get("http://localhost:5000/api/submissions/pending", config)
            .catch(() => null),
        ]);

        if (chatRes?.data && Array.isArray(chatRes.data)) {
          setUnreadMessages(chatRes.data);
        }
        if (homeworkRes?.data && Array.isArray(homeworkRes.data)) {
          setPendingHomeworks(homeworkRes.data);
        }
      } catch (err) {
        console.error("Erreur chargement des notifications Admin", err);
      }
    };

    fetchNotifications();

    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  // 🗑️ Vider toutes les notifications de l'onglet actif
  const handleClearAll = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        if (notifTab === "chat") {
          await axios
            .delete("http://localhost:5000/api/chat/read-all", config)
            .catch(() => null);
          setUnreadMessages([]);
        } else {
          await axios
            .delete(
              "http://localhost:5000/api/submissions/clear-notifications",
              config,
            )
            .catch(() => null);
          setPendingHomeworks([]);
        }
      } else {
        if (notifTab === "chat") setUnreadMessages([]);
        else setPendingHomeworks([]);
      }
    } catch (err) {
      if (notifTab === "chat") setUnreadMessages([]);
      else setPendingHomeworks([]);
    }
  };

  // 🗑️ Supprimer une notification unique
  const handleDeleteOne = (e, id, type) => {
    e.stopPropagation();
    if (type === "chat") {
      setUnreadMessages((prev) =>
        prev.filter((item) => (item.id || item._id) !== id),
      );
    } else {
      setPendingHomeworks((prev) =>
        prev.filter((item) => (item.id || item._id) !== id),
      );
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  const getSenderName = (item) => {
    if (typeof item.sender === "object" && item.sender !== null) {
      return (
        item.sender.nom || item.sender.name || item.sender.email || "Élève"
      );
    }
    return item.sender || "Élève";
  };

  const totalNotifs = unreadMessages.length + pendingHomeworks.length;

  // 4. Liste complète des onglets de navigation
  const allMenuItems = [
    {
      id: "overview",
      label: "Vue d’ensemble",
      icon: "📊",
      roles: ["admin", "formateur"],
    },
    {
      id: "students",
      label: "Gestion des Élèves",
      icon: "👥",
      roles: ["admin"],
    },
    {
      id: "teachers",
      label: "Gestion Formateurs",
      icon: "🎓",
      roles: ["admin"],
    },
    {
      id: "certificates",
      label: "Validation Certificats",
      icon: "📜",
      roles: ["admin"],
    },
    {
      id: "courses",
      label: "Gestion des Cours",
      icon: "📚",
      roles: ["admin", "formateur"],
    },
    {
      id: "homework",
      label: "Espace Devoirs",
      icon: "📝",
      roles: ["admin", "formateur"],
    },
    {
      id: "corrections",
      label: "Correction des Devoirs",
      icon: "✔️",
      roles: ["admin", "formateur"],
    },
    {
      id: "messages",
      label: "Questions & Chat",
      icon: "💬",
      roles: ["admin", "formateur"],
    },
    {
      id: "analytics",
      label: "Analytiques",
      icon: "📈",
      roles: ["admin"],
    },
    {
      id: "settings",
      label: "Configuration",
      icon: "⚙️",
      roles: ["admin"],
    },
  ];

  // Filtrage selon le rôle
  const menuItems = allMenuItems.filter((item) =>
    item.roles.includes(userRole),
  );

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen flex flex-col justify-between border-r border-gray-800 sticky top-0">
      <div className="p-6">
        {/* HEADER : Titre + Cloche de notification */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-pink-500 tracking-wide flex items-center gap-2">
              💅 Onglerie Admin
            </h2>
            <p className="text-xs text-gray-400 mt-1 capitalize">
              Espace {userRole === "admin" ? "Administrateur" : "Formateur"}
            </p>
          </div>

          {/* 🔔 BOUTON CLOCHE NOTIFICATION */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-pink-500 transition-all relative"
            >
              <Bell className="w-5 h-5" />
              {totalNotifs > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-pink-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {totalNotifs}
                </span>
              )}
            </button>

            {/* 📥 PANNEAU DÉROULANT DES NOTIFICATIONS */}
            {showNotifications && (
              <div className="absolute left-10 top-0 w-80 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-4 z-50 text-white">
                <div className="flex items-center justify-between pb-3 border-b border-gray-700">
                  <h3 className="font-semibold text-sm text-gray-200">
                    Notifications
                  </h3>
                  <button onClick={() => setShowNotifications(false)}>
                    <X className="w-4 h-4 text-gray-400 hover:text-white" />
                  </button>
                </div>

                {/* ONGLETS : CHAT / DEVOIRS */}
                <div className="flex bg-gray-900 p-1 rounded-xl my-3 text-xs font-medium">
                  <button
                    onClick={() => setNotifTab("chat")}
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1 transition-all ${
                      notifTab === "chat"
                        ? "bg-pink-600 text-white font-semibold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Chat ({unreadMessages.length})</span>
                  </button>
                  <button
                    onClick={() => setNotifTab("homework")}
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1 transition-all ${
                      notifTab === "homework"
                        ? "bg-pink-600 text-white font-semibold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Devoirs ({pendingHomeworks.length})</span>
                  </button>
                </div>

                {/* 🗑️ EFFACER TOUT */}
                {((notifTab === "chat" && unreadMessages.length > 0) ||
                  (notifTab === "homework" && pendingHomeworks.length > 0)) && (
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={handleClearAll}
                      className="text-[11px] text-gray-400 hover:text-red-400 flex items-center space-x-1 transition-colors"
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
                      {unreadMessages.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-6">
                          Aucun nouveau message
                        </p>
                      ) : (
                        unreadMessages.map((item) => (
                          <div
                            key={item.id || item._id}
                            onClick={() => {
                              setActiveTab("messages");
                              setShowNotifications(false);
                            }}
                            className="group p-2.5 rounded-xl bg-gray-900/80 hover:bg-gray-700/80 cursor-pointer transition-all border border-gray-700/60 flex justify-between items-start"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="text-xs font-semibold text-pink-400">
                                {getSenderName(item)}
                              </p>
                              <p className="text-xs text-gray-300 truncate">
                                {item.text || "Nouveau message"}
                              </p>
                            </div>
                            <button
                              onClick={(e) =>
                                handleDeleteOne(e, item.id || item._id, "chat")
                              }
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all p-1"
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
                      {pendingHomeworks.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-6">
                          Aucun devoir en attente
                        </p>
                      ) : (
                        pendingHomeworks.map((item) => (
                          <div
                            key={item.id || item._id}
                            onClick={() => {
                              setActiveTab("corrections");
                              setShowNotifications(false);
                            }}
                            className="group p-2.5 rounded-xl bg-gray-900/80 hover:bg-gray-700/80 cursor-pointer transition-all border border-gray-700/60 flex justify-between items-start"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="text-xs font-semibold text-amber-400">
                                {item.student?.nom || item.student || "Élève"}
                              </p>
                              <p className="text-xs text-gray-300 truncate">
                                {item.title ||
                                  item.homeworkTitle ||
                                  "Devoir soumis"}
                              </p>
                            </div>
                            <button
                              onClick={(e) =>
                                handleDeleteOne(
                                  e,
                                  item.id || item._id,
                                  "homework",
                                )
                              }
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all p-1"
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

        {/* MENU DE NAVIGATION */}
        <nav className="mt-8 space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? "bg-pink-600 text-white font-semibold"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* BOUTON DE DÉCONNEXION */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-red-900/40 hover:text-red-400 text-gray-300 rounded-xl text-sm font-medium transition-all"
        >
          🚪 Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
