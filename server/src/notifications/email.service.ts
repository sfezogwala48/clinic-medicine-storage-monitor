import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppLogger } from "../core/logger/app-logger.service.js";

export interface AlertEmailPayload {
  toEmail: string;
  alertId: string;
  sensorId: string;
  type: string;
  severity: string;
  message: string;
}

const EMAILJS_SEND_URL = "https://api.emailjs.com/api/v1.0/email/send";

/**
 * Thin wrapper around the EmailJS REST API.
 *
 * Credentials come from env (never commit real keys):
 *   EMAILJS_PUBLIC_KEY   (user_id / public key)
 *   EMAILJS_PRIVATE_KEY  (accessToken — server only, never expose to the browser)
 *   EMAILJS_SERVICE_ID   (e.g. service_xxxxxxx from the EmailJS dashboard)
 *   EMAILJS_TEMPLATE_ID  (e.g. template_xxxxxxx for alert emails)
 *
 * Template params sent: to_email, alert_id, sensor_id, alert_type,
 * severity, message, subject.
 */
@Injectable()
export class EmailService {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: AppLogger,
  ) {}

  get publicKey(): string {
    return this.config.get<string>("EMAILJS_PUBLIC_KEY", "");
  }

  private get privateKey(): string {
    return this.config.get<string>("EMAILJS_PRIVATE_KEY", "");
  }

  get serviceId(): string {
    return this.config.get<string>("EMAILJS_SERVICE_ID", "");
  }

  get templateId(): string {
    return this.config.get<string>("EMAILJS_TEMPLATE_ID", "");
  }

  /** True when all four EmailJS settings are present. */
  isConfigured(): boolean {
    return Boolean(this.publicKey && this.privateKey && this.serviceId && this.templateId);
  }

  status(): { configured: boolean; serviceId: string; templateId: string; publicKey: string } {
    return {
      configured: this.isConfigured(),
      serviceId: this.serviceId,
      templateId: this.templateId,
      // Public key is safe to expose; the private key is never returned.
      publicKey: this.publicKey,
    };
  }

  async sendAlertEmail(payload: AlertEmailPayload): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn("EmailJS not configured — skipping email dispatch", "Email");
      return false;
    }
    const subject = `[Clinic Monitor] ${payload.severity}: ${payload.type} on ${payload.sensorId}`;
    const body = {
      service_id: this.serviceId,
      template_id: this.templateId,
      user_id: this.publicKey,
      accessToken: this.privateKey,
      template_params: {
        to_email: payload.toEmail,
        subject,
        alert_id: payload.alertId,
        sensor_id: payload.sensorId,
        alert_type: payload.type,
        severity: payload.severity,
        message: payload.message,
      },
    };
    try {
      const res = await fetch(EMAILJS_SEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        this.logger.warn(`EmailJS send failed (${res.status}): ${text.slice(0, 300)}`, "Email");
        return false;
      }
      this.logger.log(`Alert email sent to ${payload.toEmail} for ${payload.alertId}`, "Email");
      return true;
    } catch (e) {
      this.logger.warn(
        `EmailJS send error: ${e instanceof Error ? e.message : String(e)}`,
        "Email",
      );
      return false;
    }
  }

  async sendTestEmail(toEmail: string): Promise<{ sent: boolean; configured: boolean }> {
    const configured = this.isConfigured();
    if (!configured) return { sent: false, configured };
    const sent = await this.sendAlertEmail({
      toEmail,
      alertId: "TEST",
      sensorId: "TEST-SENSOR",
      type: "Test email",
      severity: "Info",
      message: "This is a test email from the Clinic Medicine Storage Monitor.",
    });
    return { sent, configured };
  }
}
