import jwt from 'jsonwebtoken';
import User from '../models/user.model';
import Category from '../models/category.model';
import { sequelize } from '../config/database';
import { SEED_CATEGORIES } from '../config/seed-categories';

export class AuthService {
  async findOrCreateGoogleUser(profile: {
    id: string;
    emails?: { value: string }[];
    displayName: string;
  }): Promise<User> {
    const email = profile.emails?.[0]?.value;
    const [user, created] = await User.findOrCreate({
      where: { email },
      defaults: {
        email,
        name: profile.displayName,
        provider: 'google',
        providerId: profile.id,
      },
    });

    if (created) {
      await sequelize.transaction(async (t) => {
        await Category.bulkCreate(
          SEED_CATEGORIES.map((c) => ({ ...c, userId: user.id })),
          { transaction: t },
        );
      });
    }

    return user;
  }

  generateToken(user: User): string {
    const secret = process.env.JWT_SECRET ?? 'dev-secret';
    const expiresIn = process.env.JWT_EXPIRES_IN ?? '7d';
    return jwt.sign(
      { id: user.id, email: user.email },
      secret,
      { expiresIn } as jwt.SignOptions
    );
  }
}
