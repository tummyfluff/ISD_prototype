const fs = require("node:fs/promises");
const path = require("node:path");
const { defineConfig } = require("vite");

const SEED_STORE_PATH = path.resolve(__dirname, "data/defaultData.json");
const RUNTIME_STORE_PATH = path.resolve(__dirname, "data/runtimeStore.json");

function isValidStorePayload(payload) {
  return Boolean(
    payload
      && typeof payload === "object"
      && payload.meta
      && typeof payload.meta === "object"
      && Array.isArray(payload.users)
      && Array.isArray(payload.orgs)
      && Array.isArray(payload.nodes)
      && Array.isArray(payload.edges)
      && Array.isArray(payload.workspaces)
  );
}

async function readStorePayloadFromFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeStorePayloadToFile(filePath, payload) {
  const nextJson = `${JSON.stringify(payload, null, 2)}\n`;
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, nextJson, "utf8");
  try {
    await fs.rename(tempPath, filePath);
  } catch (_error) {
    await fs.copyFile(tempPath, filePath);
    await fs.rm(tempPath, { force: true });
  }
}

async function readStorePayload() {
  try {
    return await readStorePayloadFromFile(RUNTIME_STORE_PATH);
  } catch (error) {
    if (!error || error.code !== "ENOENT") {
      throw error;
    }
  }

  const seedPayload = await readStorePayloadFromFile(SEED_STORE_PATH);
  await writeStorePayloadToFile(RUNTIME_STORE_PATH, seedPayload);
  return seedPayload;
}

async function writeStorePayload(payload) {
  await writeStorePayloadToFile(RUNTIME_STORE_PATH, payload);
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : null;
}

function createStoreApiMiddleware() {
  return async function storeApiMiddleware(req, res, next) {
    const requestUrl = typeof req.url === "string" ? req.url : "";
    const pathname = requestUrl.split("?")[0];
    if (pathname !== "/api/store") {
      next();
      return;
    }

    if (req.method === "GET") {
      try {
        const payload = await readStorePayload();
        if (!isValidStorePayload(payload)) {
          sendJson(res, 500, { error: "Runtime store file has an invalid shape." });
          return;
        }
        sendJson(res, 200, payload);
      } catch (_error) {
        sendJson(res, 500, { error: "Failed to read runtime store file." });
      }
      return;
    }

    if (req.method === "PUT") {
      try {
        const payload = await readJsonBody(req);
        if (!isValidStorePayload(payload)) {
          sendJson(res, 400, { error: "Canonical store payload has an invalid shape." });
          return;
        }
        await writeStorePayload(payload);
        sendJson(res, 200, { ok: true });
      } catch (_error) {
        sendJson(res, 500, { error: "Failed to write canonical store file." });
      }
      return;
    }

    res.statusCode = 405;
    res.setHeader("Allow", "GET, PUT");
    res.end();
  };
}

function canonicalStorePlugin() {
  return {
    name: "canonical-store-api",
    configureServer(server) {
      server.middlewares.use(createStoreApiMiddleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(createStoreApiMiddleware());
    }
  };
}

module.exports = defineConfig({
  base: "./",
  plugins: [canonicalStorePlugin()]
});
