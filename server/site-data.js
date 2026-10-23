"use strict";

// Loads shared/site.config.js exactly as the browser would, so the server and
// the site can never drift apart on names, dates, venue, or parking copy.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const configPath = path.join(__dirname, "..", "shared", "site.config.js");
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(configPath, "utf8"), sandbox, { filename: configPath });

const site = sandbox.window.WEDDING;

if (!site || !site.couple) {
  throw new Error("shared/site.config.js did not define window.WEDDING");
}

module.exports = { site, configPath };
