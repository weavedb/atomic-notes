import { srcs, action, tag } from "./utils.js"
import { is } from "ramda"
import Profile from "./profile.js"

class Notebook {
  constructor({
    registry = srcs.bookreg,
    registry_src = srcs.bookreg_src,
    thumbnail = srcs.thumb,
    banner = srcs.banner,
    notebook_src = srcs.book,
    pid,
    profile = {},
    ao = {},
    ar = {},
  } = {}) {
    this.__type__ = "notebook"
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
    this.registry = registry
    this.pid = pid
    this.registry_src = registry_src
    this.thumbnail = thumbnail
    this.banner = banner
    this.notebook_src = notebook_src
  }
  async init(jwk) {
    await this.profile.init(jwk)
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

  async create({
    src = this.notebook_src,
    info: {
      title,
      description,
      thumbnail = this.thumbnail,
      banner = this.banner,
    } = {},
    bazar = false,
  }) {
    const profileId = this.profile.id
    if (!profileId) return { err: "no ao profile id" }
    const date = Date.now()
    let tags = {
      Action: "Add-Collection",
      Title: title,
      Description: description,
      "Date-Created": Number(date).toString(),
      "Profile-Creator": profileId,
      Creator: this.ar.addr,
      "Collection-Type": "Atomic-Notes",
    }
    if (thumbnail && !/^\s*$/.test(thumbnail)) {
      tags["Thumbnail"] = thumbnail
    }
    if (banner && !/^\s*$/.test(banner)) tags["Banner"] = banner
    let err = null
    try {
      const { pid, err: _err } = await this.ao.deploy({
        tags,
        src,
        fills: {
          NAME: title,
          DESCRIPTION: description,
          DATECREATED: date,
          LASTUPDATE: date,
          CREATOR: profileId,
          BANNER: banner,
          THUMBNAIL: thumbnail,
        },
      })
      if (_err) {
        err = _err
      } else {
        this.pid = pid
        const { err: _err2, res: _res2 } = await this.add(profileId)
        if (_err2) {
          err = _err2
        } else {
          if (bazar) {
            const { err: _err3, res: _res3 } = await this.register({
              name: title,
              description,
              thumbnail,
              banner,
              date,
              creator: profileId,
              collectionId: pid,
            })
          }
        }
      }
    } catch (e) {
      err = e
      console.log(e)
    }
    return { err, pid: this.pid }
  }

  async updateInfo({ title, description, thumbnail, banner }) {
    let info_map = {
      Name: title,
      Description: description,
      Thumbnail: thumbnail,
      Banner: banner,
    }
    let new_info = []
    for (const k in info_map) {
      if (info_map[k])
        new_info.push(`${k} = '${info_map[k].replace(/'/g, "\\'")}'`)
    }
    if (new_info.length === 0) return { err: "empty info" }
    return this.ao.eval({ pid: this.pid, data: new_info.join("\n") })
  }
  async info() {
    return await this.ao.dry({
      pid: this.pid,
      action: "Info",
      checkData: true,
      get: { data: true, json: true },
    })
  }

  async get(creator) {
    return await this.ao.dry({
      pid: this.registry,
      action: "Get-Collections-By-User",
      tags: { Creator: creator },
      checkData: true,
      get: { data: true, json: true },
    })
  }

  async add(creator) {
    return await this.ao.msg({
      pid: this.pid,
      action: "Add-Collection-To-Profile",
      tags: { ProfileProcess: creator },
      check: { Action: "Add-Collection" },
    })
  }

  async register({
    name,
    description,
    thumbnail = this.thumbnail,
    banner = this.banner,
    date,
    creator,
    collectionId,
  }) {
    let tags = {
      Name: name,
      Description: description,
      Thumbnail: thumbnail,
      Banner: banner,
      DateCreated: Number(date).toString(),
      Creator: creator,
      CollectionId: collectionId,
    }
    return await this.ao.msg({
      action: "Add-Collection",
      pid: this.registry,
      tags: tags,
      check: { Status: "Success" },
    })
  }

  async addNote(note_pid) {
    return await this.update(note_pid)
  }

  async removeNote(note_pid) {
    return await this.update(note_pid, true)
  }

  async addNotes(note_pids) {
    return await this.update(note_pids)
  }

  async removeNotes(note_pids) {
    return await this.update(note_pids, true)
  }

  async update(note_pid, remove) {
    let ids = note_pid
    if (!is(Array, ids)) ids = [ids]
    return this.ao.msg({
      pid: this.pid,
      action: "Update-Assets",
      data: JSON.stringify({
        AssetIds: ids,
        UpdateType: remove ? "Remove" : "Add",
      }),
      check: { Status: "Success" },
    })
  }
}

export default Notebook
