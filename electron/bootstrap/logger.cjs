"use strict";

const fs = require("fs");
const path = require("path");

function createLogger(app) {
  let logFile = null;

  return function log(message, detail) {
    const line = `[${new Date().toISOString()}] ${message}${detail ? ` ${detail}` : ""}\n`;
    try {
      if (!logFile) {
        const dir = app.getPath("userData");
        fs.mkdirSync(dir, { recursive: true });
        logFile = path.join(dir, "obspace.log");
      }
      fs.appendFileSync(logFile, line, "utf8");
    } catch {
      // Logging must never prevent the app from opening.
    }
    console.log(line.trim());
  };
}

module.exports = {
  createLogger
};
