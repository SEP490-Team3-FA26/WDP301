import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Clock,
  User,
  Shield,
  Monitor,
  Terminal,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  CheckCircle,
  FileSpreadsheet,
  RefreshCw,
  Eye,
  Settings,
  ArrowRight,
  Database,
  ArrowUp
} from 'lucide-react';
import { auditService, AuditLogItem, AuditLogQuery } from '../../services/audit.service';
import { AuditRealtimeProvider, useAuditRealtime } from '../../context/AuditRealtimeProvider';

// Memoized Table Row Component to maximize performance and prevent redundant rerenders of off-viewport logs
const AuditLogRow = React.memo(({
  log,
  isExpanded,
  isNew,
  toggleRow,
  getSeverityBadge,
  getStatusBadge,
  formatLocalTime,
  renderDiff,
  detailTab,
  setDetailTab,
  renderTimeline
}: {
  log: AuditLogItem;
  isExpanded: boolean;
  isNew: boolean;
  toggleRow: (id: string) => void;
  getSeverityBadge: (level: string) => React.ReactNode;
  getStatusBadge: (status: string) => React.ReactNode;
  formatLocalTime: (iso: string) => string;
  renderDiff: (diff: any) => React.ReactNode;
  detailTab: 'diff' | 'session' | 'business';
  setDetailTab: (tab: 'diff' | 'session' | 'business') => void;
  renderTimeline: (type: 'session' | 'business', currentLog: AuditLogItem) => React.ReactNode;
}) => {
  return (
    <>
      <tr
        onClick={() => toggleRow(log.auditEventId)}
        className={`hover:bg-slate-50/80 transition-colors cursor-pointer border-b border-slate-100 ${
          isExpanded ? 'bg-slate-50/50' : ''
        } ${isNew ? 'audit-row-new' : ''}`}
      >
        <td className="px-5 py-4">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </td>
        <td className="px-5 py-4 text-xs font-semibold text-slate-600 whitespace-nowrap">
          {formatLocalTime(log.createdAt)}
        </td>
        <td className="px-5 py-4 whitespace-nowrap">
          <div className="font-bold text-slate-800">{log.username}</div>
          <div className="text-[10px] text-slate-400 font-semibold uppercase">{log.role}</div>
        </td>
        <td className="px-5 py-4">
          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold rounded">
            {log.module}
          </span>
        </td>
        <td className="px-5 py-4">
          <div className="font-semibold text-slate-700">{log.actionName}</div>
          <div className="text-[10px] font-mono text-slate-400">{log.actionCode}</div>
        </td>
        <td className="px-5 py-4 whitespace-nowrap">
          {getSeverityBadge(log.severity)}
        </td>
        <td className="px-5 py-4 whitespace-nowrap">
          {getStatusBadge(log.status)}
        </td>
        <td className="px-5 py-4 text-right">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleRow(log.auditEventId);
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-700 text-xs font-bold rounded-lg transition-all"
          >
            Xem chi tiết
          </button>
        </td>
      </tr>

      {/* Expanded Details Section */}
      {isExpanded && (
        <tr>
          <td colSpan={8} className="px-8 py-5 bg-slate-50/30 border-y border-slate-200/80 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Metadata & Device Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-slate-500" /> Thông tin phiên (Session)
                </h4>

                <div className="p-4 bg-white border border-slate-200/80 rounded-2xl space-y-2 text-xs text-slate-600 shadow-sm">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-400">Correlation ID:</span>
                    <span className="font-mono break-all text-right max-w-[180px] text-slate-500" title={log.correlationId}>{log.correlationId}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-400">Request ID:</span>
                    <span className="font-mono break-all text-right max-w-[180px] text-slate-500">{log.requestId}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-400">Session ID:</span>
                    <span className="font-mono break-all text-right max-w-[180px] text-slate-500">{log.sessionId || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-400">Tác động Thực thể:</span>
                    <span className="font-semibold text-slate-700">{log.entityType || '—'} (ID: {log.entityId || '—'})</span>
                  </div>
                  {log.entityVersion !== null && log.entityVersion !== undefined && (
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-semibold text-slate-400">Phiên bản dữ liệu (Version):</span>
                      <span className="font-extrabold text-slate-700">{log.entityVersion}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-400">IP thực hiện:</span>
                    <span className="font-bold text-slate-700">{log.ip}</span>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pt-2">
                  <Monitor className="w-4 h-4 text-slate-500" /> Thiết bị & Môi trường
                </h4>

                <div className="p-4 bg-white border border-slate-200/80 rounded-2xl space-y-2 text-xs text-slate-600 shadow-sm">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-400">Hệ điều hành (OS):</span>
                    <span className="font-bold text-slate-700">{log.os}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-400">Trình duyệt (Browser):</span>
                    <span className="font-bold text-slate-700">{log.browser}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-400">Thiết bị:</span>
                    <span className="font-bold text-slate-700">{log.device}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-400">Endpoint:</span>
                    <span className="font-mono text-indigo-600 font-bold">{log.method} {log.endpoint}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: State Diff & Timeline Tabs */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex border-b border-slate-200">
                  <button
                    onClick={() => setDetailTab('diff')}
                    className={`px-4 py-2 font-bold text-xs border-b-2 transition-all ${
                      detailTab === 'diff' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    State Diff (Thay đổi)
                  </button>
                  <button
                    onClick={() => setDetailTab('session')}
                    className={`px-4 py-2 font-bold text-xs border-b-2 transition-all ${
                      detailTab === 'session' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Session Timeline
                  </button>
                  <button
                    onClick={() => setDetailTab('business')}
                    className={`px-4 py-2 font-bold text-xs border-b-2 transition-all ${
                      detailTab === 'business' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Business Timeline
                  </button>
                </div>

                <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm min-h-[300px]">
                  {detailTab === 'diff' && (
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs text-slate-400 font-bold mb-1">Tóm tắt sự vụ:</div>
                        <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-700">
                          {log.summary}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-400 font-bold mb-1">Nội dung thay đổi (Diff):</div>
                        {renderDiff(log.diff)}
                      </div>

                      {log.error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-mono overflow-auto max-h-[160px]">
                          <div className="font-bold mb-1">Chi tiết lỗi (Traceback):</div>
                          <pre className="whitespace-pre-wrap">{log.error}</pre>
                        </div>
                      )}

                      {log.payload && (
                        <div>
                          <div className="text-xs text-slate-400 font-bold mb-1">Tham số yêu cầu (Payload Scrubbed):</div>
                          <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-[220px]">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {detailTab === 'session' && renderTimeline('session', log)}
                  {detailTab === 'business' && renderTimeline('business', log)}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
});

// Presentation Component utilizing the context states
function AuditLogsContent() {
  const {
    visibleLogs: logs,
    incomingLogs,
    connectionStatus,
    loading,
    total,
    isScrolledDown,
    setIsScrolledDown,
    fetchLogs,
    flushIncomingLogs
  } = useAuditRealtime();

  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  
  // Filters
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [eventType, setEventType] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Active expanded log details
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [detailTabMap, setDetailTabMap] = useState<Record<string, 'diff' | 'session' | 'business'>>({});

  // Export states
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [exportError, setExportError] = useState<string>('');
  const [exportFile, setExportFile] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const userRole = localStorage.getItem('userRole') || 'admin';

  // Highlight logic states
  const prevVisibleLogsRef = useRef<AuditLogItem[]>([]);
  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());

  // Visual Overview Stats State
  const [stats, setStats] = useState({
    totalCount: 0,
    criticalCount: 0,
    errorCount: 0,
    failureCount: 0
  });

  // Scroll monitoring
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolledDown(window.scrollY > 150);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [setIsScrolledDown]);

  // Flush incoming logs automatically when user scrolls back to top on page 1
  useEffect(() => {
    if (!isScrolledDown && page === 1 && incomingLogs.length > 0) {
      flushIncomingLogs();
    }
  }, [isScrolledDown, page, incomingLogs, flushIncomingLogs]);

  // Track newly added rows to trigger CSS highlighting
  useEffect(() => {
    const prevIds = new Set(prevVisibleLogsRef.current.map(x => x.auditEventId));
    const freshIds: string[] = [];

    // Trigger only if we already loaded initial logs (prevVisibleLogsRef is not empty)
    if (prevVisibleLogsRef.current.length > 0) {
      for (const item of logs) {
        if (!prevIds.has(item.auditEventId)) {
          freshIds.push(item.auditEventId);
        }
      }
    }

    if (freshIds.length > 0) {
      setNewRowIds(prev => {
        const next = new Set(prev);
        freshIds.forEach(id => next.add(id));
        return next;
      });

      // Clear highlights after 2 seconds
      setTimeout(() => {
        setNewRowIds(prev => {
          const next = new Set(prev);
          freshIds.forEach(id => next.delete(id));
          return next;
        });
      }, 2000);
    }

    prevVisibleLogsRef.current = logs;
  }, [logs]);

  // Dynamically update stats totals from visible dataset
  useEffect(() => {
    setStats({
      totalCount: total,
      criticalCount: logs.filter(x => x.severity === 'CRITICAL').length,
      errorCount: logs.filter(x => x.severity === 'ERROR').length,
      failureCount: logs.filter(x => x.status === 'FAILED').length,
    });
  }, [logs, total]);

  const triggerFetch = () => {
    fetchLogs({
      page,
      limit,
      search: search.trim() || undefined,
      role: role || undefined,
      module: moduleFilter || undefined,
      eventType: eventType || undefined,
      severity: severity || undefined,
      status: status || undefined,
    });
  };

  useEffect(() => {
    triggerFetch();
  }, [page, role, moduleFilter, eventType, severity, status]);

  // Handle background export polling
  useEffect(() => {
    if (!exportJobId) return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const job = await auditService.getExportStatus(exportJobId);
        if (job) {
          setExportStatus(job.status);
          if (job.status === 'COMPLETED') {
            setExportFile(job.filename || '');
            setExporting(false);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          } else if (job.status === 'FAILED') {
            setExportError(job.error || 'Export failed');
            setExporting(false);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          }
        }
      } catch (err) {
        console.error('Error polling export job status', err);
      }
    }, 2000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [exportJobId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    triggerFetch();
  };

  const triggerExport = async () => {
    setExporting(true);
    setExportError('');
    setExportFile('');
    setExportStatus('PENDING');

    try {
      const query: AuditLogQuery = {
        search: search.trim() || undefined,
        role: role || undefined,
        module: moduleFilter || undefined,
        eventType: eventType || undefined,
        severity: severity || undefined,
        status: status || undefined,
      };

      const res = await auditService.requestExport(query);
      if (res && res.jobId) {
        setExportJobId(res.jobId);
        setExportStatus(res.status);
      } else {
        setExporting(false);
        setExportError('Không nhận được mã tiến trình xuất.');
      }
    } catch (err: any) {
      setExporting(false);
      setExportError(err.response?.data?.message || 'Có lỗi xảy ra khi yêu cầu xuất dữ liệu.');
    }
  };

  const toggleRow = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const getSeverityBadge = (level: string) => {
    const base = 'px-2 py-0.5 rounded-full text-xs font-bold border ';
    switch (level) {
      case 'CRITICAL':
        return base + 'bg-rose-100 text-rose-800 border-rose-200';
      case 'ERROR':
        return base + 'bg-red-100 text-red-800 border-red-200';
      case 'WARNING':
        return base + 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return base + 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  const getStatusBadge = (stat: string) => {
    const base = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ';
    if (stat === 'SUCCESS') {
      return (
        <span className={base + 'bg-green-50 text-green-700 border border-green-200'}>
          <CheckCircle className="w-3.5 h-3.5" /> Thành công
        </span>
      );
    }
    return (
      <span className={base + 'bg-red-50 text-red-700 border border-red-200'}>
        <AlertOctagon className="w-3.5 h-3.5" /> Thất bại
      </span>
    );
  };

  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 🟢 Live
          </span>
        );
      case 'RECONNECTING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" /> 🟡 Reconnecting...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> 🔴 Offline
          </span>
        );
    }
  };

  const renderDiff = (diff: any) => {
    if (!diff || typeof diff !== 'object') {
      return <div className="text-xs text-slate-400 italic">Không có thay đổi dữ liệu</div>;
    }

    return (
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-2 text-slate-600 font-bold w-1/4">Trường dữ liệu</th>
              <th className="px-4 py-2 text-slate-600 font-bold bg-rose-50/50 text-rose-800 w-3/8">Trước thay đổi (Before)</th>
              <th className="px-4 py-2 text-slate-600 font-bold bg-emerald-50/50 text-emerald-800 w-3/8">Sau thay đổi (After)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono">
            {Object.keys(diff).map((field) => {
              const change = diff[field];
              const beforeVal = typeof change.before === 'object' ? JSON.stringify(change.before) : String(change.before ?? '—');
              const afterVal = typeof change.after === 'object' ? JSON.stringify(change.after) : String(change.after ?? '—');
              return (
                <tr key={field} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2 font-bold text-slate-700 border-r border-slate-100">{field}</td>
                  <td className="px-4 py-2 bg-rose-50/20 text-rose-700 break-all border-r border-slate-100">{beforeVal}</td>
                  <td className="px-4 py-2 bg-emerald-50/20 text-emerald-700 break-all">{afterVal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const formatLocalTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('vi-VN', {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) + ' (GMT+7)';
    } catch (e) {
      return isoString;
    }
  };

  // Timeline render logic for specific Session and Business transaction chains
  const renderTimeline = (type: 'session' | 'business', currentLog: AuditLogItem) => {
    const refId = type === 'session' ? currentLog.sessionId : (currentLog.transactionId || currentLog.correlationId);
    if (!refId) {
      return <div className="text-xs text-slate-400 italic">Không có mã định danh để dựng timeline.</div>;
    }

    const timelineLogs = logs
      .filter(x => type === 'session' ? x.sessionId === refId : (x.transactionId === refId || x.correlationId === refId))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (timelineLogs.length === 0) {
      return <div className="text-xs text-slate-400 italic">Không tìm thấy hoạt động nào liên quan.</div>;
    }

    return (
      <div className="space-y-4 py-2 animate-in fade-in duration-200">
        <div className="relative border-l border-indigo-150 pl-4 space-y-4">
          {timelineLogs.map((item) => {
            const isCurrent = item.auditEventId === currentLog.auditEventId;
            return (
              <div key={item.auditEventId} className="relative">
                {/* Visual Circle Node */}
                <span className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 ${
                  isCurrent ? 'bg-indigo-600 border-indigo-600 ring-4 ring-indigo-50' : 'bg-slate-300 border-white shadow-sm'
                }`} />
                <div className="text-xs">
                  <span className="font-bold text-slate-500">{formatLocalTime(item.createdAt)}</span>
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="font-bold text-slate-800">{item.actionName}</span>
                  <span className="ml-1 text-[10px] font-mono text-slate-400">({item.actionCode})</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{item.summary}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 relative">
      {/* Scroll Preservation Floating Badge */}
      {incomingLogs.length > 0 && isScrolledDown && page === 1 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <button
            onClick={() => {
              flushIncomingLogs();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-full shadow-2xl shadow-emerald-200 border border-emerald-500 transition-all hover:scale-105"
          >
            <ArrowUp className="w-4.5 h-4.5 animate-bounce" />
            Có bản ghi log mới ({incomingLogs.length}). Cuộn lên đầu trang
          </button>
        </div>
      )}

      {/* Title & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Shield className="w-7 h-7 text-indigo-600" />
              Nhật Ký Hệ Thống (Audit Logs)
            </h1>
            {getConnectionStatusBadge()}
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            Ghi nhận vết kiểm toán thời gian thực theo cấu trúc Scope-based Permission.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => {
              setPage(1);
              triggerFetch();
            }}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all shadow-sm"
            title="Tải lại trang"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={triggerExport}
            disabled={exporting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-100 w-full md:w-auto"
          >
            <Download className="w-5 h-5" />
            {exporting ? 'Đang chuẩn bị...' : 'Xuất Gzipped CSV'}
          </button>
        </div>
      </div>

      {/* Export Background Task Widget */}
      {exportStatus && (
        <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-slate-800 text-sm">
                Tiến trình xuất tệp nền (Job ID: {exportJobId?.slice(0, 8)}...)
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                Trạng thái: 
                <span className={`font-bold uppercase ${
                  exportStatus === 'COMPLETED' ? 'text-green-600' : exportStatus === 'FAILED' ? 'text-red-600' : 'text-amber-500'
                }`}>
                  {exportStatus === 'PENDING' && 'Đang chuẩn bị'}
                  {exportStatus === 'PROCESSING' && 'Đang truy vấn & nén dữ liệu...'}
                  {exportStatus === 'COMPLETED' && 'Hoàn thành'}
                  {exportStatus === 'FAILED' && 'Thất bại'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {exportStatus === 'COMPLETED' && exportFile && (
              <a
                href={auditService.getDownloadUrl(exportFile)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg transition-all"
                download
              >
                <Download className="w-4 h-4" /> Tải xuống tệp .csv.gz
              </a>
            )}
            {exportStatus === 'FAILED' && (
              <span className="text-xs font-semibold text-red-600 italic">Lỗi: {exportError}</span>
            )}
            {['PENDING', 'PROCESSING'].includes(exportStatus) && (
              <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" /> Vui lòng chờ...
              </div>
            )}
            <button
              onClick={() => {
                setExportStatus('');
                setExportJobId(null);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Page > 1 Sync Banner */}
      {incomingLogs.length > 0 && page > 1 && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between shadow-sm animate-in slide-in-from-top-4 duration-300">
          <div className="text-xs md:text-sm font-semibold text-indigo-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-500 animate-pulse" />
            Có <span className="font-extrabold text-indigo-600">{incomingLogs.length}</span> logs mới vừa được hệ thống ghi nhận ở trang đầu tiên.
          </div>
          <button
            onClick={() => {
              setPage(1);
              flushIncomingLogs();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md hover:scale-105"
          >
            Quay lại trang 1
          </button>
        </div>
      )}

      {/* Metrics Overviews */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng logs trong hệ thống</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{stats.totalCount}</div>
        </div>
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider text-rose-500">Mức Nguy hiểm (Critical)</div>
          <div className="text-2xl font-black text-rose-600 mt-1">{stats.criticalCount}</div>
        </div>
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider text-red-500">Lỗi nghiêm trọng (Error)</div>
          <div className="text-2xl font-black text-red-600 mt-1">{stats.errorCount}</div>
        </div>
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider text-amber-500">Thao tác thất bại</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{stats.failureCount}</div>
        </div>
      </div>

      {/* Query Filters */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm nhanh logs (Email, Action Code, IP, Tên thực thể, Mô tả...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 pr-4 py-2.5 w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm transition-all outline-none text-slate-700"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all ${
                showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4.5 h-4.5" />
              Bộ lọc nâng cao
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-all"
            >
              Tìm kiếm
            </button>
          </div>
        </form>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
            {/* Filter by Module */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hệ Phân Hệ (Module)</label>
              <select
                value={moduleFilter}
                onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-600 outline-none focus:border-indigo-500"
              >
                <option value="">Tất cả phân hệ</option>
                {userRole === 'admin' && <option value="Branch">Branch (Chi nhánh)</option>}
                <option value="Inventory">Inventory (Kho hàng)</option>
                <option value="Purchase">Purchase (Mua hàng)</option>
                <option value="Voucher">Voucher (Khuyến mãi)</option>
                <option value="Sales">Sales (Bán lẻ)</option>
                <option value="Auth">Auth (Bảo mật)</option>
                <option value="System">System (Hệ thống)</option>
              </select>
            </div>

            {/* Filter by Severity */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mức Độ Cảnh Báo</label>
              <select
                value={severity}
                onChange={(e) => { setPage(1); setSeverity(e.target.value); }}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-600 outline-none focus:border-indigo-500"
              >
                <option value="">Tất cả mức độ</option>
                <option value="INFO">INFO (Thông tin)</option>
                <option value="WARNING">WARNING (Cảnh báo)</option>
                <option value="ERROR">ERROR (Lỗi nghiêm trọng)</option>
                <option value="CRITICAL">CRITICAL (Mối đe dọa)</option>
              </select>
            </div>

            {/* Filter by Event Type */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Loại Nghiệp Vụ</label>
              <select
                value={eventType}
                onChange={(e) => { setPage(1); setEventType(e.target.value); }}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-600 outline-none focus:border-indigo-500"
              >
                <option value="">Tất cả hành động</option>
                <option value="CREATE">CREATE (Tạo mới)</option>
                <option value="UPDATE">UPDATE (Cập nhật)</option>
                <option value="DELETE">DELETE (Xóa bỏ)</option>
                <option value="APPROVE">APPROVE (Duyệt)</option>
                <option value="REJECT">REJECT (Từ chối)</option>
                <option value="READ">READ (Xem/Xuất)</option>
              </select>
            </div>

            {/* Filter by Status */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Trạng Thái Kết Quả</label>
              <select
                value={status}
                onChange={(e) => { setPage(1); setStatus(e.target.value); }}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-600 outline-none focus:border-indigo-500"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="SUCCESS">SUCCESS (Thành công)</option>
                <option value="FAILED">FAILED (Thất bại)</option>
              </select>
            </div>

            {/* Reset filters */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setRole('');
                  setModuleFilter('');
                  setEventType('');
                  setSeverity('');
                  setStatus('');
                  setPage(1);
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-xs transition-all text-center"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            <span className="text-sm font-semibold">Đang nạp dữ liệu kiểm toán...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Database className="w-12 h-12 text-slate-300" />
            <span className="text-sm font-semibold">Không tìm thấy bản ghi log phù hợp với tìm kiếm.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-[11px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 w-10"></th>
                  <th className="px-5 py-3">Thời gian (Local)</th>
                  <th className="px-5 py-3">Người thực hiện</th>
                  <th className="px-5 py-3">Phân hệ</th>
                  <th className="px-5 py-3">Hành động</th>
                  <th className="px-5 py-3">Mức độ</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logs.map((log) => {
                  const isExpanded = expandedLogId === log.auditEventId;
                  const isNew = newRowIds.has(log.auditEventId);
                  const detailTab = detailTabMap[log.auditEventId] || 'diff';

                  return (
                    <AuditLogRow
                      key={log.auditEventId}
                      log={log}
                      isExpanded={isExpanded}
                      isNew={isNew}
                      toggleRow={toggleRow}
                      getSeverityBadge={getSeverityBadge}
                      getStatusBadge={getStatusBadge}
                      formatLocalTime={formatLocalTime}
                      renderDiff={renderDiff}
                      detailTab={detailTab}
                      setDetailTab={(tab) => {
                        setDetailTabMap(prev => ({
                          ...prev,
                          [log.auditEventId]: tab
                        }));
                      }}
                      renderTimeline={renderTimeline}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-slate-500 font-bold">
            Hiển thị {logs.length} trên tổng số {stats.totalCount} bản ghi. Trang {page} / {Math.ceil(stats.totalCount / limit) || 1}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 disabled:bg-slate-100 disabled:opacity-50 text-slate-600 text-xs font-bold rounded-lg transition-all"
            >
              Trước
            </button>
            
            {Array.from({ length: Math.min(5, Math.ceil(stats.totalCount / limit)) }, (_, i) => {
              const startPage = Math.max(1, Math.min(page - 2, Math.ceil(stats.totalCount / limit) - 4));
              const pageNum = startPage + i;
              if (pageNum > Math.ceil(stats.totalCount / limit)) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    page === pageNum
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setPage(Math.min(Math.ceil(stats.totalCount / limit), page + 1))}
              disabled={page >= Math.ceil(stats.totalCount / limit)}
              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 disabled:bg-slate-100 disabled:opacity-50 text-slate-600 text-xs font-bold rounded-lg transition-all"
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrapper component to isolate Context state from the routing layout
export function AuditLogs() {
  return (
    <AuditRealtimeProvider>
      <AuditLogsContent />
    </AuditRealtimeProvider>
  );
}
