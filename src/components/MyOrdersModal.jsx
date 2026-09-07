import React, { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { Package, Calendar, MapPin, X, CheckCircle2 } from "lucide-react";

export default function MyOrdersModal({ isOpen, onClose }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!isOpen || !currentUser) return;

    // Consulta aislada por el correo del cliente actual
    const q = query(
      collection(db, "orders"),
      where("clientEmail", "==", currentUser.email)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Ordenar en memoria por fecha más reciente
      docs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setOrders(docs);
      setLoading(false);
    });

    return () => unsub();
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(15, 23, 42, 0.7)",
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
        <div style={{ padding: "24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Package size={22} color="#0284C7" />
            <h2 style={{ fontSize: "20px", fontWeight: 900, color: "#0F172A" }}>Mis Compras Registradas</h2>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#94A3B8" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {loading ? (
            <p style={{ textAlign: "center", color: "#64748B", fontSize: "14px" }}>Cargando tus órdenes...</p>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <CheckCircle2 size={44} color="#94A3B8" style={{ margin: "0 auto 12px" }} />
              <h4 style={{ fontSize: "16px", fontWeight: 800, color: "#1E293B" }}>Aún no tienes pedidos registrados</h4>
              <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>Las órdenes que proceses se listarán aquí en tiempo real.</p>
            </div>
          ) : (
            orders.map((o) => (
              <div key={o.id} style={{ border: "1px solid #E2E8F0", borderRadius: "18px", padding: "18px", background: "#F8FAFC" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: 700, color: "#0284C7" }}>
                    ORDEN #{o.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    padding: "3px 10px",
                    borderRadius: "10px",
                    background: "#DCFCE7",
                    color: "#16A34A"
                  }}>
                    {o.status || "Confirmado"}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px", color: "#64748B", marginBottom: "12px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Calendar size={14} /> {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "S/F"}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <MapPin size={14} /> {o.district || "Punto de entrega"}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "12px" }}>
                  <span style={{ fontSize: "13px", color: "#475569" }}>Total pagado:</span>
                  <span style={{ fontSize: "18px", fontWeight: 900, color: "#0F172A" }}>S/ {Number(o.totalAmount || 0).toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}