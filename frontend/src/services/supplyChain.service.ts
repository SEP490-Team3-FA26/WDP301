import api from './api';

export interface BranchBreakdown {
  branchId: string;
  batchNo: string;
  stock: number;
  expDate: string;
}

export interface SafeStockItem {
  medicineId: string;
  medicineName: string;
  category: string;
  unit: string;
  currentStock: number;
  stockStatus: 'CRITICAL' | 'LOW' | 'SAFE' | 'OVERSTOCK';
  demand: {
    totalExported: number;
    avgDailyDemand: number;
    stdDevDemand: number;
  };
  leadTime: { avgDays: number; stdDevDays: number };
  turnover: {
    openingStock: number;
    closingStock: number;
    avgInventory: number;
    inventoryTurnoverRate: number;
    daysInInventory: number;
  };
  thresholds: {
    safetyStock: number;
    reorderPoint: number;
    eoq: number;
    serviceLevel: string;
  };
  branchBreakdown: BranchBreakdown[];
}

export interface SafeStockChainResponse {
  data: SafeStockItem[];
  total: number;
  page: number;
  limit: number;
  periodDays: number;
  serviceLevel: number;
}

export interface AnomalyStatistics {
  avgDailyExport: number;
  stdDev: number;
  zScore: number;
  upperThreshold: number;
  lowerThreshold: number;
}

export interface AnomalyItem {
  id: string;
  medicineId: string;
  medicineName: string;
  category: string;
  anomalyType: 'SPIKE_EXPORT' | 'UNUSUAL_LOW' | 'LARGE_ADJUSTMENT';
  severity: 'HIGH' | 'MEDIUM';
  transactionType: string;
  quantityChange: number;
  detectedAt: string;
  referenceId: string | null;
  referenceType: string | null;
  performedBy: string;
  statistics: AnomalyStatistics;
  description: string;
}

export interface AnomalyDetectionResponse {
  data: AnomalyItem[];
  total: number;
  periodDays: number;
  zScoreThreshold: number;
  analyzedAt: string;
  summary: {
    high: number;
    medium: number;
    spikeExport: number;
    largeAdjustment: number;
  };
}

export interface SafeStockChainParams {
  serviceLevel?: number;
  periodDays?: number;
  branchId?: string;
  page?: number;
  limit?: number;
}

export interface AnomalyDetectionParams {
  periodDays?: number;
  zScoreThreshold?: number;
}

// UC-30: Tồn kho thời gian thực toàn chuỗi + Thuật toán tồn kho an toàn
export const getSafeStockChain = async (params: SafeStockChainParams = {}): Promise<SafeStockChainResponse> => {
  const queryParams = new URLSearchParams();
  if (params.serviceLevel !== undefined) queryParams.append('serviceLevel', String(params.serviceLevel));
  if (params.periodDays !== undefined) queryParams.append('periodDays', String(params.periodDays));
  if (params.branchId) queryParams.append('branchId', params.branchId);
  if (params.page !== undefined) queryParams.append('page', String(params.page));
  if (params.limit !== undefined) queryParams.append('limit', String(params.limit));

  const { data } = await api.get(`/api/medicines/safe-stock-chain?${queryParams.toString()}`);
  return data;
};

// UC-37: Phát hiện bất thường tồn kho (Z-Score / 3-Sigma Thống Kê Thuần Túy)
export const getAnomalyDetection = async (params: AnomalyDetectionParams = {}): Promise<AnomalyDetectionResponse> => {
  const queryParams = new URLSearchParams();
  if (params.periodDays !== undefined) queryParams.append('periodDays', String(params.periodDays));
  if (params.zScoreThreshold !== undefined) queryParams.append('zScoreThreshold', String(params.zScoreThreshold));

  const { data } = await api.get(`/api/medicines/anomaly-detection?${queryParams.toString()}`);
  return data;
};
