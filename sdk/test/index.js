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

const udl = {
  payment: "single",
  access: "one-time",
  accessFee: "1.3",
  derivations: "allowed",
  derivationTerm: "one-time",
  derivationShare: "5.0",
  derivationFee: "1.0",
  commercial: "allowed",
  commercialTerm: "one-time",
  commercialShare: "5.0",
  commercialFee: "1.0",
  training: "allowed",
  trainingTerm: "one-time",
  trainingFee: "0.1",
}
const note_tags = {
  title: "title",
  description: "desc",
  thumbnail: "None",
  banner: "None",
  balance: "100",
  isFractional: true,
  fraction: "100",
  data: v1,
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
    const { res } = await ao.updateProfile({ pid: profile_pid, profile: prof })
    await wait(1000)
    const _prof = await ao.profile()
    expect(_prof.DisplayName).to.eql(prof.DisplayName)

    const notebook = new Notebook({ registry: collection_registry_pid, ao })

    const { pid: collection_pid } = await notebook.spawn({
      src: collection,
      title: "title",
      description: "desc",
      profileId: ao.id,
      bazar: true,
    })
    expect((await notebook.get(ao.id)).out.Collections[0].Id).to.eql(
      collection_pid,
    )

    expect((await notebook.info()).out.Name).to.eql("title")
    const { pid: proxy_pid } = await ao.deploy({ src: proxy, module: module2 })
    const note = new Note({ proxy: proxy_pid, ao })

    const { error, pid: note_pid } = await note.spawn({
      library,
      src: atomic_note,
      ...note_tags,
      ...udl,
      payment_address: ao.addr,
      recipient: ao.addr,
      profileId: _prof.ProfileId,
    })

    const { error: error2, res: res2 } = await note.allow()
    const { error: error3, res: res3 } = await note.init()
    const { error: error4 } = await note.add(_prof.ProfileId)
    expect((await note.info()).out.Name).to.eql("title")
    expect((await note.get()).out.data).to.eql(v1)
    expect((await note.list()).out[0].version).to.eql("0.0.1")
    const { out: patches } = await note.patches(v2)
    const { error: error5, res: res5 } = await note.update(patches, "0.0.2")
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
    const { out: patches2 } = await note2.patches(v3)
    const { error: error6, res: res6 } = await note2.update(patches2, "0.0.3")
    expect((await note.get()).out.data).to.eql(v3)
    expect((await note.list()).out[2].version).to.eql("0.0.3")
    await note.removeEditor(ao2.addr)
    expect((await note.editors()).out).to.eql([ao.addr])
    const { out: patches3 } = await note2.patches(v4)
    const { error: error7, res: res7 } = await note2.update(patches3, "0.0.4")
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
