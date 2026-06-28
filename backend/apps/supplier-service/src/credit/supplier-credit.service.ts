import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Supplier } from '../supplier.schema';
import { SupplierCreditTransaction } from '../schemas/supplier-credit-transaction.schema';

@Injectable()
export class SupplierCreditService {
  private readonly logger = new Logger(SupplierCreditService.name);

  constructor(
    @InjectModel(Supplier.name) private readonly supplierModel: Model<Supplier>,
    @InjectModel(SupplierCreditTransaction.name)
    private readonly creditTxnModel: Model<SupplierCreditTransaction>,
  ) {}

  /**
   * Kiểm tra hạn mức trước khi duyệt PO mua nợ
   */
  async checkCreditLimit(supplierId: string, amount: number) {
    this.logger.log(`Checking credit limit for supplier: ${supplierId}, amount: ${amount}`);

    const supplier = await this.supplierModel.findById(supplierId).exec();
    if (!supplier) {
      throw new RpcException({ message: 'Không tìm thấy nhà cung cấp', statusCode: 404 });
    }

    if (supplier.status !== 'ACTIVE') {
      return {
        allowed: false,
        reason: `NCC "${supplier.name}" đang ở trạng thái ${supplier.status}`,
        currentDebt: supplier.currentDebt || 0,
        creditLimit: supplier.creditLimit || 0,
        remainingCredit: 0,
      };
    }

    const creditLimit = supplier.creditLimit || 0;
    const currentDebt = supplier.currentDebt || 0;
    const remainingCredit = creditLimit - currentDebt;
    const allowed = creditLimit === 0 ? false : currentDebt + amount <= creditLimit;

    return {
      allowed,
      reason: allowed
        ? 'OK'
        : creditLimit === 0
          ? `NCC "${supplier.name}" chưa được thiết lập hạn mức công nợ`
          : `Vượt hạn mức! Nợ hiện tại: ${currentDebt.toLocaleString()}đ + PO mới: ${amount.toLocaleString()}đ > Hạn mức: ${creditLimit.toLocaleString()}đ`,
      currentDebt,
      creditLimit,
      remainingCredit: Math.max(0, remainingCredit),
      supplierName: supplier.name,
    };
  }

  /**
   * Cập nhật hạn mức & kỳ hạn thanh toán NCC
   */
  async updateCreditLimit(supplierId: string, data: { creditLimit?: number; paymentTermDays?: number }) {
    this.logger.log(`Updating credit limit for supplier: ${supplierId}`);

    const supplier = await this.supplierModel.findById(supplierId).exec();
    if (!supplier) {
      throw new RpcException({ message: 'Không tìm thấy nhà cung cấp', statusCode: 404 });
    }

    if (data.creditLimit !== undefined) supplier.creditLimit = data.creditLimit;
    if (data.paymentTermDays !== undefined) supplier.paymentTermDays = data.paymentTermDays;
    await supplier.save();

    return {
      success: true,
      message: `Cập nhật hạn mức NCC "${supplier.name}" thành công`,
      data: {
        id: supplier._id.toString(),
        name: supplier.name,
        creditLimit: supplier.creditLimit,
        currentDebt: supplier.currentDebt,
        paymentTermDays: supplier.paymentTermDays,
      },
    };
  }

  /**
   * Ghi nợ khi nhập kho (GRN) cho PO mua nợ
   */
  async recordGrnPayable(data: {
    supplierId: string;
    grnId: string;
    amount: number;
    performedBy?: string;
  }) {
    const { supplierId, grnId, amount, performedBy } = data;
    this.logger.log(`Recording GRN payable for supplier: ${supplierId}, amount: ${amount}`);

    const supplier = await this.supplierModel.findById(supplierId).exec();
    if (!supplier) {
      throw new RpcException({ message: 'Không tìm thấy nhà cung cấp', statusCode: 404 });
    }

    const balanceBefore = supplier.currentDebt || 0;
    const balanceAfter = balanceBefore + amount;

    supplier.currentDebt = balanceAfter;
    await supplier.save();

    // Tính ngày đến hạn
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (supplier.paymentTermDays || 30));

    const txn = new this.creditTxnModel({
      supplierId,
      type: 'GRN_PAYABLE',
      amount,
      balanceBefore,
      balanceAfter,
      referenceId: grnId,
      referenceType: 'GOODS_RECEIPT',
      dueDate,
      performedBy,
      notes: `Phát sinh công nợ từ phiếu nhập kho #${grnId}`,
    });
    await txn.save();

    return {
      success: true,
      message: `Ghi nợ ${amount.toLocaleString()}đ cho NCC "${supplier.name}"`,
      data: { transactionId: txn._id.toString(), balanceBefore, balanceAfter, dueDate },
    };
  }

  /**
   * Ghi nhận thanh toán cho NCC
   */
  async recordPayment(data: {
    supplierId: string;
    amount: number;
    paymentMethod: string;
    notes?: string;
    performedBy?: string;
  }) {
    const { supplierId, amount, paymentMethod, notes, performedBy } = data;
    this.logger.log(`Recording payment for supplier: ${supplierId}, amount: ${amount}`);

    if (amount <= 0) {
      throw new RpcException({ message: 'Số tiền thanh toán phải lớn hơn 0', statusCode: 400 });
    }

    const supplier = await this.supplierModel.findById(supplierId).exec();
    if (!supplier) {
      throw new RpcException({ message: 'Không tìm thấy nhà cung cấp', statusCode: 404 });
    }

    const currentDebt = supplier.currentDebt || 0;
    if (currentDebt <= 0) {
      throw new RpcException({ message: `NCC "${supplier.name}" không có công nợ cần thanh toán`, statusCode: 400 });
    }

    const actualPayment = Math.min(amount, currentDebt);
    const balanceBefore = currentDebt;
    const balanceAfter = balanceBefore - actualPayment;

    supplier.currentDebt = balanceAfter;
    await supplier.save();

    // FIFO settle: đánh dấu các khoản nợ cũ nhất là đã TT
    const unpaidDebts = await this.creditTxnModel
      .find({ supplierId, type: 'GRN_PAYABLE', paidAt: null })
      .sort({ dueDate: 1 })
      .exec();

    let remainingPayment = actualPayment;
    for (const debt of unpaidDebts) {
      if (remainingPayment <= 0) break;
      if (remainingPayment >= debt.amount) {
        debt.paidAt = new Date();
        remainingPayment -= debt.amount;
      }
      await debt.save();
    }

    const txn = new this.creditTxnModel({
      supplierId,
      type: 'PAYMENT',
      amount: -actualPayment,
      balanceBefore,
      balanceAfter,
      referenceType: 'PAYMENT_VOUCHER',
      paymentMethod,
      paidAt: new Date(),
      performedBy,
      notes: notes || `Thanh toán công nợ NCC ${actualPayment.toLocaleString()}đ`,
    });
    await txn.save();

    return {
      success: true,
      message: `Đã thanh toán ${actualPayment.toLocaleString()}đ cho NCC "${supplier.name}"`,
      data: { transactionId: txn._id.toString(), paidAmount: actualPayment, balanceBefore, balanceAfter },
    };
  }

  /**
   * Chi tiết công nợ NCC + lịch sử giao dịch
   */
  async getDebtDetail(supplierId: string) {
    this.logger.log(`Getting debt detail for supplier: ${supplierId}`);

    const supplier = await this.supplierModel.findById(supplierId).exec();
    if (!supplier) {
      throw new RpcException({ message: 'Không tìm thấy nhà cung cấp', statusCode: 404 });
    }

    const transactions = await this.creditTxnModel
      .find({ supplierId })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();

    return {
      supplier: {
        id: supplier._id.toString(),
        name: supplier.name,
        creditLimit: supplier.creditLimit || 0,
        currentDebt: supplier.currentDebt || 0,
        remainingCredit: Math.max(0, (supplier.creditLimit || 0) - (supplier.currentDebt || 0)),
        paymentTermDays: supplier.paymentTermDays || 30,
        status: supplier.status,
      },
      transactions: transactions.map((t) => ({
        id: t._id.toString(),
        type: t.type,
        amount: t.amount,
        balanceBefore: t.balanceBefore,
        balanceAfter: t.balanceAfter,
        referenceId: t.referenceId,
        referenceType: t.referenceType,
        dueDate: t.dueDate,
        paidAt: t.paidAt,
        paymentMethod: t.paymentMethod,
        notes: t.notes,
        performedBy: t.performedBy,
        createdAt: (t as any).createdAt,
      })),
    };
  }

  /**
   * Tổng hợp công nợ toàn hệ thống
   */
  async getDebtSummary() {
    this.logger.log('Getting supplier debt summary');
    const now = new Date();

    const suppliers = await this.supplierModel.find({ status: 'ACTIVE' }).exec();

    let totalDebt = 0;
    let totalCreditLimit = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    for (const s of suppliers) {
      totalDebt += s.currentDebt || 0;
      totalCreditLimit += s.creditLimit || 0;

      const overdue = await this.creditTxnModel
        .find({ supplierId: s._id.toString(), type: 'GRN_PAYABLE', paidAt: null, dueDate: { $lt: now } })
        .exec();

      if (overdue.length > 0) {
        overdueCount++;
        overdueAmount += overdue.reduce((sum, d) => sum + d.amount, 0);
      }
    }

    return {
      totalSuppliers: suppliers.length,
      totalDebt,
      totalCreditLimit,
      utilizationRate: totalCreditLimit > 0 ? Math.round((totalDebt / totalCreditLimit) * 100) : 0,
      overdueSuppliers: overdueCount,
      overdueAmount,
      suppliers: suppliers.map((s) => ({
          id: s._id.toString(),
          name: s.name,
          creditLimit: s.creditLimit || 0,
          currentDebt: s.currentDebt || 0,
          remainingCredit: Math.max(0, (s.creditLimit || 0) - (s.currentDebt || 0)),
          utilizationPercent: (s.creditLimit || 0) > 0 ? Math.round(((s.currentDebt || 0) / s.creditLimit) * 100) : 0,
        })),
    };
  }

  /**
   * Nợ quá hạn
   */
  async getOverdueDebts() {
    this.logger.log('Getting overdue supplier debts');
    const now = new Date();

    const overdueTransactions = await this.creditTxnModel
      .find({ type: 'GRN_PAYABLE', paidAt: null, dueDate: { $lt: now } })
      .sort({ dueDate: 1 })
      .exec();

    const supplierIds = [...new Set(overdueTransactions.map((t) => t.supplierId))];
    const suppliers = await this.supplierModel.find({ _id: { $in: supplierIds } }).exec();
    const supplierMap = new Map(suppliers.map((s) => [s._id.toString(), s]));

    const grouped = supplierIds.map((sid) => {
      const supplier = supplierMap.get(sid);
      const debts = overdueTransactions.filter((t) => t.supplierId === sid);
      const totalOverdue = debts.reduce((sum, d) => sum + d.amount, 0);
      const oldestDue = debts[0]?.dueDate;
      const daysOverdue = oldestDue
        ? Math.ceil((now.getTime() - new Date(oldestDue).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        supplierId: sid,
        supplierName: supplier?.name || '',
        totalOverdue,
        overdueCount: debts.length,
        oldestDueDate: oldestDue,
        daysOverdue,
      };
    });

    return {
      totalOverdueSuppliers: grouped.length,
      totalOverdueAmount: grouped.reduce((sum, g) => sum + g.totalOverdue, 0),
      suppliers: grouped,
    };
  }

  /**
   * Phân tích tuổi nợ (Aging)
   */
  async getDebtAging(supplierId: string) {
    this.logger.log(`Getting debt aging for supplier: ${supplierId}`);

    const supplier = await this.supplierModel.findById(supplierId).exec();
    if (!supplier) {
      throw new RpcException({ message: 'Không tìm thấy nhà cung cấp', statusCode: 404 });
    }

    const now = new Date();
    const unpaidDebts = await this.creditTxnModel
      .find({ supplierId, type: 'GRN_PAYABLE', paidAt: null })
      .sort({ dueDate: 1 })
      .exec();

    const aging = { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0 };

    for (const debt of unpaidDebts) {
      if (!debt.dueDate || new Date(debt.dueDate) >= now) {
        aging.current += debt.amount;
      } else {
        const daysOverdue = Math.ceil((now.getTime() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        if (daysOverdue <= 30) aging.days1_30 += debt.amount;
        else if (daysOverdue <= 60) aging.days31_60 += debt.amount;
        else if (daysOverdue <= 90) aging.days61_90 += debt.amount;
        else aging.over90 += debt.amount;
      }
    }

    return {
      supplierId,
      supplierName: supplier.name,
      creditLimit: supplier.creditLimit || 0,
      currentDebt: supplier.currentDebt || 0,
      aging,
      totalUnpaid: unpaidDebts.reduce((sum, d) => sum + d.amount, 0),
      unpaidCount: unpaidDebts.length,
    };
  }
}
