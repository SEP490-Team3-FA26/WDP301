import React, { useState } from "react";
import { Plus, Search, Filter, MoreHorizontal, AlertCircle, CheckCircle2 } from "lucide-react";

// Mock data
const initialInventory = [
  { id: "MED-001", name: "Paracetamol 500mg", category: "Giảm đau, hạ sốt", stock: 150, minStock: 50, price: 25000, expiry: "2025-10-12", status: "In Stock" },
  { id: "MED-002", name: "Amoxicillin 250mg", category: "Kháng sinh", stock: 15, minStock: 20, price: 45000, expiry: "2024-11-05", status: "Low Stock" },
  { id: "MED-003", name: "Vitamin C 1000mg", category: "Vitamin & Khoáng chất", stock: 200, minStock: 30, price: 85000, expiry: "2026-01-20", status: "In Stock" },
  { id: "MED-004", name: "Omeprazole 20mg", category: "Tiêu hóa", stock: 45, minStock: 40, price: 55000, expiry: "2025-05-15", status: "In Stock" },
  { id: "MED-005", name: "Ibuprofen 400mg", category: "Giảm đau, kháng viêm", stock: 120, minStock: 50, price: 35000, expiry: "2025-08-30", status: "In Stock" },
  { id: "MED-006", name: "Loratadine 10mg", category: "Kháng dị ứng", stock: 300, minStock: 100, price: 22000, expiry: "2026-03-10", status: "In Stock" },
  { id: "MED-007", name: "Cefuroxime 500mg", category: "Kháng sinh", stock: 0, minStock: 30, price: 120000, expiry: "2024-09-01", status: "Out of Stock" },
];

export function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredInventory = initialInventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tổng Quan Kho</h1>
          <p className="text-slate-500 mt-1">Quản lý danh sách thuốc và tồn kho hiện tại.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button className="px-5 py-2 bg-[#0057cd] text-white font-bold rounded-xl hover:bg-[#00419e] transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap">
            <Plus size={18} />
            Thêm thuốc
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm theo mã, tên hoặc danh mục..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
          
          <button className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 w-full sm:w-auto shadow-sm">
            <Filter size={16} />
            Lọc kết quả
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium">Mã & Tên Thuốc</th>
                <th scope="col" className="px-6 py-4 font-medium">Danh Mục</th>
                <th scope="col" className="px-6 py-4 font-medium text-right">Giá Bán</th>
                <th scope="col" className="px-6 py-4 font-medium text-center">Tồn Kho</th>
                <th scope="col" className="px-6 py-4 font-medium">Trạng Thái</th>
                <th scope="col" className="px-6 py-4 font-medium">Hạn Sử Dụng</th>
                <th scope="col" className="px-6 py-4 font-medium text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInventory.map((item) => (
                <tr key={item.id} className="bg-white hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.id}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{item.category}</td>
                  <td className="px-6 py-4 text-slate-900 font-medium text-right">
                    {item.price.toLocaleString("vi-VN")} ₫
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`font-semibold ${item.stock <= item.minStock ? 'text-rose-600' : 'text-slate-900'}`}>
                      {item.stock}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">/ {item.minStock}</span>
                  </td>
                  <td className="px-6 py-4">
                    {item.status === 'In Stock' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        <CheckCircle2 size={14} /> Sẵn sàng
                      </span>
                    )}
                    {item.status === 'Low Stock' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <AlertCircle size={14} /> Sắp hết
                      </span>
                    )}
                    {item.status === 'Out of Stock' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                        <AlertCircle size={14} /> Hết hàng
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{item.expiry}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-slate-100">
                      <MoreHorizontal size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredInventory.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">Không tìm thấy thuốc nào khớp với từ khóa.</p>
            </div>
          )}
        </div>
        
        {/* Pagination placeholder */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-white text-sm">
          <span className="text-slate-500">
            Hiển thị <span className="font-medium text-slate-900">1</span> đến <span className="font-medium text-slate-900">{filteredInventory.length}</span> trong số <span className="font-medium text-slate-900">{initialInventory.length}</span> thuốc
          </span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 disabled:opacity-50">Trước</button>
            <button className="px-3 py-1 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 disabled:opacity-50">Sau</button>
          </div>
        </div>
      </div>
    </div>
  );
}
