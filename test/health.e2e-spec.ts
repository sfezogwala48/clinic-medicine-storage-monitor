import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { AppModule } from "../src/app.module.js";

// Keep e2e runs hermetic: in-memory sqlite instead of ./data/app.sqlite.
process.env.DATABASE_PATH ??= ":memory:";

describe("Health (e2e)", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("/health (GET) liveness", () => {
    return request(app.getHttpServer()).get("/health").expect(200).expect({ status: "ok" });
  });

  it("/health/ready (GET) readiness with sqlite + mqtt + disk + memory checks", async () => {
    const response = await request(app.getHttpServer()).get("/health/ready").expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        status: "ok",
        info: expect.objectContaining({
          database: expect.objectContaining({ status: "up" }),
          mqtt: expect.objectContaining({ status: "up" }),
        }),
      }),
    );
  });
});

describe("Telemetry (e2e)", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("/telemetry/latest (GET) starts empty", async () => {
    const response = await request(app.getHttpServer()).get("/telemetry/latest").expect(200);

    expect(response.body).toEqual([]);
  });
});
