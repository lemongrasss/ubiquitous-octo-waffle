#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
  const match = content.match(/^reviewed at (\d{4}-\d{2}-\d{2})/im);
  if (match) {
    return new Date(match[1]);
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
  
  // Check if file already has a review line
  const hasReviewLine = /^reviewed at \d{4}-\d{2}-\d{2}/im.test(content);
  
  if (hasReviewLine) {
    // Replace existing review line
    return content.replace(/^reviewed at \d{4}-\d{2}-\d{2}/im, reviewLine);
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
      setOutput('file_path', path.relative(path.join(__dirname, '../..'), filePath));
      setOutput('assignee', assignee);
    } else {
      console.log('Document is up to date, no review needed');
      setOutput('needs_review', 'false');
    }

    // Update state for next run
    state.lastIndex = index;
    saveState(state);
    console.log(`Updated state: lastIndex=${index}`);

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
