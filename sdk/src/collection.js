import { srcs } from "./utils.js"
import { is } from "ramda"
import Profile from "./profile.js"

class Collection {
  constructor({
    registry = srcs.bookreg,
    registry_src = srcs.bookreg_src,
    thumbnail = srcs.thumb,
    banner = srcs.banner,
    collection_src = srcs.collection_src,
    pid,
    profile = {},
    ao = {},
    ar = {},
  } = {}) {
    this.__type__ = "collection"
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
    this.collection_src = collection_src
  }

  async init(jwk) {
    await this.profile.init(jwk)
    return this
  }

  async createRegistry({ jwk } = {}) {
    const fn = {
      fn: "deploy",
      args: { src: this.registry_src },
      then: ({ pid }) => {
        this.registry = pid
      },
    }
    return await this.ao.pipe({ jwk, fns: [fn] })
  }

  async create({
    src = this.collection_src,
    info: {
      title,
      description,
      thumbnail,
      banner,
      thumbnail_data,
      thumbnail_type,
      banner_data,
      banner_type,
    } = {},
    bazar = false,
    jwk,
    cb,
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
    let fns = [
      {
        fn: "deploy",
        args: {
          tags,
          src,
          fills: {
            NAME: title,
            DESCRIPTION: description,
            DATECREATED: date,
            LASTUPDATE: date,
            CREATOR: profileId,
            BANNER: banner ?? "None",
            THUMBNAIL: thumbnail ?? "None",
          },
        },
        then: ({ pid }) => {
          this.pid = pid
        },
      },
      {
        fn: this.add,
        bind: this,
        args: { id: profileId },
        then: { "args.collectionId": "pid" },
      },
    ]
    if (bazar) {
      fns.push({
        fn: this.register,
        bind: this,
        args: {
          name: title,
          description,
          thumbnail,
          banner,
          date,
          creator: profileId,
        },
      })
    }
    this.addImages({
      fns,
      thumbnail,
      thumbnail_data,
      thumbnail_type,
      banner,
      banner_data,
      banner_type,
    })
    return await this.ao.pipe({ jwk, fns, cb })
  }
  addImages({
    fns,
    thumbnail,
    thumbnail_data,
    thumbnail_type,
    banner,
    banner_data,
    banner_type,
  }) {
    let images = 0
    if (!thumbnail && thumbnail_data && thumbnail_type) {
      images++
      fns.unshift({
        fn: "post",
        args: {
          data: new Uint8Array(thumbnail_data),
          tags: { "Content-Type": thumbnail_type },
        },
        then: ({ args, id, out }) => {
          images--
          out.thumbnail = id
          if (images === 0) {
            args.fills.THUMBNAIL = id
            args.tags.Thumbnail = id
          }
          if (out.banner) {
            args.fills.BANNER = out.banner
            args.tags.Banner = out.banner
          }
        },
      })
    }

    if (!banner && banner_data && banner_type) {
      images++
      fns.unshift({
        fn: "post",
        args: {
          data: new Uint8Array(banner_data),
          tags: { "Content-Type": banner_type },
        },
        then: ({ args, id, out }) => {
          images--
          out.banner = id
          if (images === 0) {
            args.fills.BANNER = id
            args.tags.Banner = id
          }
        },
      })
    }
  }
  async updateInfo({
    title,
    description,
    jwk,
    thumbnail,
    thumbnail_data,
    thumbnail_type,
    banner,
    banner_data,
    banner_type,
    cb,
  }) {
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
    const isThumbnail = !thumbnail && thumbnail_data && thumbnail_type
    const isBanner = !banner && banner_data && banner_type
    if (new_info.length === 0 && !isThumbnail && !isBanner) {
      return { err: "empty info" }
    }
    let fns = [
      { fn: "eval", args: { pid: this.pid, data: new_info.join("\n") } },
    ]
    let images = 0
    if (isThumbnail) {
      images++
      fns.unshift({
        fn: "post",
        args: {
          data: new Uint8Array(thumbnail_data),
          tags: { "Content-Type": thumbnail_type },
        },
        then: ({ args, id, out }) => {
          images--
          out.thumbnail = id
          if (images === 0) args.data += `\nThumbnail = '${id}'`
          if (out.banner) args.data += `\nBanner = '${out.banner}'`
        },
      })
    }
    if (isBanner) {
      images++
      fns.unshift({
        fn: "post",
        args: {
          data: new Uint8Array(banner_data),
          tags: { "Content-Type": banner_type },
        },
        then: ({ args, id, out }) => {
          images--
          out.banner = id
          if (images === 0) args.data += `\nBanner = '${out.banner}'`
        },
      })
    }
    return await this.ao.pipe({ jwk, fns, cb })
  }

  async info(pid = this.pid) {
    const { err, out } = await this.ao.dry({
      pid,
      act: "Info",
      checkData: true,
      get: { data: true, json: true },
    })
    return out ?? null
  }

  async get(creator) {
    const { err, out } = await this.ao.dry({
      pid: this.registry,
      act: "Get-Collections-By-User",
      tags: { Creator: creator },
      checkData: true,
      get: { data: true, json: true },
    })
    return out ?? null
  }

  async add({ id }) {
    return await this.ao.msg({
      pid: this.pid,
      act: "Add-Collection-To-Profile",
      tags: { ProfileProcess: id },
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
      act: "Add-Collection",
      pid: this.registry,
      tags: tags,
      check: { Status: "Success" },
    })
  }

  async addAsset(asset_pid) {
    return await this.update(asset_pid)
  }

  async removeAsset(asset_pid) {
    return await this.update(asset_pid, true)
  }

  async addAssets(asset_pids) {
    return await this.update(asset_pids)
  }

  async removeAssets(asset_pids) {
    return await this.update(asset_pids, true)
  }

  async update(asset_pid, remove) {
    let ids = asset_pid
    if (!is(Array, ids)) ids = [ids]
    return this.ao.msg({
      pid: this.pid,
      act: "Update-Assets",
      data: JSON.stringify({
        AssetIds: ids,
        UpdateType: remove ? "Remove" : "Add",
      }),
      check: { Status: "Success" },
    })
  }
}

export default Collection
