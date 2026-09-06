import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActuatorEntity } from "./actuator.entity.js";
import { SensorEntity } from "./sensor.entity.js";
import { SensorsController } from "./sensors.controller.js";
import { SensorsService } from "./sensors.service.js";

@Module({
  imports: [TypeOrmModule.forFeature([SensorEntity, ActuatorEntity])],
  controllers: [SensorsController],
  providers: [SensorsService],
  exports: [SensorsService],
})
export class SensorsModule {}
