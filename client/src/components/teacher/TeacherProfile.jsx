import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Camera,
  User,
  Mail,
  Phone,
  Lock,
  Save,
  CheckCircle,
  AlertCircle,
  Award,
  BookOpen,
  Users,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

const TeacherProfile = ({ user: initialUser, onUserUpdate }) => {
  // Récupération dynamique de l'utilisateur (prop ou localStorage)
  const localUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUser = initialUser || localUser;

  // 0. États des statistiques dynamiques
  const [stats, setStats] = useState({
    publishedCourses: 0,
    activeStudents: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // 1. États du formulaire profil
  const [formData, setFormData] = useState({
    nom: currentUser?.nom || currentUser?.name || "",
    email: currentUser?.email || "",
    telephone: currentUser?.telephone || currentUser?.phone || "",
    specialite: currentUser?.specialite || "Onglerie & Soins",
    bio: currentUser?.bio || "",
  });

  // 2. États du formulaire mot de passe
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // 3. Gestion de l'avatar et prévisualisation
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(() => {
    if (currentUser?.avatar) {
      return currentUser.avatar.startsWith("http")
        ? currentUser.avatar
        : `http://localhost:5000/${currentUser.avatar}`;
    }
    return null;
  });

  // 4. États de feedback & chargement
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // 🔄 Charger les statistiques réelles depuis le Backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          "http://localhost:5000/api/teacher/dashboard-stats",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setStats({
          publishedCourses: res.data.publishedCourses || 0,
          activeStudents: res.data.activeStudents || 0,
        });
      } catch (err) {
        console.error("Erreur lors de la récupération des statistiques :", err);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Synchro des champs si la prop 'user' change
  useEffect(() => {
    if (initialUser) {
      setFormData({
        nom: initialUser.nom || initialUser.name || "",
        email: initialUser.email || "",
        telephone: initialUser.telephone || initialUser.phone || "",
        specialite: initialUser.specialite || "Onglerie & Soins",
        bio: initialUser.bio || "",
      });
      if (initialUser.avatar) {
        setPreviewUrl(
          initialUser.avatar.startsWith("http")
            ? initialUser.avatar
            : `http://localhost:5000/${initialUser.avatar}`,
        );
      }
    }
  }, [initialUser]);

  // Prévisualiser l'image choisie
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Enregistrer le profil (Infos + Photo)
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const token = localStorage.getItem("token");
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      };

      const data = new FormData();
      data.append("nom", formData.nom);
      data.append("email", formData.email);
      data.append("telephone", formData.telephone);
      data.append("specialite", formData.specialite);
      data.append("bio", formData.bio);

      if (selectedFile) {
        data.append("avatar", selectedFile);
      }

      const res = await axios.put(
        "http://localhost:5000/api/users/profile",
        data,
        config,
      );

      const updatedUserData = res.data.user || res.data.data || res.data;
      const updatedUser = { ...currentUser, ...updatedUserData };

      localStorage.setItem("user", JSON.stringify(updatedUser));
      if (onUserUpdate) onUserUpdate(updatedUser);

      setMessage({
        type: "success",
        text: "Votre profil a été mis à jour avec succès !",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Erreur lors de la mise à jour.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Changer le mot de passe
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (passwords.newPassword !== passwords.confirmPassword) {
      return setMessage({
        type: "error",
        text: "Les nouveaux mots de passe ne correspondent pas.",
      });
    }

    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.put(
        "http://localhost:5000/api/users/change-password",
        {
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        },
        config,
      );

      setMessage({
        type: "success",
        text: "Mot de passe modifié avec succès !",
      });
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err.response?.data?.message ||
          "Impossible de modifier le mot de passe.",
      });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* 🟢 EN-TÊTE PAGE */}
      <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
        <div>
          <h1 className="text-xl font-serif font-bold text-neutral-900">
            Mon Profil Formateur
          </h1>
          <p className="text-xs text-neutral-400">
            Gérez vos informations personnelles et votre sécurité.
          </p>
        </div>
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-pink-50 text-pink-700 text-xs font-semibold rounded-full border border-pink-100">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Formateur Agréé</span>
        </span>
      </div>

      {/* 🔔 MESSAGE D'ALERTE */}
      {message.text && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center space-x-2 transition-all ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* 📊 STATISTIQUES DYNAMIQUES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Carte Cours Publiés */}
        <div className="p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 bg-pink-50 text-pink-600 rounded-xl">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-neutral-400 font-medium">
              Cours publiés
            </p>
            <p className="text-base font-bold text-neutral-800">
              {statsLoading ? "..." : `${stats.publishedCourses} Module(s)`}
            </p>
          </div>
        </div>

        {/* Carte Élèves Suivis */}
        <div className="p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-neutral-400 font-medium">
              Élèves suivis
            </p>
            <p className="text-base font-bold text-neutral-800">
              {statsLoading ? "..." : `${stats.activeStudents} Apprenantes`}
            </p>
          </div>
        </div>

        {/* Carte Spécialité */}
        <div className="p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-neutral-400 font-medium">
              Spécialité
            </p>
            <p className="text-base font-bold text-neutral-800 truncate">
              {formData.specialite}
            </p>
          </div>
        </div>
      </div>

      {/* 🟢 BLOC 1 : PHOTO DE PROFIL & INFOS PERSONNELLES */}
      <form onSubmit={handleProfileSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center space-x-2">
            <User className="w-4 h-4 text-pink-600" />
            <span>Informations Personnelles</span>
          </h3>

          {/* CHANGER LA PHOTO */}
          <div className="flex items-center space-x-5 pb-5 border-b border-neutral-100">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-pink-200 bg-pink-500 text-white font-bold text-2xl flex items-center justify-center shadow-sm">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Photo de profil"
                    className="w-full h-full object-cover"
                    onError={() => setPreviewUrl(null)}
                  />
                ) : (
                  <span>
                    {formData.nom ? formData.nom.charAt(0).toUpperCase() : "A"}
                  </span>
                )}
              </div>

              {/* Bouton pour uploader */}
              <label
                htmlFor="avatarUpload"
                className="absolute bottom-0 right-0 bg-pink-600 hover:bg-pink-700 text-white p-1.5 rounded-full cursor-pointer shadow-md transition-all"
                title="Changer la photo"
              >
                <Camera className="w-3.5 h-3.5" />
                <input
                  id="avatarUpload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <h4 className="text-xs font-bold text-neutral-800">
                Photo de profil
              </h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Format recommandé : JPG ou PNG. Maximum 5 Mo.
              </p>
            </div>
          </div>

          {/* CHAMPS FORMULAIRE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-500 block font-medium mb-1">
                Nom complet
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) =>
                    setFormData({ ...formData, nom: e.target.value })
                  }
                  className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-800 focus:bg-white focus:border-pink-500 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-neutral-500 block font-medium mb-1">
                Adresse Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-800 focus:bg-white focus:border-pink-500 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-neutral-500 block font-medium mb-1">
                Téléphone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={formData.telephone}
                  onChange={(e) =>
                    setFormData({ ...formData, telephone: e.target.value })
                  }
                  className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-800 focus:bg-white focus:border-pink-500 focus:outline-none transition-all"
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-neutral-500 block font-medium mb-1">
                Spécialité
              </label>
              <div className="relative">
                <Sparkles className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={formData.specialite}
                  onChange={(e) =>
                    setFormData({ ...formData, specialite: e.target.value })
                  }
                  className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-800 focus:bg-white focus:border-pink-500 focus:outline-none transition-all"
                  placeholder="ex: Onglerie & Épilation"
                />
              </div>
            </div>
          </div>

          {/* BIO */}
          <div>
            <label className="text-xs text-neutral-500 block font-medium mb-1">
              Présentation / Bio
            </label>
            <textarea
              rows="3"
              value={formData.bio}
              onChange={(e) =>
                setFormData({ ...formData, bio: e.target.value })
              }
              className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 focus:bg-white focus:border-pink-500 focus:outline-none transition-all"
              placeholder="Écrivez une brève présentation pour vos élèves..."
            ></textarea>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-medium text-xs rounded-xl flex items-center space-x-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {loading
                  ? "Enregistrement..."
                  : "Enregistrer les modifications"}
              </span>
            </button>
          </div>
        </div>
      </form>

      {/* 🟢 BLOC 2 : SÉCURITÉ ET MOT DE PASSE */}
      <form onSubmit={handlePasswordSubmit}>
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center space-x-2">
            <Lock className="w-4 h-4 text-pink-600" />
            <span>Sécurité du compte</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-neutral-500 block font-medium mb-1">
                Mot de passe actuel
              </label>
              <input
                type="password"
                value={passwords.currentPassword}
                onChange={(e) =>
                  setPasswords({
                    ...passwords,
                    currentPassword: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:bg-white focus:border-pink-500 focus:outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="text-xs text-neutral-500 block font-medium mb-1">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={passwords.newPassword}
                onChange={(e) =>
                  setPasswords({ ...passwords, newPassword: e.target.value })
                }
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:bg-white focus:border-pink-500 focus:outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="text-xs text-neutral-500 block font-medium mb-1">
                Confirmer
              </label>
              <input
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) =>
                  setPasswords({
                    ...passwords,
                    confirmPassword: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:bg-white focus:border-pink-500 focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-900 text-white font-medium text-xs rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Mettre à jour le mot de passe</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TeacherProfile;
