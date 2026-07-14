import React from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { QuotaData } from "../../services/purchase/quota.service";

// Import các reusable components đã bóc tách
import { QuotaSummaryCards } from "../../components/quota/QuotaSummaryCards";
import { QuotaFilterBar } from "../../components/quota/QuotaFilterBar";
import { QuotaTable } from "../../components/quota/QuotaTable";
import { QuotaModal } from "../../components/quota/QuotaModal";

// Import custom hook chứa toàn bộ logic
import { useQuotaManagement } from "../../hooks/useQuotaManagement";

export function QuotaManagement() {
  const {
    searchTerm, setSearchTerm,
    branches, summary, loading, error,
    filterBranch, setFilterBranch,
    filterCycle, setFilterCycle,
    isModalOpen, setIsModalOpen,
    editingQuota,
    formBranchId, setFormBranchId,
    formCycle, setFormCycle,
    formBudget, setFormBudget,
    formStatus, setFormStatus,
    formNote, setFormNote,
    formError, formSubmitting,
    getCurrentCycle,
    loadQuotaDataApi,
    openCreateModal,
    openEditModal,
    handleSubmit,
    handleDelete,
    filteredQuotas
  } = useQuotaManagement();

  return (
    <div className="space-y-6 flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hạn mức nhập hàng chi nhánh</h1>
          <p className="text-slate-500 mt-1">Phân bổ và giám sát ngân sách mua hàng của từng chi nhánh theo chu kỳ.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-5 py-2.5 bg-[#0057cd] text-white font-bold rounded-xl hover:bg-[#00419e] transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={18} />
          Phân bổ hạn mức mới
        </button>
      </div>

      {/* Summary Cards */}
      <QuotaSummaryCards summary={summary} />

      {/* Filter and Search Section */}
      <QuotaFilterBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterCycle={filterCycle}
        setFilterCycle={setFilterCycle}
        filterBranch={filterBranch}
        setFilterBranch={setFilterBranch}
        branches={branches}
        getCurrentCycle={getCurrentCycle}
      />

      {/* Main Table */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-[#0057cd] rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-slate-500">Đang tải dữ liệu hạn mức...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center">
          <AlertTriangle size={36} className="mx-auto text-rose-500 mb-2" />
          <h3 className="font-bold text-rose-800">Đã xảy ra lỗi</h3>
          <p className="text-rose-600 text-sm mt-1">{error}</p>
          <button
            onClick={loadQuotaDataApi}
            className="mt-4 px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      ) : (
        <QuotaTable
          filteredQuotas={filteredQuotas}
          openEditModal={openEditModal}
          handleDelete={handleDelete}
        />
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <QuotaModal
          editingQuota={editingQuota}
          formBranchId={formBranchId}
          setFormBranchId={setFormBranchId}
          formCycle={formCycle}
          setFormCycle={setFormCycle}
          formBudget={formBudget}
          setFormBudget={setFormBudget}
          formStatus={formStatus}
          setFormStatus={setFormStatus}
          formNote={formNote}
          setFormNote={setFormNote}
          formError={formError}
          formSubmitting={formSubmitting}
          branches={branches}
          setIsModalOpen={setIsModalOpen}
          handleSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

