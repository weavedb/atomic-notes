import {
  spawn,
  result,
  createDataItemSigner,
  message,
  dryrun,
  assign,
} from "@permaweb/aoconnect"

const action = value => tag("Action", value)
const tag = (name, value) => ({ name, value })
const getTag = (res, name) => {
  for (const v of res?.Tags ?? []) {
    if (v.name === name) return v.value
  }
  return null
}
class Note {
  constructor({
    wallet,
    proxy = "0uboI80S6vMxJD9Yn41Wdwnp9uAHEi4XLGQhBrp3qSQ",
    module = "cNlipBptaF9JeFAf4wUmpi43EojNanIBos3EfNrEOWo",
    scheduler = "_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA",
    pid,
  }) {
    this.pid = pid
    this.wallet = wallet
    this.signer = createDataItemSigner(this.wallet)
    this.proxy = proxy
    this.module = module
    this.scheduler = scheduler
  }
  async spawn(data, tags) {
    let error = null
    try {
      this.pid = await spawn({
        module: this.module,
        scheduler: this.scheduler,
        signer: this.signer,
        tags: [
          tag("Content-Type", "text/markdown"),
          action("Add-Uploaded-Asset"),
          ...tags,
        ],
        data,
      })
    } catch (e) {
      error = e
    }
    return { error, pid: this.pid }
  }
  async eval(data) {
    let error = null
    let mid = null
    let res = null
    try {
      mid = await message({
        process: this.pid,
        tags: [action("Eval")],
        signer: this.signer,
        data,
      })
      const _res = await result({ message: mid, process: this.pid })
      res = _res.Output
      if (!res) error = "something went wrong"
    } catch (e) {
      console.log(e)
      error = e
    }
    return { mid, res, error }
  }
  async allow() {
    let error = null
    let mid = null
    let res = null
    try {
      mid = await message({
        process: this.proxy,
        tags: [action("Allow")],
        signer: this.signer,
      })
      let _res = await result({ message: mid, process: this.proxy })
      res = _res.Messages[0]
      if (!res) error = "something went wrong"
    } catch (e) {
      error = e
    }
    return { error, mid, res }
  }
  async init() {
    let error = null
    let mid = null
    let res = null

    try {
      mid = await assign({
        process: this.proxy,
        message: this.pid,
      })
      const _res = await result({
        message: mid,
        process: this.proxy,
      })
      res = _res.Messages[0]
      if (!res) error = "something went wrong"
    } catch (e) {
      error = e
    }
    return { error, mid, res }
  }
  async get(version) {
    let error = null
    let res = null
    let tags = [action("Get")]
    if (version) tags.push(tag("Version", version))
    try {
      const _res = await dryrun({
        process: this.pid,
        tags,
        signer: this.signer,
      })
      res = _res.Messages[0]
      if (!res) error = "something went wrong"
      res = {
        version: getTag(res, "Version"),
        data: getTag(res, "Data"),
        date: getTag(res, "Date"),
      }
      if (res.date === "nil") res.date = null
    } catch (e) {
      error = e
    }
    return { error, res }
  }

  async list() {
    let error = null
    let res = null
    try {
      const _res = await dryrun({
        process: this.pid,
        tags: [action("List")],
        signer: this.signer,
      })
      res = getTag(_res.Messages[0], "Versions")
      if (!res) error = "something went wrong"
      res = JSON.parse(res)
    } catch (e) {
      error = e
    }
    return { error, res }
  }

  async patches(data) {
    let error = null
    let res = null
    try {
      const _res = await dryrun({
        process: this.pid,
        tags: [action("Patches")],
        signer: this.signer,
        data,
      })
      res = getTag(_res.Messages[0], "Patches")
      if (!res) error = "something went wrong"
    } catch (e) {
      error = e
    }
    return { error, res }
  }
  async update(data, version) {
    let error = null
    let mid = null
    let res = null
    try {
      mid = await message({
        process: this.pid,
        tags: [action("Update"), tag("Version", version)],
        signer: this.signer,
        data,
      })
      const _res = await result({ message: mid, process: this.pid })
      res = _res.Messages[0]
      if (!res) error = "something went wrong"
    } catch (e) {
      error = e
    }
    return { error, mid, res }
  }

  async editors() {
    let error = null
    let res = null
    try {
      const _res = await dryrun({
        process: this.pid,
        tags: [action("Editors")],
        signer: this.signer,
      })
      res = getTag(_res.Messages[0], "Editors")
      if (!res) error = "something went wrong"
      res = JSON.parse(res)
    } catch (e) {
      error = e
    }
    return { error, res }
  }

  async addEditor(editor) {
    let error = null
    let mid = null
    let res = null
    try {
      mid = await message({
        process: this.pid,
        tags: [tag("Editor", editor), action("Add-Editor")],
        signer: this.signer,
      })
      const _res = await result({ message: mid, process: this.pid })
      res = getTag(_res.Messages[0], "Editors")
      if (!res) error = "something went wrong"
    } catch (e) {
      error = e
    }
    return { error, mid, res }
  }

  async removeEditor(editor) {
    let error = null
    let mid = null
    let res = null
    try {
      mid = await message({
        process: this.pid,
        tags: [tag("Editor", editor), action("Remove-Editor")],
        signer: this.signer,
      })
      const _res = await result({ message: mid, process: this.pid })
      res = getTag(_res.Messages[0], "Editors")
      if (!res) error = "something went wrong"
    } catch (e) {
      error = e
    }
    return { error, mid, res }
  }
}

export default Note
