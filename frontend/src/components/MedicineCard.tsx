import { useState } from "react";
import { Check } from "lucide-react";

interface MedicineCardProps {
  med: any;
  added: boolean;
  onAddToCart: (med: any, quantity: number, unit: string) => void;
  onClick: () => void;
}

export function MedicineCard({ med, added, onAddToCart, onClick }: MedicineCardProps) {
  const isOutOfStock = med.stock <= 0;
  
  // Parse packaging specifications (e.g. "Hộp 3 vỉ x 10 viên")
  const parsePackaging = (spec: string, defaultUnit: string) => {
    const cleanSpec = (spec || "").toLowerCase().trim();
    
    // Pattern: "hộp A vỉ x B viên"
    const regexFull = /hộp\s+(\d+)\s+vỉ\s*x\s*(\d+)\s+viên/;
    // Pattern: "hộp B viên"
    const regexBoxPills = /hộp\s+(\d+)\s+viên/;
    // Pattern: "hộp A vỉ"
    const regexBoxBlisters = /hộp\s+(\d+)\s+vỉ/;

    let units = [defaultUnit || "Viên"];
    let multipliers: { [key: string]: number } = { [defaultUnit || "Viên"]: 1 };

    const matchFull = cleanSpec.match(regexFull);
    if (matchFull) {
      const a = parseInt(matchFull[1], 10);
      const b = parseInt(matchFull[2], 10);
      units = ["Hộp", "Vỉ", "Viên"];
      multipliers = {
        "Hộp": a * b,
        "Vỉ": b,
        "Viên": 1
      };
      return { units, multipliers };
    }

    const matchBoxPills = cleanSpec.match(regexBoxPills);
    if (matchBoxPills) {
      const b = parseInt(matchBoxPills[1], 10);
      units = ["Hộp", "Viên"];
      multipliers = {
        "Hộp": b,
        "Viên": 1
      };
      return { units, multipliers };
    }

    const matchBoxBlisters = cleanSpec.match(regexBoxBlisters);
    if (matchBoxBlisters) {
      const a = parseInt(matchBoxBlisters[1], 10);
      units = ["Hộp", "Vỉ"];
      multipliers = {
        "Hộp": a,
        "Vỉ": 1
      };
      return { units, multipliers };
    }

    return { units, multipliers };
  };

  const packSpec = med.thong_tin_chi_tiet?.["Quy cách đóng gói"] || med.thong_tin_chi_tiet?.["Quy cách"] || "";
  const { units, multipliers } = parsePackaging(packSpec, med.unit);
  
  // Set default selected unit (prefer smaller unit if price is base, e.g. "Viên", or default unit)
  const [selectedUnit, setSelectedUnit] = useState(units[units.length - 1] || med.unit || "Viên");

  const currentMultiplier = multipliers[selectedUnit] || 1;
  const displayPrice = med.price * currentMultiplier;

  // Render Flag Country Tag
  const getCountryTag = () => {
    const country = med.thong_tin_chi_tiet?.["Nước sản xuất"] || med.thong_tin_chi_tiet?.["Xuất xứ"] || "";
    if (!country) return null;
    
    let flag = "🌐";
    if (country.includes("Việt Nam")) flag = "🇻🇳";
    else if (country.includes("Hoa Kỳ") || country.includes("Mỹ")) flag = "🇺🇸";
    else if (country.includes("Pháp")) flag = "🇫🇷";
    else if (country.includes("Đức")) flag = "🇩🇪";
    else if (country.includes("Nhật")) flag = "🇯🇵";
    else if (country.includes("Hàn")) flag = "🇰🇷";
    else if (country.includes("Ấn Độ")) flag = "🇮🇳";

    return (
      <div className="absolute top-0 left-0 z-10 px-3 py-1.5 rounded-tl-[24px] rounded-br-xl bg-slate-100 text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 border-b border-r border-slate-200/50 shadow-sm">
        <span>{flag}</span>
        <span>{country}</span>
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-[24px] border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group cursor-pointer relative"
    >
      {/* Country/Flag tag */}
      {getCountryTag()}

      {/* Image container */}
      <div className="w-full h-[180px] bg-white flex items-center justify-center p-6 relative overflow-hidden">
        <img
          src={med.image || "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60"}
          alt={med.name}
          loading="lazy"
          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Content panel */}
      <div className="p-4 flex-1 flex flex-col justify-between text-left">
        <div>
          {/* Product Name */}
          <h4 
            className="font-bold text-slate-800 text-[15px] hover:text-blue-600 transition-colors leading-snug mb-3 line-clamp-2 min-h-[44px]"
            title={med.name}
          >
            {med.name}
          </h4>

          {/* Unit selection pills */}
          {units.length > 1 && (
            <div className="flex items-center bg-slate-50 rounded-xl p-1 mb-4 border border-slate-200">
              {units.map((u) => (
                <button
                  key={u}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedUnit(u);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer text-center ${
                    selectedUnit === u
                      ? "bg-white text-blue-600 shadow-sm border border-blue-500"
                      : "text-slate-500 hover:text-slate-800 border border-transparent"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Price & Action Button */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 text-left">
            <span className="text-[22px] font-bold text-blue-600 tracking-tight leading-none">
              {displayPrice.toLocaleString()}₫ <span className="text-[15px] font-medium text-blue-500/80">/ {selectedUnit}</span>
            </span>
            {packSpec && (
              <span className="text-[13px] text-slate-600 font-medium bg-slate-100 px-3 py-1.5 rounded-xl self-start">
                {packSpec}
              </span>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(med, currentMultiplier, selectedUnit);
            }}
            disabled={isOutOfStock}
            className={`w-full py-2.5 mt-2 rounded-[20px] font-semibold text-[15px] flex items-center justify-center gap-1.5 transition-all ${
              isOutOfStock
                ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                : added 
                  ? "bg-emerald-500 text-white hover:bg-emerald-600" 
                  : "bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98] cursor-pointer"
            }`}
          >
            {isOutOfStock ? (
              "Hết hàng"
            ) : added ? (
              <><Check size={16} /> Đã thêm!</>
            ) : (
              "Chọn mua"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
