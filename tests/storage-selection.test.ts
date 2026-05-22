import { strict as assert } from "node:assert";
import { afterEach, describe, it } from "node:test";

import {
  __resetStorageForTests,
  getStorageBackend
} from "../lib/storage";

const ALL_R2_VARS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_URL"
] as const;

function clearR2(): void {
  for (const k of ALL_R2_VARS) delete process.env[k];
}

function setAllR2(): void {
  process.env.R2_ACCOUNT_ID = "test-account";
  process.env.R2_ACCESS_KEY_ID = "test-key";
  process.env.R2_SECRET_ACCESS_KEY = "test-secret";
  process.env.R2_BUCKET = "pov-et-media";
  process.env.R2_PUBLIC_URL = "https://media.pov.et";
}

describe("storage backend selection", () => {
  afterEach(() => {
    clearR2();
    __resetStorageForTests();
  });

  it("falls back to local when no R2 vars are set", () => {
    clearR2();
    __resetStorageForTests();
    const backend = getStorageBackend();
    assert.equal(backend.kind, "local");
    assert.match(backend.describe(), /local filesystem/);
  });

  it("uses R2 when all five R2 vars are set", () => {
    setAllR2();
    __resetStorageForTests();
    const backend = getStorageBackend();
    assert.equal(backend.kind, "r2");
    assert.match(backend.describe(), /Cloudflare R2/);
    assert.match(backend.describe(), /pov-et-media/);
  });

  it("falls back to local if any R2 var is missing", () => {
    setAllR2();
    delete process.env.R2_PUBLIC_URL;
    __resetStorageForTests();
    const backend = getStorageBackend();
    assert.equal(backend.kind, "local");
  });

  it("caches the backend instance for the process lifetime", () => {
    clearR2();
    __resetStorageForTests();
    const a = getStorageBackend();
    const b = getStorageBackend();
    assert.equal(a, b);
  });

  it("re-reads env after an explicit reset", () => {
    clearR2();
    __resetStorageForTests();
    const local = getStorageBackend();
    assert.equal(local.kind, "local");

    setAllR2();
    __resetStorageForTests();
    const r2 = getStorageBackend();
    assert.equal(r2.kind, "r2");
  });
});
