// Container healthcheck: exits 0 only when the API answers /health with 2xx.
const port = process.env.PORT || "3000";

try {
  const response = await fetch(`http://localhost:${port}/health`);
  process.exit(response.ok ? 0 : 1);
} catch {
  process.exit(1);
}
