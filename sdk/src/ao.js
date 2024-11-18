import * as WarpArBundles from "warp-arbundles"
const pkg = WarpArBundles.default ? WarpArBundles.default : WarpArBundles
const { createData, ArweaveSigner } = pkg
import AR from "./ar.js"
import {
  createDataItemSigner,
  connect,
  assign,
  result,
  message,
  spawn,
  dryrun,
} from "@permaweb/aoconnect"

import { is, mergeLeft } from "ramda"

import {
  searchTag,
  wait,
  isLocalhost,
  tag,
  action,
  isData,
  getTagVal,
  srcs,
} from "./utils.js"

function createDataItemSigner2(wallet) {
  const signer = async ({ data, tags, target, anchor }) => {
    const signer = new ArweaveSigner(wallet)
    const dataItem = createData(data, signer, { tags, target, anchor })
    return dataItem.sign(signer).then(async () => ({
      id: await dataItem.id,
      raw: await dataItem.getRaw(),
    }))
  }
  return signer
}

class AO {
  constructor({
    authority = srcs.authority,
    module = srcs.module,
    scheduler = srcs.scheduler,
    aoconnect,
    ar = {},
  } = {}) {
    this.__type__ = "ao"
    if (ar?.__type__ === "ar") {
      this.ar = ar
    } else {
      let _ar = typeof ar === "object" ? ar : {}
      this.ar = new AR(ar)
    }

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
    this.module = module
    this.scheduler = scheduler
  }

  async init(jwk) {
    await this.ar.init(jwk)
    return this
  }

  toSigner(wallet) {
    if (wallet?.n && typeof window !== "undefined") {
      return createDataItemSigner2(wallet)
    } else if (wallet.test) {
      return createDataItemSigner(wallet.jwk)
    } else {
      return createDataItemSigner(wallet)
    }
  }

  async pipe({ jwk, fns = [], cb }) {
    let out = {}
    let res = []
    let nextArgs = fns[0].args ?? {}
    let i = 0
    let err = null
    let pid = null
    let mid = null
    let id = null
    let _ = {}
    let ret = null
    if (!jwk) fns.unshift({ fn: "checkWallet" })
    const copy = ({ _, inp, out, args, from, to, pid, mid, id }) => {
      const _from = from.split(".")
      const _to = to.split(".")
      let target = null
      let field = null
      let val = null
      if (_to[0] === "_") {
        target = _
        field = _to.slice(1).join(".")
      } else if (_to[0] === "args") {
        target = args
        field = _to.slice(1).join(".")
      } else if (_to[0] === "out") {
        target = out
        field = _to.slice(1).join(".")
      } else {
        target = out
        field = _to.join(".")
      }
      if (from === "inp") {
        val = inp
      } else if (from === "mid") {
        val = mid
      } else if (from === "id") {
        val = id
      } else if (from === "pid") {
        val = pid
      } else if (_from[0] === "args") {
        val = args[_from.slice(1).join(".")] ?? null
      } else if (_from[0] === "out") {
        val = out[_from.slice(1).join(".")] ?? null
      } else if (_from[0] === "inp") {
        val = inp[_from.slice(1).join(".")] ?? null
      } else {
        val = inp[from] ?? null
      }
      if (target) target[field] = val
    }
    const binds = {
      post: this.ar,
      bundle: this.ar,
      postTx: this.ar,
      checkWallet: this.ar,
      transfer: this.ar,
    }
    for (let v of fns) {
      let bind = null
      if (typeof v.fn === "string" && !v.bind) {
        bind = binds[v.fn] ?? this
      } else {
        bind = v.bind ?? this
      }
      const name =
        (v.name ?? typeof !v.fn)
          ? "msg"
          : typeof v.fn === "string"
            ? v.fn
            : null
      const fn = typeof v.fn === "string" ? bind[v.fn] : (v.fn ?? this.msg)

      const _fn = fn.bind(bind)
      const _res = await _fn({ jwk, ...nextArgs })
      res.push(_res)
      if (_res.err) {
        err = _res.err
        break
      }
      if (typeof v.err === "function") {
        const _err = await v.err({
          name,
          _,
          jwk,
          res: _res.res,
          args: nextArgs,
          out,
          pid,
          inp: _res.out,
          mid,
          id,
        })
        if (_err) {
          err = _err
          break
        }
      }
      if (_res.pid) pid = _res.pid
      if (_res.mid) mid = _res.mid
      if (_res.id) id = _res.id
      if (_res.jwk) jwk = _res.jwk
      nextArgs = fns[i + 1]?.args ?? {}
      if (typeof v.then === "function") {
        const _ret = await v.then({
          name,
          _,
          jwk,
          res: _res.res,
          args: nextArgs,
          out,
          pid,
          inp: _res.out,
          mid,
          id,
        })
        if (typeof _ret !== "undefined") {
          ret = _ret
          break
        }
      } else if (is(Object, v.then)) {
        for (const k in v.then) {
          copy({
            name,
            _,
            inp: _res.out,
            out,
            args: nextArgs,
            pid,
            mid,
            from: v.then[k],
            to: k,
            id,
          })
        }
      }
      if (typeof cb === "function") {
        cb({
          name,
          fns,
          i: i + 1,
          _,
          jwk,
          res: _res.res,
          args: nextArgs,
          out,
          pid,
          inp: _res.out,
          mid,
          id,
        })
      }
      i++
    }
    return ret ?? { jwk, err, res, out, pid, mid, id, ..._ }
  }

  async postModule({ data, jwk, tags = {}, overwrite = false }) {
    const _tags = mergeLeft(tags, {
      "Data-Protocol": "ao",
      Variant: "ao.TN.1",
      Type: "Module",
      "Module-Format": "wasm64-unknown-emscripten-draft_2024_02_15",
      "Input-Encoding": "JSON-V1",
      "Output-Encoding": "JSON-V1",
      "Memory-Limit": "500-mb",
      "Compute-Limit": "9000000000000",
    })

    const fns = [
      {
        fn: "post",
        args: { data, tags: _tags },
        then: ({ id }) => {
          if (!this.module || overwrite) this.module = id
        },
      },
    ]
    return await this.pipe({ jwk, fns })
  }

  async postScheduler({ jwk, url, tags = {}, overwrite = false }) {
    const _tags = mergeLeft(tags, {
      "Data-Protocol": "ao",
      Variant: "ao.TN.1",
      Type: "Scheduler-Location",
      Url: url,
      "Time-To-Live": "3600000",
    })
    const then = async ({ jwk, out, _ }) => {
      _.scheduler = await this.ar.toAddr(jwk)
      if (!this.scheduler || overwrite) this.scheduler = _.scheduler
    }
    const fns = [{ fn: "post", args: { tags: _tags }, then }]
    return await this.pipe({ jwk, fns })
  }

  async spwn({
    module = this.module,
    scheduler = this.scheduler,
    jwk,
    tags = {},
    data,
    auth,
  } = {}) {
    let err = null
    ;({ jwk, err } = await this.ar.checkWallet({ jwk }))
    if (err) return { err }

    let pid = null
    try {
      let _tags = []
      for (const k in tags) {
        if (is(Array)(tags[k])) {
          for (const v of tags[k]) _tags.push(tag(k, v))
        } else {
          _tags.push(tag(k, tags[k]))
        }
      }
      if (auth) _tags.Authority = auth
      if (!_tags.Authority && this.authority) _tags.Authority = this.authority
      pid = await this.spawn({
        module,
        scheduler,
        signer: this.toSigner(jwk),
        tags: _tags,
        data,
      })
    } catch (e) {
      err = e
    }
    return { err, pid }
  }

  async msg({
    pid,
    jwk,
    data,
    act = "Eval",
    tags = {},
    check,
    checkData,
    get,
  }) {
    let err = null
    ;({ jwk, err } = await this.ar.checkWallet({ jwk }))
    if (err) return { err }
    let mid = null
    let res = null
    let out = null
    let _tags = [action(act)]
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
        signer: this.toSigner(jwk),
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

  async asgn({ pid, mid, jwk, check, checkData, get }) {
    let err = null
    ;({ jwk, err } = await this.ar.checkWallet({ jwk }))
    if (err) return { err }

    let res = null
    let out = null
    try {
      mid = await this.assign({
        process: pid,
        message: mid,
        signer: this.toSigner(jwk),
      })
      res = await this.result({ process: pid, message: mid })
      if (!res) err = "something went wrong"
      for (const k in check ?? {}) {
        if (!searchTag(res, k, check[k])) {
          err = "something went wrong"
          break
        }
      }
      if (checkData) {
        if (!isData(checkData, res)) err = "something went wrong"
      }
      if (!err && get) out = getTagVal(get, res)
    } catch (e) {
      err = e
    }
    return { mid, res, err, out }
  }

  async dry({
    pid,
    jwk,
    data,
    act = "Eval",
    tags = {},
    check,
    checkData,
    get,
  }) {
    let err = null
    ;({ jwk, err } = await this.ar.checkWallet({ jwk }))
    if (err) return { err }

    let res
    let _tags = [action(act)]
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
        signer: this.toSigner(jwk),
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

  async eval({ pid, jwk, data }) {
    const fns = [
      {
        args: { pid, data, act: "Eval" },
        err: ({ res }) => {
          return (
            typeof res?.Output?.data !== "object" &&
            !(
              typeof res?.Output?.prompt === "string" &&
              /aos\-/.test(res?.Output?.prompt)
            )
          )
        },
      },
    ]
    return await this.pipe({ jwk, fns })
  }

  async transform({ src, data, fills }) {
    let err = null
    let out = null
    let _data = data ?? (await this.ar.data(src, true))
    if (!_data) {
      err = "data doesn't exist"
    } else {
      for (const k in fills ?? {}) {
        let text = fills[k]
        if (typeof text === "number") text = Number(text).toString()
        _data = _data.replace(
          new RegExp(`\<${k}\>`, "g"),
          text.replace(/'/g, "\\'"),
        )
      }
      out = _data
    }
    return { err, out }
  }

  async load({ src, data, fills, pid, jwk }) {
    let fns = [
      {
        fn: this.transform,
        args: { src, fills, data },
        then: { "args.data": "inp" },
      },
      { fn: this.eval, args: { pid } },
    ]
    return await this.pipe({ jwk, fns })
  }

  async wait({ pid, attempts = 5 }) {
    let exist = false
    let err = null
    while (attempts > 0) {
      await wait(1000)
      const { res, err: _err } = await this.dry({ pid, data: "#Inbox" })
      if (typeof res?.Output === "object") break
      attempts -= 1
      if (attempts === 0) err = "timeout"
    }
    return { err, pid }
  }

  async deploy({
    loads,
    src,
    src_data,
    fills = {},
    module = this.module,
    scheduler = this.scheduler,
    jwk,
    tags = {},
    data,
  }) {
    let fns = [
      {
        fn: this.spwn,
        args: { module, scheduler, tags, data },
        then: { "args.pid": "pid" },
      },
      { fn: this.wait, then: { "args.pid": "pid" } },
    ]
    for (const v of !loads ? [{ data: src_data, src, fills }] : loads) {
      fns.push({ fn: this.load, args: v, then: { "args.pid": "pid" } })
    }
    return await this.pipe({ jwk, fns })
  }
}

export default AO
