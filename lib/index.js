#!/usr/bin/env node
const fs = require('fs');
const yargs = require("yargs");
const prompt = require('./prompt');
const { encrypt, decrypt } = require('./encryption');

yargs
  .usage('Usage: $0 <command> [options]')
  .command({
    command: "encrypt",
    aliases: ['e', 'enc'],
    desc: "Encrypts .env* files to a .envcrypt file",
    builder: (yargs) => yargs
      .option('key', {
        describe: 'Encryption Key'
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
  if (args?.key) 
    return args.key

  // read key from .envcrypt.key
  try {
    if (fs.existsSync('.envcrypt.key')) 
      return fs.readFileSync('.envcrypt.key', 'utf8');
  } catch (err) {
    console.warn('[ENVCRYPT] - failed to read .envcrypt.key');
    console.error(err);
  }
  
  return await prompt("Enter secret key: ");
}

async function _encrypt(argv) {
  let args = {...argv};
  args.key = await getKey(args);
  await encrypt(process.cwd(), args.key);
}

async function _decrypt(argv) {
  let args = {...argv};
  args.key = await getKey(args);
  await decrypt(process.cwd(), args.key);
}
