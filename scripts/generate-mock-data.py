"""Generate mocks/mock-data.json — deterministic demo data for the ForgePilot SaaS.

Usage:  python3 -I scripts/generate-mock-data.py mocks/mock-data.json

All companies, people, repositories and advisories are fictional.
Advisory ids use a DEMO- prefix so they can never be mistaken for real ones.
"""
import json
import random
import sys
from datetime import datetime, timedelta, timezone

OUT = sys.argv[1] if len(sys.argv) > 1 else "mocks/mock-data.json"
R = random.Random(20261109)
NOW = datetime(2026, 11, 9, 10, 0, tzinfo=timezone.utc)


def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def ago(**kw):
    return NOW - timedelta(**kw)


def sha():
    return "".join(R.choice("0123456789abcdef") for _ in range(40))


counters = {}


def nid(prefix):
    counters[prefix] = counters.get(prefix, 0) + 1
    return f"{prefix}_{counters[prefix]:03d}"


# --------------------------------------------------------------------------- tenants
users = [
    {"id": "u_maya", "name": "Maya Chen", "email": "maya@lumenlabs.example", "title": "CTO & co-founder", "githubLogin": "mayachen"},
    {"id": "u_dev", "name": "Dev Patel", "email": "dev@lumenlabs.example", "title": "Staff engineer", "githubLogin": "devpatel"},
    {"id": "u_alex", "name": "Alex Kim", "email": "alex@lumenlabs.example", "title": "Software engineer", "githubLogin": "alexkim"},
    {"id": "u_jordan", "name": "Jordan Lee", "email": "jordan@lumenlabs.example", "title": "Product manager", "githubLogin": "jlee"},
    {"id": "u_priya", "name": "Priya Raman", "email": "priya@lumenlabs.example", "title": "Frontend engineer", "githubLogin": "priyar"},
    {"id": "u_tom", "name": "Tom Becker", "email": "tom@lumenlabs.example", "title": "Platform engineer", "githubLogin": "tbecker"},
    {"id": "u_sofia", "name": "Sofia Alvarez", "email": "sofia@northwind.example", "title": "Founder, Northwind Studio", "githubLogin": "sofia-a"},
    {"id": "u_kenji", "name": "Kenji Watanabe", "email": "kenji@northwind.example", "title": "Lead developer", "githubLogin": "kenjiw"},
]

orgs = [
    {"id": "ws_lumen", "slug": "lumen", "name": "Lumen Labs", "kind": "team", "plan": "team", "billingCycle": "monthly",
     "createdAt": iso(ago(days=118)), "useCase": "ship_ai_code_safely", "seatsPurchased": 8,
     "budget": {"monthlyLimitUsd": 400, "hardCap": True, "alertAtPct": [50, 80, 100]}, "trialEndsAt": None},
    {"id": "ws_northwind", "slug": "northwind", "name": "Northwind Studio", "kind": "agency", "plan": "business", "billingCycle": "annual",
     "createdAt": iso(ago(days=240)), "useCase": "agency_client_repos", "seatsPurchased": 15,
     "budget": {"monthlyLimitUsd": 4000, "hardCap": False, "alertAtPct": [80, 100]}, "trialEndsAt": None},
    {"id": "ws_maya", "slug": "maya", "name": "Maya's sandbox", "kind": "personal", "plan": "developer", "billingCycle": "monthly",
     "createdAt": iso(ago(days=60)), "useCase": "personal_projects", "seatsPurchased": 1,
     "budget": {"monthlyLimitUsd": 50, "hardCap": True, "alertAtPct": [80, 100]}, "trialEndsAt": None},
]

memberships = [
    {"orgId": "ws_lumen", "userId": "u_maya", "role": "owner", "joinedAt": iso(ago(days=118))},
    {"orgId": "ws_lumen", "userId": "u_dev", "role": "admin", "joinedAt": iso(ago(days=117))},
    {"orgId": "ws_lumen", "userId": "u_alex", "role": "member", "joinedAt": iso(ago(days=90))},
    {"orgId": "ws_lumen", "userId": "u_priya", "role": "member", "joinedAt": iso(ago(days=70))},
    {"orgId": "ws_lumen", "userId": "u_tom", "role": "member", "joinedAt": iso(ago(days=40))},
    {"orgId": "ws_lumen", "userId": "u_jordan", "role": "viewer", "joinedAt": iso(ago(days=30))},
    {"orgId": "ws_northwind", "userId": "u_sofia", "role": "owner", "joinedAt": iso(ago(days=240))},
    {"orgId": "ws_northwind", "userId": "u_kenji", "role": "admin", "joinedAt": iso(ago(days=200))},
    {"orgId": "ws_northwind", "userId": "u_maya", "role": "viewer", "joinedAt": iso(ago(days=20))},
    {"orgId": "ws_maya", "userId": "u_maya", "role": "owner", "joinedAt": iso(ago(days=60))},
]

invitations = [
    {"id": "inv_001", "orgId": "ws_lumen", "email": "sam@lumenlabs.example", "role": "member", "invitedBy": "u_maya", "sentAt": iso(ago(days=2)), "status": "pending"},
]

# --------------------------------------------------------------------------- projects & repositories
projects = [
    {"id": "proj_web", "orgId": "ws_lumen", "name": "Lumen Web", "description": "Customer dashboard and marketing site (Next.js).", "color": "violet", "createdAt": iso(ago(days=117))},
    {"id": "proj_payments", "orgId": "ws_lumen", "name": "Payments API", "description": "Card payments, payouts and the ledger worker (Python).", "color": "teal", "createdAt": iso(ago(days=110))},
    {"id": "proj_mobile", "orgId": "ws_lumen", "name": "Mobile BFF", "description": "Backend-for-frontend serving the iOS and Android apps.", "color": "amber", "createdAt": iso(ago(days=80))},
    {"id": "proj_harbor", "orgId": "ws_northwind", "name": "Harbor Health — patient portal", "description": "Client project: appointment booking and messaging portal.", "color": "sky", "createdAt": iso(ago(days=200)), "client": "Harbor Health"},
    {"id": "proj_fieldstone", "orgId": "ws_northwind", "name": "Fieldstone — storefront", "description": "Client project: headless storefront and search.", "color": "rose", "createdAt": iso(ago(days=150)), "client": "Fieldstone Retail"},
    {"id": "proj_recipes", "orgId": "ws_maya", "name": "Recipe AI", "description": "Side project: recipe generator with a Next.js front end.", "color": "lime", "createdAt": iso(ago(days=58))},
]

repo_defs = [
    ("repo_web", "proj_web", "lumen/web-app", ["typescript"], ["Next.js", "React", "Tailwind"], "npm", ["pnpm test", "pnpm exec playwright test"], ["ci.yml", "preview.yml"]),
    ("repo_payments", "proj_payments", "lumen/payments-api", ["python"], ["FastAPI", "SQLAlchemy"], "pypi", ["pytest -q", "pytest tests/api"], ["ci.yml"]),
    ("repo_ledger", "proj_payments", "lumen/ledger-worker", ["python"], ["Celery"], "pypi", ["pytest -q"], ["ci.yml"]),
    ("repo_bff", "proj_mobile", "lumen/mobile-bff", ["typescript"], ["Fastify", "Prisma"], "npm", ["npm test", "npm run test:api"], ["ci.yml", "deploy.yml"]),
    ("repo_harbor", "proj_harbor", "northwind/harbor-portal", ["typescript"], ["Next.js", "React"], "npm", ["npm test", "npx playwright test"], ["ci.yml"]),
    ("repo_fs_shop", "proj_fieldstone", "northwind/fieldstone-shop", ["typescript"], ["Remix", "React"], "npm", ["npm test", "npx playwright test"], ["ci.yml"]),
    ("repo_fs_search", "proj_fieldstone", "northwind/fieldstone-search", ["python"], ["FastAPI"], "pypi", ["pytest"], ["ci.yml"]),
    ("repo_recipes", "proj_recipes", "mayachen/recipe-ai", ["typescript"], ["Next.js"], "npm", ["pnpm test"], []),
]

repositories = []
for rid, pid, full, langs, fw, eco, cmds, ci in repo_defs:
    org = next(p for p in projects if p["id"] == pid)["orgId"]
    has_docs = rid not in ("repo_ledger", "repo_recipes")
    repositories.append({
        "id": rid, "projectId": pid, "orgId": org, "provider": "github", "fullName": full,
        "url": f"https://github.com/{full}", "defaultBranch": "main", "private": rid != "repo_recipes",
        "languages": langs, "frameworks": fw, "ecosystems": [eco], "testCommands": cmds, "ciWorkflows": ci,
        "indexedSha": sha(), "indexedAt": iso(ago(hours=R.randint(1, 30))), "indexStatus": "ready",
        "fileCount": R.randint(240, 1900), "hasDocs": has_docs,
        "scanSchedule": "daily" if org != "ws_maya" else "weekly",
    })

# --------------------------------------------------------------------------- integrations & agents
def integ(org, provider, status, account, scopes, **extra):
    d = {"id": f"int_{org[3:]}_{provider}", "orgId": org, "providerId": provider, "status": status, "account": account,
         "connectedAt": iso(ago(days=R.randint(10, 100))) if status != "disconnected" else None, "scopes": scopes}
    d.update(extra)
    return d

integrations = [
    integ("ws_lumen", "github", "connected", "lumen (4 repositories)", ["contents:read", "pull_requests:write", "checks:write", "issues:read"]),
    integ("ws_lumen", "claude_code", "connected", "Anthropic API · key ending 7Q2a", ["agent:run"]),
    integ("ws_lumen", "openai_codex", "connected", "OpenAI API · key ending h9Lm", ["agent:run"]),
    integ("ws_lumen", "slack", "connected", "#eng-forgepilot", ["chat:write"]),
    integ("ws_lumen", "linear", "connected", "lumen-labs", ["issues:read"]),
    integ("ws_lumen", "sentry", "error", "lumen-labs", ["events:read"], error="Token revoked on 6 Nov. Reconnect to resume linking errors to PRs."),
    integ("ws_northwind", "github", "connected", "northwind (3 repositories)", ["contents:read", "pull_requests:write", "checks:write", "issues:read"]),
    integ("ws_northwind", "claude_code", "connected", "Anthropic API · key ending a1Bc", ["agent:run"]),
    integ("ws_northwind", "jira", "connected", "northwind.atlassian.example", ["issues:read"]),
    integ("ws_northwind", "slack", "connected", "#client-builds", ["chat:write"]),
    integ("ws_maya", "github", "connected", "mayachen (1 repository)", ["contents:read", "pull_requests:write", "checks:write"]),
    integ("ws_maya", "claude_code", "connected", "Anthropic API · key ending 0pQz", ["agent:run"]),
]

agents = [
    {"id": "agent_claude_lumen", "orgId": "ws_lumen", "provider": "claude_code", "name": "Claude Code", "model": "claude-sonnet", "status": "active", "maxConcurrent": 4, "defaultTimeoutMin": 45, "defaultBudgetUsd": 8},
    {"id": "agent_codex_lumen", "orgId": "ws_lumen", "provider": "openai_codex", "name": "OpenAI Codex", "model": "codex", "status": "active", "maxConcurrent": 2, "defaultTimeoutMin": 45, "defaultBudgetUsd": 6},
    {"id": "agent_claude_nw", "orgId": "ws_northwind", "provider": "claude_code", "name": "Claude Code", "model": "claude-sonnet", "status": "active", "maxConcurrent": 6, "defaultTimeoutMin": 60, "defaultBudgetUsd": 10},
    {"id": "agent_claude_maya", "orgId": "ws_maya", "provider": "claude_code", "name": "Claude Code", "model": "claude-sonnet", "status": "active", "maxConcurrent": 1, "defaultTimeoutMin": 30, "defaultBudgetUsd": 3},
]

policies = []
for o in orgs:
    policies.append({
        "orgId": o["id"],
        "allowedProviders": [a["provider"] for a in agents if a["orgId"] == o["id"]],
        "requirePrApproval": o["kind"] != "personal",
        "protectedPaths": ["migrations/**", ".github/workflows/**", "infra/**"] if o["kind"] != "personal" else [".github/workflows/**"],
        "networkAllowlist": ["registry.npmjs.org", "pypi.org", "files.pythonhosted.org", "github.com"],
        "requiredChecks": ["ShipSafe / e2e", "ShipSafe / api"] if o["kind"] != "personal" else ["ShipSafe / unit"],
        "maxFixRetries": 3,
        "sessionTimeoutMin": 45,
        "approvalRules": [
            {"action": "modify_protected_path", "mode": "require_approval", "approverRole": "admin"},
            {"action": "access_secret", "mode": "require_approval", "approverRole": "owner"},
            {"action": "run_migration", "mode": "require_approval", "approverRole": "admin"},
            {"action": "network_egress", "mode": "require_approval", "approverRole": "admin"},
            {"action": "budget_increase", "mode": "require_approval", "approverRole": "owner"},
            {"action": "deploy_production", "mode": "prohibited", "approverRole": "owner"},
        ],
        "suppressionMaxDays": 90,
        "retentionDays": {"logs": 30, "artifacts": 30, "audit": 365},
    })

# --------------------------------------------------------------------------- test suites
suites = []
SUITE_TEMPLATES = {
    "npm": [("Unit", "unit", "pnpm test", ["src/**"], 4), ("End-to-end (Playwright)", "playwright", "pnpm exec playwright test", ["app/**", "components/**", "src/**"], 12), ("API contract", "api", "pnpm test:api", ["api/**", "src/routes/**"], 6)],
    "pypi": [("Unit", "unit", "pytest -q tests/unit", ["app/**"], 3), ("API (HTTP assertions)", "api", "pytest tests/api", ["app/api/**", "openapi.yaml"], 7)],
}
for r in repositories:
    for name, typ, cmd, paths, tmin in SUITE_TEMPLATES[r["ecosystems"][0]]:
        if r["id"] == "repo_recipes" and typ != "unit":
            continue
        suites.append({
            "id": nid("suite"), "repositoryId": r["id"], "orgId": r["orgId"], "name": name, "type": typ,
            "command": cmd.replace("pnpm", "npm run" if r["fullName"].startswith("northwind") and "pnpm" in cmd else "pnpm"),
            "environment": "preview" if typ == "playwright" else "ci-sandbox", "pathRules": paths,
            "timeoutMin": tmin * 2, "owner": "u_priya" if typ == "playwright" else "u_dev", "enabled": True,
            "required": typ in ("playwright", "api"), "flakyRatePct": round(R.uniform(0, 6), 1),
            "testCount": R.randint(40, 420) if typ == "unit" else R.randint(12, 90),
        })

# --------------------------------------------------------------------------- dependencies & findings
NPM = [("next", "15.4.2", "16.4.5"), ("react", "19.1.0", "19.3.0"), ("zod", "3.24.1", "4.6.7"), ("axios", "1.6.2", "1.12.0"),
       ("lodash", "4.17.20", "4.17.21"), ("jsonwebtoken", "8.5.1", "9.0.2"), ("express", "4.18.2", "5.1.0"), ("prisma", "5.10.0", "6.9.0"),
       ("fastify", "4.24.0", "5.4.0"), ("date-fns", "2.30.0", "4.4.0"), ("semver", "7.5.1", "7.7.2"), ("ws", "8.13.0", "8.18.3"),
       ("tailwindcss", "3.4.1", "4.3.5"), ("@playwright/test", "1.48.0", "1.63.0"), ("undici", "5.28.2", "7.10.0")]
PYPI = [("fastapi", "0.103.0", "0.120.0"), ("pydantic", "1.10.13", "2.11.0"), ("sqlalchemy", "1.4.49", "2.0.41"), ("requests", "2.31.0", "2.32.4"),
        ("celery", "5.3.4", "5.5.3"), ("pyjwt", "2.8.0", "2.10.1"), ("urllib3", "1.26.18", "2.5.0"), ("cryptography", "41.0.5", "45.0.4"),
        ("pytest", "7.4.3", "8.4.1"), ("uvicorn", "0.23.2", "0.35.0"), ("jinja2", "3.1.2", "3.1.6"), ("httpx", "0.25.0", "0.28.1")]
VULNS = {
    "lodash": ("high", "Prototype pollution in zipObjectDeep", "4.17.21"),
    "jsonwebtoken": ("high", "Signature verification bypass with insecure key types", "9.0.0"),
    "axios": ("medium", "Server-side request forgery via protocol-relative URLs", "1.8.2"),
    "ws": ("high", "Denial of service via many HTTP headers", "8.17.1"),
    "undici": ("medium", "Proxy-Authorization header leaked on cross-origin redirect", "5.28.4"),
    "requests": ("medium", "Credentials leaked to redirected host", "2.32.0"),
    "urllib3": ("medium", "Proxy-Authorization header not stripped on redirect", "1.26.19"),
    "cryptography": ("critical", "NULL pointer dereference loading PKCS#12 data", "42.0.4"),
    "jinja2": ("medium", "Sandbox escape via attribute formatting", "3.1.5"),
    "pyjwt": ("low", "Partial issuer comparison", "2.10.0"),
}
LICENSES = ["MIT", "MIT", "MIT", "Apache-2.0", "BSD-3-Clause", "ISC"]

dependencies, findings = [], []
adv_n = 1000
for r in repositories:
    pool = NPM if r["ecosystems"][0] == "npm" else PYPI
    picks = R.sample(pool, k=min(len(pool), 9 if r["id"] != "repo_recipes" else 5))
    for name, installed, latest in picks:
        up_to_date = R.random() < 0.3 and name not in VULNS
        dep = {"id": nid("dep"), "repositoryId": r["id"], "orgId": r["orgId"], "ecosystem": r["ecosystems"][0], "name": name,
               "installedVersion": latest if up_to_date else installed, "latestVersion": latest, "direct": R.random() < 0.8,
               "license": R.choice(LICENSES), "manifest": "package.json" if r["ecosystems"][0] == "npm" else "pyproject.toml"}
        dependencies.append(dep)
        if name in VULNS and dep["installedVersion"] != latest:
            sev, title, fixed = VULNS[name]
            adv_n += 1
            findings.append({
                "id": nid("fnd"), "repositoryId": r["id"], "orgId": r["orgId"], "category": "vulnerability", "severity": sev,
                "title": f"{name} {dep['installedVersion']}: {title}", "package": name, "dependencyId": dep["id"],
                "affectedVersion": dep["installedVersion"], "fixedVersion": fixed, "advisoryId": f"DEMO-{adv_n}",
                "advisorySource": "OSV (demo mirror)", "sourceUrl": f"https://osv.example/vulnerability/DEMO-{adv_n}",
                "confidence": "high", "riskBand": {"critical": "urgent", "high": "high", "medium": "medium", "low": "low"}[sev],
                "status": "open", "detectedAt": iso(ago(days=R.randint(1, 25))), "lastSeenSha": r["indexedSha"],
                "evidence": f"{dep['manifest']} pins {name}@{dep['installedVersion']}; advisory affects < {fixed}.",
                "suppression": None, "taskId": None,
            })
        elif not up_to_date and installed.split(".")[0] != latest.split(".")[0] and R.random() < 0.55:
            findings.append({
                "id": nid("fnd"), "repositoryId": r["id"], "orgId": r["orgId"], "category": "outdated", "severity": "low",
                "title": f"{name} is a major version behind ({installed} → {latest})", "package": name, "dependencyId": dep["id"],
                "affectedVersion": installed, "fixedVersion": latest, "advisoryId": None, "advisorySource": None, "sourceUrl": None,
                "confidence": "high", "riskBand": "low", "status": "open", "detectedAt": iso(ago(days=R.randint(3, 40))),
                "lastSeenSha": r["indexedSha"], "evidence": f"Latest release {latest}; installed {installed}.", "suppression": None, "taskId": None,
            })
    if r["ciWorkflows"]:
        if R.random() < 0.6:
            findings.append({"id": nid("fnd"), "repositoryId": r["id"], "orgId": r["orgId"], "category": "build", "severity": "medium",
                             "title": "CI fails ~1 in 9 runs on dependency install (registry timeout)", "package": None, "dependencyId": None,
                             "affectedVersion": None, "fixedVersion": None, "advisoryId": None, "advisorySource": None, "sourceUrl": None,
                             "confidence": "medium", "riskBand": "medium", "status": "open", "detectedAt": iso(ago(days=R.randint(2, 14))),
                             "lastSeenSha": r["indexedSha"], "evidence": "7 of the last 64 CI runs failed in `install` with ETIMEDOUT.", "suppression": None, "taskId": None})
    if not r["hasDocs"]:
        findings.append({"id": nid("fnd"), "repositoryId": r["id"], "orgId": r["orgId"], "category": "docs", "severity": "low",
                         "title": "README has no setup or test instructions", "package": None, "dependencyId": None,
                         "affectedVersion": None, "fixedVersion": None, "advisoryId": None, "advisorySource": None, "sourceUrl": None,
                         "confidence": "medium", "riskBand": "low", "status": "open", "detectedAt": iso(ago(days=R.randint(5, 30))),
                         "lastSeenSha": r["indexedSha"], "evidence": "README.md is 6 lines and contains no commands.", "suppression": None, "taskId": None})
    if R.random() < 0.5:
        findings.append({"id": nid("fnd"), "repositoryId": r["id"], "orgId": r["orgId"], "category": "tests", "severity": "medium",
                         "title": "2 flaky tests in the end-to-end suite", "package": None, "dependencyId": None,
                         "affectedVersion": None, "fixedVersion": None, "advisoryId": None, "advisorySource": None, "sourceUrl": None,
                         "confidence": "high", "riskBand": "medium", "status": "open", "detectedAt": iso(ago(days=R.randint(2, 20))),
                         "lastSeenSha": r["indexedSha"], "evidence": "checkout.spec.ts and login.spec.ts passed on retry in 6 of 40 runs.", "suppression": None, "taskId": None})

# one suppressed finding to show the flow
for f in findings:
    if f["category"] == "outdated" and f["orgId"] == "ws_lumen":
        f["status"] = "suppressed"
        f["suppression"] = {"reason": "Major upgrade planned for Q1; tracked in LIN-482.", "by": "u_dev", "at": iso(ago(days=6)), "expiresAt": iso(NOW + timedelta(days=54))}
        break

# --------------------------------------------------------------------------- health
def health_for(repo):
    fs = [f for f in findings if f["repositoryId"] == repo["id"] and f["status"] == "open"]
    sec = max(20, 100 - sum({"critical": 30, "high": 18, "medium": 8, "low": 3}[f["severity"]] for f in fs if f["category"] == "vulnerability"))
    dep = max(30, 100 - 7 * len([f for f in fs if f["category"] in ("outdated", "vulnerability")]))
    build = 74 if any(f["category"] == "build" for f in fs) else 93
    tests = 71 if any(f["category"] == "tests" for f in fs) else 88
    docs = None if repo["id"] == "repo_recipes" else (48 if not repo["hasDocs"] else 82)
    return {"dependencies": dep, "security": sec, "buildStability": build, "tests": tests, "docs": docs}

WEIGHTS = {"dependencies": 0.20, "security": 0.25, "buildStability": 0.20, "tests": 0.20, "docs": 0.15}

def score(h):
    known = {k: v for k, v in h.items() if v is not None}
    w = sum(WEIGHTS[k] for k in known)
    return round(sum(WEIGHTS[k] * v for k, v in known.items()) / w)

healthHistory, scans = [], []
for r in repositories:
    h = health_for(r)
    r["health"] = {**h, "score": score(h), "scoreVersion": "v1.2"}
    cur = r["health"]["score"]
    start = cur - R.randint(4, 15)
    for w in range(12):
        week = NOW - timedelta(weeks=11 - w)
        v = cur if w == 11 else round(start + (cur - start) * w / 11 + R.uniform(-2, 2))
        healthHistory.append({"repositoryId": r["id"], "weekStart": week.strftime("%Y-%m-%d"), "score": max(0, min(100, v))})
    for i in range(5):
        at = ago(days=i * (1 if r["scanSchedule"] == "daily" else 7), hours=R.randint(0, 5))
        delta = 0 if i else R.choice([-3, -1, 0, 2, 4])
        scans.append({"id": nid("scan"), "repositoryId": r["id"], "orgId": r["orgId"], "commitSha": r["indexedSha"] if i == 0 else sha(),
                      "status": "completed", "trigger": "schedule" if i else R.choice(["schedule", "push"]), "startedAt": iso(at - timedelta(minutes=3)),
                      "finishedAt": iso(at), "findingsCount": len([f for f in findings if f["repositoryId"] == r["id"]]) + (i % 2),
                      "scoreAfter": max(0, cur - i * R.randint(0, 2)), "scoreDelta": delta,
                      "changes": ["New advisory matched for a dependency"] if delta < 0 else (["Resolved an outdated dependency"] if delta > 0 else []),
                      "config": {"ecosystems": r["ecosystems"], "checks": ["dependencies", "advisories", "ci", "tests", "docs"]}})

# --------------------------------------------------------------------------- DevPilot: tasks, sessions, workspaces, PRs, ShipSafe runs
tasks, sessions, workspaces, prs, runs, results, bugs, approvals, events = [], [], [], [], [], [], [], [], []

STEP_LOG = [
    ("info", "Workspace ready: isolated container, 2 vCPU / 4 GB, network allowlist applied"),
    ("info", "Checked out {base} on branch {branch}"),
    ("tool", "read {f1}"),
    ("tool", "search \"{kw}\" in src/"),
    ("tool", "edit {f1} (+18 −6)"),
    ("tool", "edit {f2} (+42 −0) — new tests for the acceptance criteria"),
    ("tool", "run {cmd}"),
    ("success", "tests: all passing"),
    ("info", "Self-review complete; summarising changes"),
]

TASKS = [
    # id, org, repo, title, status, source, agent, priority, createdBy, created_days_ago, criteria, outcome
    ("ws_lumen", "repo_web", "Add saved filters to the transactions table", "review_ready", "linear", "agent_claude_lumen", "high", "u_alex", 1.2, ["Users can save, rename and delete a filter", "Saved filters persist per user", "E2E test covers save → reload → apply"], "pass"),
    ("ws_lumen", "repo_payments", "Idempotency keys for POST /refunds", "running", "manual", "agent_claude_lumen", "urgent", "u_dev", 0.05, ["Duplicate requests with the same key return the original response", "Keys expire after 24h", "API tests cover replay and expiry"], None),
    ("ws_lumen", "repo_bff", "Paginate /v2/activity with cursors", "running", "github_issue", "agent_codex_lumen", "medium", "u_tom", 0.03, ["Cursor pagination with `limit` ≤ 100", "Old offset params still accepted for 30 days", "Contract tests updated"], None),
    ("ws_lumen", "repo_payments", "Add a migration for the payouts.status index", "waiting_input", "manual", "agent_claude_lumen", "medium", "u_dev", 0.15, ["Migration is reversible", "No table lock longer than 2s on 10M rows", "Rollback documented"], None),
    ("ws_lumen", "repo_web", "Fix: date picker resets timezone on save", "verifying", "shipsafe_failure", "agent_claude_lumen", "high", "u_priya", 0.4, ["Saved dates keep the user's timezone", "Regression test added"], "pass_pending"),
    ("ws_lumen", "repo_web", "Dark-mode contrast fixes in settings pages", "review_ready", "manual", "agent_codex_lumen", "low", "u_priya", 2.5, ["All text meets WCAG AA", "Visual baseline updated with approval"], "pass"),
    ("ws_lumen", "repo_ledger", "Upgrade cryptography to 45.x (DEMO-advisory)", "review_ready", "codekeeper_finding", "agent_claude_lumen", "urgent", "u_dev", 0.9, ["cryptography ≥ 42.0.4", "All ledger tests pass", "No API changes"], "pass"),
    ("ws_lumen", "repo_web", "Stripe webhook retries with exponential back-off", "completed", "linear", "agent_claude_lumen", "high", "u_alex", 9, ["Retries 5× with jitter", "Dead-letter after final failure"], "merged"),
    ("ws_lumen", "repo_payments", "Rate-limit the /login endpoint", "completed", "manual", "agent_codex_lumen", "high", "u_dev", 13, ["10 req/min per IP", "429 with Retry-After"], "merged"),
    ("ws_lumen", "repo_bff", "Remove deprecated /v1/profile endpoint", "completed", "github_issue", "agent_claude_lumen", "medium", "u_tom", 18, ["Endpoint returns 410 Gone", "Clients migrated (checked in logs)"], "merged"),
    ("ws_lumen", "repo_web", "Onboarding checklist component", "failed", "manual", "agent_codex_lumen", "medium", "u_alex", 5, ["Checklist persists progress", "Keyboard accessible"], "failed"),
    ("ws_lumen", "repo_payments", "Refactor currency formatting helpers", "cancelled", "manual", "agent_claude_lumen", "low", "u_alex", 7, ["No behaviour change"], None),
    ("ws_lumen", "repo_web", "Export transactions to CSV", "queued", "linear", "agent_claude_lumen", "medium", "u_jordan", 0.01, ["CSV matches visible columns", "Large exports stream"], None),
    ("ws_lumen", "repo_bff", "Add request tracing headers", "draft", "manual", None, "low", "u_tom", 0.5, ["traceparent propagated to downstream calls"], None),
    ("ws_northwind", "repo_harbor", "Appointment reminders via SMS opt-in", "review_ready", "jira", "agent_claude_nw", "high", "u_kenji", 1.5, ["Opt-in stored with timestamp", "Reminder sent 24h before", "E2E covers opt-out"], "pass"),
    ("ws_northwind", "repo_fs_shop", "Fix: cart total wrong with stacked discounts", "verifying", "shipsafe_failure", "agent_claude_nw", "urgent", "u_kenji", 0.3, ["Totals match pricing service", "Regression test for stacked codes"], "fail_retest"),
    ("ws_northwind", "repo_fs_search", "Typo-tolerant product search", "completed", "jira", "agent_claude_nw", "medium", "u_sofia", 11, ["1-edit tolerance", "p95 < 120ms"], "merged"),
    ("ws_northwind", "repo_harbor", "Upgrade Next.js 15 → 16", "running", "codekeeper_finding", "agent_claude_nw", "medium", "u_kenji", 0.08, ["Build passes", "All e2e tests pass", "No middleware regressions"], None),
    ("ws_maya", "repo_recipes", "Add ingredient substitutions", "completed", "manual", "agent_claude_maya", "medium", "u_maya", 6, ["Suggest 3 substitutions per ingredient"], "merged"),
    ("ws_maya", "repo_recipes", "Cache recipe generations for 24h", "review_ready", "manual", "agent_claude_maya", "low", "u_maya", 1, ["Same prompt within 24h hits cache"], "pass"),
]

FILES = {"npm": ["src/components/TransactionsTable.tsx", "src/components/TransactionsTable.test.tsx", "e2e/transactions.spec.ts"],
         "pypi": ["app/api/refunds.py", "tests/api/test_refunds.py", "app/models.py"]}

task_ids = {}
for i, (org, repo, title, status, source, agent, prio, by, days, criteria, outcome) in enumerate(TASKS):
    tid = f"task_{i + 1:03d}"
    rep = next(r for r in repositories if r["id"] == repo)
    created = ago(days=days)
    branch = f"fp/{tid}-" + "-".join(title.lower().replace(":", "").split()[:4])
    base = rep["indexedSha"]
    t = {"id": tid, "orgId": org, "projectId": rep["projectId"], "repositoryId": repo, "title": title,
         "description": f"{title}. Context gathered from the repository index and linked issue.",
         "acceptanceCriteria": criteria, "constraints": ["Do not modify files under migrations/ without approval", "Keep public API backwards compatible"],
         "priority": prio, "status": status, "source": source,
         "sourceRef": {"linear": f"LIN-{400 + i}", "github_issue": f"#{120 + i}", "jira": f"HH-{80 + i}", "manual": None, "shipsafe_failure": None, "codekeeper_finding": None}[source],
         "createdBy": by, "createdAt": iso(created), "agentId": agent, "baseSha": base, "targetBranch": "main", "branch": branch,
         "budgetUsd": next((a["defaultBudgetUsd"] for a in agents if a["id"] == agent), 5), "timeoutMin": 45,
         "parentTaskId": None, "bugId": None, "findingId": None, "pullRequestId": None, "assigneeId": by,
         "clarityWarning": "Acceptance criteria don't say how many results per page." if status == "draft" else None}
    tasks.append(t)
    task_ids[title] = tid
    if status in ("draft", "queued") or agent is None:
        continue
    n_sessions = 2 if outcome in ("failed", "fail_retest") else 1
    for a in range(1, n_sessions + 1):
        sid = f"sess_{tid[5:]}_{a}"
        start = created + timedelta(minutes=4 + (a - 1) * 50)
        last = a == n_sessions
        if status in ("running",) and last:
            s_status, end = "running", None
        elif status == "waiting_input" and last:
            s_status, end = "waiting", None
        elif status == "cancelled":
            s_status, end = "cancelled", start + timedelta(minutes=6)
        elif outcome == "failed":
            s_status, end = "failed", start + timedelta(minutes=19)
        else:
            s_status, end = "completed", start + timedelta(minutes=R.randint(9, 31))
        ag = next(x for x in agents if x["id"] == agent)
        tokens = R.randint(90_000, 420_000)
        cost = round(tokens * (0.000011 if ag["provider"] == "claude_code" else 0.000009), 2)
        eco = rep["ecosystems"][0]
        files = FILES[eco]
        sess = {"id": sid, "taskId": tid, "orgId": org, "agentId": agent, "attempt": a, "status": s_status,
                "startedAt": iso(start), "endedAt": iso(end) if end else None,
                "tokensIn": int(tokens * 0.8), "tokensOut": int(tokens * 0.2), "costUsd": cost if end else round(cost * 0.4, 2),
                "summary": None if not end else (f"Implemented {title.lower()} and added tests." if s_status == "completed" else ("Stopped: could not satisfy 'keyboard accessible' with the current component library." if s_status == "failed" else "Cancelled by user.")),
                "changedFiles": [{"path": files[0], "additions": 34, "deletions": 9}, {"path": files[1], "additions": 58, "deletions": 0}, {"path": files[2], "additions": 12, "deletions": 3}] if end and s_status == "completed" else [],
                "headSha": sha() if s_status == "completed" else None, "waitingFor": None, "notes": "Retry: handle the stacked-discount case raised by ShipSafe." if a > 1 else None,
                "logSeed": R.randint(1, 10_000), "simulated": False}
        if s_status == "waiting":
            sess["waitingFor"] = {"kind": "approval", "approvalId": "apr_001"}
        sessions.append(sess)
        workspaces.append({"id": f"wk_{sid[5:]}", "sessionId": sid, "orgId": org, "runtime": "container", "image": "forgepilot/runner-node22" if eco == "npm" else "forgepilot/runner-py312",
                           "state": "active" if not end else "cleaned", "cpu": 2, "memoryGb": 4, "diskGb": 10,
                           "networkPolicy": "allowlist", "createdAt": iso(start), "cleanupAt": iso((end or NOW) + timedelta(hours=24)),
                           "credentials": "ephemeral, repo-scoped (expires 60 min)", "baseSha": base, "branch": branch})
    # pull request + shipsafe run
    if outcome in ("pass", "pass_pending", "merged", "fail_retest"):
        num = 200 + i * 3
        pr_id = f"pr_{tid[5:]}"
        last_sess = [s for s in sessions if s["taskId"] == tid][-1]
        opened = datetime.strptime(last_sess["endedAt"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc) if last_sess["endedAt"] else NOW
        pr = {"id": pr_id, "orgId": org, "repositoryId": repo, "number": num, "title": title, "url": f"{rep['url']}/pull/{num}",
              "author": {"type": "agent", "id": agent, "sessionId": last_sess["id"]}, "openedBy": by, "branch": branch, "baseSha": base,
              "headSha": last_sess["headSha"] or sha(), "status": "merged" if outcome == "merged" else "open",
              "openedAt": iso(opened + timedelta(minutes=1)), "mergedAt": iso(opened + timedelta(hours=R.randint(3, 30))) if outcome == "merged" else None,
              "mergedBy": by if outcome == "merged" else None, "aiAuthoredPct": R.randint(70, 96),
              "additions": 104, "deletions": 12, "changedFiles": 3, "taskId": tid, "checkStatus": "passed",
              "reviewers": ["u_dev"] if org == "ws_lumen" else (["u_sofia"] if org == "ws_northwind" else []), "reviewState": "approved" if outcome == "merged" else "review_requested"}
        prs.append(pr)
        t["pullRequestId"] = pr_id

# Human-authored PRs verified by ShipSafe (the wedge: verify any PR)
HUMAN_PRS = [
    ("ws_lumen", "repo_web", "Redesign billing settings page", "u_priya", "open", "failed"),
    ("ws_lumen", "repo_payments", "Bump FastAPI and pydantic", "u_dev", "open", "running"),
    ("ws_lumen", "repo_bff", "Feature flag for new activity feed", "u_tom", "merged", "passed"),
    ("ws_lumen", "repo_web", "Copy changes on pricing page", "u_jordan", "merged", "passed"),
    ("ws_northwind", "repo_fs_shop", "Gift card checkout flow", "u_kenji", "open", "failed"),
    ("ws_northwind", "repo_harbor", "Accessibility pass on booking form", "u_sofia", "open", "passed"),
]
for j, (org, repo, title, by, status, check) in enumerate(HUMAN_PRS):
    rep = next(r for r in repositories if r["id"] == repo)
    num = 300 + j * 4
    opened = ago(hours=R.randint(2, 70))
    prs.append({"id": f"pr_h{j + 1}", "orgId": org, "repositoryId": repo, "number": num, "title": title, "url": f"{rep['url']}/pull/{num}",
                "author": {"type": "person", "id": by, "sessionId": None}, "openedBy": by, "branch": "-".join(title.lower().split()[:3]),
                "baseSha": rep["indexedSha"], "headSha": sha(), "status": status, "openedAt": iso(opened),
                "mergedAt": iso(opened + timedelta(hours=5)) if status == "merged" else None, "mergedBy": "u_dev" if status == "merged" else None,
                "aiAuthoredPct": R.choice([0, 12, 35, 60]), "additions": R.randint(20, 400), "deletions": R.randint(5, 120), "changedFiles": R.randint(2, 14),
                "taskId": None, "checkStatus": check, "reviewers": ["u_maya"], "reviewState": "approved" if status == "merged" else "review_requested"})

# ShipSafe test runs per PR (+ retests), results and bugs
FAIL_CASES = {
    "pr_h1": [("billing.spec.ts › updates card on file", "product_defect", "Expected 'Card updated' toast, received nothing. POST /api/billing/card returned 500.", "high", "Updating the card on file fails with a 500"),
              ("billing.spec.ts › shows invoice history", "flaky", "Timed out waiting for selector `table >> nth=0` (passed on retry).", None, None)],
    "pr_h5": [("checkout.spec.ts › applies gift card", "product_defect", "Order total $42.10 ≠ expected $32.10 after applying GIFT10.", "critical", "Gift card is not deducted from the order total"),
              ("checkout.spec.ts › loads payment methods", "environment", "Preview environment returned 503 for /payment-methods (deploy not ready).", None, None)],
    "pr_016": [("cart.spec.ts › stacks two discount codes", "product_defect", "Total $87.00 ≠ $79.20 when SAVE10 and FREESHIP are both applied.", "high", "Stacked discount codes are not both applied")],
}
for pr in prs:
    rep = next(r for r in repositories if r["id"] == pr["repositoryId"])
    rs = [s for s in suites if s["repositoryId"] == rep["id"]]
    retest = pr["id"] in ("pr_016", "pr_005")
    attempts = [("failed" if pr["id"] in FAIL_CASES else "passed")] if not retest else (["running"] if pr["id"] == "pr_005" else ["failed", "running"])
    if pr["checkStatus"] == "running" and not retest:
        attempts = ["running"]
    if pr["checkStatus"] == "failed" and not retest:
        attempts = ["failed"]
    for k, st in enumerate(attempts):
        rid = nid("run")
        started = datetime.strptime(pr["openedAt"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc) + timedelta(minutes=2 + k * 60)
        if started > NOW:
            started = NOW - timedelta(minutes=3)
        selected = [{"suiteId": s["id"], "reason": f"Changed files match {s['pathRules'][0]}" if s["type"] != "unit" else "Always run for any change"} for s in rs]
        dur = R.randint(180, 900)
        run = {"id": rid, "orgId": pr["orgId"], "repositoryId": rep["id"], "pullRequestId": pr["id"], "trigger": "pull_request.synchronize" if k else "pull_request.opened",
               "headSha": pr["headSha"] if k == len(attempts) - 1 else sha(), "baseSha": pr["baseSha"], "branch": pr["branch"],
               "environment": {"name": "preview", "url": f"https://pr-{pr['number']}.preview.example", "node": "22.11" if rep["ecosystems"][0] == "npm" else None, "python": "3.12" if rep["ecosystems"][0] == "pypi" else None, "worker": "ss-worker-" + str(R.randint(10, 99)), "region": "us-east"},
               "status": st, "startedAt": iso(started), "finishedAt": iso(started + timedelta(seconds=dur)) if st != "running" else None,
               "durationSec": dur if st != "running" else None, "selectedSuites": selected, "retestOf": runs[-1]["id"] if k else None,
               "checkRun": {"name": "ForgePilot ShipSafe", "conclusion": {"passed": "success", "failed": "failure", "running": None}[st], "detailsUrl": f"/app/shipsafe/runs/{rid}"},
               "totals": {"passed": 0, "failed": 0, "flaky": 0, "skipped": 0}, "billedBrowserMinutes": round(dur / 60 * 1.6, 1)}
        runs.append(run)
        if st == "running":
            continue
        # results
        fails = FAIL_CASES.get(pr["id"], []) if st == "failed" else []
        for s in rs:
            n = R.randint(6, 14)
            for x in range(n):
                results.append({"id": nid("res"), "runId": rid, "suiteId": s["id"], "name": f"{s['name'].split(' ')[0].lower()} › case {x + 1}",
                                "outcome": "passed", "classification": None, "durationMs": R.randint(30, 4000), "retries": 0,
                                "error": None, "evidence": [] , "firstFailedAt": None})
                run["totals"]["passed"] += 1
            for name, cls, err, sev, btitle in [f for f in fails if (s["type"] == "playwright")]:
                outcome = "flaky" if cls == "flaky" else "failed"
                res = {"id": nid("res"), "runId": rid, "suiteId": s["id"], "name": name, "outcome": outcome, "classification": cls,
                       "durationMs": R.randint(4000, 30000), "retries": 1 if cls == "flaky" else 0, "error": err,
                       "evidence": [{"kind": "screenshot", "label": "Failure screenshot", "ref": f"artifacts/{rid}/{nid('a')}.png"},
                                    {"kind": "trace", "label": "Playwright trace", "ref": f"artifacts/{rid}/trace.zip"},
                                    {"kind": "console", "label": "Browser console", "ref": f"artifacts/{rid}/console.log"},
                                    {"kind": "network", "label": "Network failures (1)", "ref": f"artifacts/{rid}/network.har"}],
                       "firstFailedAt": run["startedAt"]}
                results.append(res)
                run["totals"]["flaky" if cls == "flaky" else "failed"] += 1
                if cls == "product_defect":
                    bid = nid("bug")
                    bugs.append({"id": bid, "orgId": pr["orgId"], "repositoryId": rep["id"], "runId": rid, "resultId": res["id"], "pullRequestId": pr["id"],
                                 "title": btitle, "severity": sev, "status": "open", "commitSha": run["headSha"],
                                 "reproSteps": ["Open the preview URL for this PR", "Sign in as the seeded test user", "Follow the steps in the failing test", "Observe the result in the screenshot"],
                                 "stackTrace": "Error: expect(received).toBe(expected)\n    at " + name.split(" ›")[0] + ":48:21",
                                 "suspectedCause": "Changed file in this PR alters the calculation path; see diff hunk 2.",
                                 "createdAt": run["startedAt"], "taskId": None, "assigneeId": None})
        if st == "failed" and not fails:
            fails_n = 1
            run["totals"]["failed"] += fails_n
    latest = [r for r in runs if r["pullRequestId"] == pr["id"]][-1]
    pr["latestRunId"] = latest["id"]
    pr["checkStatus"] = latest["status"]

# infrastructure-failure run (must NOT be a product defect)
runs.append({"id": nid("run"), "orgId": "ws_lumen", "repositoryId": "repo_bff", "pullRequestId": None, "trigger": "manual", "headSha": sha(), "baseSha": sha(),
             "branch": "main", "environment": {"name": "ci-sandbox", "url": None, "node": "22.11", "python": None, "worker": "ss-worker-07", "region": "us-east"},
             "status": "errored", "startedAt": iso(ago(hours=20)), "finishedAt": iso(ago(hours=20) + timedelta(minutes=2)), "durationSec": 120,
             "selectedSuites": [{"suiteId": s["id"], "reason": "Manual run"} for s in suites if s["repositoryId"] == "repo_bff"], "retestOf": None,
             "checkRun": {"name": "ForgePilot ShipSafe", "conclusion": "neutral", "detailsUrl": "/app/shipsafe/runs/x"},
             "totals": {"passed": 0, "failed": 0, "flaky": 0, "skipped": 0}, "billedBrowserMinutes": 0,
             "infraError": "Worker lost connection to the container runtime after 94s. Not a product failure; rerun is free."})
runs[-1]["checkRun"]["detailsUrl"] = f"/app/shipsafe/runs/{runs[-1]['id']}"

# historical scheduled runs on main for trends (last 30 days)
for r in repositories:
    rs = [s for s in suites if s["repositoryId"] == r["id"]]
    for d in range(30, 0, -2):
        st = "failed" if R.random() < 0.12 else "passed"
        dur = R.randint(180, 800)
        p = sum(s["testCount"] for s in rs)
        f = R.randint(1, 3) if st == "failed" else 0
        runs.append({"id": nid("run"), "orgId": r["orgId"], "repositoryId": r["id"], "pullRequestId": None, "trigger": "schedule", "headSha": sha(), "baseSha": sha(),
                     "branch": "main", "environment": {"name": "ci-sandbox", "url": None, "node": "22.11", "python": None, "worker": f"ss-worker-{R.randint(10, 99)}", "region": "us-east"},
                     "status": st, "startedAt": iso(ago(days=d, hours=R.randint(0, 8))), "finishedAt": iso(ago(days=d) + timedelta(seconds=dur)), "durationSec": dur,
                     "selectedSuites": [{"suiteId": s["id"], "reason": "Nightly full run"} for s in rs], "retestOf": None,
                     "checkRun": None, "totals": {"passed": p - f, "failed": f, "flaky": R.randint(0, 2), "skipped": R.randint(0, 4)},
                     "billedBrowserMinutes": round(dur / 60 * 1.6, 1)})

# link fix tasks to bugs (closed loop)
fix_map = {"task_005": "pr_h1", "task_016": "pr_h5"}
# the retest loop on task_016: its own first verification found a new defect, which attempt 2 fixes
_b16 = next((x for x in bugs if x["pullRequestId"] == "pr_016"), None)
if _b16:
    _b16["taskId"] = "task_016"
    _b16["status"] = "fix_in_progress"
for tid, pr_id in fix_map.items():
    t = next(x for x in tasks if x["id"] == tid)
    b = next((x for x in bugs if x["pullRequestId"] == pr_id), None)
    if b:
        b["taskId"] = tid
        b["status"] = "fix_in_progress"
        t["bugId"] = b["id"]
# codekeeper → devpilot links
for tid, pkg in (("task_007", "cryptography"), ("task_018", None)):
    t = next(x for x in tasks if x["id"] == tid)
    f = next((x for x in findings if x["repositoryId"] == t["repositoryId"] and (pkg is None or x["package"] == pkg) and x["status"] == "open"), None)
    if f:
        f["status"] = "task_created"
        f["taskId"] = tid
        t["findingId"] = f["id"]


# --------------------------------------------------------------------------- history: 60 days of finished work
HIST_TITLES = {
    "feature": ["Add audit trail to admin actions", "Bulk edit for team members", "Webhook signing secret rotation", "Search by merchant name", "Usage export for finance", "Dark-mode charts", "SSO login button", "Keyboard shortcuts for the table", "Pagination for invoices", "In-app changelog banner", "Saved views for reports", "Email digest preferences"],
    "bugfix": ["Fix: double-submit on payout form", "Fix: timezone drift in reports", "Fix: stale cache after logout", "Fix: 500 on empty CSV upload", "Fix: avatar upload rotates images", "Fix: race in webhook retries"],
    "maintenance": ["Upgrade axios to 1.12", "Upgrade urllib3 to 2.5", "Upgrade ws to 8.18", "Bump pydantic to v2", "Upgrade undici to 7.x", "Replace deprecated datetime.utcnow"],
}
HIST = {"ws_lumen": 34, "ws_northwind": 26, "ws_maya": 4}
hist_n = 0
for org_id, count in HIST.items():
    org_repos = [r for r in repositories if r["orgId"] == org_id]
    org_agents = [a for a in agents if a["orgId"] == org_id]
    org_users = [m["userId"] for m in memberships if m["orgId"] == org_id and m["role"] != "viewer"]
    for k in range(count):
        hist_n += 1
        kind = R.choices(["feature", "bugfix", "maintenance"], weights=[5, 3, 2])[0]
        title = R.choice(HIST_TITLES[kind])
        rep = R.choice(org_repos)
        ag = R.choice(org_agents)
        created = ago(days=R.uniform(10, 60))
        tid = f"task_h{hist_n:03d}"
        sid = f"sess_h{hist_n:03d}_1"
        outcome = R.choices(["merged", "closed", "failed"], weights=[82, 10, 8])[0]
        dur = R.randint(8, 34)
        tokens = R.randint(80_000, 380_000)
        cost = round(tokens * (0.000011 if ag["provider"] == "claude_code" else 0.000009), 2)
        end = created + timedelta(minutes=4 + dur)
        tasks.append({"id": tid, "orgId": org_id, "projectId": rep["projectId"], "repositoryId": rep["id"], "title": title,
                      "description": f"{title}.", "acceptanceCriteria": ["Behaviour matches the issue", "Tests added and passing"], "constraints": [],
                      "priority": R.choice(["high", "medium", "low"]), "status": {"merged": "completed", "closed": "cancelled", "failed": "failed"}[outcome],
                      "source": {"feature": R.choice(["manual", "linear" if org_id == "ws_lumen" else "jira", "github_issue"]), "bugfix": "shipsafe_failure" if R.random() < 0.5 else "github_issue", "maintenance": "codekeeper_finding"}[kind],
                      "sourceRef": None, "createdBy": R.choice(org_users), "createdAt": iso(created), "agentId": ag["id"], "baseSha": sha(), "targetBranch": "main",
                      "branch": f"fp/{tid}", "budgetUsd": ag["defaultBudgetUsd"], "timeoutMin": 45, "parentTaskId": None, "bugId": None, "findingId": None,
                      "pullRequestId": None if outcome == "failed" else f"pr_{tid}", "assigneeId": None, "clarityWarning": None})
        sessions.append({"id": sid, "taskId": tid, "orgId": org_id, "agentId": ag["id"], "attempt": 1, "status": "failed" if outcome == "failed" else "completed",
                         "startedAt": iso(created + timedelta(minutes=4)), "endedAt": iso(end), "tokensIn": int(tokens * 0.8), "tokensOut": int(tokens * 0.2), "costUsd": cost,
                         "summary": "Could not meet the acceptance criteria within budget." if outcome == "failed" else f"Implemented {title.lower()} with tests.",
                         "changedFiles": [] if outcome == "failed" else [{"path": "src/feature.ts" if rep["ecosystems"][0] == "npm" else "app/feature.py", "additions": R.randint(10, 90), "deletions": R.randint(0, 30)}],
                         "headSha": None if outcome == "failed" else sha(), "waitingFor": None, "notes": None, "logSeed": R.randint(1, 9999), "simulated": False})
        workspaces.append({"id": f"wk_h{hist_n:03d}_1", "sessionId": sid, "orgId": org_id, "runtime": "container", "image": "forgepilot/runner-node22" if rep["ecosystems"][0] == "npm" else "forgepilot/runner-py312",
                           "state": "cleaned", "cpu": 2, "memoryGb": 4, "diskGb": 10, "networkPolicy": "allowlist", "createdAt": iso(created), "cleanupAt": iso(end + timedelta(hours=24)),
                           "credentials": "ephemeral, repo-scoped (expires 60 min)", "baseSha": sha(), "branch": f"fp/{tid}"})
        if outcome == "failed":
            continue
        rid = nid("run")
        rsuites = [x for x in suites if x["repositoryId"] == rep["id"]]
        vdur = R.randint(160, 700)
        vstart = end + timedelta(minutes=1)
        runs.append({"id": rid, "orgId": org_id, "repositoryId": rep["id"], "pullRequestId": f"pr_{tid}", "trigger": "pull_request.opened", "headSha": sha(), "baseSha": sha(), "branch": f"fp/{tid}",
                     "environment": {"name": "preview", "url": None, "node": "22.11" if rep["ecosystems"][0] == "npm" else None, "python": "3.12" if rep["ecosystems"][0] == "pypi" else None, "worker": f"ss-worker-{R.randint(10, 99)}", "region": "us-east"},
                     "status": "passed", "startedAt": iso(vstart), "finishedAt": iso(vstart + timedelta(seconds=vdur)), "durationSec": vdur,
                     "selectedSuites": [{"suiteId": x["id"], "reason": "Changed files match path rules"} for x in rsuites], "retestOf": None,
                     "checkRun": {"name": "ForgePilot ShipSafe", "conclusion": "success", "detailsUrl": f"/app/shipsafe/runs/{rid}"},
                     "totals": {"passed": sum(x["testCount"] for x in rsuites), "failed": 0, "flaky": R.randint(0, 1), "skipped": 0}, "billedBrowserMinutes": round(vdur / 60 * 1.6, 1)})
        num = 100 + hist_n
        merged_at = vstart + timedelta(hours=R.randint(2, 40))
        prs.append({"id": f"pr_{tid}", "orgId": org_id, "repositoryId": rep["id"], "number": num, "title": title, "url": f"{rep['url']}/pull/{num}",
                    "author": {"type": "agent", "id": ag["id"], "sessionId": sid}, "openedBy": tasks[-1]["createdBy"], "branch": f"fp/{tid}", "baseSha": sha(), "headSha": runs[-1]["headSha"],
                    "status": "merged" if outcome == "merged" else "closed", "openedAt": iso(end + timedelta(seconds=30)),
                    "mergedAt": iso(merged_at) if outcome == "merged" else None, "mergedBy": R.choice(org_users) if outcome == "merged" else None,
                    "aiAuthoredPct": R.randint(65, 98), "additions": R.randint(20, 300), "deletions": R.randint(0, 80), "changedFiles": R.randint(1, 9), "taskId": tid,
                    "checkStatus": "passed", "reviewers": [R.choice(org_users)], "reviewState": "approved" if outcome == "merged" else "changes_requested", "latestRunId": rid})
    # a few human PRs closed without merge, for honest acceptance rates
    for k in range(3 if org_id != "ws_maya" else 0):
        rep = R.choice(org_repos)
        hist_n += 1
        rid = nid("run")
        at = ago(days=R.uniform(10, 50))
        runs.append({"id": rid, "orgId": org_id, "repositoryId": rep["id"], "pullRequestId": f"pr_hx{hist_n}", "trigger": "pull_request.opened", "headSha": sha(), "baseSha": sha(), "branch": "experiment",
                     "environment": {"name": "preview", "url": None, "node": None, "python": None, "worker": "ss-worker-20", "region": "us-east"}, "status": "failed",
                     "startedAt": iso(at), "finishedAt": iso(at + timedelta(minutes=6)), "durationSec": 360, "selectedSuites": [], "retestOf": None,
                     "checkRun": {"name": "ForgePilot ShipSafe", "conclusion": "failure", "detailsUrl": f"/app/shipsafe/runs/{rid}"}, "totals": {"passed": 40, "failed": 2, "flaky": 0, "skipped": 0}, "billedBrowserMinutes": 9.6})
        prs.append({"id": f"pr_hx{hist_n}", "orgId": org_id, "repositoryId": rep["id"], "number": 50 + hist_n, "title": "Experiment: alternative caching layer", "url": f"{rep['url']}/pull/{50 + hist_n}",
                    "author": {"type": "person", "id": R.choice(org_users), "sessionId": None}, "openedBy": org_users[0], "branch": "experiment", "baseSha": sha(), "headSha": runs[-1]["headSha"],
                    "status": "closed", "openedAt": iso(at - timedelta(minutes=2)), "mergedAt": None, "mergedBy": None, "aiAuthoredPct": 20, "additions": 120, "deletions": 40, "changedFiles": 6,
                    "taskId": None, "checkStatus": "failed", "reviewers": [], "reviewState": "changes_requested", "latestRunId": rid})

# --------------------------------------------------------------------------- approvals
approvals = [
    {"id": "apr_001", "orgId": "ws_lumen", "action": "modify_protected_path", "status": "pending",
     "title": "Agent wants to write migrations/0042_payouts_status_idx.py",
     "context": {"taskId": "task_004", "sessionId": "sess_004_1", "repositoryId": "repo_payments", "path": "migrations/0042_payouts_status_idx.py", "headSha": None,
                 "diffPreview": "+ op.create_index('ix_payouts_status', 'payouts', ['status'], postgresql_concurrently=True)"},
     "requestedBy": {"type": "agent", "id": "agent_claude_lumen", "sessionId": "sess_004_1"}, "requestedAt": iso(ago(minutes=38)),
     "expiresAt": iso(NOW + timedelta(hours=23)), "approverRole": "admin", "decidedBy": None, "decidedAt": None, "comment": None},
    {"id": "apr_002", "orgId": "ws_lumen", "action": "network_egress", "status": "pending",
     "title": "Agent requests network access to api.exchangerate.example",
     "context": {"taskId": "task_002", "sessionId": "sess_002_1", "repositoryId": "repo_payments", "host": "api.exchangerate.example", "reason": "Fetch fixture rates for a test"},
     "requestedBy": {"type": "agent", "id": "agent_claude_lumen", "sessionId": "sess_002_1"}, "requestedAt": iso(ago(minutes=6)),
     "expiresAt": iso(NOW + timedelta(hours=2)), "approverRole": "admin", "decidedBy": None, "decidedAt": None, "comment": None},
    {"id": "apr_003", "orgId": "ws_lumen", "action": "budget_increase", "status": "pending",
     "title": "Raise monthly execution budget from $400 to $600",
     "context": {"currentUsd": 400, "requestedUsd": 600, "reason": "Two large migrations planned this month"},
     "requestedBy": {"type": "person", "id": "u_dev", "sessionId": None}, "requestedAt": iso(ago(hours=5)),
     "expiresAt": iso(NOW + timedelta(days=3)), "approverRole": "owner", "decidedBy": None, "decidedAt": None, "comment": None},
    {"id": "apr_004", "orgId": "ws_lumen", "action": "access_secret", "status": "rejected",
     "title": "Agent requested STRIPE_LIVE_KEY",
     "context": {"taskId": "task_008", "sessionId": "sess_008_1", "secret": "STRIPE_LIVE_KEY"},
     "requestedBy": {"type": "agent", "id": "agent_claude_lumen", "sessionId": "sess_008_1"}, "requestedAt": iso(ago(days=9)),
     "expiresAt": iso(ago(days=8)), "approverRole": "owner", "decidedBy": "u_maya", "decidedAt": iso(ago(days=9) + timedelta(minutes=4)),
     "comment": "Use the test-mode key from the sandbox vault instead."},
    {"id": "apr_005", "orgId": "ws_lumen", "action": "run_migration", "status": "approved",
     "title": "Run migration 0041 against the preview database",
     "context": {"taskId": "task_009", "environment": "preview"}, "requestedBy": {"type": "agent", "id": "agent_codex_lumen", "sessionId": "sess_009_1"},
     "requestedAt": iso(ago(days=13)), "expiresAt": iso(ago(days=12)), "approverRole": "admin", "decidedBy": "u_dev", "decidedAt": iso(ago(days=13) + timedelta(minutes=12)), "comment": "Preview only — fine."},
    {"id": "apr_006", "orgId": "ws_northwind", "action": "modify_protected_path", "status": "pending",
     "title": "Agent wants to edit .github/workflows/ci.yml",
     "context": {"taskId": "task_018", "sessionId": "sess_018_1", "repositoryId": "repo_harbor", "path": ".github/workflows/ci.yml",
                 "diffPreview": "-        node-version: 20\n+        node-version: 22"},
     "requestedBy": {"type": "agent", "id": "agent_claude_nw", "sessionId": "sess_018_1"}, "requestedAt": iso(ago(minutes=20)),
     "expiresAt": iso(NOW + timedelta(hours=20)), "approverRole": "admin", "decidedBy": None, "decidedAt": None, "comment": None},
]

# --------------------------------------------------------------------------- usage (60 days daily) & invoices
METERS = ["agent_minutes", "browser_minutes", "test_runs", "scan_runs", "storage_gb"]
usage = []
scale = {"ws_lumen": 1.0, "ws_northwind": 1.8, "ws_maya": 0.06}
for o in orgs:
    for d in range(60, -1, -1):
        day = (NOW - timedelta(days=d)).strftime("%Y-%m-%d")
        weekday = (NOW - timedelta(days=d)).weekday() < 5
        f = scale[o["id"]] * (1 if weekday else 0.35) * (1 + (60 - d) / 120)
        projs = [p["id"] for p in projects if p["orgId"] == o["id"]]
        for p in projs:
            pf = f / len(projs) * R.uniform(0.6, 1.4)
            for agent in [a for a in agents if a["orgId"] == o["id"]]:
                mins = round(R.uniform(30, 90) * pf * (0.7 if agent["provider"] == "openai_codex" else 1), 1)
                usage.append({"orgId": o["id"], "date": day, "projectId": p, "meter": "agent_minutes", "provider": agent["provider"], "units": mins,
                              "costUsd": round(mins * (0.12 if agent["provider"] == "claude_code" else 0.10), 2)})
            bm = round(R.uniform(40, 140) * pf, 1)
            usage.append({"orgId": o["id"], "date": day, "projectId": p, "meter": "browser_minutes", "provider": "shipsafe", "units": bm, "costUsd": round(bm * 0.02, 2)})
            tr = max(0, round(R.uniform(6, 22) * pf))
            usage.append({"orgId": o["id"], "date": day, "projectId": p, "meter": "test_runs", "provider": "shipsafe", "units": tr, "costUsd": 0})
            usage.append({"orgId": o["id"], "date": day, "projectId": p, "meter": "scan_runs", "provider": "codekeeper", "units": 1 if weekday else 0, "costUsd": 0})

invoices = []
PLAN_PRICE = {"free": 0, "developer": 29, "pro": 79, "team": 199, "business": 499}
for o in orgs:
    for m in range(1, 5):
        month_start = (NOW.replace(day=1) - timedelta(days=1)).replace(day=1)
        y, mo = NOW.year, NOW.month - m
        while mo <= 0:
            mo += 12
            y -= 1
        base = PLAN_PRICE[o["plan"]] * (10 if o["billingCycle"] == "annual" and m == 1 else (0 if o["billingCycle"] == "annual" else 1))
        over = round(R.uniform(0, 380) * scale[o["id"]], 2)
        invoices.append({"id": f"in_{o['slug']}_{y}{mo:02d}", "orgId": o["id"], "period": f"{y}-{mo:02d}", "status": "paid",
                         "subscriptionUsd": base, "usageUsd": over, "totalUsd": round(base + over, 2), "issuedAt": f"{y}-{mo:02d}-28T00:00:00Z"})

# --------------------------------------------------------------------------- audit log & notifications
audit = []
def log(org, actor, action, resource, at, detail=""):
    audit.append({"id": nid("aud"), "orgId": org, "actor": actor, "action": action, "resource": resource, "at": iso(at), "detail": detail, "ip": "203.0.113." + str(R.randint(2, 250)) if actor["type"] == "person" else None})

for t in tasks:
    log(t["orgId"], {"type": "person", "id": t["createdBy"]}, "task.created", f"task:{t['id']}", datetime.strptime(t["createdAt"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc), t["title"])
for s in sessions:
    st = datetime.strptime(s["startedAt"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    log(s["orgId"], {"type": "agent", "id": s["agentId"]}, "agent.session_started", f"session:{s['id']}", st, f"attempt {s['attempt']}")
    if s["endedAt"]:
        log(s["orgId"], {"type": "agent", "id": s["agentId"]}, f"agent.session_{s['status']}", f"session:{s['id']}", datetime.strptime(s["endedAt"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc))
for p in prs:
    log(p["orgId"], {"type": "agent" if p["author"]["type"] == "agent" else "person", "id": p["author"]["id"]}, "pull_request.opened", f"pr:{p['id']}", datetime.strptime(p["openedAt"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc), f"#{p['number']} {p['title']}")
    if p["mergedAt"]:
        log(p["orgId"], {"type": "person", "id": p["mergedBy"]}, "pull_request.merged", f"pr:{p['id']}", datetime.strptime(p["mergedAt"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc), "merged in GitHub")
for a in approvals:
    log(a["orgId"], a["requestedBy"] if a["requestedBy"]["type"] == "person" else {"type": "agent", "id": a["requestedBy"]["id"]}, "approval.requested", f"approval:{a['id']}", datetime.strptime(a["requestedAt"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc), a["title"])
    if a["decidedAt"]:
        log(a["orgId"], {"type": "person", "id": a["decidedBy"]}, f"approval.{a['status']}", f"approval:{a['id']}", datetime.strptime(a["decidedAt"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc), a.get("comment") or "")
log("ws_lumen", {"type": "person", "id": "u_maya"}, "member.invited", "invitation:inv_001", ago(days=2), "sam@lumenlabs.example as member")
log("ws_lumen", {"type": "person", "id": "u_dev"}, "finding.suppressed", "finding", ago(days=6), "Major upgrade planned for Q1")
log("ws_lumen", {"type": "system", "id": "integrations"}, "integration.error", "integration:sentry", ago(days=3), "Token revoked")
log("ws_lumen", {"type": "person", "id": "u_maya"}, "policy.updated", "policy", ago(days=12), "Added infra/** to protected paths")
audit.sort(key=lambda x: x["at"], reverse=True)

notifications = [
    {"id": "ntf_1", "orgId": "ws_lumen", "userId": None, "kind": "approval", "title": "Approval needed: agent wants to write a migration", "body": "Payments API · Add a migration for the payouts.status index", "href": "/app/approvals", "at": iso(ago(minutes=38)), "read": False},
    {"id": "ntf_2", "orgId": "ws_lumen", "userId": None, "kind": "test_failed", "title": "ShipSafe failed on PR #300", "body": "Redesign billing settings page · 1 product defect, 1 flaky", "href": "/app/pull-requests/pr_h1", "at": iso(ago(hours=10)), "read": False},
    {"id": "ntf_3", "orgId": "ws_lumen", "userId": None, "kind": "review_ready", "title": "3 agent PRs are ready for review", "body": "Saved filters · Dark-mode contrast · cryptography upgrade", "href": "/app/pull-requests", "at": iso(ago(hours=3)), "read": False},
    {"id": "ntf_4", "orgId": "ws_lumen", "userId": None, "kind": "finding", "title": "Critical advisory in lumen/ledger-worker", "body": "cryptography 41.0.5 — a maintenance task was created", "href": "/app/codekeeper/findings", "at": iso(ago(days=1)), "read": True},
    {"id": "ntf_5", "orgId": "ws_lumen", "userId": None, "kind": "budget", "title": "Projected to exceed this month's execution budget", "body": "On pace for ~$460 against a $400 budget · hard cap on", "href": "/app/billing", "at": iso(ago(days=1, hours=3)), "read": True},
    {"id": "ntf_6", "orgId": "ws_northwind", "userId": None, "kind": "test_failed", "title": "ShipSafe failed on PR #320 (Fieldstone)", "body": "Gift card checkout flow · critical product defect", "href": "/app/pull-requests/pr_h5", "at": iso(ago(hours=8)), "read": False},
    {"id": "ntf_7", "orgId": "ws_northwind", "userId": None, "kind": "approval", "title": "Approval needed: CI workflow change", "body": "Harbor portal · Upgrade Next.js 15 → 16", "href": "/app/approvals", "at": iso(ago(minutes=20)), "read": False},
    {"id": "ntf_8", "orgId": "ws_maya", "userId": None, "kind": "review_ready", "title": "Agent PR ready: cache recipe generations", "body": "mayachen/recipe-ai", "href": "/app/pull-requests", "at": iso(ago(hours=20)), "read": False},
]

api_keys = [
    {"id": "key_1", "orgId": "ws_lumen", "name": "CI pipeline", "prefix": "fp_live_3kQ9", "scopes": ["runs:write", "runs:read"], "createdBy": "u_dev", "createdAt": iso(ago(days=80)), "lastUsedAt": iso(ago(hours=1))},
    {"id": "key_2", "orgId": "ws_lumen", "name": "Internal dashboard (read-only)", "prefix": "fp_live_8mWx", "scopes": ["read"], "createdBy": "u_maya", "createdAt": iso(ago(days=30)), "lastUsedAt": iso(ago(days=2))},
]

data = {
    "meta": {"note": "MOCK DATA for frontend development. All companies, people, repositories and advisories are fictional. Advisory ids use a DEMO- prefix.",
             "generatedAt": iso(NOW), "version": 3},
    "users": users, "organizations": orgs, "memberships": memberships, "invitations": invitations,
    "projects": projects, "repositories": repositories, "integrations": integrations, "agents": agents, "policies": policies,
    "testSuites": suites, "dependencies": dependencies, "findings": findings, "healthHistory": healthHistory, "scans": scans,
    "tasks": tasks, "sessions": sessions, "workspaces": workspaces, "pullRequests": prs, "testRuns": runs, "testResults": results, "bugs": bugs,
    "approvals": approvals, "usageRecords": usage, "invoices": invoices, "auditLogs": audit, "notifications": notifications, "apiKeys": api_keys,
}
with open(OUT, "w") as fh:
    json.dump(data, fh, indent=1)
    fh.write("\n")
print({k: len(v) for k, v in data.items() if isinstance(v, list)})
