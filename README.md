# ENVCRYPT

envcrypt is an encrypt/decrypt CLI tool that was built for the purpose of storing encrypted (AES-256) .env files in version control. By default, envcrpyt will take any .env files and create an encrypted .envcrypt file. The unencrypted .env files should not be committed to version control. The .envcrypt file can be.

## Overwrite Protection

To prevent accidentally overwriting changes pulled from version control, `envcrypt encrypt` includes a safety check. It compares the state of the current `.envcrypt` file (based on its content hash) with the state recorded when the local `.env` files were last created (via `envcrypt decrypt`). If they don't match, it suggests the `.envcrypt` file might have been updated remotely.

This check uses a local `.envcrypt.config` file to track the last decrypted state via the `last_decrypted_hash` property.

If the check fails, you will be prompted to run `envcrypt decrypt` first to integrate any remote changes into your local `.env` files before encrypting again. You can bypass this check using the `--force` flag, but be cautious as this might overwrite changes from others.

## Configuration (`.envcrypt.config`)

You can optionally store your encryption key and manage state within a `.envcrypt.config` JSON file in your project root. **This file should be added to your `.gitignore` file.**

Example `.envcrypt.config`:
```json
{
  "key": "your-super-secret-key",
  "last_decrypted_hash": "a1b2c3d4..."
}
```
*   `key` (Optional): If present, `envcrypt` will use this key instead of prompting. The `--key` command-line argument still takes precedence.
*   `last_decrypted_hash` (Managed by envcrypt): Stores the hash of the `.envcrypt` content the last time `decrypt` was successfully run. Used for the overwrite protection check.

## Usage

1. Add @jaketig/envcrypt as a dev dependency
```
npm install @jaketig/envcrypt --save-dev
```

2. Add `.envcrypt.config` to your `.gitignore` file.

3. Use the CLI
```
envcrypt <command>
```


## Commands

<table>
<tr>
<th>Command</th>
<th>Alias</th>
<th>Description</th>
</tr>
<tr>
<td>

`encrypt`

</td>
<td>

`e`, `enc`

</td>
<td>

Encrypt the contents of .env files. Includes overwrite protection.

</td>
</tr>

<tr>
<td>

`decrypt`

</td>
<td>

`d`, `dec`

</td>
<td>

Decrypt the contents of .envcrypt file to original files and update local state.

</td>
</tr>
</table>

## Options

<table>
<tr>
<th>Option</th>
<th>Alias</th>
<th>Scope</th>
<th>Description</th>
</tr>
<tr>
<td>

`--key`

</td>
<td>
</td>
<td>`encrypt`, `decrypt`</td>
<td>Encryption key used to encrypt/decrypt contents. Overrides key in `.envcrypt.config`. Optional, will prompt if not found elsewhere.</td>
</tr>
<tr>
<td>

`--force`

</td>
<td>`-f`</td>
<td>`encrypt`</td>
<td>Force encryption, bypassing the overwrite protection check. Use with caution.</td>
</tr>
</table>

## Examples


Bare Minimum Encryption
```
envcrypt e
```
- will prompt for secret key
- will encrypt `.env` to  `.envcrypt` (if overwrite check passes)

<br/>

Bare Minimum Decryption
```
envcrypt d
```
- will prompt for secret key
- will decrypt `.envcrypt` to  `.env`
- will update `.envcrypt.config`

<br/>

Pass Key

```
envcrypt d --key=supersecret
```
- will decrypt `.envcrypt` to  `.env`

<br/>

Force Encryption (Overwrite)
```
envcrypt e --key=supersecret --force
```
- will encrypt `.env` to `.envcrypt`, ignoring potential state mismatch.

