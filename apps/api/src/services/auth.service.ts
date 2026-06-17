import jwt from 'jsonwebtoken';
import User from '../models/user.model';

export class AuthService {
  async findOrCreateGoogleUser(profile: {
    id: string;
    emails?: { value: string }[];
    displayName: string;
  }): Promise<User> {
    const email = profile.emails?.[0]?.value;
    const [user] = await User.findOrCreate({
      where: { email },
      defaults: {
        email,
        name: profile.displayName,
        provider: 'google',
        providerId: profile.id,
      },
    });
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
