export function createWorkspaceGraphOps(deps) {
  function buildEdgeId(sourceId, targetId) {
    let candidate = `edge-${sourceId}-${targetId}`;
    while (deps.getEdgeById().has(candidate)) {
      deps.setEdgeRuntimeCounter(deps.getEdgeRuntimeCounter() + 1);
      candidate = `edge-${sourceId}-${targetId}-${deps.getEdgeRuntimeCounter()}`;
    }
    return candidate;
  }

  function getOutgoingEdges(nodeId, kindFilter = null) {
    const edgeIds = deps.getOutgoingEdgeIdsBySourceId().get(nodeId) || [];
    const list = edgeIds.map((edgeId) => deps.getEdgeById().get(edgeId)).filter(Boolean);
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

  function replaceOutgoingEdges(nodeId, targetIds, kindResolver = deps.inferEdgeKindForPair) {
    const sourceNode = deps.getNodeById().get(nodeId);
    if (!sourceNode) return;

    const dedupedTargetIds = [];
    const seenTargets = new Set();
    (Array.isArray(targetIds) ? targetIds : []).forEach((targetId) => {
      if (seenTargets.has(targetId)) return;
      if (!deps.getNodeById().has(targetId)) return;
      if (targetId === nodeId) return;
      seenTargets.add(targetId);
      dedupedTargetIds.push(targetId);
    });

    const edges = deps.getEdges();
    for (let i = edges.length - 1; i >= 0; i -= 1) {
      if (edges[i].sourceId === nodeId) {
        edges.splice(i, 1);
      }
    }

    dedupedTargetIds.forEach((targetId) => {
      const targetNode = deps.getNodeById().get(targetId);
      const kind = typeof kindResolver === "function"
        ? kindResolver(sourceNode, targetNode)
        : deps.inferEdgeKindForPair(sourceNode, targetNode);
      edges.push({
        id: buildEdgeId(nodeId, targetId),
        sourceId: nodeId,
        targetId,
        kind
      });
    });

    deps.rebuildEdgeIndexes();
  }

  function attachLinkedNodeAccessors(nodes) {
    if (!Array.isArray(nodes)) return;
    nodes.forEach((node) => {
      Object.defineProperty(node, "linkedNodeIds", {
        configurable: true,
        enumerable: true,
        get() {
          return getOutgoingNodeIds(node.id);
        },
        set(nextTargetIds) {
          replaceOutgoingEdges(node.id, nextTargetIds, deps.inferEdgeKindForPair);
        }
      });
    });
  }

  return {
    buildEdgeId,
    getOutgoingEdges,
    getOutgoingNodeIds,
    replaceOutgoingEdges,
    attachLinkedNodeAccessors
  };
}
