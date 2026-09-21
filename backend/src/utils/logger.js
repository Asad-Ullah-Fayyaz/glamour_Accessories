/**
 * Lightweight structured logger.
 * Never log passwords, tokens, or secrets — callers are responsible for
 * passing only safe metadata.
 */

const config = require("../config/env").config;

const ts = () => new Date().toISOString();

function write(level, msg, meta) {
  const line = { level, time: ts(), msg };
  if (meta !== undefined) {
    // Redact anything that smells like a credential
    const safe = JSON.parse(
      JSON.stringify(meta, (key, value) => {
        if (/pass|secret|token|authorization/i.test(key)) return "[REDACTED]";
        return value;
      }),
    );
    line.meta = safe;
  }
  const out = JSON.stringify(line);
  if (level === "error") console.error(out);
  else if (level === "warn") console.warn(out);
  else console.log(out);
}

module.exports = {
  info: (msg, meta) => write("info", msg, meta),
  warn: (msg, meta) => write("warn", msg, meta),
  error: (msg, meta) => write("error", msg, meta),
  // Development-only human readable debug
  dev: (msg, meta) => {
    if (config.isDevelopment) write("debug", msg, meta);
  },
};
