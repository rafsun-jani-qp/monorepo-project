import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Public } from '../../auth/decorator/decorator.custom.js';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { UserService } from '../service/user.service.js';

@Controller('api')
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

  @Public()
  @Post('/users')
  create(@Body() data: CreateUserDto) {
    return this.userService.create(data);
  }
}
