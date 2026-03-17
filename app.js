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
import defaultStorePayload from "./data/defaultData.json";

const d3 = window.d3;
if (!window.d3 || !window.d3.forceSimulation) {
  console.error("D3 force not loaded");
}

const CURRENT_USER = "Dr Hannah Lewis";
const HANDOVER_OBJECT_ROLES = ["input", "output", "reference"];
const HANDOVER_OBJECT_ROLE_LABELS = {
  input: "Input",
  output: "Output",
  reference: "Reference"
};
const HANDOVER_OBJECT_EDGE_KIND_BY_ROLE = {
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
// type Comment = { id: string, author: string, text: string, timestamp: string, isNew: boolean }
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
//   handoverObjects?: Array<{ id: string, role: "input" | "output" | "reference" }>,
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
    const ENTITY_LABEL_FONT_WEIGHT = 600;
    const ENTITY_DIAMOND_MIN_SIZE_PX = 152;
    const ENTITY_DIAMOND_MAX_SIZE_PX = 280;
    const ENTITY_DIAMOND_TEXT_WIDTH_FUDGE_PX = 10;
    const ENTITY_DIAMOND_TEXT_SIDE_PADDING_PX = GRAPH_NODE_TEXT_INSET_PX;
    const PORTAL_GRAPH_POS_SCHEMA_VERSION = 2;
    const LEGACY_PORTAL_GRAPH_POS_Y_OFFSET_PX = 12;
    const COLLAPSED_CARD_W = 172;
    const COLLAPSED_CARD_WIDTH_BY_TYPE = {
      location: 172,
      process: 172,
      standard: 188,
      handover: 206,
      portal: 92,
      entity: ENTITY_DIAMOND_MIN_SIZE_PX,
      collaboration: 184
    };
    const COLLAPSED_CARD_HEIGHT_BY_TYPE = {
      location: 72,
      process: 72,
      standard: 64,
      handover: 72,
      portal: 92,
      entity: ENTITY_DIAMOND_MIN_SIZE_PX,
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
    const COLLAB_SHELL_BAND_THICKNESS = Object.freeze({
      entity: 72,
      context: 68,
      handover: 80,
      artifact: 96,
      other: 120
    });
    const COLLAB_SHELL_START_ANGLE_RAD = -Math.PI / 2;
    const COLLAB_SHELL_CONTEXT_FAN_STEP_RAD = Math.PI / 42;
    const COLLAB_SHELL_ARTIFACT_FAN_STEP_RAD = Math.PI / 30;
    const COLLAB_SHELL_SECTOR_GAP_RAD = Math.PI / 20;
    const COLLAB_SHELL_MIN_SECTOR_SPAN_RAD = Math.PI / 4.5;
    const COLLAB_SHELL_RELAX_TICKS = 220;
    const COLLAB_SHELL_RELAX_LINK_DISTANCE = 156;
    const COLLAB_SHELL_RELAX_LINK_STRENGTH = 0.2;
    const COLLAB_SHELL_RELAX_CHARGE_STRENGTH = -130;
    const COLLAB_SHELL_GROUP_HANDOVER_COHESION_STRENGTH = 0.2;
    const COLLAB_SHELL_GROUP_NODE_COHESION_STRENGTH = 0.05;
    const COLLAB_SHELL_LAYER_ARC_GAP_PX = 26;
    const COLLAB_SHELL_LAYER_RADIAL_GAP_PX = 22;
    const COLLAB_SHELL_LAYER_RADIUS_STEP_PX = 10;
    const COLLAB_SHELL_DEOVERLAP_PAIR_PAD_PX = 10;
    const COLLAB_SHELL_RADIAL_OFFSET_LIMIT_PX = 12;
    const COLLAB_SHELL_RADIAL_STRENGTH = Object.freeze({
      entity: 0.2,
      context: 0.22,
      handover: 0.22,
      artifact: 0.18,
      other: 0.16
    });
    const COLLAB_SHELL_TANGENTIAL_STRENGTH = Object.freeze({
      entity: 0.2,
      context: 0.2,
      handover: 0.18,
      artifact: 0.12,
      other: 0.08
    });
    const MARKER_OFFSETS = [
      [0, 0],
      [10, 0],
      [-10, 0],
      [0, 10]
    ];

    const LEGACY_STORE_KEY = "amytis_store_v1";
    const STORE_LOCAL_KEY = "amytis_store_local_v1";
    const STORE_API_ENDPOINT = "/api/store";
    const STORE_QUERY_PARAM = "store";
    const STORE_RESET_QUERY_PARAM = "resetStore";
    const STORE_MODE_API = "api";
    const STORE_MODE_LOCAL = "local";
    const STORE_MODE_SET = new Set([STORE_MODE_API, STORE_MODE_LOCAL]);
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
    const COLLAB_AUTO_CHAIN_META_KEY = "collabAutoChain";
    const COLLAB_AUTO_CHAIN_SCHEMA_VERSION = 2;
    const COLLAB_AUTO_CHAIN_HELPER_NODE_IDS_KEY = "helperNodeIds";
    const NOTIFICATION_STATE_BY_USER_META_KEY = "notificationStateByUserId";
    const WORKSPACE_VIEWPORT_BY_USER_META_KEY = "viewportByUserId";
    const WORKSPACE_RUNTIME_NODE_POSITIONS_META_KEY = "runtimeNodePositions";
    const WORKSPACE_VIEWPORT_PERSIST_DEBOUNCE_MS = 320;
    const GRAPH_CLIPBOARD_PASTE_OFFSET_WORLD_X = 36;
    const GRAPH_CLIPBOARD_PASTE_OFFSET_WORLD_Y = 26;

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
      } catch (error) {
        return new URLSearchParams();
      }
    }

    function getStoreModeOverrideFromQuery() {
      const queryValue = getQueryParams().get(STORE_QUERY_PARAM);
      if (!queryValue) return null;
      const normalized = String(queryValue).trim().toLowerCase();
      return STORE_MODE_SET.has(normalized) ? normalized : null;
    }

    function shouldResetStoreFromQuery() {
      const queryValue = getQueryParams().get(STORE_RESET_QUERY_PARAM);
      if (queryValue == null) return false;
      const normalized = String(queryValue).trim().toLowerCase();
      return normalized === "" || normalized === "1" || normalized === "true" || normalized === "yes";
    }

    function resolveStoreMode() {
      const override = getStoreModeOverrideFromQuery();
      if (override) return override;
      const isDevMode = Boolean(import.meta.env && import.meta.env.DEV);
      return isDevMode ? STORE_MODE_API : STORE_MODE_LOCAL;
    }

    const activeStoreMode = resolveStoreMode();

    function getDefaultStoreSeedPayload() {
      const snapshot = clonePlainData(defaultStorePayload);
      if (!isValidStorePayloadShape(snapshot)) {
        throw new Error("Bundled default store payload has an invalid shape.");
      }
      return snapshot;
    }

    async function loadInitialDataFromApi() {
      const response = await fetch(STORE_API_ENDPOINT, {
        method: "GET",
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error(`Failed to load canonical store: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    }

    function readStorePayloadFromLocalStorage() {
      const rawPayload = window.localStorage.getItem(STORE_LOCAL_KEY);
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
      window.localStorage.setItem(STORE_LOCAL_KEY, JSON.stringify(payload));
    }

    function clearShareLocalStore() {
      window.localStorage.removeItem(STORE_LOCAL_KEY);
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
      if (activeStoreMode === STORE_MODE_LOCAL) {
        return "Failed to load the browser local store payload.";
      }
      return "Failed to load the canonical store from /api/store. Run the app via the Vite server.";
    }

    async function loadInitialData() {
      if (activeStoreMode === STORE_MODE_LOCAL) {
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
    let pendingWorkspaceApplyAutoFit = "if-missing";
    let workspaceMenuOpen = false;
    let userMenuOpen = false;
    let isCreatingWorkspace = false;
  let workspaceDraftName = "";
  let workspaceRenameId = null;
  let workspaceRenameDraft = "";
  let createNodeMenuOpen = false;
  let createNodeMenuMode = "create";
  let createNodeMenuNodeId = null;
  let createNodeMenuEdgeId = null;
  let createNodeMenuSelectionContext = null;
  let createNodeMenuClientX = 0;
  let createNodeMenuClientY = 0;
  let createNodeMenuWorldX = 0;
  let createNodeMenuWorldY = 0;
  let graphClipboardState = {
    hasData: false,
    sourceWorkspaceId: null,
    sourceCentroid: { x: 0, y: 0 },
    pasteSequence: 0,
    nodeRefs: [],
    nodeSnapshots: [],
    edgeDescriptors: [],
    copiedAt: 0
  };
  let newNodeInlineEditId = null;
  let viewportPersistTimerId = null;
  let viewportPersistDirty = false;
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
          const normalizedCommentsResult = normalizeCommentRecords(node.comments, node.id);
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
            comments: normalizedCommentsResult.comments,
            locationId: Object.prototype.hasOwnProperty.call(node, "locationId") ? node.locationId : null
          };
          if (normalizedCommentsResult.changed) {
            migratedNodeData = true;
          }
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
      if (refreshAllHandoverDerivedState()) {
        migratedNodeData = true;
      }
      const migratedNotificationData = pruneNotificationStateByUser();
      if (seededOrgRecords || seededUserRecords || migratedNodeData || migratedNotificationData) {
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
      pendingWorkspaceApplyAutoFit = "if-missing";
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
      selectedNodeIds: new Set(["exp-culture-check-b"]),
      selectedEdgeIds: new Set(),
      listMode: "by-location",
      expandedLocationIds: new Set(["loc-lab-a", "loc-freezer-1"]),
      expandedCanvasLocationId: null,
      expandedDragRootId: null,
      expandedDragOverrides: new Map(),
      focusLocationId: null,
      notificationsOpen: false,
      openLenses: new Map()
    };

function ensureGraphSelectionState() {
  if (!(state.selectedNodeIds instanceof Set)) {
    state.selectedNodeIds = new Set(Array.isArray(state.selectedNodeIds) ? state.selectedNodeIds : []);
  }
  if (!(state.selectedEdgeIds instanceof Set)) {
    state.selectedEdgeIds = new Set(Array.isArray(state.selectedEdgeIds) ? state.selectedEdgeIds : []);
  }
}

function isMultiSelectModifier(event) {
  return !!event && (event.ctrlKey || event.metaKey);
}

function getDeterministicSelectionNodeId(nodeIds) {
  const candidateNodes = [...nodeIds]
    .map((nodeId) => getNodeById(nodeId))
    .filter((node) => !!node && isSelectableNode(node));
  if (!candidateNodes.length) return null;
  candidateNodes.sort((a, b) => {
    const stableDiff = compareNodesStable(a, b);
    if (stableDiff !== 0) return stableDiff;
    return a.id.localeCompare(b.id);
  });
  return candidateNodes[0].id;
}

function selectSingleNode(nodeId, options = {}) {
  ensureGraphSelectionState();
  const node = getNodeById(nodeId);
  if (!node || !isSelectableNode(node)) {
    const fallbackNodeId = getFirstSelectableNodeId(nodes);
    state.selectedNodeId = fallbackNodeId;
    state.selectedNodeIds = fallbackNodeId ? new Set([fallbackNodeId]) : new Set();
    state.selectedEdgeIds = new Set();
    if (options.resetDetails !== false) {
      resetDetailsEditState();
    }
    return state.selectedNodeId ? getNodeById(state.selectedNodeId) : null;
  }
  if (state.selectedNodeId !== node.id && options.resetDetails !== false) {
    resetDetailsEditState();
  }
  state.selectedNodeId = node.id;
  state.selectedNodeIds = new Set([node.id]);
  state.selectedEdgeIds = new Set();
  return node;
}

function toggleNodeSelection(nodeId, options = {}) {
  ensureGraphSelectionState();
  const node = getNodeById(nodeId);
  if (!node || !isSelectableNode(node)) return false;
  const selection = new Set(state.selectedNodeIds);
  if (selection.has(nodeId)) {
    selection.delete(nodeId);
    state.selectedNodeIds = selection;
    if (state.selectedNodeId === nodeId) {
      const fallbackId = getDeterministicSelectionNodeId(selection);
      if (fallbackId !== state.selectedNodeId && options.resetDetails !== false) {
        resetDetailsEditState();
      }
      state.selectedNodeId = fallbackId;
    }
    return true;
  }
  selection.add(nodeId);
  state.selectedNodeIds = selection;
  if (state.selectedNodeId !== nodeId && options.resetDetails !== false) {
    resetDetailsEditState();
  }
  state.selectedNodeId = nodeId;
  return true;
}

function toggleEdgeSelection(edgeId) {
  ensureGraphSelectionState();
  if (!edgeId || !edgeById.has(edgeId)) return false;
  const selection = new Set(state.selectedEdgeIds);
  if (selection.has(edgeId)) {
    selection.delete(edgeId);
  } else {
    selection.add(edgeId);
  }
  state.selectedEdgeIds = selection;
  return true;
}

function selectSingleEdge(edgeId, options = {}) {
  ensureGraphSelectionState();
  if (!edgeId || !edgeById.has(edgeId)) {
    state.selectedEdgeIds = new Set();
    if (options.preserveNodes !== true) {
      state.selectedNodeIds = new Set();
      if (state.selectedNodeId !== null) {
        resetDetailsEditState();
      }
      state.selectedNodeId = null;
    }
    return false;
  }
  state.selectedEdgeIds = new Set([edgeId]);
  if (options.preserveNodes !== true) {
    state.selectedNodeIds = new Set();
    if (state.selectedNodeId !== null) {
      resetDetailsEditState();
    }
    state.selectedNodeId = null;
  }
  return true;
}

function addNodesToSelection(nodeIds, options = {}) {
  ensureGraphSelectionState();
  const sortedIds = [...new Set(Array.isArray(nodeIds) ? nodeIds : [])]
    .map((nodeId) => getNodeById(nodeId))
    .filter((node) => !!node && isSelectableNode(node))
    .sort((a, b) => {
      const stableDiff = compareNodesStable(a, b);
      if (stableDiff !== 0) return stableDiff;
      return a.id.localeCompare(b.id);
    })
    .map((node) => node.id);
  if (!sortedIds.length) return false;
  const selection = new Set(state.selectedNodeIds);
  let changed = false;
  sortedIds.forEach((nodeId) => {
    if (selection.has(nodeId)) return;
    selection.add(nodeId);
    changed = true;
  });
  state.selectedNodeIds = selection;
  const promotedNodeId = sortedIds[sortedIds.length - 1];
  if (promotedNodeId && state.selectedNodeId !== promotedNodeId && options.resetDetails !== false) {
    resetDetailsEditState();
  }
  if (promotedNodeId) {
    state.selectedNodeId = promotedNodeId;
  }
  return changed;
}

function addEdgesToSelection(edgeIds) {
  ensureGraphSelectionState();
  const uniqueIds = [...new Set(Array.isArray(edgeIds) ? edgeIds : [])]
    .filter((edgeId) => edgeById.has(edgeId));
  if (!uniqueIds.length) return false;
  const selection = new Set(state.selectedEdgeIds);
  let changed = false;
  uniqueIds.forEach((edgeId) => {
    if (selection.has(edgeId)) return;
    selection.add(edgeId);
    changed = true;
  });
  state.selectedEdgeIds = selection;
  return changed;
}

function pruneSelectionState() {
  ensureGraphSelectionState();
  const visibleNodeIds = getVisibleNodeIdsForCurrentView();
  const prunedNodeIds = new Set(
    [...state.selectedNodeIds].filter((nodeId) => {
      if (!visibleNodeIds.has(nodeId)) return false;
      const node = getNodeById(nodeId);
      return !!node && isSelectableNode(node);
    })
  );
  const prunedEdgeIds = new Set(
    [...state.selectedEdgeIds].filter((edgeId) => {
      const edge = edgeById.get(edgeId);
      if (!edge) return false;
      return visibleNodeIds.has(edge.sourceId) && visibleNodeIds.has(edge.targetId);
    })
  );
  state.selectedNodeIds = prunedNodeIds;
  state.selectedEdgeIds = prunedEdgeIds;

  if (state.selectedNodeId && prunedNodeIds.has(state.selectedNodeId)) {
    return;
  }
  const fallbackId = getDeterministicSelectionNodeId(prunedNodeIds);
  if (state.selectedNodeId !== fallbackId) {
    resetDetailsEditState();
  }
  state.selectedNodeId = fallbackId;
}

function ensureStoreMetaRecord(create = false) {
  if (!store || typeof store !== "object") return null;
  if (store.meta && typeof store.meta === "object") {
    return store.meta;
  }
  if (!create) return null;
  store.meta = {};
  return store.meta;
}

function normalizeNotificationStateRecord(record) {
  const seenTaskIds = [...new Set(
    (Array.isArray(record?.seenTaskIds) ? record.seenTaskIds : [])
      .filter((taskId) => typeof taskId === "string" && taskId)
  )];
  const seenCommentIds = [...new Set(
    (Array.isArray(record?.seenCommentIds) ? record.seenCommentIds : [])
      .filter((commentId) => typeof commentId === "string" && commentId)
  )];
  return { seenTaskIds, seenCommentIds };
}

function getNotificationStateByUserMap(create = false) {
  const storeMeta = ensureStoreMetaRecord(create);
  if (!storeMeta) return null;
  const notificationStateByUserId = storeMeta[NOTIFICATION_STATE_BY_USER_META_KEY];
  if (notificationStateByUserId && typeof notificationStateByUserId === "object" && !Array.isArray(notificationStateByUserId)) {
    return notificationStateByUserId;
  }
  if (!create) return null;
  storeMeta[NOTIFICATION_STATE_BY_USER_META_KEY] = {};
  return storeMeta[NOTIFICATION_STATE_BY_USER_META_KEY];
}

function getNotificationStateForUser(userId = currentUserId, create = false) {
  if (!userId) return null;
  const stateByUserId = getNotificationStateByUserMap(create);
  if (!stateByUserId) return null;
  const existingRecord = stateByUserId[userId];
  if (!existingRecord && !create) return null;
  const normalizedRecord = normalizeNotificationStateRecord(existingRecord);
  const matchesNormalizedRecord = !!existingRecord &&
    Array.isArray(existingRecord.seenTaskIds) &&
    Array.isArray(existingRecord.seenCommentIds) &&
    existingRecord.seenTaskIds.length === normalizedRecord.seenTaskIds.length &&
    existingRecord.seenCommentIds.length === normalizedRecord.seenCommentIds.length &&
    existingRecord.seenTaskIds.every((taskId, index) => taskId === normalizedRecord.seenTaskIds[index]) &&
    existingRecord.seenCommentIds.every((commentId, index) => commentId === normalizedRecord.seenCommentIds[index]);
  if (!matchesNormalizedRecord) {
    stateByUserId[userId] = normalizedRecord;
  }
  return stateByUserId[userId];
}

function hasCurrentUserSeenTask(taskId) {
  if (typeof taskId !== "string" || !taskId) return false;
  const notificationState = getNotificationStateForUser(currentUserId, false);
  return !!notificationState && notificationState.seenTaskIds.includes(taskId);
}

function markCurrentUserTaskSeen(taskId) {
  if (typeof taskId !== "string" || !taskId || !currentUserId) return false;
  const notificationState = getNotificationStateForUser(currentUserId, true);
  if (!notificationState || notificationState.seenTaskIds.includes(taskId)) return false;
  notificationState.seenTaskIds.push(taskId);
  return true;
}

function clearTaskSeenForAllUsers(taskId) {
  if (typeof taskId !== "string" || !taskId) return false;
  const stateByUserId = getNotificationStateByUserMap(false);
  if (!stateByUserId) return false;
  let changed = false;
  Object.keys(stateByUserId).forEach((userId) => {
    const notificationState = getNotificationStateForUser(userId, true);
    if (!notificationState) return;
    const nextTaskIds = notificationState.seenTaskIds.filter((candidateTaskId) => candidateTaskId !== taskId);
    if (nextTaskIds.length === notificationState.seenTaskIds.length) return;
    notificationState.seenTaskIds = nextTaskIds;
    changed = true;
  });
  return changed;
}

function hasCurrentUserSeenComment(commentId) {
  if (typeof commentId !== "string" || !commentId) return false;
  const notificationState = getNotificationStateForUser(currentUserId, false);
  return !!notificationState && notificationState.seenCommentIds.includes(commentId);
}

function markCurrentUserCommentSeen(commentId) {
  if (typeof commentId !== "string" || !commentId || !currentUserId) return false;
  const notificationState = getNotificationStateForUser(currentUserId, true);
  if (!notificationState || notificationState.seenCommentIds.includes(commentId)) return false;
  notificationState.seenCommentIds.push(commentId);
  return true;
}

function clearCommentSeenForAllUsers(commentId) {
  if (typeof commentId !== "string" || !commentId) return false;
  const stateByUserId = getNotificationStateByUserMap(false);
  if (!stateByUserId) return false;
  let changed = false;
  Object.keys(stateByUserId).forEach((userId) => {
    const notificationState = getNotificationStateForUser(userId, true);
    if (!notificationState) return;
    const nextCommentIds = notificationState.seenCommentIds.filter((candidateCommentId) => candidateCommentId !== commentId);
    if (nextCommentIds.length === notificationState.seenCommentIds.length) return;
    notificationState.seenCommentIds = nextCommentIds;
    changed = true;
  });
  return changed;
}

function pruneNotificationStateByUser() {
  const stateByUserId = getNotificationStateByUserMap(false);
  if (!stateByUserId) return false;
  const validTaskIds = new Set();
  const validCommentIds = new Set();
  allNodesRuntime.forEach((node) => {
    (Array.isArray(node?.tasks) ? node.tasks : []).forEach((task) => {
      if (typeof task?.id === "string" && task.id) {
        validTaskIds.add(task.id);
      }
    });
    (Array.isArray(node?.comments) ? node.comments : []).forEach((comment) => {
      if (typeof comment?.id === "string" && comment.id) {
        validCommentIds.add(comment.id);
      }
    });
  });
  let changed = false;
  Object.keys(stateByUserId).forEach((userId) => {
    const notificationState = getNotificationStateForUser(userId, true);
    if (!notificationState) return;
    const nextTaskIds = notificationState.seenTaskIds.filter((taskId) => validTaskIds.has(taskId));
    const nextCommentIds = notificationState.seenCommentIds.filter((commentId) => validCommentIds.has(commentId));
    if (nextTaskIds.length !== notificationState.seenTaskIds.length) {
      notificationState.seenTaskIds = nextTaskIds;
      changed = true;
    }
    if (nextCommentIds.length !== notificationState.seenCommentIds.length) {
      notificationState.seenCommentIds = nextCommentIds;
      changed = true;
    }
    if (!notificationState.seenTaskIds.length && !notificationState.seenCommentIds.length) {
      delete stateByUserId[userId];
      changed = true;
    }
  });
  if (!Object.keys(stateByUserId).length) {
    const storeMeta = ensureStoreMetaRecord(false);
    if (storeMeta && Object.prototype.hasOwnProperty.call(storeMeta, NOTIFICATION_STATE_BY_USER_META_KEY)) {
      delete storeMeta[NOTIFICATION_STATE_BY_USER_META_KEY];
      changed = true;
    }
  }
  return changed;
}

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
  const normalizedHandoverObjects = nextHandoverObjects;
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
  {
    const currentCollaborators = Array.isArray(node.handoverCollaborators) ? node.handoverCollaborators : [];
    const nextCollaborators = currentCollaborators.map((collaborator) => {
      if (normalizeEntityKind(collaborator?.kind) !== "org" || !collaborator?.shareWorkspace) return collaborator;
      changed = true;
      return {
        ...collaborator,
        shareWorkspace: false
      };
    });
    node.handoverCollaborators = nextCollaborators;
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
  return !!node && isSelectableNode(node) && node.type !== "portal" && node.type !== "entity" && node.type !== "collaboration";
}

function getNodeContextNode(node) {
  if (!node) return null;
  const sourceWorkspace = getCanonicalSourceWorkspaceForNode(node);
  if (!sourceWorkspace) return null;
  const anchorId = typeof sourceWorkspace.homeNodeId === "string" && sourceWorkspace.homeNodeId
    ? sourceWorkspace.homeNodeId
    : null;
  if (!anchorId || anchorId === node.id) return null;
  return getAnyNodeById(anchorId) || null;
}

function getHandoverGraphContextNode(node) {
  if (!node || node.type !== "handover") return null;
  const sourceWorkspaceId = getSourceWorkspaceIdForHandover(node);
  if (!sourceWorkspaceId) return null;
  const sourceWorkspace = workspaceById.get(sourceWorkspaceId) || null;
  if (!sourceWorkspace || normalizeWorkspaceKind(sourceWorkspace.kind) === "collab") return null;
  return getNodeContextNode(node);
}

function getNodeDetailsHeaderContextNode(node) {
  return getNodeContextNode(node);
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

function getHandoverContextDisplayLabel(node) {
  if (!node || node.type !== "handover") return "";
  const contextNode = getHandoverGraphContextNode(node);
  if (!contextNode) return "";
  return getNodeDisplayTitle(contextNode, { fallback: getNodeTitleFallback(contextNode) });
}

function getHandoverObjectEdgeKind(role) {
  return HANDOVER_OBJECT_EDGE_KIND_BY_ROLE[normalizeHandoverObjectRole(role)] || HANDOVER_OBJECT_EDGE_KIND_BY_ROLE.reference;
}

function getDefaultHandoverObjectEdgeDirection(role) {
  const normalizedRole = normalizeHandoverObjectRole(role);
  if (normalizedRole === "input") {
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
    return false;
  }
  node.handoverObjects = [
    ...currentObjects,
    {
      id: objectId,
      role: normalizedRole
    }
  ];
  refreshAllHandoverDerivedState();
  syncNodeRuntimeAndStore();
  invalidateActiveWorkspaceView({ autoFit: "preserve" });
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
  invalidateActiveWorkspaceView({ autoFit: "preserve" });
  persistStoreToLocalStorage();
  return true;
}

function setHandoverObjectRole(nodeId, objectId, role) {
  const node = getNodeById(nodeId);
  if (!node || node.type !== "handover" || !isNodeOwnedByCurrentUser(node)) return false;
  const normalizedRole = normalizeHandoverObjectRole(role);
  let changed = false;
  node.handoverObjects = getHandoverObjects(node).map((handoverObject) => {
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
  invalidateActiveWorkspaceView({ autoFit: "preserve" });
  persistStoreToLocalStorage();
  return true;
}

function addHandoverObjectIds(nodeId, nextNodeIds, role = "reference") {
  const node = getNodeById(nodeId);
  if (!node || node.type !== "handover" || !isNodeOwnedByCurrentUser(node)) return false;
  const normalizedRole = normalizeHandoverObjectRole(role);
  const currentObjects = getHandoverObjects(node);
  const existingIds = new Set(currentObjects.map((handoverObject) => handoverObject.id));
  const nextObjects = [...currentObjects];
  let changed = false;
  (Array.isArray(nextNodeIds) ? nextNodeIds : []).forEach((candidateNodeId) => {
    if (typeof candidateNodeId !== "string" || !candidateNodeId || candidateNodeId === node.id || existingIds.has(candidateNodeId)) {
      return;
    }
    const candidateNode = getAnyNodeById(candidateNodeId);
    const nextRole = normalizedRole;
    if (!isValidHandoverObjectNodeForRole(candidateNode, nextRole)) return;
    existingIds.add(candidateNodeId);
    nextObjects.push({
      id: candidateNodeId,
      role: nextRole
    });
    changed = true;
  });
  if (!changed) return false;
  node.handoverObjects = nextObjects;
  refreshAllHandoverDerivedState();
  syncNodeRuntimeAndStore();
  invalidateActiveWorkspaceView({ autoFit: "preserve" });
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
  node.handoverObjects = [
    ...currentObjects,
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

function generateCommentId() {
  return `comment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function hashCommentIdentitySeed(seed) {
  const value = String(seed || "");
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildDeterministicCommentId(nodeId, comment, index = 0) {
  const author = typeof comment?.author === "string" ? comment.author.trim() : "";
  const text = typeof comment?.text === "string" ? comment.text.trim() : "";
  const timestamp = typeof comment?.timestamp === "string" ? comment.timestamp.trim() : "";
  const seed = `${nodeId || ""}|${timestamp}|${author}|${text}|${index}`;
  const hashedSeed = hashCommentIdentitySeed(seed).toString(36);
  return `comment-${hashedSeed}`;
}

function normalizeCommentRecord(comment, options = {}) {
  const preferredId = typeof options.preferredId === "string" && options.preferredId
    ? options.preferredId
    : null;
  const nextId = typeof comment?.id === "string" && comment.id
    ? comment.id
    : (preferredId || generateCommentId());
  return {
    id: nextId,
    author: typeof comment?.author === "string" ? comment.author : "",
    text: typeof comment?.text === "string" ? comment.text : "",
    timestamp: typeof comment?.timestamp === "string" && comment.timestamp
      ? comment.timestamp
      : new Date().toISOString(),
    isNew: comment?.isNew !== false
  };
}

function normalizeCommentRecords(comments, nodeId = "") {
  const sourceComments = Array.isArray(comments) ? comments : [];
  const takenCommentIds = new Set();
  let changed = !Array.isArray(comments);
  const normalizedComments = sourceComments.map((comment, index) => {
    const rawId = typeof comment?.id === "string" && comment.id ? comment.id : "";
    let preferredId = rawId || buildDeterministicCommentId(nodeId, comment, index);
    while (takenCommentIds.has(preferredId)) {
      preferredId = `${preferredId}-${index.toString(36)}`;
    }
    const normalizedComment = normalizeCommentRecord(comment, { preferredId });
    takenCommentIds.add(normalizedComment.id);
    if (
      !rawId ||
      normalizedComment.id !== rawId ||
      normalizedComment.author !== (typeof comment?.author === "string" ? comment.author : "") ||
      normalizedComment.text !== (typeof comment?.text === "string" ? comment.text : "") ||
      normalizedComment.timestamp !== (typeof comment?.timestamp === "string" && comment.timestamp ? comment.timestamp : "") ||
      normalizedComment.isNew !== (comment?.isNew !== false)
    ) {
      changed = true;
    }
    return normalizedComment;
  });
  return {
    comments: normalizedComments,
    changed
  };
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
  clearTaskSeenForAllUsers(task.id);
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
          clearTaskSeenForAllUsers(task.id);
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
          clearTaskSeenForAllUsers(task.id);
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
      clearTaskSeenForAllUsers(task.id);
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
  const size = clamp(
    Math.ceil(measuredTextWidth + (ENTITY_DIAMOND_TEXT_SIDE_PADDING_PX * 2)),
    ENTITY_DIAMOND_MIN_SIZE_PX,
    ENTITY_DIAMOND_MAX_SIZE_PX
  );
  return {
    width: size,
    height: size
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
  invalidateActiveWorkspaceView({ autoFit: "preserve" });
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
  invalidateActiveWorkspaceView({ autoFit: "preserve" });
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
  invalidateActiveWorkspaceView({ autoFit: "preserve" });
  persistStoreToLocalStorage();
  return true;
}

function appendSystemCommentToNode(node, text) {
  if (!node || typeof text !== "string" || !text.trim()) return false;
  if (!Array.isArray(node.comments)) {
    node.comments = [];
  }
  node.comments.push(normalizeCommentRecord({
    id: generateCommentId(),
    author: "System",
    text: text.trim(),
    timestamp: new Date().toISOString(),
    isNew: true
  }));
  return true;
}

function removeCurrentUserFromHandover(nodeId) {
  const node = getAnyNodeById(nodeId) || getNodeById(nodeId);
  if (!node || node.type !== "handover" || !currentUserId) return false;
  if (isNodeOwnedByCurrentUser(node)) return false;
  const directUserEntry = getDirectUserCollaboratorEntryForNode(node, currentUserId);
  if (!directUserEntry) return false;
  if (!removeHandoverCollaboratorEntry(node, "user", currentUserId)) return false;
  const actorLabel = String(getCurrentUserName() || currentUserId || "A collaborator").trim();
  appendSystemCommentToNode(node, `${actorLabel} removed themselves as collaborator.`);
  removeCollabWorkspaceGraphForCollaborator(node, directUserEntry);
  refreshAllHandoverDerivedState();
  syncNodeRuntimeAndStore();
  syncWorkspaceRuntimeAndStore();
  invalidateActiveWorkspaceView({ autoFit: "preserve", clearAppliedWorkspaceId: true });
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
  if (normalizeEntityKind(kind) !== "user") return false;
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
  invalidateActiveWorkspaceView({ autoFit: "preserve" });
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

function normalizeWorkspaceApplyAutoFitPolicy(value) {
  if (value === true || value === "always") return "always";
  if (value === "if-missing") return "if-missing";
  return "preserve";
}

function mergeWorkspaceApplyAutoFitPolicy(currentPolicy, nextPolicy) {
  const rank = {
    preserve: 0,
    "if-missing": 1,
    always: 2
  };
  const current = normalizeWorkspaceApplyAutoFitPolicy(currentPolicy);
  const next = normalizeWorkspaceApplyAutoFitPolicy(nextPolicy);
  return (rank[next] > rank[current]) ? next : current;
}

function invalidateActiveWorkspaceView(options = {}) {
  const normalizedPolicy = normalizeWorkspaceApplyAutoFitPolicy(options.autoFit);
  hasAppliedWorkspace = false;
  pendingWorkspaceApplyAutoFit = mergeWorkspaceApplyAutoFitPolicy(
    pendingWorkspaceApplyAutoFit,
    normalizedPolicy
  );
  if (options.clearAppliedWorkspaceId) {
    appliedWorkspaceId = null;
  }
}

function consumePendingWorkspaceApplyAutoFit() {
  const nextPolicy = normalizeWorkspaceApplyAutoFitPolicy(pendingWorkspaceApplyAutoFit);
  pendingWorkspaceApplyAutoFit = "preserve";
  return nextPolicy;
}

function normalizeWorkspaceViewportRecord(record) {
  if (!record || typeof record !== "object") return null;
  const panX = Number(record.panX);
  const panY = Number(record.panY);
  const zoom = Number(record.zoom);
  if (!Number.isFinite(panX) || !Number.isFinite(panY) || !Number.isFinite(zoom) || zoom <= 0) {
    return null;
  }
  return { panX, panY, zoom };
}

function getWorkspaceViewportRecordForUser(workspaceRecord, userId = currentUserId) {
  if (!workspaceRecord || !userId) return null;
  const workspaceMeta = ensureWorkspaceMetaRecord(workspaceRecord);
  const byUserId = workspaceMeta[WORKSPACE_VIEWPORT_BY_USER_META_KEY];
  if (!byUserId || typeof byUserId !== "object") return null;
  return normalizeWorkspaceViewportRecord(byUserId[userId]);
}

function setWorkspaceViewportRecordForUser(workspaceRecord, viewportRecord, userId = currentUserId) {
  if (!workspaceRecord || !userId) return false;
  const normalizedRecord = normalizeWorkspaceViewportRecord(viewportRecord);
  if (!normalizedRecord) return false;
  const workspaceMeta = ensureWorkspaceMetaRecord(workspaceRecord);
  if (!workspaceMeta[WORKSPACE_VIEWPORT_BY_USER_META_KEY] || typeof workspaceMeta[WORKSPACE_VIEWPORT_BY_USER_META_KEY] !== "object") {
    workspaceMeta[WORKSPACE_VIEWPORT_BY_USER_META_KEY] = {};
  }
  const byUserId = workspaceMeta[WORKSPACE_VIEWPORT_BY_USER_META_KEY];
  const currentRecord = normalizeWorkspaceViewportRecord(byUserId[userId]);
  if (
    currentRecord &&
    Math.abs(currentRecord.panX - normalizedRecord.panX) < 0.01 &&
    Math.abs(currentRecord.panY - normalizedRecord.panY) < 0.01 &&
    Math.abs(currentRecord.zoom - normalizedRecord.zoom) < 0.0001
  ) {
    return false;
  }
  byUserId[userId] = normalizedRecord;
  return true;
}

function scheduleViewportPersist() {
  viewportPersistDirty = true;
  if (viewportPersistTimerId !== null) {
    window.clearTimeout(viewportPersistTimerId);
  }
  viewportPersistTimerId = window.setTimeout(() => {
    viewportPersistTimerId = null;
    if (!viewportPersistDirty) return;
    viewportPersistDirty = false;
    syncWorkspaceRuntimeAndStore();
    persistStoreToLocalStorage();
  }, WORKSPACE_VIEWPORT_PERSIST_DEBOUNCE_MS);
}

function setViewportForWorkspaceUser(workspaceRecord, viewportRecord, options = {}) {
  if (!workspaceRecord) return false;
  const updated = setWorkspaceViewportRecordForUser(workspaceRecord, viewportRecord, options.userId || currentUserId);
  if (!updated) return false;
  if (options.persist !== false) {
    scheduleViewportPersist();
  }
  return true;
}

function rememberCurrentWorkspaceViewport(options = {}) {
  const workspaceRecord = getCurrentWorkspaceRecord();
  if (!workspaceRecord || !currentUserId || !camera) return false;
  return setViewportForWorkspaceUser(workspaceRecord, {
    panX: camera.panX,
    panY: camera.panY,
    zoom: camera.zoom
  }, options);
}

function rememberViewportForWorkspaceById(workspaceId, options = {}) {
  if (!workspaceId || !currentUserId || !camera) return false;
  const workspaceRecord = workspaceById.get(workspaceId) || null;
  if (!workspaceRecord) return false;
  return setViewportForWorkspaceUser(workspaceRecord, {
    panX: camera.panX,
    panY: camera.panY,
    zoom: camera.zoom
  }, options);
}

function getWorkspaceRuntimeNodePositionsRecord(workspaceRecord, create = false) {
  if (!workspaceRecord) return null;
  const workspaceMeta = ensureWorkspaceMetaRecord(workspaceRecord);
  const currentValue = workspaceMeta[WORKSPACE_RUNTIME_NODE_POSITIONS_META_KEY];
  if (currentValue && typeof currentValue === "object") return currentValue;
  if (!create) return null;
  workspaceMeta[WORKSPACE_RUNTIME_NODE_POSITIONS_META_KEY] = {};
  return workspaceMeta[WORKSPACE_RUNTIME_NODE_POSITIONS_META_KEY];
}

function normalizeWorkspaceNodePosRecord(value) {
  if (!value || typeof value !== "object") return null;
  const x = Number(value.x);
  const y = Number(value.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function getWorkspaceNodePos(workspaceId, nodeId, options = {}) {
  if (!workspaceId || !nodeId) return null;
  const workspaceRecord = workspaceById.get(workspaceId) || null;
  if (!workspaceRecord) return null;
  const runtimeRecord = getWorkspaceRuntimeNodePositionsRecord(workspaceRecord, false);
  const runtimePos = normalizeWorkspaceNodePosRecord(runtimeRecord?.[nodeId]);
  if (runtimePos) return runtimePos;
  if (options.allowLegacyFallback === false) return null;
  const fallbackNode = getGlobalNodeById(nodeId) || getNodeById(nodeId);
  if (!hasFiniteGraphPosRecord(fallbackNode)) return null;
  return {
    x: fallbackNode.graphPos.x,
    y: fallbackNode.graphPos.y
  };
}

function setWorkspaceNodePos(workspaceId, nodeId, pos) {
  if (!workspaceId || !nodeId) return false;
  const workspaceRecord = workspaceById.get(workspaceId) || null;
  if (!workspaceRecord) return false;
  const normalizedPos = normalizeWorkspaceNodePosRecord(pos);
  if (!normalizedPos) return false;
  const runtimeRecord = getWorkspaceRuntimeNodePositionsRecord(workspaceRecord, true);
  if (!runtimeRecord) return false;
  const existingPos = normalizeWorkspaceNodePosRecord(runtimeRecord[nodeId]);
  if (
    existingPos &&
    Math.abs(existingPos.x - normalizedPos.x) < 0.01 &&
    Math.abs(existingPos.y - normalizedPos.y) < 0.01
  ) {
    return false;
  }
  runtimeRecord[nodeId] = {
    x: normalizedPos.x,
    y: normalizedPos.y
  };
  return true;
}

function applyWorkspaceNodePositions(workspaceRecord, options = {}) {
  if (!workspaceRecord) return false;
  const sourceNodeIds = Array.isArray(options.nodeIds)
    ? options.nodeIds
    : (options.nodeIds instanceof Set ? [...options.nodeIds] : (Array.isArray(workspaceRecord.nodeIds) ? workspaceRecord.nodeIds : []));
  let applied = false;
  sourceNodeIds.forEach((nodeId) => {
    if (!nodeId) return;
    const node = getGlobalNodeById(nodeId) || getNodeById(nodeId);
    if (!node) return;
    const workspacePos = getWorkspaceNodePos(workspaceRecord.id, nodeId, {
      allowLegacyFallback: options.allowLegacyFallback !== false
    });
    if (!workspacePos) return;
    if (
      hasFiniteGraphPosRecord(node) &&
      Math.abs(node.graphPos.x - workspacePos.x) < 0.01 &&
      Math.abs(node.graphPos.y - workspacePos.y) < 0.01
    ) {
      return;
    }
    node.graphPos = { x: workspacePos.x, y: workspacePos.y };
    applied = true;
  });
  return applied;
}

function persistWorkspaceNodePositions(workspaceRecord, nodeIds, options = {}) {
  if (!workspaceRecord || !workspaceRecord.id) return false;
  const normalizedNodeIds = [...new Set(
    (Array.isArray(nodeIds)
      ? nodeIds
      : (nodeIds instanceof Set ? [...nodeIds] : Array.isArray(workspaceRecord.nodeIds) ? workspaceRecord.nodeIds : [])
    ).filter((nodeId) => typeof nodeId === "string" && nodeId)
  )];
  if (!normalizedNodeIds.length) return false;
  let changed = false;
  normalizedNodeIds.forEach((nodeId) => {
    const node = getGlobalNodeById(nodeId) || getNodeById(nodeId);
    if (!hasFiniteGraphPosRecord(node)) return;
    if (setWorkspaceNodePos(workspaceRecord.id, nodeId, node.graphPos)) {
      changed = true;
    }
  });
  if (!changed) return false;
  if (options.syncWorkspace !== false) {
    syncWorkspaceRuntimeAndStore();
  }
  if (options.persist === true) {
    persistStoreToLocalStorage();
  }
  return true;
}

function setWorkspaceRuntimeNodePositions(workspaceRecord, nodeIds) {
  return persistWorkspaceNodePositions(workspaceRecord, nodeIds, {
    syncWorkspace: false,
    persist: false
  });
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

function getCollabAutoChainMetaRecord(workspaceRecord, create = false) {
  if (!workspaceRecord) return null;
  const workspaceMeta = ensureWorkspaceMetaRecord(workspaceRecord);
  const currentValue = workspaceMeta[COLLAB_AUTO_CHAIN_META_KEY];
  if (!currentValue || typeof currentValue !== "object") {
    if (!create) return null;
    workspaceMeta[COLLAB_AUTO_CHAIN_META_KEY] = {
      version: COLLAB_AUTO_CHAIN_SCHEMA_VERSION,
      edgeSignatures: [],
      [COLLAB_AUTO_CHAIN_HELPER_NODE_IDS_KEY]: []
    };
    return workspaceMeta[COLLAB_AUTO_CHAIN_META_KEY];
  }
  if (create) {
    if (!Array.isArray(currentValue.edgeSignatures)) {
      currentValue.edgeSignatures = [];
    }
    if (!Array.isArray(currentValue[COLLAB_AUTO_CHAIN_HELPER_NODE_IDS_KEY])) {
      currentValue[COLLAB_AUTO_CHAIN_HELPER_NODE_IDS_KEY] = [];
    }
    if (currentValue.version !== COLLAB_AUTO_CHAIN_SCHEMA_VERSION) {
      currentValue.version = COLLAB_AUTO_CHAIN_SCHEMA_VERSION;
    }
  }
  return currentValue;
}

function getCollabAutoChainEdgeSignatureSet(workspaceRecord) {
  const record = getCollabAutoChainMetaRecord(workspaceRecord, false);
  const signatures = Array.isArray(record?.edgeSignatures) ? record.edgeSignatures : [];
  return new Set(signatures.filter((signature) => typeof signature === "string" && signature));
}

function setCollabAutoChainEdgeSignatures(workspaceRecord, nextSignatures) {
  const record = getCollabAutoChainMetaRecord(workspaceRecord, true);
  if (!record) return false;
  const normalized = [...new Set(
    (Array.isArray(nextSignatures) ? nextSignatures : [])
      .filter((signature) => typeof signature === "string" && signature)
  )].sort((left, right) => left.localeCompare(right));
  const previous = Array.isArray(record.edgeSignatures)
    ? [...record.edgeSignatures]
      .filter((signature) => typeof signature === "string" && signature)
      .sort((left, right) => left.localeCompare(right))
    : [];
  const changed = JSON.stringify(previous) !== JSON.stringify(normalized) ||
    record.version !== COLLAB_AUTO_CHAIN_SCHEMA_VERSION;
  if (!changed) return false;
  record.version = COLLAB_AUTO_CHAIN_SCHEMA_VERSION;
  record.edgeSignatures = normalized;
  return true;
}

function getCollabAutoChainHelperNodeIdSet(workspaceRecord) {
  const record = getCollabAutoChainMetaRecord(workspaceRecord, false);
  const helperNodeIds = Array.isArray(record?.[COLLAB_AUTO_CHAIN_HELPER_NODE_IDS_KEY])
    ? record[COLLAB_AUTO_CHAIN_HELPER_NODE_IDS_KEY]
    : [];
  return new Set(helperNodeIds.filter((nodeId) => typeof nodeId === "string" && nodeId));
}

function setCollabAutoChainHelperNodeIds(workspaceRecord, nextNodeIds) {
  const record = getCollabAutoChainMetaRecord(workspaceRecord, true);
  if (!record) return false;
  const normalized = [...new Set(
    (Array.isArray(nextNodeIds) ? nextNodeIds : [])
      .filter((nodeId) => typeof nodeId === "string" && nodeId)
  )].sort((left, right) => left.localeCompare(right));
  const previous = Array.isArray(record[COLLAB_AUTO_CHAIN_HELPER_NODE_IDS_KEY])
    ? [...record[COLLAB_AUTO_CHAIN_HELPER_NODE_IDS_KEY]]
      .filter((nodeId) => typeof nodeId === "string" && nodeId)
      .sort((left, right) => left.localeCompare(right))
    : [];
  const changed = JSON.stringify(previous) !== JSON.stringify(normalized) ||
    record.version !== COLLAB_AUTO_CHAIN_SCHEMA_VERSION;
  if (!changed) return false;
  record.version = COLLAB_AUTO_CHAIN_SCHEMA_VERSION;
  record[COLLAB_AUTO_CHAIN_HELPER_NODE_IDS_KEY] = normalized;
  return true;
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

function isProjectedHandoverHiddenInWorkspace(workspaceRecord, handoverId) {
  const handoverViewRecord = getWorkspaceHandoverViewRecord(workspaceRecord, handoverId, false);
  return !!handoverViewRecord?.hiddenProjected;
}

function setProjectedHandoverHiddenInWorkspace(workspaceRecord, handoverId, hidden = true) {
  if (!workspaceRecord || !handoverId) return false;
  const handoverViewRecord = getWorkspaceHandoverViewRecord(workspaceRecord, handoverId, true);
  if (!handoverViewRecord) return false;
  if (hidden) {
    if (handoverViewRecord.hiddenProjected) return false;
    handoverViewRecord.hiddenProjected = true;
    return true;
  }
  if (!handoverViewRecord.hiddenProjected) return false;
  delete handoverViewRecord.hiddenProjected;
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

function isProjectedHandoverNodeInWorkspace(workspaceRecord, node) {
  if (!workspaceRecord || normalizeWorkspaceKind(workspaceRecord.kind) !== "collab" || !node || node.type !== "handover") {
    return false;
  }
  const projectionMeta = getCurrentProjectionNodeMeta(node.id);
  return !!projectionMeta?.roles?.includes("projected-handover");
}

function hideProjectedHandoverInWorkspace(workspaceRecord, handoverId) {
  if (!workspaceRecord || normalizeWorkspaceKind(workspaceRecord.kind) !== "collab" || !handoverId) return false;
  if (!setProjectedHandoverHiddenInWorkspace(workspaceRecord, handoverId, true)) return false;
  syncWorkspaceRuntimeAndStore();
  invalidateActiveWorkspaceView({ autoFit: "preserve", clearAppliedWorkspaceId: true });
  persistStoreToLocalStorage();
  return true;
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
  const anchorChanged = previousAnchorId !== node.id;
  if (anchorChanged) {
    refreshAllHandoverDerivedState();
  }
  syncWorkspaceRuntimeAndStore();
  invalidateActiveWorkspaceView({ autoFit: "preserve", clearAppliedWorkspaceId: true });
  persistStoreToLocalStorage();
  return true;
}

function clearCurrentWorkspaceAnchorNode() {
  const workspaceRecord = getCurrentWorkspaceRecord();
  if (!workspaceRecord || normalizeWorkspaceKind(workspaceRecord.kind) === "collab" || !workspaceRecord.homeNodeId) return false;
  workspaceRecord.homeNodeId = null;
  refreshAllHandoverDerivedState();
  syncWorkspaceRuntimeAndStore();
  invalidateActiveWorkspaceView({ autoFit: "preserve", clearAppliedWorkspaceId: true });
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
  invalidateActiveWorkspaceView({ autoFit: "preserve", clearAppliedWorkspaceId: true });
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

function hasFiniteGraphPosRecord(node) {
  return !!node &&
    !!node.graphPos &&
    Number.isFinite(node.graphPos.x) &&
    Number.isFinite(node.graphPos.y);
}

function getNodePlacementCollisionRadius(node) {
  if (!node) return 72;
  const radius = getNodeOccupiedCollisionRadius(node, null);
  if (Number.isFinite(radius) && radius > 0) return radius;
  const occupiedSize = getNodeOccupiedSize(node, null);
  const fallback = 0.5 * Math.max(occupiedSize.width || 0, occupiedSize.height || 0);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 72;
}

function buildNodeIdSeed(nodeId) {
  let seed = 0;
  const text = String(nodeId || "");
  for (let i = 0; i < text.length; i += 1) {
    seed = (seed * 31 + text.charCodeAt(i)) >>> 0;
  }
  return seed;
}

function resolveNonOverlappingGraphPos(basePos, collisionRadius, occupiedEntries, nodeIdForSeed = "") {
  const baseX = Number.isFinite(basePos?.x) ? basePos.x : 0;
  const baseY = Number.isFinite(basePos?.y) ? basePos.y : 0;
  const nextRadius = Number.isFinite(collisionRadius) && collisionRadius > 0 ? collisionRadius : 72;
  const spacing = Math.max(22, Math.round(nextRadius * 0.28));
  const requiredGap = (entryRadius) => Math.max(24, nextRadius + entryRadius + spacing);
  const isFree = (candidateX, candidateY) => occupiedEntries.every((entry) => {
    const minDist = requiredGap(entry.radius);
    const dx = candidateX - entry.x;
    const dy = candidateY - entry.y;
    return ((dx * dx) + (dy * dy)) >= (minDist * minDist);
  });

  if (isFree(baseX, baseY)) {
    return { x: baseX, y: baseY };
  }

  const seed = buildNodeIdSeed(nodeIdForSeed);
  const angleOffset = (seed % 360) * (Math.PI / 180);
  const ringStep = Math.max(72, Math.round(nextRadius * 0.8));
  const maxRingCount = 14;
  for (let ring = 1; ring <= maxRingCount; ring += 1) {
    const distance = ring * ringStep;
    const slotCount = Math.max(10, Math.round((Math.PI * 2 * distance) / Math.max(40, nextRadius * 1.2)));
    for (let slot = 0; slot < slotCount; slot += 1) {
      const angle = angleOffset + ((Math.PI * 2 * slot) / slotCount);
      const candidateX = baseX + (Math.cos(angle) * distance);
      const candidateY = baseY + (Math.sin(angle) * distance);
      if (isFree(candidateX, candidateY)) {
        return { x: candidateX, y: candidateY };
      }
    }
  }

  const fallbackDistance = ringStep * (maxRingCount + 1);
  return {
    x: baseX + (Math.cos(angleOffset) * fallbackDistance),
    y: baseY + (Math.sin(angleOffset) * fallbackDistance)
  };
}

function collectWorkspacePositionedEntries(workspaceRecord, options = {}) {
  const excludedNodeIds = options.excludedNodeIds instanceof Set
    ? options.excludedNodeIds
    : new Set(Array.isArray(options.excludedNodeIds) ? options.excludedNodeIds : []);
  const scopedNodeIds = Array.isArray(workspaceRecord?.nodeIds) ? workspaceRecord.nodeIds : [];
  return scopedNodeIds
    .filter((nodeId) => !excludedNodeIds.has(nodeId))
    .map((nodeId) => {
      const node = getGlobalNodeById(nodeId);
      const pos = getWorkspaceNodePos(workspaceRecord.id, nodeId, { allowLegacyFallback: true });
      return node && pos
        ? {
          id: node.id,
          x: pos.x,
          y: pos.y,
          radius: getNodePlacementCollisionRadius(node)
        }
        : null;
    })
    .filter(Boolean);
}

function getWorkspaceAnchorNodeRecord(workspaceRecord) {
  if (!workspaceRecord) return null;
  const anchorId = normalizeWorkspaceKind(workspaceRecord.kind) === "collab"
    ? buildCollaborationAnchorId(workspaceRecord.id)
    : workspaceRecord.homeNodeId;
  if (!anchorId) return null;
  return getGlobalNodeById(anchorId) || getNodeById(anchorId) || null;
}

function getSuggestedEntityGraphPos(workspaceRecord, handoverNode, entityKind, refId) {
  const excludedNodeIds = new Set();
  const occupied = collectWorkspacePositionedEntries(workspaceRecord, { excludedNodeIds });
  const anchorNode = getWorkspaceAnchorNodeRecord(workspaceRecord);
  const anchorWorkspacePos = anchorNode ? getWorkspaceNodePos(workspaceRecord.id, anchorNode.id, { allowLegacyFallback: true }) : null;
  const handoverWorkspacePos = handoverNode ? getWorkspaceNodePos(workspaceRecord.id, handoverNode.id, { allowLegacyFallback: true }) : null;
  const anchorPos = anchorWorkspacePos || getDefaultCollaborationGraphPos(workspaceRecord);
  const handoverPos = handoverWorkspacePos || anchorPos;
  let basePos = {
    x: (anchorPos.x + handoverPos.x) / 2,
    y: (anchorPos.y + handoverPos.y) / 2
  };

  if (entityKind === "user") {
    const ownerOrgId = userById.get(refId || "")?.orgId || null;
    const orgNode = ownerOrgId ? getEntityNodeByRefInWorkspace(workspaceRecord, "org", ownerOrgId) : null;
    const orgPos = orgNode ? getWorkspaceNodePos(workspaceRecord.id, orgNode.id, { allowLegacyFallback: true }) : null;
    if (orgPos) {
      basePos = {
        x: (orgPos.x + handoverPos.x) / 2,
        y: (orgPos.y + handoverPos.y) / 2
      };
    } else {
      basePos = {
        x: handoverPos.x + ((handoverPos.x >= anchorPos.x) ? -120 : 120),
        y: handoverPos.y
      };
    }
  }

  const probeNode = {
    id: `placement-probe-${entityKind}-${refId}`,
    type: "entity",
    entityKind,
    entityRefId: refId
  };
  const radius = getNodePlacementCollisionRadius(probeNode);
  return resolveNonOverlappingGraphPos(basePos, radius, occupied, probeNode.id);
}

function createWorkspaceEntityNode(workspaceRecord, handoverNode, entityKind, refId) {
  if (!workspaceRecord || !handoverNode || !entityKind || !refId) return null;
  const existingNode = getEntityNodeByRefInWorkspace(workspaceRecord, entityKind, refId);
  if (existingNode) return existingNode;
  const ownerRecord = handoverNode.ownerId ? userById.get(handoverNode.ownerId) : null;
  const suggestedPos = getSuggestedEntityGraphPos(workspaceRecord, handoverNode, entityKind, refId);
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
      x: suggestedPos.x,
      y: suggestedPos.y
    }
  };
  allNodesRuntime.push(nextNode);
  ensureWorkspaceNodeMembership(workspaceRecord, nextNode.id);
  setWorkspaceNodePos(workspaceRecord.id, nextNode.id, nextNode.graphPos);
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

  // Project workspace sync deliberately ignores handover context/anchor chain edges.
  // Context is derived from origin workspace and only drives edge orchestration in collaboration workspaces.

  const graphContextNode = getHandoverGraphContextNode(handoverNode);
  getHandoverObjects(handoverNode).forEach((handoverObject) => {
    const objectNode = getAnyNodeById(handoverObject.id);
    if (!objectNode) return;
    if (graphContextNode && objectNode.id === graphContextNode.id) return;
    const direction = getDefaultHandoverObjectEdgeDirection(handoverObject.role);
    const sourceId = direction === "object_to_handover" ? objectNode.id : handoverNode.id;
    const targetId = direction === "object_to_handover" ? handoverNode.id : objectNode.id;
    if (ensureWorkspaceEdgeLink(workspaceRecord, sourceId, targetId)) {
      changedWorkspaceData = true;
    }
  });

  return { changedNodeData, changedWorkspaceData };
}

function getCollabWorkspaceRecordForHandover(handoverNode) {
  if (!handoverNode || handoverNode.type !== "handover") return null;
  return workspaces.find((workspace) =>
    normalizeWorkspaceKind(workspace.kind) === "collab" &&
    Array.isArray(workspace.nodeIds) &&
    workspace.nodeIds.includes(handoverNode.id)
  ) || null;
}

function getCollabChainEdgeSignature(sourceId, targetId) {
  return `${sourceId}=>${targetId}`;
}

function getCollabOnlyHandoversInWorkspace(workspaceRecord) {
  if (!workspaceRecord || normalizeWorkspaceKind(workspaceRecord.kind) !== "collab" || !Array.isArray(workspaceRecord.nodeIds)) {
    return [];
  }
  return workspaceRecord.nodeIds
    .map((nodeId) => getAnyNodeById(nodeId))
    .filter((node) => node?.type === "handover" && isCollabWorkspaceOnlyHandover(node));
}

function reconcileCollabWorkspaceAutoChains(workspaceRecord) {
  if (!workspaceRecord || normalizeWorkspaceKind(workspaceRecord.kind) !== "collab") return false;
  const anchorNode = getGlobalNodeById(buildCollaborationAnchorId(workspaceRecord.id));
  if (!anchorNode) return false;

  let changed = false;
  const handoverNodes = getCollabOnlyHandoversInWorkspace(workspaceRecord);
  const handoverIdSet = new Set(handoverNodes.map((node) => node.id));
  const previousManagedSignatures = getCollabAutoChainEdgeSignatureSet(workspaceRecord);
  const previousManagedHelperNodeIds = getCollabAutoChainHelperNodeIdSet(workspaceRecord);
  if (!previousManagedHelperNodeIds.size && previousManagedSignatures.size) {
    const workspaceEdgeIds = Array.isArray(workspaceRecord.edgeIds) ? workspaceRecord.edgeIds : [];
    workspaceEdgeIds.forEach((edgeId) => {
      const edge = getWorkspaceAuthoredEdgeRecord(workspaceRecord, edgeId);
      if (!edge) return;
      const signature = getCollabChainEdgeSignature(edge.sourceId, edge.targetId);
      if (!previousManagedSignatures.has(signature)) return;
      const sourceNode = getGlobalNodeById(edge.sourceId);
      const targetNode = getGlobalNodeById(edge.targetId);
      if (sourceNode?.type === "entity") {
        previousManagedHelperNodeIds.add(sourceNode.id);
      }
      if (targetNode?.type === "entity") {
        previousManagedHelperNodeIds.add(targetNode.id);
      }
    });
  }
  const nextManagedSignatures = new Set();
  const nextManagedHelperNodeIds = new Set();
  const requiredEdges = new Map();
  const orgNodeByRefId = new Map();
  const userNodeByRefId = new Map();
  const defaultHandoverNode = handoverNodes[0] || null;

  const requireEdge = (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const signature = getCollabChainEdgeSignature(sourceId, targetId);
    requiredEdges.set(signature, { sourceId, targetId });
    nextManagedSignatures.add(signature);
  };

  const trackManagedHelperNode = (node, wasExisting = false) => {
    if (!node || node.type !== "entity") return;
    if (!wasExisting || previousManagedHelperNodeIds.has(node.id)) {
      nextManagedHelperNodeIds.add(node.id);
    }
  };

  const ensureOrgNode = (orgId, handoverNodeForOwner = defaultHandoverNode) => {
    if (!orgId || !handoverNodeForOwner) return null;
    if (orgNodeByRefId.has(orgId)) return orgNodeByRefId.get(orgId);
    const existingNode = getEntityNodeByRefInWorkspace(workspaceRecord, "org", orgId);
    const orgNode = existingNode || createWorkspaceEntityNode(workspaceRecord, handoverNodeForOwner, "org", orgId);
    trackManagedHelperNode(orgNode, !!existingNode);
    orgNodeByRefId.set(orgId, orgNode || null);
    return orgNode;
  };

  const ensureUserNode = (userId, handoverNodeForOwner = defaultHandoverNode) => {
    if (!userId || !handoverNodeForOwner) return null;
    if (userNodeByRefId.has(userId)) return userNodeByRefId.get(userId);
    const existingNode = getEntityNodeByRefInWorkspace(workspaceRecord, "user", userId);
    const userNode = existingNode || createWorkspaceEntityNode(workspaceRecord, handoverNodeForOwner, "user", userId);
    trackManagedHelperNode(userNode, !!existingNode);
    userNodeByRefId.set(userId, userNode || null);
    return userNode;
  };

  handoverNodes.forEach((handoverNode) => {
    const contextNode = getHandoverGraphContextNode(handoverNode);
    if (contextNode && contextNode.id !== handoverNode.id) {
      const hasContextMembership = Array.isArray(workspaceRecord.nodeIds) && workspaceRecord.nodeIds.includes(contextNode.id);
      ensureWorkspaceNodeMembership(workspaceRecord, contextNode.id);
      if (!hasContextMembership) {
        changed = true;
      }
    }

    const normalizedCollaborators = (Array.isArray(handoverNode.handoverCollaborators) ? handoverNode.handoverCollaborators : [])
      .map((rawCollaborator) => normalizeHandoverCollaboratorEntry(rawCollaborator))
      .filter((collaborator) => !!collaborator);

    normalizedCollaborators.forEach((collaborator) => {
      if (collaborator.kind === "org") {
        const orgNode = ensureOrgNode(collaborator.refId, handoverNode);
        if (!orgNode) return;
        requireEdge(anchorNode.id, orgNode.id);
        requireEdge(orgNode.id, handoverNode.id);
        return;
      }
      if (collaborator.kind !== "user") return;
      const userRecord = userById.get(collaborator.refId) || null;
      const userNode = ensureUserNode(collaborator.refId, handoverNode);
      if (!userNode) return;
      requireEdge(userNode.id, handoverNode.id);
      if (userRecord?.orgId) {
        const orgNode = ensureOrgNode(userRecord.orgId, handoverNode);
        if (orgNode) {
          requireEdge(anchorNode.id, orgNode.id);
          requireEdge(orgNode.id, userNode.id);
          return;
        }
      }
      requireEdge(anchorNode.id, userNode.id);
    });
  });

  requiredEdges.forEach(({ sourceId, targetId }) => {
    if (ensureWorkspaceEdgeLink(workspaceRecord, sourceId, targetId)) {
      changed = true;
    }
  });

  const snapshotEdges = Array.isArray(workspaceRecord.edgeIds)
    ? workspaceRecord.edgeIds
      .map((edgeId) => getWorkspaceAuthoredEdgeRecord(workspaceRecord, edgeId))
      .filter((edge) => !!edge)
    : [];

  const isLegacyBadManagedPattern = (edge) => {
    if (!edge) return false;
    const sourceNode = getGlobalNodeById(edge.sourceId);
    const targetNode = getGlobalNodeById(edge.targetId);
    if (!sourceNode || !targetNode) return false;
    if (sourceNode.type === "entity" && edge.targetId === anchorNode.id) {
      return true;
    }
    if (edge.sourceId === anchorNode.id && handoverIdSet.has(edge.targetId)) {
      return true;
    }
    return false;
  };

  snapshotEdges.forEach((edge) => {
    const signature = getCollabChainEdgeSignature(edge.sourceId, edge.targetId);
    const isManagedCandidate = previousManagedSignatures.has(signature) || isLegacyBadManagedPattern(edge);
    if (!isManagedCandidate) return;
    if (requiredEdges.has(signature)) return;
    if (removeWorkspaceEdgeLink(workspaceRecord, edge.sourceId, edge.targetId)) {
      changed = true;
    }
  });

  const staleManagedHelperNodeIds = [...previousManagedHelperNodeIds].filter((nodeId) => !nextManagedHelperNodeIds.has(nodeId));
  staleManagedHelperNodeIds.forEach((nodeId) => {
    if (!Array.isArray(workspaceRecord.nodeIds) || !workspaceRecord.nodeIds.includes(nodeId)) return;
    const helperNode = getGlobalNodeById(nodeId);
    if (!helperNode || helperNode.type !== "entity") return;
    const connectedEdges = getWorkspaceConnectedAuthoredEdges(workspaceRecord, nodeId);
    const hasManualConnectedEdge = connectedEdges.some((edge) => {
      const signature = getCollabChainEdgeSignature(edge.sourceId, edge.targetId);
      return !nextManagedSignatures.has(signature) && !previousManagedSignatures.has(signature);
    });
    if (hasManualConnectedEdge) return;
    connectedEdges.forEach((edge) => {
      if (removeWorkspaceEdgeLink(workspaceRecord, edge.sourceId, edge.targetId)) {
        changed = true;
      }
    });
    workspaceRecord.nodeIds = workspaceRecord.nodeIds.filter((candidateNodeId) => candidateNodeId !== nodeId);
    const hasRemainingMembership = workspaces.some((workspace) =>
      Array.isArray(workspace.nodeIds) && workspace.nodeIds.includes(nodeId)
    );
    if (!hasRemainingMembership) {
      allNodesRuntime = allNodesRuntime.filter((node) => node.id !== nodeId);
      allEdgesRuntime = allEdgesRuntime.filter((edge) => edge.sourceId !== nodeId && edge.targetId !== nodeId);
    }
    changed = true;
  });

  if (setCollabAutoChainEdgeSignatures(workspaceRecord, [...nextManagedSignatures])) {
    changed = true;
  }
  if (setCollabAutoChainHelperNodeIds(workspaceRecord, [...nextManagedHelperNodeIds])) {
    changed = true;
  }
  if (changed) {
    syncNodeRuntimeAndStore();
    syncEdgeRuntimeAndStore();
    syncWorkspaceRuntimeAndStore();
  }
  return changed;
}

function removeCollabWorkspaceGraphForCollaborator(handoverNode, collaborator) {
  if (!handoverNode || handoverNode.type !== "handover" || !collaborator || !isCollabWorkspaceOnlyHandover(handoverNode)) {
    return false;
  }
  const workspaceRecord = getCollabWorkspaceRecordForHandover(handoverNode);
  if (!workspaceRecord) return false;
  return reconcileCollabWorkspaceAutoChains(workspaceRecord);
}

function syncCollabWorkspaceGraphForCollaborator(handoverNode, collaborator) {
  if (!handoverNode || handoverNode.type !== "handover" || !collaborator || !isCollabWorkspaceOnlyHandover(handoverNode)) {
    return false;
  }
  const normalizedCollaborator = normalizeHandoverCollaboratorEntry(collaborator);
  if (!normalizedCollaborator) return false;
  const workspaceRecord = getCollabWorkspaceRecordForHandover(handoverNode);
  if (!workspaceRecord) return false;
  return reconcileCollabWorkspaceAutoChains(workspaceRecord);
}

function syncCollabWorkspaceGraphForAllCollaborators(handoverNode) {
  if (!isCollabWorkspaceOnlyHandover(handoverNode)) return false;
  const workspaceRecord = getCollabWorkspaceRecordForHandover(handoverNode);
  if (!workspaceRecord) return false;
  return reconcileCollabWorkspaceAutoChains(workspaceRecord);
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
  const nextRole = "reference";
  const existingObject = getHandoverObjects(handoverNode).find((handoverObject) => handoverObject.id === objectNode.id) || null;
  if (existingObject) {
    if (existingObject.role !== nextRole) {
      handoverNode.handoverObjects = getHandoverObjects(handoverNode).map((handoverObject) => {
        if (handoverObject.id !== objectNode.id) return handoverObject;
        return {
          ...handoverObject,
          role: nextRole
        };
      });
      changed = true;
    }
  } else if (addHandoverObjectIdEntry(handoverNode, objectNode.id, nextRole)) {
    changed = true;
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

function getDirectUserHandoverCollaboratorAccess(node) {
  if (!node || node.type !== "handover") return new Map();
  const accessByUserId = new Map();
  const rawCollaborators = Array.isArray(node.handoverCollaborators) ? node.handoverCollaborators : [];
  rawCollaborators.forEach((rawCollaborator) => {
    const collaborator = normalizeHandoverCollaboratorEntry(rawCollaborator);
    if (!collaborator || collaborator.kind !== "user") return;
    if (!userById.has(collaborator.refId) || collaborator.refId === node.ownerId || isAdminUserId(collaborator.refId)) return;
    const currentAccess = accessByUserId.get(collaborator.refId) || { shareWorkspace: false };
    accessByUserId.set(collaborator.refId, {
      shareWorkspace: currentAccess.shareWorkspace || !!collaborator.shareWorkspace
    });
  });
  return accessByUserId;
}

function getDirectUserCollaboratorEntryForNode(node, userId = currentUserId) {
  if (!node || node.type !== "handover" || !userId) return null;
  const rawCollaborators = Array.isArray(node.handoverCollaborators) ? node.handoverCollaborators : [];
  return rawCollaborators
    .map((rawCollaborator) => normalizeHandoverCollaboratorEntry(rawCollaborator))
    .find((collaborator) => collaborator?.kind === "user" && collaborator.refId === userId) || null;
}

function createProjectionEntityNode(workspaceRecord, sourceNode, entityKind, entityRefId, artifactRole = entityKind) {
  const entityNodeId = buildProjectionNodeId(workspaceRecord.id, artifactRole, entityRefId);
  const ownerRecord = sourceNode?.ownerId ? userById.get(sourceNode.ownerId) : null;
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
    graphPos: null,
    meta: {
      [HANDOVER_PROJECTION_META_KEY]: {
        autoManaged: true,
        workspaceOwnerId: workspaceRecord.ownerId || null,
        artifactRole
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
      if (isProjectedHandoverHiddenInWorkspace(workspaceRecord, handoverNode.id)) return;
      const sourceWorkspaceId = getSourceWorkspaceIdForHandover(handoverNode);
      const sourceWorkspace = sourceWorkspaceId ? workspaceById.get(sourceWorkspaceId) || null : null;
      if (!sourceWorkspace) return;
      const collaboratorAccess = getDirectUserHandoverCollaboratorAccess(handoverNode);
      if (normalizeWorkspaceKind(sourceWorkspace.kind) === "collab") {
        if (viewerUserId === handoverNode.ownerId) return;
        if (normalizeHandoverStatus(handoverNode.status) === "Draft") return;
        const accessRecord = collaboratorAccess.get(viewerUserId);
        if (!accessRecord) return;
        const removalEntry = getCollaboratorRemovalEntryForUser(handoverNode, viewerUserId);
        projectionSpecs.push({
          handoverNode,
          leadUserId: handoverNode.ownerId,
          removeCollaborator: removalEntry
        });
        return;
      }
      if (viewerUserId === handoverNode.ownerId) {
        if (!collaboratorAccess.size) return;
        collaboratorAccess.forEach((_, collaboratorUserId) => {
          const removalEntry = getCollaboratorRemovalEntryForUser(handoverNode, collaboratorUserId);
          projectionSpecs.push({
            handoverNode,
            leadUserId: collaboratorUserId,
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
        removeCollaborator: removalEntry
      });
    });
  return projectionSpecs;
}

function getAccessibleWorkspaceIdSetForCurrentUser() {
  return new Set(getWorkspaceOptionsForCurrentUser().map((workspace) => workspace.id));
}

function getHandoverPortalBadgeLink(node, workspaceRecord = getCurrentWorkspaceRecord(), viewerUserId = currentUserId, accessibleWorkspaceIds = null) {
  if (!node || node.type !== "handover") return null;
  if (!workspaceRecord || !viewerUserId || isAdminUserId(viewerUserId)) return null;
  const sourceWorkspaceId = getSourceWorkspaceIdForHandover(node);
  if (!sourceWorkspaceId) return null;
  const sourceWorkspace = workspaceById.get(sourceWorkspaceId) || null;
  if (!sourceWorkspace) return null;
  if (normalizeWorkspaceKind(sourceWorkspace.kind) === "collab") return null;

  const visibleWorkspaceIds = accessibleWorkspaceIds instanceof Set
    ? accessibleWorkspaceIds
    : getAccessibleWorkspaceIdSetForCurrentUser();
  const canOpenWorkspace = (workspaceId) =>
    typeof workspaceId === "string" &&
    workspaceId &&
    workspaceId !== workspaceRecord.id &&
    visibleWorkspaceIds.has(workspaceId);

  const isOwner = viewerUserId === node.ownerId;
  const isDraft = normalizeHandoverStatus(node.status) === "Draft";
  const collaboratorAccess = getDirectUserHandoverCollaboratorAccess(node);
  const accessRecord = collaboratorAccess.get(viewerUserId) || null;
  const hasSharedAccess = !!accessRecord?.shareWorkspace;

  if (normalizeWorkspaceKind(workspaceRecord.kind) === "collab") {
    if (isOwner) {
      if (!collaboratorAccess.size) return null;
    } else {
      if (isDraft || !hasSharedAccess) return null;
    }
    if (!canOpenWorkspace(sourceWorkspaceId)) return null;
    return {
      targetWorkspaceId: sourceWorkspaceId,
      targetLabel: sourceWorkspace.name || sourceWorkspace.id,
      direction: "to-source-workspace"
    };
  }

  if (workspaceRecord.id !== sourceWorkspaceId) return null;
  if (isOwner) {
    if (!collaboratorAccess.size) return null;
  } else {
    if (isDraft || !hasSharedAccess) return null;
  }

  const viewerCollabWorkspace = getCollaborationWorkspaceRecordForUser(viewerUserId);
  const targetWorkspaceId = viewerCollabWorkspace?.id || null;
  if (!canOpenWorkspace(targetWorkspaceId)) return null;
  return {
    targetWorkspaceId,
    targetLabel: viewerCollabWorkspace?.name || targetWorkspaceId,
    direction: "to-collaboration-workspace"
  };
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
  const addedCollaborationChainEdgePairs = new Set();
  const chainTailIdBySignature = new Map();

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

  const buildChainSignature = (orgId, userId) => {
    const parts = [];
    if (orgId) parts.push(`org:${orgId}`);
    if (userId) parts.push(`user:${userId}`);
    return parts.join("|") || "anchor";
  };

  const registerCollaborationChainEdge = (handoverNode, sourceId, targetId) => {
    if (!handoverNode || !sourceId || !targetId || sourceId === targetId) return;
    const pairKey = `${sourceId}->${targetId}`;
    if (addedCollaborationChainEdgePairs.has(pairKey)) return;
    const edgeRecord = ensureProjectionEdge(workspaceRecord, handoverNode, sourceId, targetId);
    if (!edgeRecord) return;
    registerEdge(edgeRecord, {
      artifactRole: "collaboration-chain",
      sourceHandoverId: handoverNode.id
    });
    addedCollaborationChainEdgePairs.add(pairKey);
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
    const contextNode = getHandoverGraphContextNode(handoverNode);
    const chainSignature = buildChainSignature(leadOrgId, spec.leadUserId || "");
    let chainTargetId = chainTailIdBySignature.get(chainSignature) || anchorId;

    if (leadOrgNode) {
      registerNode(leadOrgNode, {
        roles: ["projected-helper-entity"],
        handoverIds: [handoverNode.id],
        collaboratorKinds: ["org"],
        collaboratorRefIds: [leadOrgId]
      });
      registerCollaborationChainEdge(handoverNode, anchorId, leadOrgNode.id);
      chainTargetId = leadOrgNode.id;
    }

    if (leadUserNode) {
      registerNode(leadUserNode, {
        roles: ["projected-helper-entity"],
        handoverIds: [handoverNode.id],
        collaboratorKinds: ["user"],
        collaboratorRefIds: [spec.leadUserId]
      });
      registerCollaborationChainEdge(
        handoverNode,
        leadOrgNode ? leadOrgNode.id : anchorId,
        leadUserNode.id
      );
      chainTargetId = leadUserNode.id;
    }

    chainTailIdBySignature.set(chainSignature, chainTargetId);

    if (!workspaceHasAuthoredEdgeBetweenNodes(workspaceRecord, chainTargetId, handoverNode.id)) {
      registerEdge(
        {
          ...ensureProjectionEdge(workspaceRecord, handoverNode, chainTargetId, handoverNode.id),
          kind: inferEdgeKindForPair(
            getAnyNodeById(chainTargetId) || getNodeById(chainTargetId),
            handoverNode
          )
        },
        {
          artifactRole: "handover-collaborator-link",
          sourceHandoverId: handoverNode.id,
          collaboratorKind: spec.removeCollaborator?.kind || null,
          collaboratorRefId: spec.removeCollaborator?.refId || null
        }
      );
    }

    getHandoverObjects(handoverNode).forEach((handoverObject) => {
      if (contextNode && handoverObject.id === contextNode.id) return;
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
  const collabWorkspaceIdsForAutoChainSync = new Set(
    workspaces
      .filter((workspaceRecord) => normalizeWorkspaceKind(workspaceRecord.kind) === "collab")
      .map((workspaceRecord) => workspaceRecord.id)
  );
  allNodesRuntime
    .filter((node) => node && node.type === "handover")
    .forEach((handoverNode) => {
      const collaboratorAccess = getDirectUserHandoverCollaboratorAccess(handoverNode);
      const sourceWorkspaceId = getSourceWorkspaceIdForHandover(handoverNode);
      const sourceWorkspace = sourceWorkspaceId ? workspaceById.get(sourceWorkspaceId) || null : null;
      const isProjectSource = !!sourceWorkspace && normalizeWorkspaceKind(sourceWorkspace.kind) !== "collab";
      if (sourceWorkspace) {
        const syncResult = syncProjectWorkspaceGraphForHandover(sourceWorkspace, handoverNode);
        if (syncResult.changedNodeData || syncResult.changedWorkspaceData) {
          changed = true;
        }
      }
      if (isCollabWorkspaceOnlyHandover(handoverNode)) {
        const collabWorkspaceRecord = getCollabWorkspaceRecordForHandover(handoverNode);
        if (collabWorkspaceRecord?.id) {
          collabWorkspaceIdsForAutoChainSync.add(collabWorkspaceRecord.id);
        }
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

  collabWorkspaceIdsForAutoChainSync.forEach((workspaceId) => {
    const workspaceRecord = workspaceById.get(workspaceId) || null;
    if (!workspaceRecord) return;
    if (reconcileCollabWorkspaceAutoChains(workspaceRecord)) {
      changed = true;
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
      const collaboratorAccess = getDirectUserHandoverCollaboratorAccess(handoverNode);
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
  setWorkspaceNodePos(workspaceRecord.id, nodeId, nextNode.graphPos);

  syncWorkspaceRuntimeAndStore();
  syncNodeRuntimeAndStore();
  persistStoreToLocalStorage();

  newNodeInlineEditId = (normalizedType === "portal" || normalizedType === "entity") ? null : nodeId;
  if (isSelectableNode(nextNode)) {
    selectSingleNode(nodeId, { resetDetails: false });
  } else {
    state.selectedNodeId = null;
    state.selectedNodeIds = new Set();
    state.selectedEdgeIds = new Set();
  }
  invalidateActiveWorkspaceView({ autoFit: "preserve", clearAppliedWorkspaceId: true });
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

function getEdgeIdFromTarget(target) {
  if (!(target instanceof Element)) return null;
  const hitPath = target.closest(".edge-hit");
  if (!hitPath) return null;
  const edgeId = hitPath.dataset.edgeId || "";
  return edgeId && edgeById.has(edgeId) ? edgeId : null;
}

function closeCreateNodeMenu() {
  createNodeMenuOpen = false;
  createNodeMenuMode = "create";
  createNodeMenuNodeId = null;
  createNodeMenuEdgeId = null;
  createNodeMenuSelectionContext = null;
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
  const zoom = getCameraZoom();
  const offsetPx = EDGE_ACTION_BUTTON_OFFSET_PX * zoom;
  const anchorScreen = worldToScreen(edgeActionMenuState.anchorX, edgeActionMenuState.anchorY);
  const ax = anchorScreen.screenX;
  const ay = anchorScreen.screenY;
  edgeActionReverseBtnEl.style.left = `${ax - (ux * offsetPx)}px`;
  edgeActionReverseBtnEl.style.top = `${ay - (uy * offsetPx)}px`;
  edgeActionDeleteBtnEl.style.left = `${ax + (ux * offsetPx)}px`;
  edgeActionDeleteBtnEl.style.top = `${ay + (uy * offsetPx)}px`;
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
  const anchorScreen = worldToScreen(edgeCreateHover.anchorX, edgeCreateHover.anchorY);
  edgeCreateHandleEl.style.left = `${anchorScreen.screenX}px`;
  edgeCreateHandleEl.style.top = `${anchorScreen.screenY}px`;
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
  return screenToWorld(mx, my);
}

function getViewportPointFromClient(clientX, clientY) {
  if (!viewportEl) return null;
  const viewportRect = viewportEl.getBoundingClientRect();
  return {
    screenX: clientX - viewportRect.left,
    screenY: clientY - viewportRect.top
  };
}

function getHandoverPortalBadgeScreenMetrics(node, frame) {
  if (!node || node.type !== "handover" || !frame) return null;
  const portalLink = getHandoverPortalBadgeLink(node, getCurrentWorkspaceRecord(), currentUserId);
  if (!portalLink?.targetWorkspaceId) return null;
  const zoom = getCameraZoom();
  const screenFrame = projectRect(frame);
  const nodeCardRadiusPx = 16 * zoom;
  const badgeSizePx = HANDOVER_PORTAL_BADGE_SIZE_PX * zoom;
  const overlapPx = HANDOVER_PORTAL_BADGE_OVERLAP_RADIUS_RATIO * nodeCardRadiusPx;
  return {
    centerX: screenFrame.x + screenFrame.w + overlapPx - (badgeSizePx / 2),
    centerY: screenFrame.y - overlapPx + (badgeSizePx / 2),
    radius: badgeSizePx / 2,
    padding: HANDOVER_PORTAL_BADGE_HIT_PADDING_PX * zoom
  };
}

function isPointInHandoverPortalBadgeZone(node, frame, clientX, clientY, extraPaddingPx = null) {
  const badgeMetrics = getHandoverPortalBadgeScreenMetrics(node, frame);
  if (!badgeMetrics) return false;
  const viewportPoint = getViewportPointFromClient(clientX, clientY);
  if (!viewportPoint) return false;
  const padding = Number.isFinite(extraPaddingPx) ? extraPaddingPx : badgeMetrics.padding;
  const dx = viewportPoint.screenX - badgeMetrics.centerX;
  const dy = viewportPoint.screenY - badgeMetrics.centerY;
  const hitRadius = badgeMetrics.radius + Math.max(0, padding);
  return ((dx * dx) + (dy * dy)) <= (hitRadius * hitRadius);
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
    const visualDiamondFrame = getEntityVisualDiamondFrame(frame);
    return isPointInsideDiamond(visualDiamondFrame, worldX, worldY, diamondThresholdPx)
      && !isPointInsideDiamond(visualDiamondFrame, worldX, worldY, -diamondThresholdPx);
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

function getEntityVisualDiamondFrame(frame) {
  if (!frame) return { x: 0, y: 0, w: 0, h: 0 };
  const size = Math.max(1, Math.min(frame.w, frame.h));
  const x = frame.x + ((frame.w - size) / 2);
  const y = frame.y + ((frame.h - size) / 2);
  return { x, y, w: size, h: size };
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
    return getDiamondBorderAnchor(getEntityVisualDiamondFrame(frame), worldX, worldY);
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
    return getDiamondBorderAnchor(getEntityVisualDiamondFrame(frame), towardX, towardY);
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
  if (event.target.closest(".handover-portal-badge")) {
    return null;
  }
  if (event.target === edgeCreateHandleEl || event.target.closest("#edgeCreateHandle")) {
    if (edgeCreateHover.visible && edgeCreateHover.nodeId) {
      const hoverNode = getNodeById(edgeCreateHover.nodeId);
      const hoverFrame = lastVisibleNodeFrames.get(edgeCreateHover.nodeId);
      if (isPointInHandoverPortalBadgeZone(hoverNode, hoverFrame, event.clientX, event.clientY)) {
        return null;
      }
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
  if (isPointInHandoverPortalBadgeZone(node, frame, event.clientX, event.clientY)) {
    return null;
  }
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
  const noResult = { created: false, requiresWorkspaceReapply: false };
  const workspaceRecord = workspaceById.get(currentWorkspaceId || "");
  if (!workspaceRecord) return noResult;
  if (!sourceId || !targetId || sourceId === targetId) return noResult;
  if (!nodeById.has(sourceId) || !nodeById.has(targetId)) return noResult;
  const sourceNode = nodeById.get(sourceId);
  const targetNode = nodeById.get(targetId);
  if (!canCreateEdgeInCurrentWorkspace(sourceNode, targetNode)) return noResult;
  if (visibleEdgeExistsBetweenNodes(sourceId, targetId)) return noResult;
  const persistedSourceNode = getAnyNodeById(sourceId);
  const persistedTargetNode = getAnyNodeById(targetId);
  if (!persistedSourceNode || !persistedTargetNode) return noResult;
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
  const requiresWorkspaceReapply = collaboratorChanged || handoverObjectChanged;
  if (collaboratorChanged || handoverObjectChanged) {
    refreshAllHandoverDerivedState();
    syncNodeRuntimeAndStore();
    syncEdgeRuntimeAndStore();
    syncWorkspaceRuntimeAndStore();
  }
  persistStoreToLocalStorage();
  return { created: true, requiresWorkspaceReapply };
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
  const noResult = { deleted: false, requiresWorkspaceReapply: false };
  const workspaceRecord = workspaceById.get(currentWorkspaceId || "");
  if (!workspaceRecord || !edgeId) return noResult;
  const edgeRecord = edgeById.get(edgeId) || null;
  if (!edgeRecord) return noResult;
  const projectionMeta = getCurrentProjectionEdgeMeta(edgeId);
  if (
    projectionMeta &&
    projectionMeta.artifactRole !== "handover-object-link" &&
    projectionMeta.artifactRole !== "handover-collaborator-link"
  ) {
    return noResult;
  }
  const authoredEdge = projectionMeta ? null : getWorkspaceAuthoredEdgeRecord(workspaceRecord, edgeId);
  if (!projectionMeta && !authoredEdge) return noResult;

  const unlinkResult = applyHandoverEffectsForEdgeUnlink(workspaceRecord, edgeRecord, { projectionMeta });
  const requiresWorkspaceReapply = !!projectionMeta || unlinkResult.changedNodeData || unlinkResult.changedWorkspaceData;

  if (!projectionMeta) {
    workspaceRecord.edgeIds = workspaceRecord.edgeIds.filter((id) => id !== edgeId);
    if (countWorkspaceReferencesForEdge(edgeId) === 0) {
      allEdgesRuntime = allEdgesRuntime.filter((edge) => edge.id !== edgeId);
    }
    edges = edges.filter((edge) => edge.id !== edgeId);
    rebuildEdgeIndexes();
  }

  if (unlinkResult.changedNodeData) {
    refreshAllHandoverDerivedState();
  }
  syncEdgeRuntimeAndStore();
  syncNodeRuntimeAndStore();
  syncWorkspaceRuntimeAndStore();
  persistStoreToLocalStorage();
  return { deleted: true, requiresWorkspaceReapply };
}

function reverseEdgeInCurrentWorkspace(edgeId) {
  const noResult = { reversed: false, requiresWorkspaceReapply: false };
  const workspaceRecord = workspaceById.get(currentWorkspaceId || "");
  if (!workspaceRecord || !edgeId) return noResult;
  const visibleEdge = edgeById.get(edgeId) || null;
  if (!visibleEdge) return noResult;
  const projectionMeta = getCurrentProjectionEdgeMeta(edgeId);
  if (projectionMeta) {
    if (projectionMeta.artifactRole !== "handover-object-link") return noResult;
    const handoverId = projectionMeta.sourceHandoverId || null;
    const objectNodeId = projectionMeta.objectNodeId || null;
    if (!handoverId || !objectNodeId) return noResult;
    const nextDirection = visibleEdge.sourceId === handoverId
      ? "object_to_handover"
      : "handover_to_object";
    if (!setProjectedObjectEdgeDirection(workspaceRecord, handoverId, objectNodeId, nextDirection)) {
      return noResult;
    }
    syncWorkspaceRuntimeAndStore();
    persistStoreToLocalStorage();
    return { reversed: true, requiresWorkspaceReapply: true };
  }
  if (!Array.isArray(workspaceRecord.edgeIds) || !workspaceRecord.edgeIds.includes(edgeId)) {
    return noResult;
  }
  const edgeRecord = getWorkspaceAuthoredEdgeRecord(workspaceRecord, edgeId);
  if (!edgeRecord || !edgeRecord.sourceId || !edgeRecord.targetId) return noResult;
  const reversedSourceNode = getVisibleNodeRecord(edgeRecord.targetId);
  const reversedTargetNode = getVisibleNodeRecord(edgeRecord.sourceId);
  if (!canCreateEdgeInCurrentWorkspace(reversedSourceNode, reversedTargetNode)) return noResult;
  if (
    visibleEdgeExistsBetweenNodes(edgeRecord.targetId, edgeRecord.sourceId, { excludeEdgeId: edgeRecord.id })
  ) {
    return noResult;
  }
  const nextSourceId = edgeRecord.targetId;
  const nextTargetId = edgeRecord.sourceId;
  edgeRecord.sourceId = nextSourceId;
  edgeRecord.targetId = nextTargetId;
  edgeRecord.kind = inferEdgeKindForPair(reversedSourceNode, reversedTargetNode);
  edgeRecord.workspaceId = workspaceRecord.id;
  const visibleRuntimeEdge = edges.find((edge) => edge && edge.id === edgeId) || null;
  if (visibleRuntimeEdge) {
    visibleRuntimeEdge.sourceId = nextSourceId;
    visibleRuntimeEdge.targetId = nextTargetId;
    visibleRuntimeEdge.kind = edgeRecord.kind;
    visibleRuntimeEdge.workspaceId = workspaceRecord.id;
  }
  rebuildEdgeIndexes();

  syncEdgeRuntimeAndStore();
  syncWorkspaceRuntimeAndStore();
  persistStoreToLocalStorage();
  return { reversed: true, requiresWorkspaceReapply: false };
}

function requestEdgeDelete(edgeId) {
  if (!edgeId) return;
  const result = deleteEdgeFromCurrentWorkspace(edgeId);
  if (!result.deleted) return;
  hideEdgeActionMenu({ clearIntent: true });
  if (result.requiresWorkspaceReapply) {
    invalidateActiveWorkspaceView({ autoFit: "preserve" });
    renderAll();
    return;
  }
  renderCanvas();
}

function requestEdgeReverse(edgeId) {
  if (!edgeId) return;
  const result = reverseEdgeInCurrentWorkspace(edgeId);
  if (!result.reversed) return;
  hideEdgeActionMenu({ clearIntent: true });
  if (result.requiresWorkspaceReapply) {
    invalidateActiveWorkspaceView({ autoFit: "preserve" });
    renderAll();
    return;
  }
  renderCanvas();
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
  const edgeCreateResult = (sourceId && targetId)
    ? createEdgeInCurrentWorkspace(sourceId, targetId)
    : { created: false, requiresWorkspaceReapply: false };
  const created = !!edgeCreateResult.created;
  cancelEdgeCreateDraft({ clearHover: true, redraw: true });
  if (created) {
    if (edgeCreateResult.requiresWorkspaceReapply) {
      invalidateActiveWorkspaceView({ autoFit: "preserve" });
      renderAll();
    } else {
      renderCanvas();
    }
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
  invalidateActiveWorkspaceView({ autoFit: "preserve", clearAppliedWorkspaceId: true });
  ensureGraphSelectionState();
  if (state.selectedNodeId && !allNodesRuntime.some((node) => node.id === state.selectedNodeId)) {
    state.selectedNodeId = null;
    resetDetailsEditState();
  }
  state.selectedNodeIds = new Set(
    [...state.selectedNodeIds].filter((nodeId) => allNodesRuntime.some((node) => node.id === nodeId))
  );
  state.selectedEdgeIds = new Set(
    [...state.selectedEdgeIds].filter((edgeId) => allEdgesRuntime.some((edge) => edge.id === edgeId))
  );
  if (!state.selectedNodeId && state.selectedNodeIds.size) {
    state.selectedNodeId = getDeterministicSelectionNodeId(state.selectedNodeIds);
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
  invalidateActiveWorkspaceView({ autoFit: "preserve", clearAppliedWorkspaceId: true });
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

function shouldDeleteNodeInWorkspaceOnly(workspaceRecord, node) {
  if (!workspaceRecord || !node) return true;
  if (node.type === "handover") return true;
  if (normalizeWorkspaceKind(workspaceRecord.kind) !== "collab") return false;
  const projectionMeta = getCurrentProjectionNodeMeta(node.id);
  return !!projectionMeta?.roles?.includes("handover-object");
}

function deleteNodeFromWorkspaceWithPolicy(workspaceRecord, nodeId) {
  if (!workspaceRecord || !nodeId) return false;
  const node = getNodeById(nodeId) || getGlobalNodeById(nodeId) || null;
  if (!node) return false;
  if (isProjectedHandoverNodeInWorkspace(workspaceRecord, node)) {
    return hideProjectedHandoverInWorkspace(workspaceRecord, node.id);
  }
  return deleteNodeFromCurrentWorkspace(node.id);
}

function requestNodeDelete(nodeId) {
  const node = getNodeById(nodeId) || getGlobalNodeById(nodeId);
  if (!node) return;
  const workspaceRecord = workspaceById.get(currentWorkspaceId || "");
  if (!workspaceRecord || !canDeleteNodeSelection(workspaceRecord, node)) return;
  const projectionMeta = getCurrentProjectionNodeMeta(nodeId);
  if (currentWorkspaceKind === "collab" && projectionMeta?.roles?.includes("handover-object")) {
    const deletedProjectedObject = deleteNodeFromWorkspaceWithPolicy(workspaceRecord, nodeId);
    if (!deletedProjectedObject) return;
    closeCreateNodeMenu();
    renderAll();
    return;
  }
  const membershipCount = getWorkspaceMembershipCount(nodeId);
  let deleted = false;

  if (membershipCount > 1 && !shouldDeleteNodeInWorkspaceOnly(workspaceRecord, node)) {
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
      deleted = deleteNodeFromWorkspaceWithPolicy(workspaceRecord, nodeId);
    } else {
      return;
    }
  } else {
    deleted = deleteNodeFromWorkspaceWithPolicy(workspaceRecord, nodeId);
  }

  if (!deleted) return;
  closeCreateNodeMenu();
  renderAll();
}

function hasGraphClipboardData() {
  return !!graphClipboardState?.hasData &&
    (Array.isArray(graphClipboardState.nodeRefs) && graphClipboardState.nodeRefs.length > 0 ||
      Array.isArray(graphClipboardState.edgeDescriptors) && graphClipboardState.edgeDescriptors.length > 0);
}

function clonePlainData(value) {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch (error) {
      // Fall through to JSON clone.
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return null;
  }
}

function canLinkNodeSelection(workspaceRecord, node) {
  if (!workspaceRecord || !node) return false;
  if (!isSelectableNode(node)) return false;
  if (node.type === "collaboration") return false;
  if (workspaceRecord.homeNodeId === node.id) return false;
  if (isAutoManagedProjectionNode(node)) return false;
  const projectionMeta = getCurrentProjectionNodeMeta(node.id);
  if (projectionMeta && !projectionMeta.roles.includes("handover-object") && !isProjectedHandoverNodeInWorkspace(workspaceRecord, node)) {
    return false;
  }
  return !!getGlobalNodeById(node.id);
}

function canCopyNodeSelection(workspaceRecord, node) {
  if (!workspaceRecord || !node) return false;
  if (!isSelectableNode(node)) return false;
  if (node.type === "collaboration") return false;
  if (workspaceRecord.homeNodeId === node.id) return false;
  if (isAutoManagedProjectionNode(node)) {
    return node.type === "handover" || node.type === "entity";
  }
  const projectionMeta = getCurrentProjectionNodeMeta(node.id);
  if (!projectionMeta) return true;
  if (projectionMeta.roles.includes("handover-object")) return true;
  return node.type === "handover" || node.type === "entity";
}

function canDeleteNodeSelection(workspaceRecord, node) {
  if (!workspaceRecord || !node) return false;
  if (!isSelectableNode(node)) return false;
  if (isProjectedHandoverNodeInWorkspace(workspaceRecord, node)) return true;
  if (isWorkspaceProtectedNode(workspaceRecord, node)) return false;
  return true;
}

function canCutNodeSelection(workspaceRecord, node) {
  return canCopyNodeSelection(workspaceRecord, node) && canDeleteNodeSelection(workspaceRecord, node);
}

function isEdgeSelectionActionable(workspaceRecord, edge) {
  if (!workspaceRecord || !edge || !edge.id) return false;
  const authoredEdge = getWorkspaceAuthoredEdgeRecord(workspaceRecord, edge.id);
  if (!authoredEdge) return false;
  if (isAutoManagedProjectionEdge(authoredEdge)) return false;
  return true;
}

function getSelectionNodeRecords(workspaceRecord, predicate = null) {
  ensureGraphSelectionState();
  const selection = [];
  const seenIds = new Set();
  [...state.selectedNodeIds].forEach((nodeId) => {
    if (seenIds.has(nodeId)) return;
    seenIds.add(nodeId);
    const node = getNodeById(nodeId) || getGlobalNodeById(nodeId);
    if (!node) return;
    selection.push(node);
  });
  selection.sort(compareNodesStable);
  if (!workspaceRecord) return selection;
  if (typeof predicate !== "function") return selection;
  return selection.filter((node) => predicate(workspaceRecord, node));
}

function getSelectionAuthoredEdges(workspaceRecord, options = {}) {
  if (!workspaceRecord) return [];
  ensureGraphSelectionState();
  const includeInternalNodeEdges = options.includeInternalNodeEdges !== false;
  const nodeIdSet = options.nodeIdSet instanceof Set
    ? options.nodeIdSet
    : new Set(Array.isArray(options.nodeIds) ? options.nodeIds : [...state.selectedNodeIds]);
  const edgeBySelectionId = new Map();
  const addEdgeById = (edgeId) => {
    if (!edgeId || edgeBySelectionId.has(edgeId)) return;
    const edgeRecord = getWorkspaceAuthoredEdgeRecord(workspaceRecord, edgeId);
    if (!isEdgeSelectionActionable(workspaceRecord, edgeRecord)) return;
    edgeBySelectionId.set(edgeRecord.id, edgeRecord);
  };
  [...state.selectedEdgeIds].forEach((edgeId) => addEdgeById(edgeId));
  if (includeInternalNodeEdges && nodeIdSet.size) {
    const workspaceEdgeIds = Array.isArray(workspaceRecord.edgeIds) ? workspaceRecord.edgeIds : [];
    workspaceEdgeIds.forEach((edgeId) => {
      const edgeRecord = getWorkspaceAuthoredEdgeRecord(workspaceRecord, edgeId);
      if (!isEdgeSelectionActionable(workspaceRecord, edgeRecord)) return;
      if (!nodeIdSet.has(edgeRecord.sourceId) || !nodeIdSet.has(edgeRecord.targetId)) return;
      edgeBySelectionId.set(edgeRecord.id, edgeRecord);
    });
  }
  return [...edgeBySelectionId.values()];
}

function getSelectionCentroid(nodeRefs) {
  const positionedRefs = (Array.isArray(nodeRefs) ? nodeRefs : [])
    .filter((entry) => Number.isFinite(entry?.pos?.x) && Number.isFinite(entry?.pos?.y));
  if (!positionedRefs.length) {
    return { x: 0, y: 0 };
  }
  const totals = positionedRefs.reduce((acc, entry) => {
    acc.x += entry.pos.x;
    acc.y += entry.pos.y;
    return acc;
  }, { x: 0, y: 0 });
  return {
    x: totals.x / positionedRefs.length,
    y: totals.y / positionedRefs.length
  };
}

function buildClipboardNodeSnapshot(node) {
  if (!node) return null;
  const persistable = toPersistableNode(node);
  const snapshot = clonePlainData(persistable);
  if (!snapshot || typeof snapshot !== "object") return null;
  snapshot.id = node.id;
  return snapshot;
}

function copySelectionToGraphClipboard(options = {}) {
  const workspaceRecord = getCurrentWorkspaceRecord();
  if (!workspaceRecord) {
    return { copied: false, copiedNodeCount: 0, copiedEdgeCount: 0, skippedNodeCount: 0, skippedEdgeCount: 0 };
  }
  const nodePredicate = typeof options.nodePredicate === "function"
    ? options.nodePredicate
    : canCopyNodeSelection;
  const selectedNodes = [...new Set(
    [...state.selectedNodeIds]
      .map((nodeId) => getNodeById(nodeId) || getGlobalNodeById(nodeId))
      .filter((node) => !!node)
  )].sort(compareNodesStable);
  const skippedNodeCount = selectedNodes.filter((node) => !nodePredicate(workspaceRecord, node)).length;
  const actionableNodes = selectedNodes.filter((node) => nodePredicate(workspaceRecord, node));
  const actionableNodeIdSet = new Set(actionableNodes.map((node) => node.id));
  const copiedEdges = getSelectionAuthoredEdges(workspaceRecord, {
    includeInternalNodeEdges: true,
    nodeIdSet: actionableNodeIdSet
  });
  const selectedEdgeCount = [...state.selectedEdgeIds].length;
  const skippedEdgeCount = Math.max(0, selectedEdgeCount - copiedEdges.filter((edgeRecord) =>
    [...state.selectedEdgeIds].includes(edgeRecord.id)
  ).length);
  const nodeRefs = actionableNodes.map((node) => ({
    id: node.id,
    pos: getWorkspaceNodePos(workspaceRecord.id, node.id, { allowLegacyFallback: true }),
    pasteMode: canLinkNodeSelection(workspaceRecord, node) ? "linkable" : "copyOnly"
  }));
  const nodeSnapshots = actionableNodes
    .map((node) => buildClipboardNodeSnapshot(node))
    .filter(Boolean);
  const edgeDescriptors = copiedEdges.map((edgeRecord) => ({
    sourceId: edgeRecord.sourceId,
    targetId: edgeRecord.targetId,
    kind: edgeRecord.kind || "link"
  }));
  if (!nodeRefs.length && !edgeDescriptors.length) {
    return {
      copied: false,
      copiedNodeCount: 0,
      copiedEdgeCount: 0,
      skippedNodeCount,
      skippedEdgeCount
    };
  }
  graphClipboardState = {
    hasData: true,
    sourceWorkspaceId: workspaceRecord.id,
    sourceCentroid: getSelectionCentroid(nodeRefs),
    pasteSequence: 0,
    nodeRefs,
    nodeSnapshots,
    edgeDescriptors,
    copiedAt: Date.now()
  };
  return {
    copied: true,
    copiedNodeCount: nodeRefs.length,
    copiedEdgeCount: edgeDescriptors.length,
    skippedNodeCount,
    skippedEdgeCount
  };
}

function resolveGraphPasteAnchor(anchorWorld = null) {
  if (Number.isFinite(anchorWorld?.x) && Number.isFinite(anchorWorld?.y)) {
    return { x: anchorWorld.x, y: anchorWorld.y };
  }
  if (!viewportEl) {
    return { x: 0, y: 0 };
  }
  const viewportRect = viewportEl.getBoundingClientRect();
  const centerWorld = screenToWorld(viewportRect.width / 2, viewportRect.height / 2);
  return { x: centerWorld.worldX, y: centerWorld.worldY };
}

function buildCopiedTaskRecord(task, newNodeId) {
  const normalizedTask = normalizeTaskRecord(task);
  return {
    ...normalizedTask,
    id: generateTaskId(),
    taskGroupId: normalizedTask.taskGroupId ? generateTaskGroupId() : normalizedTask.taskGroupId,
    originNodeId: newNodeId
  };
}

function buildCopiedCommentRecord(comment) {
  return normalizeCommentRecord({
    ...comment,
    id: generateCommentId(),
    isNew: false
  });
}

function createRuntimeNodeFromClipboardSnapshot(snapshot, newNodeId) {
  const base = clonePlainData(snapshot) || {};
  clearProjectionMeta(base);
  const nodeType = normalizeNodeType(base.type);
  const ownerRecord = base.ownerId ? userById.get(base.ownerId) : null;
  const nextNode = {
    ...base,
    id: newNodeId,
    type: nodeType,
    title: typeof base.title === "string" ? base.title : "",
    label: typeof base.title === "string" ? base.title : "",
    ownerId: base.ownerId || currentUserId || null,
    owner: ownerRecord?.name || (typeof base.owner === "string" && base.owner ? base.owner : (base.ownerId || "Unknown")),
    summary: typeof base.summary === "string" && base.summary.trim() ? base.summary : "Click to enter node description",
    tasks: (Array.isArray(base.tasks) ? base.tasks : []).map((task) => buildCopiedTaskRecord(task, newNodeId)),
    comments: (Array.isArray(base.comments) ? base.comments : []).map((comment) => buildCopiedCommentRecord(comment)),
    locationId: Object.prototype.hasOwnProperty.call(base, "locationId") ? base.locationId : null,
    graphPos: null
  };
  if (nodeType === "process") {
    nextNode.status = normalizeProcessStatus(base.status);
  }
  if (nodeType === "handover") {
    nextNode.status = normalizeHandoverStatus(base.status);
    nextNode.handoverCollaborators = Array.isArray(base.handoverCollaborators)
      ? base.handoverCollaborators.map((entry) => ({ ...entry }))
      : [];
    nextNode.handoverObjects = Array.isArray(base.handoverObjects)
      ? base.handoverObjects.map((entry) => ({ ...entry }))
      : [];
    nextNode.handoverNodeIds = Array.isArray(base.handoverNodeIds)
      ? base.handoverNodeIds.filter((nodeId) => typeof nodeId === "string" && nodeId)
      : [];
  }
  if (nodeType === "portal") {
    nextNode.linkedWorkspaceId = typeof base.linkedWorkspaceId === "string" && base.linkedWorkspaceId
      ? base.linkedWorkspaceId
      : null;
  }
  if (nodeType === "entity") {
    nextNode.entityKind = normalizeEntityKind(base.entityKind);
    nextNode.entityRefId = typeof base.entityRefId === "string" && base.entityRefId ? base.entityRefId : null;
  }
  return nextNode;
}

function remapCopiedNodeReferences(node, nodeIdRemap) {
  if (!node || !(nodeIdRemap instanceof Map) || !nodeIdRemap.size) return;
  if (typeof node.locationId === "string" && nodeIdRemap.has(node.locationId)) {
    node.locationId = nodeIdRemap.get(node.locationId);
  }
  if (Array.isArray(node.handoverNodeIds)) {
    node.handoverNodeIds = node.handoverNodeIds.map((nodeId) => nodeIdRemap.get(nodeId) || nodeId);
  }
  if (Array.isArray(node.handoverObjects)) {
    node.handoverObjects = node.handoverObjects.map((handoverObject) => ({
      ...handoverObject,
      id: nodeIdRemap.get(handoverObject.id) || handoverObject.id
    }));
  }
  if (Array.isArray(node.tasks)) {
    node.tasks = node.tasks.map((task) => {
      const linkedObjectIds = Array.isArray(task.linkedObjectIds)
        ? task.linkedObjectIds.map((nodeId) => nodeIdRemap.get(nodeId) || nodeId)
        : [];
      return {
        ...task,
        linkedObjectIds
      };
    });
  }
}

function getWorkspaceNodeIdSet(workspaceRecord) {
  return new Set(Array.isArray(workspaceRecord?.nodeIds) ? workspaceRecord.nodeIds : []);
}

function resolveEdgeEndpointForPaste(originalEndpointId, nodeIdRemap, workspaceNodeIdSet) {
  if (!originalEndpointId) return null;
  if (nodeIdRemap.has(originalEndpointId)) {
    return nodeIdRemap.get(originalEndpointId);
  }
  if (workspaceNodeIdSet.has(originalEndpointId)) {
    return originalEndpointId;
  }
  return null;
}

function pasteGraphClipboard(mode = "link", anchorWorld = null) {
  const workspaceRecord = getCurrentWorkspaceRecord();
  if (!workspaceRecord || !hasGraphClipboardData()) {
    return { pasted: false, pastedNodeCount: 0, pastedEdgeCount: 0, droppedEdgeCount: 0, droppedNodeCount: 0 };
  }
  const pasteMode = mode === "copy" ? "copy" : "link";
  const anchor = resolveGraphPasteAnchor(anchorWorld);
  const sourceCentroid = Number.isFinite(graphClipboardState.sourceCentroid?.x) && Number.isFinite(graphClipboardState.sourceCentroid?.y)
    ? graphClipboardState.sourceCentroid
    : { x: 0, y: 0 };
  const pasteSequence = Number.isFinite(graphClipboardState.pasteSequence)
    ? graphClipboardState.pasteSequence
    : 0;
  const sequenceOffsetX = pasteSequence * GRAPH_CLIPBOARD_PASTE_OFFSET_WORLD_X;
  const sequenceOffsetY = pasteSequence * GRAPH_CLIPBOARD_PASTE_OFFSET_WORLD_Y;
  const nodeRefs = Array.isArray(graphClipboardState.nodeRefs) ? graphClipboardState.nodeRefs : [];
  const nodeSnapshots = Array.isArray(graphClipboardState.nodeSnapshots) ? graphClipboardState.nodeSnapshots : [];
  const snapshotById = new Map(nodeSnapshots.map((snapshot) => [snapshot.id, snapshot]));
  const nodeIdRemap = new Map();
  const pastedNodeIds = [];
  const nextNodePositionsById = new Map();
  let droppedNodeCount = 0;

  nodeRefs.forEach((nodeRef) => {
    if (!nodeRef?.id) return;
    const sourcePos = Number.isFinite(nodeRef?.pos?.x) && Number.isFinite(nodeRef?.pos?.y)
      ? nodeRef.pos
      : sourceCentroid;
    const nextPos = {
      x: anchor.x + (sourcePos.x - sourceCentroid.x) + sequenceOffsetX,
      y: anchor.y + (sourcePos.y - sourceCentroid.y) + sequenceOffsetY
    };
    if (pasteMode === "link") {
      if (nodeRef.pasteMode === "copyOnly") {
        droppedNodeCount += 1;
        return;
      }
      const sourceNode = getGlobalNodeById(nodeRef.id);
      if (!sourceNode || !canLinkNodeSelection(workspaceRecord, sourceNode)) {
        droppedNodeCount += 1;
        return;
      }
      ensureWorkspaceNodeMembership(workspaceRecord, sourceNode.id);
      setWorkspaceNodePos(workspaceRecord.id, sourceNode.id, nextPos);
      nodeIdRemap.set(nodeRef.id, sourceNode.id);
      pastedNodeIds.push(sourceNode.id);
      nextNodePositionsById.set(sourceNode.id, nextPos);
      return;
    }
    const snapshot = snapshotById.get(nodeRef.id);
    if (!snapshot) return;
    const newNodeId = generateNodeId(snapshot.type || "node");
    const nextNode = createRuntimeNodeFromClipboardSnapshot(snapshot, newNodeId);
    nextNode.graphPos = { x: nextPos.x, y: nextPos.y };
    allNodesRuntime.push(nextNode);
    ensureWorkspaceNodeMembership(workspaceRecord, newNodeId);
    setWorkspaceNodePos(workspaceRecord.id, newNodeId, nextPos);
    nodeIdRemap.set(snapshot.id, newNodeId);
    pastedNodeIds.push(newNodeId);
    nextNodePositionsById.set(newNodeId, nextPos);
  });

  if (pasteMode === "copy" && nodeIdRemap.size) {
    nodeIdRemap.forEach((newNodeId) => {
      const newNode = getGlobalNodeById(newNodeId);
      if (!newNode) return;
      remapCopiedNodeReferences(newNode, nodeIdRemap);
    });
  }

  const workspaceNodeIdSet = getWorkspaceNodeIdSet(workspaceRecord);
  pastedNodeIds.forEach((nodeId) => workspaceNodeIdSet.add(nodeId));
  const edgeDescriptors = Array.isArray(graphClipboardState.edgeDescriptors) ? graphClipboardState.edgeDescriptors : [];
  const createdEdgeIds = [];
  let droppedEdgeCount = 0;
  edgeDescriptors.forEach((descriptor) => {
    const sourceId = resolveEdgeEndpointForPaste(descriptor.sourceId, nodeIdRemap, workspaceNodeIdSet);
    const targetId = resolveEdgeEndpointForPaste(descriptor.targetId, nodeIdRemap, workspaceNodeIdSet);
    if (!sourceId || !targetId || sourceId === targetId) {
      droppedEdgeCount += 1;
      return;
    }
    const sourceNode = getGlobalNodeById(sourceId);
    const targetNode = getGlobalNodeById(targetId);
    if (!sourceNode || !targetNode) {
      droppedEdgeCount += 1;
      return;
    }
    if (!canCreateEdgeInCurrentWorkspace(sourceNode, targetNode)) {
      droppedEdgeCount += 1;
      return;
    }
    if (workspaceHasEdgeBetweenNodes(workspaceRecord, sourceId, targetId)) {
      return;
    }
    const edgeRecord = {
      id: generateGlobalEdgeId(sourceId, targetId, workspaceRecord.id),
      sourceId,
      targetId,
      kind: inferEdgeKindForPair(sourceNode, targetNode),
      workspaceId: workspaceRecord.id
    };
    allEdgesRuntime.push(edgeRecord);
    ensureWorkspaceEdgeMembership(workspaceRecord, edgeRecord.id);
    createdEdgeIds.push(edgeRecord.id);
  });

  if (!pastedNodeIds.length && !createdEdgeIds.length) {
    return { pasted: false, pastedNodeCount: 0, pastedEdgeCount: 0, droppedEdgeCount, droppedNodeCount };
  }

  const derivedChanged = refreshAllHandoverDerivedState();
  syncNodeRuntimeAndStore();
  syncEdgeRuntimeAndStore();
  syncWorkspaceRuntimeAndStore();
  if (!derivedChanged && pastedNodeIds.length) {
    persistWorkspaceNodePositions(workspaceRecord, pastedNodeIds, { syncWorkspace: true, persist: false });
  }
  persistStoreToLocalStorage();
  graphClipboardState.pasteSequence = pasteSequence + 1;
  invalidateActiveWorkspaceView({ autoFit: "preserve", clearAppliedWorkspaceId: true });
  ensureGraphSelectionState();
  state.selectedNodeIds = new Set(pastedNodeIds);
  state.selectedEdgeIds = new Set(createdEdgeIds);
  state.selectedNodeId = getDeterministicSelectionNodeId(state.selectedNodeIds);
  if (!state.selectedNodeId) {
    resetDetailsEditState();
  }
  renderAll();
  return {
    pasted: true,
    pastedNodeCount: pastedNodeIds.length,
    pastedEdgeCount: createdEdgeIds.length,
    droppedEdgeCount,
    droppedNodeCount
  };
}

function formatSelectionSkipSummary(result, actionLabel = "Action") {
  const skippedNodeCount = Number(result?.skippedNodeCount) || 0;
  const skippedEdgeCount = Number(result?.skippedEdgeCount) || 0;
  if (!skippedNodeCount && !skippedEdgeCount) return "";
  const parts = [];
  if (skippedNodeCount) {
    parts.push(`${skippedNodeCount} protected/auto-managed node${skippedNodeCount === 1 ? "" : "s"}`);
  }
  if (skippedEdgeCount) {
    parts.push(`${skippedEdgeCount} auto-managed edge${skippedEdgeCount === 1 ? "" : "s"}`);
  }
  return `${actionLabel}: skipped ${parts.join(" and ")}.`;
}

function copyGraphSelectionWithSummary() {
  const result = copySelectionToGraphClipboard({ nodePredicate: canCopyNodeSelection });
  const skipSummary = formatSelectionSkipSummary(result, "Copy");
  if (skipSummary) {
    window.alert(skipSummary);
  }
  return result;
}

function deleteGraphSelectionBatch() {
  const workspaceRecord = getCurrentWorkspaceRecord();
  if (!workspaceRecord) {
    return {
      deleted: false,
      deletedNodeCount: 0,
      deletedEdgeCount: 0,
      skippedNodeCount: 0,
      skippedEdgeCount: 0
    };
  }
  ensureGraphSelectionState();
  const selectedNodeRecords = [...state.selectedNodeIds]
    .map((nodeId) => getNodeById(nodeId) || getGlobalNodeById(nodeId))
    .filter(Boolean)
    .sort(compareNodesStable);
  const selectedEdgeRecords = [...state.selectedEdgeIds]
    .map((edgeId) => getWorkspaceAuthoredEdgeRecord(workspaceRecord, edgeId))
    .filter(Boolean);
  const actionableNodes = selectedNodeRecords.filter((node) => canDeleteNodeSelection(workspaceRecord, node));
  const skippedNodeCount = selectedNodeRecords.length - actionableNodes.length;
  const actionableEdges = selectedEdgeRecords.filter((edge) => isEdgeSelectionActionable(workspaceRecord, edge));
  const skippedEdgeCount = selectedEdgeRecords.length - actionableEdges.length;
  if (!actionableNodes.length && !actionableEdges.length) {
    return {
      deleted: false,
      deletedNodeCount: 0,
      deletedEdgeCount: 0,
      skippedNodeCount,
      skippedEdgeCount
    };
  }

  const globalDeleteEligibleNodes = actionableNodes.filter((node) =>
    !shouldDeleteNodeInWorkspaceOnly(workspaceRecord, node)
  );
  const globalDeleteEligibleNodeIdSet = new Set(globalDeleteEligibleNodes.map((node) => node.id));
  const multiMembershipNodeCount = globalDeleteEligibleNodes.filter((node) => getWorkspaceMembershipCount(node.id) > 1).length;
  let deleteScope = "workspace";
  if (multiMembershipNodeCount > 0) {
    const scope = window.prompt(
      `Delete ${globalDeleteEligibleNodes.length} selected node(s) from current workspace only, or globally?\nType "w" for workspace-only or "g" for global delete.`,
      "w"
    );
    if (!scope) {
      return {
        deleted: false,
        deletedNodeCount: 0,
        deletedEdgeCount: 0,
        skippedNodeCount,
        skippedEdgeCount
      };
    }
    const normalizedScope = scope.trim().toLowerCase();
    if (normalizedScope === "g") {
      const confirmedGlobal = window.confirm(`Delete ${globalDeleteEligibleNodes.length} selected node(s) globally from all workspaces?`);
      if (!confirmedGlobal) {
        return {
          deleted: false,
          deletedNodeCount: 0,
          deletedEdgeCount: 0,
          skippedNodeCount,
          skippedEdgeCount
        };
      }
      deleteScope = "global";
    } else if (normalizedScope !== "w") {
      return {
        deleted: false,
        deletedNodeCount: 0,
        deletedEdgeCount: 0,
        skippedNodeCount,
        skippedEdgeCount
      };
    }
  }

  let deletedNodeCount = 0;
  actionableNodes.forEach((node) => {
    const shouldDeleteGlobally = deleteScope === "global" && globalDeleteEligibleNodeIdSet.has(node.id);
    const deleted = shouldDeleteGlobally
      ? deleteNodeGlobally(node.id)
      : deleteNodeFromWorkspaceWithPolicy(workspaceRecord, node.id);
    if (deleted) {
      deletedNodeCount += 1;
    }
  });

  const deletedNodeIdSet = new Set(actionableNodes.map((node) => node.id));
  let deletedEdgeCount = 0;
  let requiresWorkspaceReapply = false;
  actionableEdges.forEach((edgeRecord) => {
    if (deletedNodeIdSet.has(edgeRecord.sourceId) || deletedNodeIdSet.has(edgeRecord.targetId)) {
      return;
    }
    const deleteResult = deleteEdgeFromCurrentWorkspace(edgeRecord.id);
    if (deleteResult.deleted) {
      deletedEdgeCount += 1;
      if (deleteResult.requiresWorkspaceReapply) {
        requiresWorkspaceReapply = true;
      }
    }
  });

  const deleted = deletedNodeCount > 0 || deletedEdgeCount > 0;
  if (deleted) {
    if (requiresWorkspaceReapply) {
      invalidateActiveWorkspaceView({ autoFit: "preserve" });
    }
    hideEdgeActionMenu({ clearIntent: true });
    closeCreateNodeMenu();
    renderAll();
  }
  return {
    deleted,
    deletedNodeCount,
    deletedEdgeCount,
    skippedNodeCount,
    skippedEdgeCount
  };
}

function deleteGraphSelectionWithSummary() {
  const result = deleteGraphSelectionBatch();
  const skipSummary = formatSelectionSkipSummary(result, "Delete");
  if (skipSummary) {
    window.alert(skipSummary);
  }
  return result;
}

function cutGraphSelectionWithSummary() {
  const copyResult = copySelectionToGraphClipboard({ nodePredicate: canCutNodeSelection });
  const copySummary = formatSelectionSkipSummary(copyResult, "Cut");
  if (!copyResult.copied) {
    if (copySummary) {
      window.alert(copySummary);
    }
    return {
      cut: false,
      copied: false,
      deleted: false
    };
  }
  const deleteResult = deleteGraphSelectionBatch();
  const deleteSummary = formatSelectionSkipSummary(deleteResult, "Cut");
  const summaryParts = [copySummary, deleteSummary].filter(Boolean);
  if (summaryParts.length) {
    window.alert(summaryParts.join("\n"));
  }
  return {
    cut: deleteResult.deleted,
    copied: true,
    deleted: deleteResult.deleted
  };
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
  selectSingleNode(node.id);
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
  selectSingleNode(node.id);
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

function navigateToWorkspaceById(workspaceId, options = {}) {
  if (typeof workspaceId !== "string" || !workspaceId) return false;
  const visibleWorkspaceIds = getAccessibleWorkspaceIdSetForCurrentUser();
  if (!visibleWorkspaceIds.has(workspaceId)) return false;
  if (workspaceId === currentWorkspaceId) return true;
  cancelEdgeCreateInteractions();
  closeCreateNodeMenu();
  workspaceMenuOpen = false;
  userMenuOpen = false;
  resetWorkspaceCreateState();
  resetWorkspaceRenameState();
  if (options.closePortalModal === true) {
    closePortalLinkModal({ keepNode: true });
  }
  rememberCurrentWorkspaceViewport({ persist: true });
  currentWorkspaceId = workspaceId;
  invalidateActiveWorkspaceView({ autoFit: "if-missing", clearAppliedWorkspaceId: true });
  renderAll();
  return true;
}

function handleHandoverPortalBadgeClick(nodeId) {
  const node = getNodeById(nodeId);
  if (!node || node.type !== "handover") return false;
  const workspaceRecord = getCurrentWorkspaceRecord();
  const linkRecord = getHandoverPortalBadgeLink(node, workspaceRecord, currentUserId);
  if (!linkRecord?.targetWorkspaceId) return false;
  return navigateToWorkspaceById(linkRecord.targetWorkspaceId, { closePortalModal: true });
}

function handlePortalDoubleClick(nodeId) {
  const node = getNodeById(nodeId);
  if (!node || node.type !== "portal") return;
  const linkedWorkspaceId = typeof node.linkedWorkspaceId === "string" ? node.linkedWorkspaceId : "";
  if (!linkedWorkspaceId) {
    openPortalLinkModal(node.id, { flow: "dblclick" });
    return;
  }
  if (!navigateToWorkspaceById(linkedWorkspaceId, { closePortalModal: true })) {
    openPortalLinkModal(node.id, { flow: "dblclick" });
  }
}

function requestNodeEdit(nodeId) {
  const node = getNodeById(nodeId);
  if (!node) return;
  if (node.type === "portal") {
    selectSingleNode(nodeId);
    openPortalLinkModal(node.id, { flow: "edit" });
    return;
  }
  if (node.type === "entity") {
    selectSingleNode(nodeId);
    openEntityLinkModal(node.id, { flow: "edit" });
    return;
  }
  if (node.type === "collaboration") {
    return;
  }
  selectSingleNode(nodeId);
  newNodeInlineEditId = nodeId;
  closeCreateNodeMenu();
  renderAll();
}

function appendCreateMenuItem({ label, onClick, danger = false, disabled = false, title = "" }) {
  if (!createNodeMenuEl) return null;
  const button = document.createElement("button");
  button.type = "button";
  button.className = `map-create-menu-item${danger ? " is-danger" : ""}`;
  button.textContent = label;
  button.disabled = !!disabled;
  if (title) {
    button.title = title;
  }
  if (typeof onClick === "function") {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (button.disabled) return;
      onClick(event);
    });
  }
  createNodeMenuEl.appendChild(button);
  return button;
}

function appendCreateMenuSeparator() {
  if (!createNodeMenuEl) return;
  const separator = document.createElement("div");
  separator.className = "map-create-menu-separator";
  separator.setAttribute("role", "separator");
  createNodeMenuEl.appendChild(separator);
}

function getGraphSelectionActionability(workspaceRecord) {
  if (!workspaceRecord) {
    return { canCut: false, canCopy: false, canDelete: false, hasAny: false };
  }
  const copiedNodeCount = getSelectionNodeRecords(workspaceRecord, canCopyNodeSelection).length;
  const cutNodeCount = getSelectionNodeRecords(workspaceRecord, canCutNodeSelection).length;
  const deleteNodeCount = getSelectionNodeRecords(workspaceRecord, canDeleteNodeSelection).length;
  const actionableEdgeCount = getSelectionAuthoredEdges(workspaceRecord, {
    includeInternalNodeEdges: false,
    nodeIdSet: new Set()
  }).length;
  return {
    canCut: cutNodeCount > 0 || actionableEdgeCount > 0,
    canCopy: copiedNodeCount > 0 || actionableEdgeCount > 0,
    canDelete: deleteNodeCount > 0 || actionableEdgeCount > 0,
    hasAny: copiedNodeCount > 0 || cutNodeCount > 0 || deleteNodeCount > 0 || actionableEdgeCount > 0
  };
}

function appendClipboardPasteMenuActions() {
  const hasClipboardData = hasGraphClipboardData();
  appendCreateMenuItem({
    label: "Paste as Link (Default)",
    disabled: !hasClipboardData,
    onClick: () => {
      const result = pasteGraphClipboard("link", {
        x: createNodeMenuWorldX,
        y: createNodeMenuWorldY
      });
      if (!result.pasted) return;
      closeCreateNodeMenu();
    }
  });
  appendCreateMenuItem({
    label: "Paste as Copy",
    disabled: !hasClipboardData,
    onClick: () => {
      const result = pasteGraphClipboard("copy", {
        x: createNodeMenuWorldX,
        y: createNodeMenuWorldY
      });
      if (!result.pasted) return;
      closeCreateNodeMenu();
    }
  });
}

function appendSelectionMenuActions(options = {}) {
  const workspaceRecord = getCurrentWorkspaceRecord();
  const actionability = getGraphSelectionActionability(workspaceRecord);
  const includePaste = options.includePaste !== false;
  const deleteLabel = typeof options.deleteLabel === "string" && options.deleteLabel.trim()
    ? options.deleteLabel.trim()
    : "Delete";
  appendCreateMenuItem({
    label: "Cut",
    disabled: !actionability.canCut,
    onClick: () => {
      const result = cutGraphSelectionWithSummary();
      if (result.cut) {
        closeCreateNodeMenu();
      }
    }
  });
  appendCreateMenuItem({
    label: "Copy",
    disabled: !actionability.canCopy,
    onClick: () => {
      const result = copyGraphSelectionWithSummary();
      if (result.copied) {
        closeCreateNodeMenu();
      }
    }
  });
  if (includePaste) {
    appendClipboardPasteMenuActions();
  }
  appendCreateMenuItem({
    label: deleteLabel,
    danger: true,
    disabled: !actionability.canDelete,
    onClick: () => {
      const result = deleteGraphSelectionWithSummary();
      if (result.deleted) {
        closeCreateNodeMenu();
      }
    }
  });
}

function openNodeActionMenu(clientX, clientY, nodeId, worldX, worldY) {
  cancelEdgeCreateInteractions();
  createNodeMenuOpen = true;
  createNodeMenuMode = "node";
  createNodeMenuNodeId = nodeId;
  createNodeMenuEdgeId = null;
  createNodeMenuSelectionContext = { kind: "node", nodeId, edgeId: null };
  createNodeMenuClientX = clientX;
  createNodeMenuClientY = clientY;
  createNodeMenuWorldX = Number.isFinite(worldX) ? worldX : createNodeMenuWorldX;
  createNodeMenuWorldY = Number.isFinite(worldY) ? worldY : createNodeMenuWorldY;
  renderCreateNodeMenu();
}

function openSelectionActionMenu(clientX, clientY, worldX, worldY, context = {}) {
  cancelEdgeCreateInteractions();
  createNodeMenuOpen = true;
  createNodeMenuMode = "selection";
  createNodeMenuNodeId = null;
  createNodeMenuEdgeId = context.edgeId || null;
  createNodeMenuSelectionContext = {
    kind: context.kind || (context.edgeId ? "edge" : "selection"),
    nodeId: context.nodeId || null,
    edgeId: context.edgeId || null
  };
  createNodeMenuClientX = clientX;
  createNodeMenuClientY = clientY;
  createNodeMenuWorldX = Number.isFinite(worldX) ? worldX : createNodeMenuWorldX;
  createNodeMenuWorldY = Number.isFinite(worldY) ? worldY : createNodeMenuWorldY;
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
      appendCreateMenuItem({
        label: "Collaboration anchor",
        disabled: true
      });
      appendCreateMenuSeparator();
      appendSelectionMenuActions({ includePaste: true });
    } else {
      appendCreateMenuItem({
        label: (node.type === "portal" || node.type === "entity") ? "Edit link" : "Edit",
        onClick: () => {
          requestNodeEdit(node.id);
        }
      });

      const workspaceRecord = getCurrentWorkspaceRecord();
      const canManageAnchor = !!workspaceRecord && normalizeWorkspaceKind(workspaceRecord.kind) !== "collab" && isSelectableNode(node);
      if (canManageAnchor) {
        appendCreateMenuItem({
          label: workspaceRecord.homeNodeId === node.id ? "Clear workspace anchor" : "Set as workspace anchor",
          onClick: () => {
            const changed = workspaceRecord.homeNodeId === node.id
              ? clearCurrentWorkspaceAnchorNode()
              : setCurrentWorkspaceAnchorNode(node.id);
            if (!changed) return;
            closeCreateNodeMenu();
            renderAll();
          }
        });
      }

      appendCreateMenuSeparator();
      appendSelectionMenuActions({ includePaste: true });
    }
  } else if (createNodeMenuMode === "selection") {
    if (!getGraphSelectionActionability(getCurrentWorkspaceRecord()).hasAny && !hasGraphClipboardData()) {
      appendCreateMenuItem({
        label: "No selection actions",
        disabled: true
      });
    } else {
      appendSelectionMenuActions({ includePaste: true });
    }
  } else {
    CREATE_NODE_MENU_ITEMS.forEach((menuItem) => {
      appendCreateMenuItem({
        label: menuItem.label,
        onClick: () => {
          const createdNode = createNodeAtWorldPosition(menuItem.type, createNodeMenuWorldX, createNodeMenuWorldY);
          closeCreateNodeMenu();
          if (createdNode && createdNode.type === "portal") {
            openPortalLinkModal(createdNode.id, { flow: "create" });
          } else if (createdNode && createdNode.type === "entity") {
            openEntityLinkModal(createdNode.id, { flow: "create" });
          }
        }
      });
    });
    if (hasGraphClipboardData()) {
      appendCreateMenuSeparator();
      appendClipboardPasteMenuActions();
    }
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
  createNodeMenuEdgeId = null;
  createNodeMenuSelectionContext = { kind: "create", nodeId: null, edgeId: null };
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

async function persistStoreSnapshot(payload) {
  if (activeStoreMode === STORE_MODE_LOCAL) {
    writeStorePayloadToLocalStorage(payload);
    return;
  }
  await persistStoreSnapshotToServer(payload);
}

function getPersistFailureMessage() {
  if (activeStoreMode === STORE_MODE_LOCAL) {
    return "Failed to save data to browser local storage.";
  }
  return `Failed to save data to ${STORE_API_ENDPOINT}.`;
}

function persistStoreToLocalStorage() {
  let payload = null;
  try {
    refreshAllHandoverDerivedState();
    pruneNotificationStateByUser();
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
        await persistStoreSnapshot(payload);
        if (persistErrorMessage) {
          persistErrorMessage = "";
          renderPersistStatusBanner();
        }
      } catch (error) {
        persistErrorMessage = getPersistFailureMessage();
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

  rememberCurrentWorkspaceViewport({ persist: true });
  currentWorkspaceId = id;
  currentWorkspaceKind = "normal";
  invalidateActiveWorkspaceView({ autoFit: "if-missing", clearAppliedWorkspaceId: true });
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
    rememberCurrentWorkspaceViewport({ persist: true });
    setCurrentWorkspaceForCurrentUser();
    if (!currentWorkspaceId) {
      currentWorkspaceKind = "normal";
    }
    invalidateActiveWorkspaceView({ autoFit: "if-missing", clearAppliedWorkspaceId: true });
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
  rememberCurrentWorkspaceViewport({ persist: true });
  setCurrentWorkspaceForCurrentUser();
  invalidateActiveWorkspaceView({ autoFit: "if-missing", clearAppliedWorkspaceId: true });
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
  ensureGraphSelectionState();
  pruneSelectionState();
  const firstSelectableNodeId = getFirstSelectableNodeId(nodes);
  if (!state.selectedNodeId || !nodeById.has(state.selectedNodeId) || !state.selectedNodeIds.has(state.selectedNodeId)) {
    const fallbackSelectedNodeId = state.selectedNodeIds.size
      ? getDeterministicSelectionNodeId(state.selectedNodeIds)
      : firstSelectableNodeId;
    if (state.selectedNodeId !== fallbackSelectedNodeId) {
      resetDetailsEditState();
    }
    state.selectedNodeId = fallbackSelectedNodeId;
  }
  if (state.selectedNodeId) {
    const selectedNode = getNodeById(state.selectedNodeId);
    if (!isSelectableNode(selectedNode)) {
      state.selectedNodeId = firstSelectableNodeId;
      resetDetailsEditState();
    }
  }
  if (state.selectedNodeId) {
    state.selectedNodeIds.add(state.selectedNodeId);
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
  const previousVisiblePositionsByNodeId = new Map();
  const canReusePreviousVisiblePositions = !!workspaceRecord && appliedWorkspaceId === workspaceRecord.id;
  nodeById.forEach((node, nodeId) => {
    if (!hasFiniteGraphPosRecord(node)) return;
    previousVisiblePositionsByNodeId.set(nodeId, {
      x: node.graphPos.x,
      y: node.graphPos.y
    });
  });
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

  visibleNodeMap.forEach((node, nodeId) => {
    const workspacePos = getWorkspaceNodePos(workspaceRecord.id, nodeId, { allowLegacyFallback: false });
    if (workspacePos) {
      node.graphPos = { x: workspacePos.x, y: workspacePos.y };
      return;
    }
    const previousPos = canReusePreviousVisiblePositions
      ? previousVisiblePositionsByNodeId.get(nodeId)
      : null;
    if (previousPos) {
      node.graphPos = { x: previousPos.x, y: previousPos.y };
    }
  });

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
    const MARQUEE_DRAG_THRESHOLD_PX = 4;
    const EDGE_HANDLE_BORDER_HIT_PX = 14;
    const EDGE_HANDLE_BORDER_HIT_PORTAL_PX = 8;
    const EDGE_HANDLE_BORDER_HIT_ENTITY_PX = 10;
    const EDGE_HANDLE_INTENT_DELAY_MS = 140;
    const EDGE_HANDLE_INTENT_MOVE_PX = 5;
    const EDGE_ACTION_INTENT_DELAY_MS = 140;
    const EDGE_ACTION_HIDE_GRACE_MS = 180;
    const EDGE_ACTION_BUTTON_OFFSET_PX = 20;
    const EDGE_CHEVRON_T = 0.5;
    const HANDOVER_PORTAL_BADGE_SIZE_PX = 18;
    const HANDOVER_PORTAL_BADGE_OVERLAP_RADIUS_RATIO = 0.32;
    const HANDOVER_PORTAL_BADGE_HIT_PADDING_PX = 3;
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
      nodeIds: [],
      cardEl: null,
      startFramesByNodeId: new Map(),
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
    let marqueeSelectionState = {
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
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
    const marqueeSelectionBoxEl = document.createElement("div");
    marqueeSelectionBoxEl.id = "marqueeSelectBox";
    marqueeSelectionBoxEl.className = "marquee-select-box hidden";
    if (viewportEl) {
      viewportEl.appendChild(marqueeSelectionBoxEl);
    }
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
    const collabShellModeBtnEl = document.getElementById("collabShellModeBtn");
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
    let lastVisibleEdgeScreenBounds = new Map();
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

    window.addEventListener("resize", () => {
      if (!state.notificationsOpen) return;
      clampNotificationsPanelToViewport();
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

    if (collabShellModeBtnEl) {
      collabShellModeBtnEl.addEventListener("click", () => {
        applyLayoutModeFromButton("collab-shell");
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
      if (beginMarqueeSelection(event)) return;
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
      const shouldRedrawEdges = pendingEdgeRedraw || shouldRenderCamera;
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
              rememberCurrentWorkspaceViewport({ persist: true });
              currentUserId = user.id;
              setCurrentWorkspaceForCurrentUser();
              invalidateActiveWorkspaceView({ autoFit: "if-missing", clearAppliedWorkspaceId: true });
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
              navigateToWorkspaceById(workspace.id);
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
      const zoom = getCameraZoom();
      worldEl.style.transform = "none";
      worldEl.style.transformOrigin = "0 0";
      worldEl.style.setProperty("--camera-zoom", String(zoom));
      if (edgesLayerEl) {
        edgesLayerEl.style.setProperty("--camera-zoom", String(zoom));
      }
      applyProjectedFramesToVisibleGraph();
      updateEdgeCreateHandleVisual();
      updateEdgeActionMenuVisual();
      if (state.openLenses && state.openLenses.size > 0) {
        renderLenses();
      }
      updateViewportGridBackground();
    }

    function getCameraZoom() {
      return Number.isFinite(camera.zoom) && camera.zoom > 0 ? camera.zoom : 1;
    }

    function rememberViewportFromCamera(options = {}) {
      if (!currentWorkspaceId || !currentUserId) return false;
      return rememberCurrentWorkspaceViewport(options);
    }

    function applyCameraState(nextState, options = {}) {
      const resolvedZoom = clamp(Number(nextState?.zoom), ZOOM_MIN, ZOOM_MAX);
      const resolvedPanX = Number(nextState?.panX);
      const resolvedPanY = Number(nextState?.panY);
      if (!Number.isFinite(resolvedZoom) || !Number.isFinite(resolvedPanX) || !Number.isFinite(resolvedPanY)) {
        return false;
      }
      camera.zoom = resolvedZoom;
      camera.panX = resolvedPanX;
      camera.panY = resolvedPanY;
      if (options.rememberViewport !== false) {
        rememberViewportFromCamera({ persist: options.persistViewport !== false });
      }
      requestRender({ edges: options.edges !== false });
      return true;
    }

    function restoreRememberedViewportForWorkspace(workspaceRecord) {
      const rememberedViewport = getWorkspaceViewportRecordForUser(workspaceRecord, currentUserId);
      if (!rememberedViewport) return false;
      return applyCameraState(rememberedViewport, { edges: true, rememberViewport: false, persistViewport: false });
    }

    function screenDeltaToWorld(dxScreen, dyScreen) {
      const zoom = getCameraZoom();
      return {
        dxWorld: dxScreen / zoom,
        dyWorld: dyScreen / zoom
      };
    }

    function screenToWorld(screenX, screenY) {
      const zoom = getCameraZoom();
      return {
        worldX: (screenX - camera.panX) / zoom,
        worldY: (screenY - camera.panY) / zoom
      };
    }

    function worldToScreen(worldX, worldY) {
      const zoom = getCameraZoom();
      return {
        screenX: camera.panX + (worldX * zoom),
        screenY: camera.panY + (worldY * zoom)
      };
    }

    function projectRect(worldFrame) {
      if (!worldFrame) return { x: 0, y: 0, w: 0, h: 0 };
      const topLeft = worldToScreen(worldFrame.x, worldFrame.y);
      const zoom = getCameraZoom();
      return {
        x: topLeft.screenX,
        y: topLeft.screenY,
        w: worldFrame.w * zoom,
        h: worldFrame.h * zoom
      };
    }

    function applyCardZoomTokens(cardEl, zoom) {
      if (!cardEl) return;
      cardEl.style.setProperty("--camera-zoom", String(zoom));
      cardEl.style.setProperty("--graph-node-text-inset", `${GRAPH_NODE_TEXT_INSET_PX * zoom}px`);
      cardEl.style.setProperty("--node-card-radius", `${16 * zoom}px`);
    }

    function applyProjectedFrameToNodeCard(cardEl, node, worldFrame, options = {}) {
      if (!(cardEl instanceof HTMLElement) || !node || !worldFrame) return;
      const screenFrame = projectRect(worldFrame);
      const zoom = getCameraZoom();

      cardEl.style.left = `${screenFrame.x}px`;
      cardEl.style.top = `${screenFrame.y}px`;
      cardEl.style.width = `${screenFrame.w}px`;
      cardEl.style.height = `${screenFrame.h}px`;
      applyCardZoomTokens(cardEl, zoom);

      if (isWorkspaceAnchorNode(node)) {
        const anchorBody = cardEl.querySelector(".node-anchor-body");
        if (anchorBody instanceof HTMLElement) {
          anchorBody.style.left = "0px";
          anchorBody.style.top = "0px";
          anchorBody.style.width = `${screenFrame.w}px`;
          anchorBody.style.height = `${screenFrame.h}px`;
        }
        const hoverLabel = cardEl.querySelector(".node-portal-hover-label");
        if (hoverLabel instanceof HTMLElement) {
          hoverLabel.style.left = `${screenFrame.w / 2}px`;
          hoverLabel.style.top = `${-PORTAL_LABEL_GAP_PX * zoom}px`;
        }
      } else if (node.type === "portal") {
        const expandedLocationId =
          state.expandedCanvasLocationId && lastVisibleNodeIds.has(state.expandedCanvasLocationId)
            ? state.expandedCanvasLocationId
            : null;
        const bodyWorldFrame = getPortalBodyFrameFromWrapperFrame(node, worldFrame, expandedLocationId);
        const bodyScreenFrame = projectRect(bodyWorldFrame);
        const bodyOffsetLeft = bodyScreenFrame.x - screenFrame.x;
        const bodyOffsetTop = bodyScreenFrame.y - screenFrame.y;
        const portalBody = cardEl.querySelector(".node-portal-body");
        if (portalBody instanceof HTMLElement) {
          portalBody.style.left = `${bodyOffsetLeft}px`;
          portalBody.style.top = `${bodyOffsetTop}px`;
          portalBody.style.width = `${bodyScreenFrame.w}px`;
          portalBody.style.height = `${bodyScreenFrame.h}px`;
        }
        const hoverLabel = cardEl.querySelector(".node-portal-hover-label");
        if (hoverLabel instanceof HTMLElement) {
          hoverLabel.style.left = `${bodyOffsetLeft + (bodyScreenFrame.w / 2)}px`;
          hoverLabel.style.top = `${bodyOffsetTop - (PORTAL_LABEL_GAP_PX * zoom)}px`;
        }
      } else if (node.type === "entity") {
        const visualDiamondFrame = getEntityVisualDiamondFrame(screenFrame);
        const squareSide = Math.max(1, visualDiamondFrame.w / Math.SQRT2);
        cardEl.style.setProperty("--entity-shape-size", `${squareSide}px`);
      } else if (node.type === "collaboration") {
        const collaborationBody = cardEl.querySelector(".node-collaboration-body");
        if (collaborationBody instanceof HTMLElement) {
          collaborationBody.style.left = "0px";
          collaborationBody.style.top = "0px";
          collaborationBody.style.width = `${screenFrame.w}px`;
          collaborationBody.style.height = `${screenFrame.h}px`;
        }
      }

      if (node.type === "location" && isLocationCardExpanded(node.id)) {
        const expandedMetrics = getExpandedLocationMetrics(node);
        const childContainer = cardEl.querySelector(".node-children-container");
        if (childContainer instanceof HTMLElement) {
          const innerWidthPx = expandedMetrics.innerWidthPx * zoom;
          const innerHeightPx = expandedMetrics.innerHeightPx * zoom;
          childContainer.style.height = `${innerHeightPx}px`;
          updateChildMarkerSizes(childContainer, innerWidthPx, innerHeightPx);
        }
        const resizeHandle = cardEl.querySelector(".node-resize-handle");
        if (resizeHandle instanceof HTMLElement) {
          const handleSize = RESIZE_HANDLE_SIZE * zoom;
          const inset = 6 * zoom;
          resizeHandle.style.width = `${handleSize}px`;
          resizeHandle.style.height = `${handleSize}px`;
          resizeHandle.style.right = `${inset}px`;
          resizeHandle.style.bottom = `${inset}px`;
        }
      }

      if (options.updatePortalCache !== false && node.type === "portal") {
        const expandedLocationId =
          state.expandedCanvasLocationId && lastVisibleNodeIds.has(state.expandedCanvasLocationId)
            ? state.expandedCanvasLocationId
            : null;
        lastVisibleNodeBodyFrames.set(
          node.id,
          getPortalBodyFrameFromWrapperFrame(node, worldFrame, expandedLocationId)
        );
      }
    }

    function applyProjectedFramesToVisibleGraph() {
      if (!lastRenderedCardsById || !lastRenderedCardsById.size) return;
      lastRenderedCardsById.forEach((cardEl, nodeId) => {
        const node = getNodeById(nodeId);
        const worldFrame = lastVisibleNodeFrames.get(nodeId);
        if (!node || !worldFrame) return;
        applyProjectedFrameToNodeCard(cardEl, node, worldFrame);
      });
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

    function getClampedViewportPointFromClient(clientX, clientY) {
      if (!viewportEl) return { x: 0, y: 0 };
      const viewportRect = viewportEl.getBoundingClientRect();
      const x = clamp(clientX - viewportRect.left, 0, Math.max(0, viewportRect.width));
      const y = clamp(clientY - viewportRect.top, 0, Math.max(0, viewportRect.height));
      return { x, y };
    }

    function getMarqueeSelectionRect() {
      const left = Math.min(marqueeSelectionState.startX, marqueeSelectionState.currentX);
      const top = Math.min(marqueeSelectionState.startY, marqueeSelectionState.currentY);
      const right = Math.max(marqueeSelectionState.startX, marqueeSelectionState.currentX);
      const bottom = Math.max(marqueeSelectionState.startY, marqueeSelectionState.currentY);
      return {
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top
      };
    }

    function updateMarqueeSelectionBoxVisual() {
      if (!marqueeSelectionBoxEl) return;
      if (!marqueeSelectionState.active || !marqueeSelectionState.moved) {
        marqueeSelectionBoxEl.classList.add("hidden");
        return;
      }
      const rect = getMarqueeSelectionRect();
      marqueeSelectionBoxEl.classList.remove("hidden");
      marqueeSelectionBoxEl.style.left = `${rect.left}px`;
      marqueeSelectionBoxEl.style.top = `${rect.top}px`;
      marqueeSelectionBoxEl.style.width = `${rect.width}px`;
      marqueeSelectionBoxEl.style.height = `${rect.height}px`;
    }

    function clearMarqueeSelectionState() {
      marqueeSelectionState = {
        active: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        moved: false
      };
      if (marqueeSelectionBoxEl) {
        marqueeSelectionBoxEl.classList.add("hidden");
      }
    }

    function beginMarqueeSelection(event) {
      if (!viewportEl || !event || event.button !== 0) return false;
      if (!isMultiSelectModifier(event)) return false;
      if (portalLinkModalState.open || entityLinkModalState.open) return false;
      if (event.target instanceof Element && isInteractiveDragBlockTarget(event.target)) {
        return false;
      }
      const startPoint = getClampedViewportPointFromClient(event.clientX, event.clientY);
      marqueeSelectionState = {
        active: true,
        startX: startPoint.x,
        startY: startPoint.y,
        currentX: startPoint.x,
        currentY: startPoint.y,
        moved: false
      };
      cancelEdgeCreateInteractions();
      closeCreateNodeMenu();
      clearEdgeHoverIntent();
      clearEdgeCreateHover();
      clearEdgeActionIntent();
      if (!edgeActionPinned) {
        hideEdgeActionMenu({ clearIntent: false });
      }
      isPanning = false;
      updateMarqueeSelectionBoxVisual();
      event.preventDefault();
      event.stopPropagation();
      return true;
    }

    function updateMarqueeSelectionDrag(event) {
      if (!marqueeSelectionState.active || !event) return false;
      const point = getClampedViewportPointFromClient(event.clientX, event.clientY);
      marqueeSelectionState.currentX = point.x;
      marqueeSelectionState.currentY = point.y;
      if (!marqueeSelectionState.moved) {
        const dx = Math.abs(marqueeSelectionState.currentX - marqueeSelectionState.startX);
        const dy = Math.abs(marqueeSelectionState.currentY - marqueeSelectionState.startY);
        marqueeSelectionState.moved = dx > MARQUEE_DRAG_THRESHOLD_PX || dy > MARQUEE_DRAG_THRESHOLD_PX;
      }
      updateMarqueeSelectionBoxVisual();
      return true;
    }

    function resolveMarqueeIntersectedNodeIds(rect) {
      if (!rect) return [];
      const nodeIds = [];
      lastVisibleNodeFrames.forEach((frame, nodeId) => {
        if (!lastVisibleNodeIds.has(nodeId)) return;
        const nodeRect = projectRect(frame);
        const intersects = intersectsRect(
          rect,
          {
            left: nodeRect.x,
            top: nodeRect.y,
            right: nodeRect.x + nodeRect.w,
            bottom: nodeRect.y + nodeRect.h
          }
        );
        if (intersects) {
          nodeIds.push(nodeId);
        }
      });
      return nodeIds;
    }

    function resolveMarqueeIntersectedEdgeIds(rect) {
      if (!rect) return [];
      const edgeIds = [];
      lastVisibleEdgeScreenBounds.forEach((bounds, edgeId) => {
        if (intersectsRect(rect, bounds)) {
          edgeIds.push(edgeId);
        }
      });
      return edgeIds;
    }

    function finalizeMarqueeSelection(event) {
      if (!marqueeSelectionState.active) return false;
      if (event && event.clientX !== undefined && event.clientY !== undefined) {
        updateMarqueeSelectionDrag(event);
      }
      const hadMove = marqueeSelectionState.moved;
      if (!hadMove) {
        clearMarqueeSelectionState();
        return false;
      }
      let selectionChanged = false;
      let nodeSelectionChanged = false;
      const marqueeRect = getMarqueeSelectionRect();
      const intersectedNodeIds = resolveMarqueeIntersectedNodeIds(marqueeRect);
      const intersectedEdgeIds = resolveMarqueeIntersectedEdgeIds(marqueeRect);
      nodeSelectionChanged = addNodesToSelection(intersectedNodeIds);
      const edgeSelectionChanged = addEdgesToSelection(intersectedEdgeIds);
      selectionChanged = nodeSelectionChanged || edgeSelectionChanged;
      clearMarqueeSelectionState();
      if (selectionChanged) {
        renderNodeLists();
        renderCanvas();
        if (nodeSelectionChanged) {
          renderDetailsPane();
        }
      }
      if (event) {
        event.preventDefault();
      }
      return true;
    }

    function applyZoomAtCursor(mx, my, zoomMultiplier) {
      const currentZoom = getCameraZoom();
      const worldAtCursor = screenToWorld(mx, my);
      const nextZoom = clamp(currentZoom * zoomMultiplier, ZOOM_MIN, ZOOM_MAX);
      camera.zoom = nextZoom;
      camera.panX = mx - (worldAtCursor.worldX * nextZoom);
      camera.panY = my - (worldAtCursor.worldY * nextZoom);
      rememberViewportFromCamera({ persist: true });
      requestRender({ edges: false });
    }

function hasAnyGraphSelection() {
  ensureGraphSelectionState();
  return state.selectedNodeIds.size > 0 || state.selectedEdgeIds.size > 0;
}

function selectContextTargetForMenu(nodeId, edgeId) {
  if (nodeId) {
    if (!state.selectedNodeIds.has(nodeId) || state.selectedNodeIds.size + state.selectedEdgeIds.size <= 1) {
      selectSingleNode(nodeId);
      return true;
    }
    return false;
  }
  if (edgeId) {
    if (!state.selectedEdgeIds.has(edgeId) || state.selectedNodeIds.size + state.selectedEdgeIds.size <= 1) {
      selectSingleEdge(edgeId, { preserveNodes: false });
      return true;
    }
    return false;
  }
  return false;
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
  const edgeId = nodeId ? null : getEdgeIdFromTarget(event.target);
  const worldPoint = getWorldPointFromClient(event.clientX, event.clientY);

  if (nodeId || edgeId) {
    event.preventDefault();
    event.stopPropagation();
    const selectionChanged = selectContextTargetForMenu(nodeId, edgeId);
    if (selectionChanged) {
      renderNodeLists();
      renderCanvas();
      renderDetailsPane();
    }
    if (nodeId) {
      openNodeActionMenu(event.clientX, event.clientY, nodeId, worldPoint.worldX, worldPoint.worldY);
    } else {
      openSelectionActionMenu(event.clientX, event.clientY, worldPoint.worldX, worldPoint.worldY, {
        kind: "edge",
        edgeId
      });
    }
    return;
  }

  if (hasAnyGraphSelection()) {
    event.preventDefault();
    event.stopPropagation();
    openSelectionActionMenu(event.clientX, event.clientY, worldPoint.worldX, worldPoint.worldY, {
      kind: "selection"
    });
    return;
  }

  if (!shouldOpenCreateNodeMenuForTarget(event.target)) {
    closeCreateNodeMenu();
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  openCreateNodeMenu(event.clientX, event.clientY, worldPoint.worldX, worldPoint.worldY);
}

function onViewportMouseDown(event) {
  if (event.button !== 0) return;
  if (portalLinkModalState.open || entityLinkModalState.open) {
    event.preventDefault();
    return;
  }
  if (beginMarqueeSelection(event)) return;
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
      if (beginMarqueeSelection(event)) return;
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

      const dxScreen = event.clientX - resizeState.startClientX;
      const dyScreen = event.clientY - resizeState.startClientY;
      const deltaWorld = screenDeltaToWorld(dxScreen, dyScreen);
      const dxWorld = deltaWorld.dxWorld;
      const dyWorld = deltaWorld.dyWorld;
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

      const currentFrame = lastVisibleNodeFrames.get(resizeNode.id);
      const frameLeft = Number.isFinite(currentFrame?.x) ? currentFrame.x : 0;
      const frameTop = Number.isFinite(currentFrame?.y) ? currentFrame.y : 0;
      const nextWrapperFrame = {
        x: frameLeft,
        y: frameTop,
        w: nextCardWidth,
        h: nextCardHeight
      };
      lastVisibleNodeFrames.set(resizeNode.id, nextWrapperFrame);
      if (resizeState.cardEl) {
        applyProjectedFrameToNodeCard(resizeState.cardEl, resizeNode, nextWrapperFrame);
      }

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
      if (beginMarqueeSelection(event)) return;
      if (resizeState.isResizing) return;
      if (isInteractiveDragBlockTarget(event.target)) return;
      const node = getNodeById(nodeId);
      if (!node || !cardEl) return;
      const shouldDragSelection = state.selectedNodeIds.size > 1 && state.selectedNodeIds.has(nodeId);
      const candidateNodeIds = shouldDragSelection
        ? [...state.selectedNodeIds]
          .filter((selectedNodeId) => {
            const selectedNode = getNodeById(selectedNodeId);
            return !!selectedNode && isSelectableNode(selectedNode) && !!lastVisibleNodeFrames.get(selectedNodeId);
          })
        : [nodeId];
      const startFramesByNodeId = new Map();
      candidateNodeIds.forEach((candidateNodeId) => {
        const frame = lastVisibleNodeFrames.get(candidateNodeId);
        if (!frame) return;
        startFramesByNodeId.set(candidateNodeId, {
          x: frame.x,
          y: frame.y,
          w: frame.w,
          h: frame.h
        });
      });
      const dragNodeIds = [...startFramesByNodeId.keys()];
      if (!dragNodeIds.length) return;
      const primaryFrame = startFramesByNodeId.get(nodeId) || startFramesByNodeId.get(dragNodeIds[0]);
      dragState = {
        isDragging: true,
        nodeId,
        nodeIds: dragNodeIds,
        cardEl,
        startFramesByNodeId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startLeft: Number.isFinite(primaryFrame?.x) ? primaryFrame.x : 0,
        startTop: Number.isFinite(primaryFrame?.y) ? primaryFrame.y : 0,
        moved: false
      };
      cancelEdgeCreateInteractions();
      isPanning = false;
      dragNodeIds.forEach((dragNodeId) => {
        const dragCardEl = lastRenderedCardsById.get(dragNodeId);
        if (dragCardEl) {
          dragCardEl.classList.add("dragging");
        }
      });
      event.preventDefault();
      event.stopPropagation();
    }

    function updateDraggedNodePosition(event) {
      if (!dragState.isDragging) return false;
      const dxScreen = event.clientX - dragState.startClientX;
      const dyScreen = event.clientY - dragState.startClientY;
      const deltaWorld = screenDeltaToWorld(dxScreen, dyScreen);
      const dxWorld = deltaWorld.dxWorld;
      const dyWorld = deltaWorld.dyWorld;
      const activeExpandedRoot = state.expandedCanvasLocationId;
      dragState.nodeIds.forEach((dragNodeId) => {
        const draggedNode = getNodeById(dragNodeId);
        if (!draggedNode) return;
        const startFrame = dragState.startFramesByNodeId.get(dragNodeId);
        const fallbackSize = getCardSize(draggedNode, state.expandedCanvasLocationId);
        const nextLeft = (Number.isFinite(startFrame?.x) ? startFrame.x : dragState.startLeft) + dxWorld;
        const nextTop = (Number.isFinite(startFrame?.y) ? startFrame.y : dragState.startTop) + dyWorld;
        const nextWrapperFrame = {
          x: nextLeft,
          y: nextTop,
          w: startFrame?.w || fallbackSize.width,
          h: startFrame?.h || fallbackSize.height
        };
        const dragCardEl = lastRenderedCardsById.get(dragNodeId);
        if (dragCardEl) {
          applyProjectedFrameToNodeCard(dragCardEl, draggedNode, nextWrapperFrame);
        }
        if (draggedNode.type === "portal") {
          const nextBodyFrame = getPortalBodyFrameFromWrapperFrame(
            draggedNode,
            nextWrapperFrame,
            state.expandedCanvasLocationId
          );
          const nextCenter = getNodeVisualCenter(draggedNode, nextBodyFrame);
          draggedNode.graphPos = {
            x: nextCenter.x,
            y: nextCenter.y
          };
          lastVisibleNodeBodyFrames.set(dragNodeId, nextBodyFrame);
        } else {
          draggedNode.graphPos = {
            x: nextLeft + (fallbackSize.width / 2),
            y: nextTop + (fallbackSize.height / 2)
          };
          lastVisibleNodeBodyFrames.delete(dragNodeId);
        }
        lastVisibleNodeFrames.set(dragNodeId, nextWrapperFrame);

        if (activeExpandedRoot) {
          if (state.expandedDragRootId !== activeExpandedRoot) {
            state.expandedDragRootId = activeExpandedRoot;
            state.expandedDragOverrides = new Map();
          }
          if (draggedNode.type === "portal") {
            const bodyFrame = lastVisibleNodeBodyFrames.get(dragNodeId)
              || getPortalBodyFrameFromWrapperFrame(draggedNode, nextWrapperFrame, activeExpandedRoot);
            state.expandedDragOverrides.set(dragNodeId, { left: bodyFrame.x, top: bodyFrame.y });
          } else {
            state.expandedDragOverrides.set(dragNodeId, { left: nextLeft, top: nextTop });
          }
        }
      });

      if (Math.abs(dxScreen) > DRAG_CLICK_SUPPRESS_THRESHOLD || Math.abs(dyScreen) > DRAG_CLICK_SUPPRESS_THRESHOLD) {
        dragState.moved = true;
      }

      scheduleEdgeRedraw();
      event.preventDefault();
      return true;
    }

    function stopNodeDrag() {
      if (!dragState.isDragging) return;
      dragState.nodeIds.forEach((dragNodeId) => {
        const dragCardEl = lastRenderedCardsById.get(dragNodeId);
        if (dragCardEl) {
          dragCardEl.classList.remove("dragging");
        }
      });
      if (dragState.moved && dragState.nodeId) {
        suppressClickNodeId = dragState.nodeId;
        const workspaceRecord = getCurrentWorkspaceRecord();
        if (workspaceRecord) {
          persistWorkspaceNodePositions(workspaceRecord, dragState.nodeIds, {
            syncWorkspace: true,
            persist: true
          });
        }
      }
      dragState = {
        isDragging: false,
        nodeId: null,
        nodeIds: [],
        cardEl: null,
        startFramesByNodeId: new Map(),
        startClientX: 0,
        startClientY: 0,
        startLeft: 0,
        startTop: 0,
        moved: false
      };
    }

    function onWindowMouseMove(event) {
      if (updateMarqueeSelectionDrag(event)) {
        event.preventDefault();
        return;
      }
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
      rememberViewportFromCamera({ persist: true });
      requestRender({ edges: false });
      event.preventDefault();
    }

    function onWindowMouseUp(event) {
      if (finalizeMarqueeSelection(event)) return;
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
      const zoom = getCameraZoom();
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
          Math.round(6 * zoom),
          Math.round(14 * zoom)
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

    function buildVisibleNeighborIdsMap(visibleNodeIds) {
      const visibleIdSet = new Set(visibleNodeIds);
      const neighborIdsByNodeId = new Map();
      visibleIdSet.forEach((nodeId) => {
        neighborIdsByNodeId.set(nodeId, new Set());
      });
      edges.forEach((edge) => {
        if (!edge || !visibleIdSet.has(edge.sourceId) || !visibleIdSet.has(edge.targetId)) return;
        neighborIdsByNodeId.get(edge.sourceId).add(edge.targetId);
        neighborIdsByNodeId.get(edge.targetId).add(edge.sourceId);
      });
      return neighborIdsByNodeId;
    }

    function placeMissingNodePositionsLocally(visibleNodeIds) {
      if (!visibleNodeIds || !visibleNodeIds.size) return false;
      const visibleIdSet = new Set(visibleNodeIds);
      const neighborIdsByNodeId = buildVisibleNeighborIdsMap(visibleIdSet);
      const positionedEntries = [];
      const missingNodes = [];

      visibleIdSet.forEach((nodeId) => {
        const node = getNodeById(nodeId);
        if (!node) return;
        if (hasValidGraphPos(node)) {
          positionedEntries.push({
            id: node.id,
            x: node.graphPos.x,
            y: node.graphPos.y,
            radius: getNodePlacementCollisionRadius(node)
          });
        } else {
          missingNodes.push(node);
        }
      });
      if (!missingNodes.length) return false;

      missingNodes.sort(compareNodesStable);
      let changed = false;
      missingNodes.forEach((node) => {
        const neighborNodes = [...(neighborIdsByNodeId.get(node.id) || [])]
          .map((neighborId) => getNodeById(neighborId))
          .filter((neighborNode) => hasValidGraphPos(neighborNode));
        let basePos = null;
        if (neighborNodes.length) {
          const total = neighborNodes.reduce((acc, neighborNode) => {
            acc.x += neighborNode.graphPos.x;
            acc.y += neighborNode.graphPos.y;
            return acc;
          }, { x: 0, y: 0 });
          basePos = {
            x: total.x / neighborNodes.length,
            y: total.y / neighborNodes.length
          };
        } else if (positionedEntries.length) {
          const total = positionedEntries.reduce((acc, entry) => {
            acc.x += entry.x;
            acc.y += entry.y;
            return acc;
          }, { x: 0, y: 0 });
          basePos = {
            x: total.x / positionedEntries.length,
            y: total.y / positionedEntries.length
          };
        } else if (currentWorkspaceKind === "collab") {
          basePos = getDefaultCollaborationGraphPos(getCurrentWorkspaceRecord(), node.id);
        } else {
          basePos = { x: 0, y: 0 };
        }

        const radius = getNodePlacementCollisionRadius(node);
        const nextPos = resolveNonOverlappingGraphPos(basePos, radius, positionedEntries, node.id);
        node.graphPos = { x: nextPos.x, y: nextPos.y };
        positionedEntries.push({
          id: node.id,
          x: nextPos.x,
          y: nextPos.y,
          radius
        });
        changed = true;
      });
      return changed;
    }

    function getVisibleNodeIdsForCurrentView() {
      return computeVisibleSet(state.expandedCanvasLocationId).visibleNodeIds;
    }

    function renderLayoutControls() {
      const expanded = state.expandedCanvasLocationId !== null;
      const disabled = expanded;
      const disabledTitle = "Switch to global view to change layout mode";
      if (forceModeBtnEl) {
        forceModeBtnEl.disabled = disabled;
        forceModeBtnEl.classList.toggle("is-active", layoutMode === "force");
        forceModeBtnEl.title = disabled ? disabledTitle : "Force layout";
      }
      if (hybridModeBtnEl) {
        hybridModeBtnEl.disabled = disabled;
        hybridModeBtnEl.classList.toggle("is-active", layoutMode === "hybrid");
        hybridModeBtnEl.title = disabled ? disabledTitle : "Hybrid layout";
      }
      if (collabShellModeBtnEl) {
        collabShellModeBtnEl.disabled = disabled;
        collabShellModeBtnEl.classList.toggle("is-active", layoutMode === "collab-shell");
        collabShellModeBtnEl.title = disabled ? disabledTitle : "Collaboration shell layout";
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

    function normalizeRadians(value) {
      if (!Number.isFinite(value)) return normalizeRadians(COLLAB_SHELL_START_ANGLE_RAD);
      const tau = Math.PI * 2;
      let normalized = value % tau;
      if (normalized < 0) {
        normalized += tau;
      }
      return normalized;
    }

    function compareNodeEntriesStable(a, b) {
      const typeDiff = compareNodesStable(a.node, b.node);
      if (typeDiff !== 0) return typeDiff;
      return a.id.localeCompare(b.id);
    }

    function getLinkEndpointId(endpoint) {
      if (typeof endpoint === "string") return endpoint;
      if (endpoint && typeof endpoint === "object" && typeof endpoint.id === "string") return endpoint.id;
      return null;
    }

    function getCollaborationShellRole(node, workspaceRecord, projectionMeta = null) {
      if (!node) return "other";
      if (node.type === "collaboration" || workspaceRecord?.homeNodeId === node.id) {
        return "anchor";
      }
      const meta = projectionMeta || getCurrentProjectionNodeMeta(node.id) || null;
      const roles = Array.isArray(meta?.roles) ? meta.roles : [];
      if (node.type === "handover") return "handover";
      if (roles.includes("handover-object")) return "artifact";
      if (node.type === "entity") return "entity";
      return "other";
    }

    function getCollaborationEntityKind(entry) {
      const normalizedFromNode = normalizeEntityKind(entry?.node?.entityKind);
      if (normalizedFromNode) return normalizedFromNode;
      const collaboratorKinds = Array.isArray(entry?.projectionMeta?.collaboratorKinds)
        ? entry.projectionMeta.collaboratorKinds
        : [];
      for (const rawKind of collaboratorKinds) {
        const normalized = normalizeEntityKind(rawKind);
        if (normalized) return normalized;
      }
      return null;
    }

    function getCollaborationEntityRefId(entry) {
      if (typeof entry?.node?.entityRefId === "string" && entry.node.entityRefId) {
        return entry.node.entityRefId;
      }
      const collaboratorRefIds = Array.isArray(entry?.projectionMeta?.collaboratorRefIds)
        ? entry.projectionMeta.collaboratorRefIds
        : [];
      const firstRefId = collaboratorRefIds.find((refId) => typeof refId === "string" && refId);
      return firstRefId || null;
    }

    function getCollaborationEntityKey(entry) {
      if (!entry || entry.role !== "entity") return null;
      const entityKind = getCollaborationEntityKind(entry);
      const entityRefId = getCollaborationEntityRefId(entry);
      if (entityKind && entityRefId) return `${entityKind}:${entityRefId}`;
      return `entity:${entry.id}`;
    }

    function getCircularMeanAngle(angles) {
      if (!Array.isArray(angles) || !angles.length) return null;
      const totals = angles.reduce((acc, angle) => {
        if (!Number.isFinite(angle)) return acc;
        acc.sin += Math.sin(angle);
        acc.cos += Math.cos(angle);
        acc.count += 1;
        return acc;
      }, { sin: 0, cos: 0, count: 0 });
      if (!totals.count) return null;
      return normalizeRadians(Math.atan2(totals.sin, totals.cos));
    }

    function buildUndirectedPairKey(a, b) {
      return a < b ? `${a}::${b}` : `${b}::${a}`;
    }

    function getUndirectedPairWeight(weightByPairKey, keyA, keyB) {
      if (!weightByPairKey || keyA === keyB) return 0;
      return weightByPairKey.get(buildUndirectedPairKey(keyA, keyB)) || 0;
    }

    function computeCircularArrangementCost(order, weightByPairKey) {
      if (!Array.isArray(order) || order.length <= 1) return 0;
      const total = order.length;
      let score = 0;
      for (let i = 0; i < total; i += 1) {
        for (let j = i + 1; j < total; j += 1) {
          const weight = getUndirectedPairWeight(weightByPairKey, order[i], order[j]);
          if (!weight) continue;
          const directDistance = Math.abs(i - j);
          const circularDistance = Math.min(directDistance, total - directDistance);
          score += weight * circularDistance;
        }
      }
      return score;
    }

    function computeCollaboratorCircularOrder(collaboratorKeys, collaboratorCountByKey, weightByPairKey) {
      const remaining = [...collaboratorKeys]
        .filter((key) => typeof key === "string" && key)
        .sort((a, b) => {
          const diff = (collaboratorCountByKey.get(b) || 0) - (collaboratorCountByKey.get(a) || 0);
          if (diff !== 0) return diff;
          return a.localeCompare(b);
        });
      if (!remaining.length) return [];
      const order = [remaining.shift()];
      while (remaining.length) {
        const currentFirst = order[0];
        const currentLast = order[order.length - 1];
        let best = null;
        remaining.forEach((candidate, index) => {
          const leftWeight = getUndirectedPairWeight(weightByPairKey, candidate, currentFirst);
          const rightWeight = getUndirectedPairWeight(weightByPairKey, candidate, currentLast);
          const attachRight = rightWeight > leftWeight;
          const score = Math.max(leftWeight, rightWeight);
          const count = collaboratorCountByKey.get(candidate) || 0;
          const ranked = {
            index,
            candidate,
            side: attachRight ? "right" : "left",
            score,
            count
          };
          if (
            !best ||
            ranked.score > best.score ||
            (ranked.score === best.score && ranked.count > best.count) ||
            (ranked.score === best.score && ranked.count === best.count && ranked.candidate.localeCompare(best.candidate) < 0)
          ) {
            best = ranked;
          }
        });
        const [nextCandidate] = remaining.splice(best.index, 1);
        if (best.side === "left") {
          order.unshift(nextCandidate);
        } else {
          order.push(nextCandidate);
        }
      }
      if (order.length <= 2) return order;

      let improved = true;
      let iterations = 0;
      while (improved && iterations < 8) {
        improved = false;
        iterations += 1;
        for (let index = 0; index < order.length; index += 1) {
          const nextIndex = (index + 1) % order.length;
          const swapped = [...order];
          const temp = swapped[index];
          swapped[index] = swapped[nextIndex];
          swapped[nextIndex] = temp;
          if (computeCircularArrangementCost(swapped, weightByPairKey) + 0.0001 < computeCircularArrangementCost(order, weightByPairKey)) {
            order.splice(0, order.length, ...swapped);
            improved = true;
          }
        }
      }

      return order;
    }

    function shortestAngleDelta(fromAngle, toAngle) {
      const from = normalizeRadians(fromAngle);
      const to = normalizeRadians(toAngle);
      let delta = to - from;
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;
      return delta;
    }

    function buildCollaborationShellModel(visibleNodeIds, workspaceRecord) {
      const { nodesForSim, linksForSim, modelById } = buildLayoutInput(visibleNodeIds);
      const entryById = new Map();
      const neighborIdsByNodeId = new Map();

      nodesForSim.forEach((simNode) => {
        neighborIdsByNodeId.set(simNode.id, new Set());
      });
      linksForSim.forEach((link) => {
        const sourceId = getLinkEndpointId(link.source);
        const targetId = getLinkEndpointId(link.target);
        if (!sourceId || !targetId || sourceId === targetId) return;
        if (neighborIdsByNodeId.has(sourceId)) neighborIdsByNodeId.get(sourceId).add(targetId);
        if (neighborIdsByNodeId.has(targetId)) neighborIdsByNodeId.get(targetId).add(sourceId);
      });

      const nodeEntries = nodesForSim.map((simNode) => {
        const node = modelById.get(simNode.id);
        const projectionMeta = getCurrentProjectionNodeMeta(simNode.id) || null;
        const role = getCollaborationShellRole(node, workspaceRecord, projectionMeta);
        const entry = {
          id: simNode.id,
          node,
          simNode,
          projectionMeta,
          role,
          collaboratorKey: null,
          handoverRefs: [],
          groupKey: role === "anchor" ? "anchor" : "",
          sectorId: -1,
          localOrder: 0,
          chainDepth: 0,
          seedAngle: normalizeRadians(COLLAB_SHELL_START_ANGLE_RAD),
          depthRadius: 0,
          seedRadius: 0,
          seedX: 0,
          seedY: 0,
          radialOffset: 0
        };
        entryById.set(entry.id, entry);
        return entry;
      });

      const compareEntryIds = (aId, bId) => {
        const entryA = entryById.get(aId);
        const entryB = entryById.get(bId);
        if (!entryA || !entryB) return String(aId).localeCompare(String(bId));
        return compareNodeEntriesStable(entryA, entryB);
      };

      const getSemanticParentCandidateId = (entry) => {
        const rolePriority = {
          entity: 0,
          other: 1,
          handover: 2,
          context: 3,
          anchor: 4,
          artifact: 5
        };
        return [...(neighborIdsByNodeId.get(entry.id) || [])]
          .map((nodeId) => entryById.get(nodeId))
          .filter((candidate) => candidate && candidate.role !== "artifact" && candidate.role !== "anchor")
          .sort((left, right) => {
            const leftPriority = rolePriority[left.role] ?? 99;
            const rightPriority = rolePriority[right.role] ?? 99;
            if (leftPriority !== rightPriority) return leftPriority - rightPriority;
            return compareNodeEntriesStable(left, right);
          })[0]?.id || null;
      };

      nodeEntries.forEach((entry) => {
        const fromMeta = Array.isArray(entry.projectionMeta?.handoverIds)
          ? entry.projectionMeta.handoverIds.filter((candidateId) => entryById.get(candidateId)?.role === "handover")
          : [];
        const fromLinks = [...(neighborIdsByNodeId.get(entry.id) || [])]
          .filter((candidateId) => entryById.get(candidateId)?.role === "handover");
        const resolved = [...new Set([...fromMeta, ...fromLinks])]
          .sort(compareEntryIds);
        entry.handoverRefs = entry.role === "handover"
          ? [entry.id]
          : resolved;
        entry.collaboratorKey = getCollaborationEntityKey(entry);
      });

      const handoverEntries = nodeEntries
        .filter((entry) => entry.role === "handover")
        .sort(compareNodeEntriesStable);

      const handoverParentById = new Map();
      const handoverContextKeyById = new Map();
      const handoverChainSignatureById = new Map();
      const buildHandoverChainSignature = (handoverEntry) => {
        if (!handoverEntry) return "";
        const directEntityIds = [...(neighborIdsByNodeId.get(handoverEntry.id) || [])]
          .filter((candidateId) => entryById.get(candidateId)?.role === "entity");
        const userRefIds = new Set();
        const orgRefIds = new Set();

        const registerEntity = (entityEntry) => {
          if (!entityEntry || entityEntry.role !== "entity") return;
          const entityKind = getCollaborationEntityKind(entityEntry);
          const entityRefId = getCollaborationEntityRefId(entityEntry);
          if (!entityKind || !entityRefId) return;
          if (entityKind === "user") {
            userRefIds.add(entityRefId);
            return;
          }
          if (entityKind === "org") {
            orgRefIds.add(entityRefId);
          }
        };

        directEntityIds.forEach((entityId) => {
          const entityEntry = entryById.get(entityId);
          registerEntity(entityEntry);
          const entityKind = getCollaborationEntityKind(entityEntry);
          if (entityKind !== "user") return;
          [...(neighborIdsByNodeId.get(entityId) || [])]
            .map((candidateId) => entryById.get(candidateId))
            .filter((candidateEntry) => candidateEntry?.role === "entity")
            .forEach((candidateEntry) => {
              if (getCollaborationEntityKind(candidateEntry) !== "org") return;
              registerEntity(candidateEntry);
            });
        });

        const sortedOrgRefs = [...orgRefIds].sort((left, right) => left.localeCompare(right));
        const sortedUserRefs = [...userRefIds].sort((left, right) => left.localeCompare(right));
        if (!sortedOrgRefs.length && !sortedUserRefs.length) return "";
        return `org:${sortedOrgRefs.join(",") || "-"}|user:${sortedUserRefs.join(",") || "-"}`;
      };
      handoverEntries.forEach((handoverEntry) => {
        const semanticParentId = getSemanticParentCandidateId(handoverEntry) || handoverEntry.id;
        const contextNodeId = getHandoverGraphContextNode(handoverEntry.node)?.id || "";
        const chainSignature = buildHandoverChainSignature(handoverEntry);
        handoverParentById.set(handoverEntry.id, semanticParentId);
        handoverContextKeyById.set(handoverEntry.id, contextNodeId);
        handoverChainSignatureById.set(handoverEntry.id, chainSignature || `handover:${handoverEntry.id}`);
        if (chainSignature) {
          handoverEntry.groupKey = `chain:${chainSignature}`;
        } else if (semanticParentId && semanticParentId !== handoverEntry.id) {
          handoverEntry.groupKey = `parent:${semanticParentId}`;
        } else {
          handoverEntry.groupKey = `handover:${handoverEntry.id}`;
        }
      });

      const handoverGroupById = new Map(handoverEntries.map((entry) => [entry.id, entry.groupKey]));
      const pickMostCommonGroupKey = (handoverRefs) => {
        const counts = new Map();
        handoverRefs.forEach((handoverId) => {
          const key = handoverGroupById.get(handoverId);
          if (!key) return;
          counts.set(key, (counts.get(key) || 0) + 1);
        });
        if (!counts.size) return null;
        return [...counts.entries()]
          .sort((left, right) => {
            if (left[1] !== right[1]) return right[1] - left[1];
            return left[0].localeCompare(right[0]);
          })[0][0];
      };

      nodeEntries
        .filter((entry) => entry.role !== "handover" && entry.role !== "anchor")
        .forEach((entry) => {
          const byRefs = pickMostCommonGroupKey(entry.handoverRefs);
          if (byRefs) {
            entry.groupKey = byRefs;
            return;
          }
          const semanticParentId = getSemanticParentCandidateId(entry);
          const semanticParentGroup = semanticParentId ? (entryById.get(semanticParentId)?.groupKey || "") : "";
          if (semanticParentGroup && semanticParentGroup !== "anchor") {
            entry.groupKey = semanticParentGroup;
            return;
          }
          entry.groupKey = `isolated:${entry.id}`;
        });

      const groupByKey = new Map();
      const ensureGroup = (groupKey) => {
        if (!groupByKey.has(groupKey)) {
          groupByKey.set(groupKey, {
            key: groupKey,
            entryIds: [],
            handoverIds: [],
            contextIds: new Set(),
            parentIds: new Set(),
            collaboratorKeys: new Set(),
            roleCounts: {
              entity: 0,
              context: 0,
              handover: 0,
              artifact: 0,
              other: 0
            },
            weight: 1,
            sectorId: -1,
            sectorStart: normalizeRadians(COLLAB_SHELL_START_ANGLE_RAD),
            sectorCenter: normalizeRadians(COLLAB_SHELL_START_ANGLE_RAD),
            sectorSpan: Math.PI * 2
          });
        }
        return groupByKey.get(groupKey);
      };

      nodeEntries
        .filter((entry) => entry.role !== "anchor")
        .forEach((entry) => {
          const group = ensureGroup(entry.groupKey);
          group.entryIds.push(entry.id);
          if (entry.role === "handover") {
            group.handoverIds.push(entry.id);
            const parentId = handoverParentById.get(entry.id);
            if (parentId) group.parentIds.add(parentId);
            const contextKey = handoverContextKeyById.get(entry.id) || "";
            if (contextKey) group.contextIds.add(contextKey);
          }
          if (entry.role === "context") {
            group.contextIds.add(entry.id);
          }
          if (entry.role === "entity") group.roleCounts.entity += 1;
          else if (entry.role === "context") group.roleCounts.context += 1;
          else if (entry.role === "handover") group.roleCounts.handover += 1;
          else if (entry.role === "artifact") group.roleCounts.artifact += 1;
          else group.roleCounts.other += 1;
        });

      const collaboratorKeysByHandoverId = new Map();
      handoverEntries.forEach((handoverEntry) => {
        collaboratorKeysByHandoverId.set(handoverEntry.id, new Set());
      });
      nodeEntries
        .filter((entry) => entry.role === "entity" && entry.collaboratorKey)
        .forEach((entityEntry) => {
          entityEntry.handoverRefs.forEach((handoverId) => {
            if (collaboratorKeysByHandoverId.has(handoverId)) {
              collaboratorKeysByHandoverId.get(handoverId).add(entityEntry.collaboratorKey);
            }
          });
        });
      linksForSim.forEach((link) => {
        const sourceId = getLinkEndpointId(link.source);
        const targetId = getLinkEndpointId(link.target);
        if (!sourceId || !targetId) return;
        const sourceEntry = entryById.get(sourceId);
        const targetEntry = entryById.get(targetId);
        if (!sourceEntry || !targetEntry) return;
        const sourceHandover = sourceEntry.role === "handover" ? sourceEntry : null;
        const targetHandover = targetEntry.role === "handover" ? targetEntry : null;
        const sourceEntity = sourceEntry.role === "entity" ? sourceEntry : null;
        const targetEntity = targetEntry.role === "entity" ? targetEntry : null;
        if (sourceHandover && targetEntity?.collaboratorKey) {
          collaboratorKeysByHandoverId.get(sourceHandover.id)?.add(targetEntity.collaboratorKey);
        } else if (targetHandover && sourceEntity?.collaboratorKey) {
          collaboratorKeysByHandoverId.get(targetHandover.id)?.add(sourceEntity.collaboratorKey);
        }
      });

      handoverEntries.forEach((handoverEntry) => {
        const group = groupByKey.get(handoverEntry.groupKey);
        if (!group) return;
        (collaboratorKeysByHandoverId.get(handoverEntry.id) || []).forEach((collaboratorKey) => {
          group.collaboratorKeys.add(collaboratorKey);
        });
      });

      const groupCountByKey = new Map();
      groupByKey.forEach((group) => {
        group.weight = Math.max(
          1,
          (group.roleCounts.handover * 2) +
          Math.ceil(group.roleCounts.context * 1.2) +
          Math.ceil(group.roleCounts.entity * 0.6) +
          Math.ceil(group.roleCounts.artifact * 0.35) +
          Math.ceil(group.roleCounts.other * 0.25)
        );
        groupCountByKey.set(group.key, group.weight);
      });

      const groupPairWeightByKey = new Map();
      const incrementGroupPairWeight = (groupAKey, groupBKey, amount) => {
        if (!groupAKey || !groupBKey || groupAKey === groupBKey || !(amount > 0)) return;
        const pairKey = buildUndirectedPairKey(groupAKey, groupBKey);
        groupPairWeightByKey.set(pairKey, (groupPairWeightByKey.get(pairKey) || 0) + amount);
      };

      const groupKeys = [...groupByKey.keys()].sort((left, right) => left.localeCompare(right));
      for (let i = 0; i < groupKeys.length; i += 1) {
        const leftGroup = groupByKey.get(groupKeys[i]);
        for (let j = i + 1; j < groupKeys.length; j += 1) {
          const rightGroup = groupByKey.get(groupKeys[j]);
          const sharedCollaboratorCount = [...leftGroup.collaboratorKeys]
            .filter((collaboratorKey) => rightGroup.collaboratorKeys.has(collaboratorKey))
            .length;
          const sharedParentCount = [...leftGroup.parentIds]
            .filter((parentId) => rightGroup.parentIds.has(parentId))
            .length;
          const sharedContextCount = [...leftGroup.contextIds]
            .filter((contextId) => rightGroup.contextIds.has(contextId))
            .length;
          incrementGroupPairWeight(
            leftGroup.key,
            rightGroup.key,
            (sharedCollaboratorCount * 3) + (sharedParentCount * 4) + (sharedContextCount * 1.5)
          );
        }
      }

      linksForSim.forEach((link) => {
        const sourceId = getLinkEndpointId(link.source);
        const targetId = getLinkEndpointId(link.target);
        if (!sourceId || !targetId) return;
        const sourceEntry = entryById.get(sourceId);
        const targetEntry = entryById.get(targetId);
        if (!sourceEntry || !targetEntry) return;
        if (sourceEntry.role === "anchor" || targetEntry.role === "anchor") return;
        if (sourceEntry.role === "artifact" && targetEntry.role === "artifact") return;
        incrementGroupPairWeight(sourceEntry.groupKey, targetEntry.groupKey, 1.2);
      });

      let orderedGroupKeys = computeCollaboratorCircularOrder(groupKeys, groupCountByKey, groupPairWeightByKey);
      if (!orderedGroupKeys.length) {
        orderedGroupKeys = groupKeys;
      } else if (orderedGroupKeys.length !== groupKeys.length) {
        const included = new Set(orderedGroupKeys);
        orderedGroupKeys = [
          ...orderedGroupKeys,
          ...groupKeys.filter((groupKey) => !included.has(groupKey))
        ];
      }

      if (orderedGroupKeys.length) {
        const totalCount = orderedGroupKeys.length;
        let sectorGap = COLLAB_SHELL_SECTOR_GAP_RAD;
        let availableSpan = (Math.PI * 2) - (sectorGap * totalCount);
        if (availableSpan <= 0.001) {
          sectorGap = 0;
          availableSpan = Math.PI * 2;
        }
        const minSectorSpan = Math.min(
          COLLAB_SHELL_MIN_SECTOR_SPAN_RAD,
          availableSpan / Math.max(1, totalCount)
        );
        const minReservedSpan = minSectorSpan * totalCount;
        const extraSpan = Math.max(0, availableSpan - minReservedSpan);
        const totalWeight = orderedGroupKeys.reduce((acc, groupKey) => acc + (groupByKey.get(groupKey)?.weight || 1), 0) || 1;
        let cursor = normalizeRadians(COLLAB_SHELL_START_ANGLE_RAD);
        orderedGroupKeys.forEach((groupKey, index) => {
          const group = groupByKey.get(groupKey);
          if (!group) return;
          const weightedExtra = extraSpan * ((group.weight || 1) / totalWeight);
          const sectorSpan = minSectorSpan + weightedExtra;
          group.sectorId = index;
          group.sectorStart = normalizeRadians(cursor);
          group.sectorCenter = normalizeRadians(cursor + (sectorSpan / 2));
          group.sectorSpan = sectorSpan;
          cursor = normalizeRadians(cursor + sectorSpan + sectorGap);
        });
      }

      const handoverAngleById = new Map();
      groupByKey.forEach((group) => {
        const handoverIds = [...group.handoverIds]
          .filter((handoverId) => entryById.has(handoverId))
          .sort(compareEntryIds);
        if (!handoverIds.length) return;
        const handoverCountMap = new Map();
        const handoverPairWeightByKey = new Map();
        handoverIds.forEach((handoverId) => {
          handoverCountMap.set(handoverId, (collaboratorKeysByHandoverId.get(handoverId) || []).length || 1);
        });
        for (let i = 0; i < handoverIds.length; i += 1) {
          for (let j = i + 1; j < handoverIds.length; j += 1) {
            const leftId = handoverIds[i];
            const rightId = handoverIds[j];
            const leftCollaborators = collaboratorKeysByHandoverId.get(leftId) || new Set();
            const rightCollaborators = collaboratorKeysByHandoverId.get(rightId) || new Set();
            const sharedCollaborators = [...leftCollaborators].filter((key) => rightCollaborators.has(key)).length;
            const sameParent = handoverParentById.get(leftId) && handoverParentById.get(leftId) === handoverParentById.get(rightId);
            const sameContext = handoverContextKeyById.get(leftId) &&
              handoverContextKeyById.get(leftId) === handoverContextKeyById.get(rightId);
            const sameChainSignature = handoverChainSignatureById.get(leftId) &&
              handoverChainSignatureById.get(leftId) === handoverChainSignatureById.get(rightId);
            const directlyLinked = (neighborIdsByNodeId.get(leftId) || new Set()).has(rightId);
            const weight = (sharedCollaborators * 3) + (sameParent ? 3 : 0) + (sameContext ? 1.5 : 0) + (sameChainSignature ? 4 : 0) + (directlyLinked ? 1 : 0);
            if (weight > 0) {
              const pairKey = buildUndirectedPairKey(leftId, rightId);
              handoverPairWeightByKey.set(pairKey, weight);
            }
          }
        }
        let orderedHandoverIds = computeCollaboratorCircularOrder(handoverIds, handoverCountMap, handoverPairWeightByKey);
        if (!orderedHandoverIds.length) orderedHandoverIds = handoverIds;
        const slotCount = orderedHandoverIds.length;
        orderedHandoverIds.forEach((handoverId, index) => {
          const angle = slotCount === 1
            ? group.sectorCenter
            : normalizeRadians(group.sectorStart + ((group.sectorSpan * (index + 1)) / (slotCount + 1)));
          handoverAngleById.set(handoverId, angle);
          const entry = entryById.get(handoverId);
          if (!entry) return;
          entry.seedAngle = angle;
          entry.sectorId = group.sectorId;
          entry.localOrder = index;
        });
      });

      const resolveEntryBaseAngle = (entry, fallbackCenter) => {
        const refAngles = entry.handoverRefs
          .map((handoverId) => handoverAngleById.get(handoverId))
          .filter((angle) => Number.isFinite(angle));
        const meanAngle = getCircularMeanAngle(refAngles);
        if (Number.isFinite(meanAngle)) return meanAngle;
        return normalizeRadians(fallbackCenter);
      };

      groupByKey.forEach((group) => {
        const groupEntries = group.entryIds
          .map((entryId) => entryById.get(entryId))
          .filter(Boolean)
          .sort(compareNodeEntriesStable);

        const contextByRefSignature = new Map();
        groupEntries
          .filter((entry) => entry.role === "context")
          .forEach((entry) => {
            const signature = entry.handoverRefs.length ? entry.handoverRefs.join("|") : `context:${entry.id}`;
            if (!contextByRefSignature.has(signature)) contextByRefSignature.set(signature, []);
            contextByRefSignature.get(signature).push(entry);
          });
        contextByRefSignature.forEach((entries) => {
          const baseAngle = resolveEntryBaseAngle(entries[0], group.sectorCenter);
          entries
            .sort(compareNodeEntriesStable)
            .forEach((entry, index) => {
              const offset = (index - ((entries.length - 1) / 2)) * COLLAB_SHELL_CONTEXT_FAN_STEP_RAD;
              entry.seedAngle = normalizeRadians(baseAngle + offset);
              entry.sectorId = group.sectorId;
            });
        });

        const entitiesByCollaborator = new Map();
        groupEntries
          .filter((entry) => entry.role === "entity")
          .forEach((entry) => {
            const collaboratorKey = entry.collaboratorKey || `entity:${entry.id}`;
            if (!entitiesByCollaborator.has(collaboratorKey)) entitiesByCollaborator.set(collaboratorKey, []);
            entitiesByCollaborator.get(collaboratorKey).push(entry);
          });
        entitiesByCollaborator.forEach((entries) => {
          const baseAngle = resolveEntryBaseAngle(entries[0], group.sectorCenter);
          entries
            .sort(compareNodeEntriesStable)
            .forEach((entry) => {
              entry.seedAngle = normalizeRadians(baseAngle);
              entry.sectorId = group.sectorId;
            });
        });

        const artifactsByHandover = new Map();
        groupEntries
          .filter((entry) => entry.role === "artifact")
          .forEach((entry) => {
            const handoverId = entry.handoverRefs[0] || "";
            const key = handoverId || `artifact:${entry.id}`;
            if (!artifactsByHandover.has(key)) artifactsByHandover.set(key, []);
            artifactsByHandover.get(key).push(entry);
          });
        artifactsByHandover.forEach((entries, key) => {
          const baseAngle = handoverAngleById.get(key) ?? resolveEntryBaseAngle(entries[0], group.sectorCenter);
          entries
            .sort(compareNodeEntriesStable)
            .forEach((entry, index) => {
              const offset = (index - ((entries.length - 1) / 2)) * COLLAB_SHELL_ARTIFACT_FAN_STEP_RAD;
              entry.seedAngle = normalizeRadians(baseAngle + offset);
              entry.sectorId = group.sectorId;
            });
        });

        const otherEntries = groupEntries.filter((entry) => entry.role === "other");
        if (otherEntries.length) {
          otherEntries.forEach((entry, index) => {
            entry.seedAngle = normalizeRadians(
              group.sectorStart + ((group.sectorSpan * (index + 1)) / (otherEntries.length + 1))
            );
            entry.sectorId = group.sectorId;
          });
        }
      });

      const getDepthLayerKey = (entry) => {
        if (entry.role === "entity") {
          return getCollaborationEntityKind(entry) === "org" ? "org" : "user";
        }
        if (entry.role === "context") return "context";
        if (entry.role === "handover") return "handover";
        if (entry.role === "artifact") return "artifact";
        return "other";
      };
      const depthLayerOrder = ["org", "user", "context", "handover", "artifact", "other"];
      const depthLayerBaseGap = {
        org: 48,
        user: 46,
        context: 58,
        handover: 64,
        artifact: 56,
        other: 52
      };
      const getEntryCollisionRadius = (entry) => {
        const collisionRadius = entry?.simNode?.collisionRadius;
        if (Number.isFinite(collisionRadius) && collisionRadius > 0) {
          return collisionRadius;
        }
        const fallbackW = Number.isFinite(entry?.simNode?.w) ? entry.simNode.w : 120;
        const fallbackH = Number.isFinite(entry?.simNode?.h) ? entry.simNode.h : 120;
        return 0.5 * Math.max(fallbackW, fallbackH, 120);
      };

      groupByKey.forEach((group) => {
        const groupEntries = group.entryIds.map((entryId) => entryById.get(entryId)).filter(Boolean);
        const densityBoost = (Math.max(0, groupEntries.length - 4) * 8) + (Math.max(0, group.handoverIds.length - 1) * 18);
        const sectorSpan = Math.max(
          Math.PI / 3,
          Number.isFinite(group.sectorSpan) ? group.sectorSpan : (Math.PI * 2)
        );
        let previousLayerRadius = 150 + densityBoost;
        let previousLayerMaxCollision = 0;
        let nextDepth = 1;
        depthLayerOrder.forEach((layerKey) => {
          const layerEntries = groupEntries.filter((entry) => getDepthLayerKey(entry) === layerKey);
          if (!layerEntries.length) return;
          const layerCollisionRadii = layerEntries.map((entry) => getEntryCollisionRadius(entry));
          const layerMaxCollision = layerCollisionRadii.reduce(
            (maxValue, value) => Math.max(maxValue, value),
            0
          );
          const arcDemand = layerCollisionRadii.reduce(
            (sum, radius) => sum + (radius * 2) + COLLAB_SHELL_LAYER_ARC_GAP_PX,
            0
          );
          const arcBasedRadius = layerEntries.length > 1
            ? arcDemand / sectorSpan
            : layerMaxCollision + COLLAB_SHELL_LAYER_ARC_GAP_PX;
          const minLayerRadius = previousLayerRadius +
            previousLayerMaxCollision +
            layerMaxCollision +
            (depthLayerBaseGap[layerKey] || COLLAB_SHELL_LAYER_RADIAL_GAP_PX);
          const resolvedLayerRadius = Math.max(
            180 + densityBoost,
            arcBasedRadius,
            minLayerRadius
          );
          layerEntries.forEach((entry) => {
            entry.chainDepth = nextDepth;
            entry.depthRadius = resolvedLayerRadius;
          });
          nextDepth += 1;
          previousLayerRadius = resolvedLayerRadius;
          previousLayerMaxCollision = layerMaxCollision;
        });

        const entityBuckets = new Map();
        groupEntries
          .filter((entry) => entry.role === "entity")
          .forEach((entry) => {
            const key = entry.collaboratorKey || `entity:${entry.id}`;
            if (!entityBuckets.has(key)) entityBuckets.set(key, []);
            entityBuckets.get(key).push(entry);
          });
        entityBuckets.forEach((bucketEntries) => {
          bucketEntries
            .sort(compareNodeEntriesStable)
            .forEach((entry, index) => {
              entry.radialOffset = (index - ((bucketEntries.length - 1) / 2)) * 8;
            });
        });
      });

      nodeEntries.forEach((entry) => {
        if (entry.role === "anchor") {
          entry.seedAngle = normalizeRadians(COLLAB_SHELL_START_ANGLE_RAD);
          entry.seedRadius = 0;
          return;
        }
        if (!Number.isFinite(entry.depthRadius) || entry.depthRadius <= 0) {
          entry.depthRadius = 240;
          entry.chainDepth = 1;
        }
        if (!Number.isFinite(entry.seedAngle)) {
          const groupCenter = groupByKey.get(entry.groupKey)?.sectorCenter || COLLAB_SHELL_START_ANGLE_RAD;
          entry.seedAngle = normalizeRadians(groupCenter);
        }
        entry.seedRadius = Math.max(40, entry.depthRadius + (Number.isFinite(entry.radialOffset) ? entry.radialOffset : 0));
      });

      return {
        nodesForSim,
        linksForSim,
        nodeEntries,
        entryById,
        groupByKey
      };
    }

    function seedCollaborationShellPositions(model) {
      if (!model || !Array.isArray(model.nodeEntries)) return;
      model.nodeEntries.forEach((entry) => {
        if (entry.role === "anchor") {
          entry.seedAngle = normalizeRadians(COLLAB_SHELL_START_ANGLE_RAD);
          entry.seedX = 0;
          entry.seedY = 0;
          entry.simNode.x = 0;
          entry.simNode.y = 0;
          return;
        }
        const angle = normalizeRadians(entry.seedAngle);
        const radius = Math.max(40, Number.isFinite(entry.seedRadius) ? entry.seedRadius : 240);
        entry.seedAngle = angle;
        entry.seedRadius = radius;
        entry.seedX = Math.cos(angle) * radius;
        entry.seedY = Math.sin(angle) * radius;
        entry.simNode.x = entry.seedX;
        entry.simNode.y = entry.seedY;
      });
    }

    function resolveCollaborationShellOverlap(model) {
      if (!model || !Array.isArray(model.nodesForSim)) return;
      const entryById = model.entryById || new Map();
      const groupByKey = model.groupByKey || new Map();
      const layersByGroup = new Map();
      const getCollisionRadius = (entry) => {
        const collisionRadius = entry?.simNode?.collisionRadius;
        if (Number.isFinite(collisionRadius) && collisionRadius > 0) {
          return collisionRadius;
        }
        const fallbackW = Number.isFinite(entry?.simNode?.w) ? entry.simNode.w : 120;
        const fallbackH = Number.isFinite(entry?.simNode?.h) ? entry.simNode.h : 120;
        return 0.5 * Math.max(fallbackW, fallbackH, 120);
      };

      model.nodesForSim.forEach((simNode) => {
        const entry = entryById.get(simNode.id);
        if (!entry || entry.role === "anchor" || !entry.groupKey) return;
        if (!layersByGroup.has(entry.groupKey)) {
          layersByGroup.set(entry.groupKey, new Map());
        }
        const layerKey = Number.isFinite(entry.chainDepth) ? entry.chainDepth : 1;
        if (!layersByGroup.get(entry.groupKey).has(layerKey)) {
          layersByGroup.get(entry.groupKey).set(layerKey, []);
        }
        layersByGroup.get(entry.groupKey).get(layerKey).push({ entry, simNode });
      });

      layersByGroup.forEach((layerMap, groupKey) => {
        const group = groupByKey.get(groupKey) || null;
        const sectorCenter = normalizeRadians(group?.sectorCenter ?? COLLAB_SHELL_START_ANGLE_RAD);
        const hasSectorBounds = !!group && Number.isFinite(group.sectorSpan) && group.sectorSpan < (Math.PI * 2);
        const layerDepths = [...layerMap.keys()].sort((left, right) => left - right);
        let previousOuterRadius = 0;

        layerDepths.forEach((layerDepth) => {
          const layerItems = (layerMap.get(layerDepth) || [])
            .map(({ entry, simNode }) => {
              const rawAngle = Number.isFinite(simNode.x) && Number.isFinite(simNode.y)
                ? normalizeRadians(Math.atan2(simNode.y, simNode.x))
                : normalizeRadians(entry.seedAngle);
              const rawRadius = Math.hypot(simNode.x || 0, simNode.y || 0) || entry.seedRadius || entry.depthRadius || 220;
              return {
                entry,
                simNode,
                collisionRadius: getCollisionRadius(entry),
                desiredRelAngle: shortestAngleDelta(sectorCenter, rawAngle),
                desiredRadius: rawRadius
              };
            })
            .sort((left, right) => {
              if (left.desiredRelAngle !== right.desiredRelAngle) {
                return left.desiredRelAngle - right.desiredRelAngle;
              }
              return compareNodeEntriesStable(left.entry, right.entry);
            });

          if (!layerItems.length) return;
          const layerMaxCollisionRadius = layerItems.reduce(
            (maxValue, item) => Math.max(maxValue, item.collisionRadius),
            0
          );
          let layerRadius = Math.max(
            previousOuterRadius + layerMaxCollisionRadius + COLLAB_SHELL_LAYER_RADIAL_GAP_PX,
            ...layerItems.map((item) => item.desiredRadius)
          );
          layerRadius = Math.max(140, layerRadius);

          const overflowPad = layerItems.some((item) => item.entry.role === "artifact") ? 0.2 : 0.12;
          const minRel = hasSectorBounds ? -((group.sectorSpan / 2) + overflowPad) : -Math.PI;
          const maxRel = hasSectorBounds ? ((group.sectorSpan / 2) + overflowPad) : Math.PI;
          const packLayerAtRadius = (candidateRadius) => {
            const packedAngles = new Array(layerItems.length);
            packedAngles[0] = Math.max(minRel, layerItems[0].desiredRelAngle);
            for (let index = 1; index < layerItems.length; index += 1) {
              const previousItem = layerItems[index - 1];
              const currentItem = layerItems[index];
              const minGap = (previousItem.collisionRadius + currentItem.collisionRadius + COLLAB_SHELL_DEOVERLAP_PAIR_PAD_PX) / Math.max(1, candidateRadius);
              packedAngles[index] = Math.max(currentItem.desiredRelAngle, packedAngles[index - 1] + minGap);
            }
            if (!hasSectorBounds) {
              return { fits: true, packedAngles };
            }

            const overflow = packedAngles[packedAngles.length - 1] - maxRel;
            if (overflow > 0) {
              for (let index = 0; index < packedAngles.length; index += 1) {
                packedAngles[index] -= overflow;
              }
            }
            if (packedAngles[0] < minRel) {
              packedAngles[0] = minRel;
              for (let index = 1; index < packedAngles.length; index += 1) {
                const previousItem = layerItems[index - 1];
                const currentItem = layerItems[index];
                const minGap = (previousItem.collisionRadius + currentItem.collisionRadius + COLLAB_SHELL_DEOVERLAP_PAIR_PAD_PX) / Math.max(1, candidateRadius);
                packedAngles[index] = Math.max(packedAngles[index], packedAngles[index - 1] + minGap);
              }
            }
            const fits = packedAngles[packedAngles.length - 1] <= (maxRel + 0.0001);
            return { fits, packedAngles };
          };

          let packResult = packLayerAtRadius(layerRadius);
          let guard = 0;
          while (!packResult.fits && guard < 120) {
            layerRadius += COLLAB_SHELL_LAYER_RADIUS_STEP_PX;
            packResult = packLayerAtRadius(layerRadius);
            guard += 1;
          }

          let layerOuterRadius = previousOuterRadius;
          layerItems.forEach((item, index) => {
            const radialOffset = Number.isFinite(item.entry.radialOffset)
              ? clamp(item.entry.radialOffset, -COLLAB_SHELL_RADIAL_OFFSET_LIMIT_PX, COLLAB_SHELL_RADIAL_OFFSET_LIMIT_PX)
              : 0;
            const resolvedRadius = Math.max(40, layerRadius + radialOffset);
            const resolvedAngle = normalizeRadians(sectorCenter + packResult.packedAngles[index]);
            item.simNode.x = Math.cos(resolvedAngle) * resolvedRadius;
            item.simNode.y = Math.sin(resolvedAngle) * resolvedRadius;
            item.entry.seedAngle = resolvedAngle;
            item.entry.seedRadius = resolvedRadius;
            item.entry.depthRadius = layerRadius;
            layerOuterRadius = Math.max(layerOuterRadius, resolvedRadius + item.collisionRadius);
          });
          previousOuterRadius = layerOuterRadius + COLLAB_SHELL_LAYER_RADIAL_GAP_PX;
        });
      });
    }

    function runCollaborationShellRelax(model) {
      if (!model || !window.d3 || !d3.forceSimulation) return;
      const simNodes = model.nodesForSim;
      const entryById = model.entryById || new Map();
      const groupByKey = model.groupByKey || new Map();
      if (!simNodes.length) return;

      simNodes.forEach((simNode) => {
        const entry = entryById.get(simNode.id);
        if (!entry) return;
        simNode.x = Number.isFinite(entry.seedX) ? entry.seedX : 0;
        simNode.y = Number.isFinite(entry.seedY) ? entry.seedY : 0;
        simNode.fx = null;
        simNode.fy = null;
      });
      const anchorEntry = model.nodeEntries.find((entry) => entry.role === "anchor") || null;
      if (anchorEntry) {
        anchorEntry.simNode.fx = 0;
        anchorEntry.simNode.fy = 0;
      }

      const radialForce = () => {
        let nodesForForce = [];
        const force = (alpha) => {
          nodesForForce.forEach((simNode) => {
            const entry = entryById.get(simNode.id);
            if (!entry || entry.role === "anchor") return;
            const targetRadius = Number.isFinite(entry.seedRadius) ? entry.seedRadius : entry.depthRadius;
            if (!Number.isFinite(targetRadius) || targetRadius <= 0) return;
            const radius = Math.hypot(simNode.x, simNode.y) || 1;
            const strength = COLLAB_SHELL_RADIAL_STRENGTH[entry.role] ?? COLLAB_SHELL_RADIAL_STRENGTH.other;
            const delta = targetRadius - radius;
            const scaled = strength * alpha;
            simNode.vx += (simNode.x / radius) * delta * scaled;
            simNode.vy += (simNode.y / radius) * delta * scaled;
          });
        };
        force.initialize = (nodes) => {
          nodesForForce = nodes || [];
        };
        return force;
      };

      const slotForce = () => {
        let nodesForForce = [];
        const force = (alpha) => {
          nodesForForce.forEach((simNode) => {
            const entry = entryById.get(simNode.id);
            if (!entry || entry.role === "anchor") return;
            const targetRadius = Number.isFinite(entry.seedRadius) ? entry.seedRadius : entry.depthRadius;
            if (!Number.isFinite(targetRadius) || targetRadius <= 0) return;
            const targetAngle = Number.isFinite(entry.seedAngle) ? entry.seedAngle : normalizeRadians(COLLAB_SHELL_START_ANGLE_RAD);
            const targetX = Math.cos(targetAngle) * targetRadius;
            const targetY = Math.sin(targetAngle) * targetRadius;
            const strength = COLLAB_SHELL_TANGENTIAL_STRENGTH[entry.role] ?? COLLAB_SHELL_TANGENTIAL_STRENGTH.other;
            const scaled = strength * alpha;
            simNode.vx += (targetX - simNode.x) * scaled;
            simNode.vy += (targetY - simNode.y) * scaled;
          });
        };
        force.initialize = (nodes) => {
          nodesForForce = nodes || [];
        };
        return force;
      };

      const groupCohesionForce = () => {
        let handoverNodesByGroup = new Map();
        let allNodesByGroup = new Map();
        const force = (alpha) => {
          handoverNodesByGroup.forEach((handoverNodes) => {
            if (handoverNodes.length <= 1) return;
            const center = handoverNodes.reduce((acc, node) => {
              acc.x += node.x || 0;
              acc.y += node.y || 0;
              return acc;
            }, { x: 0, y: 0 });
            center.x /= handoverNodes.length;
            center.y /= handoverNodes.length;
            const scaled = COLLAB_SHELL_GROUP_HANDOVER_COHESION_STRENGTH * alpha;
            handoverNodes.forEach((node) => {
              node.vx += (center.x - node.x) * scaled;
              node.vy += (center.y - node.y) * scaled;
            });
          });
          allNodesByGroup.forEach((groupNodes) => {
            if (groupNodes.length <= 1) return;
            const center = groupNodes.reduce((acc, node) => {
              acc.x += node.x || 0;
              acc.y += node.y || 0;
              return acc;
            }, { x: 0, y: 0 });
            center.x /= groupNodes.length;
            center.y /= groupNodes.length;
            const scaled = COLLAB_SHELL_GROUP_NODE_COHESION_STRENGTH * alpha;
            groupNodes.forEach((node) => {
              node.vx += (center.x - node.x) * scaled;
              node.vy += (center.y - node.y) * scaled;
            });
          });
        };
        force.initialize = (nodes) => {
          handoverNodesByGroup = new Map();
          allNodesByGroup = new Map();
          (nodes || []).forEach((node) => {
            const entry = entryById.get(node.id);
            if (!entry || !entry.groupKey || entry.role === "anchor") return;
            if (!allNodesByGroup.has(entry.groupKey)) allNodesByGroup.set(entry.groupKey, []);
            allNodesByGroup.get(entry.groupKey).push(node);
            if (entry.role !== "handover") return;
            if (!handoverNodesByGroup.has(entry.groupKey)) handoverNodesByGroup.set(entry.groupKey, []);
            handoverNodesByGroup.get(entry.groupKey).push(node);
          });
        };
        return force;
      };

      const simulation = d3.forceSimulation(simNodes)
        .force(
          "link",
          d3.forceLink(model.linksForSim).id((nodeRecord) => nodeRecord.id)
            .distance(COLLAB_SHELL_RELAX_LINK_DISTANCE)
            .strength(COLLAB_SHELL_RELAX_LINK_STRENGTH)
        )
        .force("charge", d3.forceManyBody().strength(COLLAB_SHELL_RELAX_CHARGE_STRENGTH))
        .force(
          "collide",
          d3.forceCollide()
            .radius((simNode) => (simNode.collisionRadius || (0.5 * Math.max(simNode.w, simNode.h))) + 12)
            .iterations(2)
        )
        .force("shellRadial", radialForce())
        .force("shellSlot", slotForce())
        .force("shellGroupCohesion", groupCohesionForce());

      for (let tick = 0; tick < COLLAB_SHELL_RELAX_TICKS; tick += 1) {
        simulation.tick();
      }
      simulation.stop();

      simNodes.forEach((simNode) => {
        const entry = entryById.get(simNode.id);
        if (!entry) return;
        if (entry.role === "anchor") {
          simNode.x = 0;
          simNode.y = 0;
          return;
        }
        const targetRadius = Number.isFinite(entry.seedRadius) ? entry.seedRadius : entry.depthRadius;
        if (!Number.isFinite(targetRadius) || targetRadius <= 0) return;
        const bandThickness = COLLAB_SHELL_BAND_THICKNESS[entry.role] || 72;
        const radius = Math.hypot(simNode.x, simNode.y);
        const rawAngle = Number.isFinite(simNode.x) && Number.isFinite(simNode.y) && radius > 0
          ? normalizeRadians(Math.atan2(simNode.y, simNode.x))
          : normalizeRadians(entry.seedAngle);
        const group = groupByKey.get(entry.groupKey) || null;
        let clampedAngle = rawAngle;
        if (group && Number.isFinite(group.sectorSpan) && group.sectorSpan < (Math.PI * 2)) {
          const overflowPad = entry.role === "artifact" ? 0.2 : 0.12;
          const maxDelta = (group.sectorSpan / 2) + overflowPad;
          const delta = shortestAngleDelta(group.sectorCenter, rawAngle);
          clampedAngle = normalizeRadians(group.sectorCenter + clamp(delta, -maxDelta, maxDelta));
        }
        const clampedRadius = clamp(
          radius || targetRadius,
          Math.max(40, targetRadius - (bandThickness / 2)),
          targetRadius + (bandThickness / 2)
        );
        simNode.x = Math.cos(clampedAngle) * clampedRadius;
        simNode.y = Math.sin(clampedAngle) * clampedRadius;
      });

      resolveCollaborationShellOverlap(model);

      if (anchorEntry) {
        anchorEntry.simNode.fx = null;
        anchorEntry.simNode.fy = null;
      }
    }

    function runCollaborationShellLayout(visibleNodeIds, options = {}) {
      const workspaceRecord = getCurrentWorkspaceRecord();
      if (!workspaceRecord) return;
      const model = buildCollaborationShellModel(visibleNodeIds, workspaceRecord);
      if (!model.nodeEntries.length) return;

      seedCollaborationShellPositions(model);
      runCollaborationShellRelax(model);

      model.nodesForSim.forEach((simNode) => {
        const modelNode = model.entryById.get(simNode.id)?.node || null;
        if (!modelNode) return;
        modelNode.graphPos = {
          x: Number.isFinite(simNode.x) ? simNode.x : 0,
          y: Number.isFinite(simNode.y) ? simNode.y : 0
        };
      });
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

      if (layoutMode === "collab-shell") {
        runCollaborationShellLayout(visibleNodeIds, runOptions);
      } else if (layoutMode === "force") {
        runD3Layout(visibleNodeIds, runOptions);
      } else {
        runHybridLayout(visibleNodeIds);
      }
      const workspaceRecord = getCurrentWorkspaceRecord();
      if (workspaceRecord) {
        persistWorkspaceNodePositions(workspaceRecord, visibleNodeIds, { syncWorkspace: true, persist: true });
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
      applyCameraState({
        zoom: nextZoom,
        panX: (viewportWidth / 2) - (centerX * nextZoom),
        panY: (viewportHeight / 2) - (centerY * nextZoom)
      }, { edges: true, persistViewport: true });
    }

    function resetLayoutForCurrentView() {
      const visibleNodeIds = getVisibleNodeIdsForCurrentView();
      applyCurrentLayoutMode(visibleNodeIds, { reset: true, randomize: true, fitPadding: 80 });
      renderCanvas();
      renderLayoutControls();
    }

    function initializeGraphLayoutIfMissing() {
      if (!nodes.length) return;
      const visibleNodeIds = getVisibleNodeIdsForGlobalView();
      if (!visibleNodeIds || !visibleNodeIds.size) return;
      if (!placeMissingNodePositionsLocally(visibleNodeIds)) return;
      const workspaceRecord = getCurrentWorkspaceRecord();
      if (workspaceRecord) {
        setWorkspaceRuntimeNodePositions(workspaceRecord, visibleNodeIds);
      }
      syncNodeRuntimeAndStore();
      syncWorkspaceRuntimeAndStore();
      persistStoreToLocalStorage();
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
        .map((nodeId) => ({
          nodeId,
          pos: getWorkspaceNodePos(workspaceRecord?.id, nodeId, { allowLegacyFallback: true })
        }))
        .filter((entry) => !!entry.pos);
      if (!positionedNodes.length) {
        return { x: 0, y: 0 };
      }
      const total = positionedNodes.reduce((acc, entry) => {
        acc.x += entry.pos.x;
        acc.y += entry.pos.y;
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
        const normalizedCommentsResult = normalizeCommentRecords(node.comments, node.id);
        if (normalizedCommentsResult.changed) {
          node.comments = normalizedCommentsResult.comments;
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
      setWorkspaceNodePos(workspaceRecord.id, anchorNode.id, anchorNode.graphPos);

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

    function getCurrentUserMentionNeedles() {
      const mentionNeedles = new Set();
      const currentUserRecord = getCurrentUserRecord();
      const currentUserName = String(getCurrentUserName() || "").trim();
      const currentUserOrgLabel = currentUserId ? String(getUserDisplayNameWithOrg(currentUserId) || "").trim() : "";
      const allowedAuthorLabels = new Set(
        [currentUserName, currentUserOrgLabel, currentUserId]
          .filter(Boolean)
          .map((label) => String(label).trim().toLowerCase())
      );
      const addNeedle = (value, includePrefixedAt = true) => {
        const trimmedValue = String(value || "").trim().toLowerCase();
        if (!trimmedValue) return;
        mentionNeedles.add(trimmedValue);
        if (includePrefixedAt && !trimmedValue.startsWith("@")) {
          mentionNeedles.add(`@${trimmedValue}`);
        }
      };
      getCurrentUserCommentAuthorLabels().forEach((label) => {
        const trimmedLabel = String(label || "").trim().toLowerCase();
        if (!allowedAuthorLabels.has(trimmedLabel)) return;
        addNeedle(trimmedLabel, true);
      });
      if (currentUserRecord?.name) {
        const firstName = currentUserRecord.name.trim().split(/\s+/)[0] || "";
        addNeedle(firstName, true);
      }
      return mentionNeedles;
    }

    function hasMentionForCurrentUser(text) {
      const lowerText = String(text || "").toLowerCase();
      if (!lowerText) return false;
      const mentionNeedles = getCurrentUserMentionNeedles();
      for (const mentionNeedle of mentionNeedles) {
        if (lowerText.includes(mentionNeedle)) {
          return true;
        }
      }
      return false;
    }

    function isCommentNotificationRelevantForCurrentUser(node, comment) {
      if (!node || !comment || typeof comment.id !== "string" || !comment.id) return false;
      if (comment.isNew === false) return false;
      const mention = hasMentionForCurrentUser(comment.text);
      const ownerUpdate = isNodeOwnedByCurrentUser(node);
      return mention || ownerUpdate;
    }

    function isCommentUnreadForCurrentUser(node, comment) {
      if (!isCommentNotificationRelevantForCurrentUser(node, comment)) return false;
      return !hasCurrentUserSeenComment(comment.id);
    }

    function buildNotifications() {
      const notifications = [];
      nodes.forEach((node) => {
        node.tasks.forEach((task) => {
          if (!isTaskAssignedToCurrentUser(task.assignedTo) || task.done) return;
          notifications.push({
            id: `task:${task.id}`,
            kind: "task",
            nodeId: node.id,
            taskId: task.id,
            title: `Task: ${task.text}`,
            subtext: `${node.label} • assigned to ${task.assignedTo}`,
            isUnread: !hasCurrentUserSeenTask(task.id)
          });
        });

        node.comments.forEach((comment) => {
          if (!isCommentNotificationRelevantForCurrentUser(node, comment)) return;
          const mention = hasMentionForCurrentUser(comment.text);
          notifications.push({
            id: `comment:${node.id}:${comment.id}`,
            kind: "comment",
            nodeId: node.id,
            commentId: comment.id,
            title: mention ? `Mention in ${node.label}` : `New comment on ${node.label}`,
            subtext: `${comment.author}: ${comment.text}`,
            isUnread: !hasCurrentUserSeenComment(comment.id)
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
      let notificationStateChanged = false;
      if (notification.kind === "task") {
        notificationStateChanged = markCurrentUserTaskSeen(notification.taskId) || notificationStateChanged;
      }

      if (notification.kind === "comment") {
        notificationStateChanged = markCurrentUserCommentSeen(notification.commentId) || notificationStateChanged;
      }

      if (notificationStateChanged) {
        persistStoreToLocalStorage();
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
      const unreadNotifications = notifications.filter((notification) => !!notification.isUnread);
      const readNotifications = notifications.filter((notification) => !notification.isUnread);
      notifCountEl.textContent = String(unreadNotifications.length);
      notifCountEl.classList.toggle("zero", unreadNotifications.length === 0);
      notifBellEl.classList.toggle("active", state.notificationsOpen);
      notificationsPanelEl.classList.toggle("hidden", !state.notificationsOpen);
      if (!state.notificationsOpen) {
        notificationsPanelEl.style.removeProperty("transform");
      }

      notificationsPanelEl.innerHTML = "";
      if (!state.notificationsOpen) return;

      if (notifications.length === 0) {
        const emptyText = document.createElement("p");
        emptyText.className = "muted";
        emptyText.style.margin = "6px";
        emptyText.textContent = "No alerts.";
        notificationsPanelEl.appendChild(emptyText);
        clampNotificationsPanelToViewport();
        return;
      }

      const appendNotificationsSection = (sectionLabel, items, unread = false) => {
        if (!items.length) return;
        const sectionTitle = document.createElement("p");
        sectionTitle.className = "notif-section-label";
        sectionTitle.textContent = sectionLabel;
        notificationsPanelEl.appendChild(sectionTitle);
        items.forEach((notification) => {
          const item = document.createElement("button");
          item.type = "button";
          item.className = `notif-item ${unread ? "is-unread" : "is-read"}`;

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
      };

      if (!unreadNotifications.length && readNotifications.length) {
        const noUnread = document.createElement("p");
        noUnread.className = "notif-empty-note";
        noUnread.textContent = "No unread alerts.";
        notificationsPanelEl.appendChild(noUnread);
      }

      appendNotificationsSection("Unread", unreadNotifications, true);
      appendNotificationsSection("Read", readNotifications, false);
      clampNotificationsPanelToViewport();
    }

    function clampNotificationsPanelToViewport() {
      if (!notificationsPanelEl || !state.notificationsOpen) return;
      notificationsPanelEl.style.transform = "translateX(0px)";
      const panelRect = notificationsPanelEl.getBoundingClientRect();
      const viewportMargin = 8;
      const viewportRight = window.innerWidth - viewportMargin;
      const viewportLeft = viewportMargin;
      let shiftX = 0;
      if (panelRect.right > viewportRight) {
        shiftX -= (panelRect.right - viewportRight);
      }
      if ((panelRect.left + shiftX) < viewportLeft) {
        shiftX += (viewportLeft - (panelRect.left + shiftX));
      }
      notificationsPanelEl.style.transform = `translateX(${Math.round(shiftX)}px)`;
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
      void cardEl;
      return getPortalBodyFrameFromWrapperFrame(node, wrapperFrame, expandedLocationId);
    }

    function getRenderedPortalBodyFrame(cardEl, wrapperFrame, node, expandedLocationId = null) {
      if (!cardEl || !wrapperFrame || !node || node.type !== "portal") return null;
      const expectedFrame = getPortalBodyFrameFromCardStyles(cardEl, wrapperFrame, node, expandedLocationId);
      const bodyEl = cardEl.querySelector(".node-portal-body");
      if (!(bodyEl instanceof HTMLElement)) {
        return expectedFrame;
      }
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
          const originLocalX = bodyRect.left - planeRect.left;
          const originLocalY = bodyRect.top - planeRect.top;
          const worldOrigin = screenToWorld(originLocalX, originLocalY);
          const worldSize = screenDeltaToWorld(bodyRect.width, bodyRect.height);
          const renderedFrame = {
            x: worldOrigin.worldX,
            y: worldOrigin.worldY,
            w: worldSize.dxWorld,
            h: worldSize.dyWorld
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
        expandedLocationId
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
      if (isMultiSelectModifier(event)) {
        resetLocationClickTracker();
        resetPortalClickTracker();
        if (node.type === "collaboration" || !isSelectableNode(node)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (toggleNodeSelection(node.id)) {
          renderNodeLists();
          renderCanvas();
          renderDetailsPane();
        }
        return;
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

    function createNodeCard(node, isSelected, screenFrame) {
      const isExpandedLocationCard = node.type === "location" && isLocationCardExpanded(node.id);
      const isAnchorCard = isWorkspaceAnchorNode(node);
      const isMultiDragReady = isSelected && state.selectedNodeIds.size > 1;
      const zoom = getCameraZoom();

      const card = document.createElement("div");
      card.className = `node-card ${node.type}${isSelected ? " selected" : ""}`;
      if (isMultiDragReady) {
        card.classList.add("multi-drag-ready");
      }
      if (isAnchorCard) {
        card.classList.add("anchor");
      }
      if (isExpandedLocationCard) {
        card.classList.add("expanded");
      } else {
        card.classList.add("drag-anywhere");
      }
      card.style.width = `${screenFrame.w}px`;
      card.style.height = `${screenFrame.h}px`;
      card.style.left = `${screenFrame.x}px`;
      card.style.top = `${screenFrame.y}px`;
      card.style.setProperty("--camera-zoom", String(zoom));
      card.style.setProperty("--graph-node-text-inset", `${GRAPH_NODE_TEXT_INSET_PX * zoom}px`);
      card.style.setProperty("--node-card-radius", `${16 * zoom}px`);
      card.dataset.nodeId = node.id;
      buildNodeCardContent(card, node, screenFrame);
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
        buildEntityCardContent(card, node, frame);
        return;
      }
      if (node.type === "collaboration") {
        buildCollaborationCardContent(card, node, frame);
        return;
      }
      buildArtifactCardContent(card, node);
    }

    function buildAnchorCardContent(card, node, frame) {
      const zoom = getCameraZoom();
      const labelText = getAnchorNodeDisplayLabel(node);
      if (labelText) {
        const hoverLabel = document.createElement("div");
        hoverLabel.className = "node-portal-hover-label";
        hoverLabel.textContent = labelText;
        hoverLabel.style.left = `${frame.w / 2}px`;
        hoverLabel.style.top = `${-(PORTAL_LABEL_GAP_PX * zoom)}px`;
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
      const zoom = getCameraZoom();
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
      childContainer.style.height = `${expandedMetrics.innerHeightPx * zoom}px`;

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
          if (state.selectedNodeIds.has(childNode.id)) {
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
              Math.round(Math.min(childPixelWidth, childPixelHeight) * 0.22 * zoom),
              Math.round(6 * zoom),
              Math.round(14 * zoom)
            );
            const markerLayer = document.createElement("div");
            markerLayer.className = "node-child-marker-layer";
            activeExperiments.slice(0, 4).forEach((experimentNode, index) => {
              const marker = document.createElement("button");
              marker.type = "button";
              marker.className = "node-child-exp-marker";
              marker.style.width = `${markerSizePx}px`;
              marker.style.height = `${markerSizePx}px`;
              if (state.selectedNodeIds.has(experimentNode.id)) {
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
      updateChildMarkerSizes(
        childContainer,
        expandedMetrics.innerWidthPx * zoom,
        expandedMetrics.innerHeightPx * zoom
      );

      const resizeHandle = document.createElement("button");
      resizeHandle.type = "button";
      resizeHandle.className = "node-resize-handle";
      resizeHandle.setAttribute("aria-label", "Resize location view");
      resizeHandle.title = "Resize";
      resizeHandle.style.width = `${RESIZE_HANDLE_SIZE * zoom}px`;
      resizeHandle.style.height = `${RESIZE_HANDLE_SIZE * zoom}px`;
      resizeHandle.style.right = `${6 * zoom}px`;
      resizeHandle.style.bottom = `${6 * zoom}px`;
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
      const zoom = getCameraZoom();
      const bodyOffset = getPortalBodyOffsetWithinWrapper(node, frame, state.expandedCanvasLocationId);
      const linkedWorkspaceName = getPortalLinkedWorkspaceName(node);
      if (linkedWorkspaceName) {
        const hoverLabel = document.createElement("div");
        hoverLabel.className = "node-portal-hover-label";
        hoverLabel.textContent = linkedWorkspaceName;
        hoverLabel.style.left = `${bodyOffset.left + (bodyOffset.width / 2)}px`;
        hoverLabel.style.top = `${bodyOffset.top - (PORTAL_LABEL_GAP_PX * zoom)}px`;
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

    function buildEntityCardContent(card, node, frame) {
      const visualDiamondFrame = getEntityVisualDiamondFrame(frame);
      const squareSide = Math.max(1, visualDiamondFrame.w / Math.SQRT2);
      card.style.setProperty("--entity-shape-size", `${squareSide}px`);
      const body = document.createElement("div");
      body.className = "node-entity-body";
      const shape = document.createElement("div");
      shape.className = "node-entity-shape node-drag-handle";
      const face = document.createElement("div");
      face.className = "node-entity-face";
      const content = document.createElement("div");
      content.className = "node-entity-content";
      const label = document.createElement("div");
      label.className = "node-entity-label";
      label.textContent = node.label || getEntityLabelFallback(node) || "Entity";
      content.appendChild(label);
      shape.appendChild(face);
      shape.appendChild(content);
      body.appendChild(shape);
      card.appendChild(body);
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
      if (node.type === "handover") {
        const contextLabel = getHandoverContextDisplayLabel(node);
        owner.textContent = contextLabel ? `${node.owner} · ${contextLabel}` : node.owner;
      } else {
        owner.textContent = node.owner;
      }
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
        const portalLink = getHandoverPortalBadgeLink(node, getCurrentWorkspaceRecord(), currentUserId);
        if (portalLink?.targetWorkspaceId) {
          const portalBadge = document.createElement("button");
          portalBadge.type = "button";
          portalBadge.className = "handover-portal-badge";
          portalBadge.setAttribute("aria-label", `Open ${portalLink.targetLabel || "linked workspace"}`);
          portalBadge.title = portalLink.targetLabel || "Open linked workspace";
          const portalGlyph = document.createElement("span");
          portalGlyph.className = "handover-portal-badge-glyph";
          portalGlyph.setAttribute("aria-hidden", "true");
          const portalRing = document.createElement("span");
          portalRing.className = "handover-portal-badge-ring";
          const portalCore = document.createElement("span");
          portalCore.className = "handover-portal-badge-core";
          portalGlyph.appendChild(portalRing);
          portalGlyph.appendChild(portalCore);
          portalBadge.appendChild(portalGlyph);
          portalBadge.addEventListener("mousedown", (event) => {
            event.preventDefault();
            event.stopPropagation();
          });
          portalBadge.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            handleHandoverPortalBadgeClick(node.id);
          });
          portalBadge.addEventListener("dblclick", (event) => {
            event.preventDefault();
            event.stopPropagation();
          });
          portalBadge.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            event.stopPropagation();
          });
          card.appendChild(portalBadge);
        }
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
        lastVisibleEdgeScreenBounds = new Map();
        return;
      }
      edgesLayerEl.innerHTML = "";
      lastVisibleEdgeScreenBounds = new Map();
      const viewportRect = viewportEl ? viewportEl.getBoundingClientRect() : null;
      const viewportWidth = Math.max(1, viewportRect?.width || CANVAS_WIDTH);
      const viewportHeight = Math.max(1, viewportRect?.height || CANVAS_HEIGHT);
      edgesLayerEl.setAttribute("viewBox", `0 0 ${viewportWidth} ${viewportHeight}`);
      edgesLayerEl.setAttribute("preserveAspectRatio", "none");
      edgesLayerEl.setAttribute("width", String(viewportWidth));
      edgesLayerEl.setAttribute("height", String(viewportHeight));
      edgesLayerEl.style.left = "0px";
      edgesLayerEl.style.top = "0px";
      edgesLayerEl.style.width = `${viewportWidth}px`;
      edgesLayerEl.style.height = `${viewportHeight}px`;
      const zoom = getCameraZoom();
      const chevronLen = 6 * zoom;
      const chevronHalfHeight = 4 * zoom;
      const edgeHitPadding = 6 * zoom;
      const chevronPathD = `M -${chevronLen} -${chevronHalfHeight} L 0 0 L -${chevronLen} ${chevronHalfHeight}`;

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
          const worldControl = getQuadraticControlPoint(borderA.x, borderA.y, borderB.x, borderB.y);
          const control = { x: worldControl.cx, y: worldControl.cy };
          const borderAScreen = worldToScreen(borderA.x, borderA.y);
          const borderBScreen = worldToScreen(borderB.x, borderB.y);
          const controlScreen = worldToScreen(control.x, control.y);
          const curveD =
            `M ${borderAScreen.screenX} ${borderAScreen.screenY}` +
            ` Q ${controlScreen.screenX} ${controlScreen.screenY}` +
            ` ${borderBScreen.screenX} ${borderBScreen.screenY}`;
          const visibleEdge = createSvgElement("path", {
            class: "edge-line",
            d: curveD
          });
          const isEdgeSelected = state.selectedEdgeIds.has(edgeRecord.id);
          if (isEdgeSelected) {
            visibleEdge.classList.add("edge-line--selected");
          }
          edgesLayerEl.appendChild(visibleEdge);

          const midpoint = getQuadraticPointAndTangentAt(
            borderA.x,
            borderA.y,
            control.x,
            control.y,
            borderB.x,
            borderB.y,
            EDGE_CHEVRON_T
          );
          const midpointScreen = worldToScreen(midpoint.px, midpoint.py);
          const angleDeg = Math.atan2(midpoint.ty, midpoint.tx) * (180 / Math.PI);
          const chevron = createSvgElement("path", {
            class: "edge-chevron",
            d: chevronPathD,
            transform: `translate(${midpointScreen.screenX} ${midpointScreen.screenY}) rotate(${angleDeg})`
          });
          if (isEdgeSelected) {
            chevron.classList.add("edge-chevron--selected");
          }
          edgesLayerEl.appendChild(chevron);
          lastVisibleEdgeScreenBounds.set(edgeRecord.id, {
            left: Math.min(borderAScreen.screenX, borderBScreen.screenX, controlScreen.screenX) - edgeHitPadding,
            top: Math.min(borderAScreen.screenY, borderBScreen.screenY, controlScreen.screenY) - edgeHitPadding,
            right: Math.max(borderAScreen.screenX, borderBScreen.screenX, controlScreen.screenX) + edgeHitPadding,
            bottom: Math.max(borderAScreen.screenY, borderBScreen.screenY, controlScreen.screenY) + edgeHitPadding
          });

          const edgeMeta = {
            edgeId: edgeRecord.id,
            sourceId: edgeRecord.sourceId,
            targetId: edgeRecord.targetId,
            startX: borderA.x,
            startY: borderA.y,
            controlX: control.x,
            controlY: control.y,
            endX: borderB.x,
            endY: borderB.y
          };
          const hitEdge = createSvgElement("path", {
            class: "edge-hit",
            d: curveD
          });
          hitEdge.dataset.edgeId = edgeRecord.id;
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
          if (isEdgeSelected) {
            hitEdge.classList.add("is-selected");
          }
          hitEdge.addEventListener("click", (event) => {
            if (!isMultiSelectModifier(event)) return;
            event.preventDefault();
            event.stopPropagation();
            if (!toggleEdgeSelection(edgeRecord.id)) return;
            renderCanvas();
          });
          edgesLayerEl.appendChild(hitEdge);
        });
      });
      if (edgeCreateDraft.active) {
        const worldControl = getQuadraticControlPoint(
          edgeCreateDraft.startX,
          edgeCreateDraft.startY,
          edgeCreateDraft.endX,
          edgeCreateDraft.endY
        );
        const control = { x: worldControl.cx, y: worldControl.cy };
        const startScreen = worldToScreen(edgeCreateDraft.startX, edgeCreateDraft.startY);
        const controlScreen = worldToScreen(control.x, control.y);
        const endScreen = worldToScreen(edgeCreateDraft.endX, edgeCreateDraft.endY);
        const draftCurveD =
          `M ${startScreen.screenX} ${startScreen.screenY}` +
          ` Q ${controlScreen.screenX} ${controlScreen.screenY}` +
          ` ${endScreen.screenX} ${endScreen.screenY}`;
        const draftEdge = createSvgElement("path", {
          class: "edge-line edge-line--draft",
          d: draftCurveD
        });
        edgesLayerEl.appendChild(draftEdge);
        const midpoint = getQuadraticPointAndTangentAt(
          edgeCreateDraft.startX,
          edgeCreateDraft.startY,
          control.x,
          control.y,
          edgeCreateDraft.endX,
          edgeCreateDraft.endY,
          EDGE_CHEVRON_T
        );
        const midpointScreen = worldToScreen(midpoint.px, midpoint.py);
        const angleDeg = Math.atan2(midpoint.ty, midpoint.tx) * (180 / Math.PI);
        const draftChevron = createSvgElement("path", {
          class: "edge-chevron edge-chevron--draft",
          d: chevronPathD,
          transform: `translate(${midpointScreen.screenX} ${midpointScreen.screenY}) rotate(${angleDeg})`
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
        const projectedFrame = projectRect(frame);
        const card = document.createElement("article");
        card.className = "lens-card";
        card.style.left = `${projectedFrame.x}px`;
        card.style.top = `${projectedFrame.y}px`;
        card.style.width = `${projectedFrame.w}px`;
        card.style.height = `${projectedFrame.h}px`;
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
      pruneSelectionState();
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

      const visibleNodeFrames = new Map();
      const renderedCardsById = new Map();
      nodes.forEach((node) => {
        if (!visibleNodeIds.has(node.id)) return;
        const overridePos = expandedLocationId ? layoutById.get(node.id) || null : null;
        const frame = computeNodeFrame(node, expandedLocationId, overridePos);
        const screenFrame = projectRect(frame);
        visibleNodeFrames.set(node.id, frame);
        const card = createNodeCard(node, state.selectedNodeIds.has(node.id), screenFrame);
        applyProjectedFrameToNodeCard(card, node, frame, { updatePortalCache: false });
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
      const node = selectSingleNode(nodeId);
      if (!node) {
        if (options.source !== "sanitize") {
          renderAll();
        }
        return;
      }

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
            const shareDisabled = collaborator.kind !== "user" || isCollabWorkspaceOnlyHandover(selectedNode);
            shareBtn.title = shareDisabled ? "share workspace unavailable" : "share workspace";
            shareBtn.setAttribute("aria-label", shareDisabled ? "share workspace unavailable" : "share workspace");
            shareBtn.disabled = shareDisabled;
            if (shareDisabled) {
              shareBtn.classList.add("is-disabled");
            } else {
              shareBtn.addEventListener("click", () => {
                toggleHandoverCollaboratorShare(selectedNode.id, collaborator.kind, collaborator.refId);
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
            syncSeenStateForTask(task);
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
        syncSeenStateForTask(newTask);
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
          item.className = `comment-item${isCommentUnreadForCurrentUser(selectedNode, comment) ? " is-new" : ""}`;

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
      } else {
        const directUserCollaborator = getDirectUserCollaboratorEntryForNode(selectedNode, currentUserId);
        if (directUserCollaborator) {
          const leaveBtn = document.createElement("button");
          leaveBtn.type = "button";
          leaveBtn.className = "inline-link";
          leaveBtn.textContent = "Leave handover";
          leaveBtn.setAttribute("aria-label", "Leave handover");
          leaveBtn.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            openConfirmationModal({
              title: "Leave handover",
              message: "Are you sure? This removes you as a collaborator across workspaces.",
              confirmLabel: "Leave handover",
              confirmTone: "delete",
              onConfirm: () => {
                if (!removeCurrentUserFromHandover(selectedNode.id)) return;
                renderAll();
              }
            });
          });
          sectionHeader.appendChild(leaveBtn);
        }
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
            const shareUnsupportedKind = collaborator.kind !== "user";
            const shareDisabled = isCollabWorkspaceOnlyHandover(selectedNode) || shareUnsupportedKind;
            const shareDisabledTitle = shareUnsupportedKind
              ? "Workspace sharing is available for direct user collaborators only"
              : "Collaboration-workspace handovers cannot share workspaces";
            shareBtn.title = shareDisabled ? shareDisabledTitle : "share workspace";
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
      if (typeof comment.id === "string" && comment.id) {
        clearCommentSeenForAllUsers(comment.id);
      }
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
          item.className = `comment-item${isCommentUnreadForCurrentUser(selectedNode, comment) ? " is-new" : ""}`;
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
        id: generateCommentId(),
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
        const autoFitPolicy = consumePendingWorkspaceApplyAutoFit();
        applyWorkspaceData(targetWorkspaceId, { sanitizeState: true });
        normalizeActiveWorkspaceSemantics();
        initializeGraphLayoutIfMissing();
        const visibleNodeIds = getVisibleNodeIdsForGlobalView();
        const workspaceRecord = getCurrentWorkspaceRecord();
        if (workspaceRecord && visibleNodeIds && visibleNodeIds.size) {
          const seededWorkspacePositions = persistWorkspaceNodePositions(workspaceRecord, visibleNodeIds, {
            syncWorkspace: true,
            persist: false
          });
          if (seededWorkspacePositions) {
            persistStoreToLocalStorage();
          }
        }
        const restoredViewport = restoreRememberedViewportForWorkspace(workspaceRecord);
        if (visibleNodeIds && visibleNodeIds.size) {
          if (autoFitPolicy === "always" || (autoFitPolicy === "if-missing" && !restoredViewport)) {
            fitCameraToNodes(visibleNodeIds, 80);
          }
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
        window.localStorage.removeItem(LEGACY_STORE_KEY);
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
        bootErrorMessage = getBootLoadErrorMessage();
        renderLoadErrorState(bootErrorMessage);
        return;
      }

      renderAll();
    }

    void bootApp();
