(function () {
  "use strict";
  const { recipes, clouds } = window.CookbookData;
  const { endpoint, docsUrl, filterRecipes } = window.CookbookCore;
  const byId = id => document.getElementById(id);
  const filters = byId("filters");
  const list = byId("recipes");
  const formats = { collection: "JSON collection", object: "JSON object", binary: "Binary / media", text: "VTT / text", csv: "CSV redirect" };
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function appendList(parent, tag, items, className) {
    const node = element(tag, undefined, className);
    items.forEach(text => node.append(element("li", text)));
    parent.append(node);
  }
  function link(text, url) {
    const node = element("a", text);
    node.href = url;
    return node;
  }
  function currentFilters() {
    return { query: byId("search").value, category: byId("category").value, response: byId("response").value, route: byId("route").value, cloud: byId("cloud").value };
  }
  function createCard(recipe, cloud, route) {
    const card = element("details", undefined, "recipe");
    card.id = recipe.id;
    const summary = element("summary");
    summary.append(element("span", recipe.title), element("span", recipe.summary, "summary-text"));
    const chips = element("span", undefined, "chips");
    [recipe.category, formats[recipe.response], ...recipe.flags].forEach(flag => chips.append(element("span", flag, flag === "Sensitive" || flag.includes("policy") || flag.includes("controls") ? "chip caution" : "chip")));
    summary.append(chips);
    card.append(summary);
    const body = element("div", undefined, "recipe-body");
    body.append(element("h3", "Permissions: choose one authorization route"));
    const permissionBox = element("div", undefined, "permissions");
    const dl = element("dl");
    Object.entries(recipe.permissions).forEach(([type, permission]) => {
      dl.append(element("dt", type === "rsc" ? "Application RSC (least scoped)" : type === "application" ? "Application (non-RSC)" : "Delegated (work/school)"));
      dl.append(element("dd", permission || "No RSC alternative documented for this recipe."));
    });
    permissionBox.append(dl);
    body.append(permissionBox, element("p", "Use only the permission relevant to your chosen route. RSC needs a Teams app/consent; app-only non-RSC needs tenant admin consent. Settings recipes distinguish basic-property minimums from settings access.", "caption"));
    body.append(link("Official Microsoft Learn API documentation", docsUrl(recipe)));
    body.append(element("h3", "Build the exact GET URI"));
    const path = route === "delegated" && recipe.delegatedEndpoint ? recipe.delegatedEndpoint : recipe.endpoint;
    body.append(element("p", `Route shown: ${route === "delegated" ? "delegated" : route === "rsc" ? "RSC application alternative" : "application"} | v1.0 | ${formats[recipe.response]}`, "meta"));
    const values = {};
    const parameters = element("div", undefined, "parameters");
    const pre = element("pre");
    const code = element("code");
    pre.append(code);
    const copy = element("button");
    copy.type = "button";
    const message = element("span", "", "copy-message");
    message.setAttribute("role", "status");
    function updateEndpoint() {
      code.textContent = endpoint(recipe, cloud, values, route);
      copy.textContent = /\{\w+\}/.test(code.textContent) ? "Copy URL template" : "Copy full endpoint";
      message.textContent = "";
    }
    const needed = [...path.matchAll(/\{(\w+)\}/g)].map(match => match[1]);
    needed.forEach(key => {
      const label = element("label");
      const input = element("input");
      input.id = `${recipe.id}-${key}`;
      input.type = "text";
      input.autocomplete = "off";
      input.spellcheck = false;
      label.htmlFor = input.id;
      label.append(element("strong", key), element("span", recipe.parameters[key]), input);
      input.addEventListener("input", () => { values[key] = input.value; updateEndpoint(); });
      parameters.append(label);
    });
    body.append(element("p", "Optional local URL builder: enter raw IDs/URL, not encoded values. Blank fields remain {placeholders}. Nothing is saved or sent. GET body stays empty.", "caption"), parameters, pre);
    copy.addEventListener("click", async () => {
      try {
        if (!navigator.clipboard || !window.isSecureContext) throw new Error("Clipboard API unavailable");
        await navigator.clipboard.writeText(code.textContent);
        message.textContent = /\{\w+\}/.test(code.textContent) ? "Template copied. Replace every placeholder before running." : "Full endpoint copied.";
      } catch {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(code);
        selection.removeAllRanges();
        selection.addRange(range);
        message.textContent = "Clipboard unavailable. URL selected; press Ctrl+C (Command+C on Mac) to copy.";
      }
    });
    const tools = element("div", undefined, "recipe-tools");
    const permalink = link("Link to this recipe", `#${recipe.id}`);
    tools.append(copy, permalink, message);
    body.append(tools);
    body.append(element("p", recipe.accept ? `Accept header: ${recipe.accept}` : "Accept header: do not force application/json; inspect the returned media/CSV Content-Type.", "meta"));
    body.append(element("h3", "Prerequisites and limitations"));
    appendList(body, "ul", recipe.limitations, "limits");
    body.append(element("h3", "Practical Power Automate steps"));
    appendList(body, "ol", recipe.steps);
    body.append(element("p", `Documented clouds: ${recipe.clouds.map(key => clouds[key].name).join(", ")}. Review the API cloud table and implementation differences before deployment.`, "caption"));
    body.append(link("Teams cloud implementation differences", "https://learn.microsoft.com/graph/teamwork-national-cloud-differences"));
    card.append(body);
    updateEndpoint();
    return card;
  }
  function render() {
    const state = currentFilters();
    const results = filterRecipes(recipes, state);
    list.replaceChildren(...results.map(recipe => createCard(recipe, state.cloud, state.route)));
    byId("result-count").textContent = `${results.length} of ${recipes.length} recipes for ${clouds[state.cloud].name}.`;
    byId("cloud-info").textContent = `Graph Audience: ${clouds[state.cloud].graph} | OAuth Authority: ${clouds[state.cloud].authority}`;
    if (!results.length) list.append(element("p", "No matching recipes. Change search terms or reset filters.", "notice"));
  }
  function openHash() {
    const id = window.location.hash.slice(1);
    const recipe = recipes.find(item => item.id === id);
    if (!recipe) return;
    if (!byId(id)) {
      filters.reset();
      byId("result-count").textContent += " Filters reset to Worldwide / GCC application mode to show the linked recipe.";
    }
    const card = byId(id);
    card.open = true;
    card.scrollIntoView({ block: "start" });
  }
  filters.addEventListener("submit", event => event.preventDefault());
  filters.addEventListener("input", render);
  filters.addEventListener("reset", event => {
    event.preventDefault();
    for (const id of ["search", "category", "response"]) byId(id).value = "";
    byId("route").value = "application";
    byId("cloud").value = "global";
    render();
  });
  window.addEventListener("hashchange", openHash);
  const themeParam = new URLSearchParams(window.location.search).get("scoutTheme");
  if (themeParam === "light" || themeParam === "dark") document.documentElement.dataset.theme = themeParam;
  byId("theme").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    byId("announcement").textContent = `${dark ? "Dark" : "Light"} theme selected.`;
  });
  byId("text-size").addEventListener("change", event => {
    document.documentElement.style.fontSize = `${event.target.value}%`;
  });
  render();
  openHash();
})();
