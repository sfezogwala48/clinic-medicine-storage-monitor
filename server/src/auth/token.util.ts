import { createHmac } from "node:crypto";

export interface JwtPayload {
  sub: number;
  role: string;
  name: string;
  iat: number;
  exp: number;
}

function base64urlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

/** Parse "12h" / "30m" / "7d" / seconds into seconds. */
export function parseExpiresIn(raw: string | number, fallbackSec = 12 * 3600): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return fallbackSec;
  const trimmed = raw.trim();
  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && trimmed !== "") return asNumber;
  const m = /^(\d+)\s*([smhd])$/i.exec(trimmed);
  if (!m) return fallbackSec;
  const value = Number(m[1]);
  const unit = m[2]?.toLowerCase();
  const mult = unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : 86400;
  return value * mult;
}

export function signJwt(
  payload: Omit<JwtPayload, "iat" | "exp">,
  secret: string,
  expiresInSec: number,
): string {
  const header = base64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64urlEncode(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSec }));
  const sig = base64urlEncode(createHmac("sha256", secret).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}

export function verifyJwt(token: string, secret: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed token");
  const [header, body, sig] = parts as [string, string, string];
  const expected = base64urlEncode(
    createHmac("sha256", secret).update(`${header}.${body}`).digest(),
  );
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) throw new Error("Invalid signature");
  // Constant-time compare without pulling in extra deps.
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  if (diff !== 0) throw new Error("Invalid signature");
  const payload = JSON.parse(base64urlDecode(body).toString("utf8")) as JwtPayload;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && payload.exp < now) throw new Error("Token expired");
  return payload;
}
