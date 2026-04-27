#!/usr/bin/env node
// =============================================================================
// Chromium extension linter
// =============================================================================
//
// Mozilla's `web-ext lint` is Firefox-flavored: it requires
// `browser_specific_settings.gecko.id` and Firefox-only
// `data_collection_permissions`, neither of which apply to a Chromium-only
// extension. Instead we run a small set of structural checks that match what
// Chromium actually requires of a Manifest V3 extension, and that catch the
// kinds of mistakes that would otherwise only surface on Chrome Web Store
// upload or at "Load unpacked" time.
//
// Exits non-zero on the first failure so CI fails loudly.
// =============================================================================

import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const errors = [];
const warnings = [];

function err(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

async function fileExists(relPath) {
  try {
    const s = await stat(resolve(root, relPath));
    return s.isFile();
  } catch {
    return false;
  }
}

const manifestPath = resolve(root, "manifest.json");
let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch (e) {
  console.error(`manifest.json is missing or not valid JSON: ${e.message}`);
  process.exit(1);
}

if (manifest.manifest_version !== 3) {
  err(`manifest_version must be 3 (got ${manifest.manifest_version})`);
}
for (const k of ["name", "version", "description"]) {
  if (typeof manifest[k] !== "string" || !manifest[k].trim()) {
    err(`manifest.${k} must be a non-empty string`);
  }
}

if (!/^\d+(\.\d+){0,3}$/.test(manifest.version || "")) {
  err(`manifest.version "${manifest.version}" is not a valid Chrome version (1-4 dot-separated integers)`);
}

if (manifest.browser_specific_settings) {
  warn(
    "manifest.browser_specific_settings is Firefox-only and should not appear in the Chromium build",
  );
}

const icons = manifest.icons || {};
for (const [size, path] of Object.entries(icons)) {
  if (!(await fileExists(path))) {
    err(`icons[${size}] points to "${path}" which does not exist`);
  }
}

if (!Array.isArray(manifest.content_scripts) || manifest.content_scripts.length === 0) {
  err("manifest.content_scripts must be a non-empty array");
} else {
  for (const [i, cs] of manifest.content_scripts.entries()) {
    if (!Array.isArray(cs.matches) || cs.matches.length === 0) {
      err(`content_scripts[${i}].matches must be a non-empty array`);
    }
    for (const f of cs.css || []) {
      if (!(await fileExists(f))) err(`content_scripts[${i}].css references missing file "${f}"`);
    }
    for (const f of cs.js || []) {
      if (!(await fileExists(f))) err(`content_scripts[${i}].js references missing file "${f}"`);
    }
  }
}

const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
if (pkg.version !== manifest.version) {
  err(
    `package.json version (${pkg.version}) does not match manifest.json version (${manifest.version})`,
  );
}

for (const w of warnings) console.warn(`warning: ${w}`);
for (const e of errors) console.error(`error: ${e}`);

console.log(
  `\nValidation summary: ${errors.length} error(s), ${warnings.length} warning(s).`,
);

process.exit(errors.length > 0 ? 1 : 0);
