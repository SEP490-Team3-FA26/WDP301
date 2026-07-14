import { useState, useEffect } from "react";
import { quotaService, QuotaData, QuotaSummary } from '../services/purchase/quota.service';
import { branchService } from '../services/admin/branch.service';

interface BranchListSelect {
  branchCode: string;
  name: string;
}

export function useQuotaManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [quotas, setQuotas] = useState<QuotaData[]>([]);
  const [branches, setBranches] = useState<BranchListSelect[]>([]);
  const [summary, setSummary] = useState<QuotaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [filterBranch, setFilterBranch] = useState("");
  const [filterCycle, setFilterCycle] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuota, setEditingQuota] = useState<QuotaData | null>(null);

  // Form States
  const [formBranchId, setFormBranchId] = useState("");
  const [formCycle, setFormCycle] = useState("");
  const [formBudget, setFormBudget] = useState("");
  const [formStatus, setFormStatus] = useState("Active");
  const [formNote, setFormNote] = useState("");
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);


  const getCurrentCycle = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  // Bóc tách API Calls
  const fetchBranchesApi = async () => {
    try {
      const data = await branchService.getBranches();
      setBranches(data.map((b: any) => ({
        branchCode: b.branchCode,
        name: b.name
      })));
    } catch (err) {
      console.error("Lỗi lấy danh sách chi nhánh:", err);
    }
  };

  const loadQuotaDataApi = async () => {
    try {
      setLoading(true);
      setError(null);

      const activeCycle = filterCycle || getCurrentCycle();

      const [sumData, listData] = await Promise.all([
        quotaService.getQuotaSummary(activeCycle),
        quotaService.getQuotas({
          branchId: filterBranch || undefined,
          cycle: activeCycle || undefined
        })
      ]);

      setSummary(sumData);
      setQuotas(listData);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Không thể tải dữ liệu hạn mức");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranchesApi();
  }, []);

  useEffect(() => {
    loadQuotaDataApi();
  }, [filterBranch, filterCycle]);

  const openCreateModal = () => {
    setEditingQuota(null);
    setFormBranchId("");
    setFormCycle(getCurrentCycle());
    setFormBudget("");
    setFormStatus("Active");
    setFormNote("");
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (quota: QuotaData) => {
    setEditingQuota(quota);
    setFormBranchId(quota.branchId);
    setFormCycle(quota.cycle);
    setFormBudget(String(quota.totalBudget));
    setFormStatus(quota.status);
    setFormNote(quota.note || "");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formBranchId) return setFormError("Vui lòng chọn chi nhánh!");
    if (!formCycle) return setFormError("Vui lòng nhập chu kỳ (YYYY-MM)!");
    if (!formBudget || Number(formBudget) <= 0) return setFormError("Vui lòng nhập ngân sách hợp lệ (> 0)!");

    const selectedBranch = branches.find(b => b.branchCode === formBranchId);
    const branchName = selectedBranch ? selectedBranch.name : "";

    const payload = {
      branchId: formBranchId,
      branchName,
      cycle: formCycle,
      totalBudget: Number(formBudget),
      status: formStatus,
      note: formNote
    };

    try {
      setFormSubmitting(true);
      if (editingQuota && editingQuota._id) {
        await quotaService.updateQuota(editingQuota._id, payload);
        alert("Yêu cầu cập nhật hạn mức đã được gửi thành công!");
      } else {
        await quotaService.createQuota(payload);
        alert("Yêu cầu phân bổ hạn mức đã được gửi thành công!");
      }
      setIsModalOpen(false);
      // Đợi Kafka xử lý và tải lại sau 1s
      setTimeout(() => {
        loadQuotaDataApi();
      }, 1000);
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || "Đã xảy ra lỗi khi gửi yêu cầu");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa hạn mức phân bổ này?")) return;
    try {
      await quotaService.deleteQuota(id);
      alert("Yêu cầu xóa đã được tiếp nhận!");
      setTimeout(() => {
        loadQuotaDataApi();
      }, 1000);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Lỗi khi xóa hạn mức");
    }
  };

  const filteredQuotas = quotas.filter(q => {
    const branchName = q.branchName || "";
    const note = q.note || "";
    return (
      branchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.branchId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return {
    searchTerm, setSearchTerm,
    quotas, setQuotas,
    branches, setBranches,
    summary, setSummary,
    loading, setLoading,
    error, setError,
    filterBranch, setFilterBranch,
    filterCycle, setFilterCycle,
    isModalOpen, setIsModalOpen,
    editingQuota, setEditingQuota,
    formBranchId, setFormBranchId,
    formCycle, setFormCycle,
    formBudget, setFormBudget,
    formStatus, setFormStatus,
    formNote, setFormNote,
    formError, setFormError,
    formSubmitting, setFormSubmitting,
    getCurrentCycle,
    fetchBranchesApi,
    loadQuotaDataApi,
    openCreateModal,
    openEditModal,
    handleSubmit,
    handleDelete,
    filteredQuotas
  };
}
