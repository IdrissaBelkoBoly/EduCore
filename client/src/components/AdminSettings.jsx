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

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState("profile");

  // États Profil
  const [profile, setProfile] = useState({
    nom: "",
    email: "",
    telephone: "",
    avatar: "",
    currentPassword: "",
    newPassword: "",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // États Configuration Générale & Paiements
  const [config, setConfig] = useState({
    defaultCoursePrice: 1000,
    defaultPaymentDeadlineDays: 30,
    allowSelfRegistration: true,
    bankInfo: "",
  });

  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Helper pour formater l'URL de l'avatar
  const formatAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    return avatarPath.startsWith("http")
      ? avatarPath
      : `http://localhost:5000/uploads/${avatarPath}`;
  };

  useEffect(() => {
    const token = getToken();

    // 1. Charger les infos du profil
    const fetchAdminInfo = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/admin/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data) {
          setProfile((prev) => ({
            ...prev,
            nom: res.data.nom || "",
            email: res.data.email || "",
            telephone: res.data.telephone || "",
            avatar: res.data.avatar || "",
          }));

          // 🔑 Sauvegarde initiale de l'avatar dans le localStorage
          if (res.data.avatar) {
            const fullUrl = formatAvatarUrl(res.data.avatar);
            localStorage.setItem("adminPhotoUrl", fullUrl);
          }
        }
      } catch (e) {
        console.error("Erreur lors du chargement du profil", e);
      }
    };

    // 2. Charger le prix enregistré en base de données
    const fetchConfig = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/admin/config", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data) {
          setConfig((prev) => ({
            ...prev,
            defaultCoursePrice: res.data.defaultCoursePrice ?? 1000,
            defaultPaymentDeadlineDays:
              res.data.defaultPaymentDeadlineDays ?? 30,
            bankInfo: res.data.bankInfo || "",
          }));
        }
      } catch (e) {
        console.error("Erreur chargement configuration", e);
      }
    };

    fetchAdminInfo();
    fetchConfig();
  }, []);

  // 🔑 Aperçu instantané + Sauvegarde locale de l'image sélectionnée
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const tempUrl = URL.createObjectURL(file);
      setSelectedFile(file);
      setPreviewUrl(tempUrl);

      // Met à jour le localStorage immédiatement pour le header
      localStorage.setItem("adminPhotoUrl", tempUrl);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const token = getToken();
      const formData = new FormData();
      formData.append("nom", profile.nom);
      formData.append("email", profile.email);
      formData.append("telephone", profile.telephone);

      if (profile.currentPassword) {
        formData.append("currentPassword", profile.currentPassword);
      }
      if (profile.newPassword) {
        formData.append("newPassword", profile.newPassword);
      }
      if (selectedFile) {
        formData.append("avatar", selectedFile);
      }

      const res = await axios.put(
        "http://localhost:5000/api/admin/profile",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      setMessage({ type: "success", text: "Profil mis à jour avec succès !" });

      // 🔑 Mise à jour de l'avatar final renvoyé par le backend dans le localStorage
      if (res.data?.admin?.avatar) {
        setProfile((prev) => ({ ...prev, avatar: res.data.admin.avatar }));
        const updatedPhotoUrl = formatAvatarUrl(res.data.admin.avatar);
        localStorage.setItem("adminPhotoUrl", updatedPhotoUrl);
      }

      setProfile((prev) => ({ ...prev, currentPassword: "", newPassword: "" }));
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Erreur lors de la mise à jour",
      });
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarde de la configuration en BDD
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setMessage({ type: "", text: "" });

    try {
      const token = getToken();
      await axios.put("http://localhost:5000/api/admin/config", config, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage({
        type: "success",
        text: "Paramètres de paiement enregistrés avec succès !",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Erreur lors de la sauvegarde",
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const getAvatarSrc = () => {
    if (previewUrl) return previewUrl;
    if (profile.avatar) {
      return formatAvatarUrl(profile.avatar);
    }
    return "https://via.placeholder.com/150?text=Admin";
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl">
      <div>
        <h2 className="text-2xl font-serif font-bold text-neutral-900">
          Paramètres & Configuration
        </h2>
        <p className="text-sm text-neutral-500">
          Gérez votre compte administrateur et la configuration globale de la
          plateforme.
        </p>
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-xl text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex space-x-2 border-b border-neutral-200 pb-2">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === "profile"
              ? "bg-[#d97736] text-white"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          👤 Profil Admin
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === "payments"
              ? "bg-[#d97736] text-white"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          ⚙️ Règlements & Échéances
        </button>
      </div>

      {activeTab === "profile" && (
        <form
          onSubmit={handleProfileUpdate}
          className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-6"
        >
          <h3 className="font-bold text-neutral-800 text-lg border-b pb-2">
            Informations Personnelles
          </h3>

          <div className="flex items-center space-x-6 pb-2">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-[#d97736] bg-neutral-100 shadow-sm">
              <img
                src={getAvatarSrc()}
                alt="Avatar Admin"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <label className="cursor-pointer inline-block px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-all border border-neutral-200">
                📷 Modifier la photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-neutral-400 mt-1.5">
                Formats acceptés: JPG, PNG, WEBP (Max 5Mo).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Nom complet
              </label>
              <input
                type="text"
                value={profile.nom}
                onChange={(e) =>
                  setProfile({ ...profile, nom: e.target.value })
                }
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#d97736]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Email
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) =>
                  setProfile({ ...profile, email: e.target.value })
                }
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#d97736]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Téléphone
              </label>
              <input
                type="text"
                value={profile.telephone}
                onChange={(e) =>
                  setProfile({ ...profile, telephone: e.target.value })
                }
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#d97736]"
              />
            </div>
          </div>

          <h3 className="font-bold text-neutral-800 text-lg border-b pb-2 pt-4">
            Changer le mot de passe
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Mot de passe actuel
              </label>
              <input
                type="password"
                value={profile.currentPassword}
                onChange={(e) =>
                  setProfile({ ...profile, currentPassword: e.target.value })
                }
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#d97736]"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={profile.newPassword}
                onChange={(e) =>
                  setProfile({ ...profile, newPassword: e.target.value })
                }
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#d97736]"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-[#d97736] text-white rounded-xl text-sm font-semibold hover:bg-[#c66628] transition-all disabled:opacity-50"
          >
            {loading ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </form>
      )}

      {activeTab === "payments" && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-6">
          <h3 className="font-bold text-neutral-800 text-lg border-b pb-2">
            Règles de Paiement & Tarification
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Prix par défaut de la formation (€)
              </label>
              <input
                type="number"
                value={config.defaultCoursePrice}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    defaultCoursePrice: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#d97736]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Délai d'échéance par défaut (en jours)
              </label>
              <input
                type="number"
                value={config.defaultPaymentDeadlineDays}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    defaultPaymentDeadlineDays: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#d97736]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">
              Instructions de virement / Coordonnées bancaires pour les élèves
            </label>
            <textarea
              rows="3"
              value={config.bankInfo}
              onChange={(e) =>
                setConfig({ ...config, bankInfo: e.target.value })
              }
              placeholder="RIB: FR76 XXXX XXXX XXXX..."
              className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#d97736]"
            ></textarea>
          </div>

          <button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="px-6 py-2.5 bg-[#d97736] text-white rounded-xl text-sm font-semibold hover:bg-[#c66628] transition-all disabled:opacity-50"
          >
            {savingConfig ? "Sauvegarde..." : "Sauvegarder les règles"}
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
