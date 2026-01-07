import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  Get,
  UseGuards,
  HttpCode,
  Inject,
  Param,
} from '@nestjs/common';
import express from 'express';
import { UserService } from '../app.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RefreshDto } from '../auth/dto/refresh.dto';
import { LoginDto } from '../auth/dto/login.dto';
import { RegisterDto } from '../auth/dto/register.dto';
import { VerifyEmailDto } from '../auth/dto/verify-email.dto';
import { RegistrationService } from '../auth/registration.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject(RegistrationService)
    private readonly registrationService: RegistrationService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.registrationService.register(registerDto);
  }

  @Post('verify-email')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.registrationService.verifyEmail(verifyEmailDto.token);
  }

  @Post('resend-verification')
  async resendVerification(@Body() body: { email: string }) {
    return this.registrationService.resendVerificationEmail(body.email);
  }

  @Post('request-password-reset')
  async requestPasswordReset(@Body() body: { email: string }) {
    return this.registrationService.requestPasswordReset(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; password: string }) {
    return this.registrationService.resetPassword(body.token, body.password);
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: LoginDto,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const deviceInfo = req.headers['user-agent'];
    const ip = req.ip;
    const result = await this.userService.login(
      body.email,
      body.password,
      deviceInfo,
      ip,
    );

    if (result.success && result.refreshToken) {
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });
    }

    return result;
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body() body: RefreshDto,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const refreshToken =
      (req.cookies?.refreshToken as string) || body.refreshToken;

    if (!refreshToken) {
      return { success: false, message: 'No refresh token provided' };
    }

    const result = await this.userService.refreshToken(refreshToken);

    if (result.success && result.refreshToken) {
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });
    }

    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: express.Request) {
    const user = req.user as any;
    return { user };
  }

  // Get user's order history (both paid and unpaid)
  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async getUserOrders(@Req() req: express.Request) {
    const userId = (req.user as any).userId;
    return this.userService.getUserOrders(userId);
  }

  // Get user's food preferences
  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  async getUserPreferences(@Req() req: express.Request) {
    const userId = (req.user as any).userId;
    return this.userService.getUserPreferences(userId);
  }

  // Update user's food preferences
  @Post('preferences')
  @UseGuards(JwtAuthGuard)
  async updateUserPreferences(
    @Req() req: express.Request,
    @Body() body: { dietary_tags: string[] }
  ) {
    const userId = (req.user as any).userId;
    return this.userService.updateUserPreferences(userId, body.dietary_tags);
  }

  // Get available dietary tags from menu items
  @Get('available-tags')
  @UseGuards(JwtAuthGuard)
  async getAvailableTags() {
    return this.userService.getAvailableDietaryTags();
  }

  // Get user's saved payment methods
  @Get('payment-methods')
  @UseGuards(JwtAuthGuard)
  async getPaymentMethods(@Req() req: express.Request) {
    const userId = (req.user as any).userId;
    return this.userService.getSavedPaymentMethods(userId);
  }

  // Save a new payment method
  @Post('payment-methods')
  @UseGuards(JwtAuthGuard)
  async savePaymentMethod(
    @Req() req: express.Request,
    @Body() body: {
      stripe_payment_method_id: string;
      card_brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
      is_default?: boolean;
    }
  ) {
    const userId = (req.user as any).userId;
    return this.userService.savePaymentMethod(userId, body);
  }

  // Delete a saved payment method
  @Post('payment-methods/:id/delete')
  @UseGuards(JwtAuthGuard)
  async deletePaymentMethod(
    @Req() req: express.Request,
    @Param('id') paymentMethodId: string
  ) {
    const userId = (req.user as any).userId;
    return this.userService.deletePaymentMethod(userId, parseInt(paymentMethodId));
  }

  // Set default payment method
  @Post('payment-methods/:id/set-default')
  @UseGuards(JwtAuthGuard)
  async setDefaultPaymentMethod(
    @Req() req: express.Request,
    @Param('id') paymentMethodId: string
  ) {
    const userId = (req.user as any).userId;
    return this.userService.setDefaultPaymentMethod(userId, parseInt(paymentMethodId));
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Body() body: { refreshToken?: string },
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const refreshToken =
      (req.cookies?.refreshToken as string) || body.refreshToken;

    if (!refreshToken) {
      return { success: false, message: 'No refresh token provided' };
    }

    const result = await this.userService.logout(refreshToken);

    if (result.success) {
      res.clearCookie('refreshToken', { path: '/' });
    }

    return result;
  }
}
