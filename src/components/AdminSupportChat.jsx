import React, { useState, useEffect } from "react";
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";
import { Send, User, MessageSquare, CheckCheck } from "lucide-react";

export default function AdminSupportChat() {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    const q = query(collection(db, "support_chats"), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setChats(docs);
      if (!activeChat && docs.length > 0) {
        setActiveChat(docs[0]);
      } else if (activeChat) {
        const refreshed = docs.find((d) => d.id === activeChat.id);
        if (refreshed) setActiveChat(refreshed);
      }
    });
    return unsub;
  }, [activeChat]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeChat) return;

    const newMessages = [
      ...(activeChat.messages || []),
      { sender: "admin", text: replyText.trim(), time: new Date().toLocaleTimeString() }
    ];

    await updateDoc(doc(db, "support_chats", activeChat.id), {
      messages: newMessages,
      unreadAdmin: false,
      updatedAt: new Date().toISOString()
    });

    setReplyText("");
  };

  return (
    <div style={{ background: "#FFFFFF", borderRadius: "24px", border: "1px solid #E0F2FE", boxShadow: "var(--shadow-card)", overflow: "hidden", display: "grid", gridTemplateColumns: "300px 1fr", height: "550px", marginBottom: "36px" }}>
      {/* Lista lateral de conversaciones */}
      <div style={{ borderRight: "1px solid #E2E8F0", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid #F1F5F9", fontWeight: 900, fontSize: "15px", color: "#0F172A", display: "flex", alignItems: "center", gap: "8px" }}>
          <MessageSquare size={18} color="#0284C7" />
          <span>Tickets de Soporte ({chats.length})</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {chats.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>
              No hay consultas activas por el momento.
            </div>
          ) : (
            chats.map((c) => (
              <div
                key={c.id}
                onClick={() => setActiveChat(c)}
                style={{
                  padding: "14px",
                  borderBottom: "1px solid #F8FAFC",
                  cursor: "pointer",
                  background: activeChat?.id === c.id ? "#F0F9FF" : "#FFFFFF",
                  borderLeft: activeChat?.id === c.id ? "4px solid #0284C7" : "4px solid transparent"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 800, fontSize: "13px", color: "#0F172A" }}>{c.clientEmail}</span>
                  {c.unreadAdmin && (
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#EF4444" }} />
                  )}
                </div>
                <p style={{ fontSize: "12px", color: "#64748B", margin: "4px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.messages?.[c.messages.length - 1]?.text || "Nueva consulta..."}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Área del Chat Activo */}
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {activeChat ? (
          <>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8FAFC" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: "14px", color: "#0F172A" }}>{activeChat.clientEmail}</div>
                <div style={{ fontSize: "11px", color: "#64748B" }}>Ticket ID: {activeChat.id.slice(0, 8)}</div>
              </div>
              <span style={{ background: "#DCFCE7", color: "#16A34A", padding: "4px 10px", borderRadius: "10px", fontSize: "11px", fontWeight: 800 }}>
                En Atención
              </span>
            </div>

            <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", background: "#FAFAFA" }}>
              {activeChat.messages?.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.sender === "admin" ? "flex-end" : "flex-start",
                    maxWidth: "75%",
                    padding: "10px 14px",
                    borderRadius: "16px",
                    fontSize: "13px",
                    background: m.sender === "admin" ? "#0284C7" : m.sender === "system" ? "#FEF3C7" : "#FFFFFF",
                    color: m.sender === "admin" ? "#FFFFFF" : m.sender === "system" ? "#92400E" : "#0F172A",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.04)"
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "10px", marginBottom: "2px", opacity: 0.8 }}>
                    {m.sender === "admin" ? "Tú (Administrador)" : m.sender === "user" ? "Cliente" : "Aviso"}
                  </div>
                  {m.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleSendReply} style={{ padding: "14px", borderTop: "1px solid #F1F5F9", display: "flex", gap: "10px", background: "#fff" }}>
              <input
                type="text"
                placeholder="Escribe tu respuesta al cliente..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                style={{ flex: 1, padding: "12px 16px", borderRadius: "12px", border: "1px solid #CBD5E1", fontSize: "13px", outline: "none" }}
              />
              <button type="submit" className="btn-primary" style={{ padding: "12px 20px" }}>
                <Send size={16} /> Responder
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", fontSize: "14px" }}>
            Selecciona una conversación para responder.
          </div>
        )}
      </div>
    </div>
  );
}