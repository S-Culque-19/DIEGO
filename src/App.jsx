import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, formatFirebaseAuthError } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import ChatAssistant from "./components/ChatAssistant";
import MyOrdersModal from "./components/MyOrdersModal";
import { AlertTriangle, X } from "lucide-react";

function AuthModal({ isOpen, onClose }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorDetails, setErrorDetails] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Se consume signup en lugar del inexistente register
  const { login, signup } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorDetails(null);
    setIsSubmitting(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;
    const cleanName = name.trim();

    try {
      if (isRegister) {
        // Orden exacto esperado por AuthContext: email, password, name
        await signup(cleanEmail, cleanPassword, cleanName);
      } else {
        await login(cleanEmail, cleanPassword);
      }
      onClose();
    } catch (err) {
      console.error("Detalle completo del fallo en Firebase Auth:", err);
      setErrorDetails({
        code: err.code || "auth/error",
        message: formatFirebaseAuthError(err)
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModeSwitch = (registerMode) => {
    setIsRegister(registerMode);
    setErrorDetails(null);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            border: "none",
            background: "none",
            cursor: "pointer",
            fontSize: "18px",
            color: "#94A3B8"
          }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h3 style={{ fontSize: "24px", fontWeight: 900, color: "#0F172A" }}>
            {isRegister ? "Crear Cuenta" : "Iniciar Sesión"}
          </h3>
          <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
            {isRegister
              ? "Regístrate para guardar y dar seguimiento a tus compras."
              : "Accede para gestionar la tienda o procesar pagos."}
          </p>
        </div>

        {errorDetails && (
          <div
            style={{
              background: "#FEF2F2",
              border: "1.5px solid #F87171",
              borderRadius: "14px",
              padding: "14px",
              marginBottom: "16px"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#B91C1C",
                fontWeight: 800,
                fontSize: "13px"
              }}
            >
              <AlertTriangle size={18} />
              <span>{errorDetails.code}</span>
            </div>
            <p style={{ fontSize: "12px", color: "#7F1D1D", marginTop: "4px", wordBreak: "break-word" }}>
              {errorDetails.message}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label">Nombre Completo</label>
              <input
                type="text"
                required
                placeholder="Ej. Juan Pérez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Correo Electrónico</label>
            <input
              type="email"
              required
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
            style={{ width: "100%", padding: "14px", marginTop: "8px" }}
          >
            {isSubmitting
              ? "Verificando con Firebase..."
              : isRegister
              ? "Completar Registro"
              : "Ingresar a mi Cuenta"}
          </button>
        </form>

        <p style={{ fontSize: "13px", textAlign: "center", color: "#64748B", marginTop: "20px" }}>
          {isRegister ? "¿Ya tienes una cuenta?" : "¿Aún no tienes cuenta?"}{" "}
          <button
            type="button"
            onClick={() => handleModeSwitch(!isRegister)}
            style={{
              background: "none",
              border: "none",
              color: "#0284C7",
              fontWeight: 800,
              cursor: "pointer",
              textDecoration: "underline"
            }}
          >
            {isRegister ? "Inicia sesión" : "Regístrate aquí"}
          </button>
        </p>
      </div>
    </div>
  );
}

function ProtectedAdminRoute({ children }) {
  const { currentUser, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!currentUser || !isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function MainApp() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);

  return (
    <BrowserRouter>
      <Navbar
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenOrders={() => setIsOrdersOpen(true)}
      />
      <Routes>
        <Route
          path="/"
          element={
            <Home
              isCartOpen={isCartOpen}
              setIsCartOpen={setIsCartOpen}
              onRequireAuth={() => setIsAuthOpen(true)}
            />
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ChatAssistant />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <MyOrdersModal isOpen={isOrdersOpen} onClose={() => setIsOrdersOpen(false)} />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <MainApp />
      </CartProvider>
    </AuthProvider>
  );
}