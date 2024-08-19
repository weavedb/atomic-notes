import {
  spawn,
  result,
  createDataItemSigner,
  message,
  dryrun,
  assign,
} from "@permaweb/aoconnect"
import { searchTag } from "./utils"
const action = value => tag("Action", value)
const tag = (name, value) => ({ name, value })
const getTag = (res, name) => {
  for (const v of res?.Tags ?? []) {
    if (v.name === name) return v.value
  }
  return null
}

class Notebook {
  constructor({
    wallet,
    module = "cNlipBptaF9JeFAf4wUmpi43EojNanIBos3EfNrEOWo",
    scheduler = "_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA",
    registry = "TFWDmf8a3_nw43GCm_CuYlYoylHAjCcFGbgHfDaGcsg",
    pid,
  }) {
    this.registry = registry
    this.pid = pid
    this.wallet = wallet
    this.signer = createDataItemSigner(this.wallet)
    this.module = module
    this.scheduler = scheduler
  }
  async spawn(tags) {
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
  async info() {
    let error = null
    let res = null
    let tags = [action("Info")]
    try {
      const _res = await dryrun({
        process: this.pid,
        tags,
        signer: this.signer,
      })
      res = JSON.parse(_res.Messages[0].Data)
      if (!res) error = "something went wrong"
    } catch (e) {
      error = e
    }
    return { error, res }
  }

  async add(creator) {
    let error = null
    let mid = null
    let res = null
    try {
      mid = await message({
        process: this.pid,
        tags: [
          action("Add-Collection-To-Profile"),
          tag("ProfileProcess", creator),
        ],
        signer: this.signer,
      })
      const _res = await result({ message: mid, process: this.pid })
      res = _res.Messages[0]
      if (!res) error = "something went wrong"
    } catch (e) {
      error = e
    }
    return { error, mid, res }
  }

  async register(tags) {
    let error = null
    let mid = null
    let res = null
    try {
      mid = await message({
        process: this.registry,
        tags: tags,
        signer: this.signer,
      })
      const _res = await result({ message: mid, process: this.registry })
      res = _res.Messages[0]
      if (!res) error = "something went wrong"
    } catch (e) {
      error = e
      console.log(e)
    }
    return { error, mid, res }
  }

  async update(pid, remove) {
    let error = null
    let mid = null
    let res = null
    try {
      mid = await message({
        process: this.pid,
        tags: [action("Update-Assets")],
        data: JSON.stringify({
          AssetIds: [pid],
          UpdateType: remove ? "Remove" : "Add",
        }),
        signer: this.signer,
      })
      const _res = await result({ message: mid, process: this.pid })
      res = searchTag(_res, "Status", "Success")
      if (!res) error = "something went wrong"
    } catch (e) {
      console.log(e)
      error = e
    }
    return { error, mid, res }
  }
}

export default Notebook
