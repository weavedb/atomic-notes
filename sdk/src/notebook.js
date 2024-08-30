import { scripts, action, tag } from "./utils.js"

class Notebook {
  constructor({
    wallet,
    registry = "TFWDmf8a3_nw43GCm_CuYlYoylHAjCcFGbgHfDaGcsg",
    pid,
    ao,
  }) {
    this.ao = ao
    this.registry = registry
    this.pid = pid
  }

  async spawn({
    src = scripts.collection,
    title,
    description,
    thumbnail,
    profileId,
    banner,
    bazar = false,
  }) {
    const date = Date.now()
    let tags = [
      action("Add-Collection"),
      tag("Title", title),
      tag("Description", description),
      tag("Date-Created", Number(date).toString()),
      tag("Profile-Creator", profileId),
      tag("Creator", this.ao.addr),
      tag("Collection-Type", "Atomic-Notes"),
    ]
    if (thumbnail && !/^\s*$/.test(thumbnail)) {
      tags.push(tag("Thumbnail", thumbnail))
    }
    if (banner && !/^\s*$/.test(banner)) {
      tags.push(tag("Banner", banner))
    }

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
          BANNER: banner ?? "None",
          THUMBNAIL: thumbnail ?? "None",
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
    thumbnail = "None",
    banner = "None",
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

  async update(pid, remove) {
    return this.ao.msg({
      pid: this.pid,
      action: "Update-Assets",
      data: JSON.stringify({
        AssetIds: [pid],
        UpdateType: remove ? "Remove" : "Add",
      }),
      check: { Status: "Success" },
    })
  }
}

export default Notebook
