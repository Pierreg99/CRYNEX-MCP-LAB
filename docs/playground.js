/* Static CRYNEX demonstration UI. No MCP transport, fetch, eval or storage. */
(() => {
  "use strict";
  const byId = (id) => document.getElementById(id);
  const select = byId("play-tool");
  const input = byId("play-input");
  const secondary = byId("play-secondary");
  const secondaryLabel = byId("play-secondary-label");
  const output = byId("play-output");
  const status = byId("play-status");
  const name = byId("builder-name");
  const title = byId("builder-title");
  const description = byId("builder-description");
  const operation = byId("builder-operation");
  const builderOutput = byId("builder-output");
  const builderStatus = byId("builder-status");
  const list = byId("builder-list");
  if (!select || !input || !secondary || !name || !list) return;
  const maxInput = 10000;
  const allowedOps = ["uppercase", "lowercase", "trim", "slugify", "sha256"];
  const toolNamePattern = /^custom_[a-z][a-z0-9_]{2,48}$/;
  const configured = [];
  const capabilitySearch = byId("capability-search");
  const capabilityStatus = byId("capability-status");
  const builderSave = byId("builder-add");
  const builderCancel = byId("builder-cancel");
  let editingIndex = -1;

  if (capabilitySearch && capabilityStatus) {
    const cards = Array.from(document.querySelectorAll(".capability-grid .capability"));
    const filter = () => {
      const needle = capabilitySearch.value.trim().toLowerCase();
      let count = 0;
      for (const card of cards) {
        const visible = card.textContent.toLowerCase().includes(needle);
        card.hidden = !visible;
        if (visible) count++;
      }
      capabilityStatus.textContent = count + " of " + cards.length + " capabilities shown";
    };
    capabilitySearch.addEventListener("input", filter);
    filter();
  }
  const setStatus = (node, message, error = false) => {
    node.textContent = message;
    node.dataset.error = String(error);
  };
  const asJSON = (value) => JSON.stringify(value, null, 2);
  const asciiSlug = (source) => source.trim()
    .replace(/ß/g, "ss").replace(/ẞ/g, "SS").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 80).replace(/-+$/g, "");
  const demos = {
    "crynex_slugify": { a: "Grüße aus dem CRYNEX MCP LAB!", b: "", label: "" },
    "crynex_json_pointer": {
      a: '{"plugins":[{"id":"crynex-demo","enabled":true}]}',
      b: "/plugins/0/id", label: "JSON Pointer (RFC 6901)"
    },
    "crynex_text_diff": { a: "Hello\nCRYNEX\nworld", b: "Hello\nupdated MCP\nworld", label: "New text" },
    "crynex_manifest_lint": {
      a: '{"id":"demo-plugin","name":"Demo Plugin","version":"1.0.0","description":"Read-only example","publisher":"Local","status":"published","capabilities":["discovery"],"requiredScopes":["plugins:read"]}',
      b: "", label: ""
    },
    "crynex_json_inspect": {
      a: '{"project":"CRYNEX","metadata":{"private":"not-disclosed"},"tools":[{"id":"demo"}]}',
      b: "8", label: "Maximum depth (1–12)"
    },
    "crynex_text_pipeline": {
      a: "  Grüße CRYNEX!  ", b: "trim,slugify,uppercase",
      label: "Steps: comma-separated trim, slugify, uppercase, lowercase (1–8). SHA-256 requires MCP Inspector."
    },
    "custom_uppercase": { a: "Hallo CRYNEX", b: "", label: "" }
  };

  function jsonPointer(json, pointer) {
    if (json.length > maxInput) throw new Error("JSON input exceeds 10,000 characters");
    let current = JSON.parse(json);
    if (pointer === "") return { found: true, value: current };
    if (!pointer.startsWith("/")) throw new Error("A JSON Pointer must start with /");
    const segments = pointer.slice(1).split("/");
    if (segments.length > 32 || pointer.length > 256) throw new Error("Pointer limit exceeded");
    for (const part of segments) {
      if (/~(?![01])/.test(part)) throw new Error("Invalid pointer escape");
      const key = part.replace(/~1/g, "/").replace(/~0/g, "~");
      if (["__proto__", "constructor", "prototype"].includes(key)) throw new Error("Disallowed key");
      if (Array.isArray(current)) {
        if (!/^(0|[1-9][0-9]*)$/.test(key)) return { found: false };
        if (Number(key) >= current.length) return { found: false };
        current = current[Number(key)];
      } else if (current && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, key)) {
        current = current[key];
      } else return { found: false };
    }
    return { found: true, value: current };
  }
  function textDiff(a, b) {
    const left = a === "" ? [] : a.split(/\r\n|\r|\n/);
    const right = b === "" ? [] : b.split(/\r\n|\r|\n/);
    if (left.length > 300 || right.length > 300) throw new Error("Maximum 300 lines per input");
    let begin = 0;
    while (begin < left.length && begin < right.length && left[begin] === right[begin]) begin++;
    let endA = left.length;
    let endB = right.length;
    while (endA > begin && endB > begin && left[endA - 1] === right[endB - 1]) { endA--; endB--; }
    const removed = left.slice(begin, endA), added = right.slice(begin, endB);
    return {
      equal: removed.length === 0 && added.length === 0,
      startLine: begin + 1, beforeLines: left.length, afterLines: right.length,
      removed, added
    };
  }
  function lintPreview(text) {
    let v;
    try { v = JSON.parse(text); } catch { return { valid: false, id: null, warnings: [], errors: ["Invalid JSON"] }; }
    if (!v || Array.isArray(v) || typeof v !== "object") return { valid: false, id: null, warnings: [], errors: ["Object required"] };
    const errors = [];
    const fields = ["id", "name", "version", "description", "publisher", "status", "capabilities", "requiredScopes"];
    const optional = ["sourceUrl", "sha256"];
    for (const f of Object.keys(v)) if (![...fields, ...optional].includes(f)) errors.push("Unknown field: " + f);
    for (const f of fields.slice(0, 6)) if (typeof v[f] !== "string" || v[f].length === 0) errors.push("Missing or invalid: " + f);
    for (const f of ["capabilities", "requiredScopes"]) if (!Array.isArray(v[f])) errors.push("Expected array: " + f);
    if (typeof v.id === "string" && !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(v.id)) errors.push("Invalid id");
    if (typeof v.status === "string" && !["draft", "published", "deprecated", "revoked"].includes(v.status)) errors.push("Invalid status");
    if (v.sourceUrl !== undefined && typeof v.sourceUrl !== "string") errors.push("Invalid sourceUrl");
    if (v.sha256 !== undefined && (typeof v.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(v.sha256))) errors.push("Invalid sha256");
    const warnings = [];
    if (v.status === "revoked") warnings.push("Revoked plugin");
    if (v.status === "draft") warnings.push("Draft plugin");
    if (typeof v.sourceUrl === "string" && !v.sourceUrl.startsWith("https://")) warnings.push("Source is not HTTPS");
    if (Array.isArray(v.requiredScopes) && v.requiredScopes.some(s => typeof s === "string" &&
        (s.includes("*") || /write|execute|admin|install|delete/i.test(s)))) warnings.push("Privileged scopes require independent review");
    if (!v.sha256) warnings.push("No SHA-256 artifact metadata");
    return { valid: errors.length === 0, id: errors.length ? null : v.id, warnings, errors,
      notice: "Browser preview only. Official validation occurs in the MCP server." };
  }


  function jsonShapePreview(source, maxDepthText) {
    const maxDepth = Number(maxDepthText);
    if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 12)
      throw new Error("Maximum depth must be an integer from 1 to 12");
    const root = JSON.parse(source);
    const kind = (value) => value === null ? "null"
      : Array.isArray(value) ? "array" : typeof value;
    const type = kind(root);
    const topKeys = type === "object" ? Object.keys(root).sort().slice(0, 24) : [];
    const stack = [{ value: root, depth: 0 }];
    let depth = 0, nodes = 0, objects = 0, arrays = 0, scalars = 0, truncated = false;
    while (stack.length) {
      const current = stack.pop();
      nodes++;
      if (nodes > 2048) throw new Error("JSON node limit exceeded");
      depth = Math.max(depth, current.depth);
      const nextType = kind(current.value);
      if (nextType === "object") objects++;
      else if (nextType === "array") arrays++;
      else scalars++;
      if (nextType !== "object" && nextType !== "array") continue;
      const children = nextType === "array" ? current.value : Object.values(current.value);
      if (current.depth >= maxDepth) {
        if (children.length) truncated = true;
        continue;
      }
      for (let i = children.length - 1; i >= 0; i--)
        stack.push({ value: children[i], depth: current.depth + 1 });
      if (stack.length > 2048) throw new Error("JSON node limit exceeded");
    }
    return { type, depth, nodes, objects, arrays, scalars, topKeys, truncated };
  }
  function textPipelinePreview(text, stepsText) {
    const steps = stepsText.split(",").map(step => step.trim()).filter(Boolean);
    const supported = ["uppercase", "lowercase", "trim", "slugify"];
    if (steps.length < 1 || steps.length > 8) throw new Error("Use 1 to 8 steps");
    if (!steps.every(step => supported.includes(step))) {
      throw new Error("Browser demo supports uppercase, lowercase, trim and slugify. Use MCP Inspector for SHA-256.");
    }
    let value = text;
    const intermediateLengths = [];
    for (const step of steps) {
      if (step === "uppercase") value = value.toUpperCase();
      else if (step === "lowercase") value = value.toLowerCase();
      else if (step === "trim") value = value.trim();
      else value = asciiSlug(value);
      if (value.length > maxInput) throw new Error("Intermediate output exceeds 10,000 characters");
      intermediateLengths.push(value.length);
    }
    return {
      value, operations: steps, inputLength: text.length,
      outputLength: value.length, intermediateLengths
    };
  }

  function showExample() {
    const demo = demos[select.value];
    if (!demo) return;
    input.value = demo.a;
    secondary.value = demo.b;
    secondary.hidden = !demo.label;
    secondaryLabel.hidden = !demo.label;
    secondaryLabel.textContent = demo.label;
    output.textContent = "{\n  \"status\": \"Ready for a browser-only demo\"\n}";
    setStatus(status, "Inputs updated. Run the demo to see structured output.");
  }
  function runDemo() {
    try {
      if (input.value.length > maxInput || secondary.value.length > maxInput) throw new Error("Input exceeds 10,000 characters");
      let result;
      switch (select.value) {
        case "crynex_slugify": result = { slug: asciiSlug(input.value) }; break;
        case "crynex_json_pointer": result = jsonPointer(input.value, secondary.value); break;
        case "crynex_text_diff": result = textDiff(input.value, secondary.value); break;
        case "crynex_manifest_lint": result = lintPreview(input.value); break;
        case "crynex_json_inspect": result = jsonShapePreview(input.value, secondary.value); break;
        case "crynex_text_pipeline": result = textPipelinePreview(input.value, secondary.value); break;
        case "custom_uppercase": result = { value: input.value.toUpperCase() }; break;
        default: throw new Error("Unknown demo tool");
      }
      output.textContent = asJSON(result);
      setStatus(status, "Browser-only preview produced. Use MCP Inspector for a real MCP call.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid input";
      output.textContent = asJSON({ isError: true, message });
      setStatus(status, message, true);
    }
  }
  select.addEventListener("change", showExample);
  byId("play-run").addEventListener("click", runDemo);
  byId("play-reset").addEventListener("click", showExample);
  [input, secondary].forEach(field => field.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); runDemo(); }
  }));

  function data() { return { schemaVersion: 1, tools: configured.map(v => ({ ...v })) }; }

  function stopEditing() {
    editingIndex = -1;
    builderSave.textContent = "+ Add tool";
    builderCancel.hidden = true;
  }
  function editTool(index) {
    const tool = configured[index];
    if (!tool) return;
    editingIndex = index;
    name.value = tool.name;
    title.value = tool.title;
    description.value = tool.description;
    operation.value = tool.operation;
    builderSave.textContent = "✓ Save changes";
    builderCancel.hidden = false;
    name.focus();
    setStatus(builderStatus, "Editing " + tool.name + ". Save changes or cancel.");
  }
  function moveTool(index, direction) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= configured.length) return;
    [configured[index], configured[nextIndex]] = [configured[nextIndex], configured[index]];
    stopEditing();
    render();
    setStatus(builderStatus, "Tool order updated in this browser draft.");
  }
  function render() {
    list.replaceChildren();
    for (let index = 0; index < configured.length; index++) {
      const tool = configured[index];
      const entry = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = tool.name + " · " + tool.operation;
      const actions = document.createElement("div");
      actions.className = "play-entry-actions";
      function action(text, label, listener, disabled = false) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = text;
        button.setAttribute("aria-label", label + ": " + tool.name);
        button.disabled = disabled;
        button.addEventListener("click", listener);
        actions.appendChild(button);
      }
      action("Edit", "Edit tool", () => editTool(index));
      action("↑", "Move tool up", () => moveTool(index, -1), index === 0);
      action("↓", "Move tool down", () => moveTool(index, 1), index === configured.length - 1);
      action("Remove", "Remove tool", () => {
        configured.splice(index, 1);
        stopEditing();
        render();
        setStatus(builderStatus, "Tool removed from browser-only configuration.");
      });
      entry.append(label, actions);
      list.appendChild(entry);
    }
    builderOutput.textContent = asJSON(data());
    byId("builder-count").textContent = configured.length + " / 16 configured";
  }
  function parseImportedConfig(value) {
    if (!value || typeof value !== "object" || Array.isArray(value) ||
        value.schemaVersion !== 1 || !Array.isArray(value.tools) ||
        Object.keys(value).some(key => !["schemaVersion", "tools"].includes(key))) {
      throw new Error("Expected strict schemaVersion: 1 with a tools array.");
    }
    if (value.tools.length > 16) throw new Error("Maximum 16 tools.");
    const seen = new Set();
    const imported = [];
    for (const item of value.tools) {
      if (!item || typeof item !== "object" || Array.isArray(item) ||
          Object.keys(item).length !== 4 ||
          Object.keys(item).some(key => !["name", "title", "description", "operation"].includes(key))) {
        throw new Error("A tool has unknown or missing fields.");
      }
      if (typeof item.name !== "string" || !toolNamePattern.test(item.name) ||
          typeof item.title !== "string" || item.title.length < 1 || item.title.length > 100 ||
          typeof item.description !== "string" || item.description.length < 1 ||
          item.description.length > 240 || typeof item.operation !== "string" ||
          !allowedOps.includes(item.operation) || seen.has(item.name)) {
        throw new Error("Invalid name, title, description, operation or duplicate tool.");
      }
      seen.add(item.name);
      imported.push({
        name: item.name, title: item.title,
        description: item.description, operation: item.operation
      });
    }
    if (new Blob([asJSON({ schemaVersion: 1, tools: imported })]).size > 32768) {
      throw new Error("Configuration is larger than 32 KiB.");
    }
    return imported;
  }
  function add() {
    const candidate = {
      name: name.value.trim(), title: title.value.trim(),
      description: description.value.trim(), operation: operation.value
    };
    if (!toolNamePattern.test(candidate.name)) {
      setStatus(builderStatus, "Tool name must match custom_[a-z][a-z0-9_]{2,48}", true);
      return;
    }
    if (!candidate.title || candidate.title.length > 100 ||
        !candidate.description || candidate.description.length > 240) {
      setStatus(builderStatus, "A title (1–100) and description (1–240) are required.", true); return;
    }
    if (!allowedOps.includes(candidate.operation)) {
      setStatus(builderStatus, "Operation not allowlisted.", true); return;
    }
    const next = configured.map(tool => ({ ...tool }));
    if (editingIndex < 0) next.push(candidate);
    else next[editingIndex] = candidate;
    try {
      parseImportedConfig({ schemaVersion: 1, tools: next });
    } catch (error) {
      setStatus(builderStatus, error instanceof Error ? error.message : "Invalid configuration", true);
      return;
    }
    const changed = editingIndex >= 0;
    configured.splice(0, configured.length, ...next);
    stopEditing();
    render();
    setStatus(builderStatus, candidate.name + (changed ? " updated." : " added.") + " Changes stay in the browser until exported.");
  }
  byId("builder-add").addEventListener("click", add);
  builderCancel.addEventListener("click", () => {
    stopEditing();
    setStatus(builderStatus, "Editing cancelled; configuration unchanged.");
  });
  const fileInput = byId("builder-file");
  byId("builder-import").addEventListener("click", () => fileInput.click());
  async function importConfig(file) {
    if (!file) return;
    try {
      if (file.size > 32768) throw new Error("File exceeds the 32 KiB configuration limit.");
      const raw = JSON.parse(await file.text());
      const imported = parseImportedConfig(raw);
      configured.splice(0, configured.length, ...imported);
      stopEditing();
      render();
      setStatus(builderStatus, imported.length + " tools imported into the browser draft. No MCP server was modified.");
    } catch (error) {
      setStatus(builderStatus, error instanceof Error ? error.message : "Cannot import configuration", true);
    }
  }
  fileInput.addEventListener("change", () => {
    const selected = fileInput.files?.[0];
    fileInput.value = "";
    void importConfig(selected);
  });
  byId("builder-example").addEventListener("click", () => {
    configured.splice(0, configured.length, {
      name: "custom_uppercase", title: "Uppercase a message",
      description: "Convert provided text to uppercase.", operation: "uppercase"
    }, {
      name: "custom_compact_slug", title: "Build an ASCII slug",
      description: "Produce a stable, URL-friendly label.", operation: "slugify"
    });
    stopEditing(); render(); setStatus(builderStatus, "Sample config loaded locally.");
  });
  byId("builder-clear").addEventListener("click", () => {
    configured.splice(0); stopEditing(); render(); setStatus(builderStatus, "Configuration cleared.");
  });
  async function copy(text, element) {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(text);
      setStatus(element, "Copied to clipboard.");
    } catch {
      setStatus(element, "Clipboard unavailable: select and copy the displayed JSON.", true);
    }
  }
  byId("play-copy").addEventListener("click", () => copy(output.textContent, status));
  byId("builder-copy").addEventListener("click", () => copy(builderOutput.textContent, builderStatus));
  byId("builder-download").addEventListener("click", () => {
    const bytes = new Blob([asJSON(data()) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(bytes);
    const link = document.createElement("a");
    link.href = url; link.download = "custom-tools.json";
    document.body.appendChild(link); link.click(); link.remove();
    URL.revokeObjectURL(url);
    setStatus(builderStatus, "Downloaded custom-tools.json. Enable it explicitly in your local MCP host.");
  });
  showExample(); render();
})();
