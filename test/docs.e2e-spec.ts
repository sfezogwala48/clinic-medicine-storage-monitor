import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { AppModule } from "../src/app.module.js";
import { setupApiReference } from "../src/docs.js";

// Keep e2e runs hermetic: in-memory sqlite instead of ./data/app.sqlite.
process.env.DATABASE_PATH ??= ":memory:";

describe("Docs (e2e)", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApiReference(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("/openapi.json (GET) exposes the documented routes", async () => {
    const response = await request(app.getHttpServer()).get("/openapi.json").expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        openapi: expect.stringMatching(/^3\./),
        paths: expect.objectContaining({
          "/health": expect.anything(),
          "/health/ready": expect.anything(),
          "/telemetry/latest": expect.anything(),
          "/telemetry/publish": expect.anything(),
        }),
      }),
    );
  });

  it("/reference (GET) serves the Scalar UI shell", async () => {
    const response = await request(app.getHttpServer()).get("/reference").expect(200);

    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain("/openapi.json");
  });
});
