
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import companyRoutes from "./routes/companyRoutes.js";

// -------------------- ENVIRONMENT CONFIGURATION --------------------

const serverDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

dotenv.config({
  path: path.join(serverDirectory, ".env"),
});

const app = express();
app.disable("x-powered-by");

const port = Number.parseInt(process.env.PORT || "8005", 10);

const frontendUrl =
  process.env.FRONTEND_URL ||
  process.env.FRONTEND_ORIGIN ||
  "http://localhost:5173";

// -------------------- CONFIGURATION VALIDATION --------------------

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("Invalid PORT configuration in server/.env");
}

if (!process.env.BHARATSTOCK_API_KEY) {
  console.warn(
    "BHARATSTOCK_API_KEY is missing from server/.env. Company data requests may fail."
  );
}

// -------------------- MIDDLEWARE --------------------

app.use(
  cors({
    origin: frontendUrl,
    methods: ["GET", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "1mb" }));

// -------------------- HEALTH CHECK --------------------

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    message: "Market Lens API is running",
    provider: "BharatStockAPI",
  });
});

// -------------------- COMPANY ROUTES --------------------

// Existing endpoints:
// GET /api/companies?q=tcs
// GET /api/companies/search?q=tcs
// GET /api/companies/TCS

app.use("/api/companies", companyRoutes);

// -------------------- ROOT ROUTE --------------------

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Market Lens API is running",
    health: "/api/health",
    companies: "/api/companies",
    provider: "BharatStockAPI",
  });
});

// -------------------- ROUTE NOT FOUND --------------------

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// -------------------- CENTRAL ERROR HANDLER --------------------

app.use((error, _req, res, _next) => {
  if (res.headersSent) {
    return;
  }

  const statusCode =
    Number.isInteger(error?.statusCode)
      ? error.statusCode
      : Number.isInteger(error?.status)
        ? error.status
        : 500;

  if (error?.retryAfter) {
    res.set("Retry-After", String(error.retryAfter));
  }

  if (statusCode >= 500) {
    console.error(
      "API error:",
      error?.message || "Unknown error"
    );
  }

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500
        ? "Internal server error"
        : error?.message || "Request failed",
  });
});

// -------------------- START SERVER --------------------

const server = app.listen(port, "0.0.0.0", () => {
  console.log(
    `Market Lens API listening on port ${port}`
  );
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. Stop the existing server or change PORT in server/.env.`
    );
  } else {
    console.error(
      "Server failed to start:",
      error.message
    );
  }

  process.exitCode = 1;
});

// -------------------- GRACEFUL SHUTDOWN --------------------

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) return;

  shuttingDown = true;

  console.log("Shutting down Market Lens API...");

  server.close((error) => {
    if (error) {
      console.error(
        "Error closing server:",
        error.message
      );

      process.exitCode = 1;
    }
  });

  server.closeIdleConnections?.();
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
