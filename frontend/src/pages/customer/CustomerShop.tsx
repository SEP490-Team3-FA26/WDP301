

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, ShoppingCart, Star, Heart, Info, Check, ChevronLeft, ChevronRight, XCircle, Activity, ShieldAlert, Filter, X, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { MedicineCard } from "../../components/MedicineCard";

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
    
    return (
      <div className="flex flex-col gap-5 text-slate-700">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-black text-xs text-slate-800 uppercase tracking-widest">
            <Filter size={16} className="text-blue-600" />
            <span>Bộ lọc nâng cao</span>
          </div>
          {hasAnyFilter && (
            <button
              onClick={handleResetFilters}
              className="text-[10px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 bg-rose-50 rounded-lg"
            >
              <RotateCcw size={10} />
              Xóa tất cả
            </button>
          )}
        </div>

        {/* Section: Price Range */}
        <div className="border-b border-slate-100 pb-4">
          <button
            onClick={() => toggleSection("price")}
            className="flex items-center justify-between w-full font-extrabold text-[11px] text-slate-650 hover:text-blue-600 uppercase tracking-wider transition-colors cursor-pointer"
          >
            <span>Giá bán</span>
            {expandedSections.price ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expandedSections.price && (
            <div className="flex flex-col gap-1.5 mt-2.5">
              {[
                { value: "", label: "Tất cả" },
                { value: "under-50", label: "Dưới 50.000đ" },
                { value: "50-100", label: "50.000đ - 100.000đ" },
                { value: "100-200", label: "100.000đ - 200.000đ" },
                { value: "over-200", label: "Trên 200.000đ" }
              ].map(item => (
                <label key={item.value} className={`flex items-center justify-between py-1.5 px-2.5 rounded-xl cursor-pointer text-xs font-bold transition-all ${selectedPriceRange === item.value ? 'bg-blue-50/70 text-blue-700 border border-blue-100' : 'text-slate-500 hover:bg-slate-50 border border-transparent'}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="priceRange"
                      checked={selectedPriceRange === item.value}
                      onChange={() => setSelectedPriceRange(item.value)}
                      className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-slate-350 rounded cursor-pointer"
                    />
                    <span>{item.label}</span>
                  </div>
                  {selectedPriceRange === item.value && <Check size={12} className="text-blue-650" />}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Section: Classification (Loại thuốc) */}
        <div className="border-b border-slate-100 pb-4">
          <button
            onClick={() => toggleSection("classification")}
            className="flex items-center justify-between w-full font-extrabold text-[11px] text-slate-650 hover:text-blue-600 uppercase tracking-wider transition-colors cursor-pointer"
          >
            <span>Loại thuốc</span>
            {expandedSections.classification ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expandedSections.classification && (
            <div className="flex flex-col gap-1.5 mt-2.5">
              {[
                { value: "", label: "Tất cả các loại" },
                { value: "PRESCRIPTION_ANTIBIOTIC", label: "Thuốc kê đơn (Rx)" },
                { value: "COMMON_SUPPLEMENT", label: "Thực phẩm bổ sung" }
              ].map(item => (
                <label key={item.value} className={`flex items-center justify-between py-1.5 px-2.5 rounded-xl cursor-pointer text-xs font-bold transition-all ${selectedClassification === item.value ? 'bg-blue-50/70 text-blue-700 border border-blue-100' : 'text-slate-500 hover:bg-slate-50 border border-transparent'}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="classification"
                      checked={selectedClassification === item.value}
                      onChange={() => setSelectedClassification(item.value)}
                      className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-slate-350 rounded cursor-pointer"
                    />
                    <span>{item.label}</span>
                  </div>
                  {selectedClassification === item.value && <Check size={12} className="text-blue-650" />}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Section: Target Group (Đối tượng sử dụng) */}
        <div className="border-b border-slate-100 pb-4">
          <button
            onClick={() => toggleSection("targetGroup")}
            className="flex items-center justify-between w-full font-extrabold text-[11px] text-slate-655 hover:text-blue-600 uppercase tracking-wider transition-colors cursor-pointer"
          >
            <span>Đối tượng sử dụng</span>
            {expandedSections.targetGroup ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expandedSections.targetGroup && (
            <div className="flex flex-col gap-1.5 mt-2.5">
              {[
                { value: "", label: "Tất cả" },
                { value: "Người lớn", label: "Người lớn" },
                { value: "Trẻ em", label: "Trẻ em" },
                { value: "Người cao tuổi", label: "Người cao tuổi" },
                { value: "Phụ nữ có thai", label: "Phụ nữ có thai" },
                { value: "Phụ nữ cho con bú", label: "Phụ nữ cho con bú" }
              ].map(item => (
                <label key={item.value} className={`flex items-center justify-between py-1.5 px-2.5 rounded-xl cursor-pointer text-xs font-bold transition-all ${selectedTargetGroup === item.value ? 'bg-blue-50/70 text-blue-700 border border-blue-100' : 'text-slate-500 hover:bg-slate-50 border border-transparent'}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="targetGroup"
                      checked={selectedTargetGroup === item.value}
                      onChange={() => setSelectedTargetGroup(item.value)}
                      className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-slate-350 rounded cursor-pointer"
                    />
                    <span>{item.label}</span>
                  </div>
                  {selectedTargetGroup === item.value && <Check size={12} className="text-blue-650" />}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Section: Country of Origin (Nước sản xuất) */}
        <div className="border-b border-slate-100 pb-4">
          <button
            onClick={() => toggleSection("country")}
            className="flex items-center justify-between w-full font-extrabold text-[11px] text-slate-655 hover:text-blue-600 uppercase tracking-wider transition-colors cursor-pointer"
          >
            <span>Nước sản xuất</span>
            {expandedSections.country ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expandedSections.country && (
            <div className="flex flex-col gap-1.5 mt-2.5">
              {[
                { value: "", label: "Tất cả" },
                { value: "Việt Nam", label: "Việt Nam" },
                { value: "Hoa Kỳ", label: "Hoa Kỳ" },
                { value: "Pháp", label: "Pháp" },
                { value: "Đức", label: "Đức" },
                { value: "Nhật Bản", label: "Nhật Bản" }
              ].map(item => (
                <label key={item.value} className={`flex items-center justify-between py-1.5 px-2.5 rounded-xl cursor-pointer text-xs font-bold transition-all ${selectedCountry === item.value ? 'bg-blue-50/70 text-blue-700 border border-blue-100' : 'text-slate-500 hover:bg-slate-50 border border-transparent'}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="country"
                      checked={selectedCountry === item.value}
                      onChange={() => setSelectedCountry(item.value)}
                      className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-slate-350 rounded cursor-pointer"
                    />
                    <span>{item.label}</span>
                  </div>
                  {selectedCountry === item.value && <Check size={12} className="text-blue-650" />}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Section: Indication (Chỉ định) */}
        <div className="border-b border-slate-100 pb-4">
          <button
            onClick={() => toggleSection("indication")}
            className="flex items-center justify-between w-full font-extrabold text-[11px] text-slate-655 hover:text-blue-600 uppercase tracking-wider transition-colors cursor-pointer"
          >
            <span>Chỉ định</span>
            {expandedSections.indication ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expandedSections.indication && (
            <div className="flex flex-col gap-1.5 mt-2.5">
              {[
                { value: "", label: "Tất cả" },
                { value: "Giảm đau", label: "Giảm đau / Hạ sốt" },
                { value: "Kháng sinh", label: "Kháng sinh" },
                { value: "Dị ứng", label: "Chống dị ứng" },
                { value: "Ho", label: "Ho / Sổ mũi" },
                { value: "Dạ dày", label: "Tiêu hóa / Dạ dày" }
              ].map(item => (
                <label key={item.value} className={`flex items-center justify-between py-1.5 px-2.5 rounded-xl cursor-pointer text-xs font-bold transition-all ${selectedIndication === item.value ? 'bg-blue-50/70 text-blue-700 border border-blue-100' : 'text-slate-500 hover:bg-slate-50 border border-transparent'}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="indication"
                      checked={selectedIndication === item.value}
                      onChange={() => setSelectedIndication(item.value)}
                      className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-slate-350 rounded cursor-pointer"
                    />
                    <span>{item.label}</span>
                  </div>
                  {selectedIndication === item.value && <Check size={12} className="text-blue-650" />}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Section: Brand (Thương hiệu) */}
        <div className="border-b border-slate-100 pb-4">
          <button
            onClick={() => toggleSection("brand")}
            className="flex items-center justify-between w-full font-extrabold text-[11px] text-slate-655 hover:text-blue-600 uppercase tracking-wider transition-colors cursor-pointer"
          >
            <span>Thương hiệu</span>
            {expandedSections.brand ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expandedSections.brand && (
            <div className="flex flex-col gap-1.5 mt-2.5">
              {[
                { value: "", label: "Tất cả" },
                { value: "Abbott", label: "Abbott" },
                { value: "Traphaco", label: "Traphaco" },
                { value: "Sanofi", label: "Sanofi" },
                { value: "OPC", label: "OPC" },
                { value: "Hisamitsu", label: "Hisamitsu" }
              ].map(item => (
                <label key={item.value} className={`flex items-center justify-between py-1.5 px-2.5 rounded-xl cursor-pointer text-xs font-bold transition-all ${selectedBrand === item.value ? 'bg-blue-50/70 text-blue-700 border border-blue-100' : 'text-slate-500 hover:bg-slate-50 border border-transparent'}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="brand"
                      checked={selectedBrand === item.value}
                      onChange={() => setSelectedBrand(item.value)}
                      className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-slate-350 rounded cursor-pointer"
                    />
                    <span>{item.label}</span>
                  </div>
                  {selectedBrand === item.value && <Check size={12} className="text-blue-650" />}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Section: Brand Origin (Xuất xứ thương hiệu) */}
        <div className="border-b border-slate-100 pb-4">
          <button
            onClick={() => toggleSection("brandOrigin")}
            className="flex items-center justify-between w-full font-extrabold text-[11px] text-slate-655 hover:text-blue-600 uppercase tracking-wider transition-colors cursor-pointer"
          >
            <span>Xuất xứ thương hiệu</span>
            {expandedSections.brandOrigin ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expandedSections.brandOrigin && (
            <div className="flex flex-col gap-1.5 mt-2.5">
              {[
                { value: "", label: "Tất cả" },
                { value: "Việt Nam", label: "Việt Nam" },
                { value: "Hoa Kỳ", label: "Hoa Kỳ" },
                { value: "Pháp", label: "Pháp" },
                { value: "Đức", label: "Đức" },
                { value: "Nhật Bản", label: "Nhật Bản" }
              ].map(item => (
                <label key={item.value} className={`flex items-center justify-between py-1.5 px-2.5 rounded-xl cursor-pointer text-xs font-bold transition-all ${selectedBrandOrigin === item.value ? 'bg-blue-50/70 text-blue-700 border border-blue-100' : 'text-slate-500 hover:bg-slate-50 border border-transparent'}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="brandOrigin"
                      checked={selectedBrandOrigin === item.value}
                      onChange={() => setSelectedBrandOrigin(item.value)}
                      className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-slate-350 rounded cursor-pointer"
                    />
                    <span>{item.label}</span>
                  </div>
                  {selectedBrandOrigin === item.value && <Check size={12} className="text-blue-650" />}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Section: Ingredient (Thành phần) */}
        <div className="border-b border-slate-100 pb-4">
          <button
            onClick={() => toggleSection("ingredient")}
            className="flex items-center justify-between w-full font-extrabold text-[11px] text-slate-655 hover:text-blue-600 uppercase tracking-wider transition-colors cursor-pointer"
          >
            <span>Thành phần hoạt chất</span>
            {expandedSections.ingredient ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expandedSections.ingredient && (
            <div className="flex flex-col gap-1.5 mt-2.5">
              {[
                { value: "", label: "Tất cả hoạt chất" },
                { value: "Paracetamol", label: "Paracetamol" },
                { value: "Ibuprofen", label: "Ibuprofen" },
                { value: "Amoxicillin", label: "Amoxicillin" },
                { value: "Vitamin C", label: "Vitamin C" },
                { value: "Acetylcysteine", label: "Acetylcysteine" }
              ].map(item => (
                <label key={item.value} className={`flex items-center justify-between py-1.5 px-2.5 rounded-xl cursor-pointer text-xs font-bold transition-all ${selectedIngredient === item.value ? 'bg-blue-50/70 text-blue-700 border border-blue-100' : 'text-slate-500 hover:bg-slate-50 border border-transparent'}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="ingredient"
                      checked={selectedIngredient === item.value}
                      onChange={() => setSelectedIngredient(item.value)}
                      className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-slate-350 rounded cursor-pointer"
                    />
                    <span>{item.label}</span>
                  </div>
                  {selectedIngredient === item.value && <Check size={12} className="text-blue-650" />}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

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
                      onClick={() => {
                        setSelectedMedicineForModal(med);
                        setModalQuantity(1);
                      }}
                      onAddToCart={(m, qty) => handleAddToCart(m, qty)}
                    />
                  );
                })}
              </div>

              {/* Styled Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2.5 mt-8 mb-4">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft size={16} /> Trước
                  </button>
                  <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-5 py-2.5 rounded-xl shadow-sm">
                    Trang {currentPage} / {totalPages} <span className="text-slate-400 font-medium ml-1">({totalItems} sản phẩm)</span>
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                  >
                    Sau <ChevronRight size={16} />
                  </button>
                </div>
              )}
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
      {selectedMedicineForModal && (() => {
        const med = selectedMedicineForModal;
        const medId = med.id || med._id;
        const isRx = med.drug_classification === "PRESCRIPTION_ANTIBIOTIC";
        const isOutOfStock = med.stock <= 0;
        
        return (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
            onClick={() => { setSelectedMedicineForModal(null); setModalQuantity(1); }}
          >
            <div 
              className="bg-white rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-3.5xl overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200 cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-50 flex items-start justify-between bg-slate-50/50">
                <div className="flex flex-col gap-1.5 text-left">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                      isRx ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-blue-50 text-blue-700 border-blue-100"
                    }`}>
                      {isRx ? "Thuốc kê đơn (Rx)" : "Không kê đơn"}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      SKU: {med.sku || med.barcode || medId.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-slate-800 leading-tight">
                    {med.name}
                  </h3>
                </div>
                <button 
                  onClick={() => { setSelectedMedicineForModal(null); setModalQuantity(1); }}
                  className="p-1.5 text-slate-450 hover:text-slate-650 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                >
                  <XCircle size={22} />
                </button>
              </div>

              {/* Modal Body Columns */}
              <div className="p-6 md:p-8 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 max-h-[75vh] custom-scrollbar">
                
                {/* Left visual column */}
                <div className="md:col-span-5 flex flex-col gap-6">
                  <div className="w-full aspect-square bg-slate-50 rounded-2xl flex items-center justify-center p-6 border border-slate-100 relative group overflow-hidden">
                    <img 
                      src={med.image || "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60"}
                      alt={med.name}
                      className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-4 text-left">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Đơn giá</span>
                      <span className="text-xl font-black text-blue-600">
                        {med.price.toLocaleString()}₫ <span className="text-xs font-semibold text-slate-400">/ {med.unit || "Viên"}</span>
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-slate-200/50 pt-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Số lượng mua</span>
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-inner">
                        <button 
                          onClick={() => setModalQuantity(q => Math.max(1, q - 1))}
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
                          disabled={isOutOfStock}
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-black text-slate-700 text-xs">{modalQuantity}</span>
                        <button 
                          onClick={() => setModalQuantity(q => Math.min(med.stock, q + 1))}
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
                          disabled={isOutOfStock || modalQuantity >= med.stock}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleAddToCart(med, modalQuantity)}
                      disabled={isOutOfStock}
                      className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
                        isOutOfStock 
                          ? "bg-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none" 
                          : addedItems[medId] 
                            ? "bg-emerald-500 text-white" 
                            : "bg-blue-600 hover:bg-blue-700 text-white active:scale-95 cursor-pointer shadow-blue-100"
                      }`}
                    >
                      {isOutOfStock ? "Tạm hết hàng" : addedItems[medId] ? <><Check size={14} /> Đã thêm!</> : <><ShoppingCart size={14} /> Thêm vào giỏ</>}
                    </button>
                  </div>
                </div>

                {/* Right content column */}
                <div className="md:col-span-7 flex flex-col gap-5 text-left">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-1">
                      <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider">Hoạt chất chính</span>
                      <span className="font-extrabold text-slate-800 text-xs leading-snug">{med.active_ingredient || "N/A"}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-1">
                      <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider">Nhóm điều trị</span>
                      <span className="font-extrabold text-slate-800 text-xs leading-snug">{med.category || "N/A"}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-4 mt-2">
                    <div className="border-b border-slate-100 pb-3.5">
                      <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Info size={14} className="text-blue-600" /> Công dụng thuốc
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">{med.cong_dung || "Chưa cập nhật mô tả chi tiết."}</p>
                    </div>
                    <div className="border-b border-slate-100 pb-3.5">
                      <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Activity size={14} className="text-blue-600" /> Hướng dẫn sử dụng
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">{med.cach_dung || "Tham khảo ý kiến bác sĩ trước khi sử dụng."}</p>
                    </div>
                    <div className="pb-2">
                      <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <ShieldAlert size={14} className="text-blue-600" /> Tác dụng phụ cần lưu ý
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">{med.tac_dung_phu || "Chưa ghi nhận tác dụng phụ đáng kể."}</p>
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
