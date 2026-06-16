import { useState, useEffect } from "react";
import { Search, ShoppingCart, Star, Filter, Heart, Info, Check } from "lucide-react";

export function CustomerShop() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedClassification, setSelectedClassification] = useState("");
  const [addedItems, setAddedItems] = useState<{ [key: string]: boolean }>({});

  const categories = [
    "Kháng sinh / Antibiotics",
    "Giảm đau / Giảm sốt",
    "Hô hấp / Cough & Cold",
    "Dạ dày / Digestion",
    "Kháng viêm / Anti-inflammatory",
    "Vitamin & TPCN"
  ];

  const classifications = [
    { value: "PRESCRIPTION_DRUG", label: "Thuốc kê đơn (Rx)" },
    { value: "OTC_DRUG", label: "Thuốc không kê đơn (OTC)" },
    { value: "COMMON_SUPPLEMENT", label: "Thực phẩm chức năng" }
  ];

  // Fetch medicines list
  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const categoryParam = selectedCategory ? `&category=${encodeURIComponent(selectedCategory)}` : "";
      const classParam = selectedClassification ? `&classification=${selectedClassification}` : "";
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : "";

      const res = await fetch(`/api/medicines?limit=16${searchParam}${categoryParam}${classParam}`);
      if (res.ok) {
        const result = await res.json();
        // Since getMedicines returns array in result.data
        setMedicines(result.data || []);
      }
    } catch (err) {
      console.error("Error fetching medicines:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, [selectedCategory, selectedClassification]);

  // Debounce search
  useEffect(() => {
    const delay = setTimeout(() => {
      fetchMedicines();
    }, 450);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleAddToCart = (med: any) => {
    const medId = med.id || med._id;
    try {
      const cartData = localStorage.getItem("customer_cart");
      let cart = cartData ? JSON.parse(cartData) : [];
      
      const existingIndex = cart.findIndex((item: any) => item.id === medId);
      if (existingIndex > -1) {
        if (cart[existingIndex].quantity >= med.stock) {
          alert(`Chỉ còn ${med.stock} sản phẩm khả dụng trong kho!`);
          return;
        }
        cart[existingIndex].quantity += 1;
      } else {
        if (med.stock <= 0) {
          alert("Sản phẩm hiện tại đã hết hàng!");
          return;
        }
        cart.push({
          id: medId,
          name: med.name,
          active_ingredient: med.active_ingredient || "",
          category: med.category || "Chưa phân loại",
          price: med.price,
          unit: med.unit || "Viên",
          stock: med.stock,
          quantity: 1
        });
      }

      localStorage.setItem("customer_cart", JSON.stringify(cart));
      
      // Dispatch custom event to notify layout
      window.dispatchEvent(new Event("cartUpdated"));

      // Show temporary checked state on button
      setAddedItems((prev) => ({ ...prev, [medId]: true }));
      setTimeout(() => {
        setAddedItems((prev) => ({ ...prev, [medId]: false }));
      }, 1500);

    } catch (err) {
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

      {/* Main Grid: Filters & Product Grid */}
      <div className="flex flex-col lg:flex-row gap-8 flex-1">
        
        {/* Left Side: Category Filters (Sticky Sidebar) */}
        <aside className="w-full lg:w-[280px] flex flex-col gap-6 shrink-0 lg:sticky lg:top-24 h-fit">
          <div className="bg-white border border-slate-200 rounded-[20px] p-5 shadow-sm flex flex-col gap-5">
            <div>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2 mb-4">
                <Filter size={16} className="text-[#0d6efd]" /> Bộ lọc dược phẩm
              </h3>
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Phân loại thuốc</span>
              <div className="flex flex-col gap-2 mt-2">
                <button
                  onClick={() => setSelectedClassification("")}
                  className={`text-left text-xs font-bold px-3 py-2 rounded-xl border transition-all ${
                    selectedClassification === ""
                      ? "bg-[#f2f3ff] text-[#0d6efd] border-blue-100 font-black"
                      : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  Tất cả các loại
                </button>
                {classifications.map((cl) => (
                  <button
                    key={cl.value}
                    onClick={() => setSelectedClassification(cl.value)}
                    className={`text-left text-xs font-bold px-3 py-2 rounded-xl border transition-all ${
                      selectedClassification === cl.value
                        ? "bg-[#f2f3ff] text-[#0d6efd] border-blue-100 font-black"
                        : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    {cl.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Nhóm điều trị</span>
              <div className="flex flex-col gap-1.5 mt-2 max-h-52 overflow-y-auto pr-1">
                <button
                  onClick={() => setSelectedCategory("")}
                  className={`text-left text-xs font-bold px-3 py-2 rounded-xl border transition-all ${
                    selectedCategory === ""
                      ? "bg-[#f2f3ff] text-[#0d6efd] border-blue-100 font-black"
                      : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  Tất cả nhóm
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-left text-xs font-bold px-3 py-2 rounded-xl border transition-all truncate ${
                      selectedCategory === cat
                        ? "bg-[#f2f3ff] text-[#0d6efd] border-blue-100 font-black"
                        : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                    title={cat}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Right Side: Search & Product Cards */}
        <section className="flex-1 flex flex-col gap-6">
          {/* Search bar */}
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Nhập tên thuốc, hoạt chất để tìm kiếm dược phẩm chính xác..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-[16px] text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0d6efd] transition-all shadow-sm placeholder:font-normal"
            />
          </div>

          {/* Medicines Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-[#0d6efd] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Đang tải sản phẩm...</span>
            </div>
          ) : medicines.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {medicines.map((med) => {
                const medId = med.id || med._id;
                const isRx = med.drug_classification === "PRESCRIPTION_DRUG";
                const isOutOfStock = med.stock <= 0;
                
                return (
                  <div
                    key={medId}
                    className="bg-white rounded-[20px] border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group"
                  >
                    {/* Header badge */}
                    <div className="p-5 pb-3 flex items-start justify-between gap-2.5">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                          isRx
                            ? "bg-red-50 text-red-700 border-red-100"
                            : med.drug_classification === "OTC_DRUG"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-blue-50 text-blue-700 border-blue-100"
                        }`}
                      >
                        {isRx ? "Kê đơn (Rx)" : med.drug_classification === "OTC_DRUG" ? "Không kê đơn (OTC)" : "Thực phẩm bổ sung"}
                      </span>
                      <button className="text-slate-300 hover:text-rose-500 transition-colors">
                        <Heart size={16} />
                      </button>
                    </div>

                    {/* Body */}
                    <div className="px-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-[#0d6efd] transition-colors leading-tight mb-1">
                          {med.name}
                        </h4>
                        <div className="text-[11px] text-slate-500 font-medium line-clamp-1 mb-3">
                          Hoạt chất: <span className="font-bold text-slate-700">{med.active_ingredient || "N/A"}</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-400">
                          Nhóm: <span className="text-slate-600 font-bold">{med.category}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100/70 pb-5">
                        <div className="flex items-baseline justify-between mb-3.5">
                          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Tồn kho / Giá</span>
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-500 block">Tồn: {med.stock} {med.unit || "Viên"}</span>
                            <span className="text-lg font-black text-[#0d6efd] tracking-tight">
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
          ) : (
            <div className="bg-white rounded-[24px] border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
              <Info size={40} className="text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-700 text-md">Không tìm thấy sản phẩm</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-sm">
                Vui lòng thay đổi từ khóa tìm kiếm hoặc bỏ bớt bộ lọc để hiển thị nhiều sản phẩm hơn.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
