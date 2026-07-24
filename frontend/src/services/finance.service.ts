import api from './core/api';

export interface ExpensePayload {
  branchId: string;
  branchName?: string;
  category: 'RENT' | 'SALARY' | 'UTILITY' | 'OTHER';
  title: string;
  amount: number;
  transactionDate?: string;
  notes?: string;
  createdBy?: string;
}

export interface ExpenseItem extends ExpensePayload {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashFlowSummary {
  year: number;
  totalRevenue: number;
  totalCogs: number;
  totalFixedExpenses: number;
  totalExpense: number;
  netProfit: number;
  monthlyChart: {
    month: string;
    revenue: number;
    cogs: number;
    fixedExpenses: number;
    totalExpenses: number;
    netProfit: number;
  }[];
  expensesCount: number;
  ordersCount: number;
}

export const financeService = {
  async createExpense(payload: ExpensePayload) {
    const response = await api.post<ExpenseItem>('/api/finance/expenses', payload);
    return response.data;
  },

  async getExpenses(params?: { branchId?: string; category?: string; year?: string }) {
    const response = await api.get<ExpenseItem[]>('/api/finance/expenses', { params });
    return response.data;
  },

  async getCashFlowSummary(params?: { branchId?: string; year?: string }) {
    const response = await api.get<CashFlowSummary>('/api/finance/cashflow', { params });
    return response.data;
  }
};
