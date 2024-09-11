import { readFileSync } from "fs"
import { resolve } from "path"
import { Profile, AR, AO, Notebook } from "../../src/index.js"
import { wait } from "../../src/utils.js"
import { expect } from "chai"

class Src {
  constructor({ ar, base = "../../src/lua" }) {
    this.ar = ar
    this.base = base
  }
  async upload(file, ext = "lua") {
    const data = readFileSync(
      resolve(import.meta.dirname, `${this.base}/${file}.${ext}`),
      ext === "wasm" ? null : "utf8",
    )
    const res = await this.ar.post({ data })
    return res.err ? null : res.id
  }
}

const aoconnect = {
  MU_URL: "http://localhost:4002",
  CU_URL: "http://localhost:4004",
  GATEWAY_URL: "http://localhost:4000",
}

const arweave = { port: 4000 }

import { createDataItemSigner, connect } from "@permaweb/aoconnect"

const setup = async () => {
  console.error = () => {}
  console.warn = () => {}
  const thumbnail = readFileSync(
    resolve(import.meta.dirname, `../assets/thumbnail.png`),
  )
  const banner = readFileSync(
    resolve(import.meta.dirname, `../assets/banner.png`),
  )
  const ar = new AR(arweave)
  await ar.gen("10")
  const src = new Src({ ar })
  const library = await src.upload("atomic-note-library")
  const registry_src = await src.upload("registry000")
  const profile_src = await src.upload("profile000")
  const collection_registry_src = await src.upload("collection-registry")
  const collection = await src.upload("notebook")
  const atomic_note = await src.upload("atomic-note")
  const proxy = await src.upload("proxy")
  const wasm = await src.upload("aos-sqlite", "wasm")
  const wasm2 = await src.upload("aos", "wasm")

  const ao = new AO({ aoconnect, ar })
  const { id: module } = await ao.postModule({
    data: await ar.data(wasm),
    overwrite: true,
  })

  const { id: module2 } = await ao.postModule({ data: await ar.data(wasm2) })
  const { scheduler } = await ao.postScheduler({
    url: "http://su",
    overwrite: true,
  })
  const profile = new Profile({ profile_src, registry_src, ao })
  await profile.createRegistry({})
  const notebook = new Notebook({
    registry_src: collection_registry_src,
    profile,
  })
  const { err, pid: collection_registry_pid } = await notebook.createRegistry()
  const { pid: proxy_pid } = await ao.deploy({ src: proxy, module: module2 })
  let opt = {
    ar: { ...arweave },
    profile: {
      registry_src,
      registry: profile.registry,
      profile_src,
    },
    ao: {
      module,
      scheduler,
      aoconnect,
    },
    note: { proxy: proxy_pid, note_src: atomic_note, notelib_src: library },
    notebook: {
      notebook_src: collection,
      registry: collection_registry_pid,
    },
  }
  return { opt, profile, ao, ar, thumbnail, banner }
}

const ok = obj => {
  expect(obj.err).to.eql(null)
  return obj
}
const fail = obj => {
  expect(obj.err).to.not.eql(null)
  return obj
}

export { Src, setup, ok, fail }
