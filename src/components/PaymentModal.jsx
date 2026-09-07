import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { CheckCircle2, X, Truck, MapPin, ShieldCheck, QrCode, AlertCircle } from "lucide-react";

const FREE_DELIVERY_DISTRICTS = [
  "Comas",
  "Independencia",
  "San Martín de Porres",
  "Los Olivos"
];

const OTHER_LIMA_DISTRICTS = [
  "Ate", "Barranco", "Breña", "Carabayllo", "Cercado de Lima", "Chorrillos",
  "El Agustino", "Jesús María", "La Molina", "La Victoria", "Lince",
  "Magdalena del Mar", "Miraflores", "Pueblo Libre", "Puente Piedra", "Rímac",
  "San Borja", "San Isidro", "San Juan de Lurigancho", "San Juan de Miraflores",
  "San Luis", "San Miguel", "Santa Anita", "Santiago de Surco", "Surquillo", "Villa El Salvador", "Villa María del Triunfo"
];

export default function PaymentModal({ isOpen, onClose }) {
  const { cart, totalAmount, clearCart } = useCart();
  const { currentUser } = useAuth();

  const [deliveryMethod, setDeliveryMethod] = useState("delivery"); // 'delivery' | 'pickup'
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const isFreeDelivery = FREE_DELIVERY_DISTRICTS.includes(district);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (deliveryMethod === "delivery" && !district) {
      alert("Por favor selecciona un distrito para el envío.");
      return;
    }
    if (deliveryMethod === "delivery" && !address.trim()) {
      alert("Por favor ingresa la dirección de entrega.");
      return;
    }
    if (!paymentRef.trim()) {
      alert("Por favor ingresa el número de operación del pago.");
      return;
    }

    setLoading(true);
    try {
      const estimatedCost = cart.reduce(
        (acc, it) => acc + (Number(it.cost) || it.price * 0.7) * it.quantity,
        0
      );

      await addDoc(collection(db, "orders"), {
        userId: currentUser?.uid || "invitado",
        clientName: currentUser?.displayName || "Cliente",
        clientEmail: currentUser?.email || "sin_correo@ejemplo.com",
        deliveryMethod,
        district: deliveryMethod === "pickup" ? "MegaPlaza Independencia (Recojo)" : district,
        address: deliveryMethod === "pickup" ? "Punto de Entrega: MegaPlaza Independencia" : address,
        items: cart,
        totalItemsCount: cart.reduce((acc, it) => acc + it.quantity, 0),
        totalAmount,
        estimatedCost,
        netProfit: totalAmount - estimatedCost,
        paymentMethod: "YAPE/PLIN",
        paymentRef: paymentRef.trim(),
        status: "Pendiente",
        createdAt: new Date().toISOString()
      });

      setSuccess(true);
      clearCart();
    } catch (err) {
      console.error(err);
      alert("Error al procesar el pedido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          style={{ position: "absolute", top: "20px", right: "20px", border: "none", background: "none", cursor: "pointer" }}
        >
          <X size={20} color="#94A3B8" />
        </button>

        {success ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <CheckCircle2 size={64} color="#10B981" style={{ margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: "22px", fontWeight: 900, color: "#0F172A", marginBottom: "8px" }}>
              ¡Pedido Registrado con Éxito!
            </h3>
            <p style={{ fontSize: "14px", color: "#64748B", lineHeight: "1.6", marginBottom: "24px" }}>
              Hemos validado tu solicitud a nombre de <b>Mecatrónica Pearc S.A.C.</b> Nos comunicaremos al número asignado para despachar o coordinar el recojo.
            </p>
            <button onClick={() => { setSuccess(false); onClose(); }} className="btn-primary" style={{ margin: "0 auto", padding: "12px 32px" }}>
              Aceptar y Continuar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "22px", fontWeight: 900, color: "#0F172A" }}>Finalizar Compra</h3>
              <p style={{ fontSize: "13px", color: "#64748B" }}>Elige tu método de entrega y confirma tu abono</p>
            </div>

            {/* Selector de Modalidad */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              <button
                type="button"
                onClick={() => setDeliveryMethod("delivery")}
                style={{
                  padding: "12px",
                  borderRadius: "14px",
                  border: deliveryMethod === "delivery" ? "2px solid #0284C7" : "1px solid #E2E8F0",
                  background: deliveryMethod === "delivery" ? "#F0F9FF" : "#FFFFFF",
                  color: deliveryMethod === "delivery" ? "#0284C7" : "#64748B",
                  fontWeight: 800,
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  cursor: "pointer"
                }}
              >
                <Truck size={16} /> Envío a Domicilio
              </button>

              <button
                type="button"
                onClick={() => setDeliveryMethod("pickup")}
                style={{
                  padding: "12px",
                  borderRadius: "14px",
                  border: deliveryMethod === "pickup" ? "2px solid #0284C7" : "1px solid #E2E8F0",
                  background: deliveryMethod === "pickup" ? "#F0F9FF" : "#FFFFFF",
                  color: deliveryMethod === "pickup" ? "#0284C7" : "#64748B",
                  fontWeight: 800,
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  cursor: "pointer"
                }}
              >
                <MapPin size={16} /> Recojo en Punto (Gratis)
              </button>
            </div>

            {/* Recuadro de pago Yape/Plin */}
            <div className="payment-box">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", fontWeight: 800 }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#0284C7" }}>
                  <ShieldCheck size={18} /> Abono Oficial Yape / Plin
                </span>
                <span style={{ background: "#0284C7", color: "#fff", padding: "4px 12px", borderRadius: "12px", fontWeight: 900 }}>
                  926 689 484
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "#1E293B", margin: "8px 0 4px" }}>
                <b>Titular:</b> Mecatrónica Pearc S.A.C.
              </p>
              <img
                src="/assets/qr-pago.png"
                alt="QR Pago"
                className="qr-img"
                onError={(e) => {
                  e.target.src = "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=YAPE-PLIN-926689484-MecatronicaPearcSAC";
                }}
              />
              <div style={{ fontSize: "11px", color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                <QrCode size={14} /> Escanea con tu app para pagar al instante
              </div>
            </div>

            {/* Si elige Recojo en Punto */}
            {deliveryMethod === "pickup" ? (
              <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "16px", padding: "14px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#065F46", fontWeight: 800, fontSize: "13px" }}>
                  <MapPin size={18} color="#10B981" />
                  <span>Punto Oficial de Entrega: MegaPlaza Independencia</span>
                </div>
                <p style={{ fontSize: "12px", color: "#047857", marginTop: "4px" }}>
                  ¡Recojo 100% Gratuito! Una vez confirmado el pago, coordinamos la entrega exacta dentro del centro comercial.
                </p>
              </div>
            ) : (
              /* Si elige Envío a Domicilio */
              <>
                <div className="form-group">
                  <label className="form-label">Distrito de Entrega</label>
                  <select
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Selecciona tu distrito...</option>
                    <optgroup label="Cobertura 100% Gratis">
                      {FREE_DELIVERY_DISTRICTS.map((d) => (
                        <option key={d} value={d}>{d} (Envío Gratis)</option>
                      ))}
                    </optgroup>
                    <optgroup label="Otros Distritos (Flete Adicional)">
                      {OTHER_LIMA_DISTRICTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </optgroup>
                  </select>

                  {district && isFreeDelivery && (
                    <div className="delivery-badge" style={{ marginTop: "8px" }}>
                      <Truck size={16} />
                      <span>¡Delivery 100% Gratis aplicado a {district}!</span>
                    </div>
                  )}

                  {district && !isFreeDelivery && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#FEF3C7", border: "1px solid #FDE68A", color: "#92400E", padding: "10px 14px", borderRadius: "12px", fontSize: "12px", marginTop: "8px", fontWeight: 600 }}>
                      <AlertCircle size={16} />
                      <span>Flete adicional a coordinar con soporte o mediante nuestro Asistente Virtual.</span>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Dirección Exacta de Destino</label>
                  <input
                    required
                    type="text"
                    placeholder="Av./Jr./Calle, Número y Referencia"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="form-input"
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">N° de Operación / Ref. de Pago</label>
              <input
                required
                type="text"
                placeholder="Código que figura en tu comprobante"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="form-input"
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px solid #F1F5F9", paddingTop: "14px", marginBottom: "16px" }}>
              <span style={{ fontSize: "14px", fontWeight: 800, color: "#64748B" }}>Total a Pagar:</span>
              <span style={{ fontSize: "24px", fontWeight: 900, color: "#0284C7" }}>S/ {totalAmount.toFixed(2)}</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: "100%", padding: "14px", fontSize: "15px" }}
            >
              {loading ? "Validando Operación..." : "Confirmar y Enviar Pedido"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}