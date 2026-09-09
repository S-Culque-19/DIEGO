import React from "react";
import { MessageCircle, ShieldCheck, MapPin, Clock } from "lucide-react";

export default function Footer() {
  const whatsappUrl = "https://wa.me/51926689484?text=Hola%20Distribuidora%20DIEGO,%20deseo%20hacer%20un%20pedido%20o%20consultar%20precios%20por%20mayor.";

  return (
    <footer style={{ backgroundColor: "#0F172A", color: "#F8FAFC", padding: "60px 20px 30px", marginTop: "80px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "40px", marginBottom: "40px" }}>
        
        {/* Marca */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ background: "#0284C7", color: "#FFF", width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>D</div>
            <span style={{ fontSize: "20px", fontWeight: 900, letterSpacing: "-0.5px" }}>DIEGO</span>
          </div>
          <p style={{ fontSize: "13px", color: "#94A3B8", lineHeight: 1.6, marginBottom: "20px" }}>
            Distribución mayorista y minorista de papel higiénico y toalla en planchas termoselladas para Lima Norte.
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "#22C55E",
              color: "#FFF",
              padding: "12px 20px",
              borderRadius: "14px",
              textDecoration: "none",
              fontWeight: 800,
              fontSize: "13px",
              boxShadow: "0 4px 14px rgba(34, 197, 94, 0.3)"
            }}
          >
            <MessageCircle size={18} />
            <span>Pedir por WhatsApp: 926 689 484</span>
          </a>
        </div>

        {/* Cobertura */}
        <div>
          <h4 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "16px", color: "#FFF" }}>Zonas con Delivery Gratis</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "13px", color: "#94A3B8", display: "flex", flexDirection: "column", gap: "8px" }}>
            <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><MapPin size={14} color="#0284C7" /> Comas</li>
            <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><MapPin size={14} color="#0284C7" /> Independencia</li>
            <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><MapPin size={14} color="#0284C7" /> San Martín de Porres</li>
            <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><MapPin size={14} color="#0284C7" /> Los Olivos</li>
            <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><MapPin size={14} color="#22C55E" /> Punto de recojo: MegaPlaza Independencia</li>
          </ul>
        </div>

        {/* Medios de Pago y Horario */}
        <div>
          <h4 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "16px", color: "#FFF" }}>Información Comercial</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", color: "#94A3B8" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={15} color="#0284C7" />
              <span>Lunes a Domingo: 8:00 AM - 8:00 PM</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldCheck size={15} color="#0284C7" />
              <span>Abonos Yape y Plin: 926 689 484</span>
            </div>
            <span>Aceptamos efectivo contra entrega al recibir el pedido.</span>
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #1E293B", paddingTop: "24px", textAlign: "center", fontSize: "12px", color: "#64748B" }}>
        © {new Date().getFullYear()} Distribuidora DIEGO. Todos los derechos reservados.
      </div>
    </footer>
  );
}

