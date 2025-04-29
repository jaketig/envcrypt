const fs = require('fs');
const path = require('path')
const crypto = require('crypto');


const pattern = /^\.env/;
const ignorePattern = /^\.envcrypt/;
const outputFile = ".envcrypt";
const configFile = ".envcrypt.config"; // New config file

// Helper function to calculate hash
function calculateHash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Helper function to read config file safely
function readConfigFile(dir) {
  const configFilePath = path.join(dir, configFile);
  try {
    if (fs.existsSync(configFilePath)) {
      return JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
    }
  } catch (e) {
    console.warn(`[ENVCRYPT] - Could not parse ${configFile}.`);
  }
  return null; // Return null if file doesn't exist or parsing fails
}

// Helper function to read hash from config file
function readConfigHash(dir) {
  const config = readConfigFile(dir);
  return config?.last_decrypted_hash || null;
}

// Helper function to write hash to config file, preserving other fields
function writeConfigHash(dir, hash) {
  const configFilePath = path.join(dir, configFile);
  let config = readConfigFile(dir) || {}; // Read existing or start fresh
  config.last_decrypted_hash = hash; // Update the hash
  try {
    // Ensure the directory exists (though it should for cwd)
    fs.mkdirSync(path.dirname(configFilePath), { recursive: true });
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error(`[ENVCRYPT] - Failed to write hash to ${configFile}: ${e.message}`);
    // Consider if this should reject the promise
  }
}

// Helper function to read hash from .envcrypt
function readEncryptedHash(dir) {
  const outputFilePath = path.join(dir, outputFile);
  if (fs.existsSync(outputFilePath)) {
    try {
      const content = JSON.parse(fs.readFileSync(outputFilePath, 'utf8'));
      return content.encrypted_content_hash || null; // Only read content hash
    } catch (e) {
      console.warn('[ENVCRYPT] - Failed to parse existing .envcrypt file. Proceeding with caution.');
      return null; // Treat parse failure as no hash found
    }
  }
  return null; // No file means no hash
}

function encrypt(dir, password, force = false) {
  return new Promise((resolve, reject) => {
    // --- Overwrite Check ---
    // Use readConfigHash
    const lastDecryptedHash = readConfigHash(dir);
    const currentEncryptedHash = readEncryptedHash(dir);

    if (!force && lastDecryptedHash && currentEncryptedHash && lastDecryptedHash !== currentEncryptedHash) {
      return reject(new Error(`[ENVCRYPT] Error: Local state potentially outdated. The '.envcrypt' file has changed since you last decrypted.
Run 'envcrypt decrypt' first to merge changes, or use '--force' to overwrite.`));
    }
    // --- End Overwrite Check ---

    const files = fs.readdirSync(dir);

    const matchingFiles = files.filter(file => pattern.test(file) && !ignorePattern.test(file));

    // Check if there are any files to encrypt
    if (matchingFiles.length === 0) {
        console.log('[ENVCRYPT] - No .env* files found to encrypt.');
        // Write an empty .envcrypt file if none exists or update existing one
        const newEncryptedContentHash = calculateHash(JSON.stringify({}, null, 2));
        const dataToWrite = {
          encrypted_content_hash: newEncryptedContentHash,
          files: {}
        };
        fs.writeFileSync(path.join(dir, outputFile), JSON.stringify(dataToWrite, null, 2));
        // Also update config file hash for consistency
        writeConfigHash(dir, newEncryptedContentHash);
        return resolve();
    }

    const encryptedFiles = {};

    matchingFiles.forEach((file) => {
      const iv = crypto.randomBytes(16);
      const salt = crypto.randomBytes(16);
      const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

      const input = fs.readFileSync(path.join(dir, file));
      let encrypted = cipher.update(input);
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      const authTag = cipher.getAuthTag();

      encryptedFiles[file] = `${iv.toString('hex')},${salt.toString('hex')},${authTag.toString('hex')},${encrypted.toString('hex')}`;
    });

    // Calculate hash of the new encrypted content
    const encryptedContentString = JSON.stringify(encryptedFiles, null, 2);
    const newEncryptedContentHash = calculateHash(encryptedContentString);

    // Prepare final data structure
    const dataToWrite = {
      encrypted_content_hash: newEncryptedContentHash,
      files: encryptedFiles
    };

    // Write the encrypted file
    fs.writeFileSync(path.join(dir, outputFile), JSON.stringify(dataToWrite, null, 2));

    // Update the config file hash
    writeConfigHash(dir, newEncryptedContentHash);

    resolve();
  });
}

function decrypt(dir, password) {
  return new Promise((resolve, reject) => {
    const outputFilePath = path.join(dir, outputFile);
    if (!fs.existsSync(outputFilePath)) {
        return reject(new Error(`[ENVCRYPT] Error: Encrypted file '${outputFile}' not found in ${dir}.`));
    }

    let encryptedData;
    try {
        encryptedData = JSON.parse(fs.readFileSync(outputFilePath));
    } catch (e) {
        return reject(new Error(`[ENVCRYPT] Error: Failed to parse '${outputFile}'. Is it a valid envcrypt file? ${e.message}`));
    }

    if (!encryptedData || typeof encryptedData.files !== 'object' || !encryptedData.encrypted_content_hash) {
        return reject(new Error(`[ENVCRYPT] Error: Invalid format in '${outputFile}'. Missing 'files' or 'encrypted_content_hash'.`));
    }

    const encryptedFiles = encryptedData.files;
    const encryptedContentHash = encryptedData.encrypted_content_hash;

    try {
      // Check if there are files to decrypt
      const fileKeys = Object.keys(encryptedFiles);
      if (fileKeys.length === 0) {
          console.log('[ENVCRYPT] - No files found within .envcrypt to decrypt.');
          // Still update the config hash even if no files were decrypted
          writeConfigHash(dir, encryptedContentHash); // Update config hash
          return resolve();
      }

      fileKeys.forEach((file) => {
        const decryptedContent = decryptFile(encryptedFiles[file], password);
        fs.writeFileSync(path.join(dir, file), decryptedContent);
      });

      // Update config hash after successful decryption
      writeConfigHash(dir, encryptedContentHash);

      resolve();
    } catch (error) {
        reject(new Error(`[ENVCRYPT] Decryption failed: ${error.message}. Check your key.`));
    }
  });
}

function decryptFile(encryptedData, password) {
  const [iv, salt, authTag, content] = encryptedData.split(',');

  if (!iv || !salt || !authTag || !content) {
      throw new Error("Invalid encrypted data format for a file.");
  }

  const ivBuffer = Buffer.from(iv, 'hex');
  const saltBuffer = Buffer.from(salt, 'hex');
  const authTagBuffer = Buffer.from(authTag, 'hex');
  const contentBuffer = Buffer.from(content, 'hex');

  const key = crypto.pbkdf2Sync(password, saltBuffer, 100000, 32, 'sha256');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
  decipher.setAuthTag(authTagBuffer);

  let decrypted = decipher.update(contentBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted;
}

module.exports = {
  encrypt,
  decrypt
}