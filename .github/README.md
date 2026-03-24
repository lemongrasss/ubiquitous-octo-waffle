# Agentic Document Review Workflow

This directory contains the automated, agentic document review system for the repository.

## How It Works

The workflow runs daily at 9am UTC and:

1. **Checks each document** in `docs/` by looking at the last git commit timestamp for the file
2. **Determines if review is needed** when the file hasn't been modified in over 30 days
3. **Fetches team members** from the GitHub team [lemongrasss/matts-test-team](https://github.com/orgs/lemongrasss/teams/matts-test-team) via the GitHub API
4. **Gathers context** by collecting recently opened and closed issues in the repository
5. **Creates a GitHub Issue** if any documents are stale:
   - Lists which documents need review and when they were last modified
   - Includes recent issues for context so reviewers can identify documentation gaps
   - Assigns a random team member for oversight
   - Labels the issue with `doc-review`
6. **Avoids duplicates** — If an open `doc-review` issue already exists, no new issue is created
7. **Triggers Copilot coding agent** — A separate workflow (`copilot-review.yml`) listens for the `doc-review` label. When the label is applied (either automatically by `doc-review.yml` or manually), it starts a Copilot coding agent session that reviews the stale documentation and opens a pull request with improvements

## Files

- `workflows/doc-review.yml` — GitHub Actions workflow that identifies stale docs and creates review issues
- `workflows/copilot-review.yml` — GitHub Actions workflow that triggers Copilot coding agent when a `doc-review` label is applied to an issue

## Key Differences from the Previous Workflow

| Previous | Current |
|---|---|
| Used `reviewed_at` YAML front matter in each doc | Uses git commit timestamps — no metadata in docs |
| Read team members from a static `rotation_members.yml` file | Fetches team members dynamically from a GitHub Team |
| Ran custom Node.js scripts to check and update review dates | Single workflow step using shell commands and `gh` CLI |
| Created PRs directly with only a date bump | Creates issues for agentic review with context, then automatically triggers Copilot coding agent |
| Required a separate PR check workflow for front matter validation | No PR check needed — review status is derived from git history |
| Maintained round-robin state in a JSON file | Stateless — checks all docs each run |

## Manual Triggering

You can manually trigger the workflow from the Actions tab in GitHub using the "Run workflow" button.

## Document Format

Documents are plain markdown files in `docs/`. No front matter or special metadata is required — the review system uses git history to track when each file was last modified.
