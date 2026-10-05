import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Profil = () => {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // États du formulaire
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const [message, setMessage] = useState({ type: "", text: "" });

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const response = await fetch("http://localhost:5000/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();

        // Gestion de la récupération initiale du profil
        if (result.success && result.data) {
          setStudent(result.data);
          setNom(result.data.nom || "");
          setEmail(result.data.email || "");
          if (result.data.avatar) {
            // Si l'URL stockée est déjà complète, on l'utilise, sinon on ajoute le préfixe
            const isFullUrl = result.data.avatar.startsWith("http");
            setAvatarPreview(
              isFullUrl
                ? result.data.avatar
                : `http://localhost:5000${result.data.avatar}`,
            );
          }
        }
      } catch (error) {
        console.error("Erreur de récupération du profil :", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      // On crée un lien d'aperçu temporaire local
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setMessage({ type: "", text: "" });

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("nom", nom);
      formData.append("email", email);

      if (avatar) {
        formData.append("avatar", avatar);
      }

      if (currentPassword && newPassword) {
        formData.append("currentPassword", currentPassword);
        formData.append("password", newPassword); // Doit correspondre à 'password' attendu par ton contrôleur
      }

      const response = await fetch("http://localhost:5000/api/auth/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // 🔥 CORRECTION : Utilisation de result.user au lieu de result.data pour s'aligner sur ton contrôleur
        console.log("Données du profil reçues du serveur :", result.user);

        setMessage({
          type: "success",
          text: "Profil mis à jour avec succès ! ✨",
        });

        setStudent(result.user);

        // On met à jour l'aperçu avec la nouvelle URL serveur retournée
        if (result.user && result.user.avatar) {
          const isFullUrl = result.user.avatar.startsWith("http");
          const finalUrl = isFullUrl
            ? result.user.avatar
            : `http://localhost:5000${result.user.avatar}`;
          setAvatarPreview(`${finalUrl}?t=${new Date().getTime()}`); // Ajout du timestamp anti-cache
        }

        localStorage.setItem("user", JSON.stringify(result.user));
        window.dispatchEvent(new Event("profileUpdated"));
        setCurrentPassword("");
        setNewPassword("");
      } else {
        setMessage({
          type: "error",
          text: result.message || "Une erreur est survenue.",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour :", error);
      setMessage({
        type: "error",
        text: "Erreur de connexion avec le serveur.",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-pink-500 font-bold text-lg animate-pulse">
          Chargement de votre profil... 💅
        </p>
      </div>
    );
  }

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
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 font-semibold text-sm transition-all text-left"
            >
              📖 Mes Cours
            </button>
            <button
              onClick={() => navigate("/devoirs")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 font-semibold text-sm transition-all text-left"
            >
              📝 Mes Pratiques
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-pink-600 text-white font-semibold text-sm transition-all shadow-md shadow-pink-600/20 text-left">
              👤 Mon Profil
            </button>
          </nav>
        </div>

        <div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 font-semibold text-sm transition-all text-left"
          >
            🚪 Déconnexion
          </button>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <header className="mb-10">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Mon Espace Profil 👤
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-1">
            Personnalisez votre compte et sécurisez vos accès
          </p>
        </header>

        <div className="max-w-3xl bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          {message.text && (
            <div
              className={`p-4 rounded-2xl mb-6 text-sm font-semibold ${
                message.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-8">
            {/* Gestion de l'Avatar */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
              <div className="relative w-24 h-24 rounded-full border-4 border-pink-100 overflow-hidden bg-slate-50 shrink-0">
                <img
                  src={
                    avatarPreview && avatarPreview.trim() !== ""
                      ? avatarPreview.startsWith("blob:") ||
                        avatarPreview.startsWith("data:")
                        ? avatarPreview // Aperçu temporaire local
                        : `${avatarPreview}${avatarPreview.includes("?") ? "&" : "?"}t=${new Date().getTime()}` // Évite le cache du navigateur
                      : "https://picsum.photos/150"
                  }
                  alt="Avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div className="space-y-2 text-center sm:text-left">
                <h3 className="text-sm font-bold text-slate-800">
                  Votre Photo de Profil
                </h3>
                <p className="text-xs text-gray-400">
                  Pour un espace de formation plus humain et interactif.
                </p>
                <label className="inline-block mt-2 px-4 py-2 bg-pink-50 text-pink-600 hover:bg-pink-100 text-xs font-bold rounded-xl cursor-pointer transition-all">
                  Choisir une image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Infos Générales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">
                  Nom Complet
                </label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-pink-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">
                  Adresse Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-pink-500 transition-all"
                />
              </div>
            </div>

            {/* Changement de Mot de passe */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h3 className="text-sm font-bold text-slate-800">
                🔒 Sécurité (Optionnel)
              </h3>
              <p className="text-[11px] text-gray-400">
                Remplissez ces champs uniquement si vous désirez changer votre
                mot de passe.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">
                    Mot de passe actuel
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-pink-500 transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-pink-500 transition-all"
                    placeholder="Min. 6 caractères"
                  />
                </div>
              </div>
            </div>

            {/* Bouton de soumission */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={updating}
                className="px-6 py-3.5 bg-[#1E2530] hover:bg-[#2e3745] disabled:bg-gray-400 text-white rounded-2xl text-xs font-bold transition-all shadow-md"
              >
                {updating
                  ? "Enregistrement..."
                  : "Sauvegarder les modifications 💾"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Profil;
