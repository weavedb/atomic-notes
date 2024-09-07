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
  srcs,
} from "./utils.js"

class AO {
  constructor({
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
    if (wallet.test) {
      return createDataItemSigner(wallet.jwk)
    } else {
      return createDataItemSigner(wallet)
    }
  }

  async pipe({ jwk, fns, out = {} }) {
    let res = []
    let nextArgs = fns[0].args ?? {}
    let i = 0
    let err = null
    let pid = null
    let mid = null
    let id = null
    const copy = ({ _in, out, args, from, to, pid, mid, id }) => {
      const _from = from.split(".")
      const _to = to.split(".")
      let target = null
      let field = null
      let val = null
      if (_to[0] === "args") {
        target = args
        field = _to.slice(1).join(".")
      } else if (_to[0] === "out") {
        target = out
        field = _to.slice(1).join(".")
      } else {
        target = out
        field = _to.join(".")
      }
      if (from === "in") {
        val = _in
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
      } else if (_from[0] === "in") {
        val = _in[_from.slice(1).join(".")] ?? null
      } else {
        val = _in[from] ?? null
      }
      if (target) target[field] = val
    }
    for (let v of fns) {
      let _fn = (v.fn ?? this.msg).bind(v.bind ?? this)
      const _res = await _fn({ jwk, ...nextArgs })
      res.push(_res)
      if (_res.err) {
        err = _res.err
        break
      }
      if (typeof v.err === "function") {
        const _err = await v.err({
          jwk,
          res: _res.res,
          args: nextArgs,
          out,
          pid,
          in: _res.out,
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
        const _err = await v.then({
          jwk,
          res: _res.res,
          args: nextArgs,
          out,
          pid,
          in: _res.out,
          mid,
          id,
        })
        if (_err) {
          err = _err
          break
        }
      } else if (is(Object, v.then)) {
        for (const k in v.then) {
          copy({
            _in: _res.out,
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
      i++
    }
    return { err, res, out, pid, mid, id }
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

    let fns = [
      ...(!jwk ? [{ fn: this.ar.checkWallet, bind: this.ar }] : []),
      {
        fn: this.ar.post,
        bind: this.ar,
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
    const then = async ({ jwk, out }) => {
      out.scheduler = await this.ar.toAddr(jwk)
      if (!this.scheduler || overwrite) this.scheduler = out.scheduler
    }
    let fns = [
      ...(!jwk ? [{ fn: this.ar.checkWallet, bind: this.ar }] : []),
      { fn: this.ar.post, bind: this.ar, args: { tags: _tags }, then },
    ]
    const res = await this.pipe({ jwk, fns })
    return { scheduler: res.out.scheduler, ...res }
  }

  async spwn({
    module = this.module,
    scheduler = this.scheduler,
    jwk,
    tags = {},
    data,
  } = {}) {
    let err = null
    if (!jwk) {
      ;({ jwk, err } = await this.ar.checkWallet())
    }
    if (err) {
      return { err }
    } else {
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
  }

  async msg({
    pid,
    jwk,
    data,
    action: _action = "Eval",
    tags = {},
    check,
    checkData,
    get,
  }) {
    let err = null
    if (!jwk) {
      ;({ jwk, err } = await this.ar.checkWallet())
    }
    if (err) {
      return { err }
    } else {
      let mid = null
      let res = null
      let out = null
      let _tags = [action(_action)]
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
  }

  async asgn({ pid, mid, jwk, check, checkData, get }) {
    let err = null
    if (!jwk) {
      ;({ jwk, err } = await this.ar.checkWallet())
    }
    if (err) {
      return { err }
    } else {
      let res = null
      let out = null
      try {
        mid = await this.assign({
          process: pid,
          message: mid,
          signer: this.toSigner(jwk),
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
        if (checkData) {
          if (!isData(checkData, _res)) err = "something went wrong"
        }
        if (!err && get) out = getTagVal(get, res)
      } catch (e) {
        err = e
      }
      return { mid, res, err, out }
    }
  }

  async dry({
    pid,
    jwk,
    data,
    action: _action = "Eval",
    tags = {},
    check,
    checkData,
    get,
  }) {
    let err = null
    if (!jwk) {
      ;({ jwk, err } = await this.ar.checkWallet())
    }
    if (err) {
      return { err }
    } else {
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
  }

  async eval({ pid, jwk, data }) {
    let fns = [
      ...(!jwk ? [{ fn: this.ar.checkWallet, bind: this.ar }] : []),
      {
        fn: this.msg,
        args: {
          pid,
          data,
          action: "Eval",
        },
        err: ({ res }) => typeof res?.Output?.data !== "object",
      },
    ]
    return await this.pipe({ jwk, fns })
  }

  async transform({ src, fills }) {
    let err = null
    let out = null
    let _data = await this.ar.data(src, true)
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

  async load({ src, fills, pid, jwk }) {
    let fns = [
      ...(!jwk ? [{ fn: this.ar.checkWallet, bind: this.ar }] : []),
      { fn: this.transform, args: { src, fills }, then: { "args.data": "in" } },
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
    return { err }
  }

  async deploy({
    loads,
    src,
    fills = {},
    module = this.module,
    scheduler = this.scheduler,
    jwk,
    tags = {},
    data,
  }) {
    let fns = [
      ...(!jwk ? [{ fn: this.ar.checkWallet, bind: this.ar }] : []),
      {
        fn: this.spwn,
        args: { module, scheduler, tags, data },
        then: { "args.pid": "pid" },
      },
      { fn: this.wait, then: { "args.pid": "pid" } },
    ]
    for (const v of !loads ? [{ src, fills }] : loads) {
      fns.push({ fn: this.load, args: v, then: { "args.pid": "pid" } })
    }
    return await this.pipe({ jwk, fns })
  }
}

export default AO
