const fs = require('fs');
const crypto = require('crypto');
const MetaAppender = require('./MetaAppender')

function encryptFile(input, output, password) {
  return new Promise((resolve, reject) => {
    const iv = crypto.randomBytes(16)
    const key = crypto.createHash('sha256').update(password).digest('base64').substr(0, 32);
    const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
    const appender = new MetaAppender(iv);
    const read = fs.createReadStream(input);
    const write = fs.createWriteStream(output);

    read
      .pipe(cipher)
      .pipe(appender)
      .pipe(write)
      .on('finish', resolve)
      .on('error', reject)
  })
}

function decryptFile(input, output, password) {
  return new Promise((resolve, reject) => {

    const readIv = fs.createReadStream(input, { start: 87, end: 102 });
    let iv;

    readIv.on('data', (chunk) => iv = chunk);
    readIv.on('error', reject);

    readIv.on('close', () => {
      const key = crypto.createHash('sha256').update(password).digest('base64').substr(0, 32);
      const cipher = crypto.createDecipheriv('aes-256-ctr', key, iv);
      const read = fs.createReadStream(input, { start: 103 });
      const write = fs.createWriteStream(output);
  
      read
        .pipe(cipher)
        .pipe(write)
        .on('finish', resolve)
        .on('error', reject)
    })
  })
}

module.exports = {
  encryptFile,
  decryptFile
}