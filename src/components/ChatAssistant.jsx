import React, { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, addDoc, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { MessageSquare, X, Send, Bot, User, Truck, ShieldCheck, PhoneCall } from "lucide-react";

export default function ChatAssistant() {
  const { currentUser, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);

  // REGLA: Si no hay usuario logueado o es Administrador, el widget NO se renderiza
  if (!currentUser || isAdmin) return null;

  const chatPath = `chats/${currentUser.uid}/messages`;

  useEffect(() => {
    if (!isOpen) return;

    // Escucha en tiempo real del canal privado del cliente
    const unsub = onSnapshot(collection(db, chatPath), (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      setMessages(msgs);
    });

    return () => unsub();
  }, [isOpen, currentUser.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const sendMessage = async (textToSend, sender = "user") => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    if (sender === "user") setInputText("");

    try {
      // 1. Guardar mensaje en la subcolección
      await addDoc(collection(db, chatPath), {
        sender,
        text,
        createdAt: new Date().toISOString()
      });

      // 2. Actualizar metadata de la conversación para la bandeja del Administrador
      await setDoc(
        doc(db, "chats", currentUser.uid),
        {
          userId: currentUser.uid,
          userName: currentUser.displayName || currentUser.email.split("@")[0],
          userEmail: currentUser.email.toLowerCase(),
          lastMessage: text,
          lastUpdated: new Date().toISOString(),
          unreadByAdmin: sender === "user"
        },
        { merge: true }
      );

      // Respuesta automática del asistente virtual si escribe el usuario
      if (sender === "user") {
        setTimeout(async () => {
          let reply = "Gracias por escribir a Distribuidora DIEGO. Un asesor revisará tu mensaje a la brevedad.";
          const lower = text.toLowerCase();

          if (lower.includes("delivery") || lower.includes("envio") || lower.includes("distrito")) {
            reply = "Contamos con Delivery 100% Gratuito en Lima Norte: Comas, Independencia, SMP y Los Olivos. También recojo sin costo en MegaPlaza.";
          } else if (lower.includes("precio") || lower.includes("catalogo") || lower.includes("costo")) {
            reply = "Puedes consultar nuestros precios mayoristas directamente en el catálogo de la página. Planchas de papel higiénico y toalla de alta absorción.";
          } else if (lower.includes("pago") || lower.includes("yape") || lower.includes("plin")) {
            reply = "Aceptamos Yape y Plin directo al número 926 689 484 a nombre de Mecatrónica Pearc S.A.C.";
          }

          await addDoc(collection(db, chatPath), {
            sender: "assistant",
            text: reply,
            createdAt: new Date().toISOString()
          });
        }, 800);
      }
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
    }
  };

  return (
    <>
      {/* Botón flotante exclusivo para clientes */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)",
            color: "#FFF",
            border: "none",
            boxShadow: "0 8px 24px rgba(2, 132, 199, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 9990
          }}
          title="Abrir Chat de Atención"
        >
          <MessageSquare size={24} />
        </button>
      )}

      {/* Ventana de Chat Flotante */}
      {isOpen && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "360px",
          height: "500px",
          background: "#FFF",
          borderRadius: "24px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          zIndex: 9990,
          border: "1px solid #E2E8F0"
        }}>
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)",
            color: "#FFF",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ background: "rgba(255,255,255,0.2)", padding: "6px", borderRadius: "10px" }}>
                <Bot size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800 }}>Soporte DIEGO</h4>
                <span style={{ fontSize: "11px", opacity: 0.85 }}>En línea | Hola, {currentUser.displayName || "Cliente"}</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "#FFF", cursor: "pointer" }}>
              <X size={18} />
            </button>
          </div>

          {/* Cuerpo de Mensajes */}
          <div style={{ flex: 1, padding: "16px", overflowY: "auto", background: "#F8FAFC", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ background: "#E0F2FE", color: "#0369A1", padding: "10px 14px", borderRadius: "14px", fontSize: "12px", lineHeight: 1.4 }}>
              ¡Hola! Soy el asistente virtual de <strong>Distribuidora DIEGO</strong>. ¿Tienes dudas con distritos, compras o pagos?
            </div>

            {messages.map((m) => {
              const isUser = m.sender === "user";
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: isUser ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                    background: isUser ? "#0284C7" : "#FFF",
                    color: isUser ? "#FFF" : "#1E293B",
                    padding: "10px 14px",
                    borderRadius: isUser ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                    fontSize: "12.5px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                    border: isUser ? "none" : "1px solid #E2E8F0"
                  }}
                >
                  {m.text}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Atajos Rápidos */}
          <div style={{ display: "flex", gap: "6px", padding: "6px 12px", background: "#FFF", borderTop: "1px solid #F1F5F9", overflowX: "auto" }}>
            <button
              onClick={() => sendMessage("¿Cuáles son los distritos de envío gratis?")}
              style={{ fontSize: "11px", padding: "4px 8px", background: "#F1F5F9", border: "none", borderRadius: "8px", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              Envío Gratis
            </button>
            <button
              onClick={() => sendMessage("¿Cómo realizo el pago por Yape o Plin?")}
              style={{ fontSize: "11px", padding: "4px 8px", background: "#F1F5F9", border: "none", borderRadius: "8px", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              Yape / Plin
            </button>
          </div>

          {/* Formulario Envío */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            style={{ padding: "12px", background: "#FFF", borderTop: "1px solid #E2E8F0", display: "flex", gap: "8px" }}
          >
            <input
              type="text"
              placeholder="Escribe tu mensaje..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{ flex: 1, padding: "10px 14px", borderRadius: "12px", border: "1px solid #CBD5E1", fontSize: "13px", outline: "none" }}
            />
            <button
              type="submit"
              style={{ background: "#0284C7", color: "#FFF", border: "none", borderRadius: "12px", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
