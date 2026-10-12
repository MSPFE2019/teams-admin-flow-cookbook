"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const YAML = require("yaml");
const data = require("../assets/recipes.js");
const core = require("../assets/core.js");
const root = path.resolve(__dirname, "..");
const recipe = id => data.recipes.find(item => item.id === id);

test("all 13 recipes have unique IDs, documented GET paths and complete steps", () => {
  assert.equal(data.recipes.length, 13);
  assert.equal(new Set(data.recipes.map(item => item.id)).size, 13);
  for (const item of data.recipes) {
    assert.match(item.id, /^[a-z0-9-]+$/);
    assert.match(item.endpoint, /^\/(users|teams|reports)\//);
    assert.ok(item.doc && item.summary && item.category);
    assert.ok(item.limitations.length >= 3);
    assert.ok(item.steps.length >= 4);
    assert.ok(item.permissions.application && item.permissions.delegated);
    assert.doesNotMatch(JSON.stringify(item.permissions), /ReadWrite|\.Write|Directory\.Read/);
    assert.ok(item.clouds.length && item.clouds.every(key => data.clouds[key]));
    assert.match(core.docsUrl(item), /^https:\/\/learn\.microsoft\.com\/graph\/api\/.+\?view=graph-rest-1\.0$/);
    for (const [, key] of item.endpoint.matchAll(/\{(\w+)\}/g)) assert.ok(item.parameters[key]);
    for (const cloud of item.clouds) assert.ok(core.endpoint(item, cloud).startsWith(`${data.clouds[cloud].graph}/v1.0/`));
  }
});
test("path IDs are encoded once; unresolved placeholders stay visible", () => {
  const item = recipe("channel-members");
  const uri = core.endpoint(item, "global", { teamId: "team", channelId: "19:a/b@thread.v2" });
  assert.equal(uri, "https://graph.microsoft.com/v1.0/teams/team/channels/19%3Aa%2Fb%40thread.v2/members");
  assert.match(core.endpoint(item, "global"), /\{teamId\}/);
});
test("join URL encodes URL delimiters and escapes OData quotes", () => {
  const raw = "https://teams.microsoft.com/l/meetup-join/a'b?context={\"Tid\":\"x\"}&q=1";
  const uri = core.endpoint(recipe("meeting-lookup"), "global", { userId: "u", joinWebUrl: raw });
  const filter = new URL(uri).searchParams.get("$filter");
  assert.equal(filter, `JoinWebUrl eq '${raw.replace(/'/g, "''")}'`);
  assert.ok(uri.includes("%26q%3D1"));
  assert.ok(!uri.includes("{joinWebUrl}"));
});
test("delegated /me is never the app-only default", () => {
  assert.ok(core.endpoint(recipe("meeting-lookup"), "us", {}, "delegated").includes("/me/onlineMeetings"));
  assert.ok(core.endpoint(recipe("meeting-lookup"), "us").includes("/users/{userId}/onlineMeetings"));
  for (const item of data.recipes) assert.ok(!core.endpoint(item, "global").includes("/me/"));
});
test("cloud restrictions and DoD authority are explicit", () => {
  assert.equal(core.filterRecipes(data.recipes, { cloud: "china" }).length, 6);
  assert.equal(core.filterRecipes(data.recipes, { cloud: "us" }).length, 12);
  assert.throws(() => core.endpoint(recipe("team-activity"), "dod"), /not documented/);
  assert.throws(() => core.endpoint(recipe("recordings"), "china"), /not documented/);
  assert.equal(data.clouds.dod.graph, "https://dod-graph.microsoft.us");
  assert.equal(data.clouds.dod.authority, "https://login.microsoftonline.us");
});
test("filters combine terms, category, format, route and cloud", () => {
  const results = core.filterRecipes(data.recipes, { query: "TRANSCRIPT content", category: "Meetings", response: "text", route: "application", cloud: "global" });
  assert.deepEqual(results.map(item => item.id), ["transcript-content"]);
  assert.equal(core.filterRecipes(data.recipes, { query: "no-such-recipe" }).length, 0);
  assert.equal(core.filterRecipes(data.recipes, { route: "rsc" }).length, 10);
});
test("content recipes cannot be mistaken for JSON", () => {
  assert.equal(recipe("recording-content").response, "binary");
  assert.equal(recipe("recording-content").accept, null);
  assert.equal(recipe("transcript-content").response, "text");
  assert.equal(recipe("transcript-content").accept, "text/vtt");
  assert.equal(recipe("team-activity").response, "csv");
  assert.ok(recipe("team-activity").limitations.some(text => text.includes("302")));
  assert.ok(recipe("transcript-content").limitations.some(text => text.includes("application/vnd.microsoft.graph.transcript+text")));
});
test("meeting policy, channel limitations and tenant controls remain documented", () => {
  for (const item of data.recipes.filter(item => item.category === "Meetings")) {
    assert.ok(item.limitations.some(text => text.includes("application access policy")));
    assert.ok(item.flags.includes("Sensitive"));
  }
  assert.ok(recipe("transcripts").limitations.some(text => /not (?:to )?channel meetings/.test(text)));
  assert.ok(recipe("transcripts").limitations.some(text => text.includes("GraphAccessToTranscriptsDisabled")));
  assert.ok(recipe("channels").limitations.some(text => text.includes("US Government")));
});
test("browser globals load without a bundler", () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(root, "assets", "recipes.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(root, "assets", "core.js"), "utf8"), context);
  assert.equal(context.CookbookData.recipes.length, 13);
  assert.ok(context.CookbookCore.endpoint(context.CookbookData.recipes[0], "global").includes("/v1.0/users/"));
});
test("HTML assets, IDs and README catalog match the data", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
  const sources = fs.readFileSync(path.join(root, "docs", "SOURCES.md"), "utf8");
  for (const [, asset] of html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)) assert.ok(fs.existsSync(path.join(root, ...asset.split("/"))));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const item of data.recipes) {
    assert.ok(readme.includes(item.endpoint), `${item.id} missing README path`);
    assert.ok(readme.includes(core.docsUrl(item)), `${item.id} missing Learn link`);
    assert.ok(sources.includes(item.id), `${item.id} missing source audit`);
  }
  assert.ok(html.includes('role="status"'));
  assert.ok(html.includes("August 25, 2025"));
  assert.ok(!html.includes("cdn."));
});
test("Pages YAML deploys main only with minimal deployment permissions", () => {
  const workflow = YAML.parse(fs.readFileSync(path.join(root, ".github", "workflows", "pages.yml"), "utf8"));
  assert.deepEqual(workflow.on.push.branches, ["main"]);
  assert.deepEqual(workflow.on.pull_request.branches, ["main"]);
  assert.equal(workflow.permissions.contents, "read");
  assert.equal(workflow.jobs.deploy.needs, "validate");
  assert.ok(workflow.jobs.deploy.if.includes("github.event_name != 'pull_request'"));
  assert.ok(workflow.jobs.deploy.if.includes("refs/heads/main"));
  assert.deepEqual(workflow.jobs.deploy.permissions, { pages: "write", "id-token": "write" });
  assert.equal(workflow.jobs.validate.steps.find(step => step.uses?.startsWith("actions/upload-pages-artifact")).with.path, "_site");
  const runs = workflow.jobs.validate.steps.map(step => step.run).filter(Boolean);
  assert.ok(runs.includes("npm test") && runs.includes("npm run test:browser") && runs.includes("npm run build"));
});
