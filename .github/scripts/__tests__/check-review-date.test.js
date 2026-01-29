const assert = require('assert');
const { formatDate, parseFrontMatter } = require('../check-review-date.js');

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

console.log('Running check-review-date.js tests...\n');

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
});

test('parseFrontMatter handles content without front matter', () => {
  const content = '# Title\n\nContent without front matter';
  const result = parseFrontMatter(content);
  
  assert.strictEqual(result.hasFrontMatter, false);
  assert.deepStrictEqual(result.frontMatter, {});
});

test('parseFrontMatter handles front matter with only reviewed_at', () => {
  const content = '---\nreviewed_at: 2025-10-15\n---\n\n# Title';
  const result = parseFrontMatter(content);
  
  assert.strictEqual(result.hasFrontMatter, true);
  assert.strictEqual(result.frontMatter.reviewed_at, '2025-10-15');
});

test('parseFrontMatter returns false for empty front matter', () => {
  const content = '---\n---\n\n# Title';
  const result = parseFrontMatter(content);
  
  // Empty front matter doesn't match the regex (requires at least one character)
  assert.strictEqual(result.hasFrontMatter, false);
});

// Summary
console.log(`\n${'─'.repeat(40)}`);
console.log(`Tests: ${passed} passed, ${failed} failed`);
console.log(`${'─'.repeat(40)}`);

if (failed > 0) {
  process.exit(1);
}
