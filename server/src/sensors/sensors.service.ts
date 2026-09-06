import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ActuatorEntity } from "./actuator.entity.js";
import type { UpdateSensorDto } from "./sensor.dto.js";
import { SensorEntity } from "./sensor.entity.js";

@Injectable()
export class SensorsService {
  constructor(
    @InjectRepository(SensorEntity) private readonly sensors: Repository<SensorEntity>,
    @InjectRepository(ActuatorEntity) private readonly actuators: Repository<ActuatorEntity>,
  ) {}

  /** Registry starts empty: sensors and actuators are onboarded
   * through POST /api/sensors or auto-provisioned on first telemetry. */
  async seed(): Promise<void> {
    return;
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

  async getSensor(id: string): Promise<SensorEntity> {
    const sensor = await this.findSensor(id);
    if (!sensor) throw new NotFoundException(`Sensor ${id} not found`);
    return sensor;
  }

  async createSensor(input: {
    id: string;
    type: string;
    location: string;
    model: string;
    status?: string;
    container?: string;
  }): Promise<SensorEntity> {
    if (await this.findSensor(input.id)) {
      throw new ConflictException(`Sensor ${input.id} already exists`);
    }
    return this.sensors.save({
      id: input.id,
      type: input.type as SensorEntity["type"],
      location: input.location,
      model: input.model,
      status: (input.status ?? "Active") as SensorEntity["status"],
      container: input.container ?? null,
      lastSeenAt: null,
    });
  }

  async updateSensor(id: string, patch: UpdateSensorDto): Promise<SensorEntity> {
    const sensor = await this.getSensor(id);
    if (patch.location !== undefined) sensor.location = patch.location;
    if (patch.model !== undefined) sensor.model = patch.model;
    // Values are validated by UpdateSensorDto (IsIn) before reaching here.
    if (patch.status !== undefined) sensor.status = patch.status as SensorEntity["status"];
    if (patch.container !== undefined) sensor.container = patch.container;
    return this.sensors.save(sensor);
  }

  /** Removes the registry entry. Historical readings keep the sensorId string. */
  async deleteSensor(id: string): Promise<void> {
    const sensor = await this.getSensor(id);
    await this.sensors.remove(sensor);
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
