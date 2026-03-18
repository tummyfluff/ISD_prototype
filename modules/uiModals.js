export function createUiModals(deps) {
  const state = deps.state;
  const getOrgs = deps.getOrgs;
  const getUsers = deps.getUsers;
  const getOrgById = deps.getOrgById;
  const {
    portalLinkModalOverlayEl,
    portalLinkModalEl,
    portalLinkModalSelectEl,
    portalLinkModalConfirmBtnEl,
    portalLinkModalHintEl,
    portalLinkModalCloseBtnEl,
    entityLinkModalOverlayEl,
    entityLinkModalEl,
    entityLinkModalKindSelectEl,
    entityLinkModalRefSelectEl,
    entityLinkModalConfirmBtnEl,
    entityLinkModalHintEl,
    collaboratorPickerModalOverlayEl,
    collaboratorPickerModalEl,
    collaboratorPickerModalBodyEl,
    collaboratorPickerModalConfirmBtnEl,
    collaboratorPickerModalHintEl,
    collaboratorPickerModalCloseBtnEl,
    handoverObjectPickerModalOverlayEl,
    handoverObjectPickerModalEl,
    handoverObjectPickerModalBodyEl,
    handoverObjectPickerModalConfirmBtnEl,
    handoverObjectPickerModalHintEl,
    handoverObjectPickerModalCloseBtnEl,
    confirmationModalOverlayEl,
    confirmationModalEl,
    confirmationModalTitleEl,
    confirmationModalMessageEl,
    confirmationModalConfirmBtnEl,
    adminOrgModalOverlayEl,
    adminOrgModalBodyEl,
    adminOrgModalInputEl,
    adminUserModalOverlayEl,
    adminUserModalBodyEl,
    adminUserModalInputEl,
    adminUserModalOrgSelectEl,
    getNodeById,
    getLinkableWorkspaceOptionsForCurrentUser,
    selectSingleNode,
    cancelEdgeCreateInteractions,
    closeCreateNodeMenu,
    renderWorkspaceMenu,
    deleteNodeFromCurrentWorkspace,
    syncNodeRuntimeAndStore,
    persistStoreToLocalStorage,
    renderAll,
    normalizeEntityKind,
    getEntityDisplayName,
    applyDerivedEntityIdentity,
    getEntityOptionsForKind,
    getInitialEntitySelectionForNode,
    isNodeOwnedByCurrentUser,
    getCollaboratorPickerGroups,
    addHandoverCollaborator,
    getHandoverObjectPickerOptions,
    normalizeHandoverObjectRole,
    HANDOVER_OBJECT_ROLES,
    HANDOVER_OBJECT_ROLE_LABELS,
    getNodeDisplayTitle,
    getNodeTitleFallback,
    addHandoverObjectIds,
    renderDetailsPane,
    resetConfirmationModalState,
    isAdminMode,
    resetAdminOrgModalState,
    getSortedOrgsForMenu,
    generateOrgId,
    syncOrgsRuntimeAndStore,
    renameOrganisationRecord,
    deleteOrganisationRecordById,
    resetAdminUserModalState,
    getSortedUsersForMenu,
    generateUserId,
    syncUsersRuntimeAndStore,
    isAdminUserId,
    renameUserRecord,
    deleteUserRecordById
  } = deps;
function renderPortalLinkModal() {
  if (!portalLinkModalOverlayEl || !portalLinkModalEl || !portalLinkModalSelectEl || !portalLinkModalConfirmBtnEl) return;
  const isOpen = !!state.portalLinkModalState.open;
  portalLinkModalOverlayEl.classList.toggle("is-open", isOpen);
  portalLinkModalOverlayEl.setAttribute("aria-hidden", String(!isOpen));
  if (!isOpen) return;

  const portalNode = getNodeById(state.portalLinkModalState.nodeId);
  if (!portalNode || portalNode.type !== "portal") {
    state.portalLinkModalState.open = false;
    state.portalLinkModalState.nodeId = null;
    state.portalLinkModalState.selectedWorkspaceId = "";
    state.portalLinkModalState.flow = "edit";
    portalLinkModalOverlayEl.classList.remove("is-open");
    portalLinkModalOverlayEl.setAttribute("aria-hidden", "true");
    return;
  }

  const linkableWorkspaces = getLinkableWorkspaceOptionsForCurrentUser(state.currentWorkspaceId);
  const linkedWorkspaceId = typeof portalNode.linkedWorkspaceId === "string" ? portalNode.linkedWorkspaceId : "";
  let selectedWorkspaceId = state.portalLinkModalState.selectedWorkspaceId || "";
  if (!linkableWorkspaces.some((workspace) => workspace.id === selectedWorkspaceId)) {
    if (linkedWorkspaceId && linkableWorkspaces.some((workspace) => workspace.id === linkedWorkspaceId)) {
      selectedWorkspaceId = linkedWorkspaceId;
    } else {
      selectedWorkspaceId = linkableWorkspaces[0]?.id || "";
    }
    state.portalLinkModalState.selectedWorkspaceId = selectedWorkspaceId;
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
  state.workspaceMenuOpen = false;
  state.userMenuOpen = false;
  renderWorkspaceMenu();
  const linkableWorkspaces = getLinkableWorkspaceOptionsForCurrentUser(state.currentWorkspaceId);
  const existingLinkedWorkspaceId = typeof node.linkedWorkspaceId === "string" ? node.linkedWorkspaceId : "";
  let selectedWorkspaceId = "";
  if (existingLinkedWorkspaceId && linkableWorkspaces.some((workspace) => workspace.id === existingLinkedWorkspaceId)) {
    selectedWorkspaceId = existingLinkedWorkspaceId;
  } else {
    selectedWorkspaceId = linkableWorkspaces[0]?.id || "";
  }
  state.portalLinkModalState = {
    open: true,
    nodeId: node.id,
    selectedWorkspaceId,
    flow: options.flow || "edit"
  };
  renderPortalLinkModal();
  requestAnimationFrame(() => {
    if (!state.portalLinkModalState.open) return;
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
  const modalNodeId = state.portalLinkModalState.nodeId;
  state.portalLinkModalState = {
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
  if (!state.portalLinkModalState.open) return;
  const node = getNodeById(state.portalLinkModalState.nodeId);
  if (!node || node.type !== "portal") {
    closePortalLinkModal({ keepNode: true });
    return;
  }
  const selectedWorkspaceId = String(state.portalLinkModalState.selectedWorkspaceId || "");
  const linkableWorkspaceIds = new Set(
    getLinkableWorkspaceOptionsForCurrentUser(state.currentWorkspaceId).map((workspace) => workspace.id)
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
  if (!state.portalLinkModalState.open) return;
  const nodeId = state.portalLinkModalState.nodeId;
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
  const isOpen = !!state.entityLinkModalState.open;
  entityLinkModalOverlayEl.classList.toggle("is-open", isOpen);
  entityLinkModalOverlayEl.setAttribute("aria-hidden", String(!isOpen));
  if (!isOpen) return;

  const entityNode = getNodeById(state.entityLinkModalState.nodeId);
  if (!entityNode || entityNode.type !== "entity") {
    state.entityLinkModalState = {
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

  const selectedEntityKind = normalizeEntityKind(state.entityLinkModalState.selectedEntityKind) || "user";
  const entityOptions = getEntityOptionsForKind(selectedEntityKind);
  let selectedEntityRefId = state.entityLinkModalState.selectedEntityRefId || "";
  if (!entityOptions.some((option) => option.id === selectedEntityRefId)) {
    selectedEntityRefId = entityOptions[0]?.id || "";
    state.entityLinkModalState.selectedEntityRefId = selectedEntityRefId;
  }
  state.entityLinkModalState.selectedEntityKind = selectedEntityKind;

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
  state.workspaceMenuOpen = false;
  state.userMenuOpen = false;
  renderWorkspaceMenu();
  const initialSelection = getInitialEntitySelectionForNode(node);
  state.entityLinkModalState = {
    open: true,
    nodeId: node.id,
    selectedEntityKind: initialSelection.entityKind,
    selectedEntityRefId: initialSelection.entityRefId,
    flow: options.flow || "edit"
  };
  renderEntityLinkModal();
  requestAnimationFrame(() => {
    if (!state.entityLinkModalState.open) return;
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
  const modalNodeId = state.entityLinkModalState.nodeId;
  state.entityLinkModalState = {
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
  if (state.entityLinkModalState.flow === "create") {
    cancelEntityLinkModalAndDeleteNode();
    return;
  }
  closeEntityLinkModal({ keepNode: true });
}

function confirmEntityLinkModal() {
  if (!state.entityLinkModalState.open) return;
  const node = getNodeById(state.entityLinkModalState.nodeId);
  if (!node || node.type !== "entity") {
    closeEntityLinkModal({ keepNode: true });
    return;
  }
  const selectedEntityKind = normalizeEntityKind(state.entityLinkModalState.selectedEntityKind);
  const selectedEntityRefId = String(state.entityLinkModalState.selectedEntityRefId || "");
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
  if (!state.entityLinkModalState.open) return;
  const nodeId = state.entityLinkModalState.nodeId;
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
  const isOpen = !!state.collaboratorPickerModalState.open;
  collaboratorPickerModalOverlayEl.classList.toggle("is-open", isOpen);
  collaboratorPickerModalOverlayEl.setAttribute("aria-hidden", String(!isOpen));
  if (!isOpen) return;

  const handoverNode = getNodeById(state.collaboratorPickerModalState.nodeId);
  if (!handoverNode || handoverNode.type !== "handover" || !isNodeOwnedByCurrentUser(handoverNode)) {
    state.collaboratorPickerModalState = {
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
  state.collaboratorPickerModalState.selectedCollaboratorKeys = state.collaboratorPickerModalState.selectedCollaboratorKeys
    .filter((key) => validKeys.has(key));

  collaboratorPickerModalBodyEl.innerHTML = "";
  collaboratorPickerModalConfirmBtnEl.disabled = state.collaboratorPickerModalState.selectedCollaboratorKeys.length === 0;
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
      checkboxEl.checked = state.collaboratorPickerModalState.selectedCollaboratorKeys.includes(option.key);
      checkboxEl.addEventListener("change", () => {
        if (checkboxEl.checked) {
          if (!state.collaboratorPickerModalState.selectedCollaboratorKeys.includes(option.key)) {
            state.collaboratorPickerModalState.selectedCollaboratorKeys = [
              ...state.collaboratorPickerModalState.selectedCollaboratorKeys,
              option.key
            ];
          }
        } else {
          state.collaboratorPickerModalState.selectedCollaboratorKeys = state.collaboratorPickerModalState.selectedCollaboratorKeys
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
  state.collaboratorPickerModalState = {
    open: true,
    nodeId: handoverNode.id,
    selectedCollaboratorKeys: []
  };
  renderCollaboratorPickerModal();
  requestAnimationFrame(() => {
    if (!state.collaboratorPickerModalState.open) return;
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
  state.collaboratorPickerModalState = {
    open: false,
    nodeId: null,
    selectedCollaboratorKeys: []
  };
  renderCollaboratorPickerModal();
}

function confirmCollaboratorPickerModal() {
  if (!state.collaboratorPickerModalState.open) return;
  const handoverNode = getNodeById(state.collaboratorPickerModalState.nodeId);
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
  state.collaboratorPickerModalState.selectedCollaboratorKeys.forEach((selectedKey) => {
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
  const isOpen = !!state.handoverObjectPickerModalState.open;
  handoverObjectPickerModalOverlayEl.classList.toggle("is-open", isOpen);
  handoverObjectPickerModalOverlayEl.setAttribute("aria-hidden", String(!isOpen));
  if (!isOpen) return;

  const handoverNode = getNodeById(state.handoverObjectPickerModalState.nodeId);
  if (!handoverNode || handoverNode.type !== "handover" || !isNodeOwnedByCurrentUser(handoverNode)) {
    state.handoverObjectPickerModalState = {
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
    normalizeHandoverObjectRole(state.handoverObjectPickerModalState.selectedRole)
  );
  const validNodeIds = new Set(options.map((option) => option.id));
  state.handoverObjectPickerModalState.selectedNodeIds = state.handoverObjectPickerModalState.selectedNodeIds
    .filter((nodeId) => validNodeIds.has(nodeId));

  handoverObjectPickerModalBodyEl.innerHTML = "";
  handoverObjectPickerModalConfirmBtnEl.disabled = state.handoverObjectPickerModalState.selectedNodeIds.length === 0;
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
    roleSelectEl.value = normalizeHandoverObjectRole(state.handoverObjectPickerModalState.selectedRole);
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
  roleSelectEl.value = normalizeHandoverObjectRole(state.handoverObjectPickerModalState.selectedRole);
  roleSelectEl.addEventListener("change", () => {
    state.handoverObjectPickerModalState.selectedRole = normalizeHandoverObjectRole(roleSelectEl.value);
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
    checkboxEl.checked = state.handoverObjectPickerModalState.selectedNodeIds.includes(optionNode.id);
    checkboxEl.addEventListener("change", () => {
      if (checkboxEl.checked) {
        if (!state.handoverObjectPickerModalState.selectedNodeIds.includes(optionNode.id)) {
          state.handoverObjectPickerModalState.selectedNodeIds = [
            ...state.handoverObjectPickerModalState.selectedNodeIds,
            optionNode.id
          ];
        }
      } else {
        state.handoverObjectPickerModalState.selectedNodeIds = state.handoverObjectPickerModalState.selectedNodeIds
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
  state.handoverObjectPickerModalState = {
    open: true,
    nodeId: handoverNode.id,
    selectedNodeIds: [],
    selectedRole: "reference"
  };
  renderHandoverObjectPickerModal();
  requestAnimationFrame(() => {
    if (!state.handoverObjectPickerModalState.open) return;
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
  state.handoverObjectPickerModalState = {
    open: false,
    nodeId: null,
    selectedNodeIds: [],
    selectedRole: "reference"
  };
  renderHandoverObjectPickerModal();
}

function confirmHandoverObjectPickerModal() {
  if (!state.handoverObjectPickerModalState.open) return;
  const handoverNode = getNodeById(state.handoverObjectPickerModalState.nodeId);
  if (!handoverNode || handoverNode.type !== "handover" || !isNodeOwnedByCurrentUser(handoverNode)) {
    closeHandoverObjectPickerModal();
    return;
  }
  const changed = addHandoverObjectIds(
    handoverNode.id,
    state.handoverObjectPickerModalState.selectedNodeIds,
    state.handoverObjectPickerModalState.selectedRole
  );
  closeHandoverObjectPickerModal();
  if (changed) {
    renderAll();
    return;
  }
  renderDetailsPane();
}

function openConfirmationModal({ title, message, confirmLabel = "Delete", confirmTone = "delete", onConfirm = null }) {
  state.confirmationModalState = {
    open: true,
    title: String(title || "Confirm action"),
    message: String(message || ""),
    confirmLabel: String(confirmLabel || "Delete"),
    confirmTone,
    onConfirm: typeof onConfirm === "function" ? onConfirm : null
  };
  renderConfirmationModal();
  requestAnimationFrame(() => {
    if (!state.confirmationModalState.open) return;
    confirmationModalConfirmBtnEl.focus();
  });
}

function closeConfirmationModal() {
  resetConfirmationModalState();
  renderConfirmationModal();
}

function confirmConfirmationModal() {
  if (!state.confirmationModalState.open) return;
  const handler = state.confirmationModalState.onConfirm;
  closeConfirmationModal();
  if (typeof handler === "function") {
    handler();
  }
}

function renderConfirmationModal() {
  if (!confirmationModalOverlayEl || !confirmationModalEl) return;
  const isOpen = !!state.confirmationModalState.open;
  confirmationModalOverlayEl.classList.toggle("is-open", isOpen);
  confirmationModalOverlayEl.setAttribute("aria-hidden", String(!isOpen));
  if (!isOpen) return;
  confirmationModalTitleEl.textContent = state.confirmationModalState.title || "Confirm action";
  confirmationModalMessageEl.textContent = state.confirmationModalState.message || "";
  confirmationModalConfirmBtnEl.textContent = state.confirmationModalState.confirmLabel || "Delete";
  confirmationModalConfirmBtnEl.classList.toggle("is-danger", state.confirmationModalState.confirmTone === "delete");
}

function openAdminOrgModal() {
  if (!isAdminMode()) return false;
  state.adminOrgModalState.open = true;
  state.adminOrgModalState.renameOrgId = null;
  state.adminOrgModalState.renameDraft = "";
  renderAdminOrgModal();
  requestAnimationFrame(() => {
    if (!state.adminOrgModalState.open) return;
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
  const isOpen = !!state.adminOrgModalState.open && isAdminMode();
  adminOrgModalOverlayEl.classList.toggle("is-open", isOpen);
  adminOrgModalOverlayEl.setAttribute("aria-hidden", String(!isOpen));
  if (!isOpen) return;

  const sortedOrgs = getSortedOrgsForMenu();
  adminOrgModalInputEl.value = state.adminOrgModalState.draftName;
  adminOrgModalInputEl.onkeydown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    const trimmedName = String(state.adminOrgModalState.draftName || adminOrgModalInputEl.value || "").trim();
    if (!trimmedName) return;
    const nextOrgId = generateOrgId(trimmedName);
    getOrgs().push({ id: nextOrgId, name: trimmedName });
    syncOrgsRuntimeAndStore();
    state.adminOrgModalState.draftName = "";
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
    const isRenaming = state.adminOrgModalState.renameOrgId === orgRecord.id;
    if (isRenaming) {
      const inputEl = document.createElement("input");
      inputEl.type = "text";
      inputEl.className = "workspace-rename-input";
      inputEl.maxLength = 80;
      inputEl.value = state.adminOrgModalState.renameDraft;
      inputEl.addEventListener("input", () => {
        state.adminOrgModalState.renameDraft = inputEl.value;
      });
      inputEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          if (renameOrganisationRecord(orgRecord.id, state.adminOrgModalState.renameDraft)) {
            state.adminOrgModalState.renameOrgId = null;
            state.adminOrgModalState.renameDraft = "";
            renderAll();
          } else {
            renderAdminOrgModal();
          }
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          state.adminOrgModalState.renameOrgId = null;
          state.adminOrgModalState.renameDraft = "";
          renderAdminOrgModal();
        }
      });
      inputEl.addEventListener("blur", () => {
        if (state.adminOrgModalState.renameOrgId !== orgRecord.id) return;
        state.adminOrgModalState.renameOrgId = null;
        state.adminOrgModalState.renameDraft = "";
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
        state.adminOrgModalState.renameOrgId = orgRecord.id;
        state.adminOrgModalState.renameDraft = orgRecord.name || "";
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
            if (state.adminUserModalState.selectedOrgId === orgRecord.id) {
              state.adminUserModalState.selectedOrgId = "";
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
  if (!state.adminUserModalState.selectedOrgId || !getOrgById().has(state.adminUserModalState.selectedOrgId)) {
    state.adminUserModalState.selectedOrgId = getSortedOrgsForMenu()[0]?.id || "";
  }
  state.adminUserModalState.open = true;
  state.adminUserModalState.renameUserId = null;
  state.adminUserModalState.renameDraft = "";
  renderAdminUserModal();
  requestAnimationFrame(() => {
    if (!state.adminUserModalState.open) return;
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
  const isOpen = !!state.adminUserModalState.open && isAdminMode();
  adminUserModalOverlayEl.classList.toggle("is-open", isOpen);
  adminUserModalOverlayEl.setAttribute("aria-hidden", String(!isOpen));
  if (!isOpen) return;

  const sortedOrgs = getSortedOrgsForMenu();
  if (!state.adminUserModalState.selectedOrgId || !sortedOrgs.some((orgRecord) => orgRecord.id === state.adminUserModalState.selectedOrgId)) {
    state.adminUserModalState.selectedOrgId = sortedOrgs[0]?.id || "";
  }

  adminUserModalOrgSelectEl.innerHTML = "";
  sortedOrgs.forEach((orgRecord) => {
    const optionEl = document.createElement("option");
    optionEl.value = orgRecord.id;
    optionEl.textContent = orgRecord.name || orgRecord.id;
    adminUserModalOrgSelectEl.appendChild(optionEl);
  });
  adminUserModalOrgSelectEl.disabled = sortedOrgs.length === 0;
  adminUserModalOrgSelectEl.value = state.adminUserModalState.selectedOrgId;

  adminUserModalInputEl.value = state.adminUserModalState.draftName;
  adminUserModalInputEl.disabled = !state.adminUserModalState.selectedOrgId;
  adminUserModalInputEl.onkeydown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    const trimmedName = String(state.adminUserModalState.draftName || adminUserModalInputEl.value || "").trim();
    if (!trimmedName || !state.adminUserModalState.selectedOrgId) return;
    const nextUserId = generateUserId(trimmedName);
    getUsers().push({
      id: nextUserId,
      name: trimmedName,
      orgId: state.adminUserModalState.selectedOrgId
    });
    syncUsersRuntimeAndStore();
    state.adminUserModalState.draftName = "";
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
    return userRecord.orgId === state.adminUserModalState.selectedOrgId;
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
    const isRenaming = state.adminUserModalState.renameUserId === userRecord.id;
    if (isRenaming) {
      const inputEl = document.createElement("input");
      inputEl.type = "text";
      inputEl.className = "workspace-rename-input";
      inputEl.maxLength = 80;
      inputEl.value = state.adminUserModalState.renameDraft;
      inputEl.addEventListener("input", () => {
        state.adminUserModalState.renameDraft = inputEl.value;
      });
      inputEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          if (renameUserRecord(userRecord.id, state.adminUserModalState.renameDraft)) {
            state.adminUserModalState.renameUserId = null;
            state.adminUserModalState.renameDraft = "";
            renderAll();
          } else {
            renderAdminUserModal();
          }
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          state.adminUserModalState.renameUserId = null;
          state.adminUserModalState.renameDraft = "";
          renderAdminUserModal();
        }
      });
      inputEl.addEventListener("blur", () => {
        if (state.adminUserModalState.renameUserId !== userRecord.id) return;
        state.adminUserModalState.renameUserId = null;
        state.adminUserModalState.renameDraft = "";
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
        state.adminUserModalState.renameUserId = userRecord.id;
        state.adminUserModalState.renameDraft = userRecord.name || "";
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
  return {
    renderPortalLinkModal,
    openPortalLinkModal,
    closePortalLinkModal,
    confirmPortalLinkModal,
    cancelPortalLinkModalAndDeleteNode,
    renderEntityLinkModal,
    openEntityLinkModal,
    closeEntityLinkModal,
    cancelEntityLinkModal,
    confirmEntityLinkModal,
    cancelEntityLinkModalAndDeleteNode,
    renderCollaboratorPickerModal,
    openCollaboratorPickerModal,
    closeCollaboratorPickerModal,
    confirmCollaboratorPickerModal,
    renderHandoverObjectPickerModal,
    openHandoverObjectPickerModal,
    closeHandoverObjectPickerModal,
    confirmHandoverObjectPickerModal,
    openConfirmationModal,
    closeConfirmationModal,
    confirmConfirmationModal,
    renderConfirmationModal,
    openAdminOrgModal,
    closeAdminOrgModal,
    renderAdminOrgModal,
    openAdminUserModal,
    closeAdminUserModal,
    renderAdminUserModal
  };
}
