# Automated Document Review Workflow

This directory contains the automated document review system for the repository.

## How It Works

The workflow runs every hour and:

1. **Selects a document** from the `docs/` folder using round-robin rotation
2. **Checks the review date** by reading the `reviewed_at` field from YAML front matter at the top of the file
3. **Determines if review is needed** when:
   - No front matter or review date is found in the file
   - The review date is older than 30 days
4. **Creates a Pull Request** if review is needed:
   - Updates the `reviewed_at` field in the front matter with today's date
   - Creates a PR to the `main` branch
   - Randomly assigns a member from the team defined in `scripts/rotation_members.yml`
   - Includes a message explaining the review requirement

## Files

- `workflows/doc-review.yml` - Main GitHub Actions workflow
- `scripts/review-docs.js` - Node.js script that handles the review logic
- `scripts/rotation_members.yml` - YAML file containing the list of team members for assignment
- `state/doc-review-state.json` - Tracks which document was last checked (for round-robin)

## Manual Triggering

You can manually trigger the workflow from the Actions tab in GitHub using the "Run workflow" button.

## Team Configuration

The workflow assigns PRs to random members defined in `scripts/rotation_members.yml`. To add or remove members, edit this file:

```yaml
members:
 - username1
 - username2
```

## Document Format

Documents should include a YAML front matter block at the top with a `reviewed_at` field:

```markdown
---
reviewed_at: 2025-10-15
---

# Document Title

Content here...
```

If no front matter exists, the workflow will add one when creating the PR.
