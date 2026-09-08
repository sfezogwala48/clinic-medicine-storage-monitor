import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { IsEmail } from "class-validator";
import { Roles } from "../auth/roles.decorator.js";
import { EmailService } from "./email.service.js";

export class TestEmailDto {
  @IsEmail()
  to!: string;
}

@ApiTags("email")
@ApiBearerAuth()
@Controller("api/email")
export class EmailController {
  constructor(private readonly email: EmailService) {}

  @Get("status")
  @ApiOperation({ summary: "Whether EmailJS is configured (safe: never leaks the private key)." })
  async status(): Promise<{
    configured: boolean;
    serviceId: string;
    templateId: string;
    publicKey: string;
  }> {
    return this.email.status();
  }

  @Post("test")
  @Roles("admin", "supervisor")
  @ApiOperation({ summary: "Send a test email via EmailJS (admin/supervisor only)." })
  @ApiResponse({ status: 201, description: "Test email result." })
  async sendTest(@Body() body: TestEmailDto): Promise<{ sent: boolean; configured: boolean }> {
    return this.email.sendTestEmail(body.to);
  }
}
