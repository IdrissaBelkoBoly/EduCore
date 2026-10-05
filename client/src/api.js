import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api", // Remplacez 5000 par le port de votre serveur Node/Express
});

// Intercepteur pour ajouter le token JWT à chaque requête si l'utilisateur est connecté
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;
