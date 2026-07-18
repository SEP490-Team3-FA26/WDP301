import { Check, ChevronDown, ChevronUp, Filter, RotateCcw } from "lucide-react";
import React from "react";

export interface AdminProductFilterSidebarProps {
  selectedTargetGroup: string;
  setSelectedTargetGroup: (val: string) => void;
  selectedPriceRange: string;
  setSelectedPriceRange: (val: string) => void;
  selectedFlavour: string;
  setSelectedFlavour: (val: string) => void;
  selectedCountry: string;
  setSelectedCountry: (val: string) => void;
  selectedBrand: string;
  setSelectedBrand: (val: string) => void;
  selectedIndication: string;
  setSelectedIndication: (val: string) => void;
  selectedBrandOrigin: string;
  setSelectedBrandOrigin: (val: string) => void;
  selectedIngredient: string;
  setSelectedIngredient: (val: string) => void;
  selectedClassification: string;
  setSelectedClassification: (val: string) => void;
  expandedSections: { [key: string]: boolean };
  toggleSection: (section: string) => void;
  handleResetFilters: () => void;
  hasAnyFilter: boolean;
}

export function AdminProductFilterSidebar({
  selectedTargetGroup, setSelectedTargetGroup,
  selectedPriceRange, setSelectedPriceRange,
  selectedFlavour, setSelectedFlavour,
  selectedCountry, setSelectedCountry,
  selectedBrand, setSelectedBrand,
  selectedIndication, setSelectedIndication,
  selectedBrandOrigin, setSelectedBrandOrigin,
  selectedIngredient, setSelectedIngredient,
  selectedClassification, setSelectedClassification,
  expandedSections, toggleSection,
  handleResetFilters, hasAnyFilter
}: AdminProductFilterSidebarProps) {
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
}
