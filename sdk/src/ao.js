import Arweave from "arweave"
import { ArweaveSigner, bundleAndSignData, createData } from "arbundles"
import {
  createDataItemSigner,
  connect,
  assign,
  result,
  message,
  spawn,
  dryrun,
} from "@permaweb/aoconnect"
import { map, prop, is, mergeLeft, assoc } from "ramda"
import {
  searchTag,
  wait,
  query,
  isLocalhost,
  tag,
  action,
  getTag,
  isData,
  getTagVal,
} from "./utils.js"

class AO {
  constructor({
    module = "cNlipBptaF9JeFAf4wUmpi43EojNanIBos3EfNrEOWo",
    scheduler = "_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA",
    registry = "SNy4m-DrqxWl01YqGM4sxI8qCni-58re8uuJLvZPypY",
    arweave = { host: "arweave.net", port: 443, protocol: "https" },
    aoconnect,
  } = {}) {
    let _arweave = arweave
    if (!_arweave.host) _arweave.host = "127.0.0.1"
    if (!_arweave.protocol)
      _arweave.protocol = isLocalhost(_arweave.host) ? "http" : "https"
    if (!_arweave.port) _arweave.port = isLocalhost(_arweave.host) ? 1984 : 443
    if (aoconnect) {
      const { assign, result, message, spawn, dryrun } = connect(aoconnect)
      this.assign = assign
      this.result = result
      this.message = message
      this.spawn = spawn
      this.dryrun = dryrun
    } else {
      this.assign = assign
      this.result = result
      this.message = message
      this.spawn = spawn
      this.dryrun = dryrun
    }
    this.registry = registry
    this.module = module
    this.scheduler = scheduler
    this.port = _arweave.port
    this.arweave = Arweave.init(arweave)
    this.host = _arweave.host
    this.protocol = _arweave.protocol
  }
  async init(jwk) {
    this.jwk = jwk
    this.addr = await this.toAddr(jwk)
    this.pub = jwk.n
    this.signer = createDataItemSigner(jwk)
    await this.profile()
    return this
  }
  async mine() {
    await this.arweave.api.get(`/mine`)
  }

  async balance(addr = this.addr) {
    return this.toAR(await this.arweave.wallets.getBalance(addr))
  }

  async mint(addr, amount = "1.0") {
    await this.arweave.api.get(`/mint/${addr}/${this.toWinston(amount)}`)
    await this.mine()
    return await this.balance(addr)
  }

  toWinston(ar) {
    return this.arweave.ar.arToWinston(ar)
  }

  toAR(w) {
    return this.arweave.ar.winstonToAr(w)
  }

  async toAddr(jwk = this.jwk) {
    return await this.arweave.wallets.jwkToAddress(jwk)
  }

  async gen(amount, overwrite = false) {
    const jwk = await this.arweave.wallets.generate()
    const addr = await this.toAddr(jwk)
    if (!this.jwk || overwrite) {
      this.jwk = jwk
      this.pub = jwk.n
      this.addr = addr
      this.signer = createDataItemSigner(jwk)
    }
    let bal = "0"
    if (amount && isLocalhost(this.host)) bal = await this.mint(addr, amount)
    return { jwk, addr, pub: jwk.n, bal }
  }

  async transfer(ar, target, jwk = this.jwk) {
    let tx = await this.arweave.createTransaction({
      target,
      quantity: this.toWinston(ar),
    })
    return await this.postTx(tx, jwk)
  }

  async bundle(_items, jwk = this.jwk) {
    const signer = new ArweaveSigner(jwk)
    const items = _items.map(v => {
      let tags = []
      for (const k in v[1] && {}) {
        if (is(Array)(v[1][k])) {
          for (const v of v[1][k]) tags.push(tag(k, v))
        } else {
          tags.push(tag(k, v[1][k]))
        }
      }
      return createData(v[0], signer, { tags, ...(v[2] ?? {}) })
    })
    const bundle = await bundleAndSignData(items, signer)
    const tx = await bundle.toTransaction({}, this.arweave, jwk)
    await this.postTx(tx, jwk)
    return { items, tx, id: tx.id }
  }

  async post({ data, tags = {}, jwk = this.jwk }) {
    let tx = await this.arweave.createTransaction({ data: data })
    for (const k in tags) {
      if (is(Array)(tags[k])) {
        for (const v of tags[k]) tx.addTag(k, v)
      } else {
        tx.addTag(k, tags[k])
      }
    }
    return this.postTx(tx, jwk)
  }

  async postTx(tx, jwk = this.jwk) {
    await this.arweave.transactions.sign(tx, jwk)
    await this.arweave.transactions.post(tx)
    if (isLocalhost(this.host)) await this.mine()
    return tx.id
  }

  async tx(txid) {
    const json = await fetch(
      `${this.protocol}://${this.host}:${this.port}/graphql`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query(txid) }),
      },
    ).then(r => r.json())
    return json.data.transactions.edges.map(v => v.node)[0] ?? null
  }

  async data(txid, string = false) {
    return await this.arweave.transactions.getData(txid, {
      decode: true,
      string,
    })
  }

  async postModule({ data, jwk, tags = {} }) {
    const _tags = mergeLeft(tags, {
      "Data-Protocol": "ao",
      Variant: "ao.TN.1",
      Type: "Module",
      "Module-Format": "wasm64-unknown-emscripten-draft_2024_02_15",
      "Input-Encoding": "JSON-V1",
      "Output-Encoding": "JSON-V1",
    })
    return await this.post({ data, jwk, tags: _tags })
  }

  async postScheduler({ jwk = this.jwk, url, tags = {} }) {
    const _tags = mergeLeft(tags, {
      "Data-Protocol": "ao",
      Variant: "ao.TN.1",
      Type: "Scheduler-Location",
      Url: url,
      "Time-To-Live": "1000000000",
    })
    await this.post({ data: "1984", jwk, tags: _tags })
    this.scheduler = await this.toAddr(jwk)
    return this.scheduler
  }

  async spw({
    module = this.module,
    scheduler = this.scheduler,
    jwk = this.jwk,
    tags = [],
    data,
  }) {
    const pid = await this.spawn({
      module,
      scheduler,
      signer: createDataItemSigner(jwk),
      tags: [
        { name: "Memory-Limit", value: "500-mb" },
        { name: "Compute-Limit", value: "9000000000000" },
        ...tags,
      ],
      data,
    })
    return pid
  }

  async msg({
    pid,
    jwk = this.jwk,
    data,
    action: _action = "Eval",
    tags = {},
    check,
    checkData,
    get,
  }) {
    let err = null
    let mid = null
    let res
    let _tags = [action(_action)]
    let out = null
    for (const k in tags) {
      if (is(Array)(tags[k])) {
        for (const v of tags[k]) _tags.push(tag(k, v))
      } else {
        _tags.push(tag(k, tags[k]))
      }
    }
    try {
      mid = await this.message({
        process: pid,
        signer: createDataItemSigner(jwk),
        tags: _tags,
        data,
      })
      const _res = await this.result({ process: pid, message: mid })
      res = _res
      for (const k in check ?? {}) {
        if (!searchTag(_res, k, check[k])) {
          err = "something went wrong"
          break
        }
      }
      if (checkData) {
        if (!isData(checkData, _res)) err = "something went wrong"
      }
      if (!err && get) out = getTagVal(get, res)
    } catch (e) {
      err = e
    }
    return { mid, res, err, out }
  }

  async asg({ pid, mid, jwk = this.jwk, check }) {
    let err = null
    let res = null
    try {
      mid = await this.assign({
        process: pid,
        message: mid,
        signer: createDataItemSigner(jwk),
      })
      const _res = await this.result({ process: pid, message: mid })
      if (!_res) err = "something went wrong"
      res = _res.Messages[0]
      for (const k in check ?? {}) {
        if (!searchTag(_res, k, check[k])) {
          err = "something went wrong"
          break
        }
      }
    } catch (e) {
      err = e
    }
    return { mid, res, err }
  }

  async dry({
    pid,
    jwk = this.jwk,
    data,
    action: _action = "Eval",
    tags = {},
    check,
    checkData,
    get,
  }) {
    let err = null
    let res
    let _tags = [action(_action)]
    let out = null
    for (const k in tags) {
      if (is(Array)(tags[k])) {
        for (const v of tags[k]) _tags.push(tag(k, v))
      } else {
        _tags.push(tag(k, tags[k]))
      }
    }
    try {
      const _res = await this.dryrun({
        process: pid,
        signer: createDataItemSigner(jwk),
        tags: _tags,
        data,
      })
      res = _res
      for (const k in check ?? {}) {
        if (!searchTag(_res, k, check[k])) {
          err = "something went wrong"
          break
        }
      }
      if (checkData) {
        if (!isData(checkData, _res)) err = "something went wrong"
      }
      if (!err && get) out = getTagVal(get, res)
    } catch (e) {
      err = e
    }
    return { res, err, out }
  }

  async eval({ pid, jwk = this.jwk, data }) {
    let err = null
    const {
      res,
      mid,
      err: _err,
    } = await this.msg({ pid, jwk, data, action: "Eval" })
    if (_err || typeof res.Output?.data !== "object") {
      err = "something went wrong"
    }
    return { err, mid, res }
  }

  async initRegistry({ registry, jwk = this.jwk }) {
    this.registry = registry
    return await this.msg({
      pid: registry,
      jwk,
      action: "Prepare-Database",
    })
  }

  async updateProfile({ jwk, profile, pid }) {
    return await this.msg({
      pid,
      jwk,
      data: JSON.stringify(profile),
      action: "Update-Profile",
    })
  }

  async ids({
    registry = this.registry,
    addr = this.addr,
    jwk = this.jwk,
  } = {}) {
    const res = await this.dryrun({
      signer: createDataItemSigner(jwk),
      process: registry,
      tags: [{ name: "Action", value: "Get-Profiles-By-Delegate" }],
      data: JSON.stringify({ Address: addr }),
    })
    const _ids = map(
      prop("ProfileId"),
      JSON.parse(res.Messages?.[0]?.Data ?? []),
    )
    if (_ids[0] && addr === this.addr) this.id = _ids[0]
    return _ids
  }

  async profile({ registry = this.registry, id, jwk = this.jwk } = {}) {
    if (!id) id = this.id ?? (await this.ids())[0]
    if (!id) return null
    const res = await this.dryrun({
      signer: createDataItemSigner(jwk),
      process: registry,
      tags: [{ name: "Action", value: "Get-Metadata-By-ProfileIds" }],
      data: JSON.stringify({ ProfileIds: [id] }),
    })
    const prof = JSON.parse(res.Messages[0]?.Data ?? [])[0] ?? null
    if (id === this.id) this.prof = prof
    return prof
  }

  async info({ id, registry = this.registry, jwk = this.jwk } = {}) {
    if (!id) id = this.id ?? (await this.ids())[0]
    if (!id) return null
    const res = await this.dryrun({
      signer: createDataItemSigner(jwk),
      process: id,
      tags: [{ name: "Action", value: "Info" }],
    })
    const prof = JSON.parse(res.Messages[0]?.Data ?? null)
    return prof ? assoc("Id", id, prof) : null
  }

  async load({ src, fills, pid }) {
    let _data = await this.data(src, true)
    for (const k in fills) {
      let text = fills[k]
      if (typeof text === "number") text = Number(text).toString()
      _data = _data.replace(
        new RegExp(`\<${k}\>`, "g"),
        text.replace(/'/g, "\\'"),
      )
    }

    const { err, res, mid } = await this.eval({ data: _data, pid })
    if (err) {
      return { pid, err }
    } else {
      await wait(1000)
      return { pid }
    }
  }

  async deploy({
    loads,
    src,
    fills = {},
    module = this.module,
    scheduler = this.scheduler,
    jwk = this.jwk,
    tags = [],
    data,
  }) {
    const pid = await this.spw({ module, scheduler, jwk, tags, data })
    await wait(1000)
    if (!loads) {
      loads = [{ src, fills }]
    }
    for (const v of loads) {
      const { err } = await this.load({ ...v, pid })
      if (err) return { err, pid }
    }
    return { pid }
  }
}

export default AO
