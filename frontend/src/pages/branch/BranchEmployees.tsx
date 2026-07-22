import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Ban, ShieldCheck, Mail, Lock, User as UserIcon, Building2, CheckCircle2, AlertTriangle, X, Trash2 } from "lucide-react";
import { employeeService, Employee } from "../../services/admin/employee.service";

function getBranchIdFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(window.atob(base64));
    return decoded.branchId || null;
  } catch (e) {
    return null;
  }
}

export function BranchEmployees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentBranchId = getBranchIdFromToken() || "BR-001";

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "pharmacist",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await employeeService.getEmployees({ branchId: currentBranchId });
      setEmployees(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Đã xảy ra lỗi khi tải danh sách nhân viên");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentBranchId]);

  const filteredEmployees = employees.filter(emp =>
    emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        email: employee.email,
        password: "",
        fullName: employee.fullName,
        role: employee.role,
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        email: "",
        password: "",
        fullName: "",
        role: "pharmacist",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await employeeService.updateEmployee(editingEmployee._id, {
          fullName: formData.fullName,
          role: formData.role,
          branchId: currentBranchId,
        });
      } else {
        await employeeService.createEmployee({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          role: formData.role,
          branchId: currentBranchId,
        });
      }
      handleCloseModal();
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Lưu nhân viên thất bại");
    }
  };

  const handleToggleBan = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn thay đổi trạng thái của nhân viên này?")) {
      try {
        await employeeService.toggleBanEmployee(id);
        fetchData();
      } catch (err: any) {
        alert("Thao tác thất bại");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tài khoản nhân viên này? Thao tác không thể hoàn tác.")) {
      try {
        await employeeService.deleteEmployee(id);
        fetchData();
      } catch (err: any) {
        alert("Xóa thất bại");
      }
    }
  };

  const roleMap: Record<string, { label: string; color: string }> = {
    pharmacist: { label: "Dược sĩ Chi nhánh", color: "bg-green-100 text-green-800" },
    branch: { label: "Quản lý Chi nhánh", color: "bg-indigo-100 text-indigo-800" },
  };

  return (
    <div className="space-y-6 flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quản lý Nhân sự Chi nhánh ({currentBranchId})
          </h1>
          <p className="text-slate-500 mt-1">Danh sách dược sĩ và nhân viên làm việc tại chi nhánh hiện tại</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-5 py-2.5 bg-[#0057cd] text-white font-bold rounded-xl hover:bg-[#00419e] transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={18} />
          Cấp Account Nhân viên
        </button>
      </div>

      {/* Filter / Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc email nhân viên..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#0057cd] rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center">
          <AlertTriangle size={36} className="mx-auto text-rose-500 mb-2" />
          <p className="text-rose-600 text-sm font-semibold">{error}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Họ và tên</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Chức vụ</th>
                  <th className="px-6 py-4">Chi nhánh</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      Không tìm thấy nhân viên nào thuộc chi nhánh này.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const roleInfo = roleMap[emp.role] || { label: emp.role, color: "bg-slate-100 text-slate-800" };
                    return (
                      <tr key={emp._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">{emp.fullName}</td>
                        <td className="px-6 py-4 text-slate-600">{emp.email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleInfo.color}`}>
                            {roleInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{emp.branchId || currentBranchId}</td>
                        <td className="px-6 py-4">
                          {emp.isActive ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              Hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                              Đã khóa
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenModal(emp)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleToggleBan(emp._id)}
                              className={`p-2 rounded-lg transition-colors ${
                                emp.isActive ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"
                              }`}
                              title={emp.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                            >
                              {emp.isActive ? <Ban size={18} /> : <CheckCircle2 size={18} />}
                            </button>
                            <button
                              onClick={() => handleDelete(emp._id)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Xóa tài khoản"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Cấp / Chỉnh sửa tài khoản */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden transform transition-all">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                {editingEmployee ? "Cập nhật Nhân viên" : "Cấp Account Nhân viên Chi nhánh"}
              </h2>
              <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    disabled={!!editingEmployee}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] disabled:bg-slate-100"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="VD: duocsi1@vinapharmacy.com"
                  />
                </div>
              </div>

              {!editingEmployee && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mật khẩu mặc định *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      required
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Nhập mật khẩu khởi tạo..."
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Họ và tên *</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="VD: Nguyễn Văn Dược"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Vai trò *</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select
                    required
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] bg-white"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="pharmacist">Dược sĩ Chi nhánh</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Chi nhánh trực thuộc</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    disabled
                    value={currentBranchId}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-100 text-slate-600 font-semibold"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0057cd] text-white rounded-xl font-bold hover:bg-[#00419e] text-sm"
                >
                  {editingEmployee ? "Lưu thay đổi" : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
