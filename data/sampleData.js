export const sampleData = {
  orgs: [
    { id: "org-evans-lab", name: "Evans Lab" },
    { id: "org-operations", name: "Operations" },
    { id: "org-program", name: "Program Office" },
    { id: "org-genomics-core", name: "Genomics Core (External)" }
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

const baseNodeIds = sampleData.nodes.map((node) => node.id);
const baseEdgeIds = sampleData.edges.map((edge) => edge.id);

const supplementaryNodes = [
  { id: "portal_genomics_core", type: "portal", title: "Genomics Core (external)", ownerId: "user-alex-patel", locationId: null, summary: "External genomics facility context.", tasks: [], comments: [] },
  { id: "portal_metabolomics_core", type: "portal", title: "Metabolomics Facility (external)", ownerId: "user-hannah-lewis", locationId: null, summary: "External metabolomics facility context.", tasks: [], comments: [] },

  { id: "proj_alice", type: "project", title: "Project: Maternal dosing to placenta transport", ownerId: "user-alex-patel", locationId: null, summary: "Alex project anchor for maternal dosing and transport analysis.", tasks: [], comments: [] },
  { id: "prot_dosing_v1", type: "protocol", title: "Mouse dosing SOP v1 (maternal drug exposure)", ownerId: "user-alex-patel", locationId: null, summary: "Dosing protocol used for maternal exposure cohorts.", tasks: [], comments: [] },
  { id: "prot_collection_v1", type: "protocol", title: "Tissue collection SOP v1 (placenta + plasma)", ownerId: "user-alex-patel", locationId: null, summary: "Collection protocol for placenta and plasma.", tasks: [], comments: [] },
  { id: "prot_rna_extract_v1", type: "protocol", title: "RNA extraction SOP v1 (placenta)", ownerId: "user-alex-patel", locationId: null, summary: "RNA extraction protocol for placenta samples.", tasks: [], comments: [] },

  { id: "exp_cohort_A_dosing", type: "experiment", title: "Cohort A dosing (GD10-GD18)", ownerId: "user-alex-patel", locationId: null, status: "active", summary: "Maternal dosing experiment for cohort A.", tasks: [], comments: [] },
  { id: "exp_e18_collection", type: "experiment", title: "E18.5 collection day (placenta + plasma)", ownerId: "user-alex-patel", locationId: null, status: "active", summary: "Collection day workflow for cohort A tissues.", tasks: [], comments: [] },

  { id: "samp_plasma_A", type: "sample", title: "Plasma set A (Cohort A, n=12)", ownerId: "user-alex-patel", locationId: null, summary: "Plasma samples prepared for downstream quant.", tasks: [], comments: [] },
  { id: "samp_placenta_A", type: "sample", title: "Placenta set A (Cohort A, n=12)", ownerId: "user-alex-patel", locationId: null, summary: "Placenta samples prepared for extraction and sequencing.", tasks: [], comments: [] },

  { id: "data_qpcr_ct_A", type: "dataset", title: "qPCR Ct table (placenta set A)", ownerId: "user-alex-patel", locationId: null, summary: "Ct values from placenta qPCR assays.", tasks: [], comments: [] },
  { id: "ana_transport_ratio", type: "analysis", title: "Notebook: transport ratio + summary stats", ownerId: "user-alex-patel", locationId: null, summary: "Analysis notebook for transport ratio computations.", tasks: [], comments: [] },
  { id: "fig_transport_levels", type: "figure", title: "Figure: placenta/plasma drug levels", ownerId: "user-alex-patel", locationId: null, summary: "Figure output for transport level comparison.", tasks: [], comments: [] },

  {
    id: "handover_lcms_batch1",
    type: "handover",
    title: "Handover: LC-MS quant on plasma set A",
    ownerId: "user-alex-patel",
    locationId: null,
    status: "prepared",
    summary: "Prepared handover package for LC-MS quantification.",
    tasks: [],
    comments: [],
    meta: {
      from: "user-alex-patel",
      to: "user-hannah-lewis",
      checklist: { labelled: true, metadataComplete: false, rawDataReturn: true }
    }
  },
  {
    id: "handover_rnaseq_batch1",
    type: "handover",
    title: "Handover: RNA-seq request (placenta RNA)",
    ownerId: "user-alex-patel",
    locationId: null,
    status: "draft",
    summary: "Draft handover request for external RNA-seq processing.",
    tasks: [],
    comments: [],
    meta: {
      from: "user-alex-patel",
      to: "portal_genomics_core",
      checklist: { consentOk: true, sampleSheet: false, metadataComplete: false }
    }
  },

  { id: "proj_bob", type: "project", title: "Project: Offspring metabolomics pipeline", ownerId: "user-hannah-lewis", locationId: null, summary: "Hannah project anchor for LC-MS metabolomics workflow.", tasks: [], comments: [] },
  { id: "prot_lcms_prep_v2", type: "protocol", title: "LC-MS sample prep v2 (plasma)", ownerId: "user-hannah-lewis", locationId: null, summary: "Sample prep protocol for plasma LC-MS runs.", tasks: [], comments: [] },
  { id: "prot_lcms_method_v1", type: "protocol", title: "LC-MS method v1 (targeted panel)", ownerId: "user-hannah-lewis", locationId: null, summary: "Instrument method protocol for targeted panel.", tasks: [], comments: [] },
  { id: "prot_qc_pipeline_v1", type: "protocol", title: "QC pipeline v1 (batch + blanks + drift)", ownerId: "user-hannah-lewis", locationId: null, summary: "QC protocol for batch quality and drift correction.", tasks: [], comments: [] },

  { id: "exp_lcms_run_batch1", type: "experiment", title: "LC-MS run: Batch 1 (plasma set A)", ownerId: "user-hannah-lewis", locationId: null, status: "active", summary: "Batch 1 LC-MS run for shared plasma set.", tasks: [], comments: [] },
  { id: "exp_qc_batch1", type: "experiment", title: "QC + drift correction (Batch 1)", ownerId: "user-hannah-lewis", locationId: null, status: "planned", summary: "Planned QC and correction pass for Batch 1.", tasks: [], comments: [] },

  { id: "data_lcms_raw_batch1", type: "dataset", title: "LC-MS raw files (Batch 1)", ownerId: "user-hannah-lewis", locationId: null, summary: "Raw LC-MS output files for Batch 1.", tasks: [], comments: [] },
  { id: "data_lcms_matrix_batch1", type: "dataset", title: "Processed feature matrix (Batch 1)", ownerId: "user-hannah-lewis", locationId: null, summary: "Processed matrix derived from LC-MS raw files.", tasks: [], comments: [] },

  { id: "ana_pca_batch1", type: "analysis", title: "PCA + outlier checks (Batch 1)", ownerId: "user-hannah-lewis", locationId: null, summary: "PCA and outlier analysis for processed matrix.", tasks: [], comments: [] },
  { id: "fig_pca_batch1", type: "figure", title: "Figure: PCA + QC summary (Batch 1)", ownerId: "user-hannah-lewis", locationId: null, summary: "QC figure summary for Batch 1.", tasks: [], comments: [] },

  {
    id: "handover_results_to_alice",
    type: "handover",
    title: "Handover: LC-MS results back to Alex (Batch 1)",
    ownerId: "user-hannah-lewis",
    locationId: null,
    status: "draft",
    summary: "Draft return handover of LC-MS outputs to Alex.",
    tasks: [],
    comments: [],
    meta: {
      from: "user-hannah-lewis",
      to: "user-alex-patel",
      checklist: { rawDataAttached: false, summaryAttached: false }
    }
  }
];

const collaborationNodes = [
  {
    id: "org_evans_lab",
    type: "entity",
    title: "",
    entityKind: "org",
    entityRefId: "org-evans-lab",
    ownerId: "user-evans",
    locationId: null,
    summary: "Internal organization context for Alex and Hannah collaborations.",
    tasks: [],
    comments: []
  },
  {
    id: "person_alex",
    type: "entity",
    title: "",
    entityKind: "user",
    entityRefId: "user-alex-patel",
    ownerId: "user-alex-patel",
    locationId: null,
    summary: "Person node for Alex collaboration context.",
    tasks: [],
    comments: []
  },
  {
    id: "person_hannah",
    type: "entity",
    title: "",
    entityKind: "user",
    entityRefId: "user-hannah-lewis",
    ownerId: "user-hannah-lewis",
    locationId: null,
    summary: "Person node for Hannah collaboration context.",
    tasks: [],
    comments: []
  },
  {
    id: "person_evan",
    type: "entity",
    title: "",
    entityKind: "user",
    entityRefId: "user-evans",
    ownerId: "user-evans",
    locationId: null,
    summary: "Person node for PI review and oversight context.",
    tasks: [],
    comments: []
  },
  {
    id: "hub_collab_alex",
    type: "collaboration",
    title: "",
    ownerId: "user-alex-patel",
    locationId: null,
    summary: "Collaboration map hub for Alex.",
    tasks: [],
    comments: []
  },
  {
    id: "hub_collab_hannah",
    type: "collaboration",
    title: "",
    ownerId: "user-hannah-lewis",
    locationId: null,
    summary: "Collaboration map hub for Hannah.",
    tasks: [],
    comments: []
  },
  {
    id: "org_genomics_core",
    type: "entity",
    title: "",
    entityKind: "org",
    entityRefId: "org-genomics-core",
    ownerId: "user-alex-patel",
    locationId: null,
    summary: "External organization collaboration endpoint.",
    tasks: [],
    comments: []
  },
  {
    id: "loc_genomics_intake",
    type: "location",
    title: "Genomics Core — Intake Lab",
    kind: "lab",
    ownerId: "user-alex-patel",
    locationId: null,
    summary: "External intake lab node under genomics core organization.",
    tasks: [],
    comments: []
  },
  {
    id: "proj_alex_main",
    type: "project",
    title: "Project (Alex): Placenta transport study",
    ownerId: "user-alex-patel",
    locationId: null,
    summary: "Primary Alex collaboration project chain anchor.",
    tasks: [],
    comments: []
  },
  {
    id: "proj_hannah_main",
    type: "project",
    title: "Project (Hannah): LC-MS pipeline",
    ownerId: "user-hannah-lewis",
    locationId: null,
    summary: "Primary Hannah collaboration project chain anchor.",
    tasks: [],
    comments: []
  },
  {
    id: "proj_genomics_rnaseq",
    type: "project",
    title: "Project (Genomics Core): RNA-seq run (Batch 1)",
    ownerId: "user-alex-patel",
    locationId: null,
    summary: "External service project placeholder for RNA-seq collaboration.",
    tasks: [],
    comments: []
  },
  {
    id: "ho_lcms_request_1",
    type: "handover",
    title: "Handover: LC-MS request (Plasma set A)",
    ownerId: "user-alex-patel",
    locationId: null,
    status: "prepared",
    summary: "Active internal handover from Alex to Hannah.",
    tasks: [],
    comments: [],
    meta: {
      from: "person_alex",
      to: "person_hannah"
    }
  },
  {
    id: "ho_rnaseq_request_1",
    type: "handover",
    title: "Handover: RNA-seq request (Placenta set A)",
    ownerId: "user-alex-patel",
    locationId: null,
    status: "draft",
    summary: "Active external handover from Alex to Genomics Core.",
    tasks: [],
    comments: [],
    meta: {
      from: "person_alex",
      to: "org_genomics_core"
    }
  },
  {
    id: "ho_review_fig_1",
    type: "handover",
    title: "Handover: Evan review — Figure draft",
    ownerId: "user-alex-patel",
    locationId: null,
    status: "sent",
    summary: "Active internal review handover from Alex to Evan.",
    tasks: [],
    comments: [],
    meta: {
      from: "person_alex",
      to: "person_evan"
    }
  }
];

const supplementaryEdges = [
  { id: "e_pa_1", sourceId: "proj_alice", targetId: "prot_dosing_v1", kind: "includes" },
  { id: "e_pa_2", sourceId: "proj_alice", targetId: "prot_collection_v1", kind: "includes" },
  { id: "e_pa_3", sourceId: "proj_alice", targetId: "prot_rna_extract_v1", kind: "includes" },
  { id: "e_pa_4", sourceId: "prot_dosing_v1", targetId: "exp_cohort_A_dosing", kind: "protocol_instance" },
  { id: "e_pa_5", sourceId: "prot_collection_v1", targetId: "exp_e18_collection", kind: "protocol_instance" },
  { id: "e_pa_6", sourceId: "exp_e18_collection", targetId: "samp_plasma_A", kind: "produces" },
  { id: "e_pa_7", sourceId: "exp_e18_collection", targetId: "samp_placenta_A", kind: "produces" },
  { id: "e_pa_8", sourceId: "samp_plasma_A", targetId: "handover_lcms_batch1", kind: "handover_input" },
  { id: "e_pa_9", sourceId: "samp_placenta_A", targetId: "prot_rna_extract_v1", kind: "uses" },
  { id: "e_pa_10", sourceId: "samp_placenta_A", targetId: "handover_rnaseq_batch1", kind: "handover_input" },
  { id: "e_pa_11", sourceId: "handover_rnaseq_batch1", targetId: "portal_genomics_core", kind: "to_external" },
  { id: "e_pa_12", sourceId: "handover_lcms_batch1", targetId: "proj_bob", kind: "to_collaborator_project" },
  { id: "e_pa_13", sourceId: "data_qpcr_ct_A", targetId: "ana_transport_ratio", kind: "input_to" },
  { id: "e_pa_14", sourceId: "ana_transport_ratio", targetId: "fig_transport_levels", kind: "produces" },

  { id: "e_pb_1", sourceId: "proj_bob", targetId: "prot_lcms_prep_v2", kind: "includes" },
  { id: "e_pb_2", sourceId: "proj_bob", targetId: "prot_lcms_method_v1", kind: "includes" },
  { id: "e_pb_3", sourceId: "proj_bob", targetId: "prot_qc_pipeline_v1", kind: "includes" },
  { id: "e_pb_4", sourceId: "prot_lcms_prep_v2", targetId: "exp_lcms_run_batch1", kind: "protocol_instance" },
  { id: "e_pb_5", sourceId: "prot_lcms_method_v1", targetId: "exp_lcms_run_batch1", kind: "uses" },
  { id: "e_pb_6", sourceId: "handover_lcms_batch1", targetId: "exp_lcms_run_batch1", kind: "drives" },
  { id: "e_pb_7", sourceId: "exp_lcms_run_batch1", targetId: "data_lcms_raw_batch1", kind: "produces" },
  { id: "e_pb_8", sourceId: "data_lcms_raw_batch1", targetId: "data_lcms_matrix_batch1", kind: "processed_into" },
  { id: "e_pb_9", sourceId: "prot_qc_pipeline_v1", targetId: "exp_qc_batch1", kind: "protocol_instance" },
  { id: "e_pb_10", sourceId: "data_lcms_matrix_batch1", targetId: "ana_pca_batch1", kind: "input_to" },
  { id: "e_pb_11", sourceId: "ana_pca_batch1", targetId: "fig_pca_batch1", kind: "produces" },
  { id: "e_pb_12", sourceId: "data_lcms_matrix_batch1", targetId: "handover_results_to_alice", kind: "handover_output" },
  { id: "e_pb_13", sourceId: "handover_results_to_alice", targetId: "proj_alice", kind: "returns_to" },
  { id: "e_pb_14", sourceId: "proj_bob", targetId: "portal_metabolomics_core", kind: "external_dependency" }
];

const collaborationEdges = [
  { id: "e_ca_1", sourceId: "hub_collab_alex", targetId: "org_evans_lab", kind: "collaboration_chain" },
  { id: "e_ca_2", sourceId: "org_evans_lab", targetId: "person_alex", kind: "collaboration_chain" },
  { id: "e_ca_3", sourceId: "org_evans_lab", targetId: "person_hannah", kind: "collaboration_chain" },
  { id: "e_ca_4", sourceId: "org_evans_lab", targetId: "person_evan", kind: "collaboration_chain" },
  { id: "e_ca_5", sourceId: "person_alex", targetId: "proj_alex_main", kind: "collaboration_chain" },
  { id: "e_ca_6", sourceId: "proj_alex_main", targetId: "ho_lcms_request_1", kind: "collaboration_chain" },
  { id: "e_ca_7", sourceId: "proj_alex_main", targetId: "ho_review_fig_1", kind: "collaboration_chain" },
  { id: "e_ca_8", sourceId: "ho_lcms_request_1", targetId: "person_hannah", kind: "collaboration_chain" },
  { id: "e_ca_9", sourceId: "ho_review_fig_1", targetId: "person_evan", kind: "collaboration_chain" },

  { id: "e_ch_1", sourceId: "hub_collab_hannah", targetId: "org_evans_lab", kind: "collaboration_chain" },
  { id: "e_ch_2", sourceId: "org_evans_lab", targetId: "person_hannah", kind: "collaboration_chain" },
  { id: "e_ch_3", sourceId: "org_evans_lab", targetId: "person_alex", kind: "collaboration_chain" },
  { id: "e_ch_4", sourceId: "org_evans_lab", targetId: "person_evan", kind: "collaboration_chain" },
  { id: "e_ch_5", sourceId: "person_hannah", targetId: "proj_hannah_main", kind: "collaboration_chain" },
  { id: "e_ch_6", sourceId: "proj_hannah_main", targetId: "ho_lcms_request_1", kind: "collaboration_chain" },
  { id: "e_ch_7", sourceId: "ho_lcms_request_1", targetId: "person_alex", kind: "collaboration_chain" },

  { id: "e_x_1", sourceId: "hub_collab_alex", targetId: "org_genomics_core", kind: "collaboration_external" },
  { id: "e_x_2", sourceId: "org_genomics_core", targetId: "loc_genomics_intake", kind: "collaboration_external" },
  { id: "e_x_3", sourceId: "loc_genomics_intake", targetId: "proj_genomics_rnaseq", kind: "collaboration_external" },
  { id: "e_x_4", sourceId: "proj_genomics_rnaseq", targetId: "ho_rnaseq_request_1", kind: "collaboration_external" },
  { id: "e_x_5", sourceId: "ho_rnaseq_request_1", targetId: "org_genomics_core", kind: "collaboration_external" },
  { id: "e_xh_1", sourceId: "hub_collab_hannah", targetId: "org_genomics_core", kind: "collaboration_external" }
];

sampleData.nodes.push(...supplementaryNodes);
sampleData.edges.push(...supplementaryEdges);
sampleData.nodes.push(...collaborationNodes);
sampleData.edges.push(...collaborationEdges);

sampleData.workspaces = [
  {
    id: "ws-global",
    name: "Global Lab Map",
    kind: "normal",
    ownerId: "user-hannah-lewis",
    nodeIds: baseNodeIds,
    edgeIds: baseEdgeIds,
    homeNodeId: "loc-lab-a"
  },
  {
    id: "ws_proj_alice",
    name: "Project map (Alice)",
    kind: "normal",
    ownerId: "user-alex-patel",
    nodeIds: [
      "proj_alice",
      "prot_dosing_v1",
      "prot_collection_v1",
      "prot_rna_extract_v1",
      "exp_cohort_A_dosing",
      "exp_e18_collection",
      "samp_plasma_A",
      "samp_placenta_A",
      "data_qpcr_ct_A",
      "ana_transport_ratio",
      "fig_transport_levels",
      "handover_lcms_batch1",
      "handover_rnaseq_batch1",
      "portal_genomics_core",
      "proj_bob"
    ],
    edgeIds: [
      "e_pa_1", "e_pa_2", "e_pa_3", "e_pa_4", "e_pa_5", "e_pa_6", "e_pa_7",
      "e_pa_8", "e_pa_9", "e_pa_10", "e_pa_11", "e_pa_12", "e_pa_13", "e_pa_14"
    ],
    homeNodeId: "proj_alice"
  },
  {
    id: "ws_proj_bob",
    name: "Project map (Bob)",
    kind: "normal",
    ownerId: "user-hannah-lewis",
    nodeIds: [
      "proj_bob",
      "prot_lcms_prep_v2",
      "prot_lcms_method_v1",
      "prot_qc_pipeline_v1",
      "exp_lcms_run_batch1",
      "exp_qc_batch1",
      "data_lcms_raw_batch1",
      "data_lcms_matrix_batch1",
      "ana_pca_batch1",
      "fig_pca_batch1",
      "handover_lcms_batch1",
      "handover_results_to_alice",
      "portal_metabolomics_core",
      "proj_alice"
    ],
    edgeIds: [
      "e_pb_1", "e_pb_2", "e_pb_3", "e_pb_4", "e_pb_5", "e_pb_6", "e_pb_7",
      "e_pb_8", "e_pb_9", "e_pb_10", "e_pb_11", "e_pb_12", "e_pb_13", "e_pb_14"
    ],
    homeNodeId: "proj_bob"
  },
  {
    id: "ws_collab_alex",
    name: "Collaboration map (Alex)",
    kind: "collab",
    ownerId: "user-alex-patel",
    nodeIds: [
      "hub_collab_alex",
      "org_evans_lab",
      "person_alex",
      "person_hannah",
      "person_evan",
      "proj_alex_main",
      "ho_lcms_request_1",
      "ho_review_fig_1",
      "org_genomics_core",
      "loc_genomics_intake",
      "proj_genomics_rnaseq",
      "ho_rnaseq_request_1"
    ],
    edgeIds: [
      "e_ca_1", "e_ca_2", "e_ca_3", "e_ca_4", "e_ca_5", "e_ca_6", "e_ca_7", "e_ca_8", "e_ca_9",
      "e_x_1", "e_x_2", "e_x_3", "e_x_4", "e_x_5"
    ],
    homeNodeId: "hub_collab_alex"
  },
  {
    id: "ws_collab_hannah",
    name: "Collaboration map (Hannah)",
    kind: "collab",
    ownerId: "user-hannah-lewis",
    nodeIds: [
      "hub_collab_hannah",
      "org_evans_lab",
      "person_hannah",
      "person_alex",
      "person_evan",
      "proj_hannah_main",
      "ho_lcms_request_1",
      "org_genomics_core",
      "loc_genomics_intake",
      "proj_genomics_rnaseq",
      "ho_rnaseq_request_1"
    ],
    edgeIds: [
      "e_ch_1", "e_ch_2", "e_ch_3", "e_ch_4", "e_ch_5", "e_ch_6", "e_ch_7",
      "e_xh_1", "e_x_2", "e_x_3", "e_x_4", "e_x_5"
    ],
    homeNodeId: "hub_collab_hannah"
  }
];
