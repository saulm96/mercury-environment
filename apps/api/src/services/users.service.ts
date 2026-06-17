import User from '../models/user.model';
import { NotFoundError } from '../middleware/error.middleware';

export class UsersService {
  async findById(id: string): Promise<User> {
    const user = await User.findByPk(id);
    if (!user) throw new NotFoundError(`User ${id} not found`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return User.findOne({ where: { email } });
  }
}
