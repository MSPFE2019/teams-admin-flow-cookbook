(function (root) {
  "use strict";
  const allClouds = ["global", "us", "dod", "china"];
  const meetingClouds = ["global", "us", "dod"];
  const policy = "Application route: tenant admin consent AND an application access policy assigned to the organizer are required. Policy changes can take up to 30 minutes. /me requires delegated sign-in; never use /me with client credentials.";
  const artifacts = "Use an existing, unexpired scheduled meeting associated with a calendar event, with recording/transcription actually enabled and produced. Standalone create-onlineMeeting meetings without a calendar event and live events are not supported by these artifact APIs. Retention, expiry, organizer licensing, and Teams policies affect availability.";
  const sensitive = "Meeting content is sensitive personal/organizational data. Obtain authorization, minimize downloads, protect run history and storage, and set retention. Graph read permission is not a compliance approval.";
  const channelCloud = "Shared-channel operations are not supported in US Government or China clouds, even where the endpoint's general cloud table says available.";
  const recipes = [
    {
      id: "joined-teams", title: "Find a user's joined teams", category: "Teams",
      summary: "Start small: inventory the teams one known user directly belongs to.",
      endpoint: "/users/{userId}/joinedTeams", delegatedEndpoint: "/me/joinedTeams",
      doc: "user-list-joinedteams", response: "collection", accept: "application/json",
      permissions: { delegated: "Team.ReadBasic.All", application: "Team.ReadBasic.All", rsc: null },
      clouds: allClouds, flags: ["Beginner-friendly"], parameters: { userId: "Entra user object ID (not a team ID)" },
      limitations: [
        "This is NOT a tenant-wide team inventory. It excludes host teams of shared channels accessed without direct team membership.",
        "No OData query options are supported. Only id, displayName, description, isArchived and tenantId are populated; other properties can be null.",
        "Use a known user's ID. /me is an optional delegated-only alternative; application flows must use /users/{userId}."
      ],
      steps: [
        "Create a scheduled flow and configure the shared authenticated HTTP GET foundation using Team.ReadBasic.All.",
        "Use HTTP -> Compose sample -> Parse JSON. Apply to each over body('Parse_JSON')?['value']; process any @odata.nextLink.",
        "Use Select to retain id, displayName, isArchived and tenantId. Store a restricted inventory report.",
        "Use returned team IDs in the team settings, channels or membership recipes. Each extra request needs its own documented permission."
      ]
    },
    {
      id: "team-settings", title: "Review team settings and archive status", category: "Teams",
      summary: "Review member, guest, messaging and fun settings without changing them.",
      endpoint: "/teams/{teamId}", doc: "team-get", response: "object", accept: "application/json",
      permissions: { delegated: "TeamSettings.Read.All (settings)", application: "TeamSettings.Read.All (settings)", rsc: "TeamSettings.Read.Group" },
      clouds: allClouds, flags: ["Admin scope", "RSC alternative"], parameters: { teamId: "Team ID (the team's Microsoft 365 group ID)" },
      limitations: [
        "The endpoint documentation lists Team.ReadBasic.All as the delegated minimum for basic properties. For this settings-focused report use TeamSettings.Read.All; do not assume basic access grants every settings property.",
        "Least-scoped application option is TeamSettings.Read.Group through a Teams app with resource-specific consent (RSC). TeamSettings.Read.All is the tenant-wide settings option, not the absolute least-scoped option.",
        "Delegated access depends on the signed-in user's access; Teams service admins can access teams they are not members of. This is team configuration, not a complete tenant Teams meeting-policy export."
      ],
      steps: [
        "Obtain one authorized team ID from the joined-teams recipe or an approved inventory; authorize a settings-read route.",
        "GET the team, sample with Compose, then Parse JSON as a single object. Do NOT loop over value.",
        "Select isArchived and approved fields from memberSettings, guestSettings and messagingSettings; allow absent/null properties.",
        "For multiple known teams, call this HTTP action inside the outer team's Apply to each and append one flattened row per team."
      ]
    },
    {
      id: "channels", title: "Inventory channels in a team", category: "Channels",
      summary: "List channel names and standard/private/shared membership types.",
      endpoint: "/teams/{teamId}/channels?$select=id,displayName,membershipType",
      doc: "channel-list", response: "collection", accept: "application/json",
      permissions: { delegated: "Channel.ReadBasic.All", application: "Channel.ReadBasic.All", rsc: "ChannelSettings.Read.Group" },
      clouds: allClouds, flags: ["Beginner-friendly", "RSC alternative"], parameters: { teamId: "Authorized team ID" },
      limitations: [
        "A team member cannot see private/shared channels they do not belong to. Teams service admins can access teams they are not members of; do not interpret a scoped result as a complete tenant inventory.",
        "ChannelSettings.Read.Group is the documented least-scoped application option via RSC. Channel.ReadBasic.All is the non-RSC basic-read alternative.",
        "The selected fields omit email, an expensive property. Follow @odata.nextLink for additional pages.", channelCloud
      ],
      steps: [
        "Start with a known team ID and authorize the selected read route; configure GET with the displayed $select URI.",
        "Sample, Parse JSON, and Apply to each over value. Follow each @odata.nextLink before reporting a count.",
        "Map id, displayName and membershipType into Select. Flag private/shared channels for an access review, not a permission change.",
        "Pass each channel ID into the channel details or direct membership recipe with its separate permissions."
      ]
    },
    {
      id: "team-members", title: "Review team membership and owners", category: "Membership",
      summary: "Find owners and members from the conversationMember roles array.",
      endpoint: "/teams/{teamId}/members", doc: "team-list-members", response: "collection", accept: "application/json",
      permissions: { delegated: "TeamMember.Read.All", application: "TeamMember.Read.All", rsc: "TeamMember.Read.Group" },
      clouds: allClouds, flags: ["Sensitive", "RSC alternative"], parameters: { teamId: "Authorized team ID" },
      limitations: [
        "TeamMember.Read.Group is the least-scoped application permission via RSC; TeamMember.Read.All is the non-RSC tenant-wide alternative.",
        "Membership IDs are opaque and are not user object IDs. Use userId separately; membership can include other tenants.",
        "A known issue can cause 401 for newly created tenants. Team membership is not private/shared channel membership; review those separately."
      ],
      steps: [
        "GET members and complete the JSON collection foundation and paging loop.",
        "Inside Apply to each retain userId, displayName, tenantId (if present) and roles; minimize email use.",
        "Filter array on contains(item()?['roles'], 'owner') to identify owners. An empty roles array generally represents a member.",
        "Count owners only after all pages; report low owner counts to authorized reviewers. Never add/remove owners from this flow."
      ]
    },
    {
      id: "channel-details", title: "Review channel details and settings", category: "Channels",
      summary: "Inspect one channel, including moderation settings when returned.",
      endpoint: "/teams/{teamId}/channels/{channelId}", doc: "channel-get", response: "object", accept: "application/json",
      permissions: { delegated: "ChannelSettings.Read.All (settings)", application: "ChannelSettings.Read.All (settings)", rsc: "ChannelSettings.Read.Group" },
      clouds: allClouds, flags: ["Admin scope", "RSC alternative"],
      parameters: { teamId: "Team ID", channelId: "Raw channel ID returned by list channels; encode once as a path segment" },
      limitations: [
        "Channel.ReadBasic.All is the documented minimum for basic properties. ChannelSettings.Read.All is appropriate for this settings-focused review; RSC ChannelSettings.Read.Group is the least-scoped application alternative.",
        "For federated shared channels, only a shared-channel member can retrieve channel information. Respect private/shared membership boundaries.",
        "summary is only returned when explicitly selected; this recipe does not request it. email and summary can be expensive. Channel settings are not tenant-wide Teams policies.", channelCloud
      ],
      steps: [
        "Read the team ID and raw channel ID from an authorized channel inventory; encode channelId with encodeUriComponent when building the URI in Power Automate.",
        "GET and Parse JSON as a single channel object, not a value collection.",
        "Select displayName, membershipType, isArchived and moderationSettings if present; handle optional/null properties.",
        "Compare approved configuration fields with your review baseline and report differences without writing changes."
      ]
    },
    {
      id: "channel-members", title: "Review direct channel members and owners", category: "Membership",
      summary: "Review access to standard, private and shared channels without expanding indirect membership.",
      endpoint: "/teams/{teamId}/channels/{channelId}/members", doc: "channel-list-members", response: "collection", accept: "application/json",
      permissions: { delegated: "ChannelMember.Read.All", application: "ChannelMember.Read.All", rsc: "ChannelMember.Read.Group" },
      clouds: allClouds, flags: ["Sensitive", "RSC alternative"],
      parameters: { teamId: "Team ID", channelId: "Raw channel ID; encode once" },
      limitations: [
        "ChannelMember.Read.Group is the least-scoped application option via RSC; ChannelMember.Read.All is the tenant-wide read alternative.",
        "This returns direct members only. Shared-channel indirect members require the separate allMembers API, which is not included here. Do not label this report 'all effective access'.",
        "Federated shared-channel access requires channel membership. Treat membership IDs as opaque and preserve tenant context.", channelCloud
      ],
      steps: [
        "Supply an authorized team/channel pair, GET members, sample and Parse JSON.",
        "Follow @odata.nextLink, then Apply to each over each page's value array.",
        "Map userId, displayName, roles and tenantId when present. Identify owners with contains(item()?['roles'], 'owner').",
        "Label the output 'direct channel members' and restrict recipients; do not infer indirect access or cross-tenant identities."
      ]
    },
    {
      id: "installed-apps", title: "Inventory apps installed in a team", category: "Apps",
      summary: "Review app identities and versions installed in one authorized team.",
      endpoint: "/teams/{teamId}/installedApps?$expand=teamsApp,teamsAppDefinition",
      doc: "team-list-installedapps", response: "collection", accept: "application/json",
      permissions: { delegated: "TeamsAppInstallation.ReadForTeam", application: "TeamsAppInstallation.ReadForTeam.All", rsc: "TeamsAppInstallation.Read.Group" },
      clouds: meetingClouds, flags: ["RSC alternative"], parameters: { teamId: "Authorized team ID" },
      limitations: [
        "TeamsAppInstallation.Read.Group is the documented least-scoped application option via RSC; TeamsAppInstallation.ReadForTeam.All is the non-RSC read alternative.",
        "An installation id is not a teamsApp id or an Entra client ID. Keep the identifiers separate.",
        "This is installed-app inventory, not a full tenant app-policy, permission-consent, or app-risk report. China is not supported."
      ],
      steps: [
        "GET installedApps with the supported expansion, sample and Parse JSON.",
        "Process every page's value array; expanded teamsApp and teamsAppDefinition objects can be absent/null.",
        "Select installation id, teamsApp.id, teamsApp.displayName and teamsAppDefinition.version when present.",
        "Compare with your approved-app list and send a review report; never uninstall or upgrade apps in this cookbook."
      ]
    },
    {
      id: "meeting-lookup", title: "Look up an online meeting by join URL", category: "Meetings",
      summary: "Resolve a known meeting join URL to its Graph onlineMeeting ID.",
      endpoint: "/users/{userId}/onlineMeetings?$filter=JoinWebUrl%20eq%20'{joinWebUrl}'",
      delegatedEndpoint: "/me/onlineMeetings?$filter=JoinWebUrl%20eq%20'{joinWebUrl}'",
      doc: "onlinemeeting-get", response: "collection", accept: "application/json",
      permissions: { delegated: "OnlineMeetings.Read", application: "OnlineMeetings.Read.All", rsc: null },
      clouds: meetingClouds, flags: ["Application access policy", "Sensitive"],
      parameters: { userId: "Organizer's Entra user object ID", joinWebUrl: "Raw, complete Teams join URL from an authorized calendar invite; do not pre-encode" },
      limitations: [
        policy,
        "This is a filtered lookup of a known meeting, not an unrestricted list of all meetings. Prefer the organizer context for the subsequent artifact chain.",
        "Use the returned onlineMeeting id, NOT the Outlook event ID, chat/thread ID, join URL or human joinMeetingId. The filtered response is a value array, even for one match.",
        "Escape single quotes in the OData string value by doubling them, then URL-encode the value once. Do not encode the entire Graph URI. China is not supported."
      ],
      steps: [
        "Use an existing approved meeting invite and organizer ID. Obtain OnlineMeetings.Read.All consent and the organizer's application access policy for an app-only scheduled flow.",
        "Replace the joinWebUrl placeholder with an OData-escaped, encodeUriComponent-encoded join URL. The catalog URL builder performs this escaping for you.",
        "GET, Compose a private JSON sample, Parse JSON, and inspect value. If empty, check the exact URL and user context; do not silently continue.",
        "Apply to each over value, retain id, and pass that ID and the same organizer ID into recordings/transcripts listing. Artifact permissions are separate from OnlineMeetings.Read.All."
      ]
    },
    {
      id: "recordings", title: "List meeting recordings", category: "Meetings",
      summary: "Inventory recording metadata before deciding whether a download is necessary.",
      endpoint: "/users/{userId}/onlineMeetings/{meetingId}/recordings",
      delegatedEndpoint: "/me/onlineMeetings/{meetingId}/recordings",
      doc: "onlinemeeting-list-recordings", response: "collection", accept: "application/json",
      permissions: { delegated: "OnlineMeetingRecording.Read.All", application: "OnlineMeetingRecording.Read.All", rsc: "OnlineMeetingRecording.Read.Chat" },
      clouds: meetingClouds, flags: ["Application access policy", "Sensitive", "Licensing / policies", "RSC alternative"],
      parameters: { userId: "Organizer's Entra user object ID", meetingId: "Graph onlineMeeting id from meeting lookup" },
      limitations: [
        policy, artifacts, sensitive,
        "The docs list OnlineMeetingRecording.Read.Chat as an RSC application alternative. It requires a Teams app and meeting-chat consent; do not grant it as a normal app-registration permission or assume consent covers unrelated meetings.",
        "Current v1.0 docs support meeting types except live events; do not repeat older blanket 'no channel meetings' claims. Verify invite context and national-cloud differences."
      ],
      steps: [
        "Resolve the onlineMeeting ID using the lookup recipe; keep the organizer context. Add recording-read authorization separately.",
        "GET recordings, sample and Parse JSON, then iterate each value record and any nextLink.",
        "Select id, createdDateTime and endDateTime. Keep the recording id for the content-download recipe.",
        "Record an empty result as no available recording, not as proof that a meeting was never recorded. Store processed IDs to avoid duplicate downloads on later runs."
      ]
    },
    {
      id: "recording-content", title: "Download a meeting recording", category: "Meetings",
      summary: "Retrieve a single recording as media bytes, not JSON.",
      endpoint: "/users/{userId}/onlineMeetings/{meetingId}/recordings/{recordingId}/content",
      delegatedEndpoint: "/me/onlineMeetings/{meetingId}/recordings/{recordingId}/content",
      doc: "callrecording-get", response: "binary", accept: null,
      permissions: { delegated: "OnlineMeetingRecording.Read.All", application: "OnlineMeetingRecording.Read.All", rsc: "OnlineMeetingRecording.Read.Chat" },
      clouds: meetingClouds, flags: ["Application access policy", "Sensitive", "Binary / media", "Licensing / policies"],
      parameters: { userId: "Organizer's Entra user object ID", meetingId: "Graph onlineMeeting id", recordingId: "Recording id from list recordings" },
      limitations: [
        policy, artifacts, sensitive,
        "Delegated content download is normally supported only for the organizer. Participant access depends on tenant admin download controls; do not promise download rights to everyone invited.",
        "OnlineMeetingRecording.Read.Chat is an RSC alternative requiring meeting-chat consent. It is not ordinary tenant-wide app consent.",
        "Response is a stream of recording bytes (for example video/mp4), not a value array. Large recordings can exceed HTTP action timeout, payload and destination connector limits; use approved large-file tooling when needed."
      ],
      steps: [
        "Start from a recording id returned by the list recipe; GET its documented /content path with the same authorization context.",
        "Do NOT add Parse JSON, a JSON Accept header, or an Apply to each around the media body.",
        "Pass HTTP Body directly to an approved restricted file destination's File Content input. If your action exposes a $content wrapper, use base64ToBinary(body('HTTP')?['$content']) only for that verified representation; never double-decode bytes.",
        "Verify Content-Type, file size and playback in restricted storage. Avoid emailing media or signed links; log artifact IDs/status only. Validate connector limits before enabling the schedule."
      ]
    },
    {
      id: "transcripts", title: "List meeting transcripts", category: "Meetings",
      summary: "Discover available transcript IDs and timestamps without downloading utterances.",
      endpoint: "/users/{userId}/onlineMeetings/{meetingId}/transcripts",
      delegatedEndpoint: "/me/onlineMeetings/{meetingId}/transcripts",
      doc: "onlinemeeting-list-transcripts", response: "collection", accept: "application/json",
      permissions: { delegated: "OnlineMeetingTranscript.Read.All", application: "OnlineMeetingTranscript.Read.All", rsc: "OnlineMeetingTranscript.Read.Chat" },
      clouds: meetingClouds, flags: ["Application access policy", "Sensitive", "Tenant transcript controls", "Licensing / policies"],
      parameters: { userId: "Organizer's Entra user object ID", meetingId: "Graph onlineMeeting id from meeting lookup" },
      limitations: [
        policy, artifacts, sensitive,
        "OnlineMeetingTranscript.Read.Chat uses RSC and supports scheduled private chat meetings ONLY, not channel meetings. For channel meetings use OnlineMeetingTranscript.Read.All with an application access policy.",
        "Tenant administrators can disable all Graph transcript access. 403 / GraphAccessToTranscriptsDisabled cannot be bypassed by changing request format or adding permissions.",
        "Current v1.0 docs support meeting types except live events. China is not supported; US Government implementation differs."
      ],
      steps: [
        "Resolve the meeting ID first and separately authorize transcript reads. Confirm Teams transcription and Graph transcript-access controls allow the report.",
        "GET transcripts, use the JSON collection foundation, and process every page's value array.",
        "Select id and createdDateTime; retain transcript id and the organizer/meeting IDs for content retrieval.",
        "Deduplicate by transcript id for recurring runs. Empty value means no available transcript, not proof no one transcribed; surface 403 failures to the flow owner."
      ]
    },
    {
      id: "transcript-content", title: "Download transcript text / WebVTT", category: "Meetings",
      summary: "Retrieve timestamped text, respecting tenant speaker-attribution controls.",
      endpoint: "/users/{userId}/onlineMeetings/{meetingId}/transcripts/{transcriptId}/content",
      delegatedEndpoint: "/me/onlineMeetings/{meetingId}/transcripts/{transcriptId}/content",
      doc: "calltranscript-get", response: "text", accept: "text/vtt",
      permissions: { delegated: "OnlineMeetingTranscript.Read.All", application: "OnlineMeetingTranscript.Read.All", rsc: "OnlineMeetingTranscript.Read.Chat" },
      clouds: meetingClouds, flags: ["Application access policy", "Sensitive", "VTT / text, not JSON", "Tenant transcript controls", "Licensing / policies"],
      parameters: { userId: "Organizer's Entra user object ID", meetingId: "Graph onlineMeeting id", transcriptId: "Transcript id from list transcripts" },
      limitations: [
        policy, artifacts, sensitive,
        "Read.Chat RSC is for scheduled private chat meetings only; channel meetings require OnlineMeetingTranscript.Read.All and an application access policy.",
        "Accept: text/vtt returns speaker-attributed WebVTT. If attribution is disabled, 403 / SpeakerAttributionNotAllowed requires the unattributed Accept: application/vnd.microsoft.graph.transcript+text format.",
        "The unattributed format is selected by Accept only, NOT $format. Tenant controls and this format take effect from end of July 2026 per current docs. GraphAccessToTranscriptsDisabled blocks both formats."
      ],
      steps: [
        "Use the transcript id returned by listing; GET /content with Accept: text/vtt, or the approved unattributed Accept format when required by tenant policy.",
        "Skip Compose JSON sampling and Parse JSON. The response is text with timestamps, not an object/array; do not render utterances as trusted HTML.",
        "Save HTTP Body as a restricted .vtt file for WebVTT, or a .txt file for the unattributed text format. Decode a binary/base64 wrapper only if that is the verified connector response representation.",
        "On SpeakerAttributionNotAllowed, explicitly request the allowed unattributed format. On GraphAccessToTranscriptsDisabled, stop and notify the owner; do not attempt a workaround."
      ]
    },
    {
      id: "team-activity", title: "Download the Teams team activity report", category: "Reports",
      summary: "Get a seven-day CSV summary of team activity, not live meeting telemetry.",
      endpoint: "/reports/getTeamsTeamActivityDetail(period='D7')",
      doc: "reportroot-getteamsteamactivitydetail", response: "csv", accept: null,
      permissions: { delegated: "Reports.Read.All", application: "Reports.Read.All", rsc: null },
      clouds: ["global"], flags: ["Commercial / GCC only", "CSV redirect", "Sensitive", "Admin role (delegated)"],
      parameters: {},
      limitations: [
        "Global endpoint only per the API cloud table; not available in GCC High, DoD or China. GCC uses global endpoints, but validate service/connector availability.",
        "Delegated access also requires an appropriate limited administrator role, such as Reports Reader, per report authorization documentation. Application access requires admin consent.",
        "The response is 302 to a short-lived preauthenticated download URL, then CSV bytes. It is NOT JSON. Treat Location as a secret; no Authorization header is needed on the download request.",
        "Use D7, D30, D90 or D180 (or the documented date variant). Reports are delayed, may conceal names/IDs under tenant privacy settings, and include licensed and nonlicensed users; not a live or complete meeting audit."
      ],
      steps: [
        "Create the scheduled authenticated Graph GET using Reports.Read.All, with no JSON Accept header. Leave the body empty.",
        "Inspect the HTTP action's actual redirect behavior: if it follows 302 safely, use returned CSV; otherwise use an approved action that exposes Location and issue a separate unauthenticated GET to the trusted returned download URL.",
        "Never forward the Graph bearer token/client credentials to the report host. Protect Location in run history and retrieve it immediately before it expires.",
        "Store the CSV body in restricted storage or parse with an approved CSV parser supporting quoted commas and newlines. Do NOT split on commas or use Parse JSON.",
        "Report refresh date and period alongside counts; validate name/ID concealment before joining with another inventory."
      ]
    }
  ];
  const data = {
    verified: "2026-10-12",
    sourceCommit: "56602fde3f9889e14ac89916234200ab881feb33",
    recipes,
    clouds: {
      global: { name: "Worldwide / GCC", graph: "https://graph.microsoft.com", authority: "https://login.microsoftonline.com" },
      us: { name: "GCC High (L4)", graph: "https://graph.microsoft.us", authority: "https://login.microsoftonline.us" },
      dod: { name: "DoD (L5)", graph: "https://dod-graph.microsoft.us", authority: "https://login.microsoftonline.us" },
      china: { name: "China / 21Vianet", graph: "https://microsoftgraph.chinacloudapi.cn", authority: "https://login.chinacloudapi.cn" }
    }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = data;
  else root.CookbookData = data;
})(typeof globalThis !== "undefined" ? globalThis : this);
