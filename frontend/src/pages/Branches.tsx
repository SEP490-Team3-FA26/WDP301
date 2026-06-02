import React, { useState } from "react";
import { Search, MapPin, Users, Package, AlertTriangle, Clock, X, ChevronRight, Activity, RotateCcw, Building2, Bell, CheckCircle2 } from "lucide-react";

// Mock data for branches
const branchesData = [
  {
    id: "BR-001",
    name: "Nhà thuốc VinaPharmacy - CN1",
    address: "Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=500&auto=format&fit=crop&q=60",
    status: "active",
    manager: "Nguyễn Văn A",
    contact: "0901234567",
    stats: {
      employees: 12,
      totalStock: 15420,
      lowStock: 15,
      expiring: 8
    },
    alerts: [
      { id: 1, type: "low_stock", item: "Paracetamol 500mg", current: 20, min: 50, time: "2 giờ trước (Từ quầy)" },
      { id: 2, type: "expiring", item: "Amoxicillin 250mg", expiryDate: "10/11/2023", time: "Hệ thống (Cronjob định kỳ)" },
      { id: 3, type: "low_stock", item: "Vitamin C 1000mg", current: 5, min: 20, time: "5 giờ trước (Từ quầy)" }
    ]
  },
  {
    id: "BR-002",
    name: "Nhà thuốc VinaPharmacy - CN2",
    address: "Phường Thảo Điền, Quận 2, TP. Hồ Chí Minh",
    image: "https://images.unsplash.com/photo-1555636222-cae831e670b3?w=500&auto=format&fit=crop&q=60",
    status: "active",
    manager: "Trần Thị B",
    contact: "0912345678",
    stats: {
      employees: 8,
      totalStock: 8250,
      lowStock: 3,
      expiring: 2
    },
    alerts: [
      { id: 4, type: "expiring", item: "Panadol Extra", expiryDate: "15/12/2023", time: "Hệ thống (Cronjob định kỳ)" },
      { id: 5, type: "low_stock", item: "Khẩu trang y tế", current: 15, min: 100, time: "1 ngày trước (Từ quầy)" }
    ]
  },
  {
    id: "BR-003",
    name: "Nhà thuốc VinaPharmacy - CN3",
    address: "Phường Hải Châu 1, Quận Hải Châu, Đà Nẵng",
    image: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=500&auto=format&fit=crop&q=60",
    status: "maintenance",
    manager: "Lê Văn C",
    contact: "0923456789",
    stats: {
      employees: 5,
      totalStock: 5120,
      lowStock: 0,
      expiring: 12
    },
    alerts: [
      { id: 6, type: "expiring", item: "Kháng sinh Zinnat", expiryDate: "01/11/2023", time: "Hệ thống (Cronjob định kỳ)" }
    ]
  },
  {
    id: "BR-004",
    name: "Nhà thuốc VinaPharmacy - CN4",
    address: "Phường Tràng Tiền, Quận Hoàn Kiếm, Hà Nội",
    image: "https://images.unsplash.com/photo-1563213126-a4273aedbc13?w=500&auto=format&fit=crop&q=60",
    status: "active",
    manager: "Phạm Thị D",
    contact: "0934567890",
    stats: {
      employees: 15,
      totalStock: 22100,
      lowStock: 25,
      expiring: 1
    },
    alerts: [
      { id: 7, type: "low_stock", item: "Nước muối sinh lý", current: 50, min: 200, time: "1 giờ trước (Từ quầy)" },
      { id: 8, type: "low_stock", item: "Bông y tế", current: 10, min: 50, time: "3 giờ trước (Từ quầy)" }
    ]
  }
];

export function Branches() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<typeof branchesData[0] | null>(null);

  const filteredBranches = branchesData.filter(branch => 
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    branch.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quản lý chi nhánh</h1>
          <p className="text-slate-500 mt-1">Theo dõi hoạt động và cảnh báo tồn kho của các quầy thuốc.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm chi nhánh, địa chỉ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all shadow-sm"
            />
          </div>
          <button className="px-5 py-2.5 bg-[#0057cd] text-white font-bold rounded-xl hover:bg-[#00419e] transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap">
            <Building2 size={18} />
            Thêm chi nhánh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredBranches.map(branch => (
          <div 
            key={branch.id} 
            onClick={() => setSelectedBranch(branch)}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer group flex flex-col h-full"
          >
            <div className="relative h-48 overflow-hidden">
              <img src={branch.image} alt={branch.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute top-3 right-3 flex gap-2">
                <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg shadow-sm backdrop-blur-md ${
                  branch.status === 'active' ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white'
                }`}>
                  {branch.status === 'active' ? 'Hoạt động' : 'Bảo trì / Sửa chữa'}
                </span>
              </div>
              {(branch.stats.lowStock > 0 || branch.stats.expiring > 0) && (
                <div className="absolute top-3 left-3 bg-rose-500/90 text-white px-2.5 py-1 text-[11px] font-bold rounded-lg shadow-sm backdrop-blur-md flex items-center gap-1.5">
                   <Bell size={12} className="animate-pulse" />
                   {branch.stats.lowStock + branch.stats.expiring} Cảnh báo
                </div>
              )}
            </div>
            <div className="p-5 flex flex-col flex-1">
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#0057cd] transition-colors line-clamp-1">{branch.name}</h3>
              <div className="flex items-start gap-2 text-slate-500 mt-2 text-sm">
                <MapPin size={16} className="shrink-0 mt-0.5 text-slate-400" />
                <span className="line-clamp-2 leading-relaxed">{branch.address}</span>
              </div>
              
              <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 flex-1 content-end">
                <div className="flex flex-col">
                   <span className="text-xs text-slate-500 font-medium font-mono mb-1 flex items-center gap-1"><Users size={12}/> Nhân sự</span>
                   <span className="font-bold text-slate-800">{branch.stats.employees} người</span>
                </div>
                <div className="flex flex-col">
                   <span className="text-xs text-slate-500 font-medium font-mono mb-1 flex items-center gap-1"><Package size={12}/> Tồn kho</span>
                   <span className="font-bold text-slate-800">{branch.stats.totalStock.toLocaleString()} SP</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredBranches.length === 0 && (
         <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
            <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">Không tìm thấy chi nhánh</h3>
            <p className="text-slate-500 mt-1">Thử thay đổi từ khóa tìm kiếm của bạn.</p>
         </div>
      )}

      {selectedBranch && (
        <BranchDetailModal branch={selectedBranch} onClose={() => setSelectedBranch(null)} />
      )}
    </div>
  );
}

function BranchDetailModal({ branch, onClose }: { branch: typeof branchesData[0], onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
       <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
       <div className="relative bg-[#faf8ff] rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[95vh] overflow-hidden transform transition-all">
          
          <div className="flex items-center justify-between p-5 lg:p-6 bg-white border-b border-slate-100 shrink-0">
             <div className="flex items-center gap-4">
                 <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                    <img src={branch.image} alt={branch.name} className="w-full h-full object-cover" />
                 </div>
                 <div>
                    <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">{branch.name}</h2>
                    <div className="flex items-center gap-3 mt-1.5 text-xs font-semibold">
                       <span className={`px-2 py-0.5 rounded flex items-center gap-1 ${branch.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          <Activity size={12} />
                          {branch.status === 'active' ? 'Đang hoạt động' : 'Bảo trì'}
                       </span>
                       <span className="text-slate-500 font-mono">{branch.id}</span>
                    </div>
                 </div>
             </div>
             <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors self-start">
               <X size={24} />
             </button>
          </div>

          <div className="overflow-y-auto p-5 lg:p-6 flex flex-col lg:flex-row gap-6">
             <div className="lg:w-1/3 flex flex-col gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                   <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                      <MapPin size={18} className="text-[#0057cd]" /> Thông tin cơ bản
                   </h3>
                   <div className="space-y-4 text-sm">
                      <div>
                         <div className="text-slate-500 uppercase text-[10px] tracking-widest font-bold mb-1">Địa chỉ</div>
                         <div className="font-medium text-slate-800">{branch.address}</div>
                      </div>
                      <div>
                         <div className="text-slate-500 uppercase text-[10px] tracking-widest font-bold mb-1">Quản lý trực tiếp</div>
                         <div className="font-medium text-slate-800">{branch.manager}</div>
                      </div>
                      <div>
                         <div className="text-slate-500 uppercase text-[10px] tracking-widest font-bold mb-1">Liên hệ</div>
                         <div className="font-medium text-slate-800">{branch.contact}</div>
                      </div>
                   </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                   <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                      <Activity size={18} className="text-[#0057cd]" /> Thống kê hoạt động
                   </h3>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                         <div className="text-slate-500 text-xs font-semibold mb-1 flex items-center gap-1.5"><Users size={14}/> Nhân sự</div>
                         <div className="text-xl font-black text-slate-900">{branch.stats.employees}</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                         <div className="text-slate-500 text-xs font-semibold mb-1 flex items-center gap-1.5"><Package size={14}/> SP Tồn kho</div>
                         <div className="text-xl font-black text-slate-900">{branch.stats.totalStock.toLocaleString()}</div>
                      </div>
                   </div>
                </div>
             </div>

             <div className="lg:w-2/3 flex flex-col h-full gap-5">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                   <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                       <h3 className="font-bold text-slate-900 flex items-center gap-2">
                         <AlertTriangle size={18} className="text-amber-500" /> 
                         Cảnh báo từ hệ thống & quầy
                       </h3>
                       <div className="flex gap-2">
                         <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg">{branch.stats.lowStock} Sắp hết</span>
                         <span className="px-2.5 py-1 bg-rose-100 text-rose-600 text-xs font-bold rounded-lg">{branch.stats.expiring} Sắp/Đã Hết hạn</span>
                       </div>
                   </div>
                   <div className="p-0 overflow-y-auto max-h-[400px]">
                      {branch.alerts.length > 0 ? (
                         <div className="divide-y divide-slate-100">
                            {branch.alerts.map(alert => (
                               <div key={alert.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4">
                                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                                     alert.type === 'low_stock' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                                  }`}>
                                     {alert.type === 'low_stock' ? <RotateCcw size={20} /> : <Clock size={20} />}
                                  </div>
                                  <div className="flex-1">
                                     <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-slate-800 text-sm">{alert.item}</h4>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                           alert.type === 'low_stock' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                                        }`}>
                                           {alert.type === 'low_stock' ? 'Sắp hết' : 'Chú ý HSD'}
                                        </span>
                                     </div>
                                     <div className="mt-1 flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 text-xs text-slate-600">
                                        {alert.type === 'low_stock' ? (
                                           <span className="font-medium bg-slate-100 px-2 py-1 rounded">Hiện tại: <span className="text-amber-600 font-bold">{alert.current}</span> / Min: {alert.min}</span>
                                        ) : (
                                           <span className="font-medium bg-slate-100 px-2 py-1 rounded">Ngày hết hạn: <span className="text-rose-600 font-bold">{alert.expiryDate}</span></span>
                                        )}
                                        <span className="flex items-center gap-1 text-slate-400 italic bg-white"><Bell size={12} /> Báo cáo lúc: {alert.time}</span>
                                     </div>
                                  </div>
                                  <button className="text-slate-400 hover:text-[#0057cd] p-1.5 transition-colors">
                                     <ChevronRight size={18} />
                                  </button>
                               </div>
                            ))}
                         </div>
                      ) : (
                         <div className="p-12 text-center text-slate-500">
                            <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-3" />
                            <p className="font-medium">Không có cảnh báo nào cho chi nhánh này.</p>
                         </div>
                      )}
                   </div>
                   
                   <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                         <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                         Cronjob hệ thống: Đang chạy (Kiểm tra HSD mỗi 12h)
                      </div>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}
