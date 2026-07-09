

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, ShoppingCart, Star, Heart, Info, Check, ChevronLeft, ChevronRight, XCircle, Activity, ShieldAlert, Filter, X, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { MedicineCard } from "../../components/MedicineCard";
import { ShopFilterSidebar } from "../../components/ShopFilterSidebar";
import { Pagination } from "../../components/Pagination";
import { MedicineDetailModal } from "../../components/MedicineDetailModal";

export function CustomerShop() {
  const [searchParams] = useSearchParams();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedClassification, setSelectedClassification] = useState("");
  const [addedItems, setAddedItems] = useState<{ [key: string]: boolean }>({});

  // Advanced Filter states
  const [selectedTargetGroup, setSelectedTargetGroup] = useState("");
  const [selectedPriceRange, setSelectedPriceRange] = useState("");
  const [selectedFlavour, setSelectedFlavour] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedIndication, setSelectedIndication] = useState("");
  const [selectedBrandOrigin, setSelectedBrandOrigin] = useState("");
  const [selectedIngredient, setSelectedIngredient] = useState("");

  // UI state for Mobile filter drawer and section expand/collapse
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    price: true,
    classification: true,
    targetGroup: false,
    country: false,
    indication: false,
    brand: false,
    brandOrigin: false,
    ingredient: false,
  });

  // Modal states
  const [selectedMedicineForModal, setSelectedMedicineForModal] = useState<any | null>(null);

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
    { value: "PRESCRIPTION_ANTIBIOTIC", label: "Thuốc kê đơn (Rx)" },
    { value: "COMMON_SUPPLEMENT", label: "Thực phẩm bổ sung" }
  ];

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleResetFilters = () => {
    setSelectedTargetGroup("");
    setSelectedPriceRange("");
    setSelectedFlavour("");
    setSelectedCountry("");
    setSelectedBrand("");
    setSelectedIndication("");
    setSelectedBrandOrigin("");
    setSelectedIngredient("");
    setSelectedClassification("");
    setSelectedCategory("");
    setSearchQuery("");
  };

  // Fetch medicines list
  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const categoryParam = selectedCategory ? `&category=${encodeURIComponent(selectedCategory)}` : "";
      const classParam = selectedClassification ? `&classification=${selectedClassification}` : "";
      const searchVal = selectedIngredient || searchQuery;
      const searchParam = searchVal ? `&search=${encodeURIComponent(searchVal)}` : "";

      let minPrice = "";
      let maxPrice = "";
      if (selectedPriceRange === "under-50") {
        maxPrice = "50000";
      } else if (selectedPriceRange === "50-100") {
        minPrice = "50000";
        maxPrice = "100000";
      } else if (selectedPriceRange === "100-200") {
        minPrice = "100000";
        maxPrice = "200000";
      } else if (selectedPriceRange === "over-200") {
        minPrice = "200000";
      }

      const targetParam = selectedTargetGroup ? `&targetGroup=${encodeURIComponent(selectedTargetGroup)}` : "";
      const minPriceParam = minPrice ? `&minPrice=${minPrice}` : "";
      const maxPriceParam = maxPrice ? `&maxPrice=${maxPrice}` : "";
      const flavourParam = selectedFlavour ? `&flavour=${encodeURIComponent(selectedFlavour)}` : "";
      const countryParam = selectedCountry ? `&country=${encodeURIComponent(selectedCountry)}` : "";
      const brandParam = selectedBrand ? `&brand=${encodeURIComponent(selectedBrand)}` : "";
      const indicationParam = selectedIndication ? `&indication=${encodeURIComponent(selectedIndication)}` : "";
      const brandOriginParam = selectedBrandOrigin ? `&brandOrigin=${encodeURIComponent(selectedBrandOrigin)}` : "";

      const res = await fetch(`/api/medicines?page=${currentPage}&limit=${limit}${searchParam}${categoryParam}${classParam}${targetParam}${minPriceParam}${maxPriceParam}${flavourParam}${countryParam}${brandParam}${indicationParam}${brandOriginParam}`);
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

  // Trigger fetch when pagination or dropdown filters/advanced filters change
  useEffect(() => {
    fetchMedicines();
  }, [
    currentPage,
    selectedCategory,
    selectedClassification,
    selectedTargetGroup,
    selectedPriceRange,
    selectedFlavour,
    selectedCountry,
    selectedBrand,
    selectedIndication,
    selectedBrandOrigin,
    selectedIngredient
  ]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedCategory,
    selectedClassification,
    selectedTargetGroup,
    selectedPriceRange,
    selectedFlavour,
    selectedCountry,
    selectedBrand,
    selectedIndication,
    selectedBrandOrigin,
    selectedIngredient
  ]);

  // Debounce search and reset to page 1
  useEffect(() => {
    const delay = setTimeout(() => {
      setCurrentPage(1);
      fetchMedicines();
    }, 450);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleAddToCart = async (med: any, customQty: number = 1) => {
    const medId = med.id || med._id;
    const token = localStorage.getItem("token");
    if (!token) {
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
        // Nếu thuốc không tìm thấy trên hệ thống → ẩn sản phẩm khỏi danh sách, không hiện alert
        if (response.status === 404) {
          setMedicines((prev) => prev.filter((m) => (m.id || m._id) !== medId));
          return;
        }
        throw new Error(resData.message || "Không thể thêm thuốc vào giỏ hàng.");
      }

      window.dispatchEvent(new Event("cartUpdated"));

      setAddedItems((prev) => ({ ...prev, [medId]: true }));
      setTimeout(() => {
        setAddedItems((prev) => ({ ...prev, [medId]: false }));
      }, 1500);

    } catch (err: any) {
      alert(err.message || "Lỗi kết nối máy chủ");
      console.error("Error adding to cart:", err);
    }
  };

  const hasAnyFilter = !!(
    selectedTargetGroup ||
    selectedPriceRange ||
    selectedFlavour ||
    selectedCountry ||
    selectedBrand ||
    selectedIndication ||
    selectedBrandOrigin ||
    selectedIngredient ||
    selectedClassification
  );

  const renderFilterSidebar = () => (
    <ShopFilterSidebar 
      selectedTargetGroup={selectedTargetGroup}
      setSelectedTargetGroup={setSelectedTargetGroup}
      selectedPriceRange={selectedPriceRange}
      setSelectedPriceRange={setSelectedPriceRange}
      selectedFlavour={selectedFlavour}
      setSelectedFlavour={setSelectedFlavour}
      selectedCountry={selectedCountry}
      setSelectedCountry={setSelectedCountry}
      selectedBrand={selectedBrand}
      setSelectedBrand={setSelectedBrand}
      selectedIndication={selectedIndication}
      setSelectedIndication={setSelectedIndication}
      selectedBrandOrigin={selectedBrandOrigin}
      setSelectedBrandOrigin={setSelectedBrandOrigin}
      selectedIngredient={selectedIngredient}
      setSelectedIngredient={setSelectedIngredient}
      selectedClassification={selectedClassification}
      setSelectedClassification={setSelectedClassification}
      expandedSections={expandedSections}
      toggleSection={toggleSection}
      handleResetFilters={handleResetFilters}
      hasAnyFilter={hasAnyFilter}
    />
  );

  const hasActiveFilters = !!(selectedCategory || selectedClassification || selectedTargetGroup || selectedPriceRange || selectedCountry || selectedBrand || searchQuery);

  return (
    <div className="flex flex-col gap-6 flex-1">
      
      {/* Premium Hero Banner */}
      <div className="relative rounded-[28px] overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 text-white p-8 sm:p-12 shadow-xl border border-white/5">
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-gradient-to-tr from-blue-550 to-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl flex flex-col gap-4">
          <span className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black tracking-widest uppercase self-start text-blue-400">
            🏥 SmartPharma AI Shop
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.1]">
            Dược Phẩm Chính Hãng <br className="hidden sm:block" />
            Mua Sắm An Tâm Tiết Kiệm
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-semibold">
            Hệ thống tra cứu thông tin dược phẩm thông minh kết hợp AI, hỗ trợ kiểm tra tương tác thuốc, phân tích đơn thuốc tự động và cập nhật hạn dùng thời gian thực.
          </p>
        </div>
      </div>

      {/* Modern Floating Search & Quick Select Filter Box */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4.5 w-full">
        <div className="flex flex-col lg:flex-row gap-4 items-center w-full">
          {/* Main search bar */}
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm nhanh thuốc, hoạt chất, nhóm trị liệu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all placeholder:font-semibold placeholder:text-slate-400 text-sm shadow-inner"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full lg:w-auto items-center">
            {/* Advanced mobile filter button */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className="w-full sm:w-auto lg:hidden px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-all hover:bg-slate-100"
            >
              <Filter size={16} className="text-blue-600" />
              <span>Bộ lọc nâng cao</span>
              {hasActiveFilters && <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>}
            </button>

            {/* Quick dropdown filters */}
            <select
              value={selectedClassification}
              onChange={(e) => setSelectedClassification(e.target.value)}
              className="w-full sm:w-56 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer transition-all"
            >
              {classifications.map((cl) => (
                <option key={cl.value} value={cl.value}>
                  {cl.label}
                </option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-60 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer transition-all"
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

        {/* Selected Pill Tags Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-50 text-xs">
            <span className="font-bold text-slate-400 mr-1 uppercase text-[10px]">Đang lọc theo:</span>
            {searchQuery && (
              <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-xl flex items-center gap-1.5">
                Tìm kiếm: "{searchQuery}"
                <X size={12} className="cursor-pointer text-slate-400 hover:text-slate-650" onClick={() => setSearchQuery("")} />
              </span>
            )}
            {selectedCategory && (
              <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-xl flex items-center gap-1.5 border border-blue-100">
                Nhóm: {selectedCategory}
                <X size={12} className="cursor-pointer text-blue-400 hover:text-blue-700" onClick={() => setSelectedCategory("")} />
              </span>
            )}
            {selectedClassification && (
              <span className="px-3 py-1 bg-purple-50 text-purple-700 font-bold rounded-xl flex items-center gap-1.5 border border-purple-100">
                Phân loại: {classifications.find(c => c.value === selectedClassification)?.label}
                <X size={12} className="cursor-pointer text-purple-400 hover:text-purple-700" onClick={() => setSelectedClassification("")} />
              </span>
            )}
            {selectedTargetGroup && (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-xl flex items-center gap-1.5 border border-emerald-100">
                {selectedTargetGroup}
                <X size={12} className="cursor-pointer text-emerald-400 hover:text-emerald-700" onClick={() => setSelectedTargetGroup("")} />
              </span>
            )}
            {selectedPriceRange && (
              <span className="px-3 py-1 bg-amber-50 text-amber-700 font-bold rounded-xl flex items-center gap-1.5 border border-amber-100">
                Giá: {selectedPriceRange === 'under-50' ? '<50k' : selectedPriceRange === '50-100' ? '50k-100k' : selectedPriceRange === '100-200' ? '100k-200k' : '>200k'}
                <X size={12} className="cursor-pointer text-amber-400 hover:text-amber-700" onClick={() => setSelectedPriceRange("")} />
              </span>
            )}
            {selectedCountry && (
              <span className="px-3 py-1 bg-teal-50 text-teal-700 font-bold rounded-xl flex items-center gap-1.5 border border-teal-100">
                Gốc: {selectedCountry}
                <X size={12} className="cursor-pointer text-teal-400 hover:text-teal-700" onClick={() => setSelectedCountry("")} />
              </span>
            )}
            {selectedBrand && (
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-xl flex items-center gap-1.5 border border-indigo-100">
                Hãng: {selectedBrand}
                <X size={12} className="cursor-pointer text-indigo-400 hover:text-indigo-700" onClick={() => setSelectedBrand("")} />
              </span>
            )}
            <button 
              onClick={() => {
                handleResetFilters();
                setSearchQuery("");
                setSelectedCategory("");
                setSelectedClassification("");
              }}
              className="text-rose-500 hover:text-rose-700 font-black uppercase text-[10px] tracking-wider ml-1 cursor-pointer"
            >
              Thiết lập lại
            </button>
          </div>
        )}
      </div>

      {/* Main Layout Body */}
      <div className="flex flex-col lg:flex-row gap-8 flex-1 items-start w-full">
        
        {/* Sticky Desktop Filter Sidebar */}
        <aside className="hidden lg:block w-72 flex-shrink-0 bg-white border border-slate-150 rounded-[28px] p-6 shadow-sm sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto no-scrollbar">
          {renderFilterSidebar()}
        </aside>

        {/* Mobile Filter Drawer */}
        {showMobileFilters && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)}></div>
            <div className="relative w-80 max-w-full bg-white h-full p-6 shadow-xl flex flex-col overflow-y-auto no-scrollbar z-10">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <span className="font-black text-sm uppercase tracking-wider text-slate-800">Bộ lọc nâng cao</span>
                <button onClick={() => setShowMobileFilters(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              {renderFilterSidebar()}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang kết nối kho thuốc...</span>
            </div>
          ) : medicines.length > 0 ? (
            <div className="flex flex-col gap-8 flex-1 justify-between">
              {/* Grid display layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {medicines.map((med) => {
                  const medId = med.id || med._id;
                  return (
                    <MedicineCard
                      key={medId}
                      med={med}
                      added={!!addedItems[medId]}
                      onClick={() => setSelectedMedicineForModal(med)}
                      onAddToCart={(m, qty, _unit) => handleAddToCart(m, qty)}
                    />
                  );
                })}
              </div>

              {/* Styled Pagination Controls */}
              <Pagination 
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
                totalItems={totalItems}
              />
            </div>
          ) : (
            <div className="bg-white rounded-[28px] border border-slate-200 p-16 text-center flex flex-col items-center justify-center">
              <Info size={40} className="text-slate-300 mb-3" />
              <h3 className="font-extrabold text-slate-700 text-md">Không tìm thấy sản phẩm phù hợp</h3>
              <p className="text-slate-400 text-xs mt-1.5 max-w-sm font-semibold">
                Thử thay đổi từ khóa tìm kiếm hoặc làm mới bộ lọc nâng cao để tải lại danh sách dược phẩm.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Styled Product Details Preview Modal */}
      <MedicineDetailModal 
        medicine={selectedMedicineForModal}
        isOpen={!!selectedMedicineForModal}
        onClose={() => setSelectedMedicineForModal(null)}
        onAddToCart={handleAddToCart}
        addedItems={addedItems}
      />
    </div>
  );
}
