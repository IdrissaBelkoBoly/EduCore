import React, { useState } from "react";
import axios from "axios";
import { GoogleLogin } from "@react-oauth/google";

export default function BecomeTeacher() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    speciality: "",
    bio: "",
  });

  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Gestion des changements dans les champs du formulaire
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 1️⃣ OPTION A : Envoi du formulaire classique (Email / Mot de passe)
  const handleClassicSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      // 🟢 Endpoint harmonisé en anglais
      const res = await axios.post("/api/auth/register-teacher", formData);
      setMessage({ type: "success", text: res.data.message });
      // Réinitialiser le formulaire
      setFormData({
        name: "",
        email: "",
        password: "",
        phone: "",
        speciality: "",
        bio: "",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err.response?.data?.message ||
          "Une erreur est survenue lors de l'inscription.",
      });
    } finally {
      setLoading(false);
    }
  };

  // 2️⃣ OPTION B : Envoi via Google OAuth
  const handleGoogleSuccess = async (credentialResponse) => {
    setMessage(null);

    // Vérifier que les informations spécifiques à la profession sont remplies
    if (!formData.speciality || !formData.phone) {
      setMessage({
        type: "error",
        text: "Veuillez préciser votre spécialité et votre numéro de téléphone avant d'utiliser Google.",
      });
      return;
    }

    setLoading(true);

    try {
      // 🟢 Endpoint harmonisé en anglais
      const res = await axios.post("/api/auth/register-teacher-google", {
        idToken: credentialResponse.credential, // Le jeton ID renvoyé par Google
        phone: formData.phone,
        speciality: formData.speciality,
        bio: formData.bio,
      });

      setMessage({ type: "success", text: res.data.message });
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err.response?.data?.message ||
          "Erreur lors de l'inscription via Google.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white p-8 rounded-2xl shadow-sm border border-neutral-100">
        <h2 className="text-2xl font-serif font-bold text-neutral-900 mb-2 text-center">
          Rejoignez l'équipe d'Enseignants
        </h2>
        <p className="text-sm text-neutral-500 mb-6 text-center">
          Partagez votre expertise (Onglerie, Épilation, Soins) et formez les
          talents de demain.
        </p>

        {/* Message d'alerte (Succès ou Erreur) */}
        {message && (
          <div
            className={`mb-6 p-4 text-xs font-medium rounded-xl border ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-rose-50 text-rose-700 border-rose-100"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* CHAMPS COMMUNS OBLIGATOIRES (Téléphone & Spécialité) */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Téléphone <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="phone"
                placeholder="Ex: 06 12 34 56 78"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#d97736]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Spécialité <span className="text-rose-500">*</span>
              </label>
              <select
                name="speciality"
                value={formData.speciality}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#d97736] text-neutral-600"
              >
                <option value="">Sélectionnez votre domaine</option>
                <option value="Onglerie">Onglerie / Prothésie Ongulaire</option>
                <option value="Épilation">Épilation / Cire</option>
                <option value="Soin du visage">
                  Soin du visage & Esthétique
                </option>
                <option value="Autre">Autre spécialité</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Petite Bio / Présentation
            </label>
            <textarea
              name="bio"
              rows="2"
              placeholder="Décrivez brièvement votre expérience professionnelle..."
              value={formData.bio}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#d97736]"
            />
          </div>
        </div>

        {/* 🔴 OPTION 1 : POSTULER AVEC GOOGLE */}
        <div className="mb-6 flex flex-col items-center border-t border-neutral-100 pt-6">
          <span className="text-xs text-neutral-400 mb-3">Option rapide</span>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() =>
              setMessage({
                type: "error",
                text: "Échec de la connexion avec Google.",
              })
            }
          />
        </div>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200"></div>
          </div>
          <span className="relative bg-white px-4 text-xs text-neutral-400 uppercase tracking-wider">
            ou par e-mail
          </span>
        </div>

        {/* 🟡 OPTION 2 : FORMULAIRE CLASSIQUE */}
        <form onSubmit={handleClassicSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Nom complet
            </label>
            <input
              type="text"
              name="name"
              placeholder="Ex: Marie Curie"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#d97736]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Adresse Email
            </label>
            <input
              type="email"
              name="email"
              placeholder="enseignant@exemple.com"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#d97736]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#d97736]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-neutral-900 text-white font-medium text-sm rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Soumission..." : "Soumettre ma candidature par email"}
          </button>
        </form>
      </div>
    </div>
  );
}
