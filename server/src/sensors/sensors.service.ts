import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppLogger } from "../core/logger/app-logger.service.js";
import { ActuatorEntity } from "./actuator.entity.js";
import { SensorEntity } from "./sensor.entity.js";

const SEED_SENSORS: SensorEntity[] = [
  {
    id: "SEN001",
    type: "Temp/Humidity",
    location: "Medicine Storage Room A",
    model: "SHT31",
    status: "Active",
    container: "Cold Room A",
    lastSeenAt: null,
  },
  {
    id: "SEN002",
    type: "Temp/Humidity",
    location: "Medicine Storage Room A",
    model: "SHT31",
    status: "Active",
    container: "Fridge A1",
    lastSeenAt: null,
  },
  {
    id: "SEN003",
    type: "Temp/Humidity",
    location: "Vaccine Fridge Room",
    model: "DS18B20",
    status: "Active",
    container: "Vaccine Fridge",
    lastSeenAt: null,
  },
  {
    id: "SEN004",
    type: "Temp/Humidity",
    location: "Pharmacy Store",
    model: "SHT31",
    status: "Active",
    container: "Shelf B",
    lastSeenAt: null,
  },
  {
    id: "SEN005",
    type: "Magnetic Door",
    location: "Medicine Storage Room A",
    model: "MC-38",
    status: "Active",
    container: "Medicine Cabinet A",
    lastSeenAt: null,
  },
  {
    id: "SEN006",
    type: "Magnetic Door",
    location: "Vaccine Fridge Room",
    model: "MC-38",
    status: "Active",
    container: "Vaccine Container",
    lastSeenAt: null,
  },
];

const SEED_ACTUATORS: ActuatorEntity[] = [
  {
    id: "BUZ-A",
    kind: "Buzzer",
    location: "Medicine Storage Room A",
    status: "Active",
    lastSeenAt: null,
  },
  {
    id: "BUZ-VAC",
    kind: "Buzzer",
    location: "Vaccine Fridge Room",
    status: "Active",
    lastSeenAt: null,
  },
];

@Injectable()
export class SensorsService {
  constructor(
    @InjectRepository(SensorEntity) private readonly sensors: Repository<SensorEntity>,
    @InjectRepository(ActuatorEntity) private readonly actuators: Repository<ActuatorEntity>,
    private readonly logger: AppLogger,
  ) {}

  async seed(): Promise<void> {
    if ((await this.sensors.count()) === 0) {
      await this.sensors.save(SEED_SENSORS);
      this.logger.log(`Seeded ${SEED_SENSORS.length} sensors`, "Sensors");
    }
    if ((await this.actuators.count()) === 0) {
      await this.actuators.save(SEED_ACTUATORS);
      this.logger.log(`Seeded ${SEED_ACTUATORS.length} actuators`, "Sensors");
    }
  }

  listSensors(type?: string, status?: string): Promise<SensorEntity[]> {
    return this.sensors.find({
      where: {
        ...(type ? { type: type as SensorEntity["type"] } : {}),
        ...(status ? { status: status as SensorEntity["status"] } : {}),
      },
      order: { id: "ASC" },
    });
  }

  findSensor(id: string): Promise<SensorEntity | null> {
    return this.sensors.findOne({ where: { id } });
  }

  /** Ensure a sensor row exists for an unknown device id (auto-provision as climate sensor). */
  async ensureSensor(
    id: string,
    type: SensorEntity["type"] = "Temp/Humidity",
  ): Promise<SensorEntity> {
    const existing = await this.findSensor(id);
    if (existing) return existing;
    return this.sensors.save({
      id,
      type,
      location: "Unassigned",
      model: "Unknown",
      status: "Active",
      container: null,
      lastSeenAt: new Date().toISOString(),
    });
  }

  markSeen(id: string, type?: SensorEntity["type"]): Promise<void> {
    return this.ensureSensor(id, type).then(async (sensor) => {
      sensor.status = "Active";
      sensor.lastSeenAt = new Date().toISOString();
      await this.sensors.save(sensor);
    });
  }

  markInactive(id: string): Promise<void> {
    return this.sensors.findOne({ where: { id } }).then(async (sensor) => {
      if (sensor) {
        sensor.status = "Inactive";
        await this.sensors.save(sensor);
      }
    });
  }

  actuatorsForLocation(location: string): Promise<ActuatorEntity[]> {
    return this.actuators.find({ where: { location, status: "Active" } });
  }

  async markActuatorSeen(id: string, location = "Unassigned"): Promise<void> {
    const existing = await this.actuators.findOne({ where: { id } });
    if (existing) {
      existing.status = "Active";
      existing.lastSeenAt = new Date().toISOString();
      await this.actuators.save(existing);
    } else {
      await this.actuators.save({
        id,
        kind: "Buzzer",
        location,
        status: "Active",
        lastSeenAt: new Date().toISOString(),
      });
    }
  }
}
