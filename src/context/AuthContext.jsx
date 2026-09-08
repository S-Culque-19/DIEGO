import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const ADMIN_EMAIL = "vq2403@diego.org.com";

// Formateador amigable de errores de autenticación
export const formatFirebaseAuthError = (error) => {
  const code = error?.code || "";
  switch (code) {
    case "auth/email-already-in-use":
      return "Este correo ya está registrado. Inicia sesión directamente.";
    case "auth/invalid-email":
      return "El formato del correo electrónico no es válido.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Correo o contraseña incorrectos.";
    case "auth/network-request-failed":
      return "Error de conexión. Revisa tu internet.";
    default:
      return error?.message || "Ocurrió un error al procesar el acceso.";
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' | 'client' | null
  const [loading, setLoading] = useState(true);

  // Escucha activa de sesión (Firebase Auth gestiona la persistencia nativa automáticamente)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        const detectedRole = isAdmin ? "admin" : "client";

        try {
          const userRef = doc(db, "users", user.uid);
          const snap = await getDoc(userRef);

          if (!snap.exists()) {
            await setDoc(userRef, {
              uid: user.uid,
              email: user.email.toLowerCase(),
              displayName: user.displayName || user.email.split("@")[0],
              role: detectedRole,
              createdAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.warn("Aviso perfil Firestore:", error);
        }

        setCurrentUser(user);
        setUserRole(detectedRole);
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Inicio de sesión normalizado
  const login = async (email, password) => {
    if (!email || !password) throw new Error("Ingresa correo y contraseña.");
    return signInWithEmailAndPassword(auth, email.trim(), password);
  };

  // Registro limpio sin funciones rotas
  const signup = async (email, password, name) => {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPassword = password || "";
    const cleanName = (name || "").trim();

    if (!cleanEmail || !cleanPassword) {
      throw new Error("El correo y contraseña son obligatorios.");
    }
    if (cleanPassword.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres.");
    }

    // 1. Crear cuenta en Firebase Auth
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);

    // 2. Asignar nombre en el perfil del usuario de Auth
    if (cleanName) {
      try {
        await updateProfile(cred.user, { displayName: cleanName });
      } catch (err) {
        console.warn("No se pudo actualizar el nombre:", err);
      }
    }

    // 3. Crear documento en Firestore
    const isAdmin = cleanEmail === ADMIN_EMAIL.toLowerCase();
    const role = isAdmin ? "admin" : "client";

    try {
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        email: cleanEmail,
        displayName: cleanName || cleanEmail.split("@")[0],
        role,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn("Error al registrar documento usuario:", err);
    }

    return cred;
  };

  // Cierre de sesión seguro y limpieza de caché local
  const logout = async () => {
    localStorage.removeItem("diego_cart");
    setCurrentUser(null);
    setUserRole(null);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userRole,
        isAdmin: userRole === "admin",
        isClient: userRole === "client",
        login,
        signup,
        logout,
        loading
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};