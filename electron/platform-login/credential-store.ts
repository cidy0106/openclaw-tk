/**
 * Credential store that writes directly to the gateway's auth-profiles.json.
 *
 * Instead of maintaining a separate encrypted store, FreeClaw writes credentials
 * in the exact format the zero-token gateway expects. This means the gateway can
 * read them natively without any bridging.
 */
import fs from "node:fs";
import path from "node:path";

// Set by init() from gateway-process.ts before gateway starts.
let _stateDir = "";

interface AuthProfile {
  type: "token";
  provider: string;
  token: string; // JSON-stringified credential object
}

interface AuthProfilesFile {
  version: number;
  profiles: Record<string, AuthProfile>;
  order: Record<string, unknown>;
  lastGood: Record<string, unknown>;
  usageStats: Record<string, unknown>;
}

/**
 * Must be called before any other function.
 * @param stateDir The openclaw state directory (e.g. .openclaw-upstream-state)
 */
export function init(stateDir: string): void {
  _stateDir = stateDir;
}

function authProfilesPath(): string {
  return path.join(_stateDir, "agents", "main", "agent", "auth-profiles.json");
}

function readAuthProfiles(): AuthProfilesFile {
  const filePath = authProfilesPath();
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8")) as AuthProfilesFile;
    }
  } catch {
    // Corrupted file — start fresh
  }
  return { version: 1, profiles: {}, order: {}, lastGood: {}, usageStats: {} };
}

function writeAuthProfiles(data: AuthProfilesFile): void {
  const filePath = authProfilesPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// In-memory cache
let _cache: AuthProfilesFile | null = null;

function getProfiles(): AuthProfilesFile {
  if (!_cache) {
    _cache = readAuthProfiles();
  }
  return _cache;
}

function invalidateCache(): void {
  _cache = null;
}

/**
 * Save a credential for a platform in the gateway's auth-profiles.json.
 * The credential object is JSON-stringified as the `token` field.
 */
export function saveCredential(platformId: string, credentials: Record<string, string>): void {
  const profiles = getProfiles();
  const profileKey = `${platformId}:default`;

  profiles.profiles[profileKey] = {
    type: "token",
    provider: platformId,
    token: JSON.stringify(credentials),
  };

  invalidateCache();
  writeAuthProfiles(profiles);
}

/**
 * Remove a platform's credential from auth-profiles.json.
 */
export function removeCredential(platformId: string): void {
  const profiles = getProfiles();
  const profileKey = `${platformId}:default`;
  delete profiles.profiles[profileKey];
  invalidateCache();
  writeAuthProfiles(profiles);
}

/**
 * Check if a platform has stored credentials.
 */
export function hasCredential(platformId: string): boolean {
  const profiles = getProfiles();
  const profileKey = `${platformId}:default`;
  return profileKey in profiles.profiles;
}

/**
 * Get all connected platform IDs.
 */
export function getConnectedPlatforms(): string[] {
  const profiles = getProfiles();
  return Object.keys(profiles.profiles)
    .filter((key) => key.endsWith(":default"))
    .map((key) => key.replace(/:default$/, ""));
}
