# Teams Admin Flow Cookbook

A standalone, read-only interactive cookbook for **Power Automate + Microsoft Graph**. Thirteen deliberately scoped recipes cover Teams configuration, channels, membership/ownership, installed apps, online meeting lookup, recording/transcript metadata and content, and Teams usage reporting.

**Beginner?** Open [the interactive catalog](index.html), expand **Beginner setup**, then try **Find a user's joined teams**. Search by task or permission, filter by category/format/authorization/cloud, open a recipe, and copy its full GET URL. An optional local URL builder encodes raw IDs and join URLs; **it never calls Graph, accepts credentials, or saves your inputs**.

Intended independent Pages URL: **https://mspfe2019.github.io/teams-admin-flow-cookbook/**. It becomes available only after the workflow deploys successfully; this link is not a claim that deployment has already occurred.

Inspired by the use patterns of the [Entra Admin Flow Cookbook](https://github.com/MSPFE2019/entra-admin-flow-cookbook): a reusable beginner HTTP foundation, searchable recipes, complete endpoint copies, and clear permission/cloud cautions. This repository is self-contained and does not modify or depend on that repository.

## Scope and current documentation

- **GET only:** no writes, deletes, membership changes, app installation or policy changes. Saving an approved report to your own restricted destination is separate from Graph administration.
- **v1.0 only:** no beta-only recipes or unsupported API substitutions.
- Permissions and endpoints reviewed **2026-10-12** against [Microsoft's official Graph documentation source](https://github.com/microsoftgraph/microsoft-graph-docs-contrib/tree/56602fde3f9889e14ac89916234200ab881feb33). See [source verification](docs/SOURCES.md); linked Microsoft Learn pages remain the operational authority.
- **Teams API metering ended August 25, 2025**, per the [current metered API list](https://learn.microsoft.com/graph/metered-api-list). Do not reuse obsolete billing/model A/B instructions. Power Automate and Teams feature licensing still apply.
- **Channel meetings:** current transcript APIs support them with `OnlineMeetingTranscript.Read.All` and an application access policy; the narrower RSC `OnlineMeetingTranscript.Read.Chat` permission **does not**. The current recordings documentation supports meeting types except live events. Check the recipe's invite, policy, expiry and cloud limitations rather than assuming every participant can download content.
- Nothing here claims all tenant data can be inventoried from one user or one team. Joined teams is user-scoped; direct channel membership is not indirect/effective shared-channel access. Team/channel settings are not a full export of tenant Teams policies.

## Recipe catalog

All displayed paths are appended to the cloud's Graph base URL plus `/v1.0`. Braced values are placeholders, not literal IDs. For delegated meeting routes the catalog can display `/me`; client-credential flows must use `/users/{userId}`.

| Recipe | Exact GET path | Format | Non-RSC application permission | Least-scoped RSC alternative | API documentation |
| --- | --- | --- | --- | --- | --- |
| User's joined teams | `/users/{userId}/joinedTeams` | JSON collection | `Team.ReadBasic.All` | None documented | [joinedTeams](https://learn.microsoft.com/graph/api/user-list-joinedteams?view=graph-rest-1.0) |
| Team settings/archive status | `/teams/{teamId}` | JSON object | `TeamSettings.Read.All` for settings | `TeamSettings.Read.Group` | [Get team](https://learn.microsoft.com/graph/api/team-get?view=graph-rest-1.0) |
| Channel inventory | `/teams/{teamId}/channels?$select=id,displayName,membershipType` | JSON collection | `Channel.ReadBasic.All` | `ChannelSettings.Read.Group` | [List channels](https://learn.microsoft.com/graph/api/channel-list?view=graph-rest-1.0) |
| Team members/owners | `/teams/{teamId}/members` | JSON collection | `TeamMember.Read.All` | `TeamMember.Read.Group` | [Team members](https://learn.microsoft.com/graph/api/team-list-members?view=graph-rest-1.0) |
| Channel details/settings | `/teams/{teamId}/channels/{channelId}` | JSON object | `ChannelSettings.Read.All` for settings | `ChannelSettings.Read.Group` | [Get channel](https://learn.microsoft.com/graph/api/channel-get?view=graph-rest-1.0) |
| Direct channel members/owners | `/teams/{teamId}/channels/{channelId}/members` | JSON collection | `ChannelMember.Read.All` | `ChannelMember.Read.Group` | [Channel members](https://learn.microsoft.com/graph/api/channel-list-members?view=graph-rest-1.0) |
| Team's installed apps | `/teams/{teamId}/installedApps?$expand=teamsApp,teamsAppDefinition` | JSON collection | `TeamsAppInstallation.ReadForTeam.All` | `TeamsAppInstallation.Read.Group` | [Installed apps](https://learn.microsoft.com/graph/api/team-list-installedapps?view=graph-rest-1.0) |
| Meeting join-URL lookup | `/users/{userId}/onlineMeetings?$filter=JoinWebUrl%20eq%20'{joinWebUrl}'` | JSON collection | `OnlineMeetings.Read.All` | None documented | [Get onlineMeeting](https://learn.microsoft.com/graph/api/onlinemeeting-get?view=graph-rest-1.0) |
| Recording metadata | `/users/{userId}/onlineMeetings/{meetingId}/recordings` | JSON collection | `OnlineMeetingRecording.Read.All` | `OnlineMeetingRecording.Read.Chat` | [List recordings](https://learn.microsoft.com/graph/api/onlinemeeting-list-recordings?view=graph-rest-1.0) |
| Recording download | `/users/{userId}/onlineMeetings/{meetingId}/recordings/{recordingId}/content` | Media bytes | `OnlineMeetingRecording.Read.All` | `OnlineMeetingRecording.Read.Chat` | [Get callRecording](https://learn.microsoft.com/graph/api/callrecording-get?view=graph-rest-1.0) |
| Transcript metadata | `/users/{userId}/onlineMeetings/{meetingId}/transcripts` | JSON collection | `OnlineMeetingTranscript.Read.All` | `OnlineMeetingTranscript.Read.Chat` (private chat only) | [List transcripts](https://learn.microsoft.com/graph/api/onlinemeeting-list-transcripts?view=graph-rest-1.0) |
| Transcript download | `/users/{userId}/onlineMeetings/{meetingId}/transcripts/{transcriptId}/content` | WebVTT / text | `OnlineMeetingTranscript.Read.All` | `OnlineMeetingTranscript.Read.Chat` (private chat only) | [Get callTranscript](https://learn.microsoft.com/graph/api/calltranscript-get?view=graph-rest-1.0) |
| Team activity (7 days) | `/reports/getTeamsTeamActivityDetail(period='D7')` | 302 then CSV | `Reports.Read.All` | None documented | [Team activity detail](https://learn.microsoft.com/graph/api/reportroot-getteamsteamactivitydetail?view=graph-rest-1.0) |

### Permission routes: choose one, don't combine blindly

**Application / app-only** is the default beginner route for unattended scheduled flows. An Entra app registration needs the listed **Application** read permission and tenant admin consent. The table shows the relevant **non-RSC** route, not an assertion that tenant-wide access is narrower than RSC.

**Delegated** requires an approved signed-in connection/custom connector with delegated scopes. It is not the client-secret setup below. The interactive recipe displays its relevant delegated permission: `Team.ReadBasic.All` for joined teams; `TeamSettings.Read.All` for a full settings report; `Channel.ReadBasic.All` for channel inventory; `ChannelSettings.Read.All` for channel settings; `TeamMember.Read.All`; `ChannelMember.Read.All`; `TeamsAppInstallation.ReadForTeam`; `OnlineMeetings.Read`; the corresponding recording/transcript `.Read.All`; or `Reports.Read.All`. Personal Microsoft accounts are unsupported.

The get-team/get-channel docs list **basic-property minimums** (`Team.ReadBasic.All` / `Channel.ReadBasic.All`) separately from higher settings-read scopes. Choose access relevant to the properties you actually need. Don't request read/write permissions just because they appear in the API's compatibility table.

**RSC (resource-specific consent)** is an application authorization alternative tied to a Teams app's manifest, installation and consent for one team/chat. It is often the least-scoped option. `.Read.Group` and `.Read.Chat` are **not ordinary permissions to add to an Entra registration**. See [RSC](https://learn.microsoft.com/microsoftteams/platform/graph-api/rsc/resource-specific-consent). This cookbook shows the alternative but does not implement Teams app installation or consent.

**Meeting app-only `.Read.All` additionally requires an [application access policy](https://learn.microsoft.com/graph/cloud-communication-online-meeting-application-access-policy)** assigned by a tenant administrator to the organizer context in the request. Consent alone is insufficient; allow up to 30 minutes for propagation. These are not application-only APIs: delegated alternatives exist, but `/me` itself cannot be called with app-only credentials.

## Beginner guide

### 1. Preflight

Have the Directory tenant ID, Application client ID, a single authorized test user/team, the recipe's exact permission type, and a secure credential/connection. Register the app in the same tenant and cloud as the data. Ask your administrators to approve scope, tenant controls, storage, recipients and retention.

HTTP commonly requires **Power Automate Premium** and must be available in your environment/DLP policy. Check your exact connector's Microsoft documentation. Teams feature entitlement, organizer licensing and recording/transcription policies are separate from API access; this cookbook does not claim a blanket Teams Premium or E5 prerequisite.

Use a certificate/approved managed connection where supported. If the HTTP action requires a secret, retrieve its **Value**, not its ID, from an approved vault. Never put secrets/access tokens in Compose, a URL, a source file, a screenshot, an email or a public flow export. Restrict co-owners and run-history access, enable Secure Inputs/Outputs for secret-bearing actions, and define rotation and failure ownership.

### 2. Create a scheduled cloud flow

1. Select **Create > Scheduled cloud flow**, name it `Teams joined-team review`, and start with a weekly schedule.
2. Add the approved **HTTP** action. The standard action's app-only configuration commonly uses **Active Directory OAuth**; connection-based delegated connectors behave differently.
3. Open the recipe, choose the correct cloud/authorization, replace placeholders, and copy the full URL. The local builder expects raw IDs/URL and encodes them once.
4. Use the following fields; if your connector doesn't expose them, stop and check that connector's docs instead of guessing.

| HTTP field | Value |
| --- | --- |
| Method | `GET` |
| URI | Full copied URI, including `/v1.0`, endpoint and query |
| Headers | `Accept: application/json` for JSON only; transcript content uses `text/vtt` or its documented unattributed format |
| Queries | Empty when query options are already in URI |
| Body | Empty |
| Authentication | Active Directory OAuth for the standard app-only HTTP action |
| Authority | Tenant cloud's sign-in host below |
| Tenant | Directory tenant ID |
| Audience | Graph base URL only; **no** `/v1.0` or endpoint |
| Client ID | Application client ID |
| Credential | Approved credential; if Secret is required, securely retrieved secret **Value** |

Do not add a manual Authorization bearer header when OAuth is configured to obtain the token. A client secret supplies **application** permissions, not delegated permissions.

### 3. Match tenant cloud and API availability

| Tenant cloud | Graph base / Audience | Authority |
| --- | --- | --- |
| Worldwide / GCC | `https://graph.microsoft.com` | `https://login.microsoftonline.com` |
| GCC High / L4 | `https://graph.microsoft.us` | `https://login.microsoftonline.us` |
| DoD / L5 | `https://dod-graph.microsoft.us` | `https://login.microsoftonline.us` |
| China / 21Vianet | `https://microsoftgraph.chinacloudapi.cn` | `https://login.chinacloudapi.cn` |

Example: `https://graph.microsoft.com/v1.0/users/{userId}/joinedTeams`.

Changing the host does not make an unsupported API supported. The catalog hides APIs unavailable in the selected cloud. **Shared-channel operations are unsupported in US Government and China clouds.** The team activity report is **global-only**. Installed apps and meeting APIs are not supported in China. Check both the endpoint's availability table and [Teams implementation differences](https://learn.microsoft.com/graph/teamwork-national-cloud-differences), as well as [Graph deployments](https://learn.microsoft.com/graph/deployments) and [Power Automate US Government](https://learn.microsoft.com/power-automate/us-govt).

### 4. Test HTTP, Compose a sample, then Parse JSON

1. Add **Compose** immediately after HTTP. Inputs = HTTP **Body**; expression alternative: `body('HTTP')`.
2. Save/test just HTTP + Compose first. Verify a successful JSON response in Run history.
3. Copy the private Compose Outputs JSON. Add **Parse JSON**, Content = HTTP Body, and use **Generate from sample** for the schema. Don't paste real tenant data into a public issue.
4. Save/test again. Adjust optional, absent and nullable fields to match real responses; an empty array sample cannot infer item fields.
5. For collections, use **Apply to each** on `body('Parse_JSON')?['value']`. `item()` is one record; append that item or selected properties, not the entire array. For single objects use properties directly and **no** value loop.
6. Use **Select** to minimize columns, then **Create HTML table** or an approved restricted file/report action. Remove temporary Compose once schema testing is complete.

Replace `HTTP` and `Parse_JSON` with your actual action names. Don't interpret arbitrary API HTML/text as trusted executable markup. Binary, VTT and CSV recipes **skip this JSON foundation** and follow their own content steps.

### 5. Pagination

Initialize string `nextLink` to the first full URI and initialize an output array **before** the loop. Add **Do until**:

```text
equals(variables('nextLink'), '')
```

Inside it:

1. GET `variables('nextLink')`.
2. Parse/process that page's `value` records.
3. Set `nextLink` to:

```text
coalesce(body('HTTP')?['@odata.nextLink'], '')
```

Run the first request before checking for completion. Use Graph's nextLink as-is; don't recreate skip tokens or duplicate query fields. Validate HTTPS and the expected Graph cloud hostname before sending credentials. Bound the Do until count/timeout and honor `Retry-After`. If a limit is reached while nextLink is nonempty, notify/fail explicitly instead of publishing a partial report as complete.

Keep loops sequential when mutating shared variables/arrays. A nested HTTP action for each team/channel needs its own permission and its own pagination loop. Count records only after processing all pages.

### 6. Build the meeting artifact chain

1. Start with an existing authorized calendar invite's **join URL** and the **organizer's Entra object ID**. The cookbook is not a tenant-wide discovery tool.
2. In the lookup URI, OData-escape single quotes by doubling them, then URL-encode the join URL once (Power Automate: `encodeUriComponent` after escaping). Don't encode the whole Graph URL. The local builder handles this for you.
3. Parse the lookup's **value array** and retain its Graph **onlineMeeting `id`**. An Outlook event ID, chat ID, human joinMeetingId, and onlineMeeting id are different identifiers.
4. Separately authorize the recordings/transcripts listing. Use the same organizer context, meeting ID, and the artifact's own read permission. A meeting-read permission alone does not read content.
5. List metadata first; iterate returned recording/transcript IDs. Decide whether content is actually needed.
6. For recordings `/content`, use bytes as the restricted file destination's **File Content**. No Parse JSON/JSON Accept header. If the connector exposes `$content` as base64, use `base64ToBinary(body('HTTP')?['$content'])` only for that verified representation; don't double-decode raw bytes. Check timeout/payload/destination limits.
7. For transcripts `/content`, `Accept: text/vtt` returns timestamped WebVTT with speaker voice tags. If speaker attribution is disabled, request **`Accept: application/vnd.microsoft.graph.transcript+text`** for timestamped unattributed text. The latter is **Accept-only**, not `$format`.

The current docs state the unattributed transcript format and related admin controls take effect from end of July 2026. `SpeakerAttributionNotAllowed` permits only the unattributed format; **`GraphAccessToTranscriptsDisabled` blocks all formats** until an administrator re-enables access. Do not try to work around these controls.

Artifacts require recording/transcription to have been allowed and produced, an unexpired meeting, calendar association, and authorized user context. Live events and standalone onlineMeeting-created meetings without calendar events are excluded. Downloading recording content with delegated permissions normally requires the organizer; participant download depends on tenant admin controls. No blanket participant download promise is made.

For recurring downloads, store processed artifact IDs in approved private storage and deduplicate. This public cookbook contains no sample tenant recordings or transcripts.

### 7. CSV reports need a different path

The Teams activity recipe returns **302** to a short-lived preauthenticated URL, then **CSV bytes**. Inspect your HTTP action's redirect behavior. If it exposes Location rather than safely following, use an approved action to issue a separate **unauthenticated** GET to the trusted returned download URL. **Do not forward Graph credentials/Authorization to the report host.** Protect Location as a secret.

Save the returned CSV directly or use an approved parser that handles quoted commas, quotes and newlines. Don't split on commas or use Parse JSON. Reports have refresh lag and privacy/concealment settings; include report refresh date/period and don't treat them as live meeting telemetry. Delegated reports additionally require a suitable limited administrator role: see [report authorization](https://learn.microsoft.com/graph/reportroot-authorization).

### 8. Troubleshooting and production readiness

| Symptom | Check |
| --- | --- |
| 401 | Tenant/client/credential expiry, secret Value, Audience, Authority, cloud; team members has a documented new-tenant issue |
| 403 | Permission **type**, consent, user access/admin role, organizer-scoped access policy, transcript controls; do not blindly add broad privileges |
| 404 / empty result | Correct IDs, encoding, exact join URL, organizer context, calendar association, meeting expiry, artifact existence and cloud support |
| 429 | Wait `Retry-After`; bounded retries, no hot loop |
| 503 / 504 | Bounded exponential retries; notify owner after exhaustion |
| Parse JSON failure | Inspect Content-Type; HTML, VTT, CSV and media bytes are not JSON |
| CSV redirect | Protect Location and retrieve before expiry; don't leak Graph authorization to the download host |

Before enabling the schedule, verify all pages, intended columns, empty-result behavior, failure notifications, limited recipients, DLP, licensing, retention, secure run history and credential rotation. Secure Outputs can hide samples: diagnose with approved non-sensitive samples, then protect production. Error responses must not become success-shaped empty reports.

## Run locally and validate

The site is vanilla HTML/CSS/JavaScript with no CDN, telemetry, runtime dependencies or build framework. Open `index.html` directly in a current browser; clipboard access may be denied for local files, so the button selects the URL and tells you to copy manually. Hosting over HTTPS enables normal clipboard support.

Node.js **22+** is required only for development checks/build. Browser tests use Playwright Chromium.

```powershell
npm ci
npm test
npx playwright install chromium
npm run test:browser
npm run build
```

`npm test` checks recipe contracts, source links, read-only permissions, endpoint substitution/encoding, cloud filtering, response handling metadata and workflow YAML. Browser checks exercise real page filtering, disclosure panels, URL copies/manual fallback, deep links, theme/text size, keyboard access and mobile overflow. These checks do **not** execute Graph calls or prove your tenant has consent, licensing or data.

The build writes only `index.html`, `assets/` and `.nojekyll` to `_site/`; source/test files, node_modules and repository metadata are not published.

## GitHub Pages

The [Pages workflow](.github/workflows/pages.yml) validates pull requests and deploys pushes to `main` (or a manual run on `main`) with GitHub's official Pages actions. It requires no personal access token or tenant credential.

1. Publish the reviewed files to this repository's `main` branch.
2. In **Settings > Pages > Build and deployment**, choose **GitHub Actions**. Enable Actions if organizational policy allows it.
3. Run **Validate and deploy cookbook** or push a change to `main`. The deployment job uses the `github-pages` environment and minimal Pages/OIDC permissions.
4. After the workflow succeeds, open its environment URL: `https://mspfe2019.github.io/teams-admin-flow-cookbook/`.

Repository files/workflow do not alone enable Pages in repository settings. A prepared workflow is not an already published site. Pull requests run checks only; they cannot deploy. Branch protection/environment approval can require maintainer action.

## Accessibility and privacy

Native keyboard-operable disclosure panels, labelled controls, skip link, visible focus, live result/copy status, text-size control, light/dark themes, forced-colors support, reduced-motion and responsive layouts are included. This is not a formal accessibility certification.

No input is persisted in cookies/local storage, analytics, server requests or share links. The site never requests an app secret/access token. Treat any IDs/join URLs you enter as private: don't share screenshots or copied URLs publicly.

## Contributing

Keep recipes read-only and useful. Update `assets/recipes.js`, the README catalog and `docs/SOURCES.md` together. Review the official endpoint, exact permission route, output shape, pagination, clouds and policy/retention restrictions before adding a recipe; flag application-only/beta/metered behavior if ever applicable. Never include unreviewed write/delete operations, real tenant data or obsolete Teams metering claims. Run both checks and browser tests before proposing changes.

This community cookbook is educational, not a Microsoft-supported deployment, licensing determination or security/compliance assessment.
