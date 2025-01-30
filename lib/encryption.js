const fs = require('fs');
const path = require('path')
const crypto = require('crypto');


const pattern = /^\.env/;
const ignorePattern = /^\.envcrypt/;
const outputFile = ".envcrypt";

function encrypt(dir, password) {
  return new Promise((resolve, reject) => {
    const files = fs.readdirSync(dir);

    const matchingFiles = files.filter(file => pattern.test(file) && !ignorePattern.test(file));

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

    fs.writeFileSync(path.join(dir, outputFile), JSON.stringify(encryptedFiles, null, 2));
    resolve();
  });
}

function decrypt(dir, password) {
  return new Promise((resolve, reject) => {
    const encryptedFiles = JSON.parse(fs.readFileSync(path.join(dir, outputFile)));

    Object.keys(encryptedFiles).forEach((file) => {
      const decryptedContent = decryptFile(encryptedFiles[file], password);
      fs.writeFileSync(path.join(dir, file), decryptedContent);
    });

    resolve();
  });
}

function decryptFile(encryptedData, password) {
  const [iv, salt, authTag, content] = encryptedData.split(',');

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