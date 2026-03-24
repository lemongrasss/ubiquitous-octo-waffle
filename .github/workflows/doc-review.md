---
on:
  schedule:
    # Run daily at 9am UTC
    - cron: '0 9 * * *'
  workflow_dispatch:

timeout-minutes: 15

permissions:
  contents: read
  issues: write

tools:
  github:
    toolsets: [issues, labels]
  bash: true

safe-outputs:
  create-issue:
    title-prefix: "docs: "
    max: 1
  add-labels:
    allowed: [doc-review]
  add-comment:
    target: "*"

steps:
  - name: Checkout repository
    uses: actions/checkout@v4
    with:
      fetch-depth: 0
---

# Agentic Document Review

You are an AI agent responsible for identifying stale documentation in this repository and creating a GitHub Issue when documents need review. You work with the `docs/` directory and use git history to determine when files were last updated.

## Instructions

### Step 1: Check for Existing Open Review Issues

Before doing anything else, check if there is already an open issue with the `doc-review` label:
```bash
gh issue list --label "doc-review" --state open --limit 1 --json number,title --jq '.[0].number'
```

If an open `doc-review` issue already exists, **stop here** — do not create a duplicate. Report that an existing issue is already open and exit.

### Step 2: Identify Stale Documents

Check each markdown file in the `docs/` directory for staleness. A document is considered **stale** if it has not been modified (committed to) in the last **30 days**.

For each file in `docs/*.md`:
1. Get the last commit date using git:
   ```bash
   git log -1 --format="%aI" -- docs/<filename>
   ```
2. Compare that date against 30 days ago
3. If the file's last commit is older than 30 days, mark it as stale and note the last modified date

If **no documents are stale**, report that all documentation is up to date and stop.

### Step 3: Gather Context

Collect recent repository issues (open and recently closed) for context. This helps reviewers understand what has changed in the project:
```bash
gh issue list --state all --limit 20 --json number,title,state,createdAt,closedAt
```

Filter to issues that are currently open or were closed within the last 30 days.

Also fetch team members from the `lemongrasss/matts-test-team` GitHub team for assignment:
```bash
gh api "orgs/lemongrasss/teams/matts-test-team/members" --jq '.[].login'
```

If the team API call fails, proceed without an assignee.

### Step 4: Create the Review Issue

Ensure the `doc-review` label exists (create it if not):
```bash
gh label create "doc-review" --description "Automated documentation review" --color "0075ca" 2>/dev/null || true
```

Create a single GitHub Issue with the following structure:

**Title:** `docs: review stale documentation`

**Body template:**
```
## 📋 Automated Documentation Review

The following documentation files have not been updated in over **30 days** and need review:

- `<filename>` (last modified: <date>)
- ...

### Instructions

Please review each of the above documents and create a pull request with improvements. Consider:

1. **Accuracy** — Is the content still correct? Are there outdated references?
2. **Completeness** — Is anything missing that should be documented?
3. **Clarity** — Can the language be clearer or more concise?
4. **Relevance** — Does the document reflect the current state of the project?

### Recent Repository Issues for Context

The following issues have been recently opened or closed. Use these to inform whether documentation needs updating:

- #<number> [<state>]: <title>
- ...

### Guidelines

- Review each stale document listed above
- Make meaningful content improvements where the documentation is lacking
- Ensure documentation aligns with any changes referenced in recent issues
- Create a single pull request with all documentation updates
```

**Label:** `doc-review`

**Assignee:** Pick one random member from the team list (if available).

## Important Rules

- Never create a duplicate issue — always check for existing open `doc-review` issues first
- Use git commit timestamps, not file modification times, to determine staleness
- The 30-day threshold is the standard; do not change it
- If no team members can be fetched, create the issue without an assignee
- Do not fabricate data — if git history is unavailable for a file, note that it needs review
