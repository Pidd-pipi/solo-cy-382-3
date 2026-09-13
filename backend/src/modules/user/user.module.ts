import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserController } from './user.controller';
import { UserEntity } from './user.entity';
import { UserService } from './user.service';

@Module({ imports: [TypeOrmModule.forFeature([UserEntity]), JwtModule.register({ secret: process.env.JWT_SECRET ?? 'dev_secret' })], providers: [UserService], controllers: [UserController] })
export class UserModule {}
