import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User, UserRole } from './user.schema';
import { VerificationToken, TokenType } from './verification-token.schema';
import { SqsEmailService } from '../email/sqs-email.service';
import * as bcrypt from 'bcryptjs';


// viết ra để testing
describe('AuthService', () => {
  let service: AuthService;
  let userModel: any;
  let tokenModel: any;
  let jwtService: JwtService;
  let emailService: SqsEmailService;

  const mockUser = {
    _id: 'mockUserId',
    fullName: 'Test User',
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    role: UserRole.PHARMACIST,
    isActive: true,
    isEmailVerified: false,
    save: jest.fn().mockResolvedValue(this),
  };

  const mockToken = {
    token: '123456',
    type: TokenType.EMAIL_VERIFICATION,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes in future
    userId: 'test@example.com',
    isUsed: false,
    save: jest.fn().mockResolvedValue(this),
  };

  const mockUserModel = jest.fn().mockImplementation((dto) => ({
    ...dto,
    _id: 'mockUserId',
    save: jest.fn().mockResolvedValue({
      _id: 'mockUserId',
      email: dto.email,
      fullName: dto.fullName,
    }),
  })) as any;

  mockUserModel.findOne = jest.fn();
  mockUserModel.findById = jest.fn();
  mockUserModel.create = jest.fn();

  const mockTokenModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mockJwtToken'),
    verify: jest.fn(),
  };

  const mockEmailService = {
    sendEmail: jest.fn().mockResolvedValue(undefined),
    isEnabled: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(VerificationToken.name),
          useValue: mockTokenModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: SqsEmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userModel = module.get(getModelToken(User.name));
    tokenModel = module.get(getModelToken(VerificationToken.name));
    jwtService = module.get<JwtService>(JwtService);
    emailService = module.get<SqsEmailService>(SqsEmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully and send verification OTP', async () => {
      userModel.findOne.mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashedPassword'));

      const result = await service.register({
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(tokenModel.deleteMany).toHaveBeenCalled();
      expect(tokenModel.create).toHaveBeenCalled();
      expect(emailService.sendEmail).toHaveBeenCalled();
      expect(result.message).toContain('Đăng ký tài khoản thành công!');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw ConflictException if email already exists', async () => {
      userModel.findOne.mockResolvedValue(mockUser);

      await expect(
        service.register({
          fullName: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user does not exist', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nonexistent@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      userModel.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if email is not verified', async () => {
      const unverifiedUser = { ...mockUser, isEmailVerified: false };
      userModel.findOne.mockResolvedValue(unverifiedUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

      await expect(
        service.login({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return token if user email is verified and 2FA is not enabled', async () => {
      const verifiedUser = { ...mockUser, isEmailVerified: true, isTwoFactorEnabled: false };
      userModel.findOne.mockResolvedValue(verifiedUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

      const result = await service.login({ email: 'test@example.com', password: 'password123' });

      expect(result.access_token).toBe('mockJwtToken');
      expect(result.user.email).toBe('test@example.com');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const mockSavedUser = {
        ...mockUser,
        isEmailVerified: false,
        save: jest.fn().mockResolvedValue(true),
      };
      const mockSavedToken = {
        ...mockToken,
        isUsed: false,
        save: jest.fn().mockResolvedValue(true),
      };

      tokenModel.findOne.mockResolvedValue(mockSavedToken);
      userModel.findOne.mockResolvedValue(mockSavedUser);

      const result = await service.verifyEmail('test@example.com', '123456');

      expect(tokenModel.findOne).toHaveBeenCalled();
      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockSavedUser.isEmailVerified).toBe(true);
      expect(mockSavedToken.isUsed).toBe(true);
      expect(result.message).toContain('Xác thực email thành công!');
    });

    it('should throw UnauthorizedException if token not found', async () => {
      tokenModel.findOne.mockResolvedValue(null);

      await expect(
        service.verifyEmail('test@example.com', 'wrongtoken'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if token has expired', async () => {
      const expiredToken = {
        ...mockToken,
        expiresAt: new Date(Date.now() - 5000), // 5s in past
      };
      tokenModel.findOne.mockResolvedValue(expiredToken);

      await expect(
        service.verifyEmail('test@example.com', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('resendVerificationOtp', () => {
    it('should send verification OTP if account is not verified', async () => {
      const unverifiedUser = { ...mockUser, isEmailVerified: false };
      userModel.findOne.mockResolvedValue(unverifiedUser);

      const result = await service.resendVerificationOtp('test@example.com');

      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(tokenModel.create).toHaveBeenCalled();
      expect(emailService.sendEmail).toHaveBeenCalled();
      expect(result.message).toContain('Mã xác nhận mới đã được gửi');
    });

    it('should throw ConflictException if account is already verified', async () => {
      const verifiedUser = { ...mockUser, isEmailVerified: true };
      userModel.findOne.mockResolvedValue(verifiedUser);

      await expect(
        service.resendVerificationOtp('test@example.com'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
