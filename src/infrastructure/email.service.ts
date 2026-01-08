import nodemailer from 'nodemailer';
import { SettingsService } from '../settings/settings.service';

export class EmailService {
  private transporter: nodemailer.Transporter;
  private settingsService: SettingsService;

  constructor(transporter?: nodemailer.Transporter, settingsService?: SettingsService) {
    this.transporter =
      transporter ??
      nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: Number(process.env.SMTP_PORT) || 587,
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
    this.settingsService = settingsService ?? new SettingsService();
  }

  async send(to: string, subject: string, html: string, text?: string) {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@local',
      to,
      subject,
      html,
      text,
    });
  }

  async sendVerificationEmail(to: string, token: string) {
    const settings = await this.settingsService.getSettings();
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify?token=${encodeURIComponent(token)}`;
    const restaurantName = settings.restaurantName;
    const brandColor = settings.themePrimaryColor;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
          .header { background-color: ${brandColor}; color: #ffffff !important; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .header h1 { color: #ffffff !important; margin: 0; font-size: 24px; }
          .content { background-color: #ffffff; padding: 30px; border-radius: 0 0 5px 5px; border: 1px solid #e0e0e0; border-top: none; }
          .content p { color: #333333; margin: 10px 0; }
          .button { display: inline-block; padding: 12px 30px; background-color: ${brandColor}; color: #ffffff !important; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .button:hover { background-color: ${brandColor}dd; }
          .link-text { word-break: break-all; color: ${brandColor}; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍽️ Welcome to ${restaurantName}!</h1>
          </div>
          <div class="content">
            <p>Thank you for signing up!</p>
            <p>Please verify your email address by clicking the button below:</p>
            <p style="text-align: center;">
              <a href="${verifyUrl}" class="button" style="color: #ffffff !important; background-color: ${brandColor}; text-decoration: none; display: inline-block; padding: 12px 30px; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p class="link-text">${verifyUrl}</p>
            <p><strong>This verification link will expire in 24 hours.</strong></p>
            <p>If you didn't create an account with ${restaurantName}, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${restaurantName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const text = `Welcome to ${restaurantName}! Please verify your email by visiting: ${verifyUrl}. This link will expire in 24 hours.`;
    await this.send(to, `🍽️ Verify Your Email - ${restaurantName}`, html, text);
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const settings = await this.settingsService.getSettings();
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${encodeURIComponent(token)}`;
    const restaurantName = settings.restaurantName;
    const brandColor = settings.themePrimaryColor;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
          .header { background-color: ${brandColor}; color: #ffffff !important; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .header h1 { color: #ffffff !important; margin: 0; font-size: 24px; }
          .content { background-color: #ffffff; padding: 30px; border-radius: 0 0 5px 5px; border: 1px solid #e0e0e0; border-top: none; }
          .content p { color: #333333; margin: 10px 0; }
          .button { display: inline-block; padding: 12px 30px; background-color: ${brandColor}; color: #ffffff !important; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .link-text { word-break: break-all; color: ${brandColor}; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset Request</h1>
          </div>
          <div class="content">
            <p>You requested a password reset for your ${restaurantName} account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button" style="color: #ffffff !important; background-color: ${brandColor}; text-decoration: none; display: inline-block; padding: 12px 30px; border-radius: 5px; font-weight: bold;">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p class="link-text">${resetUrl}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you did not request this reset, please ignore this email and your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${restaurantName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const text = `You requested a password reset for your ${restaurantName} account. Visit: ${resetUrl}. This link will expire in 1 hour.`;
    await this.send(to, `🔒 Reset Your Password - ${restaurantName}`, html, text);
  }
}

export default EmailService;
