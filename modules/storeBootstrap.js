export function createStoreBootstrap(deps) {
  function extractEntityArray(data, key) {
    if (!data || typeof data !== "object") return [];
    const direct = data[key];
    if (Array.isArray(direct)) return direct;
    if (direct instanceof Map) return Array.from(direct.values());
    if (direct && typeof direct === "object") return Object.values(direct);
    const byId = data[`${key}ById`];
    if (byId instanceof Map) return Array.from(byId.values());
    if (byId && typeof byId === "object") return Object.values(byId);
    return [];
  }

  function isValidStorePayloadShape(payload) {
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

  function getQueryParams() {
    try {
      return new URLSearchParams(window.location?.search || "");
    } catch (_error) {
      return new URLSearchParams();
    }
  }

  function getStoreModeOverrideFromQuery() {
    const queryValue = getQueryParams().get(deps.STORE_QUERY_PARAM);
    if (!queryValue) return null;
    const normalized = String(queryValue).trim().toLowerCase();
    return deps.STORE_MODE_SET.has(normalized) ? normalized : null;
  }

  function shouldResetStoreFromQuery() {
    const queryValue = getQueryParams().get(deps.STORE_RESET_QUERY_PARAM);
    if (queryValue == null) return false;
    const normalized = String(queryValue).trim().toLowerCase();
    return normalized === "" || normalized === "1" || normalized === "true" || normalized === "yes";
  }

  function resolveStoreMode() {
    const override = getStoreModeOverrideFromQuery();
    if (override) return override;
    const isDevMode = Boolean(deps.importMetaEnv && deps.importMetaEnv.DEV);
    return isDevMode ? deps.STORE_MODE_API : deps.STORE_MODE_LOCAL;
  }

  const activeStoreMode = resolveStoreMode();

  function getDefaultStoreSeedPayload() {
    const snapshot = deps.clonePlainData(deps.defaultStorePayload);
    if (!isValidStorePayloadShape(snapshot)) {
      throw new Error("Bundled default store payload has an invalid shape.");
    }
    return snapshot;
  }

  async function loadInitialDataFromApi() {
    const response = await fetch(deps.STORE_API_ENDPOINT, {
      method: "GET",
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`Failed to load canonical store: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  }

  function readStorePayloadFromLocalStorage() {
    const rawPayload = window.localStorage.getItem(deps.STORE_LOCAL_KEY);
    if (!rawPayload) return null;
    const parsed = JSON.parse(rawPayload);
    if (!isValidStorePayloadShape(parsed)) {
      throw new Error("Browser local store payload has an invalid shape.");
    }
    return parsed;
  }

  function writeStorePayloadToLocalStorage(payload) {
    if (!isValidStorePayloadShape(payload)) {
      throw new Error("Refusing to persist an invalid store payload.");
    }
    window.localStorage.setItem(deps.STORE_LOCAL_KEY, JSON.stringify(payload));
  }

  function clearShareLocalStore() {
    window.localStorage.removeItem(deps.STORE_LOCAL_KEY);
  }

  function loadInitialDataFromLocalStorage() {
    if (shouldResetStoreFromQuery()) {
      clearShareLocalStore();
    }

    try {
      const existingPayload = readStorePayloadFromLocalStorage();
      if (existingPayload) return existingPayload;
    } catch (error) {
      console.warn("Failed to read browser local store payload. Re-seeding from bundled defaults.", error);
    }

    const seedPayload = getDefaultStoreSeedPayload();
    try {
      writeStorePayloadToLocalStorage(seedPayload);
    } catch (error) {
      console.warn("Failed to seed browser local store payload.", error);
    }
    return seedPayload;
  }

  function getBootLoadErrorMessage() {
    if (activeStoreMode === deps.STORE_MODE_LOCAL) {
      return "Failed to load the browser local store payload.";
    }
    return "Failed to load the canonical store from /api/store. Run the app via the Vite server.";
  }

  async function loadInitialData() {
    if (activeStoreMode === deps.STORE_MODE_LOCAL) {
      return loadInitialDataFromLocalStorage();
    }
    return await loadInitialDataFromApi();
  }

  function buildStore(data) {
    const users = extractEntityArray(data, "users")
      .filter((entry) => entry && typeof entry.id === "string")
      .map((entry) => ({ ...entry }));
    const orgs = extractEntityArray(data, "orgs")
      .filter((entry) => entry && typeof entry.id === "string")
      .map((entry) => ({ ...entry }));
    const nodes = extractEntityArray(data, "nodes")
      .filter((entry) => entry && typeof entry.id === "string")
      .map((entry) => ({ ...entry }));
    const edges = extractEntityArray(data, "edges")
      .filter((entry) => entry && typeof entry.id === "string")
      .map((entry) => ({ ...entry }));
    const workspaces = extractEntityArray(data, "workspaces")
      .filter((entry) => entry && typeof entry.id === "string")
      .map((entry) => ({ ...entry }));
    const meta = data && typeof data === "object" && data.meta && typeof data.meta === "object"
      ? { ...data.meta }
      : {};

    return {
      users,
      orgs,
      nodes,
      edges,
      workspaces,
      meta,
      usersById: new Map(users.map((entry) => [entry.id, entry])),
      orgsById: new Map(orgs.map((entry) => [entry.id, entry])),
      nodesById: new Map(nodes.map((entry) => [entry.id, entry])),
      edgesById: new Map(edges.map((entry) => [entry.id, entry])),
      workspacesById: new Map(workspaces.map((entry) => [entry.id, entry])),
      workspaceOrder: workspaces.map((workspace) => workspace.id)
    };
  }

  return {
    activeStoreMode,
    extractEntityArray,
    isValidStorePayloadShape,
    getQueryParams,
    getStoreModeOverrideFromQuery,
    shouldResetStoreFromQuery,
    resolveStoreMode,
    getDefaultStoreSeedPayload,
    loadInitialDataFromApi,
    readStorePayloadFromLocalStorage,
    writeStorePayloadToLocalStorage,
    clearShareLocalStore,
    loadInitialDataFromLocalStorage,
    getBootLoadErrorMessage,
    loadInitialData,
    buildStore
  };
}
