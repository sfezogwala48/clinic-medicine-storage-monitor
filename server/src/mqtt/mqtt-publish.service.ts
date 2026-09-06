import { Inject, Injectable } from "@nestjs/common";
import type { ClientProxy } from "@nestjs/microservices";
import { lastValueFrom, timeout } from "rxjs";
import { safeCallAsync } from "../core/result/result.js";
import { TELEMETRY_CLIENT } from "./mqtt.options.js";

/** Thin wrapper over the MQTT ClientProxy so services never touch rxjs directly. */
@Injectable()
export class MqttPublishService {
  constructor(@Inject(TELEMETRY_CLIENT) private readonly client: ClientProxy) {}

  /** Fire-and-forget publish (telemetry fan-out, config pushes, buzzer commands). */
  async publish(topic: string, payload: unknown): Promise<void> {
    await safeCallAsync(() => this.client.emit(topic, payload).toPromise());
  }

  /** Request/response over MQTT (used by the legacy POST /telemetry/publish simulator). */
  async request<T>(topic: string, payload: unknown, timeoutMs = 5000): Promise<T> {
    return lastValueFrom(this.client.send<T>(topic, payload).pipe(timeout(timeoutMs)));
  }
}
