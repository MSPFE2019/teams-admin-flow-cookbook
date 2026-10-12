(function (root) {
  "use strict";
  function docsUrl(recipe) {
    return `https://learn.microsoft.com/graph/api/${recipe.doc}?view=graph-rest-1.0`;
  }
  function endpoint(recipe, cloud, values = {}, route = "application") {
    if (!recipe.clouds.includes(cloud)) throw new Error("This API is not documented for the selected cloud.");
    const data = typeof module !== "undefined" && module.exports ? require("./recipes.js") : root.CookbookData;
    const path = route === "delegated" && recipe.delegatedEndpoint ? recipe.delegatedEndpoint : recipe.endpoint;
    const substituted = path.replace(/\{(\w+)\}/g, (placeholder, key) => {
      const value = (values[key] || "").trim();
      if (!value) return placeholder;
      const escaped = key === "joinWebUrl" ? value.replace(/'/g, "''") : value;
      return encodeURIComponent(escaped).replace(/'/g, "%27");
    });
    return data.clouds[cloud].graph + "/v1.0" + substituted;
  }
  function filterRecipes(recipes, { query = "", category = "", response = "", route = "", cloud = "" } = {}) {
    const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    return recipes.filter(recipe => {
      const text = JSON.stringify(recipe).toLocaleLowerCase();
      return terms.every(term => text.includes(term)) &&
        (!category || recipe.category === category) &&
        (!response || recipe.response === response) &&
        (!route || Boolean(recipe.permissions[route])) &&
        (!cloud || recipe.clouds.includes(cloud));
    });
  }
  const api = { docsUrl, endpoint, filterRecipes };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CookbookCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
