import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Bot, User, PhoneCall, Headphones } from "lucide-react";
import { collection, addDoc, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

// Estimación comercial de fletes según distancia relativa en Lima
const estimateShipping = (districtInput) => {
  const norm = districtInput.toLowerCase();

  // Zona Gratuita
  if (norm.includes("comas") || norm.includes("independencia") || norm.includes("san martin") || norm.includes("smp") || norm.includes("olivos")) {
    return { cost: 0, text: "¡Tu distrito cuenta con DELIVERY 100% GRATUITO!" };
  }

  // Zona Cercana
  if (norm.includes("rimac") || norm.includes("puente piedra") || norm.includes("breña") || norm.includes("cercado") || norm.includes("lima")) {
    return { cost: 10, text: "El flete aproximado a tu zona es de S/ 8.00 a S/ 12.00." };
  }

  // Zona Intermedia
  if (norm.includes("san miguel") || norm.includes("pueblo libre") || norm.includes("jesus maria") || norm.includes("lince") || norm.includes("magdalena")) {
    return { cost: 14, text: "El flete estimado a tu zona es de S/ 12.00 a S/ 16.00." };
  }

  // Zona Lejana / Lima Sur / Este
  if (norm.includes("surco") || norm.includes("miraflores") || norm.includes("san borja") || norm.includes("sjl") || norm.includes("ate") || norm.includes("chorrillos") || norm.includes("molina") || norm.includes("san juan")) {
    return { cost: 20, text: "El flete aproximado para tu distrito es de S/ 18.00 a S/ 25.00." };
  }

  return {
    cost: null,
    text: "Para cotizar el flete exacto hacia tu distrito o envíos a provincia, podemos conectarte con un asesor humano de inmediato."
  };
};

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "¡Hola! Soy el asistente virtual de DIEGO. ¿Tienes alguna duda sobre coberturas, costos de delivery o pedidos por mayor?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLiveSupport, setIsLiveSupport] = useState(false);
  const [ticketId, setTicketId] = useState(null);

  const { currentUser } = useAuth();
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Escucha mensajes en tiempo real si se activó el soporte humano
  useEffect(() => {
    if (!ticketId) return;
    const unsub = onSnapshot(doc(db, "support_chats", ticketId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.messages) {
          setMessages(data.messages);
        }
      }
    });
    return unsub;
  }, [ticketId]);

  // Activar ticket de soporte con asesor humano
  const handleStartLiveSupport = async () => {
    setIsLiveSupport(true);
    const newChatRef = await addDoc(collection(db, "support_chats"), {
      userId: currentUser?.uid || "invitado",
      clientEmail: currentUser?.email || "Cliente Web",
      status: "open",
      unreadAdmin: true,
      updatedAt: new Date().toISOString(),
      messages: [
        ...messages,
        {
          sender: "system",
          text: "Te estamos comunicando con un asesor de DIEGO. Por favor déjanos tu consulta o número telefónico."
        }
      ]
    });
    setTicketId(newChatRef.id);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    const newMessages = [...messages, { sender: "user", text: userText }];
    setMessages(newMessages);
    setInput("");

    // Modo Asesor Humano en Firestore
    if (isLiveSupport && ticketId) {
      await updateDoc(doc(db, "support_chats", ticketId), {
        messages: newMessages,
        unreadAdmin: true,
        updatedAt: new Date().toISOString()
      });
      return;
    }

    // Modo IA Automática
    setTimeout(() => {
      let botReply = "";
      const lower = userText.toLowerCase();

      if (lower.includes("recojo") || lower.includes("recoger") || lower.includes("tienda") || lower.includes("punto")) {
        botReply = "Contamos con un Punto Oficial de Recojo 100% Gratuito en MegaPlaza Independencia. Puedes recoger tus pedidos sin costo adicional previa coordinación.";
      } else if (lower.includes("delivery") || lower.includes("envio") || lower.includes("costo") || lower.includes("cuanto") || lower.includes("flete")) {
        const est = estimateShipping(lower);
        botReply = `${est.text} Recuerda que Comas, Independencia, San Martín de Porres y Los Olivos tienen Delivery 100% Gratis.`;
      } else if (lower.includes("telefono") || lower.includes("numero") || lower.includes("contacto") || lower.includes("yape") || lower.includes("plin")) {
        botReply = "Puedes comunicarte directamente o realizar tus pagos al número oficial 926 689 484 a nombre de Mecatrónica Pearc S.A.C.";
      } else {
        const est = estimateShipping(lower);
        if (est.cost !== null) {
          botReply = est.text;
        } else {
          botReply = "Entendido. Para darte una cotización exacta o consultar pedidos por fardos, ¿gustas hablar directamente con un asesor humano o escribirnos al 926 689 484?";
        }
      }

      setMessages((prev) => [...prev, { sender: "bot", text: botReply }]);
    }, 600);
  };

  return (
    <>
      {/* Botón Flotante */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 80,
          background: "linear-gradient(135deg, #0EA5E9, #0284C7)",
          color: "#fff",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 10px 30px rgba(2, 132, 199, 0.35)",
          border: "2px solid #FFFFFF",
          cursor: "pointer"
        }}
        title="Asistente Virtual DIEGO"
      >
        <Bot size={28} />
      </button>

      {/* Ventana Modal de Chat */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "90px",
            right: "24px",
            width: "360px",
            height: "500px",
            background: "#FFFFFF",
            borderRadius: "24px",
            boxShadow: "0 20px 50px rgba(15, 23, 42, 0.2)",
            border: "1px solid #E0F2FE",
            zIndex: 90,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}
        >
          {/* Header */}
          <div style={{ background: "linear-gradient(135deg, #0284C7, #38BDF8)", padding: "16px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "12px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isLiveSupport ? <Headphones size={20} /> : <Bot size={20} />}
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 800 }}>{isLiveSupport ? "Soporte en Vivo DIEGO" : "Asistente Virtual DIEGO"}</div>
                <div style={{ fontSize: "10px", opacity: 0.9 }}>En línea • Respuesta inmediata</div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
              <X size={20} />
            </button>
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, padding: "14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", background: "#F8FAFC" }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                  maxWidth: "82%",
                  padding: "10px 14px",
                  borderRadius: "16px",
                  fontSize: "13px",
                  lineHeight: "1.4",
                  background: m.sender === "user" ? "#0284C7" : m.sender === "system" ? "#FEF3C7" : "#FFFFFF",
                  color: m.sender === "user" ? "#FFFFFF" : m.sender === "system" ? "#92400E" : "#0F172A",
                  border: m.sender === "bot" ? "1px solid #E2E8F0" : "none",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
                }}
              >
                {m.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Botón para solicitar asesor si aún está en bot */}
          {!isLiveSupport && (
            <div style={{ padding: "8px 12px", background: "#F0F9FF", borderTop: "1px solid #E0F2FE", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#0369A1", fontWeight: 700 }}>¿Deseas atención humana?</span>
              <button
                onClick={handleStartLiveSupport}
                style={{
                  background: "#0284C7",
                  color: "#fff",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                Hablar con asesor
              </button>
            </div>
          )}

          {/* Formulario input */}
          <form onSubmit={handleSend} style={{ display: "flex", padding: "10px", borderTop: "1px solid #F1F5F9", background: "#fff", gap: "8px" }}>
            <input
              type="text"
              placeholder="Escribe tu consulta o distrito..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{ flex: 1, padding: "10px 14px", borderRadius: "12px", border: "1px solid #CBD5E1", fontSize: "13px", outline: "none" }}
            />
            <button type="submit" className="btn-primary" style={{ padding: "10px 14px" }}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}