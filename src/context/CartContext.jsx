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

  // Bandera para evitar bucles entre lectura remota y guardado local
  const isSyncingFromRemote = useRef(false);

  // 1. Sincronización en vivo con Firestore (si hay usuario logueado)
  useEffect(() => {
    if (!currentUser) {
      // Si no hay sesión, usar almacenamiento local del navegador
      const local = localStorage.getItem("diego_cart");
      setCart(local ? JSON.parse(local) : []);
      return;
    }

    const cartRef = doc(db, "carts", currentUser.uid);

    // Listener reactivo en tiempo real entre múltiples pantallas
    const unsubscribe = onSnapshot(
      cartRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const cloudData = snapshot.data().items || [];
          isSyncingFromRemote.current = true;
          setCart(cloudData);
          localStorage.setItem("diego_cart", JSON.stringify(cloudData));
        } else {
          // Si el usuario tenía items locales antes de loguearse, sincronizarlos a la nube
          const local = localStorage.getItem("diego_cart");
          if (local) {
            const parsed = JSON.parse(local);
            if (parsed.length > 0) {
              setDoc(cartRef, { items: parsed, updatedAt: new Date().toISOString() });
            }
          }
        }
      },
      (error) => {
        console.error("Error al escuchar carrito en Firestore:", error);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // 2. Persistir cambios en Firestore y en localStorage
  const syncCart = async (newCart) => {
    setCart(newCart);
    localStorage.setItem("diego_cart", JSON.stringify(newCart));

    if (currentUser) {
      try {
        const cartRef = doc(db, "carts", currentUser.uid);
        await setDoc(cartRef, {
          items: newCart,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Error guardando carrito en Firestore:", err);
      }
    }
  };

  const triggerCartAnimation = () => {
    setCartBounce(true);
    setTimeout(() => setCartBounce(false), 600);
  };

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

    syncCart(updatedCart);
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
    syncCart(updatedCart);
  };

  const removeFromCart = (id) => {
    const updatedCart = cart.filter((item) => item.id !== id);
    syncCart(updatedCart);
  };

  const clearCart = async () => {
    setCart([]);
    localStorage.removeItem("diego_cart");
    if (currentUser) {
      try {
        const cartRef = doc(db, "carts", currentUser.uid);
        await setDoc(cartRef, { items: [], updatedAt: new Date().toISOString() });
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