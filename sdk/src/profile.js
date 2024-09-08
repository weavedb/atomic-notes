import AO from "./ao.js"
import { map, prop, assoc } from "ramda"

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

class Profile {
  constructor({
    registry = srcs.registry,
    registry_src = srcs.registry_src,
    profile_src = srcs.profile,
    ar = {},
    ao = {},
  } = {}) {
    this.__type__ = "profile"
    if (ao?.__type__ === "ao") {
      this.ao = ao
    } else {
      let _ao = typeof ao === "object" ? ao : {}
      _ao.ar ??= ar
      this.ao = new AO(ao)
    }
    this.ar = this.ao.ar
    this.profile_src = profile_src
    this.registry_src = registry_src
    this.registry = registry
  }

  async init(jwk) {
    await this.ao.init(jwk)
    await this.profile()
    return this
  }

  async createRegistry({ jwk } = {}) {
    const fns = [
      {
        fn: this.ao.deploy,
        args: { src: this.registry_src },
        then: ({ pid }) => {
          this.registry = pid
        },
      },
      { fn: this.initRegistry, bind: this },
    ]
    return await this.ao.pipe({ jwk, fns })
  }

  async initRegistry({ registry = this.registry, jwk } = {}) {
    const fn = {
      args: {
        pid: registry,
        act: "Prepare-Database",
        check: { Status: "Success" },
      },
      then: () => {
        this.registry ??= registry
      },
    }
    return await this.ao.pipe({ jwk, fns: [fn] })
  }

  async updateProfile({ jwk, profile, id }) {
    let err = null
    ;({ jwk, err } = await this.ar.checkWallet({ jwk }))
    if (err) return { err }
    id ??= this.id ?? (await this.ids())[0]
    if (!id) return { err: "no profile id" }
    return await this.ao.msg({
      pid: id,
      jwk,
      data: JSON.stringify(profile),
      act: "Update-Profile",
    })
  }

  async ids({ registry = this.registry, addr = this.ar.addr, jwk } = {}) {
    const fn = {
      fn: this.ao.dry,
      args: {
        pid: registry,
        act: "Get-Profiles-By-Delegate",
        data: JSON.stringify({ Address: addr }),
        get: { data: true, json: true },
      },
      then: ({ inp, args }) => {
        const _ids = map(prop("ProfileId"), inp ?? [])
        if (_ids[0] && addr === this.ar.addr) this.id = _ids[0]
        return _ids
      },
    }
    return await this.ao.pipe({ jwk, fns: [fn] })
  }

  async profile({ registry = this.registry, id, jwk } = {}) {
    let err = null
    ;({ jwk, err } = await this.ar.checkWallet({ jwk }))
    if (err) return null
    id ??= this.id ?? (await this.ids())[0]
    if (!id) return null
    const profiles = await this.profiles({ registry, ids: [id], jwk })
    return !profiles ? null : (profiles[0] ?? null)
  }

  async profiles({ registry = this.registry, ids, jwk } = {}) {
    let err = null
    ;({ jwk, err } = await this.ar.checkWallet({ jwk }))
    if (err) return null
    if (!ids) ids = await this.ids()
    if (ids.length === []) return null
    const fn = {
      fn: this.ao.dry,
      args: {
        pid: registry,
        act: "Get-Metadata-By-ProfileIds",
        data: JSON.stringify({ ProfileIds: ids }),
        get: { data: true, json: true },
      },
      then: ({ inp }) => inp,
    }
    return await this.ao.pipe({ jwk, fns: [fn] })
  }

  async info({ id, registry = this.registry, jwk } = {}) {
    let err = null
    ;({ jwk, err } = await this.ar.checkWallet({ jwk }))
    if (err) return null
    if (!id) id = this.id ?? (await this.ids())[0]
    if (!id) return null
    const fn = {
      fn: this.ao.dry,
      args: { pid: id, act: "Info", get: { json: true, data: true } },
      then: ({ inp: profile }) => (profile ? assoc("Id", id, profile) : null),
    }
    return await this.ao.pipe({ jwk, fns: [fn] })
  }

  async checkProfile({ jwk }) {
    let out = null
    let err = null
    let attempts = 5
    while (attempts > 0) {
      await wait(1000)
      out = await this.profile({ jwk })
      attempts -= 1
      if (out || attempts === 0) break
    }
    if (!out) err = "no profile found on registry"
    return { err, out }
  }

  async createProfile({
    registry = this.registry,
    profile_src = this.profile_src,
    profile,
    jwk,
  }) {
    const fns = [
      {
        fn: this.ao.deploy,
        args: { src: profile_src, fills: { REGISTRY: registry } },
        then: ({ pid, args }) => {
          this.id = pid
          args.id = pid
        },
      },
      { fn: this.updateProfile, bind: this, args: { profile } },
      { fn: this.checkProfile, bind: this, then: { "_.profile": "in" } },
    ]
    return await this.ao.pipe({ jwk, fns })
  }
}

export default Profile
