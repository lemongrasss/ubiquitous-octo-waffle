# ubiquitous-octo-waffle

A repository with automated, agentic documentation review powered by GitHub Actions and Copilot.

## How It Works

This repository uses an agentic workflow to keep documentation up to date. Instead of manually tracking review dates, the system:

1. **Runs on a schedule** — A GitHub Actions workflow runs daily to check for stale documentation.
2. **Uses git history** — The last commit timestamp for each file in `docs/` determines when it was last reviewed. No front matter or metadata is required in the documents themselves.
3. **Pulls reviewers from a GitHub Team** — Team members are fetched dynamically from the [lemongrasss/matts-test-team](https://github.com/orgs/lemongrasss/teams/matts-test-team) GitHub team, eliminating the need for a static configuration file.
4. **Creates review issues** — When a document hasn't been updated in over 30 days, the workflow creates a GitHub Issue with context about which docs are stale and what recent issues have been opened/closed in the repository.
5. **Automatically triggers Copilot** — A second workflow listens for the `doc-review` label being applied to an issue. When triggered, it starts a Copilot coding agent session that reviews the documentation and opens a pull request with proposed improvements — no human action needed to kick off the review.

## Repository Structure

```
docs/                          # Documentation files (markdown)
.github/
  workflows/
    doc-review.yml             # Identifies stale docs and creates review issues
    copilot-review.yml         # Triggers Copilot coding agent on doc-review issues
```

## Configuration

The workflow can be configured via environment variables in `.github/workflows/doc-review.yml`:

| Variable | Default | Description |
|---|---|---|
| `REVIEW_THRESHOLD_DAYS` | `30` | Number of days before a document is considered stale |
| `TEAM_ORG` | `lemongrasss` | GitHub organization for the review team |
| `TEAM_SLUG` | `matts-test-team` | GitHub team slug for fetching reviewers |

## Manual Triggering

You can manually trigger the review workflow from the **Actions** tab using the "Run workflow" button.
