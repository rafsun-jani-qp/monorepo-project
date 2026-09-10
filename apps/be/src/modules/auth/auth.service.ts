import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../users/service/user.service.js';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UserService) {}

  async signIn(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByUserName(username);
    if (!user) {
      throw new UnauthorizedException();
    }
    // if (user?.password !== pass) {
    //   throw new UnauthorizedException();
    // }
    // const { ...result } = user;
    // TODO: Generate a JWT and return it here
    // instead of the user object
    return user;
  }
}
