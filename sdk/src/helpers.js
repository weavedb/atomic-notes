import { Note, Profile, AR, AO, Collection, Notebook } from "./index.js"
import { expect } from "chai"
import { createDataItemSigner, connect } from "@permaweb/aoconnect"
import { resolve } from "path"
import { mkdirSync, existsSync, writeFileSync, readFileSync } from "fs"
import yargs from "yargs"
const {
  reset = false,
  cache = false,
  auth = null,
} = yargs(process.argv.slice(2)).argv

export class Src {
  constructor({ ar, dir }) {
    this.ar = ar
    this.dir = dir ?? resolve(import.meta.dirname)
  }
  data(file, ext = "lua") {
    return readFileSync(
      `${this.dir}/${file}.${ext}`,
      ext === "wasm" ? null : "utf8",
    )
  }
  async upload(file, ext = "lua") {
    const res = await this.ar.post({ data: this.data(file, ext) })
    return res.err ? null : res.id
  }
}

export const setup = async ({
  aoconnect,
  arweave,
  cacheDir = ".cache",
  targets = { profile: false, note: false, asset: false },
} = {}) => {
  if (targets.asset || targets.note) targets.profile = true
  let opt = null
  console.error = () => {}
  console.warn = () => {}
  const dir = resolve(import.meta.dirname, "lua")
  const thumbnail = readFileSync(`${dir}/../assets/thumbnail.png`)
  const banner = readFileSync(resolve(`${dir}/../assets/banner.png`))
  const _cacheDir = resolve(import.meta.dirname, cacheDir)
  const optPath = `${_cacheDir}/opt.json`
  if (cache && !reset) {
    try {
      if (existsSync(optPath)) {
        opt = JSON.parse(readFileSync(optPath, "utf8"))
      } else {
        console.log("cache doesn't exist:", optPath)
      }
    } catch (e) {
      console.log(e)
    }
  }

  if (opt) {
    const ar = await new AR(opt.ar).init(opt.jwk)
    const src = new Src({ ar, readFileSync, dir })
    const ao = await new AO(opt.ao).init(opt.jwk)
    const ao2 = await new AO(opt.ao2).init(opt.jwk)
    const profile = opt.targets.profile
      ? await new Profile({ ...opt.profile, ao }).init(opt.jwk)
      : null
    console.log("cache:\t", optPath)
    console.log("addr:\t", ar.addr)
    return { opt, thumbnail, banner, ar, ao2, ao, profile, src }
  }

  // ar
  arweave ??= { port: 4000 }
  aoconnect ??= {
    MU_URL: "http://localhost:4002",
    CU_URL: "http://localhost:4004",
    GATEWAY_URL: "http://localhost:4000",
  }
  const ar = new AR(arweave)
  await ar.gen("10")
  const src = new Src({ ar, readFileSync, dir })
  opt = { ar: { ...arweave }, jwk: ar.jwk }

  // ao
  const wasm = await src.upload("aos-sqlite", "wasm")
  const wasm2 = await src.upload("aos", "wasm")
  const wasm_aos2 = await src.upload("aos2_0_1", "wasm")

  const ao = new AO({ aoconnect, ar, authority: auth })
  const { id: module_aos2 } = await ao.postModule({
    data: await ar.data(wasm_aos2),
  })

  const { id: module_sqlite } = await ao.postModule({
    data: await ar.data(wasm),
    overwrite: true,
  })

  const { id: module } = await ao.postModule({
    data: await ar.data(wasm2),
    overwrite: true,
  })

  const { scheduler } = await ao.postScheduler({
    url: "http://su",
    overwrite: true,
  })
  opt.ao = {
    module: module_sqlite,
    scheduler,
    aoconnect,
    ar: opt.ar,
    authority: auth,
  }

  const ao2 = await new AO({
    aoconnect,
    ar,
    authority: auth,
    module: module_aos2,
    scheduler,
  }).init(ar.jwk)

  opt.ao2 = {
    module: module_aos2,
    scheduler,
    aoconnect,
    ar: opt.ar,
    authority: auth,
  }

  if (auth) opt.ao.authority = auth
  opt.authority = auth
  opt.targets = targets
  opt.modules = {
    aos2: module_aos2,
    aos1: module,
    sqlite: module_sqlite,
  }
  let profile = null
  if (targets.profile) {
    // profile
    const registry_src = await src.upload("registry000")
    const profile_src = await src.upload("profile000")
    profile = new Profile({ profile_src, registry_src, ao })
    await profile.createRegistry({})

    opt.profile = {
      module: module_sqlite,
      registry_src,
      registry: profile.registry,
      profile_src,
      ao: opt.ao,
    }
    if (targets.asset || targets.note) {
      const collection_registry_src = await src.upload("collection-registry")
      const collection_src = await src.upload("collection")
      const notebook_src = await src.upload("notebook")
      if (targets.note) {
        // notebook
        const notebook = new Notebook({
          notebook_src,
          registry_src: collection_registry_src,
          profile,
        })
        await notebook.createRegistry()
        opt.notebook = {
          notebook_src,
          registry: notebook.registry,
          registry_src: collection_registry_src,
          profile: opt.profile,
        }

        // note
        const notelib_src = await src.upload("atomic-note-library")
        const note_src = await src.upload("atomic-note")
        const proxy = await src.upload("proxy")
        const { pid: proxy_pid } = await ao.deploy({ src: proxy, module })
        opt.note = {
          proxy: proxy_pid,
          note_src,
          profile: opt.profile,
        }
        const { mid } = await ao.deploy({
          tags: { Library: "Atomic-Notes", Version: "1.0.0" },
          src: notelib_src,
        })
        opt.note.notelib_mid = mid
      }
      if (targets.asset) {
        // collection
        const collection = new Collection({
          collection_src: notebook_src,
          registry_src: collection_registry_src,
          profile,
        })
        await collection.createRegistry()

        opt.collection = {
          collection_src,
          registry: collection.registry,
          registry_src: collection_registry_src,
          profile: opt.profile,
        }

        // asset
        const asset_src = await src.upload("atomic-asset")
        opt.asset = { asset_src, profile: opt.profile }
      }
    }
  }
  if (cache) {
    if (!existsSync(_cacheDir)) mkdirSync(_cacheDir)
    writeFileSync(optPath, JSON.stringify(opt))
  }
  return { opt, profile, ao, ar, thumbnail, banner, src, ao2 }
}

export const ok = obj => {
  if (obj.err) console.log(obj.err)
  expect(obj.err).to.eql(null)
  return obj
}

export const fail = obj => {
  if (!obj.err) console.log(obj.res)
  expect(obj.err).to.not.eql(null)
  return obj
}
