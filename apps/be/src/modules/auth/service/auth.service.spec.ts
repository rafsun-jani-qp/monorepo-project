import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UserService } from '../../users/service/user.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let userService: { findOneByUserName: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    userService = { findOneByUserName: vi.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: userService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws UnauthorizedException when the user is not found', async () => {
    userService.findOneByUserName.mockResolvedValue(null);

    await expect(service.signIn('unknown', 'pass')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('returns the user without the password when credentials are valid', async () => {
    const hashedPassword = await bcrypt.hash('pass', 10);
    const user = { id: '1', userName: 'known', password: hashedPassword };
    userService.findOneByUserName.mockResolvedValue(user);

    await expect(service.signIn('known', 'pass')).resolves.toEqual({
      id: '1',
      userName: 'known',
    });
  });

  it('throws UnauthorizedException when the password is invalid', async () => {
    const hashedPassword = await bcrypt.hash('correct-pass', 10);
    const user = { id: '1', userName: 'known', password: hashedPassword };
    userService.findOneByUserName.mockResolvedValue(user);

    await expect(service.signIn('known', 'wrong-pass')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
