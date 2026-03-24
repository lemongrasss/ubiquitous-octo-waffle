# Agentic Document Review Workflow

This directory contains the automated, agentic document review system for the repository, built using [GitHub Agentic Workflows (gh-aw)](https://github.github.com/gh-aw/).

## How It Works

The system uses two **Markdown-based agentic workflows** instead of traditional YAML GitHub Actions. Each workflow combines YAML frontmatter (for triggers, permissions, and tool configuration) with natural language instructions that an AI agent follows at runtime.

### `doc-review.md` — Stale Document Detection

Runs daily at 9am UTC and:

1. **Checks for existing issues** — If an open `doc-review` issue already exists, stops to avoid duplicates
2. **Checks each document** in `docs/` by looking at the last git commit timestamp for the file
3. **Determines if review is needed** when the file hasn't been modified in over 30 days
4. **Fetches team members** from the GitHub team [lemongrasss/matts-test-team](https://github.com/orgs/lemongrasss/teams/matts-test-team) via the GitHub API
5. **Gathers context** by collecting recently opened and closed issues in the repository
6. **Creates a GitHub Issue** if any documents are stale, with full context for reviewers

### `copilot-review.md` — AI Documentation Review

Triggered when the `doc-review` label is applied to an issue:

1. **Reads the issue body** to understand which documents need review
2. **Reviews each stale document** for accuracy, completeness, clarity, and relevance
3. **Makes improvements** to each document based on the review criteria
4. **Opens a pull request** with all documentation updates, referencing the triggering issue

## Files

- `workflows/doc-review.md` — Agentic workflow that identifies stale docs and creates review issues
- `workflows/copilot-review.md` — Agentic workflow that reviews documentation and opens PRs when `doc-review` label is applied

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Uses git commit timestamps | No metadata in docs — review status is derived from git history |
| Fetches team members from GitHub Team API | Stateless — no configuration files to maintain |
| Markdown-based agentic workflows (gh-aw) | AI agent interprets natural language instructions instead of rigid shell scripts |
| Safe outputs for write operations | Security guardrails ensure the agent can only create issues, labels, comments, and PRs |

## Manual Triggering

You can manually trigger the `doc-review.md` workflow from the Actions tab in GitHub using the "Run workflow" button.

## Document Format

Documents are plain markdown files in `docs/`. No front matter or special metadata is required — the review system uses git history to track when each file was last modified.
