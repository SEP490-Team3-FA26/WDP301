import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { 
  ArrowRight, ShieldCheck, Activity, PackageSearch, 
  Workflow, CheckCircle2, ChevronDown, Fingerprint, 
  Box, Search, History, BrainCircuit, ScanBarcode, ArrowRightLeft,
  ShoppingCart, Heart, Sparkles, HeartPulse, Award, Shield, 
  Check, Info, Sparkle, Stethoscope, Star, SparklesIcon,
  ShieldAlert, XCircle, User, LogOut
} from "lucide-react";
import { notifyAuthTokenChanged } from "../../utils/authEvents";

gsap.registerPlugin(ScrollTrigger);

const categories = [
  { value: "", label: "Tất cả dược phẩm" },
  { value: "Thuốc kháng sinh", label: "Kháng sinh (Rx)" },
  { value: "Thuốc giảm đau hạ sốt", label: "Giảm đau hạ sốt" },
  { value: "Thuốc trị ho cảm", label: "Đường hô hấp" },
  { value: "Thuốc dạ dày", label: "Hỗ trợ tiêu hóa" },
  { value: "Thuốc bổ", label: "Vitamin & TPCN" }
];

export function Landing() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const cartIconRef = useRef<HTMLAnchorElement>(null);
  const isFirstRender = useRef(true);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  
  const hasToken = !!localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    notifyAuthTokenChanged();
    navigate("/login");
  };
  
  // E-commerce states
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [addedItems, setAddedItems] = useState<{ [key: string]: boolean }>({});
  const [selectedMedicineForModal, setSelectedMedicineForModal] = useState<any | null>(null);
  const [modalQuantity, setModalQuantity] = useState<number>(1);

  // Real-time animated audit logs state
  const [logs, setLogs] = useState([
    { time: "15:42:01", user: "Khoa_WHS", action: "TRANSFERRED [Lô A09-Paracetamol]", to: "Branch_DistrictA", status: "SUCCESS" },
    { time: "15:43:12", user: "Admin_System", action: "APPROVED REBATE_POLICY", to: "All_Branches", status: "LOCKED_HASH" },
    { time: "15:44:05", user: "Mai_BranchA", action: "RECEIVED [Lô A09-Paracetamol]", to: "Local_Inventory", status: "VERIFIED_QR" },
    { time: "15:45:19", user: "AI_Warning_Bot", action: "FLAGGED drug interaction warning", to: "POS_Terminal_2", status: "BLOCKED" }
  ]);

  // Fetch cart count
  const updateCartCount = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        const guestCartStr = localStorage.getItem("guest_cart");
        const items = guestCartStr ? JSON.parse(guestCartStr) : [];
        const count = items.reduce((acc: number, item: any) => acc + item.quantity, 0);
        setCartCount(count);
        return;
      }
      const res = await fetch("/api/users/cart", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem("token");
        notifyAuthTokenChanged();
        // Fallback to guest cart immediately
        const guestCartStr = localStorage.getItem("guest_cart");
        const items = guestCartStr ? JSON.parse(guestCartStr) : [];
        const count = items.reduce((acc: number, item: any) => acc + item.quantity, 0);
        setCartCount(count);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data && data.items) {
          const count = data.items.reduce((acc: number, item: any) => acc + item.quantity, 0);
          setCartCount(count);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch featured products
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const catParam = activeCategory ? `&category=${encodeURIComponent(activeCategory)}` : "";
      const res = await fetch(`/api/medicines?page=1&limit=8${catParam}`);
      if (res.ok) {
        const result = await res.json();
        setMedicines(result.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Sparkle burst helper for premium microinteraction
  const triggerSparkles = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const colors = ["#0d6efd", "#38bdf8", "#34d399", "#fbbf24", "#f43f5e"];

    for (let i = 0; i < 14; i++) {
      const particle = document.createElement("div");
      particle.className = "fixed pointer-events-none rounded-full z-50";
      
      const size = Math.random() * 8 + 4;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      Object.assign(particle.style, {
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        left: `${centerX}px`,
        top: `${centerY}px`,
        boxShadow: `0 0 10px ${color}`,
        borderRadius: "50%"
      });

      document.body.appendChild(particle);

      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 90 + 30;
      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance;

      gsap.to(particle, {
        x: targetX,
        y: targetY,
        opacity: 0,
        scale: 0,
        duration: 0.7 + Math.random() * 0.4,
        ease: "power3.out",
        onComplete: () => {
          particle.remove();
        }
      });
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [activeCategory]);

  useEffect(() => {
    updateCartCount();
    window.addEventListener("cartUpdated", updateCartCount);
    return () => window.removeEventListener("cartUpdated", updateCartCount);
  }, []);

  // Cart Badge bounce trigger on count change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (cartCount > 0 && cartIconRef.current) {
      gsap.fromTo(cartIconRef.current,
        { scale: 0.8, rotate: -12 },
        { scale: 1.25, rotate: 12, duration: 0.15, yoyo: true, repeat: 1, ease: "back.out(1.6)" }
      );
    }
  }, [cartCount]);

  // Product cards staggered entrance animation
  useEffect(() => {
    if (!loadingProducts && medicines.length > 0) {
      const timer = setTimeout(() => {
        gsap.fromTo(".product-card",
          { y: 35, opacity: 0, scale: 0.96 },
          { y: 0, opacity: 1, scale: 1, duration: 0.55, stagger: 0.07, ease: "power2.out" }
        );
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [medicines, loadingProducts]);

  // Live Audit Logs Stream Interval
  useEffect(() => {
    const users = ["Khoa_WHS", "Mai_BranchA", "Admin_System", "Trang_POS", "AI_Warning_Bot", "Huy_Manager", "Minh_BranchB"];
    const actions = [
      { action: "TRANSFERRED [Lô A09-Paracetamol]", to: "Branch_DistrictA", status: "SUCCESS" },
      { action: "RECEIVED [Lô B12-Augmentin]", to: "Local_Inventory", status: "VERIFIED_QR" },
      { action: "AI_CHECK: Pass [Lô D24-Aspirin]", to: "GPP_Auditor", status: "PASSED" },
      { action: "UPDATED stock [Lô E02-Decolgen]", to: "Shelf_A3", status: "COMPLETED" },
      { action: "POLLED PayOS payment state", to: "Order_#8492", status: "PAID_QR" },
      { action: "ALERT: Expired check [Lô C05-Amox]", to: "Quarantine_Area", status: "WARNING" },
      { action: "SYNCED GPP system inventory", to: "National_Server", status: "SUCCESS" },
      { action: "FLAGGED drug interaction warning", to: "POS_Terminal_2", status: "BLOCKED" }
    ];

    const interval = setInterval(() => {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      const now = new Date();
      const timeStr = now.toTimeString().split(" ")[0];

      const newLog = {
        time: timeStr,
        user: randomUser,
        ...randomAction
      };

      setLogs((prevLogs) => {
        const nextLogs = [newLog, ...prevLogs];
        if (nextLogs.length > 4) {
          nextLogs.pop();
        }
        return nextLogs;
      });

      // Quick smooth reveal for new log line
      gsap.fromTo(".log-line-0",
        { opacity: 0, x: -15, filter: "blur(2px)" },
        { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.5, ease: "power2.out" }
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // GSAP scroll and float setup
  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Morphing Sticky Navbar
      gsap.to(".sticky-nav", {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top -50",
          end: "top -150",
          scrub: 1,
        },
        paddingTop: "0.75rem",
        paddingBottom: "0.75rem",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        boxShadow: "0 10px 30px -10px rgba(0,0,0,0.08)",
        borderBottom: "1px solid rgba(226, 232, 240, 0.8)"
      });

      // 2. Hero Text Split Reveal
      gsap.fromTo(".hero-text",
        { y: "110%", opacity: 0, rotate: 2 },
        { y: "0%", opacity: 1, rotate: 0, duration: 1.2, stagger: 0.12, ease: "power4.out", delay: 0.1 }
      );

      // Hero elements Fade-in
      gsap.fromTo(".hero-fade",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1, stagger: 0.15, ease: "power3.out", delay: 0.7 }
      );

      // 3. Number Counter Animation
      if (counterRef.current) {
        const counterObj = { val: 0 };
        gsap.to(counterObj, {
          val: 1245890,
          duration: 2.5,
          delay: 1,
          ease: "power2.out",
          onUpdate: function () {
            if (counterRef.current) {
              counterRef.current.innerText = Math.floor(counterObj.val).toLocaleString('en-US');
            }
          }
        });
      }

      // 4. Background Floating Animations (Infinite Loop using Percentages)
      gsap.to(".floating-pill-1", {
        yPercent: -35,
        xPercent: 15,
        rotate: 25,
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });

      gsap.to(".floating-pill-2", {
        yPercent: 25,
        xPercent: -20,
        rotate: -15,
        duration: 7,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });

      gsap.to(".floating-pill-3", {
        yPercent: -20,
        xPercent: -15,
        rotate: 35,
        duration: 9,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });

      // 5. Bento cards reveal on scroll
      gsap.fromTo(".bento-card",
        { y: 80, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.9, stagger: 0.18, ease: "power3.out",
          scrollTrigger: {
            trigger: "#pain-points",
            start: "top 82%",
          }
        }
      );

      // 6. Ecosystem layer reveal
      gsap.fromTo(".module-card",
        { y: 50, opacity: 0, scale: 0.95 },
        {
          y: 0, opacity: 1, scale: 1, duration: 0.75, stagger: 0.12, ease: "back.out(1.3)",
          scrollTrigger: {
            trigger: "#modules",
            start: "top 78%",
          }
        }
      );

    }, containerRef);

    // Interactive mouse move parallax for hero elements & spotlight
    const heroSection = document.querySelector(".hero-container");
    const handleMouseMove = (e: MouseEvent) => {
      if (!heroSection) return;
      const rect = heroSection.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const relX = e.clientX - (rect.left + rect.width / 2);
      const relY = e.clientY - (rect.top + rect.height / 2);

      gsap.to(".spotlight-glow", {
        x: mouseX - 250,
        y: mouseY - 250,
        duration: 0.7,
        ease: "power2.out"
      });

      gsap.to(".floating-pill-1", {
        x: relX * 0.045,
        y: relY * 0.045,
        duration: 0.8,
        ease: "power2.out"
      });

      gsap.to(".floating-pill-2", {
        x: -relX * 0.065,
        y: -relY * 0.065,
        duration: 0.8,
        ease: "power2.out"
      });

      gsap.to(".floating-pill-3", {
        x: relX * 0.055,
        y: relY * 0.055,
        duration: 0.8,
        ease: "power2.out"
      });
    };

    heroSection?.addEventListener("mousemove", handleMouseMove as EventListener);

    return () => {
      ctx.revert();
      heroSection?.removeEventListener("mousemove", handleMouseMove as EventListener);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/customer/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/customer/shop");
    }
  };

  const handleAddToCart = async (med: any, e: React.MouseEvent<HTMLButtonElement>, customQty: number = 1) => {
    // Fire beautiful particle sparkle burst
    triggerSparkles(e);

    const medId = med.id || med._id;
    const token = localStorage.getItem("token");
    if (!token) {
      // Guest cart fallback logic
      try {
        const guestCartStr = localStorage.getItem("guest_cart");
        const cart = guestCartStr ? JSON.parse(guestCartStr) : [];
        const existingItem = cart.find((it: any) => it.id === medId || it._id === medId);
        
        if (existingItem) {
          if (existingItem.quantity + customQty > med.stock) {
            alert(`Chỉ còn ${med.stock} sản phẩm khả dụng trong kho!`);
            return;
          }
          existingItem.quantity += customQty;
        } else {
          if (med.stock <= 0) {
            alert("Sản phẩm đã hết hàng!");
            return;
          }
          cart.push({
            id: medId,
            _id: medId,
            name: med.name,
            category: med.category,
            price: med.price,
            quantity: customQty,
            unit: med.unit || "Viên",
            stock: med.stock,
            active_ingredient: med.active_ingredient || "",
            image: med.image || ""
          });
        }
        localStorage.setItem("guest_cart", JSON.stringify(cart));
        window.dispatchEvent(new Event("cartUpdated"));
        
        setAddedItems((prev) => ({ ...prev, [medId]: true }));
        setTimeout(() => {
          setAddedItems((prev) => ({ ...prev, [medId]: false }));
        }, 1500);
      } catch (err) {
        console.error("Error updating guest cart:", err);
      }
      return;
    }

    try {
      const response = await fetch("/api/users/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ medicineId: medId, quantity: customQty })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || "Lỗi thêm vào giỏ hàng.");
      }

      window.dispatchEvent(new Event("cartUpdated"));
      setAddedItems((prev) => ({ ...prev, [medId]: true }));
      setTimeout(() => {
        setAddedItems((prev) => ({ ...prev, [medId]: false }));
      }, 1500);

    } catch (err: any) {
      alert(err.message || "Lỗi kết nối");
      console.error(err);
    }
  };

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return (
    <div className="bg-slate-50 text-slate-800 font-sans selection:bg-[#0d6efd] selection:text-white overflow-hidden min-h-screen flex flex-col" ref={containerRef}>
      
      {/* 1. STICKY PREMIUM GLASSMORPHISM NAV */}
      <nav className="fixed w-full z-50 top-0 transition-all duration-300 py-5 px-6 border-b border-transparent sticky-nav">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0d6efd] to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-all">
                <HeartPulse size={22} className="animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-[18px] text-slate-900 tracking-tight leading-none">SmartPharma <span className="text-[#0d6efd]">AI</span></span>
                <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mt-1">Hệ Thống Nhà Thuốc Số 3.0</span>
              </div>
            </Link>
          </div>
          
          <div className="flex items-center gap-4.5">
            <Link to="/customer/shop" className="font-bold text-xs uppercase tracking-wider text-slate-600 hover:text-[#0d6efd] transition-colors">
              Cửa Hàng
            </Link>
            <span className="w-px h-4 bg-slate-200"></span>
            <Link to="/interactions" className="font-bold text-xs uppercase tracking-wider text-[#0d6efd] hover:underline flex items-center gap-1">
              <BrainCircuit size={14} /> Tương tác thuốc AI
            </Link>
            <span className="w-px h-4 bg-slate-200"></span>

            {/* Cart Badge */}
            <Link ref={cartIconRef} to="/customer/cart" className="relative p-2 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-[#0d6efd] rounded-xl transition-all">
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 bg-[#ba1a1a] text-white text-[9px] font-black flex items-center justify-center rounded-full px-1 border-2 border-white">
                  {cartCount}
                </span>
              )}
            </Link>

            <span className="w-px h-4 bg-slate-200"></span>
            {hasToken ? (
              <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-slate-200">
                <Link to="/customer/profile" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs uppercase shadow-inner">
                    KH
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-800">Khách Hàng</span>
                    <span className="text-[10px] font-medium text-slate-400 hover:text-blue-500 transition-colors">Hồ sơ & Lịch sử</span>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-colors ml-1 cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link 
                to="/login"
                className="bg-gradient-to-r from-[#0d6efd] to-[#0b5ed7] hover:from-[#0b5ed7] hover:to-[#0d6efd] text-white px-5.5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-700/15 hover:-translate-y-0.5 active:scale-95"
              >
                Hệ thống Login →
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* 2. PREMIUM HERO SECTION WITH GRADIENT BACKGROUND & ANIMATIONS */}
      <section className="hero-container relative pt-36 pb-20 px-6 flex flex-col justify-center min-h-[92vh]">
        {/* Medical Abstract Interactive Background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
          {/* Spotlight ambient glow tracking the cursor */}
          <div className="absolute w-[500px] h-[500px] bg-gradient-to-tr from-blue-500/10 to-sky-400/10 rounded-full blur-[110px] pointer-events-none spotlight-glow" style={{ left: 0, top: 0, transform: 'translate3d(-500px, -500px, 0)' }}></div>

          {/* Subtle teal blurred blobs */}
          <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-500/5 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[10%] left-[-5%] w-[40vw] h-[40vw] bg-[#0d6efd]/5 rounded-full blur-[120px]"></div>

          {/* Floating Pill Elements */}
          <div className="absolute top-[25%] left-[8%] w-16 h-8 bg-blue-200/20 border border-blue-300/30 rounded-full blur-[0.5px] floating-pill-1 flex items-center justify-center text-blue-500/40 text-[10px] font-bold">PILL</div>
          <div className="absolute top-[18%] right-[12%] w-12 h-12 bg-sky-200/25 border border-sky-300/30 rounded-full blur-[1px] floating-pill-2 flex items-center justify-center text-sky-500/30 font-black text-sm">+</div>
          <div className="absolute bottom-[28%] right-[8%] w-14 h-7 bg-indigo-200/20 border border-indigo-300/25 rounded-full blur-[0.5px] floating-pill-3 flex items-center justify-center text-indigo-400/40 text-[9px]">Rx</div>
        </div>

        <div className="max-w-6xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Hero Column */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <div className="mb-5 overflow-hidden inline-block hero-fade">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[#0d6efd] text-[10px] font-black tracking-widest uppercase">
                <Sparkles size={12} className="animate-spin" />
                Nền Tảng Dược Phẩm Công Nghệ Số 3.0
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 leading-[1.12] tracking-tight mb-6">
              <div className="overflow-hidden pb-1">
                <div className="hero-text transform origin-bottom-left">Mua Thuốc Chuẩn GPP</div>
              </div>
              <div className="overflow-hidden pb-1">
                <div className="hero-text transform origin-bottom-left">Tư Vấn Thông Minh</div>
              </div>
              <div className="overflow-hidden pb-1">
                <div className="hero-text transform origin-bottom-left text-[#0d6efd]">Kết Hợp Trợ Lý AI</div>
              </div>
            </h1>

            <p className="hero-fade text-md md:text-lg text-slate-500 max-w-2xl mb-8 leading-relaxed font-medium">
              SmartPharma AI đồng hành cùng sức khỏe gia đình bạn. Tra cứu thông tin thuốc nhanh, phân tích tương tác tự động theo chuẩn Bộ Y Tế, và mua sắm dễ dàng từ hệ thống cửa hàng đa cơ sở.
            </p>

            {/* Premium Integrated Search Bar */}
            <form onSubmit={handleSearchSubmit} className="group/search hero-fade w-full max-w-xl bg-white border border-slate-200 rounded-[20px] p-2 shadow-xl shadow-blue-900/5 flex items-center gap-2 hover:border-blue-300 focus-within:border-[#0d6efd] focus-within:ring-2 focus-within:ring-blue-100 transition-all mb-10">
              <div className="pl-3.5 text-slate-400 group-focus-within/search:text-[#0d6efd] transition-colors duration-200">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Tìm tên thuốc, hoạt chất (Ví dụ: Panadol, Amoxicillin)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-0 outline-none text-slate-900 font-semibold placeholder:font-normal placeholder:text-slate-400 text-sm py-2"
              />
              <button
                type="submit"
                className="bg-[#0d6efd] hover:bg-[#0b5ed7] text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                Tìm kiếm
              </button>
            </form>

            {/* Quick Category Badges */}
            <div className="hero-fade flex flex-wrap gap-2.5 items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tìm nhanh:</span>
              {categories.slice(1, 5).map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => navigate(`/customer/shop?category=${encodeURIComponent(cat.value)}`)}
                  className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 hover:border-[#0d6efd] hover:text-[#0d6efd] transition-all hover:shadow-sm"
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Hero Column: Medical Statistics Box */}
          <div className="lg:col-span-5 w-full flex justify-center hero-fade">
            <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-2xl shadow-blue-900/5 max-w-sm w-full relative overflow-hidden group">
              {/* Decorative design details */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-colors"></div>
              
              <div className="flex items-center gap-3.5 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0d6efd] border border-blue-100">
                  <Award size={22} className="animate-bounce" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Hệ thống Đạt chuẩn GPP</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bộ Y Tế Chứng Nhận</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 mb-6">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-3xl font-black text-slate-900">+</span>
                  <span ref={counterRef} className="text-3xl font-black text-slate-900">0</span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Hộp thuốc đã được lưu hành</p>
              </div>

              <div className="space-y-3">
                {[
                  "Quản lý theo hạn dùng chuẩn FIFO",
                  "Cảnh báo tương tác thuốc AI tự động",
                  "Tự động tính thuế VAT 8% & chiết khấu thành viên",
                ].map((txt, index) => (
                  <div key={index} className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <span>{txt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. DYNAMIC FEATURED PRODUCTS SECTION (REAL PRODUCTS GRID) */}
      <section className="py-24 px-6 bg-white border-y border-slate-200/60 relative">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <span className="text-[10px] font-black text-[#0d6efd] uppercase tracking-widest mb-1.5 block">Sản phẩm nổi bật</span>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Danh mục dược phẩm bán chạy</h2>
            </div>
            
            {/* Smooth Tab Filters */}
            <div className="flex gap-1.5 overflow-x-auto bg-slate-50 border border-slate-100 p-1 rounded-2xl shrink-0 self-start">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`px-4.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap uppercase tracking-wider ${
                    activeCategory === cat.value
                      ? "bg-white text-[#0d6efd] shadow-sm font-black"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Real Products Grid */}
          {loadingProducts ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-8 h-8 border-3 border-[#0d6efd] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang kết nối kho thuốc...</span>
            </div>
          ) : medicines.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {medicines.map((med) => {
                const medId = med.id || med._id;
                const isRx = med.drug_classification === "PRESCRIPTION_ANTIBIOTIC";
                const isOutOfStock = med.stock <= 0;

                return (
                  <div
                    key={medId}
                    onClick={() => {
                      setSelectedMedicineForModal(med);
                      setModalQuantity(1);
                    }}
                    className="product-card glow-on-hover bg-slate-50/50 rounded-[24px] border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-blue-200/50 hover:bg-white transition-all duration-300 flex flex-col overflow-hidden group hover:-translate-y-1.5 relative cursor-pointer"
                  >
                    {/* Visual Image Container */}
                    <div className="w-full h-44 bg-slate-100/40 group-hover:bg-white flex items-center justify-center p-5 relative overflow-hidden transition-colors border-b border-slate-100/50">
                      <img
                        src={med.image || "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60"}
                        alt={med.name}
                        loading="lazy"
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* Classification Badge */}
                      <span
                        className={`absolute top-3.5 left-3.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm border ${
                          isRx
                            ? "bg-rose-50 text-rose-700 border-rose-100"
                            : "bg-blue-50 text-blue-700 border-blue-100"
                        }`}
                      >
                        {isRx ? "Kê đơn (Rx)" : "Không kê đơn"}
                      </span>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-[14px] group-hover:text-[#0d6efd] transition-colors leading-tight mb-1.5 line-clamp-2">
                          {med.name}
                        </h4>
                        <div className="text-[10px] text-slate-400 font-bold mb-3">
                          Hoạt chất: <span className="text-slate-600 underline font-extrabold">{med.active_ingredient || "N/A"}</span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-400">
                          Nhóm thuốc: <span className="text-slate-600">{med.category}</span>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100/80">
                        <div className="flex items-baseline justify-between mb-3.5">
                          <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Tồn kho / Giá</span>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Kho: {med.stock} {med.unit || "Viên"}</span>
                            <span className="text-md font-black text-[#0d6efd] tracking-tight">
                              {med.price.toLocaleString()}₫
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(med, e);
                          }}
                          disabled={isOutOfStock}
                          className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                            isOutOfStock
                              ? "bg-slate-100 text-slate-400 border border-slate-100 cursor-not-allowed"
                              : addedItems[medId]
                              ? "bg-emerald-500 text-white"
                              : "bg-[#0d6efd] hover:bg-[#0b5ed7] text-white active:scale-95"
                          }`}
                        >
                          {isOutOfStock ? (
                            "Hết hàng"
                          ) : addedItems[medId] ? (
                            <>
                              <Check size={13} /> Đã thêm!
                            </>
                          ) : (
                            <>
                              <ShoppingCart size={13} /> Thêm vào giỏ
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-[24px] border border-slate-200/80 p-16 text-center flex flex-col items-center justify-center">
              <Info size={40} className="text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-700 text-md">Không có thuốc tương ứng</h3>
              <p className="text-slate-400 text-xs mt-1.5 max-w-sm">
                Không tìm thấy loại thuốc nào thuộc danh mục này trong cơ sở dữ liệu.
              </p>
            </div>
          )}

          {/* Go to shop link */}
          <div className="text-center mt-12">
            <Link
              to="/customer/shop"
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0d6efd] hover:underline"
            >
              Xem tất cả dược phẩm cửa hàng <ArrowRight size={14} />
            </Link>
          </div>

        </div>
      </section>

      {/* 4. CORE PAIN POINTS BENTO GRID */}
      <section id="pain-points" className="py-24 px-6 bg-slate-50 border-b border-slate-200/60 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 bento-card">
            <span className="text-[10px] font-black text-[#0d6efd] uppercase tracking-widest mb-1.5 block">Giải pháp đột phá</span>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-3">Vận hành chuỗi thuốc chuẩn chỉ</h2>
            <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider">Overcoming critical pharmacy supply bottlenecks</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(300px,_auto)]">
            
            {/* Bento Card 1: Unit Conversion */}
            <div className="bento-card glow-on-hover md:col-span-7 bg-white rounded-3xl p-8 border border-slate-200 relative overflow-hidden group hover:border-blue-200 hover:shadow-lg transition-all duration-300">
               <div className="relative z-10">
                  <div className="w-12 h-12 bg-blue-50 text-[#0d6efd] rounded-2xl flex items-center justify-center mb-6 border border-blue-100 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                     <Workflow size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Đồng bộ Quy đổi Đơn vị Triệt để</h3>
                  <p className="text-slate-500 font-medium mb-8 text-xs">Unit Conversion Chaos Resolved. Phá bỏ rào cản tính toán đơn vị và tồn kho từ Thùng → Hộp → Vỉ → Viên.</p>
                  
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col gap-3 font-mono text-xs shadow-inner group-hover:bg-[#0d6efd]/5 transition-colors">
                     <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                       <span className="font-bold text-slate-700 flex items-center gap-2"><Box size={14}/> 1 Thùng (Bulk)</span>
                       <ArrowRightLeft size={12} className="text-slate-400 transition-transform duration-500 group-hover:rotate-180" />
                       <span className="font-black text-[#0d6efd]">100 Hộp</span>
                     </div>
                     <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                       <span className="font-bold text-slate-700 flex items-center gap-2"><PackageSearch size={14}/> 1 Hộp (Box)</span>
                       <ArrowRightLeft size={12} className="text-slate-400 transition-transform duration-500 group-hover:rotate-180" />
                       <span className="font-black text-[#0d6efd]">5 Vỉ</span>
                     </div>
                     <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                       <span className="font-bold text-slate-700 flex items-center gap-2"><Activity size={14}/> 1 Vỉ (Blister)</span>
                       <ArrowRightLeft size={12} className="text-slate-400 transition-transform duration-500 group-hover:rotate-180" />
                       <span className="font-black text-[#0d6efd]">10 Viên</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Bento Card 2: AI Near-Expiry Alerts */}
            <div className="bento-card md:col-span-5 bg-slate-900 text-white rounded-3xl p-8 border border-slate-800 relative overflow-hidden group hover:shadow-2xl transition-all">
               {/* Scanning Laser Line */}
               <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent h-1/2 w-full scanner-line pointer-events-none"></div>
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-blue-500/20 transition-colors"></div>
               
               <div className="relative z-10 h-full flex flex-col">
                  <div className="w-12 h-12 bg-white/10 text-blue-400 rounded-2xl flex items-center justify-center mb-6 border border-white/5 backdrop-blur-md group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                     <ShieldCheck size={24} />
                  </div>
                  <h3 className="text-2xl font-black mb-2">Cảnh báo Cận Hạn AI</h3>
                  <p className="text-slate-400 font-medium mb-auto text-xs">AI Near-Expiry Realtime Alerts. Tự động kiểm soát lô thuốc chuẩn hạn dùng và cách ly thuốc cận date.</p>
                  
                  <div className="mt-8 space-y-4">
                     <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <span className="relative flex h-2.5 w-2.5">
                             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                             <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                           </span>
                           <div>
                             <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-0.5">Cảnh báo đỏ (Hủy)</p>
                             <p className="font-bold text-sm text-slate-100">Panadol Extra (Lô X902)</p>
                           </div>
                        </div>
                        <div className="bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded animate-pulse">
                           {'< 30 Ngày'}
                        </div>
                     </div>
                     <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <span className="relative flex h-2.5 w-2.5">
                             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                             <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                           </span>
                           <div>
                             <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-0.5">Cảnh báo vàng (Giảm giá)</p>
                             <p className="font-bold text-sm text-slate-100">Augmentin (Lô B110)</p>
                           </div>
                        </div>
                        <div className="bg-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded">
                           {'30 - 60 Ngày'}
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Bento Card 3: Lot Traceability & Audit Logs */}
            <div className="bento-card glow-on-hover md:col-span-12 bg-white rounded-3xl p-8 border border-slate-200 flex flex-col md:flex-row gap-8 items-center group hover:border-blue-200 hover:shadow-lg transition-all duration-300">
               <div className="flex-1">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                     <History size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Truy xuất Lô & Audit Log liên tục</h3>
                  <p className="text-slate-500 font-medium text-xs">Lot Traceability & Strict Data Integrity Logs. Chống thất thoát hàng hóa qua lịch sử chuyển kho liên tuyến chéo rõ ràng tới từng giây.</p>
               </div>
               <div className="flex-1 w-full bg-slate-900 rounded-2xl p-5 border border-slate-800 font-mono text-xs overflow-hidden shadow-inner group-hover:shadow-[0_0_30px_rgba(15,118,110,0.15)] transition-all">
                  <div className="space-y-3 flex flex-col">
                     {logs.map((log, i) => (
                       <div key={i} className={`flex gap-4 items-start border-b border-slate-800/60 pb-2.5 last:border-0 last:pb-0 ${i === 0 ? 'log-line-0' : ''}`}>
                         <span className="text-slate-500">[{log.time}]</span>
                         <span className="text-blue-400 font-bold">{log.user}</span>
                         <span className="text-slate-300 flex-1 truncate">{log.action}</span>
                         <span className="text-[#0d6efd] font-bold hidden sm:block">{log.status}</span>
                       </div>
                     ))}
                  </div>
               </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. ECOSYSTEM MODULES GRID */}
      <section id="modules" className="py-24 px-6 bg-white shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <span className="text-[10px] font-black text-[#0d6efd] uppercase tracking-widest mb-1.5 block">Kiến trúc hệ thống</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Hệ sinh thái cốt lõi của SmartPharma</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {[
              { id: "M01", title: "POS App Bán Hàng", icon: <CheckCircle2 size={32}/>, desc: "Giao diện thanh toán tại quầy đa dụng OTC & Rx, tích hợp kiểm tra tương tác thuốc và xuất hóa đơn VietQR PayOS tự động." },
              { id: "M02", title: "Kho Vận Chuẩn FIFO", icon: <ScanBarcode size={32}/>, desc: "Nhập xuất hàng siêu tốc bằng mã QR định danh lô. Tự động khấu trừ tồn kho theo lô hạn dùng xa nhất." },
              { id: "M03", title: "Luân Chuyển Liên Tục", icon: <ArrowRightLeft size={32}/>, desc: "Điều phối và tái phân bổ hàng cận date chéo giữa các chi nhánh dựa trên dữ liệu kinh doanh." },
              { id: "M04", title: "Dự Báo AI", icon: <BrainCircuit size={32}/>, desc: "AI phân tích tần suất đơn thuốc theo khu vực và dự phòng nguồn cung trước các chu kỳ dịch bệnh." },
            ].map((mod, i) => (
              <div key={i} className="module-card group bg-slate-50 hover:bg-white p-8 rounded-3xl border border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300 cursor-default hover:-translate-y-2">
                 <div className="text-[#0d6efd] mb-8 opacity-75 group-hover:opacity-100 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 origin-left">
                   {mod.icon}
                 </div>
                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{mod.id} CORE MODULE</div>
                 <h3 className="text-lg font-bold text-slate-900 mb-3">{mod.title}</h3>
                 <p className="text-xs text-slate-500 font-medium leading-relaxed">{mod.desc}</p>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* 6. ACCORDION FAQ SECTION */}
      <section className="py-24 px-6 bg-[#f8fafc] border-t border-slate-200/60">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-slate-900 mb-12 text-center">Câu hỏi thường gặp</h2>
          
          <div className="space-y-4">
            {[
              {
                q: "Hệ thống có hỗ trợ kiểm tra tương tác thuốc ngay tại POS không?",
                subtitle: "Realtime Drug-Drug Interaction Warning",
                a: "Có. Giao diện bán hàng POS tại quầy và giỏ hàng của khách hàng tích hợp thư viện AI hỗ trợ kiểm tra tương tác thuốc tự động. Nếu phát hiện sự kết hợp thuốc có hại (Ví dụ: Clopidogrel + Omeprazole), hệ thống sẽ bật cảnh báo đỏ nhắc nhở dược sĩ ngay lập tức trước khi xuất hóa đơn."
              },
              {
                q: "Cổng thanh toán PayOS VietQR hoạt động như thế nào?",
                subtitle: "PayOS VietQR Integration Flow",
                a: "Hệ thống tích hợp trực tiếp với cổng thanh toán PayOS. Cả khách hàng mua online và dược sĩ thanh toán tại quầy đều có thể tạo nhanh mã QR ngân hàng. Khi khách hàng quét và hoàn tất giao dịch, hệ thống tự động polling kiểm tra trạng thái thanh toán và tự động khấu trừ kho theo thời gian thực."
              },
              {
                q: "Kiến trúc kho vận chuẩn FIFO được triển khai ra sao?",
                subtitle: "FIFO Inventory Logistics",
                a: "Mỗi hộp thuốc nhập kho đều được quản lý kèm HSD và số lô. Khi tạo hóa đơn bán thuốc (POS hoặc online), hệ thống tự động lọc tìm và trừ hàng của lô thuốc có HSD gần nhất trước, giúp hạn chế rủi ro thuốc hết hạn tồn đọng trong kho."
              }
            ].map((faq, i) => (
              <div 
                key={i} 
                className={`border border-slate-200 bg-white rounded-2xl overflow-hidden transition-all duration-300 ${openFAQ === i ? 'shadow-md border-blue-200' : 'hover:border-slate-300'}`}
              >
                <button 
                  onClick={() => toggleFAQ(i)}
                  className="w-full text-left px-6 py-5 flex items-start justify-between bg-white text-slate-800 focus:outline-none"
                >
                  <div className="pr-4">
                    <h4 className="font-bold text-md text-slate-900 mb-1">{faq.q}</h4>
                    <p className="text-[10px] font-bold text-[#0d6efd] uppercase tracking-wider">{faq.subtitle}</p>
                  </div>
                  <ChevronDown size={18} className={`text-slate-400 shrink-0 mt-1 transition-transform duration-300 ${openFAQ === i ? 'rotate-180' : ''}`} />
                </button>
                <div 
                  className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openFAQ === i ? 'max-h-96 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <p className="text-xs text-slate-500 font-medium leading-relaxed pt-2.5 border-t border-slate-100">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. FINAL HERO CTA & COMPLIANT FOOTER */}
      <section className="relative pt-32 bg-[#0b0f19] text-white overflow-hidden mt-auto">
        {/* Soft abstract teal mesh background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-[50%] -left-[10%] w-[130%] h-[130%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-transparent to-transparent opacity-80"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center mb-32">
          <h2 className="text-3xl md:text-5xl font-black mb-5 tracking-tight">Số Hóa Nhà Thuốc Của Bạn Ngay Hôm Nay.</h2>
          <p className="text-md text-slate-400 font-medium mb-10">Bắt đầu quản lý chuỗi hiệu thuốc đa điểm thông minh với công nghệ QR & AI.</p>
          <Link 
            to="/login"
            className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-full font-black text-sm uppercase tracking-wider hover:bg-slate-100 transition-transform hover:scale-105 active:scale-95 shadow-2xl shadow-white/5"
          >
            Trải nghiệm quản trị →
          </Link>
        </div>

        {/* Multi-column Footer */}
        <footer className="relative z-10 border-t border-slate-800/80 bg-[#080b12] pt-16 pb-8 px-6 text-xs text-slate-400">
           <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
              <div className="md:col-span-5">
                 <span className="font-black text-xl text-white tracking-tight mb-4 inline-block">SmartPharma <span className="text-[#0d6efd]">AI</span></span>
                 <p className="leading-relaxed font-medium mb-6 max-w-sm">
                   Hệ sinh thái nền tảng Quản trị chuỗi cửa hàng bán lẻ Dược phẩm tại Việt Nam. Tối ưu tồn kho theo lô hạn dùng FIFO & Kê đơn giọng nói AI.
                 </p>
                 <div className="inline-block border border-slate-800/80 bg-slate-900/50 px-3 py-2 rounded-lg font-mono text-[10px]">
                    Tech-stack: NestJS / React Router / TailwindCSS / MongoDB / GSAP
                 </div>
              </div>
              
              <div className="md:col-span-3 md:col-start-7">
                 <h4 className="font-bold text-white mb-4 uppercase tracking-wider text-[10px]">Về Dự Án</h4>
                 <ul className="space-y-2.5 font-semibold text-slate-400 text-xs">
                    <li>Đồ Án Tốt Nghiệp 2026</li>
                    <li>Trường Đại học FPT Đà Nẵng</li>
                    <li>Kỹ thuật phần mềm (SE)</li>
                    <li>Nhóm thực hiện: Nhóm 7</li>
                 </ul>
              </div>

              <div className="md:col-span-3">
                 <h4 className="font-bold text-white mb-4 uppercase tracking-wider text-[10px]">Tuân Thủ Pháp Lý</h4>
                 <ul className="space-y-3 text-slate-400 text-xs font-medium leading-relaxed">
                    <li className="flex items-start gap-2">
                       <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                       <span>Tuân thủ thông tư Bộ Y Tế Việt Nam về quản lý và kê đơn thuốc điện tử quốc gia.</span>
                    </li>
                    <li className="flex items-start gap-2">
                       <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                       <span>Đạt tiêu chuẩn bảo mật dữ liệu GPP trong lưu trữ và xuất kho dược phẩm.</span>
                    </li>
                 </ul>
              </div>
           </div>
           
           <div className="max-w-7xl mx-auto border-t border-slate-800/50 pt-8 flex flex-col md:flex-row items-center justify-between text-slate-500 text-[10px] font-bold">
              <p>© 2026 SmartPharma AI by Group 7. All rights reserved.</p>
              <div className="flex gap-4 mt-4 md:mt-0">
                 <a href="#" className="hover:text-white transition-colors">Chính sách bảo mật</a>
                 <a href="#" className="hover:text-white transition-colors">Điều khoản dịch vụ</a>
              </div>
           </div>
        </footer>
      </section>

      {/* 8. MEDICINE DETAILS MODAL */}
      {selectedMedicineForModal && (() => {
        const med = selectedMedicineForModal;
        const medId = med.id || med._id;
        const isRx = med.drug_classification === "PRESCRIPTION_ANTIBIOTIC";
        const isOutOfStock = med.stock <= 0;
        
        return (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 cursor-pointer"
            onClick={() => {
              setSelectedMedicineForModal(null);
              setModalQuantity(1);
            }}
          >
            {/* Modal Box */}
            <div 
              className="bg-white rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-300 cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      isRx ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-blue-50 text-blue-700 border-blue-100"
                    }`}>
                      {isRx ? "Thuốc kê đơn (Rx)" : "Không kê đơn"}
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Mã: {med.sku || med.barcode || medId.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                    {med.name}
                  </h3>
                </div>
                <button 
                  onClick={() => {
                    setSelectedMedicineForModal(null);
                    setModalQuantity(1);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                >
                  <XCircle size={24} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 md:p-8 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 custom-scrollbar">
                {/* Left Column: Image & Add-to-cart */}
                <div className="md:col-span-5 flex flex-col gap-6">
                  <div className="w-full aspect-square bg-slate-50 rounded-2xl flex items-center justify-center p-6 border border-slate-100 shadow-inner relative group overflow-hidden">
                    <img 
                      src={med.image || "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60"}
                      alt={med.name}
                      className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Đơn giá</span>
                      <span className="text-2xl font-black text-[#0d6efd]">
                        {med.price.toLocaleString()}₫
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-4">
                      <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Số lượng mua</span>
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                        <button 
                          onClick={() => setModalQuantity(q => Math.max(1, q - 1))}
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-slate-500 hover:bg-slate-100 active:scale-95 transition-all"
                          disabled={isOutOfStock}
                        >
                          -
                        </button>
                        <span className="w-10 text-center font-black text-slate-800 text-sm">
                          {modalQuantity}
                        </span>
                        <button 
                          onClick={() => setModalQuantity(q => Math.min(med.stock, q + 1))}
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-slate-500 hover:bg-slate-100 active:scale-95 transition-all"
                          disabled={isOutOfStock || modalQuantity >= med.stock}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 border-t border-slate-200/60 pt-4">
                      <div className="flex justify-between text-[11px] font-bold text-slate-400">
                        <span>Trạng thái kho:</span>
                        <span className={isOutOfStock ? "text-rose-600" : "text-emerald-600"}>
                          {isOutOfStock ? "Hết hàng" : `Còn ${med.stock} ${med.unit || "Viên"}`}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-400">
                        <span>Đơn vị tính:</span>
                        <span className="text-slate-600">{med.unit || "Viên"}</span>
                      </div>
                    </div>

                    <button 
                      onClick={(e) => {
                        handleAddToCart(med, e, modalQuantity);
                      }}
                      disabled={isOutOfStock}
                      className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
                        isOutOfStock
                          ? "bg-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed"
                          : addedItems[medId]
                          ? "bg-emerald-500 text-white"
                          : "bg-[#0d6efd] hover:bg-[#0b5ed7] text-white active:scale-95"
                      }`}
                    >
                      {isOutOfStock ? (
                        "Hết hàng trong kho"
                      ) : addedItems[medId] ? (
                        <>
                          <Check size={14} /> Đã thêm thành công!
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={14} /> Thêm vào giỏ hàng
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Right Column: Detailed Medical Specs */}
                <div className="md:col-span-7 flex flex-col gap-6 text-left">
                  {/* Active Ingredients & Manufacturer Micro-cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-1">
                      <span className="text-[10px] font-black text-[#0d6efd] uppercase tracking-widest">Hoạt chất chính</span>
                      <span className="font-extrabold text-slate-800 text-sm leading-snug">
                        {med.active_ingredient || "N/A"}
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-1">
                      <span className="text-[10px] font-black text-[#0d6efd] uppercase tracking-widest">Nhóm điều trị</span>
                      <span className="font-extrabold text-slate-800 text-sm leading-snug">
                        {med.category || "N/A"}
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-1">
                      <span className="text-[10px] font-black text-[#0d6efd] uppercase tracking-widest">Dạng bào chế</span>
                      <span className="font-extrabold text-slate-800 text-sm leading-snug">
                        {med.dosage_form || "N/A"}
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-1">
                      <span className="text-[10px] font-black text-[#0d6efd] uppercase tracking-widest">Nhà sản xuất</span>
                      <span className="font-extrabold text-slate-800 text-sm leading-snug">
                        {med.manufacturer || "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Indications, Usage, Side effects */}
                  <div className="flex flex-col gap-5">
                    <div className="border-b border-slate-100 pb-4">
                      <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Info size={16} className="text-[#0d6efd]" /> Công dụng / Chỉ định
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {med.cong_dung || "Chưa có thông tin công dụng & chỉ định cụ thể. Vui lòng tham khảo ý kiến của bác sĩ điều trị hoặc dược sĩ trước khi sử dụng."}
                      </p>
                    </div>

                    <div className="border-b border-slate-100 pb-4">
                      <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Activity size={16} className="text-[#0d6efd]" /> Hướng dẫn & Liều dùng
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {med.cach_dung || "Chưa có thông tin hướng dẫn sử dụng chi tiết. Tham khảo ý kiến chuyên gia y tế trước khi dùng."}
                      </p>
                    </div>

                    <div className="pb-2">
                      <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ShieldAlert size={16} className="text-[#0d6efd]" /> Tác dụng phụ khuyến cáo
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {med.tac_dung_phu || "Tác dụng phụ tùy thuộc vào cơ địa người bệnh. Ngưng sử dụng thuốc và thông báo ngay cho bác sĩ hoặc cơ sở y tế gần nhất nếu gặp phản ứng không mong muốn."}
                      </p>
                    </div>

                    {med.thong_tin_chi_tiet && typeof med.thong_tin_chi_tiet === 'object' && Object.keys(med.thong_tin_chi_tiet).length > 0 && (
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-2">
                        <h4 className="font-black text-slate-900 text-[11px] uppercase tracking-widest mb-3">Thông số kỹ thuật bổ sung</h4>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] font-bold text-slate-500">
                          {Object.entries(med.thong_tin_chi_tiet).map(([key, val]: [string, any]) => (
                            <div key={key} className="flex justify-between border-b border-slate-200/50 pb-1.5">
                              <span className="text-slate-400 capitalize">{key.replace(/_/g, ' ')}:</span>
                              <span className="text-slate-700 text-right">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
