import jwt from 'jsonwebtoken';
import User from '../models/user.model';
import Category from '../models/category.model';
import { sequelize } from '../config/database';
import { SEED_CATEGORIES } from '../config/seed-categories';
import { env } from '../config/env';

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
    return jwt.sign(
      { id: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
    );
  }
}
