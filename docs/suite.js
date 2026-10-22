import { SuiteClient, suiteNavigation } from "./vendor/contracts/client.js";
const id = new URL(location.href).searchParams.get("projectId");
if (id) {
  document.body.prepend(suiteNavigation("mcp"));
  const section = document.createElement("section");
  section.className = "section";
  section.id = "connected-tools";
  const title = document.createElement("h2");
  title.textContent = "Connected team tools";
  const note = document.createElement("p");
  note.textContent =
    "This panel uses the real MCP server over stdio through the team platform. The playground below remains a browser simulation.";
  const form = document.createElement("form"),
    label = document.createElement("label"),
    select = document.createElement("select"),
    inputLabel = document.createElement("label"),
    input = document.createElement("textarea"),
    button = document.createElement("button"),
    result = document.createElement("pre");
  label.textContent = "Tool ";
  label.append(select);
  inputLabel.textContent = "Arguments (JSON) ";
  input.value = '{"text":"Hello CryNex"}';
  input.rows = 5;
  inputLabel.append(input);
  button.textContent = "Run real tool";
  result.setAttribute("aria-live", "polite");
  form.append(label, inputLabel, button);
  section.append(title, note, form, result);
  document.querySelector("main")?.prepend(section);
  const api = new SuiteClient();
  async function connect() {
    try {
      await api.session();
      const project = await api.request("/projects/" + id);
      if (project.role === "viewer") {
        button.disabled = true;
        result.textContent =
          "Your viewer role can inspect tools. An editor can execute them.";
      }
      const tools = await api.request("/projects/" + id + "/tools");
      for (const tool of tools) {
        const option = document.createElement("option");
        option.value = tool.name;
        option.textContent = tool.name;
        select.append(option);
      }
    } catch (error) {
      button.disabled = true;
      result.textContent = error.message + " — Sign in through App Builder.";
    }
  }
  form.onsubmit = async (event) => {
    event.preventDefault();
    button.disabled = true;
    try {
      result.textContent = "Running MCP request…";
      result.textContent = JSON.stringify(
        await api.request(
          "/projects/" + id + "/tools/" + encodeURIComponent(select.value),
          { method: "POST", body: JSON.stringify(JSON.parse(input.value)) },
        ),
        null,
        2,
      );
    } catch (error) {
      result.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  };
  void connect();
}
