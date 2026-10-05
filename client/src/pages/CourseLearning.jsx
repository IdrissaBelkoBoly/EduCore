import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import LearningSpace from "../components/LearningSpace";

// Fonction utilitaire pour récupérer le token
const getToken = () => {
  let token = localStorage.getItem("token");
  if (token) return token;
  try {
    const userObj = JSON.parse(
      localStorage.getItem("user") || localStorage.getItem("userInfo") || "{}",
    );
    if (userObj?.token) return userObj.token;
  } catch (e) {
    console.error("Erreur de lecture du token :", e);
  }
  return null;
};

const CourseLearning = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingProgress, setSavingProgress] = useState(false);

  // 💬 Modale Question
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [sendingQuestion, setSendingQuestion] = useState(false);

  // 🎙️ Enregistrement Audio Vocal
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // 📝 Modale Devoir
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [homeworkFile, setHomeworkFile] = useState(null);
  const [homeworkComment, setHomeworkComment] = useState("");
  const [uploadingHomework, setUploadingHomework] = useState(false);

  // Chargement des détails du cours et de la progression
  useEffect(() => {
    const fetchCourseAndProgress = async () => {
      try {
        setLoading(true);
        const token = getToken();
        const config = { headers: { Authorization: `Bearer ${token}` } };

        // 1. Récupération des détails du cours
        const courseRes = await axios.get(
          `http://localhost:5000/api/courses/${courseId}`,
          config,
        );
        const fetchedCourse =
          courseRes.data.course || courseRes.data.data || courseRes.data;
        setCourse(fetchedCourse);

        // 2. Récupération de la progression
        const progressRes = await axios
          .get(`http://localhost:5000/api/progress/${courseId}`, config)
          .catch(() => null);

        if (progressRes?.data) {
          const steps =
            progressRes.data.completedSteps ||
            progressRes.data.completedLessons ||
            (progressRes.data.data && progressRes.data.data.completedSteps) ||
            [];
          setCompletedSteps(steps);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des données du cours :", err);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourseAndProgress();
    } else {
      setLoading(false);
    }
  }, [courseId]);

  // 🟢 Validation d'une étape / leçon (Restaurée)
  const handleToggleComplete = async () => {
    if (savingProgress) return;

    const stepsList = course?.steps || course?.lessons || course?.modules || [];
    const currentStep = stepsList[activeStepIndex];
    const stepId = currentStep?._id || currentStep?.id || courseId;

    if (!stepId) {
      console.error("Identifiant d'étape introuvable.");
      return;
    }

    setSavingProgress(true);

    try {
      const token = getToken();
      const currentCategory = (course?.category || "").toLowerCase();

      let statisticsUpdate = { theorie: 100 };
      if (currentCategory === "base" || currentCategory === "rallongement") {
        statisticsUpdate.pratique = 100;
      } else if (currentCategory === "nail art") {
        statisticsUpdate.nailArt = 100;
      } else if (currentCategory === "dépose") {
        statisticsUpdate.precision = 100;
      }

      const res = await axios.put(
        `http://localhost:5000/api/progress/${courseId}/step`,
        { stepId, lessonId: stepId, statisticsUpdate },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data?.success && res.data?.data) {
        setCompletedSteps(res.data.data.completedSteps || []);
      } else if (res.data?.completedSteps) {
        setCompletedSteps(res.data.completedSteps);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la progression :", error);
    } finally {
      setSavingProgress(false);
    }
  };

  // 🎙️ Fonctions pour l'enregistrement Audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert("Micro inaccessible ou permission refusée.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  const resetAudio = () => {
    setAudioBlob(null);
    setAudioUrl(null);
  };

  // 💬 Envoi de la question au formateur (Texte ou Vocal)
  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!questionText.trim() && !audioBlob) {
      alert("Veuillez saisir votre question ou enregistrer un message vocal.");
      return;
    }

    const stepsList = course?.steps || course?.lessons || course?.modules || [];
    const currentStep = stepsList[activeStepIndex];

    setSendingQuestion(true);
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append("courseId", courseId);
      formData.append(
        "stepTitle",
        currentStep?.title || `Module ${activeStepIndex + 1}`,
      );
      formData.append("question", questionText);

      if (audioBlob) {
        formData.append("file", audioBlob, "question-vocal.webm");
      }

      const res = await axios.post(
        "http://localhost:5000/api/chat/question",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (res.status === 200 || res.status === 201 || res.data?.success) {
        alert("Votre question a été transmise à la formatrice ! 💬");
        setShowQuestionModal(false);
        setQuestionText("");
        resetAudio();
      } else {
        alert(res.data?.message || "Erreur lors de l'envoi de la question.");
      }
    } catch (err) {
      console.error("Erreur lors de l'envoi de la question :", err);
      alert("Erreur de connexion lors de l'envoi de votre question.");
    } finally {
      setSendingQuestion(false);
    }
  };

  // 📝 Soumission de devoir (Photo / Vidéo)
  const handleHomeworkSubmit = async (e) => {
    e.preventDefault();
    if (!homeworkFile) {
      alert("Veuillez sélectionner un fichier (photo ou vidéo).");
      return;
    }

    setUploadingHomework(true);
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append("courseId", courseId);
      formData.append("file", homeworkFile);
      formData.append("comment", homeworkComment);

      const res = await axios.post(
        "http://localhost:5000/api/homework/submit",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (res.status === 200 || res.data?.success) {
        alert("Devoir soumis avec succès ! L'administratrice va le corriger.");
        setShowHomeworkModal(false);
        setHomeworkFile(null);
        setHomeworkComment("");
        await handleToggleComplete();
      } else {
        alert(res.data?.message || "Erreur lors de l'envoi du devoir.");
      }
    } catch (err) {
      console.error("Erreur lors de l'envoi du devoir :", err);
      alert("Erreur de connexion lors de l'envoi du devoir.");
    } finally {
      setUploadingHomework(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0]">
        <p className="text-[#C48F7A] font-bold text-lg animate-pulse">
          Ouverture de votre espace d'apprentissage... 🌸
        </p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF6F0] p-4 text-center">
        <p className="text-red-500 font-bold mb-4">
          Cours introuvable ou erreur de chargement.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-4 py-2 bg-[#C48F7A] text-white text-xs font-semibold rounded-xl hover:bg-[#b07b66] transition cursor-pointer"
        >
          Retour au Tableau de Bord
        </button>
      </div>
    );
  }

  return (
    <LearningSpace
      course={course}
      completedSteps={completedSteps}
      activeStepIndex={activeStepIndex}
      setActiveStepIndex={setActiveStepIndex}
      savingProgress={savingProgress}
      onToggleComplete={handleToggleComplete}
      // Modale Devoir
      showHomeworkModal={showHomeworkModal}
      setShowHomeworkModal={setShowHomeworkModal}
      homeworkFile={homeworkFile}
      setHomeworkFile={setHomeworkFile}
      homeworkComment={homeworkComment}
      setHomeworkComment={setHomeworkComment}
      uploadingHomework={uploadingHomework}
      onHomeworkSubmit={handleHomeworkSubmit}
      // 💬 Modale Question & Audio
      showQuestionModal={showQuestionModal}
      setShowQuestionModal={setShowQuestionModal}
      questionText={questionText}
      setQuestionText={setQuestionText}
      sendingQuestion={sendingQuestion}
      onQuestionSubmit={handleQuestionSubmit}
      isRecording={isRecording}
      audioUrl={audioUrl}
      audioBlob={audioBlob}
      startRecording={startRecording}
      stopRecording={stopRecording}
      resetAudio={resetAudio}
      onBack={() => navigate("/dashboard")}
    />
  );
};

export default CourseLearning;
