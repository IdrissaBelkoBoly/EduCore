import React, { useState, useEffect } from "react";

export default function AdminHomeworks() {
  const [submissions, setSubmissions] = useState([]);
  const [feedbackTexts, setFeedbackTexts] = useState({});

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/homework/admin/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.data);
      }
    } catch (err) {
      console.error("Erreur de récupération des devoirs", err);
    }
  };

  const handleReview = async (id, status) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5000/api/homework/admin/review/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status, feedback: feedbackTexts[id] || "" }),
        },
      );
      const data = await res.json();

      if (data.success) {
        alert(
          `Devoir mis à jour : ${status === "approved" ? "Validé !" : "À refaire"}`,
        );
        fetchSubmissions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        🎯 Corrections des Devoirs Reçus
      </h1>

      <div className="grid gap-6">
        {submissions.map((sub) => (
          <div
            key={sub._id}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6"
          >
            {/* Visualisation Photo ou Vidéo de l'élève */}
            <div className="w-full md:w-64 h-48 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border">
              {sub.fileType === "video" ? (
                <video
                  src={`http://localhost:5000${sub.fileUrl}`}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={`http://localhost:5000${sub.fileUrl}`}
                  alt="Rendu élève"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Infos texte */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-slate-800">
                    {sub.student?.name || "Étudiante anonyme"}
                  </span>
                  <span className="text-sm text-slate-400">
                    ({sub.student?.email})
                  </span>
                </div>
                <p className="text-xs text-pink-500 font-semibold mb-2">
                  Cours : {sub.courseId?.title}
                </p>
                <p className="text-sm text-slate-600 italic bg-slate-50 p-3 rounded-lg border">
                  "{sub.comment || "Aucun commentaire laissé."}"
                </p>
              </div>

              {/* Statut actuel */}
              <div className="mt-4 flex items-center gap-3">
                <span className="text-xs font-semibold">Statut :</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    sub.status === "pending"
                      ? "bg-amber-100 text-amber-700"
                      : sub.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {sub.status === "pending"
                    ? "En attente"
                    : sub.status === "approved"
                      ? "Validé"
                      : "À refaire"}
                </span>
              </div>
            </div>

            {/* Espace de Notation / Correction pour toi */}
            <div className="w-full md:w-80 flex flex-col justify-between border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-2">
                  Ton avis / Conseils de formatrice :
                </label>
                <textarea
                  className="w-full border p-2 text-sm rounded-lg h-24 resize-none focus:outline-pink-400"
                  placeholder="Ex: Super parallélisme ! Attention aux cuticules sur le doigt majeur..."
                  value={feedbackTexts[sub._id] || sub.feedback || ""}
                  onChange={(e) =>
                    setFeedbackTexts({
                      ...feedbackTexts,
                      [sub._id]: e.target.value,
                    })
                  }
                />
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleReview(sub._id, "approved")}
                  className="flex-1 bg-green-500 text-white py-2 rounded-xl text-xs font-bold hover:bg-green-600 transition-all"
                >
                  ✓ Valider
                </button>
                <button
                  onClick={() => handleReview(sub._id, "rejected")}
                  className="flex-1 bg-rose-500 text-white py-2 rounded-xl text-xs font-bold hover:bg-rose-600 transition-all"
                >
                  ✕ À retravailler
                </button>
              </div>
            </div>
          </div>
        ))}

        {submissions.length === 0 && (
          <p className="text-slate-400 text-center py-12">
            Aucun devoir soumis pour le moment. 💅
          </p>
        )}
      </div>
    </div>
  );
}
