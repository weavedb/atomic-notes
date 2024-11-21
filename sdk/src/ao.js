import * as WarpArBundles from "warp-arbundles"
const pkg = WarpArBundles.default ? WarpArBundles.default : WarpArBundles
const { createData, ArweaveSigner } = pkg
import AR from "./ar.js"
import {
  createDataItemSigner,
  connect,
  assign,
  result,
  results,
  message,
  spawn,
  dryrun,
} from "@permaweb/aoconnect"

import { concat, is, mergeLeft, o, uniqBy, prop, isNil, includes } from "ramda"

import {
  searchTag,
  checkTag,
  wait,
  isLocalhost,
  tag,
  ltags,
  action,
  isData,
  getTagVal,
  srcs,
  buildTags,
  isRegExp,
  mergeChecks,
  isCheckComplete,
  mergeOut,
  isOutComplete,
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
    module,
    module_type = "aos2",
    scheduler = srcs.scheduler,
    aoconnect,
    ar = {},
  } = {}) {
    if (!module) {
      switch (module_type) {
        case "sqlite":
          module = srcs.module_sqlite
          break
        case "aos2":
          module = srcs.module_aos2
          break
        default:
          module = srcs.module
      }
    }
    this.__type__ = "ao"
    if (ar?.__type__ === "ar") {
      this.ar = ar
    } else {
      let _ar = typeof ar === "object" ? ar : {}
      this.ar = new AR(ar)
    }

    if (aoconnect) {
      const { results, assign, result, message, spawn, dryrun } =
        connect(aoconnect)
      this.assign = assign
      this.result = result
      this.results = results
      this.message = message
      this.spawn = spawn
      this.dryrun = dryrun
    } else {
      this.assign = assign
      this.result = result
      this.results = results
      this.message = message
      this.spawn = spawn
      this.dryrun = dryrun
    }
    this.module = module
    this.scheduler = scheduler
    this.authority = authority
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
      "Memory-Limit": "1-gb",
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
    boot,
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
      if (boot) tags["On-Boot"] = boot
      if (auth) tags.Authority = auth
      if (!tags.Authority && this.authority) tags.Authority = this.authority
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

  async msg({
    pid,
    jwk,
    data,
    act = "Eval",
    tags = {},
    check = [],
    get,
    timeout = 10000,
  }) {
    let err = null
    ;({ jwk, err } = await this.ar.checkWallet({ jwk }))
    if (err) return { err }

    let mid = null
    let res = null
    let out = null
    let _tags = buildTags(act, tags)
    let results = []
    let start = Date.now()
    try {
      mid = await this.message({
        process: pid,
        signer: this.toSigner(jwk),
        tags: _tags,
        data,
      })

      const exRef = (ref, txs) => {
        for (const v2 of txs ?? []) {
          const t = ltags(v2.tags)
          if (t.type === "Message" && t["x-reference"] === ref) return true
        }
        return false
      }

      const getRef = async (ref, txs = []) => {
        let ex = exRef(ref, txs)
        if (!ex) {
          await wait(1000)
          txs = await this.ar.txs(pid)
          ex = exRef(ref, txs)
        }
        return ex ? txs : Date.now() - start < timeout ? await getRef(ref) : []
      }

      let isOK = false
      let cache = []
      let checks = []

      const getResult = async mid => {
        const res = await this.result({ process: pid, message: mid })
        results.push({ mid, res })
        let err = null
        if (res.Error) {
          err = res.Error
        } else {
          if (!is(Array, check)) check = [check]
          let i = 0
          for (const v of check) {
            let _checks = checks[i] ?? null
            if (isRegExp(v) || includes(typeof v)(["string", "boolean"])) {
              _checks = mergeChecks(_checks, isData(v, res), v)
            } else {
              const checks2 = {}
              for (const k in v ?? {}) {
                checks2[k] = checkTag(res, k, v[k])
              }
              _checks = mergeChecks(_checks, checks2, v)
            }
            checks[i] = _checks
            i++
          }
          if (isCheckComplete(checks, check)) isOK = true
          if (!isNil(get) && !isOutComplete(out, get)) {
            out = mergeOut(out, getTagVal(get, res), get)
          }
        }
        if ((!isOutComplete(out, get) || !isOK) && !err) {
          let refs = []
          for (const v of res.Messages) {
            const _ltags = ltags(v.Tags)
            if (_ltags.type === "Message" && _ltags.reference) {
              refs.push(_ltags.reference)
            }
          }

          for (const v of res.Messages) {
            const _ltags = ltags(v.Tags)
            if (_ltags.type === "Message" && _ltags.reference) {
              const txs = await getRef(_ltags.reference, cache)
              cache = o(uniqBy(prop("id")), concat(cache))(txs)
              for (const v2 of txs) {
                const _ltags2 = ltags(v2.tags)
                if (
                  _ltags2.type === "Message" &&
                  _ltags2["x-reference"] === _ltags.reference
                ) {
                  const {
                    res: _res,
                    out: _out,
                    err: _err,
                    ok: _ok,
                  } = await getResult(v2.id)
                  if (_err) {
                    err = _err
                    break
                  }
                  if (!isOutComplete(out, get) && _out)
                    out = mergeOut(out, _out, get)
                  if (isOutComplete(out, get) && isOK) break
                }
              }
              if (isOutComplete(out, get) && isOK) break
            }
          }
        }
        return { res, err }
      }
      ;({ res, err } = await getResult(mid))
      if (!isOK && !err) err = "something went wrong!"
    } catch (e) {
      err = e
    }
    return { mid, res, err, out, results }
  }

  async asgn({ pid, mid, jwk, check, get }) {
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
      if (res.Error) {
        err = res.Error
      } else {
        let checks = []
        if (!is(Array, check)) check = [check]
        let i = 0
        for (const v of check) {
          let _checks = checks[i] ?? null
          if (isRegExp(v) || includes(typeof v)(["string", "boolean"])) {
            _checks = mergeChecks(_checks, isData(v, res), v)
          } else {
            const checks2 = {}
            for (const k in v ?? {}) {
              checks2[k] = checkTag(res, k, v[k])
            }
            _checks = mergeChecks(_checks, checks2, v)
          }
          checks[i] = _checks
          i++
        }
        if (!isCheckComplete(checks, check)) err = "something went wrong"
        if (!err && !isNil(get)) out = getTagVal(get, res)
      }
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
    get,
    timeout = 10000,
  }) {
    let err = null
    ;({ jwk, err } = await this.ar.checkWallet({ jwk }))
    if (err) return { err }
    let res = null
    let out = null
    let _tags = buildTags(act, tags)
    try {
      const _res = await this.dryrun({
        process: pid,
        signer: this.toSigner(jwk),
        tags: _tags,
        data,
      })
      res = _res

      let checks = []
      if (!is(Array, check)) check = [check]
      let i = 0
      for (const v of check) {
        let _checks = checks[i] ?? null
        if (isRegExp(v) || includes(typeof v)(["string", "boolean"])) {
          _checks = mergeChecks(_checks, isData(v, res), v)
        } else {
          const checks2 = {}
          for (const k in v ?? {}) {
            checks2[k] = checkTag(res, k, v[k])
          }
          _checks = mergeChecks(_checks, checks2, v)
        }
        checks[i] = _checks
        i++
      }
      if (!isCheckComplete(checks, check)) err = "something went wrong"
      if (!err && !isNil(get)) out = getTagVal(get, res)
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
    boot,
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
    let isBoot = false
    let fns = []
    if (boot === true && !data) {
      isBoot = true
      fns = [
        {
          fn: this.transform,
          args: { src, fills, data: src_data },
          then: { "args.data": "inp" },
        },
        {
          fn: this.spwn,
          args: { boot: "Data", module, scheduler, tags },
          then: { "args.pid": "pid" },
        },
      ]
    } else {
      fns = [
        {
          fn: this.spwn,
          args: { boot, module, scheduler, tags, data },
          then: { "args.pid": "pid" },
        },
      ]
    }
    fns.push({ fn: this.wait, then: { "args.pid": "pid" } })
    let i = 0
    for (const v of !loads ? [{ data: src_data, src, fills }] : loads) {
      if (!isBoot || i !== 0) {
        fns.push({ fn: this.load, args: v, then: { "args.pid": "pid" } })
      }
      i++
    }
    return await this.pipe({ jwk, fns })
  }
}

export default AO
