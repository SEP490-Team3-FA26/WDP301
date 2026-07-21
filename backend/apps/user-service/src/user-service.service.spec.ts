/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user-service.service';
import { getModelToken } from '@nestjs/mongoose';
import { RpcException } from '@nestjs/microservices';

describe('UserService - getExportJobStatus', () => {
  let service: UserService;

  const mockModel = {};
  const mockKafkaClient = {
    subscribeToResponseOf: jest.fn(),
    connect: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getModelToken('User'), useValue: mockModel },
        { provide: getModelToken('Cart'), useValue: mockModel },
        { provide: getModelToken('AuditLog'), useValue: mockModel },
        { provide: 'INVENTORY_SERVICE', useValue: mockKafkaClient },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should throw RpcException if job is not found', async () => {
    await expect(service.getExportJobStatus('invalid-id')).rejects.toThrow(RpcException);
  });

  it('should return job if found', async () => {
    const jobId = 'test-id';
    const jobData: any = {
      id: jobId,
      status: 'COMPLETED',
      filename: 'test.csv.gz',
      createdAt: new Date(),
    };

    (service as any).exportJobs.set(jobId, jobData);

    const result = await service.getExportJobStatus(jobId);
    expect(result).toEqual(jobData);
  });
});
