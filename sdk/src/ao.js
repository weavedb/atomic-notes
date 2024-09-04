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
    if (!jwk) {
      ;({ jwk } = await this.ar.checkWallet())
    }
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

  async postModule({ data, jwk, tags = {}, overwrite = false }) {
    let err = null
    if (!jwk) {
      ;({ jwk, err } = await this.ar.checkWallet())
    }
    if (err) {
      return { err }
    } else {
      const _tags = mergeLeft(tags, {
        "Data-Protocol": "ao",
        Variant: "ao.TN.1",
        Type: "Module",
        "Module-Format": "wasm64-unknown-emscripten-draft_2024_02_15",
        "Input-Encoding": "JSON-V1",
        "Output-Encoding": "JSON-V1",
      })
      const res = await this.ar.post({ data, jwk, tags: _tags })
      if (!this.module || overwrite) this.module = res.id
      return res
    }
  }

  async postScheduler({ jwk, url, tags = {}, overwrite = false }) {
    let err = null
    if (!jwk) {
      ;({ jwk } = await this.ar.checkWallet())
    }
    if (err) {
      return { err }
    } else {
      const _tags = mergeLeft(tags, {
        "Data-Protocol": "ao",
        Variant: "ao.TN.1",
        Type: "Scheduler-Location",
        Url: url,
        "Time-To-Live": "1000000000",
      })
      const { res, err: _err } = await this.ar.post({
        data: "1984",
        jwk,
        tags: _tags,
      })
      if (_err) {
        err = _err
      } else {
        if (!this.scheduler || overwrite) {
          this.scheduler = await this.ar.toAddr(jwk)
        }
      }
      return { err, res, scheduler: this.scheduler }
    }
  }

  async spwn({
    module = this.module,
    scheduler = this.scheduler,
    jwk,
    tags = [],
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
        pid = await this.spawn({
          module,
          scheduler,
          signer: this.toSigner(jwk),
          tags: [
            { name: "Memory-Limit", value: "500-mb" },
            { name: "Compute-Limit", value: "9000000000000" },
            ...tags,
          ],
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
    let err = null
    if (!jwk) {
      ;({ jwk, err } = await this.ar.checkWallet())
    }
    if (err) {
      return { err }
    } else {
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
  }

  async load({ src, fills, pid, jwk }) {
    let err = null
    if (!jwk) {
      ;({ jwk, err } = await this.ar.checkWallet())
    }
    if (err) {
      return { err }
    } else {
      let _data = await this.ar.data(src, true)
      for (const k in fills) {
        let text = fills[k]
        if (typeof text === "number") text = Number(text).toString()
        _data = _data.replace(
          new RegExp(`\<${k}\>`, "g"),
          text.replace(/'/g, "\\'"),
        )
      }
      const { err, res, mid } = await this.eval({ data: _data, pid, jwk })
      if (err) {
        return { mid, err, res }
      } else {
        return { mid, err: null, res }
      }
    }
  }

  async wait(pid, attempts = 5) {
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
    tags = [],
    data,
  }) {
    let err = null
    if (!jwk) {
      ;({ jwk, err } = await this.ar.checkWallet())
    }
    if (err) {
      return { err }
    } else {
      const { err: _err, pid } = await this.spwn({
        module,
        scheduler,
        jwk,
        tags,
        data,
      })
      if (_err) {
        err = _err
      } else {
        const { err: _err2 } = await this.wait(pid)
        if (_err2) {
          err = _err2
        } else {
          if (!loads) loads = [{ src, fills }]
          for (const v of loads) {
            const { err: _err, res } = await this.load({ ...v, pid })
            err = _err
            if (_err) return { err, pid }
          }
        }
      }
      return { pid, err }
    }
  }
}

export default AO
