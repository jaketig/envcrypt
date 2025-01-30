const fs = require('fs');
const path = require('path');
const { encrypt, decrypt } = require('../lib/encryption');

const testPassword = 'testpassword';
const testFilePath = path.join(__dirname, '.env.test');
const outputFilePath = path.join(__dirname, '.envcrypt');

beforeAll(() => {
  // Create a test .env file
  fs.writeFileSync(testFilePath, 'TEST_ENV_VAR=Hello, World!');
});

afterAll(() => {
  // Clean up test files
  fs.unlinkSync(testFilePath);
  if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);
});

test('encrypt should create an encrypted output file', async () => {
  await encrypt(__dirname, testPassword);
  expect(fs.existsSync(outputFilePath)).toBe(true);
});

test('encrypt should exclude the output file from encryption', async () => {
  await encrypt(__dirname, testPassword);
  const encryptedFiles = JSON.parse(fs.readFileSync(outputFilePath));
  expect(encryptedFiles[outputFilePath]).toBeUndefined();
});

test('decrypt should correctly decrypt the encrypted files', async () => {
  await encrypt(__dirname, testPassword);
  await decrypt(__dirname, testPassword);
  const decryptedContent = fs.readFileSync(testFilePath, 'utf-8');
  expect(decryptedContent).toBe('TEST_ENV_VAR=Hello, World!');
});

test('decrypt should fail with incorrect password', async () => {
  await encrypt(__dirname, testPassword);
  await expect(decrypt(__dirname, 'wrongpassword')).rejects.toThrow();
});

test('decrypt should fail with corrupted encrypted file', async () => {
  await encrypt(__dirname, testPassword);
  // Corrupt the encrypted file by modifying its content
  fs.appendFileSync(outputFilePath, 'corruption');
  await expect(decrypt(__dirname, testPassword)).rejects.toThrow();
});