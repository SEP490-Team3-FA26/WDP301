

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, ShoppingCart, Star, Heart, Info, Check, ChevronLeft, ChevronRight, XCircle, Activity, ShieldAlert, Filter, X, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";

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

  // UI state for Mobile filter drawer and section expand/collapse
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    targetGroup: true,
    price: true,
    flavour: false,
    country: false,
    indication: false,
    brand: false,
    brandOrigin: false,
  });

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
  };

  // Fetch medicines list
  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const categoryParam = selectedCategory ? `&category=${encodeURIComponent(selectedCategory)}` : "";
      const classParam = selectedClassification ? `&classification=${selectedClassification}` : "";
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : "";

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
    selectedBrandOrigin
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
    selectedBrandOrigin
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

  const renderFilterSidebar = () => {
    return (
      <div className="flex flex-col gap-6 text-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 uppercase tracking-wider">
            <Filter size={18} className="text-[#0d6efd]" />
            <span>Bộ lọc nâng cao</span>
          </div>
          {(selectedTargetGroup || selectedPriceRange || selectedFlavour || selectedCountry || selectedBrand || selectedIndication || selectedBrandOrigin) && (
            <button
              onClick={handleResetFilters}
              className="text-[10px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw size={12} />
              Xóa lọc
            </button>
          )}
        </div>

        <div className="border-b border-slate-100 pb-4">
          <button
            onClick={() => toggleSection("targetGroup")}
            className="flex items-center justify-between w-full font-bold text-xs text-slate-700 hover:text-[#0d6efd] uppercase tracking-wider transition-colors cursor-pointer"
          >
            <span>Đối tượng sử dụng</span>
            {expandedSections.targetGroup ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {expandedSections.targetGroup && (
            <div className="flex flex-col gap-1.5 mt-3 pl-1">
              {[
                { value: "", label: "Tất cả" },
                { value: "Người lớn", label: "Người lớn" },
                { value: "Trẻ em", label: "Trẻ em" },
                { value: "Người cao tuổi", label: "Người cao tuổi" },
                { value: "Phụ nữ có thai", label: "Phụ nữ có thai" },
                { value: "Phụ nữ cho con bú", label: "Phụ nữ cho con bú" }
              ].map(item => (
                <label key={item.value} className="flex items-center gap-2.5 py-1 px-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-[13px] text-slate-600 font-semibold transition-colors">
                  <input
                    type="radio"
                    name="targetGroup"
                    checked={selectedTargetGroup === item.value}
                    onChange={() => setSelectedTargetGroup(item.value)}
                    className="w-4 h-4 text-[#0d6efd] focus:ring-[#0d6efd] border-slate-300 rounded cursor-pointer"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="border-b border-slate-100 pb-4">
          <button
            onClick={() => toggleSection("price")}
            className="flex items-center justify-between w-full font-bold text-xs text-slate-700 hover:text-[#0d6efd] uppercase tracking-wider transition-colors cursor-pointer"
          >
            <span>Giá bán</span>
            {expandedSections.price ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {expandedSections.price && (
            <div className="flex flex-col gap-1.5 mt-3 pl-1">
              {[
                { value: "", label: "Tất cả" },
                { value: "under-50", label: "Dưới 50.000đ" },
                { value: "50-100", label: "50.000đ - 100.000đ" },
                { value: "100-200", label: "100.000đ - 200.000đ" },
                { value: "over-200", label: "Trên 200.000đ" }
              ].map(item => (
                <label key={item.value} className="flex items-center gap-2.5 py-1 px-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-[13px] text-slate-600 font-semibold transition-colors">
                  <input
                    type="radio"
                    name="priceRange"
                    checked={selectedPriceRange === item.value}
                    onChange={() => setSelectedPriceRange(item.value)}
                    className="w-4 h-4 text-[#0d6efd] focus:ring-[#0d6efd] border-slate-300 rounded cursor-pointer"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="border-b border-slate-100 pb-4">
          <button
            onClick={() => toggleSection("flavour")}
            className="flex items-center justify-between w-full font-bold text-xs text-slate-700 hover:text-[#0d6efd] uppercase tracking-wider transition-colors cursor-pointer"
          >
            <span>Mùi vị / Mùi hương</span>
            {expandedSections.flavour ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {expandedSections.flavour && (
            <div className="flex flex-col gap-1.5 mt-3 pl-1">
              {[
                { value: "", label: "Tất cả" },
                { value: "Không mùi", label: "Không mùi / Không vị" },
                { value: "Bạc hà", label: "Bạc hà" },
                { value: "Cam", label: "Hương cam" },
                { value: "Dâu", label: "Hương dâu" }
              ].map(item => (
                <label key={item.value} className="flex items-center gap-2.5 py-1 px-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-[13px] text-slate-600 font-semibold transition-colors">
                  <input
                    type="radio"
                    name="flavour"
                    checked={selectedFlavour === item.value}
                    onChange={() => setSelectedFlavour(item.value)}
                    className="w-4 h-4 text-[#0d6efd] focus:ring-[#0d6efd] border-slate-300 rounded cursor-pointer"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="border-b border-slate-100 pb-4">
          <button
            onClick={() => toggleSection("country")}
            className="flex items-center justify-between w-full font-bold text-xs text-slate-700 hover:text-[#0d6efd] uppercase tracking-wider transition-colors cursor-pointer"
          >
            <span>Nước sản xuất</span>
            {expandedSections.country ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {expandedSections.country && (
            <div className="flex flex-col gap-1.5 mt-3 pl-1">
              {[
                { value: "", label: "Tất cả" },
                { value: "Việt Nam", label: "Việt Nam" },
                { value: "Hoa Kỳ", label: "Hoa Kỳ" },
                { value: "Pháp", label: "Pháp" },
                { value: "Đức", label: "Đức" },
                { value: "Nhật Bản", label: "Nhật Bản" },
                { value: "Hàn Quốc", label: "Hàn Quốc" },
                { value: "Ấn Độ", label: "Ấn Độ" }
              ].map(item => (
                <label key={item.value} className="flex items-center gap-2.5 py-1 px-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-[13px] text-slate-600 font-semibold transition-colors">
                  <input
                    type="radio"
                    name="country"
                    checked={selectedCountry === item.value}
                    onChange={() => setSelectedCountry(item.value)}
                    className="w-4 h-4 text-[#0d6efd] focus:ring-[#0d6efd] border-slate-300 rounded cursor-pointer"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="border-b border-slate-100 pb-4">
          <button
            onClick={() => toggleSection("indication")}
            className="flex items-center justify-between w-full font-bold text-xs text-slate-700 hover:text-[#0d6efd] uppercase tracking-wider transition-colors cursor-pointer"
          >
            <span>Chỉ định</span>
            {expandedSections.indication ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {expandedSections.indication && (
            <div className="flex flex-col gap-1.5 mt-3 pl-1">
              {[
                { value: "", label: "Tất cả" },
                { value: "Giảm đau", label: "Giảm đau / Hạ sốt" },
                { value: "Kháng sinh", label: "Kháng sinh" },
                { value: "Dị ứng", label: "Chống dị ứng" },
                { value: "Ho", label: "Ho / Sổ mũi" },
                { value: "Dạ dày", label: "Tiêu hóa / Dạ dày" }
              ].map(item => (
                <label key={item.value} className="flex items-center gap-2.5 py-1 px-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-[13px] text-slate-600 font-semibold transition-colors">
                  <input
                    type="radio"
                    name="indication"
                    checked={selectedIndication === item.value}
                    onChange={() => setSelectedIndication(item.value)}
                    className="w-4 h-4 text-[#0d6efd] focus:ring-[#0d6efd] border-slate-300 rounded cursor-pointer"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="border-b border-slate-100 pb-4">
          <button
            onClick={() => toggleSection("brand")}
            className="flex items-center justify-between w-full font-bold text-xs text-slate-700 hover:text-[#0d6efd] uppercase tracking-wider transition-colors cursor-pointer"
          >
            <span>Thương hiệu</span>
            {expandedSections.brand ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {expandedSections.brand && (
            <div className="flex flex-col gap-1.5 mt-3 pl-1">
              {[
                { value: "", label: "Tất cả" },
                { value: "Abbott", label: "Abbott" },
                { value: "Traphaco", label: "Traphaco" },
                { value: "Sanofi", label: "Sanofi" },
                { value: "OPC", label: "OPC" },
                { value: "Hisamitsu", label: "Hisamitsu" }
              ].map(item => (
                <label key={item.value} className="flex items-center gap-2.5 py-1 px-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-[13px] text-slate-600 font-semibold transition-colors">
                  <input
                    type="radio"
                    name="brand"
                    checked={selectedBrand === item.value}
                    onChange={() => setSelectedBrand(item.value)}
                    className="w-4 h-4 text-[#0d6efd] focus:ring-[#0d6efd] border-slate-300 rounded cursor-pointer"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="pb-2">
          <button
            onClick={() => toggleSection("brandOrigin")}
            className="flex items-center justify-between w-full font-bold text-xs text-slate-700 hover:text-[#0d6efd] uppercase tracking-wider transition-colors cursor-pointer"
          >
            <span>Xuất xứ thương hiệu</span>
            {expandedSections.brandOrigin ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {expandedSections.brandOrigin && (
            <div className="flex flex-col gap-1.5 mt-3 pl-1">
              {[
                { value: "", label: "Tất cả" },
                { value: "Việt Nam", label: "Việt Nam" },
                { value: "Hoa Kỳ", label: "Hoa Kỳ" },
                { value: "Pháp", label: "Pháp" },
                { value: "Đức", label: "Đức" },
                { value: "Nhật Bản", label: "Nhật Bản" }
              ].map(item => (
                <label key={item.value} className="flex items-center gap-2.5 py-1 px-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-[13px] text-slate-600 font-semibold transition-colors">
                  <input
                    type="radio"
                    name="brandOrigin"
                    checked={selectedBrandOrigin === item.value}
                    onChange={() => setSelectedBrandOrigin(item.value)}
                    className="w-4 h-4 text-[#0d6efd] focus:ring-[#0d6efd] border-slate-300 rounded cursor-pointer"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8 flex-1">
      <div className="relative rounded-[24px] overflow-hidden bg-gradient-to-r from-blue-900 to-[#0d6efd] text-white p-8 sm:p-10 shadow-lg">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl flex flex-col gap-3">
          <span className="px-3.5 py-1 bg-white/10 rounded-full text-[10px] font-bold tracking-widest uppercase self-start border border-white/15">
            Dịch vụ Y tế số 3.0
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
            Mua Thuốc Chính Hãng <br className="hidden sm:block" />
            Đồng Hành Cùng Trợ Lý Sức Khỏe AI
          </h1>
          <p className="text-sm text-blue-100 leading-relaxed font-medium mt-1">
            Tra cứu thông tin chính xác, phân tích tương tác thuốc thông minh và kê đơn tự động từ triệu chứng giọng nói. An toàn - Tin cậy.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[20px] p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between w-full">
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

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
          <button
            onClick={() => setShowMobileFilters(true)}
            className="w-full sm:w-auto lg:hidden px-5 py-3.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-[14px] text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Filter size={16} className="text-slate-500" />
            <span>Bộ lọc nâng cao</span>
            {(selectedTargetGroup || selectedPriceRange || selectedFlavour || selectedCountry || selectedBrand || selectedIndication || selectedBrandOrigin) && (
              <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
            )}
          </button>

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

      <div className="flex flex-col lg:flex-row gap-8 flex-1 items-start w-full">
        <aside className="hidden lg:block w-72 flex-shrink-0 bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
          {renderFilterSidebar()}
        </aside>

        {showMobileFilters && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)}></div>
            <div className="relative w-80 max-w-full bg-white h-full p-6 shadow-xl flex flex-col overflow-y-auto z-10">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <span className="font-bold text-slate-900">Bộ lọc nâng cao</span>
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
                      <div className="w-full h-48 bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden border-b border-slate-100">
                        <img
                          src={med.image || "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60"}
                          alt={med.name}
                          loading="lazy"
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                        <span
                          className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border shadow-sm ${isRx
                              ? "bg-rose-50 text-rose-700 border-rose-100"
                              : "bg-emerald-50 text-emerald-700 border-emerald-100"
                            }`}
                        >
                          {isRx ? "Kê đơn (Rx)" : "Thực phẩm bổ sung"}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); }}
                          className="absolute top-3 right-3 p-2 bg-white/80 hover:bg-white text-slate-400 hover:text-rose-500 rounded-full transition-all shadow-sm"
                        >
                          <Heart size={14} className="fill-current text-transparent hover:text-rose-500" />
                        </button>
                      </div>

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
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAddToCart(med); }}
                            disabled={isOutOfStock}
                            className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm ${isOutOfStock
                                ? "bg-slate-100 text-slate-400 border border-slate-100 cursor-not-allowed"
                                : addedItems[medId]
                                  ? "bg-emerald-500 text-white shadow-emerald-100"
                                  : "bg-[#0d6efd] hover:bg-[#0a58ca] text-white shadow-blue-100 active:scale-95"
                              }`}
                          >
                            {isOutOfStock ? "Hết Hàng" : addedItems[medId] ? (
                              <><Check size={14} /> Đã thêm!</>
                            ) : (
                              <><ShoppingCart size={14} /> Thêm Vào Giỏ</>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

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

      {selectedMedicineForModal && (() => {
        const med = selectedMedicineForModal;
        const medId = med.id || med._id;
        const isRx = med.drug_classification === "PRESCRIPTION_ANTIBIOTIC";
        const isOutOfStock = med.stock <= 0;
        
        return (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 cursor-pointer"
            onClick={() => { setSelectedMedicineForModal(null); setModalQuantity(1); }}
          >
            <div 
              className="bg-white rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-300 cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
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
                  onClick={() => { setSelectedMedicineForModal(null); setModalQuantity(1); }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 custom-scrollbar">
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
                        <span className="w-10 text-center font-black text-slate-800 text-sm">{modalQuantity}</span>
                        <button 
                          onClick={() => setModalQuantity(q => Math.min(med.stock, q + 1))}
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-slate-500 hover:bg-slate-100 active:scale-95 transition-all"
                          disabled={isOutOfStock || modalQuantity >= med.stock}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleAddToCart(med, modalQuantity)}
                      disabled={isOutOfStock}
                      className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
                        isOutOfStock ? "bg-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed" : addedItems[medId] ? "bg-emerald-500 text-white" : "bg-[#0d6efd] hover:bg-[#0b5ed7] text-white active:scale-95"
                      }`}
                    >
                      {isOutOfStock ? "Hết hàng" : addedItems[medId] ? <><Check size={14} /> Đã thêm!</> : <><ShoppingCart size={14} /> Thêm vào giỏ</>}
                    </button>
                  </div>
                </div>

                <div className="md:col-span-7 flex flex-col gap-6 text-left">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-1">
                      <span className="text-[10px] font-black text-[#0d6efd] uppercase tracking-widest">Hoạt chất chính</span>
                      <span className="font-extrabold text-slate-800 text-sm leading-snug">{med.active_ingredient || "N/A"}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-1">
                      <span className="text-[10px] font-black text-[#0d6efd] uppercase tracking-widest">Nhóm điều trị</span>
                      <span className="font-extrabold text-slate-800 text-sm leading-snug">{med.category || "N/A"}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-5">
                    <div className="border-b border-slate-100 pb-4">
                      <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider mb-2 flex items-center gap-1.5"><Info size={16} className="text-[#0d6efd]" /> Công dụng</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{med.cong_dung || "Chưa có thông tin."}</p>
                    </div>
                    <div className="border-b border-slate-100 pb-4">
                      <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider mb-2 flex items-center gap-1.5"><Activity size={16} className="text-[#0d6efd]" /> Hướng dẫn</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{med.cach_dung || "Chưa có thông tin."}</p>
                    </div>
                    <div className="pb-2">
                      <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider mb-2 flex items-center gap-1.5"><ShieldAlert size={16} className="text-[#0d6efd]" /> Tác dụng phụ</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{med.tac_dung_phu || "Chưa có thông tin."}</p>
                    </div>
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
