# aoNote SDK

- [Installation](#installation)
- [AR](#ar)
- [AO](#ao)
- [Profile](#profile)
- [Collection](#collection)
- [Asset](#asset)
- [Notebook](#notebook)
- [Note](#note)

## Installation

Use `npm` due to its imcompatibility with `yarn`.

```bash
npm i aonote
```

aoNote SDK goes beyond Atomic Notes, streamlining Arweave/AO development with elegant syntax enhancements and seamless message piping for an enjoyable coding experience.

```js
import { AR, AO, Profile, Notebook, Note } from "aonote"
```

## AR

`AR` handles operations on the base Arweave Storage layer as well as wallet connections.

- [Instantiate](#instantiate)
- [Set or Generate Wallet](#set-or-generate-wallet)
- [toAddr](#toaddr)
- [mine](#mine)
- [balance | toAR | toWinston](#balance--toar--towinston)
- [transfer](#transfer)
- [checkWallet](#checkwallet)
- [post](#post)
- [tx](#tx)
- [data](#data)
- [bundle](#bundle)

### Instantiate

```js
const ar = new AR()
```
`host`, `port`, and `protocol` can be set to access a specific gateway rather than `https://arweave.net`.

```js
const ar = new AR({ host: "localhost", port: 4000, protocol: "http" })
```

In case of local gateways, you can only set `port` and the rest will be automatically figured out.
```js
const ar = new AR({ port: 4000 })
```

### Set or Generate Wallet

You can initialize AR with a wallet JWK or ArConnect.

```js
const ar = await new AR().init(jwk || arweaveWallet)
```

Or you can generate a new wallet. In case of ArLocal, you can mint AR at the same time.

```js
const { jwk, addr, pub, balance } = await ar.gen("100") // mint 100 AR
```

Once a wallet is set in one of these 3 ways, you cannot use the instance with another wallet unless you re-initialize it with another wallet. This is to prevent executing transactions with the wrong wallet when the browser connected active address has been changed unknowingly.

You can go on without calling `init` or `gen`, in this case, AR generates a random wallet when needed, and also using different wallets will be allowed. This is useful, if you are only calling `dryrun` with AO, since AO requires a signature for `dryrun` too, but you don't want to bother the user by triggering the browser extension wallet for read only calls.

Once a wallet is set, `ar.jwk` and `ar.addr` will be available.

### Token Related Methods

#### toAddr

Convert a jwk to the corresponding address.

```js
const addr = await ar.toAddr(jwk)
```

#### mine

Mine pending blocks (only for arlocal).

```js
await ar.mine()
```

#### balance | toAR | toWinston

Get the current balance of the specified address in AR. `addr` will be `ar.addr` if omitted.

```js
const balance_AR = await ar.balance() // get own balance
const balance_Winston = ar.toWinston(balance_AR)
const balance_AR2 = ar.toAR(balance_Winston)
const balance_AR3 = await ar.balance(addr) // specify wallet address
```

#### transfer

Transfer AR token. `amount` is in AR, not in winston for simplicity.

```js
const { id } = await ar.transfer(amount, to)
```

You can set a jwk to the 3rd parameter as a sender, otherwise the sender is `ar.jwk`.

```js
const { id } = await ar.transfer(amount, to, jwk)
```

For most write functions, `jwk` can be specified as the last parameter or a field like `{ data, tags, jwk }`.


#### checkWallet

`checkWallet` is mostly used internally, but it returns `this.jwk` if a wallet has been assigned with `init`, or else it generates a random wallet to use. The following pattern is used in many places. With this pattern, if a wallet is set with `init` and the `jwk` the user is passing is different, `checkWallet` produces an error to prevent the wrong wallet. If no wallet has been set with `init` or `gen` and the `jwk` is not passed, it generates and returns a random wallet.

```js
some_class_method({ jwk }){
  let err = null
  ;({ err, jwk } = await ar.checkWallet({ jwk }))
  if(!err){
    // do domething with the jwk
  }
}
```

### Storage Related Methods

#### post 

Post a data to Arweave.

```js
const { err, id } = await ar.post({ data, tags })
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
const tx = await ar.tx(txid)
```

#### data

Get a data.

```js
const data = await ar.data(txid, true) // true if string
```

#### bundle

Bundle ANS-104 dataitems.

```js
const { err, id } = await ar.bundle(dataitems)
```
`dataitems` are `[ [ data, tags ], [ data, tags ], [ data, tags ] ]`.
```js
const { err, id } = await ar.bundle([
  [ "this is text", { "Content-Type": "text/plain" }],
  [ "# this is markdown", { "Content-Type": "text/markdown" }],
  [ png_image, { "Content-Type": "image/png" }]
])
```

## AO

- [Instantiate](#instantiate-1)
- [deploy](#deploy)
- [msg](#msg)
- [dry](#dry)
- [asgn](#asgn)
- [load](#load)
- [eval](#eval)
- [spwn](#spwn)
- [aoconnect Functions](#aoconnect-functions)
- [postModule](#postmodule)
- [postScheduler](#postscheduler)
- [wait](#wait)
- [Function Piping](#function-piping)

### Instantiate

You can initialize AO in the same way as AR.

```js
const ao = await new AO().init(arweaveWallet || jwk)
```
If you need to pass AR settings, use `ar`. `ao.ar` will be automatically available.

```js
const ao = await new AO({ ar: { port: 4000 }}).init(arweaveWallet || jwk)
const addr = ao.ar.addr
await ao.ar.post({ data, tags })
```

### AO Core Functions

#### deploy

Spawn a process, get a Lua source, and eval the script. `src` is an Arweave txid of the Lua script.

```js
const { err, res, pid } = await ao.deploy({ data, tags, src, fills })
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

In case you have multiple scripts, use `loads` and pass `src` and `fills` respectively.

```js
await ao.deploy({ tags, loads: [ { src, fills }, { src: src2, fills: fills2 } ] })
```


#### msg

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
const { err, res, mid } = await ao.load({ src, fills, pid })
```

#### eval

Eval a Lua script on a process.

```js
const { err, res, mid } = await ao.eval({ pid, data })
```

#### spwn

Spawn a process. `module` and `scheduler` are auto-set if omitted.

```js
const { err, res, pid } = await ao.spwn({ module, scheduler, tags, data })
```

### aoconnect Functions

The original aoconnect functions `message` | `spawn` | `result` | `assign` | `dryrun`  are also available.  
`createDataItemSigner` is available as `toSigner`.

```js
const signer = ao.toSigner(jwk)
const process = await ao.spawn({ module, scheduler, signer, tags, data })
const message = await ao.message({ process, signer, tags, data })
const result = await ao.result({ process, message })
```

### Advanced Functions

#### postModule

`data` should be wasm binary. `overwrite` to replace the default module set to the AO instance.

```js
const { err, id: module } = await ao.postModule({ data, jwk, tags, overwrite })

```

#### postScheduler

This will post `Scheduler-Location` with the `jwk` address as the returning `scheduler`.

```js
const { err, scheduler } = await ao.postScheduler({ url, jwk, tags, overwrite })
```

#### wait

`wait` untill the process becomes available after `spwn`. This is mostly used internally with `deploy`.

```js
const { err } = await ao.wait({ pid })
```

### Function Piping

Most functions return in the format of `{ err, res, out, pid, mid, id }`, and these function can be chained with `pipe`, which makes executing multiple messages a breeze.

For example, following is how `deploy` uses `pipe` internally. The execusion will be immediately aborted if any of the functions in `fns` produces an error.

```js
let fns = [
  {
    fn: "spwn",
    args: { module, scheduler, tags, data },
    then: { "args.pid": "pid" },
   },
   { fn: "wait", then: { "args.pid": "pid" } },
   { fn: "load", args: { src, fills }, then: { "args.pid": "pid" } }
]
const { err, res, out, pid } = await this.pipe({ jwk, fns })
```

#### bind

If the function comes from other instances rather than `AO`, use `bind`.

```js
const fns = [{ fn: "post", bind: this.ar, args: { data, tags }}]
```

#### then

You can pass values between functions with `then`. For instance, passing the result from the previous functions to the next function's arguments is a common operation.

```js
const fns = [
  { fn: "post", bind: ao.ar, args: { data, tags }, then: ({ id, args, out })=>{
    args.tags.TxId = id // adding TxId tag to `msg` args
	out.txid = id // `out` will be returned at last with `pipe`
  }},
  { fn: "msg", args: { pid, tags }},
]
const { out: { txid } } = await ao.pipe({ fns, jwk })
```

If `then` returns a value, `pipe` will immediately return with that single value. You can also use `err` to abort `pipe` with an error.

```js
const fns = [
  { fn: "msg", args: { pid, tags }, then: ({ inp })=>{
     if(inp.done) return inp.val
  }},
  { fn: "msg", args: { pid, tags }, err: ({ inp })=>{
     if(!inp.done) return "something went wrong"
  }},
]
const val = await ao.pipe({ jwk, fns })

```

`then` has many useful parameters.

- `res` : `res` from the previous result
- `args` : `args` for the next function
- `out` : `out` the final `out` result from the `pipe` sequence
- `inp` : `out` from the previous result
- `_` : if values are assigned to the `_` fields, `pipe` returns them as top-level fields in the end
- `pid` : `pid` will be passed if any previous functions returns `pid` ( e.g. `deploy` )
- `mid` : `mid` will be passed if any previous functions returns `mid` ( e.g. `msg` )
- `id` : `id` will be passed if any previous functions returns `id` ( e.g. `post` )

`then` can be a simplified hashmap object.

```js
let fns = [
  {
    fn: "msg",
    args: { tags },
    then: { "args.mid": "mid", "out.key": "inp.a", "_.val": "inp.b" },
   }, 
   { fn: "some_func", args: {} } // args.mid will be set from the previous `then`
]
const { out: { key }, val } = await ao.pipe({ jwk, fns })
```

#### cb

`cb` can report the current progress of `pipe` after every function execution.

```js
await ao.pipe({ jwk, fns, cb: ({ i, fns, inp })=>{
  console.log(`${i} / ${fns.length} functions executed`)
}})
```

## Profile

- [Instantiate](#instantiate-2)
- [createProfile](#createprofile)
- [ids](#ids)
- [profile](#profile-1)
- [profiles](#profiles)
- [updateProfile](#updateprofile)
- [info](#info)
- [createRegistry](#createregistry)

### Instantiate

All the arguments are optional. `profile.ao` and `profile.ar` will be available.

```js
const profile = await new Profile({ 
  registry, registry_src, profile_src, ar, ao
}).init( jwk || arweaveWallet )
```

### init

If you `init` a Profile, it will resolve the AO `profileId` associated with the wallet address.

```js
const profile = await new Profile({}).init(jwk)
const profileId = profile.id

```

### Core Methods

#### createProfile

```js
const { pid: id } = await ao.createProfile({ profile }))
```

#### ids

A list of ids managed by the provided address. `addr` will be `ao.addr` if omitted.

```js
const ids = await profile.ids({ addr })
```

#### profile

A profile of the provided id. `id` will be `ao.id` if omitted.

```js
const profile = await profile.profile({ id })
```

#### profiles

Multiple profiles.

```js
const profiles = await profile.profiles({ ids })
```

#### updateProfile

Update an AO profile.

```js
const { err, res } = await profile.updateProfile({ id, profile })
```

#### info

Information `( profile, assets, collections }` of the provided id. `id` will be `ao.id` if omitted.

```js
const { out: info } = await profile.info({ id })
```

### Advanced Methods

#### createResistry

You can create a new AO profile registry, which is useful for local testing.

```js
const { err, pid } = await profile.createResistry()
```

## Collection

- [Instantiate](#instantiate-3)
- [create](#create)
- [info](#get-info2)
- [updateInfo](#update-info)
- [addAsset](#add-single-asset)
- [removeAsset](#remove-single-asset)
- [addAssets](#add-multiple-assets)
- [removeAssets](#remove-multiple-assets)
- [createRegistry](#createregistry)


### Instantiate

All arguments are optional. `collection.profile`, `collection.ao`, `collection.ar` will be available.

```js
const collection = await new Collection({ 
  pid, registry, registry_src, thumbnail, banner, collection_src, profile, ar, ao
}).init( jwk || arweaveWallet )
```

### Core Methods

#### Create Collection

If `bazar` is true, the newly created collection will be registered to [the Bazar collection registry](https://bazar.arweave.dev/#/collections/).

```js
const collection = new Collection({ ao })

const { pid: collection_pid } = await collection.create({ 
  info: { title, description, thumbnail, banner }, bazar
})
```

#### Get Info

```js
const { out: info } = await collection.info()
```

#### Update Info

At leadt one field is required.

```js
const { err } = await collection.updateInfo({ 
  title, description, thumbnail, banner
})
```

#### Add Single Asset

```js
const { err } = await collection.addAsset(asset_pid)
```

#### Remove Single Asset

```js
const { err } = await collection.removeAsset(asset_pid)
```

#### Add Multiple Assets

```js
const { err } = await collection.addAssets(asset_pids)
```

#### Remove Multiple Assets

```js
const { err } = await collection.removeAssets(asset_pids)
```

### Advanced Methods

#### createRegistry

You can create a new collection registry.

```js
const { err, pid } = await collection.createRegistry()

```

## Asset

- [Instantiate](#instantiate-4)
- [create](#create-asset)
- [info](#get-info-1)

### Instantiate

All arguments are optional. `asset.profile`, `asset.ao`, `asset.ar` will be available.

```js
const asset = await new Asset({ 
  pid, asset_src, ar, ao, profile
}).init( jwk || arweaveWallet)
```

### Core Methods

#### Create Asset

```js
const asset = new Asset({ ao })

const { pid: asset_pid } = await asset.create({
  data,
  content_type,
  info: { title, description, thumbnail, banner },
  udl: { payment, access, derivations, commercial, training },
  token: { fraction },
})

await collection.addAsset(pid) // add to a collection
```

##### Universal Data License

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

#### Get Info

```js
const { out: info } = await asset.info()
```

### Token Related Methods

An atomic asset is basically an [ao Token](https://cookbook_ao.g8way.io/references/token.html).

#### Balance

```js
const { err, out: balance } = await asset.balance({ target })
```

#### Balances

```js
const { err, out: balances } = await asset.balances()
```

#### Mint

```js
const { err } = await asset.mint({ quantity })
```

#### Transfer

```js
const { err } = await asset.transfer({ recipint, quantity })
```
If you want to transfer token from the AO profile rather than the profile owner wallet, set `profile` to `true`. The token will be transferred from `asset.profile.id` instead of `asset.ar.addr`.

```js
const { err } = await asset.transfer({ recipint, quantity, profile:: true })
```

## Notebook

- [Instantiate](#instantiate-5)
- [addNote](#add-single-note)
- [removeNote](#remove-single-note)
- [addNotes](#add-multiple-notes)
- [removeNotes](#remove-multiple-notes)

`Notebook` inherites everything from `Collection` with a bit of name changes in some methods.

### Instantiate

All arguments are optional. `notebook.profile`, `notebook.ao`, `notebook.ar` will be available.

```js
const notebook = await new Notebook({ 
  pid, registry, registry_src, thumbnail, banner, notebook_src, profile, ar, ao
}).init( jwk || arweaveWallet )
```

#### Add Single Note

```js
const { err } = await notebook.addNote(note_pid)
```

#### Remove Single Note

```js
const { err } = await notebook.removeNote(note_pid)
```

#### Add Multiple Notes

```js
const { err } = await notebook.addNotes(note_pids)
```

#### Remove Multiple Notes

```js
const { err } = await notebook.removeNotes(note_pids)
```

## Note

- [Instantiate](#instantiate-6)
- [updateInfo](#update-info-1)
- [list](#list-versions)
- [get](#get-note-content-with-metadata)
- [update](#update-new-version)
- [editors](#get-editors)
- [addEditor](#add-editor)
- [removeEditor](#remove-editor)

`Note` inherites everything from `Asset` with some added functions specific to atomic-notes.

### Instantiate

All arguments are optional. `note.profile`, `note.ao`, `note.ar` will be available.

```js
const note = await new Note({
  pid, note_src, notelib_src, proxy, render_with, ar, ao, profile
}).init( jwk || arweaveWallet)
```

### Core Methods

#### Update Info

```js
const { err } = await asset.updateInfo({ title, description, thumbnail })
```
#### List Versions

```js
const { out: versions } = await note.list()
```

#### Get Note Content with Metadata

If `version` is omitted, it returns the latest version.

```js
const { out: atomic_note } = await note.get(version)
```

#### Update New Version

```js
const { err } = await note.update(data, version)
```

`version` should be higher than the current version, or it can be `major`, `minor`, or `patch` for automatically bumping the respective part of the current version.

#### Get Editors

```js
const { out: editors } = await note.editors()
```

#### Add Editor

```js
const { err, out: editors } = await note.addEditor(editors)
```

#### Remove Editor

```js
const { err, out: editors } = await note.removeEditor(editors)
```
