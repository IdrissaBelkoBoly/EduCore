import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nom: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 📝 2. Soumission du formulaire classique
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (response.ok) {
        // ✨ Le backend renvoie le succès sans connecter l'étudiante directement
        setMessage({
          type: "success",
          text: "Inscription enregistrée ! 💰 Veuillez valider votre accès auprès de l'administration (paiement en cash ou carte).",
        });
        setFormData({ nom: "", email: "", password: "" });
      } else {
        setMessage({
          type: "error",
          text: data.message || "Une erreur est survenue.",
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: "Impossible de contacter le serveur.",
      });
    } finally {
      setLoading(false);
    }
  };

  // 🌐 3. Gestion du succès avec Google Auth
  const handleGoogleSuccess = async (credentialResponse) => {
    setMessage({ type: "", text: "" });
    try {
      const response = await fetch("http://localhost:5000/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credentialResponse.credential }),
      });
      const data = await response.json();

      // Si le compte Google est déjà existant ET actif (isActive: true)
      if (data.success && data.token) {
        setMessage({ type: "success", text: "Connexion Google réussie ! 💅" });
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        setTimeout(() => {
          if (data.user.role === "admin") {
            navigate("/admin/dashboard");
          } else {
            navigate("/dashboard");
          }
        }, 1500);
      } else {
        // 💰 Si le compte vient d'être créé par Google (ou s'il est inactif)
        setMessage({
          type: "success", // Vert car la création Google a fonctionné
          text:
            data.message ||
            "Compte créé ! Veuillez valider votre accès en cash auprès de l'administrateur.",
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: "Échec de la connexion Google avec le serveur.",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Créer un compte
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Rejoignez votre espace de formation esthétique
          </p>
        </div>

        {message.text && (
          <div
            className={`p-3 rounded-lg text-sm text-center font-medium ${
              message.type === "success"
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nom complet
            </label>
            <input
              type="text"
              name="nom"
              required
              value={formData.nom}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              placeholder="Ex: Sarah Connor"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Adresse e-mail
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              placeholder="nom@exemple.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Mot de passe
            </label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-black hover:bg-gray-800 disabled:bg-gray-400 transition-colors cursor-pointer"
          >
            {loading ? "Création en cours..." : "S'inscrire"}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              ou continuer avec
            </span>
          </div>
        </div>

        <div className="flex justify-center w-full">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() =>
              setMessage({
                type: "error",
                text: "L'authentification Google a échoué.",
              })
            }
            theme="outline"
            size="large"
            text="signup_with"
            shape="pill"
            width="100%"
          />
        </div>
      </div>
    </div>
  );
}
