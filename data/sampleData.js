export const sampleData = {
  orgs: [
    { id: "org-evans-lab", name: "Evans Lab" },
    { id: "org-operations", name: "Operations" },
    { id: "org-program", name: "Program Office" }
  ],
  users: [
    { id: "user-evans", name: "PI: Dr Evans", orgId: "org-evans-lab" },
    { id: "user-shared", name: "Shared", orgId: "org-evans-lab" },
    { id: "user-lab-manager", name: "Lab manager", orgId: "org-operations" },
    { id: "user-alex-patel", name: "Alex Patel", orgId: "org-evans-lab" },
    { id: "user-hannah-lewis", name: "Dr Hannah Lewis", orgId: "org-evans-lab" },
    { id: "user-omar-reed", name: "Omar Reed", orgId: "org-evans-lab" },
    { id: "user-priya-shah", name: "Priya Shah", orgId: "org-evans-lab" },
    { id: "user-jordan-kim", name: "Jordan Kim", orgId: "org-evans-lab" },
    { id: "user-ops-coordinator", name: "Ops Coordinator", orgId: "org-operations" },
    { id: "user-program-office", name: "Program Office", orgId: "org-program" }
  ],
  nodes: [
    {
      id: "loc-lab-a",
      title: "Lab A",
      type: "location",
      kind: "lab",
      ownerId: "user-evans",
      locationId: null,
      summary: "Top-level wet lab container.",
      tasks: [
        { id: "task-lab-1", text: "Review weekly safety checklist", done: false, assignedTo: "Dr Hannah Lewis" }
      ],
      comments: [
        { author: "PI: Dr Evans", text: "Please keep logs current this week.", timestamp: "2026-02-25T10:00:00Z", isNew: false }
      ]
    },
    {
      id: "loc-bench-a",
      title: "Bench A",
      type: "location",
      kind: "bench",
      ownerId: "user-shared",
      locationId: null,
      summary: "Central bench for prep.",
      tasks: [],
      comments: [],
      layout: { x: 30, y: 28, w: 36, h: 14 }
    },
    {
      id: "loc-bench-b",
      title: "Bench B",
      type: "location",
      kind: "bench",
      ownerId: "user-shared",
      locationId: null,
      summary: "Secondary central bench.",
      tasks: [],
      comments: [],
      layout: { x: 30, y: 46, w: 36, h: 14 }
    },
    {
      id: "loc-fume-1",
      title: "Fume 1",
      type: "location",
      kind: "fume",
      ownerId: "user-lab-manager",
      locationId: null,
      summary: "Primary fume cupboard.",
      tasks: [],
      comments: [],
      layout: { x: 4, y: 20, w: 22, h: 12 }
    },
    {
      id: "loc-fume-2",
      title: "Fume 2",
      type: "location",
      kind: "fume",
      ownerId: "user-lab-manager",
      locationId: null,
      summary: "Secondary fume cupboard.",
      tasks: [],
      comments: [],
      layout: { x: 4, y: 38, w: 22, h: 12 }
    },
    {
      id: "loc-glovebox-1",
      title: "Glovebox",
      type: "location",
      kind: "glovebox",
      ownerId: "user-lab-manager",
      locationId: null,
      summary: "Controlled glovebox station.",
      tasks: [
        { id: "task-glove-1", text: "Log oxygen ppm before run", done: false, assignedTo: "Dr Hannah Lewis" }
      ],
      comments: [],
      layout: { x: 74, y: 20, w: 22, h: 12 }
    },
    {
      id: "loc-sink-waste",
      title: "Sink + Waste",
      type: "location",
      kind: "sink",
      ownerId: "user-shared",
      locationId: null,
      summary: "Sink and waste handling station.",
      tasks: [],
      comments: [],
      layout: { x: 24, y: 72, w: 24, h: 12 }
    },
    {
      id: "loc-freezer-1",
      title: "Freezer 1",
      type: "location",
      kind: "freezer",
      ownerId: "user-lab-manager",
      locationId: null,
      summary: "Main cold storage unit with shelves.",
      tasks: [],
      comments: [],
      layout: { x: 52, y: 72, w: 24, h: 12 }
    },
    {
      id: "loc-freezer-shelf-a",
      title: "Freezer Shelf A",
      type: "location",
      kind: "shelf",
      ownerId: "user-lab-manager",
      locationId: null,
      summary: "Upper freezer shelf.",
      tasks: [],
      comments: [],
      layout: { x: 12, y: 24, w: 34, h: 22 }
    },
    {
      id: "loc-freezer-shelf-b",
      title: "Freezer Shelf B",
      type: "location",
      kind: "shelf",
      ownerId: "user-lab-manager",
      locationId: null,
      summary: "Lower freezer shelf.",
      tasks: [],
      comments: [],
      layout: { x: 54, y: 24, w: 34, h: 22 }
    },
    {
      id: "exp-dose-screen-a",
      title: "Exp: Dose Screen A",
      type: "experiment",
      ownerId: "user-alex-patel",
      locationId: "loc-fume-1",
      status: "active",
      summary: "Active dose screen under fume cupboard.",
      tasks: [],
      comments: [
        { author: "Alex Patel", text: "Run started at 09:15.", timestamp: "2026-02-26T09:20:00Z", isNew: false }
      ]
    },
    {
      id: "exp-culture-check-b",
      title: "Exp: Culture Check B",
      type: "experiment",
      ownerId: "user-hannah-lewis",
      locationId: "loc-bench-a",
      status: "active",
      summary: "Active culture check on bench A.",
      tasks: [
        { id: "task-exp-culture", text: "Capture midpoint reading", done: false, assignedTo: "Dr Hannah Lewis" }
      ],
      comments: [
        { author: "Ops Coordinator", text: "@Hannah verify plate seal before transfer.", timestamp: "2026-02-26T11:05:00Z", isNew: true }
      ]
    },
    {
      id: "exp-freezer-audit-c",
      title: "Exp: Freezer Audit C",
      type: "experiment",
      ownerId: "user-omar-reed",
      locationId: "loc-freezer-shelf-a",
      status: "active",
      summary: "Active cold-chain audit on shelf A.",
      tasks: [],
      comments: []
    },
    {
      id: "exp-sink-sterility-d",
      title: "Exp: Sink Sterility D",
      type: "experiment",
      ownerId: "user-alex-patel",
      locationId: "loc-sink-waste",
      status: "active",
      summary: "Active sterility check at sink/waste.",
      tasks: [],
      comments: []
    },
    {
      id: "prot-dosing",
      title: "Protocol: Dosing SOP",
      type: "protocol",
      ownerId: "user-priya-shah",
      locationId: null,
      summary: "SOP for dosing sequences and checks.",
      tasks: [],
      comments: [
        { author: "Priya Shah", text: "@Hannah please confirm hood calibration before tomorrow.", timestamp: "2026-02-26T15:10:00Z", isNew: true }
      ]
    },
    {
      id: "prot-cell-culture",
      title: "Protocol: Cell Culture Core",
      type: "protocol",
      ownerId: "user-jordan-kim",
      locationId: null,
      summary: "Procedure for core culture handling.",
      tasks: [],
      comments: []
    },
    {
      id: "prot-cold-chain",
      title: "Protocol: Cold Chain",
      type: "protocol",
      ownerId: "user-jordan-kim",
      locationId: null,
      summary: "Procedure for freezer intake and shelf handling.",
      tasks: [],
      comments: []
    },
    {
      id: "prot-cleanup",
      title: "Protocol: Cleanup",
      type: "protocol",
      ownerId: "user-priya-shah",
      locationId: null,
      summary: "Procedure for sink/waste cleanup workflow.",
      tasks: [],
      comments: []
    },
    {
      id: "prot-lab-safety",
      title: "Protocol: Lab Safety",
      type: "protocol",
      ownerId: "user-lab-manager",
      locationId: null,
      summary: "Pinned safety protocol for lab container.",
      tasks: [],
      comments: []
    },
    {
      id: "portal-oncology",
      title: "Project: Oncology",
      type: "portal",
      ownerId: "user-evans",
      locationId: null,
      summary: "Oncology screen project umbrella.",
      tasks: [],
      comments: []
    },
    {
      id: "portal-biobank",
      title: "Project: Biobank",
      type: "portal",
      ownerId: "user-hannah-lewis",
      locationId: null,
      summary: "Biobank integrity and cold-chain project.",
      tasks: [
        { id: "task-proj-biobank", text: "Draft weekly status summary", done: false, assignedTo: "Dr Hannah Lewis" }
      ],
      comments: [
        { author: "Program Office", text: "Please post this week's status update.", timestamp: "2026-02-26T08:00:00Z", isNew: true }
      ]
    },
    {
      id: "portal-ops",
      title: "Project: Lab Ops",
      type: "portal",
      ownerId: "user-ops-coordinator",
      locationId: null,
      summary: "Operations and compliance project.",
      tasks: [],
      comments: []
    }
  ],
  edges: [
    { id: "edge-loc-lab-a-loc-bench-a", sourceId: "loc-lab-a", targetId: "loc-bench-a", kind: "location_contains" },
    { id: "edge-loc-lab-a-loc-bench-b", sourceId: "loc-lab-a", targetId: "loc-bench-b", kind: "location_contains" },
    { id: "edge-loc-lab-a-loc-fume-1", sourceId: "loc-lab-a", targetId: "loc-fume-1", kind: "location_contains" },
    { id: "edge-loc-lab-a-loc-fume-2", sourceId: "loc-lab-a", targetId: "loc-fume-2", kind: "location_contains" },
    { id: "edge-loc-lab-a-loc-glovebox-1", sourceId: "loc-lab-a", targetId: "loc-glovebox-1", kind: "location_contains" },
    { id: "edge-loc-lab-a-loc-sink-waste", sourceId: "loc-lab-a", targetId: "loc-sink-waste", kind: "location_contains" },
    { id: "edge-loc-lab-a-loc-freezer-1", sourceId: "loc-lab-a", targetId: "loc-freezer-1", kind: "location_contains" },
    { id: "edge-loc-lab-a-prot-lab-safety", sourceId: "loc-lab-a", targetId: "prot-lab-safety", kind: "location_protocol" },

    { id: "edge-loc-bench-a-exp-culture-check-b", sourceId: "loc-bench-a", targetId: "exp-culture-check-b", kind: "location_experiment" },
    { id: "edge-loc-fume-1-exp-dose-screen-a", sourceId: "loc-fume-1", targetId: "exp-dose-screen-a", kind: "location_experiment" },
    { id: "edge-loc-sink-waste-exp-sink-sterility-d", sourceId: "loc-sink-waste", targetId: "exp-sink-sterility-d", kind: "location_experiment" },
    { id: "edge-loc-sink-waste-prot-cleanup", sourceId: "loc-sink-waste", targetId: "prot-cleanup", kind: "location_protocol" },

    { id: "edge-loc-freezer-1-loc-freezer-shelf-a", sourceId: "loc-freezer-1", targetId: "loc-freezer-shelf-a", kind: "location_contains" },
    { id: "edge-loc-freezer-1-loc-freezer-shelf-b", sourceId: "loc-freezer-1", targetId: "loc-freezer-shelf-b", kind: "location_contains" },
    { id: "edge-loc-freezer-1-prot-cold-chain", sourceId: "loc-freezer-1", targetId: "prot-cold-chain", kind: "location_protocol" },
    { id: "edge-loc-freezer-shelf-a-exp-freezer-audit-c", sourceId: "loc-freezer-shelf-a", targetId: "exp-freezer-audit-c", kind: "location_experiment" },

    { id: "edge-prot-dosing-exp-dose-screen-a", sourceId: "prot-dosing", targetId: "exp-dose-screen-a", kind: "protocol_experiment" },
    { id: "edge-prot-cell-culture-exp-culture-check-b", sourceId: "prot-cell-culture", targetId: "exp-culture-check-b", kind: "protocol_experiment" },
    { id: "edge-prot-cold-chain-exp-freezer-audit-c", sourceId: "prot-cold-chain", targetId: "exp-freezer-audit-c", kind: "protocol_experiment" },
    { id: "edge-prot-cleanup-exp-sink-sterility-d", sourceId: "prot-cleanup", targetId: "exp-sink-sterility-d", kind: "protocol_experiment" },

    { id: "edge-portal-oncology-prot-dosing", sourceId: "portal-oncology", targetId: "prot-dosing", kind: "portal_protocol" },
    { id: "edge-portal-oncology-prot-cell-culture", sourceId: "portal-oncology", targetId: "prot-cell-culture", kind: "portal_protocol" },
    { id: "edge-portal-biobank-prot-cold-chain", sourceId: "portal-biobank", targetId: "prot-cold-chain", kind: "portal_protocol" },
    { id: "edge-portal-biobank-prot-cleanup", sourceId: "portal-biobank", targetId: "prot-cleanup", kind: "portal_protocol" },
    { id: "edge-portal-ops-prot-lab-safety", sourceId: "portal-ops", targetId: "prot-lab-safety", kind: "portal_protocol" }
  ],
  workspaces: []
};

sampleData.workspaces = [
  {
    id: "ws-global",
    name: "Global Lab Map",
    kind: "global",
    ownerId: "user-hannah-lewis",
    nodeIds: sampleData.nodes.map((node) => node.id),
    edgeIds: sampleData.edges.map((edge) => edge.id),
    homeNodeId: "loc-lab-a"
  }
];