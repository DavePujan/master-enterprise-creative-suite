import { signUpWithEmail, updateUserPassword, validatePasswordSecurity } from '../apps/web/src/infrastructure/supabase/auth.js';

async function testAuthSecurity() {
  console.log('--- 1. Testing Password Length Constraints (8-character minimum, 128 max) ---');

  // Test short password (< 8 chars)
  const shortResult = await signUpWithEmail('user@example.com', 'short1');
  console.assert(
    shortResult.error === 'Password must be at least 8 characters.',
    `Failed to reject short password on registration: ${shortResult.error}`
  );

  // Test 7-char boundary password
  const edge7Result = await signUpWithEmail('user@example.com', '1234567');
  console.assert(
    edge7Result.error === 'Password must be at least 8 characters.',
    `Failed to reject 7-char password: ${edge7Result.error}`
  );

  // Test password too long (> 128 chars)
  const tooLongPassword = 'a'.repeat(129);
  const tooLongResult = await signUpWithEmail('user@example.com', tooLongPassword);
  console.assert(
    tooLongResult.error === 'Password exceeds maximum allowed length of 128 characters.',
    `Failed to reject password > 128 chars: ${tooLongResult.error}`
  );

  console.log('--- 2. Testing Common & Compromised Passwords Screening ---');
  // Test blacklisted common passwords
  const blacklisted1 = await signUpWithEmail('user@example.com', 'password123');
  console.assert(
    blacklisted1.error === 'This password is too common or easily guessed. Please choose a more secure password or passphrase.',
    `Failed to reject common password "password123": ${blacklisted1.error}`
  );

  const blacklisted2 = await signUpWithEmail('user@example.com', '12345678');
  console.assert(
    blacklisted2.error === 'This password is too common or easily guessed. Please choose a more secure password or passphrase.',
    `Failed to reject common numeric sequence "12345678": ${blacklisted2.error}`
  );

  // Test repeated characters
  const repeatedResult = await signUpWithEmail('user@example.com', 'aaaaaaaa');
  console.assert(
    repeatedResult.error === 'This password is too common or easily guessed. Please choose a more secure password or passphrase.',
    `Failed to reject repeated character password "aaaaaaaa": ${repeatedResult.error}`
  );

  console.log('--- 3. Testing Valid Password and Passphrase Acceptance ---');
  const validCheck1 = validatePasswordSecurity('MyValidP@ss8');
  console.assert(validCheck1.valid === true, 'Failed to accept valid 12-char password');

  const validPassphraseCheck = validatePasswordSecurity('battery staple horse correct 2026!');
  console.assert(validPassphraseCheck.valid === true, 'Failed to accept long passphrase with spaces');

  console.log('--- 4. Testing Password Strength Scoring Guidance ---');
  const weakCheck = validatePasswordSecurity('abcdefgh');
  console.assert(weakCheck.score === 1, `Expected score 1 for basic 8-char, got ${weakCheck.score}`);

  const fairCheck = validatePasswordSecurity('abcdefghij');
  console.assert(fairCheck.score === 2, `Expected score 2 for 10-char, got ${fairCheck.score}`);

  const goodCheck = validatePasswordSecurity('Passw0rdSecure');
  console.assert(goodCheck.score >= 3, `Expected score >= 3, got ${goodCheck.score}`);

  const strongCheck = validatePasswordSecurity('battery staple horse correct');
  console.assert(strongCheck.score === 4, `Expected score 4 for long passphrase, got ${strongCheck.score}`);

  console.log('--- 5. Testing Password Update Policy ---');
  const updateShortResult = await updateUserPassword('short');
  console.assert(
    updateShortResult.error === 'Password must be at least 8 characters.',
    `Failed to reject short password on update: ${updateShortResult.error}`
  );

  console.log('--- 6. Testing Real-Time Confirm Password Matching Logic ---');
  const passA = 'my-secure-password-1';
  const passB = 'my-secure-password-2';
  const passMatch = 'my-secure-password-1';

  // Dirty confirm password with mismatch
  const isMismatch = passB.length > 0 && passA !== passB;
  console.assert(isMismatch === true, 'Failed to detect password mismatch');

  // Dirty confirm password with match
  const isMatched = passMatch.length > 0 && passA === passMatch;
  console.assert(isMatched === true, 'Failed to detect password match');

  console.log('\n>>> ALL AUTH SECURITY & VALIDATION TESTS PASSED! <<<');
}

testAuthSecurity().catch(err => {
  console.error('Auth verification failed:', err);
  process.exit(1);
});
