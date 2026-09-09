import React, { useState, useEffect, useRef } from "react";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc 
} from "firebase/firestore";
import { db } from "../firebase/config";
import * as XLSX from "xlsx";
import { playNotificationChime, triggerBrowserNotification } from "../utils/notificationSound";
import {
  DollarSign,
  TrendingUp,
  PackageCheck,
  FileSpreadsheet,
  PlusCircle,
  Trash2,
  Upload,
  BellRing,
  X,
  Eye,
  Images,
  User,
  CreditCard,
  MapPin,
  MessageSquare,
  Send,
  ShieldCheck,
  Bot
} from "lucide-react";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);

  // Estados del Centro de Mensajería Tipo Messenger
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const chatScrollRef = useRef(null);

  // Formulario Producto con soporte multi-imagen
  const [productForm, setProductForm] = useState({
    name: "",
    category: "Papel Higiénico",
    price: "",
    cost: "",
    stock: "",
    description: "",
    images: []
  });

  const [lightboxImage, setLightboxImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // 1. Escucha de Órdenes y Productos (Sin bucles de render)
  useEffect(() => {
    let isMounted = true;

    const unsubOrders = onSnapshot(
      collection(db, "orders"),
      (snap) => {
        if (!isMounted) return;
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const sorted = [...items].sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        setOrders(sorted);
      },
      (err) => console.error("Error al escuchar órdenes:", err)
    );

    const unsubProducts = onSnapshot(
      collection(db, "products"),
      (snap) => {
        if (!isMounted) return;
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProducts(items);
      },
      (err) => console.error("Error al escuchar productos:", err)
    );

    return () => {
      isMounted = false;
      unsubOrders();
      unsubProducts();
    };
  }, []);

  // 2. Escucha de Bandeja de Chats de Clientes (Messenger)
  useEffect(() => {
    const unsubChats = onSnapshot(
      collection(db, "chats"),
      (snap) => {
        const convList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        convList.sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0));
        setConversations(convList);

        // Seleccionar la primera conversación automáticamente si no hay ninguna activa
        setSelectedUser((prev) => prev || (convList.length > 0 ? convList[0] : null));
      },
      (err) => console.error("Error al escuchar lista de chats:", err)
    );

    return () => unsubChats();
  }, []);

  // 3. Escucha de mensajes del cliente seleccionado
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

    // Marcar como leído en Firestore
    updateDoc(doc(db, "chats", selectedUser.id), { unreadByAdmin: false }).catch(() => {});

    return () => unsubMessages();
  }, [selectedUser?.id]);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Responder al cliente seleccionado
  const handleSendAdminReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedUser) return;

    const text = replyText.trim();
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
        unreadByAdmin: false
      });
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      alert("No se pudo enviar la respuesta: " + err.message);
    }
  };

  // Actualización inmediata del estado en Firestore
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: newStatus
      });
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      alert("Error al actualizar el estado: " + error.message);
    }
  };

  // Eliminación de pedido por Administración
  const handleDeleteOrder = async (orderId) => {
    if (window.confirm(`¿Estás seguro de eliminar permanentemente la orden #${orderId.slice(0, 8)}?`)) {
      try {
        await deleteDoc(doc(db, "orders", orderId));
      } catch (error) {
        console.error("Error al eliminar pedido:", error);
        alert("No se pudo eliminar el pedido: " + error.message);
      }
    }
  };

  // Subida múltiple de fotos
  const handleMultipleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        alert(`La imagen "${file.name}" supera los 2MB. Selecciona una más ligera.`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductForm((prev) => ({
          ...prev,
          images: [...prev.images, reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleRemoveSelectedImage = (indexToRemove) => {
    setProductForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Métricas financieras calculadas
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const totalCost = orders.reduce((sum, o) => sum + (Number(o.estimatedCost) || 0), 0);
  const netProfit = totalRevenue - totalCost;
  const totalUnitsSold = orders.reduce((sum, o) => sum + (Number(o.totalItemsCount) || 0), 0);

  const exportAccountingToExcel = () => {
    const dataForExcel = orders.map((o) => ({
      "ID Pedido": o.id,
      "Fecha": o.createdAt ? (o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString() : new Date(o.createdAt).toLocaleString()) : "S/F",
      "Cliente": o.clientName || "Sin registrar",
      "Email": o.clientEmail || "Anónimo",
      "Modalidad / Distrito": o.district || "No especificado",
      "Dirección": o.address || "Punto de Recojo",
      "Total Unidades": o.totalItemsCount || 0,
      "Productos": Array.isArray(o.items)
        ? o.items.map((i) => `${i.name} (x${i.quantity})`).join(" | ")
        : "Sin detalle",
      "Total Venta (S/)": Number(o.totalAmount || 0).toFixed(2),
      "Costo Estimado (S/)": Number(o.estimatedCost || 0).toFixed(2),
      "Ganancia Neta (S/)": Number(o.netProfit || 0).toFixed(2),
      "Operación Pago": o.paymentRef || "N/A",
      "Estado Actual": o.status || "Pendiente"
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas_Logistica");
    XLSX.writeFile(workbook, `Reporte_DIEGO_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (productForm.images.length === 0) {
      alert("Por favor selecciona al menos una foto para el producto.");
      return;
    }

    setIsUploading(true);
    try {
      await addDoc(collection(db, "products"), {
        name: productForm.name,
        category: productForm.category,
        price: parseFloat(productForm.price),
        cost: parseFloat(productForm.cost),
        stock: parseInt(productForm.stock),
        description: productForm.description,
        images: productForm.images,
        imageUrl: productForm.images[0],
        createdAt: new Date().toISOString()
      });

      setProductForm({
        name: "",
        category: "Papel Higiénico",
        price: "",
        cost: "",
        stock: "",
        description: "",
        images: []
      });
      alert("¡Producto publicado correctamente!");
    } catch (err) {
      console.error(err);
      alert("Error al guardar: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este producto del inventario?")) {
      await deleteDoc(doc(db, "products", id));
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "Verificado":
        return { bg: "#EEF2FF", color: "#4F46E5", border: "#C7D2FE" };
      case "En proceso":
        return { bg: "#FEF3C7", color: "#D97706", border: "#FDE68A" };
      case "En camino":
        return { bg: "#E0F2FE", color: "#0284C7", border: "#BAE6FD" };
      case "Entregado":
        return { bg: "#DCFCE7", color: "#15803D", border: "#BBF7D0" };
      default: // Pendiente
        return { bg: "#FEE2E2", color: "#B91C1C", border: "#FECACA" };
    }
  };

  return (
    <div style={{ padding: "40px 20px", maxWidth: "1380px", margin: "0 auto", backgroundColor: "#F8FAFC", minHeight: "100vh" }}>
      {/* Lightbox / Foto Grande */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            <button
              onClick={() => setLightboxImage(null)}
              style={{
                position: "absolute",
                top: "-15px",
                right: "-15px",
                background: "#EF4444",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
            >
              <X size={20} />
            </button>
            <img src={lightboxImage} alt="Preview" style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: "16px", objectFit: "contain" }} />
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 900, color: "#0F172A", margin: 0 }}>
            Panel de Operaciones & Despacho
          </h1>
          <p style={{ fontSize: "14px", color: "#64748B", marginTop: "4px" }}>
            Auditoría de compras, actualización de estados, mensajería y gestión de inventario.
          </p>
        </div>
        <button
          onClick={() => {
            playNotificationChime();
            triggerBrowserNotification("Alerta Activa", "Notificaciones operativas en tiempo real.");
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#FFF",
            border: "1px solid #E2E8F0",
            padding: "10px 18px",
            borderRadius: "14px",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "13px",
            color: "#0284C7"
          }}
        >
          <BellRing size={16} /> Probar Alerta Sonora
        </button>
      </div>

      {/* Tarjetas Métricas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <div style={{ background: "#FFF", padding: "20px", borderRadius: "20px", border: "1px solid #E0F2FE", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "12px", background: "#E0F2FE", borderRadius: "14px", color: "#0284C7" }}><DollarSign size={24} /></div>
            <div>
              <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 800 }}>INGRESOS TOTALES</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#0F172A" }}>S/ {totalRevenue.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div style={{ background: "#FFF", padding: "20px", borderRadius: "20px", border: "1px solid #E0F2FE", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "12px", background: "#FEE2E2", borderRadius: "14px", color: "#EF4444" }}><TrendingUp size={24} style={{ transform: "rotate(180deg)" }} /></div>
            <div>
              <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 800 }}>COSTOS ESTIMADOS</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#0F172A" }}>S/ {totalCost.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div style={{ background: "#FFF", padding: "20px", borderRadius: "20px", border: "1px solid #E0F2FE", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "12px", background: "#DCFCE7", borderRadius: "14px", color: "#16A34A" }}><TrendingUp size={24} /></div>
            <div>
              <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 800 }}>GANANCIA NETA</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#16A34A" }}>S/ {netProfit.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div style={{ background: "#FFF", padding: "20px", borderRadius: "20px", border: "1px solid #E0F2FE", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "12px", background: "#FEF3C7", borderRadius: "14px", color: "#D97706" }}><PackageCheck size={24} /></div>
            <div>
              <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 800 }}>UNIDADES TOTALES</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#0F172A" }}>{totalUnitsSold}</div>
            </div>
          </div>
        </div>
      </div>

      {/* BANDEJA TIPO MESSENGER INTEGRADA EN EL DASHBOARD */}
      <div style={{ marginBottom: "40px" }}>
        <div style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 900, color: "#0F172A", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <MessageSquare size={22} color="#0284C7" />
            <span>Centro de Mensajería & Atención al Cliente</span>
          </h2>
          <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
            Bandeja multicanal en vivo. Responde directamente a las consultas de los clientes autenticados.
          </p>
        </div>

        <div style={{
          background: "#FFF",
          borderRadius: "24px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          height: "560px"
        }}>
          {/* Columna Izquierda: Clientes */}
          <div style={{ borderRight: "1px solid #E2E8F0", display: "flex", flexDirection: "column", background: "#F8FAFC" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", background: "#FFF", fontWeight: 800, fontSize: "13px", color: "#475569" }}>
              CONVERSACIONES ACTIVAS ({conversations.length})
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
                        transition: "all 0.15s ease"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 800, fontSize: "13px", color: isSelected ? "#0369A1" : "#0F172A" }}>
                          {c.userName || "Cliente"}
                        </span>
                        {c.unreadByAdmin && (
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#EF4444" }} />
                        )}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                        {c.userEmail}
                      </div>
                      <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.lastMessage || "Sin mensajes"}
                      </div>
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
                  <div>
                    <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 900, color: "#0F172A" }}>{selectedUser.userName}</h4>
                    <span style={{ fontSize: "12px", color: "#64748B" }}>{selectedUser.userEmail}</span>
                  </div>
                  <span style={{ fontSize: "11px", background: "#DCFCE7", color: "#16A34A", padding: "4px 10px", borderRadius: "8px", fontWeight: 800 }}>
                    Canal Conectado
                  </span>
                </div>

                <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", background: "#FAFAFA" }}>
                  {messages.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#94A3B8", fontSize: "13px", margin: "auto" }}>
                      No hay mensajes en este chat.
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
                          <div style={{ fontSize: "10px", fontWeight: 800, opacity: 0.7, marginBottom: "2px" }}>
                            {isAdminMsg ? "Tú (Administrador)" : isBot ? "Bot Automático" : selectedUser.userName}
                          </div>
                          {m.text}
                        </div>
                      );
                    })
                  )}
                  <div ref={chatScrollRef} />
                </div>

                <form onSubmit={handleSendAdminReply} style={{ padding: "16px", borderTop: "1px solid #E2E8F0", display: "flex", gap: "10px" }}>
                  <input
                    type="text"
                    placeholder={`Responder a ${selectedUser.userName}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    style={{ flex: 1, padding: "12px 16px", borderRadius: "14px", border: "1px solid #E2E8F0", outline: "none", fontSize: "13px" }}
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
                Selecciona una conversación a la izquierda para interactuar.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE VENTAS Y AUDITORÍA DE PEDIDOS */}
      <div style={{ background: "#FFF", padding: "28px", borderRadius: "24px", border: "1px solid #E2E8F0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", marginBottom: "40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 900, color: "#0F172A", margin: 0 }}>
              Registro General de Pedidos ({orders.length})
            </h2>
            <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
              Cambia el estado de entrega en el desplegable o elimina registros auditados.
            </p>
          </div>
          <button
            onClick={exportAccountingToExcel}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#10B981",
              color: "#FFF",
              border: "none",
              padding: "12px 20px",
              borderRadius: "14px",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: "13px"
            }}
          >
            <FileSpreadsheet size={18} />
            <span>Exportar a Excel (.xlsx)</span>
          </button>
        </div>

        {orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#94A3B8" }}>
            No hay órdenes registradas por el momento.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "1000px" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #E2E8F0", color: "#475569", textAlign: "left" }}>
                  <th style={{ padding: "14px 16px" }}>ID & Fecha</th>
                  <th style={{ padding: "14px 16px" }}>Cliente</th>
                  <th style={{ padding: "14px 16px" }}>Productos Comprados</th>
                  <th style={{ padding: "14px 16px", textAlign: "center" }}>Cant.</th>
                  <th style={{ padding: "14px 16px" }}>Total Venta</th>
                  <th style={{ padding: "14px 16px" }}>Operación / Entrega</th>
                  <th style={{ padding: "14px 16px" }}>Estado de Entrega</th>
                  <th style={{ padding: "14px 16px", textAlign: "center" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const badge = getStatusBadgeStyle(o.status || "Pendiente");
                  const itemsList = Array.isArray(o.items) && o.items.length > 0 ? o.items : [];

                  return (
                    <tr key={o.id} style={{ borderBottom: "1px solid #F1F5F9", verticalAlign: "top" }}>
                      <td style={{ padding: "16px" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#0284C7", display: "block" }}>
                          #{o.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span style={{ fontSize: "11px", color: "#94A3B8" }}>
                          {o.createdAt ? (o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString() : new Date(o.createdAt).toLocaleDateString()) : "S/F"}
                        </span>
                      </td>

                      <td style={{ padding: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 800, color: "#0F172A" }}>
                          <User size={14} color="#64748B" />
                          <span>{o.clientName || "Cliente Web"}</span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                          {o.clientEmail}
                        </div>
                      </td>

                      <td style={{ padding: "16px", maxWidth: "280px" }}>
                        {itemsList.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {itemsList.map((item, idx) => (
                              <div
                                key={idx}
                                style={{
                                  background: "#F1F5F9",
                                  border: "1px solid #E2E8F0",
                                  borderRadius: "10px",
                                  padding: "6px 10px",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: "8px"
                                }}
                              >
                                <span style={{ fontWeight: 700, color: "#1E293B", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {item.name}
                                </span>
                                <span style={{ background: "#E0F2FE", color: "#0284C7", padding: "2px 6px", borderRadius: "6px", fontSize: "11px", fontWeight: 900 }}>
                                  x{item.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: "#94A3B8", fontStyle: "italic", fontSize: "12px" }}>Detalle general</span>
                        )}
                      </td>

                      <td style={{ padding: "16px", textAlign: "center", fontWeight: 800, color: "#0F172A" }}>
                        {o.totalItemsCount || itemsList.reduce((acc, i) => acc + (i.quantity || 1), 0) || 1}
                      </td>

                      <td style={{ padding: "16px" }}>
                        <div style={{ fontSize: "15px", fontWeight: 900, color: "#0F172A" }}>
                          S/ {Number(o.totalAmount || 0).toFixed(2)}
                        </div>
                        {o.netProfit !== undefined && (
                          <div style={{ fontSize: "11px", color: "#16A34A", fontWeight: 700, marginTop: "2px" }}>
                            Ganancia: S/ {Number(o.netProfit).toFixed(2)}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 800, color: "#0284C7" }}>
                          <CreditCard size={14} /> Ref: {o.paymentRef || "N/A"}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
                          <MapPin size={14} /> {o.district || "Punto de entrega"}
                        </div>
                      </td>

                      {/* Selector de Estado */}
                      <td style={{ padding: "16px" }}>
                        <select
                          value={o.status || "Pendiente"}
                          onChange={(e) => handleStatusChange(o.id, e.target.value)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: 900,
                            cursor: "pointer",
                            outline: "none",
                            border: `1.5px solid ${badge.border}`,
                            backgroundColor: badge.bg,
                            color: badge.color,
                            transition: "all 0.2s ease"
                          }}
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="Verificado">Verificado</option>
                          <option value="En proceso">En proceso</option>
                          <option value="En camino">En camino</option>
                          <option value="Entregado">Entregado</option>
                        </select>
                      </td>

                      <td style={{ padding: "16px", textAlign: "center" }}>
                        <button
                          onClick={() => handleDeleteOrder(o.id)}
                          style={{
                            background: "#FEE2E2",
                            border: "none",
                            color: "#DC2626",
                            padding: "8px",
                            borderRadius: "10px",
                            cursor: "pointer"
                          }}
                          title="Eliminar registro de pedido"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Formulario Agregar Producto */}
      <div style={{ background: "#FFF", padding: "28px", borderRadius: "24px", border: "1px solid #E2E8F0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", margin: "40px 0" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 900, marginBottom: "18px", display: "flex", alignItems: "center", gap: "10px", color: "#0F172A" }}>
          <PlusCircle size={22} color="#0284C7" /> Publicar Producto en el Catálogo
        </h2>

        <form onSubmit={handleSaveProduct} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#475569", marginBottom: "6px" }}>Nombre del Producto</label>
            <input
              type="text"
              required
              placeholder="Ej. Plancha Papel Higiénico 40m"
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #E2E8F0", outline: "none", fontSize: "13px" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#475569", marginBottom: "6px" }}>Categoría</label>
            <select
              value={productForm.category}
              onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
              style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #E2E8F0", outline: "none", fontSize: "13px" }}
            >
              <option value="Papel Higiénico">Papel Higiénico</option>
              <option value="Papel Toalla">Papel Toalla</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#475569", marginBottom: "6px" }}>Precio de Venta (S/)</label>
            <input
              type="number"
              step="0.10"
              required
              placeholder="Ej. 38.00"
              value={productForm.price}
              onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
              style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #E2E8F0", outline: "none", fontSize: "13px" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#475569", marginBottom: "6px" }}>Costo Unitario (S/)</label>
            <input
              type="number"
              step="0.10"
              required
              placeholder="Ej. 25.00"
              value={productForm.cost}
              onChange={(e) => setProductForm({ ...productForm, cost: e.target.value })}
              style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #E2E8F0", outline: "none", fontSize: "13px" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#475569", marginBottom: "6px" }}>Stock Inicial</label>
            <input
              type="number"
              required
              placeholder="Ej. 50"
              value={productForm.stock}
              onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
              style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #E2E8F0", outline: "none", fontSize: "13px" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#475569", marginBottom: "6px" }}>Imágenes</label>
            <label style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px",
              background: "#F0F9FF",
              border: "2px dashed #38BDF8",
              borderRadius: "14px",
              cursor: "pointer",
              color: "#0284C7",
              fontWeight: 800,
              fontSize: "13px"
            }}>
              <Upload size={18} />
              <span>Seleccionar Fotos</span>
              <input type="file" multiple accept="image/*" onChange={handleMultipleImageUpload} style={{ display: "none" }} />
            </label>
          </div>

          {productForm.images.length > 0 && (
            <div style={{ gridColumn: "1 / -1", padding: "16px", background: "#F8FAFC", borderRadius: "16px", border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {productForm.images.map((img, idx) => (
                  <div key={idx} style={{ position: "relative", width: "80px", height: "80px", borderRadius: "12px", overflow: "hidden", border: "1px solid #CBD5E1" }}>
                    <img src={img} alt="Miniatura" onClick={() => setLightboxImage(img)} style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }} />
                    <button
                      type="button"
                      onClick={() => handleRemoveSelectedImage(idx)}
                      style={{ position: "absolute", top: "4px", right: "4px", background: "rgba(239, 68, 68, 0.9)", color: "#FFF", border: "none", borderRadius: "50%", width: "20px", height: "20px", cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#475569", marginBottom: "6px" }}>Descripción</label>
            <textarea
              placeholder="Presentación, textura, rendimiento..."
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #E2E8F0", outline: "none", fontSize: "13px" }}
              rows={3}
            />
          </div>

          <button
            type="submit"
            disabled={isUploading}
            style={{
              gridColumn: "1 / -1",
              padding: "16px",
              background: "#0284C7",
              color: "#FFF",
              border: "none",
              borderRadius: "14px",
              fontSize: "15px",
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            {isUploading ? "Publicando en Firebase..." : `Publicar Producto (${productForm.images.length} Fotos)`}
          </button>
        </form>
      </div>

      {/* Inventario Activo */}
      <div style={{ background: "#FFF", padding: "28px", borderRadius: "24px", border: "1px solid #E2E8F0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 900, marginBottom: "16px", color: "#0F172A" }}>
          Inventario Activo ({products.length})
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          {products.map((prod) => {
            const prodImages = prod.images && prod.images.length > 0 ? prod.images : [prod.imageUrl];
            return (
              <div key={prod.id} style={{ display: "flex", gap: "12px", padding: "14px", background: "#F8FAFC", borderRadius: "18px", border: "1px solid #E2E8F0", alignItems: "center" }}>
                <img
                  src={prodImages[0]}
                  alt={prod.name}
                  onClick={() => setLightboxImage(prodImages[0])}
                  style={{ width: "65px", height: "65px", objectFit: "cover", borderRadius: "12px", cursor: "pointer" }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: "13px", color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</div>
                  <div style={{ fontSize: "13px", color: "#0284C7", fontWeight: 900 }}>S/ {Number(prod.price).toFixed(2)}</div>
                  <div style={{ fontSize: "11px", color: "#64748B" }}>Stock: {prod.stock}</div>
                </div>
                <button
                  onClick={() => handleDeleteProduct(prod.id)}
                  style={{ border: "none", background: "none", color: "#EF4444", cursor: "pointer", padding: "6px" }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
