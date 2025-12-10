import { Controller, Get, Post, Body, Request, UseGuards, Res, Req } from '@nestjs/common';
import type { Response, Request as ExpressRequest } from 'express';
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
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response
  ): Promise<{ success: boolean; message: string; accessToken?: string; refreshToken?: string; email?: string }> {
    const deviceInfo = req.headers['user-agent'];
    const ip = req.ip || req.connection?.remoteAddress;
    const result = await this.userService.login(body.email, body.password, deviceInfo, ip);
    
    // Set refresh token as httpOnly cookie
    if (result.success && result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }
    
    return result;
  }

  @Post("refresh")
  async refresh(
    @Body() body: { refreshToken?: string },
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response
  ) {
    // Try to get refresh token from cookie first, then from body
    const refreshToken = (req.cookies?.refreshToken || body.refreshToken) as string;
    
    if (!refreshToken) {
      return { success: false, message: 'No refresh token provided' };
    }
    
    const tokens = await this.authService.refreshAccessToken(refreshToken);
    
    if (!tokens) {
      // Clear invalid cookie
      res.clearCookie('refreshToken');
      return { success: false, message: 'Invalid or expired refresh token' };
    }
    
    // Update refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    return {
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  async logout(
    @Request() req,
    @Body() body: { refreshToken?: string },
    @Res({ passthrough: true }) res: Response,
    @Req() request: ExpressRequest
  ) {
    try {
      // Try to get refresh token from cookie first, then from body
      const refreshToken = request.cookies?.refreshToken || body.refreshToken;
      
      // If refresh token provided, revoke it
      if (refreshToken) {
        const payload = await this.authService.validateRefreshToken(refreshToken);
        if (payload && payload.jti) {
          await this.authService.revokeRefreshToken(payload.jti);
        }
      }
      
      // Clear refresh token cookie
      res.clearCookie('refreshToken');
      
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
