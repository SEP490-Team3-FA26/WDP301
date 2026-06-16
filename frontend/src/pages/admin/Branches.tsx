import React, { useState, useEffect } from "react";
import { Search, MapPin, Users, Package, AlertTriangle, Clock, X, ChevronRight, Activity, RotateCcw, Building2, Bell, CheckCircle2 } from "lucide-react";

interface Branch {
  _id?: string;
  id: string; // branchCode
  branchCode: string;
  name: string;
  address: string;
  image: string;
  status: 'active' | 'maintenance';
  manager: string;
  contact: string;
  stats: {
    employees: number;
    totalStock: number;
    lowStock: number;
    expiring: number;
  };
  alerts: {
    id: number;
    type: string;
    item: string;
    current?: number;
    min?: number;
    expiryDate?: string;
    time: string;
  }[];
}

export function Branches() {
  const [searchTerm, setSearchTerm] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/branches");
      if (!res.ok) throw new Error("Không thể tải danh sách chi nhánh");
      const data = await res.json();
      const mapped = data.map((b: any) => ({
        ...b,
        id: b.branchCode,
      }));
      setBranches(mapped);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleCreate = async (newData: any) => {
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newData),
      });
      if (!res.ok) throw new Error("Không thể tạo chi nhánh");
      const created = await res.json();
      const mapped = {
        ...created,
        id: created.branchCode,
      };
      setBranches((prev) => [...prev, mapped]);
      setIsCreateOpen(false);
    } catch (err: any) {
      alert(err.message || "Lỗi khi tạo chi nhánh");
    }
  };

  const handleUpdate = async (id: string, updatedData: any) => {
    try {
      const res = await fetch(`/api/branches/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) throw new Error("Không thể cập nhật chi nhánh");
      const updated = await res.json();
      const mapped = {
        ...updated,
        id: updated.branchCode,
      };
      setBranches((prev) => prev.map((b) => (b._id === id ? mapped : b)));
      setEditingBranch(null);
      
      // Update selected branch detail modal if open
      if (selectedBranch && selectedBranch._id === id) {
        setSelectedBranch(mapped);
      }
    } catch (err: any) {
      alert(err.message || "Lỗi khi cập nhật chi nhánh");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/branches/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Không thể xóa chi nhánh");
      setBranches((prev) => prev.filter((b) => b._id !== id));
      setSelectedBranch(null);
    } catch (err: any) {
      alert(err.message || "Lỗi khi xóa chi nhánh");
    }
  };

  const filteredBranches = branches.filter(branch => 
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
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="px-5 py-2.5 bg-[#0057cd] text-white font-bold rounded-xl hover:bg-[#00419e] transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
          >
            <Building2 size={18} />
            Thêm chi nhánh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
          <div className="flex flex-col items-center gap-3">
             <div className="w-8 h-8 border-4 border-slate-200 border-t-[#0057cd] rounded-full animate-spin"></div>
             <p className="text-sm font-semibold text-slate-500">Đang tải danh sách chi nhánh...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center">
          <AlertTriangle size={36} className="mx-auto text-rose-500 mb-2" />
          <h3 className="font-bold text-rose-800">Đã xảy ra lỗi</h3>
          <p className="text-rose-600 text-sm mt-1">{error}</p>
          <button 
             onClick={fetchBranches}
             className="mt-4 px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition-colors"
          >
             Thử lại
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBranches.map(branch => (
            <div 
              key={branch._id || branch.id} 
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer group flex flex-col h-full"
            >
              {/* Card Header Media */}
              <div className="relative h-48 overflow-hidden" onClick={() => setSelectedBranch(branch)}>
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

              {/* Card Body */}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex-1" onClick={() => setSelectedBranch(branch)}>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#0057cd] transition-colors line-clamp-1">{branch.name}</h3>
                  <div className="flex items-start gap-2 text-slate-500 mt-2 text-sm">
                    <MapPin size={16} className="shrink-0 mt-0.5 text-slate-400" />
                    <span className="line-clamp-2 leading-relaxed">{branch.address}</span>
                  </div>
                  
                  <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 content-end">
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

                {/* Card Footer Actions */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setSelectedBranch(branch)}
                    className="flex-1 py-2.5 text-xs font-bold text-[#0057cd] bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors text-center"
                  >
                    Xem chi tiết
                  </button>
                  <button
                    onClick={() => setEditingBranch(branch)}
                    className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-center border border-slate-150"
                  >
                    Chỉnh sửa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {!loading && !error && filteredBranches.length === 0 && (
         <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
            <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">Không tìm thấy chi nhánh</h3>
            <p className="text-slate-500 mt-1">Thử thay đổi từ khóa tìm kiếm của bạn.</p>
         </div>
      )}

      {selectedBranch && (
        <BranchDetailModal 
           branch={selectedBranch} 
           onClose={() => setSelectedBranch(null)} 
           onDelete={handleDelete}
        />
      )}

      {isCreateOpen && (
        <CreateBranchModal 
           onClose={() => setIsCreateOpen(false)} 
           onCreate={handleCreate}
        />
      )}

      {editingBranch && (
        <EditBranchModal 
           branch={editingBranch} 
           onClose={() => setEditingBranch(null)} 
           onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}

function BranchDetailModal({ branch, onClose, onDelete }: { branch: Branch, onClose: () => void, onDelete: (id: string) => void }) {
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
             
             <div className="flex items-center gap-2">
                 <button
                    onClick={() => {
                       if (branch._id && window.confirm("Bạn có chắc chắn muốn xóa chi nhánh này?")) {
                          onDelete(branch._id);
                       }
                    }}
                    className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold rounded-xl text-xs transition-colors border border-rose-100 flex items-center gap-1.5"
                 >
                    Xóa chi nhánh
                 </button>
                 <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors self-start">
                   <X size={24} />
                 </button>
             </div>
          </div>

          <div className="overflow-y-auto p-5 lg:p-6 flex flex-col lg:flex-row gap-6">
             <div className="lg:w-1/3 flex flex-col gap-6">
                {/* Basic Info Details */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                   <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                      <MapPin size={18} className="text-[#0057cd]" /> Thông tin cơ bản
                   </h3>
                   <div className="space-y-4 text-sm">
                      <div>
                         <div className="text-slate-500 uppercase text-[10px] tracking-widest font-bold mb-1">Địa chỉ</div>
                         <div className="font-medium text-slate-800 leading-relaxed">{branch.address}</div>
                         
                         {/* Dynamic Google Maps Embed Widget */}
                         <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 h-40 relative group shadow-sm">
                            <iframe
                               title="Google Maps"
                               width="100%"
                               height="100%"
                               style={{ border: 0 }}
                               loading="lazy"
                               src={`https://maps.google.com/maps?q=${encodeURIComponent(branch.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                            />
                            <a 
                               href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.address)}`}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="absolute inset-0 bg-slate-900/10 hover:bg-slate-900/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                            >
                               <span className="px-3 py-1.5 bg-white text-slate-800 font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5">
                                  Xem trên Google Maps <ChevronRight size={14}/>
                               </span>
                            </a>
                         </div>
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

function CreateBranchModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: any) => void }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [manager, setManager] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<"active" | "maintenance">("active");
  const [image, setImage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !manager.trim() || !contact.trim()) {
      alert("Vui lòng điền đầy đủ các thông tin bắt buộc!");
      return;
    }
    onCreate({
      name,
      address,
      manager,
      contact,
      status,
      image: image.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
       <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
       <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden transform transition-all">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
             <h2 className="text-xl font-bold text-slate-900">Thêm chi nhánh mới</h2>
             <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
             </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tên chi nhánh *</label>
                <input
                   type="text"
                   required
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   placeholder="Nhập tên chi nhánh (VD: VinaPharmacy - CN5)"
                   className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                />
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Địa chỉ *</label>
                <input
                   type="text"
                   required
                   value={address}
                   onChange={(e) => setAddress(e.target.value)}
                   placeholder="Địa chỉ chi nhánh..."
                   className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Quản lý *</label>
                   <input
                      type="text"
                      required
                      value={manager}
                      onChange={(e) => setManager(e.target.value)}
                      placeholder="Người quản lý..."
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Số điện thoại *</label>
                   <input
                      type="text"
                      required
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="Liên hệ..."
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                   />
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Trạng thái</label>
                   <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] bg-white transition-all"
                   >
                      <option value="active">Hoạt động</option>
                      <option value="maintenance">Bảo trì</option>
                   </select>
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hình ảnh (URL)</label>
                   <input
                      type="text"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      placeholder="Tùy chọn..."
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                   />
                </div>
             </div>
             <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                   type="button"
                   onClick={onClose}
                   className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 transition-colors"
                >
                   Hủy
                </button>
                <button
                   type="submit"
                   className="px-5 py-2.5 bg-[#0057cd] text-white font-bold rounded-xl text-sm hover:bg-[#00419e] transition-colors"
                >
                   Lưu chi nhánh
                </button>
             </div>
          </form>
       </div>
    </div>
  );
}

function EditBranchModal({ branch, onClose, onUpdate }: { branch: Branch; onClose: () => void; onUpdate: (id: string, data: any) => void }) {
  const [name, setName] = useState(branch.name);
  const [address, setAddress] = useState(branch.address);
  const [manager, setManager] = useState(branch.manager);
  const [contact, setContact] = useState(branch.contact);
  const [status, setStatus] = useState<"active" | "maintenance">(branch.status);
  const [image, setImage] = useState(branch.image);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !manager.trim() || !contact.trim()) {
      alert("Vui lòng điền đầy đủ các thông tin bắt buộc!");
      return;
    }
    if (branch._id) {
      onUpdate(branch._id, {
        name,
        address,
        manager,
        contact,
        status,
        image,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
       <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
       <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden transform transition-all">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
             <h2 className="text-xl font-bold text-slate-900">Chỉnh sửa thông tin chi nhánh</h2>
             <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
             </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tên chi nhánh *</label>
                <input
                   type="text"
                   required
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                />
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Địa chỉ *</label>
                <input
                   type="text"
                   required
                   value={address}
                   onChange={(e) => setAddress(e.target.value)}
                   className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Quản lý *</label>
                   <input
                      type="text"
                      required
                      value={manager}
                      onChange={(e) => setManager(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Số điện thoại *</label>
                   <input
                      type="text"
                      required
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                   />
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Trạng thái</label>
                   <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] bg-white transition-all"
                   >
                      <option value="active">Hoạt động</option>
                      <option value="maintenance">Bảo trì</option>
                   </select>
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hình ảnh (URL)</label>
                   <input
                      type="text"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                   />
                </div>
             </div>
             <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                   type="button"
                   onClick={onClose}
                   className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 transition-colors"
                >
                   Hủy
                </button>
                <button
                   type="submit"
                   className="px-5 py-2.5 bg-[#0057cd] text-white font-bold rounded-xl text-sm hover:bg-[#00419e] transition-colors"
                >
                   Cập nhật
                </button>
             </div>
          </form>
       </div>
    </div>
  );
}
