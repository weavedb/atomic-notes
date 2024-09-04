import AO from "./ao.js"
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
      if (!_ao.ar) _ao.ar = ar
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
    let err = null
    let pid = null
    if (!jwk) {
      ;({ jwk, err } = await this.ar.checkWallet())
    }
    if (!err) {
      const { err: _err, pid: _pid } = await this.ao.deploy({
        src: this.registry_src,
      })
      if (_err) {
        err = _err
      } else {
        pid = _pid
        this.registry = _pid
      }
    }
    return { err, pid }
  }

  async initRegistry({ registry = this.registry, jwk } = {}) {
    let err = null
    if (!jwk) {
      ;({ jwk, err } = await this.ar.checkWallet())
    }
    if (err) {
      return { err }
    } else {
      if (!this.registry) this.registry = registry
      return await this.ao.msg({
        pid: registry,
        jwk,
        action: "Prepare-Database",
        check: { Status: "Success" },
      })
    }
  }

  async updateProfile({ jwk, profile, id }) {
    let err = null
    if (!jwk) {
      ;({ jwk, err } = await this.ar.checkWallet())
    }
    if (err) {
      return { err }
    } else {
      if (!id) id = this.id ?? (await this.ids())[0]
      if (!id) return { err: "no profile id" }
      return await this.ao.msg({
        pid: id,
        jwk,
        data: JSON.stringify(profile),
        action: "Update-Profile",
      })
    }
  }

  async ids({ registry = this.registry, addr = this.ar.addr, jwk } = {}) {
    let err = null
    if (!jwk) {
      ;({ jwk, err } = await this.ar.checkWallet())
    }
    if (err) {
      return []
    } else {
      const res = await this.ao.dryrun({
        signer: this.ao.toSigner(jwk),
        process: registry,
        tags: [{ name: "Action", value: "Get-Profiles-By-Delegate" }],
        data: JSON.stringify({ Address: addr }),
      })
      const data = res.Messages?.[0]?.Data
      const _ids = map(prop("ProfileId"), data ? JSON.parse(data) : [])
      if (_ids[0] && addr === this.ar.addr) this.id = _ids[0]
      return _ids
    }
  }

  async profile({ registry = this.registry, id, jwk } = {}) {
    let err = null
    if (!jwk) {
      ;({ jwk, err } = await this.ar.checkWallet())
    }
    if (err) {
      return null
    } else {
      if (!id) id = this.id ?? (await this.ids())[0]
      if (!id) return null
      const res = await this.ao.dryrun({
        signer: this.ao.toSigner(jwk),
        process: registry,
        tags: [{ name: "Action", value: "Get-Metadata-By-ProfileIds" }],
        data: JSON.stringify({ ProfileIds: [id] }),
      })
      const data = res.Messages[0]?.Data
      return data ? JSON.parse(data)[0] ?? null : null
    }
  }

  async info({ id, registry = this.registry, jwk } = {}) {
    let err = null
    if (!jwk) {
      ;({ jwk, err } = await this.ar.checkWallet())
    }
    if (err) {
      return null
    } else {
      if (!id) id = this.id ?? (await this.ids())[0]
      if (!id) return null
      const res = await this.ao.dryrun({
        signer: this.ao.toSigner(jwk),
        process: id,
        tags: [{ name: "Action", value: "Info" }],
      })
      const profile = JSON.parse(res.Messages[0]?.Data ?? null)
      return profile ? assoc("Id", id, profile) : null
    }
  }

  async createProfile({
    registry = this.registry,
    profile_src = this.profile_src,
    profile,
    jwk,
  }) {
    let err = null
    if (!jwk) {
      ;({ jwk, err } = await this.ar.checkWallet())
    }
    if (err) {
      return { err }
    } else {
      let pid = null
      let mid = null
      let _profile = null
      const { err: _err, pid: _pid } = await this.ao.deploy({
        src: profile_src,
        fills: { REGISTRY: registry },
        jwk,
      })
      if (_err) {
        err = _err
      } else {
        pid = _pid
        this.id = pid
        const {
          res,
          err: _err2,
          mid: _mid,
        } = await this.updateProfile({
          id: pid,
          profile,
          jwk,
        })
        if (_err2) err = _err2
        mid = _mid
        let attempts = 5
        while (attempts > 0) {
          await wait(1000)
          _profile = await this.profile({ jwk })
          attempts -= 1
          if (_profile || attempts === 0) break
        }
        if (!_profile) err = "no profile found on registry"
      }
      return { err, pid, mid, profile: _profile }
    }
  }
}

export default Profile
