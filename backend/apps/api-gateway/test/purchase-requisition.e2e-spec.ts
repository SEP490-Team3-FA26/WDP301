import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppGatewayModule } from '../src/app.module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model } from 'mongoose';
import { JwtAuthGuard } from '../src/guards/jwt-auth.guard';
import { Notification, NotificationSchema } from '../src/notification/notification.schema';
import { getModelToken } from '@nestjs/mongoose';
import { of } from 'rxjs';

jest.setTimeout(30000);

describe('PurchaseRequisition API & Notification (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let notificationModel: Model<Notification>;

  // A mock JWT Guard that allows us to simulate a logged-in user
  const mockJwtGuard = {
    canActivate: (context: any) => {
      const req = context.switchToHttp().getRequest();
      req.user = {
        userId: 'branch-user-id',
        email: 'manager@vinapharmacy.com',
        role: 'branch',
        branchId: 'BR-001',
      };
      return true;
    },
  };

  // Mock Kafka Client
  const mockInventoryClient = {
    subscribeToResponseOf: jest.fn(),
    connect: jest.fn().mockResolvedValue(true),
    send: jest.fn().mockImplementation((pattern, data) => {
      // Simulate inventory service response for PR creation
      if (pattern === 'inventory.pr.create') {
        return of({
          data: {
            _id: 'mock-pr-id',
            prCode: 'PR-TEST-123',
            branchId: data.branchId,
            branchName: data.branchName,
            items: data.items,
            createdAt: new Date().toISOString(),
          },
        });
      }
      return of({ success: true });
    }),
  };

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGODB_URI = uri; // Override the env variable for AppModule

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppGatewayModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .overrideProvider('INVENTORY_SERVICE')
      .useValue(mockInventoryClient)
      .overrideProvider('SUPPLIER_SERVICE')
      .useValue(mockInventoryClient) // Reusing mock for simplicity
      .overrideProvider('USER_SERVICE')
      .useValue(mockInventoryClient)
      .overrideProvider('ORDER_SERVICE')
      .useValue(mockInventoryClient)
      .overrideProvider('KAFKA_SERVICE')
      .useValue(mockInventoryClient)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    notificationModel = moduleFixture.get<Model<Notification>>(getModelToken(Notification.name));
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (mongoServer) {
      await mongoose.disconnect();
      await mongoServer.stop();
    }
  });

  afterEach(async () => {
    // Clean up database after each test
    await notificationModel.deleteMany({});
    jest.clearAllMocks();
  });

  describe('POST /api/purchase-requisitions', () => {
    it('should create PR and emit NEW_PR notification to DB', async () => {
      const prPayload = {
        branchId: 'BR-001',
        branchName: 'Chi Nhánh 1',
        items: [
          { medicineId: 'med-1', requestedQuantity: 10, unit: 'Hộp' }
        ],
        reason: 'Test E2E'
      };

      // Call API
      const response = await request(app.getHttpServer())
        .post('/api/purchase-requisitions')
        .send(prPayload)
        .expect(201); // NestJS default for POST is 201

      // Verify Kafka client was called
      expect(mockInventoryClient.send).toHaveBeenCalledWith('inventory.pr.create', expect.anything());

      // Verify Notification was persisted in DB
      // We give it a short delay to allow background persistence to finish if it's not awaited
      await new Promise(resolve => setTimeout(resolve, 100));

      const notifications = await notificationModel.find().exec();
      expect(notifications).toHaveLength(1);
      
      const notif = notifications[0];
      expect(notif.type).toBe('NEW_PR');
      expect(notif.targetRoom).toBe('warehouse');
      expect(notif.prCode).toBe('PR-TEST-123');
      expect(notif.message).toContain('Chi Nhánh 1 vừa tạo yêu cầu nhập hàng PR-TEST-123');
    });
  });
});
