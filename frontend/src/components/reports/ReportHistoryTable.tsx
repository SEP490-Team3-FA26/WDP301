import React, { useState } from 'react';
import { Search, Filter, Download, MoreHorizontal, FileSpreadsheet, File as FilePdf, RefreshCw, Eye } from 'lucide-react';

interface Report {
  id: string;
  name: string;
  type: string;
  format: string;
  date: string;
  size: string;
  status: string;
  author: string;
  downloadUrl: string;
}

interface ReportHistoryTableProps {
  reports: Report[];
}

export function ReportHistoryTable({ reports }: ReportHistoryTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReports = reports.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const localUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = localUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(localUrl);
    } catch (error) {
      console.error("Lỗi khi tải file:", error);
      window.open(url, '_blank'); // fallback
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm tên báo cáo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
          />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-colors text-sm font-bold w-full sm:w-auto justify-center">
            <Filter size={16} /> Lọc
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Tên báo cáo</th>
              <th className="px-6 py-4">Định dạng</th>
              <th className="px-6 py-4">Ngày tạo</th>
              <th className="px-6 py-4">Người tạo</th>
              <th className="px-6 py-4">Dung lượng</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredReports.map((report) => (
              <tr key={report.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">{report.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{report.id} • {report.type}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    {report.format === 'PDF' ? (
                      <FilePdf size={16} className="text-rose-500" />
                    ) : (
                      <FileSpreadsheet size={16} className="text-emerald-500" />
                    )}
                    <span className="font-semibold text-slate-700">{report.format}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-650">{report.date}</td>
                <td className="px-6 py-4 text-slate-650">
                  <span
                    className={
                      report.author === 'Hệ thống'
                        ? 'px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-medium'
                        : ''
                    }
                  >
                    {report.author}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500 font-mono text-xs">{report.size}</td>
                <td className="px-6 py-4">
                  {report.status === 'Hoàn thành' ? (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded border border-emerald-200">
                      Hoàn thành
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded border border-blue-200 flex items-center gap-1.5 w-max">
                      <RefreshCw size={12} className="animate-spin" /> Đang tạo...
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right text-slate-400">
                  <div className="flex items-center justify-end gap-2 transition-opacity">
                    {report.downloadUrl && report.downloadUrl !== '#' ? (
                      <>
                        <a
                          href={report.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-[#0057cd] hover:bg-blue-50 rounded-lg transition-colors inline-block"
                          title="Xem trên trình duyệt"
                        >
                          <Eye size={18} />
                        </a>
                        <button
                          onClick={() => handleDownload(report.downloadUrl, `${report.id}.pdf`)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors inline-block"
                          title="Tải xuống máy"
                        >
                          <Download size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="p-1.5 text-slate-300 cursor-not-allowed rounded-lg" disabled title="Chưa thể xem">
                          <Eye size={18} />
                        </button>
                        <button className="p-1.5 text-slate-300 cursor-not-allowed rounded-lg" disabled title="Chưa thể tải">
                          <Download size={18} />
                        </button>
                      </>
                    )}
                    <button className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors" title="Thêm">
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
