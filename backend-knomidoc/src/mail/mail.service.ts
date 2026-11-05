import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Encapsula el envío de correos del sistema (actualmente solo recuperación
 * de contraseña). Usa SMTP vía nodemailer; la configuración se toma de
 * variables de entorno para no acoplar el código a un proveedor concreto
 * (Gmail, Office365, un SMTP institucional, Mailtrap en desarrollo, etc.).
 *
 * Variables de entorno esperadas:
 *  - MAIL_HOST, MAIL_PORT, MAIL_SECURE ('true'/'false')
 *  - MAIL_USER, MAIL_PASSWORD (opcionales si el SMTP no exige autenticación)
 *  - MAIL_FROM (remitente que verá el usuario)
 *  - FRONTEND_URL (para construir el enlace de restablecimiento)
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor() {
    const port = Number(process.env.MAIL_PORT ?? 587);
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port,
      secure: process.env.MAIL_SECURE
        ? process.env.MAIL_SECURE === 'true'
        : port === 465,
      auth: process.env.MAIL_USER
        ? {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASSWORD,
          }
        : undefined,
    });
  }

  /**
   * Envía un código numérico (verificación de correo o recuperación de
   * contraseña). Si no hay SMTP configurado (MAIL_HOST vacío) y no es
   * producción, el código se escribe en el log para poder probar el flujo.
   */
  async sendCodigo(
    destinatario: string,
    nombreCompleto: string,
    codigo: string,
    proposito: 'EMAIL_VERIFICACION' | 'RECUPERACION_PASSWORD',
    minutos: number,
  ): Promise<void> {
    const verificacion = proposito === 'EMAIL_VERIFICACION';
    const asunto = verificacion
      ? 'Código de verificación de correo - KnomiDoc'
      : 'Código para recuperar tu contraseña - KnomiDoc';

    if (!process.env.MAIL_HOST) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'El servidor de correo (MAIL_HOST) no está configurado',
        );
      }
      this.logger.warn(`[SIN SMTP] ${asunto} para ${destinatario}: ${codigo}`);
      return;
    }

    const remitente =
      process.env.MAIL_FROM ?? '"KnomiDoc" <no-reply@knomidoc.com>';
    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1f2937;">
        <p>Hola ${nombreCompleto || 'usuario/a'},</p>
        <p>${
          verificacion
            ? 'Para confirmar tu correo en <strong>KnomiDoc</strong> ingresa este código:'
            : 'Recibimos una solicitud para restablecer tu contraseña en <strong>KnomiDoc</strong>. Ingresa este código:'
        }</p>
        <p style="font-size:30px;letter-spacing:8px;font-weight:bold;margin:18px 0;">${codigo}</p>
        <p>El código vence en <strong>${minutos} minutos</strong> y solo puede usarse una vez.</p>
        <p>Si tú no lo solicitaste, ignora este correo; nadie podrá acceder sin el código.</p>
      </div>`;

    try {
      await this.transporter.sendMail({
        from: remitente,
        to: destinatario,
        subject: asunto,
        html,
        text: `Tu código de KnomiDoc es ${codigo}. Vence en ${minutos} minutos.`,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el código a ${destinatario}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /** Envía el correo con el enlace para restablecer la contraseña. */
  async sendPasswordReset(
    destinatario: string,
    nombreCompleto: string,
    enlace: string,
  ): Promise<void> {
    const remitente =
      process.env.MAIL_FROM ?? '"KnomiDoc" <no-reply@knomidoc.com>';

    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1f2937;">
        <p>Hola ${nombreCompleto || 'usuario/a'},</p>
        <p>
          Recibimos una solicitud para restablecer la contraseña de tu cuenta en
          <strong>KnomiDoc</strong>.
        </p>
        <p>
          Haz clic en el siguiente enlace para crear una nueva contraseña.
          Este enlace vence en <strong>1 hora</strong>:
        </p>
        <p>
          <a href="${enlace}" style="display:inline-block;padding:10px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;">
            Restablecer contraseña
          </a>
        </p>
        <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
        <p style="word-break: break-all;">${enlace}</p>
        <p>Si tú no solicitaste este cambio, puedes ignorar este correo.</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: remitente,
        to: destinatario,
        subject: 'Recuperación de contraseña - KnomiDoc',
        html,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el correo de recuperación a ${destinatario}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
