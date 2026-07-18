import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Ban, ShieldCheck, Mail, Lock, User as UserIcon, Building2, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { employeeService, Employee } from "../../services/admin/employee.service";
import { branchService } from "../../services/admin/branch.service";

export function Employees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "pharmacist",
    branchId: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empData, branchData] = await Promise.all([
        employeeService.getEmployees(filterRole !== 'all' ? { role: filterRole } : {}),
        branchService.getBranches()
      ]);
      setEmployees(empData);
      setBranches(branchData);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Đã xảy ra lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterRole]);

  const filteredEmployees = employees.filter(emp =>
    emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        email: employee.email,
        password: "", // Leave blank for edit (we don't change password here usually, or if we do it's a separate API. UC-45 is just Admin set default pass on create)
        fullName: employee.fullName,
        role: employee.role,
        branchId: employee.branchId || "",
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        email: "",
        password: "",
        fullName: "",
        role: "pharmacist",
        branchId: "",
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
          branchId: formData.branchId || undefined,
        });
      } else {
        await employeeService.createEmployee({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          role: formData.role,
          branchId: formData.branchId || undefined,
        });
      }
      handleCloseModal();
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Lưu thất bại");
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

  const roleMap: Record<string, { label: string, color: string }> = {
    admin: { label: "Admin", color: "bg-purple-100 text-purple-800" },
    head_branch: { label: "Quản lý chuỗi", color: "bg-blue-100 text-blue-800" },
    warehouse: { label: "Thủ kho", color: "bg-orange-100 text-orange-800" },
    branch: { label: "Quản lý chi nhánh", color: "bg-indigo-100 text-indigo-800" },
    pharmacist: { label: "Dược sĩ", color: "bg-green-100 text-green-800" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Nhân viên</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý tài khoản và phân quyền cho nhân viên</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Thêm Nhân viên
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[200px]"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="all">Tất cả vai trò</option>
          <option value="admin">Admin</option>
          <option value="head_branch">Quản lý chuỗi</option>
          <option value="warehouse">Thủ kho</option>
          <option value="branch">Quản lý chi nhánh</option>
          <option value="pharmacist">Dược sĩ</option>
        </select>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertTriangle className="mr-2" size={20} />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Nhân viên
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Vai trò
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Chi nhánh
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    Không tìm thấy nhân viên nào
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const rMap = roleMap[emp.role] || { label: emp.role, color: "bg-gray-100 text-gray-800" };
                  const branch = branches.find(b => b.branchCode === emp.branchId || b._id === emp.branchId);
                  
                  return (
                    <tr key={emp._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold uppercase">
                            {emp.fullName.charAt(0)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{emp.fullName}</div>
                            <div className="text-sm text-gray-500">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rMap.color}`}>
                          {rMap.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {emp.role === 'branch' || emp.role === 'pharmacist' ? (
                          <div className="text-sm text-gray-900">
                            {branch ? branch.name : (emp.branchId || <span className="text-gray-400 italic">Chưa phân bổ</span>)}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {emp.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
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
                              emp.isActive 
                                ? "text-red-600 hover:bg-red-50" 
                                : "text-green-600 hover:bg-green-50"
                            }`}
                            title={emp.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                          >
                            {emp.isActive ? <Ban size={18} /> : <CheckCircle2 size={18} />}
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

      {/* Modal Cập nhật / Tạo mới */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingEmployee ? "Chỉnh sửa Nhân viên" : "Thêm Nhân viên Mới"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    required
                    disabled={!!editingEmployee}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              {!editingEmployee && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mặc định</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="password"
                      required
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Nhân viên sẽ sử dụng mật khẩu này cho lần đăng nhập đầu tiên.</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    value={formData.role}
                    onChange={e => {
                      const role = e.target.value;
                      setFormData({...formData, role, branchId: (role !== 'branch' && role !== 'pharmacist') ? "" : formData.branchId });
                    }}
                  >
                    <option value="admin">Admin (Toàn quyền)</option>
                    <option value="head_branch">Quản lý Chuỗi</option>
                    <option value="warehouse">Thủ kho Tổng</option>
                    <option value="branch">Quản lý Chi nhánh</option>
                    <option value="pharmacist">Dược sĩ Chi nhánh</option>
                  </select>
                </div>
              </div>

              {(formData.role === 'branch' || formData.role === 'pharmacist') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chi nhánh trực thuộc</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <select
                      required={formData.role === 'branch' || formData.role === 'pharmacist'}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      value={formData.branchId}
                      onChange={e => setFormData({...formData, branchId: e.target.value})}
                    >
                      <option value="">-- Chọn Chi nhánh --</option>
                      {branches.map(b => (
                        <option key={b._id || b.branchCode} value={b.branchCode}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
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
