# Automated Document Review Workflow

This directory contains the automated document review system for the repository.

## How It Works

The workflow runs every hour and:

1. **Selects a document** from the `docs/` folder using round-robin rotation
2. **Checks the review date** by looking for a `reviewed at yyyy-mm-dd` line at the top of the file
3. **Determines if review is needed** when:
   - No review date is found in the file
   - The review date is older than 30 days
4. **Creates a Pull Request** if review is needed:
   - Updates the `reviewed at` line with today's date
   - Creates a PR to the `main` branch
   - Randomly assigns a member from the `matt-test-team` team
   - Includes a message explaining the review requirement

## Files

- `workflows/doc-review.yml` - Main GitHub Actions workflow
- `scripts/review-docs.js` - Node.js script that handles the review logic
- `state/doc-review-state.json` - Tracks which document was last checked (for round-robin)

## Manual Triggering

You can manually trigger the workflow from the Actions tab in GitHub using the "Run workflow" button.

## Team Configuration

The workflow assigns PRs to random members of the `matt-test-team` team in the GitHub organization. Ensure this team exists and has appropriate members.

## Document Format

Documents should include a review date line at the top:

```markdown
reviewed at 2025-10-15

# Document Title

Content here...
```

If no review line exists, the workflow will add one when creating the PR.
