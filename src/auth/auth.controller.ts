import { Controller, Post, Body, Req, Res, UseGuards, Get } from '@nestjs/common'
import express from 'express'
import { AuthService } from './auth.service'
import { UserService } from '../app.service'
import { LoginDto } from './dto/login.dto'
import { RefreshDto } from './dto/refresh.dto'
import { RegisterDto } from './dto/register.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'
import { JwtAuthGuard } from './jwt-auth.guard'
import { RegistrationService } from './registration.service'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService, 
    private readonly userService: UserService,
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
  async login(@Body() body: LoginDto, @Req() req: express.Request, @Res({ passthrough: true }) res: express.Response) {
    const deviceInfo = req.headers['user-agent'] as string | undefined
    const ip = req.ip
    const result = await this.userService.login(body.email, body.password, deviceInfo, ip)

    if (result.success && result.refreshToken) {
      const isProduction = process.env.NODE_ENV === 'production'
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      })
    }

    return result
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshDto, @Req() req: express.Request, @Res({ passthrough: true }) res: express.Response) {
    const refreshToken = (req.cookies?.refreshToken as string) || body.refreshToken
    if (!refreshToken) return { success: false, message: 'No refresh token provided' }

    const tokens = await this.authService.refreshAccessToken(refreshToken)
    if (!tokens) {
      res.clearCookie('refreshToken', { path: '/' })
      return { success: false, message: 'Invalid or expired refresh token' }
    }

    const isProduction = process.env.NODE_ENV === 'production'
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    })

    return { success: true, accessToken: tokens.accessToken }
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: express.Request, @Body() body: RefreshDto, @Res({ passthrough: true }) res: express.Response) {
    try {
      const refreshToken = (req.cookies?.refreshToken as string) || body.refreshToken
      if (refreshToken) {
        const payload = await this.authService.validateRefreshToken(refreshToken)
        if (payload && payload.jti) {
          await this.authService.revokeRefreshToken(payload.jti)
        }
      }

      res.clearCookie('refreshToken', { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' })
      return { success: true, message: 'Logged out successfully' }
    } catch (err) {
      return { success: false, message: 'Logout failed' }
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return { success: true, user: { id: req.user?.sub || req.user?.userId, email: req.user?.email } }
  }
}

export default AuthController
