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

class Notebook {
  constructor({
    wallet,
    module = "cNlipBptaF9JeFAf4wUmpi43EojNanIBos3EfNrEOWo",
    scheduler = "_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA",
    pid,
  }) {
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
      res = _res.Messages[0]
      if (!res) error = "something went wrong"
    } catch (e) {
      error = e
    }
    return { error, mid, res }
  }
}

export default Notebook
