import { srcs, wait, udl } from "./utils.js"
import Profile from "./profile.js"
import { getTagVal } from "./utils.js"

class Asset {
  constructor({
    asset_src = srcs.asset_src,
    pid,
    profile = {},
    ao = {},
    ar = {},
  } = {}) {
    this.__type__ = "asset"
    if (profile?.__type__ === "profile") {
      this.profile = profile
    } else {
      let _profile = typeof profile === "object" ? profile : {}
      if (!_profile.ao) _profile.ao = ao
      if (!_profile.ar) _profile.ar = ar
      this.profile = new Profile(profile)
    }
    this.ao = this.profile.ao
    this.ar = this.ao.ar
    this.asset_src = asset_src
    this.pid = pid
  }

  async init(jwk) {
    await this.profile.init(jwk)
    return this
  }

  async create({
    jwk,
    src = this.asset_src,
    data,
    content_type,
    info: { title, description },
    token: { fraction = "1" },
    udl: { payment, access, derivations, commercial, training },
    cb,
  }) {
    const creator = this.profile.id
    if (!creator) return { err: "no ao profile id" }
    const date = Date.now()
    let tags = {
      Action: "Add-Uploaded-Asset",
      Title: title,
      Description: description,
      "Date-Created": Number(date).toString(),
      Implements: "ANS-110",
      Type: "image",
      "Content-Type": content_type,
      ...udl({ payment, access, derivations, commercial, training }),
    }
    if (creator) tags["Creator"] = creator
    const balance =
      typeof fraction === "number" ? Number(fraction * 1).toString() : fraction
    const fills = {
      NAME: title,
      CREATOR: creator,
      TICKER: "ATOMIC",
      DENOMINATION: "1",
      BALANCE: balance,
    }

    let fns = [
      {
        fn: "deploy",
        args: { src, fills, tags, data },
        then: ({ pid }) => {
          this.pid = pid
        },
      },
      { fn: "add", bind: this, args: { id: creator } },
    ]

    return await this.ao.pipe({ jwk, fns, cb })
  }

  async info() {
    const { err, out } = await this.ao.dry({
      pid: this.pid,
      act: "Info",
      checkData: true,
      get: { data: true, json: true },
    })
    return out ?? null
  }

  async add({ id }) {
    return await this.ao.msg({
      pid: this.pid,
      act: "Add-Asset-To-Profile",
      tags: { ProfileProcess: id },
      check: { Action: "Add-Uploaded-Asset" },
    })
  }

  async mint({ quantity }) {
    return await this.ao.msg({
      pid: this.pid,
      act: "Mint",
      data: JSON.stringify({ Quantity: quantity }),
      check: { Action: "Mint-Success" },
    })
  }

  async transfer({ recipient, quantity, profile = false }) {
    if (profile) {
      return await this.ao.msg({
        pid: this.profile.id,
        act: "Transfer",
        tags: { Target: this.pid, Recipient: recipient, Quantity: quantity },
        check: { Action: "Transfer" },
      })
    } else {
      return await this.ao.msg({
        pid: this.pid,
        act: "Transfer",
        tags: { Recipient: recipient, Quantity: quantity },
        check: { Status: "Success" },
      })
    }
  }

  async balance({ target }) {
    const res = await this.ao.dry({
      pid: this.pid,
      act: "Balance",
      data: JSON.stringify({ Target: target }),
      check: { Action: "Read-Success" },
      get: { data: true },
    })
    const tags = getTagVal(
      { obj: { action: "Action", status: "Status", message: "Message" } },
      res.res,
    )
    if (tags.action === "Read-Error") {
      res.out = "0"
      res.err = null
    }
    return res
  }

  async balances() {
    return await this.ao.dry({
      pid: this.pid,
      act: "Balances",
      check: { Action: "Read-Success" },
      get: { data: true, json: true },
    })
  }
}

export default Asset
