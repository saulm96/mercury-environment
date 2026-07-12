import jwt from 'jsonwebtoken';
import { AuthService } from '../src/services/auth.service';
import User from '../src/models/user.model';
import Category from '../src/models/category.model';
import { sequelize } from '../src/config/database';

jest.mock('../src/models/user.model');
jest.mock('../src/models/category.model');
jest.mock('../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(),
  },
}));
jest.mock('../src/config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret',
    JWT_EXPIRES_IN: '7d',
    NODE_ENV: 'test',
    COOKIE_DOMAIN: 'localhost',
    FRONTEND_URL: 'http://localhost:3000',
    PORT: 3001,
    DB_HOST: 'localhost',
    DB_PORT: 3306,
    DB_NAME: 'mercury',
    DB_USER: 'mercury',
    DB_PASSWORD: '',
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
    GOOGLE_CALLBACK_URL: '',
  },
}));

const MockedUser = User as jest.Mocked<typeof User>;
const MockedCategory = Category as jest.Mocked<typeof Category>;
const MockedSequelize = sequelize as jest.Mocked<typeof sequelize>;

function mockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    provider: 'google',
    providerId: 'google-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    toJSON: () => ({ id: 'user-1', email: 'test@example.com', name: 'Test User' }),
    ...overrides,
  } as unknown as User;
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    jest.clearAllMocks();
  });

  describe('findOrCreateGoogleUser', () => {
    const profile = {
      id: 'google-123',
      emails: [{ value: 'test@example.com' }],
      displayName: 'Test User',
    };

    it('creates a new user and seeds categories', async () => {
      const user = mockUser();
      (MockedUser.findOrCreate as jest.Mock).mockResolvedValue([user, true]);

      (MockedSequelize.transaction as jest.Mock).mockImplementation(
        async (fn: (t: unknown) => Promise<void>) => {
          const tx = { id: 'tx-1' };
          await fn(tx);
        },
      );

      (MockedCategory.bulkCreate as jest.Mock).mockResolvedValue([]);

      const result = await service.findOrCreateGoogleUser(profile);

      expect(result).toBe(user);
      expect(MockedUser.findOrCreate).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        defaults: {
          email: 'test@example.com',
          name: 'Test User',
          provider: 'google',
          providerId: 'google-123',
        },
      });
      expect(MockedSequelize.transaction).toHaveBeenCalled();
      expect(MockedCategory.bulkCreate).toHaveBeenCalled();
      const bulkCreateArg = (MockedCategory.bulkCreate as jest.Mock).mock.calls[0][0];
      expect(bulkCreateArg.length).toBe(12);
      expect(bulkCreateArg[0].userId).toBe('user-1');
    });

    it('returns existing user without seeding categories again', async () => {
      const user = mockUser();
      (MockedUser.findOrCreate as jest.Mock).mockResolvedValue([user, false]);

      const result = await service.findOrCreateGoogleUser(profile);

      expect(result).toBe(user);
      expect(MockedSequelize.transaction).not.toHaveBeenCalled();
      expect(MockedCategory.bulkCreate).not.toHaveBeenCalled();
    });
  });

  describe('generateToken', () => {
    it('returns a valid JWT containing user id and email', () => {
      const user = mockUser();

      const token = service.generateToken(user);

      const decoded = jwt.verify(token, 'test-secret') as jwt.JwtPayload;
      expect(decoded.id).toBe('user-1');
      expect(decoded.email).toBe('test@example.com');
    });

    it('sets token expiry to 7 days', () => {
      const user = mockUser();

      const token = service.generateToken(user);

      const decoded = jwt.decode(token) as jwt.JwtPayload;
      const expiresInSeconds = (decoded.exp as number) - (decoded.iat as number);
      expect(expiresInSeconds).toBe(7 * 24 * 60 * 60);
    });
  });
});
