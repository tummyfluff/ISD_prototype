export function createUiDetails(deps) {
  const state = deps.state;
  const detailsPaneEl = deps.detailsPaneEl;
  const {
    requestNodeEdit,
    canInlineEditNodeTitle,
    resetDetailsEditState,
    setNodeTitleById,
    renderAll,
    isNodeOwnedByCurrentUser,
    setNodeSummaryById,
    getStatusClass,
    getNodeStatusValue,
    getStatusOptionsForNode,
    createStatusPill,
    PROCESS_STATUSES,
    HANDOVER_STATUSES,
    setProcessStatusById,
    setHandoverStatusById,
    getNodeTitleFallback,
    getNodeDisplayTitle,
    getOwnerDisplayName,
    getNodeDetailsHeaderContextLabel,
    buildParentMap,
    getNodeById,
    selectNode,
    getChildLocations,
    openCollaboratorPickerModal,
    getDirectUserCollaboratorEntryForNode,
    openConfirmationModal,
    removeCurrentUserFromHandover,
    getResolvedHandoverCollaborators,
    isCollabWorkspaceOnlyHandover,
    toggleHandoverCollaboratorShare,
    removeHandoverCollaborator,
    openHandoverObjectPickerModal,
    getHandoverObjects,
    getAnyNodeById,
    compareNodesByDisplayLabel,
    HANDOVER_OBJECT_ROLES,
    HANDOVER_OBJECT_ROLE_LABELS,
    setHandoverObjectRole,
    getNodeOwnerShortLabel,
    canCurrentUserManageHandoverTasks,
    createTaskDraftState,
    getTaskAssigneeOptionsForContext,
    getTaskHandoverContextNode,
    normalizeTaskLinkedObjectIds,
    syncNodeRuntimeAndStore,
    persistStoreToLocalStorage,
    renderNotifications,
    saveTaskDraft,
    getTaskSlashRange,
    getTaskSlashOptions,
    applyTaskSlashSelection,
    getTaskObjectNodes,
    setTaskDoneState,
    deleteTaskById,
    canCurrentUserDeleteComment,
    clearCommentSeenForAllUsers,
    isCommentUnreadForCurrentUser,
    formatCommentTimestamp,
    addCommentToSelectedNode,
    isAdminMode,
    getSelectedNode
  } = deps;
function beginDetailsTitleInteraction(node) {
  if (!node) return;
  if (node.type === "portal" || node.type === "entity") {
    requestNodeEdit(node.id);
    return;
  }
  if (!canInlineEditNodeTitle(node)) return;
  state.detailsTitleEditNodeId = node.id;
  state.detailsTitleDraft = node.title || node.label || "";
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
  state.detailsTitleEditNodeId = null;
  state.detailsTitleDraft = "";
  renderDetailsPane();
}

function commitDetailsTitleEdit(nodeId) {
  if (!nodeId || state.detailsTitleEditNodeId !== nodeId) return;
  const nextTitle = state.detailsTitleDraft;
  resetDetailsEditState();
  setNodeTitleById(nodeId, nextTitle);
  renderAll();
}

function beginDetailsSummaryEdit(node) {
  if (!node || !isNodeOwnedByCurrentUser(node)) return;
  state.detailsSummaryEditNodeId = node.id;
  state.detailsSummaryDraft = typeof node.summary === "string" ? node.summary : "";
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
  state.detailsSummaryEditNodeId = null;
  state.detailsSummaryDraft = "";
  renderDetailsPane();
}

function commitDetailsSummaryEdit(nodeId) {
  if (!nodeId || state.detailsSummaryEditNodeId !== nodeId) return;
  const nextSummary = state.detailsSummaryDraft;
  state.detailsSummaryEditNodeId = null;
  state.detailsSummaryDraft = "";
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

  if (state.detailsTitleEditNodeId === selectedNode.id && canInlineEditNodeTitle(selectedNode)) {
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.className = "details-title-edit-input";
    titleInput.value = state.detailsTitleDraft;
    titleInput.placeholder = getNodeTitleFallback(selectedNode);
    titleInput.maxLength = 120;
    titleInput.addEventListener("input", () => {
      state.detailsTitleDraft = titleInput.value;
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

  if (state.detailsSummaryEditNodeId === selectedNode.id && isNodeOwnedByCurrentUser(selectedNode)) {
    const descriptionForm = document.createElement("form");
    descriptionForm.className = "details-description-form";
    const summaryInput = document.createElement("textarea");
    summaryInput.className = "details-summary-textarea";
    summaryInput.rows = 5;
    summaryInput.placeholder = "Add a description";
    summaryInput.value = state.detailsSummaryDraft;
    summaryInput.addEventListener("input", () => {
      state.detailsSummaryDraft = summaryInput.value;
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
    const directUserCollaborator = getDirectUserCollaboratorEntryForNode(selectedNode, state.currentUserId);
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
  state.detailsTaskEditState = {
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
  if (state.detailsTaskComposerState.nodeId !== node.id) {
    state.detailsTaskComposerState = createTaskDraftState(node);
    return;
  }
  const assigneeOptions = getTaskAssigneeOptionsForContext(node);
  state.detailsTaskComposerState.assignedTo = assigneeOptions.includes(state.detailsTaskComposerState.assignedTo)
    ? state.detailsTaskComposerState.assignedTo
    : (assigneeOptions[0] || "");
  const handoverContextNode = getTaskHandoverContextNode(node);
  if (handoverContextNode) {
    state.detailsTaskComposerState.linkedObjectIds = normalizeTaskLinkedObjectIds(handoverContextNode, state.detailsTaskComposerState.linkedObjectIds);
  } else {
    state.detailsTaskComposerState.linkedObjectIds = [];
    state.detailsTaskComposerState.slashRange = null;
  }
}

function persistDetailsTaskChanges() {
  syncNodeRuntimeAndStore();
  persistStoreToLocalStorage();
  renderDetailsPane();
  renderNotifications();
}

function beginDetailsTaskEdit(node, task) {
  state.detailsTaskEditState = createTaskDraftState(node, task);
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
  if (!node || !task || state.detailsTaskEditState.nodeId !== node.id || state.detailsTaskEditState.taskId !== task.id) return;
  const changed = saveTaskDraft(node, state.detailsTaskEditState, task);
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
    state.detailsTaskEditState.nodeId === selectedNode.id &&
    state.detailsTaskEditState.taskId &&
    !selectedNode.tasks.some((task) => task.id === state.detailsTaskEditState.taskId)
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
      const isEditingTask = state.detailsTaskEditState.nodeId === selectedNode.id && state.detailsTaskEditState.taskId === task.id;
      if (isEditingTask) {
        const editRow = document.createElement("div");
        editRow.className = "task-row is-editing";
        editRow.appendChild(buildTaskEditor(selectedNode, state.detailsTaskEditState, {
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
          if (state.detailsTaskEditState.taskId === task.id) {
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
  section.appendChild(buildTaskEditor(selectedNode, state.detailsTaskComposerState, {
    submitLabel: "Add task",
    placeholder: "Task description",
    onSubmit: () => {
      const changed = saveTaskDraft(selectedNode, state.detailsTaskComposerState, null);
      if (!changed) return;
      state.detailsTaskComposerState = createTaskDraftState(selectedNode);
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
  return {
    createStatusControlForNode,
    renderDetailsPane
  };
}
