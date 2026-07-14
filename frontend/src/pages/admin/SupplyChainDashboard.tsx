import { useState, useEffect, useCallback } from 'react';
import { getSafeStockChain, getAnomalyDetection, SafeStockItem, AnomalyItem } from '../../services/supplyChain.service';
import '../../styles/supply-chain-dashboard.css';

const STATUS_CONFIG = {
  CRITICAL: { label: 'Hết hàng', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: '🔴' },
  LOW: { label: 'Dưới an toàn', color: '#f97316', bg: 'rgba(249,115,22,0.12)', icon: '🟠' },
  SAFE: { label: 'An toàn', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', icon: '🟢' },
  OVERSTOCK: { label: 'Dư thừa', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: '🔵' },
};

const SEVERITY_CONFIG = {
  HIGH: { label: 'Cao', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  MEDIUM: { label: 'Trung bình', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
};

const ANOMALY_TYPE_CONFIG = {
  SPIKE_EXPORT: { label: 'Xuất đột biến', icon: '⬆️' },
  UNUSUAL_LOW: { label: 'Xuất bất thường thấp', icon: '⬇️' },
  LARGE_ADJUSTMENT: { label: 'Điều chỉnh lớn', icon: '⚠️' },
};

function StockBar({ current, safety, rop, eoq }: { current: number; safety: number; rop: number; eoq: number }) {
  const max = Math.max(current, eoq * 1.5, rop * 1.5, 10);
  const pct = (v: number) => Math.min(100, Math.round((v / max) * 100));
  return (
    <div className="scd-stock-bar-wrap">
      <div className="scd-stock-bar-track">
        <div className="scd-stock-bar-fill" style={{ width: `${pct(current)}%`, background: current <= 0 ? '#ef4444' : current < safety ? '#f97316' : current < rop ? '#eab308' : '#22c55e' }} />
        <div className="scd-stock-bar-marker" style={{ left: `${pct(safety)}%` }} title={`Safety Stock: ${safety}`} />
        <div className="scd-stock-bar-marker scd-rop" style={{ left: `${pct(rop)}%` }} title={`ROP: ${rop}`} />
      </div>
      <div className="scd-stock-bar-labels">
        <span>0</span>
        <span className="scd-bar-ss">SS:{safety}</span>
        <span className="scd-bar-rop">ROP:{rop}</span>
        <span>EOQ:{eoq}</span>
      </div>
    </div>
  );
}

function DetailDrawer({ item, onClose }: { item: SafeStockItem; onClose: () => void }) {
  const cfg = STATUS_CONFIG[item.stockStatus];
  return (
    <div className="scd-drawer-overlay" onClick={onClose}>
      <div className="scd-drawer" onClick={e => e.stopPropagation()}>
        <button className="scd-drawer-close" onClick={onClose}>✕</button>
        <div className="scd-drawer-header">
          <span className="scd-drawer-icon">{cfg.icon}</span>
          <div>
            <h2 className="scd-drawer-title">{item.medicineName}</h2>
            <p className="scd-drawer-sub">{item.category} · {item.unit}</p>
          </div>
          <span className="scd-status-badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
        </div>
        <div className="scd-drawer-body">
          <div className="scd-drawer-section">
            <h3>📊 Tồn kho hiện tại vs Ngưỡng</h3>
            <StockBar current={item.currentStock} safety={item.thresholds.safetyStock} rop={item.thresholds.reorderPoint} eoq={item.thresholds.eoq} />
            <div className="scd-grid-3">
              <div className="scd-metric-card red"><div className="scd-metric-val">{item.thresholds.safetyStock}</div><div className="scd-metric-lbl">🔴 Safety Stock</div></div>
              <div className="scd-metric-card orange"><div className="scd-metric-val">{item.thresholds.reorderPoint}</div><div className="scd-metric-lbl">🟡 Reorder Point</div></div>
              <div className="scd-metric-card blue"><div className="scd-metric-val">{item.thresholds.eoq}</div><div className="scd-metric-lbl">🔵 EOQ</div></div>
            </div>
          </div>
          <div className="scd-drawer-section">
            <h3>📈 Phân tích Nhu cầu</h3>
            <div className="scd-grid-3">
              <div className="scd-metric-card"><div className="scd-metric-val">{item.demand.totalExported}</div><div className="scd-metric-lbl">Tổng xuất kỳ</div></div>
              <div className="scd-metric-card"><div className="scd-metric-val">{item.demand.avgDailyDemand}</div><div className="scd-metric-lbl">TB/ngày (d̄)</div></div>
              <div className="scd-metric-card"><div className="scd-metric-val">{item.demand.stdDevDemand}</div><div className="scd-metric-lbl">Độ lệch chuẩn (σ)</div></div>
            </div>
          </div>
          <div className="scd-drawer-section">
            <h3>🔄 Vòng quay tồn kho</h3>
            <div className="scd-grid-3">
              <div className="scd-metric-card"><div className="scd-metric-val">{item.turnover.inventoryTurnoverRate}x</div><div className="scd-metric-lbl">Vòng quay</div></div>
              <div className="scd-metric-card"><div className="scd-metric-val">{item.turnover.daysInInventory}d</div><div className="scd-metric-lbl">Số ngày tồn (DSI)</div></div>
              <div className="scd-metric-card"><div className="scd-metric-val">{item.turnover.avgInventory}</div><div className="scd-metric-lbl">Tồn kho TB</div></div>
            </div>
          </div>
          {item.branchBreakdown.length > 0 && (
            <div className="scd-drawer-section">
              <h3>🏪 Chi tiết theo Chi nhánh / Lô</h3>
              <div className="scd-branch-table">
                <table>
                  <thead><tr><th>Chi nhánh</th><th>Lô hàng</th><th>Tồn</th><th>HSD</th></tr></thead>
                  <tbody>
                    {item.branchBreakdown.map((b, i) => (
                      <tr key={i}>
                        <td>{b.branchId}</td>
                        <td>{b.batchNo}</td>
                        <td><strong>{b.stock}</strong></td>
                        <td>{new Date(b.expDate).toLocaleDateString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="scd-drawer-section">
            <h3>💡 Khuyến nghị</h3>
            <div className="scd-recommendation" style={{ borderColor: cfg.color, background: cfg.bg }}>
              {item.stockStatus === 'CRITICAL' && <><strong>🚨 Đặt hàng khẩn cấp!</strong> Tạo phiếu đề xuất ngay với ưu tiên cao. EOQ gợi ý: <strong>{item.thresholds.eoq} {item.unit}</strong></>}
              {item.stockStatus === 'LOW' && <><strong>⚠️ Cần đặt hàng sớm.</strong> Tồn kho dưới mức an toàn. Cần đặt ít nhất <strong>{item.thresholds.eoq} {item.unit}</strong></>}
              {item.stockStatus === 'SAFE' && item.currentStock < item.thresholds.reorderPoint && <><strong>📋 Chuẩn bị đặt hàng.</strong> Tồn kho sắp chạm ROP. Gợi ý đặt <strong>{item.thresholds.eoq} {item.unit}</strong> trong 1-2 ngày tới.</>}
              {item.stockStatus === 'SAFE' && item.currentStock >= item.thresholds.reorderPoint && <><strong>✅ Tồn kho ổn định.</strong> Không cần hành động. Theo dõi thêm.</>}
              {item.stockStatus === 'OVERSTOCK' && <><strong>📦 Tồn kho dư thừa.</strong> Giảm đặt hàng, ưu tiên bán hàng. Xem xét điều chuyển sang chi nhánh khác.</>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SupplyChainDashboard() {
  const [activeTab, setActiveTab] = useState<'uc30' | 'uc37'>('uc30');

  // UC-30 state
  const [stockData, setStockData] = useState<SafeStockItem[]>([]);
  const [stockTotal, setStockTotal] = useState(0);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockPage, setStockPage] = useState(1);
  const [stockFilter, setStockFilter] = useState('ALL');
  const [serviceLevel, setServiceLevel] = useState(0.95);
  const [periodDays, setPeriodDays] = useState(30);
  const [searchText, setSearchText] = useState('');
  const [selectedItem, setSelectedItem] = useState<SafeStockItem | null>(null);

  // UC-37 state
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [anomalySummary, setAnomalySummary] = useState<any>(null);
  const [anomalyLoading, setAnomalyLoading] = useState(false);
  const [anomalyPeriod, setAnomalyPeriod] = useState(60);
  const [zScore, setZScore] = useState(3);
  const [anomalyFilter, setAnomalyFilter] = useState('ALL');

  const fetchStockData = useCallback(async (page = 1) => {
    setStockLoading(true);
    try {
      const res = await getSafeStockChain({ serviceLevel, periodDays, page, limit: 20 });
      setStockData(res.data);
      setStockTotal(res.total);
      setStockPage(page);
    } catch (e) { console.error(e); }
    finally { setStockLoading(false); }
  }, [serviceLevel, periodDays]);

  const fetchAnomalies = useCallback(async () => {
    setAnomalyLoading(true);
    try {
      const res = await getAnomalyDetection({ periodDays: anomalyPeriod, zScoreThreshold: zScore });
      setAnomalies(res.data);
      setAnomalySummary(res.summary);
    } catch (e) { console.error(e); }
    finally { setAnomalyLoading(false); }
  }, [anomalyPeriod, zScore]);

  useEffect(() => { if (activeTab === 'uc30') fetchStockData(1); }, [activeTab, fetchStockData]);
  useEffect(() => { if (activeTab === 'uc37') fetchAnomalies(); }, [activeTab, fetchAnomalies]);

  const filteredStock = stockData.filter(item => {
    if (stockFilter !== 'ALL' && item.stockStatus !== stockFilter) return false;
    if (searchText && !item.medicineName.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  const filteredAnomalies = anomalies.filter(a => {
    if (anomalyFilter === 'HIGH' && a.severity !== 'HIGH') return false;
    if (anomalyFilter === 'SPIKE_EXPORT' && a.anomalyType !== 'SPIKE_EXPORT') return false;
    if (anomalyFilter === 'LARGE_ADJUSTMENT' && a.anomalyType !== 'LARGE_ADJUSTMENT') return false;
    return true;
  });

  const stockSummary = {
    CRITICAL: stockData.filter(d => d.stockStatus === 'CRITICAL').length,
    LOW: stockData.filter(d => d.stockStatus === 'LOW').length,
    SAFE: stockData.filter(d => d.stockStatus === 'SAFE').length,
    OVERSTOCK: stockData.filter(d => d.stockStatus === 'OVERSTOCK').length,
  };

  return (
    <div className="scd-root">
      {/* ─── HEADER ─── */}
      <div className="scd-header">
        <div className="scd-header-left">
          <div className="scd-header-icon">⛓️</div>
          <div>
            <h1 className="scd-title">Supply Chain Intelligence</h1>
            <p className="scd-subtitle">Giám sát tồn kho & phát hiện bất thường toàn chuỗi theo thời gian thực</p>
          </div>
        </div>
        <div className="scd-header-badges">
          <span className="scd-badge-live">🟢 LIVE</span>
          <span className="scd-badge-algo">⚗️ Z-Score / 3-Sigma</span>
        </div>
      </div>

      {/* ─── TABS ─── */}
      <div className="scd-tabs">
        <button className={`scd-tab ${activeTab === 'uc30' ? 'active' : ''}`} onClick={() => setActiveTab('uc30')}>
          📦 UC-30 · Tồn kho Real-time & An toàn
          {stockSummary.CRITICAL > 0 && <span className="scd-tab-badge red">{stockSummary.CRITICAL}</span>}
        </button>
        <button className={`scd-tab ${activeTab === 'uc37' ? 'active' : ''}`} onClick={() => setActiveTab('uc37')}>
          🔍 UC-37 · Phát hiện Bất thường
          {anomalySummary?.high > 0 && <span className="scd-tab-badge red">{anomalySummary.high}</span>}
        </button>
      </div>

      {/* ══════════════ UC-30 TAB ══════════════ */}
      {activeTab === 'uc30' && (
        <div className="scd-tab-content">
          {/* Summary Cards */}
          <div className="scd-summary-grid">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <div key={key} className={`scd-summary-card ${stockFilter === key ? 'active' : ''}`}
                style={{ borderColor: stockFilter === key ? cfg.color : 'transparent' }}
                onClick={() => setStockFilter(stockFilter === key ? 'ALL' : key)}>
                <div className="scd-summary-icon">{cfg.icon}</div>
                <div className="scd-summary-count" style={{ color: cfg.color }}>{stockSummary[key as keyof typeof stockSummary]}</div>
                <div className="scd-summary-label">{cfg.label}</div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="scd-controls">
            <input className="scd-search" placeholder="🔍 Tìm kiếm thuốc..." value={searchText} onChange={e => setSearchText(e.target.value)} />
            <div className="scd-control-group">
              <label>Mức phục vụ</label>
              <select value={serviceLevel} onChange={e => setServiceLevel(Number(e.target.value))}>
                <option value={0.90}>90%</option>
                <option value={0.95}>95% (Khuyến nghị)</option>
                <option value={0.98}>98%</option>
                <option value={0.99}>99%</option>
              </select>
            </div>
            <div className="scd-control-group">
              <label>Kỳ phân tích</label>
              <select value={periodDays} onChange={e => setPeriodDays(Number(e.target.value))}>
                <option value={7}>7 ngày</option>
                <option value={30}>30 ngày</option>
                <option value={60}>60 ngày</option>
                <option value={90}>90 ngày</option>
              </select>
            </div>
            <button className="scd-btn-refresh" onClick={() => fetchStockData(1)} disabled={stockLoading}>
              {stockLoading ? '⏳ Đang tính...' : '🔄 Tính lại'}
            </button>
          </div>

          {/* Table */}
          <div className="scd-table-wrap">
            {stockLoading ? (
              <div className="scd-loading"><div className="scd-spinner" /><p>Đang tính toán tồn kho an toàn toàn chuỗi...</p></div>
            ) : (
              <>
                <table className="scd-table">
                  <thead>
                    <tr>
                      <th>Thuốc</th>
                      <th>Tồn hiện tại</th>
                      <th>Thanh ngưỡng</th>
                      <th>Safety Stock</th>
                      <th>ROP</th>
                      <th>EOQ</th>
                      <th>TB/ngày</th>
                      <th>Vòng quay</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.length === 0 ? (
                      <tr><td colSpan={9} className="scd-empty">Không có dữ liệu</td></tr>
                    ) : filteredStock.map(item => {
                      const cfg = STATUS_CONFIG[item.stockStatus];
                      return (
                        <tr key={item.medicineId} className="scd-row" onClick={() => setSelectedItem(item)}>
                          <td>
                            <div className="scd-med-name">{item.medicineName}</div>
                            <div className="scd-med-cat">{item.category}</div>
                          </td>
                          <td>
                            <span className="scd-stock-num" style={{ color: cfg.color }}>
                              {item.currentStock} <small>{item.unit}</small>
                            </span>
                          </td>
                          <td><StockBar current={item.currentStock} safety={item.thresholds.safetyStock} rop={item.thresholds.reorderPoint} eoq={item.thresholds.eoq} /></td>
                          <td className="scd-td-num red">{item.thresholds.safetyStock}</td>
                          <td className="scd-td-num orange">{item.thresholds.reorderPoint}</td>
                          <td className="scd-td-num blue">{item.thresholds.eoq}</td>
                          <td className="scd-td-num">{item.demand.avgDailyDemand}</td>
                          <td className="scd-td-num">{item.turnover.inventoryTurnoverRate}x</td>
                          <td>
                            <span className="scd-status-badge" style={{ background: cfg.bg, color: cfg.color }}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {stockTotal > 20 && (
                  <div className="scd-pagination">
                    <button disabled={stockPage <= 1} onClick={() => fetchStockData(stockPage - 1)}>← Trước</button>
                    <span>Trang {stockPage} / {Math.ceil(stockTotal / 20)} · Tổng {stockTotal} thuốc</span>
                    <button disabled={stockPage >= Math.ceil(stockTotal / 20)} onClick={() => fetchStockData(stockPage + 1)}>Tiếp →</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ UC-37 TAB ══════════════ */}
      {activeTab === 'uc37' && (
        <div className="scd-tab-content">
          {/* Anomaly Summary */}
          {anomalySummary && (
            <div className="scd-anomaly-summary">
              <div className="scd-anomaly-stat high"><span className="scd-anom-val">{anomalySummary.high}</span><span>🔴 Nghiêm trọng</span></div>
              <div className="scd-anomaly-stat medium"><span className="scd-anom-val">{anomalySummary.medium}</span><span>🟠 Trung bình</span></div>
              <div className="scd-anomaly-stat spike"><span className="scd-anom-val">{anomalySummary.spikeExport}</span><span>⬆️ Xuất đột biến</span></div>
              <div className="scd-anomaly-stat adj"><span className="scd-anom-val">{anomalySummary.largeAdjustment}</span><span>⚠️ Điều chỉnh lớn</span></div>
            </div>
          )}

          {/* Controls */}
          <div className="scd-controls">
            <div className="scd-filter-tabs">
              {[['ALL', '🔍 Tất cả'], ['HIGH', '🔴 Cao'], ['SPIKE_EXPORT', '⬆️ Xuất đột biến'], ['LARGE_ADJUSTMENT', '⚠️ Điều chỉnh lớn']].map(([val, label]) => (
                <button key={val} className={`scd-filter-tab ${anomalyFilter === val ? 'active' : ''}`} onClick={() => setAnomalyFilter(val)}>{label}</button>
              ))}
            </div>
            <div className="scd-control-group">
              <label>Kỳ phân tích</label>
              <select value={anomalyPeriod} onChange={e => setAnomalyPeriod(Number(e.target.value))}>
                <option value={30}>30 ngày</option>
                <option value={60}>60 ngày</option>
                <option value={90}>90 ngày</option>
              </select>
            </div>
            <div className="scd-control-group">
              <label>Ngưỡng Z-Score (σ)</label>
              <select value={zScore} onChange={e => setZScore(Number(e.target.value))}>
                <option value={2}>2σ (Nhạy)</option>
                <option value={3}>3σ (Chuẩn)</option>
                <option value={4}>4σ (Nghiêm ngặt)</option>
              </select>
            </div>
            <button className="scd-btn-refresh" onClick={fetchAnomalies} disabled={anomalyLoading}>
              {anomalyLoading ? '⏳ Đang phân tích...' : '🔍 Phân tích lại'}
            </button>
          </div>

          {/* Anomaly Cards */}
          {anomalyLoading ? (
            <div className="scd-loading"><div className="scd-spinner" /><p>Đang quét bất thường bằng thuật toán Z-Score / 3-Sigma...</p></div>
          ) : filteredAnomalies.length === 0 ? (
            <div className="scd-no-anomaly">
              <div className="scd-no-anomaly-icon">✅</div>
              <h3>Không phát hiện bất thường</h3>
              <p>Tất cả giao dịch tồn kho đang trong ngưỡng bình thường (Z-Score &lt; {zScore}σ)</p>
            </div>
          ) : (
            <div className="scd-anomaly-feed">
              {filteredAnomalies.map(a => {
                const sev = SEVERITY_CONFIG[a.severity];
                const type = ANOMALY_TYPE_CONFIG[a.anomalyType];
                return (
                  <div key={a.id} className="scd-anomaly-card" style={{ borderLeftColor: sev.color }}>
                    <div className="scd-anomaly-card-header">
                      <div className="scd-anomaly-type-badge" style={{ background: sev.bg, color: sev.color }}>
                        {type.icon} {type.label}
                      </div>
                      <span className="scd-severity-badge" style={{ background: sev.bg, color: sev.color }}>{sev.label}</span>
                      <span className="scd-anomaly-time">{new Date(a.detectedAt).toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="scd-anomaly-card-body">
                      <h4 className="scd-anomaly-med">{a.medicineName}</h4>
                      <p className="scd-anomaly-desc">{a.description}</p>
                      <div className="scd-anomaly-stats-row">
                        <div className="scd-anom-stat-chip">
                          <span className="scd-anom-chip-label">Z-Score</span>
                          <span className="scd-anom-chip-val" style={{ color: sev.color }}>{a.statistics.zScore}σ</span>
                        </div>
                        <div className="scd-anom-stat-chip">
                          <span className="scd-anom-chip-label">TB xuất/ngày</span>
                          <span className="scd-anom-chip-val">{a.statistics.avgDailyExport}</span>
                        </div>
                        <div className="scd-anom-stat-chip">
                          <span className="scd-anom-chip-label">Độ lệch chuẩn σ</span>
                          <span className="scd-anom-chip-val">{a.statistics.stdDev}</span>
                        </div>
                        <div className="scd-anom-stat-chip">
                          <span className="scd-anom-chip-label">Ngưỡng trên</span>
                          <span className="scd-anom-chip-val red">{a.statistics.upperThreshold}</span>
                        </div>
                      </div>
                      <div className="scd-anomaly-card-footer">
                        <span>👤 {a.performedBy}</span>
                        <span>📦 SL: <strong style={{ color: a.quantityChange < 0 ? '#ef4444' : '#22c55e' }}>{a.quantityChange > 0 ? '+' : ''}{a.quantityChange}</strong></span>
                        {a.referenceId && <span>📋 Ref: {a.referenceId.slice(-8)}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Detail Drawer UC-30 */}
      {selectedItem && <DetailDrawer item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </div>
  );
}
