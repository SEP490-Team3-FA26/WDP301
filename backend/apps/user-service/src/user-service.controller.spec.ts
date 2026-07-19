/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { UserServiceController } from './user-service.controller';
import { UserService } from './user-service.service';
import { BranchService } from './branch.service';

describe('UserServiceController', () => {
  let controller: UserServiceController;
  let userService: UserService;

  const mockUserService = {
    getExportJobStatus: jest.fn(),
  };
  const mockBranchService = {};

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [UserServiceController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: BranchService, useValue: mockBranchService },
      ],
    }).compile();

    controller = app.get<UserServiceController>(UserServiceController);
    userService = app.get<UserService>(UserService);
  });

  it('should call getExportJobStatus on service', async () => {
    const jobId = 'test-job';
    const mockStatus: any = { id: jobId, status: 'COMPLETED' };
    mockUserService.getExportJobStatus.mockResolvedValue(mockStatus);

    const result = await controller.handleExportAuditLogsStatus({ jobId });
    expect(userService.getExportJobStatus).toHaveBeenCalledWith(jobId);
    expect(result).toEqual(mockStatus);
  });
});
