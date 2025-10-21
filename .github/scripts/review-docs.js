#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DOCS_DIR = path.join(__dirname, '../../docs');
const STATE_FILE = path.join(__dirname, '../state/doc-review-state.json');
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

// Date formatting helper
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parse "reviewed at yyyy-mm-dd" from file content
function getReviewDate(content) {
  const match = content.match(/^reviewed at (\d{4}-\d{2}-\d{2})/m);
  if (match) {
    const dateString = match[1];
    const date = new Date(dateString);
    // Validate the date is valid and matches the original format
    if (isNaN(date.getTime())) {
      return null;
    }
    // Verify the date string matches what we'd format back
    const [year, month, day] = dateString.split('-').map(Number);
    if (date.getFullYear() !== year || 
        date.getMonth() + 1 !== month || 
        date.getDate() !== day) {
      return null;
    }
    return date;
  }
  return null;
}

// Check if review is needed (missing or older than 1 month)
function needsReview(reviewDate) {
  if (!reviewDate) {
    return true; // No review date found
  }
  const now = new Date();
  const timeDiff = now - reviewDate;
  return timeDiff > ONE_MONTH_MS;
}

// Load or initialize state
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading state:', error);
  }
  return { lastIndex: -1 };
}

// Save state
function saveState(state) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Error saving state:', error);
  }
}

// Get all markdown files in docs directory
function getDocFiles() {
  const files = fs.readdirSync(DOCS_DIR)
    .filter(file => file.endsWith('.md'))
    .sort(); // Ensure consistent ordering
  return files;
}

// Select next file using round-robin
function selectNextFile(files, lastIndex) {
  if (files.length === 0) {
    return null;
  }
  const nextIndex = (lastIndex + 1) % files.length;
  return { file: files[nextIndex], index: nextIndex };
}

// Update review date in file content
function updateReviewDate(content, newDate) {
  const dateString = formatDate(newDate);
  const reviewLine = `reviewed at ${dateString}`;
  
  // Check if file already has a review line (case-sensitive)
  const hasReviewLine = /^reviewed at \d{4}-\d{2}-\d{2}/m.test(content);
  
  if (hasReviewLine) {
    // Replace existing review line (case-sensitive)
    return content.replace(/^reviewed at \d{4}-\d{2}-\d{2}/m, reviewLine);
  } else {
    // Add review line at the beginning
    return reviewLine + '\n\n' + content;
  }
}

// Select random team member
function selectRandomAssignee(teamMembers) {
  const members = teamMembers.split(',').filter(m => m.trim());
  if (members.length === 0) {
    throw new Error('No team members available');
  }
  const randomIndex = Math.floor(Math.random() * members.length);
  return members[randomIndex].trim();
}

// Check if there's an open PR that includes this document
function hasExistingPR(filePath) {
  try {
    // Get all open PRs
    const prsJson = execSync('gh pr list --state open --json number,files', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const prs = JSON.parse(prsJson);
    
    // Check if any PR includes this file
    for (const pr of prs) {
      if (pr.files && pr.files.some(file => file.path === filePath)) {
        console.log(`Found existing PR #${pr.number} that includes ${filePath}`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking for existing PRs:', error.message);
    // If we can't check for PRs, we should not block the process
    // Return false to allow PR creation
    return false;
  }
}

// Main function
function main() {
  try {
    // Get all doc files
    const files = getDocFiles();
    if (files.length === 0) {
      console.log('No markdown files found in docs directory');
      setOutput('needs_review', 'false');
      return;
    }

    console.log(`Found ${files.length} document(s): ${files.join(', ')}`);

    // Load state
    const state = loadState();
    console.log(`Last processed index: ${state.lastIndex}`);

    // Keep track of starting point to avoid infinite loop
    const startIndex = state.lastIndex;
    let checkedCount = 0;

    // Loop through documents until we find one that needs review or check all documents
    while (checkedCount < files.length) {
      // Select next file
      const selection = selectNextFile(files, state.lastIndex);
      if (!selection) {
        console.log('No files to process');
        setOutput('needs_review', 'false');
        return;
      }

      const { file, index } = selection;
      const filePath = path.join(DOCS_DIR, file);
      console.log(`Checking file: ${file} (index ${index})`);

      // Read file content
      const content = fs.readFileSync(filePath, 'utf8');

      // Check review date
      const reviewDate = getReviewDate(content);
      console.log(`Review date: ${reviewDate ? formatDate(reviewDate) : 'not found'}`);

      if (needsReview(reviewDate)) {
        console.log('Document needs review');

        // Check if there's already an open PR for this document
        const relativeFilePath = path.relative(path.join(__dirname, '../..'), filePath);
        if (hasExistingPR(relativeFilePath)) {
          console.log('Skipping: Open PR already exists for this document');
          // Update state to move to next document
          state.lastIndex = index;
          checkedCount++;
          continue; // Skip to next document
        }

        // Update review date
        const today = new Date();
        const updatedContent = updateReviewDate(content, today);
        fs.writeFileSync(filePath, updatedContent);
        console.log(`Updated review date to ${formatDate(today)}`);

        // Select random assignee
        const teamMembers = process.env.TEAM_MEMBERS || '';
        if (!teamMembers) {
          throw new Error('TEAM_MEMBERS environment variable not set');
        }
        const assignee = selectRandomAssignee(teamMembers);
        console.log(`Selected assignee: ${assignee}`);

        // Set outputs for GitHub Actions
        setOutput('needs_review', 'true');
        setOutput('file_path', relativeFilePath);
        setOutput('assignee', assignee);

        // Update state for next run
        state.lastIndex = index;
        saveState(state);
        console.log(`Updated state: lastIndex=${index}`);
        
        return; // Found a document that needs review, exit
      } else {
        console.log('Document is up to date, moving to next document');
        // Update state to move to next document
        state.lastIndex = index;
        checkedCount++;
      }
    }

    // If we've checked all documents and none need review
    console.log('All documents are up to date, no review needed');
    setOutput('needs_review', 'false');
    
    // Save final state
    saveState(state);
    console.log(`Updated state: lastIndex=${state.lastIndex}`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Helper to set GitHub Actions output
function setOutput(name, value) {
  const output = `${name}=${value}\n`;
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
  }
  console.log(`Output: ${name}=${value}`);
}

// Run main function
main();
