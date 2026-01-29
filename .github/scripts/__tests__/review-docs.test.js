const assert = require('assert');
const {
  formatDate,
  parseFrontMatter,
  getReviewDate,
  needsReview,
  updateReviewDate,
  selectNextFile,
  selectRandomAssignee,
  ONE_MONTH_MS
} = require('../review-docs.js');

// Test counter
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

console.log('Running review-docs.js tests...\n');

// formatDate tests
test('formatDate formats date correctly', () => {
  const date = new Date('2025-03-15');
  assert.strictEqual(formatDate(date), '2025-03-15');
});

test('formatDate pads single digit months', () => {
  const date = new Date('2025-01-05');
  assert.strictEqual(formatDate(date), '2025-01-05');
});

test('formatDate pads single digit days', () => {
  const date = new Date('2025-12-01');
  assert.strictEqual(formatDate(date), '2025-12-01');
});

// parseFrontMatter tests
test('parseFrontMatter parses valid front matter', () => {
  const content = '---\nreviewed_at: 2025-10-15\nauthor: test\n---\n\n# Title\n\nContent';
  const result = parseFrontMatter(content);
  
  assert.strictEqual(result.hasFrontMatter, true);
  assert.strictEqual(result.frontMatter.reviewed_at, '2025-10-15');
  assert.strictEqual(result.frontMatter.author, 'test');
  assert.strictEqual(result.body, '# Title\n\nContent');
});

test('parseFrontMatter handles content without front matter', () => {
  const content = '# Title\n\nContent without front matter';
  const result = parseFrontMatter(content);
  
  assert.strictEqual(result.hasFrontMatter, false);
  assert.deepStrictEqual(result.frontMatter, {});
  assert.strictEqual(result.body, content);
});

test('parseFrontMatter handles empty front matter as no front matter', () => {
  const content = '---\n---\n\n# Title';
  const result = parseFrontMatter(content);
  
  // Empty front matter (no content between delimiters) is treated as no front matter
  assert.strictEqual(result.hasFrontMatter, false);
});

test('parseFrontMatter trims leading newlines from body', () => {
  const content = '---\nkey: value\n---\n\n\n# Title';
  const result = parseFrontMatter(content);
  
  assert.strictEqual(result.body, '# Title');
});

// getReviewDate tests
test('getReviewDate extracts date from front matter', () => {
  const content = '---\nreviewed_at: 2025-10-15\n---\n\n# Title';
  const date = getReviewDate(content);
  
  assert.ok(date instanceof Date);
  assert.strictEqual(date.getFullYear(), 2025);
  assert.strictEqual(date.getMonth(), 9); // October is month 9 (0-indexed)
  assert.strictEqual(date.getDate(), 15);
});

test('getReviewDate returns null for missing review date', () => {
  const content = '---\nauthor: test\n---\n\n# Title';
  const date = getReviewDate(content);
  
  assert.strictEqual(date, null);
});

test('getReviewDate returns null for content without front matter', () => {
  const content = '# Title\n\nContent';
  const date = getReviewDate(content);
  
  assert.strictEqual(date, null);
});

test('getReviewDate returns null for invalid date format', () => {
  const content = '---\nreviewed_at: invalid-date\n---\n\n# Title';
  const date = getReviewDate(content);
  
  assert.strictEqual(date, null);
});

test('getReviewDate returns null for invalid date values', () => {
  const content = '---\nreviewed_at: 2025-13-45\n---\n\n# Title';
  const date = getReviewDate(content);
  
  assert.strictEqual(date, null);
});

// needsReview tests
test('needsReview returns true when no date', () => {
  assert.strictEqual(needsReview(null), true);
});

test('needsReview returns true when date is older than 30 days', () => {
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 31);
  
  assert.strictEqual(needsReview(oldDate), true);
});

test('needsReview returns false when date is within 30 days', () => {
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 15);
  
  assert.strictEqual(needsReview(recentDate), false);
});

test('needsReview returns false when date is today', () => {
  const today = new Date();
  
  assert.strictEqual(needsReview(today), false);
});

// updateReviewDate tests
test('updateReviewDate updates existing front matter', () => {
  const content = '---\nreviewed_at: 2025-01-01\n---\n\n# Title\n\nContent';
  const newDate = new Date('2025-02-15');
  const result = updateReviewDate(content, newDate);
  
  assert.ok(result.includes('reviewed_at: 2025-02-15'));
  assert.ok(result.includes('# Title'));
  assert.ok(result.includes('Content'));
});

test('updateReviewDate adds front matter to content without it', () => {
  const content = '# Title\n\nContent';
  const newDate = new Date('2025-02-15');
  const result = updateReviewDate(content, newDate);
  
  assert.ok(result.startsWith('---\n'));
  assert.ok(result.includes('reviewed_at: 2025-02-15'));
  assert.ok(result.includes('# Title'));
});

test('updateReviewDate preserves other front matter fields', () => {
  const content = '---\nauthor: test\nreviewed_at: 2025-01-01\ntags: docs\n---\n\n# Title';
  const newDate = new Date('2025-02-15');
  const result = updateReviewDate(content, newDate);
  
  assert.ok(result.includes('author: test'));
  assert.ok(result.includes('tags: docs'));
  assert.ok(result.includes('reviewed_at: 2025-02-15'));
});

// selectNextFile tests
test('selectNextFile returns first file when lastIndex is -1', () => {
  const files = ['a.md', 'b.md', 'c.md'];
  const result = selectNextFile(files, -1);
  
  assert.deepStrictEqual(result, { file: 'a.md', index: 0 });
});

test('selectNextFile returns next file in sequence', () => {
  const files = ['a.md', 'b.md', 'c.md'];
  const result = selectNextFile(files, 0);
  
  assert.deepStrictEqual(result, { file: 'b.md', index: 1 });
});

test('selectNextFile wraps around to first file', () => {
  const files = ['a.md', 'b.md', 'c.md'];
  const result = selectNextFile(files, 2);
  
  assert.deepStrictEqual(result, { file: 'a.md', index: 0 });
});

test('selectNextFile returns null for empty array', () => {
  const result = selectNextFile([], 0);
  
  assert.strictEqual(result, null);
});

// selectRandomAssignee tests
test('selectRandomAssignee returns a member from the list', () => {
  const members = 'user1,user2,user3';
  const assignee = selectRandomAssignee(members);
  
  assert.ok(['user1', 'user2', 'user3'].includes(assignee));
});

test('selectRandomAssignee handles single member', () => {
  const members = 'onlyuser';
  const assignee = selectRandomAssignee(members);
  
  assert.strictEqual(assignee, 'onlyuser');
});

test('selectRandomAssignee trims whitespace', () => {
  const members = ' user1 , user2 ';
  const assignee = selectRandomAssignee(members);
  
  assert.ok(['user1', 'user2'].includes(assignee));
});

test('selectRandomAssignee throws for empty string', () => {
  assert.throws(() => {
    selectRandomAssignee('');
  }, /No team members available/);
});

test('selectRandomAssignee throws for whitespace only', () => {
  assert.throws(() => {
    selectRandomAssignee('   ,   ');
  }, /No team members available/);
});

// ONE_MONTH_MS constant test
test('ONE_MONTH_MS equals 30 days in milliseconds', () => {
  const expected = 30 * 24 * 60 * 60 * 1000;
  assert.strictEqual(ONE_MONTH_MS, expected);
});

// Summary
console.log(`\n${'─'.repeat(40)}`);
console.log(`Tests: ${passed} passed, ${failed} failed`);
console.log(`${'─'.repeat(40)}`);

if (failed > 0) {
  process.exit(1);
}
