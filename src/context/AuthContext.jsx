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

export const formatFirebaseAuthError = (error) => {
  const code = error?.code || "";
  switch (code) {
    case "auth/email-already-in-use":
      return "Este correo ya se encuentra registrado. Inicia sesión directamente.";
    case "auth/invalid-email":
      return "El formato del correo electrónico no es válido.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Credenciales incorrectas. Verifica tu correo y contraseña.";
    case "auth/too-many-requests":
      return "Demasiados intentos fallidos. Inténtalo de nuevo en unos minutos.";
    case "auth/network-request-failed":
      return "Error de red. Revisa tu conexión a internet.";
    default:
      return error?.message || "Ocurrió un error al autenticar.";
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

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
          console.warn("Aviso Firestore perfil:", error);
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

  const login = async (email, password) => {
    if (!email || !password) throw new Error("Ingresa correo y contraseña.");
    return signInWithEmailAndPassword(auth, email.trim(), password);
  };

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

    // 1. Registro directo en Firebase Authentication
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);

    // 2. Actualización de perfil
    if (cleanName) {
      try {
        await updateProfile(cred.user, { displayName: cleanName });
      } catch (err) {
        console.warn("No se pudo actualizar displayName:", err);
      }
    }

    // 3. Documento en Firestore
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
      console.warn("Error guardando usuario en Firestore:", err);
    }

    return cred;
  };

  // Cierre de sesión seguro y limpieza de estado local
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
        register: (name, email, password) => signup(email, password, name), // Alias seguro
        logout,
        loading
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};