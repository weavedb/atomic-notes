import { createDataItemSigner } from "@permaweb/aoconnect"

import { DataItem } from "warp-arbundles"
import base64url from "base64url"
import AoLoader from "@permaweb/ao-loader"
import Arweave from "arweave"
import { readFileSync } from "fs"
import { resolve } from "path"
import { clone } from "ramda"
const dirname = async () =>
  typeof __dirname != "undefined"
    ? __dirname
    : (await import("./dirname.js")).default

export const connect = () => {
  let env = { msgs: {} }
  let arweave = Arweave.init()
  let mu = null
  const transform = input => {
    const output = { Tags: [] }
    if (input.Data) output.Data = input.Data
    Object.entries(input).forEach(([key, value]) => {
      if (key !== "Data" && key !== "Tags" && typeof value === "string") {
        output.Tags.push({ name: key, value })
      }
    })
    input.Tags?.forEach(tag => {
      const tagKey = Object.keys(tag)[0]
      const tagValue = tag[tagKey]
      if (typeof tagValue === "string") {
        output.Tags.push({ name: tagKey, value: tagValue })
      }
    })

    return output
  }
  const getMU = async () => {
    if (!mu) {
      const jwk = await arweave.wallets.generate()
      const addr = await arweave.wallets.jwkToAddress(jwk)
      const signer = createDataItemSigner(jwk)
      mu = { jwk, addr, signer }
    }
    return mu
  }

  const genMsg = (p, data, Tags, from, owner, dry = false) => {
    if (!dry) p.height += 1
    return {
      Id: p.height,
      Target: p.id,
      Owner: owner,
      Data: data?.length ? data : "",
      "Block-Height": p.height.toString(),
      Timestamp: Date.now().toString(),
      Module: p.module,
      From: from,
      Cron: false,
      Tags: Tags?.length ? Tags : [],
    }
  }

  const genEnv = ({ pid, owner = "", module = "", auth = "" }) => {
    return {
      Process: {
        Id: pid,
        Tags: [
          { name: "Data-Protocol", value: "ao" },
          { name: "Variant", value: "ao.TN.1" },
          { name: "Type", value: "Process" },
          { name: "Authority", value: auth },
        ],
        Owner: owner,
      },
      Module: {
        Id: module,
        Tags: [
          { name: "Data-Protocol", value: "ao" },
          { name: "Variant", value: "ao.TN.1" },
          { name: "Type", value: "Module" },
        ],
      },
    }
  }

  const parse = async opt => {
    const item = await opt.signer({ data: opt.data ?? "", tags: opt.tags })
    const rowner = new DataItem(item.raw).rawOwner
    const hashBuffer = Buffer.from(
      await crypto.subtle.digest("SHA-256", rowner),
    )
    const owner = base64url.encode(hashBuffer)
    return { id: item.id, owner }
  }

  const message = async opt => {
    const p = env[opt.process]
    let ex = false
    for (let v of opt.tags) {
      if (v.name === "Type") ex = true
    }
    if (!ex) opt.tags.push({ name: "Type", value: "Message" })
    const { id, owner } = await parse(opt)
    try {
      const _mu = await getMU()
      const msg = genMsg(
        p,
        opt.data ?? "",
        opt.tags,
        opt.from ?? owner,
        _mu.addr,
      )
      const _env = genEnv({
        pid: p.id,
        owner: p.owner,
        module: p.module,
        auth: _mu.addr,
      })
      const res = await p.handle(p.memory, msg, _env)
      p.memory = res.Memory
      delete res.Memory
      p.res[id] = res
      p.results.push(id)
      p.txs.unshift({ id: id, ...opt })
      env.msgs[id] = opt
      for (const v of res.Messages ?? []) {
        if (env[v.Target]) {
          await message({
            process: v.Target,
            tags: v.Tags,
            data: v.Data,
            signer: _mu.signer,
            from: opt.process,
          })
        }
      }
      return id
    } catch (e) {
      console.log(e)
    }
    return null
  }

  return {
    message,
    txs: async pid => {
      let _txs = []
      for (let v of env[pid].txs) _txs.push({ tags: v.tags, id: v.id })
      return _txs
    },
    spawn: async opt => {
      if (!env.module) {
        const __dirname = await dirname()
        const wasm = readFileSync(resolve(__dirname, "lua/aos2_0_1.wasm"))
        const handle = await AoLoader(wasm, {
          format: "wasm64-unknown-emscripten-draft_2024_02_15",
        })
        env.module = { handle, module: opt.module }
      }
      let ex = false
      for (let v of opt.tags) {
        if (v.name === "Type") ex = true
      }
      if (!ex) opt.tags.push({ name: "Type", value: "Process" })

      const { id, owner } = await parse(opt)
      env.msgs[id] = opt
      env[id] = {
        id: id,
        handle: env.module.handle,
        module: env.module.module,
        memory: null,
        owner,
        height: 1,
        res: { id: null },
        results: [id],
        txs: [],
      }
      return id
    },

    assign: async opt => {
      const p = env[opt.process]
      let _opt = clone(env.msgs[opt.message])
      const { id, owner } = await parse(_opt)
      try {
        const _mu = await getMU()
        const msg = genMsg(
          p,
          _opt.data ?? "",
          _opt.tags,
          _opt.from ?? owner,
          _mu.addr,
        )
        const _env = genEnv({
          pid: p.id,
          owner: p.owner,
          module: p.module,
          auth: _mu.addr,
        })
        const res = await p.handle(p.memory, msg, _env)
        p.memory = res.Memory
        delete res.Memory
        p.res[id] = res
        p.results.push(id)
        p.txs.unshift({ id: id, ..._opt })
        env.msgs[id] = _opt
        for (const v of res.Messages ?? []) {
          if (env[v.Target]) {
            await message({
              process: v.Target,
              tags: v.Tags,
              data: v.Data,
              signer: _mu.signer,
              from: opt.process,
            })
          }
        }
        return id
      } catch (e) {
        console.log(e)
      }
      return null
    },

    result: async opt => {
      return env[opt.process].res[opt.message]
    },

    results: async opt => {
      const p = env[opt.process]
      let results = []
      const limit = opt.limit ?? 25
      if (opt.sort === "DESC") {
        for (let i = p.results.length - 1; 0 < i; i--) {
          results.push({ cursor: p.results[i], node: p.res[p.results[i]] })
          if (results.length >= limit) break
        }
      } else {
        for (let i = 0; i < p.results.length; i++) {
          results.push({ node: p.res[p.results[i]] })
          if (results.length >= limit) break
        }
      }
      return { edges: results }
    },

    dryrun: async opt => {
      const p = env[opt.process]
      const { id, owner } = await parse(opt)
      try {
        const _mu = await getMU()
        const msg = genMsg(p, opt.data ?? "", opt.tags, owner, _mu.addr, true)
        const _env = genEnv({
          pid: p.id,
          owner: p.owner,
          module: p.module,
          auth: _mu.addr,
        })
        const res = await p.handle(p.memory, msg, _env)
        return res
      } catch (e) {
        console.log(e)
      }
      return null
    },
  }
}
