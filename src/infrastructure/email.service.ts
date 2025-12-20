import nodemailer from 'nodemailer'

export class EmailService {
  private transporter: nodemailer.Transporter

  constructor(transporter?: nodemailer.Transporter) {
    this.transporter = transporter ?? nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: Number(process.env.SMTP_PORT) || 587,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  }

  async send(to: string, subject: string, html: string, text?: string) {
    await this.transporter.sendMail({ from: process.env.SMTP_FROM || 'no-reply@local', to, subject, html, text })
  }

  async sendVerificationEmail(to: string, token: string) {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify?token=${encodeURIComponent(token)}`
    const html = `<p>Please verify your email by clicking <a href="${verifyUrl}">here</a>.</p>`
    await this.send(to, 'Verify your email', html)
  }
}

export default EmailService
