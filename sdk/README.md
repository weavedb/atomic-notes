# Atomic Notes SDK

## Installation

Use `npm` due to its imcompatibility with `yarn`.

```bash
npm i atomic-notes
```

```js
import { Note, Notebook } from "atomic-notes"
```

## Responses

All API calls return a response in the format `{ error, res }` unless mentioned otherwise.

```js
const { error, res: versions } = await note.list()

if(!error) console.log(versions)
```

## Notebook

### Create Notebook

```js
const notebook = new Notebook({ wallet: arweaveWallet })

const { pid } = await notebook.spawn(TAGS)

await note.eval(COLLECTION_LUA_SCRIPT)

await notebook.add(PROFILE_ID)
```
### Get Info

```js
const { res } = await notebook.info()
```

### Update Info

```js
await notebook.info(NEW_COLLECTION_NOTE_LUA_SCRIPT)
```

## Note

### Create Note

```js
const note = new Note({ wallet: arweaveWallet })

const { pid } = await note.spawn(MARKDOWN, TAGS)

await notebook.eval(AOMIC_NOTE_LUA_SCRIPT)

await note.allow()

await note.init()

await note.add(PROFILE_ID)

const notebook = new Notebook({ wallet: arweaveWallet, pid: NOTEBOOK_PID })

await notebook.update(pid)
```

### Get Info

```js
const { res } = await note.info()
```

### Update Info

```js
await note.info(NEW_ATOMIC_NOTE_LUA_SCRIPT)
```

### List Versions

```js
const { res } = await note.list()
```

### Get Note Content

```js
const { res } = await note.get(VERSION)
```

### Update New Version

```js
const { res: patches } = await note.patches(NEW_MARKDOWN)

await note.update(patches, NEW_VERSION)
```
### Get Editors

```js
const { res: editors } = await note.editors()
```

### Add Editor

```js
await note.addEditor(NEW_EDITOR_WALLET_ADDRESS)
```

### Remove Editor

```js
await note.removeEditor(EDITOR_WALLET_ADDRESS)
```

