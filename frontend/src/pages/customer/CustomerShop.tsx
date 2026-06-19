import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, ShoppingCart, Star, Heart, Info, Check, ChevronLeft, ChevronRight, XCircle, Activity, ShieldAlert } from "lucide-react";

export function CustomerShop() {
  const [searchParams] = useSearchParams();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedClassification, setSelectedClassification] = useState("");
  const [addedItems, setAddedItems] = useState<{ [key: string]: boolean }>({});

  // Modal states
  const [selectedMedicineForModal, setSelectedMedicineForModal] = useState<any | null>(null);
  const [modalQuantity, setModalQuantity] = useState<number>(1);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(16); // 4x4 layout

  const categories = [
    "Thuốc kháng sinh",
    "Thuốc giảm đau hạ sốt",
    "Thuốc trị ho cảm",
    "Thuốc dạ dày",
    "Thuốc bổ",
    "Miếng dán giảm đau",
    "Thuốc tim mạch huyết áp",
    "Thuốc tiêu hoá",
    "Thuốc dị ứng"
  ];

  const classifications = [
    { value: "", label: "Tất cả các loại" },
    { value: "PRESCRIPTION_ANTIBIOTIC", label: "Thuốc kê đơn (Rx / Kháng sinh)" },
    { value: "COMMON_SUPPLEMENT", label: "Thực phẩm chức năng / TPCN" }
  ];

  // Fetch medicines list
  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const categoryParam = selectedCategory ? `&category=${encodeURIComponent(selectedCategory)}` : "";
      const classParam = selectedClassification ? `&classification=${selectedClassification}` : "";
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : "";

      const res = await fetch(`/api/medicines?page=${currentPage}&limit=${limit}${searchParam}${categoryParam}${classParam}`);
      if (res.ok) {
        const result = await res.json();
        setMedicines(result.data || []);
        setTotalItems(result.total || 0);
        setTotalPages(Math.ceil((result.total || 0) / limit) || 1);
      }
    } catch (err) {
      console.error("Error fetching medicines:", err);
    } finally {
      setLoading(false);
    }
  };

  // Sync search query from URL search params if it changes
  useEffect(() => {
    const q = searchParams.get("search") || "";
    setSearchQuery(q);
  }, [searchParams]);

  // Trigger fetch when pagination or dropdown filters change
  useEffect(() => {
    fetchMedicines();
  }, [currentPage, selectedCategory, selectedClassification]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedClassification]);

  // Debounce search and reset to page 1
  useEffect(() => {
    const delay = setTimeout(() => {
      setCurrentPage((prev) => {
        if (prev === 1) {
          fetchMedicines();
          return 1;
        }
        return 1;
      });
    }, 450);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleAddToCart = async (med: any, customQty: number = 1) => {
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
        throw new Error(resData.message || "Không thể thêm thuốc vào giỏ hàng.");
      }

      // Dispatch custom event to notify layout
      window.dispatchEvent(new Event("cartUpdated"));

      // Show temporary checked state on button
      setAddedItems((prev) => ({ ...prev, [medId]: true }));
      setTimeout(() => {
        setAddedItems((prev) => ({ ...prev, [medId]: false }));
      }, 1500);

    } catch (err: any) {
      alert(err.message || "Lỗi kết nối máy chủ");
      console.error("Error adding to cart:", err);
    }
  };

  return (
    <div className="flex flex-col gap-8 flex-1">
      {/* Visual Banner */}
      <div className="relative rounded-[24px] overflow-hidden bg-gradient-to-r from-blue-900 to-[#0d6efd] text-white p-8 sm:p-10 shadow-lg">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl flex flex-col gap-3">
          <span className="px-3.5 py-1 bg-white/10 rounded-full text-[10px] font-bold tracking-widest uppercase self-start border border-white/15">
            Dịch vụ Y tế số 3.0
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
            Mua Thuốc Chính Hãng <br className="hidden sm:block"/>
            Đồng Hành Cùng Trợ Lý Sức Khỏe AI
          </h1>
          <p className="text-sm text-blue-100 leading-relaxed font-medium mt-1">
            Tra cứu thông tin chính xác, phân tích tương tác thuốc thông minh và kê đơn tự động từ triệu chứng giọng nói. An toàn - Tin cậy.
          </p>
        </div>
      </div>

      {/* Top Bar horizontal filters and search */}
      <div className="bg-white border border-slate-200 rounded-[20px] p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between w-full">
        {/* Search bar */}
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Nhập tên thuốc, hoạt chất để tìm kiếm dược phẩm chính xác..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-[14px] text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0d6efd] focus:bg-white transition-all placeholder:font-normal text-sm"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
          {/* Classification Filter */}
          <select
            value={selectedClassification}
            onChange={(e) => setSelectedClassification(e.target.value)}
            className="w-full sm:w-64 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-[14px] text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0d6efd] focus:bg-white transition-all cursor-pointer"
          >
            {classifications.map((cl) => (
              <option key={cl.value} value={cl.value}>
                {cl.label}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-64 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-[14px] text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0d6efd] focus:bg-white transition-all cursor-pointer"
          >
            <option value="">Tất cả nhóm điều trị</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Medicines Catalog Grid */}
      <div className="flex-1 flex flex-col">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <div className="w-10 h-10 border-4 border-[#0d6efd] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Đang tải sản phẩm...</span>
          </div>
        ) : medicines.length > 0 ? (
          <div className="flex flex-col gap-8 flex-1 justify-between">
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
                    className="bg-white rounded-[20px] border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group cursor-pointer"
                  >
                    {/* Visual Image Container with overlay badge */}
                    <div className="w-full h-48 bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden border-b border-slate-100">
                      <img
                        src={med.image || "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60"}
                        alt={med.name}
                        loading="lazy"
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* Classification Badge Overlay */}
                      <span
                        className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border shadow-sm ${
                          isRx
                            ? "bg-rose-50 text-rose-700 border-rose-100"
                            : "bg-emerald-50 text-emerald-700 border-emerald-100"
                        }`}
                      >
                        {isRx ? "Kê đơn (Rx)" : "Thực phẩm bổ sung"}
                      </span>
                      {/* Wishlist Button Overlay */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="absolute top-3 right-3 p-2 bg-white/80 hover:bg-white text-slate-400 hover:text-rose-500 rounded-full transition-all shadow-sm"
                      >
                        <Heart size={14} className="fill-current text-transparent hover:text-rose-500" />
                      </button>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-[#0d6efd] transition-colors leading-tight mb-1 break-words">
                          {med.name}
                        </h4>
                        <div className="text-[11px] text-slate-500 font-medium line-clamp-1 mb-3">
                          Hoạt chất: <span className="font-bold text-slate-700">{med.active_ingredient || "N/A"}</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-400">
                          Nhóm: <span className="text-slate-600 font-bold">{med.category}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100/70">
                        <div className="flex items-baseline justify-between mb-3.5">
                          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Tồn kho / Giá</span>
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-500 block">Tồn: {med.stock} {med.unit || "Viên"}</span>
                            <span className="text-md font-black text-[#0d6efd] tracking-tight">
                              {med.price.toLocaleString()}₫
                            </span>
                          </div>
                        </div>

                        {/* Add to Cart button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(med);
                          }}
                          disabled={isOutOfStock}
                          className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                            isOutOfStock
                              ? "bg-slate-100 text-slate-400 border border-slate-100 cursor-not-allowed"
                              : addedItems[medId]
                              ? "bg-emerald-500 text-white shadow-emerald-100"
                              : "bg-[#0d6efd] hover:bg-[#0a58ca] text-white shadow-blue-100 active:scale-95"
                          }`}
                        >
                          {isOutOfStock ? (
                            "Hết Hàng"
                          ) : addedItems[medId] ? (
                            <>
                              <Check size={14} /> Đã thêm!
                            </>
                          ) : (
                            <>
                              <ShoppingCart size={14} /> Thêm Vào Giỏ
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10 mb-6">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <ChevronLeft size={16} /> Trước
                </button>
                
                <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-5 py-2.5 rounded-xl shadow-sm">
                  Trang {currentPage} / {totalPages} <span className="text-slate-400 font-medium ml-1">({totalItems} sản phẩm)</span>
                </span>
                
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                >
                  Sau <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-[24px] border border-slate-200 p-16 text-center flex flex-col items-center justify-center">
            <Info size={44} className="text-slate-300 mb-3" />
            <h3 className="font-bold text-slate-700 text-md">Không tìm thấy sản phẩm</h3>
            <p className="text-slate-400 text-xs mt-1 max-w-sm">
              Vui lòng thay đổi từ khóa tìm kiếm hoặc bỏ bớt bộ lọc để hiển thị nhiều sản phẩm hơn.
            </p>
          </div>
        )}
      </div>

      {/* MEDICINE DETAILS MODAL */}
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
                <div className="flex flex-col gap-1.5 text-left">
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

                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-4 text-left">
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
                        handleAddToCart(med, modalQuantity);
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
