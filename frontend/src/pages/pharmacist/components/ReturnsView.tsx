import { RefreshCw } from "lucide-react";

export default function ReturnsView() {
  return (
    <div className="h-full flex flex-col xl:flex-row gap-6">
      <div className="flex-1 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center">
        <RefreshCw className="text-slate-300 mb-4" size={48} />
        <h3 className="text-lg font-bold text-slate-800">Chức năng Quản lý Hoàn trả</h3>
        <p className="text-slate-500 text-sm max-w-sm mt-2">
          Xử lý hoàn trả thuốc lỗi, cận hạn hoặc đổi hàng của bệnh nhân dựa trên số hóa đơn gốc.
        </p>
      </div>
    </div>
  );
}
