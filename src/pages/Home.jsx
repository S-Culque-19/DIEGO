import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import PaymentModal from "../components/PaymentModal";
import Footer from "../components/Footer";
import { 
  Search, Plus, Check, Trash2, ArrowRight, Truck, 
  ShieldCheck, Award, Eye, X, ArrowLeft, ShoppingBag
} from "lucide-react";

export default function Home({ isCartOpen, setIsCartOpen, onRequireAuth }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("all");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [addedAnimationId, setAddedAnimationId] = useState(null);

  const [activeImageMap, setActiveImageMap] = useState({});
  const [lightboxImage, setLightboxImage] = useState(null);

  const { addToCart, cart, totalAmount, totalItemsCount, updateQuantity, removeFromCart, lastAddedItem } = useCart();
  const { currentUser, isAdmin } = useAuth();

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAddClick = (prod) => {
    addToCart(prod);
    setAddedAnimationId(prod.id);
    setTimeout(() => setAddedAnimationId(null), 1200);
  };

  const handleProceedToPayment = () => {
    if (!currentUser) {
      setIsCartOpen(false);
      onRequireAuth();
      return;
    }
    setIsCheckoutOpen(true);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = category === "all" || p.category === category;
    return matchesSearch && matchesCat;
  });

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC" }}>
      {/* Toast Flotante Dinámico */}
      {lastAddedItem && (
        <div style={{
          position: "fixed",
          top: "80px",
          right: "24px",
          background: "#0F172A",
          color: "#FFF",
          padding: "12px 20px",
          borderRadius: "14px",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          animation: "slideIn 0.3s ease"
        }}>
          <Check size={18} color="#22C55E" />
          <span style={{ fontSize: "13px", fontWeight: 700 }}>Añadido: {lastAddedItem}</span>
        </div>
      )}

      {/* Lightbox / Foto Ampliada */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.88)",
            backdropFilter: "blur(8px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            <button
              onClick={() => setLightboxImage(null)}
              style={{
                position: "absolute",
                top: "-16px",
                right: "-16px",
                background: "#EF4444",
                color: "#FFF",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
              }}
            >
              <X size={20} />
            </button>
            <img src={lightboxImage} alt="Ampliada" style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: "16px", objectFit: "contain" }} />
          </div>
        </div>
      )}

      {/* VISTA A PANTALLA COMPLETA DEL CARRITO (SERIO Y PROFESIONAL) */}
      {isCartOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "#F8FAFC",
          zIndex: 9990,
          overflowY: "auto",
          padding: "30px 20px"
        }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <button
              onClick={() => setIsCartOpen(false)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#FFF",
                border: "1px solid #E2E8F0",
                padding: "10px 18px",
                borderRadius: "14px",
                cursor: "pointer",
                fontWeight: 800,
                color: "#0F172A",
                marginBottom: "24px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.03)"
              }}
            >
              <ArrowLeft size={18} /> Continuar Comprando
            </button>

            <h1 style={{ fontSize: "32px", fontWeight: 900, color: "#0F172A", marginBottom: "8px" }}>
              Bolsa de Compras & Confirmación
            </h1>
            <p style={{ color: "#64748B", fontSize: "14px", marginBottom: "32px" }}>
              Revisa tus unidades antes de proceder con el pago y despacho seguro.
            </p>

            {cart.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px", background: "#FFF", borderRadius: "24px", border: "1px solid #E2E8F0" }}>
                <ShoppingBag size={54} color="#94A3B8" style={{ margin: "0 auto 16px" }} />
                <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#1E293B" }}>Tu bolsa de compras está vacía</h3>
                <p style={{ color: "#64748B", fontSize: "14px", marginTop: "6px" }}>Explora nuestro catálogo mayorista y añade productos de alta calidad.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "32px", alignItems: "start" }}>
                {/* Columna Izquierda: Artículos */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {cart.map((item) => (
                    <div key={item.id} style={{
                      display: "flex",
                      gap: "20px",
                      background: "#FFF",
                      padding: "20px",
                      borderRadius: "20px",
                      border: "1px solid #E2E8F0",
                      alignItems: "center",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                    }}>
                      <img
                        src={item.imageUrl || (item.images && item.images[0]) || "/papel.jpeg"}
                        alt={item.name}
                        style={{ width: "90px", height: "90px", objectFit: "cover", borderRadius: "14px", border: "1px solid #F1F5F9" }}
                      />
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>{item.name}</h3>
                        <div style={{ fontSize: "13px", color: "#64748B", marginTop: "2px" }}>Precio: S/ {Number(item.price).toFixed(2)}</div>
                        <div style={{ fontSize: "15px", fontWeight: 900, color: "#0284C7", marginTop: "6px" }}>
                          Subtotal: S/ {(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#F1F5F9", padding: "6px 12px", borderRadius: "12px" }}>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          style={{ border: "none", background: "none", cursor: "pointer", fontWeight: 900, fontSize: "16px", color: "#334155" }}
                        >
                          -
                        </button>
                        <span style={{ fontWeight: 800, fontSize: "14px", minWidth: "20px", textAlign: "center" }}>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          style={{ border: "none", background: "none", cursor: "pointer", fontWeight: 900, fontSize: "16px", color: "#334155" }}
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        style={{ border: "none", background: "none", color: "#EF4444", cursor: "pointer", padding: "8px" }}
                        title="Eliminar"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Columna Derecha: Card Fija de Resumen Serio */}
                <div style={{
                  background: "#FFF",
                  padding: "32px",
                  borderRadius: "24px",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.04)"
                }}>
                  <h3 style={{ fontSize: "18px", fontWeight: 900, color: "#0F172A", marginBottom: "20px" }}>Resumen de Orden</h3>

                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "14px", color: "#64748B" }}>
                    <span>Unidades totales:</span>
                    <span style={{ fontWeight: 800, color: "#0F172A" }}>{totalItemsCount}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "14px", color: "#64748B" }}>
                    <span>Delivery Comas/Indep/SMP/Olivos:</span>
                    <span style={{ fontWeight: 800, color: "#16A34A" }}>100% GRATIS</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px", fontSize: "14px", color: "#64748B" }}>
                    <span>Recojo en MegaPlaza:</span>
                    <span style={{ fontWeight: 800, color: "#16A34A" }}>Disponible (Gratis)</span>
                  </div>

                  <div style={{ height: "1px", background: "#E2E8F0", margin: "20px 0" }} />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "28px" }}>
                    <span style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>Total a Pagar:</span>
                    <span style={{ fontSize: "32px", fontWeight: 900, color: "#0284C7" }}>S/ {totalAmount.toFixed(2)}</span>
                  </div>

                  <button
                    onClick={handleProceedToPayment}
                    style={{
                      width: "100%",
                      padding: "18px",
                      background: "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)",
                      color: "#FFF",
                      border: "none",
                      borderRadius: "16px",
                      fontSize: "16px",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                      boxShadow: "0 8px 20px rgba(2, 132, 199, 0.3)"
                    }}
                  >
                    <span>Proceder al Pago Seguro</span>
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div style={{ maxWidth: "1280px", margin: "40px auto", padding: "0 20px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "40px",
          alignItems: "center",
          background: "linear-gradient(135deg, #FFFFFF 0%, #F0F9FF 100%)",
          padding: "48px",
          borderRadius: "32px",
          border: "1px solid #E0F2FE"
        }}>
          <div>
            <span style={{
              background: "#E0F2FE",
              color: "#0284C7",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 800
            }}>
              DISTRIBUIDORA DIEGO • LIMA NORTE
            </span>
            <h1 style={{ fontSize: "40px", fontWeight: 900, color: "#0F172A", lineHeight: 1.15, margin: "16px 0" }}>
              Papel Higiénico & Toalla de Alto Rendimiento
            </h1>
            <p style={{ fontSize: "15px", color: "#64748B", lineHeight: 1.6, marginBottom: "28px" }}>
              Presentaciones familiares e industriales en planchas cerradas. Doble hoja ultra absorbente que no se rompe con la humedad ni las grasas.
            </p>
            <a
              href="#catalogo"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                background: "#0284C7",
                color: "#FFF",
                padding: "14px 28px",
                borderRadius: "14px",
                textDecoration: "none",
                fontWeight: 800,
                fontSize: "14px"
              }}
            >
              Ver Catálogo Oficial <ArrowRight size={16} />
            </a>
          </div>

          <div style={{ height: "340px", borderRadius: "24px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}>
            <img src="/papel.jpeg" alt="Distribuidora DIEGO" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </div>
      </div>

      {/* Catálogo con Filtros */}
      <main id="catalogo" style={{ maxWidth: "1280px", margin: "40px auto", padding: "0 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            {["all", "Papel Higiénico", "Papel Toalla"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "12px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 800,
                  backgroundColor: category === cat ? "#0284C7" : "#FFF",
                  color: category === cat ? "#FFF" : "#64748B",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.04)"
                }}
              >
                {cat === "all" ? "Todos los Productos" : cat}
              </button>
            ))}
          </div>

          <div style={{ position: "relative", minWidth: "260px" }}>
            <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px 10px 40px",
                borderRadius: "12px",
                border: "1px solid #E2E8F0",
                fontSize: "13px",
                outline: "none"
              }}
            />
          </div>
        </div>

        {/* Cuadrícula de Productos */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
          {filteredProducts.map((p) => {
            const productImages = p.images && p.images.length > 0 ? p.images : [p.imageUrl || "/papel.jpeg"];
            const currentImage = activeImageMap[p.id] || productImages[0];
            const isAdded = addedAnimationId === p.id;

            return (
              <div key={p.id} style={{
                background: "#FFF",
                borderRadius: "24px",
                padding: "20px",
                border: "1px solid #E2E8F0",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 4px 12px rgba(0,0,0,0.03)"
              }}>
                <div>
                  <div
                    onClick={() => setLightboxImage(currentImage)}
                    style={{ position: "relative", height: "200px", borderRadius: "16px", overflow: "hidden", cursor: "pointer", background: "#F1F5F9" }}
                  >
                    <img src={currentImage} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <span style={{
                      position: "absolute",
                      top: "10px",
                      left: "10px",
                      background: "rgba(255,255,255,0.9)",
                      padding: "4px 10px",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#0284C7"
                    }}>
                      {p.category}
                    </span>
                    <span style={{
                      position: "absolute",
                      bottom: "10px",
                      right: "10px",
                      background: "rgba(15,23,42,0.75)",
                      color: "#FFF",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}>
                      <Eye size={12} /> Ver
                    </span>
                  </div>

                  {productImages.length > 1 && (
                    <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                      {productImages.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt="thumb"
                          onClick={() => setActiveImageMap((prev) => ({ ...prev, [p.id]: img }))}
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "8px",
                            objectFit: "cover",
                            cursor: "pointer",
                            border: currentImage === img ? "2px solid #0284C7" : "1px solid #CBD5E1"
                          }}
                        />
                      ))}
                    </div>
                  )}

                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", marginTop: "14px" }}>{p.name}</h3>
                  <p style={{ fontSize: "13px", color: "#64748B", margin: "6px 0 16px", lineHeight: 1.5 }}>{p.description}</p>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #F1F5F9", paddingTop: "14px" }}>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 800, color: "#94A3B8" }}>PRECIO</div>
                    <div style={{ fontSize: "20px", fontWeight: 900, color: "#0F172A" }}>S/ {Number(p.price).toFixed(2)}</div>
                  </div>

                  {!isAdmin && (
                    <button
                      onClick={() => handleAddClick(p)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: isAdded ? "#16A34A" : "#0284C7",
                        color: "#FFF",
                        border: "none",
                        padding: "10px 18px",
                        borderRadius: "12px",
                        cursor: "pointer",
                        fontWeight: 800,
                        fontSize: "13px",
                        transform: isAdded ? "scale(0.95)" : "scale(1)",
                        transition: "all 0.2s ease"
                      }}
                    >
                      {isAdded ? <Check size={16} /> : <Plus size={16} />}
                      <span>{isAdded ? "¡Añadido!" : "Añadir"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <Footer />
      <PaymentModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
    </div>
  );
}