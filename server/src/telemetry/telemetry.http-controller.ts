import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { lastValueFrom, timeout } from "rxjs";
import { TELEMETRY_CLIENT, telemetryTopic } from "../mqtt/mqtt.options.js";
import { safeCallAsync } from "../core/result/result.js";
import { PublishAckDto, PublishReadingDto, ReadingDto } from "./dto.js";
import { parseReading } from "./reading.js";
import { TelemetryService } from "./telemetry.service.js";

const PUBLISH_ACK_TIMEOUT_MS = 5000;

@ApiTags("telemetry")
@Controller("telemetry")
export class TelemetryHttpController {
  constructor(
    private readonly telemetry: TelemetryService,
    @Inject(TELEMETRY_CLIENT) private readonly client: ClientProxy,
  ) {}

  @Get("latest")
  @ApiOperation({ summary: "Latest reading per storage device (in-memory)" })
  @ApiResponse({ status: 200, description: "Latest readings", type: [ReadingDto] })
  getLatest() {
    return this.telemetry.getLatest();
  }

  @Get("latest/:deviceId")
  @ApiOperation({ summary: "Latest reading for one storage device" })
  @ApiParam({ name: "deviceId", example: "fridge-01" })
  @ApiResponse({ status: 200, description: "Latest reading", type: ReadingDto })
  @ApiResponse({ status: 404, description: "No readings for this device yet" })
  getLatestById(@Param("deviceId") deviceId: string) {
    const reading = this.telemetry.getLatestById(deviceId);
    if (reading === undefined) {
      throw new NotFoundException(`No readings for device "${deviceId}"`);
    }
    return reading;
  }

  /**
   * Publish a reading through the broker (request/response over MQTT) so the
   * full subscribe path can be exercised over HTTP.
   */
  @Post("publish")
  @ApiOperation({ summary: "Publish a reading via MQTT and wait for the ingest acknowledgement" })
  @ApiBody({ type: PublishReadingDto })
  @ApiResponse({ status: 201, description: "Published and acknowledged", type: PublishAckDto })
  @ApiResponse({ status: 400, description: "Reading failed validation" })
  @ApiResponse({ status: 503, description: "No MQTT acknowledgement (broker unreachable?)" })
  async publish(@Body() body: PublishReadingDto) {
    const parsed = parseReading("", body);
    if (parsed.isErr()) {
      throw new BadRequestException(parsed.error.message);
    }
    const reading = parsed.value;
    const ack = await safeCallAsync(() =>
      lastValueFrom(
        this.client
          .send(telemetryTopic(reading.deviceId), reading)
          .pipe(timeout(PUBLISH_ACK_TIMEOUT_MS)),
      ),
    );
    return ack.match(
      (response) => ({ published: true, ack: response }),
      (error) => {
        throw new ServiceUnavailableException(`No MQTT acknowledgement: ${error.message}`);
      },
    );
  }
}
