#!/usr/bin/env node
const fs = require('fs');
const path = require('path'); // Added path require
const yargs = require("yargs");
const prompt = require('./prompt');
const { encrypt, decrypt } = require('./encryption');

const configFile = ".envcrypt.config"; // Define config file name

// Helper function to read config file safely (similar to encryption.js)
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

yargs
  .usage('Usage: $0 <command> [options]')
  .command({
    command: "encrypt",
    aliases: ['e', 'enc'],
    desc: "Encrypts .env* files to a .envcrypt file",
    builder: (yargs) => yargs
      .option('key', {
        describe: 'Encryption Key'
      })
      .option('force', {
        alias: 'f',
        type: 'boolean',
        default: false,
        describe: 'Force overwrite even if local state seems outdated'
      }),
    handler: _encrypt
  })
  .command({
    command: "decrypt",
    aliases: ['d', 'dec'],
    desc: "Decrypt an encrypted .env so it is usable",
    builder: (yargs) => yargs
      .option('key', {
        describe: 'Encryption Key'
      }),
    handler: _decrypt
  })
  .demandCommand(1, 1, "choose a command: encrypt or decrypt")
  .help("h")
  .alias("h", "help")
  .argv

async function getKey(args) {
  // 1. Prioritize command line argument
  if (args?.key)
    return args.key;

  // 2. Try reading from config file
  const config = readConfigFile(process.cwd());
  if (config?.key) {
    // console.log('[ENVCRYPT] - Using key from .envcrypt.config'); // Optional: Add logging
    return config.key;
  }

  // 3. Fallback to prompt
  // console.log('[ENVCRYPT] - Key not found in arguments or config file.'); // Optional: Add logging
  return await prompt("Enter secret key: ");
}

async function _encrypt(argv) {
  try {
    let args = {...argv};
    args.key = await getKey(args);
    await encrypt(process.cwd(), args.key, args.force);
    console.log('[ENVCRYPT] - Encryption successful.');
  } catch (error) {
    if (error.message.startsWith('[ENVCRYPT] Error: Local state potentially outdated')) {
        console.error(error.message);
    } else {
        console.error(`[ENVCRYPT] - Encryption failed: ${error.message}`);
    }
    process.exit(1);
  }
}

async function _decrypt(argv) {
  try {
    let args = {...argv};
    args.key = await getKey(args);
    await decrypt(process.cwd(), args.key);
    console.log('[ENVCRYPT] - Decryption successful.');
  } catch (error) {
    console.error(`${error.message}`);
    process.exit(1);
  }
}
