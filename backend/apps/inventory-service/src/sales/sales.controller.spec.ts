import { Test, TestingModule } from '@nestjs/testing';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { RpcException } from '@nestjs/microservices';

describe('SalesController', () => {
  let controller: SalesController;
  let service: SalesService;

  const mockSalesService = {
    getPrescriptionByCode: jest.fn(),
    listPrescriptions: jest.fn(),
    createSalesOrder: jest.fn(),
    listSalesOrders: jest.fn(),
    getSalesOrderById: jest.fn(),
    processReturn: jest.fn(),
    processExchange: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesController],
      providers: [
        {
          provide: SalesService,
          useValue: mockSalesService,
        },
      ],
    }).compile();

    controller = module.get<SalesController>(SalesController);
    service = module.get<SalesService>(SalesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPrescriptionByCode', () => {
    it('should return prescription detail on success', async () => {
      const mockResult = { prescriptionCode: 'PRX-01', patientName: 'John Doe' };
      mockSalesService.getPrescriptionByCode.mockResolvedValue(mockResult);

      const result = await controller.getPrescriptionByCode({ code: 'PRX-01' });
      expect(result).toBe(mockResult);
      expect(service.getPrescriptionByCode).toHaveBeenCalledWith('PRX-01');
    });

    it('should throw RpcException if service throws error', async () => {
      mockSalesService.getPrescriptionByCode.mockRejectedValue(new Error('DB error'));
      await expect(controller.getPrescriptionByCode({ code: 'PRX-01' })).rejects.toThrow(RpcException);
    });
  });

  describe('listPrescriptions', () => {
    it('should return list of prescriptions', async () => {
      const mockResult = [{ prescriptionCode: 'PRX-01' }];
      mockSalesService.listPrescriptions.mockResolvedValue(mockResult);

      const result = await controller.listPrescriptions();
      expect(result).toBe(mockResult);
      expect(service.listPrescriptions).toHaveBeenCalled();
    });
  });

  describe('createSalesOrder', () => {
    it('should create sales order and deduct stock', async () => {
      const mockResult = { success: true, message: 'Deduct success' };
      mockSalesService.createSalesOrder.mockResolvedValue(mockResult);

      const payload = { type: 'RETAIL', items: [] };
      const result = await controller.createSalesOrder(payload);
      expect(result).toBe(mockResult);
      expect(service.createSalesOrder).toHaveBeenCalledWith(payload);
    });
  });

  describe('listSalesOrders', () => {
    it('should return list of sales orders matching query', async () => {
      const mockResult = [{ _id: 'order-1', patientPhone: '09999999' }];
      mockSalesService.listSalesOrders.mockResolvedValue(mockResult);

      const result = await controller.listSalesOrders({ search: '09999999' });
      expect(result).toBe(mockResult);
      expect(service.listSalesOrders).toHaveBeenCalledWith('09999999');
    });
  });

  describe('getSalesOrderById', () => {
    it('should fetch sales order by database ID', async () => {
      const mockResult = { _id: 'order-1', totalAmount: 15000 };
      mockSalesService.getSalesOrderById.mockResolvedValue(mockResult);

      const result = await controller.getSalesOrderById({ id: 'order-1' });
      expect(result).toBe(mockResult);
      expect(service.getSalesOrderById).toHaveBeenCalledWith('order-1');
    });
  });

  describe('processReturn', () => {
    it('should return items and update inventory selected batches', async () => {
      const mockResult = { success: true, message: 'Returned items successfully' };
      mockSalesService.processReturn.mockResolvedValue(mockResult);

      const payload = { salesOrderId: 'order-1', items: [] };
      const result = await controller.processReturn(payload);
      expect(result).toBe(mockResult);
      expect(service.processReturn).toHaveBeenCalledWith(payload);
    });
  });

  describe('processExchange', () => {
    it('should execute exchange new items and return old items', async () => {
      const mockResult = { success: true, message: 'Exchanged successfully' };
      mockSalesService.processExchange.mockResolvedValue(mockResult);

      const payload = { salesOrderId: 'order-1', returnedItems: [], newItems: [] };
      const result = await controller.processExchange(payload);
      expect(result).toBe(mockResult);
      expect(service.processExchange).toHaveBeenCalledWith(payload);
    });
  });
});
