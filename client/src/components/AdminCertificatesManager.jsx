import React, { useState, useEffect } from "react";
import axios from "axios";

export default function AdminCertificatesManager() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("all");
  const [actionLoading, setActionLoading] = useState(null);

  // Modales
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null);
  const [modalAction, setModalAction] = useState(null); // 'approved' ou 'rejected'
  const [customMessage, setCustomMessage] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // ✅ URL corrigée vers la bonne route Express
      const res = await axios.get(
        "http://localhost:5000/api/certificates/pending",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setRecommendations(res.data.recommendations || []);
    } catch (err) {
      console.error("Erreur lors du chargement des recommandations :", err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessCertificate = (item, action) => {
    const studentName = item.student?.nom || item.student?.name || "Élève";
    const courseTitle =
      item.course?.title || item.course?.titre || "la formation";

    setSelectedStudentForModal(item);
    setModalAction(action);

    if (action === "approved") {
      setCustomMessage(
        `Bravo ${studentName} ! La validation pour le module "${courseTitle}" est confirmée. Continuez ainsi, votre certificat est disponible !`,
      );
    } else {
      setCustomMessage(
        `Bonjour ${studentName}, la demande de certificat pour "${courseTitle}" n'a pas pu être validée pour le moment.`,
      );
    }
  };

  const updateStatus = async (recommendationId, action, message = "") => {
    try {
      setActionLoading(recommendationId);
      const token = localStorage.getItem("token");

      // ✅ URL corrigée vers le sous-chemin /status
      const res = await axios.put(
        `http://localhost:5000/api/certificates/${recommendationId}/status`,
        { status: action, message },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const updatedCert = res.data.certificate || {};

      setRecommendations((prev) =>
        prev.map((rec) =>
          rec._id === recommendationId
            ? {
                ...rec,
                ...updatedCert,
                status: action,
                encouragementMessage: message,
                student: rec.student,
                course: rec.course,
                formateur: rec.formateur,
              }
            : rec,
        ),
      );
    } catch (err) {
      console.error("Erreur lors de la mise à jour du certificat :", err);
      alert("Une erreur est survenue lors de la mise à jour.");
    } finally {
      setActionLoading(null);
      setSelectedStudentForModal(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!selectedStudentForModal || !modalAction) return;
    await updateStatus(selectedStudentForModal._id, modalAction, customMessage);
  };

  // Extraction des formateurs
  const teachersList = Array.from(
    new Set(
      recommendations
        .map(
          (r) =>
            r.formateur?.nom ||
            r.formateur?.name ||
            r.teacher?.nom ||
            r.teacher?.name,
        )
        .filter(Boolean),
    ),
  );

  // Filtrage
  const filteredRecommendations = recommendations.filter((item) => {
    const matchesStatus =
      filterStatus === "all" || item.status === filterStatus;
    const teacherName =
      item.formateur?.nom ||
      item.formateur?.name ||
      item.teacher?.nom ||
      item.teacher?.name;

    const matchesTeacher =
      selectedTeacher === "all" || teacherName === selectedTeacher;

    const query = searchQuery.toLowerCase();
    const studentName = (
      item.student?.nom ||
      item.student?.name ||
      ""
    ).toLowerCase();
    const studentEmail = (item.student?.email || "").toLowerCase();
    const courseTitle = (
      item.course?.title ||
      item.course?.titre ||
      ""
    ).toLowerCase();
    const tName = (teacherName || "").toLowerCase();

    return (
      matchesStatus &&
      matchesTeacher &&
      (studentName.includes(query) ||
        studentEmail.includes(query) ||
        courseTitle.includes(query) ||
        tName.includes(query))
    );
  });

  // Pagination
  const totalPages =
    Math.ceil(filteredRecommendations.length / itemsPerPage) || 1;
  const currentItems = filteredRecommendations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // KPIs
  const stats = {
    pending: recommendations.filter((r) => r.status === "pending").length,
    approved: recommendations.filter((r) => r.status === "approved").length,
    rejected: recommendations.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">
          📜 Validation & Gestion des Certificats
        </h1>
        <p className="text-sm text-neutral-500">
          Examinez les demandes transmises par les formateurs pour chaque cours
          et attribuez les certificats.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              En Attente
            </p>
            <p className="text-2xl font-bold text-amber-900 mt-1">
              {stats.pending}
            </p>
          </div>
          <span className="text-2xl">⏳</span>
        </div>

        <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Délivrés
            </p>
            <p className="text-2xl font-bold text-emerald-900 mt-1">
              {stats.approved}
            </p>
          </div>
          <span className="text-2xl">✅</span>
        </div>

        <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              Refusés
            </p>
            <p className="text-2xl font-bold text-rose-900 mt-1">
              {stats.rejected}
            </p>
          </div>
          <span className="text-2xl">❌</span>
        </div>
      </div>

      {/* Barre de Filtres */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-neutral-100 shadow-xs">
        <div className="flex bg-neutral-100 p-1 rounded-xl text-xs font-medium w-full lg:w-auto overflow-x-auto">
          {[
            { key: "pending", label: `⏳ En attente (${stats.pending})` },
            { key: "approved", label: `✅ Validés (${stats.approved})` },
            { key: "rejected", label: `❌ Refusés (${stats.rejected})` },
            { key: "all", label: "Tous" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setFilterStatus(tab.key);
                setCurrentPage(1);
              }}
              className={`flex-1 lg:flex-none px-4 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filterStatus === tab.key
                  ? "bg-white text-neutral-900 shadow-xs font-semibold"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <select
            value={selectedTeacher}
            onChange={(e) => {
              setSelectedTeacher(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 outline-hidden focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="all">🎓 Tous les formateurs</option>
            {teachersList.map((teacher, idx) => (
              <option key={idx} value={teacher}>
                {teacher}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Rechercher élève, cours..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full sm:w-60 text-xs bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 outline-hidden focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-sm text-neutral-400">
            Chargement des demandes...
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-400 italic">
            Aucune demande de certificat trouvée.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-600">
              <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-4">Élève</th>
                  <th className="p-4">Cours Concerné</th>
                  <th className="p-4">Formateur Référent</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium">
                {currentItems.map((item) => (
                  <tr
                    key={item._id}
                    className="hover:bg-neutral-50/50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-semibold text-neutral-800">
                        👤 {item.student?.nom || item.student?.name || "Élève"}
                      </div>
                      <div className="text-neutral-400 font-normal">
                        {item.student?.email}
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-neutral-100 text-neutral-700 rounded-lg border border-neutral-200/60 font-semibold">
                        📚{" "}
                        {item.course?.title ||
                          item.course?.titre ||
                          "Cours non spécifié"}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="text-neutral-700">
                        🎓{" "}
                        {item.formateur?.nom ||
                          item.formateur?.name ||
                          item.teacher?.nom ||
                          item.teacher?.name ||
                          "Formateur"}
                      </div>
                    </td>

                    <td className="p-4">
                      {item.status === "pending" && (
                        <span className="px-2.5 py-1 rounded-full text-amber-700 bg-amber-50 border border-amber-200 text-xs font-semibold">
                          ⏳ En attente
                        </span>
                      )}
                      {item.status === "approved" && (
                        <span className="px-2.5 py-1 rounded-full text-emerald-700 bg-emerald-50 border border-emerald-200 text-xs font-semibold">
                          ✅ Validé & Délivré
                        </span>
                      )}
                      {item.status === "rejected" && (
                        <span className="px-2.5 py-1 rounded-full text-rose-700 bg-rose-50 border border-rose-200 text-xs font-semibold">
                          ❌ Refusé
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      {item.status === "pending" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={actionLoading === item._id}
                            onClick={() =>
                              handleProcessCertificate(item, "approved")
                            }
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            ✅ Valider
                          </button>
                          <button
                            disabled={actionLoading === item._id}
                            onClick={() =>
                              handleProcessCertificate(item, "rejected")
                            }
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-lg border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            ❌ Refus
                          </button>
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic font-normal">
                          Traité
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 bg-neutral-50/80 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-500">
            <span>
              Page <strong>{currentPage}</strong> sur{" "}
              <strong>{totalPages}</strong> ({filteredRecommendations.length}{" "}
              demandes)
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1.5 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 disabled:opacity-50 cursor-pointer font-medium"
              >
                ◀ Précédent
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1.5 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 disabled:opacity-50 cursor-pointer font-medium"
              >
                Suivant ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modale de validation / refus */}
      {selectedStudentForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-neutral-100 space-y-5">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner ${
                modalAction === "approved"
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-rose-100 text-rose-600"
              }`}
            >
              {modalAction === "approved" ? "🎉" : "⚠️"}
            </div>

            <div>
              <h3 className="text-xl font-bold text-neutral-800">
                {modalAction === "approved"
                  ? "Validation du certificat"
                  : "Refus du certificat"}
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                {modalAction === "approved"
                  ? "Personnalisez le message à destination de l'élève avant de finaliser la validation."
                  : "Indiquez la raison du refus afin d'en informer l'élève."}
              </p>
            </div>

            <div className="text-left space-y-2">
              <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1">
                💬 Message destinataire :
              </label>
              <textarea
                rows={4}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-2xl p-3 focus:bg-white outline-hidden transition-all text-neutral-800 leading-relaxed resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedStudentForModal(null)}
                className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                disabled={actionLoading === selectedStudentForModal._id}
                onClick={handleConfirmAction}
                className={`flex-1 py-3 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 ${
                  modalAction === "approved"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {actionLoading === selectedStudentForModal._id
                  ? "Traitement..."
                  : modalAction === "approved"
                    ? "Valider & Envoyer"
                    : "Confirmer le Refus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
