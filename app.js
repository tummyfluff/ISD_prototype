import {
  TYPE_ORDER,
  PROCESS_STATUSES,
  HANDOVER_STATUSES,
  HANDOVER_COLLABORATOR_EDITABLE_STATUSES,
  normalizeWorkspaceKind,
  normalizeNodeType,
  normalizeProcessStatus,
  normalizeHandoverStatus,
  getNextProcessStatus,
  normalizeEntityKind,
  isSelectableNode,
  canInlineEditNodeTitle,
  isCircularNodeType,
  isDiamondNodeType,
  getStatusClass,
  getTypeShort,
  getTypeSortIndex,
  compareNodesStable
} from "./modules/nodeNormalization.js";
import { createRecordsAndLabels } from "./modules/recordsAndLabels.js";

const d3 = window.d3;
if (!window.d3 || !window.d3.forceSimulation) {
  console.error("D3 force not loaded");
}

const CURRENT_USER = "Dr Hannah Lewis";
const CURRENT_USER_HANDLE = "@Hannah";
const HANDOVER_OBJECT_ROLES = ["context", "input", "output", "reference"];
const HANDOVER_OBJECT_ROLE_LABELS = {
  context: "Context",
  input: "Input",
  output: "Output",
  reference: "Reference"
};
const HANDOVER_OBJECT_EDGE_KIND_BY_ROLE = {
  context: "handover_context",
  input: "handover_input",
  output: "handover_output",
  reference: "handover_reference"
};

// type NodeType =
//   "location" | "process" | "standard" | "portal" | "handover"
// type Task = {
//   id: string,
//   text: string,
//   done: boolean,
//   assignedTo: string,
//   taskGroupId?: string,
//   originNodeId?: string,
//   linkedObjectIds?: string[]
// }
// type Comment = { author: string, text: string, timestamp: string, isNew: boolean }
// type Node = {
//   id: string,
//   title: string,
//   label: string, // runtime alias from title for UI compatibility
//   type: NodeType,
//   ownerId: string,
//   owner: string, // runtime alias resolved from users
//   sharedWithIds?: string[],
//   handoverCollaborators?: Array<{ kind: "user" | "org", refId: string, shareWorkspace: boolean }>,
//   handoverNodeIds?: string[],
//   handoverObjects?: Array<{ id: string, role: "context" | "input" | "output" | "reference" }>,
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

    const SVG_NS = "http://www.w3.org/2000/svg";
    const CANVAS_WIDTH = 1320;
    const CANVAS_HEIGHT = 760;
    const NODE_WIDTH = 172;
    const NODE_HEIGHT = 56;
    const GRID_STEP = 20;
    const LAYOUT_MARGIN = 24;
    const COL_GAP = 40;
    const ROW_GAP = 16;
    const GRAPH_NODE_TEXT_INSET_PX = 14;
    const PORTAL_LABEL_GAP_PX = 8;
    const PORTAL_LABEL_FONT_SIZE_PX = 11;
    const PORTAL_LABEL_FONT_WEIGHT = 600;
    const PORTAL_LABEL_LINE_HEIGHT_PX = 14;
    const ANCHOR_NODE_DIAMETER_PX = 138;
    const ENTITY_LABEL_FONT_SIZE_PX = 12;
    const ENTITY_LABEL_FONT_WEIGHT = 700;
    const ENTITY_LABEL_LINE_HEIGHT_PX = 14;
    const ENTITY_DIAMOND_MIN_WIDTH_PX = 168;
    const ENTITY_DIAMOND_MAX_WIDTH_PX = 240;
    const ENTITY_DIAMOND_HEIGHT_PX = 112;
    const ENTITY_DIAMOND_TEXT_WIDTH_RATIO = 0.62;
    const ENTITY_DIAMOND_TEXT_WIDTH_FUDGE_PX = 12;
    const PORTAL_GRAPH_POS_SCHEMA_VERSION = 2;
    const LEGACY_PORTAL_GRAPH_POS_Y_OFFSET_PX = 12;
    const COLLAPSED_CARD_W = 172;
    const COLLAPSED_CARD_WIDTH_BY_TYPE = {
      location: 172,
      process: 172,
      standard: 188,
      handover: 206,
      portal: 92,
      entity: ENTITY_DIAMOND_MIN_WIDTH_PX,
      collaboration: 184
    };
    const COLLAPSED_CARD_HEIGHT_BY_TYPE = {
      location: 72,
      process: 72,
      standard: 64,
      handover: 72,
      portal: 92,
      entity: ENTITY_DIAMOND_HEIGHT_PX,
      collaboration: 184
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
      process: 350,
      standard: 700,
      handover: 1050,
      portal: 1400,
      entity: 1750,
      collaboration: 2100
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
    const STORE_API_ENDPOINT = "/api/store";
    const ADMIN_USER_ID = "user-admin";
    const ADMIN_USER_NAME = "Admin";
    const LEGACY_ENTITY_LINK_BY_NODE_ID = Object.freeze({
      org_evans_lab: { entityKind: "org", entityRefId: "org-evans-lab" },
      org_genomics_core: { entityKind: "org", entityRefId: "org-genomics-core" },
      person_alex: { entityKind: "user", entityRefId: "user-alex-patel" },
      person_hannah: { entityKind: "user", entityRefId: "user-hannah-lewis" },
      person_evan: { entityKind: "user", entityRefId: "user-evans" }
    });
    const LEGACY_HANDOVER_COLLABORATOR_BY_TARGET_ID = Object.freeze({
      portal_genomics_core: { kind: "org", refId: "org-genomics-core" }
    });
    const REQUIRED_ORG_RECORDS = Object.freeze([]);
    const HANDOVER_PROJECTION_META_KEY = "handoverProjection";
    const HANDOVER_PROJECTION_WORKSPACE_NODE_IDS_KEY = "handoverProjectionNodeIds";
    const HANDOVER_PROJECTION_WORKSPACE_EDGE_IDS_KEY = "handoverProjectionEdgeIds";

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
      const response = await fetch(STORE_API_ENDPOINT, {
        method: "GET",
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error(`Failed to load canonical store: ${response.status} ${response.statusText}`);
      }
      return await response.json();
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
    let bootErrorMessage = "";
    let persistErrorMessage = "";
    let persistStoreRequestChain = Promise.resolve();
    let persistStatusBannerEl = null;
    let appliedWorkspaceId = null;
    let hasAppliedWorkspace = false;
    let workspaceMenuOpen = false;
    let userMenuOpen = false;
    let isCreatingWorkspace = false;
  let workspaceDraftName = "";
  let workspaceRenameId = null;
  let workspaceRenameDraft = "";
  let createNodeMenuOpen = false;
  let createNodeMenuMode = "create";
  let createNodeMenuNodeId = null;
  let createNodeMenuClientX = 0;
  let createNodeMenuClientY = 0;
  let createNodeMenuWorldX = 0;
  let createNodeMenuWorldY = 0;
  let newNodeInlineEditId = null;
  let suppressNextWorkspaceAutoFit = false;
  let portalLinkModalState = {
    open: false,
    nodeId: null,
    selectedWorkspaceId: "",
    flow: "edit"
  };
  let entityLinkModalState = {
    open: false,
    nodeId: null,
    selectedEntityKind: "user",
    selectedEntityRefId: "",
    flow: "edit"
  };
  let detailsTitleEditNodeId = null;
  let detailsTitleDraft = "";
  let detailsSummaryEditNodeId = null;
  let detailsSummaryDraft = "";
  let collaboratorPickerModalState = {
    open: false,
    nodeId: null,
    selectedCollaboratorKeys: []
  };
  let handoverObjectPickerModalState = {
    open: false,
    nodeId: null,
    selectedNodeIds: [],
    selectedRole: "reference"
  };
  let adminOrgModalState = {
    open: false,
    draftName: "",
    renameOrgId: null,
    renameDraft: ""
  };
  let adminUserModalState = {
    open: false,
    selectedOrgId: "",
    draftName: "",
    renameUserId: null,
    renameDraft: ""
  };
  let confirmationModalState = {
    open: false,
    title: "",
    message: "",
    confirmLabel: "Delete",
    confirmTone: "delete",
    onConfirm: null
  };
  let detailsTaskComposerState = {
    nodeId: null,
    text: "",
    assignedTo: "",
    linkedObjectIds: [],
    slashRange: null
  };
  let detailsTaskEditState = {
    nodeId: null,
    taskId: null,
    text: "",
    assignedTo: "",
    linkedObjectIds: [],
    slashRange: null
  };

const {
  getWorkspaceRecordById,
  getWorkspaceOptionById,
  getCurrentUserRecord,
  getCurrentUserOrgId,
  getCurrentUserName,
  getSortedUsersForMenu,
  getSortedOrgsForMenu,
  getOrgDisplayName,
  getUserDisplayNameWithOrg,
  getOwnerDisplayName,
  isNodeOwnedByCurrentUser,
  getCurrentUserTaskAssignmentLabels,
  isTaskAssignedToCurrentUser,
  getCurrentUserCommentAuthorLabels,
  getNodeDisplayTitle,
  getLegacyEntityLinkForNode,
  getEntityLinkRecord,
  getEntityDisplayName,
  getEntityLabelFallback,
  applyDerivedEntityIdentity,
  normalizeEntityLinkFieldsForNode,
  getEntityOptionsForKind,
  getInitialEntitySelectionForNode,
  getNodeTitleFallback,
  compareNodesByDisplayLabel,
  getWorkspaceOptionsForCurrentUser,
  getLinkableWorkspaceOptionsForCurrentUser,
  getPortalLinkedWorkspaceName
} = createRecordsAndLabels({
  CURRENT_USER,
  ADMIN_USER_ID,
  legacyEntityLinkByNodeId: LEGACY_ENTITY_LINK_BY_NODE_ID,
  getUsers: () => users,
  getOrgs: () => orgs,
  getWorkspaceOptions: () => workspaceOptions,
  getSharedWorkspaceOptionsForUser: (userId) => getSharedWorkspaceOptionsForUser(userId),
  getUserById: () => userById,
  getOrgById: () => orgById,
  getWorkspaceById: () => workspaceById,
  getAllNodesRuntime: () => allNodesRuntime,
  getCurrentUserId: () => currentUserId,
  getCurrentWorkspaceId: () => currentWorkspaceId
});

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
      const seededOrgRecords = seedRequiredOrgRecordsInStore(store);
      const seededUserRecords = seedRequiredUserRecordsInStore(store);

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

      let migratedNodeData = false;
      const defaultNodeSummary = "Click to enter node description";
      allNodesRuntime = Array.from(store.nodesById.values())
        .map((node) => {
          const normalizedType = normalizeNodeType(node.type);
          const runtimeNode = {
            ...node,
            type: normalizedType,
            title: typeof node.title === "string" ? node.title : "",
            label: typeof node.title === "string" ? node.title : "",
            status: normalizedType === "process"
              ? normalizeProcessStatus(node.status)
              : (normalizedType === "handover"
                ? normalizeHandoverStatus(node.status)
                : node.status),
            linkedWorkspaceId:
              normalizedType === "portal" && typeof node.linkedWorkspaceId === "string" && node.linkedWorkspaceId
                ? node.linkedWorkspaceId
                : null,
            owner: (node.ownerId && userById.get(node.ownerId)
              ? userById.get(node.ownerId).name
              : (typeof node.meta?.deletedOwnerLabel === "string" && node.meta.deletedOwnerLabel.trim()
                ? node.meta.deletedOwnerLabel.trim()
                : (node.ownerId || "Unknown"))),
            summary: typeof node.summary === "string" && node.summary.trim()
              ? node.summary
              : defaultNodeSummary,
            tasks: Array.isArray(node.tasks) ? node.tasks.map((task) => normalizeTaskRecord(task)) : [],
            comments: Array.isArray(node.comments) ? node.comments.map((comment) => ({ ...comment })) : [],
            locationId: Object.prototype.hasOwnProperty.call(node, "locationId") ? node.locationId : null
          };
          if (normalizedType === "entity") {
            runtimeNode.entityKind = normalizeEntityKind(node.entityKind);
            runtimeNode.entityRefId = typeof node.entityRefId === "string" && node.entityRefId ? node.entityRefId : null;
            if (normalizeEntityLinkFieldsForNode(runtimeNode)) {
              migratedNodeData = true;
            }
          }
          if (normalizedType === "handover") {
            runtimeNode.handoverCollaborators = Array.isArray(node.handoverCollaborators)
              ? node.handoverCollaborators.map((collaborator) => ({ ...collaborator }))
              : [];
            runtimeNode.handoverObjects = Array.isArray(node.handoverObjects)
              ? node.handoverObjects.map((handoverObject) => ({ ...handoverObject }))
              : [];
            runtimeNode.handoverNodeIds = Array.isArray(node.handoverNodeIds)
              ? node.handoverNodeIds.filter((linkedNodeId) => typeof linkedNodeId === "string")
              : [];
          }
          if (normalizedType === "collaboration") {
            if (runtimeNode.title || runtimeNode.label || node.type !== normalizedType) {
              migratedNodeData = true;
            }
            runtimeNode.title = "";
            runtimeNode.label = "";
          } else if (node.type !== normalizedType) {
            migratedNodeData = true;
          }
          return runtimeNode;
        });
      allNodesRuntime.forEach((node) => {
        if (node.type === "handover" && normalizeHandoverFieldsForNode(node)) {
          migratedNodeData = true;
        }
      });
      allEdgesRuntime = Array.from(store.edgesById.values())
        .map((edge) => ({ ...edge }));
      workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));
      if (migrateHandoverProjectionModel()) {
        migratedNodeData = true;
      }
      allNodesRuntime.forEach((node) => {
        if (node.type === "handover" && applyDefaultContextObjectToHandover(node)) {
          migratedNodeData = true;
        }
      });
      if (refreshAllHandoverDerivedState()) {
        migratedNodeData = true;
      }
      if (seededOrgRecords || seededUserRecords || migratedNodeData) {
        syncUsersRuntimeAndStore();
        syncNodeRuntimeAndStore();
        syncEdgeRuntimeAndStore();
        syncWorkspaceRuntimeAndStore();
        persistStoreToLocalStorage();
      }
      reconcileLegacyPortalGraphPositions();

      if (userById.has("user-hannah-lewis")) {
        currentUserId = "user-hannah-lewis";
      } else if (users.length) {
        currentUserId = users[0].id;
      } else {
        currentUserId = null;
      }
      const initialWorkspaceOptions = getWorkspaceOptionsForCurrentUser();
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
let currentProjectionNodeMetaById = new Map();
let currentProjectionEdgeMetaById = new Map();
let edgeRuntimeCounter = 0;
let portalLabelMeasureContext = null;
let portalLabelWidthCache = new Map();
let entityLabelWidthCache = new Map();
let hasWarnedPortalBodyFrameMismatch = false;

function inferEdgeKindForPair(sourceNode, targetNode) {
  if (!sourceNode || !targetNode) return "link";
  if (sourceNode.type === "location" && targetNode.type === "location") return "location_contains";
  if (sourceNode.type === "location" && targetNode.type === "standard") return "location_standard";
  if (sourceNode.type === "location" && targetNode.type === "process") return "location_process";
  if (sourceNode.type === "standard" && targetNode.type === "process") return "standard_process";
  if (sourceNode.type === "portal" && targetNode.type === "standard") return "portal_standard";
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

function resetCurrentProjectionViewState() {
  currentProjectionNodeMetaById = new Map();
  currentProjectionEdgeMetaById = new Map();
}

function getCurrentProjectionNodeMeta(nodeId) {
  return nodeId ? currentProjectionNodeMetaById.get(nodeId) || null : null;
}

function getCurrentProjectionEdgeMeta(edgeId) {
  return edgeId ? currentProjectionEdgeMetaById.get(edgeId) || null : null;
}

function mergeProjectionNodeMeta(nodeId, patch) {
  if (!nodeId || !patch || typeof patch !== "object") return;
  const currentMeta = currentProjectionNodeMetaById.get(nodeId) || {
    roles: [],
    handoverIds: [],
    objectNodeIds: [],
    collaboratorKinds: [],
    collaboratorRefIds: []
  };
  const nextMeta = { ...currentMeta };
  Object.entries(patch).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      nextMeta[key] = [...new Set([...(Array.isArray(currentMeta[key]) ? currentMeta[key] : []), ...value])];
      return;
    }
    if (value !== undefined) {
      nextMeta[key] = value;
    }
  });
  currentProjectionNodeMetaById.set(nodeId, nextMeta);
}

function setProjectionEdgeMeta(edgeId, meta) {
  if (!edgeId || !meta || typeof meta !== "object") return;
  currentProjectionEdgeMetaById.set(edgeId, { ...meta });
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

function getHandoverCollaboratorSignature(kind, refId) {
  const normalizedKind = normalizeEntityKind(kind);
  return normalizedKind && refId ? `${normalizedKind}:${refId}` : "";
}

function normalizeHandoverCollaboratorEntry(rawCollaborator) {
  if (!rawCollaborator || typeof rawCollaborator !== "object") return null;
  const kind = normalizeEntityKind(rawCollaborator.kind || rawCollaborator.entityKind);
  const refId = typeof rawCollaborator.refId === "string" && rawCollaborator.refId
    ? rawCollaborator.refId
    : (typeof rawCollaborator.entityRefId === "string" && rawCollaborator.entityRefId ? rawCollaborator.entityRefId : "");
  if (!kind || !refId) return null;
  if (kind === "user" && !userById.has(refId)) return null;
  if (kind === "org" && !orgById.has(refId)) return null;
  return {
    kind,
    refId,
    shareWorkspace: !!rawCollaborator.shareWorkspace
  };
}

function getLegacyHandoverCollaboratorForTargetId(targetId) {
  if (typeof targetId !== "string" || !targetId) return null;
  if (userById.has(targetId)) {
    return { kind: "user", refId: targetId, shareWorkspace: false };
  }
  if (orgById.has(targetId)) {
    return { kind: "org", refId: targetId, shareWorkspace: false };
  }
  if (Object.prototype.hasOwnProperty.call(LEGACY_ENTITY_LINK_BY_NODE_ID, targetId)) {
    const legacyEntity = LEGACY_ENTITY_LINK_BY_NODE_ID[targetId];
    return {
      kind: legacyEntity.entityKind,
      refId: legacyEntity.entityRefId,
      shareWorkspace: false
    };
  }
  if (Object.prototype.hasOwnProperty.call(LEGACY_HANDOVER_COLLABORATOR_BY_TARGET_ID, targetId)) {
    const legacyCollaborator = LEGACY_HANDOVER_COLLABORATOR_BY_TARGET_ID[targetId];
    return {
      kind: legacyCollaborator.kind,
      refId: legacyCollaborator.refId,
      shareWorkspace: false
    };
  }
  const targetNode = allNodesRuntime.find((candidateNode) => candidateNode.id === targetId) || null;
  if (targetNode?.type === "entity") {
    const collaborator = normalizeHandoverCollaboratorEntry({
      kind: targetNode.entityKind,
      refId: targetNode.entityRefId,
      shareWorkspace: false
    });
    if (collaborator) return collaborator;
  }
  return null;
}

function normalizeHandoverCollaboratorsForNode(node) {
  if (!node || node.type !== "handover") return false;
  const nextCollaborators = [];
  const seenCollaborators = new Set();
  const rawCollaborators = Array.isArray(node.handoverCollaborators) ? node.handoverCollaborators : [];
  rawCollaborators.forEach((rawCollaborator) => {
    const normalizedCollaborator = normalizeHandoverCollaboratorEntry(rawCollaborator);
    if (!normalizedCollaborator) return;
    const signature = getHandoverCollaboratorSignature(normalizedCollaborator.kind, normalizedCollaborator.refId);
    if (!signature || seenCollaborators.has(signature)) return;
    seenCollaborators.add(signature);
    nextCollaborators.push(normalizedCollaborator);
  });
  const legacyTargetId = typeof node.meta?.to === "string" ? node.meta.to : "";
  const legacyCollaborator = getLegacyHandoverCollaboratorForTargetId(legacyTargetId);
  if (legacyCollaborator) {
    const legacySignature = getHandoverCollaboratorSignature(legacyCollaborator.kind, legacyCollaborator.refId);
    if (legacySignature && !seenCollaborators.has(legacySignature)) {
      seenCollaborators.add(legacySignature);
      nextCollaborators.push(legacyCollaborator);
    }
  }
  const currentCollaborators = Array.isArray(node.handoverCollaborators) ? node.handoverCollaborators : [];
  const changed = JSON.stringify(currentCollaborators) !== JSON.stringify(nextCollaborators);
  node.handoverCollaborators = nextCollaborators;
  return changed;
}

function normalizeHandoverFieldsForNode(node) {
  if (!node || node.type !== "handover") return false;
  let changed = false;
  const nextStatus = normalizeHandoverStatus(node.status);
  if (node.status !== nextStatus) {
    node.status = nextStatus;
    changed = true;
  }
  if (node.locationId !== null) {
    node.locationId = null;
    changed = true;
  }
  const rawHandoverObjects = Array.isArray(node.handoverObjects)
    ? node.handoverObjects
    : (
      Array.isArray(node.handoverNodeIds)
        ? node.handoverNodeIds.map((handoverObjectId) => ({ id: handoverObjectId, role: "reference" }))
        : []
    );
  const seenObjectIds = new Set();
  const nextHandoverObjects = rawHandoverObjects
    .map((handoverObject) => {
      if (typeof handoverObject === "string") {
        return {
          id: handoverObject,
          role: "reference"
        };
      }
      if (!handoverObject || typeof handoverObject !== "object") return null;
      return {
        id: typeof handoverObject.id === "string" ? handoverObject.id : "",
        role: normalizeHandoverObjectRole(handoverObject.role)
      };
    })
    .filter((handoverObject) => {
      if (!handoverObject?.id || handoverObject.id === node.id || seenObjectIds.has(handoverObject.id)) {
        return false;
      }
      seenObjectIds.add(handoverObject.id);
      return true;
    });
  let seenContextObject = false;
  const normalizedHandoverObjects = nextHandoverObjects.map((handoverObject) => {
    if (handoverObject.role !== "context") return handoverObject;
    if (!seenContextObject) {
      seenContextObject = true;
      return handoverObject;
    }
    changed = true;
    return {
      ...handoverObject,
      role: "reference"
    };
  });
  if (JSON.stringify(Array.isArray(node.handoverObjects) ? node.handoverObjects : []) !== JSON.stringify(normalizedHandoverObjects)) {
    node.handoverObjects = normalizedHandoverObjects;
    changed = true;
  } else if (!Array.isArray(node.handoverObjects)) {
    node.handoverObjects = normalizedHandoverObjects;
    changed = true;
  }
  if (normalizeHandoverCollaboratorsForNode(node)) {
    changed = true;
  }
  if (isCollabWorkspaceOnlyHandover(node)) {
    const currentCollaborators = Array.isArray(node.handoverCollaborators) ? node.handoverCollaborators : [];
    const nextCollaborators = currentCollaborators.map((collaborator) => {
      if (!collaborator?.shareWorkspace) return collaborator;
      changed = true;
      return {
        ...collaborator,
        shareWorkspace: false
      };
    });
    node.handoverCollaborators = nextCollaborators;
  }
  return changed;
}

function normalizeHandoverObjectRole(role) {
  return HANDOVER_OBJECT_ROLES.includes(role) ? role : "reference";
}

function getCurrentWorkspaceRecord() {
  if (!currentWorkspaceId) return null;
  return workspaceById.get(currentWorkspaceId) || null;
}

function isWorkspaceAnchorNode(node, workspaceRecord = getCurrentWorkspaceRecord()) {
  if (!node || !workspaceRecord) return false;
  if (normalizeWorkspaceKind(workspaceRecord.kind) === "collab") return false;
  return workspaceRecord.homeNodeId === node.id;
}

function isRenderedCircularNode(node, workspaceRecord = getCurrentWorkspaceRecord()) {
  return isCircularNodeType(node) || isWorkspaceAnchorNode(node, workspaceRecord);
}

function getAnchorNodeDisplayLabel(node) {
  if (!node) return "";
  return getNodeDisplayTitle(node, { fallback: getNodeTitleFallback(node) });
}

function isValidHandoverObjectNodeForRole(node, role = "reference") {
  const normalizedRole = normalizeHandoverObjectRole(role);
  if (normalizedRole === "context") {
    return !!node && isSelectableNode(node) && node.type !== "collaboration";
  }
  return !!node && isSelectableNode(node) && node.type !== "portal" && node.type !== "entity" && node.type !== "collaboration";
}

function getDefaultContextObjectIdForHandover(node) {
  if (!node || node.type !== "handover") return null;
  const sourceWorkspaceId = getSourceWorkspaceIdForHandover(node);
  if (!sourceWorkspaceId) return null;
  const sourceWorkspace = workspaceById.get(sourceWorkspaceId) || null;
  if (!sourceWorkspace || normalizeWorkspaceKind(sourceWorkspace.kind) === "collab") return null;
  const anchorId = typeof sourceWorkspace.homeNodeId === "string" && sourceWorkspace.homeNodeId ? sourceWorkspace.homeNodeId : null;
  if (!anchorId || anchorId === node.id) return null;
  const anchorNode = getAnyNodeById(anchorId);
  return isValidHandoverObjectNodeForRole(anchorNode, "context") ? anchorId : null;
}

function applyDefaultContextObjectToHandover(node) {
  if (!node || node.type !== "handover") return false;
  const currentObjects = getHandoverObjects(node);
  if (currentObjects.some((handoverObject) => handoverObject.role === "context")) {
    return false;
  }
  const defaultContextId = getDefaultContextObjectIdForHandover(node);
  if (!defaultContextId) return false;
  if (currentObjects.some((handoverObject) => handoverObject.id === defaultContextId)) {
    node.handoverObjects = currentObjects.map((handoverObject) => ({
      ...handoverObject,
      role: handoverObject.id === defaultContextId ? "context" : handoverObject.role
    }));
    return true;
  }
  node.handoverObjects = [
    {
      id: defaultContextId,
      role: "context"
    },
    ...currentObjects
  ];
  return true;
}

function getCurrentHandoverContextObject(node) {
  if (!node || node.type !== "handover") return null;
  return getHandoverObjects(node).find((handoverObject) => handoverObject.role === "context") || null;
}

function getCurrentHandoverContextNode(node) {
  const contextObject = getCurrentHandoverContextObject(node);
  return contextObject ? getAnyNodeById(contextObject.id) || null : null;
}

function getNodeDetailsHeaderContextNode(node) {
  if (!node) return null;
  if (node.type === "handover") {
    const explicitContextNode = getCurrentHandoverContextNode(node);
    if (explicitContextNode) return explicitContextNode;
  }
  const sourceWorkspace = getCanonicalSourceWorkspaceForNode(node);
  if (!sourceWorkspace) return null;
  const anchorId = typeof sourceWorkspace.homeNodeId === "string" && sourceWorkspace.homeNodeId
    ? sourceWorkspace.homeNodeId
    : null;
  if (!anchorId || anchorId === node.id) return null;
  return getAnyNodeById(anchorId) || null;
}

function getNodeDetailsHeaderContextLabel(node) {
  const contextNode = getNodeDetailsHeaderContextNode(node);
  if (!contextNode) return "";
  return getNodeDisplayTitle(contextNode, { fallback: getNodeTitleFallback(contextNode) });
}

function getNodeOwnerShortLabel(node) {
  if (!node) return "";
  const ownerRecord = node.ownerId ? userById.get(node.ownerId) || null : null;
  if (ownerRecord?.orgId) {
    return getOrgDisplayName(ownerRecord.orgId) || ownerRecord.name || node.owner || node.ownerId || "";
  }
  return ownerRecord?.name || node.owner || node.ownerId || "";
}

function getHandoverObjectEdgeKind(role) {
  return HANDOVER_OBJECT_EDGE_KIND_BY_ROLE[normalizeHandoverObjectRole(role)] || HANDOVER_OBJECT_EDGE_KIND_BY_ROLE.reference;
}

function getDefaultHandoverObjectEdgeDirection(role) {
  const normalizedRole = normalizeHandoverObjectRole(role);
  if (normalizedRole === "input" || normalizedRole === "context") {
    return "object_to_handover";
  }
  return "handover_to_object";
}

function getResolvedHandoverCollaborators(node) {
  if (!node || node.type !== "handover") return [];
  const rawCollaborators = Array.isArray(node.handoverCollaborators) ? node.handoverCollaborators : [];
  const resolvedCollaborators = [];
  rawCollaborators.forEach((rawCollaborator) => {
    const normalizedCollaborator = normalizeHandoverCollaboratorEntry(rawCollaborator);
    if (!normalizedCollaborator) return;
    const label = normalizedCollaborator.kind === "user"
      ? getUserDisplayNameWithOrg(normalizedCollaborator.refId)
      : getOrgDisplayName(normalizedCollaborator.refId);
    if (!label) return;
    resolvedCollaborators.push({
      ...normalizedCollaborator,
      label
    });
  });
  return resolvedCollaborators;
}

function isCurrentUserRepresentedByHandoverCollaborator(collaborator) {
  if (!collaborator) return false;
  if (collaborator.kind === "user") {
    return !!currentUserId && collaborator.refId === currentUserId;
  }
  if (collaborator.kind === "org") {
    return !!getCurrentUserOrgId() && collaborator.refId === getCurrentUserOrgId();
  }
  return false;
}

function isCurrentUserHandoverCollaborator(node) {
  return getResolvedHandoverCollaborators(node).some((collaborator) => isCurrentUserRepresentedByHandoverCollaborator(collaborator));
}

function getEditableHandoverStatusesForCurrentUser(node) {
  if (!node || node.type !== "handover") return [];
  if (isNodeOwnedByCurrentUser(node)) return [...HANDOVER_STATUSES];
  if (!isCurrentUserHandoverCollaborator(node)) return [];
  return [...HANDOVER_COLLABORATOR_EDITABLE_STATUSES];
}

function getNodeStatusValue(node) {
  if (!node) return "";
  if (node.type === "process") return normalizeProcessStatus(node.status);
  if (node.type === "handover") return normalizeHandoverStatus(node.status);
  return typeof node.status === "string" ? node.status : "";
}

function getStatusOptionsForNode(node) {
  if (!node) return [];
  if (node.type === "process") return [...PROCESS_STATUSES];
  if (node.type === "handover") return getEditableHandoverStatusesForCurrentUser(node);
  return [];
}

function seedRequiredOrgRecordsInStore(targetStore) {
  if (!targetStore) return false;
  const nextOrgMap = targetStore.orgsById instanceof Map
    ? new Map(targetStore.orgsById)
    : new Map(extractEntityArray(targetStore, "orgs").map((orgRecord) => [orgRecord.id, { ...orgRecord }]));
  let changed = false;
  REQUIRED_ORG_RECORDS.forEach((orgRecord) => {
    if (nextOrgMap.has(orgRecord.id)) return;
    nextOrgMap.set(orgRecord.id, { ...orgRecord });
    changed = true;
  });
  if (!changed) return false;
  const nextOrgs = Array.from(nextOrgMap.values());
  targetStore.orgs = nextOrgs.map((orgRecord) => ({ ...orgRecord }));
  targetStore.orgsById = new Map(nextOrgs.map((orgRecord) => [orgRecord.id, { ...orgRecord }]));
  return true;
}

function seedRequiredUserRecordsInStore(targetStore) {
  if (!targetStore) return false;
  const nextUserMap = targetStore.usersById instanceof Map
    ? new Map(targetStore.usersById)
    : new Map(extractEntityArray(targetStore, "users").map((userRecord) => [userRecord.id, { ...userRecord }]));
  if (!nextUserMap.has(ADMIN_USER_ID)) {
    nextUserMap.set(ADMIN_USER_ID, {
      id: ADMIN_USER_ID,
      name: ADMIN_USER_NAME,
      orgId: null
    });
  }
  const nextAdminRecord = nextUserMap.get(ADMIN_USER_ID);
  let changed = false;
  if (!nextAdminRecord || nextAdminRecord.name !== ADMIN_USER_NAME || nextAdminRecord.orgId !== null) {
    nextUserMap.set(ADMIN_USER_ID, {
      id: ADMIN_USER_ID,
      name: ADMIN_USER_NAME,
      orgId: null
    });
    changed = true;
  } else if (!targetStore.usersById?.has?.(ADMIN_USER_ID)) {
    changed = true;
  }
  if (!changed) return false;
  const nextUsers = Array.from(nextUserMap.values());
  targetStore.users = nextUsers.map((userRecord) => ({ ...userRecord }));
  targetStore.usersById = new Map(nextUsers.map((userRecord) => [userRecord.id, { ...userRecord }]));
  return true;
}

function getDirectlyLinkedNodeIds(nodeId) {
  if (!nodeId) return [];
  const seenIds = new Set();
  const linkedIds = [];
  getOutgoingEdges(nodeId).forEach((edge) => {
    if (edge.targetId && !seenIds.has(edge.targetId)) {
      seenIds.add(edge.targetId);
      linkedIds.push(edge.targetId);
    }
  });
  getIncomingEdges(nodeId).forEach((edge) => {
    if (edge.sourceId && !seenIds.has(edge.sourceId)) {
      seenIds.add(edge.sourceId);
      linkedIds.push(edge.sourceId);
    }
  });
  return linkedIds;
}

function getAnyNodeById(nodeId) {
  return allNodesRuntime.find((node) => node.id === nodeId) || null;
}

function getHandoverObjects(node) {
  if (!node || node.type !== "handover") return [];
  return (Array.isArray(node.handoverObjects) ? node.handoverObjects : [])
    .map((handoverObject) => ({
      id: typeof handoverObject?.id === "string" ? handoverObject.id : "",
      role: normalizeHandoverObjectRole(handoverObject?.role)
    }))
    .filter((handoverObject) => {
      if (!handoverObject.id || handoverObject.id === node.id) return false;
      const candidateNode = getAnyNodeById(handoverObject.id);
      return isValidHandoverObjectNodeForRole(candidateNode, handoverObject.role);
    });
}

function getHandoverObjectsByRole(node) {
  const groupedObjects = {
    context: [],
    input: [],
    output: [],
    reference: []
  };
  getHandoverObjects(node).forEach((handoverObject) => {
    groupedObjects[handoverObject.role].push(handoverObject);
  });
  return groupedObjects;
}

function getHandoverObjectCandidates(node) {
  if (!node || node.type !== "handover") return [];
  const resolvedObjects = getHandoverObjects(node);
  const seenIds = new Set();
  return resolvedObjects
    .filter((handoverObject) => handoverObject.id && !seenIds.has(handoverObject.id) && seenIds.add(handoverObject.id))
    .map((handoverObject) => {
      const candidateNode = getAnyNodeById(handoverObject.id);
      return candidateNode ? { node: candidateNode, role: handoverObject.role } : null;
    })
    .filter(Boolean)
    .sort((left, right) => compareNodesByDisplayLabel(left.node, right.node));
}

function getHandoverObjectPickerOptions(node, role = "reference") {
  if (!node || node.type !== "handover") return [];
  const visibleObjectIds = new Set(getHandoverObjects(node).map((handoverObject) => handoverObject.id));
  return nodes
    .filter((candidateNode) =>
      candidateNode.id !== node.id &&
      !visibleObjectIds.has(candidateNode.id) &&
      isValidHandoverObjectNodeForRole(candidateNode, role)
    )
    .sort(compareNodesByDisplayLabel);
}

function addHandoverObject(nodeId, objectId, role = "reference") {
  const node = getNodeById(nodeId);
  if (!node || node.type !== "handover" || !isNodeOwnedByCurrentUser(node)) return false;
  const candidateNode = getAnyNodeById(objectId);
  const normalizedRole = normalizeHandoverObjectRole(role);
  if (!isValidHandoverObjectNodeForRole(candidateNode, normalizedRole) || objectId === node.id) return false;
  const currentObjects = getHandoverObjects(node);
  const hasExistingObject = currentObjects.some((handoverObject) => handoverObject.id === objectId);
  if (hasExistingObject) {
    return normalizedRole === "context"
      ? setHandoverObjectRole(nodeId, objectId, normalizedRole)
      : false;
  }
  const nextObjects = normalizedRole === "context"
    ? currentObjects.map((handoverObject) => ({
        ...handoverObject,
        role: handoverObject.role === "context" ? "reference" : handoverObject.role
      }))
    : [...currentObjects];
  node.handoverObjects = [
    ...nextObjects,
    {
      id: objectId,
      role: normalizedRole
    }
  ];
  refreshAllHandoverDerivedState();
  syncNodeRuntimeAndStore();
  hasAppliedWorkspace = false;
  persistStoreToLocalStorage();
  return true;
}

function removeHandoverObject(nodeId, objectId) {
  const node = getNodeById(nodeId);
  if (!node || node.type !== "handover") return false;
  const currentObjects = getHandoverObjects(node);
  const nextObjects = currentObjects.filter((handoverObject) => handoverObject.id !== objectId);
  if (nextObjects.length === currentObjects.length) return false;
  node.handoverObjects = nextObjects;
  refreshAllHandoverDerivedState();
  syncNodeRuntimeAndStore();
  hasAppliedWorkspace = false;
  persistStoreToLocalStorage();
  return true;
}

function setHandoverObjectRole(nodeId, objectId, role) {
  const node = getNodeById(nodeId);
  if (!node || node.type !== "handover" || !isNodeOwnedByCurrentUser(node)) return false;
  const normalizedRole = normalizeHandoverObjectRole(role);
  let changed = false;
  node.handoverObjects = getHandoverObjects(node).map((handoverObject) => {
    if (normalizedRole === "context" && handoverObject.role === "context" && handoverObject.id !== objectId) {
      changed = true;
      return {
        ...handoverObject,
        role: "reference"
      };
    }
    if (handoverObject.id !== objectId) return handoverObject;
    if (handoverObject.role === normalizedRole) return handoverObject;
    changed = true;
    return {
      ...handoverObject,
      role: normalizedRole
    };
  });
  if (!changed) return false;
  refreshAllHandoverDerivedState();
  syncNodeRuntimeAndStore();
  hasAppliedWorkspace = false;
  persistStoreToLocalStorage();
  return true;
}

function addHandoverObjectIds(nodeId, nextNodeIds, role = "reference") {
  const node = getNodeById(nodeId);
  if (!node || node.type !== "handover" || !isNodeOwnedByCurrentUser(node)) return false;
  const normalizedRole = normalizeHandoverObjectRole(role);
  const currentObjects = getHandoverObjects(node);
  const existingIds = new Set(currentObjects.map((handoverObject) => handoverObject.id));
  const nextObjects = normalizedRole === "context"
    ? currentObjects.map((handoverObject) => ({
        ...handoverObject,
        role: handoverObject.role === "context" ? "reference" : handoverObject.role
      }))
    : [...currentObjects];
  let changed = false;
  let hasAssignedContext = false;
  (Array.isArray(nextNodeIds) ? nextNodeIds : []).forEach((candidateNodeId) => {
    if (typeof candidateNodeId !== "string" || !candidateNodeId || candidateNodeId === node.id || existingIds.has(candidateNodeId)) {
      return;
    }
    const candidateNode = getAnyNodeById(candidateNodeId);
    const nextRole = normalizedRole === "context"
      ? (hasAssignedContext ? "reference" : "context")
      : normalizedRole;
    if (!isValidHandoverObjectNodeForRole(candidateNode, nextRole)) return;
    existingIds.add(candidateNodeId);
    nextObjects.push({
      id: candidateNodeId,
      role: nextRole
    });
    if (nextRole === "context") {
      hasAssignedContext = true;
    }
    changed = true;
  });
  if (!changed) return false;
  if (normalizedRole === "context") {
    node.handoverObjects = nextObjects.map((handoverObject) => ({
      ...handoverObject,
      role: handoverObject.role === "context" && handoverObject.id !== nextObjects.find((candidate) => candidate.role === "context")?.id
        ? "reference"
        : handoverObject.role
    }));
  } else {
    node.handoverObjects = nextObjects;
  }
  refreshAllHandoverDerivedState();
  syncNodeRuntimeAndStore();
  hasAppliedWorkspace = false;
  persistStoreToLocalStorage();
  return true;
}

function addHandoverObjectIdEntry(node, candidateNodeId, role = "reference") {
  if (!node || node.type !== "handover" || typeof candidateNodeId !== "string" || !candidateNodeId || candidateNodeId === node.id) {
    return false;
  }
  const candidateNode = getAnyNodeById(candidateNodeId);
  const normalizedRole = normalizeHandoverObjectRole(role);
  if (!isValidHandoverObjectNodeForRole(candidateNode, normalizedRole)) {
    return false;
  }
  const currentObjects = getHandoverObjects(node);
  if (currentObjects.some((handoverObject) => handoverObject.id === candidateNodeId)) return false;
  const nextObjects = normalizedRole === "context"
    ? currentObjects.map((handoverObject) => ({
        ...handoverObject,
        role: handoverObject.role === "context" ? "reference" : handoverObject.role
      }))
    : [...currentObjects];
  node.handoverObjects = [
    ...nextObjects,
    {
      id: candidateNodeId,
      role: normalizedRole
    }
  ];
  return true;
}

function removeHandoverObjectIdEntry(node, candidateNodeId) {
  if (!node || node.type !== "handover" || typeof candidateNodeId !== "string" || !candidateNodeId) return false;
  const currentObjects = getHandoverObjects(node);
  const nextObjects = currentObjects.filter((handoverObject) => handoverObject.id !== candidateNodeId);
  if (nextObjects.length === currentObjects.length) return false;
  node.handoverObjects = nextObjects;
  return true;
}

function getCollaboratorPickerGroups(node) {
  if (!node || node.type !== "handover") return [];
  const existingCollaboratorKeys = new Set(
    getResolvedHandoverCollaborators(node).map((collaborator) => getHandoverCollaboratorSignature(collaborator.kind, collaborator.refId))
  );
  const userOptions = getSortedUsersForMenu()
    .filter((userRecord) => userRecord.id !== node.ownerId && !isAdminUserId(userRecord.id))
    .map((userRecord) => ({
      key: getHandoverCollaboratorSignature("user", userRecord.id),
      kind: "user",
      refId: userRecord.id,
      label: getUserDisplayNameWithOrg(userRecord.id) || userRecord.name || userRecord.id
    }))
    .filter((option) => option.key && !existingCollaboratorKeys.has(option.key));
  const orgOptions = getSortedOrgsForMenu()
    .map((orgRecord) => ({
      key: getHandoverCollaboratorSignature("org", orgRecord.id),
      kind: "org",
      refId: orgRecord.id,
      label: orgRecord.name || orgRecord.id
    }))
    .filter((option) => option.key && !existingCollaboratorKeys.has(option.key));
  return [
    {
      id: "users",
      label: "Users",
      options: userOptions
    },
    {
      id: "orgs",
      label: "Organisations",
      options: orgOptions
    }
  ].filter((group) => group.options.length > 0);
}

function generateTaskId() {
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateTaskGroupId() {
  return `task-group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTaskRecord(task) {
  const normalizedTask = {
    id: typeof task?.id === "string" && task.id ? task.id : generateTaskId(),
    text: typeof task?.text === "string" ? task.text : "",
    done: !!task?.done,
    assignedTo: typeof task?.assignedTo === "string" ? task.assignedTo : ""
  };
  if (typeof task?.taskGroupId === "string" && task.taskGroupId) {
    normalizedTask.taskGroupId = task.taskGroupId;
  }
  if (typeof task?.originNodeId === "string" && task.originNodeId) {
    normalizedTask.originNodeId = task.originNodeId;
  }
  const linkedObjectIds = [...new Set(
    (Array.isArray(task?.linkedObjectIds) ? task.linkedObjectIds : [])
      .filter((nodeId) => typeof nodeId === "string" && nodeId)
  )];
  if (linkedObjectIds.length) {
    normalizedTask.linkedObjectIds = linkedObjectIds;
  }
  return normalizedTask;
}

function findTaskRecord(nodeId, taskId, options = {}) {
  const targetNode = options.searchAllNodes ? getAnyNodeById(nodeId) : getNodeById(nodeId);
  if (!targetNode || !Array.isArray(targetNode.tasks)) return null;
  const taskIndex = targetNode.tasks.findIndex((task) => task.id === taskId);
  if (taskIndex < 0) return null;
  return {
    node: targetNode,
    taskIndex,
    task: targetNode.tasks[taskIndex]
  };
}

function getTaskGroupCopies(taskGroupId) {
  if (!taskGroupId) return [];
  const copies = [];
  allNodesRuntime.forEach((node) => {
    if (!Array.isArray(node.tasks)) return;
    node.tasks.forEach((task, taskIndex) => {
      if (task.taskGroupId !== taskGroupId) return;
      copies.push({
        node,
        taskIndex,
        task
      });
    });
  });
  return copies;
}

function getTaskHandoverContextNode(node, task = null) {
  if (node?.type === "handover") return node;
  if (task?.originNodeId) {
    const originNode = getAnyNodeById(task.originNodeId);
    if (originNode?.type === "handover") {
      return originNode;
    }
  }
  return null;
}

function getTaskAssigneeOptionsForContext(node, task = null) {
  const handoverContextNode = getTaskHandoverContextNode(node, task);
  if (handoverContextNode) {
    return getTaskAssigneeOptions(handoverContextNode);
  }
  return getTaskAssigneeOptions(node);
}

function normalizeTaskLinkedObjectIds(handoverNode, linkedObjectIds) {
  if (!handoverNode || handoverNode.type !== "handover") return [];
  const validObjectIds = new Set(getHandoverObjectCandidates(handoverNode).map((candidate) => candidate.node.id));
  return [...new Set(
    (Array.isArray(linkedObjectIds) ? linkedObjectIds : [])
      .filter((nodeId) => typeof nodeId === "string" && validObjectIds.has(nodeId))
  )].sort((leftNodeId, rightNodeId) => {
    const leftNode = getNodeById(leftNodeId);
    const rightNode = getNodeById(rightNodeId);
    return compareNodesByDisplayLabel(leftNode, rightNode);
  });
}

function syncSeenStateForTask(task) {
  if (!task?.id) return;
  if (!task.done && isTaskAssignedToCurrentUser(task.assignedTo)) {
    state.seenTaskIds.delete(task.id);
    return;
  }
  if (task.done || !isTaskAssignedToCurrentUser(task.assignedTo)) {
    state.seenTaskIds.delete(task.id);
  }
}

function removeTaskCopiesByGroupId(taskGroupId) {
  if (!taskGroupId) return false;
  const taskCopies = getTaskGroupCopies(taskGroupId);
  if (!taskCopies.length) return false;
  const removalsByNode = new Map();
  taskCopies.forEach((taskCopy) => {
    if (!removalsByNode.has(taskCopy.node.id)) {
      removalsByNode.set(taskCopy.node.id, []);
    }
    removalsByNode.get(taskCopy.node.id).push(taskCopy.taskIndex);
  });
  removalsByNode.forEach((taskIndexes, nodeId) => {
    const node = getAnyNodeById(nodeId);
    if (!node || !Array.isArray(node.tasks)) return;
    [...taskIndexes].sort((leftIndex, rightIndex) => rightIndex - leftIndex).forEach((taskIndex) => {
      const removedTasks = node.tasks.splice(taskIndex, 1);
      removedTasks.forEach((task) => {
        if (task?.id) {
          state.seenTaskIds.delete(task.id);
        }
      });
    });
  });
  return true;
}

function applyGroupedTaskUpdate(originHandoverNode, taskGroupId, payload, linkedObjectIds, options = {}) {
  if (!originHandoverNode || originHandoverNode.type !== "handover" || !taskGroupId) return false;
  const normalizedLinkedObjectIds = normalizeTaskLinkedObjectIds(originHandoverNode, linkedObjectIds);
  const targetNodeIds = [originHandoverNode.id, ...normalizedLinkedObjectIds];
  const targetNodeIdSet = new Set(targetNodeIds);
  const existingCopies = getTaskGroupCopies(taskGroupId);
  const existingCopyByNodeId = new Map(existingCopies.map((taskCopy) => [taskCopy.node.id, taskCopy]));

  const removalsByNode = new Map();
  existingCopies.forEach((taskCopy) => {
    if (targetNodeIdSet.has(taskCopy.node.id)) return;
    if (!removalsByNode.has(taskCopy.node.id)) {
      removalsByNode.set(taskCopy.node.id, []);
    }
    removalsByNode.get(taskCopy.node.id).push(taskCopy.taskIndex);
  });
  removalsByNode.forEach((taskIndexes, nodeId) => {
    const node = getAnyNodeById(nodeId);
    if (!node || !Array.isArray(node.tasks)) return;
    [...taskIndexes].sort((leftIndex, rightIndex) => rightIndex - leftIndex).forEach((taskIndex) => {
      const removedTasks = node.tasks.splice(taskIndex, 1);
      removedTasks.forEach((task) => {
        if (task?.id) {
          state.seenTaskIds.delete(task.id);
        }
      });
    });
  });

  targetNodeIds.forEach((targetNodeId) => {
    const targetNode = getAnyNodeById(targetNodeId);
    if (!targetNode) return;
    if (!Array.isArray(targetNode.tasks)) {
      targetNode.tasks = [];
    }
    const existingCopy = existingCopyByNodeId.get(targetNodeId);
    const nextTask = normalizeTaskRecord({
      id: existingCopy?.task?.id || (targetNodeId === originHandoverNode.id && options.preferredTaskId ? options.preferredTaskId : generateTaskId()),
      text: payload.text,
      done: !!payload.done,
      assignedTo: payload.assignedTo,
      taskGroupId,
      originNodeId: originHandoverNode.id,
      linkedObjectIds: normalizedLinkedObjectIds
    });
    if (existingCopy) {
      targetNode.tasks[existingCopy.taskIndex] = nextTask;
    } else {
      targetNode.tasks.push(nextTask);
    }
    syncSeenStateForTask(nextTask);
  });
  return true;
}

function saveTaskDraft(node, draft, existingTask = null) {
  if (!node) return false;
  const text = String(draft?.text || "").trim();
  if (!text) return false;
  const assigneeOptions = getTaskAssigneeOptionsForContext(node, existingTask);
  const assignedTo = assigneeOptions.includes(String(draft?.assignedTo || "")) ? String(draft.assignedTo || "") : (assigneeOptions[0] || "");
  const handoverContextNode = getTaskHandoverContextNode(node, existingTask);
  const linkedObjectIds = handoverContextNode
    ? normalizeTaskLinkedObjectIds(handoverContextNode, draft?.linkedObjectIds)
    : [];

  if (existingTask?.taskGroupId && handoverContextNode) {
    return applyGroupedTaskUpdate(
      handoverContextNode,
      existingTask.taskGroupId,
      {
        text,
        done: !!existingTask.done,
        assignedTo
      },
      linkedObjectIds,
      {
        preferredTaskId: existingTask.id
      }
    );
  }

  if (!existingTask && handoverContextNode && linkedObjectIds.length) {
    return applyGroupedTaskUpdate(
      handoverContextNode,
      generateTaskGroupId(),
      {
        text,
        done: false,
        assignedTo
      },
      linkedObjectIds
    );
  }

  if (existingTask && handoverContextNode && linkedObjectIds.length) {
    return applyGroupedTaskUpdate(
      handoverContextNode,
      existingTask.taskGroupId || generateTaskGroupId(),
      {
        text,
        done: !!existingTask.done,
        assignedTo
      },
      linkedObjectIds,
      {
        preferredTaskId: existingTask.id
      }
    );
  }

  if (!Array.isArray(node.tasks)) {
    node.tasks = [];
  }
  const nextTask = normalizeTaskRecord({
    id: existingTask?.id || generateTaskId(),
    text,
    done: !!existingTask?.done,
    assignedTo
  });
  if (existingTask) {
    const taskRecord = findTaskRecord(node.id, existingTask.id, { searchAllNodes: true });
    if (!taskRecord) return false;
    taskRecord.node.tasks[taskRecord.taskIndex] = nextTask;
  } else {
    node.tasks.push(nextTask);
  }
  syncSeenStateForTask(nextTask);
  return true;
}

function setTaskDoneState(nodeId, taskId, done) {
  const taskRecord = findTaskRecord(nodeId, taskId, { searchAllNodes: true });
  if (!taskRecord) return false;
  if (taskRecord.task.taskGroupId) {
    const handoverContextNode = getTaskHandoverContextNode(taskRecord.node, taskRecord.task);
    if (handoverContextNode) {
      return applyGroupedTaskUpdate(
        handoverContextNode,
        taskRecord.task.taskGroupId,
        {
          text: taskRecord.task.text,
          done: !!done,
          assignedTo: taskRecord.task.assignedTo
        },
        taskRecord.task.linkedObjectIds
      );
    }
    getTaskGroupCopies(taskRecord.task.taskGroupId).forEach((taskCopy) => {
      taskCopy.task.done = !!done;
      syncSeenStateForTask(taskCopy.task);
    });
    return true;
  }
  taskRecord.task.done = !!done;
  syncSeenStateForTask(taskRecord.task);
  return true;
}

function deleteTaskById(nodeId, taskId) {
  const taskRecord = findTaskRecord(nodeId, taskId, { searchAllNodes: true });
  if (!taskRecord) return false;
  if (taskRecord.task.taskGroupId) {
    return removeTaskCopiesByGroupId(taskRecord.task.taskGroupId);
  }
  const removedTasks = taskRecord.node.tasks.splice(taskRecord.taskIndex, 1);
  removedTasks.forEach((task) => {
    if (task?.id) {
      state.seenTaskIds.delete(task.id);
    }
  });
  return removedTasks.length > 0;
}

function getTaskObjectNodes(task, node) {
  const handoverContextNode = getTaskHandoverContextNode(node, task);
  if (!handoverContextNode) return [];
  return normalizeTaskLinkedObjectIds(handoverContextNode, task?.linkedObjectIds)
    .map((nodeId) => getNodeById(nodeId))
    .filter(Boolean)
    .sort(compareNodesByDisplayLabel);
}

function getTaskSlashRange(text, selectionStart) {
  if (typeof selectionStart !== "number") return null;
  const beforeCursor = String(text || "").slice(0, selectionStart);
  const match = beforeCursor.match(/(^|\s)\\([^\s\\]*)$/);
  if (!match) return null;
  const query = match[2] || "";
  return {
    start: selectionStart - query.length - 1,
    end: selectionStart,
    query
  };
}

function getTaskSlashOptions(node, draftState, task = null) {
  const handoverContextNode = getTaskHandoverContextNode(node, task);
  if (!handoverContextNode || !draftState?.slashRange) return [];
  const selectedObjectIds = new Set(Array.isArray(draftState.linkedObjectIds) ? draftState.linkedObjectIds : []);
  const query = String(draftState.slashRange.query || "").trim().toLowerCase();
  return getHandoverObjectCandidates(handoverContextNode)
    .map((candidate) => candidate.node)
    .filter((candidateNode) => !selectedObjectIds.has(candidateNode.id))
    .filter((candidateNode) => {
      if (!query) return true;
      const label = getNodeDisplayTitle(candidateNode, { fallback: getNodeTitleFallback(candidateNode) }).toLowerCase();
      return label.includes(query) || candidateNode.type.toLowerCase().includes(query);
    })
    .sort(compareNodesByDisplayLabel);
}

function applyTaskSlashSelection(draftState, inputEl, objectNodeId) {
  if (!draftState || !inputEl || !draftState.slashRange) return;
  const nextLinkedObjectIds = [...new Set([...(draftState.linkedObjectIds || []), objectNodeId])];
  const beforeSlash = draftState.text.slice(0, draftState.slashRange.start);
  const afterSlash = draftState.text.slice(draftState.slashRange.end);
  let nextText = `${beforeSlash}${afterSlash}`;
  nextText = nextText.replace(/\s{2,}/g, " ").trim();
  if (beforeSlash && !beforeSlash.endsWith(" ") && afterSlash && !afterSlash.startsWith(" ")) {
    nextText = `${beforeSlash} ${afterSlash}`.replace(/\s{2,}/g, " ").trim();
  }
  draftState.text = nextText;
  draftState.linkedObjectIds = nextLinkedObjectIds;
  draftState.slashRange = null;
  inputEl.value = nextText;
  const caretPosition = nextText.length;
  inputEl.focus();
  if (typeof inputEl.setSelectionRange === "function") {
    inputEl.setSelectionRange(caretPosition, caretPosition);
  }
}

function createTaskDraftState(node, task = null) {
  const assigneeOptions = getTaskAssigneeOptionsForContext(node, task);
  const selectedAssignee = assigneeOptions.includes(String(task?.assignedTo || ""))
    ? String(task.assignedTo || "")
    : (assigneeOptions[0] || "");
  const handoverContextNode = getTaskHandoverContextNode(node, task);
  return {
    nodeId: node?.id || null,
    taskId: task?.id || null,
    text: typeof task?.text === "string" ? task.text : "",
    assignedTo: selectedAssignee,
    linkedObjectIds: handoverContextNode ? normalizeTaskLinkedObjectIds(handoverContextNode, task?.linkedObjectIds) : [],
    slashRange: null
  };
}

function formatCommentTimestamp(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function canCurrentUserDeleteComment(node, comment) {
  if (!node || !comment) return false;
  if (isNodeOwnedByCurrentUser(node)) return true;
  return getCurrentUserCommentAuthorLabels().has(String(comment.author || "").trim());
}

function getTaskAssigneeOptions(node = null) {
  if (node?.type === "handover") {
    const options = [];
    const seenLabels = new Set();
    const ownerLabel = getOwnerDisplayName(node);
    if (ownerLabel && !seenLabels.has(ownerLabel)) {
      seenLabels.add(ownerLabel);
      options.push(ownerLabel);
    }
    getResolvedHandoverCollaborators(node)
      .sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: "base" }))
      .forEach((collaborator) => {
        if (!collaborator.label || seenLabels.has(collaborator.label)) return;
        seenLabels.add(collaborator.label);
        options.push(collaborator.label);
      });
    return options;
  }
  const owners = [...new Set(nodes.map((nodeRecord) => nodeRecord.owner))];
  if (!owners.includes(CURRENT_USER)) owners.push(CURRENT_USER);
  return owners.sort((a, b) => a.localeCompare(b));
}

function canCurrentUserManageHandoverTasks(node) {
  if (!node || node.type !== "handover") return true;
  return isNodeOwnedByCurrentUser(node) || isCurrentUserHandoverCollaborator(node);
}

function getFirstSelectableNodeId(nodeList = nodes) {
  const firstSelectable = (nodeList || []).find((node) => isSelectableNode(node));
  return firstSelectable ? firstSelectable.id : null;
}

function getPortalLabelFontShorthand() {
  const bodyStyle = document.body ? window.getComputedStyle(document.body) : null;
  const fontFamily = bodyStyle?.fontFamily || "system-ui, sans-serif";
  return `${PORTAL_LABEL_FONT_WEIGHT} ${PORTAL_LABEL_FONT_SIZE_PX}px ${fontFamily}`;
}

function measurePortalLabelWidth(label) {
  const normalizedLabel = String(label || "").trim();
  if (!normalizedLabel) return 0;
  const font = getPortalLabelFontShorthand();
  const cacheKey = `${font}::${normalizedLabel}`;
  if (portalLabelWidthCache.has(cacheKey)) {
    return portalLabelWidthCache.get(cacheKey);
  }
  if (!portalLabelMeasureContext) {
    portalLabelMeasureContext = document.createElement("canvas").getContext("2d");
  }
  const fallbackWidth = Math.ceil(normalizedLabel.length * (PORTAL_LABEL_FONT_SIZE_PX * 0.68));
  if (!portalLabelMeasureContext) {
    portalLabelWidthCache.set(cacheKey, fallbackWidth);
    return fallbackWidth;
  }
  portalLabelMeasureContext.font = font;
  const width = Math.max(1, Math.ceil(portalLabelMeasureContext.measureText(normalizedLabel).width));
  portalLabelWidthCache.set(cacheKey, width);
  return width;
}

function getEntityLabelFontShorthand() {
  const bodyStyle = document.body ? window.getComputedStyle(document.body) : null;
  const fontFamily = bodyStyle?.fontFamily || "system-ui, sans-serif";
  return `${ENTITY_LABEL_FONT_WEIGHT} ${ENTITY_LABEL_FONT_SIZE_PX}px ${fontFamily}`;
}

function measureEntityLabelWidth(label) {
  const normalizedLabel = String(label || "").trim();
  if (!normalizedLabel) return 0;
  const font = getEntityLabelFontShorthand();
  const cacheKey = `${font}::${normalizedLabel}`;
  if (entityLabelWidthCache.has(cacheKey)) {
    return entityLabelWidthCache.get(cacheKey);
  }
  if (!portalLabelMeasureContext) {
    portalLabelMeasureContext = document.createElement("canvas").getContext("2d");
  }
  const fallbackWidth = Math.ceil(normalizedLabel.length * (ENTITY_LABEL_FONT_SIZE_PX * 0.62));
  if (!portalLabelMeasureContext) {
    entityLabelWidthCache.set(cacheKey, fallbackWidth);
    return fallbackWidth;
  }
  portalLabelMeasureContext.font = font;
  const width = Math.max(1, Math.ceil(portalLabelMeasureContext.measureText(normalizedLabel).width));
  entityLabelWidthCache.set(cacheKey, width);
  return width;
}

function getEntityDiamondSize(node) {
  const label = node?.label || getEntityLabelFallback(node) || "Entity";
  const measuredTextWidth = measureEntityLabelWidth(label) + ENTITY_DIAMOND_TEXT_WIDTH_FUDGE_PX;
  const width = clamp(
    Math.ceil(measuredTextWidth / ENTITY_DIAMOND_TEXT_WIDTH_RATIO),
    ENTITY_DIAMOND_MIN_WIDTH_PX,
    ENTITY_DIAMOND_MAX_WIDTH_PX
  );
  const availableTextWidth = Math.max(
    1,
    Math.floor((width * ENTITY_DIAMOND_TEXT_WIDTH_RATIO) - GRAPH_NODE_TEXT_INSET_PX)
  );
  const estimatedLineCount = clamp(
    Math.ceil(measuredTextWidth / availableTextWidth),
    1,
    3
  );
  return {
    width,
    height: ENTITY_DIAMOND_HEIGHT_PX + ((estimatedLineCount - 1) * Math.round(ENTITY_LABEL_LINE_HEIGHT_PX * 0.9))
  };
}

function getNodeOccupiedExtents(node, expandedLocationId = null) {
  const size = getCardSize(node, expandedLocationId);
  const halfWidth = size.width / 2;
  const halfHeight = size.height / 2;
  const extents = {
    left: -halfWidth,
    right: halfWidth,
    top: -halfHeight,
    bottom: halfHeight
  };
  const isPortalNode = !!node && node.type === "portal";
  const isAnchorNode = isWorkspaceAnchorNode(node);
  if (!node || (!isPortalNode && !isAnchorNode)) {
    return {
      ...extents,
      width: extents.right - extents.left,
      height: extents.bottom - extents.top
    };
  }
  const labelText = isPortalNode ? getPortalLinkedWorkspaceName(node) : getAnchorNodeDisplayLabel(node);
  if (!labelText) {
    return {
      ...extents,
      width: extents.right - extents.left,
      height: extents.bottom - extents.top
    };
  }
  const halfLabelWidth = measurePortalLabelWidth(labelText) / 2;
  extents.left = Math.min(extents.left, -halfLabelWidth);
  extents.right = Math.max(extents.right, halfLabelWidth);
  extents.top -= PORTAL_LABEL_GAP_PX + PORTAL_LABEL_LINE_HEIGHT_PX;
  return {
    ...extents,
    width: extents.right - extents.left,
    height: extents.bottom - extents.top
  };
}

function getNodeOccupiedSize(node, expandedLocationId = null) {
  const extents = getNodeOccupiedExtents(node, expandedLocationId);
  return {
    width: extents.width,
    height: extents.height
  };
}

function getNodeOccupiedRect(node, frame, expandedLocationId = null) {
  if (!node || !frame) {
    return { left: 0, top: 0, right: 0, bottom: 0 };
  }
  const center = getNodeVisualCenter(node, frame);
  const extents = getNodeOccupiedExtents(node, expandedLocationId);
  return {
    left: center.x + extents.left,
    top: center.y + extents.top,
    right: center.x + extents.right,
    bottom: center.y + extents.bottom
  };
}

function getNodeOccupiedCollisionRadius(node, expandedLocationId = null) {
  const extents = getNodeOccupiedExtents(node, expandedLocationId);
  const corners = [
    [extents.left, extents.top],
    [extents.right, extents.top],
    [extents.left, extents.bottom],
    [extents.right, extents.bottom]
  ];
  return corners.reduce((maxRadius, [x, y]) => {
    const radius = Math.sqrt((x * x) + (y * y));
    return Math.max(maxRadius, radius);
  }, 0);
}

function reconcileLegacyPortalGraphPositions() {
  if (!store) return false;
  const storeMeta = store.meta && typeof store.meta === "object" ? { ...store.meta } : {};
  const currentVersion = Number(storeMeta.portalGraphPosSchemaVersion || 0);
  if (currentVersion >= PORTAL_GRAPH_POS_SCHEMA_VERSION) {
    return false;
  }

  let changed = false;
  allNodesRuntime.forEach((node) => {
    if (!node || node.type !== "portal") return;
    if (!node.graphPos || !Number.isFinite(node.graphPos.x) || !Number.isFinite(node.graphPos.y)) return;
    node.graphPos = {
      x: node.graphPos.x,
      y: node.graphPos.y + LEGACY_PORTAL_GRAPH_POS_Y_OFFSET_PX
    };
    changed = true;
  });

  storeMeta.portalGraphPosSchemaVersion = PORTAL_GRAPH_POS_SCHEMA_VERSION;
  store.meta = storeMeta;
  if (changed) {
    syncNodeRuntimeAndStore();
    persistStoreToLocalStorage();
  }
  return changed;
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

function isAdminUserId(userId) {
  return !!userId && userId === ADMIN_USER_ID;
}

function isAdminMode() {
  return isAdminUserId(currentUserId);
}

function resetAdminOrgModalState() {
  adminOrgModalState = {
    open: false,
    draftName: "",
    renameOrgId: null,
    renameDraft: ""
  };
}

function resetAdminUserModalState() {
  adminUserModalState = {
    open: false,
    selectedOrgId: "",
    draftName: "",
    renameUserId: null,
    renameDraft: ""
  };
}

function resetConfirmationModalState() {
  confirmationModalState = {
    open: false,
    title: "",
    message: "",
    confirmLabel: "Delete",
    confirmTone: "delete",
    onConfirm: null
  };
}

function resetDetailsEditState() {
  detailsTitleEditNodeId = null;
  detailsTitleDraft = "";
  detailsSummaryEditNodeId = null;
  detailsSummaryDraft = "";
  detailsTaskComposerState = {
    nodeId: null,
    text: "",
    assignedTo: "",
    linkedObjectIds: [],
    slashRange: null
  };
  detailsTaskEditState = {
    nodeId: null,
    taskId: null,
    text: "",
    assignedTo: "",
    linkedObjectIds: [],
    slashRange: null
  };
}

function syncNodeRuntimeAndStore() {
  if (!store) return;
  const persistedNodes = allNodesRuntime.map((node) => toPersistableNode(node));
  store.nodes = persistedNodes;
  store.nodesById = new Map(persistedNodes.map((node) => [node.id, node]));
}

function generateNodeId(type) {
  const typeSlug = String(type || "node").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "node";
  const base = `${typeSlug}-${Date.now().toString(36)}`;
  const existingIds = new Set(allNodesRuntime.map((node) => node.id));
  let candidate = base;
  let suffix = 2;
  while (existingIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function setNodeTitleById(nodeId, nextTitle, options = {}) {
  const node = getNodeById(nodeId);
  if (!node) return false;
  if (!canInlineEditNodeTitle(node)) return false;
  const normalizedTitle = String(nextTitle ?? "").trim();
  node.title = normalizedTitle;
  node.label = normalizedTitle;
  if (typeof node.summary !== "string") {
    node.summary = "";
  }
  if (!node.summary.trim() && normalizedTitle) {
    node.summary = `${normalizedTitle} node`;
  }
  syncNodeRuntimeAndStore();
  if (options.persist !== false) {
    persistStoreToLocalStorage();
  }
  return true;
}

function setNodeSummaryById(nodeId, nextSummary, options = {}) {
  const node = getNodeById(nodeId);
  if (!node) return false;
  if (!isNodeOwnedByCurrentUser(node)) return false;
  node.summary = String(nextSummary ?? "").trim();
  syncNodeRuntimeAndStore();
  if (options.persist !== false) {
    persistStoreToLocalStorage();
  }
  return true;
}

function setProcessStatusById(nodeId, nextStatus, options = {}) {
  const node = getNodeById(nodeId);
  if (!node || node.type !== "process") return false;
  node.status = normalizeProcessStatus(nextStatus);
  syncNodeRuntimeAndStore();
  if (options.persist !== false) {
    persistStoreToLocalStorage();
  }
  return true;
}

function setHandoverStatusById(nodeId, nextStatus, options = {}) {
  const node = getNodeById(nodeId);
  if (!node || node.type !== "handover") return false;
  const allowedStatuses = getEditableHandoverStatusesForCurrentUser(node);
  const normalizedStatus = normalizeHandoverStatus(nextStatus);
  if (!allowedStatuses.includes(normalizedStatus)) return false;
  node.status = normalizedStatus;
  refreshAllHandoverDerivedState();
  syncNodeRuntimeAndStore();
  hasAppliedWorkspace = false;
  if (options.persist !== false) {
    persistStoreToLocalStorage();
  }
  return true;
}

function addHandoverCollaborator(nodeId, kind, refId) {
  const node = getNodeById(nodeId);
  if (!node || node.type !== "handover" || !isNodeOwnedByCurrentUser(node)) return false;
  const normalizedCollaborator = normalizeHandoverCollaboratorEntry({ kind, refId, shareWorkspace: false });
  if (!normalizedCollaborator) return false;
  const signature = getHandoverCollaboratorSignature(normalizedCollaborator.kind, normalizedCollaborator.refId);
  const nextCollaborators = Array.isArray(node.handoverCollaborators)
    ? node.handoverCollaborators.map((collaborator) => ({ ...collaborator }))
    : [];
  if (nextCollaborators.some((collaborator) => getHandoverCollaboratorSignature(collaborator.kind, collaborator.refId) === signature)) {
    return false;
  }
  nextCollaborators.push(normalizedCollaborator);
  node.handoverCollaborators = nextCollaborators;
  syncCollabWorkspaceGraphForCollaborator(node, normalizedCollaborator);
  refreshAllHandoverDerivedState();
  syncNodeRuntimeAndStore();
  hasAppliedWorkspace = false;
  persistStoreToLocalStorage();
  return true;
}

function removeHandoverCollaborator(nodeId, kind, refId) {
  const node = getNodeById(nodeId);
  if (!node || node.type !== "handover" || !isNodeOwnedByCurrentUser(node)) return false;
  const collaboratorSignature = getHandoverCollaboratorSignature(kind, refId);
  const currentCollaborators = Array.isArray(node.handoverCollaborators) ? node.handoverCollaborators : [];
  const nextCollaborators = currentCollaborators.filter(
    (collaborator) => getHandoverCollaboratorSignature(collaborator.kind, collaborator.refId) !== collaboratorSignature
  );
  if (nextCollaborators.length === currentCollaborators.length) return false;
  const workspaceRecord = currentWorkspaceId ? workspaceById.get(currentWorkspaceId || "") || null : null;
  if (
    workspaceRecord &&
    normalizeWorkspaceKind(workspaceRecord.kind) === "collab" &&
    !isCollabWorkspaceOnlyHandover(node) &&
    (kind === "user" || kind === "org")
  ) {
    retainProjectedCollaboratorEntitiesInWorkspace(workspaceRecord, node, {
      type: "entity",
      entityKind: kind,
      entityRefId: refId
    });
  }
  node.handoverCollaborators = nextCollaborators;
  removeCollabWorkspaceGraphForCollaborator(node, { kind, refId });
  refreshAllHandoverDerivedState();
  syncNodeRuntimeAndStore();
  hasAppliedWorkspace = false;
  persistStoreToLocalStorage();
  return true;
}

function removeHandoverCollaboratorEntry(node, kind, refId) {
  if (!node || node.type !== "handover") return false;
  const collaboratorSignature = getHandoverCollaboratorSignature(kind, refId);
  const currentCollaborators = Array.isArray(node.handoverCollaborators) ? node.handoverCollaborators : [];
  const nextCollaborators = currentCollaborators.filter(
    (collaborator) => getHandoverCollaboratorSignature(collaborator.kind, collaborator.refId) !== collaboratorSignature
  );
  if (nextCollaborators.length === currentCollaborators.length) return false;
  node.handoverCollaborators = nextCollaborators;
  return true;
}

function toggleHandoverCollaboratorShare(nodeId, kind, refId) {
  const node = getNodeById(nodeId);
  if (!node || node.type !== "handover" || !isNodeOwnedByCurrentUser(node)) return false;
  if (isCollabWorkspaceOnlyHandover(node)) return false;
  const collaboratorSignature = getHandoverCollaboratorSignature(kind, refId);
  const currentCollaborators = Array.isArray(node.handoverCollaborators) ? node.handoverCollaborators : [];
  let changed = false;
  node.handoverCollaborators = currentCollaborators.map((collaborator) => {
    if (getHandoverCollaboratorSignature(collaborator.kind, collaborator.refId) !== collaboratorSignature) {
      return collaborator;
    }
    changed = true;
    return {
      ...collaborator,
      shareWorkspace: !collaborator.shareWorkspace
    };
  });
  if (!changed) return false;
  refreshAllHandoverDerivedState();
  syncNodeRuntimeAndStore();
  hasAppliedWorkspace = false;
  persistStoreToLocalStorage();
  return true;
}

function getHandoverProjectionMeta(value) {
  if (!value || typeof value !== "object") return null;
  const meta = value.meta;
  if (!meta || typeof meta !== "object") return null;
  const projectionMeta = meta[HANDOVER_PROJECTION_META_KEY];
  if (!projectionMeta || typeof projectionMeta !== "object") return null;
  return projectionMeta;
}

function isAutoManagedProjectionNode(node) {
  return !!getHandoverProjectionMeta(node)?.autoManaged;
}

function isAutoManagedProjectionEdge(edge) {
  return !!getHandoverProjectionMeta(edge)?.autoManaged;
}

function ensureWorkspaceMetaRecord(workspaceRecord) {
  if (!workspaceRecord || typeof workspaceRecord !== "object") return {};
  if (!workspaceRecord.meta || typeof workspaceRecord.meta !== "object") {
    workspaceRecord.meta = {};
  }
  return workspaceRecord.meta;
}

function getProjectionTrackedNodeIds(workspaceRecord) {
  const workspaceMeta = ensureWorkspaceMetaRecord(workspaceRecord);
  return Array.isArray(workspaceMeta[HANDOVER_PROJECTION_WORKSPACE_NODE_IDS_KEY])
    ? workspaceMeta[HANDOVER_PROJECTION_WORKSPACE_NODE_IDS_KEY].filter((nodeId) => typeof nodeId === "string" && nodeId)
    : [];
}

function getProjectionTrackedEdgeIds(workspaceRecord) {
  const workspaceMeta = ensureWorkspaceMetaRecord(workspaceRecord);
  return Array.isArray(workspaceMeta[HANDOVER_PROJECTION_WORKSPACE_EDGE_IDS_KEY])
    ? workspaceMeta[HANDOVER_PROJECTION_WORKSPACE_EDGE_IDS_KEY].filter((edgeId) => typeof edgeId === "string" && edgeId)
    : [];
}

function setProjectionTrackedNodeIds(workspaceRecord, nextNodeIds) {
  const workspaceMeta = ensureWorkspaceMetaRecord(workspaceRecord);
  workspaceMeta[HANDOVER_PROJECTION_WORKSPACE_NODE_IDS_KEY] = [...new Set(
    (Array.isArray(nextNodeIds) ? nextNodeIds : []).filter((nodeId) => typeof nodeId === "string" && nodeId)
  )];
}

function setProjectionTrackedEdgeIds(workspaceRecord, nextEdgeIds) {
  const workspaceMeta = ensureWorkspaceMetaRecord(workspaceRecord);
  workspaceMeta[HANDOVER_PROJECTION_WORKSPACE_EDGE_IDS_KEY] = [...new Set(
    (Array.isArray(nextEdgeIds) ? nextEdgeIds : []).filter((edgeId) => typeof edgeId === "string" && edgeId)
  )];
}

function clearProjectionMeta(value) {
  if (!value || typeof value !== "object" || !value.meta || typeof value.meta !== "object") return false;
  if (!Object.prototype.hasOwnProperty.call(value.meta, HANDOVER_PROJECTION_META_KEY)) return false;
  delete value.meta[HANDOVER_PROJECTION_META_KEY];
  if (!Object.keys(value.meta).length) {
    delete value.meta;
  }
  return true;
}

function getWorkspaceHandoverViewMap(workspaceRecord, create = false) {
  if (!workspaceRecord) return null;
  const workspaceMeta = ensureWorkspaceMetaRecord(workspaceRecord);
  if (!workspaceMeta.handoverView || typeof workspaceMeta.handoverView !== "object") {
    if (!create) return null;
    workspaceMeta.handoverView = {};
  }
  return workspaceMeta.handoverView;
}

function getWorkspaceHandoverViewRecord(workspaceRecord, handoverId, create = false) {
  if (!workspaceRecord || !handoverId) return null;
  const handoverView = getWorkspaceHandoverViewMap(workspaceRecord, create);
  if (!handoverView) return null;
  if (!handoverView[handoverId] || typeof handoverView[handoverId] !== "object") {
    if (!create) return null;
    handoverView[handoverId] = {};
  }
  return handoverView[handoverId];
}

function getProjectedObjectEdgeDirection(workspaceRecord, handoverId, objectNodeId) {
  const handoverViewRecord = getWorkspaceHandoverViewRecord(workspaceRecord, handoverId, false);
  const direction = handoverViewRecord?.objectEdgeDirections?.[objectNodeId];
  if (direction === "object_to_handover" || direction === "handover_to_object") {
    return direction;
  }
  return null;
}

function setProjectedObjectEdgeDirection(workspaceRecord, handoverId, objectNodeId, direction) {
  if (!workspaceRecord || !handoverId || !objectNodeId) return false;
  const nextDirection = direction === "object_to_handover" ? "object_to_handover" : "handover_to_object";
  const handoverViewRecord = getWorkspaceHandoverViewRecord(workspaceRecord, handoverId, true);
  if (!handoverViewRecord.objectEdgeDirections || typeof handoverViewRecord.objectEdgeDirections !== "object") {
    handoverViewRecord.objectEdgeDirections = {};
  }
  if (handoverViewRecord.objectEdgeDirections[objectNodeId] === nextDirection) return false;
  handoverViewRecord.objectEdgeDirections[objectNodeId] = nextDirection;
  return true;
}

function clearProjectedObjectEdgeDirection(workspaceRecord, handoverId, objectNodeId) {
  const handoverViewRecord = getWorkspaceHandoverViewRecord(workspaceRecord, handoverId, false);
  if (!handoverViewRecord?.objectEdgeDirections || !Object.prototype.hasOwnProperty.call(handoverViewRecord.objectEdgeDirections, objectNodeId)) {
    return false;
  }
  delete handoverViewRecord.objectEdgeDirections[objectNodeId];
  if (!Object.keys(handoverViewRecord.objectEdgeDirections).length) {
    delete handoverViewRecord.objectEdgeDirections;
  }
  if (!Object.keys(handoverViewRecord).length) {
    const handoverView = getWorkspaceHandoverViewMap(workspaceRecord, false);
    if (handoverView) {
      delete handoverView[handoverId];
      if (!Object.keys(handoverView).length) {
        const workspaceMeta = ensureWorkspaceMetaRecord(workspaceRecord);
        delete workspaceMeta.handoverView;
      }
    }
  }
  return true;
}

function isWorkspaceProtectedNode(workspaceRecord, node) {
  if (!workspaceRecord || !node) return false;
  if (node.type === "collaboration") return true;
  if (workspaceRecord.homeNodeId === node.id) return true;
  if (isAutoManagedProjectionNode(node)) return true;
  const projectionMeta = getCurrentProjectionNodeMeta(node.id);
  if (!projectionMeta) {
    return false;
  }
  if (projectionMeta.roles.includes("handover-object")) {
    return false;
  }
  if (node.type === "handover" && isCollabWorkspaceOnlyHandover(node) && workspaceRecord.ownerId === node.ownerId) {
    return false;
  }
  return true;
}

function backfillDefaultContextsForWorkspace(workspaceRecord) {
  if (!workspaceRecord || normalizeWorkspaceKind(workspaceRecord.kind) === "collab") return false;
  let changed = false;
  allNodesRuntime.forEach((node) => {
    if (!node || node.type !== "handover") return;
    if (getSourceWorkspaceIdForHandover(node) !== workspaceRecord.id) return;
    if (applyDefaultContextObjectToHandover(node)) {
      changed = true;
    }
  });
  return changed;
}

function syncAnchorContextsForWorkspace(workspaceRecord, previousAnchorId = null) {
  if (!workspaceRecord || normalizeWorkspaceKind(workspaceRecord.kind) === "collab") return false;
  const nextAnchorId = typeof workspaceRecord.homeNodeId === "string" && workspaceRecord.homeNodeId
    ? workspaceRecord.homeNodeId
    : null;
  let changed = false;
  allNodesRuntime.forEach((node) => {
    if (!node || node.type !== "handover") return;
    if (getSourceWorkspaceIdForHandover(node) !== workspaceRecord.id) return;
    const currentContext = getCurrentHandoverContextObject(node);
    if (currentContext && currentContext.id !== previousAnchorId) {
      return;
    }
    const currentObjects = getHandoverObjects(node);
    const nextAnchorNode = nextAnchorId ? getAnyNodeById(nextAnchorId) : null;
    const nextContextId = nextAnchorId && nextAnchorId !== node.id && isValidHandoverObjectNodeForRole(nextAnchorNode, "context")
      ? nextAnchorId
      : null;
    if (!nextContextId) {
      if (!currentContext) return;
      node.handoverObjects = currentObjects.filter((handoverObject) => handoverObject.role !== "context");
      if (previousAnchorId && removeWorkspaceEdgeLink(workspaceRecord, previousAnchorId, node.id)) {
        changed = true;
      }
      changed = true;
      return;
    }
    if (currentContext?.id === nextContextId) {
      return;
    }
    let foundNextContext = false;
    const nextObjects = currentObjects.map((handoverObject) => {
      if (handoverObject.id === nextContextId) {
        foundNextContext = true;
        if (handoverObject.role === "context") return handoverObject;
        changed = true;
        return {
          ...handoverObject,
          role: "context"
        };
      }
      if (handoverObject.role !== "context") return handoverObject;
      changed = true;
      return {
        ...handoverObject,
        role: "reference"
      };
    });
    node.handoverObjects = foundNextContext
      ? nextObjects
      : [
          {
            id: nextContextId,
            role: "context"
          },
          ...nextObjects
        ];
    if (previousAnchorId && previousAnchorId !== nextContextId && removeWorkspaceEdgeLink(workspaceRecord, previousAnchorId, node.id)) {
      changed = true;
    }
    if (!foundNextContext) {
      changed = true;
    }
  });
  return changed;
}

function setCurrentWorkspaceAnchorNode(nodeId) {
  const workspaceRecord = getCurrentWorkspaceRecord();
  const node = getNodeById(nodeId);
  if (!workspaceRecord || !node || normalizeWorkspaceKind(workspaceRecord.kind) === "collab") return false;
  if (!isSelectableNode(node) || node.type === "collaboration") return false;
  if (workspaceRecord.homeNodeId === node.id) return false;
  const previousAnchorId = typeof workspaceRecord.homeNodeId === "string" && workspaceRecord.homeNodeId
    ? workspaceRecord.homeNodeId
    : null;
  workspaceRecord.homeNodeId = node.id;
  const changedNodes = syncAnchorContextsForWorkspace(workspaceRecord, previousAnchorId) || backfillDefaultContextsForWorkspace(workspaceRecord);
  if (changedNodes) {
    refreshAllHandoverDerivedState();
    syncNodeRuntimeAndStore();
  }
  syncWorkspaceRuntimeAndStore();
  hasAppliedWorkspace = false;
  persistStoreToLocalStorage();
  return true;
}

function clearCurrentWorkspaceAnchorNode() {
  const workspaceRecord = getCurrentWorkspaceRecord();
  if (!workspaceRecord || normalizeWorkspaceKind(workspaceRecord.kind) === "collab" || !workspaceRecord.homeNodeId) return false;
  const previousAnchorId = workspaceRecord.homeNodeId;
  workspaceRecord.homeNodeId = null;
  const changedNodes = syncAnchorContextsForWorkspace(workspaceRecord, previousAnchorId);
  if (changedNodes) {
    refreshAllHandoverDerivedState();
    syncNodeRuntimeAndStore();
  }
  syncWorkspaceRuntimeAndStore();
  hasAppliedWorkspace = false;
  persistStoreToLocalStorage();
  return true;
}

function setProjectionTrackedIds(workspaceRecord, nodeIds, edgeIds) {
  const workspaceMeta = ensureWorkspaceMetaRecord(workspaceRecord);
  workspaceMeta[HANDOVER_PROJECTION_WORKSPACE_NODE_IDS_KEY] = [...new Set(
    (Array.isArray(nodeIds) ? nodeIds : []).filter((nodeId) => typeof nodeId === "string" && nodeId)
  )];
  workspaceMeta[HANDOVER_PROJECTION_WORKSPACE_EDGE_IDS_KEY] = [...new Set(
    (Array.isArray(edgeIds) ? edgeIds : []).filter((edgeId) => typeof edgeId === "string" && edgeId)
  )];
}

function buildProjectionNodeId(workspaceId, role, refId) {
  return `projection-node-${sanitizeWorkspaceSlug(workspaceId)}-${sanitizeWorkspaceSlug(role)}-${sanitizeWorkspaceSlug(refId)}`;
}

function buildProjectionEdgeId(workspaceId, handoverId, sourceId, targetId) {
  return `projection-edge-${sanitizeWorkspaceSlug(workspaceId)}-${sanitizeWorkspaceSlug(handoverId)}-${sanitizeWorkspaceSlug(sourceId)}-${sanitizeWorkspaceSlug(targetId)}`;
}

function getCollaborationWorkspaceRecordForUser(userId) {
  if (!userId) return null;
  return workspaces.find((workspace) => normalizeWorkspaceKind(workspace.kind) === "collab" && workspace.ownerId === userId) || null;
}

function buildCollaborationWorkspaceIdForUser(userId) {
  const ownerSlug = sanitizeWorkspaceSlug(userId) || "user";
  let candidate = `ws-${ownerSlug}-collaboration`;
  if (!workspaceById.has(candidate) || getCollaborationWorkspaceRecordForUser(userId)?.id === candidate) {
    return candidate;
  }
  let counter = 2;
  while (workspaceById.has(`${candidate}-${counter}`)) {
    counter += 1;
  }
  return `${candidate}-${counter}`;
}

function ensureCollaborationWorkspaceForUser(userId) {
  if (!userId || isAdminUserId(userId) || !userById.has(userId)) return null;
  const existingWorkspace = getCollaborationWorkspaceRecordForUser(userId);
  if (existingWorkspace) return existingWorkspace;
  const workspaceRecord = {
    id: buildCollaborationWorkspaceIdForUser(userId),
    name: "Collaboration map",
    kind: "collab",
    ownerId: userId,
    nodeIds: [],
    edgeIds: [],
    homeNodeId: null,
    meta: {}
  };
  workspaces.push(workspaceRecord);
  workspaceById.set(workspaceRecord.id, workspaceRecord);
  return workspaceRecord;
}

function getSourceWorkspaceIdForHandover(node) {
  if (!node || node.type !== "handover") return null;
  if (typeof node.sourceWorkspaceId === "string" && node.sourceWorkspaceId && workspaceById.has(node.sourceWorkspaceId)) {
    return node.sourceWorkspaceId;
  }
  const memberships = getWorkspaceRecordsForNode(node.id);
  const nonCollabWorkspace = memberships.find((workspace) => normalizeWorkspaceKind(workspace.kind) !== "collab") || null;
  if (nonCollabWorkspace) return nonCollabWorkspace.id;
  return memberships[0]?.id || null;
}

function getWorkspaceRecordsForNode(nodeId) {
  if (!nodeId) return [];
  return workspaces.filter((workspace) => Array.isArray(workspace.nodeIds) && workspace.nodeIds.includes(nodeId));
}

function getCanonicalSourceWorkspaceForNode(node) {
  if (!node || !node.id) return null;
  if (node.type === "handover") {
    const sourceWorkspaceId = getSourceWorkspaceIdForHandover(node);
    return sourceWorkspaceId ? workspaceById.get(sourceWorkspaceId) || null : null;
  }
  const memberships = getWorkspaceRecordsForNode(node.id);
  if (!memberships.length) return null;
  const ownedNonCollabWorkspace = memberships.find((workspace) =>
    normalizeWorkspaceKind(workspace.kind) !== "collab" &&
    workspace.ownerId &&
    node.ownerId &&
    workspace.ownerId === node.ownerId
  ) || null;
  if (ownedNonCollabWorkspace) return ownedNonCollabWorkspace;
  const nonCollabWorkspace = memberships.find((workspace) => normalizeWorkspaceKind(workspace.kind) !== "collab") || null;
  return nonCollabWorkspace || memberships[0] || null;
}

function getUniqueNonCollabWorkspaceForNode(nodeId) {
  if (!nodeId) return null;
  const candidateWorkspaces = getWorkspaceRecordsForNode(nodeId)
    .filter((workspace) => normalizeWorkspaceKind(workspace.kind) !== "collab");
  return candidateWorkspaces.length === 1 ? candidateWorkspaces[0] : null;
}

function isCollabWorkspaceOnlyHandover(node) {
  if (!node || node.type !== "handover") return false;
  const memberships = getWorkspaceRecordsForNode(node.id);
  if (!memberships.length) return false;
  const hasCollabMembership = memberships.some((workspace) => normalizeWorkspaceKind(workspace.kind) === "collab");
  const hasNonCollabMembership = memberships.some((workspace) => normalizeWorkspaceKind(workspace.kind) !== "collab");
  return hasCollabMembership && !hasNonCollabMembership;
}

function buildWorkspaceScopedEdgeId(sourceId, targetId, workspaceId, takenIds = null) {
  const existingIds = takenIds instanceof Set ? takenIds : new Set(allEdgesRuntime.map((edge) => edge.id));
  const workspaceSlug = sanitizeWorkspaceSlug(workspaceId) || "workspace";
  const sourceSlug = sanitizeWorkspaceSlug(sourceId) || "source";
  const targetSlug = sanitizeWorkspaceSlug(targetId) || "target";
  const base = `edge-${workspaceSlug}-${sourceSlug}-${targetSlug}`;
  let candidate = base;
  let counter = 2;
  while (existingIds.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  return candidate;
}

function inferSourceWorkspaceIdForHandover(node) {
  if (!node || node.type !== "handover") return null;
  const memberships = getWorkspaceRecordsForNode(node.id);
  const nonCollabWorkspace = memberships.find((workspace) => normalizeWorkspaceKind(workspace.kind) !== "collab") || null;
  if (nonCollabWorkspace) return nonCollabWorkspace.id;
  return memberships[0]?.id || null;
}

function migrateHandoverProjectionModel() {
  let changed = false;

  allNodesRuntime.forEach((node) => {
    if (!node || node.type !== "handover") return;
    const nextSourceWorkspaceId = inferSourceWorkspaceIdForHandover(node);
    if (node.sourceWorkspaceId !== nextSourceWorkspaceId) {
      node.sourceWorkspaceId = nextSourceWorkspaceId;
      changed = true;
    }
  });

  const nonProjectionNodeIds = new Set(
    allNodesRuntime
      .filter((node) => !isAutoManagedProjectionNode(node))
      .map((node) => node.id)
  );
  if (nonProjectionNodeIds.size !== allNodesRuntime.length) {
    allNodesRuntime = allNodesRuntime.filter((node) => nonProjectionNodeIds.has(node.id));
    changed = true;
  }

  const originalEdges = allEdgesRuntime
    .filter((edge) => edge && edge.id && !isAutoManagedProjectionEdge(edge))
    .map((edge) => ({ ...edge }));
  if (originalEdges.length !== allEdgesRuntime.length) {
    changed = true;
  }

  const originalEdgeById = new Map(originalEdges.map((edge) => [edge.id, edge]));
  const nextEdges = [];
  const takenEdgeIds = new Set();
  workspaces.forEach((workspaceRecord) => {
    if (!Array.isArray(workspaceRecord.nodeIds)) {
      workspaceRecord.nodeIds = [];
    }
    const nextNodeIds = workspaceRecord.nodeIds.filter((nodeId) => nonProjectionNodeIds.has(nodeId));
    if (nextNodeIds.length !== workspaceRecord.nodeIds.length) {
      workspaceRecord.nodeIds = nextNodeIds;
      changed = true;
    }
    const workspaceMeta = ensureWorkspaceMetaRecord(workspaceRecord);
    if (Object.prototype.hasOwnProperty.call(workspaceMeta, HANDOVER_PROJECTION_WORKSPACE_NODE_IDS_KEY)) {
      delete workspaceMeta[HANDOVER_PROJECTION_WORKSPACE_NODE_IDS_KEY];
      changed = true;
    }
    if (Object.prototype.hasOwnProperty.call(workspaceMeta, HANDOVER_PROJECTION_WORKSPACE_EDGE_IDS_KEY)) {
      delete workspaceMeta[HANDOVER_PROJECTION_WORKSPACE_EDGE_IDS_KEY];
      changed = true;
    }
    if (Array.isArray(workspaceRecord.edgeIds)) {
      const nextEdgeIds = [];
      workspaceRecord.edgeIds.forEach((edgeId) => {
        const originalEdge = originalEdgeById.get(edgeId);
        if (!originalEdge) return;
        const nextEdgeId = buildWorkspaceScopedEdgeId(
          originalEdge.sourceId,
          originalEdge.targetId,
          workspaceRecord.id,
          takenEdgeIds
        );
        takenEdgeIds.add(nextEdgeId);
        nextEdges.push({
          ...originalEdge,
          id: nextEdgeId,
          workspaceId: workspaceRecord.id
        });
        nextEdgeIds.push(nextEdgeId);
      });
      if (
        nextEdgeIds.length !== workspaceRecord.edgeIds.length ||
        nextEdgeIds.some((edgeId, index) => workspaceRecord.edgeIds[index] !== edgeId)
      ) {
        workspaceRecord.edgeIds = nextEdgeIds;
        changed = true;
      }
    } else {
      workspaceRecord.edgeIds = [];
    }
  });
  allEdgesRuntime = nextEdges;
  return changed;
}

function markWorkspaceDirtyIfActive(workspaceRecord) {
  if (!workspaceRecord || workspaceRecord.id !== currentWorkspaceId) return;
  appliedWorkspaceId = null;
  hasAppliedWorkspace = false;
}

function isValidHandoverObjectNode(node) {
  return !!node && isSelectableNode(node) && node.type !== "portal" && node.type !== "entity" && node.type !== "collaboration";
}

function canCreateEdgeInCurrentWorkspace(sourceNode, targetNode) {
  if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) return false;
  if (currentWorkspaceKind !== "collab") return true;
  if (sourceNode.type === "collaboration") {
    return targetNode.type === "entity";
  }
  if (sourceNode.type === "entity") {
    return targetNode.type === "entity" || targetNode.type === "handover";
  }
  if (sourceNode.type === "handover") {
    return true;
  }
  if (targetNode.type === "handover" && isValidHandoverObjectNode(sourceNode)) {
    return true;
  }
  return false;
}

function getCurrentCollaborationAnchorNode() {
  if (currentWorkspaceKind !== "collab" || !currentWorkspaceId) return null;
  const anchorId = buildCollaborationAnchorId(currentWorkspaceId);
  return getNodeById(anchorId) || getGlobalNodeById(anchorId) || null;
}

function getEntityNodeByRefInWorkspace(workspaceRecord, entityKind, refId) {
  if (!workspaceRecord || !entityKind || !refId) return null;
  const scopedNodeIds = Array.isArray(workspaceRecord.nodeIds) ? workspaceRecord.nodeIds : [];
  return scopedNodeIds
    .map((nodeId) => getGlobalNodeById(nodeId))
    .find((node) => node && node.type === "entity" && node.entityKind === entityKind && node.entityRefId === refId) || null;
}

function createWorkspaceEntityNode(workspaceRecord, handoverNode, entityKind, refId) {
  if (!workspaceRecord || !handoverNode || !entityKind || !refId) return null;
  const existingNode = getEntityNodeByRefInWorkspace(workspaceRecord, entityKind, refId);
  if (existingNode) return existingNode;
  const ownerRecord = handoverNode.ownerId ? userById.get(handoverNode.ownerId) : null;
  const anchorPos = getDefaultCollaborationGraphPos(workspaceRecord);
  const nodeId = generateNodeId("entity");
  const nextNode = {
    id: nodeId,
    type: "entity",
    title: "",
    label: "",
    ownerId: handoverNode.ownerId || workspaceRecord.ownerId || null,
    owner: ownerRecord?.name || handoverNode.owner || workspaceRecord.ownerId || "Unknown",
    summary: entityKind === "org" ? "Collaboration organisation" : "Collaboration collaborator",
    tasks: [],
    comments: [],
    locationId: null,
    entityKind,
    entityRefId: refId,
    graphPos: {
      x: anchorPos.x + (entityKind === "org" ? 210 : 430),
      y: anchorPos.y
    }
  };
  allNodesRuntime.push(nextNode);
  ensureWorkspaceNodeMembership(workspaceRecord, nextNode.id);
  syncNodeRuntimeAndStore();
  syncWorkspaceRuntimeAndStore();
  markWorkspaceDirtyIfActive(workspaceRecord);
  return nextNode;
}

function getGlobalEdgeById(edgeId) {
  return edgeId ? allEdgesRuntime.find((edge) => edge.id === edgeId) || null : null;
}

function getWorkspaceAuthoredEdgeRecord(workspaceRecord, edgeId) {
  if (!workspaceRecord || !edgeId) return null;
  if (!Array.isArray(workspaceRecord.edgeIds) || !workspaceRecord.edgeIds.includes(edgeId)) return null;
  const edge = getGlobalEdgeById(edgeId);
  if (!edge) return null;
  if (typeof edge.workspaceId === "string" && edge.workspaceId && edge.workspaceId !== workspaceRecord.id) {
    return null;
  }
  return edge;
}

function ensureWorkspaceEdgeLink(workspaceRecord, sourceId, targetId) {
  if (!workspaceRecord || !sourceId || !targetId) return false;
  if (workspaceHasEdgeBetweenNodes(workspaceRecord, sourceId, targetId)) return false;
  if (!Array.isArray(workspaceRecord.edgeIds)) {
    workspaceRecord.edgeIds = [];
  }
  const sourceNode = getGlobalNodeById(sourceId);
  const targetNode = getGlobalNodeById(targetId);
  if (!sourceNode || !targetNode) return false;
  const nextEdge = {
    id: generateGlobalEdgeId(sourceId, targetId, workspaceRecord.id),
    sourceId,
    targetId,
    kind: inferEdgeKindForPair(sourceNode, targetNode),
    workspaceId: workspaceRecord.id
  };
  allEdgesRuntime.push(nextEdge);
  workspaceRecord.edgeIds.push(nextEdge.id);
  syncEdgeRuntimeAndStore();
  syncWorkspaceRuntimeAndStore();
  markWorkspaceDirtyIfActive(workspaceRecord);
  return true;
}

function removeWorkspaceEdgeLink(workspaceRecord, sourceId, targetId) {
  if (!workspaceRecord || !sourceId || !targetId || !Array.isArray(workspaceRecord.edgeIds)) return false;
  const removedEdgeIds = workspaceRecord.edgeIds.filter((edgeId) => {
    const edge = getWorkspaceAuthoredEdgeRecord(workspaceRecord, edgeId);
    return !!edge && edge.sourceId === sourceId && edge.targetId === targetId;
  });
  if (!removedEdgeIds.length) return false;
  const removedEdgeIdSet = new Set(removedEdgeIds);
  workspaceRecord.edgeIds = workspaceRecord.edgeIds.filter((edgeId) => !removedEdgeIdSet.has(edgeId));
  removedEdgeIds.forEach((edgeId) => {
    if (countWorkspaceReferencesForEdge(edgeId) === 0) {
      allEdgesRuntime = allEdgesRuntime.filter((edge) => edge.id !== edgeId);
    }
  });
  syncEdgeRuntimeAndStore();
  syncWorkspaceRuntimeAndStore();
  markWorkspaceDirtyIfActive(workspaceRecord);
  return true;
}

function syncProjectWorkspaceGraphForHandover(workspaceRecord, handoverNode) {
  if (!workspaceRecord || !handoverNode || handoverNode.type !== "handover") {
    return { changedNodeData: false, changedWorkspaceData: false };
  }
  if (normalizeWorkspaceKind(workspaceRecord.kind) === "collab") {
    return { changedNodeData: false, changedWorkspaceData: false };
  }
  let changedNodeData = false;
  let changedWorkspaceData = false;

  const hadHandoverMembership = Array.isArray(workspaceRecord.nodeIds) && workspaceRecord.nodeIds.includes(handoverNode.id);
  ensureWorkspaceNodeMembership(workspaceRecord, handoverNode.id);
  if (!hadHandoverMembership) {
    changedWorkspaceData = true;
  }

  const contextObject = getCurrentHandoverContextObject(handoverNode);
  const contextNode = contextObject ? getAnyNodeById(contextObject.id) : null;
  const anchorId = typeof workspaceRecord.homeNodeId === "string" && workspaceRecord.homeNodeId ? workspaceRecord.homeNodeId : null;
  const effectiveAnchorId = anchorId && anchorId !== handoverNode.id ? anchorId : null;

  if (typeof handoverNode.sourceWorkspaceId === "string" && handoverNode.sourceWorkspaceId !== workspaceRecord.id) {
    handoverNode.sourceWorkspaceId = workspaceRecord.id;
    changedNodeData = true;
  }

  getHandoverObjects(handoverNode).forEach((handoverObject) => {
    const objectNode = getAnyNodeById(handoverObject.id);
    if (!objectNode) return;
    const hadMembership = Array.isArray(workspaceRecord.nodeIds) && workspaceRecord.nodeIds.includes(objectNode.id);
    ensureWorkspaceNodeMembership(workspaceRecord, objectNode.id);
    if (!hadMembership) {
      changedWorkspaceData = true;
    }
  });

  if (contextNode) {
    if (effectiveAnchorId && effectiveAnchorId !== contextNode.id) {
      if (ensureWorkspaceEdgeLink(workspaceRecord, effectiveAnchorId, contextNode.id)) {
        changedWorkspaceData = true;
      }
      if (removeWorkspaceEdgeLink(workspaceRecord, effectiveAnchorId, handoverNode.id)) {
        changedWorkspaceData = true;
      }
    }
    if (ensureWorkspaceEdgeLink(workspaceRecord, contextNode.id, handoverNode.id)) {
      changedWorkspaceData = true;
    }
  } else if (effectiveAnchorId && ensureWorkspaceEdgeLink(workspaceRecord, effectiveAnchorId, handoverNode.id)) {
    changedWorkspaceData = true;
  }

  getHandoverObjects(handoverNode)
    .filter((handoverObject) => handoverObject.role !== "context")
    .forEach((handoverObject) => {
      const objectNode = getAnyNodeById(handoverObject.id);
      if (!objectNode) return;
      const direction = getDefaultHandoverObjectEdgeDirection(handoverObject.role);
      const sourceId = direction === "object_to_handover" ? objectNode.id : handoverNode.id;
      const targetId = direction === "object_to_handover" ? handoverNode.id : objectNode.id;
      if (ensureWorkspaceEdgeLink(workspaceRecord, sourceId, targetId)) {
        changedWorkspaceData = true;
      }
    });

  return { changedNodeData, changedWorkspaceData };
}

function removeCollabWorkspaceGraphForCollaborator(handoverNode, collaborator) {
  if (!handoverNode || handoverNode.type !== "handover" || !collaborator || !isCollabWorkspaceOnlyHandover(handoverNode)) {
    return false;
  }
  const workspaceRecord = workspaces.find((workspace) =>
    normalizeWorkspaceKind(workspace.kind) === "collab" &&
    Array.isArray(workspace.nodeIds) &&
    workspace.nodeIds.includes(handoverNode.id)
  ) || null;
  if (!workspaceRecord) return false;
  if (collaborator.kind === "org") {
    const orgNode = getEntityNodeByRefInWorkspace(workspaceRecord, "org", collaborator.refId);
    return !!orgNode && removeWorkspaceEdgeLink(workspaceRecord, orgNode.id, handoverNode.id);
  }
  const userNode = getEntityNodeByRefInWorkspace(workspaceRecord, "user", collaborator.refId);
  return !!userNode && removeWorkspaceEdgeLink(workspaceRecord, userNode.id, handoverNode.id);
}

function syncCollabWorkspaceGraphForCollaborator(handoverNode, collaborator) {
  if (!handoverNode || handoverNode.type !== "handover" || !collaborator) return false;
  const workspaceRecord = workspaces.find((workspace) =>
    normalizeWorkspaceKind(workspace.kind) === "collab" &&
    Array.isArray(workspace.nodeIds) &&
    workspace.nodeIds.includes(handoverNode.id)
  ) || null;
  if (!workspaceRecord) return false;
  const anchorNode = getCurrentCollaborationAnchorNode() || getGlobalNodeById(buildCollaborationAnchorId(workspaceRecord.id));
  if (!anchorNode) return false;
  const contextNode = getCurrentHandoverContextNode(handoverNode);
  let changed = false;
  if (collaborator.kind === "org") {
    const orgNode = createWorkspaceEntityNode(workspaceRecord, handoverNode, "org", collaborator.refId);
    if (orgNode) {
      if (ensureWorkspaceEdgeLink(workspaceRecord, anchorNode.id, orgNode.id)) changed = true;
      if (contextNode && contextNode.id !== orgNode.id) {
        const hadContextMembership = Array.isArray(workspaceRecord.nodeIds) && workspaceRecord.nodeIds.includes(contextNode.id);
        ensureWorkspaceNodeMembership(workspaceRecord, contextNode.id);
        if (!hadContextMembership) changed = true;
        if (ensureWorkspaceEdgeLink(workspaceRecord, orgNode.id, contextNode.id)) changed = true;
        if (removeWorkspaceEdgeLink(workspaceRecord, orgNode.id, handoverNode.id)) changed = true;
        if (ensureWorkspaceEdgeLink(workspaceRecord, contextNode.id, handoverNode.id)) changed = true;
      } else if (ensureWorkspaceEdgeLink(workspaceRecord, orgNode.id, handoverNode.id)) changed = true;
    }
    return changed;
  }
  const userRecord = userById.get(collaborator.refId);
  if (!userRecord) return false;
  let orgNode = null;
  if (userRecord.orgId) {
    orgNode = createWorkspaceEntityNode(workspaceRecord, handoverNode, "org", userRecord.orgId);
    if (orgNode && ensureWorkspaceEdgeLink(workspaceRecord, anchorNode.id, orgNode.id)) changed = true;
  }
  const userNode = createWorkspaceEntityNode(workspaceRecord, handoverNode, "user", collaborator.refId);
  if (!userNode) return changed;
  if (orgNode) {
    if (ensureWorkspaceEdgeLink(workspaceRecord, orgNode.id, userNode.id)) changed = true;
  } else if (ensureWorkspaceEdgeLink(workspaceRecord, anchorNode.id, userNode.id)) {
    changed = true;
  }
  if (contextNode && contextNode.id !== userNode.id) {
    const hadContextMembership = Array.isArray(workspaceRecord.nodeIds) && workspaceRecord.nodeIds.includes(contextNode.id);
    ensureWorkspaceNodeMembership(workspaceRecord, contextNode.id);
    if (!hadContextMembership) changed = true;
    if (ensureWorkspaceEdgeLink(workspaceRecord, userNode.id, contextNode.id)) changed = true;
    if (removeWorkspaceEdgeLink(workspaceRecord, userNode.id, handoverNode.id)) changed = true;
    if (ensureWorkspaceEdgeLink(workspaceRecord, contextNode.id, handoverNode.id)) changed = true;
  } else if (ensureWorkspaceEdgeLink(workspaceRecord, userNode.id, handoverNode.id)) changed = true;
  return changed;
}

function syncCollabWorkspaceGraphForAllCollaborators(handoverNode) {
  if (!isCollabWorkspaceOnlyHandover(handoverNode)) return false;
  let changed = false;
  const collaborators = Array.isArray(handoverNode.handoverCollaborators) ? handoverNode.handoverCollaborators : [];
  collaborators.forEach((rawCollaborator) => {
    const collaborator = normalizeHandoverCollaboratorEntry(rawCollaborator);
    if (!collaborator) return;
    if (syncCollabWorkspaceGraphForCollaborator(handoverNode, collaborator)) {
      changed = true;
    }
  });
  return changed;
}

function syncHandoverCollaboratorFromLinkedEntity(sourceNodeId, targetNodeId) {
  if (currentWorkspaceKind !== "collab") return false;
  const sourceNode = getNodeById(sourceNodeId);
  const targetNode = getNodeById(targetNodeId);
  let handoverNode = null;
  let entityNode = null;
  if (sourceNode?.type === "handover" && targetNode?.type === "entity") {
    handoverNode = sourceNode;
    entityNode = targetNode;
  } else if (sourceNode?.type === "entity" && targetNode?.type === "handover") {
    handoverNode = targetNode;
    entityNode = sourceNode;
  } else {
    return false;
  }
  if (!isCollabWorkspaceOnlyHandover(handoverNode)) return false;
  const entityKind = normalizeEntityKind(entityNode.entityKind);
  const refId = typeof entityNode.entityRefId === "string" ? entityNode.entityRefId : "";
  if (!entityKind || !refId) return false;
  const added = addHandoverCollaborator(handoverNode.id, entityKind, refId);
  if (added) {
    syncCollabWorkspaceGraphForAllCollaborators(handoverNode);
  }
  return added;
}

function syncHandoverObjectFromLinkedNode(sourceNodeId, targetNodeId) {
  const sourceNode = getNodeById(sourceNodeId);
  const targetNode = getNodeById(targetNodeId);
  let handoverNode = null;
  let objectNode = null;
  if (sourceNode?.type === "handover") {
    handoverNode = sourceNode;
    objectNode = targetNode;
  } else if (targetNode?.type === "handover") {
    handoverNode = targetNode;
    objectNode = sourceNode;
  } else {
    return false;
  }
  if (!handoverNode || !objectNode) return false;
  let changed = false;
  let nextRole = "reference";
  const linkedProjectWorkspace = currentWorkspaceKind === "collab"
    ? getUniqueNonCollabWorkspaceForNode(objectNode.id)
    : null;
  if (
    currentWorkspaceKind === "collab" &&
    linkedProjectWorkspace &&
    isValidHandoverObjectNodeForRole(objectNode, "context")
  ) {
    nextRole = "context";
  }
  const existingObject = getHandoverObjects(handoverNode).find((handoverObject) => handoverObject.id === objectNode.id) || null;
  if (existingObject) {
    if (existingObject.role !== nextRole && nextRole === "context") {
      handoverNode.handoverObjects = getHandoverObjects(handoverNode).map((handoverObject) => {
        if (handoverObject.id === objectNode.id) {
          return {
            ...handoverObject,
            role: "context"
          };
        }
        if (handoverObject.role === "context") {
          return {
            ...handoverObject,
            role: "reference"
          };
        }
        return handoverObject;
      });
      changed = true;
    }
  } else if (addHandoverObjectIdEntry(handoverNode, objectNode.id, nextRole)) {
    changed = true;
  }
  if (nextRole === "context" && linkedProjectWorkspace) {
    if (handoverNode.sourceWorkspaceId !== linkedProjectWorkspace.id) {
      handoverNode.sourceWorkspaceId = linkedProjectWorkspace.id;
      changed = true;
    }
  }
  return changed;
}

function getGlobalNodeById(nodeId) {
  return allNodesRuntime.find((node) => node.id === nodeId) || null;
}

function getGlobalDirectlyLinkedNodeIds(nodeId) {
  if (!nodeId) return [];
  const seenIds = new Set();
  const linkedIds = [];
  allEdgesRuntime.forEach((edge) => {
    if (!edge) return;
    if (edge.sourceId === nodeId && edge.targetId && !seenIds.has(edge.targetId)) {
      seenIds.add(edge.targetId);
      linkedIds.push(edge.targetId);
      return;
    }
    if (edge.targetId === nodeId && edge.sourceId && !seenIds.has(edge.sourceId)) {
      seenIds.add(edge.sourceId);
      linkedIds.push(edge.sourceId);
    }
  });
  return linkedIds;
}

function getGlobalHandoverObjectNodes(node) {
  if (!node || node.type !== "handover") return [];
  return getHandoverObjects(node)
    .map((handoverObject) => getGlobalNodeById(handoverObject.id))
    .filter((candidateNode) => !!candidateNode && isSelectableNode(candidateNode) && candidateNode.type !== "portal" && candidateNode.type !== "entity")
    .sort(compareNodesByDisplayLabel);
}

function getExpandedHandoverCollaboratorAccess(node) {
  if (!node || node.type !== "handover") return new Map();
  const accessByUserId = new Map();
  const rawCollaborators = Array.isArray(node.handoverCollaborators) ? node.handoverCollaborators : [];
  rawCollaborators.forEach((rawCollaborator) => {
    const collaborator = normalizeHandoverCollaboratorEntry(rawCollaborator);
    if (!collaborator) return;
    if (collaborator.kind === "user") {
      if (!userById.has(collaborator.refId) || collaborator.refId === node.ownerId || isAdminUserId(collaborator.refId)) return;
      const currentAccess = accessByUserId.get(collaborator.refId) || { shareWorkspace: false };
      accessByUserId.set(collaborator.refId, {
        shareWorkspace: currentAccess.shareWorkspace || !!collaborator.shareWorkspace
      });
      return;
    }
    if (collaborator.kind === "org") {
      users
        .filter((userRecord) => userRecord.orgId === collaborator.refId && userRecord.id !== node.ownerId && !isAdminUserId(userRecord.id))
        .forEach((userRecord) => {
          const currentAccess = accessByUserId.get(userRecord.id) || { shareWorkspace: false };
          accessByUserId.set(userRecord.id, {
            shareWorkspace: currentAccess.shareWorkspace || !!collaborator.shareWorkspace
          });
        });
    }
  });
  return accessByUserId;
}

function createProjectionEntityNode(workspaceRecord, sourceNode, entityKind, entityRefId, artifactRole = entityKind) {
  const entityNodeId = buildProjectionNodeId(workspaceRecord.id, artifactRole, entityRefId);
  const ownerRecord = sourceNode?.ownerId ? userById.get(sourceNode.ownerId) : null;
  const anchorNode = getAnyNodeById(buildCollaborationAnchorId(workspaceRecord.id));
  const anchorPos = anchorNode?.graphPos && Number.isFinite(anchorNode.graphPos.x) && Number.isFinite(anchorNode.graphPos.y)
    ? anchorNode.graphPos
    : getDefaultCollaborationGraphPos(workspaceRecord);
  const isOrg = entityKind === "org";
  return {
    id: entityNodeId,
    type: "entity",
    title: "",
    label: "",
    ownerId: sourceNode?.ownerId || workspaceRecord.ownerId || null,
    owner: ownerRecord?.name || sourceNode?.owner || workspaceRecord.ownerId || "Unknown",
    summary: isOrg ? "Projected collaborator organisation" : "Projected collaborator user",
    tasks: [],
    comments: [],
    locationId: null,
    entityKind,
    entityRefId,
    graphPos: {
      x: anchorPos.x + (isOrg ? 210 : 430),
      y: anchorPos.y
    },
    meta: {
      [HANDOVER_PROJECTION_META_KEY]: {
        autoManaged: true,
        workspaceOwnerId: workspaceRecord.ownerId || null,
        artifactRole
      }
    }
  };
}

function createProjectionPortalNode(workspaceRecord, sourceNode, sourceWorkspaceId) {
  if (!sourceWorkspaceId) return null;
  const portalNodeId = buildProjectionNodeId(workspaceRecord.id, "portal", sourceWorkspaceId);
  const ownerRecord = sourceNode?.ownerId ? userById.get(sourceNode.ownerId) : null;
  const anchorNode = getAnyNodeById(buildCollaborationAnchorId(workspaceRecord.id));
  const anchorPos = anchorNode?.graphPos && Number.isFinite(anchorNode.graphPos.x) && Number.isFinite(anchorNode.graphPos.y)
    ? anchorNode.graphPos
    : getDefaultCollaborationGraphPos(workspaceRecord);
  return {
    id: portalNodeId,
    type: "portal",
    title: "",
    label: "",
    ownerId: sourceNode?.ownerId || workspaceRecord.ownerId || null,
    owner: ownerRecord?.name || sourceNode?.owner || workspaceRecord.ownerId || "Unknown",
    summary: "Projected shared workspace portal",
    tasks: [],
    comments: [],
    locationId: null,
    linkedWorkspaceId: sourceWorkspaceId,
    graphPos: {
      x: anchorPos.x + 860,
      y: anchorPos.y + 30
    },
    meta: {
      [HANDOVER_PROJECTION_META_KEY]: {
        autoManaged: true,
        workspaceOwnerId: workspaceRecord.ownerId || null,
        artifactRole: "shared-portal"
      }
    }
  };
}

function ensureWorkspaceNodeMembership(workspaceRecord, nodeId) {
  if (!workspaceRecord || !nodeId) return;
  if (!Array.isArray(workspaceRecord.nodeIds)) {
    workspaceRecord.nodeIds = [];
  }
  if (!workspaceRecord.nodeIds.includes(nodeId)) {
    workspaceRecord.nodeIds.push(nodeId);
  }
}

function ensureWorkspaceEdgeMembership(workspaceRecord, edgeId) {
  if (!workspaceRecord || !edgeId) return;
  if (!Array.isArray(workspaceRecord.edgeIds)) {
    workspaceRecord.edgeIds = [];
  }
  if (!workspaceRecord.edgeIds.includes(edgeId)) {
    workspaceRecord.edgeIds.push(edgeId);
  }
}

function ensureProjectionEdge(workspaceRecord, handoverNode, sourceId, targetId) {
  if (!workspaceRecord || !handoverNode || !sourceId || !targetId || sourceId === targetId) return null;
  const sourceNode = getAnyNodeById(sourceId) || getNodeById(sourceId);
  const targetNode = getAnyNodeById(targetId) || getNodeById(targetId);
  if (!sourceNode || !targetNode) return null;
  return {
    id: buildProjectionEdgeId(workspaceRecord.id, handoverNode.id, sourceId, targetId),
    sourceId,
    targetId,
    kind: inferEdgeKindForPair(sourceNode, targetNode),
    meta: {
      [HANDOVER_PROJECTION_META_KEY]: {
        autoManaged: true,
        runtimeOnly: true,
        workspaceOwnerId: workspaceRecord.ownerId || null,
        sourceHandoverId: handoverNode.id,
        artifactRole: "projection-edge"
      }
    }
  };
}

function getCollaboratorRemovalEntryForUser(handoverNode, userId) {
  if (!handoverNode || handoverNode.type !== "handover" || !userId) return null;
  const directUserEntry = (Array.isArray(handoverNode.handoverCollaborators) ? handoverNode.handoverCollaborators : [])
    .map((entry) => normalizeHandoverCollaboratorEntry(entry))
    .find((entry) => entry?.kind === "user" && entry.refId === userId) || null;
  if (directUserEntry) return directUserEntry;
  const orgId = userById.get(userId || "")?.orgId || null;
  if (!orgId) return null;
  return (Array.isArray(handoverNode.handoverCollaborators) ? handoverNode.handoverCollaborators : [])
    .map((entry) => normalizeHandoverCollaboratorEntry(entry))
    .find((entry) => entry?.kind === "org" && entry.refId === orgId) || null;
}

function workspaceHasAuthoredEdgeBetweenNodes(workspaceRecord, nodeAId, nodeBId, options = {}) {
  if (!workspaceRecord || !nodeAId || !nodeBId || nodeAId === nodeBId) return false;
  const excludedEdgeId = options.excludeEdgeId || null;
  const scopedEdgeIds = new Set(Array.isArray(workspaceRecord.edgeIds) ? workspaceRecord.edgeIds : []);
  return allEdgesRuntime.some((edge) =>
    edge &&
    scopedEdgeIds.has(edge.id) &&
    (!edge.workspaceId || edge.workspaceId === workspaceRecord.id) &&
    edge.id !== excludedEdgeId &&
    (
      (edge.sourceId === nodeAId && edge.targetId === nodeBId) ||
      (edge.sourceId === nodeBId && edge.targetId === nodeAId)
    )
  );
}

function getCollaborationProjectionSpecs(workspaceRecord) {
  if (!workspaceRecord || normalizeWorkspaceKind(workspaceRecord.kind) !== "collab") return [];
  const viewerUserId = workspaceRecord.ownerId || null;
  if (!viewerUserId || isAdminUserId(viewerUserId)) return [];
  const projectionSpecs = [];
  allNodesRuntime
    .filter((node) => node && node.type === "handover")
    .forEach((handoverNode) => {
      const sourceWorkspaceId = getSourceWorkspaceIdForHandover(handoverNode);
      const sourceWorkspace = sourceWorkspaceId ? workspaceById.get(sourceWorkspaceId) || null : null;
      if (!sourceWorkspace) return;
      const collaboratorAccess = getExpandedHandoverCollaboratorAccess(handoverNode);
      if (!collaboratorAccess.size) return;
      if (normalizeWorkspaceKind(sourceWorkspace.kind) === "collab") {
        if (viewerUserId === handoverNode.ownerId) return;
        if (normalizeHandoverStatus(handoverNode.status) === "Draft") return;
        const accessRecord = collaboratorAccess.get(viewerUserId);
        if (!accessRecord) return;
        const removalEntry = getCollaboratorRemovalEntryForUser(handoverNode, viewerUserId);
        projectionSpecs.push({
          handoverNode,
          leadUserId: handoverNode.ownerId,
          includePortal: false,
          removeCollaborator: removalEntry
        });
        return;
      }
      if (viewerUserId === handoverNode.ownerId) {
        collaboratorAccess.forEach((_, collaboratorUserId) => {
          const removalEntry = getCollaboratorRemovalEntryForUser(handoverNode, collaboratorUserId);
          projectionSpecs.push({
            handoverNode,
            leadUserId: collaboratorUserId,
            includePortal: true,
            removeCollaborator: removalEntry
          });
        });
        return;
      }
      if (normalizeHandoverStatus(handoverNode.status) === "Draft") return;
      const accessRecord = collaboratorAccess.get(viewerUserId);
      if (!accessRecord) return;
      const removalEntry = getCollaboratorRemovalEntryForUser(handoverNode, viewerUserId);
      projectionSpecs.push({
        handoverNode,
        leadUserId: handoverNode.ownerId,
        includePortal: !!accessRecord.shareWorkspace,
        removeCollaborator: removalEntry
      });
    });
  return projectionSpecs;
}

function buildCollaborationProjectionOverlay(workspaceRecord, visibleNodeMap) {
  const overlayEdges = [];
  if (!workspaceRecord || normalizeWorkspaceKind(workspaceRecord.kind) !== "collab") {
    return { overlayEdges };
  }
  const anchorId = buildCollaborationAnchorId(workspaceRecord.id);
  const anchorNode = getAnyNodeById(anchorId);
  if (!anchorNode) return { overlayEdges };
  const addedNodeIds = new Set();
  const addedEdgeIds = new Set();

  const registerNode = (nodeRecord, metaPatch) => {
    if (!nodeRecord) return;
    if (!visibleNodeMap.has(nodeRecord.id)) {
      visibleNodeMap.set(nodeRecord.id, nodeRecord);
    }
    mergeProjectionNodeMeta(nodeRecord.id, metaPatch);
    addedNodeIds.add(nodeRecord.id);
  };

  const registerEdge = (edgeRecord, metaPatch) => {
    if (!edgeRecord || addedEdgeIds.has(edgeRecord.id)) return;
    overlayEdges.push(edgeRecord);
    setProjectionEdgeMeta(edgeRecord.id, metaPatch);
    addedEdgeIds.add(edgeRecord.id);
  };

  getCollaborationProjectionSpecs(workspaceRecord).forEach((spec) => {
    const handoverNode = spec.handoverNode;
    registerNode(handoverNode, {
      roles: ["projected-handover"],
      handoverIds: [handoverNode.id]
    });
    const leadUserNode = spec.leadUserId
      ? createProjectionEntityNode(workspaceRecord, handoverNode, "user", spec.leadUserId, `linked-user-${spec.leadUserId}`)
      : null;
    const leadOrgId = userById.get(spec.leadUserId || "")?.orgId || null;
    const leadOrgNode = leadOrgId
      ? createProjectionEntityNode(workspaceRecord, handoverNode, "org", leadOrgId, `linked-org-${leadOrgId}`)
      : null;
    const portalNode = spec.includePortal
      ? createProjectionPortalNode(workspaceRecord, handoverNode, getSourceWorkspaceIdForHandover(handoverNode))
      : null;
    const contextObject = getCurrentHandoverContextObject(handoverNode);
    const contextNode = contextObject ? getGlobalNodeById(contextObject.id) : null;
    let chainTargetId = handoverNode.id;

    if (leadOrgNode) {
      registerNode(leadOrgNode, {
        roles: ["projected-helper-entity"],
        handoverIds: [handoverNode.id],
        collaboratorKinds: ["org"],
        collaboratorRefIds: [leadOrgId]
      });
      registerEdge(
        ensureProjectionEdge(workspaceRecord, handoverNode, anchorId, leadOrgNode.id),
        {
          artifactRole: "collaboration-chain",
          sourceHandoverId: handoverNode.id
        }
      );
    }

    if (leadUserNode) {
      registerNode(leadUserNode, {
        roles: ["projected-helper-entity"],
        handoverIds: [handoverNode.id],
        collaboratorKinds: ["user"],
        collaboratorRefIds: [spec.leadUserId]
      });
      if (leadOrgNode) {
        registerEdge(
          ensureProjectionEdge(workspaceRecord, handoverNode, leadOrgNode.id, leadUserNode.id),
          {
            artifactRole: "collaboration-chain",
            sourceHandoverId: handoverNode.id
          }
        );
      } else {
        registerEdge(
          ensureProjectionEdge(workspaceRecord, handoverNode, anchorId, leadUserNode.id),
          {
            artifactRole: "collaboration-chain",
            sourceHandoverId: handoverNode.id
          }
        );
      }
      chainTargetId = leadUserNode.id;
    }

    if (contextNode) {
      registerNode(contextNode, {
        roles: ["handover-object", "handover-context"],
        handoverIds: [handoverNode.id],
        objectNodeIds: [contextNode.id]
      });
      if (!workspaceHasAuthoredEdgeBetweenNodes(workspaceRecord, chainTargetId, contextNode.id)) {
        registerEdge(
          ensureProjectionEdge(workspaceRecord, handoverNode, chainTargetId, contextNode.id),
          {
            artifactRole: "handover-context-chain",
            sourceHandoverId: handoverNode.id
          }
        );
      }
      chainTargetId = contextNode.id;
    }

    if (!workspaceHasAuthoredEdgeBetweenNodes(workspaceRecord, chainTargetId, handoverNode.id)) {
      registerEdge(
        {
          ...ensureProjectionEdge(workspaceRecord, handoverNode, chainTargetId, handoverNode.id),
          kind: contextNode ? getHandoverObjectEdgeKind("context") : inferEdgeKindForPair(
            getAnyNodeById(chainTargetId) || getNodeById(chainTargetId),
            handoverNode
          )
        },
        {
          artifactRole: contextNode ? "handover-context-link" : "handover-collaborator-link",
          sourceHandoverId: handoverNode.id,
          collaboratorKind: spec.removeCollaborator?.kind || null,
          collaboratorRefId: spec.removeCollaborator?.refId || null,
          role: contextNode ? "context" : null
        }
      );
    }

    if (portalNode) {
      registerNode(portalNode, {
        roles: ["projected-portal"],
        handoverIds: [handoverNode.id]
      });
      registerEdge(
        ensureProjectionEdge(workspaceRecord, handoverNode, handoverNode.id, portalNode.id),
        {
          artifactRole: "handover-portal-link",
          sourceHandoverId: handoverNode.id
        }
      );
    }

    getHandoverObjects(handoverNode).forEach((handoverObject) => {
      if (handoverObject.role === "context") return;
      const objectNode = getGlobalNodeById(handoverObject.id);
      if (!objectNode) return;
      registerNode(objectNode, {
        roles: ["handover-object"],
        handoverIds: [handoverNode.id],
        objectNodeIds: [objectNode.id]
      });
      if (workspaceHasAuthoredEdgeBetweenNodes(workspaceRecord, handoverNode.id, objectNode.id)) {
        return;
      }
      const direction = getProjectedObjectEdgeDirection(workspaceRecord, handoverNode.id, objectNode.id) || getDefaultHandoverObjectEdgeDirection(handoverObject.role);
      const sourceId = direction === "object_to_handover" ? objectNode.id : handoverNode.id;
      const targetId = direction === "object_to_handover" ? handoverNode.id : objectNode.id;
      registerEdge(
        {
          ...ensureProjectionEdge(workspaceRecord, handoverNode, sourceId, targetId),
          kind: getHandoverObjectEdgeKind(handoverObject.role)
        },
        {
          artifactRole: "handover-object-link",
          sourceHandoverId: handoverNode.id,
          objectNodeId: objectNode.id,
          direction,
          role: handoverObject.role
        }
      );
    });
  });

  return { overlayEdges };
}

function refreshAllHandoverDerivedState() {
  let changed = false;

  workspaces.forEach((workspaceRecord) => {
    const workspaceMeta = ensureWorkspaceMetaRecord(workspaceRecord);
    if (Object.prototype.hasOwnProperty.call(workspaceMeta, HANDOVER_PROJECTION_WORKSPACE_NODE_IDS_KEY)) {
      delete workspaceMeta[HANDOVER_PROJECTION_WORKSPACE_NODE_IDS_KEY];
      changed = true;
    }
    if (Object.prototype.hasOwnProperty.call(workspaceMeta, HANDOVER_PROJECTION_WORKSPACE_EDGE_IDS_KEY)) {
      delete workspaceMeta[HANDOVER_PROJECTION_WORKSPACE_EDGE_IDS_KEY];
      changed = true;
    }
    if (workspaceMeta.handoverView && typeof workspaceMeta.handoverView === "object") {
      Object.keys(workspaceMeta.handoverView).forEach((handoverId) => {
        const handoverNode = getAnyNodeById(handoverId);
        if (handoverNode?.type === "handover") return;
        delete workspaceMeta.handoverView[handoverId];
        changed = true;
      });
      if (!Object.keys(workspaceMeta.handoverView).length) {
        delete workspaceMeta.handoverView;
        changed = true;
      }
    }
  });

  const requiredCollaborationUserIds = new Set();
  allNodesRuntime
    .filter((node) => node && node.type === "handover")
    .forEach((handoverNode) => {
      const collaboratorAccess = getExpandedHandoverCollaboratorAccess(handoverNode);
      const sourceWorkspaceId = getSourceWorkspaceIdForHandover(handoverNode);
      const sourceWorkspace = sourceWorkspaceId ? workspaceById.get(sourceWorkspaceId) || null : null;
      const isProjectSource = !!sourceWorkspace && normalizeWorkspaceKind(sourceWorkspace.kind) !== "collab";
      if (sourceWorkspace) {
        const syncResult = syncProjectWorkspaceGraphForHandover(sourceWorkspace, handoverNode);
        if (syncResult.changedNodeData || syncResult.changedWorkspaceData) {
          changed = true;
        }
      }
      if (isCollabWorkspaceOnlyHandover(handoverNode) && syncCollabWorkspaceGraphForAllCollaborators(handoverNode)) {
        changed = true;
      }
      if (collaboratorAccess.size && isProjectSource && handoverNode.ownerId && userById.has(handoverNode.ownerId) && !isAdminUserId(handoverNode.ownerId)) {
        requiredCollaborationUserIds.add(handoverNode.ownerId);
      }
      if (normalizeHandoverStatus(handoverNode.status) !== "Draft") {
        collaboratorAccess.forEach((_, userId) => {
          if (userById.has(userId) && !isAdminUserId(userId)) {
            requiredCollaborationUserIds.add(userId);
          }
        });
      }
    });

  requiredCollaborationUserIds.forEach((userId) => {
    const existingWorkspace = getCollaborationWorkspaceRecordForUser(userId);
    if (existingWorkspace) return;
    if (ensureCollaborationWorkspaceForUser(userId)) {
      changed = true;
    }
  });

  if (changed) {
    syncNodeRuntimeAndStore();
    syncEdgeRuntimeAndStore();
    syncWorkspaceRuntimeAndStore();
  }
  return changed;
}

function getSharedWorkspaceOptionsForUser(userId) {
  if (!userId || isAdminUserId(userId)) return [];
  const sharedWorkspaceMap = new Map();
  allNodesRuntime
    .filter((node) => node && node.type === "handover" && normalizeHandoverStatus(node.status) !== "Draft")
    .forEach((handoverNode) => {
      const collaboratorAccess = getExpandedHandoverCollaboratorAccess(handoverNode);
      const accessRecord = collaboratorAccess.get(userId);
      if (!accessRecord?.shareWorkspace) return;
      const sourceWorkspaceId = getSourceWorkspaceIdForHandover(handoverNode);
      if (!sourceWorkspaceId) return;
      const sourceWorkspace = workspaceById.get(sourceWorkspaceId);
      if (!sourceWorkspace || sourceWorkspace.ownerId === userId || normalizeWorkspaceKind(sourceWorkspace.kind) === "collab") return;
      if (sharedWorkspaceMap.has(sourceWorkspace.id)) return;
      sharedWorkspaceMap.set(sourceWorkspace.id, {
        id: sourceWorkspace.id,
        name: sourceWorkspace.name || sourceWorkspace.id,
        kind: normalizeWorkspaceKind(sourceWorkspace.kind),
        ownerId: sourceWorkspace.ownerId || null,
        access: "shared",
        sharedByLabel: getUserDisplayNameWithOrg(sourceWorkspace.ownerId) || sourceWorkspace.ownerId || ""
      });
    });
  return [...sharedWorkspaceMap.values()];
}

function cycleProcessStatus(nodeId) {
  const node = getNodeById(nodeId);
  if (!node || node.type !== "process") return;
  const nextStatus = getNextProcessStatus(node.status);
  setProcessStatusById(nodeId, nextStatus);
  renderAll();
}

function createNodeAtWorldPosition(type, worldX, worldY) {
  const workspaceRecord = workspaceById.get(currentWorkspaceId || "");
  if (!workspaceRecord) return null;

  const normalizedType = normalizeNodeType(type);
  if (normalizedType === "collaboration") return null;
  const owner = getCurrentUserRecord();
  const nodeId = generateNodeId(normalizedType);
  const nodeTitle = "";
  const nextNode = {
    id: nodeId,
    type: normalizedType,
    title: nodeTitle,
    label: nodeTitle,
    ownerId: owner?.id || currentUserId || null,
    owner: owner?.name || "Unknown",
    summary: "Click to enter node description",
    tasks: [],
    comments: [],
    locationId: null,
    graphPos: {
      x: Number.isFinite(worldX) ? worldX : 0,
      y: Number.isFinite(worldY) ? worldY : 0
    }
  };

  if (normalizedType === "location") {
    nextNode.kind = "generic";
  }
  if (normalizedType === "process") {
    nextNode.status = "Planned";
  }
  if (normalizedType === "handover") {
    nextNode.status = "Draft";
    nextNode.handoverCollaborators = [];
    nextNode.handoverObjects = [];
    nextNode.sourceWorkspaceId = currentWorkspaceId || null;
    if (normalizeWorkspaceKind(workspaceRecord.kind) !== "collab") {
      const defaultContextId = typeof workspaceRecord.homeNodeId === "string" && workspaceRecord.homeNodeId && workspaceRecord.homeNodeId !== nodeId
        ? workspaceRecord.homeNodeId
        : null;
      const defaultContextNode = defaultContextId ? getAnyNodeById(defaultContextId) : null;
      if (defaultContextId && isValidHandoverObjectNodeForRole(defaultContextNode, "context")) {
        nextNode.handoverObjects.push({
          id: defaultContextId,
          role: "context"
        });
      }
    }
  }
  if (normalizedType === "portal") {
    nextNode.linkedWorkspaceId = null;
  }
  if (normalizedType === "entity") {
    nextNode.entityKind = null;
    nextNode.entityRefId = null;
  }

  allNodesRuntime.push(nextNode);
  if (!Array.isArray(workspaceRecord.nodeIds)) {
    workspaceRecord.nodeIds = [];
  }
  if (!workspaceRecord.nodeIds.includes(nodeId)) {
    workspaceRecord.nodeIds.push(nodeId);
  }

  syncWorkspaceRuntimeAndStore();
  syncNodeRuntimeAndStore();
  persistStoreToLocalStorage();

  suppressNextWorkspaceAutoFit = true;
  newNodeInlineEditId = (normalizedType === "portal" || normalizedType === "entity") ? null : nodeId;
  state.selectedNodeId = isSelectableNode(nextNode) ? nodeId : null;
  hasAppliedWorkspace = false;
  renderAll();
  return getNodeById(nodeId);
}

function shouldOpenCreateNodeMenuForTarget(target) {
  if (!(target instanceof Element)) return false;
  return !target.closest(
    ".node-card, .edge-line, .edge-hit, .edge-chevron, .lens-card, #workspaceMenu, .panel, .panel-pill, .notif-wrap, .layout-mode-controls, #mapCreateMenu, #edgeCreateHandle, #edgeActionMenu, #portalLinkModalOverlay, #entityLinkModalOverlay, .portal-link-modal, .portal-link-modal-overlay"
  );
}

function getNodeIdFromTarget(target) {
  if (!(target instanceof Element)) return null;
  const nodeCard = target.closest(".node-card");
  if (!nodeCard) return null;
  const nodeId = nodeCard.dataset.nodeId || "";
  return nodeById.has(nodeId) ? nodeId : null;
}

function closeCreateNodeMenu() {
  createNodeMenuOpen = false;
  createNodeMenuMode = "create";
  createNodeMenuNodeId = null;
  if (!createNodeMenuEl) return;
  createNodeMenuEl.classList.remove("is-open");
  createNodeMenuEl.setAttribute("aria-hidden", "true");
  createNodeMenuEl.innerHTML = "";
}

function clearEdgeHoverIntentTimer() {
  if (edgeHoverIntent.timerId !== null) {
    window.clearTimeout(edgeHoverIntent.timerId);
    edgeHoverIntent.timerId = null;
  }
}

function clearEdgeHoverIntent() {
  clearEdgeHoverIntentTimer();
  edgeHoverIntent = {
    armed: false,
    timerId: null,
    startedAt: 0,
    candidateNodeId: null,
    candidateAnchorX: 0,
    candidateAnchorY: 0,
    candidateAngleDeg: 0,
    startClientX: 0,
    startClientY: 0
  };
}

function clearEdgeActionIntentTimer() {
  if (edgeActionIntent.timerId !== null) {
    window.clearTimeout(edgeActionIntent.timerId);
    edgeActionIntent.timerId = null;
  }
}

function clearEdgeActionIntent() {
  clearEdgeActionIntentTimer();
  edgeActionIntent = {
    armed: false,
    timerId: null,
    edgeId: null,
    sourceId: null,
    targetId: null,
    startClientX: 0,
    startClientY: 0,
    candidateClientX: 0,
    candidateClientY: 0,
    startX: 0,
    startY: 0,
    controlX: 0,
    controlY: 0,
    endX: 0,
    endY: 0
  };
}

function clearEdgeActionHideTimer() {
  if (edgeActionHideTimerId !== null) {
    window.clearTimeout(edgeActionHideTimerId);
    edgeActionHideTimerId = null;
  }
}

function updateEdgeActionMenuVisual() {
  if (!edgeActionMenuEl || !edgeActionReverseBtnEl || !edgeActionDeleteBtnEl) return;
  if (!edgeActionMenuState.visible || !edgeActionMenuState.edgeId) {
    edgeActionMenuEl.classList.remove("is-visible");
    edgeActionMenuEl.setAttribute("aria-hidden", "true");
    return;
  }
  if (!edgeById.has(edgeActionMenuState.edgeId)) {
    hideEdgeActionMenu({ clearIntent: true });
    return;
  }
  const nx = Number.isFinite(edgeActionMenuState.normalX) ? edgeActionMenuState.normalX : 0;
  const ny = Number.isFinite(edgeActionMenuState.normalY) ? edgeActionMenuState.normalY : -1;
  const len = Math.sqrt((nx * nx) + (ny * ny)) || 1;
  const ux = nx / len;
  const uy = ny / len;
  const ax = edgeActionMenuState.anchorX;
  const ay = edgeActionMenuState.anchorY;
  edgeActionReverseBtnEl.style.left = `${ax - (ux * EDGE_ACTION_BUTTON_OFFSET_PX)}px`;
  edgeActionReverseBtnEl.style.top = `${ay - (uy * EDGE_ACTION_BUTTON_OFFSET_PX)}px`;
  edgeActionDeleteBtnEl.style.left = `${ax + (ux * EDGE_ACTION_BUTTON_OFFSET_PX)}px`;
  edgeActionDeleteBtnEl.style.top = `${ay + (uy * EDGE_ACTION_BUTTON_OFFSET_PX)}px`;
  edgeActionMenuEl.classList.add("is-visible");
  edgeActionMenuEl.setAttribute("aria-hidden", "false");
}

function showEdgeActionMenu(nextState) {
  edgeActionMenuState = {
    visible: true,
    edgeId: nextState?.edgeId || null,
    sourceId: nextState?.sourceId || null,
    targetId: nextState?.targetId || null,
    anchorX: Number.isFinite(nextState?.anchorX) ? nextState.anchorX : 0,
    anchorY: Number.isFinite(nextState?.anchorY) ? nextState.anchorY : 0,
    normalX: Number.isFinite(nextState?.normalX) ? nextState.normalX : 0,
    normalY: Number.isFinite(nextState?.normalY) ? nextState.normalY : -1
  };
  updateEdgeActionMenuVisual();
}

function hideEdgeActionMenu(options = {}) {
  clearEdgeActionHideTimer();
  if (options.keepPinned !== true) {
    edgeActionPinned = false;
  }
  edgeActionMenuState = {
    visible: false,
    edgeId: null,
    sourceId: null,
    targetId: null,
    anchorX: 0,
    anchorY: 0,
    normalX: 0,
    normalY: -1
  };
  updateEdgeActionMenuVisual();
  if (options.clearIntent !== false) {
    clearEdgeActionIntent();
  }
}

function scheduleEdgeActionHide() {
  clearEdgeActionHideTimer();
  if (edgeActionPinned) return;
  edgeActionHideTimerId = window.setTimeout(() => {
    edgeActionHideTimerId = null;
    if (edgeActionPinned) return;
    hideEdgeActionMenu({ clearIntent: false });
  }, EDGE_ACTION_HIDE_GRACE_MS);
}

function updateEdgeCreateHandleVisual() {
  if (!edgeCreateHandleEl) return;
  if (!edgeCreateHover.visible || !edgeCreateHover.nodeId || edgeCreateDraft.active) {
    edgeCreateHandleEl.classList.remove("is-visible");
    edgeCreateHandleEl.setAttribute("aria-hidden", "true");
    return;
  }
  edgeCreateHandleEl.style.left = `${edgeCreateHover.anchorX}px`;
  edgeCreateHandleEl.style.top = `${edgeCreateHover.anchorY}px`;
  edgeCreateHandleEl.style.transform = `translate(-50%, -50%) rotate(${edgeCreateHover.angleDeg}deg)`;
  edgeCreateHandleEl.classList.add("is-visible");
  edgeCreateHandleEl.setAttribute("aria-hidden", "false");
}

function setEdgeCreateHover(nextHover) {
  edgeCreateHover = {
    visible: !!nextHover?.visible,
    nodeId: nextHover?.nodeId || null,
    anchorX: Number.isFinite(nextHover?.anchorX) ? nextHover.anchorX : 0,
    anchorY: Number.isFinite(nextHover?.anchorY) ? nextHover.anchorY : 0,
    angleDeg: Number.isFinite(nextHover?.angleDeg) ? nextHover.angleDeg : 0
  };
  if (edgeCreateHover.visible) {
    hideEdgeActionMenu({ clearIntent: true });
  }
  updateEdgeCreateHandleVisual();
}

function clearEdgeCreateHover() {
  setEdgeCreateHover({ visible: false, nodeId: null, anchorX: 0, anchorY: 0, angleDeg: 0 });
}

function setEdgeCreateHighlight(nodeId, className, apply) {
  if (!nodeId) return;
  const card = lastRenderedCardsById.get(nodeId);
  if (card) {
    card.classList.toggle(className, !!apply);
  }
}

function applyEdgeCreateHighlights(sourceId, targetId) {
  if (edgeCreateHighlightedSourceId && edgeCreateHighlightedSourceId !== sourceId) {
    setEdgeCreateHighlight(edgeCreateHighlightedSourceId, "edge-create-source", false);
    edgeCreateHighlightedSourceId = null;
  }
  if (edgeCreateHighlightedTargetId && edgeCreateHighlightedTargetId !== targetId) {
    setEdgeCreateHighlight(edgeCreateHighlightedTargetId, "edge-create-target", false);
    edgeCreateHighlightedTargetId = null;
  }
  if (sourceId) {
    setEdgeCreateHighlight(sourceId, "edge-create-source", true);
    edgeCreateHighlightedSourceId = sourceId;
  }
  if (targetId) {
    setEdgeCreateHighlight(targetId, "edge-create-target", true);
    edgeCreateHighlightedTargetId = targetId;
  }
}

function clearEdgeCreateHighlights() {
  if (edgeCreateHighlightedSourceId) {
    setEdgeCreateHighlight(edgeCreateHighlightedSourceId, "edge-create-source", false);
    edgeCreateHighlightedSourceId = null;
  }
  if (edgeCreateHighlightedTargetId) {
    setEdgeCreateHighlight(edgeCreateHighlightedTargetId, "edge-create-target", false);
    edgeCreateHighlightedTargetId = null;
  }
}

function cancelEdgeCreateDraft(options = {}) {
  if (!edgeCreateDraft.active) return;
  edgeCreateDraft = {
    active: false,
    sourceId: null,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    targetId: null
  };
  clearEdgeCreateHighlights();
  if (options.clearHover !== false) {
    clearEdgeCreateHover();
  }
  if (options.redraw !== false) {
    requestRender({ edges: true });
  }
}

function cancelEdgeCreateInteractions(options = {}) {
  clearEdgeHoverIntent();
  if (edgeCreateDraft.active) {
    cancelEdgeCreateDraft({ clearHover: true, redraw: options.redraw !== false });
  } else if (options.clearHover !== false) {
    clearEdgeCreateHover();
  }
  cancelEdgeActionInteractions();
}

function cancelEdgeActionInteractions() {
  clearEdgeActionIntent();
  clearEdgeActionHideTimer();
  edgeActionPinned = false;
  hideEdgeActionMenu({ clearIntent: false });
}

function getWorldPointFromClient(clientX, clientY) {
  if (!viewportEl) return { worldX: 0, worldY: 0 };
  const viewportRect = viewportEl.getBoundingClientRect();
  const mx = clientX - viewportRect.left;
  const my = clientY - viewportRect.top;
  const zoom = Number.isFinite(camera.zoom) && camera.zoom > 0 ? camera.zoom : 1;
  return {
    worldX: (mx - camera.panX) / zoom,
    worldY: (my - camera.panY) / zoom
  };
}

function isPointNearNodeBorder(node, frame, worldX, worldY, thresholdPx = EDGE_HANDLE_BORDER_HIT_PX) {
  if (!node || !frame) return false;
  if (isRenderedCircularNode(node)) {
    const { cx, cy, radius } = getCircleMetrics(node, frame);
    const dx = worldX - cx;
    const dy = worldY - cy;
    const dist = Math.sqrt((dx * dx) + (dy * dy));
    const circleThresholdPx = (node.type === "portal" || isWorkspaceAnchorNode(node))
      ? (
        Number.isFinite(thresholdPx)
          ? Math.min(thresholdPx, EDGE_HANDLE_BORDER_HIT_PORTAL_PX)
          : EDGE_HANDLE_BORDER_HIT_PORTAL_PX
      )
      : thresholdPx;
    return Math.abs(dist - radius) <= circleThresholdPx;
  }
  if (isDiamondNodeType(node)) {
    const diamondThresholdPx = Number.isFinite(thresholdPx)
      ? Math.min(thresholdPx, EDGE_HANDLE_BORDER_HIT_ENTITY_PX)
      : EDGE_HANDLE_BORDER_HIT_ENTITY_PX;
    return isPointInsideDiamond(frame, worldX, worldY, diamondThresholdPx)
      && !isPointInsideDiamond(frame, worldX, worldY, -diamondThresholdPx);
  }
  if (
    worldX < frame.x - thresholdPx ||
    worldX > frame.x + frame.w + thresholdPx ||
    worldY < frame.y - thresholdPx ||
    worldY > frame.y + frame.h + thresholdPx
  ) {
    return false;
  }
  const distLeft = Math.abs(worldX - frame.x);
  const distRight = Math.abs(worldX - (frame.x + frame.w));
  const distTop = Math.abs(worldY - frame.y);
  const distBottom = Math.abs(worldY - (frame.y + frame.h));
  return Math.min(distLeft, distRight, distTop, distBottom) <= thresholdPx;
}

function isPointerNearAnyVisibleNodeBorder(clientX, clientY) {
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return false;
  if (!lastVisibleNodeFrames || !lastVisibleNodeFrames.size) return false;
  const { worldX, worldY } = getWorldPointFromClient(clientX, clientY);
  for (const [nodeId, frame] of lastVisibleNodeFrames.entries()) {
    const node = getNodeById(nodeId);
    if (!node || !frame) continue;
    if (isPointNearNodeBorder(node, frame, worldX, worldY, EDGE_HANDLE_BORDER_HIT_PX)) {
      return true;
    }
  }
  return false;
}

function getClosestPointAndNormalOnQuadratic(x1, y1, cx, cy, x2, y2, pointX, pointY) {
  let best = null;
  const SAMPLE_COUNT = 24;
  for (let index = 0; index <= SAMPLE_COUNT; index += 1) {
    const t = index / SAMPLE_COUNT;
    const sample = getQuadraticPointAndTangentAt(x1, y1, cx, cy, x2, y2, t);
    const dx = sample.px - pointX;
    const dy = sample.py - pointY;
    const distSq = (dx * dx) + (dy * dy);
    if (!best || distSq < best.distSq) {
      best = {
        t,
        distSq,
        px: sample.px,
        py: sample.py,
        tx: sample.tx,
        ty: sample.ty
      };
    }
  }
  if (!best) {
    return { px: x1, py: y1, normalX: 0, normalY: -1 };
  }
  const tangentLength = Math.sqrt((best.tx * best.tx) + (best.ty * best.ty)) || 1;
  return {
    px: best.px,
    py: best.py,
    normalX: -(best.ty / tangentLength),
    normalY: best.tx / tangentLength
  };
}

function buildEdgeActionCandidate(event, edgeMeta) {
  if (!event || !edgeMeta || !edgeMeta.edgeId) return null;
  const { worldX, worldY } = getWorldPointFromClient(event.clientX, event.clientY);
  const closest = getClosestPointAndNormalOnQuadratic(
    edgeMeta.startX,
    edgeMeta.startY,
    edgeMeta.controlX,
    edgeMeta.controlY,
    edgeMeta.endX,
    edgeMeta.endY,
    worldX,
    worldY
  );
  return {
    edgeId: edgeMeta.edgeId,
    sourceId: edgeMeta.sourceId,
    targetId: edgeMeta.targetId,
    clientX: event.clientX,
    clientY: event.clientY,
    anchorX: closest.px,
    anchorY: closest.py,
    normalX: closest.normalX,
    normalY: closest.normalY,
    startX: edgeMeta.startX,
    startY: edgeMeta.startY,
    controlX: edgeMeta.controlX,
    controlY: edgeMeta.controlY,
    endX: edgeMeta.endX,
    endY: edgeMeta.endY
  };
}

function isEdgeActionBlocked() {
  return (
    edgeCreateDraft.active ||
    isPanning ||
    dragState.isDragging ||
    resizeState.isResizing ||
    createNodeMenuOpen ||
    portalLinkModalState.open ||
    entityLinkModalState.open ||
    workspaceMenuOpen ||
    userMenuOpen
  );
}

function startEdgeActionIntent(candidate) {
  clearEdgeActionIntent();
  edgeActionIntent = {
    armed: true,
    timerId: null,
    edgeId: candidate.edgeId,
    sourceId: candidate.sourceId,
    targetId: candidate.targetId,
    startClientX: candidate.clientX,
    startClientY: candidate.clientY,
    candidateClientX: candidate.clientX,
    candidateClientY: candidate.clientY,
    startX: candidate.startX,
    startY: candidate.startY,
    controlX: candidate.controlX,
    controlY: candidate.controlY,
    endX: candidate.endX,
    endY: candidate.endY
  };
  edgeActionIntent.timerId = window.setTimeout(() => {
    edgeActionIntent.timerId = null;
    if (!edgeActionIntent.armed || isEdgeActionBlocked()) {
      return;
    }
    if (isPointerNearAnyVisibleNodeBorder(edgeActionIntent.candidateClientX, edgeActionIntent.candidateClientY)) {
      hideEdgeActionMenu({ clearIntent: true });
      return;
    }
    const candidateNow = buildEdgeActionCandidate(
      {
        clientX: edgeActionIntent.candidateClientX,
        clientY: edgeActionIntent.candidateClientY
      },
      {
        edgeId: edgeActionIntent.edgeId,
        sourceId: edgeActionIntent.sourceId,
        targetId: edgeActionIntent.targetId,
        startX: edgeActionIntent.startX,
        startY: edgeActionIntent.startY,
        controlX: edgeActionIntent.controlX,
        controlY: edgeActionIntent.controlY,
        endX: edgeActionIntent.endX,
        endY: edgeActionIntent.endY
      }
    );
    if (!candidateNow) return;
    showEdgeActionMenu(candidateNow);
  }, EDGE_ACTION_INTENT_DELAY_MS);
}

function updateEdgeActionIntent(candidate) {
  if (!candidate) {
    clearEdgeActionIntent();
    if (!edgeActionPinned) {
      scheduleEdgeActionHide();
    }
    return;
  }
  if (isPointerNearAnyVisibleNodeBorder(candidate.clientX, candidate.clientY)) {
    clearEdgeActionIntent();
    if (!edgeActionPinned) {
      hideEdgeActionMenu({ clearIntent: false });
    }
    return;
  }
  clearEdgeActionHideTimer();
  if (edgeActionMenuState.visible && edgeActionMenuState.edgeId === candidate.edgeId) {
    showEdgeActionMenu(candidate);
    return;
  }
  if (!edgeActionIntent.armed || edgeActionIntent.edgeId !== candidate.edgeId) {
    startEdgeActionIntent(candidate);
    return;
  }
  const dx = candidate.clientX - edgeActionIntent.startClientX;
  const dy = candidate.clientY - edgeActionIntent.startClientY;
  if (Math.sqrt((dx * dx) + (dy * dy)) > EDGE_HANDLE_INTENT_MOVE_PX) {
    startEdgeActionIntent(candidate);
    return;
  }
  edgeActionIntent.candidateClientX = candidate.clientX;
  edgeActionIntent.candidateClientY = candidate.clientY;
  edgeActionIntent.startX = candidate.startX;
  edgeActionIntent.startY = candidate.startY;
  edgeActionIntent.controlX = candidate.controlX;
  edgeActionIntent.controlY = candidate.controlY;
  edgeActionIntent.endX = candidate.endX;
  edgeActionIntent.endY = candidate.endY;
}

function getPortalBodyFrameFromWrapperFrame(node, frame, expandedLocationId = null) {
  if (!node || !frame) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  const size = getCardSize(node, expandedLocationId);
  const extents = getNodeOccupiedExtents(node, expandedLocationId);
  return {
    x: frame.x - extents.left - (size.width / 2),
    y: frame.y - extents.top - (size.height / 2),
    w: size.width,
    h: size.height
  };
}

function getPortalBodyFrame(node, frame, expandedLocationId = null) {
  if (!node || !frame || node.type !== "portal") {
    return frame || { x: 0, y: 0, w: 0, h: 0 };
  }
  const size = getCardSize(node, expandedLocationId);
  if (frame.w <= size.width && frame.h <= size.height) {
    return {
      x: frame.x,
      y: frame.y,
      w: size.width,
      h: size.height
    };
  }
  const cachedFrame = lastVisibleNodeBodyFrames.get(node.id);
  if (cachedFrame) {
    return cachedFrame;
  }
  return getPortalBodyFrameFromWrapperFrame(node, frame, expandedLocationId);
}

function getCircleMetrics(node, frame) {
  const circleFrame = node?.type === "portal"
    ? getPortalBodyFrame(node, frame)
    : frame;
  const diameter = Math.min(circleFrame.w, circleFrame.h);
  const radius = diameter / 2;
  return {
    cx: circleFrame.x + (circleFrame.w / 2),
    cy: circleFrame.y + (circleFrame.h / 2),
    radius
  };
}

function isPointInsideDiamond(frame, worldX, worldY, paddingPx = 0) {
  if (!frame) return false;
  const halfWidth = (frame.w / 2) + paddingPx;
  const halfHeight = (frame.h / 2) + paddingPx;
  if (!(halfWidth > 0) || !(halfHeight > 0)) return false;
  const centerX = frame.x + (frame.w / 2);
  const centerY = frame.y + (frame.h / 2);
  const normalized = (Math.abs(worldX - centerX) / halfWidth) + (Math.abs(worldY - centerY) / halfHeight);
  return normalized <= 1;
}

function getDiamondBorderAnchor(frame, towardX, towardY) {
  if (!frame) return { x: towardX, y: towardY };
  const centerX = frame.x + (frame.w / 2);
  const centerY = frame.y + (frame.h / 2);
  const dx = towardX - centerX;
  const dy = towardY - centerY;
  if (dx === 0 && dy === 0) {
    return { x: centerX, y: frame.y };
  }
  const halfWidth = Math.max(frame.w / 2, 1);
  const halfHeight = Math.max(frame.h / 2, 1);
  const scale = 1 / ((Math.abs(dx) / halfWidth) + (Math.abs(dy) / halfHeight) || 1);
  return {
    x: centerX + (dx * scale),
    y: centerY + (dy * scale)
  };
}

function getNodeVisualCenter(node, frame) {
  if (!node || !frame) return { x: 0, y: 0 };
  if (isRenderedCircularNode(node)) {
    const { cx, cy } = getCircleMetrics(node, frame);
    return { x: cx, y: cy };
  }
  return {
    x: frame.x + (frame.w / 2),
    y: frame.y + (frame.h / 2)
  };
}

function getBorderAnchorFromPointer(node, frame, worldX, worldY) {
  if (!node || !frame) return { x: worldX, y: worldY };
  if (isRenderedCircularNode(node)) {
    const { cx, cy, radius } = getCircleMetrics(node, frame);
    const dx = worldX - cx;
    const dy = worldY - cy;
    const len = Math.sqrt((dx * dx) + (dy * dy)) || 1;
    return {
      x: cx + ((dx / len) * radius),
      y: cy + ((dy / len) * radius)
    };
  }
  if (isDiamondNodeType(node)) {
    return getDiamondBorderAnchor(frame, worldX, worldY);
  }
  const left = frame.x;
  const right = frame.x + frame.w;
  const top = frame.y;
  const bottom = frame.y + frame.h;
  const distLeft = Math.abs(worldX - left);
  const distRight = Math.abs(worldX - right);
  const distTop = Math.abs(worldY - top);
  const distBottom = Math.abs(worldY - bottom);
  const minDist = Math.min(distLeft, distRight, distTop, distBottom);
  if (minDist === distLeft) {
    return { x: left, y: clamp(worldY, top, bottom) };
  }
  if (minDist === distRight) {
    return { x: right, y: clamp(worldY, top, bottom) };
  }
  if (minDist === distTop) {
    return { x: clamp(worldX, left, right), y: top };
  }
  return { x: clamp(worldX, left, right), y: bottom };
}

function getBorderAnchorToward(node, frame, towardX, towardY) {
  if (!node || !frame) return { x: towardX, y: towardY };
  if (isRenderedCircularNode(node)) {
    const { cx, cy, radius } = getCircleMetrics(node, frame);
    const dx = towardX - cx;
    const dy = towardY - cy;
    const len = Math.sqrt((dx * dx) + (dy * dy)) || 1;
    return {
      x: cx + ((dx / len) * radius),
      y: cy + ((dy / len) * radius)
    };
  }
  if (isDiamondNodeType(node)) {
    return getDiamondBorderAnchor(frame, towardX, towardY);
  }
  return getBorderPointToward(frame, towardX, towardY);
}

function getAnchorAngleFromCenter(node, frame, anchorX, anchorY) {
  const center = getNodeVisualCenter(node, frame);
  const cx = center.x;
  const cy = center.y;
  return Math.atan2(anchorY - cy, anchorX - cx) * (180 / Math.PI);
}

function resolveEdgeHoverCandidate(event) {
  if (!(event.target instanceof Element)) return null;
  if (event.target === edgeCreateHandleEl || event.target.closest("#edgeCreateHandle")) {
    if (edgeCreateHover.visible && edgeCreateHover.nodeId) {
      return {
        nodeId: edgeCreateHover.nodeId,
        anchorX: edgeCreateHover.anchorX,
        anchorY: edgeCreateHover.anchorY,
        angleDeg: edgeCreateHover.angleDeg,
        clientX: event.clientX,
        clientY: event.clientY
      };
    }
    return null;
  }
  const nodeId = getNodeIdFromTarget(event.target);
  if (!nodeId) return null;
  const node = getNodeById(nodeId);
  const frame = lastVisibleNodeFrames.get(nodeId);
  if (!node || !frame) return null;
  const { worldX, worldY } = getWorldPointFromClient(event.clientX, event.clientY);
  if (!isPointNearNodeBorder(node, frame, worldX, worldY, EDGE_HANDLE_BORDER_HIT_PX)) {
    return null;
  }
  const anchor = getBorderAnchorFromPointer(node, frame, worldX, worldY);
  return {
    nodeId,
    anchorX: anchor.x,
    anchorY: anchor.y,
    angleDeg: getAnchorAngleFromCenter(node, frame, anchor.x, anchor.y),
    clientX: event.clientX,
    clientY: event.clientY
  };
}

function startEdgeHoverIntent(candidate) {
  clearEdgeHoverIntent();
  edgeHoverIntent = {
    armed: true,
    timerId: null,
    startedAt: Date.now(),
    candidateNodeId: candidate.nodeId,
    candidateAnchorX: candidate.anchorX,
    candidateAnchorY: candidate.anchorY,
    candidateAngleDeg: candidate.angleDeg,
    startClientX: candidate.clientX,
    startClientY: candidate.clientY
  };
  edgeHoverIntent.timerId = window.setTimeout(() => {
    edgeHoverIntent.timerId = null;
    if (
      !edgeHoverIntent.armed ||
      edgeCreateDraft.active ||
      isPanning ||
      dragState.isDragging ||
      resizeState.isResizing ||
      createNodeMenuOpen ||
      workspaceMenuOpen ||
      userMenuOpen
    ) {
      return;
    }
    const frame = lastVisibleNodeFrames.get(edgeHoverIntent.candidateNodeId);
    if (!frame) return;
    setEdgeCreateHover({
      visible: true,
      nodeId: edgeHoverIntent.candidateNodeId,
      anchorX: edgeHoverIntent.candidateAnchorX,
      anchorY: edgeHoverIntent.candidateAnchorY,
      angleDeg: edgeHoverIntent.candidateAngleDeg
    });
  }, EDGE_HANDLE_INTENT_DELAY_MS);
}

function updateEdgeHoverIntent(candidate) {
  if (!candidate) {
    clearEdgeHoverIntent();
    clearEdgeCreateHover();
    return;
  }
  if (!edgeHoverIntent.armed || edgeHoverIntent.candidateNodeId !== candidate.nodeId) {
    clearEdgeCreateHover();
    startEdgeHoverIntent(candidate);
    return;
  }
  const dx = candidate.clientX - edgeHoverIntent.startClientX;
  const dy = candidate.clientY - edgeHoverIntent.startClientY;
  if (Math.sqrt((dx * dx) + (dy * dy)) > EDGE_HANDLE_INTENT_MOVE_PX) {
    clearEdgeCreateHover();
    startEdgeHoverIntent(candidate);
    return;
  }
  edgeHoverIntent.candidateAnchorX = candidate.anchorX;
  edgeHoverIntent.candidateAnchorY = candidate.anchorY;
  edgeHoverIntent.candidateAngleDeg = candidate.angleDeg;
  if (edgeCreateHover.visible && edgeCreateHover.nodeId === candidate.nodeId) {
    setEdgeCreateHover({
      visible: true,
      nodeId: candidate.nodeId,
      anchorX: candidate.anchorX,
      anchorY: candidate.anchorY,
      angleDeg: candidate.angleDeg
    });
  }
}

function generateGlobalEdgeId(sourceId, targetId, workspaceId = currentWorkspaceId) {
  return buildWorkspaceScopedEdgeId(sourceId, targetId, workspaceId || "workspace");
}

function workspaceHasEdgeBetweenNodes(workspaceRecord, nodeAId, nodeBId, options = {}) {
  if (!workspaceRecord || !Array.isArray(workspaceRecord.edgeIds) || !workspaceRecord.edgeIds.length) {
    return false;
  }
  if (!nodeAId || !nodeBId || nodeAId === nodeBId) return false;
  const excludedEdgeId = options.excludeEdgeId || null;
  const scopedIds = new Set(workspaceRecord.edgeIds);
  return allEdgesRuntime.some((edge) =>
    scopedIds.has(edge.id) &&
    (!edge.workspaceId || edge.workspaceId === workspaceRecord.id) &&
    edge.id !== excludedEdgeId &&
    (
      (edge.sourceId === nodeAId && edge.targetId === nodeBId) ||
      (edge.sourceId === nodeBId && edge.targetId === nodeAId)
    )
  );
}

function visibleEdgeExistsBetweenNodes(nodeAId, nodeBId, options = {}) {
  if (!nodeAId || !nodeBId || nodeAId === nodeBId) return false;
  const excludedEdgeId = options.excludeEdgeId || null;
  return edges.some((edge) =>
    edge &&
    edge.id !== excludedEdgeId &&
    (
      (edge.sourceId === nodeAId && edge.targetId === nodeBId) ||
      (edge.sourceId === nodeBId && edge.targetId === nodeAId)
    )
  );
}

function countWorkspaceReferencesForEdge(edgeId) {
  if (!edgeId) return 0;
  let count = 0;
  workspaces.forEach((workspace) => {
    if (Array.isArray(workspace.edgeIds) && workspace.edgeIds.includes(edgeId)) {
      count += 1;
    }
  });
  return count;
}

function createEdgeInCurrentWorkspace(sourceId, targetId) {
  const workspaceRecord = workspaceById.get(currentWorkspaceId || "");
  if (!workspaceRecord) return false;
  if (!sourceId || !targetId || sourceId === targetId) return false;
  if (!nodeById.has(sourceId) || !nodeById.has(targetId)) return false;
  const sourceNode = nodeById.get(sourceId);
  const targetNode = nodeById.get(targetId);
  if (!canCreateEdgeInCurrentWorkspace(sourceNode, targetNode)) return false;
  if (visibleEdgeExistsBetweenNodes(sourceId, targetId)) return false;
  const persistedSourceNode = getAnyNodeById(sourceId);
  const persistedTargetNode = getAnyNodeById(targetId);
  if (!persistedSourceNode || !persistedTargetNode) return false;
  if (!Array.isArray(workspaceRecord.edgeIds)) {
    workspaceRecord.edgeIds = [];
  }
  const nextEdge = {
    id: generateGlobalEdgeId(sourceId, targetId, workspaceRecord.id),
    sourceId,
    targetId,
    kind: inferEdgeKindForPair(sourceNode, targetNode),
    workspaceId: workspaceRecord.id
  };
  allEdgesRuntime.push(nextEdge);
  workspaceRecord.edgeIds.push(nextEdge.id);
  edges.push({ ...nextEdge });
  rebuildEdgeIndexes();
  syncEdgeRuntimeAndStore();
  syncWorkspaceRuntimeAndStore();
  const collaboratorChanged = syncHandoverCollaboratorFromLinkedEntity(sourceId, targetId);
  const handoverObjectChanged = syncHandoverObjectFromLinkedNode(sourceId, targetId);
  if (collaboratorChanged || handoverObjectChanged) {
    refreshAllHandoverDerivedState();
    syncNodeRuntimeAndStore();
    syncEdgeRuntimeAndStore();
    syncWorkspaceRuntimeAndStore();
  }
  persistStoreToLocalStorage();
  return true;
}

function syncHandoverStateForDeletedEdge(workspaceRecord, edgeRecord) {
  if (!workspaceRecord || !edgeRecord) {
    return { changed: false, allowProtectedDelete: false };
  }
  const sourceNode = getAnyNodeById(edgeRecord.sourceId);
  const targetNode = getAnyNodeById(edgeRecord.targetId);
  if (!sourceNode || !targetNode) {
    return { changed: false, allowProtectedDelete: false };
  }

  let changed = false;
  let allowProtectedDelete = false;

  const maybeHandoverNode = sourceNode.type === "handover" ? sourceNode : (targetNode.type === "handover" ? targetNode : null);
  const maybeOtherNode = maybeHandoverNode === sourceNode ? targetNode : (maybeHandoverNode === targetNode ? sourceNode : null);

  if (normalizeWorkspaceKind(workspaceRecord.kind) === "collab" && maybeHandoverNode && maybeOtherNode?.type === "entity") {
    const entityKind = normalizeEntityKind(maybeOtherNode.entityKind);
    const refId = typeof maybeOtherNode.entityRefId === "string" ? maybeOtherNode.entityRefId : "";
    if (entityKind && refId && removeHandoverCollaboratorEntry(maybeHandoverNode, entityKind, refId)) {
      changed = true;
      allowProtectedDelete = true;
    }
  }

  if (
    maybeHandoverNode &&
    maybeOtherNode &&
    isValidHandoverObjectNode(maybeOtherNode) &&
    removeHandoverObjectIdEntry(maybeHandoverNode, maybeOtherNode.id)
  ) {
    changed = true;
    allowProtectedDelete = true;
    if (normalizeWorkspaceKind(workspaceRecord.kind) === "collab" && isAutoManagedProjectionEdge(edgeRecord)) {
      setProjectionTrackedNodeIds(
        workspaceRecord,
        getProjectionTrackedNodeIds(workspaceRecord).filter((nodeId) => nodeId !== maybeOtherNode.id)
      );
      setProjectionTrackedEdgeIds(
        workspaceRecord,
        getProjectionTrackedEdgeIds(workspaceRecord).filter((candidateEdgeId) => candidateEdgeId !== edgeRecord.id)
      );
      ensureWorkspaceNodeMembership(workspaceRecord, maybeOtherNode.id);
    }
  }

  return { changed, allowProtectedDelete };
}

function demoteProjectedHandoverSubgraphInWorkspace(workspaceRecord, handoverNode, deletedEdgeId = null) {
  if (!workspaceRecord || !handoverNode || handoverNode.type !== "handover") return false;
  const trackedNodeIds = new Set(getProjectionTrackedNodeIds(workspaceRecord));
  const trackedEdgeIds = new Set(getProjectionTrackedEdgeIds(workspaceRecord));
  if (!trackedNodeIds.size && !trackedEdgeIds.size) return false;
  const scopedEdgeIds = new Set(Array.isArray(workspaceRecord.edgeIds) ? workspaceRecord.edgeIds : []);
  const preservedNodeIds = new Set([handoverNode.id]);
  const preservedEdgeIds = new Set();
  let changed = false;

  allEdgesRuntime.forEach((edge) => {
    if (!edge || !scopedEdgeIds.has(edge.id) || edge.id === deletedEdgeId) return;
    if (!isAutoManagedProjectionEdge(edge)) return;
    const projectionMeta = getHandoverProjectionMeta(edge);
    if (projectionMeta?.sourceHandoverId !== handoverNode.id) return;
    preservedEdgeIds.add(edge.id);
    preservedNodeIds.add(edge.sourceId);
    preservedNodeIds.add(edge.targetId);
    if (clearProjectionMeta(edge)) {
      changed = true;
    }
  });

  preservedNodeIds.forEach((nodeId) => {
    const node = getAnyNodeById(nodeId);
    if (node && clearProjectionMeta(node)) {
      changed = true;
    }
  });

  const nextTrackedNodeIds = [...trackedNodeIds].filter((nodeId) => !preservedNodeIds.has(nodeId));
  const nextTrackedEdgeIds = [...trackedEdgeIds].filter((edgeId) => !preservedEdgeIds.has(edgeId) && edgeId !== deletedEdgeId);
  if (nextTrackedNodeIds.length !== trackedNodeIds.size) {
    setProjectionTrackedNodeIds(workspaceRecord, nextTrackedNodeIds);
    changed = true;
  }
  if (nextTrackedEdgeIds.length !== trackedEdgeIds.size) {
    setProjectionTrackedEdgeIds(workspaceRecord, nextTrackedEdgeIds);
    changed = true;
  }

  preservedNodeIds.forEach((nodeId) => ensureWorkspaceNodeMembership(workspaceRecord, nodeId));
  preservedEdgeIds.forEach((edgeId) => ensureWorkspaceEdgeMembership(workspaceRecord, edgeId));
  return changed;
}

function syncHandoverStateForDeletedNode(workspaceRecord, node) {
  if (!workspaceRecord || !node) {
    return { changed: false, allowProtectedDelete: false, removedEdgeIds: new Set() };
  }
  const scopedEdgeIds = new Set(Array.isArray(workspaceRecord.edgeIds) ? workspaceRecord.edgeIds : []);
  const connectedEdges = allEdgesRuntime.filter((edge) =>
    edge &&
    scopedEdgeIds.has(edge.id) &&
    (edge.sourceId === node.id || edge.targetId === node.id)
  );
  let changed = false;
  let allowProtectedDelete = false;
  const removedEdgeIds = new Set();

  connectedEdges.forEach((edgeRecord) => {
    const syncResult = syncHandoverStateForDeletedEdge(workspaceRecord, edgeRecord);
    if (syncResult.changed) {
      changed = true;
    }
    if (syncResult.allowProtectedDelete) {
      allowProtectedDelete = true;
    }
    const sourceNode = getAnyNodeById(edgeRecord.sourceId);
    const targetNode = getAnyNodeById(edgeRecord.targetId);
    const handoverNode = sourceNode?.type === "handover" ? sourceNode : (targetNode?.type === "handover" ? targetNode : null);
    if (edgeRecord && isAutoManagedProjectionEdge(edgeRecord) && handoverNode) {
      demoteProjectedHandoverSubgraphInWorkspace(workspaceRecord, handoverNode, edgeRecord.id);
      allowProtectedDelete = true;
    }
    removedEdgeIds.add(edgeRecord.id);
  });

  return { changed, allowProtectedDelete, removedEdgeIds };
}

function getVisibleNodeRecord(nodeId) {
  return nodeById.get(nodeId) || getAnyNodeById(nodeId) || null;
}

function getWorkspaceConnectedAuthoredEdges(workspaceRecord, nodeId) {
  if (!workspaceRecord || !nodeId || !Array.isArray(workspaceRecord.edgeIds)) return [];
  return workspaceRecord.edgeIds
    .map((edgeId) => getWorkspaceAuthoredEdgeRecord(workspaceRecord, edgeId))
    .filter((edge) => !!edge && (edge.sourceId === nodeId || edge.targetId === nodeId));
}

function retainProjectedCollaboratorEntitiesInWorkspace(workspaceRecord, handoverNode, entityNode) {
  if (!workspaceRecord || !handoverNode || handoverNode.type !== "handover" || !entityNode || entityNode.type !== "entity") {
    return false;
  }
  if (normalizeWorkspaceKind(workspaceRecord.kind) !== "collab") return false;
  const entityKind = normalizeEntityKind(entityNode.entityKind);
  const refId = typeof entityNode.entityRefId === "string" ? entityNode.entityRefId : "";
  if (!entityKind || !refId) return false;
  const anchorNode = getAnyNodeById(buildCollaborationAnchorId(workspaceRecord.id));
  if (!anchorNode) return false;

  let changed = false;
  if (entityKind === "org") {
    const orgNode = createWorkspaceEntityNode(workspaceRecord, handoverNode, "org", refId);
    if (orgNode && ensureWorkspaceEdgeLink(workspaceRecord, anchorNode.id, orgNode.id)) {
      changed = true;
    }
    return changed;
  }

  const userRecord = userById.get(refId) || null;
  let orgNode = null;
  if (userRecord?.orgId) {
    orgNode = createWorkspaceEntityNode(workspaceRecord, handoverNode, "org", userRecord.orgId);
    if (orgNode && ensureWorkspaceEdgeLink(workspaceRecord, anchorNode.id, orgNode.id)) {
      changed = true;
    }
  }
  const userNode = createWorkspaceEntityNode(workspaceRecord, handoverNode, "user", refId);
  if (!userNode) return changed;
  if (orgNode) {
    if (ensureWorkspaceEdgeLink(workspaceRecord, orgNode.id, userNode.id)) {
      changed = true;
    }
  } else if (ensureWorkspaceEdgeLink(workspaceRecord, anchorNode.id, userNode.id)) {
    changed = true;
  }
  return changed;
}

function applyHandoverEffectsForEdgeUnlink(workspaceRecord, edgeRecord, options = {}) {
  if (!workspaceRecord || !edgeRecord) {
    return { changedNodeData: false, changedWorkspaceData: false };
  }
  const projectionMeta = options.projectionMeta || getCurrentProjectionEdgeMeta(edgeRecord.id);
  const sourceNode = getVisibleNodeRecord(edgeRecord.sourceId);
  const targetNode = getVisibleNodeRecord(edgeRecord.targetId);
  const handoverNode = sourceNode?.type === "handover" ? sourceNode : (targetNode?.type === "handover" ? targetNode : null);
  const otherNode = handoverNode === sourceNode ? targetNode : (handoverNode === targetNode ? sourceNode : null);
  if (!handoverNode || !otherNode) {
    return { changedNodeData: false, changedWorkspaceData: false };
  }

  let changedNodeData = false;
  let changedWorkspaceData = false;

  if (normalizeWorkspaceKind(workspaceRecord.kind) === "collab" && otherNode.type === "entity") {
    const entityKind = normalizeEntityKind(otherNode.entityKind);
    const refId = typeof otherNode.entityRefId === "string" ? otherNode.entityRefId : "";
    if (entityKind && refId && removeHandoverCollaboratorEntry(handoverNode, entityKind, refId)) {
      changedNodeData = true;
    }
    if (projectionMeta?.artifactRole === "handover-collaborator-link") {
      if (retainProjectedCollaboratorEntitiesInWorkspace(workspaceRecord, handoverNode, otherNode)) {
        changedWorkspaceData = true;
      }
    }
  }

  if (isValidHandoverObjectNode(otherNode) && removeHandoverObjectIdEntry(handoverNode, otherNode.id)) {
    changedNodeData = true;
  }
  if (isValidHandoverObjectNode(otherNode)) {
    if (clearProjectedObjectEdgeDirection(workspaceRecord, handoverNode.id, otherNode.id)) {
      changedWorkspaceData = true;
    }
    if (normalizeWorkspaceKind(workspaceRecord.kind) === "collab" && options.pinObjectNode !== false) {
      const hadMembership = Array.isArray(workspaceRecord.nodeIds) && workspaceRecord.nodeIds.includes(otherNode.id);
      ensureWorkspaceNodeMembership(workspaceRecord, otherNode.id);
      if (!hadMembership) {
        changedWorkspaceData = true;
      }
    }
  }

  return { changedNodeData, changedWorkspaceData };
}

function deleteEdgeFromCurrentWorkspace(edgeId) {
  const workspaceRecord = workspaceById.get(currentWorkspaceId || "");
  if (!workspaceRecord || !edgeId) return false;
  const edgeRecord = edgeById.get(edgeId) || null;
  if (!edgeRecord) return false;
  const projectionMeta = getCurrentProjectionEdgeMeta(edgeId);
  if (
    projectionMeta &&
    projectionMeta.artifactRole !== "handover-object-link" &&
    projectionMeta.artifactRole !== "handover-collaborator-link"
  ) {
    return false;
  }
  const authoredEdge = projectionMeta ? null : getWorkspaceAuthoredEdgeRecord(workspaceRecord, edgeId);
  if (!projectionMeta && !authoredEdge) return false;

  const unlinkResult = applyHandoverEffectsForEdgeUnlink(workspaceRecord, edgeRecord, { projectionMeta });

  if (!projectionMeta) {
    workspaceRecord.edgeIds = workspaceRecord.edgeIds.filter((id) => id !== edgeId);
    if (countWorkspaceReferencesForEdge(edgeId) === 0) {
      allEdgesRuntime = allEdgesRuntime.filter((edge) => edge.id !== edgeId);
    }
  }

  if (unlinkResult.changedNodeData) {
    refreshAllHandoverDerivedState();
  }
  syncEdgeRuntimeAndStore();
  syncNodeRuntimeAndStore();
  syncWorkspaceRuntimeAndStore();
  persistStoreToLocalStorage();
  hasAppliedWorkspace = false;
  return true;
}

function reverseEdgeInCurrentWorkspace(edgeId) {
  const workspaceRecord = workspaceById.get(currentWorkspaceId || "");
  if (!workspaceRecord || !edgeId) return false;
  const visibleEdge = edgeById.get(edgeId) || null;
  if (!visibleEdge) return false;
  const projectionMeta = getCurrentProjectionEdgeMeta(edgeId);
  if (projectionMeta) {
    if (projectionMeta.artifactRole !== "handover-object-link") return false;
    const handoverId = projectionMeta.sourceHandoverId || null;
    const objectNodeId = projectionMeta.objectNodeId || null;
    if (!handoverId || !objectNodeId) return false;
    const nextDirection = visibleEdge.sourceId === handoverId
      ? "object_to_handover"
      : "handover_to_object";
    if (!setProjectedObjectEdgeDirection(workspaceRecord, handoverId, objectNodeId, nextDirection)) {
      return false;
    }
    syncWorkspaceRuntimeAndStore();
    persistStoreToLocalStorage();
    hasAppliedWorkspace = false;
    return true;
  }
  if (!Array.isArray(workspaceRecord.edgeIds) || !workspaceRecord.edgeIds.includes(edgeId)) {
    return false;
  }
  const edgeRecord = getWorkspaceAuthoredEdgeRecord(workspaceRecord, edgeId);
  if (!edgeRecord || !edgeRecord.sourceId || !edgeRecord.targetId) return false;
  const reversedSourceNode = getVisibleNodeRecord(edgeRecord.targetId);
  const reversedTargetNode = getVisibleNodeRecord(edgeRecord.sourceId);
  if (!canCreateEdgeInCurrentWorkspace(reversedSourceNode, reversedTargetNode)) return false;
  if (
    visibleEdgeExistsBetweenNodes(edgeRecord.targetId, edgeRecord.sourceId, { excludeEdgeId: edgeRecord.id })
  ) {
    return false;
  }
  const nextSourceId = edgeRecord.targetId;
  const nextTargetId = edgeRecord.sourceId;
  edgeRecord.sourceId = nextSourceId;
  edgeRecord.targetId = nextTargetId;
  edgeRecord.kind = inferEdgeKindForPair(reversedSourceNode, reversedTargetNode);
  edgeRecord.workspaceId = workspaceRecord.id;

  syncEdgeRuntimeAndStore();
  syncWorkspaceRuntimeAndStore();
  persistStoreToLocalStorage();
  hasAppliedWorkspace = false;
  return true;
}

function requestEdgeDelete(edgeId) {
  if (!edgeId) return;
  const deleted = deleteEdgeFromCurrentWorkspace(edgeId);
  if (!deleted) return;
  hideEdgeActionMenu({ clearIntent: true });
  renderAll();
}

function requestEdgeReverse(edgeId) {
  if (!edgeId) return;
  const reversed = reverseEdgeInCurrentWorkspace(edgeId);
  if (!reversed) return;
  hideEdgeActionMenu({ clearIntent: true });
  renderAll();
}

function updateEdgeDraftFromPointer(event) {
  if (!edgeCreateDraft.active) return false;
  const { worldX, worldY } = getWorldPointFromClient(event.clientX, event.clientY);
  edgeCreateDraft.endX = worldX;
  edgeCreateDraft.endY = worldY;
  edgeCreateDraft.targetId = null;
  if (event.target instanceof Element) {
    const targetId = getNodeIdFromTarget(event.target);
    if (targetId && targetId !== edgeCreateDraft.sourceId) {
      const sourceNode = getNodeById(edgeCreateDraft.sourceId);
      const targetNode = getNodeById(targetId);
      const sourceFrame = lastVisibleNodeFrames.get(edgeCreateDraft.sourceId);
      const targetFrame = lastVisibleNodeFrames.get(targetId);
      if (sourceNode && targetNode && sourceFrame && targetFrame && canCreateEdgeInCurrentWorkspace(sourceNode, targetNode)) {
        const sourceCenter = getNodeVisualCenter(sourceNode, sourceFrame);
        const sourceCx = sourceCenter.x;
        const sourceCy = sourceCenter.y;
        const targetAnchor = getBorderAnchorToward(targetNode, targetFrame, sourceCx, sourceCy);
        edgeCreateDraft.endX = targetAnchor.x;
        edgeCreateDraft.endY = targetAnchor.y;
        edgeCreateDraft.targetId = targetId;
      }
    }
  }
  applyEdgeCreateHighlights(edgeCreateDraft.sourceId, edgeCreateDraft.targetId);
  requestRender({ edges: true });
  return true;
}

function finalizeEdgeCreateDraft(event) {
  if (!edgeCreateDraft.active) return false;
  if (event && event.clientX !== undefined && event.clientY !== undefined) {
    updateEdgeDraftFromPointer(event);
  }
  const { sourceId, targetId } = edgeCreateDraft;
  const created = !!(sourceId && targetId && createEdgeInCurrentWorkspace(sourceId, targetId));
  cancelEdgeCreateDraft({ clearHover: true, redraw: true });
  if (created) {
    hasAppliedWorkspace = false;
    renderAll();
  }
  return created;
}

function getWorkspaceMembershipCount(nodeId) {
  if (!nodeId) return 0;
  let count = 0;
  workspaces.forEach((workspace) => {
    if (Array.isArray(workspace.nodeIds) && workspace.nodeIds.includes(nodeId)) {
      count += 1;
    }
  });
  return count;
}

function syncEdgeRuntimeAndStore() {
  if (!store) return;
  const persistedEdges = allEdgesRuntime.map((edge) => ({ ...edge }));
  store.edges = persistedEdges;
  store.edgesById = new Map(persistedEdges.map((edge) => [edge.id, edge]));
}

function sanitizeAfterNodeDelete() {
  hasAppliedWorkspace = false;
  if (state.selectedNodeId && !allNodesRuntime.some((node) => node.id === state.selectedNodeId)) {
    state.selectedNodeId = null;
    resetDetailsEditState();
  }
  if (newNodeInlineEditId && !allNodesRuntime.some((node) => node.id === newNodeInlineEditId)) {
    newNodeInlineEditId = null;
  }
  if (portalLinkModalState.open && portalLinkModalState.nodeId && !allNodesRuntime.some((node) => node.id === portalLinkModalState.nodeId)) {
    closePortalLinkModal({ keepNode: true });
  }
  if (entityLinkModalState.open && entityLinkModalState.nodeId && !allNodesRuntime.some((node) => node.id === entityLinkModalState.nodeId)) {
    closeEntityLinkModal({ keepNode: true });
  }
}

function refreshActiveCollaborationWorkspace() {
  if (currentWorkspaceKind !== "collab" || !currentWorkspaceId) return false;
  const workspaceRecord = workspaceById.get(currentWorkspaceId || "");
  if (!workspaceRecord) return false;
  applyWorkspaceData(currentWorkspaceId, { sanitizeState: true });
  const result = normalizeCollaborationWorkspaceSemantics();
  if (result.reloadWorkspace) {
    applyWorkspaceData(currentWorkspaceId, { sanitizeState: true });
  }
  appliedWorkspaceId = null;
  hasAppliedWorkspace = false;
  return !!result.changed || !!result.reloadWorkspace;
}

function deleteNodeFromCurrentWorkspace(nodeId) {
  const workspaceRecord = workspaceById.get(currentWorkspaceId || "");
  if (!workspaceRecord || !nodeId) return false;
  const node = getVisibleNodeRecord(nodeId);
  if (!node || isWorkspaceProtectedNode(workspaceRecord, node)) return false;
  if (!Array.isArray(workspaceRecord.nodeIds)) {
    workspaceRecord.nodeIds = [];
  }
  const hadNode = workspaceRecord.nodeIds.includes(nodeId);
  const projectionMeta = getCurrentProjectionNodeMeta(nodeId);
  const isProjectedHandoverObject = !!projectionMeta?.roles?.includes("handover-object");
  if (!hadNode && !isProjectedHandoverObject) return false;

  let changedNodeData = false;
  let changedWorkspaceData = false;
  const connectedEdges = getWorkspaceConnectedAuthoredEdges(workspaceRecord, nodeId);
  const pinConnectedObjects = node.type === "handover";
  connectedEdges.forEach((edgeRecord) => {
    const unlinkResult = applyHandoverEffectsForEdgeUnlink(workspaceRecord, edgeRecord, { pinObjectNode: pinConnectedObjects });
    if (unlinkResult.changedNodeData) {
      changedNodeData = true;
    }
    if (unlinkResult.changedWorkspaceData) {
      changedWorkspaceData = true;
    }
  });

  if (isProjectedHandoverObject && Array.isArray(projectionMeta.handoverIds)) {
    projectionMeta.handoverIds.forEach((handoverId) => {
      const handoverNode = getAnyNodeById(handoverId);
      if (handoverNode && removeHandoverObjectIdEntry(handoverNode, nodeId)) {
        changedNodeData = true;
      }
      if (clearProjectedObjectEdgeDirection(workspaceRecord, handoverId, nodeId)) {
        changedWorkspaceData = true;
      }
    });
  }

  workspaceRecord.nodeIds = workspaceRecord.nodeIds.filter((id) => id !== nodeId);
  if (!Array.isArray(workspaceRecord.edgeIds)) {
    workspaceRecord.edgeIds = [];
  }
  const removedEdgeIds = new Set(connectedEdges.map((edge) => edge.id));
  workspaceRecord.edgeIds = workspaceRecord.edgeIds.filter((edgeId) => !removedEdgeIds.has(edgeId));
  if (node.type === "handover") {
    if ((Array.isArray(node.handoverCollaborators) && node.handoverCollaborators.length) || getHandoverObjects(node).length) {
      node.handoverCollaborators = [];
      node.handoverObjects = [];
      changedNodeData = true;
    }
  }
  const hasRemainingMembership = workspaces.some((workspace) =>
    Array.isArray(workspace.nodeIds) && workspace.nodeIds.includes(nodeId)
  );
  if (!hasRemainingMembership) {
    allNodesRuntime = allNodesRuntime.filter((entry) => entry.id !== nodeId);
    allEdgesRuntime = allEdgesRuntime.filter((edge) => edge.sourceId !== nodeId && edge.targetId !== nodeId);
  } else {
    removedEdgeIds.forEach((edgeId) => {
      if (countWorkspaceReferencesForEdge(edgeId) === 0) {
        allEdgesRuntime = allEdgesRuntime.filter((edge) => edge.id !== edgeId);
      }
    });
  }
  if (changedNodeData || changedWorkspaceData || node.type === "handover") {
    refreshAllHandoverDerivedState();
  }
  syncNodeRuntimeAndStore();
  syncEdgeRuntimeAndStore();
  syncWorkspaceRuntimeAndStore();
  sanitizeAfterNodeDelete();
  persistStoreToLocalStorage();
  return true;
}

function deleteNodeGlobally(nodeId) {
  if (!nodeId) return false;
  const workspaceMemberships = workspaces.filter(
    (workspace) => Array.isArray(workspace.nodeIds) && workspace.nodeIds.includes(nodeId)
  );
  const nodeRecord = allNodesRuntime.find((node) => node.id === nodeId) || getNodeById(nodeId) || null;
  const nodeExists = !!nodeRecord || workspaceMemberships.length > 0;
  if (!nodeExists) return false;
  if (nodeRecord?.type === "collaboration" || isAutoManagedProjectionNode(nodeRecord) || workspaceMemberships.some((workspace) => workspace.homeNodeId === nodeId)) {
    return false;
  }

  allNodesRuntime = allNodesRuntime.filter((node) => node.id !== nodeId);
  const removedEdgeIds = new Set(
    allEdgesRuntime
      .filter((edge) => edge && (edge.sourceId === nodeId || edge.targetId === nodeId))
      .map((edge) => edge.id)
  );
  allEdgesRuntime = allEdgesRuntime.filter((edge) => !removedEdgeIds.has(edge.id));
  const remainingEdgeById = new Map(allEdgesRuntime.map((edge) => [edge.id, edge]));

  workspaces.forEach((workspace) => {
    if (Array.isArray(workspace.nodeIds)) {
      workspace.nodeIds = workspace.nodeIds.filter((id) => id !== nodeId);
    }
    if (Array.isArray(workspace.edgeIds)) {
      workspace.edgeIds = workspace.edgeIds.filter((edgeId) => {
        if (removedEdgeIds.has(edgeId)) return false;
        const edgeRecord = remainingEdgeById.get(edgeId);
        return !!edgeRecord && edgeRecord.sourceId !== nodeId && edgeRecord.targetId !== nodeId;
      });
    }
  });

  if (currentWorkspaceKind === "collab") {
    refreshActiveCollaborationWorkspace();
  }

  syncNodeRuntimeAndStore();
  syncEdgeRuntimeAndStore();
  syncWorkspaceRuntimeAndStore();
  sanitizeAfterNodeDelete();
  persistStoreToLocalStorage();
  return true;
}

function requestNodeDelete(nodeId) {
  const node = getNodeById(nodeId);
  if (!node) return;
  const workspaceRecord = workspaceById.get(currentWorkspaceId || "");
  if (workspaceRecord && isWorkspaceProtectedNode(workspaceRecord, node)) return;
  const projectionMeta = getCurrentProjectionNodeMeta(nodeId);
  if (currentWorkspaceKind === "collab" && projectionMeta?.roles?.includes("handover-object")) {
    const deletedProjectedObject = deleteNodeFromCurrentWorkspace(nodeId);
    if (!deletedProjectedObject) return;
    closeCreateNodeMenu();
    renderAll();
    return;
  }
  const membershipCount = getWorkspaceMembershipCount(nodeId);
  let deleted = false;

  if (membershipCount > 1) {
    const scope = window.prompt(
      `Delete "${node.label || node.id}" from current workspace only, or globally?\nType "w" for workspace-only or "g" for global delete.`,
      "w"
    );
    if (!scope) return;
    const normalizedScope = scope.trim().toLowerCase();
    if (normalizedScope === "g") {
      const confirmedGlobal = window.confirm(`Delete "${node.label || node.id}" globally from all workspaces?`);
      if (!confirmedGlobal) return;
      deleted = deleteNodeGlobally(nodeId);
      if (!deleted && currentWorkspaceKind === "collab") {
        refreshActiveCollaborationWorkspace();
        deleted = deleteNodeGlobally(nodeId);
      }
    } else if (normalizedScope === "w") {
      deleted = deleteNodeFromCurrentWorkspace(nodeId);
    } else {
      return;
    }
  } else {
    deleted = deleteNodeFromCurrentWorkspace(nodeId);
  }

  if (!deleted) return;
  closeCreateNodeMenu();
  renderAll();
}

function renderPortalLinkModal() {
  if (!portalLinkModalOverlayEl || !portalLinkModalEl || !portalLinkModalSelectEl || !portalLinkModalConfirmBtnEl) return;
  const isOpen = !!portalLinkModalState.open;
  portalLinkModalOverlayEl.classList.toggle("is-open", isOpen);
  portalLinkModalOverlayEl.setAttribute("aria-hidden", String(!isOpen));
  if (!isOpen) return;

  const portalNode = getNodeById(portalLinkModalState.nodeId);
  if (!portalNode || portalNode.type !== "portal") {
    portalLinkModalState.open = false;
    portalLinkModalState.nodeId = null;
    portalLinkModalState.selectedWorkspaceId = "";
    portalLinkModalState.flow = "edit";
    portalLinkModalOverlayEl.classList.remove("is-open");
    portalLinkModalOverlayEl.setAttribute("aria-hidden", "true");
    return;
  }

  const linkableWorkspaces = getLinkableWorkspaceOptionsForCurrentUser(currentWorkspaceId);
  const linkedWorkspaceId = typeof portalNode.linkedWorkspaceId === "string" ? portalNode.linkedWorkspaceId : "";
  let selectedWorkspaceId = portalLinkModalState.selectedWorkspaceId || "";
  if (!linkableWorkspaces.some((workspace) => workspace.id === selectedWorkspaceId)) {
    if (linkedWorkspaceId && linkableWorkspaces.some((workspace) => workspace.id === linkedWorkspaceId)) {
      selectedWorkspaceId = linkedWorkspaceId;
    } else {
      selectedWorkspaceId = linkableWorkspaces[0]?.id || "";
    }
    portalLinkModalState.selectedWorkspaceId = selectedWorkspaceId;
  }

  portalLinkModalSelectEl.innerHTML = "";
  if (!linkableWorkspaces.length) {
    const optionEl = document.createElement("option");
    optionEl.value = "";
    optionEl.textContent = "No destination workspaces available";
    portalLinkModalSelectEl.appendChild(optionEl);
    portalLinkModalSelectEl.value = "";
    portalLinkModalSelectEl.disabled = true;
    portalLinkModalConfirmBtnEl.disabled = true;
    portalLinkModalHintEl.textContent = "No other workspaces are currently available for this user.";
  } else {
    linkableWorkspaces.forEach((workspace) => {
      const optionEl = document.createElement("option");
      optionEl.value = workspace.id;
      optionEl.textContent = workspace.name || workspace.id;
      portalLinkModalSelectEl.appendChild(optionEl);
    });
    portalLinkModalSelectEl.disabled = false;
    portalLinkModalSelectEl.value = selectedWorkspaceId;
    portalLinkModalConfirmBtnEl.disabled = !selectedWorkspaceId;
    portalLinkModalHintEl.textContent = "Select a destination workspace.";
  }
}

function openPortalLinkModal(nodeId, options = {}) {
  const node = getNodeById(nodeId);
  if (!node || node.type !== "portal") return false;
  state.selectedNodeId = node.id;
  cancelEdgeCreateInteractions();
  closeCreateNodeMenu();
  workspaceMenuOpen = false;
  userMenuOpen = false;
  renderWorkspaceMenu();
  const linkableWorkspaces = getLinkableWorkspaceOptionsForCurrentUser(currentWorkspaceId);
  const existingLinkedWorkspaceId = typeof node.linkedWorkspaceId === "string" ? node.linkedWorkspaceId : "";
  let selectedWorkspaceId = "";
  if (existingLinkedWorkspaceId && linkableWorkspaces.some((workspace) => workspace.id === existingLinkedWorkspaceId)) {
    selectedWorkspaceId = existingLinkedWorkspaceId;
  } else {
    selectedWorkspaceId = linkableWorkspaces[0]?.id || "";
  }
  portalLinkModalState = {
    open: true,
    nodeId: node.id,
    selectedWorkspaceId,
    flow: options.flow || "edit"
  };
  renderPortalLinkModal();
  requestAnimationFrame(() => {
    if (!portalLinkModalState.open) return;
    if (!portalLinkModalSelectEl.disabled) {
      portalLinkModalSelectEl.focus();
      return;
    }
    portalLinkModalCloseBtnEl.focus();
  });
  return true;
}

function closePortalLinkModal(options = {}) {
  const keepNode = options.keepNode !== false;
  const modalNodeId = portalLinkModalState.nodeId;
  portalLinkModalState = {
    open: false,
    nodeId: null,
    selectedWorkspaceId: "",
    flow: "edit"
  };
  renderPortalLinkModal();
  if (!keepNode && modalNodeId) {
    deleteNodeFromCurrentWorkspace(modalNodeId);
  }
}

function confirmPortalLinkModal() {
  if (!portalLinkModalState.open) return;
  const node = getNodeById(portalLinkModalState.nodeId);
  if (!node || node.type !== "portal") {
    closePortalLinkModal({ keepNode: true });
    return;
  }
  const selectedWorkspaceId = String(portalLinkModalState.selectedWorkspaceId || "");
  const linkableWorkspaceIds = new Set(
    getLinkableWorkspaceOptionsForCurrentUser(currentWorkspaceId).map((workspace) => workspace.id)
  );
  if (!selectedWorkspaceId || !linkableWorkspaceIds.has(selectedWorkspaceId)) {
    return;
  }
  node.linkedWorkspaceId = selectedWorkspaceId;
  node.title = "";
  node.label = "";
  syncNodeRuntimeAndStore();
  persistStoreToLocalStorage();
  closePortalLinkModal({ keepNode: true });
  renderAll();
}

function cancelPortalLinkModalAndDeleteNode() {
  if (!portalLinkModalState.open) return;
  const nodeId = portalLinkModalState.nodeId;
  closePortalLinkModal({ keepNode: true });
  if (!nodeId) return;
  const deleted = deleteNodeFromCurrentWorkspace(nodeId);
  if (!deleted) return;
  closeCreateNodeMenu();
  renderAll();
}

function applyEntityLinkToNode(node, entityKind, entityRefId) {
  if (!node || node.type !== "entity") return false;
  const normalizedKind = normalizeEntityKind(entityKind);
  const displayName = getEntityDisplayName(normalizedKind, entityRefId);
  if (!normalizedKind || !entityRefId || !displayName) return false;
  let changed = false;
  if (node.entityKind !== normalizedKind) {
    node.entityKind = normalizedKind;
    changed = true;
  }
  if (node.entityRefId !== entityRefId) {
    node.entityRefId = entityRefId;
    changed = true;
  }
  if (node.meta && typeof node.meta === "object" && node.meta.suppressLegacyEntityLink) {
    delete node.meta.suppressLegacyEntityLink;
    if (!Object.keys(node.meta).length) {
      delete node.meta;
    }
    changed = true;
  }
  if (applyDerivedEntityIdentity(node)) {
    changed = true;
  }
  return changed;
}

function renderEntityLinkModal() {
  if (
    !entityLinkModalOverlayEl ||
    !entityLinkModalEl ||
    !entityLinkModalKindSelectEl ||
    !entityLinkModalRefSelectEl ||
    !entityLinkModalConfirmBtnEl
  ) {
    return;
  }
  const isOpen = !!entityLinkModalState.open;
  entityLinkModalOverlayEl.classList.toggle("is-open", isOpen);
  entityLinkModalOverlayEl.setAttribute("aria-hidden", String(!isOpen));
  if (!isOpen) return;

  const entityNode = getNodeById(entityLinkModalState.nodeId);
  if (!entityNode || entityNode.type !== "entity") {
    entityLinkModalState = {
      open: false,
      nodeId: null,
      selectedEntityKind: "user",
      selectedEntityRefId: "",
      flow: "edit"
    };
    entityLinkModalOverlayEl.classList.remove("is-open");
    entityLinkModalOverlayEl.setAttribute("aria-hidden", "true");
    return;
  }

  const selectedEntityKind = normalizeEntityKind(entityLinkModalState.selectedEntityKind) || "user";
  const entityOptions = getEntityOptionsForKind(selectedEntityKind);
  let selectedEntityRefId = entityLinkModalState.selectedEntityRefId || "";
  if (!entityOptions.some((option) => option.id === selectedEntityRefId)) {
    selectedEntityRefId = entityOptions[0]?.id || "";
    entityLinkModalState.selectedEntityRefId = selectedEntityRefId;
  }
  entityLinkModalState.selectedEntityKind = selectedEntityKind;

  entityLinkModalKindSelectEl.innerHTML = "";
  [
    { value: "user", label: "User" },
    { value: "org", label: "Organisation" }
  ].forEach((option) => {
    const optionEl = document.createElement("option");
    optionEl.value = option.value;
    optionEl.textContent = option.label;
    entityLinkModalKindSelectEl.appendChild(optionEl);
  });
  entityLinkModalKindSelectEl.value = selectedEntityKind;

  entityLinkModalRefSelectEl.innerHTML = "";
  if (!entityOptions.length) {
    const optionEl = document.createElement("option");
    optionEl.value = "";
    optionEl.textContent = selectedEntityKind === "org" ? "No organisations available" : "No users available";
    entityLinkModalRefSelectEl.appendChild(optionEl);
    entityLinkModalRefSelectEl.value = "";
    entityLinkModalRefSelectEl.disabled = true;
    entityLinkModalConfirmBtnEl.disabled = true;
    entityLinkModalHintEl.textContent = selectedEntityKind === "org"
      ? "No organisations are currently available."
      : "No users are currently available.";
  } else {
    entityOptions.forEach((option) => {
      const optionEl = document.createElement("option");
      optionEl.value = option.id;
      optionEl.textContent = option.label;
      entityLinkModalRefSelectEl.appendChild(optionEl);
    });
    entityLinkModalRefSelectEl.disabled = false;
    entityLinkModalRefSelectEl.value = selectedEntityRefId;
    entityLinkModalConfirmBtnEl.disabled = !selectedEntityRefId;
    entityLinkModalHintEl.textContent = "Select an existing user or organisation to link.";
  }
}

function openEntityLinkModal(nodeId, options = {}) {
  const node = getNodeById(nodeId);
  if (!node || node.type !== "entity") return false;
  state.selectedNodeId = node.id;
  cancelEdgeCreateInteractions();
  closeCreateNodeMenu();
  workspaceMenuOpen = false;
  userMenuOpen = false;
  renderWorkspaceMenu();
  const initialSelection = getInitialEntitySelectionForNode(node);
  entityLinkModalState = {
    open: true,
    nodeId: node.id,
    selectedEntityKind: initialSelection.entityKind,
    selectedEntityRefId: initialSelection.entityRefId,
    flow: options.flow || "edit"
  };
  renderEntityLinkModal();
  requestAnimationFrame(() => {
    if (!entityLinkModalState.open) return;
    if (!entityLinkModalRefSelectEl.disabled) {
      entityLinkModalRefSelectEl.focus();
      return;
    }
    entityLinkModalKindSelectEl.focus();
  });
  return true;
}

function closeEntityLinkModal(options = {}) {
  const keepNode = options.keepNode !== false;
  const modalNodeId = entityLinkModalState.nodeId;
  entityLinkModalState = {
    open: false,
    nodeId: null,
    selectedEntityKind: "user",
    selectedEntityRefId: "",
    flow: "edit"
  };
  renderEntityLinkModal();
  if (!keepNode && modalNodeId) {
    deleteNodeFromCurrentWorkspace(modalNodeId);
  }
}

function cancelEntityLinkModal() {
  if (entityLinkModalState.flow === "create") {
    cancelEntityLinkModalAndDeleteNode();
    return;
  }
  closeEntityLinkModal({ keepNode: true });
}

function confirmEntityLinkModal() {
  if (!entityLinkModalState.open) return;
  const node = getNodeById(entityLinkModalState.nodeId);
  if (!node || node.type !== "entity") {
    closeEntityLinkModal({ keepNode: true });
    return;
  }
  const selectedEntityKind = normalizeEntityKind(entityLinkModalState.selectedEntityKind);
  const selectedEntityRefId = String(entityLinkModalState.selectedEntityRefId || "");
  const optionIds = new Set(getEntityOptionsForKind(selectedEntityKind).map((option) => option.id));
  if (!selectedEntityKind || !selectedEntityRefId || !optionIds.has(selectedEntityRefId)) {
    return;
  }
  const changed = applyEntityLinkToNode(node, selectedEntityKind, selectedEntityRefId);
  if (changed) {
    syncNodeRuntimeAndStore();
    persistStoreToLocalStorage();
  }
  closeEntityLinkModal({ keepNode: true });
  renderAll();
}

function cancelEntityLinkModalAndDeleteNode() {
  if (!entityLinkModalState.open) return;
  const nodeId = entityLinkModalState.nodeId;
  closeEntityLinkModal({ keepNode: true });
  if (!nodeId) return;
  const deleted = deleteNodeFromCurrentWorkspace(nodeId);
  if (!deleted) return;
  closeCreateNodeMenu();
  renderAll();
}

function renderCollaboratorPickerModal() {
  if (
    !collaboratorPickerModalOverlayEl ||
    !collaboratorPickerModalEl ||
    !collaboratorPickerModalBodyEl ||
    !collaboratorPickerModalConfirmBtnEl
  ) {
    return;
  }
  const isOpen = !!collaboratorPickerModalState.open;
  collaboratorPickerModalOverlayEl.classList.toggle("is-open", isOpen);
  collaboratorPickerModalOverlayEl.setAttribute("aria-hidden", String(!isOpen));
  if (!isOpen) return;

  const handoverNode = getNodeById(collaboratorPickerModalState.nodeId);
  if (!handoverNode || handoverNode.type !== "handover" || !isNodeOwnedByCurrentUser(handoverNode)) {
    collaboratorPickerModalState = {
      open: false,
      nodeId: null,
      selectedCollaboratorKeys: []
    };
    collaboratorPickerModalOverlayEl.classList.remove("is-open");
    collaboratorPickerModalOverlayEl.setAttribute("aria-hidden", "true");
    return;
  }

  const groups = getCollaboratorPickerGroups(handoverNode);
  const validKeys = new Set(groups.flatMap((group) => group.options.map((option) => option.key)));
  collaboratorPickerModalState.selectedCollaboratorKeys = collaboratorPickerModalState.selectedCollaboratorKeys
    .filter((key) => validKeys.has(key));

  collaboratorPickerModalBodyEl.innerHTML = "";
  collaboratorPickerModalConfirmBtnEl.disabled = collaboratorPickerModalState.selectedCollaboratorKeys.length === 0;
  collaboratorPickerModalHintEl.textContent = groups.length
    ? "Select one or more users or organisations."
    : "All available collaborators have already been added.";

  if (!groups.length) {
    const emptyState = document.createElement("p");
    emptyState.className = "picker-modal-empty";
    emptyState.textContent = "No additional collaborators are available.";
    collaboratorPickerModalBodyEl.appendChild(emptyState);
    collaboratorPickerModalConfirmBtnEl.disabled = true;
    return;
  }

  groups.forEach((group) => {
    const groupEl = document.createElement("section");
    groupEl.className = "picker-modal-group";
    const titleEl = document.createElement("h4");
    titleEl.className = "picker-modal-group-title";
    titleEl.textContent = group.label;
    groupEl.appendChild(titleEl);
    group.options.forEach((option) => {
      const optionLabelEl = document.createElement("label");
      optionLabelEl.className = "picker-modal-option";
      const checkboxEl = document.createElement("input");
      checkboxEl.type = "checkbox";
      checkboxEl.checked = collaboratorPickerModalState.selectedCollaboratorKeys.includes(option.key);
      checkboxEl.addEventListener("change", () => {
        if (checkboxEl.checked) {
          if (!collaboratorPickerModalState.selectedCollaboratorKeys.includes(option.key)) {
            collaboratorPickerModalState.selectedCollaboratorKeys = [
              ...collaboratorPickerModalState.selectedCollaboratorKeys,
              option.key
            ];
          }
        } else {
          collaboratorPickerModalState.selectedCollaboratorKeys = collaboratorPickerModalState.selectedCollaboratorKeys
            .filter((selectedKey) => selectedKey !== option.key);
        }
        renderCollaboratorPickerModal();
      });
      const textWrapEl = document.createElement("span");
      textWrapEl.className = "picker-modal-option-text";
      textWrapEl.textContent = option.label;
      optionLabelEl.appendChild(checkboxEl);
      optionLabelEl.appendChild(textWrapEl);
      groupEl.appendChild(optionLabelEl);
    });
    collaboratorPickerModalBodyEl.appendChild(groupEl);
  });
}

function openCollaboratorPickerModal(nodeId) {
  const handoverNode = getNodeById(nodeId);
  if (!handoverNode || handoverNode.type !== "handover" || !isNodeOwnedByCurrentUser(handoverNode)) return false;
  collaboratorPickerModalState = {
    open: true,
    nodeId: handoverNode.id,
    selectedCollaboratorKeys: []
  };
  renderCollaboratorPickerModal();
  requestAnimationFrame(() => {
    if (!collaboratorPickerModalState.open) return;
    const firstInput = collaboratorPickerModalBodyEl.querySelector("input[type=\"checkbox\"]");
    if (firstInput) {
      firstInput.focus();
      return;
    }
    collaboratorPickerModalCloseBtnEl.focus();
  });
  return true;
}

function closeCollaboratorPickerModal() {
  collaboratorPickerModalState = {
    open: false,
    nodeId: null,
    selectedCollaboratorKeys: []
  };
  renderCollaboratorPickerModal();
}

function confirmCollaboratorPickerModal() {
  if (!collaboratorPickerModalState.open) return;
  const handoverNode = getNodeById(collaboratorPickerModalState.nodeId);
  if (!handoverNode || handoverNode.type !== "handover" || !isNodeOwnedByCurrentUser(handoverNode)) {
    closeCollaboratorPickerModal();
    return;
  }
  const optionByKey = new Map(
    getCollaboratorPickerGroups(handoverNode)
      .flatMap((group) => group.options)
      .map((option) => [option.key, option])
  );
  let changed = false;
  collaboratorPickerModalState.selectedCollaboratorKeys.forEach((selectedKey) => {
    const option = optionByKey.get(selectedKey);
    if (!option) return;
    if (addHandoverCollaborator(handoverNode.id, option.kind, option.refId)) {
      changed = true;
    }
  });
  closeCollaboratorPickerModal();
  if (changed) {
    renderAll();
    return;
  }
  renderDetailsPane();
}

function renderHandoverObjectPickerModal() {
  if (
    !handoverObjectPickerModalOverlayEl ||
    !handoverObjectPickerModalEl ||
    !handoverObjectPickerModalBodyEl ||
    !handoverObjectPickerModalConfirmBtnEl
  ) {
    return;
  }
  const isOpen = !!handoverObjectPickerModalState.open;
  handoverObjectPickerModalOverlayEl.classList.toggle("is-open", isOpen);
  handoverObjectPickerModalOverlayEl.setAttribute("aria-hidden", String(!isOpen));
  if (!isOpen) return;

  const handoverNode = getNodeById(handoverObjectPickerModalState.nodeId);
  if (!handoverNode || handoverNode.type !== "handover" || !isNodeOwnedByCurrentUser(handoverNode)) {
    handoverObjectPickerModalState = {
      open: false,
      nodeId: null,
      selectedNodeIds: [],
      selectedRole: "reference"
    };
    handoverObjectPickerModalOverlayEl.classList.remove("is-open");
    handoverObjectPickerModalOverlayEl.setAttribute("aria-hidden", "true");
    return;
  }

  const options = getHandoverObjectPickerOptions(
    handoverNode,
    normalizeHandoverObjectRole(handoverObjectPickerModalState.selectedRole)
  );
  const validNodeIds = new Set(options.map((option) => option.id));
  handoverObjectPickerModalState.selectedNodeIds = handoverObjectPickerModalState.selectedNodeIds
    .filter((nodeId) => validNodeIds.has(nodeId));

  handoverObjectPickerModalBodyEl.innerHTML = "";
  handoverObjectPickerModalConfirmBtnEl.disabled = handoverObjectPickerModalState.selectedNodeIds.length === 0;
  handoverObjectPickerModalHintEl.textContent = options.length
    ? "Select one or more objects to add explicitly."
    : "No additional objects are currently available.";

  if (!options.length) {
    const roleWrapEl = document.createElement("div");
    roleWrapEl.className = "picker-modal-group";
    const roleTitleEl = document.createElement("h4");
    roleTitleEl.className = "picker-modal-group-title";
    roleTitleEl.textContent = "Role";
    const roleSelectEl = document.createElement("select");
    roleSelectEl.className = "portal-link-modal-select";
    HANDOVER_OBJECT_ROLES.forEach((role) => {
      const optionEl = document.createElement("option");
      optionEl.value = role;
      optionEl.textContent = HANDOVER_OBJECT_ROLE_LABELS[role];
      roleSelectEl.appendChild(optionEl);
    });
    roleSelectEl.value = normalizeHandoverObjectRole(handoverObjectPickerModalState.selectedRole);
    roleSelectEl.disabled = true;
    roleWrapEl.appendChild(roleTitleEl);
    roleWrapEl.appendChild(roleSelectEl);
    handoverObjectPickerModalBodyEl.appendChild(roleWrapEl);
    const emptyState = document.createElement("p");
    emptyState.className = "picker-modal-empty";
    emptyState.textContent = "No additional objects can be added right now.";
    handoverObjectPickerModalBodyEl.appendChild(emptyState);
    handoverObjectPickerModalConfirmBtnEl.disabled = true;
    return;
  }

  const roleGroupEl = document.createElement("section");
  roleGroupEl.className = "picker-modal-group";
  const roleTitleEl = document.createElement("h4");
  roleTitleEl.className = "picker-modal-group-title";
  roleTitleEl.textContent = "Role";
  const roleSelectEl = document.createElement("select");
  roleSelectEl.className = "portal-link-modal-select";
  HANDOVER_OBJECT_ROLES.forEach((role) => {
    const optionEl = document.createElement("option");
    optionEl.value = role;
    optionEl.textContent = HANDOVER_OBJECT_ROLE_LABELS[role];
    roleSelectEl.appendChild(optionEl);
  });
  roleSelectEl.value = normalizeHandoverObjectRole(handoverObjectPickerModalState.selectedRole);
  roleSelectEl.addEventListener("change", () => {
    handoverObjectPickerModalState.selectedRole = normalizeHandoverObjectRole(roleSelectEl.value);
    renderHandoverObjectPickerModal();
  });
  roleGroupEl.appendChild(roleTitleEl);
  roleGroupEl.appendChild(roleSelectEl);
  handoverObjectPickerModalBodyEl.appendChild(roleGroupEl);

  const groupEl = document.createElement("section");
  groupEl.className = "picker-modal-group";
  const titleEl = document.createElement("h4");
  titleEl.className = "picker-modal-group-title";
  titleEl.textContent = "Objects";
  groupEl.appendChild(titleEl);
  options.forEach((optionNode) => {
    const optionLabelEl = document.createElement("label");
    optionLabelEl.className = "picker-modal-option";
    const checkboxEl = document.createElement("input");
    checkboxEl.type = "checkbox";
    checkboxEl.checked = handoverObjectPickerModalState.selectedNodeIds.includes(optionNode.id);
    checkboxEl.addEventListener("change", () => {
      if (checkboxEl.checked) {
        if (!handoverObjectPickerModalState.selectedNodeIds.includes(optionNode.id)) {
          handoverObjectPickerModalState.selectedNodeIds = [
            ...handoverObjectPickerModalState.selectedNodeIds,
            optionNode.id
          ];
        }
      } else {
        handoverObjectPickerModalState.selectedNodeIds = handoverObjectPickerModalState.selectedNodeIds
          .filter((selectedNodeId) => selectedNodeId !== optionNode.id);
      }
      renderHandoverObjectPickerModal();
    });
    const textWrapEl = document.createElement("span");
    textWrapEl.className = "picker-modal-option-text";
    textWrapEl.textContent = `${getNodeDisplayTitle(optionNode, { fallback: getNodeTitleFallback(optionNode) })} (${optionNode.type})`;
    optionLabelEl.appendChild(checkboxEl);
    optionLabelEl.appendChild(textWrapEl);
    groupEl.appendChild(optionLabelEl);
  });
  handoverObjectPickerModalBodyEl.appendChild(groupEl);
}

function openHandoverObjectPickerModal(nodeId) {
  const handoverNode = getNodeById(nodeId);
  if (!handoverNode || handoverNode.type !== "handover" || !isNodeOwnedByCurrentUser(handoverNode)) return false;
  handoverObjectPickerModalState = {
    open: true,
    nodeId: handoverNode.id,
    selectedNodeIds: [],
    selectedRole: "reference"
  };
  renderHandoverObjectPickerModal();
  requestAnimationFrame(() => {
    if (!handoverObjectPickerModalState.open) return;
    const firstInput = handoverObjectPickerModalBodyEl.querySelector("input[type=\"checkbox\"]");
    if (firstInput) {
      firstInput.focus();
      return;
    }
    handoverObjectPickerModalCloseBtnEl.focus();
  });
  return true;
}

function closeHandoverObjectPickerModal() {
  handoverObjectPickerModalState = {
    open: false,
    nodeId: null,
    selectedNodeIds: [],
    selectedRole: "reference"
  };
  renderHandoverObjectPickerModal();
}

function confirmHandoverObjectPickerModal() {
  if (!handoverObjectPickerModalState.open) return;
  const handoverNode = getNodeById(handoverObjectPickerModalState.nodeId);
  if (!handoverNode || handoverNode.type !== "handover" || !isNodeOwnedByCurrentUser(handoverNode)) {
    closeHandoverObjectPickerModal();
    return;
  }
  const changed = addHandoverObjectIds(
    handoverNode.id,
    handoverObjectPickerModalState.selectedNodeIds,
    handoverObjectPickerModalState.selectedRole
  );
  closeHandoverObjectPickerModal();
  if (changed) {
    renderAll();
    return;
  }
  renderDetailsPane();
}

function openConfirmationModal({ title, message, confirmLabel = "Delete", confirmTone = "delete", onConfirm = null }) {
  confirmationModalState = {
    open: true,
    title: String(title || "Confirm action"),
    message: String(message || ""),
    confirmLabel: String(confirmLabel || "Delete"),
    confirmTone,
    onConfirm: typeof onConfirm === "function" ? onConfirm : null
  };
  renderConfirmationModal();
  requestAnimationFrame(() => {
    if (!confirmationModalState.open) return;
    confirmationModalConfirmBtnEl.focus();
  });
}

function closeConfirmationModal() {
  resetConfirmationModalState();
  renderConfirmationModal();
}

function confirmConfirmationModal() {
  if (!confirmationModalState.open) return;
  const handler = confirmationModalState.onConfirm;
  closeConfirmationModal();
  if (typeof handler === "function") {
    handler();
  }
}

function renderConfirmationModal() {
  if (!confirmationModalOverlayEl || !confirmationModalEl) return;
  const isOpen = !!confirmationModalState.open;
  confirmationModalOverlayEl.classList.toggle("is-open", isOpen);
  confirmationModalOverlayEl.setAttribute("aria-hidden", String(!isOpen));
  if (!isOpen) return;
  confirmationModalTitleEl.textContent = confirmationModalState.title || "Confirm action";
  confirmationModalMessageEl.textContent = confirmationModalState.message || "";
  confirmationModalConfirmBtnEl.textContent = confirmationModalState.confirmLabel || "Delete";
  confirmationModalConfirmBtnEl.classList.toggle("is-danger", confirmationModalState.confirmTone === "delete");
}

function openAdminOrgModal() {
  if (!isAdminMode()) return false;
  adminOrgModalState.open = true;
  adminOrgModalState.renameOrgId = null;
  adminOrgModalState.renameDraft = "";
  renderAdminOrgModal();
  requestAnimationFrame(() => {
    if (!adminOrgModalState.open) return;
    adminOrgModalInputEl.focus();
  });
  return true;
}

function closeAdminOrgModal() {
  resetAdminOrgModalState();
  renderAdminOrgModal();
}

function renderAdminOrgModal() {
  if (!adminOrgModalOverlayEl || !adminOrgModalBodyEl || !adminOrgModalInputEl) return;
  const isOpen = !!adminOrgModalState.open && isAdminMode();
  adminOrgModalOverlayEl.classList.toggle("is-open", isOpen);
  adminOrgModalOverlayEl.setAttribute("aria-hidden", String(!isOpen));
  if (!isOpen) return;

  const sortedOrgs = getSortedOrgsForMenu();
  adminOrgModalInputEl.value = adminOrgModalState.draftName;
  adminOrgModalInputEl.onkeydown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    const trimmedName = String(adminOrgModalState.draftName || adminOrgModalInputEl.value || "").trim();
    if (!trimmedName) return;
    const nextOrgId = generateOrgId(trimmedName);
    orgs.push({ id: nextOrgId, name: trimmedName });
    syncOrgsRuntimeAndStore();
    adminOrgModalState.draftName = "";
    persistStoreToLocalStorage();
    renderAdminOrgModal();
    renderAll();
    requestAnimationFrame(() => adminOrgModalInputEl.focus());
  };

  adminOrgModalBodyEl.innerHTML = "";
  if (!sortedOrgs.length) {
    const emptyState = document.createElement("p");
    emptyState.className = "picker-modal-empty";
    emptyState.textContent = "No organisations yet.";
    adminOrgModalBodyEl.appendChild(emptyState);
    return;
  }

  sortedOrgs.forEach((orgRecord) => {
    const rowEl = document.createElement("div");
    rowEl.className = "workspace-menu-row admin-editor-row";
    const isRenaming = adminOrgModalState.renameOrgId === orgRecord.id;
    if (isRenaming) {
      const inputEl = document.createElement("input");
      inputEl.type = "text";
      inputEl.className = "workspace-rename-input";
      inputEl.maxLength = 80;
      inputEl.value = adminOrgModalState.renameDraft;
      inputEl.addEventListener("input", () => {
        adminOrgModalState.renameDraft = inputEl.value;
      });
      inputEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          if (renameOrganisationRecord(orgRecord.id, adminOrgModalState.renameDraft)) {
            adminOrgModalState.renameOrgId = null;
            adminOrgModalState.renameDraft = "";
            renderAll();
          } else {
            renderAdminOrgModal();
          }
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          adminOrgModalState.renameOrgId = null;
          adminOrgModalState.renameDraft = "";
          renderAdminOrgModal();
        }
      });
      inputEl.addEventListener("blur", () => {
        if (adminOrgModalState.renameOrgId !== orgRecord.id) return;
        adminOrgModalState.renameOrgId = null;
        adminOrgModalState.renameDraft = "";
        renderAdminOrgModal();
      });
      rowEl.appendChild(inputEl);
      requestAnimationFrame(() => {
        if (!inputEl.isConnected) return;
        inputEl.focus();
        inputEl.select();
      });
    } else {
      const labelEl = document.createElement("div");
      labelEl.className = "workspace-menu-item admin-editor-label";
      labelEl.textContent = orgRecord.name || orgRecord.id;
      rowEl.appendChild(labelEl);
      const actionsEl = document.createElement("div");
      actionsEl.className = "workspace-menu-item-actions";
      const renameBtnEl = document.createElement("button");
      renameBtnEl.type = "button";
      renameBtnEl.className = "workspace-row-icon-btn rename";
      renameBtnEl.setAttribute("aria-label", `Rename organisation ${orgRecord.name || orgRecord.id}`);
      renameBtnEl.textContent = "✎";
      renameBtnEl.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        adminOrgModalState.renameOrgId = orgRecord.id;
        adminOrgModalState.renameDraft = orgRecord.name || "";
        renderAdminOrgModal();
      });
      actionsEl.appendChild(renameBtnEl);
      const deleteBtnEl = document.createElement("button");
      deleteBtnEl.type = "button";
      deleteBtnEl.className = "workspace-row-icon-btn delete";
      deleteBtnEl.setAttribute("aria-label", `Delete organisation ${orgRecord.name || orgRecord.id}`);
      deleteBtnEl.textContent = "✕";
      deleteBtnEl.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openConfirmationModal({
          title: "Delete organisation?",
          message: `Deleting "${orgRecord.name || orgRecord.id}" will delete all its workspaces, nodes, and edges unless they are still shared elsewhere.`,
          confirmLabel: "Delete organisation",
          confirmTone: "delete",
          onConfirm: () => {
            if (!deleteOrganisationRecordById(orgRecord.id)) return;
            if (adminUserModalState.selectedOrgId === orgRecord.id) {
              adminUserModalState.selectedOrgId = "";
            }
            renderAll();
            renderAdminOrgModal();
            renderAdminUserModal();
          }
        });
      });
      actionsEl.appendChild(deleteBtnEl);
      rowEl.appendChild(actionsEl);
    }
    adminOrgModalBodyEl.appendChild(rowEl);
  });
}

function openAdminUserModal() {
  if (!isAdminMode()) return false;
  if (!adminUserModalState.selectedOrgId || !orgById.has(adminUserModalState.selectedOrgId)) {
    adminUserModalState.selectedOrgId = getSortedOrgsForMenu()[0]?.id || "";
  }
  adminUserModalState.open = true;
  adminUserModalState.renameUserId = null;
  adminUserModalState.renameDraft = "";
  renderAdminUserModal();
  requestAnimationFrame(() => {
    if (!adminUserModalState.open) return;
    if (!adminUserModalOrgSelectEl.disabled) {
      adminUserModalOrgSelectEl.focus();
    }
  });
  return true;
}

function closeAdminUserModal() {
  resetAdminUserModalState();
  renderAdminUserModal();
}

function renderAdminUserModal() {
  if (!adminUserModalOverlayEl || !adminUserModalBodyEl || !adminUserModalInputEl || !adminUserModalOrgSelectEl) return;
  const isOpen = !!adminUserModalState.open && isAdminMode();
  adminUserModalOverlayEl.classList.toggle("is-open", isOpen);
  adminUserModalOverlayEl.setAttribute("aria-hidden", String(!isOpen));
  if (!isOpen) return;

  const sortedOrgs = getSortedOrgsForMenu();
  if (!adminUserModalState.selectedOrgId || !sortedOrgs.some((orgRecord) => orgRecord.id === adminUserModalState.selectedOrgId)) {
    adminUserModalState.selectedOrgId = sortedOrgs[0]?.id || "";
  }

  adminUserModalOrgSelectEl.innerHTML = "";
  sortedOrgs.forEach((orgRecord) => {
    const optionEl = document.createElement("option");
    optionEl.value = orgRecord.id;
    optionEl.textContent = orgRecord.name || orgRecord.id;
    adminUserModalOrgSelectEl.appendChild(optionEl);
  });
  adminUserModalOrgSelectEl.disabled = sortedOrgs.length === 0;
  adminUserModalOrgSelectEl.value = adminUserModalState.selectedOrgId;

  adminUserModalInputEl.value = adminUserModalState.draftName;
  adminUserModalInputEl.disabled = !adminUserModalState.selectedOrgId;
  adminUserModalInputEl.onkeydown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    const trimmedName = String(adminUserModalState.draftName || adminUserModalInputEl.value || "").trim();
    if (!trimmedName || !adminUserModalState.selectedOrgId) return;
    const nextUserId = generateUserId(trimmedName);
    users.push({
      id: nextUserId,
      name: trimmedName,
      orgId: adminUserModalState.selectedOrgId
    });
    syncUsersRuntimeAndStore();
    adminUserModalState.draftName = "";
    persistStoreToLocalStorage();
    renderAdminUserModal();
    renderAll();
    requestAnimationFrame(() => adminUserModalInputEl.focus());
  };

  adminUserModalBodyEl.innerHTML = "";
  if (!sortedOrgs.length) {
    const emptyState = document.createElement("p");
    emptyState.className = "picker-modal-empty";
    emptyState.textContent = "Create an organisation first.";
    adminUserModalBodyEl.appendChild(emptyState);
    return;
  }

  const visibleUsers = getSortedUsersForMenu().filter((userRecord) => {
    if (isAdminUserId(userRecord.id)) return false;
    return userRecord.orgId === adminUserModalState.selectedOrgId;
  });
  if (!visibleUsers.length) {
    const emptyState = document.createElement("p");
    emptyState.className = "picker-modal-empty";
    emptyState.textContent = "No users in this organisation yet.";
    adminUserModalBodyEl.appendChild(emptyState);
    return;
  }

  visibleUsers.forEach((userRecord) => {
    const rowEl = document.createElement("div");
    rowEl.className = "workspace-menu-row admin-editor-row";
    const isRenaming = adminUserModalState.renameUserId === userRecord.id;
    if (isRenaming) {
      const inputEl = document.createElement("input");
      inputEl.type = "text";
      inputEl.className = "workspace-rename-input";
      inputEl.maxLength = 80;
      inputEl.value = adminUserModalState.renameDraft;
      inputEl.addEventListener("input", () => {
        adminUserModalState.renameDraft = inputEl.value;
      });
      inputEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          if (renameUserRecord(userRecord.id, adminUserModalState.renameDraft)) {
            adminUserModalState.renameUserId = null;
            adminUserModalState.renameDraft = "";
            renderAll();
          } else {
            renderAdminUserModal();
          }
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          adminUserModalState.renameUserId = null;
          adminUserModalState.renameDraft = "";
          renderAdminUserModal();
        }
      });
      inputEl.addEventListener("blur", () => {
        if (adminUserModalState.renameUserId !== userRecord.id) return;
        adminUserModalState.renameUserId = null;
        adminUserModalState.renameDraft = "";
        renderAdminUserModal();
      });
      rowEl.appendChild(inputEl);
      requestAnimationFrame(() => {
        if (!inputEl.isConnected) return;
        inputEl.focus();
        inputEl.select();
      });
    } else {
      const labelEl = document.createElement("div");
      labelEl.className = "workspace-menu-item admin-editor-label";
      labelEl.textContent = userRecord.name || userRecord.id;
      rowEl.appendChild(labelEl);
      const actionsEl = document.createElement("div");
      actionsEl.className = "workspace-menu-item-actions";
      const renameBtnEl = document.createElement("button");
      renameBtnEl.type = "button";
      renameBtnEl.className = "workspace-row-icon-btn rename";
      renameBtnEl.setAttribute("aria-label", `Rename user ${userRecord.name || userRecord.id}`);
      renameBtnEl.textContent = "✎";
      renameBtnEl.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        adminUserModalState.renameUserId = userRecord.id;
        adminUserModalState.renameDraft = userRecord.name || "";
        renderAdminUserModal();
      });
      actionsEl.appendChild(renameBtnEl);
      const deleteBtnEl = document.createElement("button");
      deleteBtnEl.type = "button";
      deleteBtnEl.className = "workspace-row-icon-btn delete";
      deleteBtnEl.setAttribute("aria-label", `Delete user ${userRecord.name || userRecord.id}`);
      deleteBtnEl.textContent = "✕";
      deleteBtnEl.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openConfirmationModal({
          title: "Delete user?",
          message: `Deleting "${userRecord.name || userRecord.id}" will delete all of their workspaces, nodes, and edges unless they are still shared elsewhere.`,
          confirmLabel: "Delete user",
          confirmTone: "delete",
          onConfirm: () => {
            if (!deleteUserRecordById(userRecord.id)) return;
            renderAll();
            renderAdminUserModal();
          }
        });
      });
      actionsEl.appendChild(deleteBtnEl);
      rowEl.appendChild(actionsEl);
    }
    adminUserModalBodyEl.appendChild(rowEl);
  });
}

function handlePortalDoubleClick(nodeId) {
  const node = getNodeById(nodeId);
  if (!node || node.type !== "portal") return;
  const linkedWorkspaceId = typeof node.linkedWorkspaceId === "string" ? node.linkedWorkspaceId : "";
  if (!linkedWorkspaceId) {
    openPortalLinkModal(node.id, { flow: "dblclick" });
    return;
  }
  const visibleWorkspaceIds = new Set(getWorkspaceOptionsForCurrentUser().map((workspace) => workspace.id));
  if (!visibleWorkspaceIds.has(linkedWorkspaceId)) {
    openPortalLinkModal(node.id, { flow: "dblclick" });
    return;
  }
  if (linkedWorkspaceId === currentWorkspaceId) return;
  cancelEdgeCreateInteractions();
  closeCreateNodeMenu();
  workspaceMenuOpen = false;
  userMenuOpen = false;
  resetWorkspaceCreateState();
  resetWorkspaceRenameState();
  currentWorkspaceId = linkedWorkspaceId;
  hasAppliedWorkspace = false;
  closePortalLinkModal({ keepNode: true });
  renderAll();
}

function requestNodeEdit(nodeId) {
  const node = getNodeById(nodeId);
  if (!node) return;
  if (node.type === "portal") {
    state.selectedNodeId = nodeId;
    openPortalLinkModal(node.id, { flow: "edit" });
    return;
  }
  if (node.type === "entity") {
    state.selectedNodeId = nodeId;
    openEntityLinkModal(node.id, { flow: "edit" });
    return;
  }
  if (node.type === "collaboration") {
    return;
  }
  state.selectedNodeId = nodeId;
  newNodeInlineEditId = nodeId;
  closeCreateNodeMenu();
  renderAll();
}

function openNodeActionMenu(clientX, clientY, nodeId) {
  cancelEdgeCreateInteractions();
  createNodeMenuOpen = true;
  createNodeMenuMode = "node";
  createNodeMenuNodeId = nodeId;
  createNodeMenuClientX = clientX;
  createNodeMenuClientY = clientY;
  renderCreateNodeMenu();
}

function renderCreateNodeMenu() {
  if (!createNodeMenuEl) return;
  if (!createNodeMenuOpen) {
    closeCreateNodeMenu();
    return;
  }

  createNodeMenuEl.innerHTML = "";
  if (createNodeMenuMode === "node") {
    const node = getNodeById(createNodeMenuNodeId);
    if (!node) {
      closeCreateNodeMenu();
      return;
    }

    if (node.type === "collaboration") {
      const label = document.createElement("button");
      label.type = "button";
      label.className = "map-create-menu-item";
      label.textContent = "Collaboration anchor";
      label.disabled = true;
      createNodeMenuEl.appendChild(label);
    } else {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "map-create-menu-item";
      editButton.textContent = (node.type === "portal" || node.type === "entity") ? "Edit link" : "Edit";
      editButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        requestNodeEdit(node.id);
      });
      createNodeMenuEl.appendChild(editButton);

      const workspaceRecord = getCurrentWorkspaceRecord();
      const canManageAnchor = !!workspaceRecord && normalizeWorkspaceKind(workspaceRecord.kind) !== "collab" && isSelectableNode(node);
      if (canManageAnchor) {
        const anchorButton = document.createElement("button");
        anchorButton.type = "button";
        anchorButton.className = "map-create-menu-item";
        anchorButton.textContent = workspaceRecord.homeNodeId === node.id ? "Clear workspace anchor" : "Set as workspace anchor";
        anchorButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const changed = workspaceRecord.homeNodeId === node.id
            ? clearCurrentWorkspaceAnchorNode()
            : setCurrentWorkspaceAnchorNode(node.id);
          if (!changed) return;
          closeCreateNodeMenu();
          renderAll();
        });
        createNodeMenuEl.appendChild(anchorButton);
      }

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "map-create-menu-item is-danger";
      deleteButton.textContent = "Delete";
      if (workspaceRecord && isWorkspaceProtectedNode(workspaceRecord, node)) {
        deleteButton.disabled = true;
        deleteButton.title = "Clear or replace the workspace anchor before deleting this node";
      }
      deleteButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        requestNodeDelete(node.id);
      });
      createNodeMenuEl.appendChild(deleteButton);
    }
  } else {
    CREATE_NODE_MENU_ITEMS.forEach((menuItem) => {
      const itemButton = document.createElement("button");
      itemButton.type = "button";
      itemButton.className = "map-create-menu-item";
      itemButton.textContent = menuItem.label;
      itemButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const createdNode = createNodeAtWorldPosition(menuItem.type, createNodeMenuWorldX, createNodeMenuWorldY);
        closeCreateNodeMenu();
        if (createdNode && createdNode.type === "portal") {
          openPortalLinkModal(createdNode.id, { flow: "create" });
        } else if (createdNode && createdNode.type === "entity") {
          openEntityLinkModal(createdNode.id, { flow: "create" });
        }
      });
      createNodeMenuEl.appendChild(itemButton);
    });
  }

  createNodeMenuEl.classList.add("is-open");
  createNodeMenuEl.setAttribute("aria-hidden", "false");
  createNodeMenuEl.style.left = `${createNodeMenuClientX}px`;
  createNodeMenuEl.style.top = `${createNodeMenuClientY}px`;

  const menuRect = createNodeMenuEl.getBoundingClientRect();
  const boundedX = Math.min(createNodeMenuClientX, window.innerWidth - menuRect.width - 8);
  const boundedY = Math.min(createNodeMenuClientY, window.innerHeight - menuRect.height - 8);
  createNodeMenuEl.style.left = `${Math.max(8, boundedX)}px`;
  createNodeMenuEl.style.top = `${Math.max(8, boundedY)}px`;
}

function openCreateNodeMenu(clientX, clientY, worldX, worldY) {
  cancelEdgeCreateInteractions();
  createNodeMenuOpen = true;
  createNodeMenuMode = "create";
  createNodeMenuNodeId = null;
  createNodeMenuClientX = clientX;
  createNodeMenuClientY = clientY;
  createNodeMenuWorldX = worldX;
  createNodeMenuWorldY = worldY;
  renderCreateNodeMenu();
}

function syncUsersRuntimeAndStore() {
  userById = new Map(users.map((user) => [user.id, user]));
  if (store) {
    store.users = users.map((user) => ({ ...user }));
    store.usersById = new Map(users.map((user) => [user.id, { ...user }]));
  }
}

function syncOrgsRuntimeAndStore() {
  orgById = new Map(orgs.map((org) => [org.id, org]));
  if (store) {
    store.orgs = orgs.map((org) => ({ ...org }));
    store.orgsById = new Map(orgs.map((org) => [org.id, { ...org }]));
  }
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

function generateOrgId(name) {
  const nameSlug = sanitizeWorkspaceSlug(name) || "org";
  let candidate = `org-${nameSlug}`;
  if (!orgById.has(candidate)) {
    return candidate;
  }
  const stamp = Date.now().toString(36);
  candidate = `org-${nameSlug}-${stamp}`;
  if (!orgById.has(candidate)) {
    return candidate;
  }
  let counter = 2;
  while (orgById.has(`${candidate}-${counter}`)) {
    counter += 1;
  }
  return `${candidate}-${counter}`;
}

function generateUserId(name) {
  const nameSlug = sanitizeWorkspaceSlug(name) || "user";
  let candidate = `user-${nameSlug}`;
  if (!userById.has(candidate)) {
    return candidate;
  }
  const stamp = Date.now().toString(36);
  candidate = `user-${nameSlug}-${stamp}`;
  if (!userById.has(candidate)) {
    return candidate;
  }
  let counter = 2;
  while (userById.has(`${candidate}-${counter}`)) {
    counter += 1;
  }
  return `${candidate}-${counter}`;
}

function toPersistableNode(node) {
  const clone = { ...node };
  delete clone.label;
  delete clone.owner;
  delete clone.linkedNodeIds;
  delete clone.handoverNodeIds;
  return clone;
}

function buildPersistableDataSnapshot() {
  return {
    meta: store && store.meta && typeof store.meta === "object" ? { ...store.meta } : {},
    users: users.map((user) => ({ ...user })),
    orgs: orgs.map((org) => ({ ...org })),
    nodes: allNodesRuntime.map((node) => toPersistableNode(node)),
    edges: allEdgesRuntime.map((edge) => ({ ...edge })),
    workspaces: workspaces.map((workspace) => ({ ...workspace }))
  };
}

function ensurePersistStatusBanner() {
  if (persistStatusBannerEl && persistStatusBannerEl.isConnected) return persistStatusBannerEl;
  if (!document.body) return null;
  const banner = document.createElement("div");
  banner.hidden = true;
  banner.style.position = "fixed";
  banner.style.top = "12px";
  banner.style.right = "12px";
  banner.style.zIndex = "9999";
  banner.style.maxWidth = "360px";
  banner.style.padding = "10px 12px";
  banner.style.borderRadius = "12px";
  banner.style.border = "1px solid rgba(180, 58, 58, 0.3)";
  banner.style.background = "rgba(122, 23, 23, 0.94)";
  banner.style.color = "#fff7f7";
  banner.style.fontSize = "12px";
  banner.style.lineHeight = "1.4";
  banner.style.boxShadow = "0 10px 28px rgba(0, 0, 0, 0.2)";
  banner.style.backdropFilter = "blur(8px)";
  document.body.appendChild(banner);
  persistStatusBannerEl = banner;
  return banner;
}

function renderPersistStatusBanner() {
  const banner = ensurePersistStatusBanner();
  if (!banner) return;
  if (!persistErrorMessage) {
    banner.hidden = true;
    banner.textContent = "";
    return;
  }
  banner.hidden = false;
  banner.textContent = persistErrorMessage;
}

async function persistStoreSnapshotToServer(payload) {
  const response = await fetch(STORE_API_ENDPOINT, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    cache: "no-store",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    let reason = `${response.status} ${response.statusText}`;
    try {
      const errorPayload = await response.json();
      if (errorPayload && typeof errorPayload.error === "string" && errorPayload.error.trim()) {
        reason = errorPayload.error.trim();
      }
    } catch (error) {
      // Ignore response parsing errors and keep the HTTP status text.
    }
    throw new Error(reason);
  }
}

function persistStoreToLocalStorage() {
  let payload = null;
  try {
    refreshAllHandoverDerivedState();
    payload = buildPersistableDataSnapshot();
  } catch (error) {
    persistErrorMessage = "Failed to build the canonical store snapshot.";
    renderPersistStatusBanner();
    console.warn("Failed to build canonical store payload.", error);
    return;
  }

  persistStoreRequestChain = persistStoreRequestChain
    .catch(() => {})
    .then(async () => {
      try {
        await persistStoreSnapshotToServer(payload);
        if (persistErrorMessage) {
          persistErrorMessage = "";
          renderPersistStatusBanner();
        }
      } catch (error) {
        persistErrorMessage = `Failed to save data to ${STORE_API_ENDPOINT}.`;
        renderPersistStatusBanner();
        console.warn("Failed to persist canonical store payload.", error);
      }
    });
}

function createWorkspaceForCurrentUser(name) {
  if (!currentUserId || isAdminMode()) return null;
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

function getOwnerFallbackLabel(node) {
  if (!node) return "Unknown";
  const deletedOwnerLabel = typeof node.meta?.deletedOwnerLabel === "string" ? node.meta.deletedOwnerLabel.trim() : "";
  if (deletedOwnerLabel) return deletedOwnerLabel;
  return node.ownerId || "Unknown";
}

function refreshRuntimeOwnerLabels() {
  allNodesRuntime.forEach((node) => {
    if (!node) return;
    if (node.ownerId && userById.has(node.ownerId)) {
      node.owner = userById.get(node.ownerId)?.name || node.ownerId;
      return;
    }
    node.owner = getOwnerFallbackLabel(node);
  });
}

function getTaskAssignmentLabelsForUserRecord(userRecord, overrideOrgName = null) {
  const labels = new Set();
  if (!userRecord) return labels;
  const userName = String(userRecord.name || "").trim();
  if (userName) {
    labels.add(userName);
  }
  const orgName = typeof overrideOrgName === "string"
    ? overrideOrgName.trim()
    : getOrgDisplayName(userRecord.orgId);
  if (userName && orgName) {
    labels.add(`${orgName} / ${userName}`);
  }
  return labels;
}

function getTaskAssignmentLabelsForOrgRecord(orgRecord) {
  const labels = new Set();
  const orgName = String(orgRecord?.name || "").trim();
  if (orgName) {
    labels.add(orgName);
  }
  return labels;
}

function rewriteTaskAssigneeLabels(labelMap) {
  if (!(labelMap instanceof Map) || !labelMap.size) return false;
  let changed = false;
  allNodesRuntime.forEach((node) => {
    if (!node || !Array.isArray(node.tasks)) return;
    node.tasks.forEach((task) => {
      const currentValue = String(task?.assignedTo || "").trim();
      if (!currentValue || !labelMap.has(currentValue)) return;
      const nextValue = labelMap.get(currentValue);
      if (typeof nextValue !== "string" || !nextValue.trim() || nextValue === task.assignedTo) return;
      task.assignedTo = nextValue;
      changed = true;
    });
  });
  return changed;
}

function removeTasksAssignedToLabels(labelsToDelete) {
  if (!(labelsToDelete instanceof Set) || !labelsToDelete.size) return false;
  const groupedTaskIds = new Set();
  const singleTasks = [];
  allNodesRuntime.forEach((node) => {
    if (!node || !Array.isArray(node.tasks)) return;
    node.tasks.forEach((task) => {
      const assignedTo = String(task?.assignedTo || "").trim();
      if (!assignedTo || !labelsToDelete.has(assignedTo)) return;
      if (task.taskGroupId) {
        groupedTaskIds.add(task.taskGroupId);
      } else if (task.id) {
        singleTasks.push({ nodeId: node.id, taskId: task.id });
      }
    });
  });

  let changed = false;
  groupedTaskIds.forEach((taskGroupId) => {
    if (removeTaskCopiesByGroupId(taskGroupId)) {
      changed = true;
    }
  });
  singleTasks.forEach(({ nodeId, taskId }) => {
    if (deleteTaskById(nodeId, taskId)) {
      changed = true;
    }
  });
  return changed;
}

function unlinkEntityNodeRecord(node) {
  if (!node || node.type !== "entity") return false;
  const preservedLabel = getNodeDisplayTitle(node, { fallback: getNodeTitleFallback(node) });
  let changed = false;
  if (!node.meta || typeof node.meta !== "object") {
    node.meta = {};
  }
  if (!node.meta.suppressLegacyEntityLink) {
    node.meta.suppressLegacyEntityLink = true;
    changed = true;
  }
  if (node.entityKind !== null) {
    node.entityKind = null;
    changed = true;
  }
  if (node.entityRefId !== null) {
    node.entityRefId = null;
    changed = true;
  }
  if (node.label !== preservedLabel) {
    node.label = preservedLabel;
    changed = true;
  }
  if (node.title !== preservedLabel) {
    node.title = preservedLabel;
    changed = true;
  }
  return changed;
}

function clearPortalLinksToWorkspaceIds(workspaceIds) {
  if (!(workspaceIds instanceof Set) || !workspaceIds.size) return false;
  let changed = false;
  allNodesRuntime.forEach((node) => {
    if (!node || node.type !== "portal") return;
    if (!workspaceIds.has(node.linkedWorkspaceId)) return;
    node.linkedWorkspaceId = null;
    changed = true;
  });
  return changed;
}

function removeDeletedCollaboratorsFromHandovers(deletedUserIds, deletedOrgIds) {
  let changed = false;
  allNodesRuntime.forEach((node) => {
    if (!node || node.type !== "handover" || !Array.isArray(node.handoverCollaborators)) return;
    const nextCollaborators = node.handoverCollaborators.filter((collaborator) => {
      if (collaborator?.kind === "user" && deletedUserIds.has(collaborator.refId)) return false;
      if (collaborator?.kind === "org" && deletedOrgIds.has(collaborator.refId)) return false;
      return true;
    });
    if (nextCollaborators.length !== node.handoverCollaborators.length) {
      node.handoverCollaborators = nextCollaborators;
      changed = true;
    }
  });
  return changed;
}

function disconnectDeletedEntityReferences(deletedUserIds, deletedOrgIds) {
  let changed = false;
  allNodesRuntime.forEach((node) => {
    if (!node || node.type !== "entity") return;
    if (node.entityKind === "user" && deletedUserIds.has(node.entityRefId) && unlinkEntityNodeRecord(node)) {
      changed = true;
    }
    if (node.entityKind === "org" && deletedOrgIds.has(node.entityRefId) && unlinkEntityNodeRecord(node)) {
      changed = true;
    }
  });
  return changed;
}

function markDeletedOwnersOnSharedNodes(deletedUserIds) {
  let changed = false;
  allNodesRuntime.forEach((node) => {
    if (!node || !deletedUserIds.has(node.ownerId)) return;
    const deletedOwnerLabel = getUserDisplayNameWithOrg(node.ownerId) || node.owner || node.ownerId;
    if (!node.meta || typeof node.meta !== "object") {
      node.meta = {};
    }
    if (deletedOwnerLabel && node.meta.deletedOwnerLabel !== deletedOwnerLabel) {
      node.meta.deletedOwnerLabel = deletedOwnerLabel;
      changed = true;
    }
    if (node.ownerId !== null) {
      node.ownerId = null;
      changed = true;
    }
    if (node.owner !== deletedOwnerLabel) {
      node.owner = deletedOwnerLabel;
      changed = true;
    }
  });
  return changed;
}

function deleteWorkspacesOwnedByUsers(deletedUserIds) {
  const deletedWorkspaceIds = new Set();
  workspaces = workspaces.filter((workspace) => {
    if (workspace && deletedUserIds.has(workspace.ownerId)) {
      deletedWorkspaceIds.add(workspace.id);
      return false;
    }
    return true;
  });
  return deletedWorkspaceIds;
}

function pruneGraphToReferencedWorkspaceItems() {
  const referencedNodeIds = new Set();
  const referencedEdgeIds = new Set();
  workspaces.forEach((workspace) => {
    (Array.isArray(workspace.nodeIds) ? workspace.nodeIds : []).forEach((nodeId) => {
      if (nodeId) referencedNodeIds.add(nodeId);
    });
    (Array.isArray(workspace.edgeIds) ? workspace.edgeIds : []).forEach((edgeId) => {
      if (edgeId) referencedEdgeIds.add(edgeId);
    });
  });

  allNodesRuntime = allNodesRuntime.filter((node) => referencedNodeIds.has(node.id));
  const survivingNodeIds = new Set(allNodesRuntime.map((node) => node.id));
  allEdgesRuntime = allEdgesRuntime.filter((edge) => {
    if (!referencedEdgeIds.has(edge.id)) return false;
    return survivingNodeIds.has(edge.sourceId) && survivingNodeIds.has(edge.targetId);
  });
  const survivingEdgeIds = new Set(allEdgesRuntime.map((edge) => edge.id));

  workspaces.forEach((workspace) => {
    workspace.nodeIds = (Array.isArray(workspace.nodeIds) ? workspace.nodeIds : []).filter((nodeId) => survivingNodeIds.has(nodeId));
    workspace.edgeIds = (Array.isArray(workspace.edgeIds) ? workspace.edgeIds : []).filter((edgeId) => survivingEdgeIds.has(edgeId));
    if (workspace.homeNodeId && !survivingNodeIds.has(workspace.homeNodeId)) {
      workspace.homeNodeId = workspace.nodeIds[0] || null;
    }
  });
}

function syncAllRuntimeDataAndPersist() {
  syncUsersRuntimeAndStore();
  syncOrgsRuntimeAndStore();
  syncNodeRuntimeAndStore();
  syncEdgeRuntimeAndStore();
  syncWorkspaceRuntimeAndStore();
  sanitizeAfterNodeDelete();
  persistStoreToLocalStorage();
}

function finalizePrincipalDeletion(deletedUserIds, deletedOrgIds, deletedWorkspaceIds) {
  markDeletedOwnersOnSharedNodes(deletedUserIds);
  disconnectDeletedEntityReferences(deletedUserIds, deletedOrgIds);
  clearPortalLinksToWorkspaceIds(deletedWorkspaceIds);
  removeDeletedCollaboratorsFromHandovers(deletedUserIds, deletedOrgIds);
  pruneGraphToReferencedWorkspaceItems();
  refreshRuntimeOwnerLabels();
  syncAllRuntimeDataAndPersist();
  setCurrentWorkspaceForCurrentUser();
  hasAppliedWorkspace = false;
}

function deleteUserRecordById(userId) {
  if (!userId || isAdminUserId(userId) || !userById.has(userId)) return false;
  const userRecord = userById.get(userId);
  const orgName = getOrgDisplayName(userRecord.orgId);
  const deletedUserIds = new Set([userId]);
  const deletedOrgIds = new Set();
  const deletedWorkspaceIds = deleteWorkspacesOwnedByUsers(deletedUserIds);
  users = users.filter((user) => user.id !== userId);
  const labelsToDelete = getTaskAssignmentLabelsForUserRecord(userRecord, orgName);
  removeTasksAssignedToLabels(labelsToDelete);
  finalizePrincipalDeletion(deletedUserIds, deletedOrgIds, deletedWorkspaceIds);
  return true;
}

function deleteOrganisationRecordById(orgId) {
  if (!orgId || !orgById.has(orgId)) return false;
  const orgRecord = orgById.get(orgId);
  const usersInOrg = users.filter((user) => user.orgId === orgId && !isAdminUserId(user.id));
  const deletedUserIds = new Set(usersInOrg.map((user) => user.id));
  const deletedOrgIds = new Set([orgId]);
  const deletedWorkspaceIds = deleteWorkspacesOwnedByUsers(deletedUserIds);
  users = users.filter((user) => user.orgId !== orgId || isAdminUserId(user.id));
  orgs = orgs.filter((org) => org.id !== orgId);
  const labelsToDelete = new Set(getTaskAssignmentLabelsForOrgRecord(orgRecord));
  usersInOrg.forEach((userRecord) => {
    getTaskAssignmentLabelsForUserRecord(userRecord, orgRecord.name).forEach((label) => labelsToDelete.add(label));
  });
  removeTasksAssignedToLabels(labelsToDelete);
  finalizePrincipalDeletion(deletedUserIds, deletedOrgIds, deletedWorkspaceIds);
  return true;
}

function renameUserRecord(userId, nextName) {
  const userRecord = userById.get(userId);
  const trimmedName = String(nextName || "").trim();
  if (!userRecord || !trimmedName || isAdminUserId(userId)) return false;
  const oldLabels = getTaskAssignmentLabelsForUserRecord(userRecord);
  if (userRecord.name === trimmedName) return false;
  userRecord.name = trimmedName;
  const userIndex = users.findIndex((user) => user.id === userId);
  if (userIndex >= 0) {
    users[userIndex].name = trimmedName;
  }
  syncUsersRuntimeAndStore();
  refreshRuntimeOwnerLabels();
  const nextLabels = getTaskAssignmentLabelsForUserRecord(userById.get(userId));
  const labelMap = new Map();
  [...oldLabels].forEach((oldLabel) => {
    if (!oldLabel) return;
    const nextLabel = [...nextLabels].find((candidate) => candidate.endsWith(trimmedName) || candidate === trimmedName) || trimmedName;
    if (nextLabel && nextLabel !== oldLabel) {
      labelMap.set(oldLabel, nextLabel);
    }
  });
  rewriteTaskAssigneeLabels(labelMap);
  syncNodeRuntimeAndStore();
  persistStoreToLocalStorage();
  return true;
}

function renameOrganisationRecord(orgId, nextName) {
  const orgRecord = orgById.get(orgId);
  const trimmedName = String(nextName || "").trim();
  if (!orgRecord || !trimmedName) return false;
  const oldOrgName = orgRecord.name || "";
  if (oldOrgName === trimmedName) return false;
  const usersInOrg = users.filter((user) => user.orgId === orgId && !isAdminUserId(user.id));
  const labelMap = new Map();
  getTaskAssignmentLabelsForOrgRecord(orgRecord).forEach((oldLabel) => {
    if (oldLabel && oldLabel !== trimmedName) {
      labelMap.set(oldLabel, trimmedName);
    }
  });
  usersInOrg.forEach((userRecord) => {
    const oldLabels = getTaskAssignmentLabelsForUserRecord(userRecord, oldOrgName);
    const nextLabels = getTaskAssignmentLabelsForUserRecord(userRecord, trimmedName);
    [...oldLabels].forEach((oldLabel) => {
      if (!oldLabel) return;
      const matchingNext = [...nextLabels].find((candidate) => candidate.endsWith(userRecord.name));
      if (matchingNext && matchingNext !== oldLabel) {
        labelMap.set(oldLabel, matchingNext);
      }
    });
  });
  orgRecord.name = trimmedName;
  const orgIndex = orgs.findIndex((org) => org.id === orgId);
  if (orgIndex >= 0) {
    orgs[orgIndex].name = trimmedName;
  }
  syncOrgsRuntimeAndStore();
  rewriteTaskAssigneeLabels(labelMap);
  syncNodeRuntimeAndStore();
  persistStoreToLocalStorage();
  return true;
}

function sanitizeStateForWorkspace() {
  const firstSelectableNodeId = getFirstSelectableNodeId(nodes);
  if (!state.selectedNodeId || !nodeById.has(state.selectedNodeId)) {
    state.selectedNodeId = firstSelectableNodeId;
    resetDetailsEditState();
  }
  if (state.selectedNodeId) {
    const selectedNode = getNodeById(state.selectedNodeId);
    if (!isSelectableNode(selectedNode)) {
      state.selectedNodeId = firstSelectableNodeId;
      resetDetailsEditState();
    }
  }
  if (!newNodeInlineEditId || !nodeById.has(newNodeInlineEditId)) {
    newNodeInlineEditId = null;
  }
  if (detailsTitleEditNodeId && !nodeById.has(detailsTitleEditNodeId)) {
    detailsTitleEditNodeId = null;
    detailsTitleDraft = "";
  }
  if (detailsSummaryEditNodeId && !nodeById.has(detailsSummaryEditNodeId)) {
    detailsSummaryEditNodeId = null;
    detailsSummaryDraft = "";
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

function rebuildVisibleWorkspaceGraph(workspaceRecord) {
  resetCurrentProjectionViewState();
  if (!workspaceRecord) {
    nodes = [];
    edges = [];
    nodeById = new Map();
    edgeRuntimeCounter = 0;
    rebuildEdgeIndexes();
    return;
  }

  const visibleNodeMap = new Map();
  const authoredEdges = [];
  const authoredNodeIds = Array.isArray(workspaceRecord.nodeIds) ? workspaceRecord.nodeIds : [];
  authoredNodeIds.forEach((nodeId) => {
    const node = getAnyNodeById(nodeId);
    if (node) {
      visibleNodeMap.set(node.id, node);
    }
  });

  const authoredEdgeIds = Array.isArray(workspaceRecord.edgeIds) ? workspaceRecord.edgeIds : [];
  authoredEdgeIds.forEach((edgeId) => {
    const edge = getWorkspaceAuthoredEdgeRecord(workspaceRecord, edgeId);
    if (!edge) return;
    const sourceNode = getAnyNodeById(edge.sourceId);
    const targetNode = getAnyNodeById(edge.targetId);
    if (!sourceNode || !targetNode) return;
    if (!visibleNodeMap.has(sourceNode.id)) {
      visibleNodeMap.set(sourceNode.id, sourceNode);
    }
    if (!visibleNodeMap.has(targetNode.id)) {
      visibleNodeMap.set(targetNode.id, targetNode);
    }
    authoredEdges.push({ ...edge });
  });

  let overlayEdges = [];
  if (normalizeWorkspaceKind(workspaceRecord.kind) === "collab") {
    overlayEdges = buildCollaborationProjectionOverlay(workspaceRecord, visibleNodeMap).overlayEdges;
  }

  nodes = [...visibleNodeMap.values()];
  nodeById = new Map(nodes.map((node) => [node.id, node]));
  edges = [...authoredEdges, ...overlayEdges];
  edgeRuntimeCounter = 0;
  rebuildEdgeIndexes();
  attachLinkedNodeAccessors();
}

function applyWorkspaceData(workspaceId, options = {}) {
  const workspaceRecord = getWorkspaceRecordById(workspaceId);
  const workspaceOption = getWorkspaceOptionById(workspaceId);
  currentWorkspaceId = workspaceRecord?.id || workspaceOption?.id || null;
  currentWorkspaceKind = normalizeWorkspaceKind(workspaceRecord?.kind || workspaceOption?.kind);

  if (!workspaceRecord) {
    rebuildVisibleWorkspaceGraph(null);
    if (options.sanitizeState !== false) {
      sanitizeStateForWorkspace();
    }
    return;
  }
  rebuildVisibleWorkspaceGraph(workspaceRecord);

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
    const EDGE_HANDLE_BORDER_HIT_PX = 14;
    const EDGE_HANDLE_BORDER_HIT_PORTAL_PX = 8;
    const EDGE_HANDLE_BORDER_HIT_ENTITY_PX = 10;
    const EDGE_HANDLE_INTENT_DELAY_MS = 140;
    const EDGE_HANDLE_INTENT_MOVE_PX = 5;
    const EDGE_ACTION_INTENT_DELAY_MS = 140;
    const EDGE_ACTION_HIDE_GRACE_MS = 180;
    const EDGE_ACTION_BUTTON_OFFSET_PX = 20;
    const EDGE_CHEVRON_T = 0.5;
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
    let lastPortalClick = {
      nodeId: null,
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
    let edgeCreateHover = {
      visible: false,
      nodeId: null,
      anchorX: 0,
      anchorY: 0,
      angleDeg: 0
    };
    let edgeCreateDraft = {
      active: false,
      sourceId: null,
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      targetId: null
    };
    let edgeHoverIntent = {
      armed: false,
      timerId: null,
      startedAt: 0,
      candidateNodeId: null,
      candidateAnchorX: 0,
      candidateAnchorY: 0,
      candidateAngleDeg: 0,
      startClientX: 0,
      startClientY: 0
    };
    let edgeActionIntent = {
      armed: false,
      timerId: null,
      edgeId: null,
      sourceId: null,
      targetId: null,
      startClientX: 0,
      startClientY: 0,
      candidateClientX: 0,
      candidateClientY: 0,
      startX: 0,
      startY: 0,
      controlX: 0,
      controlY: 0,
      endX: 0,
      endY: 0
    };
    let edgeActionMenuState = {
      visible: false,
      edgeId: null,
      sourceId: null,
      targetId: null,
      anchorX: 0,
      anchorY: 0,
      normalX: 0,
      normalY: -1
    };
    let edgeActionHideTimerId = null;
    let edgeActionPinned = false;
    let edgeCreateHighlightedSourceId = null;
    let edgeCreateHighlightedTargetId = null;
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
    const createNodeMenuEl = document.createElement("div");
    createNodeMenuEl.id = "mapCreateMenu";
    createNodeMenuEl.className = "map-create-menu";
    createNodeMenuEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(createNodeMenuEl);
    const edgeCreateHandleEl = document.createElement("button");
    edgeCreateHandleEl.type = "button";
    edgeCreateHandleEl.id = "edgeCreateHandle";
    edgeCreateHandleEl.className = "edge-create-handle";
    edgeCreateHandleEl.setAttribute("aria-label", "Create edge");
    edgeCreateHandleEl.setAttribute("aria-hidden", "true");
    edgeCreateHandleEl.innerHTML = "<span class=\"edge-create-handle-glyph\" aria-hidden=\"true\">➤</span>";
    if (worldEl) {
      worldEl.appendChild(edgeCreateHandleEl);
    }
    const edgeActionMenuEl = document.createElement("div");
    edgeActionMenuEl.id = "edgeActionMenu";
    edgeActionMenuEl.className = "edge-action-menu";
    edgeActionMenuEl.setAttribute("aria-hidden", "true");
    const edgeActionReverseBtnEl = document.createElement("button");
    edgeActionReverseBtnEl.type = "button";
    edgeActionReverseBtnEl.className = "edge-action-btn reverse";
    edgeActionReverseBtnEl.setAttribute("aria-label", "Reverse edge direction");
    edgeActionReverseBtnEl.textContent = "↺";
    const edgeActionDeleteBtnEl = document.createElement("button");
    edgeActionDeleteBtnEl.type = "button";
    edgeActionDeleteBtnEl.className = "edge-action-btn delete";
    edgeActionDeleteBtnEl.setAttribute("aria-label", "Delete edge");
    edgeActionDeleteBtnEl.textContent = "✕";
    edgeActionMenuEl.appendChild(edgeActionReverseBtnEl);
    edgeActionMenuEl.appendChild(edgeActionDeleteBtnEl);
    if (worldEl) {
      worldEl.appendChild(edgeActionMenuEl);
    }
    edgeActionMenuEl.addEventListener("pointerenter", () => {
      edgeActionPinned = true;
      clearEdgeActionHideTimer();
    });
    edgeActionMenuEl.addEventListener("pointerleave", () => {
      edgeActionPinned = false;
      scheduleEdgeActionHide();
    });
    edgeActionMenuEl.addEventListener("mousedown", (event) => {
      event.stopPropagation();
    });
    edgeActionReverseBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      requestEdgeReverse(edgeActionMenuState.edgeId);
    });
    edgeActionDeleteBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      requestEdgeDelete(edgeActionMenuState.edgeId);
    });
    const portalLinkModalOverlayEl = document.createElement("div");
    portalLinkModalOverlayEl.id = "portalLinkModalOverlay";
    portalLinkModalOverlayEl.className = "portal-link-modal-overlay";
    portalLinkModalOverlayEl.setAttribute("aria-hidden", "true");
    const portalLinkModalEl = document.createElement("div");
    portalLinkModalEl.className = "portal-link-modal";
    portalLinkModalEl.setAttribute("role", "dialog");
    portalLinkModalEl.setAttribute("aria-modal", "true");
    portalLinkModalEl.setAttribute("aria-labelledby", "portalLinkModalTitle");
    const portalLinkModalCloseBtnEl = document.createElement("button");
    portalLinkModalCloseBtnEl.type = "button";
    portalLinkModalCloseBtnEl.className = "portal-link-modal-close";
    portalLinkModalCloseBtnEl.setAttribute("aria-label", "Close");
    portalLinkModalCloseBtnEl.textContent = "✕";
    const portalLinkModalTitleEl = document.createElement("h3");
    portalLinkModalTitleEl.id = "portalLinkModalTitle";
    portalLinkModalTitleEl.className = "portal-link-modal-title";
    portalLinkModalTitleEl.textContent = "Link portal";
    const portalLinkModalHintEl = document.createElement("p");
    portalLinkModalHintEl.className = "portal-link-modal-hint";
    portalLinkModalHintEl.textContent = "Select a destination workspace.";
    const portalLinkModalFieldEl = document.createElement("label");
    portalLinkModalFieldEl.className = "portal-link-modal-field";
    portalLinkModalFieldEl.setAttribute("for", "portalLinkWorkspaceSelect");
    portalLinkModalFieldEl.textContent = "Workspace";
    const portalLinkModalSelectEl = document.createElement("select");
    portalLinkModalSelectEl.id = "portalLinkWorkspaceSelect";
    portalLinkModalSelectEl.className = "portal-link-modal-select";
    const portalLinkModalActionsEl = document.createElement("div");
    portalLinkModalActionsEl.className = "portal-link-modal-actions";
    const portalLinkModalCancelBtnEl = document.createElement("button");
    portalLinkModalCancelBtnEl.type = "button";
    portalLinkModalCancelBtnEl.className = "portal-link-modal-btn is-cancel";
    portalLinkModalCancelBtnEl.textContent = "Cancel";
    const portalLinkModalConfirmBtnEl = document.createElement("button");
    portalLinkModalConfirmBtnEl.type = "button";
    portalLinkModalConfirmBtnEl.className = "portal-link-modal-btn is-confirm";
    portalLinkModalConfirmBtnEl.textContent = "Confirm";
    portalLinkModalActionsEl.appendChild(portalLinkModalCancelBtnEl);
    portalLinkModalActionsEl.appendChild(portalLinkModalConfirmBtnEl);
    portalLinkModalEl.appendChild(portalLinkModalCloseBtnEl);
    portalLinkModalEl.appendChild(portalLinkModalTitleEl);
    portalLinkModalEl.appendChild(portalLinkModalHintEl);
    portalLinkModalEl.appendChild(portalLinkModalFieldEl);
    portalLinkModalEl.appendChild(portalLinkModalSelectEl);
    portalLinkModalEl.appendChild(portalLinkModalActionsEl);
    portalLinkModalOverlayEl.appendChild(portalLinkModalEl);
    document.body.appendChild(portalLinkModalOverlayEl);
    const entityLinkModalOverlayEl = document.createElement("div");
    entityLinkModalOverlayEl.id = "entityLinkModalOverlay";
    entityLinkModalOverlayEl.className = "portal-link-modal-overlay";
    entityLinkModalOverlayEl.setAttribute("aria-hidden", "true");
    const entityLinkModalEl = document.createElement("div");
    entityLinkModalEl.className = "portal-link-modal";
    entityLinkModalEl.setAttribute("role", "dialog");
    entityLinkModalEl.setAttribute("aria-modal", "true");
    entityLinkModalEl.setAttribute("aria-labelledby", "entityLinkModalTitle");
    const entityLinkModalCloseBtnEl = document.createElement("button");
    entityLinkModalCloseBtnEl.type = "button";
    entityLinkModalCloseBtnEl.className = "portal-link-modal-close";
    entityLinkModalCloseBtnEl.setAttribute("aria-label", "Close");
    entityLinkModalCloseBtnEl.textContent = "✕";
    const entityLinkModalTitleEl = document.createElement("h3");
    entityLinkModalTitleEl.id = "entityLinkModalTitle";
    entityLinkModalTitleEl.className = "portal-link-modal-title";
    entityLinkModalTitleEl.textContent = "Link entity";
    const entityLinkModalHintEl = document.createElement("p");
    entityLinkModalHintEl.className = "portal-link-modal-hint";
    entityLinkModalHintEl.textContent = "Select an existing user or organisation to link.";
    const entityLinkModalKindFieldEl = document.createElement("label");
    entityLinkModalKindFieldEl.className = "portal-link-modal-field";
    entityLinkModalKindFieldEl.setAttribute("for", "entityLinkKindSelect");
    entityLinkModalKindFieldEl.textContent = "Type";
    const entityLinkModalKindSelectEl = document.createElement("select");
    entityLinkModalKindSelectEl.id = "entityLinkKindSelect";
    entityLinkModalKindSelectEl.className = "portal-link-modal-select";
    const entityLinkModalRefFieldEl = document.createElement("label");
    entityLinkModalRefFieldEl.className = "portal-link-modal-field";
    entityLinkModalRefFieldEl.setAttribute("for", "entityLinkRefSelect");
    entityLinkModalRefFieldEl.textContent = "Link target";
    const entityLinkModalRefSelectEl = document.createElement("select");
    entityLinkModalRefSelectEl.id = "entityLinkRefSelect";
    entityLinkModalRefSelectEl.className = "portal-link-modal-select";
    const entityLinkModalActionsEl = document.createElement("div");
    entityLinkModalActionsEl.className = "portal-link-modal-actions";
    const entityLinkModalCancelBtnEl = document.createElement("button");
    entityLinkModalCancelBtnEl.type = "button";
    entityLinkModalCancelBtnEl.className = "portal-link-modal-btn is-cancel";
    entityLinkModalCancelBtnEl.textContent = "Cancel";
    const entityLinkModalConfirmBtnEl = document.createElement("button");
    entityLinkModalConfirmBtnEl.type = "button";
    entityLinkModalConfirmBtnEl.className = "portal-link-modal-btn is-confirm";
    entityLinkModalConfirmBtnEl.textContent = "Confirm";
    entityLinkModalActionsEl.appendChild(entityLinkModalCancelBtnEl);
    entityLinkModalActionsEl.appendChild(entityLinkModalConfirmBtnEl);
    entityLinkModalEl.appendChild(entityLinkModalCloseBtnEl);
    entityLinkModalEl.appendChild(entityLinkModalTitleEl);
    entityLinkModalEl.appendChild(entityLinkModalHintEl);
    entityLinkModalEl.appendChild(entityLinkModalKindFieldEl);
    entityLinkModalEl.appendChild(entityLinkModalKindSelectEl);
    entityLinkModalEl.appendChild(entityLinkModalRefFieldEl);
    entityLinkModalEl.appendChild(entityLinkModalRefSelectEl);
    entityLinkModalEl.appendChild(entityLinkModalActionsEl);
    entityLinkModalOverlayEl.appendChild(entityLinkModalEl);
    document.body.appendChild(entityLinkModalOverlayEl);
    const collaboratorPickerModalOverlayEl = document.createElement("div");
    collaboratorPickerModalOverlayEl.id = "collaboratorPickerModalOverlay";
    collaboratorPickerModalOverlayEl.className = "portal-link-modal-overlay";
    collaboratorPickerModalOverlayEl.setAttribute("aria-hidden", "true");
    const collaboratorPickerModalEl = document.createElement("div");
    collaboratorPickerModalEl.className = "portal-link-modal picker-modal";
    collaboratorPickerModalEl.setAttribute("role", "dialog");
    collaboratorPickerModalEl.setAttribute("aria-modal", "true");
    collaboratorPickerModalEl.setAttribute("aria-labelledby", "collaboratorPickerModalTitle");
    const collaboratorPickerModalCloseBtnEl = document.createElement("button");
    collaboratorPickerModalCloseBtnEl.type = "button";
    collaboratorPickerModalCloseBtnEl.className = "portal-link-modal-close";
    collaboratorPickerModalCloseBtnEl.setAttribute("aria-label", "Close");
    collaboratorPickerModalCloseBtnEl.textContent = "✕";
    const collaboratorPickerModalTitleEl = document.createElement("h3");
    collaboratorPickerModalTitleEl.id = "collaboratorPickerModalTitle";
    collaboratorPickerModalTitleEl.className = "portal-link-modal-title";
    collaboratorPickerModalTitleEl.textContent = "Add collaborators";
    const collaboratorPickerModalHintEl = document.createElement("p");
    collaboratorPickerModalHintEl.className = "portal-link-modal-hint";
    collaboratorPickerModalHintEl.textContent = "Select one or more users or organisations.";
    const collaboratorPickerModalBodyEl = document.createElement("div");
    collaboratorPickerModalBodyEl.className = "picker-modal-body";
    const collaboratorPickerModalActionsEl = document.createElement("div");
    collaboratorPickerModalActionsEl.className = "portal-link-modal-actions";
    const collaboratorPickerModalCancelBtnEl = document.createElement("button");
    collaboratorPickerModalCancelBtnEl.type = "button";
    collaboratorPickerModalCancelBtnEl.className = "portal-link-modal-btn is-cancel";
    collaboratorPickerModalCancelBtnEl.textContent = "Cancel";
    const collaboratorPickerModalConfirmBtnEl = document.createElement("button");
    collaboratorPickerModalConfirmBtnEl.type = "button";
    collaboratorPickerModalConfirmBtnEl.className = "portal-link-modal-btn is-confirm";
    collaboratorPickerModalConfirmBtnEl.textContent = "Add";
    collaboratorPickerModalActionsEl.appendChild(collaboratorPickerModalCancelBtnEl);
    collaboratorPickerModalActionsEl.appendChild(collaboratorPickerModalConfirmBtnEl);
    collaboratorPickerModalEl.appendChild(collaboratorPickerModalCloseBtnEl);
    collaboratorPickerModalEl.appendChild(collaboratorPickerModalTitleEl);
    collaboratorPickerModalEl.appendChild(collaboratorPickerModalHintEl);
    collaboratorPickerModalEl.appendChild(collaboratorPickerModalBodyEl);
    collaboratorPickerModalEl.appendChild(collaboratorPickerModalActionsEl);
    collaboratorPickerModalOverlayEl.appendChild(collaboratorPickerModalEl);
    document.body.appendChild(collaboratorPickerModalOverlayEl);
    const handoverObjectPickerModalOverlayEl = document.createElement("div");
    handoverObjectPickerModalOverlayEl.id = "handoverObjectPickerModalOverlay";
    handoverObjectPickerModalOverlayEl.className = "portal-link-modal-overlay";
    handoverObjectPickerModalOverlayEl.setAttribute("aria-hidden", "true");
    const handoverObjectPickerModalEl = document.createElement("div");
    handoverObjectPickerModalEl.className = "portal-link-modal picker-modal";
    handoverObjectPickerModalEl.setAttribute("role", "dialog");
    handoverObjectPickerModalEl.setAttribute("aria-modal", "true");
    handoverObjectPickerModalEl.setAttribute("aria-labelledby", "handoverObjectPickerModalTitle");
    const handoverObjectPickerModalCloseBtnEl = document.createElement("button");
    handoverObjectPickerModalCloseBtnEl.type = "button";
    handoverObjectPickerModalCloseBtnEl.className = "portal-link-modal-close";
    handoverObjectPickerModalCloseBtnEl.setAttribute("aria-label", "Close");
    handoverObjectPickerModalCloseBtnEl.textContent = "✕";
    const handoverObjectPickerModalTitleEl = document.createElement("h3");
    handoverObjectPickerModalTitleEl.id = "handoverObjectPickerModalTitle";
    handoverObjectPickerModalTitleEl.className = "portal-link-modal-title";
    handoverObjectPickerModalTitleEl.textContent = "Add handover objects";
    const handoverObjectPickerModalHintEl = document.createElement("p");
    handoverObjectPickerModalHintEl.className = "portal-link-modal-hint";
    handoverObjectPickerModalHintEl.textContent = "Select one or more objects to add explicitly.";
    const handoverObjectPickerModalBodyEl = document.createElement("div");
    handoverObjectPickerModalBodyEl.className = "picker-modal-body";
    const handoverObjectPickerModalActionsEl = document.createElement("div");
    handoverObjectPickerModalActionsEl.className = "portal-link-modal-actions";
    const handoverObjectPickerModalCancelBtnEl = document.createElement("button");
    handoverObjectPickerModalCancelBtnEl.type = "button";
    handoverObjectPickerModalCancelBtnEl.className = "portal-link-modal-btn is-cancel";
    handoverObjectPickerModalCancelBtnEl.textContent = "Cancel";
    const handoverObjectPickerModalConfirmBtnEl = document.createElement("button");
    handoverObjectPickerModalConfirmBtnEl.type = "button";
    handoverObjectPickerModalConfirmBtnEl.className = "portal-link-modal-btn is-confirm";
    handoverObjectPickerModalConfirmBtnEl.textContent = "Add";
    handoverObjectPickerModalActionsEl.appendChild(handoverObjectPickerModalCancelBtnEl);
    handoverObjectPickerModalActionsEl.appendChild(handoverObjectPickerModalConfirmBtnEl);
    handoverObjectPickerModalEl.appendChild(handoverObjectPickerModalCloseBtnEl);
    handoverObjectPickerModalEl.appendChild(handoverObjectPickerModalTitleEl);
    handoverObjectPickerModalEl.appendChild(handoverObjectPickerModalHintEl);
    handoverObjectPickerModalEl.appendChild(handoverObjectPickerModalBodyEl);
    handoverObjectPickerModalEl.appendChild(handoverObjectPickerModalActionsEl);
    handoverObjectPickerModalOverlayEl.appendChild(handoverObjectPickerModalEl);
    document.body.appendChild(handoverObjectPickerModalOverlayEl);
    const adminOrgModalOverlayEl = document.createElement("div");
    adminOrgModalOverlayEl.id = "adminOrgModalOverlay";
    adminOrgModalOverlayEl.className = "portal-link-modal-overlay";
    adminOrgModalOverlayEl.setAttribute("aria-hidden", "true");
    const adminOrgModalEl = document.createElement("div");
    adminOrgModalEl.className = "portal-link-modal picker-modal admin-editor-modal";
    adminOrgModalEl.setAttribute("role", "dialog");
    adminOrgModalEl.setAttribute("aria-modal", "true");
    adminOrgModalEl.setAttribute("aria-labelledby", "adminOrgModalTitle");
    const adminOrgModalCloseBtnEl = document.createElement("button");
    adminOrgModalCloseBtnEl.type = "button";
    adminOrgModalCloseBtnEl.className = "portal-link-modal-close";
    adminOrgModalCloseBtnEl.setAttribute("aria-label", "Close");
    adminOrgModalCloseBtnEl.textContent = "✕";
    const adminOrgModalTitleEl = document.createElement("h3");
    adminOrgModalTitleEl.id = "adminOrgModalTitle";
    adminOrgModalTitleEl.className = "portal-link-modal-title";
    adminOrgModalTitleEl.textContent = "Edit organisations";
    const adminOrgModalHintEl = document.createElement("p");
    adminOrgModalHintEl.className = "portal-link-modal-hint";
    adminOrgModalHintEl.textContent = "Add, rename, or delete organisations.";
    const adminOrgModalInputEl = document.createElement("input");
    adminOrgModalInputEl.type = "text";
    adminOrgModalInputEl.className = "workspace-create-input admin-editor-input";
    adminOrgModalInputEl.placeholder = "Add New Organisation";
    adminOrgModalInputEl.maxLength = 80;
    const adminOrgModalBodyEl = document.createElement("div");
    adminOrgModalBodyEl.className = "picker-modal-body admin-editor-body";
    adminOrgModalEl.appendChild(adminOrgModalCloseBtnEl);
    adminOrgModalEl.appendChild(adminOrgModalTitleEl);
    adminOrgModalEl.appendChild(adminOrgModalHintEl);
    adminOrgModalEl.appendChild(adminOrgModalInputEl);
    adminOrgModalEl.appendChild(adminOrgModalBodyEl);
    adminOrgModalOverlayEl.appendChild(adminOrgModalEl);
    document.body.appendChild(adminOrgModalOverlayEl);
    const adminUserModalOverlayEl = document.createElement("div");
    adminUserModalOverlayEl.id = "adminUserModalOverlay";
    adminUserModalOverlayEl.className = "portal-link-modal-overlay";
    adminUserModalOverlayEl.setAttribute("aria-hidden", "true");
    const adminUserModalEl = document.createElement("div");
    adminUserModalEl.className = "portal-link-modal picker-modal admin-editor-modal";
    adminUserModalEl.setAttribute("role", "dialog");
    adminUserModalEl.setAttribute("aria-modal", "true");
    adminUserModalEl.setAttribute("aria-labelledby", "adminUserModalTitle");
    const adminUserModalCloseBtnEl = document.createElement("button");
    adminUserModalCloseBtnEl.type = "button";
    adminUserModalCloseBtnEl.className = "portal-link-modal-close";
    adminUserModalCloseBtnEl.setAttribute("aria-label", "Close");
    adminUserModalCloseBtnEl.textContent = "✕";
    const adminUserModalTitleEl = document.createElement("h3");
    adminUserModalTitleEl.id = "adminUserModalTitle";
    adminUserModalTitleEl.className = "portal-link-modal-title";
    adminUserModalTitleEl.textContent = "Edit users";
    const adminUserModalHintEl = document.createElement("p");
    adminUserModalHintEl.className = "portal-link-modal-hint";
    adminUserModalHintEl.textContent = "Choose an organisation, then add, rename, or delete users.";
    const adminUserModalOrgFieldEl = document.createElement("label");
    adminUserModalOrgFieldEl.className = "portal-link-modal-field";
    adminUserModalOrgFieldEl.setAttribute("for", "adminUserOrgSelect");
    adminUserModalOrgFieldEl.textContent = "Organisation";
    const adminUserModalOrgSelectEl = document.createElement("select");
    adminUserModalOrgSelectEl.id = "adminUserOrgSelect";
    adminUserModalOrgSelectEl.className = "portal-link-modal-select";
    const adminUserModalInputEl = document.createElement("input");
    adminUserModalInputEl.type = "text";
    adminUserModalInputEl.className = "workspace-create-input admin-editor-input";
    adminUserModalInputEl.placeholder = "Add New User";
    adminUserModalInputEl.maxLength = 80;
    const adminUserModalBodyEl = document.createElement("div");
    adminUserModalBodyEl.className = "picker-modal-body admin-editor-body";
    adminUserModalEl.appendChild(adminUserModalCloseBtnEl);
    adminUserModalEl.appendChild(adminUserModalTitleEl);
    adminUserModalEl.appendChild(adminUserModalHintEl);
    adminUserModalEl.appendChild(adminUserModalOrgFieldEl);
    adminUserModalEl.appendChild(adminUserModalOrgSelectEl);
    adminUserModalEl.appendChild(adminUserModalInputEl);
    adminUserModalEl.appendChild(adminUserModalBodyEl);
    adminUserModalOverlayEl.appendChild(adminUserModalEl);
    document.body.appendChild(adminUserModalOverlayEl);
    const confirmationModalOverlayEl = document.createElement("div");
    confirmationModalOverlayEl.id = "confirmationModalOverlay";
    confirmationModalOverlayEl.className = "portal-link-modal-overlay";
    confirmationModalOverlayEl.setAttribute("aria-hidden", "true");
    const confirmationModalEl = document.createElement("div");
    confirmationModalEl.className = "portal-link-modal";
    confirmationModalEl.setAttribute("role", "dialog");
    confirmationModalEl.setAttribute("aria-modal", "true");
    confirmationModalEl.setAttribute("aria-labelledby", "confirmationModalTitle");
    const confirmationModalCloseBtnEl = document.createElement("button");
    confirmationModalCloseBtnEl.type = "button";
    confirmationModalCloseBtnEl.className = "portal-link-modal-close";
    confirmationModalCloseBtnEl.setAttribute("aria-label", "Close");
    confirmationModalCloseBtnEl.textContent = "✕";
    const confirmationModalTitleEl = document.createElement("h3");
    confirmationModalTitleEl.id = "confirmationModalTitle";
    confirmationModalTitleEl.className = "portal-link-modal-title";
    const confirmationModalMessageEl = document.createElement("p");
    confirmationModalMessageEl.className = "portal-link-modal-hint";
    const confirmationModalActionsEl = document.createElement("div");
    confirmationModalActionsEl.className = "portal-link-modal-actions";
    const confirmationModalCancelBtnEl = document.createElement("button");
    confirmationModalCancelBtnEl.type = "button";
    confirmationModalCancelBtnEl.className = "portal-link-modal-btn is-cancel";
    confirmationModalCancelBtnEl.textContent = "Cancel";
    const confirmationModalConfirmBtnEl = document.createElement("button");
    confirmationModalConfirmBtnEl.type = "button";
    confirmationModalConfirmBtnEl.className = "portal-link-modal-btn is-confirm";
    confirmationModalConfirmBtnEl.textContent = "Delete";
    confirmationModalActionsEl.appendChild(confirmationModalCancelBtnEl);
    confirmationModalActionsEl.appendChild(confirmationModalConfirmBtnEl);
    confirmationModalEl.appendChild(confirmationModalCloseBtnEl);
    confirmationModalEl.appendChild(confirmationModalTitleEl);
    confirmationModalEl.appendChild(confirmationModalMessageEl);
    confirmationModalEl.appendChild(confirmationModalActionsEl);
    confirmationModalOverlayEl.appendChild(confirmationModalEl);
    document.body.appendChild(confirmationModalOverlayEl);
    portalLinkModalEl.addEventListener("mousedown", (event) => {
      event.stopPropagation();
    });
    entityLinkModalEl.addEventListener("mousedown", (event) => {
      event.stopPropagation();
    });
    collaboratorPickerModalEl.addEventListener("mousedown", (event) => {
      event.stopPropagation();
    });
    handoverObjectPickerModalEl.addEventListener("mousedown", (event) => {
      event.stopPropagation();
    });
    adminOrgModalEl.addEventListener("mousedown", (event) => {
      event.stopPropagation();
    });
    adminUserModalEl.addEventListener("mousedown", (event) => {
      event.stopPropagation();
    });
    confirmationModalEl.addEventListener("mousedown", (event) => {
      event.stopPropagation();
    });
    portalLinkModalCloseBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closePortalLinkModal({ keepNode: true });
    });
    entityLinkModalCloseBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      cancelEntityLinkModal();
    });
    collaboratorPickerModalCloseBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeCollaboratorPickerModal();
    });
    handoverObjectPickerModalCloseBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeHandoverObjectPickerModal();
    });
    adminOrgModalCloseBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeAdminOrgModal();
    });
    adminUserModalCloseBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeAdminUserModal();
    });
    confirmationModalCloseBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeConfirmationModal();
    });
    portalLinkModalCancelBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      cancelPortalLinkModalAndDeleteNode();
    });
    entityLinkModalCancelBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      cancelEntityLinkModal();
    });
    collaboratorPickerModalCancelBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeCollaboratorPickerModal();
    });
    handoverObjectPickerModalCancelBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeHandoverObjectPickerModal();
    });
    confirmationModalCancelBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeConfirmationModal();
    });
    portalLinkModalConfirmBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      confirmPortalLinkModal();
    });
    entityLinkModalConfirmBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      confirmEntityLinkModal();
    });
    collaboratorPickerModalConfirmBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      confirmCollaboratorPickerModal();
    });
    handoverObjectPickerModalConfirmBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      confirmHandoverObjectPickerModal();
    });
    confirmationModalConfirmBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      confirmConfirmationModal();
    });
    portalLinkModalSelectEl.addEventListener("change", () => {
      portalLinkModalState.selectedWorkspaceId = portalLinkModalSelectEl.value;
    });
    entityLinkModalKindSelectEl.addEventListener("change", () => {
      entityLinkModalState.selectedEntityKind = entityLinkModalKindSelectEl.value;
      entityLinkModalState.selectedEntityRefId = "";
      renderEntityLinkModal();
    });
    entityLinkModalRefSelectEl.addEventListener("change", () => {
      entityLinkModalState.selectedEntityRefId = entityLinkModalRefSelectEl.value;
      entityLinkModalConfirmBtnEl.disabled = !entityLinkModalState.selectedEntityRefId;
    });
    adminUserModalOrgSelectEl.addEventListener("change", () => {
      adminUserModalState.selectedOrgId = adminUserModalOrgSelectEl.value;
      adminUserModalState.renameUserId = null;
      adminUserModalState.renameDraft = "";
      renderAdminUserModal();
    });
    adminOrgModalInputEl.addEventListener("input", () => {
      adminOrgModalState.draftName = adminOrgModalInputEl.value;
    });
    adminUserModalInputEl.addEventListener("input", () => {
      adminUserModalState.draftName = adminUserModalInputEl.value;
    });
    portalLinkModalEl.addEventListener("keydown", (event) => {
      if (!portalLinkModalState.open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closePortalLinkModal({ keepNode: true });
        return;
      }
      if (event.key === "Enter") {
        if (event.target instanceof HTMLButtonElement) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        confirmPortalLinkModal();
      }
    });
    entityLinkModalEl.addEventListener("keydown", (event) => {
      if (!entityLinkModalState.open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cancelEntityLinkModal();
        return;
      }
      if (event.key === "Enter") {
        if (event.target instanceof HTMLButtonElement) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        confirmEntityLinkModal();
      }
    });
    collaboratorPickerModalEl.addEventListener("keydown", (event) => {
      if (!collaboratorPickerModalState.open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeCollaboratorPickerModal();
        return;
      }
      if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        event.stopPropagation();
        confirmCollaboratorPickerModal();
      }
    });
    handoverObjectPickerModalEl.addEventListener("keydown", (event) => {
      if (!handoverObjectPickerModalState.open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeHandoverObjectPickerModal();
        return;
      }
      if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        event.stopPropagation();
        confirmHandoverObjectPickerModal();
      }
    });
    adminOrgModalEl.addEventListener("keydown", (event) => {
      if (!adminOrgModalState.open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeAdminOrgModal();
      }
    });
    adminUserModalEl.addEventListener("keydown", (event) => {
      if (!adminUserModalState.open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeAdminUserModal();
      }
    });
    confirmationModalEl.addEventListener("keydown", (event) => {
      if (!confirmationModalState.open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeConfirmationModal();
        return;
      }
      if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        event.stopPropagation();
        confirmConfirmationModal();
      }
    });
    const CREATE_NODE_MENU_ITEMS = [
      { type: "location", label: "Location" },
      { type: "process", label: "Process" },
      { type: "standard", label: "Standard" },
      { type: "portal", label: "Portal" },
      { type: "entity", label: "Entity" },
      { type: "handover", label: "Handover" }
    ];
    let gridPatternInverse2x2 = null;
    if (bgGridPatternEl) {
      bgGridPatternEl.setAttribute("width", String(GRID_BG_SPACING_PX));
      bgGridPatternEl.setAttribute("height", String(GRID_BG_SPACING_PX));
      bgGridPatternEl.setAttribute("patternTransform", GRID_PATTERN_TRANSFORM);
    }
    let lastVisibleNodeIds = new Set();
    let lastVisibleNodeFrames = new Map();
    let lastVisibleNodeBodyFrames = new Map();
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
        cancelEdgeCreateInteractions();
        closeCreateNodeMenu();
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
      cancelEdgeCreateInteractions();
      if (createNodeMenuOpen) {
        closeCreateNodeMenu();
      }
      if (collaboratorPickerModalState.open) {
        closeCollaboratorPickerModal();
        return;
      }
      if (handoverObjectPickerModalState.open) {
        closeHandoverObjectPickerModal();
        return;
      }
      if (adminOrgModalState.open) {
        closeAdminOrgModal();
        return;
      }
      if (adminUserModalState.open) {
        closeAdminUserModal();
        return;
      }
      if (confirmationModalState.open) {
        closeConfirmationModal();
        return;
      }
      if (portalLinkModalState.open) {
        closePortalLinkModal({ keepNode: true });
        return;
      }
      if (entityLinkModalState.open) {
        cancelEntityLinkModal();
        return;
      }
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
        createNodeMenuOpen &&
        clickTarget instanceof Node &&
        createNodeMenuEl &&
        !createNodeMenuEl.contains(clickTarget)
      ) {
        closeCreateNodeMenu();
      }
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
      if (
        portalLinkModalState.open &&
        clickTarget instanceof Node &&
        portalLinkModalOverlayEl &&
        portalLinkModalOverlayEl.contains(clickTarget)
      ) {
        return;
      }
      if (
        entityLinkModalState.open &&
        clickTarget instanceof Node &&
        entityLinkModalOverlayEl &&
        entityLinkModalOverlayEl.contains(clickTarget)
      ) {
        return;
      }
      if (
        collaboratorPickerModalState.open &&
        clickTarget instanceof Node &&
        collaboratorPickerModalOverlayEl &&
        collaboratorPickerModalOverlayEl.contains(clickTarget)
      ) {
        return;
      }
      if (
        handoverObjectPickerModalState.open &&
        clickTarget instanceof Node &&
        handoverObjectPickerModalOverlayEl &&
        handoverObjectPickerModalOverlayEl.contains(clickTarget)
      ) {
        return;
      }
      if (
        adminOrgModalState.open &&
        clickTarget instanceof Node &&
        adminOrgModalOverlayEl &&
        adminOrgModalOverlayEl.contains(clickTarget)
      ) {
        return;
      }
      if (
        adminUserModalState.open &&
        clickTarget instanceof Node &&
        adminUserModalOverlayEl &&
        adminUserModalOverlayEl.contains(clickTarget)
      ) {
        return;
      }
      if (
        confirmationModalState.open &&
        clickTarget instanceof Node &&
        confirmationModalOverlayEl &&
        confirmationModalOverlayEl.contains(clickTarget)
      ) {
        return;
      }
      if (
        edgeActionMenuState.visible &&
        clickTarget instanceof Node &&
        edgeActionMenuEl &&
        !edgeActionMenuEl.contains(clickTarget)
      ) {
        hideEdgeActionMenu({ clearIntent: true });
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
      viewportEl.addEventListener("contextmenu", onViewportContextMenu);
    }
    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);
    window.addEventListener("blur", () => onWindowMouseUp(null));
    edgeCreateHandleEl.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      if (!edgeCreateHover.visible || !edgeCreateHover.nodeId) return;
      event.preventDefault();
      event.stopPropagation();
      cancelEdgeActionInteractions();
      clearEdgeHoverIntent();
      edgeCreateDraft = {
        active: true,
        sourceId: edgeCreateHover.nodeId,
        startX: edgeCreateHover.anchorX,
        startY: edgeCreateHover.anchorY,
        endX: edgeCreateHover.anchorX,
        endY: edgeCreateHover.anchorY,
        targetId: null
      };
      clearEdgeCreateHover();
      applyEdgeCreateHighlights(edgeCreateDraft.sourceId, null);
      closeCreateNodeMenu();
      requestRender({ edges: true });
    });

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
        refreshVisiblePortalBodyFramesFromDOM();
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
              closeAdminOrgModal();
              closeAdminUserModal();
              closeConfirmationModal();
              renderAll();
            });
            userDropdownEl.appendChild(userItemEl);
          });
        }
        userSelectEl.appendChild(userDropdownEl);
      }
      workspaceMenuPanelEl.appendChild(userSelectEl);

      if (isAdminMode()) {
        const adminActionsEl = document.createElement("div");
        adminActionsEl.className = "workspace-workspace-list";

        const orgActionRowEl = document.createElement("div");
        orgActionRowEl.className = "workspace-menu-row";
        const orgActionBtnEl = document.createElement("button");
        orgActionBtnEl.type = "button";
        orgActionBtnEl.className = "workspace-menu-item admin-menu-action";
        orgActionBtnEl.textContent = "Edit Organisations";
        orgActionBtnEl.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          openAdminOrgModal();
        });
        orgActionRowEl.appendChild(orgActionBtnEl);
        adminActionsEl.appendChild(orgActionRowEl);

        const userActionRowEl = document.createElement("div");
        userActionRowEl.className = "workspace-menu-row";
        const userActionBtnEl = document.createElement("button");
        userActionBtnEl.type = "button";
        userActionBtnEl.className = "workspace-menu-item admin-menu-action";
        userActionBtnEl.textContent = "Edit Users";
        userActionBtnEl.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          openAdminUserModal();
        });
        userActionRowEl.appendChild(userActionBtnEl);
        adminActionsEl.appendChild(userActionRowEl);

        workspaceMenuPanelEl.appendChild(adminActionsEl);
        return;
      }

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
          const isSharedWorkspace = workspace.access === "shared";
          const isRenaming = !isSharedWorkspace && workspaceRenameId === workspace.id;
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

              const labelWrapEl = document.createElement("span");
              labelWrapEl.className = "workspace-menu-item-text";
              const labelEl = document.createElement("span");
              labelEl.className = "workspace-menu-item-label";
              labelEl.textContent = workspace.name || workspace.id;
              labelWrapEl.appendChild(labelEl);
              if (workspace.sharedByLabel) {
                const secondaryLabelEl = document.createElement("span");
                secondaryLabelEl.className = "workspace-menu-item-subtitle";
                secondaryLabelEl.textContent = workspace.sharedByLabel;
                labelWrapEl.appendChild(secondaryLabelEl);
              }
              item.appendChild(labelWrapEl);

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

          if (isActive && !isRenaming && !isSharedWorkspace) {
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
  if (portalLinkModalState.open || entityLinkModalState.open) {
    event.preventDefault();
    return;
  }
  cancelEdgeCreateInteractions();
  closeCreateNodeMenu();
  event.preventDefault();
      const { mx, my } = getViewportPoint(event);
      const zoomMultiplier = Math.exp(-event.deltaY * ZOOM_SENSITIVITY);
      applyZoomAtCursor(mx, my, zoomMultiplier);
    }

function onViewportContextMenu(event) {
  if (portalLinkModalState.open || entityLinkModalState.open) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  cancelEdgeCreateInteractions();
  if (!viewportEl) return;
  if (!currentWorkspaceId) return;
      const nodeId = getNodeIdFromTarget(event.target);
      if (nodeId) {
        event.preventDefault();
        event.stopPropagation();
        openNodeActionMenu(event.clientX, event.clientY, nodeId);
        return;
      }
      if (!shouldOpenCreateNodeMenuForTarget(event.target)) {
        closeCreateNodeMenu();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const { mx, my } = getViewportPoint(event);
      const zoom = Number.isFinite(camera.zoom) && camera.zoom > 0 ? camera.zoom : 1;
      const worldX = (mx - camera.panX) / zoom;
      const worldY = (my - camera.panY) / zoom;
      openCreateNodeMenu(event.clientX, event.clientY, worldX, worldY);
    }

function onViewportMouseDown(event) {
  if (event.button !== 0) return;
  if (portalLinkModalState.open || entityLinkModalState.open) {
    event.preventDefault();
    return;
  }
  if (dragState.isDragging) return;
  if (resizeState.isResizing) return;
  if (event.target.closest(".node-card")) return;
      cancelEdgeCreateInteractions();
      closeCreateNodeMenu();
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
      cancelEdgeCreateInteractions();
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
      cancelEdgeCreateInteractions();
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
      const previousFrame = lastVisibleNodeFrames.get(dragState.nodeId);
      const parsedWidth = dragState.cardEl ? Number.parseFloat(dragState.cardEl.style.width) : Number.NaN;
      const parsedHeight = dragState.cardEl ? Number.parseFloat(dragState.cardEl.style.height) : Number.NaN;
      const fallbackSize = getCardSize(draggedNode, state.expandedCanvasLocationId);
      const nextWrapperFrame = {
        x: nextLeft,
        y: nextTop,
        w: Number.isFinite(parsedWidth) ? parsedWidth : previousFrame?.w || fallbackSize.width,
        h: Number.isFinite(parsedHeight) ? parsedHeight : previousFrame?.h || fallbackSize.height
      };
      if (draggedNode) {
        if (draggedNode.type === "portal") {
          const nextBodyFrame = getRenderedPortalBodyFrame(
            dragState.cardEl,
            nextWrapperFrame,
            draggedNode,
            state.expandedCanvasLocationId
          );
          const nextCenter = getNodeVisualCenter(draggedNode, nextBodyFrame);
          draggedNode.graphPos = {
            x: nextCenter.x,
            y: nextCenter.y
          };
          lastVisibleNodeBodyFrames.set(dragState.nodeId, nextBodyFrame);
        } else {
          draggedNode.graphPos = {
            x: nextLeft + (fallbackSize.width / 2),
            y: nextTop + (fallbackSize.height / 2)
          };
          lastVisibleNodeBodyFrames.delete(dragState.nodeId);
        }
      }
      if (previousFrame) {
        lastVisibleNodeFrames.set(dragState.nodeId, nextWrapperFrame);
      }

      const activeExpandedRoot = state.expandedCanvasLocationId;
      if (activeExpandedRoot) {
        if (state.expandedDragRootId !== activeExpandedRoot) {
          state.expandedDragRootId = activeExpandedRoot;
          state.expandedDragOverrides = new Map();
        }
        if (draggedNode?.type === "portal") {
          const bodyFrame = lastVisibleNodeBodyFrames.get(dragState.nodeId)
            || getPortalBodyFrameFromWrapperFrame(draggedNode, nextWrapperFrame, activeExpandedRoot);
          state.expandedDragOverrides.set(dragState.nodeId, { left: bodyFrame.x, top: bodyFrame.y });
        } else {
          state.expandedDragOverrides.set(dragState.nodeId, { left: nextLeft, top: nextTop });
        }
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
      if (edgeCreateDraft.active) {
        updateEdgeDraftFromPointer(event);
        event.preventDefault();
        return;
      }
      if (updateLocationResize(event)) {
        return;
      }
      if (updateDraggedNodePosition(event)) {
        return;
      }
      if (
        !isPanning &&
        !dragState.isDragging &&
        !resizeState.isResizing &&
        !createNodeMenuOpen &&
        !portalLinkModalState.open &&
        !entityLinkModalState.open &&
        !workspaceMenuOpen &&
        !userMenuOpen
      ) {
        const candidate = resolveEdgeHoverCandidate(event);
        updateEdgeHoverIntent(candidate);
        if (
          edgeActionMenuState.visible &&
          !edgeActionPinned &&
          isPointerNearAnyVisibleNodeBorder(event.clientX, event.clientY)
        ) {
          hideEdgeActionMenu({ clearIntent: false });
        }
      } else if (!isPanning) {
        clearEdgeHoverIntent();
        clearEdgeCreateHover();
        clearEdgeActionIntent();
        if (!edgeActionPinned) {
          hideEdgeActionMenu({ clearIntent: false });
        }
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

    function onWindowMouseUp(event) {
      finalizeEdgeCreateDraft(event);
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

    function finishInlineNodeTitleEdit(nodeId, nextTitle, options = {}) {
      const shouldCommit = options.commit !== false;
      if (shouldCommit) {
        setNodeTitleById(nodeId, nextTitle);
      }
      newNodeInlineEditId = null;
      renderAll();
    }

    function createInlineNodeTitleInput(node) {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "node-inline-title-input";
      input.placeholder = "Untitled";
      input.value = node.title || "";
      input.maxLength = 120;

      let resolved = false;
      const commit = () => {
        if (resolved) return;
        resolved = true;
        finishInlineNodeTitleEdit(node.id, input.value, { commit: true });
      };
      const cancel = () => {
        if (resolved) return;
        resolved = true;
        finishInlineNodeTitleEdit(node.id, input.value, { commit: false });
      };

      input.addEventListener("mousedown", (event) => {
        event.stopPropagation();
      });
      input.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          commit();
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          cancel();
        }
      });
      input.addEventListener("blur", () => {
        commit();
      });

      requestAnimationFrame(() => {
        if (!input.isConnected) return;
        input.focus();
        input.select();
      });
      return input;
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

    function getSelectedNode() {
      const node = getNodeById(state.selectedNodeId);
      return isSelectableNode(node) ? node : null;
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
        const occupiedSize = getNodeOccupiedSize(node, null);
        const hasPos = hasValidGraphPos(node);
        const entry = {
          id: node.id,
          x: hasPos ? node.graphPos.x : 0,
          y: hasPos ? node.graphPos.y : 0,
          w: occupiedSize.width,
          h: occupiedSize.height,
          collisionRadius: getNodeOccupiedCollisionRadius(node, null)
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
        .force("collide", d3.forceCollide().radius((d) => (d.collisionRadius || (0.5 * Math.max(d.w, d.h))) + 16).iterations(2))
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
        handover: [],
        process: [],
        standard: [],
        portal: [],
        entity: [],
        collaboration: []
      };
      const laneOrder = [
        "location",
        "process",
        "standard",
        "handover",
        "portal",
        "entity",
        "collaboration"
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
          const occupiedSize = getNodeOccupiedSize(node, null);
          const stepY = occupiedSize.height + HYBRID_LANE_GAP_Y;
          const nextTop = rowIndex * stepY;

          if ((nextTop + occupiedSize.height) > HYBRID_LANE_MAX_HEIGHT && rowIndex > 0) {
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
        .force("collide", d3.forceCollide().radius((d) => (d.collisionRadius || (0.5 * Math.max(d.w, d.h))) + 16).iterations(2))
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
        const extents = getNodeOccupiedExtents(node, null);
        minX = Math.min(minX, node.graphPos.x + extents.left);
        minY = Math.min(minY, node.graphPos.y + extents.top);
        maxX = Math.max(maxX, node.graphPos.x + extents.right);
        maxY = Math.max(maxY, node.graphPos.y + extents.bottom);
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
        .filter((node) => node.type === "process" && normalizeProcessStatus(node.status) === "Active" && node.locationId === locationId)
        .sort((a, b) => a.label.localeCompare(b.label));
    }

    function getPinnedNonLocationLinks(locationNode) {
      if (!locationNode || locationNode.type !== "location") return [];
      return locationNode.linkedNodeIds
        .map((id) => getNodeById(id))
        .filter((node) => node && node.type !== "location")
        .filter((node) => node.type !== "process" || normalizeProcessStatus(node.status) === "Active");
    }

    function normalizeGlobalLocationSemantics() {
      const standardIds = new Set(nodes.filter((node) => node.type === "standard").map((node) => node.id));
      const processIds = new Set(nodes.filter((node) => node.type === "process").map((node) => node.id));
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
        .filter((node) => node.type === "process")
        .forEach((processNode) => {
          processNode.status = normalizeProcessStatus(processNode.status);
          // Strict parent->child direction keeps experiment nodes as leaves.
          processNode.linkedNodeIds = [];
          if (!locationIds.has(processNode.locationId)) {
            processNode.locationId = null;
          }
        });

      nodes
        .filter((node) => node.type === "standard")
        .forEach((standardNode) => {
          standardNode.locationId = null;
          standardNode.linkedNodeIds = uniqueIds(standardNode.linkedNodeIds.filter((id) => processIds.has(id)));
        });

      nodes
        .filter((node) => node.type === "portal")
        .forEach((portalNode) => {
          portalNode.locationId = null;
          portalNode.linkedNodeIds = uniqueIds(portalNode.linkedNodeIds.filter((id) => standardIds.has(id)));
        });

      // Keep location->experiment links for active experiments only.
      const activeExperimentsByLocation = new Map();
      nodes
        .filter((node) => node.type === "process" && normalizeProcessStatus(node.status) === "Active" && node.locationId)
        .forEach((processNode) => {
          const bucket = activeExperimentsByLocation.get(processNode.locationId) || [];
          bucket.push(processNode.id);
          activeExperimentsByLocation.set(processNode.locationId, bucket);
        });

      nodes
        .filter((node) => node.type === "location")
        .forEach((locationNode) => {
          const cleanedLinks = locationNode.linkedNodeIds.filter((linkedId) => {
            const linkedNode = getNodeById(linkedId);
            if (!linkedNode) return false;
            if (linkedNode.type === "location") return true;
            if (linkedNode.type === "standard") return true;
            if (linkedNode.type === "process") {
              return normalizeProcessStatus(linkedNode.status) === "Active" && linkedNode.locationId === locationNode.id;
            }
            // Location nodes should not directly link to portal nodes.
            return false;
          });
          const activeHere = activeExperimentsByLocation.get(locationNode.id) || [];
          locationNode.linkedNodeIds = uniqueIds([...cleanedLinks, ...activeHere]);
        });
    }

    function buildCollaborationAnchorId(workspaceId) {
      const workspaceSlug = sanitizeWorkspaceSlug(workspaceId) || "workspace";
      return `collaboration-${workspaceSlug}`;
    }

    function getDefaultCollaborationGraphPos(workspaceRecord, excludedNodeId = null) {
      const scopedNodeIds = Array.isArray(workspaceRecord?.nodeIds) ? workspaceRecord.nodeIds : [];
      const positionedNodes = scopedNodeIds
        .filter((nodeId) => nodeId !== excludedNodeId)
        .map((nodeId) => allNodesRuntime.find((node) => node.id === nodeId))
        .filter((node) => node && node.graphPos && Number.isFinite(node.graphPos.x) && Number.isFinite(node.graphPos.y));
      if (!positionedNodes.length) {
        return { x: 0, y: 0 };
      }
      const total = positionedNodes.reduce((acc, node) => {
        acc.x += node.graphPos.x;
        acc.y += node.graphPos.y;
        return acc;
      }, { x: 0, y: 0 });
      return {
        x: total.x / positionedNodes.length,
        y: total.y / positionedNodes.length
      };
    }

    function createAutoManagedCollaborationNode(workspaceRecord) {
      const ownerRecord = workspaceRecord?.ownerId ? userById.get(workspaceRecord.ownerId) : null;
      const defaultId = buildCollaborationAnchorId(workspaceRecord?.id);
      const nodeId = allNodesRuntime.some((node) => node.id === defaultId && node.type !== "collaboration")
        ? generateNodeId("collaboration")
        : defaultId;
      return {
        id: nodeId,
        type: "collaboration",
        title: "",
        label: "",
        ownerId: workspaceRecord?.ownerId || currentUserId || null,
        owner: ownerRecord?.name || workspaceRecord?.ownerId || "Unknown",
        summary: "Collaboration anchor",
        tasks: [],
        comments: [],
        locationId: null,
        graphPos: getDefaultCollaborationGraphPos(workspaceRecord)
      };
    }

    function normalizeProjectWorkspaceSemantics() {
      const allIds = new Set(nodes.map((node) => node.id));
      let changed = false;
      nodes.forEach((node) => {
        if (!Array.isArray(node.tasks)) {
          node.tasks = [];
          changed = true;
        }
        if (!Array.isArray(node.comments)) {
          node.comments = [];
          changed = true;
        }
        if (typeof node.summary !== "string" || !node.summary.trim()) {
          node.summary = "Click to enter node description";
          changed = true;
        }
        if (node.type === "location") {
          const nextKind = node.kind || "generic";
          if (node.kind !== nextKind) {
            node.kind = nextKind;
            changed = true;
          }
        }
        if (node.type === "process") {
          const nextStatus = normalizeProcessStatus(node.status);
          if (node.status !== nextStatus) {
            node.status = nextStatus;
            changed = true;
          }
        }
        if (node.type === "handover") {
          if (normalizeHandoverFieldsForNode(node)) {
            changed = true;
          }
        }
        if (node.type === "entity") {
          if (normalizeEntityLinkFieldsForNode(node)) {
            changed = true;
          }
          if (node.locationId !== null) {
            node.locationId = null;
            changed = true;
          }
        }
        if (node.type === "collaboration") {
          if (node.title !== "" || node.label !== "") {
            node.title = "";
            node.label = "";
            changed = true;
          }
          if (node.locationId !== null) {
            node.locationId = null;
            changed = true;
          }
        }
        if (node.locationId && !allIds.has(node.locationId)) {
          node.locationId = null;
          changed = true;
        }
      });
      return { changed, reloadWorkspace: false };
    }

    function normalizeCollaborationWorkspaceSemantics() {
      const workspaceRecord = workspaceById.get(currentWorkspaceId || "");
      if (!workspaceRecord) return { changed: false, reloadWorkspace: false };
      if (!Array.isArray(workspaceRecord.nodeIds)) {
        workspaceRecord.nodeIds = [];
      }
      const runtimeNodeById = new Map(allNodesRuntime.map((node) => [node.id, node]));
      const scopedNodeIds = workspaceRecord.nodeIds.filter((nodeId) => runtimeNodeById.has(nodeId));
      let changed = false;
      let reloadWorkspace = false;
      const collaborationNodes = scopedNodeIds
        .map((nodeId) => runtimeNodeById.get(nodeId))
        .filter((node) => node && node.type === "collaboration");
      let anchorNode = null;
      if (collaborationNodes.length) {
        anchorNode = collaborationNodes.find((node) => node.id === workspaceRecord.homeNodeId) || collaborationNodes[0];
      } else {
        const deterministicAnchor = runtimeNodeById.get(buildCollaborationAnchorId(workspaceRecord.id)) || null;
        anchorNode = deterministicAnchor && deterministicAnchor.type === "collaboration"
          ? deterministicAnchor
          : null;
        if (!anchorNode) {
          anchorNode = createAutoManagedCollaborationNode(workspaceRecord);
          allNodesRuntime.push(anchorNode);
          runtimeNodeById.set(anchorNode.id, anchorNode);
          changed = true;
        }
        workspaceRecord.nodeIds.unshift(anchorNode.id);
        changed = true;
        reloadWorkspace = true;
      }

      const seenCollaborationAnchor = new Set();
      const nextWorkspaceNodeIds = workspaceRecord.nodeIds.filter((nodeId) => {
        const node = runtimeNodeById.get(nodeId);
        if (!node) return false;
        if (nodeId !== anchorNode.id) {
          if (node.type !== "collaboration") return true;
          return false;
        }
        if (seenCollaborationAnchor.has(nodeId)) return false;
        seenCollaborationAnchor.add(nodeId);
        return true;
      });
      if (
        nextWorkspaceNodeIds.length !== workspaceRecord.nodeIds.length ||
        nextWorkspaceNodeIds.some((nodeId, index) => workspaceRecord.nodeIds[index] !== nodeId)
      ) {
        workspaceRecord.nodeIds = nextWorkspaceNodeIds;
        changed = true;
        reloadWorkspace = true;
      }

      if (Array.isArray(workspaceRecord.edgeIds)) {
        const runtimeEdgeById = new Map(allEdgesRuntime.map((edge) => [edge.id, edge]));
        const nextEdgeIds = workspaceRecord.edgeIds.filter((edgeId) => {
          const edge = runtimeEdgeById.get(edgeId) || null;
          return !!edge &&
            (!edge.workspaceId || edge.workspaceId === workspaceRecord.id) &&
            runtimeNodeById.has(edge.sourceId) &&
            runtimeNodeById.has(edge.targetId);
        });
        if (
          nextEdgeIds.length !== workspaceRecord.edgeIds.length ||
          nextEdgeIds.some((edgeId, index) => workspaceRecord.edgeIds[index] !== edgeId)
        ) {
          workspaceRecord.edgeIds = nextEdgeIds;
          changed = true;
        }
      }

      if (workspaceRecord.homeNodeId !== anchorNode.id) {
        workspaceRecord.homeNodeId = anchorNode.id;
        changed = true;
      }

      if (!anchorNode.graphPos || !Number.isFinite(anchorNode.graphPos.x) || !Number.isFinite(anchorNode.graphPos.y)) {
        anchorNode.graphPos = getDefaultCollaborationGraphPos(workspaceRecord, anchorNode.id);
        changed = true;
      }

      rebuildVisibleWorkspaceGraph(workspaceRecord);

      const baseResult = normalizeProjectWorkspaceSemantics();
      if (baseResult.changed) {
        changed = true;
      }
      nodes.forEach((node) => {
        if (node.type === "collaboration") {
          if (node.title !== "" || node.label !== "") {
            node.title = "";
            node.label = "";
            changed = true;
          }
        }
      });
      return { changed, reloadWorkspace };
    }

    function normalizeActiveWorkspaceSemantics() {
      const result = currentWorkspaceKind === "collab"
        ? normalizeCollaborationWorkspaceSemantics()
        : normalizeProjectWorkspaceSemantics();
      if (!result.changed) return;
      syncNodeRuntimeAndStore();
      syncWorkspaceRuntimeAndStore();
      persistStoreToLocalStorage();
      if (result.reloadWorkspace) {
        applyWorkspaceData(currentWorkspaceId, { sanitizeState: true });
      }
    }

    function hasMentionForCurrentUser(text) {
      const lower = String(text || "").toLowerCase();
      return lower.includes(CURRENT_USER_HANDLE.toLowerCase()) || lower.includes(`@${CURRENT_USER.toLowerCase()}`);
    }
    function buildNotifications() {
      const notifications = [];
      nodes.forEach((node) => {
        node.tasks.forEach((task) => {
          if (isTaskAssignedToCurrentUser(task.assignedTo) && !task.done && !state.seenTaskIds.has(task.id)) {
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
          const ownerUpdate = isNodeOwnedByCurrentUser(node);
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
      if (node.type === "process" && node.locationId) {
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

    function createStatusPill(status, extraClasses = []) {
      const pill = document.createElement("span");
      pill.className = ["status-pill", getStatusClass(status), ...extraClasses].filter(Boolean).join(" ");
      pill.textContent = status;
      return pill;
    }

    function createNodeRow(node, extraClasses = []) {
      if (!node || !isSelectableNode(node)) return null;
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

      if (node.type === "process") {
        row.appendChild(createStatusPill(normalizeProcessStatus(node.status)));
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
          emptyActive.textContent = "No active processes.";
          wrapper.appendChild(emptyActive);
        } else {
          const activeWrap = document.createElement("div");
          activeWrap.className = "location-indent";
          active.forEach((processNode) => activeWrap.appendChild(createNodeRow(processNode)));
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

      if (isAdminMode()) {
        const emptyState = document.createElement("div");
        emptyState.className = "node-list-empty";
        emptyState.textContent = "Admin mode. Use the menu to edit organisations or users.";
        nodeListEl.appendChild(emptyState);
        return;
      }

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
        sorted
          .filter((node) => isSelectableNode(node))
          .forEach((node) => {
            const row = createNodeRow(node);
            if (row) {
              nodeListEl.appendChild(row);
            }
          });
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
      if (isWorkspaceAnchorNode(node)) {
        return { width: ANCHOR_NODE_DIAMETER_PX, height: ANCHOR_NODE_DIAMETER_PX };
      }
      if (node.type === "location" && expandedLocationId === node.id) {
        const metrics = getExpandedLocationMetrics(node);
        return { width: metrics.cardWidthPx, height: metrics.cardHeightPx };
      }
      if (node.type === "entity") {
        return getEntityDiamondSize(node);
      }
      return {
        width: COLLAPSED_CARD_WIDTH_BY_TYPE[node.type] || COLLAPSED_CARD_W,
        height: COLLAPSED_CARD_HEIGHT_BY_TYPE[node.type] || NODE_HEIGHT
      };
    }

    function getPortalBodyOffsetWithinWrapper(node, wrapperFrame, expandedLocationId = null) {
      const bodyFrame = getPortalBodyFrameFromWrapperFrame(node, wrapperFrame, expandedLocationId);
      return {
        left: bodyFrame.x - wrapperFrame.x,
        top: bodyFrame.y - wrapperFrame.y,
        width: bodyFrame.w,
        height: bodyFrame.h
      };
    }

    function getPortalBodyFrameFromCardStyles(cardEl, wrapperFrame, node, expandedLocationId = null) {
      if (!cardEl || !wrapperFrame || !node || node.type !== "portal") {
        return getPortalBodyFrameFromWrapperFrame(node, wrapperFrame, expandedLocationId);
      }
      const expectedFrame = getPortalBodyFrameFromWrapperFrame(node, wrapperFrame, expandedLocationId);
      const bodyEl = cardEl.querySelector(".node-portal-body");
      if (!(bodyEl instanceof HTMLElement)) {
        return expectedFrame;
      }
      const parsedLeft = Number.parseFloat(bodyEl.style.left);
      const parsedTop = Number.parseFloat(bodyEl.style.top);
      const parsedWidth = Number.parseFloat(bodyEl.style.width);
      const parsedHeight = Number.parseFloat(bodyEl.style.height);
      const left = Number.isFinite(parsedLeft) ? parsedLeft : bodyEl.offsetLeft;
      const top = Number.isFinite(parsedTop) ? parsedTop : bodyEl.offsetTop;
      const width = Number.isFinite(parsedWidth) && parsedWidth > 0 ? parsedWidth : bodyEl.offsetWidth;
      const height = Number.isFinite(parsedHeight) && parsedHeight > 0 ? parsedHeight : bodyEl.offsetHeight;
      if (!Number.isFinite(left) || !Number.isFinite(top) || width <= 0 || height <= 0) {
        return expectedFrame;
      }
      return {
        x: wrapperFrame.x + left,
        y: wrapperFrame.y + top,
        w: width,
        h: height
      };
    }

    function getRenderedPortalBodyFrame(cardEl, wrapperFrame, node, expandedLocationId = null) {
      if (!cardEl || !wrapperFrame || !node || node.type !== "portal") return null;
      const expectedFrame = getPortalBodyFrameFromCardStyles(cardEl, wrapperFrame, node, expandedLocationId);
      const bodyEl = cardEl.querySelector(".node-portal-body");
      if (!(bodyEl instanceof HTMLElement)) {
        return expectedFrame;
      }
      const zoom = Number.isFinite(camera.zoom) && camera.zoom > 0 ? camera.zoom : 1;
      const planeEl = cardEl.closest(".canvas-plane");
      if (planeEl instanceof HTMLElement) {
        const planeRect = planeEl.getBoundingClientRect();
        const bodyRect = bodyEl.getBoundingClientRect();
        if (
          Number.isFinite(planeRect.left) &&
          Number.isFinite(planeRect.top) &&
          Number.isFinite(bodyRect.left) &&
          Number.isFinite(bodyRect.top) &&
          bodyRect.width > 0 &&
          bodyRect.height > 0
        ) {
          const renderedFrame = {
            x: (bodyRect.left - planeRect.left) / zoom,
            y: (bodyRect.top - planeRect.top) / zoom,
            w: bodyRect.width / zoom,
            h: bodyRect.height / zoom
          };
          const maxDelta = Math.max(
            Math.abs(renderedFrame.x - expectedFrame.x),
            Math.abs(renderedFrame.y - expectedFrame.y),
            Math.abs(renderedFrame.w - expectedFrame.w),
            Math.abs(renderedFrame.h - expectedFrame.h)
          );
          if (maxDelta > 1 && !hasWarnedPortalBodyFrameMismatch) {
            console.warn("Portal body frame differed from computed portal geometry; using rendered body frame.", {
              nodeId: node.id,
              expectedFrame,
              renderedFrame
            });
            hasWarnedPortalBodyFrameMismatch = true;
          }
          return renderedFrame;
        }
      }
      return expectedFrame;
    }

    function buildVisibleNodeBodyFrameCache(visibleNodeFrames, renderedCardsById, expandedLocationId = null, options = {}) {
      const useRenderedFrame = options.useRenderedFrame === true;
      const bodyFrames = new Map();
      renderedCardsById.forEach((card, nodeId) => {
        const node = getNodeById(nodeId);
        const wrapperFrame = visibleNodeFrames.get(nodeId);
        if (!node || node.type !== "portal" || !wrapperFrame) return;
        bodyFrames.set(
          nodeId,
          useRenderedFrame
            ? getRenderedPortalBodyFrame(card, wrapperFrame, node, expandedLocationId)
            : getPortalBodyFrameFromCardStyles(card, wrapperFrame, node, expandedLocationId)
        );
      });
      return bodyFrames;
    }

    function refreshVisiblePortalBodyFramesFromDOM() {
      if (!lastVisibleNodeFrames || !lastVisibleNodeFrames.size) return;
      if (!lastRenderedCardsById || !lastRenderedCardsById.size) return;
      const expandedLocationId =
        state.expandedCanvasLocationId && lastVisibleNodeIds.has(state.expandedCanvasLocationId)
          ? state.expandedCanvasLocationId
          : null;
      lastVisibleNodeBodyFrames = buildVisibleNodeBodyFrameCache(
        lastVisibleNodeFrames,
        lastRenderedCardsById,
        expandedLocationId,
        { useRenderedFrame: true }
      );
    }

    function computeNodeFrame(node, expandedLocationId, layoutOverride = null) {
      if (node && node.type === "portal" && !isWorkspaceAnchorNode(node)) {
        const size = getCardSize(node, expandedLocationId);
        const extents = getNodeOccupiedExtents(node, expandedLocationId);
        if (layoutOverride) {
          const bodyLeft = layoutOverride.left;
          const bodyTop = layoutOverride.top;
          const centerX = bodyLeft + (size.width / 2);
          const centerY = bodyTop + (size.height / 2);
          return {
            x: centerX + extents.left,
            y: centerY + extents.top,
            w: extents.width,
            h: extents.height
          };
        }
        const centerX = node && node.graphPos ? node.graphPos.x : 100;
        const centerY = node && node.graphPos ? node.graphPos.y : 100;
        return {
          x: centerX + extents.left,
          y: centerY + extents.top,
          w: extents.width,
          h: extents.height
        };
      }
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

    function resolveCollisions(orderedPlacements, sizeById, canvasWidth, gridStep, expandedLocationId = null) {
      const placedRects = [];
      const result = new Map();

      orderedPlacements.forEach((placement) => {
        const size = sizeById.get(placement.id);
        if (!size) return;
        const node = getNodeById(placement.id);
        const extents = getNodeOccupiedExtents(node, expandedLocationId);

        const minX = Math.max(
          LAYOUT_MARGIN,
          LAYOUT_MARGIN - (size.width / 2) - extents.left
        );
        const maxX = Math.max(
          minX,
          canvasWidth - LAYOUT_MARGIN - (size.width / 2) - extents.right
        );
        let startX = snapToGrid(placement.columnX ?? placement.x, gridStep);
        startX = Math.min(Math.max(startX, minX), maxX);

        let x = snapToGrid(placement.x, gridStep);
        x = Math.min(Math.max(x, minX), maxX);
        let y = snapToGrid(placement.y, gridStep);

        let guard = 0;
        while (guard < 5000) {
          const candidate = getNodeOccupiedRect(node, {
            x,
            y,
            w: size.width,
            h: size.height
          }, expandedLocationId);
          const collides = placedRects.some((placed) => intersectsRect(candidate, placed));
          if (!collides) {
            placedRects.push(candidate);
            result.set(placement.id, { left: x, top: y });
            break;
          }
          x += gridStep;
          if (x > maxX) {
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
          placedRects.push(getNodeOccupiedRect(node, {
            x: fallback.left,
            y: fallback.top,
            w: size.width,
            h: size.height
          }, expandedLocationId));
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
      const occupiedSizeById = new Map();
      visibleSet.forEach((id) => {
        const node = getNodeById(id);
        if (!node) return;
        sizeById.set(id, getCardSize(node, expandedLocationId));
        occupiedSizeById.set(id, getNodeOccupiedSize(node, expandedLocationId));
      });

      const directNonLocation = expandedNode.linkedNodeIds.filter((id) => {
        const node = getNodeById(id);
        return !!node && visibleSet.has(node.id) && node.type !== "location";
      });

      const activeAtExpanded = nodes
        .filter((node) =>
          node.type === "process" &&
          normalizeProcessStatus(node.status) === "Active" &&
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
          const occupiedSize = occupiedSizeById.get(id);
          if (!occupiedSize) return;
          orderedPlacements.push({
            id,
            x: columnX,
            y: cursorY,
            columnX
          });
          cursorY += occupiedSize.height + ROW_GAP;
        });
      };

      appendColumn(col1Ids, col1X, anchorY);
      appendColumn(col2Ids, col2X, anchorY);
      appendColumn(restIds, restX, anchorY);

      return resolveCollisions(orderedPlacements, sizeById, CANVAS_WIDTH, GRID_STEP, expandedLocationId);
    }

    function handleGraphNodeCardClick(node, event) {
      if (suppressClickNodeId === node.id) {
        suppressClickNodeId = null;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (suppressClickNodeId) {
        suppressClickNodeId = null;
      }
      if (node.type === "collaboration") {
        resetLocationClickTracker();
        resetPortalClickTracker();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (node.type === "location") {
        resetPortalClickTracker();
        handleLocationCardClick(node.id);
        return;
      }
      if (node.type === "portal") {
        resetLocationClickTracker();
        if (isPortalDoubleClick(node.id)) {
          resetPortalClickTracker();
          handlePortalDoubleClick(node.id);
          return;
        }
        selectNode(node.id, { source: "graph" });
        return;
      }
      resetLocationClickTracker();
      resetPortalClickTracker();
      selectNode(node.id, { source: "graph" });
    }

    function createNodeCard(node, isSelected, layoutOverride = null) {
      const frame = computeNodeFrame(node, state.expandedCanvasLocationId, layoutOverride);
      const isExpandedLocationCard = node.type === "location" && isLocationCardExpanded(node.id);
      const isAnchorCard = isWorkspaceAnchorNode(node);

      const card = document.createElement("div");
      card.className = `node-card ${node.type}${isSelected ? " selected" : ""}`;
      if (isAnchorCard) {
        card.classList.add("anchor");
      }
      if (isExpandedLocationCard) {
        card.classList.add("expanded");
      } else {
        card.classList.add("drag-anywhere");
      }
      card.style.width = `${frame.w}px`;
      card.style.height = `${frame.h}px`;
      card.style.left = `${frame.x}px`;
      card.style.top = `${frame.y}px`;
      card.style.setProperty("--graph-node-text-inset", `${GRAPH_NODE_TEXT_INSET_PX}px`);
      card.dataset.nodeId = node.id;
      buildNodeCardContent(card, node, frame);
      const dragHandle = card.querySelector(".node-drag-handle");
      const portalBody = node.type === "portal" && !isAnchorCard ? card.querySelector(".node-portal-body") : null;
      const anchorBody = isAnchorCard ? card.querySelector(".node-anchor-body") : null;
      if (isExpandedLocationCard && dragHandle) {
        dragHandle.addEventListener("mousedown", (event) => startNodeDrag(event, node.id, card));
      } else if (anchorBody) {
        anchorBody.addEventListener("mousedown", (event) => startNodeDrag(event, node.id, card));
      } else if (node.type === "portal" && portalBody) {
        portalBody.addEventListener("mousedown", (event) => startNodeDrag(event, node.id, card));
      } else {
        card.addEventListener("mousedown", (event) => startNodeDrag(event, node.id, card));
      }
      if (anchorBody) {
        anchorBody.addEventListener("click", (event) => {
          event.stopPropagation();
          handleGraphNodeCardClick(node, event);
        });
      } else if (node.type === "portal" && portalBody) {
        portalBody.addEventListener("click", (event) => {
          event.stopPropagation();
          handleGraphNodeCardClick(node, event);
        });
      } else {
        card.addEventListener("click", (event) => handleGraphNodeCardClick(node, event));
      }
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

    function resetPortalClickTracker() {
      lastPortalClick = { nodeId: null, at: 0 };
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

    function isPortalDoubleClick(nodeId) {
      const now = Date.now();
      const isDouble =
        lastPortalClick.nodeId === nodeId &&
        now - lastPortalClick.at <= LOCATION_DOUBLE_CLICK_MS;
      lastPortalClick = { nodeId, at: now };
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
        .filter((node) => node.type === "process" && normalizeProcessStatus(node.status) === "Active" && node.locationId === expandedNode.id)
        .forEach((processNode) => {
          visibleNodeIds.add(processNode.id);
          nonLocationSeedIds.add(processNode.id);
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

    function buildNodeCardContent(card, node, frame) {
      if (isWorkspaceAnchorNode(node)) {
        buildAnchorCardContent(card, node, frame);
        return;
      }
      if (node.type === "location") {
        buildLocationCardContent(card, node);
        return;
      }
      if (node.type === "process") {
        buildProcessCardContent(card, node);
        return;
      }
      if (node.type === "standard") {
        buildStandardCardContent(card, node);
        return;
      }
      if (node.type === "portal") {
        buildPortalCardContent(card, node, frame);
        return;
      }
      if (node.type === "entity") {
        buildEntityCardContent(card, node);
        return;
      }
      if (node.type === "collaboration") {
        buildCollaborationCardContent(card, node, frame);
        return;
      }
      buildArtifactCardContent(card, node);
    }

    function buildAnchorCardContent(card, node, frame) {
      const labelText = getAnchorNodeDisplayLabel(node);
      if (labelText) {
        const hoverLabel = document.createElement("div");
        hoverLabel.className = "node-portal-hover-label";
        hoverLabel.textContent = labelText;
        hoverLabel.style.left = `${frame.w / 2}px`;
        hoverLabel.style.top = `${-PORTAL_LABEL_GAP_PX}px`;
        card.appendChild(hoverLabel);
      }
      const body = document.createElement("div");
      body.className = "node-anchor-body node-drag-handle";
      body.style.left = "0px";
      body.style.top = "0px";
      body.style.width = `${frame.w}px`;
      body.style.height = `${frame.h}px`;
      const icon = document.createElementNS(SVG_NS, "svg");
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("aria-hidden", "true");
      icon.classList.add("node-anchor-glyph");
      const roof = createSvgElement("path", {
        d: "M4.5 11.25 12 5l7.5 6.25",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "1.8",
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      });
      const house = createSvgElement("path", {
        d: "M7 10.75V19h10v-8.25",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "1.8",
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      });
      const door = createSvgElement("path", {
        d: "M10.5 19v-4.75h3V19",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "1.8",
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      });
      icon.appendChild(roof);
      icon.appendChild(house);
      icon.appendChild(door);
      body.appendChild(icon);
      card.appendChild(body);
    }

    function buildLocationCardContent(card, node) {
      const expanded = isLocationCardExpanded(node.id);
      const header = document.createElement("div");
      header.className = "node-card-header node-drag-handle";

      let title = null;
      if (node.id === newNodeInlineEditId) {
        title = createInlineNodeTitleInput(node);
      } else {
        title = document.createElement("div");
        title.className = "node-card-label";
        title.textContent = node.label;
      }

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

    function buildProcessCardContent(card, node) {
      const header = document.createElement("div");
      header.className = "node-card-header node-drag-handle";

      let title = null;
      if (node.id === newNodeInlineEditId) {
        title = createInlineNodeTitleInput(node);
      } else {
        title = document.createElement("div");
        title.className = "node-card-label";
        title.textContent = node.label;
      }
      header.appendChild(title);

      const footer = document.createElement("div");
      footer.className = "node-card-footer";

      const owner = document.createElement("div");
      owner.className = "node-card-owner";
      owner.textContent = node.owner;

      const status = createStatusControlForNode(node, "graph");

      card.appendChild(header);
      footer.appendChild(owner);
      if (status) {
        footer.appendChild(status);
      }
      card.appendChild(footer);
    }

    function buildStandardCardContent(card, node) {
      const header = document.createElement("div");
      header.className = "node-card-header node-drag-handle";

      let title = null;
      if (node.id === newNodeInlineEditId) {
        title = createInlineNodeTitleInput(node);
      } else {
        title = document.createElement("div");
        title.className = "node-card-label";
        title.textContent = node.label;
      }
      header.appendChild(title);

      const footer = document.createElement("div");
      footer.className = "node-card-footer";

      const owner = document.createElement("div");
      owner.className = "node-card-owner";
      owner.textContent = node.owner;

      card.appendChild(header);
      footer.appendChild(owner);
      card.appendChild(footer);
    }

    function buildPortalCardContent(card, node, frame) {
      const bodyOffset = getPortalBodyOffsetWithinWrapper(node, frame, state.expandedCanvasLocationId);
      const linkedWorkspaceName = getPortalLinkedWorkspaceName(node);
      if (linkedWorkspaceName) {
        const hoverLabel = document.createElement("div");
        hoverLabel.className = "node-portal-hover-label";
        hoverLabel.textContent = linkedWorkspaceName;
        hoverLabel.style.left = `${bodyOffset.left + (bodyOffset.width / 2)}px`;
        hoverLabel.style.top = `${bodyOffset.top - PORTAL_LABEL_GAP_PX}px`;
        card.appendChild(hoverLabel);
      }
      const body = document.createElement("div");
      body.className = "node-portal-body node-drag-handle";
      body.style.left = `${bodyOffset.left}px`;
      body.style.top = `${bodyOffset.top}px`;
      body.style.width = `${bodyOffset.width}px`;
      body.style.height = `${bodyOffset.height}px`;
      const icon = document.createElement("div");
      icon.className = "node-portal-glyph";
      const ring = document.createElement("span");
      ring.className = "node-portal-glyph-ring";
      const core = document.createElement("span");
      core.className = "node-portal-glyph-core";
      icon.appendChild(ring);
      icon.appendChild(core);

      body.appendChild(icon);
      card.appendChild(body);
    }

    function buildRoundedPolygonPathData(points, cornerRadius = 0) {
      if (!Array.isArray(points) || points.length < 3) return "";
      const normalizedPoints = points
        .map((point) => ({
          x: Number(point?.x),
          y: Number(point?.y)
        }))
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
      if (normalizedPoints.length < 3) return "";
      const radius = Math.max(0, Number(cornerRadius) || 0);
      const roundedPoints = normalizedPoints.map((point, index) => {
        const prev = normalizedPoints[(index - 1 + normalizedPoints.length) % normalizedPoints.length];
        const next = normalizedPoints[(index + 1) % normalizedPoints.length];
        const prevDx = prev.x - point.x;
        const prevDy = prev.y - point.y;
        const nextDx = next.x - point.x;
        const nextDy = next.y - point.y;
        const prevLength = Math.hypot(prevDx, prevDy);
        const nextLength = Math.hypot(nextDx, nextDy);
        const effectiveRadius = Math.min(radius, prevLength / 2, nextLength / 2);
        const incoming = effectiveRadius > 0 && prevLength > 0
          ? {
              x: point.x + ((prevDx / prevLength) * effectiveRadius),
              y: point.y + ((prevDy / prevLength) * effectiveRadius)
            }
          : { x: point.x, y: point.y };
        const outgoing = effectiveRadius > 0 && nextLength > 0
          ? {
              x: point.x + ((nextDx / nextLength) * effectiveRadius),
              y: point.y + ((nextDy / nextLength) * effectiveRadius)
            }
          : { x: point.x, y: point.y };
        return { point, incoming, outgoing };
      });
      const first = roundedPoints[0];
      let path = `M ${first.outgoing.x.toFixed(2)} ${first.outgoing.y.toFixed(2)}`;
      for (let index = 1; index < roundedPoints.length; index += 1) {
        const roundedPoint = roundedPoints[index];
        path += ` L ${roundedPoint.incoming.x.toFixed(2)} ${roundedPoint.incoming.y.toFixed(2)}`;
        path += ` Q ${roundedPoint.point.x.toFixed(2)} ${roundedPoint.point.y.toFixed(2)} ${roundedPoint.outgoing.x.toFixed(2)} ${roundedPoint.outgoing.y.toFixed(2)}`;
      }
      path += ` L ${first.incoming.x.toFixed(2)} ${first.incoming.y.toFixed(2)}`;
      path += ` Q ${first.point.x.toFixed(2)} ${first.point.y.toFixed(2)} ${first.outgoing.x.toFixed(2)} ${first.outgoing.y.toFixed(2)} Z`;
      return path;
    }

    function buildRoundedDiamondPathData(width = 100, height = 100, cornerRadius = 0, inset = 0) {
      const normalizedWidth = Math.max(1, Number(width) || 1);
      const normalizedHeight = Math.max(1, Number(height) || 1);
      const normalizedInset = Math.max(
        0,
        Math.min(
          Number(inset) || 0,
          (normalizedWidth / 2) - 0.5,
          (normalizedHeight / 2) - 0.5
        )
      );
      const left = normalizedInset;
      const right = normalizedWidth - normalizedInset;
      const top = normalizedInset;
      const bottom = normalizedHeight - normalizedInset;
      return buildRoundedPolygonPathData([
        { x: normalizedWidth / 2, y: top },
        { x: right, y: normalizedHeight / 2 },
        { x: normalizedWidth / 2, y: bottom },
        { x: left, y: normalizedHeight / 2 }
      ], cornerRadius);
    }

    function buildEntityCardContent(card, node) {
      const idBase = String(node?.id || "entity").replace(/[^A-Za-z0-9_-]/g, "_");
      const baseGradientId = `entityBaseGrad_${idBase}`;
      const sheenGradientId = `entitySheenGrad_${idBase}`;
      const highlightGradientId = `entityHighlightGrad_${idBase}`;
      const innerGradientId = `entityInnerGrad_${idBase}`;
      const outerPathData = buildRoundedDiamondPathData(100, 100, 9, 0.8);
      const innerPathData = buildRoundedDiamondPathData(100, 100, 6.5, 12);
      const body = document.createElement("div");
      body.className = "node-entity-body";
      const surface = createSvgElement("svg", {
        class: "node-entity-surface",
        viewBox: "0 0 100 100",
        preserveAspectRatio: "none",
        "aria-hidden": "true"
      });
      const defs = createSvgElement("defs");
      const baseGradient = createSvgElement("linearGradient", {
        id: baseGradientId,
        x1: "14%",
        y1: "4%",
        x2: "86%",
        y2: "100%"
      });
      [
        { offset: "0%", color: "rgb(255, 255, 255)", opacity: "0.42" },
        { offset: "54%", color: "rgb(255, 255, 255)", opacity: "0.31" },
        { offset: "100%", color: "rgb(255, 255, 255)", opacity: "0.22" }
      ].forEach((stop) => {
        baseGradient.appendChild(createSvgElement("stop", {
          offset: stop.offset,
          "stop-color": stop.color,
          "stop-opacity": stop.opacity
        }));
      });
      const sheenGradient = createSvgElement("linearGradient", {
        id: sheenGradientId,
        x1: "18%",
        y1: "0%",
        x2: "70%",
        y2: "100%"
      });
      [
        { offset: "0%", color: "rgb(255, 255, 255)", opacity: "0.28" },
        { offset: "42%", color: "rgb(255, 255, 255)", opacity: "0.14" },
        { offset: "100%", color: "rgb(255, 255, 255)", opacity: "0.03" }
      ].forEach((stop) => {
        sheenGradient.appendChild(createSvgElement("stop", {
          offset: stop.offset,
          "stop-color": stop.color,
          "stop-opacity": stop.opacity
        }));
      });
      const highlightGradient = createSvgElement("radialGradient", {
        id: highlightGradientId,
        cx: "26%",
        cy: "8%",
        r: "84%"
      });
      [
        { offset: "0%", color: "rgb(255, 255, 255)", opacity: "0.34" },
        { offset: "58%", color: "rgb(255, 255, 255)", opacity: "0.10" },
        { offset: "100%", color: "rgb(255, 255, 255)", opacity: "0" }
      ].forEach((stop) => {
        highlightGradient.appendChild(createSvgElement("stop", {
          offset: stop.offset,
          "stop-color": stop.color,
          "stop-opacity": stop.opacity
        }));
      });
      const innerGradient = createSvgElement("linearGradient", {
        id: innerGradientId,
        x1: "28%",
        y1: "14%",
        x2: "78%",
        y2: "88%"
      });
      [
        { offset: "0%", color: "rgb(255, 255, 255)", opacity: "0.16" },
        { offset: "100%", color: "rgb(255, 255, 255)", opacity: "0.03" }
      ].forEach((stop) => {
        innerGradient.appendChild(createSvgElement("stop", {
          offset: stop.offset,
          "stop-color": stop.color,
          "stop-opacity": stop.opacity
        }));
      });
      defs.appendChild(baseGradient);
      defs.appendChild(sheenGradient);
      defs.appendChild(highlightGradient);
      defs.appendChild(innerGradient);
      surface.appendChild(defs);
      surface.appendChild(createSvgElement("path", {
        class: "node-entity-diamond-base",
        d: outerPathData,
        fill: `url(#${baseGradientId})`
      }));
      surface.appendChild(createSvgElement("path", {
        class: "node-entity-diamond-tint",
        d: outerPathData
      }));
      surface.appendChild(createSvgElement("path", {
        class: "node-entity-diamond-sheen",
        d: outerPathData,
        fill: `url(#${sheenGradientId})`
      }));
      surface.appendChild(createSvgElement("path", {
        class: "node-entity-diamond-highlight",
        d: outerPathData,
        fill: `url(#${highlightGradientId})`
      }));
      surface.appendChild(createSvgElement("path", {
        class: "node-entity-diamond-inner",
        d: innerPathData,
        fill: `url(#${innerGradientId})`
      }));
      surface.appendChild(createSvgElement("path", {
        class: "node-entity-diamond-outline",
        d: outerPathData
      }));
      surface.appendChild(createSvgElement("path", {
        class: "node-entity-diamond-focus-ring",
        d: outerPathData
      }));
      const content = document.createElement("div");
      content.className = "node-entity-content";
      const label = document.createElement("div");
      label.className = "node-entity-label";
      label.textContent = node.label || getEntityLabelFallback(node) || "Entity";
      content.appendChild(label);
      body.appendChild(surface);
      card.appendChild(body);
      card.appendChild(content);
    }

    function buildCollaborationCardContent(card, node, frame) {
      const body = document.createElement("div");
      body.className = "node-anchor-body node-collaboration-body node-drag-handle";
      body.style.left = "0px";
      body.style.top = "0px";
      body.style.width = `${frame.w}px`;
      body.style.height = `${frame.h}px`;
      const caustics = document.createElement("div");
      caustics.className = "orb-caustics";
      caustics.setAttribute("aria-hidden", "true");
      body.appendChild(caustics);
      card.appendChild(body);
    }

    function buildArtifactCardContent(card, node) {
      const header = document.createElement("div");
      header.className = "node-card-header node-drag-handle";

      let title = null;
      if (node.id === newNodeInlineEditId) {
        title = createInlineNodeTitleInput(node);
      } else {
        title = document.createElement("div");
        title.className = "node-card-label";
        title.textContent = node.label;
      }
      header.appendChild(title);

      const footer = document.createElement("div");
      footer.className = "node-card-footer";

      const owner = document.createElement("div");
      owner.className = "node-card-owner";
      owner.textContent = node.owner;
      footer.appendChild(owner);

      const statusValue = getNodeStatusValue(node);
      if (statusValue) {
        const status = createStatusControlForNode(node, "graph");
        if (status) {
          footer.appendChild(status);
        }
      } else if (node.type !== "handover") {
        const badge = document.createElement("span");
        badge.className = "node-card-type-badge";
        badge.textContent = getTypeShort(node.type);
        footer.appendChild(badge);
      }

      card.appendChild(header);
      card.appendChild(footer);

      if (node.type === "handover") {
        const handoverCorner = document.createElement("div");
        handoverCorner.className = "handover-corner-mark";
        handoverCorner.setAttribute("aria-hidden", "true");
        card.appendChild(handoverCorner);
      }
    }

    function createSvgElement(tag, attrs = {}) {
      const el = document.createElementNS(SVG_NS, tag);
      Object.entries(attrs).forEach(([key, value]) => {
        el.setAttribute(key, String(value));
      });
      return el;
    }

    function setEdgeHoverState(visibleEdgeEl, chevronEl, sourceId, targetId, isHover) {
      const edgeElements = Array.isArray(visibleEdgeEl) ? visibleEdgeEl : [visibleEdgeEl];
      edgeElements.filter(Boolean).forEach((edgeEl) => {
        edgeEl.classList.toggle("edge-line--hover", isHover);
      });
      const chevronElements = Array.isArray(chevronEl) ? chevronEl : [chevronEl];
      chevronElements.filter(Boolean).forEach((chevron) => {
        chevron.classList.toggle("edge-chevron--hover", isHover);
      });
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
      if (edgeCreateDraft.active) {
        minX = Math.min(minX, edgeCreateDraft.startX, edgeCreateDraft.endX);
        minY = Math.min(minY, edgeCreateDraft.startY, edgeCreateDraft.endY);
        maxX = Math.max(maxX, edgeCreateDraft.startX, edgeCreateDraft.endX);
        maxY = Math.max(maxY, edgeCreateDraft.startY, edgeCreateDraft.endY);
      }

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
        const sourceCenter = getNodeVisualCenter(sourceNode, sourceFrame);
        const ax = sourceCenter.x;
        const ay = sourceCenter.y;

        getOutgoingEdges(sourceNode.id).forEach((edgeRecord) => {
          const targetId = edgeRecord.targetId;
          if (targetId === sourceNode.id) return;
          if (!lastVisibleNodeIds.has(targetId)) return;
          const targetFrame = lastVisibleNodeFrames.get(targetId);
          if (!targetFrame) return;
          const targetNode = getNodeById(targetId);
          if (!targetNode) return;
          const targetCenter = getNodeVisualCenter(targetNode, targetFrame);
          const bx = targetCenter.x;
          const by = targetCenter.y;
          const borderA = getBorderAnchorToward(sourceNode, sourceFrame, bx, by);
          const borderB = getBorderAnchorToward(targetNode, targetFrame, ax, ay);
          const { cx, cy } = getQuadraticControlPoint(borderA.x, borderA.y, borderB.x, borderB.y);
          const curveD = `M ${borderA.x} ${borderA.y} Q ${cx} ${cy} ${borderB.x} ${borderB.y}`;
          const visibleEdge = createSvgElement("path", {
            class: "edge-line",
            d: curveD
          });
          edgesLayerEl.appendChild(visibleEdge);

          const midpoint = getQuadraticPointAndTangentAt(
            borderA.x,
            borderA.y,
            cx,
            cy,
            borderB.x,
            borderB.y,
            EDGE_CHEVRON_T
          );
          const angleDeg = Math.atan2(midpoint.ty, midpoint.tx) * (180 / Math.PI);
          const chevron = createSvgElement("path", {
            class: "edge-chevron",
            d: "M -6 -4 L 0 0 L -6 4",
            transform: `translate(${midpoint.px} ${midpoint.py}) rotate(${angleDeg})`
          });
          edgesLayerEl.appendChild(chevron);

          const edgeMeta = {
            edgeId: edgeRecord.id,
            sourceId: edgeRecord.sourceId,
            targetId: edgeRecord.targetId,
            startX: borderA.x,
            startY: borderA.y,
            controlX: cx,
            controlY: cy,
            endX: borderB.x,
            endY: borderB.y
          };
          const hitEdge = createSvgElement("path", {
            class: "edge-hit",
            d: curveD
          });
          const handleEdgeEnter = (event) => {
            setEdgeHoverState(visibleEdge, chevron, sourceNode.id, targetId, true);
            const candidate = buildEdgeActionCandidate(event, edgeMeta);
            updateEdgeActionIntent(candidate);
          };
          const handleEdgeMove = (event) => {
            const candidate = buildEdgeActionCandidate(event, edgeMeta);
            updateEdgeActionIntent(candidate);
          };
          const handleEdgeLeave = () => {
            setEdgeHoverState(visibleEdge, chevron, sourceNode.id, targetId, false);
            updateEdgeActionIntent(null);
          };
          hitEdge.addEventListener("pointerenter", handleEdgeEnter);
          hitEdge.addEventListener("pointermove", handleEdgeMove);
          hitEdge.addEventListener("pointerleave", handleEdgeLeave);
          edgesLayerEl.appendChild(hitEdge);
        });
      });
      if (edgeCreateDraft.active) {
        const { cx, cy } = getQuadraticControlPoint(
          edgeCreateDraft.startX,
          edgeCreateDraft.startY,
          edgeCreateDraft.endX,
          edgeCreateDraft.endY
        );
        const draftCurveD = `M ${edgeCreateDraft.startX} ${edgeCreateDraft.startY} Q ${cx} ${cy} ${edgeCreateDraft.endX} ${edgeCreateDraft.endY}`;
        const draftEdge = createSvgElement("path", {
          class: "edge-line edge-line--draft",
          d: draftCurveD
        });
        edgesLayerEl.appendChild(draftEdge);
        const midpoint = getQuadraticPointAndTangentAt(
          edgeCreateDraft.startX,
          edgeCreateDraft.startY,
          cx,
          cy,
          edgeCreateDraft.endX,
          edgeCreateDraft.endY,
          EDGE_CHEVRON_T
        );
        const angleDeg = Math.atan2(midpoint.ty, midpoint.tx) * (180 / Math.PI);
        const draftChevron = createSvgElement("path", {
          class: "edge-chevron edge-chevron--draft",
          d: "M -6 -4 L 0 0 L -6 4",
          transform: `translate(${midpoint.px} ${midpoint.py}) rotate(${angleDeg})`
        });
        edgesLayerEl.appendChild(draftChevron);
      }
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
          const frame = computeNodeFrame(node, expandedLocationId, pos);
          maxBottom = Math.max(maxBottom, frame.y + frame.h);
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
        const frame = computeNodeFrame(node, expandedLocationId, overridePos);
        visibleNodeFrames.set(node.id, frame);
        const card = createNodeCard(node, !!selectedNode && selectedNode.id === node.id, overridePos);
        plane.appendChild(card);
        renderedCardsById.set(node.id, card);
      });
      if (worldEl) worldEl.appendChild(plane);
      const visibleNodeBodyFrames = buildVisibleNodeBodyFrameCache(
        visibleNodeFrames,
        renderedCardsById,
        expandedLocationId
      );
      lastVisibleNodeIds = new Set(visibleNodeIds);
      lastVisibleNodeFrames = visibleNodeFrames;
      lastVisibleNodeBodyFrames = visibleNodeBodyFrames;
      lastRenderedCardsById = renderedCardsById;
      if (edgeCreateDraft.active) {
        applyEdgeCreateHighlights(edgeCreateDraft.sourceId, edgeCreateDraft.targetId);
      } else {
        clearEdgeCreateHighlights();
      }

      renderLenses();
      updateEdgeCreateHandleVisual();
      updateEdgeActionMenuVisual();
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
      current.textContent = isAdminMode() ? "Admin" : "Graph";
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
      if (!isSelectableNode(node)) {
        state.selectedNodeId = getFirstSelectableNodeId(nodes);
        resetDetailsEditState();
        if (options.source !== "sanitize") {
          renderAll();
        }
        return;
      }
      if (state.selectedNodeId !== nodeId) {
        resetDetailsEditState();
      }
      state.selectedNodeId = nodeId;

      if (node.type === "location") {
        expandLocationAncestors(node.id);
      } else if (node.type === "process" && node.locationId) {
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

    function beginDetailsTitleInteraction(node) {
      if (!node) return;
      if (node.type === "portal" || node.type === "entity") {
        requestNodeEdit(node.id);
        return;
      }
      if (!canInlineEditNodeTitle(node)) return;
      detailsTitleEditNodeId = node.id;
      detailsTitleDraft = node.title || node.label || "";
      renderDetailsPane();
      requestAnimationFrame(() => {
        const titleInput = detailsPaneEl.querySelector(".details-title-edit-input");
        if (titleInput) {
          titleInput.focus();
          titleInput.select();
        }
      });
    }

    function cancelDetailsTitleEdit() {
      detailsTitleEditNodeId = null;
      detailsTitleDraft = "";
      renderDetailsPane();
    }

    function commitDetailsTitleEdit(nodeId) {
      if (!nodeId || detailsTitleEditNodeId !== nodeId) return;
      const nextTitle = detailsTitleDraft;
      resetDetailsEditState();
      setNodeTitleById(nodeId, nextTitle);
      renderAll();
    }

    function beginDetailsSummaryEdit(node) {
      if (!node || !isNodeOwnedByCurrentUser(node)) return;
      detailsSummaryEditNodeId = node.id;
      detailsSummaryDraft = typeof node.summary === "string" ? node.summary : "";
      renderDetailsPane();
      requestAnimationFrame(() => {
        const summaryInput = detailsPaneEl.querySelector(".details-summary-textarea");
        if (summaryInput) {
          summaryInput.focus();
          summaryInput.selectionStart = summaryInput.value.length;
          summaryInput.selectionEnd = summaryInput.value.length;
        }
      });
    }

    function cancelDetailsSummaryEdit() {
      detailsSummaryEditNodeId = null;
      detailsSummaryDraft = "";
      renderDetailsPane();
    }

    function commitDetailsSummaryEdit(nodeId) {
      if (!nodeId || detailsSummaryEditNodeId !== nodeId) return;
      const nextSummary = detailsSummaryDraft;
      detailsSummaryEditNodeId = null;
      detailsSummaryDraft = "";
      setNodeSummaryById(nodeId, nextSummary);
      renderAll();
    }

    function createReadonlyGraphStatusPill(statusValue) {
      const status = document.createElement("span");
      status.className = `node-card-status ${getStatusClass(statusValue)}`.trim();
      status.textContent = statusValue;
      return status;
    }

    function createStatusControlForNode(node, context = "details") {
      if (!node) return null;
      const statusValue = getNodeStatusValue(node);
      if (!statusValue) return null;
      const editableStatuses = getStatusOptionsForNode(node);
      if (!editableStatuses.length) {
        if (context === "graph") {
          return createReadonlyGraphStatusPill(statusValue);
        }
        return createStatusPill(statusValue, ["details-status-pill"]);
      }
      const statusSelect = document.createElement("select");
      statusSelect.className = context === "graph"
        ? `node-card-status node-card-status-select ${getStatusClass(statusValue)}`.trim()
        : `details-status-select status-pill ${getStatusClass(statusValue)}`.trim();
      if (context === "details") {
        statusSelect.setAttribute("aria-label", "Status");
      }
      if (!editableStatuses.includes(statusValue)) {
        const currentOptionEl = document.createElement("option");
        currentOptionEl.value = statusValue;
        currentOptionEl.textContent = statusValue;
        currentOptionEl.disabled = true;
        statusSelect.appendChild(currentOptionEl);
      }
      editableStatuses.forEach((statusOption) => {
        const optionEl = document.createElement("option");
        optionEl.value = statusOption;
        optionEl.textContent = statusOption;
        statusSelect.appendChild(optionEl);
      });
      statusSelect.value = statusValue;
      const statusClassNames = [...new Set([...PROCESS_STATUSES, ...HANDOVER_STATUSES].map((statusOption) => getStatusClass(statusOption)))];
      const syncStatusClass = () => {
        statusSelect.classList.remove(...statusClassNames);
        statusSelect.classList.add(getStatusClass(statusSelect.value));
      };
      syncStatusClass();
      statusSelect.addEventListener("mousedown", (event) => event.stopPropagation());
      statusSelect.addEventListener("click", (event) => event.stopPropagation());
      statusSelect.addEventListener("change", (event) => {
        const nextStatus = event.target.value;
        syncStatusClass();
        if (node.type === "process") {
          setProcessStatusById(node.id, nextStatus);
        } else if (node.type === "handover") {
          setHandoverStatusById(node.id, nextStatus);
        }
        renderAll();
      });
      return statusSelect;
    }

    function appendDetailsHeader(container, selectedNode) {
      const header = document.createElement("section");
      header.className = "details-header";

      const titleRow = document.createElement("div");
      titleRow.className = "details-title-row";

      const titleColumn = document.createElement("div");
      titleColumn.className = "details-title-column";

      if (detailsTitleEditNodeId === selectedNode.id && canInlineEditNodeTitle(selectedNode)) {
        const titleInput = document.createElement("input");
        titleInput.type = "text";
        titleInput.className = "details-title-edit-input";
        titleInput.value = detailsTitleDraft;
        titleInput.placeholder = "Untitled";
        titleInput.maxLength = 120;
        titleInput.addEventListener("input", () => {
          detailsTitleDraft = titleInput.value;
        });
        titleInput.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitDetailsTitleEdit(selectedNode.id);
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancelDetailsTitleEdit();
          }
        });
        titleInput.addEventListener("blur", () => {
          commitDetailsTitleEdit(selectedNode.id);
        });
        titleColumn.appendChild(titleInput);
      } else {
        const isInteractiveTitle = canInlineEditNodeTitle(selectedNode) || selectedNode.type === "portal" || selectedNode.type === "entity";
        const titleEl = document.createElement(isInteractiveTitle ? "button" : "h2");
        if (isInteractiveTitle) {
          titleEl.type = "button";
          titleEl.addEventListener("click", () => beginDetailsTitleInteraction(selectedNode));
        }
        titleEl.className = `details-title-display${isInteractiveTitle ? " is-interactive" : ""}`;
        titleEl.textContent = getNodeDisplayTitle(selectedNode, { fallback: selectedNode.id || "Untitled" });
        titleColumn.appendChild(titleEl);
      }

      titleRow.appendChild(titleColumn);

      const statusControl = createStatusControlForNode(selectedNode, "details");
      if (statusControl) {
        const statusWrap = document.createElement("div");
        statusWrap.className = "details-status-wrap";
        statusWrap.appendChild(statusControl);
        titleRow.appendChild(statusWrap);
      }
      header.appendChild(titleRow);

      const ownerLine = document.createElement("p");
      ownerLine.className = "details-owner-line";
      ownerLine.textContent = getOwnerDisplayName(selectedNode) || "Unknown";
      header.appendChild(ownerLine);

      const descriptionWrap = document.createElement("div");
      descriptionWrap.className = "details-description-wrap";

      if (detailsSummaryEditNodeId === selectedNode.id && isNodeOwnedByCurrentUser(selectedNode)) {
        const descriptionForm = document.createElement("form");
        descriptionForm.className = "details-description-form";

        const summaryInput = document.createElement("textarea");
        summaryInput.className = "details-summary-textarea";
        summaryInput.rows = 5;
        summaryInput.placeholder = "Add a description";
        summaryInput.value = detailsSummaryDraft;
        summaryInput.addEventListener("input", () => {
          detailsSummaryDraft = summaryInput.value;
        });
        summaryInput.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancelDetailsSummaryEdit();
            return;
          }
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            commitDetailsSummaryEdit(selectedNode.id);
          }
        });

        const actionRow = document.createElement("div");
        actionRow.className = "details-inline-actions";

        const saveBtn = document.createElement("button");
        saveBtn.type = "submit";
        saveBtn.className = "details-inline-btn";
        saveBtn.textContent = "Save";

        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "details-inline-btn is-secondary";
        cancelBtn.textContent = "Cancel";
        cancelBtn.addEventListener("click", () => {
          cancelDetailsSummaryEdit();
        });

        actionRow.appendChild(saveBtn);
        actionRow.appendChild(cancelBtn);
        descriptionForm.appendChild(summaryInput);
        descriptionForm.appendChild(actionRow);
        descriptionForm.addEventListener("submit", (event) => {
          event.preventDefault();
          commitDetailsSummaryEdit(selectedNode.id);
        });
        descriptionWrap.appendChild(descriptionForm);
      } else {
        const summaryText = String(selectedNode.summary || "").trim();
        const descriptionEl = document.createElement(isNodeOwnedByCurrentUser(selectedNode) ? "button" : "p");
        if (descriptionEl.tagName === "BUTTON") {
          descriptionEl.type = "button";
          descriptionEl.addEventListener("click", () => beginDetailsSummaryEdit(selectedNode));
        }
        descriptionEl.className = `details-description-text${isNodeOwnedByCurrentUser(selectedNode) ? " is-editable" : ""}${summaryText ? "" : " is-empty"}`;
        descriptionEl.textContent = summaryText || (isNodeOwnedByCurrentUser(selectedNode) ? "Add a description" : "No description provided.");
        descriptionWrap.appendChild(descriptionEl);
      }

      header.appendChild(descriptionWrap);
      container.appendChild(header);
    }

    function appendDetailsContextSection(container, selectedNode) {
      const contextRows = [];
      if (selectedNode.type === "location") {
        contextRows.push({
          label: "Kind",
          text: selectedNode.kind || "generic"
        });
        const parentId = buildParentMap().get(selectedNode.id) || null;
        if (parentId) {
          const parentNode = getNodeById(parentId);
          if (parentNode) {
            const parentBtn = document.createElement("button");
            parentBtn.type = "button";
            parentBtn.className = "inline-link";
            parentBtn.textContent = getNodeDisplayTitle(parentNode, { fallback: parentNode.id || "Location" });
            parentBtn.addEventListener("click", () => selectNode(parentNode.id));
            contextRows.push({
              label: "Parent location",
              node: parentBtn
            });
          } else {
            contextRows.push({
              label: "Parent location",
              text: "Top-level location"
            });
          }
        } else {
          contextRows.push({
            label: "Parent location",
            text: "Top-level location"
          });
        }
      }
      if (selectedNode.type === "process") {
        if (selectedNode.locationId) {
          const locationNode = getNodeById(selectedNode.locationId);
          if (locationNode) {
            const locationBtn = document.createElement("button");
            locationBtn.type = "button";
            locationBtn.className = "inline-link";
            locationBtn.textContent = getNodeDisplayTitle(locationNode, { fallback: locationNode.id || "Location" });
            locationBtn.addEventListener("click", () => selectNode(locationNode.id));
            contextRows.push({
              label: "Location",
              node: locationBtn
            });
          } else {
            contextRows.push({
              label: "Location",
              text: "No location"
            });
          }
        } else {
          contextRows.push({
            label: "Location",
            text: "No location"
          });
        }
      }

      if (!contextRows.length) return;

      const contextList = document.createElement("div");
      contextList.className = "details-context-list";
      contextRows.forEach((rowData) => {
        const row = document.createElement("div");
        row.className = "details-context-row";

        const label = document.createElement("div");
        label.className = "details-context-label";
        label.textContent = rowData.label;

        const value = document.createElement("div");
        value.className = "details-context-value";
        if (rowData.node) {
          value.appendChild(rowData.node);
        } else {
          value.textContent = rowData.text;
        }

        row.appendChild(label);
        row.appendChild(value);
        contextList.appendChild(row);
      });
      container.appendChild(contextList);
    }

    function appendLocationChildrenSection(container, selectedNode) {
      const childTitle = document.createElement("h4");
      childTitle.className = "section-title";
      childTitle.textContent = "Child locations";
      container.appendChild(childTitle);

      const children = getChildLocations(selectedNode.id);
      if (!children.length) {
        const none = document.createElement("p");
        none.className = "muted";
        none.textContent = "No child locations.";
        container.appendChild(none);
        return;
      }

      const childWrap = document.createElement("div");
      childWrap.className = "chip-list";
      children.forEach((childNode) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip-btn";
        chip.textContent = `${childNode.label} (${childNode.kind || "generic"})`;
        chip.addEventListener("click", () => selectNode(childNode.id));
        childWrap.appendChild(chip);
      });
      container.appendChild(childWrap);
    }

    function appendHandoverCollaboratorsSection(container, selectedNode) {
      const sectionHeader = document.createElement("div");
      sectionHeader.className = "section-header";
      const title = document.createElement("h4");
      title.className = "section-title";
      title.textContent = "Collaborators";
      sectionHeader.appendChild(title);
      container.appendChild(sectionHeader);

      const collaborators = getResolvedHandoverCollaborators(selectedNode);
      if (!collaborators.length) {
        const none = document.createElement("p");
        none.className = "muted";
        none.textContent = "No collaborators yet.";
        container.appendChild(none);
      } else {
        const collaboratorList = document.createElement("div");
        collaboratorList.className = "collaborator-list";
        collaborators.forEach((collaborator) => {
          const row = document.createElement("div");
          row.className = "collaborator-row";
          const label = document.createElement("div");
          label.className = "collaborator-label";
          label.textContent = collaborator.label;
          row.appendChild(label);
          if (isNodeOwnedByCurrentUser(selectedNode)) {
            const actions = document.createElement("div");
            actions.className = "collaborator-actions";
            const shareBtn = document.createElement("button");
            shareBtn.type = "button";
            shareBtn.className = `collaborator-icon-btn${collaborator.shareWorkspace ? " is-active" : ""}`;
            shareBtn.textContent = "↗";
            shareBtn.title = "share workspace";
            shareBtn.setAttribute("aria-label", "share workspace");
            shareBtn.addEventListener("click", () => {
              toggleHandoverCollaboratorShare(selectedNode.id, collaborator.kind, collaborator.refId);
              renderDetailsPane();
            });
            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "collaborator-remove-btn";
            removeBtn.textContent = "×";
            removeBtn.title = "Remove collaborator";
            removeBtn.setAttribute("aria-label", "Remove collaborator");
            removeBtn.addEventListener("click", () => {
              removeHandoverCollaborator(selectedNode.id, collaborator.kind, collaborator.refId);
              renderDetailsPane();
            });
            actions.appendChild(shareBtn);
            actions.appendChild(removeBtn);
            row.appendChild(actions);
          }
          collaboratorList.appendChild(row);
        });
        container.appendChild(collaboratorList);
      }

      if (!isNodeOwnedByCurrentUser(selectedNode)) return;

      const collaboratorForm = document.createElement("form");
      collaboratorForm.className = "collaborator-form";
      const collaboratorKindSelect = document.createElement("select");
      collaboratorKindSelect.className = "collaborator-kind-select";
      [
        { value: "user", label: "User" },
        { value: "org", label: "Organisation" }
      ].forEach((optionData) => {
        const optionEl = document.createElement("option");
        optionEl.value = optionData.value;
        optionEl.textContent = optionData.label;
        collaboratorKindSelect.appendChild(optionEl);
      });
      const collaboratorRefSelect = document.createElement("select");
      collaboratorRefSelect.className = "collaborator-ref-select";
      const addBtn = document.createElement("button");
      addBtn.type = "submit";
      addBtn.textContent = "Add collaborator";

      const syncCollaboratorOptions = () => {
        const kind = collaboratorKindSelect.value === "org" ? "org" : "user";
        collaboratorRefSelect.innerHTML = "";
        const existingCollaboratorKeys = new Set(
          getResolvedHandoverCollaborators(selectedNode).map((collaborator) => getHandoverCollaboratorSignature(collaborator.kind, collaborator.refId))
        );
        let options = [];
        if (kind === "org") {
          options = getSortedOrgsForMenu().map((orgRecord) => ({
            value: orgRecord.id,
            label: orgRecord.name || orgRecord.id
          }));
        } else {
          options = getSortedUsersForMenu()
            .filter((userRecord) => userRecord.id !== selectedNode.ownerId)
            .map((userRecord) => ({
              value: userRecord.id,
              label: getUserDisplayNameWithOrg(userRecord.id) || userRecord.name || userRecord.id
            }));
        }
        options
          .filter((option) => !existingCollaboratorKeys.has(getHandoverCollaboratorSignature(kind, option.value)))
          .forEach((option) => {
            const optionEl = document.createElement("option");
            optionEl.value = option.value;
            optionEl.textContent = option.label;
            collaboratorRefSelect.appendChild(optionEl);
          });
        const hasOptions = collaboratorRefSelect.options.length > 0;
        collaboratorRefSelect.disabled = !hasOptions;
        addBtn.disabled = !hasOptions;
        if (!hasOptions) {
          const emptyOption = document.createElement("option");
          emptyOption.value = "";
          emptyOption.textContent = "No available collaborators";
          collaboratorRefSelect.appendChild(emptyOption);
        }
      };

      collaboratorKindSelect.addEventListener("change", syncCollaboratorOptions);
      collaboratorForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!collaboratorRefSelect.value) return;
        if (addHandoverCollaborator(selectedNode.id, collaboratorKindSelect.value, collaboratorRefSelect.value)) {
          renderDetailsPane();
        }
      });
      collaboratorForm.appendChild(collaboratorKindSelect);
      collaboratorForm.appendChild(collaboratorRefSelect);
      collaboratorForm.appendChild(addBtn);
      syncCollaboratorOptions();
      container.appendChild(collaboratorForm);
    }

    function appendHandoverNodesSection(container, selectedNode) {
      const sectionHeader = document.createElement("div");
      sectionHeader.className = "section-header";
      const title = document.createElement("h4");
      title.className = "section-title";
      title.textContent = "Handover Nodes";
      sectionHeader.appendChild(title);
      if (isNodeOwnedByCurrentUser(selectedNode)) {
        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "section-add-btn";
        addBtn.textContent = "+";
        addBtn.title = "Add handover node (coming soon)";
        addBtn.setAttribute("aria-label", "Add handover node");
        addBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
        sectionHeader.appendChild(addBtn);
      }
      container.appendChild(sectionHeader);

      const handoverNodes = getHandoverNodeCandidates(selectedNode);
      if (!handoverNodes.length) {
        const none = document.createElement("p");
        none.className = "muted";
        none.textContent = "No handover nodes yet.";
        container.appendChild(none);
        return;
      }

      const list = document.createElement("div");
      list.className = "chip-list";
      handoverNodes.forEach((node) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip-btn";
        chip.textContent = `${getNodeDisplayTitle(node, { fallback: node.id || "Node" })} (${node.type})`;
        chip.addEventListener("click", () => selectNode(node.id));
        list.appendChild(chip);
      });
      container.appendChild(list);
    }

    function appendTasksSection(container, selectedNode) {
      const tasksTitle = document.createElement("h4");
      tasksTitle.className = "section-title";
      tasksTitle.textContent = "Tasks";
      container.appendChild(tasksTitle);

      const canManageTasks = canCurrentUserManageHandoverTasks(selectedNode);
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
          if (selectedNode.type === "handover" && !canManageTasks) {
            check.disabled = true;
          }
          check.addEventListener("change", () => {
            task.done = check.checked;
            if (!task.done && isTaskAssignedToCurrentUser(task.assignedTo)) {
              state.seenTaskIds.delete(task.id);
            }
            syncNodeRuntimeAndStore();
            persistStoreToLocalStorage();
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
      container.appendChild(tasksList);

      if (selectedNode.type === "handover" && !canManageTasks) {
        const note = document.createElement("p");
        note.className = "muted";
        note.textContent = "Only the owner or collaborators can add tasks.";
        container.appendChild(note);
        return;
      }

      const taskForm = document.createElement("form");
      taskForm.className = "task-form";
      const taskInput = document.createElement("input");
      taskInput.type = "text";
      taskInput.placeholder = "Task description";
      taskInput.maxLength = 180;

      const assigneeSelect = document.createElement("select");
      getTaskAssigneeOptions(selectedNode).forEach((assigneeLabel) => {
        const option = document.createElement("option");
        option.value = assigneeLabel;
        option.textContent = assigneeLabel;
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
        if (isTaskAssignedToCurrentUser(newTask.assignedTo)) {
          state.seenTaskIds.delete(newTask.id);
        }
        syncNodeRuntimeAndStore();
        persistStoreToLocalStorage();
        taskInput.value = "";
        renderDetailsPane();
        renderNotifications();
      });
      container.appendChild(taskForm);
    }

    function appendCommentsSection(container, selectedNode) {
      const commentsTitle = document.createElement("h4");
      commentsTitle.className = "section-title";
      commentsTitle.textContent = "Comments";
      container.appendChild(commentsTitle);

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
      container.appendChild(commentList);

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
      container.appendChild(commentForm);
    }

    function buildDetailsSection(sectionClassName = "") {
      const section = document.createElement("section");
      section.className = `details-section${sectionClassName ? ` ${sectionClassName}` : ""}`;
      return section;
    }

    function buildDetailsHeaderSection(selectedNode) {
      const section = buildDetailsSection("details-section-header");
      const header = document.createElement("div");
      header.className = "details-header";
      const titleRow = document.createElement("div");
      titleRow.className = "details-title-row";
      const titleColumn = document.createElement("div");
      titleColumn.className = "details-title-column";

      if (detailsTitleEditNodeId === selectedNode.id && canInlineEditNodeTitle(selectedNode)) {
        const titleInput = document.createElement("input");
        titleInput.type = "text";
        titleInput.className = "details-title-edit-input";
        titleInput.value = detailsTitleDraft;
        titleInput.placeholder = getNodeTitleFallback(selectedNode);
        titleInput.maxLength = 120;
        titleInput.addEventListener("input", () => {
          detailsTitleDraft = titleInput.value;
        });
        titleInput.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitDetailsTitleEdit(selectedNode.id);
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancelDetailsTitleEdit();
          }
        });
        titleInput.addEventListener("blur", () => {
          commitDetailsTitleEdit(selectedNode.id);
        });
        titleColumn.appendChild(titleInput);
      } else {
        const isInteractiveTitle = canInlineEditNodeTitle(selectedNode) || selectedNode.type === "portal" || selectedNode.type === "entity";
        const titleEl = document.createElement(isInteractiveTitle ? "button" : "h2");
        if (isInteractiveTitle) {
          titleEl.type = "button";
          titleEl.addEventListener("click", () => beginDetailsTitleInteraction(selectedNode));
        }
        titleEl.className = `details-title-display${isInteractiveTitle ? " is-interactive" : ""}`;
        titleEl.textContent = getNodeDisplayTitle(selectedNode, { fallback: getNodeTitleFallback(selectedNode) });
        titleColumn.appendChild(titleEl);
      }

      titleRow.appendChild(titleColumn);
      const statusControl = createStatusControlForNode(selectedNode, "details");
      if (statusControl) {
        const statusWrap = document.createElement("div");
        statusWrap.className = "details-status-wrap";
        statusWrap.appendChild(statusControl);
        titleRow.appendChild(statusWrap);
      }
      header.appendChild(titleRow);

      const ownerLine = document.createElement("p");
      ownerLine.className = "details-owner-line";
      ownerLine.textContent = getOwnerDisplayName(selectedNode) || "Unknown";
      header.appendChild(ownerLine);
      const contextLabel = getNodeDetailsHeaderContextLabel(selectedNode);
      if (contextLabel) {
        const contextLine = document.createElement("p");
        contextLine.className = "details-header-context-line";
        contextLine.textContent = `Context: ${contextLabel}`;
        header.appendChild(contextLine);
      }
      section.appendChild(header);
      return section;
    }

    function buildDetailsDescriptionSection(selectedNode) {
      const section = buildDetailsSection("details-section-description");
      const descriptionWrap = document.createElement("div");
      descriptionWrap.className = "details-description-wrap";

      if (detailsSummaryEditNodeId === selectedNode.id && isNodeOwnedByCurrentUser(selectedNode)) {
        const descriptionForm = document.createElement("form");
        descriptionForm.className = "details-description-form";
        const summaryInput = document.createElement("textarea");
        summaryInput.className = "details-summary-textarea";
        summaryInput.rows = 5;
        summaryInput.placeholder = "Add a description";
        summaryInput.value = detailsSummaryDraft;
        summaryInput.addEventListener("input", () => {
          detailsSummaryDraft = summaryInput.value;
        });
        summaryInput.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancelDetailsSummaryEdit();
            return;
          }
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            commitDetailsSummaryEdit(selectedNode.id);
          }
        });

        const actionRow = document.createElement("div");
        actionRow.className = "details-inline-actions";
        const saveBtn = document.createElement("button");
        saveBtn.type = "submit";
        saveBtn.className = "details-inline-btn";
        saveBtn.textContent = "Save";
        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "details-inline-btn is-secondary";
        cancelBtn.textContent = "Cancel";
        cancelBtn.addEventListener("click", () => {
          cancelDetailsSummaryEdit();
        });
        actionRow.appendChild(saveBtn);
        actionRow.appendChild(cancelBtn);
        descriptionForm.appendChild(summaryInput);
        descriptionForm.appendChild(actionRow);
        descriptionForm.addEventListener("submit", (event) => {
          event.preventDefault();
          commitDetailsSummaryEdit(selectedNode.id);
        });
        descriptionWrap.appendChild(descriptionForm);
      } else {
        const summaryText = String(selectedNode.summary || "").trim();
        const descriptionEl = document.createElement(isNodeOwnedByCurrentUser(selectedNode) ? "button" : "p");
        if (descriptionEl.tagName === "BUTTON") {
          descriptionEl.type = "button";
          descriptionEl.addEventListener("click", () => beginDetailsSummaryEdit(selectedNode));
        }
        descriptionEl.className = `details-description-text${isNodeOwnedByCurrentUser(selectedNode) ? " is-editable" : ""}${summaryText ? "" : " is-empty"}`;
        descriptionEl.textContent = summaryText || (isNodeOwnedByCurrentUser(selectedNode) ? "Add a description" : "No description provided.");
        descriptionWrap.appendChild(descriptionEl);
      }

      section.appendChild(descriptionWrap);
      return section;
    }

    function buildDetailsContextSection(selectedNode) {
      const contextRows = [];
      if (selectedNode.type === "location") {
        contextRows.push({ label: "Kind", text: selectedNode.kind || "generic" });
        const parentId = buildParentMap().get(selectedNode.id) || null;
        if (parentId) {
          const parentNode = getNodeById(parentId);
          if (parentNode) {
            const parentBtn = document.createElement("button");
            parentBtn.type = "button";
            parentBtn.className = "inline-link";
            parentBtn.textContent = getNodeDisplayTitle(parentNode, { fallback: getNodeTitleFallback(parentNode) });
            parentBtn.addEventListener("click", () => selectNode(parentNode.id));
            contextRows.push({ label: "Parent location", node: parentBtn });
          } else {
            contextRows.push({ label: "Parent location", text: "Top-level location" });
          }
        } else {
          contextRows.push({ label: "Parent location", text: "Top-level location" });
        }
      }
      if (selectedNode.type === "process") {
        if (selectedNode.locationId) {
          const locationNode = getNodeById(selectedNode.locationId);
          if (locationNode) {
            const locationBtn = document.createElement("button");
            locationBtn.type = "button";
            locationBtn.className = "inline-link";
            locationBtn.textContent = getNodeDisplayTitle(locationNode, { fallback: getNodeTitleFallback(locationNode) });
            locationBtn.addEventListener("click", () => selectNode(locationNode.id));
            contextRows.push({ label: "Location", node: locationBtn });
          } else {
            contextRows.push({ label: "Location", text: "No location" });
          }
        } else {
          contextRows.push({ label: "Location", text: "No location" });
        }
      }

      if (!contextRows.length) return null;

      const section = buildDetailsSection("details-section-context");
      const contextList = document.createElement("div");
      contextList.className = "details-context-list";
      contextRows.forEach((rowData) => {
        const row = document.createElement("div");
        row.className = "details-context-row";
        const label = document.createElement("div");
        label.className = "details-context-label";
        label.textContent = rowData.label;
        const value = document.createElement("div");
        value.className = "details-context-value";
        if (rowData.node) {
          value.appendChild(rowData.node);
        } else {
          value.textContent = rowData.text;
        }
        row.appendChild(label);
        row.appendChild(value);
        contextList.appendChild(row);
      });
      section.appendChild(contextList);
      return section;
    }

    function buildLocationChildrenSection(selectedNode) {
      const section = buildDetailsSection("details-section-location-children");
      const title = document.createElement("h4");
      title.className = "section-title";
      title.textContent = "Child locations";
      section.appendChild(title);
      const children = getChildLocations(selectedNode.id);
      if (!children.length) {
        const none = document.createElement("p");
        none.className = "muted";
        none.textContent = "No child locations.";
        section.appendChild(none);
        return section;
      }
      const childWrap = document.createElement("div");
      childWrap.className = "chip-list";
      children.forEach((childNode) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip-btn";
        chip.textContent = `${getNodeDisplayTitle(childNode, { fallback: getNodeTitleFallback(childNode) })} (${childNode.kind || "generic"})`;
        chip.addEventListener("click", () => selectNode(childNode.id));
        childWrap.appendChild(chip);
      });
      section.appendChild(childWrap);
      return section;
    }

    function buildHandoverCollaboratorsSection(selectedNode) {
      const section = buildDetailsSection("details-section-collaborators");
      const sectionHeader = document.createElement("div");
      sectionHeader.className = "section-header";
      const title = document.createElement("h4");
      title.className = "section-title";
      title.textContent = "Collaborators";
      sectionHeader.appendChild(title);
      if (isNodeOwnedByCurrentUser(selectedNode)) {
        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "section-add-btn";
        addBtn.textContent = "+";
        addBtn.title = "Add collaborators";
        addBtn.setAttribute("aria-label", "Add collaborators");
        addBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          openCollaboratorPickerModal(selectedNode.id);
        });
        sectionHeader.appendChild(addBtn);
      }
      section.appendChild(sectionHeader);

      const collaborators = getResolvedHandoverCollaborators(selectedNode);
      if (!collaborators.length) {
        const none = document.createElement("p");
        none.className = "muted";
        none.textContent = "No collaborators yet.";
        section.appendChild(none);
        return section;
      }

      const collaboratorList = document.createElement("div");
      collaboratorList.className = "collaborator-list";
      collaborators
        .sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: "base" }))
        .forEach((collaborator) => {
          const row = document.createElement("div");
          row.className = "collaborator-row";
          const label = document.createElement("div");
          label.className = "collaborator-label";
          label.textContent = collaborator.label;
          row.appendChild(label);
          if (isNodeOwnedByCurrentUser(selectedNode)) {
            const actions = document.createElement("div");
            actions.className = "collaborator-actions";
            const shareBtn = document.createElement("button");
            shareBtn.type = "button";
            shareBtn.className = `collaborator-icon-btn${collaborator.shareWorkspace ? " is-active" : ""}`;
            shareBtn.textContent = "↗";
            const shareDisabled = isCollabWorkspaceOnlyHandover(selectedNode);
            shareBtn.title = shareDisabled ? "Collaboration-workspace handovers cannot share workspaces" : "share workspace";
            shareBtn.setAttribute("aria-label", shareDisabled ? "share workspace unavailable" : "share workspace");
            shareBtn.disabled = shareDisabled;
            if (shareDisabled) {
              shareBtn.classList.add("is-disabled");
            } else {
              shareBtn.addEventListener("click", () => {
                if (!toggleHandoverCollaboratorShare(selectedNode.id, collaborator.kind, collaborator.refId)) return;
                renderDetailsPane();
              });
            }
            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "collaborator-remove-btn";
            removeBtn.textContent = "×";
            removeBtn.title = "Remove collaborator";
            removeBtn.setAttribute("aria-label", "Remove collaborator");
            removeBtn.addEventListener("click", () => {
              if (!removeHandoverCollaborator(selectedNode.id, collaborator.kind, collaborator.refId)) return;
              renderDetailsPane();
            });
            actions.appendChild(shareBtn);
            actions.appendChild(removeBtn);
            row.appendChild(actions);
          }
          collaboratorList.appendChild(row);
        });
      section.appendChild(collaboratorList);
      return section;
    }

    function buildHandoverObjectsSection(selectedNode) {
      const section = buildDetailsSection("details-section-handover-objects");
      const sectionHeader = document.createElement("div");
      sectionHeader.className = "section-header";
      const title = document.createElement("h4");
      title.className = "section-title";
      title.textContent = "Handover Objects";
      sectionHeader.appendChild(title);
      if (isNodeOwnedByCurrentUser(selectedNode)) {
        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "section-add-btn";
        addBtn.textContent = "+";
        addBtn.title = "Add handover objects";
        addBtn.setAttribute("aria-label", "Add handover objects");
        addBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          openHandoverObjectPickerModal(selectedNode.id);
        });
        sectionHeader.appendChild(addBtn);
      }
      section.appendChild(sectionHeader);

      const handoverObjects = getHandoverObjects(selectedNode)
        .filter((handoverObject) => handoverObject.role !== "context")
        .map((handoverObject) => {
          const objectNode = getAnyNodeById(handoverObject.id);
          return objectNode ? { handoverObject, node: objectNode } : null;
        })
        .filter(Boolean)
        .sort((left, right) => compareNodesByDisplayLabel(left.node, right.node));
      if (!handoverObjects.length) {
        const none = document.createElement("p");
        none.className = "muted";
        none.textContent = "No handover objects yet.";
        section.appendChild(none);
        return section;
      }

      const list = document.createElement("div");
      list.className = "handover-object-pill-list";
      handoverObjects.forEach(({ node, handoverObject }) => {
        const pill = document.createElement("div");
        pill.className = "handover-object-pill";

        const objectBtn = document.createElement("button");
        objectBtn.type = "button";
        objectBtn.className = "handover-object-pill-main";
        objectBtn.addEventListener("click", () => selectNode(node.id));

        const title = document.createElement("span");
        title.className = "handover-object-pill-title";
        title.textContent = getNodeDisplayTitle(node, { fallback: getNodeTitleFallback(node) });
        const owner = document.createElement("span");
        owner.className = "handover-object-pill-owner";
        owner.textContent = getNodeOwnerShortLabel(node) || "Unknown";

        objectBtn.appendChild(title);
        objectBtn.appendChild(owner);
        pill.appendChild(objectBtn);

        if (isNodeOwnedByCurrentUser(selectedNode)) {
          const roleSelect = document.createElement("select");
          roleSelect.className = "handover-object-role-pill";
          HANDOVER_OBJECT_ROLES.forEach((candidateRole) => {
            const option = document.createElement("option");
            option.value = candidateRole;
            option.textContent = HANDOVER_OBJECT_ROLE_LABELS[candidateRole];
            roleSelect.appendChild(option);
          });
          roleSelect.value = handoverObject.role;
          roleSelect.addEventListener("change", () => {
            if (!setHandoverObjectRole(selectedNode.id, handoverObject.id, roleSelect.value)) return;
            renderAll();
          });
          pill.appendChild(roleSelect);
        } else {
          const roleLabel = document.createElement("span");
          roleLabel.className = "handover-object-role-pill is-readonly";
          roleLabel.textContent = HANDOVER_OBJECT_ROLE_LABELS[handoverObject.role];
          pill.appendChild(roleLabel);
        }
        list.appendChild(pill);
      });
      section.appendChild(list);
      return section;
    }

    function canManageTaskInDetails(node) {
      if (!node) return false;
      if (node.type === "handover") {
        return canCurrentUserManageHandoverTasks(node);
      }
      return true;
    }

    function resetDetailsTaskEditState() {
      detailsTaskEditState = {
        nodeId: null,
        taskId: null,
        text: "",
        assignedTo: "",
        linkedObjectIds: [],
        slashRange: null
      };
    }

    function ensureDetailsTaskComposerState(node) {
      if (!node) return;
      if (detailsTaskComposerState.nodeId !== node.id) {
        detailsTaskComposerState = createTaskDraftState(node);
        return;
      }
      const assigneeOptions = getTaskAssigneeOptionsForContext(node);
      detailsTaskComposerState.assignedTo = assigneeOptions.includes(detailsTaskComposerState.assignedTo)
        ? detailsTaskComposerState.assignedTo
        : (assigneeOptions[0] || "");
      const handoverContextNode = getTaskHandoverContextNode(node);
      if (handoverContextNode) {
        detailsTaskComposerState.linkedObjectIds = normalizeTaskLinkedObjectIds(handoverContextNode, detailsTaskComposerState.linkedObjectIds);
      } else {
        detailsTaskComposerState.linkedObjectIds = [];
        detailsTaskComposerState.slashRange = null;
      }
    }

    function persistDetailsTaskChanges() {
      syncNodeRuntimeAndStore();
      persistStoreToLocalStorage();
      renderDetailsPane();
      renderNotifications();
    }

    function beginDetailsTaskEdit(node, task) {
      detailsTaskEditState = createTaskDraftState(node, task);
      renderDetailsPane();
      requestAnimationFrame(() => {
        const editorInput = detailsPaneEl.querySelector(`.task-editor-input[data-task-id="${task.id}"]`);
        if (editorInput) {
          editorInput.focus();
          editorInput.select();
        }
      });
    }

    function cancelDetailsTaskEdit() {
      resetDetailsTaskEditState();
      renderDetailsPane();
    }

    function commitDetailsTaskEdit(node, task) {
      if (!node || !task || detailsTaskEditState.nodeId !== node.id || detailsTaskEditState.taskId !== task.id) return;
      const changed = saveTaskDraft(node, detailsTaskEditState, task);
      resetDetailsTaskEditState();
      if (!changed) {
        renderDetailsPane();
        return;
      }
      persistDetailsTaskChanges();
    }

    function buildTaskEditor(node, draftState, options = {}) {
      const form = document.createElement("form");
      form.className = `task-editor-form${options.inline ? " is-inline" : ""}`;
      const input = document.createElement("input");
      input.type = "text";
      input.className = "task-editor-input";
      input.maxLength = 180;
      input.placeholder = options.placeholder || "Task description";
      input.value = draftState.text || "";
      if (options.taskId) {
        input.dataset.taskId = options.taskId;
      }

      const assigneeSelect = document.createElement("select");
      assigneeSelect.className = "task-editor-select";
      const assigneeOptions = getTaskAssigneeOptionsForContext(node, options.task || null);
      if (!assigneeOptions.includes(draftState.assignedTo)) {
        draftState.assignedTo = assigneeOptions[0] || "";
      }
      assigneeOptions.forEach((assigneeLabel) => {
        const option = document.createElement("option");
        option.value = assigneeLabel;
        option.textContent = assigneeLabel;
        assigneeSelect.appendChild(option);
      });
      assigneeSelect.value = draftState.assignedTo;
      assigneeSelect.addEventListener("change", () => {
        draftState.assignedTo = assigneeSelect.value;
      });

      const linkedObjectChips = document.createElement("div");
      linkedObjectChips.className = "task-linked-chip-list";
      const slashMenu = document.createElement("div");
      slashMenu.className = "task-slash-menu";
      const handoverContextNode = getTaskHandoverContextNode(node, options.task || null);

      const syncLinkedObjectChips = () => {
        linkedObjectChips.innerHTML = "";
        if (!handoverContextNode) return;
        const linkedNodes = normalizeTaskLinkedObjectIds(handoverContextNode, draftState.linkedObjectIds)
          .map((nodeId) => getNodeById(nodeId))
          .filter(Boolean)
          .sort(compareNodesByDisplayLabel);
        draftState.linkedObjectIds = linkedNodes.map((linkedNode) => linkedNode.id);
        linkedNodes.forEach((linkedNode) => {
          const chip = document.createElement("span");
          chip.className = "task-linked-chip";
          const label = document.createElement("span");
          label.className = "task-linked-chip-label";
          label.textContent = getNodeDisplayTitle(linkedNode, { fallback: getNodeTitleFallback(linkedNode) });
          chip.appendChild(label);
          const removeBtn = document.createElement("button");
          removeBtn.type = "button";
          removeBtn.className = "task-linked-chip-remove";
          removeBtn.textContent = "×";
          removeBtn.setAttribute("aria-label", `Remove ${label.textContent}`);
          removeBtn.addEventListener("click", () => {
            draftState.linkedObjectIds = draftState.linkedObjectIds.filter((nodeId) => nodeId !== linkedNode.id);
            syncLinkedObjectChips();
            syncSlashMenu();
            input.focus();
          });
          chip.appendChild(removeBtn);
          linkedObjectChips.appendChild(chip);
        });
      };

      const syncSlashMenu = () => {
        draftState.text = input.value;
        draftState.slashRange = getTaskSlashRange(input.value, input.selectionStart);
        slashMenu.innerHTML = "";
        if (!handoverContextNode || !draftState.slashRange) {
          slashMenu.classList.remove("is-open");
          return;
        }
        const slashOptions = getTaskSlashOptions(node, draftState, options.task || null);
        if (!slashOptions.length) {
          slashMenu.classList.remove("is-open");
          return;
        }
        slashMenu.classList.add("is-open");
        slashOptions.forEach((objectNode) => {
          const optionBtn = document.createElement("button");
          optionBtn.type = "button";
          optionBtn.className = "task-slash-option";
          optionBtn.textContent = `${getNodeDisplayTitle(objectNode, { fallback: getNodeTitleFallback(objectNode) })} (${objectNode.type})`;
          optionBtn.addEventListener("click", () => {
            applyTaskSlashSelection(draftState, input, objectNode.id);
            syncLinkedObjectChips();
            syncSlashMenu();
          });
          slashMenu.appendChild(optionBtn);
        });
      };

      ["input", "click", "keyup", "focus"].forEach((eventName) => {
        input.addEventListener(eventName, () => {
          draftState.text = input.value;
          syncSlashMenu();
        });
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          if (typeof options.onCancel === "function") {
            options.onCancel();
          }
          return;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          if (typeof options.onSubmit === "function") {
            options.onSubmit();
          }
        }
      });

      const controls = document.createElement("div");
      controls.className = "task-editor-controls";
      controls.appendChild(assigneeSelect);
      const actions = document.createElement("div");
      actions.className = "task-editor-actions";
      const submitBtn = document.createElement("button");
      submitBtn.type = "submit";
      submitBtn.className = "details-inline-btn";
      submitBtn.textContent = options.submitLabel || "Save";
      actions.appendChild(submitBtn);
      if (typeof options.onCancel === "function") {
        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "details-inline-btn is-secondary";
        cancelBtn.textContent = "Cancel";
        cancelBtn.addEventListener("click", () => {
          options.onCancel();
        });
        actions.appendChild(cancelBtn);
      }

      form.appendChild(input);
      form.appendChild(slashMenu);
      if (handoverContextNode) {
        form.appendChild(linkedObjectChips);
      }
      form.appendChild(controls);
      form.appendChild(actions);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        draftState.text = input.value;
        if (typeof options.onSubmit === "function") {
          options.onSubmit();
        }
      });

      syncLinkedObjectChips();
      syncSlashMenu();
      return form;
    }

    function appendBuiltTaskObjectLinks(container, selectedNode, task) {
      const linkedNodes = getTaskObjectNodes(task, selectedNode);
      if (!linkedNodes.length) return;
      const chipList = document.createElement("div");
      chipList.className = "task-object-chip-list";
      linkedNodes.forEach((linkedNode) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "task-object-chip";
        chip.textContent = getNodeDisplayTitle(linkedNode, { fallback: getNodeTitleFallback(linkedNode) });
        chip.addEventListener("click", () => selectNode(linkedNode.id));
        chipList.appendChild(chip);
      });
      container.appendChild(chipList);
    }

    function buildTasksSection(selectedNode) {
      const section = buildDetailsSection("details-section-tasks");
      const title = document.createElement("h4");
      title.className = "section-title";
      title.textContent = "Tasks";
      section.appendChild(title);

      const canManageTasks = canManageTaskInDetails(selectedNode);
      if (
        detailsTaskEditState.nodeId === selectedNode.id &&
        detailsTaskEditState.taskId &&
        !selectedNode.tasks.some((task) => task.id === detailsTaskEditState.taskId)
      ) {
        resetDetailsTaskEditState();
      }

      const tasksList = document.createElement("div");
      tasksList.className = "tasks-list";
      if (!selectedNode.tasks.length) {
        const emptyTasks = document.createElement("p");
        emptyTasks.className = "muted";
        emptyTasks.textContent = "No tasks yet.";
        tasksList.appendChild(emptyTasks);
      } else {
        selectedNode.tasks.forEach((task) => {
          const isEditingTask = detailsTaskEditState.nodeId === selectedNode.id && detailsTaskEditState.taskId === task.id;
          if (isEditingTask) {
            const editRow = document.createElement("div");
            editRow.className = "task-row is-editing";
            editRow.appendChild(buildTaskEditor(selectedNode, detailsTaskEditState, {
              inline: true,
              task,
              taskId: task.id,
              submitLabel: "Save",
              onSubmit: () => commitDetailsTaskEdit(selectedNode, task),
              onCancel: () => cancelDetailsTaskEdit()
            }));
            tasksList.appendChild(editRow);
            return;
          }

          const row = document.createElement("div");
          row.className = `task-row${task.done ? " done" : ""}`;
          const check = document.createElement("input");
          check.type = "checkbox";
          check.checked = !!task.done;
          check.disabled = !canManageTasks;
          check.addEventListener("change", () => {
            if (!setTaskDoneState(selectedNode.id, task.id, check.checked)) return;
            persistDetailsTaskChanges();
          });

          const content = document.createElement("div");
          content.className = "task-content";
          const taskText = document.createElement("p");
          taskText.className = "task-text";
          taskText.textContent = task.text;
          const assignee = document.createElement("div");
          assignee.className = "task-assignee";
          assignee.textContent = `Assigned: ${task.assignedTo}`;
          content.appendChild(taskText);
          content.appendChild(assignee);
          appendBuiltTaskObjectLinks(content, selectedNode, task);

          row.appendChild(check);
          row.appendChild(content);

          if (canManageTasks) {
            const actions = document.createElement("div");
            actions.className = "task-row-actions";
            const editBtn = document.createElement("button");
            editBtn.type = "button";
            editBtn.className = "workspace-row-icon-btn rename";
            editBtn.textContent = "✎";
            editBtn.title = "Edit task";
            editBtn.setAttribute("aria-label", "Edit task");
            editBtn.addEventListener("click", () => {
              beginDetailsTaskEdit(selectedNode, task);
            });
            const deleteBtn = document.createElement("button");
            deleteBtn.type = "button";
            deleteBtn.className = "workspace-row-icon-btn delete";
            deleteBtn.textContent = "✕";
            deleteBtn.title = "Delete task";
            deleteBtn.setAttribute("aria-label", "Delete task");
            deleteBtn.addEventListener("click", () => {
              if (!deleteTaskById(selectedNode.id, task.id)) return;
              if (detailsTaskEditState.taskId === task.id) {
                resetDetailsTaskEditState();
              }
              persistDetailsTaskChanges();
            });
            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);
            row.appendChild(actions);
          }

          tasksList.appendChild(row);
        });
      }
      section.appendChild(tasksList);

      if (selectedNode.type === "handover" && !canManageTasks) {
        const note = document.createElement("p");
        note.className = "muted";
        note.textContent = "Only the owner or collaborators can add tasks.";
        section.appendChild(note);
        return section;
      }

      ensureDetailsTaskComposerState(selectedNode);
      section.appendChild(buildTaskEditor(selectedNode, detailsTaskComposerState, {
        submitLabel: "Add task",
        placeholder: "Task description",
        onSubmit: () => {
          const changed = saveTaskDraft(selectedNode, detailsTaskComposerState, null);
          if (!changed) return;
          detailsTaskComposerState = createTaskDraftState(selectedNode);
          persistDetailsTaskChanges();
        }
      }));
      return section;
    }

    function deleteCommentFromNode(nodeId, commentIndex) {
      const node = getAnyNodeById(nodeId);
      if (!node || !Array.isArray(node.comments) || !node.comments[commentIndex]) return false;
      const comment = node.comments[commentIndex];
      if (!canCurrentUserDeleteComment(node, comment)) return false;
      node.comments.splice(commentIndex, 1);
      return true;
    }

    function buildCommentsSection(selectedNode) {
      const section = buildDetailsSection("details-section-comments");
      const title = document.createElement("h4");
      title.className = "section-title";
      title.textContent = "Comments";
      section.appendChild(title);

      const commentList = document.createElement("div");
      commentList.className = "comment-list";
      const orderedComments = [...selectedNode.comments]
        .map((comment, index) => ({ comment, index }))
        .sort((left, right) => new Date(left.comment.timestamp).getTime() - new Date(right.comment.timestamp).getTime());

      if (!orderedComments.length) {
        const noComments = document.createElement("p");
        noComments.className = "muted";
        noComments.textContent = "No comments yet.";
        commentList.appendChild(noComments);
      } else {
        orderedComments.forEach(({ comment, index }) => {
          const item = document.createElement("div");
          item.className = `comment-item${comment.isNew ? " is-new" : ""}`;
          const head = document.createElement("div");
          head.className = "comment-head";
          const meta = document.createElement("div");
          meta.className = "comment-meta";
          const author = document.createElement("span");
          author.textContent = comment.author;
          const time = document.createElement("span");
          time.textContent = formatCommentTimestamp(comment.timestamp);
          meta.appendChild(author);
          meta.appendChild(time);
          head.appendChild(meta);
          if (canCurrentUserDeleteComment(selectedNode, comment)) {
            const deleteBtn = document.createElement("button");
            deleteBtn.type = "button";
            deleteBtn.className = "workspace-row-icon-btn delete comment-delete-btn";
            deleteBtn.textContent = "✕";
            deleteBtn.title = "Delete comment";
            deleteBtn.setAttribute("aria-label", "Delete comment");
            deleteBtn.addEventListener("click", () => {
              if (!deleteCommentFromNode(selectedNode.id, index)) return;
              syncNodeRuntimeAndStore();
              persistStoreToLocalStorage();
              renderDetailsPane();
              renderNotifications();
            });
            head.appendChild(deleteBtn);
          }

          const text = document.createElement("p");
          text.className = "comment-text";
          text.textContent = comment.text;
          item.appendChild(head);
          item.appendChild(text);
          commentList.appendChild(item);
        });
      }
      section.appendChild(commentList);

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
      section.appendChild(commentForm);
      return section;
    }

    function buildDetailsFooterSection(selectedNode) {
      const section = buildDetailsSection("details-section-footer");
      const label = document.createElement("div");
      label.className = "details-footer-label";
      label.textContent = "Node ID";
      const value = document.createElement("div");
      value.className = "details-footer-value";
      value.textContent = selectedNode.id || "";
      section.appendChild(label);
      section.appendChild(value);
      return section;
    }
    function renderDetailsPane() {
      detailsPaneEl.innerHTML = "";
      if (isAdminMode()) {
        const placeholder = document.createElement("p");
        placeholder.className = "muted details-empty-state";
        placeholder.textContent = "Admin mode. Open Edit Organisations or Edit Users from the menu.";
        detailsPaneEl.appendChild(placeholder);
        return;
      }
      const selectedNode = getSelectedNode();
      if (!selectedNode) {
        const placeholder = document.createElement("p");
        placeholder.className = "muted details-empty-state";
        placeholder.textContent = "Select a node from the list or canvas to inspect details.";
        detailsPaneEl.appendChild(placeholder);
        return;
      }

      const sections = [
        buildDetailsHeaderSection(selectedNode),
        buildDetailsDescriptionSection(selectedNode),
        buildDetailsContextSection(selectedNode),
        selectedNode.type === "location" ? buildLocationChildrenSection(selectedNode) : null,
        selectedNode.type === "handover" ? buildHandoverObjectsSection(selectedNode) : null,
        selectedNode.type === "handover" ? buildHandoverCollaboratorsSection(selectedNode) : null,
        buildTasksSection(selectedNode),
        buildCommentsSection(selectedNode),
        buildDetailsFooterSection(selectedNode)
      ].filter(Boolean);

      sections.forEach((section) => {
        detailsPaneEl.appendChild(section);
      });
    }

    function addCommentToSelectedNode(text) {
      const message = text.trim();
      if (!message) return;
      const selectedNode = getSelectedNode();
      if (!selectedNode) return;

      selectedNode.comments.push({
        author: getCurrentUserName() || CURRENT_USER,
        text: message,
        timestamp: new Date().toISOString(),
        isNew: true
      });

      syncNodeRuntimeAndStore();
      persistStoreToLocalStorage();
      renderDetailsPane();
      renderNotifications();
    }

    function renderWorkspace(workspaceId) {
      cancelEdgeCreateInteractions({ redraw: false });
      closeCreateNodeMenu();
      const targetWorkspaceId = workspaceId || currentWorkspaceId;
      if (!hasAppliedWorkspace || appliedWorkspaceId !== targetWorkspaceId) {
        applyWorkspaceData(targetWorkspaceId, { sanitizeState: true });
        normalizeActiveWorkspaceSemantics();
        initializeGraphLayoutIfMissing();
        const visibleNodeIds = getVisibleNodeIdsForGlobalView();
        if (visibleNodeIds && visibleNodeIds.size) {
          if (suppressNextWorkspaceAutoFit) {
            suppressNextWorkspaceAutoFit = false;
          } else {
            fitCameraToNodes(visibleNodeIds, 80);
          }
        } else {
          suppressNextWorkspaceAutoFit = false;
        }
        appliedWorkspaceId = currentWorkspaceId;
        hasAppliedWorkspace = true;
        resetLocationClickTracker();
        resetPortalClickTracker();
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
      renderPortalLinkModal();
      renderEntityLinkModal();
      renderCollaboratorPickerModal();
      renderHandoverObjectPickerModal();
      renderAdminOrgModal();
      renderAdminUserModal();
      renderConfirmationModal();
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

    function renderLoadErrorState(message) {
      const nextMessage = String(message || "Failed to load the canonical store.");
      if (nodeListEl) {
        nodeListEl.innerHTML = "";
        const errorMessage = document.createElement("div");
        errorMessage.className = "node-list-empty";
        errorMessage.textContent = nextMessage;
        nodeListEl.appendChild(errorMessage);
      }
      if (detailsPaneEl) {
        detailsPaneEl.innerHTML = "";
        const detailsError = document.createElement("p");
        detailsError.className = "muted";
        detailsError.textContent = nextMessage;
        detailsPaneEl.appendChild(detailsError);
      }
    }

    function clearLegacyLocalStore() {
      try {
        window.localStorage.removeItem(STORE_KEY);
      } catch (error) {
        console.warn("Failed to clear legacy local storage amytis_store_v1 payload.", error);
      }
    }

    async function bootApp() {
      renderPanelState();
      renderLoadingState();
      clearLegacyLocalStore();
      renderPersistStatusBanner();

      try {
        const initialData = await loadInitialData();
        const initialStore = buildStore(initialData);
        initializeRuntimeDataFromStore(initialStore);
      } catch (error) {
        console.error("Failed to initialize app store from initial data.", error);
        bootErrorMessage = "Failed to load the canonical store from /api/store. Run the app via the Vite server.";
        renderLoadErrorState(bootErrorMessage);
        return;
      }

      renderAll();
    }

    void bootApp();
