import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppGatewayModule } from '../src/app.module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { JwtAuthGuard } from '../src/guards/jwt-auth.guard';
import { Notification, NotificationSchema } from '../src/notification/notification.schema';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { of } from 'rxjs';

jest.setTimeout(30000);

describe('Notification API (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let notificationModel: Model<Notification>;

  // A mock JWT Guard that allows us to simulate a logged-in user
  const mockJwtGuard = {
    canActivate: (context: any) => {
      const req = context.switchToHttp().getRequest();
      req.user = {
        _id: 'test-user-id',
        email: 'admin@vinapharmacy.com',
        role: 'admin',
        branchId: null,
      };
      return true;
    },
  };

  // Mock Kafka Client
  const mockKafkaClient = {
    subscribeToResponseOf: jest.fn(),
    connect: jest.fn().mockResolvedValue(true),
    send: jest.fn().mockImplementation(() => of({ success: true })),
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
      .useValue(mockKafkaClient)
      .overrideProvider('SUPPLIER_SERVICE')
      .useValue(mockKafkaClient)
      .overrideProvider('USER_SERVICE')
      .useValue(mockKafkaClient)
      .overrideProvider('ORDER_SERVICE')
      .useValue(mockKafkaClient)
      .overrideProvider('KAFKA_SERVICE')
      .useValue(mockKafkaClient)
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
  });

  describe('GET /api/notifications/me', () => {
    it('should return empty list when no notifications exist', async () => {
      const response = await request(app.getHttpServer()).get('/api/notifications/me').expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.data).toEqual([]);
    });

    it('should return notifications targeted to admin room', async () => {
      // Seed a notification
      await notificationModel.create({
        type: 'NEW_PO',
        targetRoom: 'admin',
        message: 'Test message for admin',
        readBy: [],
      });

      // Seed another notification for a different room (should not be returned)
      await notificationModel.create({
        type: 'NEW_PR',
        targetRoom: 'warehouse',
        message: 'Test message for warehouse',
        readBy: [],
      });

      const response = await request(app.getHttpServer()).get('/api/notifications/me').expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].message).toBe('Test message for admin');
      expect(response.body.data[0].read).toBe(false);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should correctly count unread notifications', async () => {
      await notificationModel.create({
        type: 'NEW_PO',
        targetRoom: 'admin',
        message: 'Unread 1',
        readBy: [],
      });
      await notificationModel.create({
        type: 'NEW_PO',
        targetRoom: 'admin',
        message: 'Read 1',
        readBy: ['test-user-id'],
      });

      const response = await request(app.getHttpServer())
        .get('/api/notifications/unread-count')
        .expect(200);

      expect(response.body.data).toBe(1);
    });
  });

  describe('PATCH /api/notifications/mark-all-read', () => {
    it('should mark all unread notifications in users rooms as read', async () => {
      const notif1 = await notificationModel.create({
        type: 'NEW_PO',
        targetRoom: 'admin',
        message: 'Unread 1',
        readBy: [],
      });
      const notif2 = await notificationModel.create({
        type: 'NEW_PO',
        targetRoom: 'admin',
        message: 'Unread 2',
        readBy: [],
      });

      await request(app.getHttpServer()).patch('/api/notifications/mark-all-read').expect(200);

      const dbNotif1 = await notificationModel.findById(notif1._id);
      const dbNotif2 = await notificationModel.findById(notif2._id);

      expect(dbNotif1.readBy).toContain('test-user-id');
      expect(dbNotif2.readBy).toContain('test-user-id');
    });
  });
});
