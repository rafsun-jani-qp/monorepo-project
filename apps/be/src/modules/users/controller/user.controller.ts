import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { User } from '../entity/user.entity.js';
import { UserService } from '../service/user.service.js';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/users')
  findAll() {
    return this.userService.findAll();
  }

  @Get('/users/:id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Post('/users')
  create(@Body() data: Partial<User>) {
    return this.userService.create(data);
  }
}
