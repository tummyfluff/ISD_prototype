import { normalizeEntityKind } from "./nodeNormalization.js";

export function createRecordsAndLabels(deps) {
  function isAdminUserId(userId) {
    return !!deps.ADMIN_USER_ID && userId === deps.ADMIN_USER_ID;
  }

  function getWorkspaceOptionsForCurrentUser() {
    const currentUserId = deps.getCurrentUserId();
    if (!currentUserId) return [];
    const ownedOptions = deps.getWorkspaceOptions().filter((workspace) => workspace.ownerId === currentUserId);
    const sharedOptions = typeof deps.getSharedWorkspaceOptionsForUser === "function"
      ? deps.getSharedWorkspaceOptionsForUser(currentUserId)
      : [];
    const mergedOptions = [...ownedOptions];
    const seenIds = new Set(mergedOptions.map((workspace) => workspace.id));
    sharedOptions.forEach((workspace) => {
      if (!workspace?.id || seenIds.has(workspace.id)) return;
      seenIds.add(workspace.id);
      mergedOptions.push(workspace);
    });
    return mergedOptions;
  }

  function getWorkspaceRecordById(workspaceId) {
    const visibleWorkspaceOptions = getWorkspaceOptionsForCurrentUser();
    if (!visibleWorkspaceOptions.length) return null;
    const workspaceById = deps.getWorkspaceById();
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
    const currentUserId = deps.getCurrentUserId();
    if (!currentUserId) return null;
    return deps.getUserById().get(currentUserId) || null;
  }

  function getCurrentUserOrgId() {
    return getCurrentUserRecord()?.orgId || null;
  }

  function getCurrentUserName() {
    const currentUser = getCurrentUserRecord();
    return currentUser?.name || "None";
  }

  function getSortedUsersForMenu() {
    return [...deps.getUsers()].sort((leftUser, rightUser) => {
      const leftName = leftUser?.name || "";
      const rightName = rightUser?.name || "";
      const nameComparison = leftName.localeCompare(rightName, undefined, { sensitivity: "base" });
      if (nameComparison !== 0) return nameComparison;
      return (leftUser?.id || "").localeCompare(rightUser?.id || "");
    });
  }

  function getSortedOrgsForMenu() {
    return [...deps.getOrgs()].sort((leftOrg, rightOrg) => {
      const leftName = leftOrg?.name || "";
      const rightName = rightOrg?.name || "";
      const nameComparison = leftName.localeCompare(rightName, undefined, { sensitivity: "base" });
      if (nameComparison !== 0) return nameComparison;
      return (leftOrg?.id || "").localeCompare(rightOrg?.id || "");
    });
  }

  function getOrgDisplayName(orgId) {
    const orgById = deps.getOrgById();
    if (!orgId || !orgById.has(orgId)) return "";
    return orgById.get(orgId)?.name || "";
  }

  function getUserDisplayNameWithOrg(userId) {
    const userById = deps.getUserById();
    if (!userId || !userById.has(userId)) return "";
    const userRecord = userById.get(userId);
    if (!userRecord) return "";
    const orgName = getOrgDisplayName(userRecord.orgId);
    return orgName ? `${orgName} / ${userRecord.name || userId}` : (userRecord.name || userId);
  }

  function getOwnerDisplayName(node) {
    const userById = deps.getUserById();
    if (!node) return "";
    if (node.ownerId && userById.has(node.ownerId)) {
      return getUserDisplayNameWithOrg(node.ownerId) || node.owner || node.ownerId;
    }
    return node.owner || node.ownerId || "Unknown";
  }

  function isNodeOwnedByCurrentUser(node) {
    const currentUserId = deps.getCurrentUserId();
    return !!node && !!currentUserId && node.ownerId === currentUserId;
  }

  function getCurrentUserTaskAssignmentLabels() {
    const labels = new Set();
    const currentUser = getCurrentUserRecord();
    if (currentUser?.name) labels.add(currentUser.name);
    const currentUserId = deps.getCurrentUserId();
    const currentUserWithOrg = currentUserId ? getUserDisplayNameWithOrg(currentUserId) : "";
    if (currentUserWithOrg) labels.add(currentUserWithOrg);
    return labels;
  }

  function isTaskAssignedToCurrentUser(assignedTo) {
    return getCurrentUserTaskAssignmentLabels().has(String(assignedTo || "").trim());
  }

  function getCurrentUserCommentAuthorLabels() {
    const labels = new Set();
    const currentUserName = getCurrentUserName();
    if (currentUserName) labels.add(currentUserName);
    const currentUserId = deps.getCurrentUserId();
    const currentUserWithOrg = currentUserId ? getUserDisplayNameWithOrg(currentUserId) : "";
    if (currentUserWithOrg) labels.add(currentUserWithOrg);
    return labels;
  }

  function getNodeDisplayTitle(node, options = {}) {
    const fallback = typeof options.fallback === "string" && options.fallback ? options.fallback : "Untitled";
    if (!node) return fallback;
    if (node.type === "portal") {
      return getPortalLinkedWorkspaceName(node) || node.label || node.title || "Portal";
    }
    if (node.type === "entity") {
      return getEntityDisplayName(node.entityKind, node.entityRefId) || node.label || node.title || "Entity";
    }
    if (node.type === "collaboration") {
      return node.label || node.title || "Collaboration";
    }
    return String(node.label || node.title || "").trim() || fallback;
  }

  function getLegacyEntityLinkForNode(node) {
    if (!node || typeof node.id !== "string") return null;
    if (node.meta && typeof node.meta === "object" && node.meta.suppressLegacyEntityLink) {
      return null;
    }
    return deps.legacyEntityLinkByNodeId[node.id] || null;
  }

  function getEntityLinkRecord(entityKind, entityRefId) {
    const normalizedKind = normalizeEntityKind(entityKind);
    if (!normalizedKind || !entityRefId) return null;
    if (normalizedKind === "user") {
      return deps.getUserById().get(entityRefId) || null;
    }
    if (normalizedKind === "org") {
      return deps.getOrgById().get(entityRefId) || null;
    }
    return null;
  }

  function getEntityDisplayName(entityKind, entityRefId) {
    const record = getEntityLinkRecord(entityKind, entityRefId);
    return record?.name || "";
  }

  function getEntityLabelFallback(node) {
    if (!node) return "";
    return String(node.title || node.label || "").trim() || "Entity";
  }

  function applyDerivedEntityIdentity(node) {
    if (!node || node.type !== "entity") return false;
    const displayName = getEntityDisplayName(node.entityKind, node.entityRefId);
    const nextLabel = displayName || getEntityLabelFallback(node);
    const nextTitle = displayName || "";
    const entityKindLabel = node.entityKind === "org" ? "organisation" : "user";
    let changed = false;
    if (node.label !== nextLabel) {
      node.label = nextLabel;
      changed = true;
    }
    if (node.title !== nextTitle) {
      node.title = nextTitle;
      changed = true;
    }
    if ((!node.summary || !String(node.summary).trim()) && nextLabel) {
      node.summary = `${nextLabel} ${entityKindLabel} entity`;
      changed = true;
    }
    return changed;
  }

  function normalizeEntityLinkFieldsForNode(node) {
    if (!node || node.type !== "entity") return false;
    const legacyLink = getLegacyEntityLinkForNode(node);
    const nextEntityKind = normalizeEntityKind(node.entityKind) || legacyLink?.entityKind || null;
    const nextEntityRefId = typeof node.entityRefId === "string" && node.entityRefId
      ? node.entityRefId
      : (legacyLink?.entityRefId || null);
    let changed = false;
    if (node.entityKind !== nextEntityKind) {
      node.entityKind = nextEntityKind;
      changed = true;
    }
    if (node.entityRefId !== nextEntityRefId) {
      node.entityRefId = nextEntityRefId;
      changed = true;
    }
    if (applyDerivedEntityIdentity(node)) {
      changed = true;
    }
    return changed;
  }

  function getEntityOptionsForKind(entityKind) {
    const orgById = deps.getOrgById();
    if (entityKind === "org") {
      return getSortedOrgsForMenu().map((orgRecord) => ({
        id: orgRecord.id,
        label: orgRecord.name || orgRecord.id
      }));
    }
    return getSortedUsersForMenu().map((userRecord) => {
      if (isAdminUserId(userRecord.id)) return null;
      const orgName = userRecord.orgId && orgById.has(userRecord.orgId) ? orgById.get(userRecord.orgId).name : "";
      return {
        id: userRecord.id,
        label: orgName ? `${userRecord.name || userRecord.id} (${orgName})` : (userRecord.name || userRecord.id)
      };
    }).filter(Boolean);
  }

  function getInitialEntitySelectionForNode(node) {
    if (node?.type === "entity") {
      const existingKind = normalizeEntityKind(node.entityKind);
      const existingRefId = typeof node.entityRefId === "string" ? node.entityRefId : "";
      if (existingKind && existingRefId) {
        return {
          entityKind: existingKind,
          entityRefId: existingRefId
        };
      }
    }
    const currentUserId = deps.getCurrentUserId();
    const userById = deps.getUserById();
    const defaultKind = "user";
    const defaultRefId = currentUserId && userById.has(currentUserId)
      ? currentUserId
      : (getEntityOptionsForKind(defaultKind)[0]?.id || "");
    return {
      entityKind: defaultKind,
      entityRefId: defaultRefId
    };
  }

  function getNodeTitleFallback(node) {
    if (!node) return "Untitled";
    if (node.type === "portal") return "Portal";
    if (node.type === "entity") return "Entity";
    if (node.type === "location") return "Untitled location";
    if (node.type === "process") return "Untitled process";
    if (node.type === "standard") return "Untitled standard";
    if (node.type === "handover") return "Untitled handover";
    return "Untitled";
  }

  function compareNodesByDisplayLabel(leftNode, rightNode) {
    const leftLabel = getNodeDisplayTitle(leftNode, { fallback: getNodeTitleFallback(leftNode) });
    const rightLabel = getNodeDisplayTitle(rightNode, { fallback: getNodeTitleFallback(rightNode) });
    const labelComparison = leftLabel.localeCompare(rightLabel, undefined, { sensitivity: "base" });
    if (labelComparison !== 0) return labelComparison;
    return (leftNode?.id || "").localeCompare(rightNode?.id || "");
  }

  function getLinkableWorkspaceOptionsForCurrentUser(excludeWorkspaceId = deps.getCurrentWorkspaceId()) {
    const visibleWorkspaceOptions = getWorkspaceOptionsForCurrentUser();
    if (!visibleWorkspaceOptions.length) return [];
    if (!excludeWorkspaceId) return [...visibleWorkspaceOptions];
    return visibleWorkspaceOptions.filter((workspace) => workspace.id !== excludeWorkspaceId);
  }

  function getPortalLinkedWorkspaceName(node) {
    if (!node || node.type !== "portal") return "";
    const linkedWorkspaceId = typeof node.linkedWorkspaceId === "string" ? node.linkedWorkspaceId : "";
    if (!linkedWorkspaceId) return "";
    const workspaceRecord = deps.getWorkspaceById().get(linkedWorkspaceId);
    if (!workspaceRecord) return "";
    return workspaceRecord.name || linkedWorkspaceId;
  }

  return {
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
    isTaskAssignedToCurrentUser,
    getCurrentUserCommentAuthorLabels,
    getNodeDisplayTitle,
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
  };
}
