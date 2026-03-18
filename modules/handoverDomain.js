export function createHandoverDomain(deps) {
  function getHandoverCollaboratorSignature(kind, refId) {
    const normalizedKind = deps.normalizeEntityKind(kind);
    return normalizedKind && refId ? `${normalizedKind}:${refId}` : "";
  }

  function normalizeHandoverCollaboratorEntry(rawCollaborator) {
    if (!rawCollaborator || typeof rawCollaborator !== "object") return null;
    const kind = deps.normalizeEntityKind(rawCollaborator.kind || rawCollaborator.entityKind);
    const refId = typeof rawCollaborator.refId === "string" && rawCollaborator.refId
      ? rawCollaborator.refId
      : (typeof rawCollaborator.entityRefId === "string" && rawCollaborator.entityRefId ? rawCollaborator.entityRefId : "");
    if (!kind || !refId) return null;
    const userById = deps.getUserById();
    const orgById = deps.getOrgById();
    if (kind === "user" && !userById.has(refId)) return null;
    if (kind === "org" && !orgById.has(refId)) return null;
    return {
      kind,
      refId,
      shareWorkspace: !!rawCollaborator.shareWorkspace
    };
  }

  function normalizeHandoverObjectRole(role) {
    return deps.HANDOVER_OBJECT_ROLES.includes(role) ? role : "reference";
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
    const currentCollaborators = Array.isArray(node.handoverCollaborators) ? node.handoverCollaborators : [];
    const changed = JSON.stringify(currentCollaborators) !== JSON.stringify(nextCollaborators);
    node.handoverCollaborators = nextCollaborators;
    return changed;
  }

  function normalizeHandoverFieldsForNode(node) {
    if (!node || node.type !== "handover") return false;
    let changed = false;
    if (deps.materializeLegacyHandoverCollaboratorFromMetaTo(node, {
      userById: deps.getUserById(),
      orgById: deps.getOrgById(),
      nodeRecords: deps.getAllNodesRuntime()
    })) {
      changed = true;
    }
    const nextStatus = deps.normalizeHandoverStatus(node.status);
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
        if (deps.normalizeEntityKind(collaborator?.kind) !== "org" || !collaborator?.shareWorkspace) return collaborator;
        changed = true;
        return {
          ...collaborator,
          shareWorkspace: false
        };
      });
      node.handoverCollaborators = nextCollaborators;
    }
    if (deps.isCollabWorkspaceOnlyHandover(node)) {
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

  return {
    getHandoverCollaboratorSignature,
    normalizeHandoverCollaboratorEntry,
    normalizeHandoverObjectRole,
    normalizeHandoverCollaboratorsForNode,
    normalizeHandoverFieldsForNode
  };
}
