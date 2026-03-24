# ubiquitous-octo-waffle

A repository with automated, agentic documentation review powered by [GitHub Agentic Workflows](https://github.github.com/gh-aw/).

## How It Works

This repository uses [GitHub Agentic Workflows (gh-aw)](https://github.github.com/gh-aw/) to keep documentation up to date. Instead of traditional YAML-based GitHub Actions with shell scripts, the workflows are written in **Markdown** — combining YAML frontmatter for configuration with natural language instructions for an AI agent.

1. **Runs on a schedule** — The `doc-review.md` agentic workflow runs daily to check for stale documentation.
2. **Uses git history** — The AI agent checks the last commit timestamp for each file in `docs/` to determine when it was last reviewed. No front matter or metadata is required in the documents themselves.
3. **Pulls reviewers from a GitHub Team** — Team members are fetched dynamically from the [lemongrasss/matts-test-team](https://github.com/orgs/lemongrasss/teams/matts-test-team) GitHub team, eliminating the need for a static configuration file.
4. **Creates review issues** — When a document hasn't been updated in over 30 days, the AI agent creates a GitHub Issue with context about which docs are stale and what recent issues have been opened/closed in the repository.
5. **Automatically reviews documentation** — The `copilot-review.md` agentic workflow listens for the `doc-review` label being applied to an issue. When triggered, the AI agent reviews the stale documentation and opens a pull request with proposed improvements — no human action needed to kick off the review.

## Repository Structure

```
docs/                          # Documentation files (markdown)
.github/
  workflows/
    doc-review.md              # Agentic workflow: identifies stale docs and creates review issues
    copilot-review.md          # Agentic workflow: reviews docs and opens PRs on doc-review issues
```

## Configuration

Configuration is embedded in the YAML frontmatter of each workflow file. Key settings in `doc-review.md`:

- **Schedule**: Runs daily at 9am UTC (configurable via the `cron` schedule in frontmatter)
- **Review threshold**: 30 days (defined in the agent instructions)
- **Team**: `lemongrasss/matts-test-team` (used for assignee selection)

## Manual Triggering

You can manually trigger the review workflow from the **Actions** tab using the "Run workflow" button (via `workflow_dispatch`).

## Prerequisites

- **GitHub Agentic Workflows** must be enabled for this repository. See the [gh-aw documentation](https://github.github.com/gh-aw/) for setup instructions.
- The GitHub team (`lemongrasss/matts-test-team`) must be accessible to the workflow's token for reviewer assignment.
