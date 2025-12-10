import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { AppService, UserService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AuthService } from './auth/auth.service';

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
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService
  ) {}

  @Post("register")
  async registerUser(@Body() body: { email: string; password: string }): Promise<{ success: boolean; message: string }> {
    return this.userService.registerUser(body.email, body.password);
  }

  @Post("login")
  async login(
    @Body() body: { email: string; password: string },
    @Request() req
  ): Promise<{ success: boolean; message: string; accessToken?: string; refreshToken?: string }> {
    const deviceInfo = req.headers['user-agent'];
    const ip = req.ip || req.connection.remoteAddress;
    return this.userService.login(body.email, body.password, deviceInfo, ip);
  }

  @Post("refresh")
  async refresh(@Body() body: { refreshToken: string }) {
    const tokens = await this.authService.refreshAccessToken(body.refreshToken);
    
    if (!tokens) {
      return { success: false, message: 'Invalid or expired refresh token' };
    }
    
    return {
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  async logout(@Request() req, @Body() body: { refreshToken?: string }) {
    try {
      // If refresh token provided, revoke it
      if (body.refreshToken) {
        const payload = await this.authService.validateRefreshToken(body.refreshToken);
        if (payload && payload.jti) {
          await this.authService.revokeRefreshToken(payload.jti);
        }
      }
      
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      return { success: false, message: 'Logout failed' };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getProfile(@Request() req) {
    return {
      success: true,
      user: {
        id: req.user.userId,
        email: req.user.email,
      },
    };
  }
}
