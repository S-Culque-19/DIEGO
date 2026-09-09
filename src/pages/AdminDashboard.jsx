import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "../firebase/config";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { playNotificationChime, triggerBrowserNotification } from "../utils/notificationSound";
import AdminSupportChat from "../components/AdminSupportChat";
import {
  DollarSign,
  TrendingUp,
  PackageCheck,
  FileSpreadsheet,
  PlusCircle,
  Trash2,
  Upload,
  X,
  CreditCard,
  MapPin,
  MessageSquare,
  User,
  Volume2,
  Calendar,
  Filter
} from "lucide-react";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  
  // Selector de período temporal
  // Opciones: 'all' | 'today' | 'week' | 'month' | '2months' | 'year'
  const [timeRange, setTimeRange] = useState("all");

  const isFirstLoadRef = useRef(true);
  const prevOrdersCountRef = useRef(0);

  // Formulario único de productos
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

  // 1. Escucha en tiempo real de Órdenes y Productos con alarma sonora ante nuevas compras
  useEffect(() => {
    const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));

    const unsubOrders = onSnapshot(
      ordersQuery,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Detectar si ingresó una nueva orden de compra emitida por un cliente
        if (!isFirstLoadRef.current && items.length > prevOrdersCountRef.current) {
          const newestOrder = items[0];
          playNotificationChime();
          triggerBrowserNotification(
            "¡NUEVA COMPRA REGISTRADA!",
            `Cliente: ${newestOrder?.clientName || "Cliente"} | Total: S/ ${Number(newestOrder?.totalAmount || 0).toFixed(2)}`
          );
        }

        prevOrdersCountRef.current = items.length;
        isFirstLoadRef.current = false;
        setOrders(items);
      },
      (err) => console.error("Error al escuchar órdenes:", err)
    );

    const unsubProducts = onSnapshot(
      collection(db, "products"),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProducts(items);
      },
      (err) => console.error("Error al escuchar productos:", err)
    );

    return () => {
      unsubOrders();
      unsubProducts();
    };
  }, []);

  // 2. Filtro temporal dinámico para Balance (Día, Semana, Mes, 2 Meses, Año)
  const filteredOrders = useMemo(() => {
    if (timeRange === "all") return orders;

    const now = new Date();
    return orders.filter((o) => {
      if (!o.createdAt) return false;
      const orderDate = new Date(o.createdAt);
      if (isNaN(orderDate.getTime())) return false;

      const diffMs = now.getTime() - orderDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      switch (timeRange) {
        case "today": {
          return (
            orderDate.getDate() === now.getDate() &&
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getFullYear() === now.getFullYear()
          );
        }
        case "week":
          return diffDays <= 7;
        case "month":
          return diffDays <= 30;
        case "2months":
          return diffDays <= 60;
        case "year":
          return diffDays <= 365;
        default:
          return true;
      }
    });
  }, [orders, timeRange]);

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case "today": return "Balance del Día (Hoy)";
      case "week": return "Últimos 7 Días (Semana)";
      case "month": return "Últimos 30 Días (Mes)";
      case "2months": return "Últimos 60 Días (2 Meses)";
      case "year": return "Último Año (12 Meses)";
      default: return "Histórico Completo";
    }
  };

  // Métricas financieras calculadas según el período activo
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const totalCost = filteredOrders.reduce((sum, o) => sum + (Number(o.estimatedCost) || 0), 0);
  const netProfit = totalRevenue - totalCost;
  const totalUnitsSold = filteredOrders.reduce((sum, o) => sum + (Number(o.totalItemsCount) || 0), 0);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      alert("No se pudo actualizar el estado: " + error.message);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm(`¿Confirmas la eliminación permanente del registro #${orderId.slice(0, 8)}?`)) {
      try {
        await deleteDoc(doc(db, "orders", orderId));
      } catch (error) {
        console.error("Error al eliminar orden:", error);
        alert("No se pudo eliminar la orden: " + error.message);
      }
    }
  };

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
      alert("¡Producto publicado en el catálogo exitosamente!");
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

  // EXPORTACIÓN A EXCEL CORPORATIVA CON EXCELJS
  const exportAccountingToExcel = async () => {
    if (filteredOrders.length === 0) {
      alert("No hay registros en el período seleccionado para exportar.");
      return;
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
    const formattedTime = now.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Distribuidora DIEGO";
    workbook.lastModifiedBy = "vq2403@diego.org.com";
    workbook.created = now;
    workbook.modified = now;

    const worksheet = workbook.addWorksheet("Balance General", {
      views: [{ showGridLines: true }]
    });

    // 1. Configuración estricta de anchos de columna (A hasta M)
    worksheet.columns = [
      { key: "orderId", width: 16 },
      { key: "date", width: 20 },
      { key: "client", width: 26 },
      { key: "email", width: 30 },
      { key: "modality", width: 24 },
      { key: "address", width: 32 },
      { key: "items", width: 42 },
      { key: "units", width: 12 },
      { key: "revenue", width: 18 },
      { key: "cost", width: 18 },
      { key: "profit", width: 18 },
      { key: "ref", width: 18 },
      { key: "status", width: 16 }
    ];

    // 2. Fila 1: Banner Institucional
    worksheet.mergeCells("A1:M1");
    const titleRow = worksheet.getRow(1);
    titleRow.height = 42;
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "DISTRIBUIDORA DIEGO — BALANCE FINANCIERO Y CONTROL LOGÍSTICO";
    titleCell.font = { name: "Calibri", size: 15, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF002D62" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };

    // 3. Fila 2: Subtítulo con Período y Auditoría
    worksheet.mergeCells("A2:M2");
    const subRow = worksheet.getRow(2);
    subRow.height = 22;
    const subCell = worksheet.getCell("A2");
    subCell.value = `Período: ${getTimeRangeLabel()}  |  Emisión: ${formattedDate} ${formattedTime}  |  Auditor: vq2403@diego.org.com  |  Registros: ${filteredOrders.length}`;
    subCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF334155" } };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4F8" } };
    subCell.alignment = { vertical: "middle", horizontal: "center" };

    // 4. Fila 3: Fila vacía de separación
    worksheet.getRow(3).height = 10;

    // 5. Fila 4: Cabecera de Tabla
    const headers = [
      "N° PEDIDO",
      "FECHA Y HORA",
      "CLIENTE COMPRADOR",
      "CORREO ELECTRÓNICO",
      "MODALIDAD / DISTRITO",
      "DIRECCIÓN DE ENTREGA",
      "PRODUCTOS DETALLADOS",
      "UNID.",
      "TOTAL VENTA (S/)",
      "COSTO TOTAL (S/)",
      "UTILIDAD NETA (S/)",
      "REF. OPERACIÓN",
      "ESTADO"
    ];

    const headerRow = worksheet.getRow(4);
    headerRow.values = headers;
    headerRow.height = 28;

    headerRow.eachCell((cell) => {
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0A3A60" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "medium", color: { argb: "FF002D62" } },
        bottom: { style: "medium", color: { argb: "FF002D62" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } }
      };
    });

    const statusTheme = {
      Verificado: { bg: "FFEEF2FF", font: "FF4F46E5" },
      "En proceso": { bg: "FFFEF3C7", font: "FFD97706" },
      "En camino": { bg: "FFE0F2FE", font: "FF0284C7" },
      Entregado: { bg: "FFDCFCE7", font: "FF15803D" },
      Pendiente: { bg: "FFFEE2E2", font: "FFB91C1C" }
    };

    let sumUnits = 0;
    let sumRevenue = 0;
    let sumCost = 0;
    let sumProfit = 0;

    // 6. Filas 5+: Datos con diseño Cebra y formato numérico contable
    filteredOrders.forEach((o, index) => {
      const rowIndex = 5 + index;
      const row = worksheet.getRow(rowIndex);

      const orderDate = o.createdAt ? new Date(o.createdAt) : null;
      const orderDateStr = orderDate
        ? `${orderDate.toLocaleDateString("es-PE")} ${orderDate.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`
        : "S/F";

      const itemsStr = Array.isArray(o.items) && o.items.length > 0
        ? o.items.map((i) => `• ${i.name} [x${i.quantity || 1}]`).join("\r\n")
        : "• Orden Estándar";

      const units = Number(o.totalItemsCount) || (Array.isArray(o.items) ? o.items.reduce((acc, i) => acc + (i.quantity || 1), 0) : 1);
      const revenue = Number(o.totalAmount || 0);
      const cost = Number(o.estimatedCost || 0);
      const profit = Number(o.netProfit !== undefined ? o.netProfit : (revenue - cost));
      const statusStr = o.status || "Pendiente";

      sumUnits += units;
      sumRevenue += revenue;
      sumCost += cost;
      sumProfit += profit;

      row.values = [
        `#D-${o.id.slice(0, 8).toUpperCase()}`,
        orderDateStr,
        o.clientName || "Cliente Web",
        (o.clientEmail || "anonimo@diego.com").toLowerCase(),
        o.district || "Punto de Entrega",
        o.address || "Punto de Recojo",
        itemsStr,
        units,
        revenue,
        cost,
        profit,
        o.paymentRef || "N/A",
        statusStr
      ];

      const isEven = index % 2 === 1;
      const rowBg = isEven ? "FFF8FAFC" : "FFFFFFFF";

      row.eachCell((cell, colNumber) => {
        cell.font = { name: "Calibri", size: 10, color: { argb: "FF0F172A" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        cell.border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } }
        };

        if (colNumber >= 9 && colNumber <= 11) {
          cell.numFmt = '"S/ "#,##0.00;[Red]-"S/ "#,##0.00;"S/ "0.00';
          cell.alignment = { vertical: "middle", horizontal: "right" };
        } else if (colNumber === 8) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.numFmt = "#,##0";
        } else if (colNumber === 1 || colNumber === 2 || colNumber === 12) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        } else if (colNumber === 7) {
          cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
        } else if (colNumber === 13) {
          const badge = statusTheme[statusStr] || statusTheme["Pendiente"];
          cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: badge.font } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: badge.bg } };
          cell.alignment = { vertical: "middle", horizontal: "center" };
        } else {
          cell.alignment = { vertical: "middle", horizontal: "left" };
        }
      });
    });

    // 7. Fila Final de Consolidado Financiero (Totales)
    const summaryRowIndex = 5 + filteredOrders.length;
    const summaryRow = worksheet.getRow(summaryRowIndex);

    summaryRow.values = [
      "CONSOLIDADO TOTAL",
      "-",
      "-",
      "-",
      "-",
      "-",
      "TOTALES DEL PERÍODO",
      sumUnits,
      sumRevenue,
      sumCost,
      sumProfit,
      "-",
      "AUDITADO"
    ];

    summaryRow.height = 30;

    summaryRow.eachCell((cell, colNumber) => {
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF0F172A" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
      cell.border = {
        top: { style: "thin", color: { argb: "FF0F172A" } },
        bottom: { style: "double", color: { argb: "FF0F172A" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } }
      };

      if (colNumber >= 9 && colNumber <= 11) {
        cell.numFmt = '"S/ "#,##0.00;[Red]-"S/ "#,##0.00;"S/ "0.00';
        cell.alignment = { vertical: "middle", horizontal: "right" };
        cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF0284C7" } };
      } else if (colNumber === 8) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.numFmt = "#,##0";
      } else {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
    });

    // 8. Generación del Blob y Descarga Automática
    const buffer = await workbook.xlsx.writeBuffer();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    const fileName = `Reporte_Contable_DIEGO_${timeRange}_${year}-${month}-${day}_${hours}${minutes}.xlsx`;
    saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), fileName);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Verificado":
        return { bg: "#EEF2FF", color: "#4F46E5", border: "#C7D2FE" };
      case "En proceso":
        return { bg: "#FEF3C7", color: "#D97706", border: "#FDE68A" };
      case "En camino":
        return { bg: "#E0F2FE", color: "#0284C7", border: "#BAE6FD" };
      case "Entregado":
        return { bg: "#DCFCE7", color: "#15803D", border: "#BBF7D0" };
      default:
        return { bg: "#FEE2E2", color: "#B91C1C", border: "#FECACA" };
    }
  };

  return (
    <div style={{ padding: "40px 20px", maxWidth: "1380px", margin: "0 auto", backgroundColor: "#F8FAFC", minHeight: "100vh" }}>
      {/* Lightbox */}
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

      {/* Header con disparador de alarma industrial */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 900, color: "#0F172A", margin: 0 }}>
            Panel de Operaciones & Despacho
          </h1>
          <p style={{ fontSize: "14px", color: "#64748B", marginTop: "4px" }}>
            Monitoreo en tiempo real de ventas a clientes, mensajería instantánea y stock.
          </p>
        </div>
        <button
          onClick={() => {
            playNotificationChime();
            triggerBrowserNotification("Alarma Industrial Activada", "Sirena modulada de 5 segundos con vibración háptica continua.");
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#DC2626",
            color: "#FFF",
            border: "none",
            padding: "12px 20px",
            borderRadius: "14px",
            cursor: "pointer",
            fontWeight: 800,
            fontSize: "13px",
            boxShadow: "0 4px 14px rgba(220, 38, 38, 0.3)"
          }}
        >
          <Volume2 size={18} /> Probar Sirena Industrial (5s)
        </button>
      </div>

      {/* BARRA DE FILTRO TEMPORAL PARA EL BALANCE */}
      <div style={{ background: "#FFF", padding: "16px 20px", borderRadius: "18px", border: "1px solid #E2E8F0", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#0F172A", fontWeight: 800, fontSize: "14px" }}>
          <Calendar size={18} color="#0284C7" />
          <span>Período del Balance:</span>
          <span style={{ color: "#0284C7" }}>{getTimeRangeLabel()}</span>
        </div>

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[
            { id: "today", label: "Hoy" },
            { id: "week", label: "7 Días" },
            { id: "month", label: "1 Mes" },
            { id: "2months", label: "2 Meses" },
            { id: "year", label: "1 Año" },
            { id: "all", label: "Histórico Total" }
          ].map((tab) => {
            const isActive = timeRange === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTimeRange(tab.id)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "10px",
                  border: isActive ? "1.5px solid #0284C7" : "1px solid #E2E8F0",
                  background: isActive ? "#0284C7" : "#F8FAFC",
                  color: isActive ? "#FFF" : "#475569",
                  fontWeight: 800,
                  fontSize: "12px",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tarjetas Métricas Dinámicas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <div style={{ background: "#FFF", padding: "20px", borderRadius: "20px", border: "1px solid #E0F2FE" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "12px", background: "#E0F2FE", borderRadius: "14px", color: "#0284C7" }}><DollarSign size={24} /></div>
            <div>
              <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 800 }}>INGRESOS ({timeRange.toUpperCase()})</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#0F172A" }}>S/ {totalRevenue.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div style={{ background: "#FFF", padding: "20px", borderRadius: "20px", border: "1px solid #E0F2FE" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "12px", background: "#FEE2E2", borderRadius: "14px", color: "#EF4444" }}><TrendingUp size={24} style={{ transform: "rotate(180deg)" }} /></div>
            <div>
              <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 800 }}>COSTOS ESTIMADOS</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#0F172A" }}>S/ {totalCost.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div style={{ background: "#FFF", padding: "20px", borderRadius: "20px", border: "1px solid #E0F2FE" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "12px", background: "#DCFCE7", borderRadius: "14px", color: "#16A34A" }}><TrendingUp size={24} /></div>
            <div>
              <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 800 }}>GANANCIA NETA</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#16A34A" }}>S/ {netProfit.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div style={{ background: "#FFF", padding: "20px", borderRadius: "20px", border: "1px solid #E0F2FE" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "12px", background: "#FEF3C7", borderRadius: "14px", color: "#D97706" }}><PackageCheck size={24} /></div>
            <div>
              <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 800 }}>UNIDADES VENDIDAS</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#0F172A" }}>{totalUnitsSold}</div>
            </div>
          </div>
        </div>
      </div>

      {/* BANDEJA TIPO MESSENGER INTEGRADA */}
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 900, color: "#0F172A", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
          <MessageSquare size={22} color="#0284C7" />
          <span>Centro de Mensajería & Atención al Cliente</span>
        </h2>
        <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
          Bandeja multicanal con alerta sonora industrial instantánea ante consultas de clientes.
        </p>
      </div>
      <AdminSupportChat />

      {/* REGISTRO DE VENTAS A CLIENTES (FILTRADO POR PERÍODO) */}
      <div style={{ background: "#FFF", padding: "28px", borderRadius: "24px", border: "1px solid #E2E8F0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", marginBottom: "40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 900, color: "#0F172A", margin: 0 }}>
              Auditoría General de Ventas ({filteredOrders.length})
            </h2>
            <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
              Mostrando registros de: <strong>{getTimeRangeLabel()}</strong>
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
              fontSize: "13px",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)"
            }}
          >
            <FileSpreadsheet size={18} />
            <span>Exportar {getTimeRangeLabel()} (.xlsx)</span>
          </button>
        </div>

        {filteredOrders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#94A3B8" }}>
            No hay compras registradas en este período temporal.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "1000px" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #E2E8F0", color: "#475569", textAlign: "left" }}>
                  <th style={{ padding: "14px 16px" }}>ID & Fecha</th>
                  <th style={{ padding: "14px 16px" }}>Cliente Comprador</th>
                  <th style={{ padding: "14px 16px" }}>Productos</th>
                  <th style={{ padding: "14px 16px", textAlign: "center" }}>Cant.</th>
                  <th style={{ padding: "14px 16px" }}>Total</th>
                  <th style={{ padding: "14px 16px" }}>Operación / Entrega</th>
                  <th style={{ padding: "14px 16px" }}>Estado de Despacho</th>
                  <th style={{ padding: "14px 16px", textAlign: "center" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => {
                  const badge = getStatusStyle(o.status || "Pendiente");
                  const itemsList = Array.isArray(o.items) && o.items.length > 0 ? o.items : [];

                  return (
                    <tr key={o.id} style={{ borderBottom: "1px solid #F1F5F9", verticalAlign: "top" }}>
                      <td style={{ padding: "16px" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#0284C7", display: "block" }}>
                          #{o.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span style={{ fontSize: "11px", color: "#94A3B8" }}>
                          {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "S/F"}
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

                      <td style={{ padding: "16px", maxWidth: "260px" }}>
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
                          <span style={{ color: "#94A3B8", fontStyle: "italic", fontSize: "12px" }}>Detalle estándar</span>
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
                            color: badge.color
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
                          style={{ background: "#FEE2E2", border: "none", color: "#DC2626", padding: "8px", borderRadius: "10px", cursor: "pointer" }}
                          title="Eliminar pedido de venta"
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

      {/* ÚNICO MOTOR DE CREACIÓN DE PRODUCTOS */}
      <div style={{ background: "#FFF", padding: "28px", borderRadius: "24px", border: "1px solid #E2E8F0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", marginBottom: "40px" }}>
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
            <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#475569", marginBottom: "6px" }}>Fotos</label>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px", background: "#F0F9FF", border: "2px dashed #38BDF8", borderRadius: "14px", cursor: "pointer", color: "#0284C7", fontWeight: 800, fontSize: "13px" }}>
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
              placeholder="Presentación, características, etc..."
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

      {/* INVENTARIO ACTIVO */}
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
                  title="Eliminar producto"
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