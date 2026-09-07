import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { Package, Calendar, MapPin, X, Trash2, MessageCircle, AlertCircle } from "lucide-react";

export default function MyOrdersModal({ isOpen, onClose }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!isOpen || !currentUser) return;

    // Filtro estricto por el correo del cliente autenticado
    const q = query(
      collection(db, "orders"),
      where("clientEmail", "==", currentUser.email)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setOrders(docs);
      setLoading(false);
    });

    return () => unsub();
  }, [isOpen, currentUser]);

  // Cancelar o eliminar pedido propio por parte del cliente
  const handleCancelOrder = async (orderId, status) => {
    if (status !== "Pendiente") {
      alert("Tu orden ya se encuentra en proceso o reparto. Por favor comunícate a nuestro WhatsApp 926 689 484 para coordinar cualquier cambio.");
      return;
    }

    if (window.confirm("¿Estás seguro de que deseas cancelar este pedido? La orden se eliminará del sistema.")) {
      try {
        await deleteDoc(doc(db, "orders", orderId));
      } catch (error) {
        console.error("Error al cancelar orden:", error);
        alert("No se pudo cancelar el pedido: " + error.message);
      }
    }
  };

  if (!isOpen) return null;

  const getBadgeStyle = (status) => {
    switch (status) {
      case "Verificado":
        return { bg: "#EEF2FF", text: "#4F46E5" };
      case "En proceso":
        return { bg: "#FEF3C7", text: "#D97706" };
      case "En camino":
        return { bg: "#E0F2FE", text: "#0284C7" };
      case "Entregado":
        return { bg: "#DCFCE7", text: "#15803D" };
      default: // Pendiente
        return { bg: "#FEE2E2", text: "#B91C1C" };
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(15, 23, 42, 0.75)",
      backdropFilter: "blur(6px)",
      zIndex: 9995,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        background: "#FFF",
        width: "100%",
        maxWidth: "680px",
        maxHeight: "85vh",
        borderRadius: "24px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)"
      }}>
        {/* Header Modal */}
        <div style={{ padding: "24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "8px", background: "#E0F2FE", borderRadius: "12px", color: "#0284C7" }}>
              <Package size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 900, color: "#0F172A", margin: 0 }}>Mis Pedidos Registrados</h2>
              <span style={{ fontSize: "12px", color: "#64748B" }}>{currentUser?.email}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#94A3B8" }}>
            <X size={20} />
          </button>
        </div>

        {/* Lista de Órdenes */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {loading ? (
            <p style={{ textAlign: "center", color: "#64748B", fontSize: "14px" }}>Cargando tus pedidos...</p>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <Package size={48} color="#CBD5E1" style={{ margin: "0 auto 12px" }} />
              <h4 style={{ fontSize: "16px", fontWeight: 800, color: "#1E293B" }}>Aún no tienes compras activas</h4>
              <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
                Elige productos del catálogo y completa tu orden para ver el seguimiento en tiempo real.
              </p>
            </div>
          ) : (
            orders.map((o) => {
              const currentStatus = o.status || "Pendiente";
              const badge = getBadgeStyle(currentStatus);
              const itemsList = Array.isArray(o.items) ? o.items : [];
              const canCancel = currentStatus === "Pendiente";

              return (
                <div
                  key={o.id}
                  style={{
                    border: "1px solid #E2E8F0",
                    borderRadius: "20px",
                    padding: "20px",
                    background: "#F8FAFC",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <span style={{ fontSize: "13px", fontFamily: "monospace", fontWeight: 900, color: "#0284C7" }}>
                        ORDEN #{o.id.slice(0, 8).toUpperCase()}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                        <Calendar size={13} /> {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "S/F"}
                      </div>
                    </div>

                    {/* Badge de Estado del Cliente (Solo Lectura) */}
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 900,
                        padding: "6px 14px",
                        borderRadius: "12px",
                        backgroundColor: badge.bg,
                        color: badge.text
                      }}
                    >
                      {currentStatus}
                    </span>
                  </div>

                  {/* Resumen de Productos */}
                  <div style={{ background: "#FFF", borderRadius: "14px", padding: "12px 16px", border: "1px solid #F1F5F9" }}>
                    <div style={{ fontSize: "11px", fontWeight: 800, color: "#94A3B8", marginBottom: "8px" }}>PRODUCTOS:</div>
                    {itemsList.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {itemsList.map((i, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                            <span style={{ fontWeight: 700, color: "#334155" }}>{i.name}</span>
                            <span style={{ fontWeight: 800, color: "#0284C7" }}>x{i.quantity}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: "13px", color: "#334155" }}>Orden de compra estándar</span>
                    )}
                  </div>

                  {/* Modalidad de Entrega */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#475569" }}>
                    <MapPin size={14} color="#0284C7" />
                    <span>Entrega: <strong>{o.district || "Punto de entrega"}</strong></span>
                  </div>

                  {/* Footer de Tarjeta con Total y Botón de Cancelación */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "14px", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <span style={{ fontSize: "12px", color: "#64748B" }}>Total pagado: </span>
                      <strong style={{ fontSize: "18px", color: "#0F172A", fontWeight: 900 }}>
                        S/ {Number(o.totalAmount || 0).toFixed(2)}
                      </strong>
                    </div>

                    {canCancel ? (
                      <button
                        onClick={() => handleCancelOrder(o.id, currentStatus)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "#FEE2E2",
                          color: "#DC2626",
                          border: "none",
                          padding: "8px 14px",
                          borderRadius: "10px",
                          fontSize: "12px",
                          fontWeight: 800,
                          cursor: "pointer"
                        }}
                      >
                        <Trash2 size={14} /> Cancelar Pedido
                      </button>
                    ) : (
                      <a
                        href={`https://wa.me/51926689484?text=Hola%20Distribuidora%20DIEGO,%20consulto%20por%20mi%20orden%20${o.id.slice(0, 8).toUpperCase()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "#DCFCE7",
                          color: "#15803D",
                          padding: "8px 14px",
                          borderRadius: "10px",
                          fontSize: "12px",
                          fontWeight: 800,
                          textDecoration: "none"
                        }}
                      >
                        <MessageCircle size={14} /> Coordinar por WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
