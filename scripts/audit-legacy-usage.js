#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const EXPANDED_INNER_MIN_W = 240;
const EXPANDED_INNER_MAX_W = Number.POSITIVE_INFINITY;
const EXPANDED_INNER_MIN_H = 140;
const EXPANDED_INNER_MAX_H = Number.POSITIVE_INFINITY;
const EXPANDED_CARD_HORIZONTAL_CHROME = 20;
const EXPANDED_CARD_VERTICAL_CHROME = 104;
const EXPANDED_CARD_MIN_W = 320;
const EXPANDED_CARD_MAX_W = Number.POSITIVE_INFINITY;
const EXPANDED_CARD_MIN_H = 220;
const EXPANDED_CARD_MAX_H = Number.POSITIVE_INFINITY;
const EXPANDED_TARGET_CHILD_W = 172;
const EXPANDED_TARGET_CHILD_H = 72;
const MIN_EXPANDED_ASPECT = 0.5;
const MAX_EXPANDED_ASPECT = 3;

function usage() {
  console.log("Usage:");
  console.log("  node scripts/audit-legacy-usage.js <store-json-path> [--apply-migration] [--write]");
  console.log("  node scripts/audit-legacy-usage.js --synthetic [--apply-migration]");
}

function toNonEmptyString(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed || "";
}

function hasPositiveFiniteNumber(value) {
  return Number.isFinite(value) && value > 0;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function normalizeNodeType(type) {
  const nextType = toNonEmptyString(type).toLowerCase();
  if (nextType === "location") return "location";
  if (nextType === "process") return "process";
  if (nextType === "standard") return "standard";
  if (nextType === "portal") return "portal";
  if (nextType === "handover") return "handover";
  if (nextType === "entity") return "entity";
  if (nextType === "collaboration") return "collaboration";
  return "standard";
}

function normalizeEntityKind(kind) {
  const nextKind = toNonEmptyString(kind).toLowerCase();
  if (nextKind === "user" || nextKind === "person") return "user";
  if (nextKind === "org" || nextKind === "organisation" || nextKind === "organization") return "org";
  return null;
}

function getCanonicalEntityIdentity(node) {
  if (!node || normalizeNodeType(node.type) !== "entity") return null;
  const entityKind = normalizeEntityKind(node.entityKind);
  const entityRefId = toNonEmptyString(node.entityRefId);
  if (!entityKind || !entityRefId) return null;
  return { entityKind, entityRefId };
}

function buildMaps(payload) {
  const users = Array.isArray(payload?.users) ? payload.users : [];
  const orgs = Array.isArray(payload?.orgs) ? payload.orgs : [];
  const nodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
  return {
    userById: new Map(users.filter((user) => toNonEmptyString(user?.id)).map((user) => [user.id, user])),
    orgById: new Map(orgs.filter((org) => toNonEmptyString(org?.id)).map((org) => [org.id, org])),
    nodeById: new Map(nodes.filter((node) => toNonEmptyString(node?.id)).map((node) => [node.id, node]))
  };
}

function isKnownEntityRef(entityKind, entityRefId, maps) {
  if (!entityKind || !entityRefId) return false;
  if (entityKind === "user") return maps.userById.has(entityRefId);
  if (entityKind === "org") return maps.orgById.has(entityRefId);
  return false;
}

function getLegacyEntityIdentityFromMeta(node, maps) {
  if (!node || normalizeNodeType(node.type) !== "entity" || !node.meta || typeof node.meta !== "object") {
    return null;
  }
  const candidates = [];
  const metaEntity = node.meta.entity && typeof node.meta.entity === "object" ? node.meta.entity : null;
  if (metaEntity) {
    candidates.push({
      entityKind: metaEntity.kind || metaEntity.entityKind,
      entityRefId: metaEntity.refId || metaEntity.entityRefId
    });
  }
  candidates.push({
    entityKind: node.meta.entityKind,
    entityRefId: node.meta.entityRefId
  });
  candidates.push({
    entityKind: node.meta.kind,
    entityRefId: node.meta.refId
  });
  const legacyUserId = toNonEmptyString(node.meta.userId);
  if (legacyUserId) {
    candidates.push({ entityKind: "user", entityRefId: legacyUserId });
  }
  const legacyOrgId = toNonEmptyString(node.meta.orgId);
  if (legacyOrgId) {
    candidates.push({ entityKind: "org", entityRefId: legacyOrgId });
  }
  for (const candidate of candidates) {
    const entityKind = normalizeEntityKind(candidate.entityKind);
    const entityRefId = toNonEmptyString(candidate.entityRefId);
    if (!entityKind || !entityRefId) continue;
    if (!isKnownEntityRef(entityKind, entityRefId, maps)) continue;
    return { entityKind, entityRefId };
  }
  return null;
}

function materializeLegacyEntityIdentityForNode(node, maps) {
  if (!node || normalizeNodeType(node.type) !== "entity") return false;
  if (getCanonicalEntityIdentity(node)) return false;
  const legacyIdentity = getLegacyEntityIdentityFromMeta(node, maps);
  if (!legacyIdentity) return false;
  let changed = false;
  if (node.entityKind !== legacyIdentity.entityKind) {
    node.entityKind = legacyIdentity.entityKind;
    changed = true;
  }
  if (node.entityRefId !== legacyIdentity.entityRefId) {
    node.entityRefId = legacyIdentity.entityRefId;
    changed = true;
  }
  return changed;
}

function getHandoverCollaboratorSignature(kind, refId) {
  const normalizedKind = normalizeEntityKind(kind);
  return normalizedKind && refId ? `${normalizedKind}:${refId}` : "";
}

function normalizeHandoverCollaboratorEntry(rawCollaborator, maps) {
  if (!rawCollaborator || typeof rawCollaborator !== "object") return null;
  const kind = normalizeEntityKind(rawCollaborator.kind || rawCollaborator.entityKind);
  const refId = toNonEmptyString(rawCollaborator.refId || rawCollaborator.entityRefId);
  if (!kind || !refId) return null;
  if (!isKnownEntityRef(kind, refId, maps)) return null;
  return {
    kind,
    refId,
    shareWorkspace: !!rawCollaborator.shareWorkspace
  };
}

function resolveLegacyHandoverCollaboratorFromTargetId(targetId, maps) {
  const normalizedTargetId = toNonEmptyString(targetId);
  if (!normalizedTargetId) return null;
  if (maps.userById.has(normalizedTargetId)) {
    return { kind: "user", refId: normalizedTargetId, shareWorkspace: false };
  }
  if (maps.orgById.has(normalizedTargetId)) {
    return { kind: "org", refId: normalizedTargetId, shareWorkspace: false };
  }
  const targetNode = maps.nodeById.get(normalizedTargetId) || null;
  const targetIdentity = getCanonicalEntityIdentity(targetNode);
  if (!targetIdentity || !isKnownEntityRef(targetIdentity.entityKind, targetIdentity.entityRefId, maps)) return null;
  return {
    kind: targetIdentity.entityKind,
    refId: targetIdentity.entityRefId,
    shareWorkspace: false
  };
}

function materializeLegacyHandoverCollaboratorFromMetaTo(node, maps) {
  if (!node || normalizeNodeType(node.type) !== "handover") return false;
  const legacyTargetId = toNonEmptyString(node.meta?.to);
  if (!legacyTargetId) return false;
  const resolvedCollaborator = resolveLegacyHandoverCollaboratorFromTargetId(legacyTargetId, maps);
  if (!resolvedCollaborator) return false;
  const existingCollaborators = Array.isArray(node.handoverCollaborators) ? node.handoverCollaborators : [];
  const existingSignatures = new Set();
  existingCollaborators.forEach((collaborator) => {
    const normalizedCollaborator = normalizeHandoverCollaboratorEntry(collaborator, maps);
    if (!normalizedCollaborator) return;
    const signature = getHandoverCollaboratorSignature(normalizedCollaborator.kind, normalizedCollaborator.refId);
    if (signature) existingSignatures.add(signature);
  });
  const resolvedSignature = getHandoverCollaboratorSignature(resolvedCollaborator.kind, resolvedCollaborator.refId);
  let changed = false;
  if (resolvedSignature && !existingSignatures.has(resolvedSignature)) {
    node.handoverCollaborators = [...existingCollaborators, resolvedCollaborator];
    changed = true;
  }
  if (node.meta && typeof node.meta === "object" && Object.prototype.hasOwnProperty.call(node.meta, "to")) {
    delete node.meta.to;
    changed = true;
  }
  return changed;
}

function isLegacyLocationSizeFallbackRequired(node) {
  if (!node || normalizeNodeType(node.type) !== "location") return false;
  if (hasPositiveFiniteNumber(node.expandedW) && hasPositiveFiniteNumber(node.expandedH)) return false;
  return hasPositiveFiniteNumber(node.expandedInnerWidthPx);
}

function materializeLegacyLocationSizeForNode(node) {
  if (!node || normalizeNodeType(node.type) !== "location") return false;
  let changed = false;
  if (isLegacyLocationSizeFallbackRequired(node)) {
    const fallbackAspect = clamp(
      EXPANDED_TARGET_CHILD_W / Math.max(1, EXPANDED_TARGET_CHILD_H),
      MIN_EXPANDED_ASPECT,
      MAX_EXPANDED_ASPECT
    );
    const legacyAspect = clamp(
      hasPositiveFiniteNumber(node.expandedAspect) ? node.expandedAspect : fallbackAspect,
      MIN_EXPANDED_ASPECT,
      MAX_EXPANDED_ASPECT
    );
    const legacyInnerW = clamp(
      node.expandedInnerWidthPx,
      EXPANDED_INNER_MIN_W,
      EXPANDED_INNER_MAX_W
    );
    const legacyInnerH = clamp(
      legacyInnerW / legacyAspect,
      EXPANDED_INNER_MIN_H,
      EXPANDED_INNER_MAX_H
    );
    const nextExpandedW = clamp(
      legacyInnerW + EXPANDED_CARD_HORIZONTAL_CHROME,
      EXPANDED_CARD_MIN_W,
      EXPANDED_CARD_MAX_W
    );
    const nextExpandedH = clamp(
      legacyInnerH + EXPANDED_CARD_VERTICAL_CHROME,
      EXPANDED_CARD_MIN_H,
      EXPANDED_CARD_MAX_H
    );
    if (node.expandedW !== nextExpandedW) {
      node.expandedW = nextExpandedW;
      changed = true;
    }
    if (node.expandedH !== nextExpandedH) {
      node.expandedH = nextExpandedH;
      changed = true;
    }
  }
  if (Object.prototype.hasOwnProperty.call(node, "expandedAspect")) {
    delete node.expandedAspect;
    changed = true;
  }
  if (Object.prototype.hasOwnProperty.call(node, "expandedInnerWidthPx")) {
    delete node.expandedInnerWidthPx;
    changed = true;
  }
  return changed;
}

function getHandoverCollaboratorSignatureSet(node, maps) {
  const signatures = new Set();
  (Array.isArray(node?.handoverCollaborators) ? node.handoverCollaborators : []).forEach((collaborator) => {
    const normalizedCollaborator = normalizeHandoverCollaboratorEntry(collaborator, maps);
    if (!normalizedCollaborator) return;
    const signature = getHandoverCollaboratorSignature(normalizedCollaborator.kind, normalizedCollaborator.refId);
    if (signature) signatures.add(signature);
  });
  return signatures;
}

function scanLegacyUsage(nodeRecords, maps) {
  const records = Array.isArray(nodeRecords) ? nodeRecords : [];
  const summary = {
    nodeCount: records.length,
    handoverMetaToPresentCount: 0,
    handoverMetaToFallbackRequiredCount: 0,
    handoverMetaToUnresolvedCount: 0,
    entityMissingCanonicalLinkCount: 0,
    locationLegacySizeFallbackRequiredCount: 0,
    locationLegacySizeFieldPresentCount: 0
  };
  const nodeMap = maps.nodeById instanceof Map ? maps.nodeById : new Map();
  records.forEach((node) => {
    const normalizedType = normalizeNodeType(node?.type);
    if (normalizedType === "handover") {
      const legacyTargetId = toNonEmptyString(node?.meta?.to);
      if (legacyTargetId) {
        summary.handoverMetaToPresentCount += 1;
        const resolvedCollaborator = resolveLegacyHandoverCollaboratorFromTargetId(legacyTargetId, {
          ...maps,
          nodeById: nodeMap
        });
        if (!resolvedCollaborator) {
          summary.handoverMetaToUnresolvedCount += 1;
        } else {
          const existingSignatures = getHandoverCollaboratorSignatureSet(node, maps);
          const resolvedSignature = getHandoverCollaboratorSignature(resolvedCollaborator.kind, resolvedCollaborator.refId);
          if (resolvedSignature && !existingSignatures.has(resolvedSignature)) {
            summary.handoverMetaToFallbackRequiredCount += 1;
          }
        }
      }
    }
    if (normalizedType === "entity" && !getCanonicalEntityIdentity(node)) {
      summary.entityMissingCanonicalLinkCount += 1;
    }
    if (normalizedType === "location") {
      if (hasPositiveFiniteNumber(node.expandedAspect) || hasPositiveFiniteNumber(node.expandedInnerWidthPx)) {
        summary.locationLegacySizeFieldPresentCount += 1;
      }
      if (isLegacyLocationSizeFallbackRequired(node)) {
        summary.locationLegacySizeFallbackRequiredCount += 1;
      }
    }
  });
  return summary;
}

function countRequiredFallbacks(summary) {
  return (
    Number(summary.handoverMetaToFallbackRequiredCount || 0) +
    Number(summary.handoverMetaToUnresolvedCount || 0) +
    Number(summary.entityMissingCanonicalLinkCount || 0) +
    Number(summary.locationLegacySizeFallbackRequiredCount || 0)
  );
}

function applyLegacyMigration(payload) {
  const nodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
  let changed = false;
  const maps = buildMaps(payload);
  nodes.forEach((node) => {
    if (materializeLegacyEntityIdentityForNode(node, maps)) {
      changed = true;
    }
    if (materializeLegacyLocationSizeForNode(node)) {
      changed = true;
    }
  });
  const refreshedMaps = buildMaps(payload);
  nodes.forEach((node) => {
    if (materializeLegacyHandoverCollaboratorFromMetaTo(node, refreshedMaps)) {
      changed = true;
    }
  });
  return changed;
}

function buildSyntheticPayload() {
  return {
    meta: {},
    users: [
      { id: "user-admin", name: "Admin", orgId: null },
      { id: "user-alex-patel", name: "Alex Patel", orgId: "org-evans-lab" }
    ],
    orgs: [
      { id: "org-evans-lab", name: "Evans Lab" }
    ],
    nodes: [
      {
        id: "legacy-entity",
        type: "entity",
        title: "Legacy Entity",
        label: "Legacy Entity",
        ownerId: "user-alex-patel",
        meta: {
          entity: {
            kind: "user",
            refId: "user-alex-patel"
          }
        }
      },
      {
        id: "legacy-handover",
        type: "handover",
        title: "Legacy Handover",
        label: "Legacy Handover",
        ownerId: "user-alex-patel",
        handoverCollaborators: [],
        meta: {
          to: "legacy-entity"
        }
      },
      {
        id: "legacy-location",
        type: "location",
        title: "Legacy Location",
        label: "Legacy Location",
        ownerId: "user-alex-patel",
        expandedInnerWidthPx: 360,
        expandedAspect: 1.4
      }
    ],
    edges: [],
    workspaces: [
      {
        id: "ws-legacy",
        name: "Legacy",
        kind: "normal",
        ownerId: "user-alex-patel",
        nodeIds: ["legacy-entity", "legacy-handover", "legacy-location"],
        edgeIds: []
      }
    ]
  };
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadPayloadFromFile(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(absolutePath, "utf8");
  const payload = JSON.parse(raw);
  return { payload, absolutePath };
}

function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((arg) => arg.startsWith("--")));
  const positional = args.filter((arg) => !arg.startsWith("--"));
  const synthetic = flags.has("--synthetic");
  const applyMigration = flags.has("--apply-migration");
  const writeBack = flags.has("--write");

  if (writeBack && (!applyMigration || synthetic)) {
    console.error("--write is only supported with a file path and --apply-migration.");
    process.exit(1);
  }

  if (!synthetic && positional.length < 1) {
    usage();
    process.exit(1);
  }

  let source = "";
  let filePath = "";
  let payload;
  if (synthetic) {
    source = "synthetic-fixture";
    payload = buildSyntheticPayload();
  } else {
    filePath = positional[0];
    const loaded = loadPayloadFromFile(filePath);
    payload = loaded.payload;
    source = loaded.absolutePath;
  }

  const workingPayload = deepClone(payload);
  const before = scanLegacyUsage(workingPayload.nodes, buildMaps(workingPayload));
  let migrationApplied = false;
  if (applyMigration) {
    migrationApplied = applyLegacyMigration(workingPayload);
  }
  const after = scanLegacyUsage(workingPayload.nodes, buildMaps(workingPayload));

  if (writeBack && migrationApplied) {
    const absolutePath = path.resolve(process.cwd(), filePath);
    fs.writeFileSync(absolutePath, `${JSON.stringify(workingPayload, null, 2)}\n`, "utf8");
  }

  const output = {
    source,
    applyMigration,
    migrationApplied,
    requiredFallbacks: {
      before: countRequiredFallbacks(before),
      after: countRequiredFallbacks(after)
    },
    before,
    after
  };
  console.log(JSON.stringify(output, null, 2));
}

main();
