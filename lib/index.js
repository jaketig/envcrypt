const yargs = require("yargs");
const prompt = require('./prompt');
const { encryptFile, decryptFile } = require('./encryption');

yargs
  .usage('Usage: $0 <command> [options]')
  .command({
    command: "encrypt",
    aliases: ['e', 'enc'],
    desc: "Encrypt a .env file so it is safe to store in version control",
    builder: (yargs) => yargs
      .option('key', {
        describe: 'Encryption Key'
      })
      .option('input', {
        alias: 'in',
        describe: 'File to Encrypt',
        default: './.env'
      })
      .option('output', {
        alias: 'out',
        describe: 'Encrypted File',
        default: './.envcrypt'
      }),
    handler: encrypt
  })
  .command({
    command: "decrypt",
    aliases: ['d', 'dec'],
    desc: "Decrypt an encrypted .env so it is usable",
    builder: (yargs) => yargs
      .option('key', {
        describe: 'Encryption Key'
      })
      .option('input', {
        alias: 'in',
        describe: 'File to Decrypt',
        default: './.envcrypt'
      })
      .option('output', {
        alias: 'out',
        describe: 'Decrypted Output File',
        default: './.env'
      }),
    handler: decrypt
  })
  .demandCommand(1, 1, "choose a command: encrypt or decrypt")
  .help("h")
  .alias("h", "help")
  .argv


async function encrypt(argv) {
  let args = {...argv};

  // prompt for secret key if we don't already have one
  if (!args?.key) args.key = await prompt("Enter secret key: ");

  await encryptFile(args.input, args.output, args.key)
}

async function decrypt(argv) {
  let args = {...argv};

  if (!args?.key) args.key = await prompt("Enter secret key: ");

  await decryptFile(args.input, args.output, args.key)
}
