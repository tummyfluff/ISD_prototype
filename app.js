const d3 = window.d3;
if (!window.d3 || !window.d3.forceSimulation) {
  console.error("D3 force not loaded");
}

const CURRENT_USER = "Dr Hannah Lewis";
const CURRENT_USER_HANDLE = "@Hannah";

// type NodeType =
//   "location" | "experiment" | "protocol" | "portal" |
//   "project" | "sample" | "dataset" | "analysis" | "figure" | "handover"
// type Task = { id: string, text: string, done: boolean, assignedTo: string }
// type Comment = { author: string, text: string, timestamp: string, isNew: boolean }
// type Node = {
//   id: string,
//   title: string,
//   label: string, // runtime alias from title for UI compatibility
//   type: NodeType,
//   ownerId: string,
//   owner: string, // runtime alias resolved from users
//   sharedWithIds?: string[],
//   kind?: "lab" | "room" | "bench" | "fume" | "freezer" | "sink" | "glovebox" | "shelf" | "generic",
//   locationId: string | null,
//   status?: string,
//   summary: string,
//   linkedNodeIds: string[], // runtime edge-backed alias
//   tasks: Task[],
//   comments: Comment[],
//   layout?: { x: number, y: number, w: number, h: number },
//   graphPos?: { x: number, y: number },
//   expandedW?: number,
//   expandedH?: number,
//   expandedAspect?: number, // legacy runtime field
//   expandedInnerWidthPx?: number // legacy runtime field
// }

const TYPE_ORDER = [
  "location",
  "experiment",
  "protocol",
  "project",
  "sample",
  "dataset",
  "analysis",
  "figure",
  "handover",
  "portal"
];
    const SVG_NS = "http://www.w3.org/2000/svg";
    const CANVAS_WIDTH = 1320;
    const CANVAS_HEIGHT = 760;
    const NODE_WIDTH = 172;
    const NODE_HEIGHT = 56;
    const GRID_STEP = 20;
    const LAYOUT_MARGIN = 24;
    const COL_GAP = 40;
    const ROW_GAP = 16;
    const COLLAPSED_CARD_W = 172;
    const COLLAPSED_CARD_WIDTH_BY_TYPE = {
      location: 172,
      experiment: 172,
      protocol: 172,
      project: 202,
      sample: 188,
      dataset: 188,
      analysis: 188,
      figure: 176,
      handover: 206,
      portal: 92
    };
    const COLLAPSED_CARD_HEIGHT_BY_TYPE = {
      location: 72,
      experiment: 72,
      protocol: 58,
      project: 72,
      sample: 64,
      dataset: 64,
      analysis: 64,
      figure: 64,
      handover: 72,
      portal: 92
    };
    const EXPANDED_CARD_MIN_W = 320;
    const EXPANDED_CARD_MIN_H = 220;
    const EXPANDED_CARD_MAX_W = Number.POSITIVE_INFINITY;
    const EXPANDED_CARD_MAX_H = Number.POSITIVE_INFINITY;
    const EXPANDED_INNER_MIN_W = 240;
    const EXPANDED_INNER_MIN_H = 130;
    const EXPANDED_INNER_MAX_W = Number.POSITIVE_INFINITY;
    const EXPANDED_INNER_MAX_H = Number.POSITIVE_INFINITY;
    const EXPANDED_TARGET_CHILD_W = COLLAPSED_CARD_W;
    const EXPANDED_TARGET_CHILD_H = COLLAPSED_CARD_HEIGHT_BY_TYPE.location;
    const EXPANDED_CARD_HORIZONTAL_CHROME = 20;
    const EXPANDED_CARD_VERTICAL_CHROME = 72;
    const EDGE_PAD = 500;
    const HYBRID_LANE_X = {
      location: 0,
      experiment: 350,
      protocol: 700,
      portal: 1050,
      project: 1400,
      sample: 1750,
      dataset: 2100,
      analysis: 2450,
      figure: 2800,
      handover: 3150
    };
    const HYBRID_LANE_GAP_Y = 28;
    const HYBRID_LANE_MAX_HEIGHT = 900;
    const HYBRID_LANE_WRAP_OFFSET_X = 210;
    const MARKER_OFFSETS = [
      [0, 0],
      [10, 0],
      [-10, 0],
      [0, 10]
    ];

    const STORE_KEY = "amytis_store_v1";

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

    async function loadInitialData() {
      try {
        const storedRaw = window.localStorage.getItem(STORE_KEY);
        if (storedRaw) {
          try {
            return JSON.parse(storedRaw);
          } catch (error) {
            console.warn("Failed to parse local storage amytis_store_v1 payload.", error);
          }
        }
      } catch (error) {
        console.warn("Failed to read local storage amytis_store_v1 payload.", error);
      }

      try {
        const response = await fetch("data/defaultData.json");
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.warn("Failed to load data/defaultData.json.", error);
      }

      try {
        const moduleData = await import("./data/sampleData.js");
        if (moduleData && moduleData.sampleData) {
          return moduleData.sampleData;
        }
      } catch (error) {
        console.error("Failed to import fallback data/sampleData.js.", error);
      }

      return {
        users: [],
        orgs: [],
        nodes: [],
        edges: [],
        workspaces: []
      };
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

      return {
        users,
        orgs,
        nodes,
        edges,
        workspaces,
        usersById: new Map(users.map((entry) => [entry.id, entry])),
        orgsById: new Map(orgs.map((entry) => [entry.id, entry])),
        nodesById: new Map(nodes.map((entry) => [entry.id, entry])),
        edgesById: new Map(edges.map((entry) => [entry.id, entry])),
        workspacesById: new Map(workspaces.map((entry) => [entry.id, entry])),
        workspaceOrder: workspaces.map((workspace) => workspace.id)
      };
    }

    let store = null;
    let users = [];
    let orgs = [];
    let workspaces = [];
    let workspaceOptions = [];
    let userById = new Map();
    let orgById = new Map();
    let allNodesRuntime = [];
    let allEdgesRuntime = [];
    let workspaceById = new Map();
    let currentWorkspaceId = null;
    let currentWorkspaceKind = "normal";
    let currentUserId = null;
    let appliedWorkspaceId = null;
    let hasAppliedWorkspace = false;
    let workspaceMenuOpen = false;
    let userMenuOpen = false;
    let isCreatingWorkspace = false;
    let workspaceDraftName = "";
    let workspaceRenameId = null;
    let workspaceRenameDraft = "";

    function normalizeWorkspaceKind(rawKind) {
      if (rawKind === "collab" || rawKind === "collaboration") return "collab";
      if (rawKind === "normal" || rawKind === "global" || rawKind === "project") return "normal";
      return "normal";
    }

    function enforceCollabUniqueness(workspaceRecords) {
      const seenCollabByOwner = new Set();
      workspaceRecords.forEach((workspace) => {
        workspace.kind = normalizeWorkspaceKind(workspace.kind);
        if (workspace.kind !== "collab") return;
        const ownerKey = workspace.ownerId || "__no-owner__";
        if (seenCollabByOwner.has(ownerKey)) {
          console.warn(`Multiple collab workspaces found for owner "${ownerKey}". Converting "${workspace.id}" to normal.`);
          workspace.kind = "normal";
          return;
        }
        seenCollabByOwner.add(ownerKey);
      });
    }

    function initializeRuntimeDataFromStore(nextStore) {
      store = nextStore;

      users = Array.from(store.usersById.values()).map((user) => ({ ...user }));
      orgs = Array.from(store.orgsById.values()).map((org) => ({ ...org }));
      const orderedWorkspaceRecords = store.workspaceOrder.length
        ? store.workspaceOrder
          .map((workspaceId) => store.workspacesById.get(workspaceId))
          .filter(Boolean)
        : Array.from(store.workspacesById.values());
      workspaces = orderedWorkspaceRecords.map((workspace) => ({ ...workspace }));
      enforceCollabUniqueness(workspaces);

      workspaceOptions = workspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name || workspace.id,
        kind: normalizeWorkspaceKind(workspace.kind),
        ownerId: workspace.ownerId || null
      }));

      userById = new Map(users.map((user) => [user.id, user]));
      orgById = new Map(orgs.map((org) => [org.id, org]));
      void orgById;

      allNodesRuntime = Array.from(store.nodesById.values())
        .map((node) => ({
          ...node,
          label: node.title,
          owner: (node.ownerId && userById.get(node.ownerId)
            ? userById.get(node.ownerId).name
            : (node.ownerId || "Unknown")),
          summary: typeof node.summary === "string" && node.summary.trim()
            ? node.summary
            : `${node.title} node`,
          tasks: Array.isArray(node.tasks) ? node.tasks.map((task) => ({ ...task })) : [],
          comments: Array.isArray(node.comments) ? node.comments.map((comment) => ({ ...comment })) : [],
          locationId: Object.prototype.hasOwnProperty.call(node, "locationId") ? node.locationId : null
        }));
      allEdgesRuntime = Array.from(store.edgesById.values())
        .map((edge) => ({ ...edge }));
      workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));

      if (userById.has("user-hannah-lewis")) {
        currentUserId = "user-hannah-lewis";
      } else if (users.length) {
        currentUserId = users[0].id;
      } else {
        currentUserId = null;
      }
      const initialWorkspaceOptions = workspaceOptions.filter((workspace) => workspace.ownerId === currentUserId);
      currentWorkspaceId = initialWorkspaceOptions[0]?.id || null;
      currentWorkspaceKind = normalizeWorkspaceKind(initialWorkspaceOptions[0]?.kind);
      appliedWorkspaceId = null;
      hasAppliedWorkspace = false;
      workspaceMenuOpen = false;
      userMenuOpen = false;
      resetWorkspaceCreateState();
    }

let nodes = [];
let edges = [];
let nodeById = new Map();
let edgeById = new Map();
let outgoingEdgeIdsBySourceId = new Map();
let incomingEdgeIdsByTargetId = new Map();
let edgeRuntimeCounter = 0;

function inferEdgeKindForPair(sourceNode, targetNode) {
  if (!sourceNode || !targetNode) return "link";
  if (sourceNode.type === "location" && targetNode.type === "location") return "location_contains";
  if (sourceNode.type === "location" && targetNode.type === "protocol") return "location_protocol";
  if (sourceNode.type === "location" && targetNode.type === "experiment") return "location_experiment";
  if (sourceNode.type === "protocol" && targetNode.type === "experiment") return "protocol_experiment";
  if (sourceNode.type === "portal" && targetNode.type === "protocol") return "portal_protocol";
  return "link";
}

function rebuildEdgeIndexes() {
  edgeById.clear();
  outgoingEdgeIdsBySourceId = new Map();
  incomingEdgeIdsByTargetId = new Map();

  const validEdges = [];
  edges.forEach((edge) => {
    if (!edge || !edge.id) return;
    if (!nodeById.has(edge.sourceId) || !nodeById.has(edge.targetId)) return;
    const sourceNode = nodeById.get(edge.sourceId);
    const targetNode = nodeById.get(edge.targetId);
    edge.kind = edge.kind || inferEdgeKindForPair(sourceNode, targetNode);

    validEdges.push(edge);
    edgeById.set(edge.id, edge);

    const outgoing = outgoingEdgeIdsBySourceId.get(edge.sourceId) || [];
    outgoing.push(edge.id);
    outgoingEdgeIdsBySourceId.set(edge.sourceId, outgoing);

    const incoming = incomingEdgeIdsByTargetId.get(edge.targetId) || [];
    incoming.push(edge.id);
    incomingEdgeIdsByTargetId.set(edge.targetId, incoming);
  });

  edges.length = 0;
  edges.push(...validEdges);
}

function buildEdgeId(sourceId, targetId) {
  let candidate = `edge-${sourceId}-${targetId}`;
  while (edgeById.has(candidate)) {
    edgeRuntimeCounter += 1;
    candidate = `edge-${sourceId}-${targetId}-${edgeRuntimeCounter}`;
  }
  return candidate;
}

function getOutgoingEdges(nodeId, kindFilter = null) {
  const edgeIds = outgoingEdgeIdsBySourceId.get(nodeId) || [];
  const list = edgeIds.map((edgeId) => edgeById.get(edgeId)).filter(Boolean);
  if (!kindFilter) return list;
  const filterSet = new Set(Array.isArray(kindFilter) ? kindFilter : [kindFilter]);
  return list.filter((edge) => filterSet.has(edge.kind));
}

function getIncomingEdges(nodeId, kindFilter = null) {
  const edgeIds = incomingEdgeIdsByTargetId.get(nodeId) || [];
  const list = edgeIds.map((edgeId) => edgeById.get(edgeId)).filter(Boolean);
  if (!kindFilter) return list;
  const filterSet = new Set(Array.isArray(kindFilter) ? kindFilter : [kindFilter]);
  return list.filter((edge) => filterSet.has(edge.kind));
}

function getOutgoingNodeIds(nodeId, kindFilter = null) {
  const seen = new Set();
  const ids = [];
  getOutgoingEdges(nodeId, kindFilter).forEach((edge) => {
    if (!seen.has(edge.targetId)) {
      seen.add(edge.targetId);
      ids.push(edge.targetId);
    }
  });
  return ids;
}

function replaceOutgoingEdges(nodeId, targetIds, kindResolver = inferEdgeKindForPair) {
  const sourceNode = nodeById.get(nodeId);
  if (!sourceNode) return;

  const dedupedTargetIds = [];
  const seenTargets = new Set();
  (Array.isArray(targetIds) ? targetIds : []).forEach((targetId) => {
    if (seenTargets.has(targetId)) return;
    if (!nodeById.has(targetId)) return;
    if (targetId === nodeId) return;
    seenTargets.add(targetId);
    dedupedTargetIds.push(targetId);
  });

  for (let i = edges.length - 1; i >= 0; i -= 1) {
    if (edges[i].sourceId === nodeId) {
      edges.splice(i, 1);
    }
  }

  dedupedTargetIds.forEach((targetId) => {
    const targetNode = nodeById.get(targetId);
    const kind = typeof kindResolver === "function"
      ? kindResolver(sourceNode, targetNode)
      : inferEdgeKindForPair(sourceNode, targetNode);
    edges.push({
      id: buildEdgeId(nodeId, targetId),
      sourceId: nodeId,
      targetId,
      kind
    });
  });

  rebuildEdgeIndexes();
}

function attachLinkedNodeAccessors() {
  nodes.forEach((node) => {
    Object.defineProperty(node, "linkedNodeIds", {
      configurable: true,
      enumerable: true,
      get() {
        return getOutgoingNodeIds(node.id);
      },
      set(nextTargetIds) {
        replaceOutgoingEdges(node.id, nextTargetIds, inferEdgeKindForPair);
      }
    });
  });
}

const state = {
      selectedNodeId: "exp-culture-check-b",
      listMode: "by-location",
      expandedLocationIds: new Set(["loc-lab-a", "loc-freezer-1"]),
      expandedCanvasLocationId: null,
      expandedDragRootId: null,
      expandedDragOverrides: new Map(),
      focusLocationId: null,
      seenTaskIds: new Set(),
      notificationsOpen: false,
      openLenses: new Map()
    };

function getWorkspaceRecordById(workspaceId) {
  const visibleWorkspaceOptions = getWorkspaceOptionsForCurrentUser();
  if (!visibleWorkspaceOptions.length) return null;
  const visibleWorkspaceIds = new Set(visibleWorkspaceOptions.map((workspace) => workspace.id));
  if (workspaceId && visibleWorkspaceIds.has(workspaceId) && workspaceById.has(workspaceId)) {
    return workspaceById.get(workspaceId);
  }
  const fallbackWorkspaceId = visibleWorkspaceOptions[0].id;
  return workspaceById.get(fallbackWorkspaceId) || null;
}

function getWorkspaceOptionById(workspaceId) {
  const visibleWorkspaceOptions = getWorkspaceOptionsForCurrentUser();
  if (!visibleWorkspaceOptions.length) return null;
  return visibleWorkspaceOptions.find((workspace) => workspace.id === workspaceId) || visibleWorkspaceOptions[0];
}

function getCurrentUserRecord() {
  if (!currentUserId) return null;
  return userById.get(currentUserId) || null;
}

function getCurrentUserName() {
  const currentUser = getCurrentUserRecord();
  return currentUser?.name || "None";
}

function getSortedUsersForMenu() {
  return [...users].sort((leftUser, rightUser) => {
    const leftName = leftUser?.name || "";
    const rightName = rightUser?.name || "";
    const nameComparison = leftName.localeCompare(rightName, undefined, { sensitivity: "base" });
    if (nameComparison !== 0) return nameComparison;
    return (leftUser?.id || "").localeCompare(rightUser?.id || "");
  });
}

function getWorkspaceOptionsForCurrentUser() {
  if (!currentUserId) return [];
  return workspaceOptions.filter((workspace) => workspace.ownerId === currentUserId);
}

function setCurrentWorkspaceForCurrentUser() {
  const visibleWorkspaceOptions = getWorkspaceOptionsForCurrentUser();
  currentWorkspaceId = visibleWorkspaceOptions[0]?.id || null;
  currentWorkspaceKind = normalizeWorkspaceKind(visibleWorkspaceOptions[0]?.kind);
}

function resetWorkspaceCreateState() {
  isCreatingWorkspace = false;
  workspaceDraftName = "";
}

function resetWorkspaceRenameState() {
  workspaceRenameId = null;
  workspaceRenameDraft = "";
}

function syncWorkspaceRuntimeAndStore() {
  enforceCollabUniqueness(workspaces);
  workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));
  workspaceOptions = workspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name || workspace.id,
    kind: normalizeWorkspaceKind(workspace.kind),
    ownerId: workspace.ownerId || null
  }));

  if (store) {
    store.workspaces = workspaces.map((workspace) => ({ ...workspace }));
    store.workspacesById = new Map(workspaces.map((workspace) => [workspace.id, { ...workspace }]));
    store.workspaceOrder = workspaces.map((workspace) => workspace.id);
  }
}

function sanitizeWorkspaceSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function generateWorkspaceId(ownerId, name) {
  const ownerSlug = sanitizeWorkspaceSlug(ownerId) || "user";
  const nameSlug = sanitizeWorkspaceSlug(name) || "workspace";
  let candidate = `ws-${ownerSlug}-${nameSlug}`;
  if (!workspaceById.has(candidate)) {
    return candidate;
  }
  const stamp = Date.now().toString(36);
  candidate = `ws-${ownerSlug}-${nameSlug}-${stamp}`;
  if (!workspaceById.has(candidate)) {
    return candidate;
  }
  let counter = 2;
  while (workspaceById.has(`${candidate}-${counter}`)) {
    counter += 1;
  }
  return `${candidate}-${counter}`;
}

function toPersistableNode(node) {
  const clone = { ...node };
  delete clone.label;
  delete clone.owner;
  delete clone.linkedNodeIds;
  return clone;
}

function buildPersistableDataSnapshot() {
  return {
    users: users.map((user) => ({ ...user })),
    orgs: orgs.map((org) => ({ ...org })),
    nodes: allNodesRuntime.map((node) => toPersistableNode(node)),
    edges: allEdgesRuntime.map((edge) => ({ ...edge })),
    workspaces: workspaces.map((workspace) => ({ ...workspace }))
  };
}

function persistStoreToLocalStorage() {
  try {
    const payload = buildPersistableDataSnapshot();
    window.localStorage.setItem(STORE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to persist amytis_store_v1 payload.", error);
  }
}

function createWorkspaceForCurrentUser(name) {
  if (!currentUserId) return null;
  const trimmedName = String(name || "").trim();
  if (!trimmedName) return null;

  const id = generateWorkspaceId(currentUserId, trimmedName);
  const workspaceRecord = {
    id,
    name: trimmedName,
    kind: "normal",
    ownerId: currentUserId,
    nodeIds: [],
    edgeIds: []
  };
  workspaces.push(workspaceRecord);
  syncWorkspaceRuntimeAndStore();

  currentWorkspaceId = id;
  currentWorkspaceKind = "normal";
  hasAppliedWorkspace = false;
  persistStoreToLocalStorage();
  return workspaceRecord;
}

function renameWorkspace(workspaceId, nextName) {
  const trimmedName = String(nextName || "").trim();
  if (!trimmedName) return false;
  const workspaceRecord = workspaceById.get(workspaceId);
  if (!workspaceRecord) return false;

  workspaceRecord.name = trimmedName;
  const workspaceIndex = workspaces.findIndex((workspace) => workspace.id === workspaceId);
  if (workspaceIndex >= 0) {
    workspaces[workspaceIndex].name = trimmedName;
  }

  syncWorkspaceRuntimeAndStore();
  persistStoreToLocalStorage();
  return true;
}

function deleteWorkspace(workspaceId) {
  const workspaceIndex = workspaces.findIndex((workspace) => workspace.id === workspaceId);
  if (workspaceIndex === -1) return false;

  const wasActiveWorkspace = currentWorkspaceId === workspaceId;
  workspaces.splice(workspaceIndex, 1);
  syncWorkspaceRuntimeAndStore();

  if (wasActiveWorkspace) {
    setCurrentWorkspaceForCurrentUser();
    if (!currentWorkspaceId) {
      currentWorkspaceKind = "normal";
    }
    hasAppliedWorkspace = false;
  }

  persistStoreToLocalStorage();
  return true;
}

function sanitizeStateForWorkspace() {
  const hasNodes = nodes.length > 0;
  if (!state.selectedNodeId || !nodeById.has(state.selectedNodeId)) {
    state.selectedNodeId = hasNodes ? nodes[0].id : null;
  }

  state.expandedLocationIds = new Set(
    [...state.expandedLocationIds].filter((locationId) => {
      const node = getNodeById(locationId);
      return !!node && node.type === "location";
    })
  );

  if (state.expandedCanvasLocationId) {
    const expandedNode = getNodeById(state.expandedCanvasLocationId);
    if (!expandedNode || expandedNode.type !== "location") {
      state.expandedCanvasLocationId = null;
    }
  }

  if (state.expandedDragRootId && !nodeById.has(state.expandedDragRootId)) {
    state.expandedDragRootId = null;
    state.expandedDragOverrides = new Map();
  } else {
    state.expandedDragOverrides = new Map(
      [...state.expandedDragOverrides.entries()].filter(([nodeId]) => nodeById.has(nodeId))
    );
  }

  if (state.focusLocationId) {
    const focusNode = getNodeById(state.focusLocationId);
    if (!focusNode || focusNode.type !== "location") {
      state.focusLocationId = null;
    }
  }

  state.openLenses = new Map(
    [...state.openLenses.entries()].filter(([locationId]) => {
      const locationNode = getNodeById(locationId);
      return !!locationNode && locationNode.type === "location";
    })
  );

  if (!getLocationNodes().length && state.listMode === "by-location") {
    state.listMode = "all-nodes";
  }
}

function applyWorkspaceData(workspaceId, options = {}) {
  const workspaceRecord = getWorkspaceRecordById(workspaceId);
  const workspaceOption = getWorkspaceOptionById(workspaceId);
  currentWorkspaceId = workspaceRecord?.id || workspaceOption?.id || null;
  currentWorkspaceKind = normalizeWorkspaceKind(workspaceRecord?.kind || workspaceOption?.kind);

  if (!workspaceRecord) {
    nodes = [];
    edges = [];
    nodeById = new Map();
    edgeRuntimeCounter = 0;
    rebuildEdgeIndexes();
    if (options.sanitizeState !== false) {
      sanitizeStateForWorkspace();
    }
    return;
  }

  const scopedNodeIds = new Set(
    workspaceRecord && Array.isArray(workspaceRecord.nodeIds) && workspaceRecord.nodeIds.length
      ? workspaceRecord.nodeIds
      : []
  );
  nodes = allNodesRuntime.filter((node) => scopedNodeIds.has(node.id));
  nodeById = new Map(nodes.map((node) => [node.id, node]));

  const scopedEdgeIds = new Set(
    workspaceRecord && Array.isArray(workspaceRecord.edgeIds) && workspaceRecord.edgeIds.length
      ? workspaceRecord.edgeIds
      : []
  );
  edges = allEdgesRuntime
    .filter((edge) => scopedEdgeIds.has(edge.id))
    .filter((edge) => nodeById.has(edge.sourceId) && nodeById.has(edge.targetId))
    .map((edge) => ({ ...edge }));

  edgeRuntimeCounter = 0;
  rebuildEdgeIndexes();
  attachLinkedNodeAccessors();

  if (options.sanitizeState !== false) {
    sanitizeStateForWorkspace();
  }
}
    // Manual seed example for lens testing:
    // state.openLenses.set("loc-lab-a", { x: 120, y: 120, w: 320, h: 220 });

    // World camera transform for infinite-canvas feel. Node positions remain world coordinates.
    let camera = { panX: 0, panY: 0, zoom: 1 };
    let gridPanOffsetX = 0;
    let gridPanOffsetY = 0;
    const ZOOM_MIN = 0.2;
    const ZOOM_MAX = 3.0;
    const ZOOM_SENSITIVITY = 0.0015;
    const GRID_BG_SPACING_PX = 48;
    const GRID_PATTERN_TRANSFORM = "skewX(-18) rotate(12)";
    const DRAG_CLICK_SUPPRESS_THRESHOLD = 3;
    const RESIZE_CLICK_SUPPRESS_THRESHOLD = 3;
    const RESIZE_HANDLE_SIZE = 12;
    const MIN_EXPANDED_ASPECT = 0.5;
    const MAX_EXPANDED_ASPECT = 3;
    const LOCATION_DOUBLE_CLICK_MS = 280;
    let isPanning = false;
    let lastPanClientX = 0;
    let lastPanClientY = 0;
    let suppressClickNodeId = null;
    let lastLocationClick = {
      nodeId: null,
      context: null,
      at: 0
    };
    let dragState = {
      isDragging: false,
      nodeId: null,
      cardEl: null,
      startClientX: 0,
      startClientY: 0,
      startLeft: 0,
      startTop: 0,
      moved: false
    };
    let resizeState = {
      isResizing: false,
      nodeId: null,
      cardEl: null,
      childContainerEl: null,
      startClientX: 0,
      startClientY: 0,
      startInnerWidth: 0,
      aspect: 1,
      moved: false
    };
    let leftPanelOpen = false;
    let rightPanelOpen = false;
    let layoutMode = "force";

    const nodeListEl = document.getElementById("nodeList");
    const viewportEl = document.getElementById("viewport");
    const bgGridPatternEl = document.getElementById("bgGridPattern");
    const worldEl = document.getElementById("world");
    const edgesLayerEl = document.getElementById("edges-layer");
    const detailsPaneEl = document.getElementById("detailsPane");
    const byLocationBtn = document.getElementById("byLocationBtn");
    const allNodesBtn = document.getElementById("allNodesBtn");
    const focusBackBtn = document.getElementById("focusBackBtn");
    const focusBreadcrumbEl = document.getElementById("focusBreadcrumb");
    const notifBellEl = document.getElementById("notifBell");
    const notifCountEl = document.getElementById("notifCount");
    const notificationsPanelEl = document.getElementById("notificationsPanel");
    const leftDrawerEl = document.getElementById("leftDrawer");
    const rightDrawerEl = document.getElementById("rightDrawer");
    const leftPanelBodyEl = document.getElementById("leftPanelBody");
    const rightPanelBodyEl = document.getElementById("rightPanelBody");
    const leftPanelCollapseTabEl = document.getElementById("leftPanelCollapseTab");
    const rightPanelCollapseTabEl = document.getElementById("rightPanelCollapseTab");
    const leftPanelPillEl = document.getElementById("leftPanelPill");
    const rightPanelPillEl = document.getElementById("rightPanelPill");
    const forceModeBtnEl = document.getElementById("forceModeBtn");
    const hybridModeBtnEl = document.getElementById("hybridModeBtn");
    const workspaceMenuWrapEl = document.getElementById("workspaceMenu");
    const workspaceMenuBtnEl = document.getElementById("workspaceMenuBtn");
    const workspaceMenuPanelEl = document.getElementById("workspaceMenuPanel");
    let gridPatternInverse2x2 = null;
    if (bgGridPatternEl) {
      bgGridPatternEl.setAttribute("width", String(GRID_BG_SPACING_PX));
      bgGridPatternEl.setAttribute("height", String(GRID_BG_SPACING_PX));
      bgGridPatternEl.setAttribute("patternTransform", GRID_PATTERN_TRANSFORM);
    }
    let lastVisibleNodeIds = new Set();
    let lastVisibleNodeFrames = new Map();
    let lastRenderedCardsById = new Map();

    byLocationBtn.addEventListener("click", () => {
      state.listMode = "by-location";
      renderNodeLists();
    });

    allNodesBtn.addEventListener("click", () => {
      state.listMode = "all-nodes";
      renderNodeLists();
    });

    focusBackBtn.addEventListener("click", () => {
      setFocusLocation(null);
    });

    notifBellEl.addEventListener("click", (event) => {
      event.stopPropagation();
      state.notificationsOpen = !state.notificationsOpen;
      renderNotifications();
    });

    notificationsPanelEl.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    if (workspaceMenuBtnEl) {
      workspaceMenuBtnEl.addEventListener("click", (event) => {
        event.stopPropagation();
        workspaceMenuOpen = !workspaceMenuOpen;
        userMenuOpen = false;
        if (!workspaceMenuOpen) {
          resetWorkspaceCreateState();
          resetWorkspaceRenameState();
        }
        renderWorkspaceMenu();
      });
    }

    if (workspaceMenuPanelEl) {
      workspaceMenuPanelEl.addEventListener("click", (event) => {
        event.stopPropagation();
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!workspaceMenuOpen) return;
      workspaceMenuOpen = false;
      userMenuOpen = false;
      resetWorkspaceCreateState();
      resetWorkspaceRenameState();
      renderWorkspaceMenu();
    });

    document.addEventListener("click", (event) => {
      const clickTarget = event.target;
      if (
        workspaceMenuOpen &&
        workspaceMenuWrapEl &&
        clickTarget instanceof Node &&
        !workspaceMenuWrapEl.contains(clickTarget)
      ) {
        workspaceMenuOpen = false;
        userMenuOpen = false;
        resetWorkspaceCreateState();
        resetWorkspaceRenameState();
        renderWorkspaceMenu();
      }

      if (!state.notificationsOpen) return;
      state.notificationsOpen = false;
      renderNotifications();
    });

    if (leftPanelCollapseTabEl) {
      leftPanelCollapseTabEl.addEventListener("click", () => {
        leftPanelOpen = false;
        renderPanelState();
      });
      leftPanelCollapseTabEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          leftPanelOpen = false;
          renderPanelState();
        }
      });
    }

    if (rightPanelCollapseTabEl) {
      rightPanelCollapseTabEl.addEventListener("click", () => {
        rightPanelOpen = false;
        renderPanelState();
      });
      rightPanelCollapseTabEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          rightPanelOpen = false;
          renderPanelState();
        }
      });
    }

    if (leftPanelPillEl) {
      leftPanelPillEl.addEventListener("click", () => {
        leftPanelOpen = true;
        renderPanelState();
      });
      leftPanelPillEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          leftPanelOpen = true;
          renderPanelState();
        }
      });
    }

    if (rightPanelPillEl) {
      rightPanelPillEl.addEventListener("click", () => {
        rightPanelOpen = true;
        renderPanelState();
      });
      rightPanelPillEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          rightPanelOpen = true;
          renderPanelState();
        }
      });
    }

    function applyLayoutModeFromButton(nextMode) {
      if (state.expandedCanvasLocationId !== null) {
        renderLayoutControls();
        return;
      }
      layoutMode = nextMode;
      const visibleNodeIds = getVisibleNodeIdsForGlobalView();
      applyCurrentLayoutMode(visibleNodeIds, { reset: true, randomize: true, fitPadding: 80 });
      renderCanvas();
      renderLayoutControls();
    }

    if (forceModeBtnEl) {
      forceModeBtnEl.addEventListener("click", () => {
        applyLayoutModeFromButton("force");
      });
    }

    if (hybridModeBtnEl) {
      hybridModeBtnEl.addEventListener("click", () => {
        applyLayoutModeFromButton("hybrid");
      });
    }

    if (viewportEl) {
      viewportEl.addEventListener("wheel", onViewportWheel, { passive: false });
      viewportEl.addEventListener("mousedown", onViewportMouseDown);
    }
    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);
    window.addEventListener("blur", onWindowMouseUp);

    let renderRafId = null;
    let pendingCameraRender = false;
    let pendingEdgeRedraw = false;

    function requestRender(options = {}) {
      pendingCameraRender = true;
      if (options.edges === true) {
        pendingEdgeRedraw = true;
      }
      if (renderRafId !== null) return;
      renderRafId = requestAnimationFrame(renderFrame);
    }

    function renderFrame() {
      renderRafId = null;
      const shouldRenderCamera = pendingCameraRender;
      const shouldRedrawEdges = pendingEdgeRedraw;
      pendingCameraRender = false;
      pendingEdgeRedraw = false;

      if (shouldRenderCamera) {
        applyCameraTransform();
      }
      if (shouldRedrawEdges) {
        drawEdgesFromModel();
      }
    }

    function scheduleEdgeRedraw() {
      requestRender({ edges: true });
    }

    window.addEventListener("resize", () => requestRender({ edges: true }));

    function renderPanelState() {
      if (leftDrawerEl) {
        leftDrawerEl.classList.toggle("panel--hidden", !leftPanelOpen);
      }
      if (rightDrawerEl) {
        rightDrawerEl.classList.toggle("panel--hidden", !rightPanelOpen);
      }
      if (leftPanelBodyEl) {
        leftPanelBodyEl.setAttribute("aria-hidden", String(!leftPanelOpen));
      }
      if (rightPanelBodyEl) {
        rightPanelBodyEl.setAttribute("aria-hidden", String(!rightPanelOpen));
      }
      if (leftPanelCollapseTabEl) {
        leftPanelCollapseTabEl.setAttribute("aria-hidden", String(!leftPanelOpen));
      }
      if (rightPanelCollapseTabEl) {
        rightPanelCollapseTabEl.setAttribute("aria-hidden", String(!rightPanelOpen));
      }
      if (leftPanelPillEl) {
        leftPanelPillEl.classList.toggle("hidden", leftPanelOpen);
        leftPanelPillEl.setAttribute("aria-hidden", String(leftPanelOpen));
      }
      if (rightPanelPillEl) {
        rightPanelPillEl.classList.toggle("hidden", rightPanelOpen);
        rightPanelPillEl.setAttribute("aria-hidden", String(rightPanelOpen));
      }
    }

    function renderWorkspaceMenu() {
      if (!workspaceMenuBtnEl || !workspaceMenuPanelEl) return;
      let createInputEl = null;
      let renameInputEl = null;
      const currentUserName = getCurrentUserName();
      workspaceMenuBtnEl.setAttribute("aria-expanded", String(workspaceMenuOpen));
      workspaceMenuBtnEl.setAttribute("title", `Workspaces · User: ${currentUserName}`);
      workspaceMenuPanelEl.classList.toggle("is-open", workspaceMenuOpen);
      workspaceMenuPanelEl.setAttribute("aria-label", `Workspace and user list. Current user: ${currentUserName}`);
      workspaceMenuPanelEl.innerHTML = "";

      const userSelectEl = document.createElement("div");
      userSelectEl.className = "workspace-user-select";
      const userToggleEl = document.createElement("button");
      userToggleEl.type = "button";
      userToggleEl.className = "workspace-user-toggle";
      userToggleEl.setAttribute("aria-label", "Select user");
      userToggleEl.setAttribute("aria-expanded", String(userMenuOpen));

      const userToggleNameEl = document.createElement("span");
      userToggleNameEl.className = "workspace-user-toggle-name";
      userToggleNameEl.textContent = `User: ${currentUserName}`;
      userToggleEl.appendChild(userToggleNameEl);

      const userToggleChevronEl = document.createElement("span");
      userToggleChevronEl.className = "workspace-user-chevron";
      userToggleChevronEl.textContent = "▼";
      userToggleEl.appendChild(userToggleChevronEl);

      userToggleEl.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        userMenuOpen = !userMenuOpen;
        renderWorkspaceMenu();
      });
      userSelectEl.appendChild(userToggleEl);

      if (userMenuOpen) {
        const userDropdownEl = document.createElement("div");
        userDropdownEl.className = "workspace-user-dropdown";
        const sortedUsers = getSortedUsersForMenu();
        if (!sortedUsers.length) {
          const emptyUsersEl = document.createElement("div");
          emptyUsersEl.className = "workspace-menu-empty";
          emptyUsersEl.textContent = "No users";
          userDropdownEl.appendChild(emptyUsersEl);
        } else {
          sortedUsers.forEach((user) => {
            const userItemEl = document.createElement("button");
            userItemEl.type = "button";
            userItemEl.className = "workspace-user-item";
            const isActiveUser = user.id === currentUserId;
            if (isActiveUser) {
              userItemEl.classList.add("is-active");
            }

            const userNameEl = document.createElement("span");
            userNameEl.className = "workspace-user-name";
            userNameEl.textContent = user.name || user.id;
            userItemEl.appendChild(userNameEl);

            const orgName = user.orgId && orgById.get(user.orgId) ? orgById.get(user.orgId).name : "";
            if (orgName) {
              const userOrgEl = document.createElement("span");
              userOrgEl.className = "workspace-user-org";
              userOrgEl.textContent = orgName;
              userItemEl.appendChild(userOrgEl);
            }

            userItemEl.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              currentUserId = user.id;
              setCurrentWorkspaceForCurrentUser();
              hasAppliedWorkspace = false;
              userMenuOpen = false;
              resetWorkspaceCreateState();
              resetWorkspaceRenameState();
              renderAll();
            });
            userDropdownEl.appendChild(userItemEl);
          });
        }
        userSelectEl.appendChild(userDropdownEl);
      }
      workspaceMenuPanelEl.appendChild(userSelectEl);

      const workspaceListEl = document.createElement("div");
      workspaceListEl.className = "workspace-workspace-list";
      const visibleWorkspaceOptions = getWorkspaceOptionsForCurrentUser();
      if (!visibleWorkspaceOptions.length) {
        const noWorkspacesEl = document.createElement("div");
        noWorkspacesEl.className = "workspace-menu-empty";
        noWorkspacesEl.textContent = "No workspaces";
        workspaceListEl.appendChild(noWorkspacesEl);
      } else {
        visibleWorkspaceOptions.forEach((workspace) => {
          const rowEl = document.createElement("div");
          rowEl.className = "workspace-menu-row";
          const isActive = workspace.id === currentWorkspaceId;
          const isRenaming = workspaceRenameId === workspace.id;
          if (isActive) {
            rowEl.classList.add("is-active");
          }

          if (isRenaming) {
            const renameInput = document.createElement("input");
            renameInput.type = "text";
            renameInput.className = "workspace-rename-input";
            renameInput.placeholder = "Workspace name";
            renameInput.value = workspaceRenameDraft;
            renameInput.maxLength = 80;
            renameInput.addEventListener("click", (event) => {
              event.stopPropagation();
            });
            renameInput.addEventListener("input", () => {
              workspaceRenameDraft = renameInput.value;
            });
            renameInput.addEventListener("keydown", (event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                const renamed = renameWorkspace(workspace.id, workspaceRenameDraft);
                if (renamed) {
                  resetWorkspaceRenameState();
                }
                renderWorkspaceMenu();
                return;
              }
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                resetWorkspaceRenameState();
                renderWorkspaceMenu();
              }
            });
            renameInput.addEventListener("blur", () => {
              if (workspaceRenameId !== workspace.id) return;
              resetWorkspaceRenameState();
              renderWorkspaceMenu();
            });
            rowEl.appendChild(renameInput);
            renameInputEl = renameInput;
          } else {
            const item = document.createElement("button");
            item.type = "button";
            item.role = "menuitemradio";
            item.className = "workspace-menu-item";
            item.setAttribute("aria-checked", String(isActive));

            const labelEl = document.createElement("span");
            labelEl.className = "workspace-menu-item-label";
            labelEl.textContent = workspace.name || workspace.id;
            item.appendChild(labelEl);

            item.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              currentWorkspaceId = workspace.id;
              workspaceMenuOpen = false;
              userMenuOpen = false;
              resetWorkspaceCreateState();
              resetWorkspaceRenameState();
              renderAll();
            });
            rowEl.appendChild(item);
          }

          if (isActive && !isRenaming) {
            const actionsEl = document.createElement("div");
            actionsEl.className = "workspace-menu-item-actions";

            const renameBtnEl = document.createElement("button");
            renameBtnEl.type = "button";
            renameBtnEl.className = "workspace-row-icon-btn rename";
            renameBtnEl.setAttribute("aria-label", `Rename workspace ${workspace.name || workspace.id}`);
            renameBtnEl.textContent = "✎";
            renameBtnEl.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              resetWorkspaceCreateState();
              workspaceRenameId = workspace.id;
              workspaceRenameDraft = workspace.name || workspace.id || "";
              renderWorkspaceMenu();
            });
            actionsEl.appendChild(renameBtnEl);

            const deleteBtnEl = document.createElement("button");
            deleteBtnEl.type = "button";
            deleteBtnEl.className = "workspace-row-icon-btn delete";
            deleteBtnEl.setAttribute("aria-label", `Delete workspace ${workspace.name || workspace.id}`);
            deleteBtnEl.textContent = "✕";
            deleteBtnEl.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              const workspaceName = workspace.name || workspace.id || "workspace";
              const confirmed = window.confirm(`Delete workspace "${workspaceName}"?`);
              if (!confirmed) return;
              const deleted = deleteWorkspace(workspace.id);
              if (!deleted) return;
              if (workspaceRenameId === workspace.id) {
                resetWorkspaceRenameState();
              }
              resetWorkspaceCreateState();
              renderAll();
            });
            actionsEl.appendChild(deleteBtnEl);

            rowEl.appendChild(actionsEl);
          }

          workspaceListEl.appendChild(rowEl);
        });
      }
      workspaceMenuPanelEl.appendChild(workspaceListEl);

      const createWrapEl = document.createElement("div");
      createWrapEl.className = "workspace-create-wrap";

      if (!currentUserId) {
        const createBtnEl = document.createElement("button");
        createBtnEl.type = "button";
        createBtnEl.className = "workspace-create-btn";
        createBtnEl.textContent = "+ Workspace";
        createBtnEl.disabled = true;
        createWrapEl.appendChild(createBtnEl);

        const createHintEl = document.createElement("div");
        createHintEl.className = "workspace-create-hint";
        createHintEl.textContent = "Select a user to create a workspace.";
        createWrapEl.appendChild(createHintEl);
      } else if (!isCreatingWorkspace) {
        const createBtnEl = document.createElement("button");
        createBtnEl.type = "button";
        createBtnEl.className = "workspace-create-btn";
        createBtnEl.textContent = "+ Workspace";
        createBtnEl.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          resetWorkspaceRenameState();
          isCreatingWorkspace = true;
          workspaceDraftName = "";
          renderWorkspaceMenu();
        });
        createWrapEl.appendChild(createBtnEl);
      } else {
        const nameInputEl = document.createElement("input");
        nameInputEl.type = "text";
        nameInputEl.className = "workspace-create-input";
        nameInputEl.placeholder = "Workspace name";
        nameInputEl.value = workspaceDraftName;
        nameInputEl.maxLength = 80;
        nameInputEl.addEventListener("click", (event) => {
          event.stopPropagation();
        });
        nameInputEl.addEventListener("input", () => {
          workspaceDraftName = nameInputEl.value;
        });
        nameInputEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            const createdWorkspace = createWorkspaceForCurrentUser(workspaceDraftName);
            if (createdWorkspace) {
              resetWorkspaceCreateState();
              renderAll();
            }
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            resetWorkspaceCreateState();
            renderWorkspaceMenu();
          }
        });
        nameInputEl.addEventListener("blur", () => {
          resetWorkspaceCreateState();
          renderWorkspaceMenu();
        });
        createWrapEl.appendChild(nameInputEl);
        createInputEl = nameInputEl;
      }

      workspaceMenuPanelEl.appendChild(createWrapEl);

      if (createInputEl) {
        requestAnimationFrame(() => {
          if (!createInputEl.isConnected) return;
          createInputEl.focus();
          createInputEl.select();
        });
      }
      if (renameInputEl) {
        requestAnimationFrame(() => {
          if (!renameInputEl.isConnected) return;
          renameInputEl.focus();
          renameInputEl.select();
        });
      }
    }

    function applyCameraTransform() {
      if (!worldEl) return;
      const zoom = Number.isFinite(camera.zoom) && camera.zoom > 0 ? camera.zoom : 1;
      worldEl.style.transform = `translate(${camera.panX}px, ${camera.panY}px) scale(${zoom})`;
      worldEl.style.transformOrigin = "0 0";
      updateViewportGridBackground();
    }

    function updateViewportGridBackground() {
      if (!bgGridPatternEl) return;
      if (!gridPatternInverse2x2) {
        const baseMatrix = bgGridPatternEl.patternTransform?.baseVal?.consolidate()?.matrix || null;
        if (baseMatrix) {
          const det = (baseMatrix.a * baseMatrix.d) - (baseMatrix.b * baseMatrix.c);
          if (Math.abs(det) > 1e-9) {
            gridPatternInverse2x2 = {
              a: baseMatrix.d / det,
              b: -baseMatrix.b / det,
              c: -baseMatrix.c / det,
              d: baseMatrix.a / det
            };
          }
        }
      }
      if (gridPatternInverse2x2) {
        const localX = (gridPatternInverse2x2.a * gridPanOffsetX) + (gridPatternInverse2x2.c * gridPanOffsetY);
        const localY = (gridPatternInverse2x2.b * gridPanOffsetX) + (gridPatternInverse2x2.d * gridPanOffsetY);
        bgGridPatternEl.setAttribute("x", String(localX));
        bgGridPatternEl.setAttribute("y", String(localY));
        return;
      }
      bgGridPatternEl.setAttribute("x", String(gridPanOffsetX));
      bgGridPatternEl.setAttribute("y", String(gridPanOffsetY));
    }

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function getViewportPoint(event) {
      if (!viewportEl) return { mx: 0, my: 0 };
      const viewportRect = viewportEl.getBoundingClientRect();
      return {
        mx: event.clientX - viewportRect.left,
        my: event.clientY - viewportRect.top
      };
    }

    function applyZoomAtCursor(mx, my, zoomMultiplier) {
      const currentZoom = Number.isFinite(camera.zoom) && camera.zoom > 0 ? camera.zoom : 1;
      const worldX = (mx - camera.panX) / currentZoom;
      const worldY = (my - camera.panY) / currentZoom;
      const nextZoom = clamp(currentZoom * zoomMultiplier, ZOOM_MIN, ZOOM_MAX);
      camera.zoom = nextZoom;
      camera.panX = mx - (worldX * nextZoom);
      camera.panY = my - (worldY * nextZoom);
      requestRender({ edges: false });
    }

    function onViewportWheel(event) {
      event.preventDefault();
      const { mx, my } = getViewportPoint(event);
      const zoomMultiplier = Math.exp(-event.deltaY * ZOOM_SENSITIVITY);
      applyZoomAtCursor(mx, my, zoomMultiplier);
    }

    function onViewportMouseDown(event) {
      if (event.button !== 0) return;
      if (dragState.isDragging) return;
      if (resizeState.isResizing) return;
      if (event.target.closest(".node-card")) return;
      isPanning = true;
      lastPanClientX = event.clientX;
      lastPanClientY = event.clientY;
      event.preventDefault();
    }

    function isInteractiveDragBlockTarget(target) {
      if (!target || !target.closest) return false;
      return !!target.closest("button, input, select, textarea, a, label, .node-child-loc, .node-resize-handle, .node-child-exp-marker");
    }

    function startLocationResize(event, nodeId, cardEl, childContainerEl) {
      if (event.button !== 0) return;
      const node = getNodeById(nodeId);
      if (!node || node.type !== "location" || !cardEl || !childContainerEl) return;
      const metrics = getExpandedLocationMetrics(node);
      const aspect = clamp(metrics.innerWidthPx / Math.max(1, metrics.innerHeightPx), MIN_EXPANDED_ASPECT, MAX_EXPANDED_ASPECT);
      resizeState = {
        isResizing: true,
        nodeId,
        cardEl,
        childContainerEl,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startInnerWidth: metrics.innerWidthPx,
        aspect,
        moved: false
      };
      isPanning = false;
      event.preventDefault();
      event.stopPropagation();
    }

    function updateLocationResize(event) {
      if (!resizeState.isResizing) return false;
      const resizeNode = getNodeById(resizeState.nodeId);
      if (!resizeNode || resizeNode.type !== "location") return false;

      const zoom = Number.isFinite(camera.zoom) && camera.zoom > 0 ? camera.zoom : 1;
      const dxScreen = event.clientX - resizeState.startClientX;
      const dyScreen = event.clientY - resizeState.startClientY;
      const dxWorld = dxScreen / zoom;
      const dyWorld = dyScreen / zoom;
      const deltaWFromX = dxWorld;
      const deltaWFromY = dyWorld * resizeState.aspect;
      const widthDelta = Math.abs(deltaWFromX) >= Math.abs(deltaWFromY) ? deltaWFromX : deltaWFromY;

      let nextInnerWidth = clamp(
        resizeState.startInnerWidth + widthDelta,
        EXPANDED_INNER_MIN_W,
        EXPANDED_INNER_MAX_W
      );
      const lockedAspect = clamp(resizeState.aspect, MIN_EXPANDED_ASPECT, MAX_EXPANDED_ASPECT);
      let nextInnerHeight = nextInnerWidth / lockedAspect;

      if (nextInnerHeight < EXPANDED_INNER_MIN_H) {
        nextInnerHeight = EXPANDED_INNER_MIN_H;
        nextInnerWidth = clamp(nextInnerHeight * lockedAspect, EXPANDED_INNER_MIN_W, EXPANDED_INNER_MAX_W);
      } else if (nextInnerHeight > EXPANDED_INNER_MAX_H) {
        nextInnerHeight = EXPANDED_INNER_MAX_H;
        nextInnerWidth = clamp(nextInnerHeight * lockedAspect, EXPANDED_INNER_MIN_W, EXPANDED_INNER_MAX_W);
      }

      const nextCardWidth = clamp(
        nextInnerWidth + EXPANDED_CARD_HORIZONTAL_CHROME,
        EXPANDED_CARD_MIN_W,
        EXPANDED_CARD_MAX_W
      );
      const nextCardHeight = clamp(
        nextInnerHeight + EXPANDED_CARD_VERTICAL_CHROME,
        EXPANDED_CARD_MIN_H,
        EXPANDED_CARD_MAX_H
      );
      resizeNode.expandedW = nextCardWidth;
      resizeNode.expandedH = nextCardHeight;
      // Keep legacy fields synchronized for transition-only compatibility.
      resizeNode.expandedAspect = lockedAspect;
      resizeNode.expandedInnerWidthPx = nextInnerWidth;

      if (resizeState.cardEl) {
        resizeState.cardEl.style.width = `${nextCardWidth}px`;
        resizeState.cardEl.style.height = `${nextCardHeight}px`;
      }
      if (resizeState.childContainerEl) {
        resizeState.childContainerEl.style.height = `${nextInnerHeight}px`;
        updateChildMarkerSizes(resizeState.childContainerEl, nextInnerWidth, nextInnerHeight);
      }

      const left = resizeState.cardEl ? Number.parseFloat(resizeState.cardEl.style.left) : Number.NaN;
      const top = resizeState.cardEl ? Number.parseFloat(resizeState.cardEl.style.top) : Number.NaN;
      const frameLeft = Number.isFinite(left) ? left : 0;
      const frameTop = Number.isFinite(top) ? top : 0;
      lastVisibleNodeFrames.set(resizeNode.id, {
        x: frameLeft,
        y: frameTop,
        w: nextCardWidth,
        h: nextCardHeight
      });

      const activeExpandedRoot = state.expandedCanvasLocationId;
      if (activeExpandedRoot) {
        if (state.expandedDragRootId !== activeExpandedRoot) {
          state.expandedDragRootId = activeExpandedRoot;
          state.expandedDragOverrides = new Map();
        }
        state.expandedDragOverrides.set(resizeNode.id, { left: frameLeft, top: frameTop });
      }

      const dxAbs = Math.abs(dxScreen);
      const dyAbs = Math.abs(dyScreen);
      if (dxAbs > RESIZE_CLICK_SUPPRESS_THRESHOLD || dyAbs > RESIZE_CLICK_SUPPRESS_THRESHOLD) {
        resizeState.moved = true;
      }

      scheduleEdgeRedraw();
      event.preventDefault();
      return true;
    }

    function stopLocationResize() {
      if (!resizeState.isResizing) return;
      if (resizeState.moved && resizeState.nodeId) {
        suppressClickNodeId = resizeState.nodeId;
      }
      resizeState = {
        isResizing: false,
        nodeId: null,
        cardEl: null,
        childContainerEl: null,
        startClientX: 0,
        startClientY: 0,
        startInnerWidth: 0,
        aspect: 1,
        moved: false
      };
    }

    function startNodeDrag(event, nodeId, cardEl) {
      if (event.button !== 0) return;
      if (resizeState.isResizing) return;
      if (isInteractiveDragBlockTarget(event.target)) return;
      const node = getNodeById(nodeId);
      if (!node || !cardEl) return;

      const currentLeft = Number.parseFloat(cardEl.style.left);
      const currentTop = Number.parseFloat(cardEl.style.top);
      dragState = {
        isDragging: true,
        nodeId,
        cardEl,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startLeft: Number.isFinite(currentLeft) ? currentLeft : cardEl.offsetLeft,
        startTop: Number.isFinite(currentTop) ? currentTop : cardEl.offsetTop,
        moved: false
      };
      isPanning = false;
      cardEl.classList.add("dragging");
      event.preventDefault();
      event.stopPropagation();
    }

    function updateDraggedNodePosition(event) {
      if (!dragState.isDragging) return false;
      const zoom = Number.isFinite(camera.zoom) && camera.zoom > 0 ? camera.zoom : 1;
      const dxScreen = event.clientX - dragState.startClientX;
      const dyScreen = event.clientY - dragState.startClientY;
      const dxWorld = dxScreen / zoom;
      const dyWorld = dyScreen / zoom;
      const nextLeft = dragState.startLeft + dxWorld;
      const nextTop = dragState.startTop + dyWorld;

      if (dragState.cardEl) {
        dragState.cardEl.style.left = `${nextLeft}px`;
        dragState.cardEl.style.top = `${nextTop}px`;
      }

      const draggedNode = getNodeById(dragState.nodeId);
      const draggedNodeSize = getCardSize(draggedNode, state.expandedCanvasLocationId);
      if (draggedNode) {
        draggedNode.graphPos = {
          x: nextLeft + (draggedNodeSize.width / 2),
          y: nextTop + (draggedNodeSize.height / 2)
        };
      }
      const previousFrame = lastVisibleNodeFrames.get(dragState.nodeId);
      if (previousFrame) {
        lastVisibleNodeFrames.set(dragState.nodeId, {
          x: nextLeft,
          y: nextTop,
          w: draggedNodeSize.width,
          h: draggedNodeSize.height
        });
      }

      const activeExpandedRoot = state.expandedCanvasLocationId;
      if (activeExpandedRoot) {
        if (state.expandedDragRootId !== activeExpandedRoot) {
          state.expandedDragRootId = activeExpandedRoot;
          state.expandedDragOverrides = new Map();
        }
        state.expandedDragOverrides.set(dragState.nodeId, { left: nextLeft, top: nextTop });
      }

      if (Math.abs(dxScreen) > DRAG_CLICK_SUPPRESS_THRESHOLD || Math.abs(dyScreen) > DRAG_CLICK_SUPPRESS_THRESHOLD) {
        dragState.moved = true;
      }

      scheduleEdgeRedraw();
      event.preventDefault();
      return true;
    }

    function stopNodeDrag() {
      if (!dragState.isDragging) return;
      if (dragState.cardEl) {
        dragState.cardEl.classList.remove("dragging");
      }
      if (dragState.moved && dragState.nodeId) {
        suppressClickNodeId = dragState.nodeId;
      }
      dragState = {
        isDragging: false,
        nodeId: null,
        cardEl: null,
        startClientX: 0,
        startClientY: 0,
        startLeft: 0,
        startTop: 0,
        moved: false
      };
    }

    function onWindowMouseMove(event) {
      if (updateLocationResize(event)) {
        return;
      }
      if (updateDraggedNodePosition(event)) {
        return;
      }
      if (!isPanning) return;
      const dx = event.clientX - lastPanClientX;
      const dy = event.clientY - lastPanClientY;
      camera.panX += dx;
      camera.panY += dy;
      gridPanOffsetX += dx;
      gridPanOffsetY += dy;
      lastPanClientX = event.clientX;
      lastPanClientY = event.clientY;
      requestRender({ edges: false });
      event.preventDefault();
    }

    function onWindowMouseUp() {
      stopLocationResize();
      stopNodeDrag();
      isPanning = false;
    }

    function getNodeById(id) {
      return nodeById.get(id) || null;
    }

    function getLocationNodes() {
      return nodes.filter((node) => node.type === "location");
    }

    function uniqueIds(values) {
      return [...new Set(values.filter((id) => !!id && nodeById.has(id)))];
    }

    function getStatusClass(status) {
      if (!status) return "";
      return `status-${String(status).toLowerCase().replace(/\s+/g, "-")}`;
    }

    function getMedian(values, fallback = 1) {
      if (!Array.isArray(values) || values.length === 0) return fallback;
      const sorted = values
        .filter((value) => Number.isFinite(value))
        .sort((a, b) => a - b);
      if (!sorted.length) return fallback;
      const middle = Math.floor(sorted.length / 2);
      if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
      }
      return sorted[middle];
    }

    function updateChildMarkerSizes(childContainerEl, fallbackWidth = null, fallbackHeight = null) {
      if (!childContainerEl) return;
      const innerWidth =
        childContainerEl.clientWidth || (Number.isFinite(fallbackWidth) ? fallbackWidth : EXPANDED_INNER_MIN_W);
      const innerHeight =
        childContainerEl.clientHeight || (Number.isFinite(fallbackHeight) ? fallbackHeight : EXPANDED_INNER_MIN_H);
      childContainerEl.querySelectorAll(".node-child-loc").forEach((childEl) => {
        const widthPct = Number.parseFloat(childEl.style.width) || 0;
        const heightPct = Number.parseFloat(childEl.style.height) || 0;
        const childPixelWidth = (innerWidth * widthPct) / 100;
        const childPixelHeight = (innerHeight * heightPct) / 100;
        const markerSizePx = clamp(
          Math.round(Math.min(childPixelWidth, childPixelHeight) * 0.22),
          6,
          14
        );
        childEl.querySelectorAll(".node-child-exp-marker").forEach((markerEl) => {
          markerEl.style.width = `${markerSizePx}px`;
          markerEl.style.height = `${markerSizePx}px`;
        });
      });
    }

    function getTypeShort(type) {
      const map = {
        location: "LOC",
        experiment: "EXP",
        protocol: "PROT",
        project: "PRJ",
        sample: "SAMP",
        dataset: "DATA",
        analysis: "ANL",
        figure: "FIG",
        handover: "HND",
        portal: "PRTL"
      };
      return map[type] || type.toUpperCase();
    }

    function getTypeSortIndex(type) {
      const index = TYPE_ORDER.indexOf(type);
      return index >= 0 ? index : TYPE_ORDER.length;
    }

    function compareNodesStable(aNode, bNode) {
      if (!aNode && !bNode) return 0;
      if (!aNode) return 1;
      if (!bNode) return -1;
      const typeDiff = getTypeSortIndex(aNode.type) - getTypeSortIndex(bNode.type);
      if (typeDiff !== 0) return typeDiff;
      const labelDiff = aNode.label.localeCompare(bNode.label);
      if (labelDiff !== 0) return labelDiff;
      return aNode.id.localeCompare(bNode.id);
    }

    function getSelectedNode() {
      return getNodeById(state.selectedNodeId);
    }

    function buildParentMap() {
      const parentMap = new Map();
      nodes.forEach((node) => {
        if (node.type !== "location") return;
        node.linkedNodeIds.forEach((linkedId) => {
          const childNode = getNodeById(linkedId);
          if (childNode && childNode.type === "location") {
            parentMap.set(childNode.id, node.id);
          }
        });
      });
      return parentMap;
    }

    function getChildLocations(locationId) {
      const locationNode = getNodeById(locationId);
      if (!locationNode || locationNode.type !== "location") return [];
      return locationNode.linkedNodeIds
        .map((id) => getNodeById(id))
        .filter((node) => node && node.type === "location");
    }

    function getLocationChildren(locationId) {
      return getChildLocations(locationId);
    }

    function hasValidGraphPos(node) {
      return !!node &&
        !!node.graphPos &&
        Number.isFinite(node.graphPos.x) &&
        Number.isFinite(node.graphPos.y);
    }

    function getVisibleNodeIdsForCurrentView() {
      return computeVisibleSet(state.expandedCanvasLocationId).visibleNodeIds;
    }

    function renderLayoutControls() {
      const expanded = state.expandedCanvasLocationId !== null;
      if (forceModeBtnEl) {
        forceModeBtnEl.disabled = expanded;
        forceModeBtnEl.classList.toggle("is-active", layoutMode === "force");
        forceModeBtnEl.title = expanded ? "Switch to global view to change layout mode" : "Force layout";
      }
      if (hybridModeBtnEl) {
        hybridModeBtnEl.disabled = expanded;
        hybridModeBtnEl.classList.toggle("is-active", layoutMode === "hybrid");
        hybridModeBtnEl.title = expanded ? "Switch to global view to change layout mode" : "Hybrid layout";
      }
    }

    function getVisibleNodeIdsForGlobalView() {
      return computeVisibleSet(null).visibleNodeIds;
    }

    function buildLayoutInput(visibleNodeIds) {
      const nodesForSim = [];
      const linksForSim = [];
      const modelById = new Map();
      const visibleIdSet = new Set(visibleNodeIds);
      const linkKeys = new Set();

      visibleIdSet.forEach((nodeId) => {
        const node = getNodeById(nodeId);
        if (!node) return;
        const size = getCardSize(node, null);
        const hasPos = hasValidGraphPos(node);
        const entry = {
          id: node.id,
          x: hasPos ? node.graphPos.x : 0,
          y: hasPos ? node.graphPos.y : 0,
          w: size.width,
          h: size.height
        };
        nodesForSim.push(entry);
        modelById.set(node.id, node);
      });

      nodesForSim.forEach((sourceEntry) => {
        const sourceNode = modelById.get(sourceEntry.id);
        if (!sourceNode) return;
        sourceNode.linkedNodeIds.forEach((targetId) => {
          if (!visibleIdSet.has(targetId)) return;
          const key = `${sourceNode.id}->${targetId}`;
          if (linkKeys.has(key)) return;
          linkKeys.add(key);
          linksForSim.push({ source: sourceNode.id, target: targetId });
        });
      });

      return { nodesForSim, linksForSim, modelById };
    }

    function runD3Layout(visibleNodeIds, options = {}) {
      if (!window.d3 || !d3.forceSimulation) return;
      const { nodesForSim, linksForSim, modelById } = buildLayoutInput(visibleNodeIds);
      if (!nodesForSim.length) return;

      const shouldReset = !!options.reset;
      const shouldRandomize = options.randomize !== false;
      const scatter = 120;
      nodesForSim.forEach((simNode) => {
        const modelNode = modelById.get(simNode.id);
        const hasSaved = hasValidGraphPos(modelNode);
        if (shouldReset || !hasSaved) {
          if (shouldRandomize) {
            simNode.x = (Math.random() * scatter * 2) - scatter;
            simNode.y = (Math.random() * scatter * 2) - scatter;
          } else {
            simNode.x = 0;
            simNode.y = 0;
          }
        }
      });

      const simulation = d3.forceSimulation(nodesForSim)
        .force("link", d3.forceLink(linksForSim).id((d) => d.id).distance(180).strength(0.2))
        .force("charge", d3.forceManyBody().strength(-700))
        .force("collide", d3.forceCollide().radius((d) => (0.5 * Math.max(d.w, d.h)) + 16).iterations(2))
        .force("center", d3.forceCenter(0, 0));

      for (let i = 0; i < 300; i += 1) {
        simulation.tick();
      }
      simulation.stop();

      nodesForSim.forEach((simNode) => {
        const modelNode = modelById.get(simNode.id);
        if (!modelNode) return;
        modelNode.graphPos = {
          x: Number.isFinite(simNode.x) ? simNode.x : 0,
          y: Number.isFinite(simNode.y) ? simNode.y : 0
        };
      });
    }

    function seedFlowPositions(visibleNodeIds) {
      const visibleIdSet = new Set(visibleNodeIds);
      const lanes = {
        location: [],
        experiment: [],
        protocol: [],
        project: [],
        sample: [],
        dataset: [],
        analysis: [],
        figure: [],
        handover: [],
        portal: []
      };
      const laneOrder = [
        "location",
        "experiment",
        "protocol",
        "project",
        "sample",
        "dataset",
        "analysis",
        "figure",
        "handover",
        "portal"
      ];

      visibleIdSet.forEach((nodeId) => {
        const node = getNodeById(nodeId);
        if (!node) return;
        if (!lanes[node.type]) return;
        lanes[node.type].push(node);
      });

      laneOrder.forEach((laneType) => {
        const laneNodes = lanes[laneType].sort(compareNodesStable);
        let rowIndex = 0;
        let wrapColumnIndex = 0;

        laneNodes.forEach((node) => {
          const size = getCardSize(node, null);
          const stepY = size.height + HYBRID_LANE_GAP_Y;
          const nextTop = rowIndex * stepY;

          if ((nextTop + size.height) > HYBRID_LANE_MAX_HEIGHT && rowIndex > 0) {
            rowIndex = 0;
            wrapColumnIndex += 1;
          }

          const x = (HYBRID_LANE_X[laneType] ?? 0) + (wrapColumnIndex * HYBRID_LANE_WRAP_OFFSET_X);
          const y = rowIndex * stepY;

          node.graphPos = { x, y };
          rowIndex += 1;
        });
      });
    }

    function runHybridLayout(visibleNodeIds) {
      if (!window.d3 || !d3.forceSimulation) return;
      seedFlowPositions(visibleNodeIds);
      const { nodesForSim, linksForSim, modelById } = buildLayoutInput(visibleNodeIds);
      if (!nodesForSim.length) return;

      const simulation = d3.forceSimulation(nodesForSim)
        .force("link", d3.forceLink(linksForSim).id((d) => d.id).distance(180).strength(0.15))
        .force("charge", d3.forceManyBody().strength(-600))
        .force("collide", d3.forceCollide().radius((d) => (0.5 * Math.max(d.w, d.h)) + 16).iterations(2))
        .force("laneX", d3.forceX((d) => {
          const modelNode = modelById.get(d.id);
          return HYBRID_LANE_X[modelNode?.type] ?? 0;
        }).strength(0.35))
        .force("laneY", d3.forceY(0).strength(0.02));

      for (let i = 0; i < 200; i += 1) {
        simulation.tick();
      }
      simulation.stop();

      nodesForSim.forEach((simNode) => {
        const modelNode = modelById.get(simNode.id);
        if (!modelNode) return;
        modelNode.graphPos = {
          x: Number.isFinite(simNode.x) ? simNode.x : 0,
          y: Number.isFinite(simNode.y) ? simNode.y : 0
        };
      });
    }

    function applyCurrentLayoutMode(visibleNodeIds, options = {}) {
      if (!visibleNodeIds || !visibleNodeIds.size) return;
      const runOptions = {
        reset: options.reset !== false,
        randomize: options.randomize !== false
      };
      const fitPadding = Number.isFinite(options.fitPadding) ? options.fitPadding : 80;

      if (layoutMode === "force") {
        runD3Layout(visibleNodeIds, runOptions);
      } else {
        runHybridLayout(visibleNodeIds);
      }
      fitCameraToNodes(visibleNodeIds, fitPadding);
    }

    function fitCameraToNodes(visibleNodeIds, padding = 80) {
      if (!viewportEl) return;
      const visibleIdSet = new Set(visibleNodeIds);
      if (!visibleIdSet.size) return;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      visibleIdSet.forEach((nodeId) => {
        const node = getNodeById(nodeId);
        if (!node || !hasValidGraphPos(node)) return;
        const size = getCardSize(node, null);
        const left = node.graphPos.x - (size.width / 2);
        const top = node.graphPos.y - (size.height / 2);
        const right = node.graphPos.x + (size.width / 2);
        const bottom = node.graphPos.y + (size.height / 2);
        minX = Math.min(minX, left);
        minY = Math.min(minY, top);
        maxX = Math.max(maxX, right);
        maxY = Math.max(maxY, bottom);
      });

      if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
        return;
      }

      const viewportRect = viewportEl.getBoundingClientRect();
      const viewportWidth = Math.max(1, viewportRect.width);
      const viewportHeight = Math.max(1, viewportRect.height);
      const boundsWidth = Math.max(1, maxX - minX);
      const boundsHeight = Math.max(1, maxY - minY);
      const zoomX = (viewportWidth - (padding * 2)) / boundsWidth;
      const zoomY = (viewportHeight - (padding * 2)) / boundsHeight;
      const nextZoom = clamp(Math.min(zoomX, zoomY), ZOOM_MIN, ZOOM_MAX);
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      camera.zoom = nextZoom;
      camera.panX = (viewportWidth / 2) - (centerX * nextZoom);
      camera.panY = (viewportHeight / 2) - (centerY * nextZoom);
      requestRender({ edges: true });
    }

    function resetLayoutForCurrentView() {
      const visibleNodeIds = getVisibleNodeIdsForCurrentView();
      applyCurrentLayoutMode(visibleNodeIds, { reset: true, randomize: true, fitPadding: 80 });
      renderCanvas();
      renderLayoutControls();
    }

    function initializeGraphLayoutIfMissing() {
      if (!nodes.length) return;
      const allHaveSavedPositions = nodes.every((node) => hasValidGraphPos(node));
      if (allHaveSavedPositions) return;
      const visibleNodeIds = getVisibleNodeIdsForGlobalView();
      applyCurrentLayoutMode(visibleNodeIds, { reset: true, randomize: true, fitPadding: 80 });
    }

    function getLocationDescendants(locationId) {
      const descendants = [];
      const seen = new Set();
      const stack = [...getLocationChildren(locationId)];
      while (stack.length) {
        const node = stack.pop();
        if (!node || seen.has(node.id)) continue;
        seen.add(node.id);
        descendants.push(node);
        getLocationChildren(node.id).forEach((child) => {
          if (!seen.has(child.id)) stack.push(child);
        });
      }
      return descendants;
    }

    function getLocationBreadcrumb(focusLocationId, parentMap) {
      if (!focusLocationId) return [];
      const chain = [];
      let cursor = focusLocationId;
      while (cursor && getNodeById(cursor)) {
        chain.unshift(cursor);
        cursor = parentMap.get(cursor) || null;
      }
      return chain;
    }

    function getParentLocation(node) {
      if (!node || !node.locationId) return null;
      const locationNode = getNodeById(node.locationId);
      return locationNode && locationNode.type === "location" ? locationNode : null;
    }

    function getActiveExperimentsForLocation(locationId) {
      return nodes
        .filter((node) => node.type === "experiment" && node.status === "active" && node.locationId === locationId)
        .sort((a, b) => a.label.localeCompare(b.label));
    }

    function getPinnedNonLocationLinks(locationNode) {
      if (!locationNode || locationNode.type !== "location") return [];
      return locationNode.linkedNodeIds
        .map((id) => getNodeById(id))
        .filter((node) => node && node.type !== "location")
        .filter((node) => node.type !== "experiment" || node.status === "active");
    }

    function normalizeGlobalLocationSemantics() {
      const protocolIds = new Set(nodes.filter((node) => node.type === "protocol").map((node) => node.id));
      const experimentIds = new Set(nodes.filter((node) => node.type === "experiment").map((node) => node.id));
      const locationIds = new Set(nodes.filter((node) => node.type === "location").map((node) => node.id));

      nodes.forEach((node) => {
        if (!Array.isArray(node.tasks)) node.tasks = [];
        if (!Array.isArray(node.comments)) node.comments = [];
        if (!Array.isArray(node.linkedNodeIds)) node.linkedNodeIds = [];
      });

      nodes
        .filter((node) => node.type === "location")
        .forEach((locationNode) => {
          locationNode.locationId = null;
          locationNode.kind = locationNode.kind || "generic";
          locationNode.linkedNodeIds = uniqueIds(locationNode.linkedNodeIds);
        });

      nodes
        .filter((node) => node.type === "experiment")
        .forEach((experimentNode) => {
          experimentNode.status = "active";
          // Strict parent->child direction keeps experiment nodes as leaves.
          experimentNode.linkedNodeIds = [];
          if (!locationIds.has(experimentNode.locationId)) {
            experimentNode.locationId = null;
          }
        });

      nodes
        .filter((node) => node.type === "protocol")
        .forEach((protocolNode) => {
          protocolNode.locationId = null;
          protocolNode.linkedNodeIds = uniqueIds(protocolNode.linkedNodeIds.filter((id) => experimentIds.has(id)));
        });

      nodes
        .filter((node) => node.type === "portal")
        .forEach((portalNode) => {
          portalNode.locationId = null;
          portalNode.linkedNodeIds = uniqueIds(portalNode.linkedNodeIds.filter((id) => protocolIds.has(id)));
        });

      // Keep location->experiment links for active experiments only.
      const activeExperimentsByLocation = new Map();
      nodes
        .filter((node) => node.type === "experiment" && node.status === "active" && node.locationId)
        .forEach((experimentNode) => {
          const bucket = activeExperimentsByLocation.get(experimentNode.locationId) || [];
          bucket.push(experimentNode.id);
          activeExperimentsByLocation.set(experimentNode.locationId, bucket);
        });

      nodes
        .filter((node) => node.type === "location")
        .forEach((locationNode) => {
          const cleanedLinks = locationNode.linkedNodeIds.filter((linkedId) => {
            const linkedNode = getNodeById(linkedId);
            if (!linkedNode) return false;
            if (linkedNode.type === "location") return true;
            if (linkedNode.type === "protocol") return true;
            if (linkedNode.type === "experiment") {
              return linkedNode.status === "active" && linkedNode.locationId === locationNode.id;
            }
            // Location nodes should not directly link to portal nodes.
            return false;
          });
          const activeHere = activeExperimentsByLocation.get(locationNode.id) || [];
          locationNode.linkedNodeIds = uniqueIds([...cleanedLinks, ...activeHere]);
        });
    }

    function normalizeProjectWorkspaceSemantics() {
      const allIds = new Set(nodes.map((node) => node.id));
      nodes.forEach((node) => {
        if (!Array.isArray(node.tasks)) node.tasks = [];
        if (!Array.isArray(node.comments)) node.comments = [];
        if (typeof node.summary !== "string" || !node.summary.trim()) {
          node.summary = `${node.label || node.title || node.id} node`;
        }
        if (node.type === "location") {
          node.kind = node.kind || "generic";
        }
        if (node.type === "experiment" && !node.status) {
          node.status = "active";
        }
        if (node.locationId && !allIds.has(node.locationId)) {
          node.locationId = null;
        }
      });
    }

    function normalizeActiveWorkspaceSemantics() {
      if (currentWorkspaceKind === "collab") {
        normalizeProjectWorkspaceSemantics();
        return;
      }
      if (currentWorkspaceKind === "normal") {
        normalizeProjectWorkspaceSemantics();
        return;
      }
      normalizeProjectWorkspaceSemantics();
    }

    function hasMentionForCurrentUser(text) {
      const lower = String(text || "").toLowerCase();
      return lower.includes(CURRENT_USER_HANDLE.toLowerCase()) || lower.includes(`@${CURRENT_USER.toLowerCase()}`);
    }
    function buildNotifications() {
      const notifications = [];
      nodes.forEach((node) => {
        node.tasks.forEach((task) => {
          if (task.assignedTo === CURRENT_USER && !task.done && !state.seenTaskIds.has(task.id)) {
            notifications.push({
              id: `task:${task.id}`,
              kind: "task",
              nodeId: node.id,
              taskId: task.id,
              title: `Task: ${task.text}`,
              subtext: `${node.label} • assigned to ${task.assignedTo}`
            });
          }
        });

        node.comments.forEach((comment, commentIndex) => {
          if (!comment.isNew) return;
          const mention = hasMentionForCurrentUser(comment.text);
          const ownerUpdate = node.owner === CURRENT_USER;
          if (!mention && !ownerUpdate) return;

          notifications.push({
            id: `comment:${node.id}:${commentIndex}`,
            kind: "comment",
            nodeId: node.id,
            commentIndex,
            title: mention ? `Mention in ${node.label}` : `New comment on ${node.label}`,
            subtext: `${comment.author}: ${comment.text}`
          });
        });
      });
      return notifications;
    }

    function getFocusTargetForNode(node) {
      if (!node) return null;
      if (node.type === "location") {
        return node.id;
      }
      if (node.type === "experiment" && node.locationId) {
        const loc = getNodeById(node.locationId);
        if (!loc || loc.type !== "location") return null;
        if (getChildLocations(loc.id).length > 0) {
          return loc.id;
        }
        const parentMap = buildParentMap();
        return parentMap.get(loc.id) || loc.id;
      }
      return null;
    }

    function markNotificationSeen(notification) {
      if (notification.kind === "task") {
        state.seenTaskIds.add(notification.taskId);
      }

      if (notification.kind === "comment") {
        const node = getNodeById(notification.nodeId);
        if (node && node.comments[notification.commentIndex]) {
          node.comments[notification.commentIndex].isNew = false;
        }
      }

      const node = getNodeById(notification.nodeId);
      const focusTarget = getFocusTargetForNode(node);
      setFocusLocation(focusTarget);
      selectNode(notification.nodeId, { source: "notification" });
      state.notificationsOpen = false;
      renderNotifications();
    }

    function renderNotifications() {
      const notifications = buildNotifications();
      notifCountEl.textContent = String(notifications.length);
      notifCountEl.classList.toggle("zero", notifications.length === 0);
      notifBellEl.classList.toggle("active", state.notificationsOpen);
      notificationsPanelEl.classList.toggle("hidden", !state.notificationsOpen);

      notificationsPanelEl.innerHTML = "";
      if (!state.notificationsOpen) return;

      if (notifications.length === 0) {
        const emptyText = document.createElement("p");
        emptyText.className = "muted";
        emptyText.style.margin = "6px";
        emptyText.textContent = "No unread notifications.";
        notificationsPanelEl.appendChild(emptyText);
        return;
      }

      notifications.forEach((notification) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "notif-item";

        const title = document.createElement("p");
        title.className = "notif-title";
        title.textContent = notification.title;

        const sub = document.createElement("p");
        sub.className = "notif-sub";
        sub.textContent = notification.subtext;

        item.appendChild(title);
        item.appendChild(sub);
        item.addEventListener("click", () => markNotificationSeen(notification));
        notificationsPanelEl.appendChild(item);
      });
    }

    function createTypeBadge(type) {
      const badge = document.createElement("span");
      badge.className = `type-badge type-${type}`;
      badge.textContent = type;
      return badge;
    }

    function createStatusPill(status) {
      const pill = document.createElement("span");
      pill.className = `status-pill ${getStatusClass(status)}`;
      pill.textContent = status;
      return pill;
    }

    function createNodeRow(node, extraClasses = []) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "node-row";
      row.dataset.nodeId = node.id;

      if (node.id === state.selectedNodeId) {
        row.classList.add("selected");
      }
      extraClasses.forEach((className) => row.classList.add(className));

      row.appendChild(createTypeBadge(node.type));

      const main = document.createElement("span");
      main.className = "node-main";
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = node.label;
      const owner = document.createElement("span");
      owner.className = "owner-note";
      owner.textContent = `• ${node.owner}`;
      main.appendChild(label);
      main.appendChild(owner);
      row.appendChild(main);

      if (node.type === "experiment") {
        row.appendChild(createStatusPill(node.status));
      }

      row.addEventListener("click", () => selectNode(node.id));
      return row;
    }

    function renderLocationBranch(locationNode, parentMap, depth = 0) {
      const wrapper = document.createElement("div");
      wrapper.className = "location-group";
      if (depth > 0) {
        wrapper.classList.add("location-indent");
      }

      const rowWrap = document.createElement("div");
      rowWrap.className = "row-wrap";

      const expanded = state.expandedLocationIds.has(locationNode.id);
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "expand-btn";
      toggle.textContent = expanded ? "▾" : "▸";
      toggle.addEventListener("click", (event) => {
        event.stopPropagation();
        if (expanded) {
          state.expandedLocationIds.delete(locationNode.id);
        } else {
          state.expandedLocationIds.add(locationNode.id);
        }
        renderNodeLists();
      });

      rowWrap.appendChild(toggle);
      rowWrap.appendChild(createNodeRow(locationNode));
      wrapper.appendChild(rowWrap);

      if (expanded) {
        const active = getActiveExperimentsForLocation(locationNode.id);
        if (active.length === 0) {
          const emptyActive = document.createElement("p");
          emptyActive.className = "muted";
          emptyActive.style.margin = "4px 0 4px 34px";
          emptyActive.textContent = "No active experiments.";
          wrapper.appendChild(emptyActive);
        } else {
          const activeWrap = document.createElement("div");
          activeWrap.className = "location-indent";
          active.forEach((experimentNode) => activeWrap.appendChild(createNodeRow(experimentNode)));
          wrapper.appendChild(activeWrap);
        }

        const children = getChildLocations(locationNode.id)
          .sort((a, b) => a.label.localeCompare(b.label));
        children.forEach((childNode) => {
          wrapper.appendChild(renderLocationBranch(childNode, parentMap, depth + 1));
        });
      }

      return wrapper;
    }

    function renderNodeLists() {
      nodeListEl.innerHTML = "";
      byLocationBtn.classList.toggle("active", state.listMode === "by-location");
      allNodesBtn.classList.toggle("active", state.listMode === "all-nodes");

      const parentMap = buildParentMap();
      const hasLocationNodes = getLocationNodes().length > 0;
      if (state.listMode === "by-location" && hasLocationNodes) {
        const roots = getLocationNodes()
          .filter((locationNode) => !parentMap.has(locationNode.id))
          .sort((a, b) => a.label.localeCompare(b.label));
        roots.forEach((rootNode) => {
          nodeListEl.appendChild(renderLocationBranch(rootNode, parentMap));
        });
      } else {
        const sorted = [...nodes].sort((a, b) => {
          const typeDiff = TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type);
          if (typeDiff !== 0) return typeDiff;
          return a.label.localeCompare(b.label);
        });
        sorted.forEach((node) => nodeListEl.appendChild(createNodeRow(node)));
      }
    }
    function getExpandedLocationMetrics(locationNode) {
      const fallbackInnerWidth = clamp(
        EXPANDED_CARD_MIN_W - EXPANDED_CARD_HORIZONTAL_CHROME,
        EXPANDED_INNER_MIN_W,
        EXPANDED_INNER_MAX_W
      );
      const fallbackInnerHeight = clamp(
        EXPANDED_CARD_MIN_H - EXPANDED_CARD_VERTICAL_CHROME,
        EXPANDED_INNER_MIN_H,
        EXPANDED_INNER_MAX_H
      );
      const fallback = {
        children: [],
        normalizedChildren: [],
        innerWidthPx: fallbackInnerWidth,
        innerHeightPx: fallbackInnerHeight,
        cardWidthPx: EXPANDED_CARD_MIN_W,
        cardHeightPx: EXPANDED_CARD_MIN_H
      };
      if (!locationNode || locationNode.type !== "location") return fallback;

      const children = getDirectChildLocations(locationNode.id);
      if (!children.length) return fallback;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      children.forEach((childNode) => {
        const { x, y, w, h } = childNode.layout;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
      });

      if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
        return fallback;
      }

      const usedW = Math.max(1, maxX - minX);
      const usedH = Math.max(1, maxY - minY);
      const normalizedChildren = children
        .map((childNode) => {
          const { x, y, w, h } = childNode.layout;
          return {
            node: childNode,
            layout: {
              x: clamp(((x - minX) / usedW) * 100, 0, 100),
              y: clamp(((y - minY) / usedH) * 100, 0, 100),
              w: clamp((w / usedW) * 100, 0, 100),
              h: clamp((h / usedH) * 100, 0, 100)
            }
          };
        })
        .filter((item) => item.layout.w > 0 && item.layout.h > 0);

      if (!normalizedChildren.length) return fallback;

      const medianChildWPercent = Math.max(1, getMedian(normalizedChildren.map((item) => item.layout.w), 1));
      const medianChildHPercent = Math.max(1, getMedian(normalizedChildren.map((item) => item.layout.h), 1));

      const defaultInnerWidthPx = clamp(
        Math.ceil((EXPANDED_TARGET_CHILD_W * 100) / medianChildWPercent),
        EXPANDED_INNER_MIN_W,
        EXPANDED_INNER_MAX_W
      );
      const defaultInnerHeightPx = clamp(
        Math.ceil((EXPANDED_TARGET_CHILD_H * 100) / medianChildHPercent),
        EXPANDED_INNER_MIN_H,
        EXPANDED_INNER_MAX_H
      );
      const defaultCardW = clamp(
        defaultInnerWidthPx + EXPANDED_CARD_HORIZONTAL_CHROME,
        EXPANDED_CARD_MIN_W,
        EXPANDED_CARD_MAX_W
      );
      const defaultCardH = clamp(
        defaultInnerHeightPx + EXPANDED_CARD_VERTICAL_CHROME,
        EXPANDED_CARD_MIN_H,
        EXPANDED_CARD_MAX_H
      );

      // Backward-compat shim: migrate legacy expandedInnerWidthPx/expandedAspect to expandedW/H once.
      if (
        (!Number.isFinite(locationNode.expandedW) || locationNode.expandedW <= 0 ||
          !Number.isFinite(locationNode.expandedH) || locationNode.expandedH <= 0) &&
        Number.isFinite(locationNode.expandedInnerWidthPx) && locationNode.expandedInnerWidthPx > 0
      ) {
        const legacyAspect = clamp(
          Number.isFinite(locationNode.expandedAspect) && locationNode.expandedAspect > 0
            ? locationNode.expandedAspect
            : (defaultInnerWidthPx / Math.max(1, defaultInnerHeightPx)),
          MIN_EXPANDED_ASPECT,
          MAX_EXPANDED_ASPECT
        );
        const legacyInnerW = clamp(
          locationNode.expandedInnerWidthPx,
          EXPANDED_INNER_MIN_W,
          EXPANDED_INNER_MAX_W
        );
        let legacyInnerH = legacyInnerW / legacyAspect;
        if (legacyInnerH < EXPANDED_INNER_MIN_H) legacyInnerH = EXPANDED_INNER_MIN_H;
        if (legacyInnerH > EXPANDED_INNER_MAX_H) legacyInnerH = EXPANDED_INNER_MAX_H;
        locationNode.expandedW = clamp(
          legacyInnerW + EXPANDED_CARD_HORIZONTAL_CHROME,
          EXPANDED_CARD_MIN_W,
          EXPANDED_CARD_MAX_W
        );
        locationNode.expandedH = clamp(
          legacyInnerH + EXPANDED_CARD_VERTICAL_CHROME,
          EXPANDED_CARD_MIN_H,
          EXPANDED_CARD_MAX_H
        );
      }

      // First expansion initialization: content-aware defaults, persisted per location.
      if (!Number.isFinite(locationNode.expandedW) || locationNode.expandedW <= 0) {
        locationNode.expandedW = defaultCardW;
      }
      if (!Number.isFinite(locationNode.expandedH) || locationNode.expandedH <= 0) {
        locationNode.expandedH = defaultCardH;
      }

      const cardWidthPx = clamp(
        locationNode.expandedW,
        EXPANDED_CARD_MIN_W,
        EXPANDED_CARD_MAX_W
      );
      const cardHeightPx = clamp(
        locationNode.expandedH,
        EXPANDED_CARD_MIN_H,
        EXPANDED_CARD_MAX_H
      );
      locationNode.expandedW = cardWidthPx;
      locationNode.expandedH = cardHeightPx;

      let innerWidthPx = Math.max(EXPANDED_INNER_MIN_W, cardWidthPx - EXPANDED_CARD_HORIZONTAL_CHROME);
      let innerHeightPx = Math.max(EXPANDED_INNER_MIN_H, cardHeightPx - EXPANDED_CARD_VERTICAL_CHROME);
      if (Number.isFinite(EXPANDED_INNER_MAX_W)) {
        innerWidthPx = Math.min(innerWidthPx, EXPANDED_INNER_MAX_W);
      }
      if (Number.isFinite(EXPANDED_INNER_MAX_H)) {
        innerHeightPx = Math.min(innerHeightPx, EXPANDED_INNER_MAX_H);
      }

      return {
        children,
        normalizedChildren,
        innerWidthPx,
        innerHeightPx,
        cardWidthPx,
        cardHeightPx
      };
    }

    function getCardSize(node, expandedLocationId) {
      if (!node) {
        return { width: COLLAPSED_CARD_W, height: NODE_HEIGHT };
      }
      if (node.type === "location" && expandedLocationId === node.id) {
        const metrics = getExpandedLocationMetrics(node);
        return { width: metrics.cardWidthPx, height: metrics.cardHeightPx };
      }
      return {
        width: COLLAPSED_CARD_WIDTH_BY_TYPE[node.type] || COLLAPSED_CARD_W,
        height: COLLAPSED_CARD_HEIGHT_BY_TYPE[node.type] || NODE_HEIGHT
      };
    }

    function computeNodeFrame(node, expandedLocationId, layoutOverride = null) {
      const size = getCardSize(node, expandedLocationId);
      const centerX = node && node.graphPos ? node.graphPos.x : 100;
      const centerY = node && node.graphPos ? node.graphPos.y : 100;
      const x = layoutOverride ? layoutOverride.left : centerX - (size.width / 2);
      const y = layoutOverride ? layoutOverride.top : centerY - (size.height / 2);
      return {
        x,
        y,
        w: size.width,
        h: size.height
      };
    }

    function snapToGrid(value, gridStep) {
      return Math.round(value / gridStep) * gridStep;
    }

    function intersectsRect(a, b) {
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }

    function resolveCollisions(orderedPlacements, sizeById, canvasWidth, gridStep) {
      const placedRects = [];
      const result = new Map();

      orderedPlacements.forEach((placement) => {
        const size = sizeById.get(placement.id);
        if (!size) return;

        const maxX = Math.max(LAYOUT_MARGIN, canvasWidth - LAYOUT_MARGIN - size.width);
        let startX = snapToGrid(placement.columnX ?? placement.x, gridStep);
        startX = Math.min(Math.max(startX, LAYOUT_MARGIN), maxX);

        let x = snapToGrid(placement.x, gridStep);
        x = Math.min(Math.max(x, LAYOUT_MARGIN), maxX);
        let y = snapToGrid(placement.y, gridStep);

        let guard = 0;
        while (guard < 5000) {
          const candidate = {
            left: x,
            top: y,
            right: x + size.width,
            bottom: y + size.height
          };
          const collides = placedRects.some((placed) => intersectsRect(candidate, placed));
          if (!collides) {
            placedRects.push(candidate);
            result.set(placement.id, { left: x, top: y });
            break;
          }
          x += gridStep;
          if (x + size.width > canvasWidth - LAYOUT_MARGIN) {
            x = startX;
            y = snapToGrid(y + gridStep, gridStep);
          }
          guard += 1;
        }

        if (!result.has(placement.id)) {
          const fallback = {
            left: startX,
            top: y
          };
          placedRects.push({
            left: fallback.left,
            top: fallback.top,
            right: fallback.left + size.width,
            bottom: fallback.top + size.height
          });
          result.set(placement.id, fallback);
        }
      });

      return result;
    }

    function computeExpandedLayout(expandedLocationId, visibleNodeIds) {
      const expandedNode = getNodeById(expandedLocationId);
      if (!expandedNode || expandedNode.type !== "location") return new Map();

      const visibleSet = new Set(visibleNodeIds);
      const compareIds = (aId, bId) => {
        const aNode = getNodeById(aId);
        const bNode = getNodeById(bId);
        if (!aNode || !bNode) return String(aId).localeCompare(String(bId));
        const typeDiff = TYPE_ORDER.indexOf(aNode.type) - TYPE_ORDER.indexOf(bNode.type);
        if (typeDiff !== 0) return typeDiff;
        const labelDiff = aNode.label.localeCompare(bNode.label);
        if (labelDiff !== 0) return labelDiff;
        return aNode.id.localeCompare(bNode.id);
      };
      const sortIds = (ids) => [...ids].sort(compareIds);

      const parentMap = buildParentMap();
      const parentId = parentMap.get(expandedLocationId) || null;
      const lSize = getCardSize(expandedNode, expandedLocationId);
      const sizeById = new Map();
      visibleSet.forEach((id) => {
        const node = getNodeById(id);
        if (!node) return;
        sizeById.set(id, getCardSize(node, expandedLocationId));
      });

      const directNonLocation = expandedNode.linkedNodeIds.filter((id) => {
        const node = getNodeById(id);
        return !!node && visibleSet.has(node.id) && node.type !== "location";
      });

      const activeAtExpanded = nodes
        .filter((node) =>
          node.type === "experiment" &&
          node.status === "active" &&
          node.locationId === expandedLocationId &&
          visibleSet.has(node.id)
        )
        .map((node) => node.id);

      const col1Set = new Set([...directNonLocation, ...activeAtExpanded]);
      const col1Ids = sortIds(col1Set);

      const col2Set = new Set();
      col1Ids.forEach((seedId) => {
        const seedNode = getNodeById(seedId);
        if (!seedNode) return;
        seedNode.linkedNodeIds.forEach((neighborId) => {
          const neighborNode = getNodeById(neighborId);
          if (!neighborNode || !visibleSet.has(neighborNode.id)) return;
          if (neighborNode.type === "location") return;
          if (neighborNode.id === expandedLocationId || neighborNode.id === parentId) return;
          if (col1Set.has(neighborNode.id)) return;
          col2Set.add(neighborNode.id);
        });
      });
      const col2Ids = sortIds(col2Set);

      const assigned = new Set([expandedLocationId]);
      if (parentId && visibleSet.has(parentId)) assigned.add(parentId);
      col1Ids.forEach((id) => assigned.add(id));
      col2Ids.forEach((id) => assigned.add(id));
      const restIds = sortIds([...visibleSet].filter((id) => !assigned.has(id)));

      const anchorX = 360;
      const anchorY = 220;
      const col1X = anchorX + lSize.width + COL_GAP;
      const col2X = col1X + COLLAPSED_CARD_W + COL_GAP;
      const restX = col2X + COLLAPSED_CARD_W + COL_GAP;

      const orderedPlacements = [];
      orderedPlacements.push({
        id: expandedLocationId,
        x: anchorX,
        y: anchorY,
        columnX: anchorX
      });

      if (parentId && visibleSet.has(parentId)) {
        const pSize = sizeById.get(parentId) || getCardSize(getNodeById(parentId), expandedLocationId);
        const parentX = Math.max(LAYOUT_MARGIN, anchorX - COL_GAP - pSize.width);
        const parentY = anchorY + Math.max(0, Math.floor((lSize.height - pSize.height) / 2));
        orderedPlacements.push({
          id: parentId,
          x: parentX,
          y: parentY,
          columnX: parentX
        });
      }

      const appendColumn = (ids, columnX, startY) => {
        let cursorY = startY;
        ids.forEach((id) => {
          const size = sizeById.get(id);
          if (!size) return;
          orderedPlacements.push({
            id,
            x: columnX,
            y: cursorY,
            columnX
          });
          cursorY += size.height + ROW_GAP;
        });
      };

      appendColumn(col1Ids, col1X, anchorY);
      appendColumn(col2Ids, col2X, anchorY);
      appendColumn(restIds, restX, anchorY);

      return resolveCollisions(orderedPlacements, sizeById, CANVAS_WIDTH, GRID_STEP);
    }

    function createNodeCard(node, isSelected, layoutOverride = null) {
      const x = node.graphPos ? node.graphPos.x : 100;
      const y = node.graphPos ? node.graphPos.y : 100;
      const size = getCardSize(node, state.expandedCanvasLocationId);
      const left = layoutOverride ? layoutOverride.left : x - (size.width / 2);
      const top = layoutOverride ? layoutOverride.top : y - (size.height / 2);
      const isExpandedLocationCard = node.type === "location" && isLocationCardExpanded(node.id);

      const card = document.createElement("div");
      card.className = `node-card ${node.type}${isSelected ? " selected" : ""}`;
      if (isExpandedLocationCard) {
        card.classList.add("expanded");
      } else {
        card.classList.add("drag-anywhere");
      }
      card.style.width = `${size.width}px`;
      card.style.height = `${size.height}px`;
      card.style.left = `${left}px`;
      card.style.top = `${top}px`;
      card.dataset.nodeId = node.id;
      buildNodeCardContent(card, node);
      const dragHandle = card.querySelector(".node-drag-handle");
      if (isExpandedLocationCard && dragHandle) {
        dragHandle.addEventListener("mousedown", (event) => startNodeDrag(event, node.id, card));
      } else {
        card.addEventListener("mousedown", (event) => startNodeDrag(event, node.id, card));
      }
      card.addEventListener("click", (event) => {
        if (suppressClickNodeId === node.id) {
          suppressClickNodeId = null;
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (suppressClickNodeId) {
          suppressClickNodeId = null;
        }
        if (node.type === "location") {
          handleLocationCardClick(node.id);
          return;
        }
        resetLocationClickTracker();
        selectNode(node.id, { source: "graph" });
      });
      return card;
    }

    function isLocationCardExpanded(nodeId) {
      return state.expandedCanvasLocationId === nodeId;
    }

    function toggleExpandedByDoubleClick(nodeId) {
      const node = getNodeById(nodeId);
      if (!node || node.type !== "location") return;
      state.expandedCanvasLocationId = state.expandedCanvasLocationId === nodeId ? null : nodeId;
      resetLocationClickTracker();
      selectNode(nodeId, { source: "graph-dblclick-expand" });
    }

    function expandToNestedLocation(nodeId) {
      const node = getNodeById(nodeId);
      if (!node || node.type !== "location") return;
      state.expandedCanvasLocationId = nodeId;
      resetLocationClickTracker();
      selectNode(nodeId, { source: "graph-nested-dblclick-expand" });
    }

    function resetLocationClickTracker() {
      lastLocationClick = { nodeId: null, context: null, at: 0 };
    }

    function isLocationDoubleClick(nodeId, context) {
      const now = Date.now();
      const isDouble =
        lastLocationClick.nodeId === nodeId &&
        lastLocationClick.context === context &&
        now - lastLocationClick.at <= LOCATION_DOUBLE_CLICK_MS;
      lastLocationClick = { nodeId, context, at: now };
      return isDouble;
    }

    function handleLocationCardClick(nodeId) {
      if (isLocationDoubleClick(nodeId, "card")) {
        toggleExpandedByDoubleClick(nodeId);
        return;
      }
      selectNode(nodeId, { source: "graph" });
    }

    function handleNestedLocationClick(nodeId) {
      if (isLocationDoubleClick(nodeId, "nested")) {
        expandToNestedLocation(nodeId);
        return;
      }
      selectNode(nodeId, { source: "graph-child-location" });
    }

    function hasValidLayout(node) {
      if (!node || !node.layout) return false;
      const { x, y, w, h } = node.layout;
      return [x, y, w, h].every((value) => typeof value === "number" && Number.isFinite(value));
    }

    function getDirectChildLocations(locationId) {
      const parentLocationNode = getNodeById(locationId);
      if (!parentLocationNode || parentLocationNode.type !== "location") return [];
      return parentLocationNode.linkedNodeIds
        .map((id) => getNodeById(id))
        .filter((node) => node && node.type === "location")
        .filter((node) => hasValidLayout(node));
    }

    function computeVisibleSet(expandedLocationId) {
      const allNodeIds = new Set(nodes.map((node) => node.id));
      const absorbedLocationIds = new Set();

      if (!expandedLocationId) {
        return { visibleNodeIds: allNodeIds, absorbedLocationIds };
      }

      const expandedNode = getNodeById(expandedLocationId);
      if (!expandedNode || expandedNode.type !== "location") {
        return { visibleNodeIds: allNodeIds, absorbedLocationIds };
      }

      getLocationDescendants(expandedNode.id).forEach((desc) => absorbedLocationIds.add(desc.id));

      const parentMap = buildParentMap();
      const parentId = parentMap.get(expandedNode.id) || null;

      const visibleNodeIds = new Set([expandedNode.id]);
      if (parentId && getNodeById(parentId)) {
        visibleNodeIds.add(parentId);
      }

      const nonLocationSeedIds = new Set();

      expandedNode.linkedNodeIds.forEach((linkedId) => {
        const linkedNode = getNodeById(linkedId);
        if (!linkedNode || linkedNode.type === "location") return;
        visibleNodeIds.add(linkedNode.id);
        nonLocationSeedIds.add(linkedNode.id);
      });

      nodes
        .filter((node) => node.type === "experiment" && node.status === "active" && node.locationId === expandedNode.id)
        .forEach((experimentNode) => {
          visibleNodeIds.add(experimentNode.id);
          nonLocationSeedIds.add(experimentNode.id);
        });

      [...nonLocationSeedIds].forEach((seedId) => {
        const seedNode = getNodeById(seedId);
        if (!seedNode) return;
        seedNode.linkedNodeIds.forEach((neighborId) => {
          const neighborNode = getNodeById(neighborId);
          if (!neighborNode) return;
          if (neighborNode.type === "location") {
            if (neighborNode.id === expandedNode.id || neighborNode.id === parentId) {
              visibleNodeIds.add(neighborNode.id);
            }
            return;
          }
          visibleNodeIds.add(neighborNode.id);
        });
      });

      absorbedLocationIds.forEach((absorbedId) => visibleNodeIds.delete(absorbedId));
      return { visibleNodeIds, absorbedLocationIds };
    }

    function buildNodeCardContent(card, node) {
      if (node.type === "location") {
        buildLocationCardContent(card, node);
        return;
      }
      if (node.type === "experiment") {
        buildExperimentCardContent(card, node);
        return;
      }
      if (node.type === "protocol") {
        buildProtocolCardContent(card, node);
        return;
      }
      if (node.type === "portal") {
        buildPortalCardContent(card, node);
        return;
      }
      buildArtifactCardContent(card, node);
    }

    function buildLocationCardContent(card, node) {
      const expanded = isLocationCardExpanded(node.id);
      const header = document.createElement("div");
      header.className = "node-card-header node-drag-handle";

      const title = document.createElement("div");
      title.className = "node-card-label";
      title.textContent = node.label;

      const owner = document.createElement("div");
      owner.className = "node-card-owner";
      owner.textContent = node.owner;

      header.appendChild(title);
      card.appendChild(header);
      card.appendChild(owner);

      if (!expanded) return;

      const expandedMetrics = getExpandedLocationMetrics(node);
      const childContainer = document.createElement("div");
      childContainer.className = "node-children-container";
      childContainer.style.height = `${expandedMetrics.innerHeightPx}px`;

      if (!expandedMetrics.normalizedChildren.length) {
        const empty = document.createElement("p");
        empty.className = "node-children-empty";
        empty.textContent = "No child locations";
        childContainer.appendChild(empty);
      } else {
        expandedMetrics.normalizedChildren.forEach((item) => {
          const childNode = item.node;
          const childLayout = item.layout;
          const child = document.createElement("div");
          child.className = "node-child-loc";
          if (state.selectedNodeId === childNode.id) {
            child.classList.add("selected");
          }
          child.style.left = `${childLayout.x}%`;
          child.style.top = `${childLayout.y}%`;
          child.style.width = `${childLayout.w}%`;
          child.style.height = `${childLayout.h}%`;
          child.title = childNode.label;
          child.textContent = childNode.label;
          const activeExperiments = getActiveExperimentsForLocation(childNode.id);
          if (activeExperiments.length) {
            const childPixelWidth = (expandedMetrics.innerWidthPx * childLayout.w) / 100;
            const childPixelHeight = (expandedMetrics.innerHeightPx * childLayout.h) / 100;
            const markerSizePx = clamp(
              Math.round(Math.min(childPixelWidth, childPixelHeight) * 0.22),
              6,
              14
            );
            const markerLayer = document.createElement("div");
            markerLayer.className = "node-child-marker-layer";
            activeExperiments.slice(0, 4).forEach((experimentNode, index) => {
              const marker = document.createElement("button");
              marker.type = "button";
              marker.className = "node-child-exp-marker";
              marker.style.width = `${markerSizePx}px`;
              marker.style.height = `${markerSizePx}px`;
              if (state.selectedNodeId === experimentNode.id) {
                marker.classList.add("selected");
              }
              marker.style.marginRight = index === activeExperiments.length - 1 ? "0" : "1px";
              marker.title = `${experimentNode.label} (${experimentNode.status})`;
              marker.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                selectNode(experimentNode.id, { source: "graph-child-marker" });
              });
              markerLayer.appendChild(marker);
            });
            child.appendChild(markerLayer);
          }
          child.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            handleNestedLocationClick(childNode.id);
          });
          childContainer.appendChild(child);
        });
      }
      card.appendChild(childContainer);
      updateChildMarkerSizes(childContainer, expandedMetrics.innerWidthPx, expandedMetrics.innerHeightPx);

      const resizeHandle = document.createElement("button");
      resizeHandle.type = "button";
      resizeHandle.className = "node-resize-handle";
      resizeHandle.setAttribute("aria-label", "Resize location view");
      resizeHandle.title = "Resize";
      resizeHandle.style.width = `${RESIZE_HANDLE_SIZE}px`;
      resizeHandle.style.height = `${RESIZE_HANDLE_SIZE}px`;
      resizeHandle.addEventListener("mousedown", (event) => {
        startLocationResize(event, node.id, card, childContainer);
      });
      resizeHandle.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      resizeHandle.addEventListener("dblclick", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      card.appendChild(resizeHandle);
    }

    function buildExperimentCardContent(card, node) {
      const header = document.createElement("div");
      header.className = "node-card-header node-drag-handle";

      const title = document.createElement("div");
      title.className = "node-card-label";
      title.textContent = node.label;
      header.appendChild(title);

      const footer = document.createElement("div");
      footer.className = "node-card-footer";

      const owner = document.createElement("div");
      owner.className = "node-card-owner";
      owner.textContent = node.owner;

      const status = document.createElement("span");
      const statusValue = node.status || "unknown";
      status.className = `node-card-status ${getStatusClass(statusValue)}`.trim();
      status.textContent = statusValue;

      card.appendChild(header);
      footer.appendChild(owner);
      footer.appendChild(status);
      card.appendChild(footer);
    }

    function buildProtocolCardContent(card, node) {
      const header = document.createElement("div");
      header.className = "node-card-header node-drag-handle";

      const title = document.createElement("div");
      title.className = "node-card-label";
      title.textContent = node.label;
      header.appendChild(title);

      const footer = document.createElement("div");
      footer.className = "node-card-footer";

      const badge = document.createElement("span");
      badge.className = "node-card-type-badge";
      badge.textContent = getTypeShort(node.type);

      card.appendChild(header);
      footer.appendChild(badge);
      card.appendChild(footer);
    }

    function buildPortalCardContent(card, node) {
      const icon = document.createElement("div");
      icon.className = "node-portal-icon";
      icon.textContent = "↗";

      const kind = document.createElement("div");
      kind.className = "node-portal-kind";
      kind.textContent = "Project";

      const name = document.createElement("div");
      name.className = "node-portal-name";
      name.textContent = node.label.replace(/^Project:\s*/i, "");

      card.appendChild(icon);
      card.appendChild(kind);
      card.appendChild(name);
    }

    function buildArtifactCardContent(card, node) {
      const header = document.createElement("div");
      header.className = "node-card-header node-drag-handle";

      const title = document.createElement("div");
      title.className = "node-card-label";
      title.textContent = node.label;
      header.appendChild(title);

      const footer = document.createElement("div");
      footer.className = "node-card-footer";

      const owner = document.createElement("div");
      owner.className = "node-card-owner";
      owner.textContent = node.owner;
      footer.appendChild(owner);

      if (node.status) {
        const status = document.createElement("span");
        status.className = `node-card-status ${getStatusClass(node.status)}`.trim();
        status.textContent = node.status;
        footer.appendChild(status);
      } else {
        const badge = document.createElement("span");
        badge.className = "node-card-type-badge";
        badge.textContent = getTypeShort(node.type);
        footer.appendChild(badge);
      }

      card.appendChild(header);
      card.appendChild(footer);
    }

    function createSvgElement(tag, attrs = {}) {
      const el = document.createElementNS(SVG_NS, tag);
      Object.entries(attrs).forEach(([key, value]) => {
        el.setAttribute(key, String(value));
      });
      return el;
    }

    function setEdgeHoverState(visibleEdgeEl, chevronEl, sourceId, targetId, isHover) {
      if (visibleEdgeEl) {
        visibleEdgeEl.classList.toggle("edge-line--hover", isHover);
      }
      if (chevronEl) {
        chevronEl.classList.toggle("edge-chevron--hover", isHover);
      }
      const sourceCard = lastRenderedCardsById.get(sourceId);
      const targetCard = lastRenderedCardsById.get(targetId);
      if (sourceCard) sourceCard.classList.toggle("node-card-edge-hover", isHover);
      if (targetCard) targetCard.classList.toggle("node-card-edge-hover", isHover);
    }

    function getBorderPointToward(frame, targetX, targetY) {
      const cx = frame.x + (frame.w / 2);
      const cy = frame.y + (frame.h / 2);
      const hw = frame.w / 2;
      const hh = frame.h / 2;
      const dx = targetX - cx;
      const dy = targetY - cy;

      if (dx === 0 && dy === 0) {
        return { x: cx, y: cy };
      }

      const sx = dx === 0 ? Number.POSITIVE_INFINITY : hw / Math.abs(dx);
      const sy = dy === 0 ? Number.POSITIVE_INFINITY : hh / Math.abs(dy);
      const t = Math.min(sx, sy);

      return {
        x: cx + (dx * t),
        y: cy + (dy * t)
      };
    }

    function clampEdge(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function getQuadraticControlPoint(x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt((dx * dx) + (dy * dy));
      const off = len < 180 ? 0 : clampEdge((len - 180) * 0.03, 0, 14);
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const nx = len > 0 ? (-dy / len) : 0;
      const ny = len > 0 ? (dx / len) : 0;
      return {
        cx: mx + (nx * off),
        cy: my + (ny * off),
        len
      };
    }

    function getQuadraticPointAndTangentAt(x1, y1, cx, cy, x2, y2, t = 0.5) {
      const mt = 1 - t;
      const px = (mt * mt * x1) + (2 * mt * t * cx) + (t * t * x2);
      const py = (mt * mt * y1) + (2 * mt * t * cy) + (t * t * y2);
      const tx = (2 * mt * (cx - x1)) + (2 * t * (x2 - cx));
      const ty = (2 * mt * (cy - y1)) + (2 * t * (y2 - cy));
      return { px, py, tx, ty };
    }

    function drawEdgesFromModel() {
      if (!edgesLayerEl) return;
      if (!lastVisibleNodeFrames || lastVisibleNodeFrames.size === 0) {
        edgesLayerEl.innerHTML = "";
        return;
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      lastVisibleNodeFrames.forEach((frame) => {
        minX = Math.min(minX, frame.x);
        minY = Math.min(minY, frame.y);
        maxX = Math.max(maxX, frame.x + frame.w);
        maxY = Math.max(maxY, frame.y + frame.h);
      });

      if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
        edgesLayerEl.innerHTML = "";
        return;
      }

      const vx = minX - EDGE_PAD;
      const vy = minY - EDGE_PAD;
      const vw = Math.max(1, (maxX - minX) + (2 * EDGE_PAD));
      const vh = Math.max(1, (maxY - minY) + (2 * EDGE_PAD));

      edgesLayerEl.innerHTML = "";
      edgesLayerEl.setAttribute("viewBox", `${vx} ${vy} ${vw} ${vh}`);
      edgesLayerEl.setAttribute("preserveAspectRatio", "none");
      edgesLayerEl.setAttribute("width", String(vw));
      edgesLayerEl.setAttribute("height", String(vh));
      edgesLayerEl.style.left = `${vx}px`;
      edgesLayerEl.style.top = `${vy}px`;
      edgesLayerEl.style.width = `${vw}px`;
      edgesLayerEl.style.height = `${vh}px`;

      nodes.forEach((sourceNode) => {
        if (!lastVisibleNodeIds.has(sourceNode.id)) return;
        const sourceFrame = lastVisibleNodeFrames.get(sourceNode.id);
        if (!sourceFrame) return;
        const ax = sourceFrame.x + (sourceFrame.w / 2);
        const ay = sourceFrame.y + (sourceFrame.h / 2);

        sourceNode.linkedNodeIds.forEach((targetId) => {
          if (targetId === sourceNode.id) return;
          if (!lastVisibleNodeIds.has(targetId)) return;
          const targetFrame = lastVisibleNodeFrames.get(targetId);
          if (!targetFrame) return;
          const bx = targetFrame.x + (targetFrame.w / 2);
          const by = targetFrame.y + (targetFrame.h / 2);
          const borderA = getBorderPointToward(sourceFrame, bx, by);
          const borderB = getBorderPointToward(targetFrame, ax, ay);
          const { cx, cy } = getQuadraticControlPoint(borderA.x, borderA.y, borderB.x, borderB.y);
          const curveD = `M ${borderA.x} ${borderA.y} Q ${cx} ${cy} ${borderB.x} ${borderB.y}`;
          const visibleEdge = createSvgElement("path", {
            class: "edge-line",
            d: curveD
          });
          edgesLayerEl.appendChild(visibleEdge);

          const midpoint = getQuadraticPointAndTangentAt(borderA.x, borderA.y, cx, cy, borderB.x, borderB.y, 0.5);
          const angleDeg = Math.atan2(midpoint.ty, midpoint.tx) * (180 / Math.PI);
          const chevron = createSvgElement("path", {
            class: "edge-chevron",
            d: "M -4 -3 L 0 0 L -4 3",
            transform: `translate(${midpoint.px} ${midpoint.py}) rotate(${angleDeg})`
          });
          edgesLayerEl.appendChild(chevron);

          const hitEdge = createSvgElement("path", {
            class: "edge-hit",
            d: curveD
          });
          const handleEdgeEnter = () => setEdgeHoverState(visibleEdge, chevron, sourceNode.id, targetId, true);
          const handleEdgeLeave = () => setEdgeHoverState(visibleEdge, chevron, sourceNode.id, targetId, false);
          hitEdge.addEventListener("pointerenter", handleEdgeEnter);
          hitEdge.addEventListener("pointerleave", handleEdgeLeave);
          hitEdge.addEventListener("mouseenter", handleEdgeEnter);
          hitEdge.addEventListener("mouseleave", handleEdgeLeave);
          edgesLayerEl.appendChild(hitEdge);
        });
      });
    }

    function renderGraphEdges(plane) {
      void plane;
      drawEdgesFromModel();
    }

    function getOrCreateLensLayer() {
      if (!worldEl) return null;
      let lensLayer = worldEl.querySelector("#lens-layer");
      if (lensLayer) return lensLayer;
      lensLayer = document.createElement("div");
      lensLayer.id = "lens-layer";
      worldEl.appendChild(lensLayer);
      return lensLayer;
    }

    function renderLenses() {
      if (!worldEl) return;
      const lensLayer = getOrCreateLensLayer();
      if (!lensLayer) return;
      lensLayer.innerHTML = "";

      const lensEntries = [...state.openLenses.entries()]
        .filter(([, frame]) =>
          frame &&
          Number.isFinite(frame.x) &&
          Number.isFinite(frame.y) &&
          Number.isFinite(frame.w) &&
          Number.isFinite(frame.h))
        .sort(([aId], [bId]) => {
          const aNode = getNodeById(aId);
          const bNode = getNodeById(bId);
          const aLabel = aNode ? aNode.label : aId;
          const bLabel = bNode ? bNode.label : bId;
          const labelDiff = aLabel.localeCompare(bLabel);
          if (labelDiff !== 0) return labelDiff;
          return aId.localeCompare(bId);
        });

      const stopLensEvent = (event) => {
        event.stopPropagation();
      };

      lensEntries.forEach(([locationId, frame]) => {
        const locationNode = getNodeById(locationId);
        const card = document.createElement("article");
        card.className = "lens-card";
        card.style.left = `${frame.x}px`;
        card.style.top = `${frame.y}px`;
        card.style.width = `${frame.w}px`;
        card.style.height = `${frame.h}px`;
        card.dataset.locationId = locationId;
        card.addEventListener("mousedown", stopLensEvent);
        card.addEventListener("click", stopLensEvent);

        const header = document.createElement("div");
        header.className = "lens-card-header";
        header.addEventListener("mousedown", stopLensEvent);
        header.addEventListener("click", stopLensEvent);

        const title = document.createElement("div");
        title.className = "lens-card-title";
        title.textContent = `Location view: ${locationNode ? locationNode.label : locationId}`;

        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "lens-card-close";
        closeBtn.setAttribute("aria-label", "Close location view");
        closeBtn.textContent = "×";
        closeBtn.addEventListener("mousedown", (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
        closeBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          state.openLenses.delete(locationId);
          renderLenses();
        });

        const body = document.createElement("div");
        body.className = "lens-card-body";
        body.textContent = "map goes here";

        header.appendChild(title);
        header.appendChild(closeBtn);
        card.appendChild(header);
        card.appendChild(body);
        lensLayer.appendChild(card);
      });
    }

    function renderGlobalGraph() {
      const { visibleNodeIds } = computeVisibleSet(state.expandedCanvasLocationId);
      const expandedLocationId =
        state.expandedCanvasLocationId && visibleNodeIds.has(state.expandedCanvasLocationId)
          ? state.expandedCanvasLocationId
          : null;
      const layoutById = expandedLocationId
        ? computeExpandedLayout(expandedLocationId, visibleNodeIds)
        : new Map();

      if (expandedLocationId) {
        if (state.expandedDragRootId !== expandedLocationId) {
          state.expandedDragRootId = expandedLocationId;
          state.expandedDragOverrides = new Map();
        } else {
          state.expandedDragOverrides.forEach((position, nodeId) => {
            if (visibleNodeIds.has(nodeId)) {
              layoutById.set(nodeId, { left: position.left, top: position.top });
            }
          });
        }
      } else {
        state.expandedDragRootId = null;
        state.expandedDragOverrides = new Map();
      }

      let planeHeight = CANVAS_HEIGHT;
      if (expandedLocationId) {
        let maxBottom = 0;
        visibleNodeIds.forEach((nodeId) => {
          const node = getNodeById(nodeId);
          const pos = layoutById.get(nodeId);
          if (!node || !pos) return;
          const size = getCardSize(node, expandedLocationId);
          maxBottom = Math.max(maxBottom, pos.top + size.height);
        });
        planeHeight = Math.max(CANVAS_HEIGHT, maxBottom + LAYOUT_MARGIN);
      }

      if (worldEl) {
        worldEl.style.width = `${CANVAS_WIDTH}px`;
        worldEl.style.height = `${planeHeight}px`;
      }

      const existingPlane = worldEl ? worldEl.querySelector(".canvas-plane") : null;
      if (existingPlane) existingPlane.remove();

      const plane = document.createElement("div");
      plane.className = "canvas-plane";
      plane.style.width = `${CANVAS_WIDTH}px`;
      plane.style.height = `${planeHeight}px`;

      const selectedNode = getSelectedNode();
      const visibleNodeFrames = new Map();
      const renderedCardsById = new Map();
      nodes.forEach((node) => {
        if (!visibleNodeIds.has(node.id)) return;
        const overridePos = expandedLocationId ? layoutById.get(node.id) || null : null;
        visibleNodeFrames.set(node.id, computeNodeFrame(node, expandedLocationId, overridePos));
        const card = createNodeCard(node, !!selectedNode && selectedNode.id === node.id, overridePos);
        plane.appendChild(card);
        renderedCardsById.set(node.id, card);
      });
      lastVisibleNodeIds = new Set(visibleNodeIds);
      lastVisibleNodeFrames = visibleNodeFrames;
      lastRenderedCardsById = renderedCardsById;

      if (worldEl) worldEl.appendChild(plane);
      renderLenses();
      requestRender({ edges: true });
    }

    function renderFocusedLocation(locationId) {
      void locationId;
      renderGlobalGraph();
    }

    function renderCanvas() {
      // Step 5.2 keeps a single global view while focus/semantic zoom is paused.
      state.focusLocationId = null;
      renderGlobalGraph();
    }

    function renderBreadcrumb() {
      focusBreadcrumbEl.innerHTML = "";
      const current = document.createElement("span");
      current.className = "crumb-current";
      current.textContent = "Graph";
      focusBreadcrumbEl.appendChild(current);
      focusBackBtn.disabled = true;
    }

    function setFocusLocation(locationIdOrNull) {
      void locationIdOrNull;
      state.focusLocationId = null;
      renderAll();
    }

    function expandLocationAncestors(locationId) {
      const parentMap = buildParentMap();
      let cursor = locationId;
      while (cursor) {
        state.expandedLocationIds.add(cursor);
        cursor = parentMap.get(cursor) || null;
      }
    }

    function selectNode(nodeId, options = {}) {
      const node = getNodeById(nodeId);
      if (!node) return;
      state.selectedNodeId = nodeId;

      if (node.type === "location") {
        expandLocationAncestors(node.id);
      } else if (node.type === "experiment" && node.locationId) {
        expandLocationAncestors(node.locationId);
      }

      if (node.type === "location") {
        const expandedRoot = state.expandedCanvasLocationId;
        if (expandedRoot && expandedRoot !== node.id) {
          const expandedDescendants = getLocationDescendants(expandedRoot);
          const selectedIsChildOfExpanded = expandedDescendants.some((child) => child.id === node.id);
          if (!selectedIsChildOfExpanded) {
            state.expandedCanvasLocationId = null;
          }
        }
      }

      renderAll();

      const selectedRow = document.querySelector(`.node-row.selected[data-node-id="${nodeId}"]`);
      if (selectedRow) {
        selectedRow.scrollIntoView({ block: "nearest" });
      }
    }

    function getAssigneeOptions() {
      const owners = [...new Set(nodes.map((node) => node.owner))];
      if (!owners.includes(CURRENT_USER)) owners.push(CURRENT_USER);
      return owners.sort((a, b) => a.localeCompare(b));
    }

    function appendMetaRow(metaGrid, key, valueNodeOrText) {
      const keyEl = document.createElement("div");
      keyEl.className = "meta-key";
      keyEl.textContent = key;
      metaGrid.appendChild(keyEl);

      const valueEl = document.createElement("div");
      if (typeof valueNodeOrText === "string") {
        valueEl.textContent = valueNodeOrText;
      } else {
        valueEl.appendChild(valueNodeOrText);
      }
      metaGrid.appendChild(valueEl);
    }
    function renderDetailsPane() {
      detailsPaneEl.innerHTML = "";
      const selectedNode = getSelectedNode();
      if (!selectedNode) {
        const placeholder = document.createElement("p");
        placeholder.className = "muted";
        placeholder.textContent = "Select a node from the list or canvas to inspect details.";
        detailsPaneEl.appendChild(placeholder);
        return;
      }

      const title = document.createElement("h3");
      title.className = "details-title";
      title.textContent = selectedNode.label;
      detailsPaneEl.appendChild(title);

      const metaGrid = document.createElement("div");
      metaGrid.className = "meta-grid";
      appendMetaRow(metaGrid, "Type", selectedNode.type);
      appendMetaRow(metaGrid, "Owner", selectedNode.owner);

      if (selectedNode.type === "location") {
        appendMetaRow(metaGrid, "Kind", selectedNode.kind || "generic");
        const parentMap = buildParentMap();
        const parentId = parentMap.get(selectedNode.id) || null;
        if (parentId) {
          const parentNode = getNodeById(parentId);
          if (parentNode) {
            const parentBtn = document.createElement("button");
            parentBtn.type = "button";
            parentBtn.className = "inline-link";
            parentBtn.textContent = parentNode.label;
            parentBtn.addEventListener("click", () => selectNode(parentNode.id));
            appendMetaRow(metaGrid, "Parent location", parentBtn);
          } else {
            appendMetaRow(metaGrid, "Parent location", "Top-level location");
          }
        } else {
          appendMetaRow(metaGrid, "Parent location", "Top-level location");
        }
      } else {
        appendMetaRow(metaGrid, "Status", selectedNode.type === "experiment" ? selectedNode.status : "N/A");
      }

      if (selectedNode.type === "experiment") {
        if (selectedNode.locationId) {
          const loc = getNodeById(selectedNode.locationId);
          if (loc) {
            const locBtn = document.createElement("button");
            locBtn.type = "button";
            locBtn.className = "inline-link";
            locBtn.textContent = loc.label;
            locBtn.addEventListener("click", () => selectNode(loc.id));
            appendMetaRow(metaGrid, "Location", locBtn);
          } else {
            appendMetaRow(metaGrid, "Location", "N/A");
          }
        } else {
          appendMetaRow(metaGrid, "Location", "N/A");
        }
      }

      detailsPaneEl.appendChild(metaGrid);

      const summary = document.createElement("p");
      summary.className = "summary-box";
      summary.textContent = selectedNode.summary;
      detailsPaneEl.appendChild(summary);

      if (selectedNode.type === "location") {
        const childTitle = document.createElement("h4");
        childTitle.className = "section-title";
        childTitle.textContent = "Child locations";
        detailsPaneEl.appendChild(childTitle);

        const childWrap = document.createElement("div");
        childWrap.className = "chip-list";
        const children = getChildLocations(selectedNode.id);
        if (!children.length) {
          const none = document.createElement("p");
          none.className = "muted";
          none.textContent = "No child locations.";
          detailsPaneEl.appendChild(none);
        } else {
          children.forEach((childNode) => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "chip-btn";
            chip.textContent = `${childNode.label} (${childNode.kind || "generic"})`;
            chip.addEventListener("click", () => selectNode(childNode.id));
            childWrap.appendChild(chip);
          });
          detailsPaneEl.appendChild(childWrap);
        }

        const pinned = getPinnedNonLocationLinks(selectedNode);
        const pinnedTitle = document.createElement("h4");
        pinnedTitle.className = "section-title";
        pinnedTitle.textContent = "Directly connected nodes";
        detailsPaneEl.appendChild(pinnedTitle);

        const pinnedWrap = document.createElement("div");
        pinnedWrap.className = "chip-list";
        if (!pinned.length) {
          const none = document.createElement("p");
          none.className = "muted";
          none.textContent = "No direct non-location links.";
          detailsPaneEl.appendChild(none);
        } else {
          pinned.forEach((node) => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "chip-btn";
            chip.textContent = `${node.label} (${node.type})`;
            chip.addEventListener("click", () => selectNode(node.id));
            pinnedWrap.appendChild(chip);
          });
          detailsPaneEl.appendChild(pinnedWrap);
        }

      } else {
        const linksTitle = document.createElement("h4");
        linksTitle.className = "section-title";
        linksTitle.textContent = "Linked nodes";
        detailsPaneEl.appendChild(linksTitle);

        const linksWrap = document.createElement("div");
        linksWrap.className = "chip-list";
        const linkedNodes = selectedNode.linkedNodeIds.map((id) => getNodeById(id)).filter(Boolean);
        if (!linkedNodes.length) {
          const noneText = document.createElement("p");
          noneText.className = "muted";
          noneText.textContent = "No semantic links.";
          detailsPaneEl.appendChild(noneText);
        } else {
          linkedNodes.forEach((node) => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "chip-btn";
            chip.textContent = `${node.label} (${node.type})`;
            chip.addEventListener("click", () => selectNode(node.id));
            linksWrap.appendChild(chip);
          });
          detailsPaneEl.appendChild(linksWrap);
        }
      }

      const tasksTitle = document.createElement("h4");
      tasksTitle.className = "section-title";
      tasksTitle.textContent = "Tasks";
      detailsPaneEl.appendChild(tasksTitle);

      const tasksList = document.createElement("div");
      tasksList.className = "tasks-list";
      if (!selectedNode.tasks.length) {
        const emptyTasks = document.createElement("p");
        emptyTasks.className = "muted";
        emptyTasks.textContent = "No tasks yet.";
        tasksList.appendChild(emptyTasks);
      } else {
        selectedNode.tasks.forEach((task) => {
          const row = document.createElement("label");
          row.className = `task-row${task.done ? " done" : ""}`;

          const check = document.createElement("input");
          check.type = "checkbox";
          check.checked = !!task.done;
          check.addEventListener("change", () => {
            task.done = check.checked;
            if (!task.done && task.assignedTo === CURRENT_USER) {
              state.seenTaskIds.delete(task.id);
            }
            renderDetailsPane();
            renderNotifications();
          });

          const textWrap = document.createElement("div");
          textWrap.style.flex = "1";
          const taskText = document.createElement("p");
          taskText.className = "task-text";
          taskText.textContent = task.text;
          const assignee = document.createElement("div");
          assignee.className = "task-assignee";
          assignee.textContent = `Assigned: ${task.assignedTo}`;
          textWrap.appendChild(taskText);
          textWrap.appendChild(assignee);

          row.appendChild(check);
          row.appendChild(textWrap);
          tasksList.appendChild(row);
        });
      }
      detailsPaneEl.appendChild(tasksList);

      const taskForm = document.createElement("form");
      taskForm.className = "task-form";
      const taskInput = document.createElement("input");
      taskInput.type = "text";
      taskInput.placeholder = "Task description";
      taskInput.maxLength = 180;

      const assigneeSelect = document.createElement("select");
      getAssigneeOptions().forEach((ownerName) => {
        const option = document.createElement("option");
        option.value = ownerName;
        option.textContent = ownerName;
        assigneeSelect.appendChild(option);
      });

      const taskSubmit = document.createElement("button");
      taskSubmit.type = "submit";
      taskSubmit.textContent = "Add task";

      taskForm.appendChild(taskInput);
      taskForm.appendChild(assigneeSelect);
      taskForm.appendChild(taskSubmit);
      taskForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const text = taskInput.value.trim();
        if (!text) return;
        const newTask = {
          id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          text,
          done: false,
          assignedTo: assigneeSelect.value
        };
        selectedNode.tasks.push(newTask);
        if (newTask.assignedTo === CURRENT_USER) {
          state.seenTaskIds.delete(newTask.id);
        }
        taskInput.value = "";
        renderDetailsPane();
        renderNotifications();
      });
      detailsPaneEl.appendChild(taskForm);

      const commentsTitle = document.createElement("h4");
      commentsTitle.className = "section-title";
      commentsTitle.textContent = "Comments";
      detailsPaneEl.appendChild(commentsTitle);

      const commentList = document.createElement("div");
      commentList.className = "comment-list";
      const orderedComments = [...selectedNode.comments].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      if (!orderedComments.length) {
        const noComments = document.createElement("p");
        noComments.className = "muted";
        noComments.textContent = "No comments yet.";
        commentList.appendChild(noComments);
      } else {
        orderedComments.forEach((comment) => {
          const item = document.createElement("div");
          item.className = `comment-item${comment.isNew ? " is-new" : ""}`;

          const head = document.createElement("div");
          head.className = "comment-head";
          const author = document.createElement("span");
          author.textContent = comment.author;
          const time = document.createElement("span");
          time.textContent = new Date(comment.timestamp).toLocaleString();
          head.appendChild(author);
          head.appendChild(time);

          const text = document.createElement("p");
          text.className = "comment-text";
          text.textContent = comment.text;

          item.appendChild(head);
          item.appendChild(text);
          commentList.appendChild(item);
        });
      }
      detailsPaneEl.appendChild(commentList);

      const commentForm = document.createElement("form");
      commentForm.className = "comment-form";
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Add a comment (mentions like @Hannah supported)";
      input.maxLength = 400;
      const submit = document.createElement("button");
      submit.type = "submit";
      submit.textContent = "Add comment";
      commentForm.appendChild(input);
      commentForm.appendChild(submit);
      commentForm.addEventListener("submit", (event) => {
        event.preventDefault();
        addCommentToSelectedNode(input.value);
        input.value = "";
      });
      detailsPaneEl.appendChild(commentForm);
    }

    function addCommentToSelectedNode(text) {
      const message = text.trim();
      if (!message) return;
      const selectedNode = getSelectedNode();
      if (!selectedNode) return;

      selectedNode.comments.push({
        author: CURRENT_USER,
        text: message,
        timestamp: new Date().toISOString(),
        isNew: true
      });

      renderDetailsPane();
      renderNotifications();
    }

    function renderWorkspace(workspaceId) {
      const targetWorkspaceId = workspaceId || currentWorkspaceId;
      if (!hasAppliedWorkspace || appliedWorkspaceId !== targetWorkspaceId) {
        applyWorkspaceData(targetWorkspaceId, { sanitizeState: true });
        normalizeActiveWorkspaceSemantics();
        initializeGraphLayoutIfMissing();
        const visibleNodeIds = getVisibleNodeIdsForGlobalView();
        if (visibleNodeIds && visibleNodeIds.size) {
          fitCameraToNodes(visibleNodeIds, 80);
        }
        appliedWorkspaceId = currentWorkspaceId;
        hasAppliedWorkspace = true;
        resetLocationClickTracker();
      }
      renderNodeLists();
      renderBreadcrumb();
      renderCanvas();
      renderDetailsPane();
      renderNotifications();
      renderLayoutControls();
    }

    function renderAll() {
      renderWorkspace(currentWorkspaceId);
      renderWorkspaceMenu();
    }

    function renderLoadingState() {
      if (nodeListEl) {
        nodeListEl.innerHTML = "";
        const loadingMessage = document.createElement("div");
        loadingMessage.className = "node-list-empty";
        loadingMessage.textContent = "Loading…";
        nodeListEl.appendChild(loadingMessage);
      }
      if (detailsPaneEl) {
        detailsPaneEl.innerHTML = "";
        const detailsLoading = document.createElement("p");
        detailsLoading.className = "muted";
        detailsLoading.textContent = "Loading…";
        detailsPaneEl.appendChild(detailsLoading);
      }
    }

    async function bootApp() {
      renderPanelState();
      renderLoadingState();

      try {
        const initialData = await loadInitialData();
        const initialStore = buildStore(initialData);
        initializeRuntimeDataFromStore(initialStore);
      } catch (error) {
        console.error("Failed to initialize app store from initial data.", error);
        initializeRuntimeDataFromStore(buildStore({}));
      }

      renderAll();
    }

    void bootApp();
