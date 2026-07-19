import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Sparkles, 
  Clock, 
  ChevronRight, 
  X, 
  Settings, 
  AlertCircle, 
  MapPin, 
  Activity, 
  Building2, 
  Package, 
  DollarSign,
  AlertTriangle,
  ArrowLeftRight,
  RefreshCw,
  Layers,
  FileText,
  UserCheck,
  CheckCircle2,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { getSafeStockChain, getAnomalyDetection, SafeStockItem, AnomalyItem } from '../../services/supplyChain.service';
import { branchService } from '../../services/admin/branch.service';
import '../../styles/supply-chain-dashboard.css';

// ── CONFIG FOR STATUS BADGES ──
const STATUS_CONFIG = {
  CRITICAL: { label: 'Hết hàng', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', class: 'red' },
  LOW: { label: 'Dưới mức an toàn', color: '#f97316', bg: 'rgba(249,115,22,0.08)', class: 'orange' },
  SAFE: { label: 'An toàn', color: '#16a34a', bg: 'rgba(22,163,74,0.08)', class: 'green' },
  OVERSTOCK: { label: 'Dư thừa', color: '#1d4ed8', bg: 'rgba(29,78,216,0.08)', class: 'blue' },
};

// ── FIXED COORDINATES FOR HCMC MAP BRANCHES ──
interface MapBranch {
  id: string;
  name: string;
  x: number;
  y: number;
  district: string;
}

const BRANCHES_GEOGRAPHY: MapBranch[] = [
  { id: 'BR-001', name: 'Chi nhánh Quận 1 - HQ', x: 260, y: 190, district: 'Quận 1' },
  { id: 'BR-002', name: 'Chi nhánh Quận 7 - Midtown', x: 300, y: 290, district: 'Quận 7' },
  { id: 'BR-003', name: 'Bình Thạnh Central', x: 280, y: 120, district: 'Bình Thạnh' },
  { id: 'BR-004', name: 'Chi nhánh Quận 2 - Villa', x: 370, y: 160, district: 'Quận 2' },
  { id: 'BR-005', name: 'Chi nhánh Quận 10', x: 190, y: 200, district: 'Quận 10' },
  { id: 'BR-006', name: 'Chi nhánh Thủ Đức', x: 380, y: 70, district: 'Thủ Đức' },
  { id: 'BR-007', name: 'Chi nhánh Gò Vấp', x: 170, y: 90, district: 'Gò Vấp' },
  { id: 'BR-008', name: 'Chi nhánh Tân Bình', x: 140, y: 140, district: 'Tân Bình' },
];

const DEFAULT_COORDS = [
  { x: 260, y: 190 },
  { x: 300, y: 290 },
  { x: 280, y: 120 },
  { x: 370, y: 160 },
  { x: 190, y: 200 },
  { x: 380, y: 70 },
  { x: 170, y: 90 },
  { x: 140, y: 140 },
];

// ── RICH PHARMACEUTICAL MOCK DATA FALLBACKS ──
const MOCK_MEDICINES: SafeStockItem[] = [
  {
    medicineId: 'PHA-88210',
    medicineName: 'Amoxicillin 500mg (Cap)',
    category: 'Kháng sinh',
    unit: 'Viên',
    currentStock: 0,
    stockStatus: 'CRITICAL',
    demand: { totalExported: 4500, avgDailyDemand: 150, stdDevDemand: 25 },
    leadTime: { avgDays: 5, stdDevDays: 1.2 },
    turnover: { openingStock: 140, closingStock: 0, avgInventory: 70, inventoryTurnoverRate: 34.6, daysInInventory: 10.5 },
    thresholds: { safetyStock: 80, reorderPoint: 200, eoq: 500, serviceLevel: '95%' },
    branchBreakdown: [
      { branchId: 'BR-001', batchNo: 'LOT-AMX-01', stock: 0, expDate: '2027-08-22' },
      { branchId: 'BR-002', batchNo: 'LOT-AMX-02', stock: 0, expDate: '2027-09-15' }
    ]
  },
  {
    medicineId: 'PHA-44102',
    medicineName: 'Paracetamol 500mg',
    category: 'Giảm đau & Hạ sốt',
    unit: 'Viên',
    currentStock: 12,
    stockStatus: 'LOW',
    demand: { totalExported: 9000, avgDailyDemand: 300, stdDevDemand: 45 },
    leadTime: { avgDays: 3, stdDevDays: 0.8 },
    turnover: { openingStock: 250, closingStock: 12, avgInventory: 131, inventoryTurnoverRate: 72.0, daysInInventory: 5.1 },
    thresholds: { safetyStock: 120, reorderPoint: 350, eoq: 1000, serviceLevel: '95%' },
    branchBreakdown: [
      { branchId: 'BR-003', batchNo: 'LOT-PCT-05', stock: 12, expDate: '2026-11-15' }
    ]
  },
  {
    medicineId: 'PHA-99321',
    medicineName: 'Vitamin C 1000mg Effervescent',
    category: 'Vitamin & Thực phẩm chức năng',
    unit: 'Tuýp',
    currentStock: 850,
    stockStatus: 'SAFE',
    demand: { totalExported: 1200, avgDailyDemand: 40, stdDevDemand: 8 },
    leadTime: { avgDays: 7, stdDevDays: 1.5 },
    turnover: { openingStock: 900, closingStock: 850, avgInventory: 875, inventoryTurnoverRate: 1.37, daysInInventory: 266 },
    thresholds: { safetyStock: 30, reorderPoint: 80, eoq: 200, serviceLevel: '95%' },
    branchBreakdown: [
      { branchId: 'BR-001', batchNo: 'LOT-VTC-01', stock: 450, expDate: '2027-12-01' },
      { branchId: 'BR-004', batchNo: 'LOT-VTC-02', stock: 400, expDate: '2027-12-15' }
    ]
  },
  {
    medicineId: 'PHA-22019',
    medicineName: 'Ibuprofen 200mg',
    category: 'Giảm đau & Hạ sốt',
    unit: 'Viên',
    currentStock: 3000,
    stockStatus: 'OVERSTOCK',
    demand: { totalExported: 2400, avgDailyDemand: 80, stdDevDemand: 12 },
    leadTime: { avgDays: 5, stdDevDays: 1.1 },
    turnover: { openingStock: 3200, closingStock: 3000, avgInventory: 3100, inventoryTurnoverRate: 0.77, daysInInventory: 474 },
    thresholds: { safetyStock: 40, reorderPoint: 120, eoq: 400, serviceLevel: '95%' },
    branchBreakdown: [
      { branchId: 'BR-005', batchNo: 'LOT-IBU-01', stock: 1500, expDate: '2027-06-10' },
      { branchId: 'BR-006', batchNo: 'LOT-IBU-02', stock: 1500, expDate: '2027-06-25' }
    ]
  },
  {
    medicineId: 'PHA-10492',
    medicineName: 'Augmentin 1g',
    category: 'Kháng sinh',
    unit: 'Viên',
    currentStock: 0,
    stockStatus: 'CRITICAL',
    demand: { totalExported: 1800, avgDailyDemand: 60, stdDevDemand: 10 },
    leadTime: { avgDays: 6, stdDevDays: 1.3 },
    turnover: { openingStock: 80, closingStock: 0, avgInventory: 40, inventoryTurnoverRate: 37.9, daysInInventory: 9.6 },
    thresholds: { safetyStock: 45, reorderPoint: 120, eoq: 300, serviceLevel: '95%' },
    branchBreakdown: [
      { branchId: 'BR-002', batchNo: 'LOT-AUG-01', stock: 0, expDate: '2026-11-20' }
    ]
  },
  {
    medicineId: 'PHA-55102',
    medicineName: 'Decolgen Forte',
    category: 'Trị cảm cúm',
    unit: 'Viên',
    currentStock: 400,
    stockStatus: 'SAFE',
    demand: { totalExported: 6000, avgDailyDemand: 200, stdDevDemand: 30 },
    leadTime: { avgDays: 4, stdDevDays: 0.9 },
    turnover: { openingStock: 450, closingStock: 400, avgInventory: 425, inventoryTurnoverRate: 14.1, daysInInventory: 25.8 },
    thresholds: { safetyStock: 100, reorderPoint: 250, eoq: 600, serviceLevel: '95%' },
    branchBreakdown: [
      { branchId: 'BR-008', batchNo: 'LOT-DEC-03', stock: 250, expDate: '2028-02-15' },
      { branchId: 'BR-001', batchNo: 'LOT-DEC-04', stock: 150, expDate: '2028-03-01' }
    ]
  }
];

const MOCK_ANOMALIES: AnomalyItem[] = [
  {
    id: 'ANOM-001',
    medicineId: 'PHA-44102',
    medicineName: 'Paracetamol 500mg',
    category: 'Giảm đau & Hạ sốt',
    anomalyType: 'SPIKE_EXPORT',
    severity: 'HIGH',
    transactionType: 'EXPORT',
    quantityChange: -1200,
    detectedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    referenceId: 'TX-9988221',
    referenceType: 'SALES_BILL',
    performedBy: 'Dược sĩ Đạt Nguyễn',
    statistics: { avgDailyExport: 300, stdDev: 45, zScore: 5.2, upperThreshold: 435, lowerThreshold: 165 },
    description: 'Lượng xuất kho tăng vọt đột biến tại Chi nhánh Quận 1 với số lượng 1,200 viên trong một giao dịch đơn lẻ (vượt ngưỡng cảnh báo 3σ = 435 viên).'
  },
  {
    id: 'ANOM-002',
    medicineId: 'PHA-10492',
    medicineName: 'Augmentin 1g',
    category: 'Kháng sinh',
    anomalyType: 'LARGE_ADJUSTMENT',
    severity: 'HIGH',
    transactionType: 'ADJUSTMENT',
    quantityChange: -350,
    detectedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    referenceId: 'ADJ-004412',
    referenceType: 'INVENTORY_CHECK',
    performedBy: 'QL Kho Phước Lê',
    statistics: { avgDailyExport: 60, stdDev: 10, zScore: 4.8, upperThreshold: 90, lowerThreshold: 30 },
    description: 'Điều chỉnh giảm tồn kho quy mô lớn tại Kho trung tâm do phát hiện 350 viên Augmentin bị hỏng bao bì trong biên bản kiểm kê định kỳ.'
  },
  {
    id: 'ANOM-003',
    medicineId: 'PHA-88210',
    medicineName: 'Amoxicillin 500mg (Cap)',
    category: 'Kháng sinh',
    anomalyType: 'SPIKE_EXPORT',
    severity: 'MEDIUM',
    transactionType: 'EXPORT',
    quantityChange: -600,
    detectedAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    referenceId: 'TX-9988104',
    referenceType: 'SALES_BILL',
    performedBy: 'Dược sĩ Nam Nguyễn',
    statistics: { avgDailyExport: 150, stdDev: 25, zScore: 3.5, upperThreshold: 225, lowerThreshold: 75 },
    description: 'Xuất kho bất thường tại Chi nhánh Quận 7 với số lượng 600 viên, vượt ngưỡng Z-Score quy định (3.5σ).'
  }
];

// ── COMPONENT FOR CUSTOM STOCK PROGRESS BAR ──
function StockBar({ current, safety, rop, eoq }: { current: number; safety: number; rop: number; eoq: number }) {
  const max = Math.max(current, eoq * 1.5, rop * 1.5, 10);
  const pct = (v: number) => Math.min(100, Math.round((v / max) * 100));
  
  let fillColor = '#22c55e'; // Green stable
  if (current <= 0) fillColor = '#ef4444'; // Red out of stock
  else if (current < safety) fillColor = '#f97316'; // Orange critical
  else if (current < rop) fillColor = '#eab308'; // Yellow reorder

  return (
    <div className="scd-stock-bar-wrap">
      <div className="scd-stock-bar-track">
        <div 
          className="scd-stock-bar-fill" 
          style={{ width: `${pct(current)}%`, background: fillColor }} 
        />
        <div className="scd-stock-bar-marker" style={{ left: `${pct(safety)}%` }} title={`Tồn an toàn: ${safety}`} />
        <div className="scd-stock-bar-marker scd-rop" style={{ left: `${pct(rop)}%` }} title={`Điểm đặt hàng lại: ${rop}`} />
      </div>
      <div className="scd-stock-bar-labels">
        <span>0</span>
        <span className="scd-bar-ss">Tồn an toàn: {safety}</span>
        <span className="scd-bar-rop">Điểm đặt lại: {rop}</span>
        <span>Lượng đặt tối ưu: {eoq}</span>
      </div>
    </div>
  );
}

// ── COMPONENT FOR DETAIL DRAWER ──
function DetailDrawer({ item, onClose }: { item: SafeStockItem; onClose: () => void }) {
  const cfg = STATUS_CONFIG[item.stockStatus] || STATUS_CONFIG.SAFE;
  
  return (
    <div className="scd-drawer-overlay" onClick={onClose}>
      <div className="scd-drawer" onClick={e => e.stopPropagation()}>
        <button className="scd-drawer-close" onClick={onClose}>✕</button>
        <div className="scd-drawer-header">
          <div className="scd-kpi-icon-wrap" style={{ background: cfg.bg, color: cfg.color, marginRight: 12 }}>
            <Package size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 className="scd-drawer-title">{item.medicineName}</h2>
            <p className="scd-drawer-sub">Mã: {item.medicineId} · Danh mục: {item.category} · Đơn vị: {item.unit}</p>
          </div>
          <span className={`scd-badge ${cfg.class}`}>{cfg.label}</span>
        </div>
        <div className="scd-drawer-body">
          <div className="scd-drawer-section">
            <h3>📊 Tồn kho hiện tại vs Định mức</h3>
            <StockBar current={item.currentStock} safety={item.thresholds.safetyStock} rop={item.thresholds.reorderPoint} eoq={item.thresholds.eoq} />
            <div className="scd-grid-3" style={{ marginTop: 16 }}>
              <div className="scd-metric-card red">
                <div className="scd-metric-val">{item.thresholds.safetyStock}</div>
                <div className="scd-metric-lbl">Tồn an toàn</div>
              </div>
              <div className="scd-metric-card orange">
                <div className="scd-metric-val">{item.thresholds.reorderPoint}</div>
                <div className="scd-metric-lbl">Điểm đặt hàng lại</div>
              </div>
              <div className="scd-metric-card blue">
                <div className="scd-metric-val">{item.thresholds.eoq}</div>
                <div className="scd-metric-lbl">Lượng đặt hàng tối ưu</div>
              </div>
            </div>
          </div>
          
          <div className="scd-drawer-section">
            <h3>📈 Phân tích nhu cầu sử dụng</h3>
            <div className="scd-grid-3">
              <div className="scd-metric-card">
                <div className="scd-metric-val">{item.demand.totalExported}</div>
                <div className="scd-metric-lbl">Xuất kho kỳ</div>
              </div>
              <div className="scd-metric-card">
                <div className="scd-metric-val">{item.demand.avgDailyDemand}</div>
                <div className="scd-metric-lbl">Trung bình ngày</div>
              </div>
              <div className="scd-metric-card">
                <div className="scd-metric-val">{item.demand.stdDevDemand}</div>
                <div className="scd-metric-lbl">Độ lệch chuẩn</div>
              </div>
            </div>
          </div>

          <div className="scd-drawer-section">
            <h3>🔄 Vòng quay tồn kho</h3>
            <div className="scd-grid-3">
              <div className="scd-metric-card">
                <div className="scd-metric-val">{item.turnover.inventoryTurnoverRate}x</div>
                <div className="scd-metric-lbl">Tỷ lệ vòng quay</div>
              </div>
              <div className="scd-metric-card">
                <div className="scd-metric-val">{item.turnover.daysInInventory} ngày</div>
                <div className="scd-metric-lbl">Số ngày tồn kho</div>
              </div>
              <div className="scd-metric-card">
                <div className="scd-metric-val">{item.turnover.avgInventory}</div>
                <div className="scd-metric-lbl">Tồn kho trung bình</div>
              </div>
            </div>
          </div>

          {item.branchBreakdown.length > 0 && (
            <div className="scd-drawer-section">
              <h3>🏪 Tồn kho chi tiết tại các chi nhánh</h3>
              <div className="scd-branch-table">
                <table>
                  <thead>
                    <tr>
                      <th>Chi nhánh</th>
                      <th>Mã Lô</th>
                      <th>Tồn kho</th>
                      <th>Hạn sử dụng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.branchBreakdown.map((b, idx) => {
                      const branchGeo = BRANCHES_GEOGRAPHY.find(bg => bg.id === b.branchId);
                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{branchGeo ? branchGeo.name : b.branchId}</td>
                          <td><code>{b.batchNo}</code></td>
                          <td><strong style={{ color: b.stock === 0 ? '#ef4444' : '#1e293b' }}>{b.stock}</strong></td>
                          <td>{new Date(b.expDate).toLocaleDateString('vi-VN')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="scd-drawer-section">
            <h3>💡 Khuyến nghị thông minh</h3>
            <div className="scd-recommendation" style={{ borderColor: cfg.color, background: cfg.bg }}>
              {item.stockStatus === 'CRITICAL' && (
                <span><strong>🚨 Đặt hàng khẩn cấp!</strong> Tồn kho đã cạn kiệt. Vui lòng tạo ngay phiếu yêu cầu nhập hàng. Số lượng đặt đề xuất: <strong>{item.thresholds.eoq} {item.unit}</strong>.</span>
              )}
              {item.stockStatus === 'LOW' && (
                <span><strong>⚠️ Cần bổ sung tồn kho.</strong> Mức tồn kho hiện tại đã thấp hơn ngưỡng an toàn. Đề xuất nhập thêm ít nhất <strong>{item.thresholds.eoq} {item.unit}</strong>.</span>
              )}
              {item.stockStatus === 'SAFE' && item.currentStock < item.thresholds.reorderPoint && (
                <span><strong>📋 Chuẩn bị đặt hàng.</strong> Tồn kho sắp chạm điểm đặt hàng lại. Gợi ý chuẩn bị đặt <strong>{item.thresholds.eoq} {item.unit}</strong> trong vòng 1-2 ngày tới.</span>
              )}
              {item.stockStatus === 'SAFE' && item.currentStock >= item.thresholds.reorderPoint && (
                <span><strong>✅ Tồn kho ổn định.</strong> Lượng tồn kho trong ngưỡng tối ưu. Không cần thao tác gì thêm, tiếp tục theo dõi biến động nhu cầu.</span>
              )}
              {item.stockStatus === 'OVERSTOCK' && (
                <span><strong>📦 Tồn kho dư thừa.</strong> Số lượng tồn kho vượt mức nhu cầu tối ưu. Khuyến nghị hạn chế đặt thêm hoặc xem xét điều chuyển nội bộ sang chi nhánh có mức tồn thấp.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── COMPONENT FOR ANOMALY DETAIL MODAL ──
function AnomalyModal({ anomaly, onClose }: { anomaly: AnomalyItem; onClose: () => void }) {
  const isNegative = anomaly.quantityChange < 0;
  
  return (
    <div className="scd-modal-overlay" onClick={onClose}>
      <div className="scd-modal" onClick={e => e.stopPropagation()} style={{ width: 520 }}>
        <div className="scd-modal-header">
          <div className="scd-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle color="#ef4444" size={20} />
            <span>Chi tiết Bất thường tồn kho</span>
          </div>
          <button className="scd-drawer-close" onClick={onClose} style={{ top: 12, right: 12 }}>✕</button>
        </div>
        
        <div style={{ marginTop: 12 }}>
          <div style={{ padding: 14, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: 14.5 }}>{anomaly.medicineName}</h4>
            <span className="scd-badge red" style={{ fontSize: 10 }}>Hệ số kiểm định Z-Score: {anomaly.statistics.zScore}σ</span>
            <p style={{ margin: '10px 0 0', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{anomaly.description}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            <div style={{ padding: 10, border: '1px solid #f1f5f9', borderRadius: 10 }}>
              <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Loại biến động</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2, color: '#0f172a' }}>
                {anomaly.anomalyType === 'SPIKE_EXPORT' ? 'Xuất đột biến ⬆️' : anomaly.anomalyType === 'LARGE_ADJUSTMENT' ? 'Điều chỉnh lớn ⚠️' : 'Biến động thấp ⬇️'}
              </div>
            </div>
            <div style={{ padding: 10, border: '1px solid #f1f5f9', borderRadius: 10 }}>
              <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Số lượng thay đổi</div>
              <div style={{ fontSize: 13, fontWeight: 800, marginTop: 2, color: isNegative ? '#ef4444' : '#22c55e' }}>
                {anomaly.quantityChange > 0 ? '+' : ''}{anomaly.quantityChange}
              </div>
            </div>
            <div style={{ padding: 10, border: '1px solid #f1f5f9', borderRadius: 10 }}>
              <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Người thực hiện</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2, color: '#0f172a' }}>{anomaly.performedBy}</div>
            </div>
            <div style={{ padding: 10, border: '1px solid #f1f5f9', borderRadius: 10 }}>
              <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Mã tham chiếu</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2, color: '#0f172a' }}>{anomaly.referenceId ? anomaly.referenceId.slice(-10) : 'N/A'}</div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Thông số thống kê 3-Sigma</div>
            <div className="scd-grid-3">
              <div className="scd-metric-card" style={{ padding: 8 }}>
                <div className="scd-metric-val" style={{ fontSize: 16 }}>{anomaly.statistics.avgDailyExport}</div>
                <div className="scd-metric-lbl" style={{ fontSize: 9 }}>TB ngày</div>
              </div>
              <div className="scd-metric-card" style={{ padding: 8 }}>
                <div className="scd-metric-val" style={{ fontSize: 16 }}>{anomaly.statistics.stdDev}</div>
                <div className="scd-metric-lbl" style={{ fontSize: 9 }}>Độ lệch chuẩn</div>
              </div>
              <div className="scd-metric-card" style={{ padding: 8 }}>
                <div className="scd-metric-val" style={{ fontSize: 16, color: '#ef4444' }}>{anomaly.statistics.upperThreshold}</div>
                <div className="scd-metric-lbl" style={{ fontSize: 9 }}>Ngưỡng trên (+3σ)</div>
              </div>
            </div>
          </div>
        </div>

        <div className="scd-modal-footer">
          <button className="scd-btn scd-btn-secondary" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

// ── COMPONENT FOR BRANCH DETAIL MODAL ──
function BranchDetailModal({ 
  branch, 
  stockData, 
  onClose 
}: { 
  branch: MapBranch; 
  stockData: SafeStockItem[]; 
  onClose: () => void; 
}) {
  // Find all medicines that have stock/batches in this branch
  const items = stockData.filter(med => 
    med.branchBreakdown.some(b => b.branchId === branch.id)
  ).map(med => {
    const batchInfo = med.branchBreakdown.find(b => b.branchId === branch.id)!;
    
    // Determine status at this branch specifically:
    let status: 'CRITICAL' | 'LOW' | 'SAFE' = 'SAFE';
    if (batchInfo.stock <= 0) {
      status = 'CRITICAL';
    } else if (batchInfo.stock < med.thresholds.safetyStock) {
      status = 'LOW';
    }
    
    return {
      ...med,
      branchStock: batchInfo.stock,
      batchNo: batchInfo.batchNo,
      expDate: batchInfo.expDate,
      branchStatus: status
    };
  });

  const criticalItems = items.filter(i => i.branchStatus === 'CRITICAL');
  const lowItems = items.filter(i => i.branchStatus === 'LOW');
  
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  const expiringItems = items.filter(i => {
    const remainingTime = new Date(i.expDate).getTime() - Date.now();
    return remainingTime > 0 && remainingTime <= ninetyDays;
  });

  return (
    <div className="scd-modal-overlay" onClick={onClose}>
      <div className="scd-modal" onClick={e => e.stopPropagation()} style={{ width: 680, maxWidth: '95%' }}>
        <div className="scd-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="scd-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="scd-kpi-icon-wrap" style={{ background: '#eff6ff', color: '#0057cd', marginRight: 4 }}>
              <Building2 size={22} />
            </div>
            <div>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>{branch.name}</span>
              <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                Khu vực: {branch.district} · Tổng phân bổ: {items.length} SKUs
              </div>
            </div>
          </div>
          <button className="scd-drawer-close" onClick={onClose} style={{ top: 18, right: 18 }}>✕</button>
        </div>

        <div style={{ marginTop: 16, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
          {/* Summary counters */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
            <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}>{criticalItems.length}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', marginTop: 2 }}>Mặt hàng hết hàng</div>
            </div>
            <div style={{ padding: 12, background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#f97316' }}>{lowItems.length}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9a3412', marginTop: 2 }}>Dưới định mức an toàn</div>
            </div>
            <div style={{ padding: 12, background: '#faf5ff', border: '1px solid #f3e8ff', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#a855f7' }}>{expiringItems.length}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b21a8', marginTop: 2 }}>Lô hàng cận hạn dùng</div>
            </div>
          </div>

          {/* Details list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {criticalItems.length > 0 && (
              <div style={{ border: '1px solid #fee2e2', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ background: '#fef2f2', padding: '8px 14px', fontSize: 12, fontWeight: 800, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={15} /> KHẨN CẤP: HẾT HÀNG TOÀN BỘ (CẦN ĐẶT HÀNG NGAY)
                </div>
                <table className="scd-data-table" style={{ margin: 0, border: 'none', width: '100%' }}>
                  <tbody>
                    {criticalItems.map(i => (
                      <tr key={i.medicineId} style={{ background: '#fff' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>{i.medicineName}</span>
                          <div style={{ fontSize: 11, color: '#64748b' }}>Mã: {i.medicineId} · Lô: <code>{i.batchNo}</code></div>
                        </td>
                        <td style={{ textAlign: 'right', padding: '10px 14px' }}>
                          <span className="scd-badge red">Tồn: 0 {i.unit}</span>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Tồn an toàn: {i.thresholds.safetyStock}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {lowItems.length > 0 && (
              <div style={{ border: '1px solid #ffedd5', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ background: '#fff7ed', padding: '8px 14px', fontSize: 12, fontWeight: 800, color: '#c2410c', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={15} /> CẢNH BÁO: DƯỚI MỨC TỒN KHO AN TOÀN
                </div>
                <table className="scd-data-table" style={{ margin: 0, border: 'none', width: '100%' }}>
                  <tbody>
                    {lowItems.map(i => (
                      <tr key={i.medicineId} style={{ background: '#fff' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>{i.medicineName}</span>
                          <div style={{ fontSize: 11, color: '#64748b' }}>Mã: {i.medicineId} · Lô: <code>{i.batchNo}</code></div>
                        </td>
                        <td style={{ textAlign: 'right', padding: '10px 14px' }}>
                          <span className="scd-badge orange">Tồn: {i.branchStock} {i.unit}</span>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Tồn an toàn: {i.thresholds.safetyStock} (Thiếu {i.thresholds.safetyStock - i.branchStock})</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {expiringItems.length > 0 && (
              <div style={{ border: '1px solid #f3e8ff', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ background: '#faf5ff', padding: '8px 14px', fontSize: 12, fontWeight: 800, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={15} /> CẢNH BÁO: LÔ THUỐC CẬN HẠN SỬ DỤNG (&lt; 90 NGÀY)
                </div>
                <table className="scd-data-table" style={{ margin: 0, border: 'none', width: '100%' }}>
                  <tbody>
                    {expiringItems.map(i => {
                      const daysLeft = Math.round((new Date(i.expDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return (
                        <tr key={i.medicineId} style={{ background: '#fff' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>{i.medicineName}</span>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Mã: {i.medicineId} · Lô: <code>{i.batchNo}</code></div>
                          </td>
                          <td style={{ textAlign: 'right', padding: '10px 14px' }}>
                            <span style={{ fontWeight: 700, color: '#b91c1c', fontSize: 12 }}>Còn {daysLeft} ngày</span>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Hạn dùng: {new Date(i.expDate).toLocaleDateString('vi-VN')}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {criticalItems.length === 0 && lowItems.length === 0 && expiringItems.length === 0 && (
              <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>
                <CheckCircle2 color="#22c55e" size={40} style={{ margin: '0 auto 10px' }} />
                <h4 style={{ fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>Chi nhánh Khỏe mạnh!</h4>
                <p style={{ margin: 0, fontSize: 13 }}>Tất cả các dược phẩm tại chi nhánh này đều đạt mức tồn kho an toàn và không có lô hàng nào cận hạn.</p>
              </div>
            )}
          </div>
        </div>

        <div className="scd-modal-footer">
          <button className="scd-btn scd-btn-secondary" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

// ── ADVANCED SETTINGS MODAL ──
// serviceLevel parameters, periodDays, zScore
// serviceLevel parameters, periodDays, zScore
function SettingsModal({ 
  isOpen, 
  onClose, 
  serviceLevel, 
  setServiceLevel, 
  periodDays, 
  setPeriodDays, 
  zScore, 
  setZScore, 
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  serviceLevel: number; 
  setServiceLevel: (v: number) => void; 
  periodDays: number; 
  setPeriodDays: (v: number) => void; 
  zScore: number; 
  setZScore: (v: number) => void;
  onSave: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="scd-modal-overlay" onClick={onClose}>
      <div className="scd-modal" onClick={e => e.stopPropagation()}>
        <div className="scd-modal-header">
          <div className="scd-modal-title">Cấu hình tham số thông minh</div>
          <button className="scd-drawer-close" onClick={onClose} style={{ top: 12, right: 12 }}>✕</button>
        </div>
        <div style={{ marginTop: 12 }}>
          <div className="scd-form-group">
            <label>Mức phục vụ khách hàng</label>
            <select className="scd-form-input" value={serviceLevel} onChange={e => setServiceLevel(Number(e.target.value))}>
              <option value={0.90}>90% (Hệ số an toàn Z = 1.28)</option>
              <option value={0.95}>95% (Hệ số an toàn Z = 1.65 - Khuyến nghị)</option>
              <option value={0.98}>98% (Hệ số an toàn Z = 2.05)</option>
              <option value={0.99}>99% (Hệ số an toàn Z = 2.33)</option>
            </select>
          </div>
          <div className="scd-form-group">
            <label>Kỳ phân tích tồn kho (ngày)</label>
            <select className="scd-form-input" value={periodDays} onChange={e => setPeriodDays(Number(e.target.value))}>
              <option value={7}>7 ngày gần nhất</option>
              <option value={30}>30 ngày gần nhất (Khuyên dùng)</option>
              <option value={60}>60 ngày gần nhất</option>
              <option value={90}>90 ngày gần nhất</option>
            </select>
          </div>
          <div className="scd-form-group">
            <label>Ngưỡng nhạy Z-Score phát hiện bất thường</label>
            <select className="scd-form-input" value={zScore} onChange={e => setZScore(Number(e.target.value))}>
              <option value={2}>2σ (Nhạy cảm cao - Phát hiện nhiều)</option>
              <option value={3}>3σ (Mức chuẩn 3-Sigma - Khuyến nghị)</option>
              <option value={4}>4σ (Nghiêm ngặt - Chỉ bất thường cực lớn)</option>
            </select>
          </div>
        </div>
        <div className="scd-modal-footer">
          <button className="scd-btn scd-btn-secondary" onClick={onClose}>Hủy</button>
          <button className="scd-btn scd-btn-primary" onClick={onSave}>Áp dụng</button>
        </div>
      </div>
    </div>
  );
}

export function SupplyChainDashboard() {
  const [currentView, setCurrentView] = useState<'monitor' | 'anomalies'>('monitor');
  const [activeTab, setActiveTab] = useState<'critical' | 'all'>('critical');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRefreshingModel, setIsRefreshingModel] = useState(false);

  // Filter States
  const [searchText, setSearchText] = useState('');
  const [showOnlyExpiry, setShowOnlyExpiry] = useState(false);
  const [showOnlyOutOfStock, setShowOnlyOutOfStock] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');

  // Algorithm States
  const [serviceLevel, setServiceLevel] = useState(0.95);
  const [periodDays, setPeriodDays] = useState(30);
  const [zScore, setZScore] = useState(3);

  // Data States
  const [stockData, setStockData] = useState<SafeStockItem[]>([]);
  const [stockTotal, setStockTotal] = useState(0);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockPage, setStockPage] = useState(1);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [anomalyLoading, setAnomalyLoading] = useState(false);

  const [mapBranches, setMapBranches] = useState<MapBranch[]>([]);

  // Selected entities for popups
  const [selectedItem, setSelectedItem] = useState<SafeStockItem | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyItem | null>(null);
  const [selectedBranchDetails, setSelectedBranchDetails] = useState<MapBranch | null>(null);
  const [hoveredBranch, setHoveredBranch] = useState<MapBranch | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Load backend data
  const fetchData = useCallback(async (page = 1) => {
    setStockLoading(true);
    setAnomalyLoading(true);
    try {
      // Fetch real branches to map
      const branchesRes = await branchService.getBranches();
      const dynamicBranches = branchesRes.map((b: any, index: number) => {
        const addrParts = (b.address || '').split(',');
        return {
          id: b.branchCode || b._id,
          name: b.name,
          district: addrParts.length > 1 ? addrParts[addrParts.length - 2].trim() : 'N/A',
          x: DEFAULT_COORDS[index % DEFAULT_COORDS.length].x,
          y: DEFAULT_COORDS[index % DEFAULT_COORDS.length].y,
        };
      });
      setMapBranches(dynamicBranches.length > 0 ? dynamicBranches : BRANCHES_GEOGRAPHY);

      // UC-30 Real-time Safe Stock Chain
      const stockRes = await getSafeStockChain({ serviceLevel, periodDays, page, limit: 30 });
      setStockData(stockRes.data || []);
      setStockTotal(stockRes.total || 0);
      setStockPage(page);

      // UC-37 Anomaly detection
      const anomalyRes = await getAnomalyDetection({ periodDays, zScoreThreshold: zScore });
      setAnomalies(anomalyRes.data || []);
    } catch (e) {
      console.error('Error fetching supply chain dashboard data:', e);
    } finally {
      setStockLoading(false);
      setAnomalyLoading(false);
    }
  }, [serviceLevel, periodDays, zScore]);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  const handleApplySettings = () => {
    setIsSettingsOpen(false);
    fetchData(1);
  };

  const handleRefreshAIModel = () => {
    setIsRefreshingModel(true);
    setTimeout(() => {
      setIsRefreshingModel(false);
      fetchData(1);
    }, 1500);
  };

  // Sử dụng dữ liệu thật từ DB (Backend API)
  const finalStockData = useMemo(() => {
    return stockData;
  }, [stockData]);

  const finalAnomalies = useMemo(() => {
    return anomalies;
  }, [anomalies]);

  // Expiry Checker
  const isNearExpiry = (item: SafeStockItem) => {
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    return item.branchBreakdown.some(b => {
      const remainingTime = new Date(b.expDate).getTime() - Date.now();
      return remainingTime > 0 && remainingTime <= ninetyDays;
    });
  };

  // Branch Health Calculator
  const branchHealthMetrics = useMemo(() => {
    const metrics: Record<string, { totalItems: number; criticalCount: number; warningCount: number }> = {};
    
    // Initialize geography
    mapBranches.forEach(bg => {
      metrics[bg.id] = { totalItems: 0, criticalCount: 0, warningCount: 0 };
    });

    finalStockData.forEach(item => {
      item.branchBreakdown.forEach(b => {
        if (!metrics[b.branchId]) {
          metrics[b.branchId] = { totalItems: 0, criticalCount: 0, warningCount: 0 };
        }
        metrics[b.branchId].totalItems++;
        if (item.stockStatus === 'CRITICAL' || b.stock === 0) {
          metrics[b.branchId].criticalCount++;
        } else if (item.stockStatus === 'LOW' || b.stock < item.thresholds.safetyStock) {
          metrics[b.branchId].warningCount++;
        }
      });
    });

    return metrics;
  }, [finalStockData]);

  // Aggregate global KPI numbers
  const kpis = useMemo(() => {
    let outOfStockCount = 0;
    let nearExpiryCount = 0;
    let totalSKUs = finalStockData.length;
    let totalStockSum = 0;

    finalStockData.forEach(item => {
      totalStockSum += item.currentStock;
      if (item.stockStatus === 'CRITICAL' || item.currentStock === 0) {
        outOfStockCount++;
      }
      if (isNearExpiry(item)) {
        nearExpiryCount++;
      }
    });

    // Approximate network value in VND
    const totalValueVnd = totalStockSum * 25000;

    return {
      skuCount: totalSKUs,
      networkValue: totalValueVnd.toLocaleString('vi-VN') + ' đ',
      outOfStock: outOfStockCount,
      nearExpiry: nearExpiryCount
    };
  }, [finalStockData]);

  // Filter products for the bottom table
  const filteredProducts = useMemo(() => {
    return finalStockData.filter(item => {
      // 1. Search text filter
      if (searchText && !item.medicineName.toLowerCase().includes(searchText.toLowerCase()) && !item.medicineId.toLowerCase().includes(searchText.toLowerCase())) {
        return false;
      }
      // 2. Branch location filter
      if (selectedBranchId !== 'ALL') {
        const hasBranch = item.branchBreakdown.some(b => b.branchId === selectedBranchId);
        if (!hasBranch) return false;
      }
      // 3. Tab-based status filter
      if (activeTab === 'critical') {
        const isCriticalStatus = item.stockStatus === 'CRITICAL' || item.stockStatus === 'LOW';
        const exp = isNearExpiry(item);
        if (!isCriticalStatus && !exp) return false;
      }
      // 4. Checkbox filters
      if (showOnlyOutOfStock && item.currentStock > 0) return false;
      if (showOnlyExpiry && !isNearExpiry(item)) return false;

      return true;
    });
  }, [finalStockData, searchText, selectedBranchId, activeTab, showOnlyOutOfStock, showOnlyExpiry]);

  // Export to CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Mã Thuốc,Tên Thuốc,Danh Mục,Tồn Toàn Chuỗi,Trạng Thái,Safety Stock,Reorder Point,EOQ,TB Ngày\n';
    
    finalStockData.forEach(item => {
      const row = [
        item.medicineId,
        `"${item.medicineName}"`,
        item.category,
        item.currentStock,
        STATUS_CONFIG[item.stockStatus]?.label || item.stockStatus,
        item.thresholds.safetyStock,
        item.thresholds.reorderPoint,
        item.thresholds.eoq,
        item.demand.avgDailyDemand
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bao_cao_chuoi_cung_ung_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Map mouse movement for tooltip
  const handleMapMouseMove = (e: React.MouseEvent, branch: MapBranch) => {
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({
        x: e.clientX - rect.left + 15,
        y: e.clientY - rect.top - 50
      });
    }
  };

  return (
    <div className="scd-root">
      
      {/* ─── VIEW SELECTOR TABS ─── */}
      <div className="scd-view-selector">
        <button 
          className={`scd-view-tab ${currentView === 'monitor' ? 'active' : ''}`}
          onClick={() => setCurrentView('monitor')}
        >
          <Layers size={16} />
          Giám sát chuỗi cung ứng thời gian thực
        </button>
        <button 
          className={`scd-view-tab ${currentView === 'anomalies' ? 'active' : ''}`}
          onClick={() => setCurrentView('anomalies')}
        >
          <Cpu size={16} />
          Phát hiện bất thường & Phân tích AI
        </button>
      </div>

      {currentView === 'monitor' ? (
        // =========================================================================
        // ─── VIEW 1: SUPPLY CHAIN MONITOR ───
        // =========================================================================
        <>
          {/* Header */}
          <div className="scd-header-container">
            <div className="scd-header-left">
              <div className="scd-header-icon-wrap">
                <Activity size={26} />
              </div>
              <div>
                <h1 className="scd-title-main">Giám sát chuỗi cung ứng thời gian thực</h1>
                <p className="scd-subtitle-main">Giám sát sức khỏe chuỗi cung ứng & phân tích định mức tồn kho an toàn tự động</p>
              </div>
            </div>
            <div className="scd-header-actions">
              <button className="scd-btn scd-btn-secondary" onClick={() => setIsSettingsOpen(true)}>
                <Settings size={18} />
                Thiết lập tham số
              </button>
              <button className="scd-btn scd-btn-primary" onClick={handleExportCSV}>
                <Download size={18} />
                Xuất báo cáo CSV
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="scd-kpi-grid">
            <div className="scd-kpi-card info">
              <div className="scd-kpi-icon-wrap">
                <Package size={22} />
              </div>
              <div className="scd-kpi-content">
                <span className="scd-kpi-label">Tổng số mặt hàng (SKU)</span>
                <span className="scd-kpi-value">{kpis.skuCount} SKUs</span>
              </div>
            </div>

            <div className="scd-kpi-card value">
              <div className="scd-kpi-icon-wrap">
                <DollarSign size={22} />
              </div>
              <div className="scd-kpi-content">
                <span className="scd-kpi-label">Tổng giá trị lưu kho</span>
                <span className="scd-kpi-value" style={{ fontSize: '20px' }}>{kpis.networkValue}</span>
              </div>
            </div>

            <div className="scd-kpi-card danger">
              <div className="scd-kpi-icon-wrap">
                <AlertCircle size={22} />
              </div>
              <div className="scd-kpi-content">
                <span className="scd-kpi-label">Hết hàng toàn chuỗi</span>
                <span className="scd-kpi-value">{kpis.outOfStock} Dược phẩm</span>
              </div>
            </div>

            <div className="scd-kpi-card warning">
              <div className="scd-kpi-icon-wrap">
                <Clock size={22} />
              </div>
              <div className="scd-kpi-content">
                <span className="scd-kpi-label">Lô thuốc cận hạn</span>
                <span className="scd-kpi-value">{kpis.nearExpiry} Lô hàng</span>
              </div>
            </div>
          </div>

          {/* Main Map and Timeline row */}
          <div className="scd-main-grid">
            {/* Left Side: Map panel */}
            <div className="scd-panel">
              <div className="scd-panel-header">
                <div className="scd-panel-title">
                  <MapPin size={18} className="text-[#0057cd]" />
                  <span>Bản đồ phân phối & Sức khỏe chi nhánh</span>
                  {selectedBranchId !== 'ALL' && (
                    <span 
                      className="scd-badge blue" 
                      style={{ cursor: 'pointer', display: 'inline-flex', gap: 3, padding: '2px 8px' }}
                      onClick={() => setSelectedBranchId('ALL')}
                    >
                      Đang lọc chi nhánh <X size={10} />
                    </span>
                  )}
                </div>
                <div className="scd-panel-legend">
                  <span className="scd-legend-item"><span className="scd-dot stable" /> Khỏe mạnh</span>
                  <span className="scd-legend-item"><span className="scd-dot warning" /> Cảnh báo</span>
                  <span className="scd-legend-item"><span className="scd-dot critical" /> Nghiêm trọng</span>
                </div>
              </div>

              <div className="scd-map-container">
                <svg viewBox="0 0 500 380" className="scd-map-svg">
                  <rect width="100%" height="100%" fill="#f8fafc" />
                  <g opacity="0.05">
                    <line x1="0" y1="50" x2="500" y2="50" stroke="#0f172a" strokeWidth="1" />
                    <line x1="0" y1="100" x2="500" y2="100" stroke="#0f172a" strokeWidth="1" />
                    <line x1="0" y1="150" x2="500" y2="150" stroke="#0f172a" strokeWidth="1" />
                    <line x1="0" y1="200" x2="500" y2="200" stroke="#0f172a" strokeWidth="1" />
                    <line x1="0" y1="250" x2="500" y2="250" stroke="#0f172a" strokeWidth="1" />
                    <line x1="0" y1="300" x2="500" y2="300" stroke="#0f172a" strokeWidth="1" />
                    <line x1="50" y1="0" x2="50" y2="380" stroke="#0f172a" strokeWidth="1" />
                    <line x1="100" y1="0" x2="100" y2="380" stroke="#0f172a" strokeWidth="1" />
                    <line x1="150" y1="0" x2="150" y2="380" stroke="#0f172a" strokeWidth="1" />
                    <line x1="200" y1="0" x2="200" y2="380" stroke="#0f172a" strokeWidth="1" />
                    <line x1="250" y1="0" x2="250" y2="380" stroke="#0f172a" strokeWidth="1" />
                    <line x1="300" y1="0" x2="300" y2="380" stroke="#0f172a" strokeWidth="1" />
                    <line x1="350" y1="0" x2="350" y2="380" stroke="#0f172a" strokeWidth="1" />
                    <line x1="400" y1="0" x2="400" y2="380" stroke="#0f172a" strokeWidth="1" />
                  </g>
                  <path d="M 50 180 Q 90 100 150 90 L 230 110 L 260 70 L 350 40 L 450 100 L 480 200 L 410 320 L 320 360 L 200 320 L 100 280 Z" fill="#eff2f6" stroke="#d8e2ed" strokeWidth="2" />
                  <path d="M 120 190 Q 200 170 280 220 L 320 280 L 350 340" fill="none" stroke="#e2e8f0" strokeWidth="3" opacity="0.8" />
                  <path d="M 380 0 C 350 80, 270 90, 290 140 C 310 180, 390 190, 310 260 C 270 300, 320 380, 330 380" className="scd-map-path-river" />
                  <g opacity="0.3" stroke="#cbd5e1" strokeDasharray="3 3">
                    <line x1="260" y1="190" x2="300" y2="290" />
                    <line x1="260" y1="190" x2="280" y2="120" />
                    <line x1="260" y1="190" x2="370" y2="160" />
                    <line x1="260" y1="190" x2="190" y2="200" />
                  </g>
                  {mapBranches.map(bg => {
                    const metric = branchHealthMetrics[bg.id] || { criticalCount: 0, warningCount: 0 };
                    let markerColor = '#22c55e';
                    if (metric.criticalCount > 0) markerColor = '#ef4444';
                    else if (metric.warningCount > 0) markerColor = '#f97316';

                    return (
                      <g 
                        key={bg.id} 
                        className="scd-map-marker-group"
                        onMouseEnter={(e) => {
                          setHoveredBranch(bg);
                          handleMapMouseMove(e, bg);
                        }}
                        onMouseMove={(e) => handleMapMouseMove(e, bg)}
                        onMouseLeave={() => setHoveredBranch(null)}
                        onClick={() => {
                          setSelectedBranchId(bg.id);
                          setSelectedBranchDetails(bg);
                        }}
                      >
                        <circle cx={bg.x} cy={bg.y} r={12} fill={markerColor} className="scd-map-pin-pulse" />
                        <circle cx={bg.x} cy={bg.y} r={5} fill={markerColor} className="scd-map-pin" stroke="#ffffff" strokeWidth={1.5} />
                        <rect x={bg.x - 22} y={bg.y - 20} width={44} height={12} rx={3} fill="#0f172a" opacity="0.8" />
                        <text x={bg.x} y={bg.y - 11} fill="#ffffff" fontSize={7} fontWeight="bold" textAnchor="middle">{bg.district}</text>
                      </g>
                    );
                  })}
                </svg>
                {hoveredBranch && (
                  <div className="scd-map-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
                    <h4>{hoveredBranch.name}</h4>
                    <p>Tổng mặt hàng phân bổ: {branchHealthMetrics[hoveredBranch.id]?.totalItems || 0} SKUs</p>
                    <div 
                      className="scd-map-tooltip-status" 
                      style={{ 
                        color: branchHealthMetrics[hoveredBranch.id]?.criticalCount > 0 
                          ? '#ef4444' 
                          : branchHealthMetrics[hoveredBranch.id]?.warningCount > 0 
                            ? '#f97316' 
                            : '#22c55e' 
                      }}
                    >
                      • Trạng thái: {
                        branchHealthMetrics[hoveredBranch.id]?.criticalCount > 0 
                          ? `${branchHealthMetrics[hoveredBranch.id]?.criticalCount} Mất hàng` 
                          : branchHealthMetrics[hoveredBranch.id]?.warningCount > 0 
                            ? `${branchHealthMetrics[hoveredBranch.id]?.warningCount} Mức thấp` 
                            : 'Hoạt động tốt'
                      }
                    </div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: 4, fontWeight: 700 }}>
                      (Bấm vào điểm để xem chi tiết khẩn cấp)
                    </div>
                  </div>
                )}
              </div>
            </div>
 
            {/* Right Side: Branch statuses & timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="scd-panel" style={{ flex: 1 }}>
                <div className="scd-panel-header" style={{ marginBottom: 12 }}>
                  <div className="scd-panel-title">
                    <Building2 size={16} className="text-[#64748b]" />
                    <span>Trạng thái Chi nhánh ({mapBranches.length})</span>
                  </div>
                </div>
                <div className="scd-branch-list">
                  {mapBranches.map(bg => {
                    const metric = branchHealthMetrics[bg.id] || { criticalCount: 0, warningCount: 0, totalItems: 0 };
                    let statusText = 'Khỏe mạnh';
                    let statusClass = 'healthy';
                    if (metric.criticalCount > 0) {
                      statusText = `${metric.criticalCount} Khẩn cấp`;
                      statusClass = 'critical';
                    } else if (metric.warningCount > 0) {
                      statusText = `${metric.warningCount} Cảnh báo`;
                      statusClass = 'warning';
                    }
                    return (
                      <div 
                        key={bg.id} 
                        className={`scd-branch-item ${selectedBranchId === bg.id ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedBranchId(selectedBranchId === bg.id ? 'ALL' : bg.id);
                          setSelectedBranchDetails(bg);
                        }}
                      >
                        <div>
                          <div className="scd-branch-name">{bg.name}</div>
                          <div className="scd-branch-sku">Phân bổ: {metric.totalItems} SKUs</div>
                        </div>
                        <span 
                          className={`scd-branch-status-lbl ${statusClass}`}
                          style={{ 
                            cursor: 'pointer',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: statusClass === 'critical' ? '#fef2f2' : statusClass === 'warning' ? '#fff7ed' : '#f0fdf4',
                            border: `1px solid ${statusClass === 'critical' ? '#fecaca' : statusClass === 'warning' ? '#ffedd5' : '#bbf7d0'}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s'
                          }}
                          title="Bấm để xem chi tiết khẩn cấp"
                        >
                          {statusText}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="scd-panel" style={{ flex: 1.5 }}>
                <div className="scd-panel-header" style={{ marginBottom: 12 }}>
                  <div className="scd-panel-title">
                    <Activity size={16} className="text-[#ef4444]" />
                    <span>Biến động bất thường thời gian thực</span>
                  </div>
                  <span className="scd-badge red" style={{ fontSize: 9, padding: '2px 8px' }}>Hệ số Z-Score &gt; 3.0σ</span>
                </div>
                <div className="scd-timeline">
                  {finalAnomalies.map(a => {
                    let typeClass = 'stock-out';
                    let icon = <AlertCircle size={15} />;
                    if (a.anomalyType === 'SPIKE_EXPORT') {
                      typeClass = 'stock-out';
                      icon = <AlertTriangle size={15} />;
                    } else if (a.anomalyType === 'LARGE_ADJUSTMENT') {
                      typeClass = 'transfer';
                      icon = <ArrowLeftRight size={15} />;
                    }

                    const detectedTime = new Date(a.detectedAt).getTime();
                    const diffMins = Math.round((Date.now() - detectedTime) / (60 * 1000));
                    const relativeTime = diffMins < 60 ? `${diffMins} phút trước` : `${Math.round(diffMins / 60)} giờ trước`;

                    return (
                      <div 
                        key={a.id} 
                        className={`scd-timeline-item ${typeClass}`}
                        onClick={() => setSelectedAnomaly(a)}
                      >
                        <div className="scd-timeline-icon">{icon}</div>
                        <div className="scd-timeline-content">
                          <div className="scd-timeline-title">{a.medicineName}</div>
                          <div className="scd-timeline-desc">
                            Số lượng biến động: <strong style={{ color: a.quantityChange < 0 ? '#ef4444' : '#16a34a' }}>{a.quantityChange}</strong> · {a.performedBy}
                          </div>
                          <div className="scd-timeline-meta">
                            <span>Z-Score: {a.statistics.zScore}σ</span>
                            <span>{relativeTime}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* AI Banner */}
          <div className="scd-ai-banner">
            <div className="scd-ai-banner-left">
              <div className="scd-ai-banner-icon">
                <Sparkles size={22} />
              </div>
              <div>
                <div className="scd-ai-banner-title">Hệ thống dự báo AI</div>
                <div className="scd-ai-banner-text">
                  Dựa vào các dữ liệu bán hàng và biến động lịch sử, nhóm dược phẩm <strong>Kháng sinh</strong> có khả năng thiếu hụt đột ngột trong 10 ngày tới tại các chi nhánh trung tâm. Đề xuất chuẩn bị kế hoạch bổ sung hàng để bảo đảm mức an toàn tối ưu.
                </div>
              </div>
            </div>
            <div className="scd-ai-banner-actions">
              <button className="scd-btn scd-btn-primary" onClick={() => setActiveTab('critical')}>
                Xem đề xuất đặt hàng
              </button>
            </div>
          </div>

          {/* Bottom Table */}
          <div className="scd-bottom-container">
            <div className="scd-bottom-header">
              <div className="scd-bottom-tabs">
                <button 
                  className={`scd-bottom-tab ${activeTab === 'critical' ? 'active' : ''}`}
                  onClick={() => setActiveTab('critical')}
                >
                  Cảnh báo tồn kho & Hạn dùng
                </button>
                <button 
                  className={`scd-bottom-tab ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  Phân tích tồn kho an toàn & Điểm đặt lại
                </button>
              </div>

              <div className="scd-bottom-filters">
                <div className="scd-search-bar">
                  <Search className="scd-search-icon" size={15} />
                  <input 
                    type="text" 
                    className="scd-search-input" 
                    placeholder="Tìm kiếm dược phẩm..." 
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                  />
                </div>
                <div className="scd-checkbox-group">
                  <label className="scd-checkbox-label">
                    <input 
                      type="checkbox" 
                      className="scd-checkbox-input"
                      checked={showOnlyOutOfStock}
                      onChange={e => setShowOnlyOutOfStock(e.target.checked)}
                    />
                    Chỉ hiện hết hàng
                  </label>
                  <label className="scd-checkbox-label">
                    <input 
                      type="checkbox" 
                      className="scd-checkbox-input"
                      checked={showOnlyExpiry}
                      onChange={e => setShowOnlyExpiry(e.target.checked)}
                    />
                    Chỉ hiện cận hạn
                  </label>
                </div>
              </div>
            </div>

            <div className="scd-table-wrapper">
              <table className="scd-data-table">
                {activeTab === 'critical' ? (
                  <>
                    <thead>
                      <tr>
                        <th>Mã Dược Phẩm (ID)</th>
                        <th>Tên dược phẩm</th>
                        <th>Vị trí Chi nhánh có lô</th>
                        <th>Mức tồn</th>
                        <th>Trạng thái</th>
                        <th>Hạn sử dụng sớm nhất</th>
                        <th>Thao tác đề xuất</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.length === 0 ? (
                        <tr><td colSpan={7} className="scd-empty">Không tìm thấy cảnh báo tồn kho nào phù hợp</td></tr>
                      ) : filteredProducts.map(item => {
                        const cfg = STATUS_CONFIG[item.stockStatus] || STATUS_CONFIG.SAFE;
                        const locations = item.branchBreakdown.map(b => {
                          const geo = mapBranches.find(g => g.id === b.branchId);
                          return geo ? geo.district : b.branchId;
                        }).join(', ');
                        const expDates = item.branchBreakdown.map(b => new Date(b.expDate));
                        const earliestExp = expDates.length > 0 ? new Date(Math.min(...expDates.map(d => d.getTime()))) : null;

                        return (
                          <tr key={item.medicineId} onClick={() => setSelectedItem(item)}>
                            <td style={{ fontWeight: 600 }}><code>{item.medicineId}</code></td>
                            <td>
                              <div className="scd-item-name">{item.medicineName}</div>
                              <div className="scd-item-sub">{item.category} · {item.unit}</div>
                            </td>
                            <td>{locations || 'Không rõ'}</td>
                            <td>
                              <strong style={{ color: item.currentStock === 0 ? '#ef4444' : '#0f172a', fontSize: '14px' }}>
                                {item.currentStock} {item.unit}
                              </strong>
                            </td>
                            <td><span className={`scd-badge ${cfg.class}`}>{cfg.label}</span></td>
                            <td style={{ fontWeight: 600, color: isNearExpiry(item) ? '#ea580c' : '#334155' }}>
                              {earliestExp ? earliestExp.toLocaleDateString('vi-VN') : 'N/A'}
                              {isNearExpiry(item) && <span style={{ fontSize: '9px', display: 'block', color: '#ea580c' }}>(Sắp hết hạn)</span>}
                            </td>
                            <td onClick={e => e.stopPropagation()}>
                              {item.stockStatus === 'CRITICAL' ? (
                                <span className="scd-action-link" style={{ color: '#ef4444' }} onClick={() => setSelectedItem(item)}>Đặt khẩn cấp</span>
                              ) : isNearExpiry(item) ? (
                                <span className="scd-action-link" style={{ color: '#ea580c' }} onClick={() => setSelectedItem(item)}>Điều chuyển chi nhánh</span>
                              ) : (
                                <span className="scd-action-link" onClick={() => setSelectedItem(item)}>Mua sắm bổ sung</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                ) : (
                  <>
                    <thead>
                      <tr>
                        <th>Dược phẩm</th>
                        <th>Tồn toàn chuỗi</th>
                        <th>Ngưỡng phân bổ</th>
                        <th>Tồn an toàn</th>
                        <th>Điểm đặt lại</th>
                        <th>Lượng đặt tối ưu</th>
                        <th>Vòng quay tồn kho</th>
                        <th>Trung bình ngày</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.length === 0 ? (
                        <tr><td colSpan={8} className="scd-empty">Không tìm thấy dữ liệu tồn kho</td></tr>
                      ) : filteredProducts.map(item => {
                        const cfg = STATUS_CONFIG[item.stockStatus] || STATUS_CONFIG.SAFE;
                        return (
                          <tr key={item.medicineId} onClick={() => setSelectedItem(item)}>
                            <td>
                              <div className="scd-item-name">{item.medicineName}</div>
                              <div className="scd-item-sub">{item.category} · {item.unit}</div>
                            </td>
                            <td><strong style={{ color: cfg.color, fontSize: '14.5px' }}>{item.currentStock}</strong></td>
                            <td>
                              <StockBar current={item.currentStock} safety={item.thresholds.safetyStock} rop={item.thresholds.reorderPoint} eoq={item.thresholds.eoq} />
                            </td>
                            <td style={{ fontWeight: 600, color: '#ef4444' }}>{item.thresholds.safetyStock}</td>
                            <td style={{ fontWeight: 600, color: '#f97316' }}>{item.thresholds.reorderPoint}</td>
                            <td style={{ fontWeight: 600, color: '#0057cd' }}>{item.thresholds.eoq}</td>
                            <td style={{ fontWeight: 600 }}>{item.turnover.inventoryTurnoverRate}x</td>
                            <td style={{ fontWeight: 600 }}>{item.demand.avgDailyDemand}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                )}
              </table>
            </div>

            {stockTotal > 30 && (
              <div className="scd-table-pagination">
                <button disabled={stockPage <= 1} onClick={() => fetchData(stockPage - 1)}>← Trang trước</button>
                <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Trang {stockPage} / {Math.ceil(stockTotal / 30)} (Tổng {stockTotal} dược phẩm)</span>
                <button disabled={stockPage >= Math.ceil(stockTotal / 30)} onClick={() => fetchData(stockPage + 1)}>Trang sau →</button>
              </div>
            )}
          </div>
        </>
      ) : (
        // =========================================================================
        // ─── VIEW 2: ANOMALY & AI INSIGHTS ───
        // =========================================================================
        <>
          {/* Header */}
          <div className="scd-header-container">
            <div>
              <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Hàng tồn kho &gt; Bất thường & Phân tích AI
              </div>
              <h1 className="scd-title-main" style={{ marginTop: 4 }}>Bất thường tồn kho & Phân tích AI</h1>
            </div>
            
            <div className="scd-header-actions">
              <div className="scd-sync-block">
                <div className="scd-sync-indicator">
                  <span className="scd-sync-dot" />
                  <span>Đồng bộ POS: Trực tiếp</span>
                </div>
                <div className="scd-sync-indicator" style={{ borderLeft: '1.5px solid #e2e8f0', paddingLeft: 20 }}>
                  <span className="scd-sync-dot" style={{ background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                  <span>Đồng bộ Kho: Trực tiếp</span>
                </div>
              </div>
              
              <button 
                className="scd-btn scd-btn-primary" 
                onClick={handleRefreshAIModel}
                disabled={isRefreshingModel}
              >
                <RefreshCw size={16} className={isRefreshingModel ? 'animate-spin' : ''} />
                <span>Làm mới Mô hình AI</span>
              </button>
            </div>
          </div>

          {/* Grid: Left - Detected anomalies, Right - Stockout forecast & active investigations */}
          <div className="scd-main-grid" style={{ gridTemplateColumns: '1.1fr 1.3fr' }}>
            
            {/* Left: Detected Anomalies Feed */}
            <div className="scd-panel">
              <div className="scd-panel-header" style={{ borderBottom: '1px solid #f1f5f9', pb: 12, marginBottom: 16 }}>
                <div className="scd-panel-title">
                  <AlertCircle size={18} color="#ef4444" />
                  <span>Bất thường được phát hiện</span>
                </div>
                <span className="scd-badge red" style={{ fontSize: 10, fontWeight: 800 }}>
                  {finalAnomalies.length} KHẨN CẤP
                </span>
              </div>
              
              <div style={{ maxHeight: '660px', overflowY: 'auto', paddingRight: 4 }}>
                {finalAnomalies.map(a => {
                  let cardType = 'stock-leakage';
                  let badgeText = 'Chênh lệch';
                  if (a.anomalyType === 'SPIKE_EXPORT') {
                    cardType = 'demand-spike';
                    badgeText = 'Nhu cầu tăng vọt';
                  } else if (a.anomalyType === 'LARGE_ADJUSTMENT') {
                    cardType = 'data-integrity';
                    badgeText = 'Sai lệch dữ liệu';
                  }

                  const hourStr = new Date(a.detectedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                  const branchGeo = mapBranches.find(bg => bg.id === (a.referenceId || 'BR-001'));
                  const branchName = branchGeo ? branchGeo.district : 'Chi nhánh Quận 1';

                  return (
                    <div key={a.id} className={`scd-anomaly-card-premium ${cardType}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className={`scd-badge ${a.anomalyType === 'SPIKE_EXPORT' ? 'orange' : a.anomalyType === 'LARGE_ADJUSTMENT' ? 'blue' : 'red'}`} style={{ fontSize: 10.5 }}>
                          {badgeText}
                        </span>
                        <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>{hourStr}</span>
                      </div>
                      
                      <h4 style={{ margin: '14px 0 6px', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                        {a.anomalyType === 'SPIKE_EXPORT' ? `Phát hiện nhu cầu tăng đột biến tại ${branchName}` : a.anomalyType === 'LARGE_ADJUSTMENT' ? `Sai lệch ngày hết hạn dược phẩm` : `Nghi vấn thất thoát tồn kho tại ${branchName}`}
                      </h4>
                      
                      <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: '#64748b', lineHeight: 1.5 }}>
                        {a.description}
                      </p>
                      
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button className="scd-btn scd-btn-primary" style={{ padding: '6px 14px', fontSize: '12.5px', flex: 1 }} onClick={() => setSelectedAnomaly(a)}>
                          Điều tra
                        </button>
                        <button className="scd-btn scd-btn-secondary" style={{ padding: '6px 10px', fontSize: '12.5px' }} onClick={() => setSelectedAnomaly(a)}>
                          •••
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Side: Predictive Stockout Forecast & Investigations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Predictive Stockout Forecast SVG Chart */}
              <div className="scd-panel">
                <div className="scd-panel-header">
                  <div>
                    <div className="scd-panel-title">Dự báo hết hàng</div>
                    <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 500 }}>Mức tồn kho tính toán bởi AI so với tốc độ tiêu thụ hiện tại</span>
                  </div>
                  <button className="scd-btn scd-btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    30 ngày tới
                  </button>
                </div>

                <div className="scd-chart-container">
                  <svg viewBox="0 0 500 180" width="100%" height="100%">
                    <line x1="50" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="50" y1="60" x2="480" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="50" y1="100" x2="480" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="50" y1="140" x2="480" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                    
                    <line x1="50" y1="140" x2="50" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="120" y1="140" x2="120" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="190" y1="140" x2="190" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="260" y1="140" x2="260" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="330" y1="140" x2="330" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="400" y1="140" x2="400" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="470" y1="140" x2="470" y2="20" stroke="#f1f5f9" strokeWidth="1" />

                    <path 
                      d="M 50 120 L 120 80 L 190 70 L 260 50 L 330 90 L 400 110 L 470 60 L 470 140 L 50 140 Z" 
                      fill="rgba(59, 130, 246, 0.15)" 
                      stroke="#3b82f6" 
                      strokeWidth="2" 
                    />

                    <path 
                      d="M 50 130 L 120 110 L 190 60 L 260 90 L 330 110 L 400 70 L 470 50 L 470 140 L 50 140 Z" 
                      fill="rgba(239, 68, 68, 0.25)" 
                      stroke="#ef4444" 
                      strokeWidth="2" 
                    />

                    <line x1="330" y1="140" x2="330" y2="20" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" />
                    <circle cx="330" cy="110" r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />

                    <text x="50" y="156" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="700">T2</text>
                    <text x="120" y="156" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="700">T3</text>
                    <text x="190" y="156" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="700">T4</text>
                    <text x="260" y="156" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="700">T5</text>
                    <text x="330" y="156" fill="#ef4444" fontSize="10" textAnchor="middle" fontWeight="700">T6</text>
                    <text x="400" y="156" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="700">T7</text>
                    <text x="470" y="156" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="700">CN</text>
                  </svg>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, padding: '0 10px' }}>
                    <div style={{ display: 'flex', gap: 14, fontSize: '11px', fontWeight: 700 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 10, height: 10, background: 'rgba(59, 130, 246, 0.25)', border: '1px solid #3b82f6', borderRadius: 2 }} />
                        Cung ứng dự kiến
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 10, height: 10, background: 'rgba(239, 68, 68, 0.35)', border: '1px solid #ef4444', borderRadius: 2 }} />
                        Chênh lệch nhu cầu
                      </span>
                    </div>
                    <div style={{ color: '#b91c1c', fontSize: '11.5px', fontWeight: 800 }}>
                      *Dự báo hết hàng: Thứ Sáu, 18:00
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Investigations Table */}
              <div className="scd-panel">
                <div className="scd-panel-header" style={{ marginBottom: 12 }}>
                  <div className="scd-panel-title">Hoạt động điều tra đang diễn ra</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="scd-btn scd-btn-secondary" style={{ padding: 6 }}><Filter size={14} /></button>
                    <button className="scd-btn scd-btn-secondary" style={{ padding: 6 }} onClick={handleExportCSV}><Download size={14} /></button>
                  </div>
                </div>

                <div className="scd-table-wrapper">
                  <table className="scd-data-table">
                    <thead>
                      <tr>
                        <th>Chi nhánh / Mã số</th>
                        <th>Loại bất thường</th>
                        <th>Trạng thái</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <div className="scd-item-name">Chi nhánh Quận 7</div>
                          <div className="scd-item-sub">AN-7829-X</div>
                        </td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>
                            <AlertCircle size={13} /> Chênh lệch số liệu
                          </span>
                        </td>
                        <td>
                          <span className="scd-badge orange">ĐANG ĐÁNH GIÁ</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <span className="scd-action-link" style={{ fontSize: '12.5px' }} onClick={() => setSelectedItem(MOCK_MEDICINES[0])}>Kiểm toán</span>
                            <span className="scd-action-link" style={{ fontSize: '12.5px', color: '#64748b' }}>Liên hệ</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <div className="scd-item-name">Chi nhánh Quận 1</div>
                          <div className="scd-item-sub">AN-7830-Y</div>
                        </td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '12px', fontWeight: 700, color: '#f97316' }}>
                            <TrendingUp size={13} /> Nhu cầu tăng vọt
                          </span>
                        </td>
                        <td>
                          <span className="scd-badge blue">ĐANG GIÁM SÁT</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <span className="scd-action-link" style={{ fontSize: '12.5px' }} onClick={() => setSelectedItem(MOCK_MEDICINES[1])}>Bổ sung</span>
                            <span className="scd-action-link" style={{ fontSize: '12.5px', color: '#64748b' }}>Chi tiết</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <div className="scd-item-name">Kho trung tâm</div>
                          <div className="scd-item-sub">AN-7831-Z</div>
                        </td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '12px', fontWeight: 700, color: '#3b82f6' }}>
                            <FileText size={13} /> Sai lệch dữ liệu
                          </span>
                        </td>
                        <td>
                          <span className="scd-badge green">ĐÃ XỬ LÝ</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <span className="scd-action-link" style={{ fontSize: '12.5px', color: '#10b981' }}>Đã lưu trữ</span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>

          {/* Footer Sync Integrity statistics cards */}
          <div className="scd-footer-stats">
            <div className="scd-footer-stat-card">
              <div className="scd-footer-stat-icon-wrap" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                <ArrowLeftRight size={20} />
              </div>
              <div>
                <div className="scd-footer-stat-lbl">Độ tin cậy đồng bộ</div>
                <div className="scd-footer-stat-val">99.8%</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Đồng bộ: 2 phút trước</div>
              </div>
            </div>

            <div className="scd-footer-stat-card">
              <div className="scd-footer-stat-icon-wrap" style={{ background: '#f0fdf4', color: '#10b981' }}>
                <UserCheck size={20} />
              </div>
              <div>
                <div className="scd-footer-stat-lbl">Độ chính xác mô hình</div>
                <div className="scd-footer-stat-val">94.2%</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Giảm 12% cảnh báo giả</div>
              </div>
            </div>

            <div className="scd-footer-stat-card">
              <div className="scd-footer-stat-icon-wrap" style={{ background: '#faf5ff', color: '#a855f7' }}>
                <Activity size={20} />
              </div>
              <div>
                <div className="scd-footer-stat-lbl">Hiệu suất hệ thống</div>
                <div className="scd-footer-stat-val">2.4k / giây</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Đang hoạt động thời gian thực</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── DIALOGS & DRAWERS ─── */}
      
      {/* Detail Drawer (UC-30) */}
      {selectedItem && <DetailDrawer item={selectedItem} onClose={() => setSelectedItem(null)} />}
      
      {/* Branch Detail Modal */}
      {selectedBranchDetails && (
        <BranchDetailModal 
          branch={selectedBranchDetails}
          stockData={finalStockData}
          onClose={() => setSelectedBranchDetails(null)}
        />
      )}

      {/* Anomaly Detail Modal (UC-37) */}
      {selectedAnomaly && <AnomalyModal anomaly={selectedAnomaly} onClose={() => setSelectedAnomaly(null)} />}

      {/* Advanced Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        serviceLevel={serviceLevel}
        setServiceLevel={setServiceLevel}
        periodDays={periodDays}
        setPeriodDays={setPeriodDays}
        zScore={zScore}
        setZScore={setZScore}
        onSave={handleApplySettings}
      />
      
    </div>
  );
}
