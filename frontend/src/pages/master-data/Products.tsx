import { useState } from "react";
import { Plus, Search, PackageSearch, Activity, Pill, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

// Mock data
const mockProducts = [
  { id: 1, sku: "MED-00001", name: "Amoxicillin 500mg", type: "PRESCRIPTION", price: 120000, indications: "Trị nhiễm khuẩn" },
  { id: 2, name: "Vitamin C 1000mg", sku: "MED-00002", type: "NORMAL", price: 85000, indications: "Tăng đề kháng" },
  { id: 3, name: "Diazepam 5mg", sku: "MED-00003", type: "PSYCHOTROPIC", price: 45000, indications: "An thần, trị mất ngủ" },
];

export function Products() {
  const [products] = useState(mockProducts);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "PRESCRIPTION":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200"><AlertCircle size={12}/> Thuốc kê đơn</span>;
      case "PSYCHOTROPIC":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200"><Activity size={12}/> Hướng thần</span>;
      case "NORMAL":
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><Pill size={12}/> Thuốc thường</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh mục Dược phẩm</h1>
          <p className="text-slate-500 mt-1">Quản lý SKU và cấu hình thuộc tính phân loại thuốc</p>
        </div>
        <button className="bg-[#0057cd] hover:bg-[#004bb1] text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm">
          <Plus size={18} />
          <span>Thêm Dược phẩm (SKU)</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm theo mã SKU, tên thuốc..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd] transition-all"
            />
          </div>
          <div className="flex gap-2">
            <select className="border border-slate-200 rounded-lg text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd]">
              <option value="">Tất cả phân loại</option>
              <option value="PRESCRIPTION">Thuốc kê đơn</option>
              <option value="PSYCHOTROPIC">Thuốc hướng thần</option>
              <option value="NORMAL">Thuốc thường / TPCN</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-white border-b border-slate-200 text-slate-900 font-medium uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4">Mã SKU</th>
                <th className="px-6 py-4">Tên Dược Phẩm</th>
                <th className="px-6 py-4">Phân loại</th>
                <th className="px-6 py-4">Công dụng chính</th>
                <th className="px-6 py-4 text-right">Giá bán</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => (
                <motion.tr 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={product.id} 
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-500">
                    {product.sku}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#f2f3ff] flex items-center justify-center text-[#0057cd]">
                        <PackageSearch size={20} />
                      </div>
                      <span className="font-bold text-slate-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getTypeBadge(product.type)}
                  </td>
                  <td className="px-6 py-4 truncate max-w-xs" title={product.indications}>
                    {product.indications}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">
                    {product.price.toLocaleString('vi-VN')} đ
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
