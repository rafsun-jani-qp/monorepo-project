import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../../apiKey/guard/api-key.guard.js';
import { Public } from '../../auth/decorator/decorator.custom.js';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { FindUsersQueryDto } from '../dto/find-users-query.dto.js';
import { UserService } from '../service/user.service.js';

@Controller('api')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/users')
  findAll(@Query() query: FindUsersQueryDto) {
    return this.userService.findAll(query);
  }

  @Public()
  @UseGuards(ApiKeyGuard)
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
