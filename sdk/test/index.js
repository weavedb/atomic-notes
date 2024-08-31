import { expect } from "chai"
import { Notebook, Note, AO } from "../src/index.js"
import { Src, setup } from "./lib/utils.js"
import { wait } from "../src/utils.js"

const aoconnect = {
  MU_URL: "http://localhost:4002",
  CU_URL: "http://localhost:4004",
  GATEWAY_URL: "http://localhost:4000",
}

const arweave = { port: 4000 }
const v1 = "# this is markdown 1"
const v2 = "# this is markdown 2"
const v3 = "# this is markdown 3"
const v4 = "# this is markdown 4"

const note_tags = {
  title: "title",
  description: "desc",
  thumbnail: "None",
  banner: "None",
}

const prof = {
  DisplayName: "Atom",
  UserName: "Atom",
  ProfileImage: "None",
  Description: "The Permaweb Hacker",
  CoverImage: "None",
}

describe("Atomic Notes", function () {
  this.timeout(0)
  let registry,
    profile,
    module,
    scheduler,
    collection_registry,
    collection,
    atomic_note,
    proxy,
    library,
    module2,
    registry_pid,
    collection_registry_pid,
    ao

  before(async () => {
    ;({
      library,
      registry,
      profile,
      collection_registry,
      collection,
      atomic_note,
      proxy,
      module2,
      module,
      scheduler,
      registry_pid,
      collection_registry_pid,
      ao,
    } = await setup())
  })

  it("should handle multiple atomic note versions", async () => {
    const { pid: profile_pid } = await ao.deploy({
      src: profile,
      fills: { REGISTRY: registry_pid },
    })
    const { res } = await ao.updateProfile({ id: profile_pid, profile: prof })
    await wait(1000)
    const _prof = await ao.profile()
    expect(_prof.DisplayName).to.eql(prof.DisplayName)

    const notebook = new Notebook({ registry: collection_registry_pid, ao })

    const { pid: collection_pid } = await notebook.create({
      src: collection,
      info: { title: "title", description: "desc" },
      bazar: true,
    })
    expect((await notebook.get(ao.id)).out.Collections[0].Id).to.eql(
      collection_pid,
    )

    expect((await notebook.info()).out.Name).to.eql("title")
    await notebook.updateInfo({ title: "title2" })
    expect((await notebook.info()).out.Name).to.eql("title2")

    const { pid: proxy_pid } = await ao.deploy({ src: proxy, module: module2 })
    const note = new Note({ proxy: proxy_pid, ao })

    const { err, pid: note_pid } = await note.create({
      library,
      src: atomic_note,
      data: v1,
      info: note_tags,
      token: { fraction: "100" },
      udl: {
        payment: { mode: "single", recipient: ao.addr },
        access: { mode: "one-time", fee: "1.3" },
        derivations: {
          mode: "allowed",
          term: "one-time",
          share: "5.0",
          fee: "1.0",
        },
        commercial: {
          mode: "allowed",
          term: "one-time",
          share: "5.0",
          fee: "1.0",
        },
        training: { mode: "allowed", term: "one-time", fee: "0.1" },
      },
    })

    expect((await note.info()).out.Name).to.eql("title")
    await note.updateInfo({ title: "title2" })
    expect((await note.info()).out.Name).to.eql("title2")

    await notebook.addNote(note.pid)
    expect((await notebook.info()).out.Assets).to.eql([note.pid])
    await notebook.removeNote(note.pid)
    expect((await notebook.info()).out.Assets).to.eql([])

    await notebook.addNotes([note.pid])
    expect((await notebook.info()).out.Assets).to.eql([note.pid])
    await notebook.removeNotes([note.pid])
    expect((await notebook.info()).out.Assets).to.eql([])

    expect((await note.get()).out.data).to.eql(v1)
    expect((await note.list()).out[0].version).to.eql("0.0.1")
    const { err: err5 } = await note.update(v2, "0.0.2")
    expect((await note.get()).out.data).to.eql(v2)
    expect((await note.list()).out[1].version).to.eql("0.0.2")
    expect((await note.get("0.0.1")).out.data).to.eql(v1)
    expect((await note.editors()).out).to.eql([ao.addr])
    const ao2 = new AO({ arweave, aoconnect })
    await ao2.gen("10")
    await ao2.transfer("5", ao.addr)
    const note2 = new Note({ pid: note_pid, ao: ao2 })
    await note.addEditor(ao2.addr)
    expect((await note.editors()).out).to.eql([ao.addr, ao2.addr])
    const { err: err6 } = await note2.update(v3, "0.0.3")
    expect((await note.get()).out.data).to.eql(v3)
    expect((await note.list()).out[2].version).to.eql("0.0.3")
    await note.removeEditor(ao2.addr)
    expect((await note.editors()).out).to.eql([ao.addr])
    const { err: err7 } = await note2.update(v4, "0.0.4")
    expect((await note.get()).out.data).to.eql(v3)
    const info = await ao.info()
    expect(info.Collections[0].Id).to.eql(collection_pid)
    expect(info.Assets[0].Id).to.eql(note_pid)
    expect(info.Owner).to.eql(ao.addr)
    expect(info.Id).to.eql(ao.id)
    const ao3 = await new AO({
      arweave,
      aoconnect,
      registry: registry_pid,
    }).init(ao.jwk)
    expect(ao3.id).to.eql(ao.id)
  })
})
