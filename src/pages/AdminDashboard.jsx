import React, { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import * as XLSX from "xlsx";
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
  BellRing,
  X,
  Eye,
  Images
} from "lucide-react";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);

  // Formulario Producto con soporte multi-imagen
  const [productForm, setProductForm] = useState({
    name: "",
    category: "Papel Higiénico",
    price: "",
    cost: "",
    stock: "",
    description: "",
    images: [] // Arreglo de fotos en base64
  });

  // Modal para ver imagen en grande
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, "orders"), (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubProducts = onSnapshot(collection(db, "products"), (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubOrders();
      unsubProducts();
    };
  }, []);

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

    e.target.value = ""; // Reiniciar input
  };

  const handleRemoveSelectedImage = (indexToRemove) => {
    setProductForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Métricas financieras
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const totalCost = orders.reduce((sum, o) => sum + (Number(o.estimatedCost) || 0), 0);
  const netProfit = totalRevenue - totalCost;
  const totalUnitsSold = orders.reduce((sum, o) => sum + (Number(o.totalItemsCount) || 0), 0);

  const exportAccountingToExcel = () => {
    const dataForExcel = orders.map((o) => ({
      "ID Pedido": o.id,
      "Fecha": o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "S/F",
      "Cliente": o.clientEmail || "Anónimo",
      "Distrito / Modalidad": o.district || "No especificado",
      "Dirección": o.address || "Punto de Recojo",
      "Items Cantidad": o.totalItemsCount || 0,
      "Total Venta (S/)": Number(o.totalAmount || 0).toFixed(2),
      "Costo Estimado (S/)": Number(o.estimatedCost || 0).toFixed(2),
      "Ganancia Neta (S/)": Number(o.netProfit || 0).toFixed(2),
      "Ref. Pago": o.paymentRef || "N/A",
      "Estado": o.status || "Pendiente"
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contabilidad_Ventas");
    XLSX.writeFile(workbook, `Reporte_Contabilidad_DIEGO_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
        imageUrl: productForm.images[0], // Compatibilidad con vistas previas antiguas
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
      alert("¡Producto guardado exitosamente con todas sus fotos!");
    } catch (err) {
      console.error(err);
      alert("Error al guardar en Firebase: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (confirm("¿Estás seguro de eliminar este producto de la base de datos?")) {
      await deleteDoc(doc(db, "products", id));
    }
  };

  return (
    <div style={{ padding: "40px 20px", maxWidth: "1240px", margin: "0 auto" }}>
      {/* Lightbox para ver la imagen en grande */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}
          >
            <button
              onClick={() => setLightboxImage(null)}
              style={{
                position: "absolute",
                top: "-15px",
                right: "-15px",
                background: "#EF4444",
                color: "#FFFFFF",
                border: "2px solid #FFFFFF",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
              }}
            >
              <X size={20} />
            </button>
            <img
              src={lightboxImage}
              alt="Vista previa ampliada"
              style={{
                maxWidth: "100%",
                maxHeight: "85vh",
                borderRadius: "16px",
                objectFit: "contain",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
              }}
            />
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 900, color: "#0F172A" }}>
          Panel Exclusivo de Administración
        </h1>
        <button
          onClick={() => {
            playNotificationChime();
            triggerBrowserNotification("Alerta Activa", "Notificaciones operativas.");
          }}
          className="btn-secondary"
          style={{ fontSize: "12px", padding: "8px 16px" }}
        >
          <BellRing size={16} color="#0284C7" /> Probar Alerta Sonora
        </button>
      </div>

      {/* Métricas Financieras */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <div style={{ background: "#fff", padding: "20px", borderRadius: "20px", border: "1px solid #E0F2FE", boxShadow: "var(--shadow-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "12px", background: "#E0F2FE", borderRadius: "14px", color: "#0284C7" }}><DollarSign size={24} /></div>
            <div>
              <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 800 }}>INGRESOS TOTALES</div>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "#0F172A" }}>S/ {totalRevenue.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", padding: "20px", borderRadius: "20px", border: "1px solid #E0F2FE", boxShadow: "var(--shadow-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "12px", background: "#FEE2E2", borderRadius: "14px", color: "#EF4444" }}><TrendingUp size={24} style={{ transform: "rotate(180deg)" }} /></div>
            <div>
              <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 800 }}>COSTOS TOTALES</div>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "#0F172A" }}>S/ {totalCost.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", padding: "20px", borderRadius: "20px", border: "1px solid #E0F2FE", boxShadow: "var(--shadow-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "12px", background: "#DCFCE7", borderRadius: "14px", color: "#16A34A" }}><TrendingUp size={24} /></div>
            <div>
              <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 800 }}>GANANCIA NETA</div>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "#16A34A" }}>S/ {netProfit.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", padding: "20px", borderRadius: "20px", border: "1px solid #E0F2FE", boxShadow: "var(--shadow-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "12px", background: "#FEF3C7", borderRadius: "14px", color: "#D97706" }}><PackageCheck size={24} /></div>
            <div>
              <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 800 }}>UNIDADES VENDIDAS</div>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "#0F172A" }}>{totalUnitsSold}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Soporte en vivo */}
      <h2 style={{ fontSize: "20px", fontWeight: 900, marginBottom: "16px", color: "#0F172A" }}>
        Centro de Mensajería & Soporte en Vivo
      </h2>
      <AdminSupportChat />

      {/* Formulario de producto con subida multi-foto */}
      <div style={{ background: "#fff", padding: "28px", borderRadius: "24px", border: "1px solid #E0F2FE", boxShadow: "var(--shadow-card)", marginBottom: "36px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 900, marginBottom: "18px", display: "flex", alignItems: "center", gap: "10px", color: "#0F172A" }}>
          <PlusCircle size={22} color="#0EA5E9" /> Agregar Producto al Catálogo (Múltiples Fotos)
        </h2>

        <form onSubmit={handleSaveProduct} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px" }}>
          <div>
            <label className="form-label">Nombre del Producto</label>
            <input
              type="text"
              required
              placeholder="Ej. Papel Higiénico 40m Doble Hoja"
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Categoría</label>
            <select
              value={productForm.category}
              onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
              className="form-input"
            >
              <option value="Papel Higiénico">Papel Higiénico</option>
              <option value="Papel Toalla">Papel Toalla</option>
            </select>
          </div>

          <div>
            <label className="form-label">Precio de Venta (S/)</label>
            <input
              type="number"
              step="0.10"
              required
              placeholder="Ej. 35.00"
              value={productForm.price}
              onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Costo Unitario (S/)</label>
            <input
              type="number"
              step="0.10"
              required
              placeholder="Ej. 22.00"
              value={productForm.cost}
              onChange={(e) => setProductForm({ ...productForm, cost: e.target.value })}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Stock Disponible</label>
            <input
              type="number"
              required
              placeholder="Ej. 50"
              value={productForm.stock}
              onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
              className="form-input"
            />
          </div>

          {/* Selector de Múltiples Fotos */}
          <div>
            <label className="form-label">Subir Varias Fotos desde el Dispositivo</label>
            <label style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px",
              background: "#F0F9FF",
              border: "2px dashed #38BDF8",
              borderRadius: "16px",
              cursor: "pointer",
              color: "#0284C7",
              fontWeight: 700,
              fontSize: "13px"
            }}>
              <Upload size={18} />
              <span>Seleccionar 1 o más imágenes</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleMultipleImageUpload}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {/* Miniaturas de fotos seleccionadas con botón para ver en grande y eliminar */}
          {productForm.images.length > 0 && (
            <div style={{ gridColumn: "1 / -1", padding: "16px", background: "#F8FAFC", borderRadius: "16px", border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px", fontSize: "13px", fontWeight: 800, color: "#0284C7" }}>
                <Images size={18} />
                <span>{productForm.images.length} fotos seleccionadas (Haz clic en una para ampliarla)</span>
              </div>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {productForm.images.map((img, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: "relative",
                      width: "85px",
                      height: "85px",
                      borderRadius: "12px",
                      overflow: "hidden",
                      border: idx === 0 ? "2px solid #0284C7" : "1px solid #CBD5E1",
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.06)"
                    }}
                  >
                    <img
                      src={img}
                      alt={`Miniatura ${idx + 1}`}
                      onClick={() => setLightboxImage(img)}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />

                    {idx === 0 && (
                      <span style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: "rgba(2, 132, 199, 0.9)",
                        color: "#fff",
                        fontSize: "9px",
                        textAlign: "center",
                        fontWeight: 900,
                        padding: "1px 0"
                      }}>
                        PORTADA
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSelectedImage(idx);
                      }}
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        background: "rgba(239, 68, 68, 0.9)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer"
                      }}
                      title="Quitar foto"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">Descripción</label>
            <textarea
              placeholder="Detalla las características de la presentación..."
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              className="form-input"
              rows={3}
            />
          </div>

          <button
            type="submit"
            disabled={isUploading}
            className="btn-primary"
            style={{ gridColumn: "1 / -1", padding: "14px", fontSize: "15px" }}
          >
            {isUploading ? "Guardando en Firebase..." : `Publicar Producto (${productForm.images.length} Fotos)`}
          </button>
        </form>
      </div>

      {/* Listado de Productos Existentes */}
      <div style={{ background: "#fff", padding: "28px", borderRadius: "24px", border: "1px solid #E0F2FE", boxShadow: "var(--shadow-card)", marginBottom: "36px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 900, marginBottom: "16px", color: "#0F172A" }}>
          Inventario Activo ({products.length})
        </h2>

        {products.length === 0 ? (
          <p style={{ color: "#94A3B8", fontSize: "13px" }}>No has agregado productos a tu base de datos aún.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            {products.map((prod) => {
              const prodImages = prod.images && prod.images.length > 0 ? prod.images : [prod.imageUrl];
              return (
                <div key={prod.id} style={{ display: "flex", gap: "12px", padding: "14px", background: "#F8FAFC", borderRadius: "18px", border: "1px solid #E2E8F0", alignItems: "center" }}>
                  <div
                    style={{ position: "relative", width: "65px", height: "65px", cursor: "pointer", flexShrink: 0 }}
                    onClick={() => setLightboxImage(prodImages[0])}
                    title="Clic para ver foto grande"
                  >
                    <img src={prodImages[0]} alt={prod.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "12px" }} />
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.18)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, hover: { opacity: 1 } }}>
                      <Eye size={16} color="#fff" />
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: "13px", color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prod.name}</div>
                    <div style={{ fontSize: "12px", color: "#0284C7", fontWeight: 900 }}>S/ {Number(prod.price).toFixed(2)}</div>
                    <div style={{ fontSize: "11px", color: "#64748B", display: "flex", gap: "8px", marginTop: "2px" }}>
                      <span>Stock: {prod.stock}</span>
                      <span>•</span>
                      <span>{prodImages.length} fotos</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteProduct(prod.id)}
                    style={{ border: "none", background: "none", color: "#EF4444", cursor: "pointer", padding: "6px" }}
                    title="Eliminar de Firebase"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Registro Contable y Exportar a Excel */}
      <div style={{ background: "#fff", padding: "28px", borderRadius: "24px", border: "1px solid #E0F2FE", boxShadow: "var(--shadow-card)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 900, color: "#0F172A" }}>Ventas y Contabilidad</h2>
            <p style={{ fontSize: "13px", color: "#64748B" }}>Control de pedidos y órdenes registradas</p>
          </div>
          <button
            onClick={exportAccountingToExcel}
            className="btn-primary"
            style={{ background: "#10B981" }}
          >
            <FileSpreadsheet size={18} />
            <span>Descargar Reporte en Excel (.xlsx)</span>
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", textAlign: "left", fontSize: "13px", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F0F9FF", color: "#0369A1" }}>
                <th style={{ padding: "12px" }}>ID</th>
                <th style={{ padding: "12px" }}>Cliente</th>
                <th style={{ padding: "12px" }}>Distrito / Modalidad</th>
                <th style={{ padding: "12px" }}>Total (S/)</th>
                <th style={{ padding: "12px" }}>Ganancia (S/)</th>
                <th style={{ padding: "12px" }}>Ref. Pago</th>
                <th style={{ padding: "12px" }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "12px", fontFamily: "monospace" }}>{o.id.slice(0, 6)}</td>
                  <td style={{ padding: "12px" }}>{o.clientEmail}</td>
                  <td style={{ padding: "12px" }}>{o.district}</td>
                  <td style={{ padding: "12px", fontWeight: 800, color: "#0F172A" }}>S/ {Number(o.totalAmount).toFixed(2)}</td>
                  <td style={{ padding: "12px", fontWeight: 800, color: "#16A34A" }}>S/ {Number(o.netProfit || 0).toFixed(2)}</td>
                  <td style={{ padding: "12px" }}>{o.paymentRef}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ background: "#FEF3C7", color: "#D97706", padding: "4px 10px", borderRadius: "10px", fontSize: "11px", fontWeight: 800 }}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}