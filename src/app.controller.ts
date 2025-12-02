import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService, UserService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }


}

@Controller("user") 
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post("register")
  async registerUser(@Body() body: { email: string; password: string }): Promise<string> {
    return this.userService.registerUser(body.email, body.password);
  }

  @Post("login")
  async login(@Body() body: { email: string; password: string }): Promise<{ success: boolean; message: string }> {
    return this.userService.login(body.email, body.password);
  }
}
