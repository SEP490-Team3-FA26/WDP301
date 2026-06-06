import { useState, useEffect } from "react";
import { Plus, Search, Building2, AlertTriangle, CheckCircle2, ShieldAlert, X } from "lucide-react";
import { motion } from "motion/react";

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({ name: "", phone: "", gdp_expiry_date: "" });

  useEffect(() => {
    fetch('/api/suppliers')
      .then(res => res.json())
      .then(data => setSuppliers(data))
      .catch(err => console.error('Failed to fetch suppliers', err));
  }, []);

  const toggleStatus = (id: number) => {
    // In a real app, this would call an API
    setSuppliers(suppliers.map(s => {
      if (s._id === id) {
        return { ...s, status: s.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" };
      }
      return s;
    }));
  };

  const isExpired = (dateString: string) => {
    if (!dateString) return false;
    const expiry = new Date(dateString);
    const today = new Date();
    return expiry < today;
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.gdp_expiry_date) return;
    
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || "N/A",
          gdp_expiry_date: formData.gdp_expiry_date,
          status: "ACTIVE"
        })
      });
      const newSupplier = await res.json();
      setSuppliers([...suppliers, newSupplier]);
      setIsModalOpen(false);
      setFormData({ name: "", phone: "", gdp_expiry_date: "" });
    } catch (err) {
      console.error('Failed to create supplier', err);
    }
  };

  const isFormExpired = isExpired(formData.gdp_expiry_date);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý Nhà cung cấp</h1>
          <p className="text-slate-500 mt-1">Thẩm định pháp lý và cấu hình trạng thái hoạt động</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#0057cd] hover:bg-[#004bb1] text-white px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} />
          <span>Thêm nhà cung cấp</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm theo tên, số điện thoại..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd] transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-white border-b border-slate-100 text-slate-900 font-medium uppercase text-xs tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4">Nhà cung cấp</th>
                <th className="px-6 py-4">Số điện thoại</th>
                <th className="px-6 py-4 text-center">Hạn Giấy phép GDP</th>
                <th className="px-6 py-4 text-center">Tình trạng thẩm định</th>
                <th className="px-6 py-4 text-center">Trạng thái hệ thống</th>
                <th className="px-6 py-4 text-right">Khóa / Mở</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {suppliers.map((supplier) => {
                const expired = isExpired(supplier.gdp_expiry_date);
                return (
                  <motion.tr 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={supplier._id} 
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#f2f3ff] flex items-center justify-center text-[#0057cd]">
                          <Building2 size={20} />
                        </div>
                        <span className="font-bold text-slate-800">{supplier.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">{supplier.phone}</td>
                    <td className="px-6 py-4 text-center">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[11px] border ${expired ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        {supplier.gdp_expiry_date ? new Date(supplier.gdp_expiry_date).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {expired ? (
                         <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 rounded-full text-rose-600 text-xs font-bold border border-rose-100">
                            <ShieldAlert size={14} /> HẾT HẠN GDP
                         </div>
                      ) : (
                         <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full text-emerald-600 text-xs font-bold border border-emerald-100">
                            <CheckCircle2 size={14} /> HỢP LỆ
                         </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                        supplier.status === 'ACTIVE' 
                          ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {supplier.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm khóa'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => toggleStatus(supplier.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#0057cd] focus:ring-offset-2 ${
                          supplier.status === 'ACTIVE' ? 'bg-[#0057cd]' : 'bg-slate-300'
                        }`}
                      >
                        <span 
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            supplier.status === 'ACTIVE' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm NCC */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
          >
             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                   <Building2 className="text-[#0057cd]" size={20} />
                   Thêm Hồ Sơ Nhà Cung Cấp
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:bg-slate-200 hover:text-slate-700 p-1.5 rounded-full transition-colors">
                   <X size={20} />
                </button>
             </div>

             <form onSubmit={handleAddSupplier} className="p-6 space-y-5">
                <div className="space-y-1.5">
                   <label className="text-sm font-bold text-slate-700">Tên Doanh Nghiệp (Nhà Cung Cấp) *</label>
                   <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all" placeholder="Ví dụ: Công ty Dược phẩm X" />
                </div>
                <div className="space-y-1.5">
                   <label className="text-sm font-bold text-slate-700">Số điện thoại liên hệ</label>
                   <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all" placeholder="Ví dụ: 0901234567" />
                </div>
                <div className="space-y-1.5">
                   <label className="text-sm font-bold text-slate-700">Ngày hết hạn Giấy Chứng Nhận GDP *</label>
                   <input required type="date" value={formData.gdpExpiry} onChange={e => setFormData({...formData, gdpExpiry: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all" />
                </div>

                {formData.gdpExpiry && (
                   <div className={`p-4 rounded-xl border ${isFormExpired ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                      <div className="flex items-start gap-3">
                         {isFormExpired ? <ShieldAlert size={20} className="text-rose-600 mt-0.5 shrink-0" /> : <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 shrink-0" />}
                         <div>
                            <h4 className={`font-bold text-sm ${isFormExpired ? 'text-rose-800' : 'text-emerald-800'}`}>
                               {isFormExpired ? 'Giấy chứng nhận GDP đã hết hạn!' : 'Hồ sơ pháp lý hợp lệ'}
                            </h4>
                            <p className={`text-xs mt-1 leading-relaxed ${isFormExpired ? 'text-rose-700' : 'text-emerald-700'}`}>
                               {isFormExpired 
                                 ? 'Lưu ý: Nếu bạn thêm nhà cung cấp này, hệ thống Lên Đơn Nhập Hàng (Purchase Order) sẽ tự động CHẶN không cho phép nhập thuốc từ doanh nghiệp này.' 
                                 : 'Giấy phép GDP còn thời hạn sử dụng. Doanh nghiệp này sẽ được cấp quyền nhập hàng trên hệ thống.'}
                            </p>
                         </div>
                      </div>
                   </div>
                )}

                <div className="pt-4 flex justify-end gap-3">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                      Hủy bỏ
                   </button>
                   <button type="submit" className="bg-[#0057cd] hover:bg-[#004bb1] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm">
                      <CheckCircle2 size={18} />
                      Lưu Hồ Sơ
                   </button>
                </div>
             </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
