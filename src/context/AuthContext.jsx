import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const ADMIN_EMAIL = "vq2403@diego.org.com";

  // Registro de usuarios
  const register = async (name, email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const user = userCredential.user;

    const assignedRole = cleanEmail === ADMIN_EMAIL ? "admin" : "client";
    setRole(assignedRole);
    setCurrentUser(user);

    // Escritura en Firestore en segundo plano (no bloquea el acceso)
    setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      name,
      email: cleanEmail,
      role: assignedRole,
      createdAt: new Date().toISOString()
    }).catch((err) => {
      console.warn("Aviso: Documento de usuario en Firestore no sincronizado aún:", err.message);
    });

    return user;
  };

  // Login con propagación de error nativo
  const login = async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const user = userCredential.user;

    // Asignación de rol instantánea en memoria para el Administrador
    if (user.email?.toLowerCase() === ADMIN_EMAIL) {
      setRole("admin");
    }
    setCurrentUser(user);
    return user;
  };

  // Logout
  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setRole(null);
  };

  // Observador de estado de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userEmail = user.email?.toLowerCase();

        // 1. Bypass directo si es la cuenta administradora
        if (userEmail === ADMIN_EMAIL) {
          setRole("admin");
          setLoading(false);
          return;
        }

        // 2. Consulta no bloqueante de rol para clientes regulares
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setRole(userDoc.data().role || "client");
          } else {
            setRole("client");
          }
        } catch {
          setRole("client");
        }
      } else {
        setCurrentUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    role,
    isAdmin: role === "admin" || currentUser?.email?.toLowerCase() === ADMIN_EMAIL,
    register,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};