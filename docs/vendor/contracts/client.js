export class SuiteClient {
  constructor(base = "/api/suite/v1") {
    this.base = base;
    this.csrf = "";
  }
  async request(path, options = {}) {
    const headers = new Headers(options.headers);
    if (options.body && typeof options.body === "string")
      headers.set("content-type", "application/json");
    if (options.method && !["GET", "HEAD"].includes(options.method))
      headers.set("x-csrf-token", this.csrf);
    const response = await fetch(this.base + path, {
      ...options,
      headers,
      credentials: "same-origin",
    });
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      throw Object.assign(new Error(error.error || "Request failed"), {
        status: response.status,
        details: error,
      });
    }
    if (response.status === 204) return null;
    return response.json();
  }
  async session() {
    const data = await this.request("/session");
    this.csrf = data.csrf;
    return data;
  }
  async login(email, password) {
    await this.request("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return this.session();
  }
  events(projectId, onEvent, onReconnect = () => {}) {
    let socket,
      timer,
      closed = false;
    const connect = () => {
      socket = new WebSocket(
        `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}${this.base}/events?projectId=${encodeURIComponent(projectId)}`,
      );
      socket.onopen = () => onReconnect();
      socket.onmessage = (e) => {
        try {
          onEvent(JSON.parse(e.data));
        } catch {}
      };
      socket.onclose = () => {
        if (!closed) timer = setTimeout(connect, 1500);
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(timer);
      socket?.close();
    };
  }
}
export function suiteNavigation(active) {
  const nav = document.createElement("nav");
  nav.className = "suite-nav";
  nav.setAttribute("aria-label", "CryNex suite");
  for (const [id, label] of [
    ["projects", "Projects"],
    ["office", "3D Office"],
    ["apps", "App Builder"],
    ["creative", "Creative Studio"],
    ["engine", "Game Engine"],
    ["mcp", "MCP Lab"],
    ["language", "CryoPG"],
  ]) {
    const a = document.createElement("a");
    a.textContent = label;
    a.href =
      `/${id}/` +
      (new URLSearchParams(location.search).has("projectId")
        ? "?projectId=" +
          encodeURIComponent(
            new URLSearchParams(location.search).get("projectId"),
          )
        : "");
    if (id === active) a.setAttribute("aria-current", "page");
    nav.append(a);
  }
  return nav;
}
