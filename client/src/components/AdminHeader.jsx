import React, { useState, useEffect, useRef } from "react";

export default function AdminHeader({
  onNavigateTab,
  pendingHomeworksCount = 0,
  adminPhotoUrl = null,
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Date actuelle formatée en français
  const todayDate = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Fermer les menus au clic à l'extérieur
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="w-full bg-white border-b border-neutral-100 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* 1. DATE DYNAMIQUE */}
      <div className="text-sm font-medium text-neutral-500 capitalize">
        {todayDate}
      </div>

      {/* 2. ACTIONS ADMIN (NOTIFICATIONS + PROFIL) */}
      <div className="flex items-center space-x-4">
        {/* BOUTON NOTIFICATION */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 text-neutral-600 transition-colors relative cursor-pointer border border-neutral-200/50"
            title="Notifications"
          >
            <span className="text-lg">🔔</span>
            {pendingHomeworksCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse"></span>
            )}
          </button>

          {/* MENU DÉROULANT DES NOTIFICATIONS */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-neutral-100 p-4 z-50 animate-fadeIn">
              <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
                <h4 className="font-serif font-bold text-sm text-neutral-800">
                  Notifications
                </h4>
                <span className="text-[10px] bg-orange-100 text-[#d97736] font-bold px-2 py-0.5 rounded-full">
                  {pendingHomeworksCount} nouvelles
                </span>
              </div>

              <div className="py-2 space-y-2 max-h-60 overflow-y-auto">
                {pendingHomeworksCount > 0 ? (
                  <div
                    onClick={() => {
                      onNavigateTab("homework");
                      setShowNotifications(false);
                    }}
                    className="p-3 bg-orange-50/50 hover:bg-orange-50 rounded-xl cursor-pointer transition-all border border-orange-100"
                  >
                    <p className="text-xs font-bold text-neutral-800">
                      📝 Devoirs en attente !
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Vous avez {pendingHomeworksCount} devoir(s) d'élève(s) à
                      corriger.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 text-center py-4">
                    Aucune nouvelle notification
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* BOUTON PROFIL CLIQUABLE (AVATAR ORANGE / PHOTO) */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-10 h-10 rounded-xl bg-[#d97736] text-white font-bold flex items-center justify-center overflow-hidden hover:opacity-90 transition-all cursor-pointer shadow-sm border border-orange-200"
            title="Mon Profil"
          >
            {adminPhotoUrl ? (
              <img
                src={adminPhotoUrl}
                alt="Profil Admin"
                className="w-full h-full object-cover"
              />
            ) : (
              <span>A</span>
            )}
          </button>

          {/* MENU DÉROULANT DU PROFIL */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-neutral-100 p-2 z-50 animate-fadeIn">
              <div className="px-3 py-2 border-b border-neutral-100 flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#d97736] text-white font-bold flex items-center justify-center text-xs shrink-0">
                  {adminPhotoUrl ? (
                    <img
                      src={adminPhotoUrl}
                      alt="Admin"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    "A"
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-800">
                    Administrateur
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    admin@plateforme.com
                  </p>
                </div>
              </div>

              <div className="py-1 space-y-1">
                <button
                  onClick={() => {
                    onNavigateTab("settings");
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 rounded-xl transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <span>⚙️</span>
                  <span>Paramètres du compte</span>
                </button>

                <button
                  onClick={() => alert("Déconnexion...")}
                  className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-xl transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <span>🚪</span>
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
