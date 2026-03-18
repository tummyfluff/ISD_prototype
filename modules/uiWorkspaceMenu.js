export function createUiWorkspaceMenu(deps) {
  function getOwnerInitial(ownerName) {
    const normalized = String(ownerName || "").trim();
    if (!normalized) return "?";
    const firstLetterMatch = normalized.match(/[A-Za-z0-9]/);
    if (!firstLetterMatch) return "?";
    return firstLetterMatch[0].toUpperCase();
  }

  function getWorkspaceMenuTriggerDisplayData() {
    const currentWorkspaceRecord = deps.getCurrentWorkspaceRecord();
    const currentWorkspaceOption = deps.getWorkspaceOptionById(deps.state.currentWorkspaceId) || null;
    const workspaceName = String(
      currentWorkspaceOption?.name
      || currentWorkspaceRecord?.name
      || "No workspace"
    ).trim() || "No workspace";
    const ownerId = currentWorkspaceOption?.ownerId || currentWorkspaceRecord?.ownerId || null;
    const ownerRecord = ownerId ? deps.getUserById().get(ownerId) || null : null;
    const ownerName = String(ownerRecord?.name || "").trim() || "Unknown owner";
    const ownerInitial = ownerRecord ? getOwnerInitial(ownerName) : "?";
    const ariaLabel = `Workspace: ${workspaceName}. Owner: ${ownerName}. Open workspace menu.`;
    const title = `${workspaceName} · Owner: ${ownerName}`;
    return {
      workspaceName,
      ownerInitial,
      ariaLabel,
      title
    };
  }

  function renderWorkspaceMenuTrigger() {
    const {
      workspaceMenuBtnEl,
      workspaceMenuBtnAvatarEl,
      workspaceMenuBtnNameEl,
      workspaceMenuBtnChevronEl
    } = deps.getDom();
    if (!workspaceMenuBtnEl) return;
    const triggerData = getWorkspaceMenuTriggerDisplayData();
    workspaceMenuBtnEl.setAttribute("aria-label", triggerData.ariaLabel);
    workspaceMenuBtnEl.setAttribute("title", triggerData.title);
    workspaceMenuBtnEl.setAttribute("aria-expanded", String(deps.state.workspaceMenuOpen));
    if (workspaceMenuBtnAvatarEl) {
      workspaceMenuBtnAvatarEl.textContent = triggerData.ownerInitial;
    } else {
      workspaceMenuBtnEl.dataset.ownerInitial = triggerData.ownerInitial;
    }
    if (workspaceMenuBtnNameEl) {
      workspaceMenuBtnNameEl.textContent = triggerData.workspaceName;
    }
    if (workspaceMenuBtnChevronEl) {
      workspaceMenuBtnChevronEl.textContent = "▼";
    }
  }

  function renderWorkspaceMenu() {
    const {
      workspaceMenuBtnEl,
      workspaceMenuPanelEl
    } = deps.getDom();
    if (!workspaceMenuBtnEl || !workspaceMenuPanelEl) return;
    let createInputEl = null;
    let renameInputEl = null;
    const currentUserName = deps.getCurrentUserName();
    renderWorkspaceMenuTrigger();
    workspaceMenuPanelEl.classList.toggle("is-open", deps.state.workspaceMenuOpen);
    workspaceMenuPanelEl.setAttribute("aria-label", `Workspace and user list. Current user: ${currentUserName}`);
    workspaceMenuPanelEl.innerHTML = "";

    const userSelectEl = document.createElement("div");
    userSelectEl.className = "workspace-user-select";
    const userToggleEl = document.createElement("button");
    userToggleEl.type = "button";
    userToggleEl.className = "workspace-user-toggle";
    userToggleEl.setAttribute("aria-label", "Select user");
    userToggleEl.setAttribute("aria-expanded", String(deps.state.userMenuOpen));

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
      deps.state.userMenuOpen = !deps.state.userMenuOpen;
      renderWorkspaceMenu();
    });
    userSelectEl.appendChild(userToggleEl);

    if (deps.state.userMenuOpen) {
      const userDropdownEl = document.createElement("div");
      userDropdownEl.className = "workspace-user-dropdown";
      const sortedUsers = deps.getSortedUsersForMenu();
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
          const isActiveUser = user.id === deps.state.currentUserId;
          if (isActiveUser) {
            userItemEl.classList.add("is-active");
          }

          const userNameEl = document.createElement("span");
          userNameEl.className = "workspace-user-name";
          userNameEl.textContent = user.name || user.id;
          userItemEl.appendChild(userNameEl);

          const orgById = deps.getOrgById();
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
            deps.rememberCurrentWorkspaceViewport({ persist: true });
            deps.state.currentUserId = user.id;
            deps.setCurrentWorkspaceForCurrentUser();
            deps.invalidateActiveWorkspaceView({ autoFit: "if-missing", clearAppliedWorkspaceId: true });
            deps.state.userMenuOpen = false;
            deps.resetWorkspaceCreateState();
            deps.resetWorkspaceRenameState();
            deps.closeAdminOrgModal();
            deps.closeAdminUserModal();
            deps.closeConfirmationModal();
            deps.renderAll();
          });
          userDropdownEl.appendChild(userItemEl);
        });
      }
      userSelectEl.appendChild(userDropdownEl);
    }
    workspaceMenuPanelEl.appendChild(userSelectEl);

    if (deps.isAdminMode()) {
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
        deps.openAdminOrgModal();
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
        deps.openAdminUserModal();
      });
      userActionRowEl.appendChild(userActionBtnEl);
      adminActionsEl.appendChild(userActionRowEl);

      workspaceMenuPanelEl.appendChild(adminActionsEl);
      return;
    }

    const workspaceListEl = document.createElement("div");
    workspaceListEl.className = "workspace-workspace-list";
    const visibleWorkspaceOptions = deps.getWorkspaceOptionsForCurrentUser();
    if (!visibleWorkspaceOptions.length) {
      const noWorkspacesEl = document.createElement("div");
      noWorkspacesEl.className = "workspace-menu-empty";
      noWorkspacesEl.textContent = "No workspaces";
      workspaceListEl.appendChild(noWorkspacesEl);
    } else {
      visibleWorkspaceOptions.forEach((workspace) => {
        const rowEl = document.createElement("div");
        rowEl.className = "workspace-menu-row";
        const isActive = workspace.id === deps.state.currentWorkspaceId;
        const isSharedWorkspace = workspace.access === "shared";
        const isRenaming = !isSharedWorkspace && deps.state.workspaceRenameId === workspace.id;
        if (isActive) {
          rowEl.classList.add("is-active");
        }

        if (isRenaming) {
          const renameInput = document.createElement("input");
          renameInput.type = "text";
          renameInput.className = "workspace-rename-input";
          renameInput.placeholder = "Workspace name";
          renameInput.value = deps.state.workspaceRenameDraft;
          renameInput.maxLength = 80;
          renameInput.addEventListener("click", (event) => {
            event.stopPropagation();
          });
          renameInput.addEventListener("input", () => {
            deps.state.workspaceRenameDraft = renameInput.value;
          });
          renameInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.stopPropagation();
              const renamed = deps.renameWorkspace(workspace.id, deps.state.workspaceRenameDraft);
              if (renamed) {
                deps.resetWorkspaceRenameState();
              }
              renderWorkspaceMenu();
              return;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              deps.resetWorkspaceRenameState();
              renderWorkspaceMenu();
            }
          });
          renameInput.addEventListener("blur", () => {
            if (deps.state.workspaceRenameId !== workspace.id) return;
            deps.resetWorkspaceRenameState();
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
            deps.navigateToWorkspaceById(workspace.id);
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
            deps.resetWorkspaceCreateState();
            deps.state.workspaceRenameId = workspace.id;
            deps.state.workspaceRenameDraft = workspace.name || workspace.id || "";
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
            const deleted = deps.deleteWorkspace(workspace.id);
            if (!deleted) return;
            if (deps.state.workspaceRenameId === workspace.id) {
              deps.resetWorkspaceRenameState();
            }
            deps.resetWorkspaceCreateState();
            deps.renderAll();
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

    if (!deps.state.currentUserId) {
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
    } else if (!deps.state.isCreatingWorkspace) {
      const createBtnEl = document.createElement("button");
      createBtnEl.type = "button";
      createBtnEl.className = "workspace-create-btn";
      createBtnEl.textContent = "+ Workspace";
      createBtnEl.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        deps.resetWorkspaceRenameState();
        deps.state.isCreatingWorkspace = true;
        deps.state.workspaceDraftName = "";
        renderWorkspaceMenu();
      });
      createWrapEl.appendChild(createBtnEl);
    } else {
      const nameInputEl = document.createElement("input");
      nameInputEl.type = "text";
      nameInputEl.className = "workspace-create-input";
      nameInputEl.placeholder = "Workspace name";
      nameInputEl.value = deps.state.workspaceDraftName;
      nameInputEl.maxLength = 80;
      nameInputEl.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      nameInputEl.addEventListener("input", () => {
        deps.state.workspaceDraftName = nameInputEl.value;
      });
      nameInputEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          const createdWorkspace = deps.createWorkspaceForCurrentUser(deps.state.workspaceDraftName);
          if (createdWorkspace) {
            deps.resetWorkspaceCreateState();
            deps.renderAll();
          }
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          deps.resetWorkspaceCreateState();
          renderWorkspaceMenu();
        }
      });
      nameInputEl.addEventListener("blur", () => {
        deps.resetWorkspaceCreateState();
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

  return {
    renderWorkspaceMenuTrigger,
    renderWorkspaceMenu
  };
}
