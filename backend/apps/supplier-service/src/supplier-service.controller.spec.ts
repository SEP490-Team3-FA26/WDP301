/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { SupplierServiceController } from './supplier-service.controller';
import { SupplierServiceService } from './supplier-service.service';

describe('SupplierServiceController', () => {
  let controller: SupplierServiceController;
  let service: SupplierServiceService;

  const mockSupplierService = {
    getById: jest.fn(),
    getAll: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SupplierServiceController],
      providers: [
        { provide: SupplierServiceService, useValue: mockSupplierService },
      ],
    }).compile();

    controller = app.get<SupplierServiceController>(SupplierServiceController);
    service = app.get<SupplierServiceService>(SupplierServiceService);
  });

  it('should return supplier by id', async () => {
    const id = '123';
    const mockSupplier = { id, name: 'Test Supplier' };
    mockSupplierService.getById.mockResolvedValue(mockSupplier);

    const result = await controller.getById({ id });
    expect(service.getById).toHaveBeenCalledWith(id);
    expect(result).toEqual(mockSupplier);
  });
});
