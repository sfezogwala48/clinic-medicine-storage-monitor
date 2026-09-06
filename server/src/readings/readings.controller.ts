import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AlertsService } from "../alerts/alerts.service.js";
import { SensorReadingDto, TemperatureSeriesDto, TempTrendQueryDto } from "./reading.dto.js";
import { ReadingsService } from "./readings.service.js";

function readingStatus(temp: number | undefined, alerts: number): string {
  if (alerts > 0) return "Critical";
  if (temp != null && temp >= 24) return "Warning";
  return "Normal";
}

@ApiTags("readings")
@Controller("api")
export class ReadingsController {
  constructor(
    private readonly readings: ReadingsService,
    private readonly alerts: AlertsService,
  ) {}

  @Get("readings")
  @ApiOperation({ summary: "Latest reading per sensor" })
  @ApiResponse({ status: 200, type: [SensorReadingDto] })
  async latest(): Promise<SensorReadingDto[]> {
    const rows = await this.readings.latestPerSensor();
    return Promise.all(
      rows.map(async (r) => {
        const count = await this.alerts.activeCountForSensor(r.sensorId);
        return {
          sensorId: r.sensorId,
          ...(r.temp !== undefined ? { temp: r.temp } : {}),
          ...(r.humidity !== undefined ? { humidity: r.humidity } : {}),
          ...(r.containerOpen !== undefined ? { containerOpen: r.containerOpen } : {}),
          status: readingStatus(r.temp, count),
          alerts: count,
        };
      }),
    );
  }

  @Get("temperature-trend")
  @ApiOperation({ summary: "24h temperature series for the trend chart" })
  @ApiResponse({ status: 200, type: TemperatureSeriesDto })
  trend(@Query() q: TempTrendQueryDto): Promise<TemperatureSeriesDto> {
    return this.readings.temperatureSeries(q.sensorId, q.range ?? "24h");
  }
}
