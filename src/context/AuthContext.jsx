import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  updateProfile
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const ADMIN_EMAIL = "vq2403@diego.org.com";

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' | 'client' | null
  const [loading, setLoading] = useState(true);

  // 1. Activar persistencia local obligatoria multidispositivo
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.error("Error configurando persistencia de Firebase:", err);
    });
  }, []);

  // 2. Listener central de sesión
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
          console.warn("No se pudo escribir registro de usuario en Firestore:", error);
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

  // Iniciar sesión
  const login = async (email, password) => {
    await setPersistence(auth, browserLocalPersistence);
    return signInWithEmailAndPassword(auth, email.trim(), password);
  };

  // Registrarse con sincronización de nombre y perfil
  const signup = async (email, password, name) => {
    await setPersistence(auth, browserLocalPersistence);
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    
    if (name) {
      await updateProfile(cred.user, { displayName: name.trim() });
    }

    const isAdmin = cred.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const role = isAdmin ? "admin" : "client";

    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      email: cred.user.email.toLowerCase(),
      displayName: name?.trim() || cred.user.email.split("@")[0],
      role,
      createdAt: new Date().toISOString()
    });

    return cred;
  };

  // Logout seguro que vacía datos locales
  const logout = async () => {
    localStorage.removeItem("diego_cart");
    localStorage.removeItem("diego_last_session");
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