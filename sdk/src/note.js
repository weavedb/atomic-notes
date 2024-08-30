import { getTag, action, tag, wait, udl } from "./utils.js"

class Note {
  constructor({
    wallet,
    proxy = "0uboI80S6vMxJD9Yn41Wdwnp9uAHEi4XLGQhBrp3qSQ",
    render_with = "yXXAop3Yxm8QlZRzP46oRxZjCBp88YTpoSTPlTr4TcQ",
    ao,
    pid,
  }) {
    this.render_with = render_with
    this.ao = ao
    this.pid = pid
    this.proxy = proxy
  }
  async spawn({
    title,
    description,
    thumbnail,
    profileId,
    banner,
    payment,
    payment_address,
    recipient,
    isFractional,
    fraction,
    access,
    accessFee,
    derivations,
    derivationTerm,
    derivationShare,
    derivationFee,
    commercial,
    commercialTerm,
    commercialShare,
    commercialFee,
    training,
    trainingTerm,
    trainingFee,
    data,
    balance,
    src,
    library,
  }) {
    const date = Date.now()
    let tags = [
      action("Add-Uploaded-Asset"),
      tag("Title", title),
      tag("Description", description),
      tag("Date-Created", Number(date).toString()),
      tag("Implements", "ANS-110"),
      tag("Type", "blog-post"),
      tag("Asset-Type", "Atomic-Note"),
      tag("Render-With", "yXXAop3Yxm8QlZRzP46oRxZjCBp88YTpoSTPlTr4TcQ"),
      tag("Content-Type", "text/markdown"),
      ...udl({
        payment,
        payment_address,
        recipient,
        access,
        accessFee,
        derivations,
        derivationTerm,
        derivationShare,
        derivationFee,
        commercial,
        commercialTerm,
        commercialShare,
        commercialFee,
        training,
        trainingTerm,
        trainingFee,
      }),
    ]

    if (!/^\s*$/.test(thumbnail)) tags.push(tag("Thumbnail", thumbnail))
    if (profileId) tags.push(tag("Creator", profileId))
    let err = null
    try {
      const _balance = isFractional ? Number(balance).toString() : "1"
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
              BALANCE: _balance,
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

  async init() {
    return await this.ao.asg({
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

  async list() {
    return await this.ao.dry({
      pid: this.pid,
      action: "List",
      check: { Versions: true },
      get: { name: "Versions", json: true },
    })
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

  async update(data, version) {
    return await this.ao.msg({
      pid: this.pid,
      action: "Update",
      tags: { Version: version },
      data,
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
