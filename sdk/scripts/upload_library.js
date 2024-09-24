import { AO } from "../src/index.js"
import { resolve } from "path"
import { readFileSync } from "fs"
import { srcs } from "../src/utils.js"

const jwk = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "keyfile.json"), "utf8"),
)

const main = async () => {
  const ao = await new AO({}).init(jwk)
  const { pid } = await ao.spwn({
    tags: { Library: "Atomic-Notes", Version: "1.0.0" },
  })
  await ao.wait({ pid })
  const { mid } = await ao.load({ src: srcs.notelib_src, pid })
  console.log(mid)
}

main()
