#!/usr/bin/env node

/**
 * This script checks that markdown files modified in a PR have their
 * reviewed_at date set to today's date. This ensures that when docs
 * are updated, they are also being reviewed.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Date formatting helper
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parse front matter from file content
function parseFrontMatter(content) {
  const frontMatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontMatterRegex);
  
  if (match) {
    const frontMatterText = match[1];
    
    // Parse YAML-like key-value pairs
    const frontMatter = {};
    frontMatterText.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        frontMatter[key] = value;
      }
    });
    
    return { frontMatter, hasFrontMatter: true };
  }
  
  return { frontMatter: {}, hasFrontMatter: false };
}

// Get list of modified markdown files from git diff
function getModifiedMarkdownFiles(baseBranch) {
  try {
    // Fetch the base branch to compare against
    execSync(`git fetch origin ${baseBranch}`, { stdio: 'pipe' });
    
    // Get list of changed files
    const output = execSync(`git diff --name-only origin/${baseBranch}...HEAD`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Filter to only markdown files in docs/
    return output
      .split('\n')
      .filter(file => file.startsWith('docs/') && file.endsWith('.md'))
      .filter(file => file.trim() !== '');
  } catch (error) {
    console.error('Error getting modified files:', error.message);
    return [];
  }
}

// Main function
function main() {
  const baseBranch = process.env.BASE_BRANCH || 'main';
  const today = formatDate(new Date());
  
  console.log(`Checking review dates for modified markdown files...`);
  console.log(`Today's date: ${today}`);
  console.log(`Base branch: ${baseBranch}`);
  console.log('');
  
  const modifiedFiles = getModifiedMarkdownFiles(baseBranch);
  
  if (modifiedFiles.length === 0) {
    console.log('No markdown files in docs/ were modified.');
    process.exit(0);
  }
  
  console.log(`Found ${modifiedFiles.length} modified markdown file(s):`);
  modifiedFiles.forEach(file => console.log(`  - ${file}`));
  console.log('');
  
  let hasErrors = false;
  
  for (const filePath of modifiedFiles) {
    // Check if file exists (it might have been deleted)
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${filePath}: File was deleted, skipping`);
      continue;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const { frontMatter, hasFrontMatter } = parseFrontMatter(content);
    
    if (!hasFrontMatter) {
      console.log(`❌ ${filePath}: Missing front matter. Please add front matter with reviewed_at: ${today}`);
      hasErrors = true;
      continue;
    }
    
    if (!frontMatter.reviewed_at) {
      console.log(`❌ ${filePath}: Missing reviewed_at field in front matter. Please add reviewed_at: ${today}`);
      hasErrors = true;
      continue;
    }
    
    if (frontMatter.reviewed_at !== today) {
      console.log(`❌ ${filePath}: reviewed_at is ${frontMatter.reviewed_at}, but should be ${today}`);
      console.log(`   Please update the reviewed_at date to today's date when modifying docs.`);
      hasErrors = true;
      continue;
    }
    
    console.log(`✓ ${filePath}: reviewed_at is correctly set to ${today}`);
  }
  
  console.log('');
  
  if (hasErrors) {
    console.log('❌ Review date check failed. Please update the reviewed_at dates.');
    process.exit(1);
  }
  
  console.log('✓ All modified markdown files have correct review dates.');
  process.exit(0);
}

// Run main function only when executed directly
if (require.main === module) {
  main();
}

// Export functions for testing
module.exports = {
  formatDate,
  parseFrontMatter,
  getModifiedMarkdownFiles
};
