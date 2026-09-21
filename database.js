import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const databaseFile = path.resolve(process.env.CONEX_DB_FILE || path.join(here, "data", "conex-data.json"));
let writeQueue = Promise.resolve();

const emptyDatabase = () => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  profile: {},
  memories: [],
  blocks: [],
  chatHistory: []
});

async function ensureDatabase() {
  await fs.mkdir(path.dirname(databaseFile), { recursive: true });
  try {
    await fs.access(databaseFile);
  } catch {
    await fs.writeFile(databaseFile, JSON.stringify(emptyDatabase(), null, 2));
  }
}

export async function readDatabase() {
  await ensureDatabase();
  try {
    const value = JSON.parse(await fs.readFile(databaseFile, "utf8"));
    return { ...emptyDatabase(), ...value };
  } catch (error) {
    console.error("CONEX database read error:", error.message);
    return emptyDatabase();
  }
}

export function writeDatabase(nextValue) {
  writeQueue = writeQueue.then(async () => {
    await ensureDatabase();
    const value = { ...emptyDatabase(), ...nextValue, updatedAt: new Date().toISOString() };
    const temporaryFile = `${databaseFile}.tmp`;
    await fs.writeFile(temporaryFile, JSON.stringify(value, null, 2));
    await fs.rename(temporaryFile, databaseFile);
    return value;
  });
  return writeQueue;
}

export function getDatabaseFile() {
  return databaseFile;
}
