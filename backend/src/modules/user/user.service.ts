import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';

@Injectable()
export class UserService {
  constructor(@InjectRepository(UserEntity) private readonly users: Repository<UserEntity>, private readonly jwt: JwtService) {}
  async register(email: string, nickname: string, password: string) {
    const user = this.users.create({ email, nickname, passwordHash: await bcrypt.hash(password, 10) });
    return this.users.save(user);
  }
  async login(email: string, password: string) {
    const user = await this.users.findOneBy({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
    return { token: this.jwt.sign({ userId: user.id, nickname: user.nickname }), user: { id: user.id, nickname: user.nickname } };
  }
}
