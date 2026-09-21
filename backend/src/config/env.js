/**
 * Central environment validation & configuration.
 * The application FAILS FAST at startup if required secrets are missing.
 * Never fall back to hardcoded secrets.
 */

const requiredInProduction = ["JWT_SECRET", "MONGODB_URI"];

function validateEnv() {
  const errors = [];

  if (!process.env.JWT_SECRET) {
    errors.push(
      "JWT_SECRET is missing. Set JWT_SECRET in environment or backend/.env",
    );
  } else if (process.env.JWT_SECRET.length < 32) {
    errors.push(
      "JWT_SECRET must be at least 32 characters long. Use a strong random value.",
    );
  }

  // Guard against known compromised/default secrets
  const forbidden = [
    "axi_collection_super_secret_jwt_key_2026_production",
    "secret",
    "changeme",
    "dev-secret",
    "secret123"
  ];
  if (forbidden.some((s) => process.env.JWT_SECRET === s)) {
    errors.push(
      "JWT_SECRET matches a known default/compromised value. Generate a fresh random secret.",
    );
  }

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL;

  if (process.env.NODE_ENV === "production") {
    if (!mongoUri) {
      errors.push("MONGO_URI / MONGODB_URI is required in production.");
    }
    if (!frontendUrl) {
      errors.push("CLIENT_URL / FRONTEND_URL is required in production for CORS and emails.");
    }
    // Super Admin is required in production — otherwise you lock yourself out
    if (!process.env.SUPER_ADMIN_EMAIL) {
      errors.push("SUPER_ADMIN_EMAIL is required in production.");
    }
    if (!process.env.SUPER_ADMIN_PASSWORD_HASH) {
      errors.push("SUPER_ADMIN_PASSWORD_HASH is required in production.");
    }
        // Cloudinary is required in production for image uploads
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      errors.push("CLOUDINARY_CLOUD_NAME is required in production.");
    }
    if (!process.env.CLOUDINARY_API_KEY) {
      errors.push("CLOUDINARY_API_KEY is required in production.");
    }
    if (!process.env.CLOUDINARY_API_SECRET) {
      errors.push("CLOUDINARY_API_SECRET is required in production.");
    }
  }

  if (errors.length > 0) {
    console.error("====================================================");
    console.error(" [CONFIG ERROR] Invalid or missing environment setup:");
    errors.forEach((e) => console.error(`   - ${e}`));
    console.error("====================================================");
    process.exit(1);
  }
}

const config = {
  get nodeEnv() {
    return process.env.NODE_ENV || "development";
  },
  get isProduction() {
    return (process.env.NODE_ENV || "development") === "production";
  },
  get isDevelopment() {
    return (process.env.NODE_ENV || "development") !== "production";
  },
  get jwtSecret() {
    return process.env.JWT_SECRET;
  },
  get jwtExpire() {
    return process.env.JWT_EXPIRE || "7d";
  },
  get frontendUrl() {
    return process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173";
  },
  get mongoUri() {
    return (
      process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/axi_collection"
    );
  },
  get allowedOrigins() {
    const origins = [
      "http://localhost:5173", 
      "http://127.0.0.1:5173"
    ];
    const clientUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL;
    if (clientUrl && !origins.includes(clientUrl)) origins.push(clientUrl);
    if (process.env.EXTRA_ALLOWED_ORIGINS) {
      origins.push(
        ...process.env.EXTRA_ALLOWED_ORIGINS.split(",")
          .map((o) => o.trim())
          .filter(Boolean),
      );
    }
    return origins;
  },
  // ---- Super Admin (env-based, not in DB) ----
  get superAdminEmail() {
    return process.env.SUPER_ADMIN_EMAIL || "";
  },
  get superAdminPasswordHash() {
    return process.env.SUPER_ADMIN_PASSWORD_HASH || "";
  },
    // ---- Cloudinary (image storage) ----
  get cloudinaryCloudName() {
    return process.env.CLOUDINARY_CLOUD_NAME || "";
  },
  get cloudinaryApiKey() {
    return process.env.CLOUDINARY_API_KEY || "";
  },
  get cloudinaryApiSecret() {
    return process.env.CLOUDINARY_API_SECRET || "";
  },
};

module.exports = { validateEnv, config };