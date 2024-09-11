import { srcs } from "./utils.js"
import { is } from "ramda"
import Profile from "./profile.js"
import Collection from "./collection.js"

class Notebook extends Collection {
  constructor({
    registry = srcs.bookreg,
    registry_src = srcs.bookreg_src,
    thumbnail = srcs.thumb,
    banner = srcs.banner,
    notebook_src = srcs.notebook_src,
    pid,
    profile = {},
    ao = {},
    ar = {},
  } = {}) {
    super({
      registry,
      registry_src,
      thumbnail,
      banner,
      collection_src: notebook_src,
      pid,
      profile,
      ao,
      ar,
    })
    this.__type__ = "notebook"
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
}

export default Notebook
