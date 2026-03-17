export const TYPE_ORDER = [
  "location",
  "process",
  "standard",
  "handover",
  "portal",
  "entity",
  "collaboration"
];

export const PROCESS_STATUSES = ["Planned", "Active", "Complete", "Abandoned"];
export const HANDOVER_STATUSES = ["Draft", "Active", "Blocked", "Withdrawn", "Complete"];
export const HANDOVER_COLLABORATOR_EDITABLE_STATUSES = ["Active", "Blocked", "Complete"];

export function normalizeWorkspaceKind(rawKind) {
  if (rawKind === "collab" || rawKind === "collaboration") return "collab";
  if (rawKind === "normal" || rawKind === "global" || rawKind === "project") return "normal";
  return "normal";
}

export function normalizeNodeType(rawType) {
  const type = String(rawType || "").toLowerCase();
  if (type === "location") return "location";
  if (type === "portal") return "portal";
  if (type === "handover") return "handover";
  if (type === "entity" || type === "person" || type === "organization" || type === "organisation") return "entity";
  if (type === "collaboration" || type === "hub") return "collaboration";
  if (type === "process" || type === "experiment") return "process";
  if (type === "standard" || type === "protocol") return "standard";
  return "standard";
}

export function normalizeProcessStatus(rawStatus) {
  const status = String(rawStatus || "").trim().toLowerCase();
  if (status === "planned") return "Planned";
  if (status === "active") return "Active";
  if (status === "complete" || status === "completed") return "Complete";
  if (status === "abandoned") return "Abandoned";
  return "Planned";
}

export function normalizeHandoverStatus(rawStatus) {
  const status = String(rawStatus || "").trim().toLowerCase();
  if (status === "draft" || status === "prepared") return "Draft";
  if (status === "active") return "Active";
  if (status === "blocked") return "Blocked";
  if (status === "withdrawn" || status === "abandoned" || status === "cancelled" || status === "canceled") return "Withdrawn";
  if (status === "complete" || status === "completed") return "Complete";
  return "Draft";
}

export function normalizeEntityKind(rawKind) {
  const kind = String(rawKind || "").trim().toLowerCase();
  if (kind === "user" || kind === "person") return "user";
  if (kind === "org" || kind === "organisation" || kind === "organization") return "org";
  return null;
}

export function isSelectableNode(node) {
  return !!node && node.type !== "collaboration";
}

export function canInlineEditNodeTitle(node) {
  return !!node && (
    node.type === "location" ||
    node.type === "process" ||
    node.type === "standard" ||
    node.type === "handover"
  );
}

export function isCircularNodeType(node) {
  return !!node && (node.type === "portal" || node.type === "collaboration");
}

export function isDiamondNodeType(node) {
  return !!node && node.type === "entity";
}

export function getStatusClass(status) {
  if (!status) return "";
  return `status-${String(status).toLowerCase().replace(/\s+/g, "-")}`;
}

export function getTypeShort(type) {
  const map = {
    location: "LOC",
    process: "PRC",
    standard: "STD",
    handover: "HND",
    portal: "PRTL",
    entity: "ENT",
    collaboration: "CLB"
  };
  return map[type] || type.toUpperCase();
}

function getTypeSortIndex(type) {
  const index = TYPE_ORDER.indexOf(type);
  return index >= 0 ? index : TYPE_ORDER.length;
}

export function compareNodesStable(aNode, bNode) {
  if (!aNode && !bNode) return 0;
  if (!aNode) return 1;
  if (!bNode) return -1;
  const typeDiff = getTypeSortIndex(aNode.type) - getTypeSortIndex(bNode.type);
  if (typeDiff !== 0) return typeDiff;
  const labelDiff = aNode.label.localeCompare(bNode.label);
  if (labelDiff !== 0) return labelDiff;
  return aNode.id.localeCompare(bNode.id);
}
