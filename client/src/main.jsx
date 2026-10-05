import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
// 1. On importe le provider Google
import { GoogleOAuthProvider } from "@react-oauth/google";

// 2. Collez votre vrai Client ID entre les guillemets ci-dessous
const GOOGLE_CLIENT_ID =
  "78247170063-fph1568vdbp88n7r6apq1d25nej91866.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* 3. On enveloppe toute l'application avec le Provider */}
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
