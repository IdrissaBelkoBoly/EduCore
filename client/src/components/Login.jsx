import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState({ type: "", text: "" });

  const { email, password } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 🟢 Helper centralisé pour la redirection selon le rôle
  const redirectUserByRole = (user) => {
    const role = user.role ? user.role.toLowerCase() : "";
    if (role === "admin") {
      navigate("/admin/dashboard");
    } else if (role === "formateur" || role === "teacher") {
      navigate("/teacher/dashboard"); // 👈 Redirection dédiée au Formateur !
    } else {
      navigate("/dashboard"); // 👈 Espace Élève
    }
  };

  // 1. Connexion Classique (Email + Mot de passe)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Ravi de vous revoir ! 💅" });
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        setTimeout(() => {
          redirectUserByRole(data.user);
        }, 1500);
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: "Erreur de connexion avec le serveur.",
      });
    }
  };

  // 2. Connexion avec Google
  const handleGoogleSuccess = async (credentialResponse) => {
    setMessage({ type: "", text: "" });
    try {
      const response = await fetch("http://localhost:5000/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credentialResponse.credential }),
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Connexion Google réussie ! ✨" });
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        setTimeout(() => {
          redirectUserByRole(data.user);
        }, 1500);
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: "Échec de l'authentification Google.",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-pink-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg border border-pink-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Connexion à votre espace
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Continuez votre formation en onglerie et esthétique
          </p>
        </div>

        {message.text && (
          <div
            className={`p-3 rounded-lg text-sm text-center font-medium ${
              message.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse Email
              </label>
              <input
                name="email"
                type="email"
                required
                value={email}
                onChange={handleChange}
                className="appearance-none rounded-xl relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                placeholder="vous@exemple.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <input
                name="password"
                type="password"
                required
                value={password}
                onChange={handleChange}
                className="appearance-none rounded-xl relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-colors"
            >
              Se connecter
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative flex py-2 items-center">
            <div className="grow border-t border-gray-300"></div>
            <span className="shrink mx-4 text-gray-400 text-sm">ou</span>
            <div className="grow border-t border-gray-300"></div>
          </div>

          <div className="mt-4 flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() =>
                setMessage({ type: "error", text: "Erreur Google Login" })
              }
              useOneTap={false} // 🟢 CORRECTION CLEF : Désactive l'invite automatique problématique
              shape="pill"
              theme="outline"
              size="large"
              width="350"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
