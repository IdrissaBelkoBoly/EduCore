import React, { useState, useEffect } from "react";
import axios from "axios";
import CoursesManager from "./CoursesManager";
import AssignmentsManager from "./AssignmentsManager"; // Ajuste le chemin si nécessaire
import GradingManager from "./GradingManager";
import AnalyticsDashboard from "./AnalyticsDashboard";
import AdminSettings from "./AdminSettings";
import AdminOverview from "./AdminOverview";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";
import AdminTeachers from "./AdminTeachers";
import AdminCertificatesManager from "./AdminCertificatesManager";
import AdminChat from "./AdminChat";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // 🟢 AJOUT : Récupération de l'utilisateur connecté depuis le localStorage
  const user = JSON.parse(localStorage.getItem("userInfo")) ||
    JSON.parse(localStorage.getItem("user")) || { role: "admin" };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(""); // "view" ou "edit"
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [allCourses, setAllCourses] = useState([]);
  const [pendingHomeworks, setPendingHomeworks] = useState([]);

  // Pour le formulaire de modification simple
  const [editForm, setEditForm] = useState({ nom: "", telephone: "" });
  const [newDeadline, setNewDeadline] = useState("");

  // 📸 AJOUT : Récupération de la photo de l'admin depuis le localStorage ou état
  const [adminPhoto, setAdminPhoto] = useState(
    localStorage.getItem("adminPhotoUrl") ||
      localStorage.getItem("adminPhoto") ||
      null,
  );

  // 2. AJOUT : Effet pour recharger la photo depuis le localStorage ou lors du changement d'onglet
  useEffect(() => {
    const savedPhoto =
      localStorage.getItem("adminPhotoUrl") ||
      localStorage.getItem("adminPhoto");
    if (savedPhoto) {
      setAdminPhoto(savedPhoto);
    }
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true; // Sécurité pour éviter les fuites de mémoire

    const fetchStudents = async () => {
      // 1. On force le chargement au début
      setLoadingStudents(true);

      const token = localStorage.getItem("token");

      if (!token) {
        console.warn("⚠️ Aucun token trouvé dans le localStorage.");
        if (isMounted) {
          setStudents([]);
          setLoadingStudents(false);
        }
        return;
      }

      // 2. Sécurité absolue : Si la requête met plus de 3 secondes ou bloque,
      // on coupe de force le chargement pour afficher l'interface.
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn(
            "⚠️ La requête prend trop de temps, désactivation forcée du chargement.",
          );
          setLoadingStudents(false);
        }
      }, 3000);

      try {
        const response = await axios.get("/api/auth/admin/students", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        clearTimeout(timeoutId); // On annule le timeout si la requête a répondu à temps
        console.log("✅ DONNÉES REÇUES :", response.data);

        if (isMounted) {
          if (response.data && Array.isArray(response.data.students)) {
            setStudents(response.data.students);
          } else {
            setStudents([]);
          }
          setLoadingStudents(false); // On coupe le chargement ici
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error("❌ ERREUR CAPTURÉE :", error);
        if (isMounted) {
          setStudents([]);
          setLoadingStudents(false); // On coupe le chargement aussi en cas d'erreur
        }
      }
    };

    if (activeTab === "overview" || activeTab === "students") {
      fetchStudents();
    }

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  useEffect(() => {
    const fetchCoursesFromDatabase = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/courses", {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("🔍 RÉPONSE DU BACKEND (COURS) :", response.data);

        // 1. Si le backend renvoie { success: true, courses: [...] }
        if (response.data && Array.isArray(response.data.courses)) {
          setAllCourses(response.data.courses);
        }
        // 2. Si le backend renvoie { success: true, data: [...] }
        else if (response.data && Array.isArray(response.data.data)) {
          setAllCourses(response.data.data);
        }
        // 3. Si le backend renvoie directement le tableau [...]
        else if (Array.isArray(response.data)) {
          setAllCourses(response.data);
        }
        // 4. Cas de secours si c'est niché différemment
        else {
          console.warn(
            "⚠️ Structure de données inconnue pour les cours :",
            response.data,
          );
        }
      } catch (error) {
        console.error("❌ Impossible de charger les cours :", error);
      }
    };

    fetchCoursesFromDatabase();
  }, []); // Le tableau vide [] fait en sorte que ça s'exécute une seule fois au chargement de la page


  useEffect(() => {
    const fetchPendingHomeworks = async () => {
      try {
        const token = localStorage.getItem("token"); // Adaptez selon votre stockage du token
        const res = await fetch("/api/assignments/pending-submissions", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.success) {
          setPendingHomeworks(data.data);
        }
      } catch (err) {
        console.error(
          "Erreur lors du chargement des devoirs à corriger :",
          err,
        );
      }
    };

    fetchPendingHomeworks();
  }, []);

  // 👁️ Clic sur l'œil : Ouvre la boîte de dialogue en mode Visualisation / Suivi
  const handleCoursesClick = (student) => {
    setSelectedStudent(student);
    setModalType("view");
    setIsModalOpen(true);
  };

  // ✏️ Clic sur le crayon : Ouvre la boîte de dialogue en mode Édition & Paiement
  const handlePaymentClick = (student) => {
    setSelectedStudent(student);
    setEditForm({ nom: student.nom, telephone: student.telephone || "" });
    setModalType("edit");
    setIsModalOpen(true);
  };

  // ✏️ Clic sur le Crayon : Uniquement pour modifier le profil
  const handleEditProfileClick = (student) => {
    if (!student) return;
    setSelectedStudent(student);
    setEditForm({
      nom: student.nom || "",
      telephone: student.telephone || "",
      email: student.email || "",
    });
    setModalType("edit-profile"); // 👈 Un type dédié uniquement au profil
    setIsModalOpen(true);
  };

  // Fonction pour enregistrer un versement d'argent (appelée depuis la Modal)
  const submitPayment = async (amount) => {
    const amountToAdd = Number(amount);

    if (!amountToAdd || isNaN(amountToAdd) || amountToAdd <= 0) {
      alert("❌ Veuillez saisir un montant valide supérieur à 0.");
      return;
    }

    const totalPrice = selectedStudent.totalPrice || 1000;
    const resteAPayer = totalPrice - (selectedStudent.pricePaid || 0);

    if (amountToAdd > resteAPayer) {
      alert(
        `❌ Le montant saisi (${amountToAdd} DH) dépasse le reste à payer (${resteAPayer} DH).`,
      );
      return;
    }

    // Sélection de la date limite valide
    const deadlineToUpdate =
      newDeadline || selectedStudent.paymentDeadline || selectedStudent.dueDate;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `/api/auth/admin/students/${selectedStudent._id}/activate`,
        {
          amount: amountToAdd,
          nextDeadline: deadlineToUpdate,
          paymentDeadline: deadlineToUpdate, // S'assure d'envoyer aux deux clés
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        alert("Paiement enregistré ! 🎉");

        const studentData =
          response.data.data || response.data.student || response.data;

        const updated = {
          ...selectedStudent,
          ...studentData,
          pricePaid: studentData.pricePaid,
          paymentDeadline: deadlineToUpdate,
          dueDate: deadlineToUpdate,
        };

        // Synchronisation React
        setSelectedStudent(updated);
        setStudents((prev) =>
          prev.map((s) => (s._id === selectedStudent._id ? updated : s)),
        );

        setNewDeadline(""); // Réinitialiser le champ de date
      }
    } catch (error) {
      console.error(
        "Détails de l'erreur de versement :",
        error.response || error,
      );
      const messageErreur =
        error.response?.data?.message || "Erreur lors du versement";
      alert(`❌ ${messageErreur}`);
    }
  };

  // 3. Fonction pour mettre à jour UNIQUEMENT la date limite
  const handleUpdateDeadline = async () => {
    if (!newDeadline) {
      alert("Veuillez sélectionner une date valide.");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      // Appel API avec les deux noms de champs pour garantir l'enregistrement MongoDB
      const response = await axios.put(
        `/api/auth/admin/students/${selectedStudent._id}/courses`,
        {
          allowedCourses: selectedStudent.allowedCourses,
          paymentDeadline: newDeadline, // 🟢 Clé principale du schéma MongoDB
          dueDate: newDeadline, // 🟢 Compatibilité frontend
          isManuallyUnblocked: false, // Réinitialise le déblocage manuel avec le nouveau délai
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const studentData =
        response.data?.data || response.data?.student || response.data;

      const updated = {
        ...selectedStudent,
        ...studentData,
        dueDate: newDeadline,
        paymentDeadline: newDeadline,
        isManuallyUnblocked: false,
      };

      // Mise à jour synchrone des états React
      setSelectedStudent(updated);
      setStudents((prev) =>
        prev.map((s) => (s._id === selectedStudent._id ? updated : s)),
      );

      alert("Date limite de paiement enregistrée avec succès ! 📅");
      setNewDeadline(""); // Réinitialise le champ temporaire
    } catch (error) {
      console.error("Erreur mise à jour date :", error.response || error);
      alert(
        error.response?.data?.message ||
          "Erreur lors de la mise à jour de la date limite.",
      );
    }
  };

  // Fonction pour clore/retirer la formation de l'étudiante une fois terminée
  const handleCompleteFormation = async () => {
    if (
      window.confirm(
        "Valider la fin de formation de cette étudiante et archiver son statut ?",
      )
    ) {
      try {
        const token = localStorage.getItem("token");
        // On passe son statut à "completed"
        const response = await axios.put(
          `/api/auth/admin/students/${selectedStudent._id}/courses`,
          { allowedCourses: selectedStudent.allowedCourses }, // Garde ses cours actuels
          { headers: { Authorization: `Bearer ${token}` } },
        );

        // Exemple de mise à jour de statut locale
        setStudents((prev) =>
          prev.map((s) =>
            s._id === selectedStudent._id ? { ...s, status: "completed" } : s,
          ),
        );
        setSelectedStudent((prev) => ({ ...prev, status: "completed" }));
        alert("Formation marquée comme complétée ! 🎓");
      } catch (error) {
        alert("Erreur lors du changement de statut");
      }
    }
  };

  const handleToggleCourseAccess = async (courseId, isChecked) => {
    // 1. On calcule le nouveau tableau allowedCourses pour l'étudiante sélectionnée
    let updatedAllowedCourses = [...(selectedStudent.allowedCourses || [])];

    if (isChecked) {
      // Si coché, on ajoute l'ID du cours s'il n'y est pas déjà
      if (!updatedAllowedCourses.includes(courseId)) {
        updatedAllowedCourses.push(courseId);
      }
    } else {
      // Si décoché, on retire l'ID du cours
      updatedAllowedCourses = updatedAllowedCourses.filter(
        (id) => id !== courseId,
      );
    }

    try {
      const token = localStorage.getItem("token");
      // 2. Appel à ta route backend existante
      const response = await axios.put(
        `/api/auth/admin/students/${selectedStudent._id}/courses`,
        { allowedCourses: updatedAllowedCourses },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        // 3. Mise à jour des états React locaux pour répercuter le changement visuellement
        const updatedStudent = {
          ...selectedStudent,
          allowedCourses: updatedAllowedCourses,
        };
        setSelectedStudent(updatedStudent);
        setStudents((prev) =>
          prev.map((s) => (s._id === selectedStudent._id ? updatedStudent : s)),
        );
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour des accès :", error);
      alert("Impossible de modifier les accès du cours.");
    }
  };

  const toggleStudentBlockStatus = async (shouldBlock) => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.put(
        `/api/auth/admin/students/${selectedStudent._id}/block`,
        {
          isBlocked: shouldBlock,
          isManuallyUnblocked: !shouldBlock,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        const studentData = response.data.data;

        const updatedStudent = {
          ...selectedStudent,
          ...studentData,
        };

        // Mettre à jour l'étudiante sélectionnée et le tableau d'élèves
        setSelectedStudent(updatedStudent);
        setStudents((prev) =>
          prev.map((s) => (s._id === selectedStudent._id ? updatedStudent : s)),
        );

        alert(
          shouldBlock
            ? "🔒 Accès de l'étudiant bloqué avec succès."
            : "🔓 Accès de l'étudiant débloqué avec succès !",
        );
      }
    } catch (error) {
      console.error("Détails de l'erreur :", error.response || error);
      const message =
        error.response?.data?.message ||
        "Erreur lors de la modification du statut de l'étudiant";
      alert(`❌ ${message}`);
    }
  };

  // Fonction pour supprimer un étudiant du système
  const handleDeleteClick = async (studentId) => {
    if (
      window.confirm(
        "⚠️ Êtes-vous sûr(e) de vouloir supprimer définitivement cette étudiante ?",
      )
    ) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`/api/auth/admin/students/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Retire l'étudiante du tableau React
        setStudents((prev) => prev.filter((s) => s._id !== studentId));
        alert("🗑️ Étudiante supprimée avec succès.");
      } catch (error) {
        console.error("Erreur lors de la suppression :", error);
        alert(
          error.response?.data?.message ||
            "❌ Erreur lors de la suppression de l'étudiante.",
        );
      }
    }
  };
  // 🎓 Génération et téléchargement du certificat côté Admin
  const handleDownloadCertificate = (student) => {
    // 1️⃣ Vérification flexible : l'élève peut obtenir son certificat si :
    // - Son statut est "Completed" (clôturé par l'admin)
    // - OU sa progression est égale à 100%
    // - OU student.isCompleted / student.isFinished vaut true
    const isFinished =
      student.status === "Completed" ||
      student.status === "completed" ||
      student.isCompleted ||
      student.isFinished ||
      student.progress === 100;

    if (!isFinished) {
      alert(
        "Impossible de générer le certificat : cette étudiante n'a pas encore terminé sa formation ! 🎓",
      );
      return;
    }

    // 2️⃣ Ouverture de la fenêtre
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert(
        "Veuillez autoriser les fenêtres surgissantes dans votre navigateur.",
      );
      return;
    }

    // 📅 Date du jour formatée
    const today = new Date().toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Certificat - ${student.nom || student.name}</title>
        <style>
          @page {
            size: A4 landscape; /* Style diplôme en mode paysage */
            margin: 0;
          }
          body {
            font-family: 'Georgia', serif;
            background-color: #fcfbfa;
            margin: 0;
            padding: 40px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            box-sizing: border-box;
          }
          .certificate-container {
            border: 8px double #d4af37; /* Bordure dorée raffinée */
            padding: 40px 60px;
            background-color: #ffffff;
            width: 100%;
            max-width: 900px;
            text-align: center;
            position: relative;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
          }
          .header-logo {
            max-width: 120px;
            margin-bottom: 10px;
          }
          .title {
            font-size: 38px;
            color: #1a1a1a;
            text-transform: uppercase;
            letter-spacing: 4px;
            margin-bottom: 5px;
            font-weight: bold;
          }
          .subtitle {
            font-size: 16px;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 30px;
          }
          .recipient-text {
            font-size: 18px;
            color: #555;
            font-style: italic;
          }
          .student-name {
            font-size: 32px;
            color: #b8860b; /* Couleur or */
            font-weight: bold;
            margin: 15px 0;
            border-bottom: 2px solid #f0e68c;
            display: inline-block;
            padding-bottom: 5px;
          }
          .description {
            font-size: 16px;
            color: #444;
            line-height: 1.6;
            margin: 20px auto;
            max-width: 700px;
          }
          /* ✍️ SECTION SIGNATURE & TAMPON */
          .footer-section {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding: 0 40px;
          }
          .signature-box, .date-box {
            text-align: center;
          }
          .signature-img {
            max-width: 150px;
            height: auto;
            margin-bottom: -10px;
          }
          .signature-line {
            border-top: 1px solid #aaa;
            width: 180px;
            margin-top: 5px;
            padding-top: 5px;
            font-size: 14px;
            color: #666;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="certificate-container">
          
          <!-- Logo de l'école -->
          <img src="/logo.png" alt="Logo" class="header-logo" onerror="this.style.display='none'" />
          
          <div class="title">Certificat de Réussite</div>
          <div class="subtitle">Académie d'Onglerie & Beauté</div>

          <p class="recipient-text">Ce présent certificat est attribué à :</p>
          
          <div class="student-name">${student.nom || student.name}</div>

          <p class="description">
            Pour avoir démontré un haut niveau de compétence et avoir complété avec succès l'ensemble du programme de formation professionnelle en <strong>Stylisme Ongulaire</strong>.
          </p>

          <!-- ✍️ SIGNATURE ET DATE -->
          <div class="footer-section">
            <div class="date-box">
              <p style="font-size: 14px; color: #555;">Délivré le : <strong>${today}</strong></p>
            </div>

            <div class="signature-box">
              <img src="/signature.png" alt="Signature" class="signature-img" onerror="this.style.display='none'" />
              <div class="signature-line">La Formatrice / Fondatrice</div>
            </div>
          </div>

        </div>
      </body>
    </html>
  `);

    // 3️⃣ Finalisation de l'écriture et lancement de l'impression
    printWindow.document.close();

    // On attend un court délai (500ms) pour laisser le temps aux images de charger avant de lancer l'impression
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };
  // ✏️ Enregistrement des modifications d'informations personnelles
  const handleUpdateStudentInfos = async (e) => {
    e.preventDefault();
    if (!editForm.nom) {
      alert("Veuillez saisir un nom valide.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `/api/auth/admin/students/${selectedStudent._id}/profile`,
        {
          nom: editForm.nom,
          telephone: editForm.telephone,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success || response.status === 200) {
        alert("✏️ Informations de l'étudiante mises à jour avec succès !");

        const updated = {
          ...selectedStudent,
          nom: editForm.nom,
          telephone: editForm.telephone,
        };

        // Synchronisation React
        setSelectedStudent(updated);
        setStudents((prev) =>
          prev.map((s) => (s._id === selectedStudent._id ? updated : s)),
        );

        setIsModalOpen(false); // Ferme la boîte de dialogue
      }
    } catch (error) {
      console.error("Erreur lors de la modification des infos :", error);
      alert(
        error.response?.data?.message ||
          "Erreur lors de la mise à jour des informations.",
      );
    }
  };

  return (
    // Fond global très sombre comme sur ta maquette
    <div className="flex h-screen bg-[#141414] text-neutral-800 font-sans overflow-hidden">
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
      />

      {/* 2. ZONE DE CONTENU PRINCIPALE */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#fbf9f6]">
        {/* AJOUT : BARRE SUPÉRIEURE (HEADER) */}
        <AdminHeader
          onNavigateTab={(tab) => setActiveTab(tab)}
          pendingHomeworksCount={pendingHomeworks?.length || 0}
          adminPhotoUrl={adminPhoto}
        />

        {/* Exemple de structure correcte autour de la ligne 990-1000 */}
        <main className="flex-1 p-8 overflow-y-auto">
          {activeTab === "overview" && (
            <AdminOverview
              students={students}
              courses={allCourses} // On utilise la variable allCourses que tu as déclarée
              pendingHomeworks={pendingHomeworks} // On passe un tableau vide en attendant que tu gères les devoirs
              onNavigateTab={(tabKey) => setActiveTab(tabKey)}
            />
          )}

          {/* 🟢 AJOUTE CETTE LIGNE POUR L'ONGLET TEACHERS */}
          {activeTab === "teachers" && <AdminTeachers />}
          {/* 📜 Validation & Gestion des Certificats */}
          {activeTab === "certificates" && <AdminCertificatesManager />}
          {/* 📚 Gestion des Cours */}
          {activeTab === "courses" && <CoursesManager />}
          {/* 📝 Espace Devoirs */}
          {activeTab === "homework" && <AssignmentsManager />}
          {/* ✔️ Correction des Devoirs */}
          {activeTab === "corrections" && <GradingManager />}

          {/* 💬 Questions & Chat (AVEC LES ÉLÈVES ET FORMATEURS) */}
          {activeTab === "messages" && <AdminChat />}

          {activeTab === "analytics" && <AnalyticsDashboard />}

          {/* ⚙️ Configuration / Paramètres */}
          {activeTab === "settings" && <AdminSettings />}

          {activeTab === "students" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-neutral-900">
                    Gestion des Étudiantes
                  </h2>
                  <p className="text-sm text-neutral-500">
                    Suivez le parcours, la progression, les rendus et le suivi
                    des paiements de vos élèves.
                  </p>
                </div>
                {/* Barre de recherche */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Rechercher une étudiante..."
                    className="px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#d97736]"
                  />
                  <button className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-800">
                    Filtrer
                  </button>
                </div>
              </div>

              {/* Table complète */}
              <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
                {loadingStudents ? (
                  <div className="p-12 text-center text-sm text-neutral-400">
                    Chargement des étudiantes...
                  </div>
                ) : students.length === 0 ? (
                  <div className="p-12 text-center text-sm text-neutral-400">
                    Aucune étudiante inscrite pour le moment.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-400 text-xs font-bold uppercase tracking-wider">
                        <th className="p-4 pl-6">Étudiante</th>
                        <th className="p-4">Filière / Spécialité</th>
                        <th className="p-4">Progression</th>
                        <th className="p-4">Prix Payé / Total</th>
                        <th className="p-4">Statut Financier</th>
                        <th className="p-4 text-right pr-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-neutral-600 divide-y divide-neutral-50">
                      {students.map((student) => {
                        // 🟢 1. Récupération unifiée de la date (compatibilité paymentDeadline & dueDate)
                        const studentDeadline =
                          student.dueDate || student.paymentDeadline;

                        // 🟢 2. Calcul du reste à payer
                        const resteAPayer =
                          (student.totalPrice || 1000) -
                          (student.pricePaid || 0);

                        let financeStatut = "En cours";
                        if (student.pricePaid === 0) financeStatut = "Impayé";
                        else if (resteAPayer <= 0) financeStatut = "Payé";

                        // 🟢 3. Vérification dynamique du dépassement du délai
                        const estDelaiDepasse =
                          studentDeadline &&
                          new Date(studentDeadline) < new Date() &&
                          resteAPayer > 0;

                        // 🟢 4. Détermination de l'état réel de blocage :
                        // Est bloqué si : Bloqué manuellement (isBlocked) OU (Délai dépassé ET NON débloqué manuellement)
                        const estBloque =
                          student.isBlocked ||
                          (estDelaiDepasse && !student.isManuallyUnblocked);

                        // 🟢 5. Progression
                        const progressVal =
                          student.globalProgress ??
                          student.progression ??
                          student.progress ??
                          0;
                        const progressionString = `${progressVal}%`;

                        // 🛠️ Styles & textes du Bouton de Statut Financier
                        let statusButtonStyles =
                          "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
                        let statusButtonText = "🟠 En cours (Tranche)";
                        let isButtonDisabled = false;

                        if (financeStatut === "Payé") {
                          statusButtonStyles =
                            "bg-green-50 text-green-700 border-green-200 cursor-not-allowed opacity-80";
                          statusButtonText = "✅ Payé";
                          isButtonDisabled = true;
                        } else if (estBloque) {
                          statusButtonStyles =
                            "bg-red-50 text-red-700 border-red-300 font-bold animate-pulse hover:bg-red-100";
                          statusButtonText = "🔒 Compte Bloqué";
                        } else if (financeStatut === "Impayé") {
                          statusButtonStyles =
                            "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100";
                          statusButtonText = "🔴 Impayé (0 DH)";
                        }

                        // 🛠️ Styles & textes du Mini-badge sous le nom
                        let accessBadgeText = "✅ Accès autorisé";
                        let accessBadgeStyles =
                          "text-green-600 bg-green-50 border-green-100 font-medium";

                        if (student.pricePaid === 0) {
                          accessBadgeText = "⏳ En attente d'approbation";
                          accessBadgeStyles =
                            "text-amber-600 bg-amber-50 border-amber-100 font-medium";
                        } else if (estBloque) {
                          accessBadgeText = "❌ Accès bloqué (Délai dépassé)";
                          accessBadgeStyles =
                            "text-red-600 bg-red-50 border-red-100 font-bold animate-pulse";
                        } else if (student.isManuallyUnblocked) {
                          accessBadgeText = "🔓 Accès débloqué (Manuel)";
                          accessBadgeStyles =
                            "text-blue-600 bg-blue-50 border-blue-100 font-semibold";
                        }

                        return (
                          <tr
                            key={student._id}
                            className="hover:bg-neutral-50/40 transition-colors"
                          >
                            {/* 1. Nom + Email + Badge d'accès */}
                            <td className="p-4 pl-6">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-neutral-100 font-bold text-xs text-neutral-700 flex items-center justify-center uppercase shrink-0">
                                  {student.nom ? student.nom[0] : "E"}
                                </div>
                                <div>
                                  <span className="font-semibold text-neutral-800 block">
                                    {student.nom}
                                  </span>
                                  <span className="text-[10px] text-neutral-400 block -mt-0.5 mb-1">
                                    {student.email}
                                  </span>

                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border ${accessBadgeStyles}`}
                                  >
                                    {accessBadgeText}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* 2. Cours débloqués */}
                            <td className="p-4">
                              {student.allowedCourses &&
                              student.allowedCourses.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {student.allowedCourses.map(
                                    (course, cIdx) => (
                                      <span
                                        key={cIdx}
                                        className="text-[11px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md"
                                      >
                                        {course.title || "Cours lié"}
                                      </span>
                                    ),
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-neutral-400 italic">
                                  Aucun cours débloqué
                                </span>
                              )}
                            </td>

                            {/* 3. Progression */}
                            <td className="p-4">
                              <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden max-w-25 inline-block mr-2 align-middle">
                                <div
                                  className="bg-[#d97736] h-full"
                                  style={{ width: progressionString }}
                                ></div>
                              </div>
                              <span className="text-xs font-bold text-neutral-700 align-middle">
                                {progressionString}
                              </span>
                            </td>

                            {/* 4. Prix Payé / Total */}
                            <td className="p-4 font-medium text-neutral-800">
                              {student.pricePaid} DH{" "}
                              <span className="text-neutral-400 text-xs">
                                / {student.totalPrice || 1000} DH
                              </span>
                            </td>

                            {/* 5. Statut Financier */}
                            <td className="p-4">
                              <button
                                disabled={isButtonDisabled}
                                onClick={() => handlePaymentClick(student)}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-200 flex items-center gap-1 shadow-sm ${statusButtonStyles}`}
                                title={
                                  isButtonDisabled
                                    ? "Paiement totalement réglé"
                                    : "Cliquer pour encaisser une tranche ou solder"
                                }
                              >
                                {statusButtonText}
                              </button>
                            </td>

                            {/* 6. Actions */}
                            <td className="py-4 text-right pr-4 space-x-3">
                              <button
                                onClick={() => handleCoursesClick(student)}
                                className="text-neutral-400 hover:text-neutral-700 transition-colors inline-block p-1"
                                title="Inspecter, progression & débloquer l'étudiant"
                              >
                                👁️
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setEditForm({
                                    nom: student.nom || "",
                                    telephone: student.telephone || "",
                                    email: student.email || "",
                                  });
                                  setModalType("edit-profile"); // 👈 Ouvre le mode PROFIL
                                  setIsModalOpen(true);
                                }}
                                className="text-neutral-400 hover:text-amber-600 transition-colors p-1"
                                title="Modifier le profil"
                              >
                                ✏️
                              </button>

                              {/* Bouton Certificat */}
                              <button
                                className="btn-certificat"
                                onClick={() =>
                                  handleDownloadCertificate(student)
                                }
                                title="Générer / Télécharger le certificat"
                              >
                                🎓 Certificat
                              </button>

                              <button
                                onClick={() => handleDeleteClick(student._id)}
                                className="text-neutral-400 hover:text-red-600 transition-colors inline-block p-1"
                                title="Supprimer définitivement"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL DE SUIVI ET D'ÉDITION */}
      {isModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden border border-neutral-100">
            {/* Header de la Modal */}
            <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-neutral-800">
                {modalType === "view"
                  ? `📊 Suivi de ${selectedStudent.nom}`
                  : `✏️ Modifier le profil & Paiements`}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 font-bold text-xl"
              >
                &times;
              </button>
            </div>

            {/* Contenu de la Modal */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* CAS 1 : MODE VISUALISATION (L'ŒIL 👁️) */}
              {/* CAS 1 : MODE VISUALISATION (L'ŒIL 👁️) - VERSION ÉPURÉE */}
              {isModalOpen && modalType === "view" && selectedStudent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-xl border border-neutral-100 max-h-[85vh] overflow-y-auto relative">
                    {/* Bouton Fermer */}
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 text-xl transition-colors"
                    >
                      ✕
                    </button>

                    {/* En-tête */}
                    <div className="border-b border-neutral-100 pb-4 mb-5">
                      <h3 className="text-lg font-bold text-neutral-900">
                        📊 Fiche Élève & Contrôle d'accès
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {selectedStudent.nom} — {selectedStudent.email}
                      </p>
                    </div>

                    <div className="space-y-6">
                      {/* 🔴 / 🟢 1. CARTE DE DÉBLOCAGE / BLOCAGE DE L'ÉTUDIANT */}
                      {(() => {
                        const reste =
                          (selectedStudent.totalPrice || 1000) -
                          selectedStudent.pricePaid;
                        const estDelaiDepasse =
                          selectedStudent.dueDate &&
                          new Date(selectedStudent.dueDate) < new Date() &&
                          reste > 0;
                        const estBloqueActuellement =
                          selectedStudent.isBlocked ||
                          (estDelaiDepasse &&
                            selectedStudent.isManuallyUnblocked !== true);

                        return (
                          <div
                            className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                              estBloqueActuellement
                                ? "bg-red-50/80 border-red-200"
                                : "bg-green-50/80 border-green-200"
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-base">
                                  {estBloqueActuellement ? "🔒" : "🟢"}
                                </span>
                                <h4
                                  className={`text-sm font-bold ${estBloqueActuellement ? "text-red-800" : "text-green-800"}`}
                                >
                                  {estBloqueActuellement
                                    ? "Accès Plateforme Bloqué"
                                    : "Accès Plateforme Actif"}
                                </h4>
                              </div>
                              <p className="text-xs text-neutral-600 mt-1">
                                {estBloqueActuellement
                                  ? "L'étudiant ne peut plus accéder à ses cours (Délai de paiement dépassé ou blocage manuel)."
                                  : "L'étudiant a un accès normal à son espace de formation."}
                              </p>
                            </div>

                            {/* BOUTON D'ACTION DÉBLOQUER / BLOQUER */}
                            {estBloqueActuellement ? (
                              <button
                                onClick={() => toggleStudentBlockStatus(false)}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-sm shrink-0 transition-colors flex items-center gap-1.5 ml-2"
                              >
                                🔓 Débloquer l'élève
                              </button>
                            ) : (
                              <button
                                onClick={() => toggleStudentBlockStatus(true)}
                                className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs rounded-xl shrink-0 transition-colors ml-2"
                              >
                                🔒 Bloquer l'accès
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      {/* 💵 2. RÉSUMÉ FINANCIER & DÉLAI */}
                      <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 space-y-2">
                        <h4 className="font-bold text-neutral-800 text-xs uppercase tracking-wider mb-2">
                          💰 Situation Financière
                        </h4>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-neutral-500 block">
                              Paiement effectué :
                            </span>
                            <span className="font-bold text-green-700 text-sm">
                              {selectedStudent.pricePaid} DH
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block">
                              Reste à solder :
                            </span>
                            <span className="font-bold text-amber-600 text-sm">
                              {(selectedStudent.totalPrice || 1000) -
                                selectedStudent.pricePaid}{" "}
                              DH
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block">
                              Date limite :
                            </span>
                            <span className="font-semibold text-neutral-700 text-xs">
                              {selectedStudent.dueDate
                                ? new Date(
                                    selectedStudent.dueDate,
                                  ).toLocaleDateString()
                                : "Aucun délai"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 📋 3. INFOS RAPIDES D'ORIGINE */}
                      <div className="grid grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-lg text-sm text-neutral-600 border border-neutral-100">
                        <div>
                          <span className="font-semibold text-neutral-800">
                            📧 Email :
                          </span>{" "}
                          {selectedStudent.email}
                        </div>
                        <div>
                          <span className="font-semibold text-neutral-800">
                            📞 Téléphone :
                          </span>{" "}
                          {selectedStudent.telephone || "Non renseigné"}
                        </div>
                        <div>
                          <span className="font-semibold text-neutral-800">
                            🚦 Statut :
                          </span>{" "}
                          <span className="capitalize px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-xs font-medium">
                            {selectedStudent.status}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-neutral-800">
                            📅 Membre depuis :
                          </span>{" "}
                          {new Date(
                            selectedStudent.createdAt,
                          ).toLocaleDateString()}
                        </div>
                      </div>

                      {/* 📖 4. SUIVI PÉDAGOGIQUE */}
                      <div>
                        <h4 className="font-bold text-neutral-700 mb-2 text-sm uppercase tracking-wider">
                          📖 Progression & Cours
                        </h4>
                        <div className="border border-neutral-200 rounded-lg p-4 bg-white space-y-3">
                          <p className="text-sm text-neutral-600">
                            <span className="font-medium text-neutral-800">
                              🎬 Dernier cours consulté :
                            </span>{" "}
                            {selectedStudent.lastAccessedCourse
                              ? "Module en cours..."
                              : "Aucun cours consulté pour le moment"}
                          </p>
                          <p className="text-sm text-neutral-600">
                            <span className="font-medium text-neutral-800">
                              🔑 Nombre de modules débloqués :
                            </span>{" "}
                            {selectedStudent.allowedCourses?.length || 0}{" "}
                            module(s)
                          </p>
                        </div>
                      </div>

                      {/* 🔒 5. CASES À COCHER POUR GÉRER L'ACCÈS AUX COURS */}
                      <div>
                        <h4 className="font-bold text-neutral-700 mb-2 text-sm uppercase tracking-wider">
                          🔒 Gérer les accès aux cours
                        </h4>
                        <div className="border border-neutral-200 rounded-lg p-4 bg-white space-y-2 max-h-48 overflow-y-auto">
                          {allCourses.length === 0 ? (
                            <p className="text-xs text-neutral-400 italic">
                              Aucun cours trouvé dans la base de données.
                            </p>
                          ) : (
                            allCourses.map((course) => {
                              const isAccessible =
                                selectedStudent.allowedCourses?.includes(
                                  course._id,
                                );

                              return (
                                <label
                                  key={course._id}
                                  className="flex items-center space-x-3 text-sm text-neutral-700 cursor-pointer p-1.5 hover:bg-neutral-50 rounded transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isAccessible || false}
                                    onChange={(e) =>
                                      handleToggleCourseAccess(
                                        course._id,
                                        e.target.checked,
                                      )
                                    }
                                    className="w-4 h-4 rounded border-neutral-300 text-neutral-800 focus:ring-neutral-500"
                                  />
                                  <span>{course.title || course.name}</span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* 🎓 6. CLÔTURE DE FORMATION */}
                      {selectedStudent.status !== "completed" ? (
                        <div className="pt-2">
                          <button
                            onClick={handleCompleteFormation}
                            className="w-full bg-neutral-800 hover:bg-neutral-900 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors shadow-sm"
                          >
                            🎓 Valider et Clôturer la formation (Étudiante
                            diplômée)
                          </button>
                        </div>
                      ) : (
                        <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm text-center font-medium">
                          🎉 Formation complétée avec succès ! L'étudiante a
                          terminé son cursus.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
    1️⃣ CRAYON ✏️ : MODALE INFORMATIONS PERSONNELLES
   ------------------------------------------------------------- */}
              {modalType === "edit-profile" && (
                <div className="space-y-6">
                  <form
                    onSubmit={handleUpdateStudentInfos}
                    className="space-y-4"
                  >
                    <h4 className="font-bold text-neutral-700 text-sm uppercase tracking-wider">
                      👤 Informations Personnelles
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Nom Complet */}
                      <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1">
                          Nom Complet
                        </label>
                        <input
                          type="text"
                          value={editForm.nom || editForm.name || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              nom: e.target.value,
                            })
                          }
                          className="w-full p-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-neutral-500"
                          placeholder="Ex: Jean Dupont"
                          required
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1">
                          Adresse Email
                        </label>
                        <input
                          type="email"
                          value={editForm.email || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              email: e.target.value,
                            })
                          }
                          className="w-full p-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-neutral-500"
                          placeholder="exemple@email.com"
                        />
                      </div>

                      {/* Téléphone */}
                      <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1">
                          Téléphone
                        </label>
                        <input
                          type="text"
                          value={editForm.telephone || editForm.phone || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              telephone: e.target.value,
                            })
                          }
                          className="w-full p-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-neutral-500"
                          placeholder="0600000000"
                        />
                      </div>

                      {/* Adresse */}
                      <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1">
                          Adresse
                        </label>
                        <input
                          type="text"
                          value={editForm.adresse || editForm.address || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              adresse: e.target.value,
                            })
                          }
                          className="w-full p-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-neutral-500"
                          placeholder="Ex: 123 Rue Principale"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="bg-neutral-800 text-white text-xs px-4 py-2 rounded-lg hover:bg-neutral-900 transition-colors font-semibold"
                      >
                        Enregistrer les modifications
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* -------------------------------------------------------------
    2️⃣ BOUTON STATUT FINANCIER : MODALE SUIVI DES PAIEMENTS
   ------------------------------------------------------------- */}
              {modalType === "edit" && selectedStudent && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-neutral-700 mb-3 text-sm uppercase tracking-wider">
                      💰 Suivi des Paiements
                    </h4>

                    {/* Tableau récapitulatif simple */}
                    <div className="bg-neutral-50 p-4 rounded-lg space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-neutral-600">
                          Total de la formation :
                        </span>
                        <span className="font-bold text-neutral-800">
                          {selectedStudent.totalPrice} €
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Déjà payé :</span>
                        <span className="font-bold text-green-600">
                          {selectedStudent.pricePaid} €
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-neutral-200 pt-2">
                        <span className="font-semibold text-neutral-700">
                          Reste à payer :
                        </span>
                        <span className="font-bold text-amber-600">
                          {selectedStudent.totalPrice -
                            selectedStudent.pricePaid}{" "}
                          €
                        </span>
                      </div>

                      {/* Affichage intelligent du Délai de paiement */}
                      {selectedStudent.totalPrice - selectedStudent.pricePaid >
                        0 && (
                        <div className="flex justify-between border-t border-dashed border-neutral-200 pt-2 text-xs">
                          <span className="text-neutral-500">
                            Date limite du prochain versement :
                          </span>
                          <span
                            className={`font-semibold ${
                              selectedStudent.dueDate &&
                              new Date(selectedStudent.dueDate) < new Date()
                                ? "text-red-600 font-bold animate-pulse"
                                : "text-neutral-700"
                            }`}
                          >
                            {selectedStudent.dueDate
                              ? new Date(
                                  selectedStudent.dueDate,
                                ).toLocaleDateString()
                              : "Aucun délai fixé"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions de Paiement adaptées selon le solde restant */}
                    {selectedStudent.totalPrice - selectedStudent.pricePaid >
                    0 ? (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const montant = window.prompt(
                                "Entrez le montant de la tranche reçu (€) :",
                              );
                              if (montant) submitPayment(montant);
                            }}
                            className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold py-2 px-3 rounded-lg border border-neutral-300 transition-all"
                          >
                            💵 Enregistrer une tranche
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Confirmer le paiement intégral du solde restant ?",
                                )
                              ) {
                                submitPayment(
                                  selectedStudent.totalPrice -
                                    selectedStudent.pricePaid,
                                );
                              }
                            }}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-all"
                          >
                            ⚡ Solder la totalité
                          </button>
                        </div>

                        {/* Configuration manuelle du délai par l'admin */}
                        <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                          <label className="block text-xs font-semibold text-neutral-600 mb-1">
                            📅 Fixer/Modifier la date limite de paiement :
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="date"
                              value={
                                newDeadline ||
                                (selectedStudent?.dueDate
                                  ? selectedStudent.dueDate.split("T")[0]
                                  : selectedStudent?.paymentDeadline
                                    ? selectedStudent.paymentDeadline.split(
                                        "T",
                                      )[0]
                                    : "")
                              }
                              onChange={(e) => setNewDeadline(e.target.value)}
                              className="w-full p-1.5 bg-white border border-neutral-300 rounded text-xs focus:outline-none focus:border-neutral-500"
                            />
                            <button
                              type="button"
                              onClick={handleUpdateDeadline}
                              className="bg-neutral-800 text-white text-xs px-3 py-1.5 rounded font-medium hover:bg-neutral-900 transition-colors shrink-0"
                            >
                              Enregistrer
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-xs font-semibold text-center">
                        🎉 Formation entièrement réglée ! L'accès aux cours est
                        définitivement sécurisé.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
