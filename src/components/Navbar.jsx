import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { ShoppingBag, User, LogOut, Package, Shield } from "lucide-react";

export default function Navbar({ onOpenAuth, onOpenCart, onOpenOrders }) {
  const { currentUser, isAdmin, logout } = useAuth();
  const { totalItemsCount, cartBounce } = useCart();

  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 1000,
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid #E2E8F0",
      padding: "14px 24px"
    }}>
      <div style={{
        maxWidth: "1280px",
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            background: "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)",
            color: "#FFF",
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: "20px",
            boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)"
          }}>
            D
          </div>
          <div>
            <span style={{ fontSize: "20px", fontWeight: 900, color: "#0F172A", letterSpacing: "-0.5px" }}>DIEGO</span>
            <span style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#0284C7", letterSpacing: "1px" }}>DISTRIBUIDORA OFICIAL</span>
          </div>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {currentUser && !isAdmin && (
            <button
              onClick={onOpenOrders}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#F1F5F9",
                border: "none",
                padding: "8px 14px",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 700,
                color: "#334155"
              }}
            >
              <Package size={16} color="#0284C7" />
              <span>Mis Pedidos</span>
            </button>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "#FEF3C7",
                color: "#D97706",
                padding: "8px 14px",
                borderRadius: "12px",
                textDecoration: "none",
                fontWeight: 800,
                fontSize: "13px"
              }}
            >
              <Shield size={16} />
              <span>Panel Contable</span>
            </Link>
          )}

          {currentUser ? (
            <button
              onClick={logout}
              style={{
                background: "none",
                border: "none",
                color: "#64748B",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px"
              }}
              title="Cerrar Sesión"
            >
              <LogOut size={18} />
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                border: "1.5px solid #E2E8F0",
                background: "#FFF",
                padding: "8px 16px",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "13px",
                color: "#0F172A"
              }}
            >
              <User size={16} />
              <span>Ingresar</span>
            </button>
          )}

          {/* Icono Carrito con Micro-Animación Pop/Bounce */}
          {!isAdmin && (
            <button
              onClick={onOpenCart}
              style={{
                position: "relative",
                background: "#0284C7",
                color: "#FFF",
                border: "none",
                width: "44px",
                height: "44px",
                borderRadius: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(2, 132, 199, 0.35)",
                transform: cartBounce ? "scale(1.2) rotate(-6deg)" : "scale(1)",
                transition: "transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
              }}
              aria-label="Abrir carrito"
            >
              <ShoppingBag size={20} />
              {totalItemsCount > 0 && (
                <span style={{
                  position: "absolute",
                  top: "-5px",
                  right: "-5px",
                  background: "#EF4444",
                  color: "#FFF",
                  fontSize: "11px",
                  fontWeight: 900,
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid #FFF",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
                }}>
                  {totalItemsCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}