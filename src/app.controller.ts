import { Controller, Get, Post, Body, UseGuards, Request, Ip, Headers } from '@nestjs/common';
import { AppService, UserService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Protected route example
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return {
      message: 'This is a protected route',
      user: req.user,
    };
  }
}

@Controller("user") 
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post("register")
  async registerUser(@Body() body: { email: string; password: string }): Promise<{ success: boolean; message: string }> {
    return this.userService.registerUser(body.email, body.password);
  }

  @Post("login")
  async login(
    @Body() body: { email: string; password: string },
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ): Promise<{ success: boolean; message: string; accessToken?: string; refreshToken?: string }> {
    return this.userService.login(body.email, body.password, userAgent, ip);
  }

  @Post("refresh")
  async refreshToken(@Body() body: { refreshToken: string }): Promise<{ success: boolean; message: string; accessToken?: string; refreshToken?: string }> {
    return this.userService.refreshToken(body.refreshToken);
  }

  @Post("logout")
  async logout(@Body() body: { refreshToken: string }): Promise<{ success: boolean; message: string }> {
    return this.userService.logout(body.refreshToken);
  }

  // Protected route example
  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getCurrentUser(@Request() req): Promise<{ email: string; userId: number }> {
    return {
      email: req.user.email,
      userId: req.user.userId
    };
  }
}
