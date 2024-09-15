# Local Testing Atomic Notes

## Install AO Localnet

Make sure you have NodeJS v.22+ and Docker installed.

```bash
git clone -b hotfix https://github.com/weavedb/ao-localnet.git
cd ao-localnet/wallets && ./generateAll.sh
cd ../ && sudo docker compose --profile explorer up
```

- ArLocal : [localhost:4000](http://localhost:4000)
- GraphQL : [localhost:4000/graphql](http://localhost:4000/graphql)
- Scar : [localhost:4006](http://localhost:4006)
- MU : [localhost:4002](http://localhost:4002)
- SU : [localhost:4003](http://localhost:4003)
- CU : [localhost:4004](http://localhost:4004)

In another terminal, set up the AOS environment.

```bash
cd ao-localnet/seed && ./download-aos-module.sh
./seed-for-aos.sh
cd ../wallets && node printWalletAddresses.mjs
```

## Testing with Mocha

```js
mkdir aonote-test && cd aonote-test && mkdir test && touch test/test.js && npm init
```

Edit `package.json` to add `test` command and `"type": "module"` to run ESM scripts.

```json
{
  "name": "aonote-test",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "mocha"
  }
}
```

Install the dependencies.
```js
npm i aonote && npm i mocha chai --dev
```

Edit`test/test.js`.

```js
import { setup, ok, fail } from "aonote/test/helpers.js"
import { expect } from "chai"
import { AR, AO, Profile, Note, Notebook } from "aonote"

describe("Atomic Notes", function () {
  this.timeout(0)
  let ao, opt, profile, ar, thumbnail, banner

  before(async () => {
    ;({ thumbnail, banner, opt, ao, ar, profile } = await setup({}))
  })
  
  it("should create an AO profile", async () => {
    const my_profile = {
      DisplayName: "Tomo",
      UserName: "0xtomo",
      Description: "The Permaweb Hacker",
    }
    const { pid } = ok(await profile.createProfile({ profile: my_profile }))
    expect((await profile.profile()).DisplayName).to.eql("Tomo")
  })
})
```

Run the tests.

```bash
npm test
```

## aoNote Test Helpers

The `setup` function will

- generate an Arweave wallet
- deploy Wasm modules and Lua sources to Arweave
- deploy the AOS module
- upload a scheduler
- create a profile registry
- ccreate a collection registry
- deploy a note proxy

and returns

- `ar` : AR initialized by the generated wallet
- `ao` : AO initialized by the AR
- `profile` : Profile initialized by the AO
- `thumbnail`: a sample thumbnail binary data
- `banner` : a sample banner binary data
- `opt` : parameters for AR/AO/Profile/Note/Notebook to pass to instantiate


Use `opt` to instantiate the aoNote classes.

```js
const ar2 = new AR(opt.ar)
const ao2 = new AO(opt.ao)
const profile2 = new Profile(opt.profile)
const notebook = new Notebook(opt.notebook)
const note = new Note(opt.note)
```

If you want to initialize them with the same wallet used for the setup, use `ar.jwk` with `init`.

```js
it("should instantiate AR with the setup wallet", async () => {
  const ar2 = await new AR(opt.ar).init(jwk)
  expect(ar2.addr).to.eql(ar.addr)
})
```

`ok` and `fail` can check if the function call is successful or not.

```js
it("should succeed", async () => {
  ok(await profile.createProfile({ profile: my_profile }))
})

it("should fail", async () => {
  fail(await profile.createProfile({ profile: {} }))
})
```
