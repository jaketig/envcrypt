const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { encrypt, decrypt } = require('../lib/encryption');

const testPassword = 'testpassword';
const testDir = __dirname;
const testFilePath = path.join(testDir, '.env.test');
const outputFilePath = path.join(testDir, '.envcrypt');
const configFilePath = path.join(testDir, '.envcrypt.config'); // New config file path

// Helper to read config file
const readConfig = () => {
    if (!fs.existsSync(configFilePath)) return null;
    try {
        return JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
    } catch {
        return null;
    }
};
// Helper to read config hash specifically
const readConfigHashTest = () => readConfig()?.last_decrypted_hash || null;

// Helper to read encrypted hash from .envcrypt
const readEncryptedHash = () => {
    if (!fs.existsSync(outputFilePath)) return null;
    try {
        return JSON.parse(fs.readFileSync(outputFilePath, 'utf8')).encrypted_content_hash;
    } catch {
        return null;
    }
};
// Helper to manually write config file
const writeConfig = (content) => fs.writeFileSync(configFilePath, JSON.stringify(content, null, 2));
// Helper to manually write encrypted file
const writeEncryptedFile = (content) => fs.writeFileSync(outputFilePath, JSON.stringify(content, null, 2));

beforeEach(() => {
  // Create a test .env file before each test
  fs.writeFileSync(testFilePath, 'TEST_ENV_VAR=Hello, World!');
  // Clean up config and output files before each test
  if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);
  if (fs.existsSync(configFilePath)) fs.unlinkSync(configFilePath); // Clean config file
});

afterAll(() => {
  // Final cleanup
  if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
  if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);
  if (fs.existsSync(configFilePath)) fs.unlinkSync(configFilePath); // Clean config file
});

test('encrypt should create an encrypted output file and update config hash', async () => {
  // Pre-seed config with a key to simulate real usage
  writeConfig({ key: 'somekey' });

  await encrypt(testDir, testPassword);
  expect(fs.existsSync(outputFilePath)).toBe(true);
  expect(fs.existsSync(configFilePath)).toBe(true); // Check config file exists

  const encryptedHash = readEncryptedHash();
  const configHash = readConfigHashTest(); // Read hash from config file
  expect(encryptedHash).toBeTruthy();
  expect(configHash).toBe(encryptedHash); // Config hash should match encrypted hash
  expect(readConfig()?.key).toBe('somekey'); // Ensure key was preserved
});

test('encrypt should exclude the output file from encryption', async () => {
  await encrypt(testDir, testPassword);
  const encryptedData = JSON.parse(fs.readFileSync(outputFilePath)); // Read raw data
  expect(encryptedData.files[outputFilePath]).toBeUndefined();
  expect(encryptedData.files['.envcrypt']).toBeUndefined(); // Also check base name
});

test('decrypt should correctly decrypt the encrypted files and update config hash', async () => {
  // Pre-seed config with a key and old hash
  writeConfig({ key: 'somekey', last_decrypted_hash: 'old_hash' });

  await encrypt(testDir, testPassword); // Creates initial .envcrypt and updates config hash
  const initialEncryptedHash = readEncryptedHash();
  expect(readConfigHashTest()).toBe(initialEncryptedHash); // Verify encrypt updated it

  // Simulate state being slightly off before decrypt (should be updated by decrypt)
  writeConfig({ key: 'somekey', last_decrypted_hash: 'different_again' });

  await decrypt(testDir, testPassword);
  const decryptedContent = fs.readFileSync(testFilePath, 'utf-8');
  expect(decryptedContent).toBe('TEST_ENV_VAR=Hello, World!');

  // Check config hash was updated by decrypt
  const configHashAfterDecrypt = readConfigHashTest(); // Read hash from config file
  expect(configHashAfterDecrypt).toBe(initialEncryptedHash);
  expect(readConfig()?.key).toBe('somekey'); // Ensure key was preserved
});

test('decrypt should fail with incorrect password', async () => {
  await encrypt(testDir, testPassword);
  await expect(decrypt(testDir, 'wrongpassword')).rejects.toThrow(/Decryption failed: Unsupported state or unable to authenticate/); // More specific check
});

test('decrypt should fail with corrupted encrypted file (bad JSON)', async () => {
  await encrypt(testDir, testPassword);
  // Corrupt the encrypted file by making it invalid JSON
  fs.appendFileSync(outputFilePath, 'corruption');
  await expect(decrypt(testDir, testPassword)).rejects.toThrow(/Failed to parse/);
});

test('decrypt should fail with corrupted encrypted file (missing content hash)', async () => {
  await encrypt(testDir, testPassword);
  // Corrupt by removing hash
  const data = JSON.parse(fs.readFileSync(outputFilePath, 'utf8'));
  delete data.encrypted_content_hash;
  writeEncryptedFile(data);
  await expect(decrypt(testDir, testPassword)).rejects.toThrow(/Invalid format.*missing.*encrypted_content_hash/i);
});

test('decrypt should fail with corrupted encrypted file (missing files)', async () => {
  await encrypt(testDir, testPassword);
   // Corrupt by removing files
  const data = JSON.parse(fs.readFileSync(outputFilePath, 'utf8'));
  delete data.files;
  writeEncryptedFile(data);
  await expect(decrypt(testDir, testPassword)).rejects.toThrow(/Invalid format.*missing.*files/i);
});

// --- Overwrite Protection Tests ---

test('encrypt should fail if config hash and encrypted hash mismatch (no force)', async () => {
  // 1. Initial encrypt/decrypt cycle to establish state in config
  await encrypt(testDir, testPassword);
  await decrypt(testDir, testPassword);
  const firstHash = readConfigHashTest(); // Read from config file

  // 2. Simulate .envcrypt being updated elsewhere (change its hash)
  const data = JSON.parse(fs.readFileSync(outputFilePath, 'utf8'));
  data.encrypted_content_hash = 'different_hash';
  writeEncryptedFile(data); // Write modified .envcrypt (config file still holds firstHash)

  // 3. Attempt to encrypt again (config hash != new .envcrypt hash)
  await expect(encrypt(testDir, testPassword, false)).rejects.toThrow(/Local state potentially outdated/);
});

test('encrypt should succeed if config hash and encrypted hash mismatch (with force)', async () => {
  // 1. Initial encrypt/decrypt cycle
  await encrypt(testDir, testPassword);
  await decrypt(testDir, testPassword);
  const firstConfigHash = readConfigHashTest();

  // 2. Simulate .envcrypt being updated elsewhere
  const data = JSON.parse(fs.readFileSync(outputFilePath, 'utf8'));
  data.encrypted_content_hash = 'different_hash';
  writeEncryptedFile(data); // Config file still holds firstConfigHash

  // 3. Modify local .env file
  fs.writeFileSync(testFilePath, 'TEST_ENV_VAR=New Value!');

  // 4. Attempt to encrypt again with force - should succeed and update hashes
  await expect(encrypt(testDir, testPassword, true)).resolves.toBeUndefined();

  // 5. Verify new content was encrypted and hashes updated
  const newEncryptedHash = readEncryptedHash();
  const newConfigHash = readConfigHashTest(); // Read updated config file hash
  expect(newEncryptedHash).toBeTruthy();
  expect(newConfigHash).toBe(newEncryptedHash); // Config hash updated by encrypt
  expect(newEncryptedHash).not.toBe('different_hash'); // Ensure content hash was updated

  // 6. Decrypt the forced changes and check content + config hash update
  await decrypt(testDir, testPassword);
  const finalContent = fs.readFileSync(testFilePath, 'utf-8');
  expect(finalContent).toBe('TEST_ENV_VAR=New Value!');
  const finalConfigHash = readConfigHashTest();
  expect(finalConfigHash).toBe(newEncryptedHash); // Config hash updated again by decrypt to match
});

test('encrypt should succeed if config file does not exist', async () => {
  await encrypt(testDir, testPassword); // Create .envcrypt
  if (fs.existsSync(configFilePath)) fs.unlinkSync(configFilePath); // Remove config file

  // Should encrypt without error as config file is missing (no hash to compare)
  await expect(encrypt(testDir, testPassword, false)).resolves.toBeUndefined();
  expect(fs.existsSync(configFilePath)).toBe(true); // Config file should be created (with hash)
  expect(readConfigHashTest()).toBe(readEncryptedHash()); // Hash should be written
  expect(readConfig()?.key).toBeUndefined(); // Key should not be present
});

test('encrypt should succeed if .envcrypt file does not exist', async () => {
    // No initial encryption
    await expect(encrypt(testDir, testPassword, false)).resolves.toBeUndefined();
    expect(fs.existsSync(outputFilePath)).toBe(true);
    expect(fs.existsSync(configFilePath)).toBe(true); // Config file created
    expect(readConfigHashTest()).toBe(readEncryptedHash()); // Hash should be written
});

test('encrypt should succeed if config hash and encrypted hash match', async () => {
  // 1. Initial encrypt/decrypt cycle
  await encrypt(testDir, testPassword);
  await decrypt(testDir, testPassword); // Ensures config hash matches .envcrypt hash

  // 2. Attempt to encrypt again without changes - should succeed
  await expect(encrypt(testDir, testPassword, false)).resolves.toBeUndefined();
});

test('encrypt should succeed if config hash is null/missing', async () => {
  // 1. Encrypt once
  await encrypt(testDir, testPassword); // Creates .envcrypt and config with hash
  const encryptedHash = readEncryptedHash();

  // 2. Manually remove last_decrypted_hash from config
  const config = readConfig();
  delete config.last_decrypted_hash;
  writeConfig(config);

  // 3. Attempt to encrypt again - should succeed as the check requires last_decrypted_hash to exist
  await expect(encrypt(testDir, testPassword, false)).resolves.toBeUndefined();

  // Check that last_decrypted_hash is now set correctly
  const finalConfigHash = readConfigHashTest();
  const finalEncryptedHash = readEncryptedHash();
  expect(finalConfigHash).toBe(finalEncryptedHash); // Should be updated to the new hash
});