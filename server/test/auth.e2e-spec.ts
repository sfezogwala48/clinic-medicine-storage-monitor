import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { AppModule } from "../src/app.module.js";

// Keep e2e runs hermetic: in-memory sqlite instead of ./data/app.sqlite.
process.env.DATABASE_PATH ??= ":memory:";

describe("Auth (e2e)", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("rejects unauthenticated /api access", async () => {
    await request(app.getHttpServer()).get("/api/users").expect(401);
  });

  it("logs in with seeded admin credentials and returns a JWT", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: "admin@clinic.co.za", password: "Admin123!" })
      .expect(200);

    expect(res.body.token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(res.body.user).toEqual(expect.objectContaining({ role: "admin" }));

    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${res.body.token as string}`)
      .expect(200);
  });

  it("rejects wrong passwords and legacy role-only logins", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: "admin@clinic.co.za", password: "wrong-password" })
      .expect(401);

    await request(app.getHttpServer()).post("/api/auth/login").send({ role: "admin" }).expect(400);
  });

  it("restricts user creation to admins", async () => {
    const staff = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: "+27730000000", password: "Staff123!" })
      .expect(200);

    await request(app.getHttpServer())
      .post("/api/users")
      .set("Authorization", `Bearer ${staff.body.token as string}`)
      .send({ name: "Nope", password: "Nope1234!" })
      .expect(401);

    const admin = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: "admin@clinic.co.za", password: "Admin123!" })
      .expect(200);

    const created = await request(app.getHttpServer())
      .post("/api/users")
      .set("Authorization", `Bearer ${admin.body.token as string}`)
      .send({ name: "Test Nurse", password: "Test1234!" })
      .expect(201);
    expect(created.body.name).toBe("Test Nurse");
    expect(created.body.temporaryPassword).toBeUndefined();
  });

  it("supports password change + login with the new password", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: "+27730000000", password: "Staff123!" })
      .expect(200);
    const token = login.body.token as string;

    await request(app.getHttpServer())
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "Staff123!", newPassword: "BrandNew123!" })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: "+27730000000", password: "BrandNew123!" })
      .expect(200);
  });
});
