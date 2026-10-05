import React, { useState, useEffect } from "react";
import axios from "axios";

import StudentSidebar from "../components/student/StudentSidebar";
import OverviewTab from "../components/student/OverviewTab";
import CoursesTab from "../components/student/CoursesTab";
import HomeworksTab from "../components/student/HomeworksTab";
import CorrectionsTab from "../components/student/CorrectionsTab";
import CertificatesTab from "../components/student/CertificatesTab";
import ProfileTab from "../components/student/ProfileTab";
import SubmitHomeworkModal from "../components/student/SubmitHomeworkModal";
import StudentChat from "../components/student/StudentChat.jsx";

const getToken = () => {
  const token = localStorage.getItem("token");
  if (token) return token;
  try {
    const userObj = JSON.parse(
      localStorage.getItem("user") || localStorage.getItem("userInfo") || "{}",
    );
    if (userObj?.token) return userObj.token;
  } catch (e) {
    console.error("Erreur lecture token local:", e);
  }
  return null;
};

// 🟢 Onglets valides acceptés par le composant
const VALID_TABS = [
  "overview",
  "courses",
  "homeworks",
  "corrections",
  "certificates",
  "chat",
  "profile",
];

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [studentInfo, setStudentInfo] = useState(null);
  const [courses, setCourses] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [userProgress, setUserProgress] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [moduleValidations, setModuleValidations] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState([]);
  const [dbNotifications, setDbNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHomework, setSelectedHomework] = useState(null);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // Appels API simultanés sécurisés
      const [
        profileRes,
        coursesRes,
        hwRes,
        assignmentsRes,
        progressRes,
        chatRes,
        notifRes,
        certRes,
      ] = await Promise.all([
        axios
          .get("http://localhost:5000/api/users/me", config)
          .catch(() => null),
        axios
          .get("http://localhost:5000/api/courses", config)
          .catch(() => null),
        axios
          .get("http://localhost:5000/api/submissions/my-submissions", config)
          .catch(() => null),
        axios
          .get("http://localhost:5000/api/assignments", config)
          .catch(() => null),
        axios
          .get("http://localhost:5000/api/progress/my-progress", config)
          .catch(() => null),
        axios.get("http://localhost:5000/api/chat", config).catch(() => null),
        axios
          .get("http://localhost:5000/api/notifications", config)
          .catch(() => null),
        axios
          .get("http://localhost:5000/api/certificates/my-certificates", config)
          .catch(() => null),
      ]);

      // 1. Profil Utilisateur
      let currentStudent = null;
      if (profileRes?.data?.data) {
        currentStudent = profileRes.data.data;
      } else if (profileRes?.data?.user) {
        currentStudent = profileRes.data.user;
      } else if (profileRes?.data) {
        currentStudent = profileRes.data;
      }
      setStudentInfo(currentStudent);

      // 2. Liste des cours
      const fetchedCourses = coursesRes?.data
        ? Array.isArray(coursesRes.data)
          ? coursesRes.data
          : coursesRes.data.data || coursesRes.data.courses || []
        : [];
      setCourses(fetchedCourses);

      // 3. Soumissions de devoirs
      if (hwRes?.data) {
        setHomeworks(
          Array.isArray(hwRes.data)
            ? hwRes.data
            : hwRes.data.submissions || hwRes.data.data || [],
        );
      }

      // 4. Consignes devoirs
      if (assignmentsRes?.data) {
        setAssignments(
          Array.isArray(assignmentsRes.data)
            ? assignmentsRes.data
            : assignmentsRes.data.data || [],
        );
      }

      // 5. Progression (Leçons validées)
      if (progressRes?.data) {
        setUserProgress(
          Array.isArray(progressRes.data)
            ? progressRes.data
            : progressRes.data.data || progressRes.data.progress || [],
        );
      }

      // 6. Certificats & Encouragements / Recommandations
      if (certRes?.data) {
        const certData = certRes.data.data || certRes.data;

        if (Array.isArray(certData)) {
          setCertificates(certData);
          setModuleValidations(certData);
        } else {
          setCertificates(
            certData.certificates || certData.finalCertificates || [],
          );

          // Extraction brute
          const rawValidations =
            certData.moduleValidations ||
            certData.encouragements ||
            certData.recommendations ||
            certData.recommendedCertificates ||
            currentStudent?.recommendedCertificates ||
            [];

          // Formatage et correspondance avec la liste des cours si besoin
          const formattedValidations = rawValidations.map((item) => {
            if (typeof item === "object" && item !== null) {
              const courseObj =
                typeof item.course === "object"
                  ? item.course
                  : fetchedCourses.find(
                      (c) => c._id === item.course || c._id === item.courseId,
                    );

              const courseTitle =
                item.courseTitle ||
                courseObj?.title ||
                courseObj?.titre ||
                item.title ||
                item.titre ||
                "Module Validé";

              const message =
                item.customMessage ||
                item.encouragementMessage ||
                item.message ||
                item.congratulationsMessage ||
                "Félicitations ! Votre formateur a validé votre parcours sur ce module et recommande l'attribution de votre attestation.";

              return {
                _id: item._id || item.course?._id || item.courseId,
                courseTitle,
                message,
                approvedAt:
                  item.approvedAt ||
                  item.createdAt ||
                  item.updatedAt ||
                  item.recommendedAt,
              };
            }

            const foundCourse = fetchedCourses.find((c) => c._id === item);
            return {
              _id: item,
              courseTitle: foundCourse
                ? foundCourse.title
                : "Module Recommandé",
              message:
                "Félicitations ! Votre formateur a validé votre parcours sur ce module et recommande l'attribution de votre attestation.",
              approvedAt: null,
            };
          });

          setModuleValidations(formattedValidations);
        }
      }

      // 7. Messages non lus
      if (chatRes?.data) {
        const chatData = Array.isArray(chatRes.data)
          ? chatRes.data
          : chatRes.data.data || [];
        setUnreadMessages(
          chatData.filter((msg) => msg.senderRole === "teacher"),
        );
      }

      // 8. Notifications BDD
      if (notifRes?.data) {
        const notifData = Array.isArray(notifRes.data)
          ? notifRes.data
          : notifRes.data.data || [];
        setDbNotifications(notifData);
      }
    } catch (err) {
      console.error("Erreur globale de chargement des données étudiant :", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  // Action : Archiver/Masquer un devoir
  const handleArchiveSubmission = async (submissionId) => {
    try {
      const token = getToken();
      await axios.patch(
        `http://localhost:5000/api/submissions/my-submissions/${submissionId}/archive`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await fetchStudentData();
    } catch (err) {
      console.error("Erreur lors de l'archivage :", err);
      alert("Impossible d'archiver la soumission pour le moment.");
    }
  };

  // Action : Supprimer un devoir
  const handleDeleteSubmission = async (submissionId) => {
    try {
      const token = getToken();
      await axios.delete(
        `http://localhost:5000/api/submissions/my-submissions/${submissionId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await fetchStudentData();
    } catch (err) {
      console.error("Erreur lors de la suppression :", err);
      alert("Impossible de supprimer la soumission.");
    }
  };

  const formatUrl = (url) => {
    if (!url) return "";
    return url.startsWith("http") ? url : `http://localhost:5000${url}`;
  };

  // Traitement et normalisation des notifications
  const finalNotifications =
    dbNotifications.length > 0
      ? dbNotifications.map((n) => {
          let resolvedTab = n.targetTab;
          if (!VALID_TABS.includes(resolvedTab)) {
            const type = n.type?.toUpperCase() || "";
            if (type === "COURSE") resolvedTab = "courses";
            else if (type === "HOMEWORK") resolvedTab = "homeworks";
            else if (type === "CORRECTION") resolvedTab = "corrections";
            else if (type === "CHAT") resolvedTab = "chat";
            else if (type === "CERTIFICATE") resolvedTab = "certificates";
            else resolvedTab = "overview";
          }

          return {
            id: n._id,
            type: n.type?.toLowerCase() || "system",
            title: n.title,
            message: n.message,
            time: n.createdAt
              ? new Date(n.createdAt).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
              : "Récemment",
            read: n.isRead ?? n.read ?? false,
            targetTab: resolvedTab,
            icon:
              n.type === "COURSE"
                ? "📖"
                : n.type === "HOMEWORK"
                  ? "📝"
                  : n.type === "CORRECTION"
                    ? "✍️"
                    : n.type === "CHAT"
                      ? "💬"
                      : n.type === "CERTIFICATE"
                        ? "🎓"
                        : "🔔",
          };
        })
      : [
          ...courses.map((course) => ({
            id: `course-${course._id}`,
            type: "course",
            title: "Nouveau cours publié 📖",
            message: course.title || "Un nouveau module est disponible.",
            time: course.createdAt
              ? new Date(course.createdAt).toLocaleDateString("fr-FR")
              : "Récemment",
            read: false,
            targetTab: "courses",
            icon: "📖",
          })),
          ...assignments.map((assign) => ({
            id: `assign-${assign._id}`,
            type: "homework",
            title: "Nouveau devoir assigné 📝",
            message: assign.title || "Vous avez un travail à rendre.",
            time: assign.dueDate
              ? `Avant le ${new Date(assign.dueDate).toLocaleDateString("fr-FR")}`
              : "À rendre",
            read: false,
            targetTab: "homeworks",
            icon: "📝",
          })),
          ...homeworks
            .filter((hw) => hw.grade !== undefined || hw.feedback || hw.note)
            .map((hw) => ({
              id: `hw-${hw._id}`,
              type: "correction",
              title: "Devoir corrigé ✍️",
              message: `Note reçue : ${hw.grade || hw.note || "Note disponible"}`,
              time: "Récemment",
              read: false,
              targetTab: "corrections",
              icon: "✍️",
            })),
          ...unreadMessages.map((msg) => ({
            id: `msg-${msg._id}`,
            type: "chat",
            title: "Nouveau message 💬",
            message: msg.content || msg.text || "Vous avez reçu une réponse.",
            time: "Récemment",
            read: false,
            targetTab: "chat",
            icon: "💬",
          })),
        ];

  return (
    <div className="flex min-h-screen bg-[#faf8f5] text-neutral-800 font-sans">
      {/* 1. Navigation latérale */}
      <StudentSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        studentInfo={studentInfo}
        notificationsData={finalNotifications}
      />

      {/* 2. Zone de contenu principal */}
      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-neutral-400 text-sm">
            Chargement de vos données...
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <OverviewTab
                user={studentInfo}
                courses={courses}
                homeworks={homeworks}
                assignments={assignments}
                userProgress={userProgress}
                certificates={certificates}
                setActiveTab={setActiveTab}
                formatUrl={formatUrl}
              />
            )}
            {activeTab === "courses" && (
              <CoursesTab courses={courses} formatUrl={formatUrl} />
            )}
            {activeTab === "homeworks" && (
              <HomeworksTab
                assignments={assignments}
                homeworks={homeworks}
                setSelectedHomework={setSelectedHomework}
                onArchiveSubmission={handleArchiveSubmission}
                onDeleteSubmission={handleDeleteSubmission}
                formatUrl={formatUrl}
              />
            )}
            {activeTab === "corrections" && (
              <CorrectionsTab homeworks={homeworks} formatUrl={formatUrl} />
            )}
            {activeTab === "certificates" && (
              <CertificatesTab
                certificates={certificates}
                moduleValidations={moduleValidations}
                formatUrl={formatUrl}
              />
            )}
            {activeTab === "chat" && <StudentChat />}
            {activeTab === "profile" && (
              <ProfileTab studentInfo={studentInfo} />
            )}
          </>
        )}
      </main>

      {/* 3. Fenêtre modale globale de soumission */}
      {selectedHomework && (
        <SubmitHomeworkModal
          selectedHomework={selectedHomework}
          setSelectedHomework={setSelectedHomework}
          onSuccess={fetchStudentData}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
