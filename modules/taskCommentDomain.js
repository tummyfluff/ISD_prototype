export function createTaskCommentDomain(deps) {
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
      : (preferredId || deps.generateCommentId());
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
      id: typeof task?.id === "string" && task.id ? task.id : deps.generateTaskId(),
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

  function normalizeTaskLinkedObjectIds(handoverNode, linkedObjectIds) {
    if (!handoverNode || handoverNode.type !== "handover") return [];
    const validObjectIds = new Set(deps.getHandoverObjectCandidates(handoverNode).map((candidate) => candidate.node.id));
    return [...new Set(
      (Array.isArray(linkedObjectIds) ? linkedObjectIds : [])
        .filter((nodeId) => typeof nodeId === "string" && validObjectIds.has(nodeId))
    )].sort((leftNodeId, rightNodeId) => {
      const leftNode = deps.getNodeById(leftNodeId);
      const rightNode = deps.getNodeById(rightNodeId);
      return deps.compareNodesByDisplayLabel(leftNode, rightNode);
    });
  }

  return {
    buildDeterministicCommentId,
    normalizeCommentRecord,
    normalizeCommentRecords,
    normalizeTaskRecord,
    normalizeTaskLinkedObjectIds
  };
}
