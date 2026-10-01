// The starship that gets built as the timeline advances.
// One model per timeline stop, in the same order as timelineEvents.js.
// Files live in /public/spaceship-3d-models. To swap a model, replace the
// file (keep the same filename) or change the path here.
const BASE = "/spaceship-3d-models";

const shipModels = [
  { file: `${BASE}/dread_step01_blueprint.glb`, label: "Blueprint" },
  { file: `${BASE}/dread_step02_keel_spars.glb`, label: "Keel & Spars" },
  { file: `${BASE}/dread_step03_wing_core.glb`, label: "Wing Core" },
  { file: `${BASE}/dread_step04_armour_plating.glb`, label: "Armour Plating" },
  { file: `${BASE}/dread_step05_superstructure.glb`, label: "Superstructure" },
  { file: `${BASE}/dread_step06_command_tower.glb`, label: "Command Tower" },
  { file: `${BASE}/dread_step07_drive_section.glb`, label: "Drive Section" },
  { file: `${BASE}/dread_step08_hangars_batteries.glb`, label: "Hangars & Batteries" },
  { file: `${BASE}/dread_step09_surface_detailing.glb`, label: "Surface Detailing" },
  { file: `${BASE}/dread_step10_fully_operational.glb`, label: "Fully Operational" },
];

export default shipModels;
