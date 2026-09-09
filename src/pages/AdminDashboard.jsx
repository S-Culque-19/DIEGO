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
  Clock
} from "lucide-react";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);

  // 15 Rangos temporales estandarizados
  const [timeRange, setTimeRange] = useState("all");

  const isFirstLoadRef = useRef(true);
  const prevOrdersCountRef = useRef(0);

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

  // Listener de Firebase en tiempo real
  useEffect(() => {
    const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));

    const unsubOrders = onSnapshot(
      ordersQuery,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

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

  // Filtro temporal dinámico con las 15 opciones
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
        case "today":
          return (
            orderDate.getDate() === now.getDate() &&
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getFullYear() === now.getFullYear()
          );
        case "7d": return diffDays <= 7;
        case "14d": return diffDays <= 14;
        case "1m": return diffDays <= 30;
        case "2m": return diffDays <= 60;
        case "3m": return diffDays <= 90;
        case "4m": return diffDays <= 120;
        case "5m": return diffDays <= 150;
        case "6m": return diffDays <= 180;
        case "7m": return diffDays <= 210;
        case "8m": return diffDays <= 240;
        case "9m": return diffDays <= 270;
        case "10m": return diffDays <= 300;
        case "1y": return diffDays <= 365;
        default: return true;
      }
    });
  }, [orders, timeRange]);

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case "today": return "1 Día (Hoy)";
      case "7d": return "7 Días (1 Semana)";
      case "14d": return "14 Días (2 Semanas)";
      case "1m": return "1 Mes (30 Días)";
      case "2m": return "2 Meses (60 Días)";
      case "3m": return "3 Meses (90 Días)";
      case "4m": return "4 Meses (120 Días)";
      case "5m": return "5 Meses (150 Días)";
      case "6m": return "6 Meses (Semestre)";
      case "7m": return "7 Meses";
      case "8m": return "8 Meses";
      case "9m": return "9 Meses";
      case "10m": return "10 Meses";
      case "1y": return "1 Año (365 Días)";
      default: return "Histórico Total";
    }
  };

  // Métricas financieras reactivas
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
        console.error("Error al eliminar pedido:", error);
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

  // EXPORTADOR EXCELJS CORPORATIVO (IMPECABLE)
  const exportAccountingToExcel = async () => {
    if (filteredOrders.length === 0) {
      alert("No existen registros en el período seleccionado para exportar.");
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

    // 11 Columnas exactas profesionales
    worksheet.columns = [
      { key: "orderId", width: 15 },
      { key: "date", width: 18 },
      { key: "client", width: 20 },
      { key: "email", width: 24 },
      { key: "modality", width: 26 },
      { key: "items", width: 38 },
      { key: "units", width: 10 },
      { key: "revenue", width: 18 },
      { key: "cost", width: 18 },
      { key: "profit", width: 18 },
      { key: "status", width: 14 }
    ];

    // Fila 1: Banner Institucional
    worksheet.mergeCells("A1:K1");
    const titleRow = worksheet.getRow(1);
    titleRow.height = 40;
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "DISTRIBUIDORA DIEGO — BALANCE FINANCIERO Y CONTROL DE OPERACIONES";
    titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF002D62" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };

    // Fila 2: Subtítulo
    worksheet.mergeCells("A2:K2");
    const subRow = worksheet.getRow(2);
    subRow.height = 22;
    const subCell = worksheet.getCell("A2");
    subCell.value = `Período Auditado: ${getTimeRangeLabel()} | Emisión: ${formattedDate} ${formattedTime} | Auditor: vq2403@diego.org.com | Moneda: Soles (S/)`;
    subCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF334155" } };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    subCell.alignment = { vertical: "middle", horizontal: "center" };

    // Fila 3: Separador
    worksheet.getRow(3).height = 10;

    // Fila 4: Cabecera
    const headers = [
      "N° PEDIDO",
      "FECHA / HORA",
      "CLIENTE",
      "CORREO",
      "MODALIDAD / DESTINO",
      "DETALLE DE PRODUCTOS",
      "UNID.",
      "TOTAL VENTA (S/)",
      "COSTO ESTIMADO (S/)",
      "UTILIDAD NETA (S/)",
      "ESTADO"
    ];

    const headerRow = worksheet.getRow(4);
    headerRow.values = headers;
    headerRow.height = 28;

    headerRow.eachCell((cell) => {
      cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
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
      Entregado: { bg: "FFDCFCE7", font: "FF15803D" },
      Verificado: { bg: "FFEEF2FF", font: "FF4F46E5" },
      "En proceso": { bg: "FFFEF3C7", font: "FFD97706" },
      "En camino": { bg: "FFE0F2FE", font: "FF0284C7" },
      Pendiente: { bg: "FFFEE2E2", font: "FFB91C1C" }
    };

    // Filas 5+: Cuerpo
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
      const statusStr = o.status || "Pendiente";

      row.getCell(1).value = `#D-${o.id.slice(0, 8).toUpperCase()}`;
      row.getCell(2).value = orderDateStr;
      row.getCell(3).value = o.clientName || "Cliente Web";
      row.getCell(4).value = (o.clientEmail || "anonimo@diego.com").toLowerCase();
      row.getCell(5).value = o.district ? `${o.district} (${o.address || "Punto de Entrega"})` : (o.address || "Punto de Recojo");
      row.getCell(6).value = itemsStr;
      row.getCell(7).value = units;
      row.getCell(8).value = revenue;
      row.getCell(9).value = cost;
      row.getCell(10).value = { formula: `H${rowIndex}-I${rowIndex}` };
      row.getCell(11).value = statusStr;

      const isEven = index % 2 === 1;
      const rowBg = isEven ? "FFF8FAFC" : "FFFFFFFF";

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: "Calibri", size: 10, color: { argb: "FF0F172A" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        cell.border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } }
        };

        if (colNumber === 1 || colNumber === 2) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        } else if (colNumber >= 3 && colNumber <= 5) {
          cell.alignment = { vertical: "middle", horizontal: "left" };
        } else if (colNumber === 6) {
          cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
        } else if (colNumber === 7) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.numFmt = "#,##0";
        } else if (colNumber >= 8 && colNumber <= 10) {
          cell.numFmt = '"S/ "#,##0.00;[Red]-"S/ "#,##0.00;"S/ "0.00';
          cell.alignment = { vertical: "middle", horizontal: "right" };
        } else if (colNumber === 11) {
          const badge = statusTheme[statusStr] || statusTheme["Pendiente"];
          cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: badge.font } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: badge.bg } };
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }
      });
    });

    // Fila Final de Totales (Consolidado Bancario)
    const summaryRowIndex = 5 + filteredOrders.length;
    const summaryRow = worksheet.getRow(summaryRowIndex);
    summaryRow.height = 32;

    summaryRow.getCell(1).value = "TOTALES";
    summaryRow.getCell(2).value = "-";
    summaryRow.getCell(3).value = "-";
    summaryRow.getCell(4).value = "-";
    summaryRow.getCell(5).value = "-";
    summaryRow.getCell(6).value = "CONSOLIDADO DEL PERÍODO";
    summaryRow.getCell(7).value = { formula: `SUM(G5:G${summaryRowIndex - 1})` };
    summaryRow.getCell(8).value = { formula: `SUM(H5:H${summaryRowIndex - 1})` };
    summaryRow.getCell(9).value = { formula: `SUM(I5:I${summaryRowIndex - 1})` };
    summaryRow.getCell(10).value = { formula: `SUM(J5:J${summaryRowIndex - 1})` };
    summaryRow.getCell(11).value = "CONCILIADO";

    summaryRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FF002D62" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
      cell.border = {
        top: { style: "thin", color: { argb: "FF0F172A" } },
        bottom: { style: "double", color: { argb: "FF0F172A" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } }
      };

      if (colNumber === 7) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.numFmt = "#,##0";
      } else if (colNumber >= 8 && colNumber <= 10) {
        cell.numFmt = '"S/ "#,##0.00;[Red]-"S/ "#,##0.00;"S/ "0.00';
        cell.alignment = { vertical: "middle", horizontal: "right" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    const fileName = `Reporte_Contable_DIEGO_${timeRange}_${year}-${month}-${day}_${hours}${minutes}.xlsx`;
    saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), fileName);
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "Verificado": return { bg: "#EEF2FF", color: "#4F46E5", border: "#C7D2FE" };
      case "En proceso": return { bg: "#FEF3C7", color: "#D97706", border: "#FDE68A" };
      case "En camino": return { bg: "#E0F2FE", color: "#0284C7", border: "#BAE6FD" };
      case "Entregado": return { bg: "#DCFCE7", color: "#15803D", border: "#BBF7D0" };
      default: return { bg: "#FEE2E2", color: "#B91C1C", border: "#FECACA" };
    }
  };

  const timePills = [
    { id: "today", label: "1 Día" },
    { id: "7d", label: "7 Días" },
    { id: "14d", label: "14 Días" },
    { id: "1m", label: "1 Mes" },
    { id: "2m", label: "2 Meses" },
    { id: "3m", label: "3 Meses" },
    { id: "4m", label: "4 Meses" },
    { id: "5m", label: "5 Meses" },
    { id: "6m", label: "6 Meses" },
    { id: "7m", label: "7 Meses" },
    { id: "8m", label: "8 Meses" },
    { id: "9m", label: "9 Meses" },
    { id: "10m", label: "10 Meses" },
    { id: "1y", label: "1 Año" },
    { id: "all", label: "Histórico Total" }
  ];

  return (
    <div style={{ padding: "40px 20px", maxWidth: "1380px", margin: "0 auto", backgroundColor: "#F8FAFC", minHeight: "100vh" }}>
      {/* Lightbox Modal */}
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

      {/* Header General */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 900, color: "#0F172A", margin: 0 }}>
            Panel de Operaciones & Despacho
          </h1>
          <p style={{ fontSize: "14px", color: "#64748B", marginTop: "4px" }}>
            Control financiero centralizado, auditoría de ventas y mensajería en vivo.
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

      {/* Tarjetas Métricas Reactivas */}
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
              <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 800 }}>UTILIDAD NETA</div>
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

      {/* Centro de Mensajería en Vivo */}
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

      {/* TARJETA PRINCIPAL: AUDITORÍA GENERAL CON BARRA MULTITEMPORAL */}
      <div style={{ background: "#FFF", padding: "28px", borderRadius: "24px", border: "1px solid #E2E8F0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", marginBottom: "40px" }}>
        {/* Cabecera Superior con Botón de Descarga Dinámico */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#0F172A", margin: 0 }}>
              Auditoría General de Ventas ({filteredOrders.length})
            </h2>
            <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
              Compras emitidas por clientes. Actualiza estados logísticos o genera el balance contable.
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
              padding: "12px 24px",
              borderRadius: "14px",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: "13px",
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)"
            }}
          >
            <FileSpreadsheet size={18} />
            <span>Descargar Balance de {getTimeRangeLabel()} (.xlsx)</span>
          </button>
        </div>

        {/* BARRA MULTITEMPORAL COMPLETA: 15 PÍLDORAS SEGMENTADAS */}
        <div style={{
          background: "#F8FAFC",
          padding: "14px 16px",
          borderRadius: "18px",
          border: "1px solid #E2E8F0",
          marginBottom: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 800, color: "#475569" }}>
              <Clock size={15} color="#0284C7" />
              <span>Filtrar Balance por Período:</span>
              <span style={{ color: "#0284C7", background: "#E0F2FE", padding: "3px 10px", borderRadius: "8px", fontWeight: 900 }}>
                {getTimeRangeLabel()}
              </span>
            </div>
            <span style={{ fontSize: "11px", color: "#94A3B8" }}>
              {filteredOrders.length} orden(es) auditada(s)
            </span>
          </div>

          {/* Botonera de Píldoras Interactivas */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {timePills.map((pill) => {
              const isActive = timeRange === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setTimeRange(pill.id)}
                  style={{
                    padding: "6px 13px",
                    borderRadius: "10px",
                    border: isActive ? "1px solid #0284C7" : "1px solid #E2E8F0",
                    background: isActive ? "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)" : "#FFFFFF",
                    color: isActive ? "#FFFFFF" : "#475569",
                    fontWeight: 800,
                    fontSize: "11.5px",
                    cursor: "pointer",
                    boxShadow: isActive ? "0 4px 12px rgba(2, 132, 199, 0.25)" : "none",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap"
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabla de Datos de Ventas */}
        {filteredOrders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#94A3B8" }}>
            No hay compras registradas en el período seleccionado ({getTimeRangeLabel()}).
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
                  <th style={{ padding: "14px 16px" }}>Operación / Destino</th>
                  <th style={{ padding: "14px 16px" }}>Estado Logístico</th>
                  <th style={{ padding: "14px 16px", textAlign: "center" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => {
                  const badge = getStatusBadgeStyle(o.status || "Pendiente");
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

      {/* Publicar Producto en el Catálogo */}
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
              placeholder="Presentación, características, rendimiento..."
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