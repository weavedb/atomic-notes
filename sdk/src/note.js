import { srcs, getTag, action, tag, wait, udl } from "./utils.js"
import Profile from "./profile.js"

class Note {
  constructor({
    proxy = srcs.proxy,
    render_with = srcs.render,
    pid,
    profile = {},
    ao = {},
    ar = {},
  } = {}) {
    this.__type__ = "note"
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
    this.render_with = render_with
    this.pid = pid
    this.proxy = proxy
  }

  async init(jwk) {
    await this.profile.init(jwk)
    return this
  }

  async create({
    src = srcs.note,
    library = srcs.notelib,
    data,
    info: { title, description, thumbnail, banner },
    token: { fraction = "1" },
    udl: { payment, access, derivations, commercial, training },
  }) {
    const profileId = this.profile.id
    if (!profileId) return { err: "no ao profile id" }
    const date = Date.now()
    let tags = [
      action("Add-Uploaded-Asset"),
      tag("Title", title),
      tag("Description", description),
      tag("Date-Created", Number(date).toString()),
      tag("Implements", "ANS-110"),
      tag("Type", "blog-post"),
      tag("Asset-Type", "Atomic-Note"),
      tag("Render-With", srcs.render),
      tag("Content-Type", "text/markdown"),
      ...udl({ payment, access, derivations, commercial, training }),
    ]
    if (!/^\s*$/.test(thumbnail)) tags.push(tag("Thumbnail", thumbnail))
    if (profileId) tags.push(tag("Creator", profileId))
    let err = null
    try {
      const balance =
        typeof fraction === "number"
          ? Number(fraction * 1).toString()
          : fraction
      const { pid, err: _err } = await this.ao.deploy({
        loads: [
          { src: library },
          {
            src,
            fills: {
              NAME: title,
              CREATOR: profileId,
              TICKER: "ATOMIC",
              DENOMINATION: "1",
              DESCRIPTION: description,
              THUMBNAIL: thumbnail ?? "None",
              DATECREATED: date,
              BALANCE: balance,
            },
          },
        ],
        tags,
        data,
      })
      if (_err) {
        err = _err
      } else {
        this.pid = pid
        const { err: _err2 } = await this.allow()
        if (_err2) {
          err = _err2
        } else {
          const { err: _err3 } = await this.assignData()
          if (_err3) {
            err = _err3
          } else {
            const { err: _err4 } = await this.add(profileId)
            if (_err4) err = _err4
          }
        }
      }
    } catch (e) {
      err = e
      console.log(e)
    }
    return { err, pid: this.pid }
  }

  async allow() {
    return await this.ao.msg({
      pid: this.proxy,
      action: "Allow",
      checkData: "allowed!",
    })
  }

  async assignData() {
    return await this.ao.asgn({
      pid: this.proxy,
      mid: this.pid,
      check: { Action: "Assigned" },
    })
  }

  async get(version) {
    let tags = {}
    if (version) tags.Version = version
    return await this.ao.dry({
      action: "Get",
      pid: this.pid,
      check: { Data: true },
      tags,
      get: { obj: { version: "Version", data: "Data", date: "Date" } },
    })
  }

  async info() {
    return await this.ao.dry({
      pid: this.pid,
      action: "Info",
      checkData: true,
      get: { data: true, json: true },
    })
  }

  async updateInfo({ title, description, thumbnail }) {
    let info_map = {
      Name: title,
      Description: description,
      Thumbnail: thumbnail,
    }
    let new_info = []
    for (const k in info_map) {
      if (info_map[k])
        new_info.push(`${k} = '${info_map[k].replace(/'/g, "\\'")}'`)
    }
    if (new_info.length === 0) return { err: "empty info" }
    return this.ao.eval({ pid: this.pid, data: new_info.join("\n") })
  }

  async list() {
    return await this.ao.dry({
      pid: this.pid,
      action: "List",
      check: { Versions: true },
      get: { name: "Versions", json: true },
    })
  }

  async update(data, version) {
    let err = null
    const { err: _err, out: patches } = await this.patches(data)
    if (_err) {
      err = _err
    } else {
      const { err: _err2 } = await this.updateVersion(patches, version)
      if (_err2) err = _err2
    }
    return { err }
  }

  async patches(data) {
    return await this.ao.dry({
      pid: this.pid,
      action: "Patches",
      data,
      check: { Patches: true },
      get: "Patches",
    })
  }

  async updateVersion(patches, version) {
    return await this.ao.msg({
      pid: this.pid,
      action: "Update",
      tags: { Version: version },
      data: patches,
      checkData: "updated!",
    })
  }

  async add(creator) {
    return await this.ao.msg({
      pid: this.pid,
      action: "Add-Asset-To-Profile",
      tags: { ProfileProcess: creator },
      check: { Action: "Add-Uploaded-Asset" },
    })
  }

  async editors() {
    return await this.ao.dry({
      pid: this.pid,
      action: "Editors",
      check: { Editors: true },
      get: { name: "Editors", json: true },
    })
  }

  async addEditor(editor) {
    return await this.ao.msg({
      pid: this.pid,
      action: "Add-Editor",
      tags: { Editor: editor },
      checkData: "editor added!",
      get: { name: "Editors", json: true },
    })
  }

  async removeEditor(editor) {
    return await this.ao.msg({
      pid: this.pid,
      action: "Remove-Editor",
      tags: { Editor: editor },
      checkData: "editor removed!",
      get: { name: "Editors", json: true },
    })
  }
}

export default Note
