import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import api from '../../services/core/api';

interface ReportCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newReport: any) => void;
  userDetails: { branchId: string | null; fullName: string; role: string };
}

export function ReportCreateModal({ isOpen, onClose, onSuccess, userDetails }: ReportCreateModalProps) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'quarter'>('month');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [branchIdInput, setBranchIdInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isAdmin = userDetails.role === 'admin' || userDetails.role === 'head_branch';

  // Set default branch value based on user context
  useEffect(() => {
    if (!isAdmin) {
      setBranchIdInput(userDetails.branchId || '');
    } else {
      setBranchIdInput('all');
    }
  }, [userDetails.branchId, userDetails.role, isAdmin]);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setErrorMessage('');
    setSuccessMessage('');

    // Mở một cửa sổ trống ngay lập tức để tránh bị trình duyệt chặn (Popup Blocker)
    // vì lệnh mở tab mới phải xảy ra đồng bộ ngay sau khi click chuột.
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.title = 'Đang tải báo cáo...';
      newWindow.document.body.innerHTML = '<div style="font-family: system-ui, sans-serif; padding: 30px; text-align: center; color: #475569;">Đang tạo và tải báo cáo từ hệ thống, vui lòng chờ trong giây lát...</div>';
    }

    try {
      let url = `/api/reports/revenue?period=${period}&date=${date}`;
      if (branchIdInput) {
        url += `&branchId=${branchIdInput}`;
      }

      const res = await api.get(url);
      if (res.data && res.data.success) {
        const downloadUrl = res.data.downloadUrl;

        // Use real record from backend if available, otherwise fallback
        let newReport = res.data.record;
        if (!newReport) {
          newReport = {
            id: 'REP-' + Math.floor(100 + Math.random() * 900),
            name: `Báo cáo doanh thu ${
              period === 'day' ? 'ngày' : period === 'week' ? 'tuần' : period === 'month' ? 'tháng' : 'quý'
            } - ${branchIdInput || 'Tất cả'}`,
            type: 'Doanh thu',
            format: 'PDF',
            date: new Date().toLocaleDateString('vi-VN'),
            size: '2.7 KB',
            status: 'Hoàn thành',
            author: userDetails.fullName || 'Quản lý',
            downloadUrl: downloadUrl,
          };
        } else {
          // Format date for frontend consistency
          newReport = {
            ...newReport,
            id: newReport.reportCode,
            date: new Date().toLocaleDateString('vi-VN'),
          };
        }

        setSuccessMessage('Khởi tạo báo cáo doanh thu thành công!');
        onSuccess(newReport);

        // Gắn URL thật vào tab trống đã mở lúc nãy
        if (newWindow) {
          newWindow.location.href = downloadUrl;
        } else {
          // Backup: Nếu trình duyệt vẫn chặn từ trước
          window.location.href = downloadUrl;
        }

        setTimeout(() => {
          onClose();
          setSuccessMessage('');
        }, 1500);
      } else {
        if (newWindow) newWindow.close();
        setErrorMessage('Lấy dữ liệu báo cáo từ máy chủ thất bại.');
      }
    } catch (err: any) {
      if (newWindow) newWindow.close();
      console.error(err);
      setErrorMessage(err.response?.data?.message || err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-850 text-lg">Tạo báo cáo mới</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreateReport} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold border border-rose-200">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-semibold border border-emerald-200">
              {successMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Loại báo cáo
            </label>
            <select
              disabled
              className="w-full px-3.5 py-2.5 bg-slate-150 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 cursor-not-allowed"
            >
              <option>Báo cáo doanh thu (Revenue Report)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Kỳ báo cáo
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-[#0057cd] focus:outline-none"
              >
                <option value="day">Theo ngày</option>
                <option value="week">Theo tuần</option>
                <option value="month">Theo tháng</option>
                <option value="quarter">Theo quý</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Mốc thời gian
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-[#0057cd] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Mã chi nhánh (Branch ID)
            </label>
            <input
              type="text"
              value={branchIdInput}
              onChange={(e) => setBranchIdInput(e.target.value)}
              disabled={!isAdmin}
              className="w-full px-3.5 py-2.5 bg-white disabled:bg-slate-100 border border-slate-200 disabled:text-slate-500 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-[#0057cd] focus:outline-none"
              placeholder="Nhập mã chi nhánh hoặc 'all'"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-4 py-2 bg-[#0057cd] hover:bg-[#00419e] disabled:bg-slate-300 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Đang tạo...
                </>
              ) : (
                'Tạo báo cáo'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
