import React, { useState } from "react";
import axios from "axios";

const getToken = () => {
  let token = localStorage.getItem("token");
  if (token) return token;
  try {
    const userObj = JSON.parse(
      localStorage.getItem("user") || localStorage.getItem("userInfo") || "{}",
    );
    if (userObj?.token) return userObj.token;
  } catch (e) {}
  return null;
};

const ProfileTab = ({ studentInfo }) => {
  // Récupération des données utilisateur
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const user = studentInfo || storedUser;

  // États pour les informations de profil
  const [formData, setFormData] = useState({
    firstName: user.firstName || user.name?.split(" ")[0] || "",
    lastName: user.lastName || user.name?.split(" ")[1] || "",
    email: user.email || "",
    phone: user.phone || "",
  });

  // États pour la photo de profil
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // États pour la modification du mot de passe
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // États pour les notifications
  const [notifications, setNotifications] = useState({
    emailOnGraded: true,
    emailOnNewCourse: true,
    emailOnChatReply: false,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Traitement de l'URL initiale de l'avatar
  const avatarUrl = user.avatarUrl || user.avatar;
  const initialAvatar = avatarUrl
    ? avatarUrl.startsWith("http")
      ? avatarUrl
      : `http://localhost:5000${avatarUrl}`
    : null;

  // Gestion des changements de texte
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  // Gestion du choix de la photo de profil
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // Soumission des informations de profil + photo
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const token = getToken();
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      };

      const data = new FormData();
      data.append("firstName", formData.firstName);
      data.append("lastName", formData.lastName);
      data.append("phone", formData.phone);
      if (avatarFile) {
        data.append("avatar", avatarFile);
      }

      const res = await axios.put(
        "http://localhost:5000/api/users/profile",
        data,
        config,
      );

      // Mettre à jour le localStorage si la réponse contient les nouvelles infos
      if (res.data) {
        const updatedUser = { ...storedUser, ...res.data.user };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      setMessage({
        type: "success",
        text: "Profil mis à jour avec succès !",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err.response?.data?.message ||
          "Erreur lors de la mise à jour du profil.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Soumission du changement de mot de passe
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({
        type: "error",
        text: "Les mots de passe ne correspondent pas.",
      });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const token = getToken();
      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.put(
        "http://localhost:5000/api/users/change-password",
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        },
        config,
      );

      setMessage({
        type: "success",
        text: "Mot de passe modifié avec succès !",
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err.response?.data?.message ||
          "Erreur lors de la modification du mot de passe.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-3xl">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-neutral-900">
          Mon Profil
        </h2>
        <p className="text-sm text-neutral-500">
          Gérez vos informations personnelles, votre sécurité et vos
          préférences.
        </p>
      </div>

      {/* Message de succès ou d'erreur */}
      {message.text && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
              : "bg-red-50 text-red-700 border border-red-100"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* SECTION 1 : INFORMATIONS PERSONNELLES ET PHOTO */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-6">
        <h3 className="text-base font-semibold text-neutral-800 border-b border-neutral-100 pb-3">
          Informations Générales
        </h3>

        {/* Photo de profil et upload */}
        <div className="flex items-center space-x-5">
          <div className="relative">
            {avatarPreview || initialAvatar ? (
              <img
                src={avatarPreview || initialAvatar}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-[#d97736]"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#d97736] text-white flex items-center justify-center font-bold text-2xl">
                {formData.firstName ? formData.firstName[0].toUpperCase() : "É"}
              </div>
            )}

            {/* Bouton pour changer la photo */}
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 bg-[#d97736] hover:bg-[#c2652a] text-white p-1.5 rounded-full cursor-pointer shadow-md transition"
              title="Changer la photo"
            >
              📷
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div>
            <h4 className="font-semibold text-neutral-800 text-sm">
              {formData.firstName} {formData.lastName}
            </h4>
            <span className="text-xs text-[#d97736] font-medium block mt-0.5">
              Élève Inscrite 🌸
            </span>
            <p className="text-[11px] text-neutral-400 mt-1">
              Format recommandé : JPG, PNG (max 2 Mo)
            </p>
          </div>
        </div>

        {/* Formulaire profil */}
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Prénom
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-800 focus:outline-none focus:border-[#d97736]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Nom
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-800 focus:outline-none focus:border-[#d97736]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Adresse Email (non modifiable)
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-400 bg-neutral-50 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Téléphone
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Ex: +33 6 12 34 56 78"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-800 focus:outline-none focus:border-[#d97736]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#d97736] hover:bg-[#c2652a] text-white text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              {loading ? "Mise à jour..." : "Sauvegarder le profil 💾"}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2 : SÉCURITÉ ET MOT DE PASSE */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-4">
        <h3 className="text-base font-semibold text-neutral-800 border-b border-neutral-100 pb-3">
          Sécurité & Mot de passe
        </h3>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">
              Mot de passe actuel
            </label>
            <input
              type="password"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-800 focus:outline-none focus:border-[#d97736]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-800 focus:outline-none focus:border-[#d97736]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Confirmer le nouveau mot de passe
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-800 focus:outline-none focus:border-[#d97736]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-900 text-white text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Changer le mot de passe 🔒
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 3 : PRÉFÉRENCES DE NOTIFICATION */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-4">
        <h3 className="text-base font-semibold text-neutral-800 border-b border-neutral-100 pb-3">
          Préférences des notifications
        </h3>

        <div className="space-y-3">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.emailOnGraded}
              onChange={(e) =>
                setNotifications({
                  ...notifications,
                  emailOnGraded: e.target.checked,
                })
              }
              className="w-4 h-4 accent-[#d97736] rounded"
            />
            <span className="text-xs text-neutral-700">
              Recevoir un email lorsqu'un devoir est corrigé avec une note
            </span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.emailOnNewCourse}
              onChange={(e) =>
                setNotifications({
                  ...notifications,
                  emailOnNewCourse: e.target.checked,
                })
              }
              className="w-4 h-4 accent-[#d97736] rounded"
            />
            <span className="text-xs text-neutral-700">
              Recevoir un email lors de la publication d'un nouveau cours
            </span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.emailOnChatReply}
              onChange={(e) =>
                setNotifications({
                  ...notifications,
                  emailOnChatReply: e.target.checked,
                })
              }
              className="w-4 h-4 accent-[#d97736] rounded"
            />
            <span className="text-xs text-neutral-700">
              Recevoir un email lorsqu'un formateur me répond dans le chat
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;
