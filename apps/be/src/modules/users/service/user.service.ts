import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { User } from '../entity/user.entity.js';

const POSTGRES_UNIQUE_VIOLATION = '23505';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  findOne(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  findOneByUserName(userName: string): Promise<User | null> {
    return this.userRepository.findOneBy({ userName });
  }

  async create(data: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(data);
    try {
      return await this.userRepository.save(user);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code ===
          POSTGRES_UNIQUE_VIOLATION
      ) {
        throw new ConflictException('userName is already taken');
      }
      throw error;
    }
  }
}
