import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const StudentChat = () => {
  const [conversations, setConversations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hoveredUserId, setHoveredUserId] = useState(null);

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

  // Recherche de formateurs / admins
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
          `${API_BASE_URL}/api/chat/contacts?search=${encodeURIComponent(
            searchTerm,
          )}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = res.data?.data || res.data;
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erreur recherche élève :", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchRecentConversations = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/api/chat/recent`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.data || res.data;
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      fetchFallbackContacts();
    }
  };

  const fetchFallbackContacts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/api/chat/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.data || res.data;
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      setConversations([]);
    }
  };

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/api/chat/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const messagesData = res.data?.data || res.data?.messages || res.data;
      setMessages(Array.isArray(messagesData) ? messagesData : []);
    } catch (err) {
      console.error("Erreur chargement messages :", err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (e, userId) => {
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
      await axios.delete(`${API_BASE_URL}/api/chat/conversation/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setConversations((prev) => prev.filter((u) => u._id !== userId));
      setSearchResults((prev) => prev.filter((u) => u._id !== userId));

      if (selectedUser?._id === userId) {
        setSelectedUser(null);
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

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert("Microphone inaccessible.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const sendMediaMessage = async (fileToUpload, forcedType = null) => {
    if (!selectedUser || !fileToUpload) return;

    const formData = new FormData();
    formData.append("receiverId", selectedUser._id);
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
      const res = await axios.post(`${API_BASE_URL}/api/chat/send`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
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
    if (!newMessage.trim() || !selectedUser) return;

    const textToSend = newMessage;
    setNewMessage("");

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE_URL}/api/chat/send`,
        { receiverId: selectedUser._id, text: textToSend, messageType: "text" },
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
    if (role === "teacher" || role === "formateur") {
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
          Formatrice
        </span>
      );
    }
    return null;
  };

  const displayedConversations = searchTerm.trim()
    ? searchResults
    : conversations;

  return (
    <div style={{ padding: "20px", height: "calc(100vh - 120px)" }}>
      <h2>💬 Poser une question à ma Formatrice</h2>

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
        {/* COLONNE GAUCHE - Liste des Contacts */}
        <div
          style={{
            width: "300px",
            borderRight: "1px solid #eee",
            backgroundColor: "#fafafa",
          }}
        >
          <div style={{ padding: "15px" }}>
            <input
              type="text"
              placeholder="Rechercher une formatrice..."
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
                Recherche...
              </small>
            )}
          </div>

          <div style={{ overflowY: "auto", height: "calc(100% - 75px)" }}>
            {displayedConversations.length > 0 ? (
              displayedConversations.map((user) => {
                const isSelected = selectedUser?._id === user._id;
                const isHovered = hoveredUserId === user._id;

                return (
                  <div
                    key={user._id}
                    onClick={() => handleSelectUser(user)}
                    onMouseEnter={() => setHoveredUserId(user._id)}
                    onMouseLeave={() => setHoveredUserId(null)}
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
                        {user.nom || user.email || "Formatrice"}
                      </strong>
                      {renderRoleBadge(user.role)}
                    </div>

                    {(isHovered || isSelected) && (
                      <button
                        onClick={(e) => handleDeleteConversation(e, user._id)}
                        title="Supprimer la conversation"
                        style={{
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          color: "#d32f2f",
                          fontSize: "1em",
                          padding: "2px 6px",
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

        {/* COLONNE DROITE - Discussion */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {selectedUser ? (
            <>
              <div
                style={{
                  padding: "15px 20px",
                  borderBottom: "1px solid #eee",
                  fontWeight: "bold",
                }}
              >
                💬 Conversation avec {selectedUser.nom || selectedUser.email}
                {renderRoleBadge(selectedUser.role)}
              </div>

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
                    Chargement...
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
                            <audio
                              src={msg.mediaUrl}
                              controls
                              style={{
                                width: "100%",
                                height: "40px",
                                borderRadius: "20px",
                              }}
                            />
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

              {/* Formulaire Envoi */}
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
                    placeholder="Écrire un message à la formatrice..."
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
                      ⏹️ ({recordingTime}s)
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
              Sélectionnez votre formatrice pour démarrer la discussion.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentChat;
