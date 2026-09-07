import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("paper_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const { isAdmin } = useAuth();

  useEffect(() => {
    localStorage.setItem("paper_cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product) => {
    if (isAdmin) return;

    setCart((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock || 999) }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, quantity) => {
    if (isAdmin) return;
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCart((prev) => prev.map((it) => (it.id === id ? { ...it, quantity } : it)));
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((it) => it.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("paper_cart");
  };

  const totalItems = isAdmin ? 0 : cart.reduce((acc, it) => acc + it.quantity, 0);
  const totalAmount = isAdmin ? 0 : cart.reduce((acc, it) => acc + it.price * it.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart: isAdmin ? [] : cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalItems,
        totalAmount
      }}
    >
      {children}
    </CartContext.Provider>
  );
};