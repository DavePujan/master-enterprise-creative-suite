/**
 * CI Architectural Boundary Enforcement Script.
 * Verifies that physical import boundaries between apps/web, apps/api, and packages/* are 100% strictly maintained.
 * Exits with non-zero code if any boundary violation is detected.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

let violations = 0;

function reportViolation(file, reason) {
  console.error(`❌ BOUNDARY VIOLATION in ${path.relative(ROOT, file)}:\n   ${reason}`);
  violations++;
}

// 1. Check apps/web
const webFiles = walk(path.join(ROOT, 'apps/web'));
webFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');

  // Rule: web cannot import api
  if (/from ['"](?:@api\/|\.\.\/.*apps\/api)/.test(content)) {
    reportViolation(file, 'Frontend apps/web cannot import from apps/api.');
  }

  // Rule: web cannot import express
  if (/from ['"]express['"]/.test(content)) {
    reportViolation(file, 'Frontend apps/web cannot import express.');
  }

  // Rule: web cannot access server-only secrets directly
  if (/process\.env\.GEMINI_API_KEY|process\.env\.RAZORPAY_KEY_SECRET|process\.env\.FAL_KEY|process\.env\.SUPABASE_SERVICE_ROLE_KEY|process\.env\.DATABASE_URL/.test(content)) {
    reportViolation(file, 'Frontend apps/web cannot reference server-only environment variables.');
  }
});

// 2. Check apps/api
const apiFiles = walk(path.join(ROOT, 'apps/api'));
apiFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');

  // Rule: api cannot import web
  if (/from ['"](?:@web\/|\.\.\/.*apps\/web)/.test(content)) {
    reportViolation(file, 'Backend apps/api cannot import from apps/web.');
  }

  // Rule: api cannot import react
  if (/from ['"]react['"]|from ['"]react-dom['"]/.test(content)) {
    reportViolation(file, 'Backend apps/api cannot import React or React DOM.');
  }
});

// 3. Check packages
const packageFiles = walk(path.join(ROOT, 'packages'));
packageFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');

  // Rule: packages cannot import from apps
  if (/from ['"](?:@web\/|@api\/|\.\.\/.*apps\/)/.test(content)) {
    reportViolation(file, 'Shared packages cannot depend on application layers (apps/web or apps/api).');
  }

  // Rule: packages cannot import react or express
  if (/from ['"](?:react|react-dom|express)['"]/.test(content)) {
    reportViolation(file, 'Shared packages must remain platform-independent and cannot import React or Express.');
  }
});

if (violations > 0) {
  console.error(`\n🚨 Architecture boundary check FAILED with ${violations} violation(s).`);
  process.exit(1);
} else {
  console.log(`\n✅ Architecture boundary check PASSED. All ${webFiles.length + apiFiles.length + packageFiles.length} files conform to architectural isolation rules.`);
}
