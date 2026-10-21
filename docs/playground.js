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
  function render() {
    list.replaceChildren();
    for (const tool of configured) {
      const entry = document.createElement("li");
      const text = document.createElement("span");
      text.textContent = tool.name + " · " + tool.operation;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove " + tool.name);
      remove.addEventListener("click", () => {
        const index = configured.findIndex(t => t.name === tool.name);
        if (index >= 0) configured.splice(index, 1);
        render();
        setStatus(builderStatus, "Tool removed from browser-only configuration.");
      });
      entry.append(text, remove);
      list.appendChild(entry);
    }
    builderOutput.textContent = asJSON(data());
    byId("builder-count").textContent = configured.length + " / 16 configured";
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
    if (configured.length >= 16 || configured.some(tool => tool.name === candidate.name)) {
      setStatus(builderStatus, "Too many tools or duplicate name.", true); return;
    }
    const candidateData = { schemaVersion: 1, tools: [...configured, candidate] };
    if (asJSON(candidateData).length > 32768) {
      setStatus(builderStatus, "Generated JSON is too large.", true); return;
    }
    configured.push(candidate);
    render();
    setStatus(builderStatus, candidate.name + " added to the browser-only config.");
  }
  byId("builder-add").addEventListener("click", add);
  byId("builder-example").addEventListener("click", () => {
    configured.splice(0, configured.length, {
      name: "custom_uppercase", title: "Uppercase a message",
      description: "Convert provided text to uppercase.", operation: "uppercase"
    }, {
      name: "custom_compact_slug", title: "Build an ASCII slug",
      description: "Produce a stable, URL-friendly label.", operation: "slugify"
    });
    render(); setStatus(builderStatus, "Sample config loaded locally.");
  });
  byId("builder-clear").addEventListener("click", () => {
    configured.splice(0); render(); setStatus(builderStatus, "Configuration cleared.");
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
