import { Controller, Get } from '@nestjs/common';
import { UserService } from '../service/user.service.js';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/users')
  getUsers() {
    return this.userService.getUsers();
  }
}
