export const CONTRACT_VERSION = 1;
export const MODULES = Object.freeze([
  { id: "projects", name: "Projects", path: "/projects/" },
  { id: "office", name: "3D Office", path: "/office/" },
  { id: "apps", name: "App Builder", path: "/apps/" },
  { id: "creative", name: "Creative Studio", path: "/creative/" },
  { id: "engine", name: "Game Engine", path: "/engine/" },
  { id: "mcp", name: "MCP Lab", path: "/mcp/" },
  { id: "language", name: "CryoPG", path: "/language/" },
]);
export const JOB_KINDS = Object.freeze([
  "generate",
  "web-build",
  "android-build",
  "cryopg-check",
  "cryopg-compile",
  "cryopg-disasm",
  "cryopg-run",
]);
export const TEMPLATES = Object.freeze([
  "vanilla",
  "react",
  "fullstack",
  "desktop",
  "android",
]);
export function safePath(value) {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 240 ||
    value.includes("\\") ||
    value.includes("\0") ||
    value.startsWith("/") ||
    value.includes(":") ||
    value.split("/").some((p) => !p || p === "." || p === "..")
  )
    throw new Error("Expected a relative project path");
  return value;
}
export function sceneManifest(value) {
  if (
    !value ||
    value.version !== 1 ||
    !Array.isArray(value.nodes) ||
    value.nodes.length > 200
  )
    throw new Error("Expected scene version 1 with at most 200 nodes");
  const ids = new Set();
  const vector = (v) =>
    Array.isArray(v) &&
    v.length === 3 &&
    v.every(
      (n) =>
        typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 10000,
    );
  const nodes = value.nodes.map((n) => {
    if (
      !n ||
      typeof n.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(n.id) ||
      ids.has(n.id)
    )
      throw new Error("Invalid or duplicate scene object id");
    ids.add(n.id);
    if (
      !["box", "sphere", "plane", "glb"].includes(n.kind) ||
      !vector(n.position) ||
      !vector(n.rotation) ||
      !vector(n.scale) ||
      n.scale.some((x) => x <= 0)
    )
      throw new Error("Invalid object type or transform");
    if (
      typeof n.name !== "string" ||
      n.name.length > 100 ||
      !/^#[0-9a-f]{6}$/i.test(n.color)
    )
      throw new Error("Invalid object name or material");
    if (
      n.kind === "glb" &&
      (typeof n.assetId !== "string" || !/^[0-9a-f-]{36}$/i.test(n.assetId))
    )
      throw new Error("GLB requires an asset id");
    return {
      id: n.id,
      name: n.name,
      kind: n.kind,
      position: [...n.position],
      rotation: [...n.rotation],
      scale: [...n.scale],
      color: n.color,
      ...(n.kind === "glb" ? { assetId: n.assetId } : {}),
    };
  });
  const camera = value.camera ?? { position: [12, 10, 14], target: [0, 0, 0] };
  if (!vector(camera.position) || !vector(camera.target))
    throw new Error("Invalid camera");
  if (!/^#[0-9a-f]{6}$/i.test(value.background ?? "#080d26"))
    throw new Error("Invalid background");
  return {
    version: 1,
    background: value.background ?? "#080d26",
    camera: { position: [...camera.position], target: [...camera.target] },
    nodes,
  };
}
export function emptyScene() {
  return sceneManifest({
    version: 1,
    background: "#080d26",
    nodes: [],
    camera: { position: [12, 10, 14], target: [0, 0, 0] },
  });
}
