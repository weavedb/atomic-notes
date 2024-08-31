# Atomic Notes SDK

## Installation

Use `npm` due to its imcompatibility with `yarn`.

```bash
npm i atomic-notes
```

```js
import { AO, Note, Notebook } from "atomic-notes"
```

## AO

Initialize with an existing wallet.

```js
const ao = await new AO().init(arweaveWallet || jwk)
// ao.addr, ao.jwk, ao.id are accessible after init()
```

- `addr` : wallet address
- `jwk` : wallet jwk
- `id` : AO profile ID managed by the wallet address

Or you can generate a new wallet. Minting AR token at the same time only works on arlocal.  
Newly generated wallets don't have an AO profile ID.


```js
await ao = new AO()
const { jwk, addr, pub, balance } = await ao.gen(mint_amount)
```

### Arweave Functions

#### toAddr

Convert a jwk to the corresponding address.

```js
const addr = await ao.toAddr(jwk)
```

#### mine

Mine pending blocks (only for arlocal).

```js
await ao.mine()
```

#### balance | toAR | toWinston

Get the current balance of the specified address in AR. `addr` will be `ao.addr` if omitted.

```js
const balance_AR = await ao.balance() // get own balance
const balance_Winston = ao.toWinston(balance_AR)
const balance_AR2 = ao.toAR(balance_Winston)
const balance_AR3 = await ao.balance(addr) // specify wallet address
```

#### transfer

Transfer AR token. `amount` is in AR, not in winston for simplicity.

```js
const txid = await ao.transfer(amount, to)
```

You can set a jwk to the 3rd parameter as a sender, otherwise the sender is `ao.jwk`.

```js
const txid = await ao.transfer(amount, to, jwk)
```

For most write functions, `jwk` can be specified as the last parameter or a field like `{ data, tags, jwk }`.

#### post 

Post a data to Arweave.

```js
const txid = await ao.post({ data, tags })
```

`tags` are not an Array but a hash map Object for brevity.

```js
const tags = { "Content-Type": "text/markdown", Type: "blog-post" }
```

If you must use the same name for multiple tags, the value can be an Array.

```js
const tags = { Name: [ "name-tag-1", "name-tag-2" ] }
```


#### tx

Get a transaction.

```js
const tx = await ao.tx(txid)
```

#### data

Get a data.

```js
const data = await ao.data(txid, true) // true if string
```

#### bundle

Bundle ANS-104 dataitems.

```js
const txid = await ao.bundle(dataitems)
```
`dataitems` are `[ [ data, tags ], [ data, tags ], [ data, tags ] ]`.
```js
const txid = await ao.bundle([
  [ "this is text", { "Content-Type": "text/plain" }],
  [ "# this is markdown", { "Content-Type": "text/markdown" }],
  [ png_image, { "Content-Type": "image/png" }]
])
```

### AO Functions

#### deploy

Spawn a process, get a Lua source, and eval the script. `src` is an Arweave txid of the Lua script.

```js
const { err, pid } = await ao.deploy({ data, tags, src, fills })
```

`fills` replace the Lua source script from `src`.

```lua
local replace_me = '<REPLACE_ME>'
local replace_me_again = '<REPLACE_ME_AGAIN>'
local replace_me_with_hello_again = '<REPLACE_ME>'
```

```js
const fills = { REPLACE_ME: "hello", REPLACE_ME_AGAIN: "world" }
```
This will end up in the following lua script.

```lua
local replace_me = 'hello'
local replace_me_again = 'world'
local replace_me_with_hello_again = 'hello'
```


##### msg

Send a message.


```js
const { err, mid, res, out } = await ao.msg({ 
  data, action, tags, check, checkData, get
})
```

`check` determins if the message call is successful by checking through `Tags` in `Messages` in `res`.

```js
const check = { "Status" : "Success" } // succeeds if Status tag is "Success"
const check2 = { "Status" : true } // succeeds if Status tag exists
```


`checkData` checks `Data` field instead of `Tags`.

```js
const checkData = "Success"  // succeeds if Data field is "Success"
const checkData2 = true // succeeds if Data field exists
```

`get` will return specified data via `out`.


```js
const get = "ID" // returns the value of "ID" tag
const get2 = { name: "Profile", json: true } // "Profile" tag with JSON.parse()
const get3 = { data: true, json: true } // returns Data field with JSON.parse()
```

#### dry

Dryrun a message without writing to Arweave.


```js
const { err, res, out } = await ao.dry({ 
  data, action, tags, check, checkData, get
})
```

#### asgn

Assign an existing message to a process.

```js
const { err, mid, res, out } = await ao.asgn({ pid, mid, check, checkData, get })
```

#### load

Get a Lua source script from Arweave and eval it on a process.

```js
const { err, mid } = await ao.load({ src, fills, pid })
```

#### eval

Eval a Lua script on a process.

```js
const { err, mid, res } = await ao.eval({ pid, data })
```

#### spwn

Spawn a process. `module` and `scheduler` are auto-set if omitted.

```js
const { err, pid } = await ao.spwn({ module, scheduler, tags, data })
```

#### aoconnect Functions

The original aoconnect functions `message` | `spawn` | `result` | `assign` | `dryrun`  are also available.  
`createDataItemSigner` is available as `toSigner`.

```js
const signer = ao.toSigner(jwk)
const message = await ao.message({ process, signer, tags, data })
const result = await ao.result({ process, message })
```

### AO Profile Functions

#### ids

A list of ids managed by the provided address. `addr` will be `ao.addr` if omitted.

```js
const ids = await ao.ids({ addr })
```

#### profile

A profile of the provided id. `id` will be `ao.id` if omitted.

```js
const profile = await ao.profile({ id })
```
#### updateProfile


Update an AO profile.

```js
const profile = await ao.updateProfile({ id, profile })
```

#### info

Information ( profile, assets, collections } of the provided id. `id` will be `ao.id` if omitted.

```js
const info = await ao.info({ id })
```

## Notebook

### Create Notebook

If `bazar` is true, the newly created collection will be registered to [the Bazar collection registry](https://bazar.arweave.dev/#/collections/).

```js
const notebook = new Notebook({ ao })

const { pid: notebook_pid } = await notebook.create({ 
  info: { title, description, thumbnail, banner }, bazar
})
```

### Get Info

```js
const { out: info } = await notebook.info()
```

### Update Info

At leadt one field is required.

```js
const { err } = await notebook.updateInfo({ 
  title, description, thumbnail, banner
})
```

### Add Single Note

```js
const { err } = await notebook.addNote(note_pid)
```

### Remove Single Note

```js
const { err } = await notebook.removeNote(note_pid)
```

### Add Multiple Notes

```js
const { err } = await notebook.addNotes(note_pids)
```

### Remove Multiple Notes

```js
const { err } = await notebook.removeNotes(note_pids)
```

## Note

### Create Note

```js
const note = new Note({ ao })

const { pid: note_pid } = await note.create({
  data,
  info: { title, description, thumbnail, banner },
  udl: { payment, access, derivations, commercial, training },
  token: { fraction },
})

await notebook.addNote(pid) // add to a notebook
```
#### Universal Data License

- payment
  - mode : `single` | `random` | `global`
  - recipient
- access
  - mode : `none` | `one-time`
  - fee
- derivations
  - mode : `allowed` | `disallowed`
  - term : `credit` | `indication` | `passthrough` | `revenue` | `monthly` | `one-time`
  - share
  - fee
- commercial
  - mode : `allowed` | `disallowed`
  - term : `revenue` | `monthly` | `one-time`
- training
  - mode : `allowed` | `disallowed`
  - term : `monthly` | `one-time`

### Get Info

```js
const { out: info } = await note.info()
```

### Update Info

```js
const { err } = await note.updateInfo({ title, description, thumbnail })
```

### List Versions

```js
const { out: versions } = await note.list()
```

### Get Note Content

```js
const { out: note_data } = await note.get(version)
```

### Update New Version

```js
const { err } = await note.update(data, version)
```
### Get Editors

```js
const { out: editors } = await note.editors()
```

### Add Editor

```js
const { err } = await note.addEditor(editors)
```

### Remove Editor

```js
const { err } = await note.removeEditor(editors)
```
