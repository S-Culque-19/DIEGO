import React, { createContext, useContext, useEffect, useState, useRef } from "react";
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
      return "Error de conexión. Revisa tu acceso a internet.";
    default:
      return error?.message || "Ocurrió un error al procesar la autenticación.";
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' | 'client' | null
  const [loading, setLoading] = useState(true);

  // Bandera para evitar que onAuthStateChanged sobreescriba un logout optimista inmediato
  const isLoggingOutRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Si estamos en medio de un logout voluntario, ignoramos eventos residuales de Auth
      if (isLoggingOutRef.current) {
        if (!user) isLoggingOutRef.current = false;
        return;
      }

      if (user) {
        const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        const detectedRole = isAdmin ? "admin" : "client";

        // 1. Actualización inmediata del estado en memoria (Cero bloqueo)
        setCurrentUser(user);
        setUserRole(detectedRole);
        setLoading(false);

        // 2. Tarea en segundo plano sin await bloqueante (Fire-and-forget)
        (async () => {
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
          } catch (e) {
            console.warn("Aviso en sync de usuario Firestore:", e);
          }
        })();
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Inicio de sesión rápido
  const login = async (email, password) => {
    if (!email || !password) throw new Error("Ingresa correo y contraseña.");
    const cleanEmail = email.trim().toLowerCase();
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);

    // Actualización inmediata anticipada
    const isAdmin = cred.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    setCurrentUser(cred.user);
    setUserRole(isAdmin ? "admin" : "client");
    return cred;
  };

  // Registro atómico con actualización optimista de UI
  const signup = async (email, password, name) => {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPassword = password || "";
    const cleanName = (name || "").trim();

    if (!cleanEmail || !cleanPassword) {
      throw new Error("El correo y la contraseña son obligatorios.");
    }
    if (cleanPassword.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres.");
    }

    // 1. Crear usuario en Firebase Auth (Llamada primaria crítica)
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);

    // 2. Asignar rol y usuario de inmediato en memoria
    const isAdmin = cleanEmail === ADMIN_EMAIL.toLowerCase();
    const role = isAdmin ? "admin" : "client";
    setCurrentUser(cred.user);
    setUserRole(role);

    // 3. Tareas en segundo plano (No bloquean el cierre del modal ni la navegación)
    (async () => {
      try {
        if (cleanName) {
          await updateProfile(cred.user, { displayName: cleanName });
        }
        await setDoc(doc(db, "users", cred.user.uid), {
          uid: cred.user.uid,
          email: cleanEmail,
          displayName: cleanName || cleanEmail.split("@")[0],
          role,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn("Aviso en tareas secundarias de registro:", err);
      }
    })();

    return cred;
  };

  // Cierre de sesión optimista instantáneo (0ms de latencia)
  const logout = () => {
    isLoggingOutRef.current = true;

    // A. Desconexión visual instantánea
    setCurrentUser(null);
    setUserRole(null);

    // B. Limpieza local inmediata
    try {
      localStorage.removeItem("diego_cart");
      localStorage.removeItem("diego_last_session");
    } catch (e) {
      console.warn("Aviso limpiando localStorage:", e);
    }

    // C. Network signOut en background sin frenar la UI
    signOut(auth)
      .catch((e) => console.warn("Aviso en signOut:", e))
      .finally(() => {
        isLoggingOutRef.current = false;
      });
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
        register: (name, email, password) => signup(email, password, name),
        logout,
        loading
      }}
    >
      {/* El árbol de React NUNCA se desmonta: Cero pantallas en blanco */}
      {children}
    </AuthContext.Provider>
  );
};