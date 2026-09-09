import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { 
  ShoppingBag, 
  User, 
  LogOut, 
  Package, 
  ShieldAlert, 
  SlidersHorizontal,
  Sparkles
} from "lucide-react";

export default function Navbar({ onOpenCart, onOpenAuth, onOpenOrders }) {
  const { currentUser, isAdmin, isClient, logout } = useAuth();
  const { totalItemsCount, cartBounce } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  return (
    <header style={{
      position: "sticky",
      top: 0,
      zIndex: 50,
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(10px)",
      borderBottom: "1px solid #E2E8F0",
      boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.03)"
    }}>
      <div style={{
        maxWidth: "1380px",
        margin: "0 auto",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px"
      }}>
        {/* LOGO & BADGE DINÁMICO */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)",
              color: "#FFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              fontWeight: 900,
              boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)"
            }}>
              D
            </div>
            <div>
              <span style={{ fontSize: "20px", fontWeight: 900, color: "#0F172A", letterSpacing: "-0.5px" }}>DIEGO</span>
              <span style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "#0284C7", letterSpacing: "1px" }}>
                DISTRIBUIDORA OFICIAL
              </span>
            </div>
          </Link>

          {/* BADGE ADMINISTRADOR */}
          {isAdmin && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "linear-gradient(135deg, #4338CA 0%, #312E81 100%)",
              color: "#F8FAFC",
              padding: "6px 14px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.8px",
              border: "1px solid #6366F1",
              boxShadow: "0 4px 14px rgba(79, 70, 229, 0.25)"
            }}>
              <ShieldAlert size={13} color="#FBBF24" />
              <span>ADMINISTRADOR</span>
            </div>
          )}

          {/* BADGE CLIENTE */}
          {isClient && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              background: "#E0F2FE",
              color: "#0369A1",
              padding: "6px 12px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 900,
              border: "1px solid #BAE6FD"
            }}>
              <Sparkles size={13} color="#0284C7" />
              <span>CLIENTE</span>
            </div>
          )}
        </div>

        {/* ACCIONES Y PERFIL */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Botón Admin Panel */}
          {isAdmin && (
            <Link
              to="/admin"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#FEF3C7",
                color: "#B45309",
                border: "1px solid #FDE68A",
                padding: "8px 14px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: 800,
                textDecoration: "none"
              }}
            >
              <SlidersHorizontal size={14} />
              <span>Panel Contable</span>
            </Link>
          )}

          {/* Mis Pedidos (Solo si está logueado) */}
          {currentUser && (
            <button
              onClick={onOpenOrders}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#FFF",
                border: "1px solid #E2E8F0",
                padding: "8px 14px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: 800,
                color: "#334155",
                cursor: "pointer"
              }}
            >
              <Package size={15} color="#0284C7" />
              <span>Mis Pedidos</span>
            </button>
          )}

          {/* Carrito de Compras */}
          <button
            onClick={onOpenCart}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#F0F9FF",
              border: "1px solid #BAE6FD",
              color: "#0284C7",
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              cursor: "pointer",
              transform: cartBounce ? "scale(1.15)" : "scale(1)",
              transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)"
            }}
            title="Ver carrito"
          >
            <ShoppingBag size={20} />
            {totalItemsCount > 0 && (
              <span style={{
                position: "absolute",
                top: "-5px",
                right: "-5px",
                background: "#EF4444",
                color: "#FFF",
                fontSize: "10px",
                fontWeight: 900,
                minWidth: "18px",
                height: "18px",
                borderRadius: "999px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 4px"
              }}>
                {totalItemsCount}
              </span>
            )}
          </button>

          {/* Autenticación / Logout */}
          {currentUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                padding: "8px 12px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: 700,
                color: "#334155"
              }}>
                <User size={14} color="#64748B" />
                <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {currentUser.displayName || currentUser.email.split("@")[0]}
                </span>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  background: "#FEE2E2",
                  border: "none",
                  color: "#DC2626",
                  padding: "10px",
                  borderRadius: "12px",
                  cursor: "pointer"
                }}
                title="Cerrar Sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)",
                color: "#FFF",
                border: "none",
                padding: "10px 18px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)"
              }}
            >
              <User size={15} />
              <span>Ingresar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}


