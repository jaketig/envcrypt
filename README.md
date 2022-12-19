# ENVCRYPT

envcrypt is an encrypt/decrypt CLI tool that was built for the purpose of storing encrypted (AES-256) .env files in version control. By default, envcrpyt will take a .env file and create an encrypted .envcrypt file. The unencrypted .env file should not be committed to version control. The .envcrypt file can be. When checking out a repository with an 

## Usage

1. Add @jaketig/envcrypt as a dev dependency
```
npm install @jaketig/envcrypt --save-dev
```

2. Use the CLI
```
envcrypt <command> [options] 
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

Encrypt the contents of the `input` file and save them to the `output` file

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

Encrypt the contents of the `input` file and save them to the `output` file

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
<td>Encryption key used to encrypt/decrypt contents. Optional, will prompt if not passed</td>
</tr>
<tr>
<td>

`--input`

</td>
<td>

`--in`

</td>
<td>

Source File (should be added to .gitignore) <br/>
`encrypt`: the file to be encrypted (default: ./env); <br/>
`decrypt`: the file to be decrypted. (default: ./envcrypt) 

</td>
</tr>
<tr>
<td>

`--output`

</td>
<td>

`--out`

</td>
<td>

Destination File (will overwrite if exists)<br/>
`encrypt`: filepath for the encrypted result (default: ./envcrypt); <br/>
`decrypt`: filepath for the encrypted result (default: ./env) 

</td>
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

<br/>


Specify Input/Outpu

```
envcrypt d --in="./file_to_decrypt" --out="./dest_file" --key=supersecret
```


