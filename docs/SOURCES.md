# API source verification

Reviewed **2026-10-12** using Microsoft's official `microsoftgraph/microsoft-graph-docs-contrib` source at commit [`56602fde3f9889e14ac89916234200ab881feb33`](https://github.com/microsoftgraph/microsoft-graph-docs-contrib/tree/56602fde3f9889e14ac89916234200ab881feb33). The site's Microsoft Learn links point to the live v1.0 documentation. This review records documented behavior, not successful tenant API execution.

For each recipe, the API page's HTTP request, response, notes and national-cloud include were reviewed. Permission tables are separate includes unless embedded inline; reviewing just an API page's include directive would not verify its permissions.

Paths below are relative to `api-reference/v1.0/` in the official source. Recording/transcript list and content permissions are embedded directly in their API pages.

| Catalog ID | API source reviewed | Permission source reviewed | Important scope / output distinction |
| --- | --- | --- | --- |
| joined-teams | `api/user-list-joinedteams.md` | `includes/permissions/user-list-joinedteams-permissions.md` | `Team.ReadBasic.All`; direct joined teams, no unrestricted tenant inventory |
| team-settings | `api/team-get.md` | `includes/permissions/team-get-permissions.md` | RSC `TeamSettings.Read.Group`; basic minimum vs settings-focused `.Read.All` |
| channels | `api/channel-list.md` | `includes/permissions/channel-list-permissions.md` | RSC `ChannelSettings.Read.Group`; non-RSC `Channel.ReadBasic.All`; `$select` supported |
| team-members | `api/team-list-members.md` | `includes/permissions/team-list-members-permissions.md` | RSC `TeamMember.Read.Group`; non-RSC `TeamMember.Read.All`; opaque member IDs |
| channel-details | `api/channel-get.md` | `includes/permissions/channel-get-permissions.md` | Basic minimum vs settings-read; shared-channel federation access |
| channel-members | `api/channel-list-members.md` | `includes/permissions/channel-list-members-permissions.md` | Direct membership only; RSC vs tenant-wide read |
| installed-apps | `api/team-list-installedapps.md` | `includes/permissions/team-list-installedapps-permissions.md` | Supported `$expand`; installation ID is not app ID |
| meeting-lookup | `api/onlinemeeting-get.md` | `includes/permissions/onlinemeeting-get-permissions.md`, `includes/permissions/onlinemeeting-get-2-permissions.md` | Delegated `OnlineMeetings.Read`, application `OnlineMeetings.Read.All`; filtered join URL response is a collection |
| recordings | `api/onlinemeeting-list-recordings.md` | Inline permission table | Recording `.Read.All` / RSC `.Read.Chat`; scheduled calendar-associated unexpired meeting |
| recording-content | `api/callrecording-get.md` | Inline permission table | Bytes, not metadata JSON; delegated organizer/download controls |
| transcripts | `api/onlinemeeting-list-transcripts.md` | Inline permission table | `.Read.Chat` excludes channel meetings; tenant Graph access can be disabled |
| transcript-content | `api/calltranscript-get.md` | Inline permission table | WebVTT vs unattributed Accept-only text format; July 2026 admin-control changes |
| team-activity | `api/reportroot-getteamsteamactivitydetail.md` | `includes/permissions/reportroot-getteamsteamactivitydetail-permissions.md` | `Reports.Read.All`; delegated admin role; global-only; 302/preauthenticated CSV |

## Cross-cutting official references

| Reference | Why it matters |
| --- | --- |
| [Graph deployments](https://learn.microsoft.com/graph/deployments) (`concepts/deployments.md`) | GCC uses global hosts; GCC High and DoD have distinct Graph hosts; tokens aren't interchangeable |
| [Teams national-cloud differences](https://learn.microsoft.com/graph/teamwork-national-cloud-differences) (`concepts/teamwork-national-cloud-differences.md`) | Shared-channel APIs unsupported in US Government/China; general cloud checkmarks aren't enough |
| `api-reference/includes/global-us.md` | Global, L4 and L5 supported; China excluded for included installed-app/meeting APIs |
| [Application access policy](https://learn.microsoft.com/graph/cloud-communication-online-meeting-application-access-policy) (`concepts/cloud-communication-online-meeting-application-access-policy.md`) | Organizer/user assignment in addition to `.Read.All` consent; up to 30 minutes propagation |
| [Metered API list](https://learn.microsoft.com/graph/metered-api-list) (`concepts/metered-api-list.md`) | Explicit August 25, 2025 end of Teams API metering; no billing setup required |
| [RSC](https://learn.microsoft.com/microsoftteams/platform/graph-api/rsc/resource-specific-consent) | Team/chat-scoped application consent requires Teams app wiring, not ordinary Entra permission registration |
| [Report authorization](https://learn.microsoft.com/graph/reportroot-authorization) | Delegated report readers need an appropriate limited administrator role |

No beta-only or application-only API is needed by this selected catalog. Some **permission alternatives** are application-only (RSC), while `/me` routes are delegated-only. Settings APIs' documentation lists several broader compatibility permissions; the cookbook intentionally avoids read/write and legacy broad directory permissions.

Re-review this file and recipe notes when docs change, especially transcript formats/controls, cloud restrictions, RSC scopes, download roles, licensing or retention. Do not infer feature licensing from the existence of a Graph permission.
