import { useState, useEffect } from "react";
import { Search, ShoppingCart, Star, Heart, Info, Check, ChevronLeft, ChevronRight } from "lucide-react";

export function CustomerShop() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedClassification, setSelectedClassification] = useState("");
  const [addedItems, setAddedItems] = useState<{ [key: string]: boolean }>({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(16); // 4x4 layout

  const categories = [
    "Kháng sinh / Antibiotics",
    "Giảm đau / Giảm sốt",
    "Hô hấp / Cough & Cold",
    "Dạ dày / Digestion",
    "Kháng viêm / Anti-inflammatory",
    "Vitamin & TPCN"
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

  const handleAddToCart = async (med: any) => {
    const medId = med.id || med._id;
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Vui lòng đăng nhập để thực hiện thêm sản phẩm vào giỏ hàng!");
      return;
    }

    try {
      const response = await fetch("/api/users/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ medicineId: medId, quantity: 1 })
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
                    className="bg-white rounded-[20px] border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group"
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
                      <button className="absolute top-3 right-3 p-2 bg-white/80 hover:bg-white text-slate-400 hover:text-rose-500 rounded-full transition-all shadow-sm">
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
                          onClick={() => handleAddToCart(med)}
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
    </div>
  );
}
