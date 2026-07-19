import React, { useState } from "react";
import { CheckCircle2, Plus, ShoppingBag, AlertCircle } from "lucide-react";

interface MedicineCardProps {
  med: any;
  added: boolean;
  onAddToCart: (med: any, quantity: number, unit: string) => void;
  onClick: () => void;
}

export const MedicineCard: React.FC<MedicineCardProps> = ({ med, added, onAddToCart, onClick }) => {
  const isOutOfStock = med.stock <= 0;
  const isLowStock = med.stock > 0 && med.stock <= 50;

  const parsePackaging = (spec: string, defaultUnit: string) => {
    const cleanSpec = (spec || "").toLowerCase().trim();
    const regexFull = /hộp\s+(\d+)\s+vỉ\s*x\s*(\d+)\s+viên/;
    const regexBoxPills = /hộp\s+(\d+)\s+viên/;
    const regexBoxBlisters = /hộp\s+(\d+)\s+vỉ/;

    let units = [defaultUnit || "Viên"];
    let multipliers: { [key: string]: number } = { [defaultUnit || "Viên"]: 1 };

    const matchFull = cleanSpec.match(regexFull);
    if (matchFull) {
      const a = parseInt(matchFull[1], 10);
      const b = parseInt(matchFull[2], 10);
      return { units: ["Hộp", "Vỉ", "Viên"], multipliers: { "Hộp": a * b, "Vỉ": b, "Viên": 1 } };
    }
    const matchBoxPills = cleanSpec.match(regexBoxPills);
    if (matchBoxPills) {
      const b = parseInt(matchBoxPills[1], 10);
      return { units: ["Hộp", "Viên"], multipliers: { "Hộp": b, "Viên": 1 } };
    }
    const matchBoxBlisters = cleanSpec.match(regexBoxBlisters);
    if (matchBoxBlisters) {
      const a = parseInt(matchBoxBlisters[1], 10);
      return { units: ["Hộp", "Vỉ"], multipliers: { "Hộp": a, "Vỉ": 1 } };
    }
    return { units, multipliers };
  };

  const packSpec = med.thong_tin_chi_tiet?.["Quy cách đóng gói"] || med.thong_tin_chi_tiet?.["Quy cách"] || "";
  const { units, multipliers } = parsePackaging(packSpec, med.unit);
  const [selectedUnit, setSelectedUnit] = useState(units[0] || med.unit || "Hộp");

  const currentMultiplier = multipliers[selectedUnit] || 1;
  const displayPrice = med.price * currentMultiplier;

  const countryName = med.thong_tin_chi_tiet?.["Nước sản xuất"] || med.thong_tin_chi_tiet?.["Xuất xứ"] || "";
  const getFlag = (country: string) => {
    if (country.includes("Việt")) return "🇻🇳";
    if (country.includes("Hoa Kỳ") || country.includes("Mỹ")) return "🇺🇸";
    if (country.includes("Pháp")) return "🇫🇷";
    if (country.includes("Đức")) return "🇩🇪";
    if (country.includes("Nhật")) return "🇯🇵";
    if (country.includes("Hàn")) return "🇰🇷";
    if (country.includes("Ấn Độ")) return "🇮🇳";
    return "🌐";
  };

  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-[0_8px_30px_rgba(59,130,246,0.12)] transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
    >
      {/* Image Area */}
      <div className="relative bg-gradient-to-br from-slate-50 to-blue-50/30 h-40 flex items-center justify-center p-4 overflow-hidden">
        <img
          src={med.image || "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60"}
          alt={med.name}
          loading="lazy"
          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
        />

        {/* Badge: Stock status */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
            <span className="px-3 py-1 bg-slate-800/80 text-white text-[10px] font-black rounded-full uppercase tracking-wider">Hết hàng</span>
          </div>
        )}
        {isLowStock && !isOutOfStock && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
            <AlertCircle size={8} /> Sắp hết
          </div>
        )}

        {/* Country Badge */}
        {countryName && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-xl text-[9px] font-bold text-slate-600 border border-slate-100 shadow-sm flex items-center gap-1">
            <span>{getFlag(countryName)}</span>
            <span className="max-w-[60px] truncate">{countryName}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col gap-3">

        {/* Name */}
        <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
          {med.name}
        </h4>

        {/* Unit pills */}
        {units.length > 1 && (
          <div className="flex gap-1">
            {units.map(u => (
              <button
                key={u}
                onClick={(e) => { e.stopPropagation(); setSelectedUnit(u); }}
                className={`flex-1 py-1 rounded-lg text-[10px] font-extrabold transition-all border ${
                  selectedUnit === u
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        )}

        {/* Price + Button */}
        <div className="mt-auto flex items-center justify-between gap-2">
          <div>
            <p className="text-base font-black text-blue-600 leading-tight">
              {displayPrice.toLocaleString("vi-VN")}₫
            </p>
            <p className="text-[10px] text-slate-400 font-semibold">/ {selectedUnit}</p>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart(med, currentMultiplier, selectedUnit); }}
            disabled={isOutOfStock}
            className={`shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-all ${
              isOutOfStock
                ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                : added
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200 active:scale-90"
            }`}
          >
            {added ? <CheckCircle2 size={16} /> : <Plus size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
