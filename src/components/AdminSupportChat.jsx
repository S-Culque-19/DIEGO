import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs
} from "firebase/firestore";
import { db } from "../firebase/config";
import { playNotificationChime, triggerBrowserNotification } from "../utils/notificationSound";
import { MessageSquare, Send, User, ShieldCheck, Trash2 } from "lucide-react";

export default function AdminSupportChat() {
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const chatScrollRef = useRef(null);
  const prevUnreadCountRef = useRef(0);

  // 1. Escuchar lista de chats en tiempo real ordenada por última interacción
  useEffect(() => {
    const unsubChats = onSnapshot(
      collection(db, "chats"),
      (snap) => {
        const convList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        convList.sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0));
        setConversations(convList);

        setSelectedUser((prev) => {
          if (!prev) return convList.length > 0 ? convList[0] : null;
          const found = convList.find((c) => c.id === prev.id);
          return found || (convList.length > 0 ? convList[0] : null);
        });
      },
      (err) => console.error("Error al escuchar lista de chats:", err)
    );

    return () => unsubChats();
  }, []);

  // 2. Alerta sonora controlada al entrar mensaje nuevo
  useEffect(() => {
    const currentUnreadCount = conversations.filter((c) => c.unreadByAdmin === true).length;

    if (currentUnreadCount > prevUnreadCountRef.current) {
      playNotificationChime();
      triggerBrowserNotification(
        "Nuevo Mensaje de Cliente",
        "Un cliente acaba de escribir al chat de soporte en vivo."
      );
    }

    prevUnreadCountRef.current = currentUnreadCount;
  }, [conversations]);

  // 3. Escuchar la subcolección de mensajes del cliente seleccionado
  useEffect(() => {
    if (!selectedUser?.id) {
      setMessages([]);
      return;
    }

    const unsubMessages = onSnapshot(
      collection(db, `chats/${selectedUser.id}/messages`),
      (snap) => {
        const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        msgs.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        setMessages(msgs);
      },
      (err) => console.error("Error al cargar mensajes del cliente:", err)
    );

    if (selectedUser.unreadByAdmin) {
      updateDoc(doc(db, "chats", selectedUser.id), { unreadByAdmin: false }).catch(() => {});
    }

    return () => unsubMessages();
  }, [selectedUser?.id]);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Acción: Eliminar conversación completa en cascada
  const handleDeleteChat = async (userIdToDelete, e) => {
    if (e) e.stopPropagation();

    if (!window.confirm("¿Seguro que deseas eliminar esta conversación y todo su historial de forma permanente?")) {
      return;
    }

    try {
      const messagesRef = collection(db, `chats/${userIdToDelete}/messages`);
      const snap = await getDocs(messagesRef);
      const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      await deleteDoc(doc(db, "chats", userIdToDelete));

      if (selectedUser?.id === userIdToDelete) {
        setSelectedUser(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Error al eliminar conversación:", err);
      alert("No se pudo eliminar el chat: " + err.message);
    }
  };

  // Responder al cliente seleccionado
  const handleSendAdminReply = async (e) => {
    e.preventDefault();
    const text = replyText.trim();
    if (!text || !selectedUser?.id) return;

    setReplyText("");

    try {
      await addDoc(collection(db, `chats/${selectedUser.id}/messages`), {
        sender: "admin",
        text,
        createdAt: new Date().toISOString()
      });

      await updateDoc(doc(db, "chats", selectedUser.id), {
        lastMessage: `Admin: ${text}`,
        lastUpdated: new Date().toISOString(),
        unreadByAdmin: false,
        unreadByClient: true
      });
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      alert("No se pudo enviar la respuesta: " + err.message);
    }
  };

  return (
    <div style={{
      background: "#FFF",
      borderRadius: "24px",
      border: "1px solid #E2E8F0",
      boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
      overflow: "hidden",
      display: "grid",
      gridTemplateColumns: "320px 1fr",
      height: "600px",
      marginBottom: "40px"
    }}>
      {/* Columna Izquierda: Lista de Clientes */}
      <div style={{ borderRight: "1px solid #E2E8F0", display: "flex", flexDirection: "column", background: "#F8FAFC" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", background: "#FFF", fontWeight: 800, fontSize: "13px", color: "#475569", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>CONVERSACIONES ({conversations.length})</span>
          <span style={{ background: "#E0F2FE", color: "#0284C7", padding: "2px 8px", borderRadius: "8px", fontSize: "11px", fontWeight: 900 }}>
            EN VIVO
          </span>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {conversations.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>
              Aún no hay mensajes de clientes.
            </div>
          ) : (
            conversations.map((c) => {
              const isSelected = selectedUser?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedUser(c)}
                  style={{
                    padding: "14px 18px",
                    borderBottom: "1px solid #F1F5F9",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "#E0F2FE" : "#FFF",
                    transition: "background-color 0.15s ease",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontWeight: 800, fontSize: "13px", color: isSelected ? "#0369A1" : "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.userName || "Cliente"}
                      </span>
                      {c.unreadByAdmin && (
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#EF4444", flexShrink: 0 }} />
                      )}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                      {c.userEmail}
                    </div>
                    <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.lastMessage || "Sin mensajes"}
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteChat(c.id, e)}
                    style={{ background: "#FEE2E2", border: "none", color: "#DC2626", padding: "6px", borderRadius: "8px", cursor: "pointer" }}
                    title="Eliminar conversación"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Columna Derecha: Sala de Chat Activa */}
      <div style={{ display: "flex", flexDirection: "column", background: "#FFF" }}>
        {selectedUser ? (
          <>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8FAFC" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#E0F2FE", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284C7" }}>
                  <User size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 900, color: "#0F172A" }}>{selectedUser.userName}</h4>
                  <span style={{ fontSize: "12px", color: "#64748B" }}>{selectedUser.userEmail}</span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "11px", background: "#DCFCE7", color: "#16A34A", padding: "4px 10px", borderRadius: "8px", fontWeight: 800, display: "flex", alignItems: "center", gap: "4px" }}>
                  <ShieldCheck size={14} /> Conectado
                </span>
                <button
                  onClick={() => handleDeleteChat(selectedUser.id)}
                  style={{ background: "#FEE2E2", border: "none", color: "#DC2626", padding: "7px 12px", borderRadius: "10px", fontWeight: 800, fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Trash2 size={14} /> Borrar Chat
                </button>
              </div>
            </div>

            <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", background: "#FAFAFA" }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: "center", color: "#94A3B8", fontSize: "13px", margin: "auto" }}>
                  No hay mensajes registrados en esta conversación.
                </div>
              ) : (
                messages.map((m) => {
                  const isAdminMsg = m.sender === "admin";
                  const isBot = m.sender === "assistant";

                  return (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: isAdminMsg ? "flex-end" : "flex-start",
                        maxWidth: "75%",
                        background: isAdminMsg ? "#0284C7" : isBot ? "#E2E8F0" : "#FFF",
                        color: isAdminMsg ? "#FFF" : "#0F172A",
                        padding: "10px 16px",
                        borderRadius: isAdminMsg ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                        fontSize: "13px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                        border: isAdminMsg ? "none" : "1px solid #E2E8F0"
                      }}
                    >
                      <div style={{ fontSize: "10px", fontWeight: 800, opacity: 0.75, marginBottom: "2px" }}>
                        {isAdminMsg ? "Tú (Administrador)" : isBot ? "Bot Automático" : selectedUser.userName}
                      </div>
                      <div>{m.text}</div>
                    </div>
                  );
                })
              )}
              <div ref={chatScrollRef} />
            </div>

            <form onSubmit={handleSendAdminReply} style={{ padding: "16px", borderTop: "1px solid #E2E8F0", display: "flex", gap: "10px", background: "#FFF" }}>
              <input
                type="text"
                placeholder={`Responder a ${selectedUser.userName}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                style={{ flex: 1, padding: "12px 16px", borderRadius: "14px", border: "1.5px solid #E2E8F0", outline: "none", fontSize: "13px" }}
              />
              <button
                type="submit"
                style={{
                  background: "#0284C7",
                  color: "#FFF",
                  border: "none",
                  padding: "0 22px",
                  borderRadius: "14px",
                  fontWeight: 800,
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer"
                }}
              >
                <Send size={15} /> Responder
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", fontSize: "14px" }}>
            Selecciona una conversación para interactuar.
          </div>
        )}
      </div>
    </div>
  );
}