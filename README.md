# ENVCRYPT

envcrypt is an encrypt/decrypt CLI tool that was built for the purpose of storing encrypted (AES-256) .env files in version control. By default, envcrpyt will take any .env files and create an encrypted .envcrypt file. The unencrypted .env files should not be committed to version control. The .envcrypt file can be. When checking out a repository with an 

## Usage

1. Add @jaketig/envcrypt as a dev dependency
```
npm install @jaketig/envcrypt --save-dev
```

2. Use the CLI
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

Encrypt the contents of .env files

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

Decrypt the contents of .envcrypt file to original files

</td>
</tr>
</table>
 
## Options

<table>
<tr>
<th>Option</th>
<th>Alias</th>
<th>Description</th>
</tr>
<tr>
<td>

`--key`

</td>
<td>
</td>
<td>Encryption key used to encrypt/decrypt contents. Optional, will prompt if not passed. Can also store key in .envcrypt.key file - this should be added to .gitignore</td>
</tr>
</table>

## Examples


Bare Minimum Encryption
```
envcrypt e
```
- will prompt for secret key
- will encrypt `.env` to  `.envcrypt`

<br/>

Bare Minimum Decryption
```
envcrypt d
```
- will prompt for secret key
- will decrypt `.envcrypt` to  `.env`

<br/>

Pass Key

```
envcrypt d --key=supersecret
```
- will decrypt `.envcrypt` to  `.env`

