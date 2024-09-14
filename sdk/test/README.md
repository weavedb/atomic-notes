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
  
  it("should creat an AO profile", async () => {
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
yarn mocha
```
