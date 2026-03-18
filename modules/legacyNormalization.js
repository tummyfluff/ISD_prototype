export function createLegacyNormalization(deps) {
  function toNonEmptyString(value) {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    return trimmed || "";
  }

  function hasPositiveFiniteNumber(value) {
    return Number.isFinite(value) && value > 0;
  }

  function getUserByIdMap(options = {}) {
    if (options.userById instanceof Map) return options.userById;
    return deps.getUserById();
  }

  function getOrgByIdMap(options = {}) {
    if (options.orgById instanceof Map) return options.orgById;
    return deps.getOrgById();
  }

  function getNodeRecords(options = {}) {
    if (Array.isArray(options.nodeRecords)) return options.nodeRecords;
    return deps.getNodeRecords();
  }

  function isKnownEntityRef(entityKind, entityRefId, options = {}) {
    if (!entityKind || !entityRefId) return false;
    const userMap = getUserByIdMap(options);
    const orgMap = getOrgByIdMap(options);
    if (entityKind === "user") return userMap.has(entityRefId);
    if (entityKind === "org") return orgMap.has(entityRefId);
    return false;
  }

  function getCanonicalEntityIdentity(node) {
    if (!node || deps.normalizeNodeType(node.type) !== "entity") return null;
    const entityKind = deps.normalizeEntityKind(node.entityKind);
    const entityRefId = toNonEmptyString(node.entityRefId);
    if (!entityKind || !entityRefId) return null;
    return { entityKind, entityRefId };
  }

  function getLegacyEntityIdentityFromMeta(node, options = {}) {
    if (!node || typeof node !== "object" || deps.normalizeNodeType(node.type) !== "entity") return null;
    if (!node.meta || typeof node.meta !== "object") return null;
    const candidates = [];
    const legacyEntityMeta = node.meta.entity && typeof node.meta.entity === "object" ? node.meta.entity : null;
    if (legacyEntityMeta) {
      candidates.push({
        entityKind: legacyEntityMeta.kind || legacyEntityMeta.entityKind,
        entityRefId: legacyEntityMeta.refId || legacyEntityMeta.entityRefId
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
      candidates.push({
        entityKind: "user",
        entityRefId: legacyUserId
      });
    }
    const legacyOrgId = toNonEmptyString(node.meta.orgId);
    if (legacyOrgId) {
      candidates.push({
        entityKind: "org",
        entityRefId: legacyOrgId
      });
    }
    for (const candidate of candidates) {
      const entityKind = deps.normalizeEntityKind(candidate.entityKind);
      const entityRefId = toNonEmptyString(candidate.entityRefId);
      if (!entityKind || !entityRefId) continue;
      if (!isKnownEntityRef(entityKind, entityRefId, options)) continue;
      return { entityKind, entityRefId };
    }
    return null;
  }

  function materializeLegacyEntityIdentityForNode(node, options = {}) {
    if (!node || deps.normalizeNodeType(node.type) !== "entity") return false;
    if (getCanonicalEntityIdentity(node)) return false;
    const legacyIdentity = getLegacyEntityIdentityFromMeta(node, options);
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

  function resolveLegacyHandoverCollaboratorFromTargetId(targetId, options = {}) {
    const normalizedTargetId = toNonEmptyString(targetId);
    if (!normalizedTargetId) return null;
    const userMap = getUserByIdMap(options);
    const orgMap = getOrgByIdMap(options);
    if (userMap.has(normalizedTargetId)) {
      return { kind: "user", refId: normalizedTargetId, shareWorkspace: false };
    }
    if (orgMap.has(normalizedTargetId)) {
      return { kind: "org", refId: normalizedTargetId, shareWorkspace: false };
    }
    const nodeMap = options.nodeById instanceof Map
      ? options.nodeById
      : new Map(getNodeRecords(options).map((node) => [node.id, node]));
    const targetNode = nodeMap.get(normalizedTargetId) || null;
    const targetIdentity = getCanonicalEntityIdentity(targetNode);
    if (!targetIdentity || !isKnownEntityRef(targetIdentity.entityKind, targetIdentity.entityRefId, options)) return null;
    return {
      kind: targetIdentity.entityKind,
      refId: targetIdentity.entityRefId,
      shareWorkspace: false
    };
  }

  function getHandoverCollaboratorSignatureSet(node) {
    const signatures = new Set();
    const normalizeHandoverCollaboratorEntry = deps.getNormalizeHandoverCollaboratorEntry();
    const getHandoverCollaboratorSignature = deps.getHandoverCollaboratorSignature();
    (Array.isArray(node?.handoverCollaborators) ? node.handoverCollaborators : []).forEach((collaborator) => {
      const normalizedCollaborator = normalizeHandoverCollaboratorEntry(collaborator);
      if (!normalizedCollaborator) return;
      const signature = getHandoverCollaboratorSignature(normalizedCollaborator.kind, normalizedCollaborator.refId);
      if (signature) signatures.add(signature);
    });
    return signatures;
  }

  function materializeLegacyHandoverCollaboratorFromMetaTo(node, options = {}) {
    if (!node || deps.normalizeNodeType(node.type) !== "handover") return false;
    const legacyTargetId = toNonEmptyString(node.meta?.to);
    if (!legacyTargetId) return false;
    const resolvedCollaborator = resolveLegacyHandoverCollaboratorFromTargetId(legacyTargetId, options);
    if (!resolvedCollaborator) return false;
    const existingCollaborators = Array.isArray(node.handoverCollaborators) ? node.handoverCollaborators : [];
    const existingSignatures = getHandoverCollaboratorSignatureSet(node);
    const getHandoverCollaboratorSignature = deps.getHandoverCollaboratorSignature();
    const resolvedSignature = getHandoverCollaboratorSignature(resolvedCollaborator.kind, resolvedCollaborator.refId);
    let changed = false;
    if (resolvedSignature && !existingSignatures.has(resolvedSignature)) {
      node.handoverCollaborators = [
        ...existingCollaborators,
        resolvedCollaborator
      ];
      changed = true;
    }
    if (node.meta && typeof node.meta === "object" && Object.prototype.hasOwnProperty.call(node.meta, "to")) {
      delete node.meta.to;
      changed = true;
    }
    return changed;
  }

  function isLegacyLocationSizeFallbackRequired(node) {
    if (!node || deps.normalizeNodeType(node.type) !== "location") return false;
    if (hasPositiveFiniteNumber(node.expandedW) && hasPositiveFiniteNumber(node.expandedH)) return false;
    return hasPositiveFiniteNumber(node.expandedInnerWidthPx);
  }

  function materializeLegacyLocationSizeForNode(node) {
    if (!node || deps.normalizeNodeType(node.type) !== "location") return false;
    let changed = false;
    if (isLegacyLocationSizeFallbackRequired(node)) {
      const fallbackAspect = deps.clamp(
        deps.EXPANDED_TARGET_CHILD_W / Math.max(1, deps.EXPANDED_TARGET_CHILD_H),
        deps.MIN_EXPANDED_ASPECT,
        deps.MAX_EXPANDED_ASPECT
      );
      const legacyAspect = deps.clamp(
        hasPositiveFiniteNumber(node.expandedAspect) ? node.expandedAspect : fallbackAspect,
        deps.MIN_EXPANDED_ASPECT,
        deps.MAX_EXPANDED_ASPECT
      );
      const legacyInnerW = deps.clamp(
        node.expandedInnerWidthPx,
        deps.EXPANDED_INNER_MIN_W,
        deps.EXPANDED_INNER_MAX_W
      );
      const legacyInnerH = deps.clamp(
        legacyInnerW / legacyAspect,
        deps.EXPANDED_INNER_MIN_H,
        deps.EXPANDED_INNER_MAX_H
      );
      const nextExpandedW = deps.clamp(
        legacyInnerW + deps.EXPANDED_CARD_HORIZONTAL_CHROME,
        deps.EXPANDED_CARD_MIN_W,
        deps.EXPANDED_CARD_MAX_W
      );
      const nextExpandedH = deps.clamp(
        legacyInnerH + deps.EXPANDED_CARD_VERTICAL_CHROME,
        deps.EXPANDED_CARD_MIN_H,
        deps.EXPANDED_CARD_MAX_H
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

  function scanLegacyUsage(nodeRecords, options = {}) {
    const records = Array.isArray(nodeRecords) ? nodeRecords : [];
    const nodeMap = options.nodeById instanceof Map ? options.nodeById : new Map(records.map((node) => [node.id, node]));
    const summary = {
      nodeCount: records.length,
      handoverMetaToPresentCount: 0,
      handoverMetaToFallbackRequiredCount: 0,
      handoverMetaToUnresolvedCount: 0,
      entityMissingCanonicalLinkCount: 0,
      locationLegacySizeFallbackRequiredCount: 0,
      locationLegacySizeFieldPresentCount: 0
    };
    records.forEach((node) => {
      const normalizedType = deps.normalizeNodeType(node?.type);
      if (normalizedType === "handover") {
        const legacyTargetId = toNonEmptyString(node?.meta?.to);
        if (legacyTargetId) {
          summary.handoverMetaToPresentCount += 1;
          const resolvedCollaborator = resolveLegacyHandoverCollaboratorFromTargetId(legacyTargetId, {
            ...options,
            nodeById: nodeMap
          });
          if (!resolvedCollaborator) {
            summary.handoverMetaToUnresolvedCount += 1;
          } else {
            const existingSignatures = getHandoverCollaboratorSignatureSet(node);
            const getHandoverCollaboratorSignature = deps.getHandoverCollaboratorSignature();
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

  function hasLegacyLocalStorePayload() {
    try {
      return window.localStorage.getItem(deps.LEGACY_STORE_KEY) !== null;
    } catch (_error) {
      return false;
    }
  }

  function countRequiredLegacyFallbacks(summary) {
    if (!summary || typeof summary !== "object") return 0;
    return (
      Number(summary.handoverMetaToFallbackRequiredCount || 0) +
      Number(summary.handoverMetaToUnresolvedCount || 0) +
      Number(summary.entityMissingCanonicalLinkCount || 0) +
      Number(summary.locationLegacySizeFallbackRequiredCount || 0)
    );
  }

  return {
    toNonEmptyString,
    hasPositiveFiniteNumber,
    isKnownEntityRef,
    getCanonicalEntityIdentity,
    getLegacyEntityIdentityFromMeta,
    materializeLegacyEntityIdentityForNode,
    resolveLegacyHandoverCollaboratorFromTargetId,
    materializeLegacyHandoverCollaboratorFromMetaTo,
    isLegacyLocationSizeFallbackRequired,
    materializeLegacyLocationSizeForNode,
    getHandoverCollaboratorSignatureSet,
    scanLegacyUsage,
    hasLegacyLocalStorePayload,
    countRequiredLegacyFallbacks
  };
}
