# ForgePilot API contract (Phase 1)

> Generated from `lib/mock/handlers.ts` and `lib/schemas`. Do not edit by hand —
> run `UPDATE_CONTRACT=1 pnpm test` to regenerate. `pnpm test` fails if this file is out of date.

Base URL: `/api/mock` today (set `NEXT_PUBLIC_API_BASE` to point the frontend at the real backend).
All bodies are JSON. Errors return `{ "error": string, "details"?: unknown }` with 400/401/403/404/409/422.
Auth: the mock session is the `fp_session` cookie (user id). The real backend should use the identity
provider of choice; the role rules below must be preserved.

Product rules the backend must enforce (not just the UI):

- Sign-off requires the latest verification `passed` **and** `reviewedDiff: true` (409 otherwise).
- `open_pr` only after sign-off. Nothing in this API merges: merge happens in the client's Git.
- Every state-changing action appends a hash-chained `EvidenceRecord` with the correct actor (person, agent or system).
- Portal users only ever see their own organization's data. Margin is only returned to `fp_manager`.

## Endpoints

| Method | Path | Auth | Request | Response | Summary |
| --- | --- | --- | --- | --- | --- |
| GET | `/session` | Any signed-in user | — | `Session` | Current mock session (user, organization) and the personas available in the role switcher. |
| GET | `/session/personas` | None | — | `User[]` | Personas for the mock sign-in screen. |
| POST | `/session` | None | `SwitchSessionInput` | `Session` | Switch mock session to another persona (sets the fp_session cookie). |
| GET | `/overview` | Client portal roles | — | `PortalOverview` | Portal overview: KPIs, 12-week health trend, needs-attention list, recent activity. |
| GET | `/activity` | Any signed-in user | — | `ActivityItem[]` | Recent evidence events across visible organizations. ?limit= |
| GET | `/applications` | Any signed-in user | — | `ApplicationSummary[]` | Applications visible to the user. Console may filter ?orgId= |
| GET | `/applications/:id` | Any signed-in user | — | `ApplicationDetail` | Application detail with health breakdown, history, repositories, findings and tasks. |
| GET | `/repositories` | Any signed-in user | — | `RepositorySummary[]` | Repositories visible to the user. ?orgId= ?applicationId= |
| GET | `/repositories/:id` | Any signed-in user | — | `RepositoryDetail` | Repository detail: health, findings, scans, flaky tests, tasks. |
| POST | `/repositories/:id/scans` | ForgePilot console roles | — | see below | Start a health scan (mock: completes after a few seconds with updated results). |
| GET | `/tasks` | Any signed-in user | — | `TaskListItem[]` | Tasks visible to the user. Filters: orgId, applicationId, repositoryId, type, state, assigneeUserId, agent, from, to, mine. |
| POST | `/tasks` | ForgePilot console roles | `NewTaskInput` | `TaskListItem` | Create a task (New task dialog). |
| GET | `/tasks/:id` | Any signed-in user | — | `TaskDetail` | Task detail: runs, verifications, PR, approvals, evidence (hash-chain checked). |
| GET | `/tasks/:id/log` | ForgePilot console roles | — | `LiveLog` | Live agent log for the latest run (mock stream: poll every ~1.5s). |
| GET | `/tasks/:id/diff` | Any signed-in user | — | `DiffFile[]` | Unified diff of the change (files with hunks). |
| POST | `/tasks/:id/actions` | ForgePilot console roles | `TaskActionInput` | `TaskDetail` | Engineer actions: save_plan, approve_plan, launch, stop, retry, take_over, sign_off, open_pr, escalate, close. Each writes an EvidenceRecord. |
| POST | `/tasks/:id/approval` | Client portal roles | `ApprovalInput` | `TaskDetail` | Client approves or requests changes on an open PR. Approvers/admins only. Appends an EvidenceRecord. |
| GET | `/approvals` | Client portal roles | — | `ApprovalQueueItem[]` | PRs waiting for client approval, oldest first, with risk and sign-off. |
| GET | `/evidence` | Any signed-in user | — | `EvidencePack[]` | Evidence packs (one per task with activity). Filters: applicationId, type, from, to, q. |
| GET | `/evidence/export` | Any signed-in user | — | see below | Export evidence packs as JSON. ?ids=pack_task_001,pack_task_002 |
| GET | `/reports/savings` | Any signed-in user | — | `SavingsReport` | Monthly savings report computed from delivered tasks. ?month=YYYY-MM (default: latest) ?orgId= (console) |
| GET | `/reports/sla` | Any signed-in user | — | `SlaReport` | SLA report: target vs actual per metric, breaches with reasons. ?orgId= (console) |
| GET | `/clients` | ForgePilot console roles | — | `ClientSummary[]` | Client list. Margin is only included for delivery managers. |
| GET | `/clients/:id` | ForgePilot console roles | — | `ClientDetail` | Client detail: contract, SLA, applications, contacts, recent tasks, integrations. |
| GET | `/ops` | fp_manager only | — | `OpsDashboard` | Ops dashboard KPIs and charts (delivery manager only). |
| GET | `/engineers` | ForgePilot console roles | — | `User[]` | ForgePilot engineers (for assignee pickers). |
| GET | `/team` | Client portal roles | — | `User[]` | Users in the client organization. |
| POST | `/team/invite` | Client portal roles | `InviteUserInput` | `User` | Invite a user to the client organization (client_admin only). |
| GET | `/integrations` | Any signed-in user | — | `IntegrationView[]` | Integration catalog merged with this organization's connections. ?orgId= (console) |
| POST | `/integrations/:providerId/connect` | Client portal roles | `ConnectIntegrationInput` | `IntegrationView` | Mock OAuth connect for an integration (client_admin only). |
| POST | `/integrations/:providerId/disconnect` | Client portal roles | — | `Ok` | Disconnect an integration (client_admin only). |
| GET | `/notifications` | Any signed-in user | — | `NotificationList` | Notifications for the current user's area (portal: their org). |
| POST | `/notifications/read` | Any signed-in user | see below | `Ok` | Mark notifications read. Body: { ids?: string[] } (omit for all). |
| GET | `/search` | Any signed-in user | — | `SearchResult[]` | Global search across clients, applications, repositories and tasks. ?q= |
| GET | `/onboarding/git-repos` | Client portal roles | — | `GitRepoCandidate[]` | Repositories visible after the mock Git OAuth connect. ?provider=&account= |
| POST | `/onboarding` | Client portal roles | `OnboardingInput` | `OnboardingResult` | Complete onboarding: create organization, contract, applications, repositories and start health scans. |
| GET | `/onboarding/:orgId/status` | Client portal roles | — | `OnboardingStatus` | Onboarding scan progress and, when done, the health report + 90-day plan. |
| POST | `/demo/reset` | Any signed-in user | — | `Ok` | Reset all mock data to the seed (demo mode). |

## Endpoint details

### GET `/session`

Current mock session (user, organization) and the personas available in the role switcher.

- **Auth:** Any signed-in user
- **Response 200:** [`Session`](#session)

### GET `/session/personas`

Personas for the mock sign-in screen.

- **Auth:** None
- **Response 200:** [`User[]`](#user)

### POST `/session`

Switch mock session to another persona (sets the fp_session cookie).

- **Auth:** None
- **Request body:** [`SwitchSessionInput`](#switchsessioninput)
- **Response 200:** [`Session`](#session)

### GET `/overview`

Portal overview: KPIs, 12-week health trend, needs-attention list, recent activity.

- **Auth:** Client portal roles
- **Response 200:** [`PortalOverview`](#portaloverview)

### GET `/activity`

Recent evidence events across visible organizations. ?limit=

- **Auth:** Any signed-in user
- **Response 200:** [`ActivityItem[]`](#activityitem)

### GET `/applications`

Applications visible to the user. Console may filter ?orgId=

- **Auth:** Any signed-in user
- **Response 200:** [`ApplicationSummary[]`](#applicationsummary)

### GET `/applications/:id`

Application detail with health breakdown, history, repositories, findings and tasks.

- **Auth:** Any signed-in user
- **Response 200:** [`ApplicationDetail`](#applicationdetail)

### GET `/repositories`

Repositories visible to the user. ?orgId= ?applicationId=

- **Auth:** Any signed-in user
- **Response 200:** [`RepositorySummary[]`](#repositorysummary)

### GET `/repositories/:id`

Repository detail: health, findings, scans, flaky tests, tasks.

- **Auth:** Any signed-in user
- **Response 200:** [`RepositoryDetail`](#repositorydetail)

### POST `/repositories/:id/scans`

Start a health scan (mock: completes after a few seconds with updated results).

- **Auth:** ForgePilot console roles
- **Response 200:** ```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "scanId": {
      "type": "string"
    }
  },
  "required": [
    "scanId"
  ],
  "additionalProperties": false
}
```

### GET `/tasks`

Tasks visible to the user. Filters: orgId, applicationId, repositoryId, type, state, assigneeUserId, agent, from, to, mine.

- **Auth:** Any signed-in user
- **Response 200:** [`TaskListItem[]`](#tasklistitem)

### POST `/tasks`

Create a task (New task dialog).

- **Auth:** ForgePilot console roles
- **Request body:** [`NewTaskInput`](#newtaskinput)
- **Response 200:** [`TaskListItem`](#tasklistitem)

### GET `/tasks/:id`

Task detail: runs, verifications, PR, approvals, evidence (hash-chain checked).

- **Auth:** Any signed-in user
- **Response 200:** [`TaskDetail`](#taskdetail)

### GET `/tasks/:id/log`

Live agent log for the latest run (mock stream: poll every ~1.5s).

- **Auth:** ForgePilot console roles
- **Response 200:** [`LiveLog`](#livelog)

### GET `/tasks/:id/diff`

Unified diff of the change (files with hunks).

- **Auth:** Any signed-in user
- **Response 200:** [`DiffFile[]`](#difffile)

### POST `/tasks/:id/actions`

Engineer actions: save_plan, approve_plan, launch, stop, retry, take_over, sign_off, open_pr, escalate, close. Each writes an EvidenceRecord.

- **Auth:** ForgePilot console roles
- **Request body:** [`TaskActionInput`](#taskactioninput)
- **Response 200:** [`TaskDetail`](#taskdetail)

### POST `/tasks/:id/approval`

Client approves or requests changes on an open PR. Approvers/admins only. Appends an EvidenceRecord.

- **Auth:** Client portal roles
- **Request body:** [`ApprovalInput`](#approvalinput)
- **Response 200:** [`TaskDetail`](#taskdetail)

### GET `/approvals`

PRs waiting for client approval, oldest first, with risk and sign-off.

- **Auth:** Client portal roles
- **Response 200:** [`ApprovalQueueItem[]`](#approvalqueueitem)

### GET `/evidence`

Evidence packs (one per task with activity). Filters: applicationId, type, from, to, q.

- **Auth:** Any signed-in user
- **Response 200:** [`EvidencePack[]`](#evidencepack)

### GET `/evidence/export`

Export evidence packs as JSON. ?ids=pack_task_001,pack_task_002

- **Auth:** Any signed-in user
- **Response 200:** ```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "exportedAt": {
      "type": "string"
    },
    "exportedBy": {
      "type": "string"
    },
    "packs": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "task": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string"
              },
              "repositoryId": {
                "type": "string"
              },
              "applicationId": {
                "type": "string"
              },
              "orgId": {
                "type": "string"
              },
              "type": {
                "type": "string",
                "enum": [
                  "dependency_upgrade",
                  "cve_patch",
                  "bug_fix",
                  "enhancement",
                  "test_coverage"
                ]
              },
              "title": {
                "type": "string"
              },
              "summary": {
                "type": "string"
              },
              "source": {
                "type": "object",
                "properties": {
                  "kind": {
                    "type": "string",
                    "enum": [
                      "ticket",
                      "scan",
                      "manual"
                    ]
                  },
                  "ref": {
                    "type": "string"
                  },
                  "url": {
                    "type": "string"
                  }
                },
                "required": [
                  "kind",
                  "ref"
                ],
                "additionalProperties": false
              },
              "state": {
                "type": "string",
                "enum": [
                  "created",
                  "planned",
                  "plan_approved",
                  "running",
                  "verifying",
                  "retrying",
                  "escalated",
                  "awaiting_review",
                  "signed_off",
                  "pr_open",
                  "client_approved",
                  "merged",
                  "closed",
                  "failed",
                  "rejected"
                ]
              },
              "priority": {
                "type": "string",
                "enum": [
                  "p0",
                  "p1",
                  "p2",
                  "p3"
                ]
              },
              "slaDueAt": {
                "type": "string",
                "format": "date-time",
                "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
              },
              "assigneeUserId": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "agent": {
                "type": "string",
                "enum": [
                  "claude_code",
                  "codex",
                  "devin"
                ]
              },
              "createdAt": {
                "type": "string",
                "format": "date-time",
                "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
              },
              "aiAuthoredPct": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
              },
              "plan": {
                "type": "object",
                "properties": {
                  "steps": {
                    "type": "array",
                    "items": {
                      "type": "string",
                      "minLength": 1
                    }
                  },
                  "acceptanceCriteria": {
                    "type": "array",
                    "items": {
                      "type": "string",
                      "minLength": 1
                    }
                  },
                  "approvedBy": {
                    "type": [
                      "string",
                      "null"
                    ]
                  }
                },
                "required": [
                  "steps",
                  "acceptanceCriteria",
                  "approvedBy"
                ],
                "additionalProperties": false
              },
              "estimatedHours": {
                "type": "number",
                "minimum": 0
              },
              "escalationReason": {
                "type": "string"
              },
              "manualTakeoverBy": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "applicationName": {
                "type": "string"
              },
              "organizationName": {
                "type": "string"
              },
              "repositoryName": {
                "type": "string"
              },
              "assignee": {
                "anyOf": [
                  {
                    "type": "object",
                    "properties": {
                      "id": {
                        "type": "string"
                      },
                      "name": {
                        "type": "string"
                      },
                      "email": {
                        "type": "string",
                        "format": "email",
                        "pattern": "^(?:[A-Za-z0-9_'+\\-]+\\.)*[A-Za-z0-9_'+\\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"
                      },
                      "role": {
                        "type": "string",
                        "enum": [
                          "client_admin",
                          "client_approver",
                          "client_viewer",
                          "fp_engineer",
                          "fp_manager"
                        ]
                      },
                      "orgId": {
                        "type": [
                          "string",
                          "null"
                        ]
                      },
                      "title": {
                        "type": "string"
                      },
                      "status": {
                        "default": "active",
                        "type": "string",
                        "enum": [
                          "active",
                          "invited"
                        ]
                      }
                    },
                    "required": [
                      "id",
                      "name",
                      "email",
                      "role",
                      "orgId",
                      "status"
                    ],
                    "additionalProperties": false
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "latestRun": {
                "anyOf": [
                  {
                    "type": "object",
                    "properties": {
                      "id": {
                        "type": "string"
                      },
                      "taskId": {
                        "type": "string"
                      },
                      "attempt": {
                        "type": "integer",
                        "exclusiveMinimum": 0,
                        "maximum": 9007199254740991
                      },
                      "agent": {
                        "type": "string",
                        "enum": [
                          "claude_code",
                          "codex",
                          "devin"
                        ]
                      },
                      "model": {
                        "type": "string"
                      },
                      "modelVersion": {
                        "type": "string"
                      },
                      "tokens": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      "costUsd": {
                        "type": "number",
                        "minimum": 0
                      },
                      "durationSec": {
                        "anyOf": [
                          {
                            "type": "number",
                            "minimum": 0
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "outcome": {
                        "type": "string",
                        "enum": [
                          "running",
                          "success",
                          "verification_failed",
                          "stopped",
                          "error"
                        ]
                      },
                      "startedAt": {
                        "type": "string",
                        "format": "date-time",
                        "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
                      },
                      "notes": {
                        "type": "string"
                      },
                      "simulatedEndsAt": {
                        "type": "number"
                      },
                      "simulateFailure": {
                        "type": "boolean"
                      }
                    },
                    "required": [
                      "id",
                      "taskId",
                      "attempt",
                      "agent",
                      "model",
                      "tokens",
                      "costUsd",
                      "durationSec",
                      "outcome",
                      "startedAt"
                    ],
                    "additionalProperties": false
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "latestVerification": {
                "anyOf": [
                  {
                    "type": "object",
                    "properties": {
                      "id": {
                        "type": "string"
                      },
                      "agentRunId": {
                        "type": "string"
                      },
                      "testsRun": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      "testsPassed": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      "testsFailed": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      "securityFindings": {
                        "type": "object",
                        "properties": {
                          "critical": {
                            "type": "integer",
                            "minimum": 0,
                            "maximum": 9007199254740991
                          },
                          "high": {
                            "type": "integer",
                            "minimum": 0,
                            "maximum": 9007199254740991
                          },
                          "medium": {
                            "type": "integer",
                            "minimum": 0,
                            "maximum": 9007199254740991
                          }
                        },
                        "required": [
                          "critical",
                          "high",
                          "medium"
                        ],
                        "additionalProperties": false
                      },
                      "riskScore": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 100
                      },
                      "status": {
                        "type": "string",
                        "enum": [
                          "running",
                          "passed",
                          "failed"
                        ]
                      },
                      "durationMin": {
                        "type": "number",
                        "minimum": 0
                      },
                      "startedAt": {
                        "type": "string",
                        "format": "date-time",
                        "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
                      },
                      "coveragePct": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 100
                      },
                      "testResults": {
                        "default": [],
                        "type": "array",
                        "items": {
                          "type": "object",
                          "properties": {
                            "name": {
                              "type": "string"
                            },
                            "suite": {
                              "type": "string"
                            },
                            "status": {
                              "type": "string",
                              "enum": [
                                "passed",
                                "failed",
                                "skipped"
                              ]
                            },
                            "durationMs": {
                              "type": "number",
                              "minimum": 0
                            },
                            "flaky": {
                              "default": false,
                              "type": "boolean"
                            }
                          },
                          "required": [
                            "name",
                            "suite",
                            "status",
                            "durationMs",
                            "flaky"
                          ],
                          "additionalProperties": false
                        }
                      },
                      "artifacts": {
                        "default": [],
                        "type": "array",
                        "items": {
                          "type": "object",
                          "properties": {
                            "kind": {
                              "type": "string",
                              "enum": [
                                "screenshot",
                                "log",
                                "sbom",
                                "report"
                              ]
                            },
                            "label": {
                              "type": "string"
                            },
                            "url": {
                              "type": "string"
                            }
                          },
                          "required": [
                            "kind",
                            "label",
                            "url"
                          ],
                          "additionalProperties": false
                        }
                      },
                      "scanners": {
                        "default": [],
                        "type": "array",
                        "items": {
                          "type": "string"
                        }
                      }
                    },
                    "required": [
                      "id",
                      "agentRunId",
                      "testsRun",
                      "testsPassed",
                      "testsFailed",
                      "securityFindings",
                      "riskScore",
                      "status",
                      "durationMin",
                      "testResults",
                      "artifacts",
                      "scanners"
                    ],
                    "additionalProperties": false
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "pullRequest": {
                "anyOf": [
                  {
                    "type": "object",
                    "properties": {
                      "id": {
                        "type": "string"
                      },
                      "taskId": {
                        "type": "string"
                      },
                      "number": {
                        "type": "integer",
                        "exclusiveMinimum": 0,
                        "maximum": 9007199254740991
                      },
                      "url": {
                        "type": "string",
                        "format": "uri"
                      },
                      "status": {
                        "type": "string",
                        "enum": [
                          "open",
                          "merged",
                          "closed"
                        ]
                      },
                      "aiAuthoredPct": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 100
                      },
                      "openedAt": {
                        "type": "string",
                        "format": "date-time",
                        "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
                      }
                    },
                    "required": [
                      "id",
                      "taskId",
                      "number",
                      "url",
                      "status",
                      "aiAuthoredPct",
                      "openedAt"
                    ],
                    "additionalProperties": false
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "slaRisk": {
                "type": "string",
                "enum": [
                  "ok",
                  "at_risk",
                  "breached",
                  "met",
                  "missed"
                ]
              },
              "lastEvent": {
                "anyOf": [
                  {
                    "type": "object",
                    "properties": {
                      "id": {
                        "type": "string"
                      },
                      "taskId": {
                        "type": "string"
                      },
                      "event": {
                        "type": "string",
                        "enum": [
                          "task_created",
                          "plan_updated",
                          "plan_approved",
                          "agent_run_started",
                          "agent_run_stopped",
                          "retry_requested",
                          "manual_takeover",
                          "verification_passed",
                          "verification_failed",
                          "escalated",
                          "engineer_signed_off",
                          "pr_opened",
                          "client_approved",
                          "client_requested_changes",
                          "merged",
                          "closed"
                        ]
                      },
                      "actor": {
                        "oneOf": [
                          {
                            "type": "object",
                            "properties": {
                              "type": {
                                "type": "string",
                                "const": "person"
                              },
                              "id": {
                                "type": "string"
                              }
                            },
                            "required": [
                              "type",
                              "id"
                            ],
                            "additionalProperties": false
                          },
                          {
                            "type": "object",
                            "properties": {
                              "type": {
                                "type": "string",
                                "const": "agent"
                              },
                              "id": {
                                "type": "string"
                              }
                            },
                            "required": [
                              "type",
                              "id"
                            ],
                            "additionalProperties": false
                          },
                          {
                            "type": "object",
                            "properties": {
                              "type": {
                                "type": "string",
                                "const": "system"
                              },
                              "id": {
                                "type": "string"
                              }
                            },
                            "required": [
                              "type",
                              "id"
                            ],
                            "additionalProperties": false
                          }
                        ]
                      },
                      "at": {
                        "type": "string",
                        "format": "date-time",
                        "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
                      },
                      "payload": {
                        "type": "object",
                        "propertyNames": {
                          "type": "string"
                        },
                        "additionalProperties": {}
                      },
                      "hash": {
                        "type": "string"
                      },
                      "prevHash": {
                        "type": [
                          "string",
                          "null"
                        ]
                      },
                      "actorResolved": {
                        "type": "object",
                        "properties": {
                          "type": {
                            "type": "string",
                            "enum": [
                              "person",
                              "agent",
                              "system"
                            ]
                          },
                          "id": {
                            "type": "string"
                          },
                          "name": {
                            "type": "string"
                          },
                          "detail": {
                            "type": "string"
                          }
                        },
                        "required": [
                          "type",
                          "id",
                          "name",
                          "detail"
                        ],
                        "additionalProperties": false
                      },
                      "hashValid": {
                        "type": "boolean"
                      }
                    },
                    "required": [
                      "id",
                      "taskId",
                      "event",
                      "actor",
                      "at",
                      "payload",
                      "hash",
                      "prevHash",
                      "actorResolved",
                      "hashValid"
                    ],
                    "additionalProperties": false
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "attempts": {
                "type": "integer",
                "minimum": -9007199254740991,
                "maximum": 9007199254740991
              }
            },
            "required": [
              "id",
              "repositoryId",
              "applicationId",
              "orgId",
              "type",
              "title",
              "summary",
              "source",
              "state",
              "priority",
              "slaDueAt",
              "assigneeUserId",
              "agent",
              "createdAt",
              "aiAuthoredPct",
              "plan",
              "estimatedHours",
              "applicationName",
              "organizationName",
              "repositoryName",
              "assignee",
              "latestRun",
              "latestVerification",
              "pullRequest",
              "slaRisk",
              "lastEvent",
              "attempts"
            ],
            "additionalProperties": false
          },
          "records": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string"
                },
                "taskId": {
                  "type": "string"
                },
                "event": {
                  "type": "string",
                  "enum": [
                    "task_created",
                    "plan_updated",
                    "plan_approved",
                    "agent_run_started",
                    "agent_run_stopped",
                    "retry_requested",
                    "manual_takeover",
                    "verification_passed",
                    "verification_failed",
                    "escalated",
                    "engineer_signed_off",
                    "pr_opened",
                    "client_approved",
                    "client_requested_changes",
                    "merged",
                    "closed"
                  ]
                },
                "actor": {
                  "oneOf": [
                    {
                      "type": "object",
                      "properties": {
                        "type": {
                          "type": "string",
                          "const": "person"
                        },
                        "id": {
                          "type": "string"
                        }
                      },
                      "required": [
                        "type",
                        "id"
                      ],
                      "additionalProperties": false
                    },
                    {
                      "type": "object",
                      "properties": {
                        "type": {
                          "type": "string",
                          "const": "agent"
                        },
                        "id": {
                          "type": "string"
                        }
                      },
                      "required": [
                        "type",
                        "id"
                      ],
                      "additionalProperties": false
                    },
                    {
                      "type": "object",
                      "properties": {
                        "type": {
                          "type": "string",
                          "const": "system"
                        },
                        "id": {
                          "type": "string"
                        }
                      },
                      "required": [
                        "type",
                        "id"
                      ],
                      "additionalProperties": false
                    }
                  ]
                },
                "at": {
                  "type": "string",
                  "format": "date-time",
                  "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
                },
                "payload": {
                  "type": "object",
                  "propertyNames": {
                    "type": "string"
                  },
                  "additionalProperties": {}
                },
                "hash": {
                  "type": "string"
                },
                "prevHash": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "actorResolved": {
                  "type": "object",
                  "properties": {
                    "type": {
                      "type": "string",
                      "enum": [
                        "person",
                        "agent",
                        "system"
                      ]
                    },
                    "id": {
                      "type": "string"
                    },
                    "name": {
                      "type": "string"
                    },
                    "detail": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "type",
                    "id",
                    "name",
                    "detail"
                  ],
                  "additionalProperties": false
                },
                "hashValid": {
                  "type": "boolean"
                }
              },
              "required": [
                "id",
                "taskId",
                "event",
                "actor",
                "at",
                "payload",
                "hash",
                "prevHash",
                "actorResolved",
                "hashValid"
              ],
              "additionalProperties": false
            }
          },
          "chainValid": {
            "type": "boolean"
          },
          "verification": {
            "anyOf": [
              {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string"
                  },
                  "agentRunId": {
                    "type": "string"
                  },
                  "testsRun": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  },
                  "testsPassed": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  },
                  "testsFailed": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  },
                  "securityFindings": {
                    "type": "object",
                    "properties": {
                      "critical": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      "high": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      },
                      "medium": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      }
                    },
                    "required": [
                      "critical",
                      "high",
                      "medium"
                    ],
                    "additionalProperties": false
                  },
                  "riskScore": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 100
                  },
                  "status": {
                    "type": "string",
                    "enum": [
                      "running",
                      "passed",
                      "failed"
                    ]
                  },
                  "durationMin": {
                    "type": "number",
                    "minimum": 0
                  },
                  "startedAt": {
                    "type": "string",
                    "format": "date-time",
                    "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
                  },
                  "coveragePct": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 100
                  },
                  "testResults": {
                    "default": [],
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "name": {
                          "type": "string"
                        },
                        "suite": {
                          "type": "string"
                        },
                        "status": {
                          "type": "string",
                          "enum": [
                            "passed",
                            "failed",
                            "skipped"
                          ]
                        },
                        "durationMs": {
                          "type": "number",
                          "minimum": 0
                        },
                        "flaky": {
                          "default": false,
                          "type": "boolean"
                        }
                      },
                      "required": [
                        "name",
                        "suite",
                        "status",
                        "durationMs",
                        "flaky"
                      ],
                      "additionalProperties": false
                    }
                  },
                  "artifacts": {
                    "default": [],
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "kind": {
                          "type": "string",
                          "enum": [
                            "screenshot",
                            "log",
                            "sbom",
                            "report"
                          ]
                        },
                        "label": {
                          "type": "string"
                        },
                        "url": {
                          "type": "string"
                        }
                      },
                      "required": [
                        "kind",
                        "label",
                        "url"
                      ],
                      "additionalProperties": false
                    }
                  },
                  "scanners": {
                    "default": [],
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                },
                "required": [
                  "id",
                  "agentRunId",
                  "testsRun",
                  "testsPassed",
                  "testsFailed",
                  "securityFindings",
                  "riskScore",
                  "status",
                  "durationMin",
                  "testResults",
                  "artifacts",
                  "scanners"
                ],
                "additionalProperties": false
              },
              {
                "type": "null"
              }
            ]
          },
          "agentLabel": {
            "type": "string"
          },
          "signOff": {
            "anyOf": [
              {
                "type": "object",
                "properties": {
                  "by": {
                    "type": "string"
                  },
                  "at": {
                    "type": "string"
                  }
                },
                "required": [
                  "by",
                  "at"
                ],
                "additionalProperties": false
              },
              {
                "type": "null"
              }
            ]
          },
          "clientApproval": {
            "anyOf": [
              {
                "type": "object",
                "properties": {
                  "by": {
                    "type": "string"
                  },
                  "at": {
                    "type": "string"
                  },
                  "decision": {
                    "type": "string"
                  }
                },
                "required": [
                  "by",
                  "at",
                  "decision"
                ],
                "additionalProperties": false
              },
              {
                "type": "null"
              }
            ]
          },
          "diffSummary": {
            "type": "object",
            "properties": {
              "files": {
                "type": "number"
              },
              "additions": {
                "type": "number"
              },
              "deletions": {
                "type": "number"
              }
            },
            "required": [
              "files",
              "additions",
              "deletions"
            ],
            "additionalProperties": false
          },
          "lastEventAt": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "task",
          "records",
          "chainValid",
          "verification",
          "agentLabel",
          "signOff",
          "clientApproval",
          "diffSummary",
          "lastEventAt"
        ],
        "additionalProperties": false
      }
    }
  },
  "required": [
    "exportedAt",
    "exportedBy",
    "packs"
  ],
  "additionalProperties": false
}
```

### GET `/reports/savings`

Monthly savings report computed from delivered tasks. ?month=YYYY-MM (default: latest) ?orgId= (console)

- **Auth:** Any signed-in user
- **Response 200:** [`SavingsReport`](#savingsreport)

### GET `/reports/sla`

SLA report: target vs actual per metric, breaches with reasons. ?orgId= (console)

- **Auth:** Any signed-in user
- **Response 200:** [`SlaReport`](#slareport)

### GET `/clients`

Client list. Margin is only included for delivery managers.

- **Auth:** ForgePilot console roles
- **Response 200:** [`ClientSummary[]`](#clientsummary)

### GET `/clients/:id`

Client detail: contract, SLA, applications, contacts, recent tasks, integrations.

- **Auth:** ForgePilot console roles
- **Response 200:** [`ClientDetail`](#clientdetail)

### GET `/ops`

Ops dashboard KPIs and charts (delivery manager only).

- **Auth:** fp_manager only
- **Response 200:** [`OpsDashboard`](#opsdashboard)

### GET `/engineers`

ForgePilot engineers (for assignee pickers).

- **Auth:** ForgePilot console roles
- **Response 200:** [`User[]`](#user)

### GET `/team`

Users in the client organization.

- **Auth:** Client portal roles
- **Response 200:** [`User[]`](#user)

### POST `/team/invite`

Invite a user to the client organization (client_admin only).

- **Auth:** Client portal roles
- **Request body:** [`InviteUserInput`](#inviteuserinput)
- **Response 200:** [`User`](#user)

### GET `/integrations`

Integration catalog merged with this organization's connections. ?orgId= (console)

- **Auth:** Any signed-in user
- **Response 200:** [`IntegrationView[]`](#integrationview)

### POST `/integrations/:providerId/connect`

Mock OAuth connect for an integration (client_admin only).

- **Auth:** Client portal roles
- **Request body:** [`ConnectIntegrationInput`](#connectintegrationinput)
- **Response 200:** [`IntegrationView`](#integrationview)

### POST `/integrations/:providerId/disconnect`

Disconnect an integration (client_admin only).

- **Auth:** Client portal roles
- **Response 200:** [`Ok`](#ok)

### GET `/notifications`

Notifications for the current user's area (portal: their org).

- **Auth:** Any signed-in user
- **Response 200:** [`NotificationList`](#notificationlist)

### POST `/notifications/read`

Mark notifications read. Body: { ids?: string[] } (omit for all).

- **Auth:** Any signed-in user
- **Request body:** ```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ids": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "additionalProperties": false
}
```
- **Response 200:** [`Ok`](#ok)

### GET `/search`

Global search across clients, applications, repositories and tasks. ?q=

- **Auth:** Any signed-in user
- **Response 200:** [`SearchResult[]`](#searchresult)

### GET `/onboarding/git-repos`

Repositories visible after the mock Git OAuth connect. ?provider=&account=

- **Auth:** Client portal roles
- **Response 200:** [`GitRepoCandidate[]`](#gitrepocandidate)

### POST `/onboarding`

Complete onboarding: create organization, contract, applications, repositories and start health scans.

- **Auth:** Client portal roles
- **Request body:** [`OnboardingInput`](#onboardinginput)
- **Response 200:** [`OnboardingResult`](#onboardingresult)

### GET `/onboarding/:orgId/status`

Onboarding scan progress and, when done, the health report + 90-day plan.

- **Auth:** Client portal roles
- **Response 200:** [`OnboardingStatus`](#onboardingstatus)

### POST `/demo/reset`

Reset all mock data to the seed (demo mode).

- **Auth:** Any signed-in user
- **Response 200:** [`Ok`](#ok)

## Schemas

`$ref`s point at other schemas in this section.

### ActivityItem

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/ActivityItem",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "taskId": {
      "type": "string"
    },
    "event": {
      "$ref": "#/schemas/EvidenceEvent"
    },
    "actor": {
      "$ref": "#/schemas/Actor"
    },
    "at": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
    },
    "payload": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {}
    },
    "hash": {
      "type": "string"
    },
    "prevHash": {
      "type": [
        "string",
        "null"
      ]
    },
    "actorResolved": {
      "$ref": "#/schemas/ResolvedActor"
    },
    "hashValid": {
      "type": "boolean"
    },
    "taskTitle": {
      "type": "string"
    },
    "applicationName": {
      "type": "string"
    },
    "href": {
      "type": "string"
    }
  },
  "required": [
    "id",
    "taskId",
    "event",
    "actor",
    "at",
    "payload",
    "hash",
    "prevHash",
    "actorResolved",
    "hashValid",
    "taskTitle",
    "applicationName",
    "href"
  ],
  "additionalProperties": false
}
```

### Actor

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/Actor",
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "const": "person"
        },
        "id": {
          "type": "string"
        }
      },
      "required": [
        "type",
        "id"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "const": "agent"
        },
        "id": {
          "type": "string"
        }
      },
      "required": [
        "type",
        "id"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "const": "system"
        },
        "id": {
          "type": "string"
        }
      },
      "required": [
        "type",
        "id"
      ],
      "additionalProperties": false
    }
  ]
}
```

### AgentKind

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/AgentKind",
  "type": "string",
  "enum": [
    "claude_code",
    "codex",
    "devin"
  ]
}
```

### AgentRun

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/AgentRun",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "taskId": {
      "type": "string"
    },
    "attempt": {
      "type": "integer",
      "exclusiveMinimum": 0,
      "maximum": 9007199254740991
    },
    "agent": {
      "$ref": "#/schemas/AgentKind"
    },
    "model": {
      "type": "string"
    },
    "modelVersion": {
      "type": "string"
    },
    "tokens": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "costUsd": {
      "type": "number",
      "minimum": 0
    },
    "durationSec": {
      "anyOf": [
        {
          "type": "number",
          "minimum": 0
        },
        {
          "type": "null"
        }
      ]
    },
    "outcome": {
      "type": "string",
      "enum": [
        "running",
        "success",
        "verification_failed",
        "stopped",
        "error"
      ]
    },
    "startedAt": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
    },
    "notes": {
      "type": "string"
    },
    "simulatedEndsAt": {
      "type": "number"
    },
    "simulateFailure": {
      "type": "boolean"
    }
  },
  "required": [
    "id",
    "taskId",
    "attempt",
    "agent",
    "model",
    "tokens",
    "costUsd",
    "durationSec",
    "outcome",
    "startedAt"
  ],
  "additionalProperties": false
}
```

### Application

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/Application",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "orgId": {
      "type": "string"
    },
    "name": {
      "type": "string"
    },
    "criticality": {
      "$ref": "#/schemas/Criticality"
    },
    "environments": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "ownerUserIds": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "description": {
      "type": "string"
    },
    "tier": {
      "$ref": "#/schemas/Tier"
    }
  },
  "required": [
    "id",
    "orgId",
    "name",
    "criticality",
    "environments",
    "ownerUserIds"
  ],
  "additionalProperties": false
}
```

### ApplicationDetail

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/ApplicationDetail",
  "type": "object",
  "properties": {
    "application": {
      "$ref": "#/schemas/ApplicationSummary"
    },
    "organization": {
      "$ref": "#/schemas/Organization"
    },
    "owners": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/User"
      }
    },
    "health": {
      "$ref": "#/schemas/HealthBreakdown"
    },
    "history": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/HealthSnapshot"
      }
    },
    "repositories": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/Repository"
      }
    },
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "repositoryId": {
            "type": "string"
          },
          "dimension": {
            "$ref": "#/schemas/HealthDimension"
          },
          "severity": {
            "$ref": "#/schemas/Severity"
          },
          "title": {
            "type": "string"
          },
          "recommendation": {
            "type": "string"
          },
          "status": {
            "type": "string",
            "enum": [
              "open",
              "in_progress",
              "resolved"
            ]
          },
          "detectedAt": {
            "type": "string",
            "format": "date-time",
            "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
          },
          "repositoryName": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "repositoryId",
          "dimension",
          "severity",
          "title",
          "recommendation",
          "status",
          "detectedAt",
          "repositoryName"
        ],
        "additionalProperties": false
      }
    },
    "tasks": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/TaskListItem"
      }
    }
  },
  "required": [
    "application",
    "organization",
    "owners",
    "health",
    "history",
    "repositories",
    "findings",
    "tasks"
  ],
  "additionalProperties": false
}
```

### ApplicationSummary

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/ApplicationSummary",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "orgId": {
      "type": "string"
    },
    "name": {
      "type": "string"
    },
    "criticality": {
      "$ref": "#/schemas/Criticality"
    },
    "environments": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "ownerUserIds": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "description": {
      "type": "string"
    },
    "tier": {
      "$ref": "#/schemas/Tier"
    },
    "organizationName": {
      "type": "string"
    },
    "repoCount": {
      "type": "integer",
      "minimum": -9007199254740991,
      "maximum": 9007199254740991
    },
    "healthScore": {
      "type": "number"
    },
    "healthDelta": {
      "type": "number"
    },
    "openTasks": {
      "type": "integer",
      "minimum": -9007199254740991,
      "maximum": 9007199254740991
    },
    "slaStatus": {
      "$ref": "#/schemas/SlaStatus"
    },
    "languages": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/Language"
      }
    }
  },
  "required": [
    "id",
    "orgId",
    "name",
    "criticality",
    "environments",
    "ownerUserIds",
    "organizationName",
    "repoCount",
    "healthScore",
    "healthDelta",
    "openTasks",
    "slaStatus",
    "languages"
  ],
  "additionalProperties": false
}
```

### ApprovalInput

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/ApprovalInput",
  "type": "object",
  "properties": {
    "decision": {
      "type": "string",
      "enum": [
        "approved",
        "changes_requested"
      ]
    },
    "comment": {
      "default": "",
      "type": "string"
    }
  },
  "required": [
    "decision",
    "comment"
  ],
  "additionalProperties": false
}
```

### ApprovalQueueItem

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/ApprovalQueueItem",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "repositoryId": {
      "type": "string"
    },
    "applicationId": {
      "type": "string"
    },
    "orgId": {
      "type": "string"
    },
    "type": {
      "$ref": "#/schemas/TaskType"
    },
    "title": {
      "type": "string"
    },
    "summary": {
      "type": "string"
    },
    "source": {
      "type": "object",
      "properties": {
        "kind": {
          "type": "string",
          "enum": [
            "ticket",
            "scan",
            "manual"
          ]
        },
        "ref": {
          "type": "string"
        },
        "url": {
          "type": "string"
        }
      },
      "required": [
        "kind",
        "ref"
      ],
      "additionalProperties": false
    },
    "state": {
      "$ref": "#/schemas/TaskState"
    },
    "priority": {
      "$ref": "#/schemas/Priority"
    },
    "slaDueAt": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
    },
    "assigneeUserId": {
      "type": [
        "string",
        "null"
      ]
    },
    "agent": {
      "$ref": "#/schemas/AgentKind"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
    },
    "aiAuthoredPct": {
      "type": "number",
      "minimum": 0,
      "maximum": 100
    },
    "plan": {
      "$ref": "#/schemas/Plan"
    },
    "estimatedHours": {
      "type": "number",
      "minimum": 0
    },
    "escalationReason": {
      "type": "string"
    },
    "manualTakeoverBy": {
      "type": [
        "string",
        "null"
      ]
    },
    "applicationName": {
      "type": "string"
    },
    "organizationName": {
      "type": "string"
    },
    "repositoryName": {
      "type": "string"
    },
    "assignee": {
      "anyOf": [
        {
          "$ref": "#/schemas/User"
        },
        {
          "type": "null"
        }
      ]
    },
    "latestRun": {
      "anyOf": [
        {
          "$ref": "#/schemas/AgentRun"
        },
        {
          "type": "null"
        }
      ]
    },
    "latestVerification": {
      "anyOf": [
        {
          "$ref": "#/schemas/VerificationRun"
        },
        {
          "type": "null"
        }
      ]
    },
    "pullRequest": {
      "anyOf": [
        {
          "$ref": "#/schemas/PullRequest"
        },
        {
          "type": "null"
        }
      ]
    },
    "slaRisk": {
      "$ref": "#/schemas/TaskSlaRisk"
    },
    "lastEvent": {
      "anyOf": [
        {
          "$ref": "#/schemas/EvidenceItem"
        },
        {
          "type": "null"
        }
      ]
    },
    "attempts": {
      "type": "integer",
      "minimum": -9007199254740991,
      "maximum": 9007199254740991
    },
    "waitingHours": {
      "type": "number"
    },
    "signOff": {
      "anyOf": [
        {
          "type": "object",
          "properties": {
            "by": {
              "type": "string"
            },
            "at": {
              "type": "string"
            }
          },
          "required": [
            "by",
            "at"
          ],
          "additionalProperties": false
        },
        {
          "type": "null"
        }
      ]
    },
    "highRisk": {
      "type": "boolean"
    }
  },
  "required": [
    "id",
    "repositoryId",
    "applicationId",
    "orgId",
    "type",
    "title",
    "summary",
    "source",
    "state",
    "priority",
    "slaDueAt",
    "assigneeUserId",
    "agent",
    "createdAt",
    "aiAuthoredPct",
    "plan",
    "estimatedHours",
    "applicationName",
    "organizationName",
    "repositoryName",
    "assignee",
    "latestRun",
    "latestVerification",
    "pullRequest",
    "slaRisk",
    "lastEvent",
    "attempts",
    "waitingHours",
    "signOff",
    "highRisk"
  ],
  "additionalProperties": false
}
```

### AttentionItem

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/AttentionItem",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "kind": {
      "type": "string",
      "enum": [
        "approval",
        "sla_risk",
        "critical_cve",
        "escalation",
        "integration_error"
      ]
    },
    "title": {
      "type": "string"
    },
    "detail": {
      "type": "string"
    },
    "href": {
      "type": "string"
    },
    "severity": {
      "type": "string",
      "enum": [
        "danger",
        "warning",
        "info"
      ]
    }
  },
  "required": [
    "id",
    "kind",
    "title",
    "detail",
    "href",
    "severity"
  ],
  "additionalProperties": false
}
```

### ClientDetail

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/ClientDetail",
  "type": "object",
  "properties": {
    "client": {
      "$ref": "#/schemas/ClientSummary"
    },
    "contract": {
      "anyOf": [
        {
          "$ref": "#/schemas/Contract"
        },
        {
          "type": "null"
        }
      ]
    },
    "applications": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/ApplicationSummary"
      }
    },
    "contacts": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/User"
      }
    },
    "tasks": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/TaskListItem"
      }
    },
    "integrations": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/Integration"
      }
    }
  },
  "required": [
    "client",
    "contract",
    "applications",
    "contacts",
    "tasks",
    "integrations"
  ],
  "additionalProperties": false
}
```

### ClientSummary

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/ClientSummary",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "name": {
      "type": "string"
    },
    "industry": {
      "type": "string"
    },
    "region": {
      "type": "string"
    },
    "tier": {
      "$ref": "#/schemas/Tier"
    },
    "headquarters": {
      "type": "string"
    },
    "domain": {
      "type": "string"
    },
    "onboardedAt": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
    },
    "status": {
      "default": "active",
      "type": "string",
      "enum": [
        "active",
        "onboarding",
        "paused"
      ]
    },
    "applications": {
      "type": "number"
    },
    "arrUsd": {
      "type": "number"
    },
    "slaMetPct": {
      "type": "number"
    },
    "slaStatus": {
      "$ref": "#/schemas/SlaStatus"
    },
    "openTasks": {
      "type": "number"
    },
    "marginPct": {
      "type": [
        "number",
        "null"
      ]
    },
    "avgHealth": {
      "type": "number"
    }
  },
  "required": [
    "id",
    "name",
    "industry",
    "region",
    "tier",
    "status",
    "applications",
    "arrUsd",
    "slaMetPct",
    "slaStatus",
    "openTasks",
    "marginPct",
    "avgHealth"
  ],
  "additionalProperties": false
}
```

### ConnectIntegrationInput

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/ConnectIntegrationInput",
  "type": "object",
  "properties": {
    "account": {
      "type": "string",
      "minLength": 2
    }
  },
  "required": [
    "account"
  ],
  "additionalProperties": false
}
```

### Contract

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/Contract",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "orgId": {
      "type": "string"
    },
    "tier": {
      "$ref": "#/schemas/Tier"
    },
    "pricePerAppMonthlyUsd": {
      "type": "number",
      "minimum": 0
    },
    "priorVendorHourlyRateUsd": {
      "type": "number",
      "minimum": 0
    },
    "priorVendorBaselineHoursPerAppMonthly": {
      "default": 0,
      "type": "number",
      "minimum": 0
    },
    "slaTargets": {
      "$ref": "#/schemas/SlaTargets"
    },
    "startDate": {
      "type": "string",
      "format": "date",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$"
    },
    "endDate": {
      "type": "string",
      "format": "date",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$"
    }
  },
  "required": [
    "id",
    "orgId",
    "tier",
    "pricePerAppMonthlyUsd",
    "priorVendorHourlyRateUsd",
    "priorVendorBaselineHoursPerAppMonthly",
    "slaTargets",
    "startDate",
    "endDate"
  ],
  "additionalProperties": false
}
```

### Criticality

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/Criticality",
  "type": "string",
  "enum": [
    "critical",
    "high",
    "medium",
    "low"
  ]
}
```

### DiffFile

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/DiffFile",
  "type": "object",
  "properties": {
    "path": {
      "type": "string"
    },
    "status": {
      "type": "string",
      "enum": [
        "modified",
        "added",
        "deleted"
      ]
    },
    "additions": {
      "type": "integer",
      "minimum": -9007199254740991,
      "maximum": 9007199254740991
    },
    "deletions": {
      "type": "integer",
      "minimum": -9007199254740991,
      "maximum": 9007199254740991
    },
    "aiAuthored": {
      "type": "boolean"
    },
    "lines": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/DiffLine"
      }
    }
  },
  "required": [
    "path",
    "status",
    "additions",
    "deletions",
    "aiAuthored",
    "lines"
  ],
  "additionalProperties": false
}
```

### DiffLine

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/DiffLine",
  "type": "object",
  "properties": {
    "kind": {
      "type": "string",
      "enum": [
        "context",
        "add",
        "del",
        "hunk"
      ]
    },
    "oldNo": {
      "type": [
        "number",
        "null"
      ]
    },
    "newNo": {
      "type": [
        "number",
        "null"
      ]
    },
    "text": {
      "type": "string"
    }
  },
  "required": [
    "kind",
    "oldNo",
    "newNo",
    "text"
  ],
  "additionalProperties": false
}
```

### EvidenceEvent

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/EvidenceEvent",
  "type": "string",
  "enum": [
    "task_created",
    "plan_updated",
    "plan_approved",
    "agent_run_started",
    "agent_run_stopped",
    "retry_requested",
    "manual_takeover",
    "verification_passed",
    "verification_failed",
    "escalated",
    "engineer_signed_off",
    "pr_opened",
    "client_approved",
    "client_requested_changes",
    "merged",
    "closed"
  ]
}
```

### EvidenceItem

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/EvidenceItem",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "taskId": {
      "type": "string"
    },
    "event": {
      "$ref": "#/schemas/EvidenceEvent"
    },
    "actor": {
      "$ref": "#/schemas/Actor"
    },
    "at": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
    },
    "payload": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {}
    },
    "hash": {
      "type": "string"
    },
    "prevHash": {
      "type": [
        "string",
        "null"
      ]
    },
    "actorResolved": {
      "$ref": "#/schemas/ResolvedActor"
    },
    "hashValid": {
      "type": "boolean"
    }
  },
  "required": [
    "id",
    "taskId",
    "event",
    "actor",
    "at",
    "payload",
    "hash",
    "prevHash",
    "actorResolved",
    "hashValid"
  ],
  "additionalProperties": false
}
```

### EvidencePack

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/EvidencePack",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "task": {
      "$ref": "#/schemas/TaskListItem"
    },
    "records": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/EvidenceItem"
      }
    },
    "chainValid": {
      "type": "boolean"
    },
    "verification": {
      "anyOf": [
        {
          "$ref": "#/schemas/VerificationRun"
        },
        {
          "type": "null"
        }
      ]
    },
    "agentLabel": {
      "type": "string"
    },
    "signOff": {
      "anyOf": [
        {
          "type": "object",
          "properties": {
            "by": {
              "type": "string"
            },
            "at": {
              "type": "string"
            }
          },
          "required": [
            "by",
            "at"
          ],
          "additionalProperties": false
        },
        {
          "type": "null"
        }
      ]
    },
    "clientApproval": {
      "anyOf": [
        {
          "type": "object",
          "properties": {
            "by": {
              "type": "string"
            },
            "at": {
              "type": "string"
            },
            "decision": {
              "type": "string"
            }
          },
          "required": [
            "by",
            "at",
            "decision"
          ],
          "additionalProperties": false
        },
        {
          "type": "null"
        }
      ]
    },
    "diffSummary": {
      "type": "object",
      "properties": {
        "files": {
          "type": "number"
        },
        "additions": {
          "type": "number"
        },
        "deletions": {
          "type": "number"
        }
      },
      "required": [
        "files",
        "additions",
        "deletions"
      ],
      "additionalProperties": false
    },
    "lastEventAt": {
      "type": "string"
    }
  },
  "required": [
    "id",
    "task",
    "records",
    "chainValid",
    "verification",
    "agentLabel",
    "signOff",
    "clientApproval",
    "diffSummary",
    "lastEventAt"
  ],
  "additionalProperties": false
}
```

### Finding

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/Finding",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "repositoryId": {
      "type": "string"
    },
    "dimension": {
      "$ref": "#/schemas/HealthDimension"
    },
    "severity": {
      "$ref": "#/schemas/Severity"
    },
    "title": {
      "type": "string"
    },
    "recommendation": {
      "type": "string"
    },
    "status": {
      "type": "string",
      "enum": [
        "open",
        "in_progress",
        "resolved"
      ]
    },
    "detectedAt": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
    }
  },
  "required": [
    "id",
    "repositoryId",
    "dimension",
    "severity",
    "title",
    "recommendation",
    "status",
    "detectedAt"
  ],
  "additionalProperties": false
}
```

### GitProvider

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/GitProvider",
  "type": "string",
  "enum": [
    "github",
    "gitlab",
    "bitbucket",
    "azure_devops"
  ]
}
```

### GitRepoCandidate

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/GitRepoCandidate",
  "type": "object",
  "properties": {
    "fullName": {
      "type": "string"
    },
    "language": {
      "$ref": "#/schemas/Language"
    },
    "defaultBranch": {
      "type": "string"
    },
    "private": {
      "type": "boolean"
    },
    "lastPushAt": {
      "type": "string"
    }
  },
  "required": [
    "fullName",
    "language",
    "defaultBranch",
    "private",
    "lastPushAt"
  ],
  "additionalProperties": false
}
```

### HealthBreakdown

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/HealthBreakdown",
  "type": "object",
  "properties": {
    "score": {
      "type": "number",
      "minimum": 0,
      "maximum": 100
    },
    "dependencies": {
      "type": "number",
      "minimum": 0,
      "maximum": 100
    },
    "security": {
      "type": "number",
      "minimum": 0,
      "maximum": 100
    },
    "buildStability": {
      "type": "number",
      "minimum": 0,
      "maximum": 100
    },
    "tests": {
      "type": "number",
      "minimum": 0,
      "maximum": 100
    },
    "docs": {
      "type": "number",
      "minimum": 0,
      "maximum": 100
    }
  },
  "required": [
    "score",
    "dependencies",
    "security",
    "buildStability",
    "tests",
    "docs"
  ],
  "additionalProperties": false
}
```

### HealthDimension

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/HealthDimension",
  "type": "string",
  "enum": [
    "dependencies",
    "security",
    "buildStability",
    "tests",
    "docs"
  ]
}
```

### HealthSnapshot

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/HealthSnapshot",
  "type": "object",
  "properties": {
    "applicationId": {
      "type": "string"
    },
    "weekStart": {
      "type": "string",
      "format": "date",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$"
    },
    "score": {
      "type": "number",
      "minimum": 0,
      "maximum": 100
    }
  },
  "required": [
    "applicationId",
    "weekStart",
    "score"
  ],
  "additionalProperties": false
}
```

### Integration

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/Integration",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "orgId": {
      "type": "string"
    },
    "providerId": {
      "type": "string"
    },
    "status": {
      "type": "string",
      "enum": [
        "connected",
        "disconnected",
        "error"
      ]
    },
    "account": {
      "type": "string"
    },
    "connectedAt": {
      "anyOf": [
        {
          "type": "string",
          "format": "date-time",
          "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
        },
        {
          "type": "null"
        }
      ]
    },
    "scopes": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "error": {
      "type": "string"
    }
  },
  "required": [
    "id",
    "orgId",
    "providerId",
    "status",
    "account",
    "connectedAt",
    "scopes"
  ],
  "additionalProperties": false
}
```

### IntegrationCategory

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/IntegrationCategory",
  "type": "string",
  "enum": [
    "source_control",
    "work_intake",
    "notifications",
    "security",
    "identity",
    "observability",
    "agents"
  ]
}
```

### IntegrationView

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/IntegrationView",
  "type": "object",
  "properties": {
    "providerId": {
      "type": "string"
    },
    "name": {
      "type": "string"
    },
    "category": {
      "$ref": "#/schemas/IntegrationCategory"
    },
    "description": {
      "type": "string"
    },
    "availability": {
      "type": "string",
      "enum": [
        "available",
        "phase_2",
        "phase_3"
      ]
    },
    "scopes": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "connection": {
      "anyOf": [
        {
          "$ref": "#/schemas/Integration"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "providerId",
    "name",
    "category",
    "description",
    "availability",
    "scopes",
    "connection"
  ],
  "additionalProperties": false
}
```

### InviteUserInput

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/InviteUserInput",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 2
    },
    "email": {
      "type": "string",
      "format": "email",
      "pattern": "^(?:[A-Za-z0-9_'+\\-]+\\.)*[A-Za-z0-9_'+\\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"
    },
    "role": {
      "type": "string",
      "enum": [
        "client_admin",
        "client_approver",
        "client_viewer"
      ]
    }
  },
  "required": [
    "name",
    "email",
    "role"
  ],
  "additionalProperties": false
}
```

### Kpi

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/Kpi",
  "type": "object",
  "properties": {
    "value": {
      "type": "number"
    },
    "previous": {
      "type": [
        "number",
        "null"
      ]
    },
    "spark": {
      "default": [],
      "type": "array",
      "items": {
        "type": "number"
      }
    }
  },
  "required": [
    "value",
    "previous",
    "spark"
  ],
  "additionalProperties": false
}
```

### Language

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/Language",
  "type": "string",
  "enum": [
    "java",
    "dotnet",
    "typescript",
    "python",
    "go",
    "kotlin"
  ]
}
```

### LiveLog

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/LiveLog",
  "type": "object",
  "properties": {
    "runId": {
      "type": [
        "string",
        "null"
      ]
    },
    "status": {
      "type": "string",
      "enum": [
        "idle",
        "running",
        "verifying",
        "done"
      ]
    },
    "lines": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/LogLine"
      }
    },
    "progressPct": {
      "type": "number"
    }
  },
  "required": [
    "runId",
    "status",
    "lines",
    "progressPct"
  ],
  "additionalProperties": false
}
```

### LogLine

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/LogLine",
  "type": "object",
  "properties": {
    "seq": {
      "type": "integer",
      "minimum": -9007199254740991,
      "maximum": 9007199254740991
    },
    "at": {
      "type": "string"
    },
    "level": {
      "type": "string",
      "enum": [
        "info",
        "tool",
        "warn",
        "error",
        "success"
      ]
    },
    "text": {
      "type": "string"
    }
  },
  "required": [
    "seq",
    "at",
    "level",
    "text"
  ],
  "additionalProperties": false
}
```

### NewTaskInput

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/NewTaskInput",
  "type": "object",
  "properties": {
    "orgId": {
      "type": "string",
      "minLength": 1
    },
    "repositoryId": {
      "type": "string",
      "minLength": 1
    },
    "type": {
      "$ref": "#/schemas/TaskType"
    },
    "title": {
      "type": "string",
      "minLength": 5,
      "maxLength": 120
    },
    "description": {
      "type": "string",
      "minLength": 10
    },
    "acceptanceCriteria": {
      "minItems": 1,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "agent": {
      "$ref": "#/schemas/AgentKind"
    },
    "priority": {
      "$ref": "#/schemas/Priority"
    },
    "assigneeUserId": {
      "type": [
        "string",
        "null"
      ]
    }
  },
  "required": [
    "orgId",
    "repositoryId",
    "type",
    "title",
    "description",
    "acceptanceCriteria",
    "agent",
    "priority"
  ],
  "additionalProperties": false
}
```

### Notification

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/Notification",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "audience": {
      "type": "string",
      "enum": [
        "portal",
        "console"
      ]
    },
    "orgId": {
      "type": [
        "string",
        "null"
      ]
    },
    "title": {
      "type": "string"
    },
    "body": {
      "type": "string"
    },
    "href": {
      "type": "string"
    },
    "at": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
    },
    "read": {
      "type": "boolean"
    }
  },
  "required": [
    "id",
    "audience",
    "orgId",
    "title",
    "body",
    "href",
    "at",
    "read"
  ],
  "additionalProperties": false
}
```

### NotificationList

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/NotificationList",
  "type": "array",
  "items": {
    "$ref": "#/schemas/Notification"
  }
}
```

### Ok

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/Ok",
  "type": "object",
  "properties": {
    "ok": {
      "type": "boolean",
      "const": true
    }
  },
  "required": [
    "ok"
  ],
  "additionalProperties": false
}
```

### OnboardingInput

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/OnboardingInput",
  "type": "object",
  "properties": {
    "company": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "minLength": 2
        },
        "industry": {
          "type": "string",
          "minLength": 1
        },
        "region": {
          "type": "string",
          "minLength": 2
        },
        "contactName": {
          "type": "string",
          "minLength": 2
        },
        "contactEmail": {
          "type": "string",
          "format": "email",
          "pattern": "^(?:[A-Za-z0-9_'+\\-]+\\.)*[A-Za-z0-9_'+\\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"
        }
      },
      "required": [
        "name",
        "industry",
        "region",
        "contactName",
        "contactEmail"
      ],
      "additionalProperties": false
    },
    "provider": {
      "$ref": "#/schemas/GitProvider"
    },
    "account": {
      "type": "string",
      "minLength": 1
    },
    "repositories": {
      "minItems": 1,
      "type": "array",
      "items": {
        "$ref": "#/schemas/GitRepoCandidate"
      }
    },
    "mapping": {
      "minItems": 1,
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "repoFullName": {
            "type": "string"
          },
          "applicationName": {
            "type": "string",
            "minLength": 2
          },
          "criticality": {
            "$ref": "#/schemas/Criticality"
          }
        },
        "required": [
          "repoFullName",
          "applicationName",
          "criticality"
        ],
        "additionalProperties": false
      }
    },
    "tier": {
      "$ref": "#/schemas/Tier"
    }
  },
  "required": [
    "company",
    "provider",
    "account",
    "repositories",
    "mapping",
    "tier"
  ],
  "additionalProperties": false
}
```

### OnboardingResult

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/OnboardingResult",
  "type": "object",
  "properties": {
    "organizationId": {
      "type": "string"
    },
    "applicationIds": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "repositoryIds": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "scanIds": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "required": [
    "organizationId",
    "applicationIds",
    "repositoryIds",
    "scanIds"
  ],
  "additionalProperties": false
}
```

### OnboardingStatus

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/OnboardingStatus",
  "type": "object",
  "properties": {
    "organization": {
      "$ref": "#/schemas/Organization"
    },
    "scans": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "repositoryId": {
            "type": "string"
          },
          "startedAt": {
            "type": "string",
            "format": "date-time",
            "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
          },
          "finishedAt": {
            "anyOf": [
              {
                "type": "string",
                "format": "date-time",
                "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
              },
              {
                "type": "null"
              }
            ]
          },
          "status": {
            "type": "string",
            "enum": [
              "running",
              "completed",
              "failed"
            ]
          },
          "healthScore": {
            "anyOf": [
              {
                "type": "number",
                "minimum": 0,
                "maximum": 100
              },
              {
                "type": "null"
              }
            ]
          },
          "findingsCount": {
            "anyOf": [
              {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              {
                "type": "null"
              }
            ]
          },
          "trigger": {
            "type": "string",
            "enum": [
              "scheduled",
              "manual",
              "onboarding"
            ]
          },
          "simulatedEndsAt": {
            "type": "number"
          },
          "repositoryName": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "repositoryId",
          "startedAt",
          "finishedAt",
          "status",
          "healthScore",
          "findingsCount",
          "trigger",
          "repositoryName"
        ],
        "additionalProperties": false
      }
    },
    "done": {
      "type": "boolean"
    },
    "progressPct": {
      "type": "number"
    },
    "applications": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/ApplicationSummary"
      }
    },
    "topFindings": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "repositoryId": {
            "type": "string"
          },
          "dimension": {
            "$ref": "#/schemas/HealthDimension"
          },
          "severity": {
            "$ref": "#/schemas/Severity"
          },
          "title": {
            "type": "string"
          },
          "recommendation": {
            "type": "string"
          },
          "status": {
            "type": "string",
            "enum": [
              "open",
              "in_progress",
              "resolved"
            ]
          },
          "detectedAt": {
            "type": "string",
            "format": "date-time",
            "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
          },
          "repositoryName": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "repositoryId",
          "dimension",
          "severity",
          "title",
          "recommendation",
          "status",
          "detectedAt",
          "repositoryName"
        ],
        "additionalProperties": false
      }
    },
    "plan90": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "window": {
            "type": "string"
          },
          "items": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        },
        "required": [
          "window",
          "items"
        ],
        "additionalProperties": false
      }
    }
  },
  "required": [
    "organization",
    "scans",
    "done",
    "progressPct",
    "applications",
    "topFindings",
    "plan90"
  ],
  "additionalProperties": false
}
```

### OpsDashboard

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/OpsDashboard",
  "type": "object",
  "properties": {
    "kpis": {
      "type": "object",
      "properties": {
        "slaMetPct": {
          "type": "number"
        },
        "tasksCompletedWeek": {
          "type": "number"
        },
        "tasksCompletedPrevWeek": {
          "type": "number"
        },
        "agentSharePct": {
          "type": "number"
        },
        "avgCostPerTaskUsd": {
          "type": "number"
        },
        "grossMarginPct": {
          "type": "number"
        },
        "escalations": {
          "type": "number"
        }
      },
      "required": [
        "slaMetPct",
        "tasksCompletedWeek",
        "tasksCompletedPrevWeek",
        "agentSharePct",
        "avgCostPerTaskUsd",
        "grossMarginPct",
        "escalations"
      ],
      "additionalProperties": false
    },
    "tasksByStateByClient": {
      "type": "array",
      "items": {
        "type": "object",
        "propertyNames": {
          "type": "string"
        },
        "additionalProperties": {
          "type": [
            "string",
            "number"
          ]
        }
      }
    },
    "agentShareTrend": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "week": {
            "type": "string"
          },
          "agentPct": {
            "type": "number"
          },
          "humanPct": {
            "type": "number"
          }
        },
        "required": [
          "week",
          "agentPct",
          "humanPct"
        ],
        "additionalProperties": false
      }
    },
    "slaRisk": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/TaskListItem"
      }
    },
    "workload": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "user": {
            "$ref": "#/schemas/User"
          },
          "active": {
            "type": "number"
          },
          "awaitingReview": {
            "type": "number"
          }
        },
        "required": [
          "user",
          "active",
          "awaitingReview"
        ],
        "additionalProperties": false
      }
    },
    "costByAgent": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "agent": {
            "$ref": "#/schemas/AgentKind"
          },
          "runs": {
            "type": "number"
          },
          "costUsd": {
            "type": "number"
          },
          "successPct": {
            "type": "number"
          }
        },
        "required": [
          "agent",
          "runs",
          "costUsd",
          "successPct"
        ],
        "additionalProperties": false
      }
    }
  },
  "required": [
    "kpis",
    "tasksByStateByClient",
    "agentShareTrend",
    "slaRisk",
    "workload",
    "costByAgent"
  ],
  "additionalProperties": false
}
```

### Organization

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/Organization",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "name": {
      "type": "string"
    },
    "industry": {
      "type": "string"
    },
    "region": {
      "type": "string"
    },
    "tier": {
      "$ref": "#/schemas/Tier"
    },
    "headquarters": {
      "type": "string"
    },
    "domain": {
      "type": "string"
    },
    "onboardedAt": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
    },
    "status": {
      "default": "active",
      "type": "string",
      "enum": [
        "active",
        "onboarding",
        "paused"
      ]
    }
  },
  "required": [
    "id",
    "name",
    "industry",
    "region",
    "tier",
    "status"
  ],
  "additionalProperties": false
}
```

### Plan

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/Plan",
  "type": "object",
  "properties": {
    "steps": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "acceptanceCriteria": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "approvedBy": {
      "type": [
        "string",
        "null"
      ]
    }
  },
  "required": [
    "steps",
    "acceptanceCriteria",
    "approvedBy"
  ],
  "additionalProperties": false
}
```

### PortalOverview

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/PortalOverview",
  "type": "object",
  "properties": {
    "kpis": {
      "type": "object",
      "properties": {
        "applicationsCovered": {
          "$ref": "#/schemas/Kpi"
        },
        "slaMetPct": {
          "type": "object",
          "properties": {
            "value": {
              "type": "number"
            },
            "previous": {
              "type": [
                "number",
                "null"
              ]
            },
            "spark": {
              "default": [],
              "type": "array",
              "items": {
                "type": "number"
              }
            },
            "target": {
              "type": "number"
            }
          },
          "required": [
            "value",
            "previous",
            "spark",
            "target"
          ],
          "additionalProperties": false
        },
        "changesDelivered": {
          "$ref": "#/schemas/Kpi"
        },
        "estimatedSavingUsd": {
          "type": "object",
          "properties": {
            "value": {
              "type": "number"
            },
            "previous": {
              "type": [
                "number",
                "null"
              ]
            },
            "spark": {
              "default": [],
              "type": "array",
              "items": {
                "type": "number"
              }
            },
            "pct": {
              "type": "number"
            }
          },
          "required": [
            "value",
            "previous",
            "spark",
            "pct"
          ],
          "additionalProperties": false
        },
        "openApprovals": {
          "$ref": "#/schemas/Kpi"
        }
      },
      "required": [
        "applicationsCovered",
        "slaMetPct",
        "changesDelivered",
        "estimatedSavingUsd",
        "openApprovals"
      ],
      "additionalProperties": false
    },
    "healthTrend": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "weekStart": {
            "type": "string"
          },
          "score": {
            "type": "number"
          }
        },
        "required": [
          "weekStart",
          "score"
        ],
        "additionalProperties": false
      }
    },
    "attention": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/AttentionItem"
      }
    },
    "activity": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/ActivityItem"
      }
    }
  },
  "required": [
    "kpis",
    "healthTrend",
    "attention",
    "activity"
  ],
  "additionalProperties": false
}
```

### Priority

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/Priority",
  "type": "string",
  "enum": [
    "p0",
    "p1",
    "p2",
    "p3"
  ]
}
```

### PullRequest

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/PullRequest",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "taskId": {
      "type": "string"
    },
    "number": {
      "type": "integer",
      "exclusiveMinimum": 0,
      "maximum": 9007199254740991
    },
    "url": {
      "type": "string",
      "format": "uri"
    },
    "status": {
      "type": "string",
      "enum": [
        "open",
        "merged",
        "closed"
      ]
    },
    "aiAuthoredPct": {
      "type": "number",
      "minimum": 0,
      "maximum": 100
    },
    "openedAt": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
    }
  },
  "required": [
    "id",
    "taskId",
    "number",
    "url",
    "status",
    "aiAuthoredPct",
    "openedAt"
  ],
  "additionalProperties": false
}
```

### Repository

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/Repository",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "applicationId": {
      "type": "string"
    },
    "provider": {
      "$ref": "#/schemas/GitProvider"
    },
    "url": {
      "type": "string",
      "format": "uri"
    },
    "language": {
      "$ref": "#/schemas/Language"
    },
    "defaultBranch": {
      "type": "string"
    },
    "health": {
      "$ref": "#/schemas/HealthBreakdown"
    },
    "coveragePct": {
      "type": "number",
      "minimum": 0,
      "maximum": 100
    },
    "flakyTests": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "lastScanAt": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
    }
  },
  "required": [
    "id",
    "applicationId",
    "provider",
    "url",
    "language",
    "defaultBranch",
    "health",
    "coveragePct",
    "flakyTests",
    "lastScanAt"
  ],
  "additionalProperties": false
}
```

### RepositoryDetail

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/RepositoryDetail",
  "type": "object",
  "properties": {
    "repository": {
      "$ref": "#/schemas/RepositorySummary"
    },
    "findings": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/Finding"
      }
    },
    "scans": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/Scan"
      }
    },
    "tasks": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/TaskListItem"
      }
    },
    "flakyTests": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "failureRatePct": {
            "type": "number"
          },
          "lastSeen": {
            "type": "string"
          }
        },
        "required": [
          "name",
          "failureRatePct",
          "lastSeen"
        ],
        "additionalProperties": false
      }
    }
  },
  "required": [
    "repository",
    "findings",
    "scans",
    "tasks",
    "flakyTests"
  ],
  "additionalProperties": false
}
```

### RepositorySummary

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/RepositorySummary",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "applicationId": {
      "type": "string"
    },
    "provider": {
      "$ref": "#/schemas/GitProvider"
    },
    "url": {
      "type": "string",
      "format": "uri"
    },
    "language": {
      "$ref": "#/schemas/Language"
    },
    "defaultBranch": {
      "type": "string"
    },
    "health": {
      "$ref": "#/schemas/HealthBreakdown"
    },
    "coveragePct": {
      "type": "number",
      "minimum": 0,
      "maximum": 100
    },
    "flakyTests": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "lastScanAt": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
    },
    "name": {
      "type": "string"
    },
    "applicationName": {
      "type": "string"
    },
    "organizationId": {
      "type": "string"
    },
    "organizationName": {
      "type": "string"
    },
    "openFindings": {
      "type": "integer",
      "minimum": -9007199254740991,
      "maximum": 9007199254740991
    },
    "criticalFindings": {
      "type": "integer",
      "minimum": -9007199254740991,
      "maximum": 9007199254740991
    },
    "scanRunning": {
      "type": "boolean"
    }
  },
  "required": [
    "id",
    "applicationId",
    "provider",
    "url",
    "language",
    "defaultBranch",
    "health",
    "coveragePct",
    "flakyTests",
    "lastScanAt",
    "name",
    "applicationName",
    "organizationId",
    "organizationName",
    "openFindings",
    "criticalFindings",
    "scanRunning"
  ],
  "additionalProperties": false
}
```

### ResolvedActor

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/ResolvedActor",
  "type": "object",
  "properties": {
    "type": {
      "type": "string",
      "enum": [
        "person",
        "agent",
        "system"
      ]
    },
    "id": {
      "type": "string"
    },
    "name": {
      "type": "string"
    },
    "detail": {
      "type": "string"
    }
  },
  "required": [
    "type",
    "id",
    "name",
    "detail"
  ],
  "additionalProperties": false
}
```

### Role

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/Role",
  "type": "string",
  "enum": [
    "client_admin",
    "client_approver",
    "client_viewer",
    "fp_engineer",
    "fp_manager"
  ]
}
```

### SavingsReport

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/SavingsReport",
  "type": "object",
  "properties": {
    "month": {
      "type": "string"
    },
    "availableMonths": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "byType": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": {
            "$ref": "#/schemas/TaskType"
          },
          "count": {
            "type": "number"
          },
          "hours": {
            "type": "number"
          },
          "priorVendorCostUsd": {
            "type": "number"
          }
        },
        "required": [
          "type",
          "count",
          "hours",
          "priorVendorCostUsd"
        ],
        "additionalProperties": false
      }
    },
    "totals": {
      "type": "object",
      "properties": {
        "tasks": {
          "type": "number"
        },
        "hours": {
          "type": "number"
        },
        "priorVendorRateUsd": {
          "type": "number"
        },
        "priorVendorCostUsd": {
          "type": "number"
        },
        "baselineHours": {
          "type": "number"
        },
        "baselineCostUsd": {
          "type": "number"
        },
        "forgePilotFeeUsd": {
          "type": "number"
        },
        "savingUsd": {
          "type": "number"
        },
        "savingPct": {
          "type": "number"
        },
        "applications": {
          "type": "number"
        },
        "pricePerAppMonthlyUsd": {
          "type": "number"
        }
      },
      "required": [
        "tasks",
        "hours",
        "priorVendorRateUsd",
        "priorVendorCostUsd",
        "baselineHours",
        "baselineCostUsd",
        "forgePilotFeeUsd",
        "savingUsd",
        "savingPct",
        "applications",
        "pricePerAppMonthlyUsd"
      ],
      "additionalProperties": false
    },
    "agentSharePct": {
      "type": "number"
    }
  },
  "required": [
    "month",
    "availableMonths",
    "byType",
    "totals",
    "agentSharePct"
  ],
  "additionalProperties": false
}
```

### Scan

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/Scan",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "repositoryId": {
      "type": "string"
    },
    "startedAt": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
    },
    "finishedAt": {
      "anyOf": [
        {
          "type": "string",
          "format": "date-time",
          "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
        },
        {
          "type": "null"
        }
      ]
    },
    "status": {
      "type": "string",
      "enum": [
        "running",
        "completed",
        "failed"
      ]
    },
    "healthScore": {
      "anyOf": [
        {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        },
        {
          "type": "null"
        }
      ]
    },
    "findingsCount": {
      "anyOf": [
        {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        {
          "type": "null"
        }
      ]
    },
    "trigger": {
      "type": "string",
      "enum": [
        "scheduled",
        "manual",
        "onboarding"
      ]
    },
    "simulatedEndsAt": {
      "type": "number"
    }
  },
  "required": [
    "id",
    "repositoryId",
    "startedAt",
    "finishedAt",
    "status",
    "healthScore",
    "findingsCount",
    "trigger"
  ],
  "additionalProperties": false
}
```

### SearchResult

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/SearchResult",
  "type": "object",
  "properties": {
    "kind": {
      "type": "string",
      "enum": [
        "client",
        "application",
        "task",
        "repository"
      ]
    },
    "id": {
      "type": "string"
    },
    "title": {
      "type": "string"
    },
    "subtitle": {
      "type": "string"
    },
    "href": {
      "type": "string"
    }
  },
  "required": [
    "kind",
    "id",
    "title",
    "subtitle",
    "href"
  ],
  "additionalProperties": false
}
```

### Session

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/Session",
  "type": "object",
  "properties": {
    "user": {
      "$ref": "#/schemas/User"
    },
    "organization": {
      "anyOf": [
        {
          "$ref": "#/schemas/Organization"
        },
        {
          "type": "null"
        }
      ]
    },
    "personas": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/User"
      }
    }
  },
  "required": [
    "user",
    "organization",
    "personas"
  ],
  "additionalProperties": false
}
```

### Severity

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/Severity",
  "type": "string",
  "enum": [
    "critical",
    "high",
    "medium",
    "low"
  ]
}
```

### SlaMetric

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/SlaMetric",
  "type": "object",
  "properties": {
    "key": {
      "type": "string"
    },
    "label": {
      "type": "string"
    },
    "unit": {
      "type": "string",
      "enum": [
        "hours",
        "minutes",
        "pct"
      ]
    },
    "target": {
      "type": "number"
    },
    "actual": {
      "type": [
        "number",
        "null"
      ]
    },
    "lowerIsBetter": {
      "type": "boolean"
    },
    "met": {
      "type": [
        "boolean",
        "null"
      ]
    },
    "samples": {
      "type": "number"
    }
  },
  "required": [
    "key",
    "label",
    "unit",
    "target",
    "actual",
    "lowerIsBetter",
    "met",
    "samples"
  ],
  "additionalProperties": false
}
```

### SlaReport

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/SlaReport",
  "type": "object",
  "properties": {
    "metrics": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/SlaMetric"
      }
    },
    "breaches": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "taskId": {
            "type": "string"
          },
          "title": {
            "type": "string"
          },
          "applicationName": {
            "type": "string"
          },
          "dueAt": {
            "type": "string"
          },
          "resolvedAt": {
            "type": [
              "string",
              "null"
            ]
          },
          "reason": {
            "type": "string"
          }
        },
        "required": [
          "taskId",
          "title",
          "applicationName",
          "dueAt",
          "resolvedAt",
          "reason"
        ],
        "additionalProperties": false
      }
    },
    "slaMetPct": {
      "type": "number"
    },
    "breachCount": {
      "type": "number"
    }
  },
  "required": [
    "metrics",
    "breaches",
    "slaMetPct",
    "breachCount"
  ],
  "additionalProperties": false
}
```

### SlaStatus

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/SlaStatus",
  "type": "string",
  "enum": [
    "on_track",
    "at_risk",
    "breached"
  ]
}
```

### SlaTargets

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/SlaTargets",
  "type": "object",
  "properties": {
    "criticalCvePatchHours": {
      "type": "number",
      "exclusiveMinimum": 0
    },
    "verificationMinutesP90": {
      "type": "number",
      "exclusiveMinimum": 0
    },
    "approvalTurnaroundHours": {
      "type": "number",
      "exclusiveMinimum": 0
    },
    "slaMetTargetPct": {
      "type": "number",
      "minimum": 0,
      "maximum": 100
    }
  },
  "required": [
    "criticalCvePatchHours",
    "verificationMinutesP90",
    "approvalTurnaroundHours",
    "slaMetTargetPct"
  ],
  "additionalProperties": false
}
```

### SwitchSessionInput

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/SwitchSessionInput",
  "type": "object",
  "properties": {
    "userId": {
      "type": "string"
    }
  },
  "required": [
    "userId"
  ],
  "additionalProperties": false
}
```

### TaskAction

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/TaskAction",
  "type": "string",
  "enum": [
    "save_plan",
    "approve_plan",
    "launch",
    "stop",
    "retry",
    "take_over",
    "sign_off",
    "open_pr",
    "escalate",
    "close"
  ]
}
```

### TaskActionInput

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/TaskActionInput",
  "type": "object",
  "properties": {
    "action": {
      "$ref": "#/schemas/TaskAction"
    },
    "notes": {
      "type": "string"
    },
    "reviewedDiff": {
      "type": "boolean"
    },
    "simulateFailure": {
      "type": "boolean"
    },
    "plan": {
      "type": "object",
      "properties": {
        "steps": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1
          }
        },
        "acceptanceCriteria": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1
          }
        }
      },
      "required": [
        "steps",
        "acceptanceCriteria"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "action"
  ],
  "additionalProperties": false
}
```

### TaskDetail

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/TaskDetail",
  "type": "object",
  "properties": {
    "task": {
      "$ref": "#/schemas/TaskListItem"
    },
    "application": {
      "$ref": "#/schemas/Application"
    },
    "repository": {
      "$ref": "#/schemas/Repository"
    },
    "organization": {
      "$ref": "#/schemas/Organization"
    },
    "contract": {
      "anyOf": [
        {
          "$ref": "#/schemas/Contract"
        },
        {
          "type": "null"
        }
      ]
    },
    "runs": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/AgentRun"
      }
    },
    "verifications": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/VerificationRun"
      }
    },
    "approvals": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "taskId": {
            "type": "string"
          },
          "approverUserId": {
            "type": "string"
          },
          "decision": {
            "type": "string",
            "enum": [
              "approved",
              "changes_requested"
            ]
          },
          "at": {
            "type": "string",
            "format": "date-time",
            "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
          },
          "comment": {
            "type": "string"
          },
          "approver": {
            "anyOf": [
              {
                "$ref": "#/schemas/User"
              },
              {
                "type": "null"
              }
            ]
          }
        },
        "required": [
          "id",
          "taskId",
          "approverUserId",
          "decision",
          "at",
          "comment",
          "approver"
        ],
        "additionalProperties": false
      }
    },
    "evidence": {
      "type": "array",
      "items": {
        "$ref": "#/schemas/EvidenceItem"
      }
    },
    "chainValid": {
      "type": "boolean"
    },
    "signOff": {
      "anyOf": [
        {
          "type": "object",
          "properties": {
            "by": {
              "type": "string"
            },
            "at": {
              "type": "string"
            }
          },
          "required": [
            "by",
            "at"
          ],
          "additionalProperties": false
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "task",
    "application",
    "repository",
    "organization",
    "contract",
    "runs",
    "verifications",
    "approvals",
    "evidence",
    "chainValid",
    "signOff"
  ],
  "additionalProperties": false
}
```

### TaskListItem

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/TaskListItem",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "repositoryId": {
      "type": "string"
    },
    "applicationId": {
      "type": "string"
    },
    "orgId": {
      "type": "string"
    },
    "type": {
      "$ref": "#/schemas/TaskType"
    },
    "title": {
      "type": "string"
    },
    "summary": {
      "type": "string"
    },
    "source": {
      "type": "object",
      "properties": {
        "kind": {
          "type": "string",
          "enum": [
            "ticket",
            "scan",
            "manual"
          ]
        },
        "ref": {
          "type": "string"
        },
        "url": {
          "type": "string"
        }
      },
      "required": [
        "kind",
        "ref"
      ],
      "additionalProperties": false
    },
    "state": {
      "$ref": "#/schemas/TaskState"
    },
    "priority": {
      "$ref": "#/schemas/Priority"
    },
    "slaDueAt": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
    },
    "assigneeUserId": {
      "type": [
        "string",
        "null"
      ]
    },
    "agent": {
      "$ref": "#/schemas/AgentKind"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
    },
    "aiAuthoredPct": {
      "type": "number",
      "minimum": 0,
      "maximum": 100
    },
    "plan": {
      "$ref": "#/schemas/Plan"
    },
    "estimatedHours": {
      "type": "number",
      "minimum": 0
    },
    "escalationReason": {
      "type": "string"
    },
    "manualTakeoverBy": {
      "type": [
        "string",
        "null"
      ]
    },
    "applicationName": {
      "type": "string"
    },
    "organizationName": {
      "type": "string"
    },
    "repositoryName": {
      "type": "string"
    },
    "assignee": {
      "anyOf": [
        {
          "$ref": "#/schemas/User"
        },
        {
          "type": "null"
        }
      ]
    },
    "latestRun": {
      "anyOf": [
        {
          "$ref": "#/schemas/AgentRun"
        },
        {
          "type": "null"
        }
      ]
    },
    "latestVerification": {
      "anyOf": [
        {
          "$ref": "#/schemas/VerificationRun"
        },
        {
          "type": "null"
        }
      ]
    },
    "pullRequest": {
      "anyOf": [
        {
          "$ref": "#/schemas/PullRequest"
        },
        {
          "type": "null"
        }
      ]
    },
    "slaRisk": {
      "$ref": "#/schemas/TaskSlaRisk"
    },
    "lastEvent": {
      "anyOf": [
        {
          "$ref": "#/schemas/EvidenceItem"
        },
        {
          "type": "null"
        }
      ]
    },
    "attempts": {
      "type": "integer",
      "minimum": -9007199254740991,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "id",
    "repositoryId",
    "applicationId",
    "orgId",
    "type",
    "title",
    "summary",
    "source",
    "state",
    "priority",
    "slaDueAt",
    "assigneeUserId",
    "agent",
    "createdAt",
    "aiAuthoredPct",
    "plan",
    "estimatedHours",
    "applicationName",
    "organizationName",
    "repositoryName",
    "assignee",
    "latestRun",
    "latestVerification",
    "pullRequest",
    "slaRisk",
    "lastEvent",
    "attempts"
  ],
  "additionalProperties": false
}
```

### TaskSlaRisk

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/TaskSlaRisk",
  "type": "string",
  "enum": [
    "ok",
    "at_risk",
    "breached",
    "met",
    "missed"
  ]
}
```

### TaskState

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/TaskState",
  "type": "string",
  "enum": [
    "created",
    "planned",
    "plan_approved",
    "running",
    "verifying",
    "retrying",
    "escalated",
    "awaiting_review",
    "signed_off",
    "pr_open",
    "client_approved",
    "merged",
    "closed",
    "failed",
    "rejected"
  ]
}
```

### TaskType

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/TaskType",
  "type": "string",
  "enum": [
    "dependency_upgrade",
    "cve_patch",
    "bug_fix",
    "enhancement",
    "test_coverage"
  ]
}
```

### TestResult

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/TestResult",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "suite": {
      "type": "string"
    },
    "status": {
      "type": "string",
      "enum": [
        "passed",
        "failed",
        "skipped"
      ]
    },
    "durationMs": {
      "type": "number",
      "minimum": 0
    },
    "flaky": {
      "default": false,
      "type": "boolean"
    }
  },
  "required": [
    "name",
    "suite",
    "status",
    "durationMs",
    "flaky"
  ],
  "additionalProperties": false
}
```

### Tier

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/Tier",
  "type": "string",
  "enum": [
    "maintain",
    "maintain_assure",
    "full_run"
  ]
}
```

### User

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/User",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "name": {
      "type": "string"
    },
    "email": {
      "type": "string",
      "format": "email",
      "pattern": "^(?:[A-Za-z0-9_'+\\-]+\\.)*[A-Za-z0-9_'+\\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"
    },
    "role": {
      "$ref": "#/schemas/Role"
    },
    "orgId": {
      "type": [
        "string",
        "null"
      ]
    },
    "title": {
      "type": "string"
    },
    "status": {
      "default": "active",
      "type": "string",
      "enum": [
        "active",
        "invited"
      ]
    }
  },
  "required": [
    "id",
    "name",
    "email",
    "role",
    "orgId",
    "status"
  ],
  "additionalProperties": false
}
```

### VerificationRun

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "#/schemas/VerificationRun",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "agentRunId": {
      "type": "string"
    },
    "testsRun": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "testsPassed": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "testsFailed": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "securityFindings": {
      "type": "object",
      "properties": {
        "critical": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "high": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "medium": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "critical",
        "high",
        "medium"
      ],
      "additionalProperties": false
    },
    "riskScore": {
      "type": "number",
      "minimum": 0,
      "maximum": 100
    },
    "status": {
      "type": "string",
      "enum": [
        "running",
        "passed",
        "failed"
      ]
    },
    "durationMin": {
      "type": "number",
      "minimum": 0
    },
    "startedAt": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
    },
    "coveragePct": {
      "type": "number",
      "minimum": 0,
      "maximum": 100
    },
    "testResults": {
      "default": [],
      "type": "array",
      "items": {
        "$ref": "#/schemas/TestResult"
      }
    },
    "artifacts": {
      "default": [],
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "kind": {
            "type": "string",
            "enum": [
              "screenshot",
              "log",
              "sbom",
              "report"
            ]
          },
          "label": {
            "type": "string"
          },
          "url": {
            "type": "string"
          }
        },
        "required": [
          "kind",
          "label",
          "url"
        ],
        "additionalProperties": false
      }
    },
    "scanners": {
      "default": [],
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "required": [
    "id",
    "agentRunId",
    "testsRun",
    "testsPassed",
    "testsFailed",
    "securityFindings",
    "riskScore",
    "status",
    "durationMin",
    "testResults",
    "artifacts",
    "scanners"
  ],
  "additionalProperties": false
}
```
