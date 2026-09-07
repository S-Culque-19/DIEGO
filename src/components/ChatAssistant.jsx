import React, { useState, useEffect, useRef } from "react";
import { collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { MessageSquare, Send, X, Bot, User } from "lucide-react";

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const { currentUser } = useAuth();
  const messagesEndRef = useRef(null);

  // Obtener o generar identificador de invitado persistente
  const getGuestId = () => {
    let id = localStorage.getItem("diego_guest_id");
    if (!id) {
      id = "guest_" + Math.random().toString(36).substring(2, 9);
      localStorage.setItem("diego_guest_id", id);
    }
    return id;
  };

  // Canal aislado
  const chatPath = currentUser
    ? `chats/${currentUser.uid}/messages`
    : `guest_chats/${getGuestId()}/messages`;

  useEffect(() => {
    if (!isOpen) return;

    const q = query(collection(db, chatPath), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    return () => unsubscribe();
  }, [isOpen, chatPath]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setInput("");

    // Guardar mensaje del usuario en su canal aislado
    await addDoc(collection(db, chatPath), {
      text: userText,
      sender: "user",
      userName: currentUser?.displayName || currentUser?.email || "Invitado",
      createdAt: new Date().toISOString()
    });

    // Respuesta inteligente contextual
    setTimeout(async () => {
      let botReply = "¡Hola! En Distribuidora DIEGO contamos con delivery gratuito a Comas, Independencia, SMP y Los Olivos. ¿Deseas hacer un pedido por mayor o consultar precios?";
      const lower = userText.toLowerCase();

      if (lower.includes("precio") || lower.includes("costo") || lower.includes("plancha")) {
        botReply = "Manejamos precios directos de distribuidor en papel higiénico y toalla por fardo. Puedes revisar los montos actualizados en la sección de Catálogo.";
      } else if (lower.includes("delivery") || lower.includes("envio") || lower.includes("recojo")) {
        botReply = "El delivery es 100% gratis en los 4 distritos autorizados de Lima Norte. También puedes recoger sin costo en MegaPlaza Independencia previa coordinación.";
      } else if (lower.includes("pago") || lower.includes("yape") || lower.includes("plin")) {
        botReply = "Aceptamos pagos por Yape y Plin al número oficial 926 689 484, o pago en efectivo al momento de la entrega.";
      }

      await addDoc(collection(db, chatPath), {
        text: botReply,
        sender: "bot",
        createdAt: new Date().toISOString()
      });
    }, 800);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: "#0284C7",
          color: "#FFF",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 10px 25px rgba(2, 132, 199, 0.4)",
          zIndex: 9000
        }}
        aria-label="Abrir asistente"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {isOpen && (
        <div style={{
          position: "fixed",
          bottom: "90px",
          right: "24px",
          width: "360px",
          height: "480px",
          backgroundColor: "#FFF",
          borderRadius: "24px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          zIndex: 9000,
          border: "1px solid #E2E8F0"
        }}>
          {/* Header */}
          <div style={{ background: "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)", padding: "16px 20px", color: "#FFF" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Bot size={22} />
              <div>
                <div style={{ fontWeight: 800, fontSize: "14px" }}>Asistente Virtual DIEGO</div>
                <div style={{ fontSize: "11px", opacity: 0.85 }}>
                  {currentUser ? `Atendiendo a: ${currentUser.email.split("@")[0]}` : "Canal Privado Invitado"}
                </div>
              </div>
            </div>
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", color: "#94A3B8", fontSize: "12px", marginTop: "40px" }}>
                ¿Tienes dudas sobre stock o envíos? Escribe tu mensaje aquí.
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  padding: "10px 14px",
                  borderRadius: m.sender === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                  backgroundColor: m.sender === "user" ? "#0284C7" : "#F1F5F9",
                  color: m.sender === "user" ? "#FFF" : "#0F172A",
                  fontSize: "13px",
                  lineHeight: 1.4
                }}
              >
                {m.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} style={{ display: "flex", padding: "12px", borderTop: "1px solid #E2E8F0", gap: "8px" }}>
            <input
              type="text"
              placeholder="Escribe tu consulta..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{ flex: 1, padding: "10px 14px", borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "13px", outline: "none" }}
            />
            <button
              type="submit"
              style={{ background: "#0284C7", color: "#FFF", border: "none", width: "40px", height: "40px", borderRadius: "12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}