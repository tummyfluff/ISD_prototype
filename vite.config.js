const fs = require("node:fs/promises");
const path = require("node:path");
const { defineConfig } = require("vite");

const STORE_PATH = path.resolve(__dirname, "data/defaultData.json");

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

async function readStorePayload() {
  const raw = await fs.readFile(STORE_PATH, "utf8");
  return JSON.parse(raw);
}

async function writeStorePayload(payload) {
  const nextJson = `${JSON.stringify(payload, null, 2)}\n`;
  const tempPath = `${STORE_PATH}.tmp`;
  await fs.writeFile(tempPath, nextJson, "utf8");
  try {
    await fs.rename(tempPath, STORE_PATH);
  } catch (error) {
    await fs.copyFile(tempPath, STORE_PATH);
    await fs.rm(tempPath, { force: true });
  }
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
          sendJson(res, 500, { error: "Canonical store file has an invalid shape." });
          return;
        }
        sendJson(res, 200, payload);
      } catch (error) {
        sendJson(res, 500, { error: "Failed to read canonical store file." });
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
      } catch (error) {
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
