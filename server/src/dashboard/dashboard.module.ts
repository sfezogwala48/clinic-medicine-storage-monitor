import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AlertEntity } from "../alerts/alert.entity.js";
import { ReadingEntity } from "../readings/reading.entity.js";
import { SensorEntity } from "../sensors/sensor.entity.js";
import { DashboardController } from "./dashboard.controller.js";
import { DashboardService } from "./dashboard.service.js";

@Module({
  imports: [TypeOrmModule.forFeature([ReadingEntity, AlertEntity, SensorEntity])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
