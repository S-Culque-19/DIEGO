import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import PaymentModal from "../components/PaymentModal";
import { 
  Search, 
  ShoppingBag, 
  Plus, 
  Sparkles, 
  Trash2, 
  ArrowRight, 
  Truck, 
  ShieldCheck, 
  CheckCircle, 
  Award,
  PackageOpen,
  Eye,
  X
} from "lucide-react";

export default function Home({ isCartOpen, setIsCartOpen, onRequireAuth }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("all");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Estados para imagen activa por producto y visor ampliado
  const [activeImageMap, setActiveImageMap] = useState({});
  const [lightboxImage, setLightboxImage] = useState(null);

  const { addToCart, cart, totalAmount, updateQuantity, removeFromCart } = useCart();
  const { currentUser, isAdmin } = useAuth();

  useEffect(() => {
    try {
      const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(
        q, 
        (snapshot) => {
          const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setProducts(items);
          setLoading(false);
        }, 
        (error) => {
          console.error("Error al obtener productos de Firebase:", error);
          setLoading(false);
        }
      );
      return unsubscribe;
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = category === "all" || p.category === category;
    return matchesSearch && matchesCat;
  });

  const categories = ["all", "Papel Higiénico", "Papel Toalla"];

  const handleCheckoutClick = () => {
    if (!currentUser) {
      setIsCartOpen(false);
      onRequireAuth();
      return;
    }
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Lightbox para imagen grande */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}
          >
            <button
              onClick={() => setLightboxImage(null)}
              style={{
                position: "absolute",
                top: "-15px",
                right: "-15px",
                background: "#EF4444",
                color: "#FFFFFF",
                border: "2px solid #FFFFFF",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
              }}
            >
              <X size={20} />
            </button>
            <img
              src={lightboxImage}
              alt="Producto ampliado"
              style={{
                maxWidth: "100%",
                maxHeight: "85vh",
                borderRadius: "16px",
                objectFit: "contain",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
              }}
            />
          </div>
        </div>
      )}

      {/* Top Banner Oficial */}
      <div className="top-bar">
        <div className="top-bar-inner">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="top-bar-badge">DIEGO Oficial</span>
            <span>Delivery 100% Gratis exclusivo a Comas, Independencia, San Martín y Los Olivos</span>
          </div>
          <div style={{ fontSize: "11px", opacity: 0.9 }}>
            Abonos Yape / Plin al 926 689 484
          </div>
        </div>
      </div>

      {/* Hero Comercial con tu imagen local */}
      <div className="hero-wrapper">
        <div className="hero-card">
          <div>
            <div className="hero-chip">
              <Sparkles size={14} />
              <span>Distribuidora DIEGO • Cobertura Lima Norte</span>
            </div>
            <h1 className="hero-title">
              Distribuidora <span>DIEGO</span>: Papel Higiénico & Toalla
            </h1>
            <p className="hero-desc">
              Hojas dobles de máxima absorción, rendimiento y suavidad garantizada. Delivery sin costo para Comas, Independencia, San Martín de Porres y Los Olivos.
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <a href="#catalogo" className="btn-primary" style={{ padding: "14px 28px", fontSize: "14px" }}>
                Ver Catálogo Oficial <ArrowRight size={16} />
              </a>
            </div>
          </div>

          <div className="hero-image-box">
            <img 
              src="/papel.jpeg" 
              alt="Distribuidora DIEGO" 
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>
      </div>

      {/* Barra de Beneficios */}
      <div className="trust-bar">
        <div className="trust-card">
          <div className="trust-icon"><Truck size={24} /></div>
          <div>
            <div className="trust-title">Delivery 100% Gratis</div>
            <div className="trust-sub">Comas, Independencia, SMP y Los Olivos</div>
          </div>
        </div>
        <div className="trust-card">
          <div className="trust-icon"><ShieldCheck size={24} /></div>
          <div>
            <div className="trust-title">Pago Seguro QR</div>
            <div className="trust-sub">Vía Yape o Plin al 926 689 484</div>
          </div>
        </div>
        <div className="trust-card">
          <div className="trust-icon"><Award size={24} /></div>
          <div>
            <div className="trust-title">Doble Hoja Acolchada</div>
            <div className="trust-sub">Suavidad y resistencia comprobada</div>
          </div>
        </div>
        <div className="trust-card">
          <div className="trust-icon"><CheckCircle size={24} /></div>
          <div>
            <div className="trust-title">Precios de Distribuidor</div>
            <div className="trust-sub">Venta minorista y planchas por mayor</div>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="search-capsule">
        <Search className="search-icon-pos" size={20} />
        <input
          type="text"
          className="search-input"
          placeholder="Buscar presentación, papel higiénico, toalla..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Catálogo */}
      <main id="catalogo" className="catalog-container">
        <div className="filter-bar">
          <div className="filter-pills">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`pill-btn ${category === cat ? "active" : ""}`}
              >
                {cat === "all" ? "Ver Todo el Catálogo" : cat}
              </button>
            ))}
          </div>
          <span style={{ fontSize: "13px", color: "#64748B", fontWeight: 700 }}>
            {filteredProducts.length} Presentaciones Disponibles
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <p style={{ fontSize: "15px", color: "#0284C7", fontWeight: 700 }}>Cargando catálogo en tiempo real...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", background: "#FFFFFF", borderRadius: "28px", border: "1.5px dashed #BAE6FD", boxShadow: "var(--shadow-subtle)" }}>
            <PackageOpen size={48} color="#0EA5E9" style={{ margin: "0 auto 14px", opacity: 0.8 }} />
            <h3 style={{ fontSize: "20px", fontWeight: 900, color: "#0F172A", marginBottom: "6px" }}>Catálogo DIEGO</h3>
            <p style={{ fontSize: "14px", color: "#64748B", maxWidth: "450px", margin: "0 auto" }}>
              {isAdmin 
                ? "No hay productos en Firebase aún. Ingresa a tu 'Panel Contable' para subir las fotos desde tu computadora y publicar." 
                : "Estamos cargando nuevos lotes de mercadería. Vuelve pronto para realizar tu pedido."}
            </p>
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map((p) => {
              const productImages = p.images && p.images.length > 0 ? p.images : [p.imageUrl];
              const currentImage = activeImageMap[p.id] || productImages[0];

              return (
                <div key={p.id} className="product-card">
                  <div>
                    <div
                      className="card-image-box"
                      style={{ cursor: "pointer", position: "relative" }}
                      onClick={() => setLightboxImage(currentImage)}
                      title="Clic para ver en pantalla grande"
                    >
                      <img src={currentImage} alt={p.name} className="card-img" />
                      <span className="card-badge">{p.category}</span>
                      <div style={{
                        position: "absolute",
                        bottom: "8px",
                        right: "8px",
                        background: "rgba(15, 23, 42, 0.75)",
                        color: "#fff",
                        padding: "4px 8px",
                        borderRadius: "8px",
                        fontSize: "11px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}>
                        <Eye size={12} /> Ampliar
                      </div>
                    </div>

                    {productImages.length > 1 && (
                      <div style={{ display: "flex", gap: "6px", padding: "8px 0", overflowX: "auto" }}>
                        {productImages.map((thumb, idx) => (
                          <img
                            key={idx}
                            src={thumb}
                            alt={`Foto ${idx + 1}`}
                            onClick={() => setActiveImageMap((prev) => ({ ...prev, [p.id]: thumb }))}
                            style={{
                              width: "38px",
                              height: "38px",
                              objectFit: "cover",
                              borderRadius: "8px",
                              cursor: "pointer",
                              border: currentImage === thumb ? "2px solid #0284C7" : "1px solid #CBD5E1",
                              opacity: currentImage === thumb ? 1 : 0.65
                            }}
                          />
                        ))}
                      </div>
                    )}

                    <h3 className="product-name" style={{ marginTop: "6px" }}>{p.name}</h3>
                    <p className="product-desc">{p.description}</p>
                  </div>

                  <div className="card-bottom">
                    <div>
                      <div className="price-label">PRECIO UNITARIO</div>
                      <div className="price-text">S/ {Number(p.price).toFixed(2)}</div>
                    </div>

                    {!isAdmin ? (
                      <button onClick={() => addToCart(p)} className="btn-primary" style={{ padding: "9px 18px" }}>
                        <Plus size={16} /> Añadir
                      </button>
                    ) : (
                      <span style={{ fontSize: "11px", color: "#0284C7", background: "#E0F2FE", padding: "6px 12px", borderRadius: "10px", fontWeight: 800 }}>
                        Vista Gestor
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Drawer Carrito */}
      {isCartOpen && !isAdmin && (
        <div className="drawer-backdrop" onClick={() => setIsCartOpen(false)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #F1F5F9", paddingBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <ShoppingBag size={22} color="#0EA5E9" />
                <h2 style={{ fontSize: "20px", fontWeight: 900 }}>Bolsa de Pedidos DIEGO</h2>
              </div>
              <button onClick={() => setIsCartOpen(false)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: "#94A3B8" }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "20px 0" }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", color: "#94A3B8", margin: "60px 0" }}>
                  <ShoppingBag size={48} style={{ opacity: 0.2, margin: "0 auto 12px" }} />
                  <p style={{ fontSize: "15px", fontWeight: 700, color: "#64748B" }}>Tu bolsa está vacía</p>
                  <p style={{ fontSize: "12px", marginTop: "4px" }}>Selecciona productos del catálogo.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="cart-item">
                    <div style={{ maxWidth: "220px" }}>
                      <div style={{ fontWeight: 800, fontSize: "14px", color: "#0F172A" }}>{item.name}</div>
                      <div style={{ color: "#0284C7", fontWeight: 900, fontSize: "14px", marginTop: "2px" }}>
                        S/ {item.price.toFixed(2)}
                      </div>
                    </div>
                    <div className="qty-control">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="btn-qty">-</button>
                      <span style={{ fontSize: "14px", fontWeight: 800 }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="btn-qty">+</button>
                      <button onClick={() => removeFromCart(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", marginLeft: "4px" }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ borderTop: "2px solid #F1F5F9", paddingTop: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "20px" }}>
                  <span style={{ color: "#64748B", fontWeight: 800, fontSize: "14px", textTransform: "uppercase" }}>Total a Pagar:</span>
                  <span style={{ fontSize: "28px", fontWeight: 900, color: "#0284C7" }}>S/ {totalAmount.toFixed(2)}</span>
                </div>
                <button onClick={handleCheckoutClick} className="btn-primary" style={{ width: "100%", padding: "16px", fontSize: "15px" }}>
                  <span>Proceder al Pago</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <PaymentModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
    </div>
  );
}