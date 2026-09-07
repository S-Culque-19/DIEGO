import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "./AuthContext";

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [cart, setCart] = useState([]);
  const [cartBounce, setCartBounce] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState(null);

  // Bandera para evitar que una lectura de Firestore sobreescriba un guardado inmediato
  const isSyncingFromCloud = useRef(false);

  // 1. SINCRONIZACIÓN EN TIEMPO REAL CON FIRESTORE (Si hay usuario logueado)
  useEffect(() => {
    if (!currentUser) {
      // Si no hay cuenta iniciada, cargar respaldo del navegador
      const local = localStorage.getItem("diego_cart");
      setCart(local ? JSON.parse(local) : []);
      return;
    }

    const cartDocRef = doc(db, "carts", currentUser.uid);

    // Escucha en vivo: cualquier cambio en otro dispositivo actualiza este al instante
    const unsubscribe = onSnapshot(
      cartDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const cloudItems = docSnap.data().items || [];
          isSyncingFromCloud.current = true;
          setCart(cloudItems);
          localStorage.setItem("diego_cart", JSON.stringify(cloudItems));
        } else {
          // Si es su primera vez y tenía cosas en localStorage, subirlas a Firestore
          const local = localStorage.getItem("diego_cart");
          if (local) {
            const parsed = JSON.parse(local);
            if (parsed.length > 0) {
              setDoc(cartDocRef, { items: parsed, updatedAt: new Date().toISOString() });
            }
          }
        }
      },
      (error) => {
        console.error("Error al sincronizar carrito en tiempo real:", error);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // 2. GUARDAR CAMBIOS EN LA NUBE Y EN LOCALSTORAGE
  const persistCart = async (newCart) => {
    setCart(newCart);
    localStorage.setItem("diego_cart", JSON.stringify(newCart));

    // Si está autenticado, sincronizar inmediatamente en Firestore
    if (currentUser) {
      try {
        const cartDocRef = doc(db, "carts", currentUser.uid);
        await setDoc(cartDocRef, {
          items: newCart,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Error al persistir carrito en la nube:", err);
      }
    }
  };

  const triggerCartAnimation = () => {
    setCartBounce(true);
    setTimeout(() => setCartBounce(false), 600);
  };

  // 3. ACCIONES DEL CARRITO
  const addToCart = (product) => {
    const existing = cart.find((item) => item.id === product.id);
    let updatedCart;

    if (existing) {
      updatedCart = cart.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      updatedCart = [
        ...cart,
        {
          id: product.id,
          name: product.name,
          price: Number(product.price) || 0,
          cost: Number(product.cost) || 0,
          quantity: 1,
          imageUrl: product.imageUrl || (product.images && product.images[0]) || "/papel.jpeg"
        }
      ];
    }

    persistCart(updatedCart);
    setLastAddedItem(product.name);
    triggerCartAnimation();
    setTimeout(() => setLastAddedItem(null), 3000);
  };

  const updateQuantity = (id, newQty) => {
    if (newQty <= 0) {
      removeFromCart(id);
      return;
    }
    const updatedCart = cart.map((item) =>
      item.id === id ? { ...item, quantity: newQty } : item
    );
    persistCart(updatedCart);
  };

  const removeFromCart = (id) => {
    const updatedCart = cart.filter((item) => item.id !== id);
    persistCart(updatedCart);
  };

  const clearCart = async () => {
    setCart([]);
    localStorage.removeItem("diego_cart");
    if (currentUser) {
      try {
        const cartDocRef = doc(db, "carts", currentUser.uid);
        await setDoc(cartDocRef, { items: [], updatedAt: new Date().toISOString() });
      } catch (err) {
        console.error("Error al limpiar carrito en la nube:", err);
      }
    }
  };

  const totalAmount = cart.reduce((acc, item) => acc + (Number(item.price) || 0) * item.quantity, 0);
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalAmount,
        totalItemsCount,
        cartBounce,
        lastAddedItem
      }}
    >
      {children}
    </CartContext.Provider>
  );
};