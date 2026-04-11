import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { safeStorage } from "electron";

interface StoredEntry {
  encrypted: string; // base64
  updatedAt: number;
}

type CredentialFile = Record<string, StoredEntry>;

const FREECLAW_DIR = path.join(os.homedir(), ".freeclaw");
const CRED_PATH = path.join(FREECLAW_DIR, "credentials.enc.json");

function ensureDir(): void {
  if (!fs.existsSync(FREECLAW_DIR)) {
    fs.mkdirSync(FREECLAW_DIR, { mode: 0o700, recursive: true });
  }
}

function readFile(): CredentialFile {
  try {
    const data = fs.readFileSync(CRED_PATH, "utf-8");
    return JSON.parse(data) as CredentialFile;
  } catch {
    return {};
  }
}

function writeFile(data: CredentialFile): void {
  ensureDir();
  fs.writeFileSync(CRED_PATH, JSON.stringify(data, null, 2), {
    mode: 0o600,
  });
}

export function saveCredential(platformId: string, creds: Record<string, string>): void {
  const plaintext = JSON.stringify(creds);
  const encrypted = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(plaintext).toString("base64")
    : Buffer.from(plaintext).toString("base64"); // fallback: base64 only

  const file = readFile();
  file[platformId] = { encrypted, updatedAt: Date.now() };
  writeFile(file);
}

export function loadCredentials(): Record<string, Record<string, string>> {
  const file = readFile();
  const result: Record<string, Record<string, string>> = {};

  for (const [id, entry] of Object.entries(file)) {
    try {
      const buf = Buffer.from(entry.encrypted, "base64");
      let plaintext: string;
      if (safeStorage.isEncryptionAvailable()) {
        plaintext = safeStorage.decryptString(buf);
      } else {
        plaintext = buf.toString("utf-8");
      }
      result[id] = JSON.parse(plaintext) as Record<string, string>;
    } catch {
      // Skip corrupted entries.
    }
  }

  return result;
}

export function removeCredential(platformId: string): void {
  const file = readFile();
  delete file[platformId];
  writeFile(file);
}

export function hasCredential(platformId: string): boolean {
  const file = readFile();
  return platformId in file;
}
