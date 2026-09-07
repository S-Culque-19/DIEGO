import React from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, User, Shield, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Navbar({ onOpenAuth, onOpenCart }) {
  const { currentUser, isAdmin, logout } = useAuth();
  const { totalItems } = useCart();

  return (
    <div className="nav-wrapper">
      <header className="nav-glass">
        <Link to="/" className="nav-brand">
          <div className="nav-icon-box">
            <Sparkles size={22} />
          </div>
          <div>
            <div className="brand-text">DIEGO<span style={{ color: "#0EA5E9" }}></span></div>
            <div className="brand-sub">Distribuidora Oficial</div>
          </div>
        </Link>

        <div className="nav-actions">
          {isAdmin && (
            <Link to="/admin" className="btn-primary" style={{ padding: "9px 18px" }}>
              <Shield size={16} />
              <span>Panel Contable</span>
            </Link>
          )}

          {!isAdmin && (
            <button onClick={onOpenCart} className="btn-icon" title="Ver Carrito">
              <ShoppingBag size={20} />
              {totalItems > 0 && <span className="badge-counter">{totalItems}</span>}
            </button>
          )}

          {currentUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "13px", color: "#475569", fontWeight: 700 }}>
                {currentUser.email}
              </span>
              <button onClick={logout} className="btn-icon" title="Cerrar Sesión">
                <LogOut size={17} color="#EF4444" />
              </button>
            </div>
          ) : (
            <button onClick={onOpenAuth} className="btn-primary">
              <User size={16} />
              <span>Iniciar Sesión</span>
            </button>
          )}
        </div>
      </header>
    </div>
  );
}