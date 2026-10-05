import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const TeacherChat = () => {
  const [conversations, setConversations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hoveredStudentId, setHoveredStudentId] = useState(null);

  // Enregistreur Vocal
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchRecentConversations();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Recherche de tous les interlocuteurs (Élèves, Admins, Formateurs)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `http://localhost:5000/api/chat/contacts?search=${encodeURIComponent(
            searchTerm,
          )}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const data = res.data?.data || res.data;
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erreur lors de la recherche :", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Autoscroll vers le bas lors de l'arrivée d'un message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchRecentConversations = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/api/chat/recent", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data?.data || res.data;
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      fetchFallbackStudents();
    }
  };

  const fetchFallbackStudents = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/api/chat/contacts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.data || res.data;
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur chargement interlocuteurs :", err);
      setConversations([]);
    }
  };

  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `http://localhost:5000/api/chat/${student._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const messagesData = res.data?.data || res.data?.messages || res.data;
      setMessages(Array.isArray(messagesData) ? messagesData : []);
    } catch (err) {
      console.error("Erreur chargement messages :", err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (e, studentId) => {
    e.stopPropagation();

    if (
      !window.confirm(
        "Voulez-vous vraiment supprimer toute la discussion avec cet utilisateur ?",
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:5000/api/chat/conversation/${studentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setConversations((prev) => prev.filter((s) => s._id !== studentId));
      setSearchResults((prev) => prev.filter((s) => s._id !== studentId));

      if (selectedStudent?._id === studentId) {
        setSelectedStudent(null);
        setMessages([]);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de la suppression.");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const audioFile = new File([audioBlob], `vocal-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        await sendMediaMessage(audioFile, "audio");
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert("Impossible d'accéder au microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const sendMediaMessage = async (fileToUpload, forcedType = null) => {
    if (!selectedStudent || !fileToUpload) return;

    const formData = new FormData();
    formData.append("receiverId", selectedStudent._id);
    formData.append("file", fileToUpload);

    let type = forcedType;
    if (!type) {
      if (fileToUpload.type.startsWith("image/")) type = "image";
      else if (fileToUpload.type.startsWith("video/")) type = "video";
      else if (fileToUpload.type.startsWith("audio/")) type = "audio";
      else type = "file";
    }
    formData.append("messageType", type);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:5000/api/chat/send",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const savedMsg = res.data?.data || res.data;

      setMessages((prev) => [
        ...prev,
        {
          _id: savedMsg._id || Date.now(),
          sender: "me",
          text: "",
          mediaUrl: savedMsg.mediaUrl || URL.createObjectURL(fileToUpload),
          messageType: type,
          createdAt: savedMsg.createdAt || new Date().toISOString(),
        },
      ]);
      setSelectedFile(null);
    } catch (err) {
      console.error("Erreur envoi média :", err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (selectedFile) {
      await sendMediaMessage(selectedFile);
      return;
    }

    if (!newMessage.trim() || !selectedStudent) return;

    const textToSend = newMessage;
    setNewMessage("");

    try {
      const token = localStorage.getItem("token");
      const payload = {
        receiverId: selectedStudent._id,
        text: textToSend,
        messageType: "text",
      };

      const res = await axios.post(
        "http://localhost:5000/api/chat/send",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const savedMsg = res.data?.data || res.data;

      setMessages((prev) => [
        ...prev,
        {
          _id: savedMsg._id || Date.now(),
          sender: "me",
          text: textToSend,
          messageType: "text",
          createdAt: savedMsg.createdAt || new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error("Erreur envoi message :", err);
    }
  };

  // Badge visuel pour identifier le type d'utilisateur
  const renderRoleBadge = (role) => {
    if (role === "admin") {
      return (
        <span
          style={{
            backgroundColor: "#d32f2f",
            color: "#fff",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "0.7em",
            marginLeft: "6px",
          }}
        >
          Admin
        </span>
      );
    }
    if (role === "teacher") {
      return (
        <span
          style={{
            backgroundColor: "#1976d2",
            color: "#fff",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "0.7em",
            marginLeft: "6px",
          }}
        >
          Formateur
        </span>
      );
    }
    return (
      <span
        style={{
          backgroundColor: "#388e3c",
          color: "#fff",
          padding: "2px 6px",
          borderRadius: "4px",
          fontSize: "0.7em",
          marginLeft: "6px",
        }}
      >
        Élève
      </span>
    );
  };

  const displayedConversations = searchTerm.trim()
    ? searchResults
    : conversations;

  return (
    <div style={{ padding: "20px", height: "calc(100vh - 120px)" }}>
      <h2>💬 Questions & Chat</h2>

      <div
        style={{
          display: "flex",
          height: "85%",
          backgroundColor: "#fff",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          overflow: "hidden",
          border: "1px solid #eee",
        }}
      >
        {/* COLONNE GAUCHE - Liste des conversations */}
        <div
          style={{
            width: "320px",
            borderRight: "1px solid #eee",
            backgroundColor: "#fafafa",
          }}
        >
          <div style={{ padding: "15px" }}>
            <input
              type="text"
              placeholder="Rechercher un contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "20px",
                border: "1px solid #ccc",
                outline: "none",
              }}
            />
            {searching && (
              <small style={{ color: "#888", fontSize: "0.8em" }}>
                Recherche en cours...
              </small>
            )}
          </div>

          <div style={{ overflowY: "auto", height: "calc(100% - 75px)" }}>
            {displayedConversations.length > 0 ? (
              displayedConversations.map((student) => {
                const isSelected = selectedStudent?._id === student._id;
                const isHovered = hoveredStudentId === student._id;

                return (
                  <div
                    key={student._id}
                    onClick={() => handleSelectStudent(student)}
                    onMouseEnter={() => setHoveredStudentId(student._id)}
                    onMouseLeave={() => setHoveredStudentId(null)}
                    style={{
                      padding: "12px 15px",
                      cursor: "pointer",
                      backgroundColor: isSelected ? "#fce4ec" : "transparent",
                      borderLeft: isSelected
                        ? "4px solid #e91e63"
                        : "4px solid transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "background-color 0.2s",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "0.9em", color: "#333" }}>
                        {student.nom || student.email || "Utilisateur"}
                      </strong>
                      {renderRoleBadge(student.role)}
                    </div>

                    {(isHovered || isSelected) && (
                      <button
                        onClick={(e) =>
                          handleDeleteConversation(e, student._id)
                        }
                        title="Supprimer la conversation"
                        style={{
                          background: "none",
                          border: "none",
                          color: "#d32f2f",
                          cursor: "pointer",
                          fontSize: "1.1em",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div
                style={{ padding: "15px", textAlign: "center", color: "#888" }}
              >
                {searchTerm.trim()
                  ? "Aucun contact trouvé"
                  : "Aucune conversation récente"}
              </div>
            )}
          </div>
        </div>

        {/* COLONNE DROITE - Espace de conversation */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {selectedStudent ? (
            <>
              {/* Entête */}
              <div
                style={{
                  padding: "15px 20px",
                  borderBottom: "1px solid #eee",
                  fontWeight: "bold",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>
                  💬 Discussion avec{" "}
                  {selectedStudent.nom || selectedStudent.email}
                  {renderRoleBadge(selectedStudent.role)}
                </span>

                <button
                  onClick={(e) =>
                    handleDeleteConversation(e, selectedStudent._id)
                  }
                  style={{
                    backgroundColor: "#ffebee",
                    color: "#c62828",
                    border: "1px solid #ffcdd2",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "0.85em",
                    fontWeight: "600",
                  }}
                >
                  🗑️ Effacer la discussion
                </button>
              </div>

              {/* Zone d'affichage des messages */}
              <div
                style={{
                  flex: 1,
                  padding: "20px",
                  overflowY: "auto",
                  backgroundColor: "#fcfcfc",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {loading ? (
                  <div style={{ textAlign: "center", color: "#888" }}>
                    Chargement des messages...
                  </div>
                ) : (
                  Array.isArray(messages) &&
                  messages.map((msg) => {
                    const isMe = msg.sender === "me";
                    const isAudio = msg.messageType === "audio";

                    return (
                      <div
                        key={msg._id}
                        style={{
                          alignSelf: isMe ? "flex-end" : "flex-start",
                          maxWidth: "65%",
                          minWidth: isAudio ? "260px" : "auto",
                          marginBottom: "10px",
                        }}
                      >
                        <div
                          style={{
                            backgroundColor: isMe ? "#e91e63" : "#f1f3f5",
                            color: isMe ? "#fff" : "#333",
                            padding: "10px 14px",
                            borderRadius: "12px",
                            boxSizing: "border-box",
                          }}
                        >
                          {msg.text && (
                            <p style={{ margin: "0 0 6px 0" }}>{msg.text}</p>
                          )}

                          {msg.messageType === "image" && (
                            <img
                              src={msg.mediaUrl}
                              alt="Média"
                              style={{ maxWidth: "100%", borderRadius: "8px" }}
                            />
                          )}

                          {msg.messageType === "video" && (
                            <video
                              src={msg.mediaUrl}
                              controls
                              style={{ maxWidth: "100%", borderRadius: "8px" }}
                            />
                          )}

                          {isAudio && (
                            <div style={{ width: "100%", marginTop: "4px" }}>
                              <audio
                                src={msg.mediaUrl}
                                controls
                                style={{
                                  width: "100%",
                                  height: "40px",
                                  display: "block",
                                  borderRadius: "20px",
                                }}
                              />
                            </div>
                          )}

                          {msg.messageType === "file" && (
                            <a
                              href={msg.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: isMe ? "#fff" : "#007bff",
                                textDecoration: "underline",
                              }}
                            >
                              📄 Télécharger le document
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Zone de saisie */}
              <div style={{ padding: "15px", borderTop: "1px solid #eee" }}>
                {selectedFile && (
                  <div
                    style={{
                      padding: "8px",
                      backgroundColor: "#f0f0f0",
                      borderRadius: "6px",
                      marginBottom: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>📎 {selectedFile.name}</span>
                    <button
                      onClick={() => setSelectedFile(null)}
                      style={{
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        color: "red",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}

                <form
                  onSubmit={handleSendMessage}
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "1.3em",
                      cursor: "pointer",
                    }}
                  >
                    📎
                  </button>

                  <input
                    type="text"
                    placeholder="Message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={isRecording}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: "20px",
                      border: "1px solid #ccc",
                      outline: "none",
                    }}
                  />

                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      style={{
                        background: "#ff9800",
                        color: "#fff",
                        border: "none",
                        borderRadius: "50%",
                        width: "40px",
                        height: "40px",
                        cursor: "pointer",
                      }}
                    >
                      🎙️
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      style={{
                        background: "#f44336",
                        color: "#fff",
                        border: "none",
                        borderRadius: "20px",
                        padding: "0 15px",
                        height: "40px",
                        cursor: "pointer",
                      }}
                    >
                      ⏹️ Enregistrer ({recordingTime}s)
                    </button>
                  )}

                  <button
                    type="submit"
                    style={{
                      backgroundColor: "#e91e63",
                      color: "#fff",
                      border: "none",
                      padding: "0 18px",
                      borderRadius: "20px",
                      height: "40px",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    Envoyer
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#aaa",
              }}
            >
              Sélectionnez une conversation pour commencer la discussion.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherChat;
