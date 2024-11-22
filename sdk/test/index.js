import { expect } from "chai"
import { Asset, AR, Notebook, Note, AO, Profile } from "../src/index.js"
import { wait } from "../src/utils.js"
import { o, map, indexBy, prop } from "ramda"
import { setup, ok, fail } from "../src/helpers.js"

const v1 = "# this is markdown 1"
const v2 = "# this is markdown 2"
const v3 = "# this is markdown 3"
const v4 = "# this is markdown 4"
const v5 = "# this is markdown 5"
const v6 = "# this is markdown 6"

const note_tags = { title: "title", description: "desc" }

const prof = {
  DisplayName: "Atom",
  UserName: "Atom",
  ProfileImage: "None",
  Description: "The Permaweb Hacker",
  CoverImage: "None",
}

const genUDL = recipient => {
  return {
    payment: { mode: "single", recipient },
    access: { mode: "none" },
    derivations: { mode: "allowed", term: "one-time", fee: "0" },
    commercial: { mode: "allowed", term: "revenue", fee: "5" },
    training: { mode: "disallowed" },
  }
}

describe("Atomic Notes", function () {
  this.timeout(0)
  let ao, ao2, opt, profile, ar, thumbnail, banner, src
  let profile_pid, notebook, notebook_pid, note, note_pid, ar2, note2

  before(async () => {
    ;({ thumbnail, banner, opt, ao, ao2, ar, profile, src } = await setup({
      cacheDir: "../test/.cache",
    }))
  })
  it.skip("should deploy aos2.0 with On-Boot", async () => {
    const ao2 = new AO() // mainnet
    const { pid } = ok(
      await ao2.deploy({
        src_data: src.data("aos2"),
        boot: true,
      }),
    )
    ok(await ao2.wait({ pid }))
    const { out } = await ao2.dry({
      pid,
      act: "Get",
      get: { data: true },
      check: true,
    })
    expect(out).to.eql("Bob1")
  })

  it.skip("should spawn aos2.0 with On-Boot", async () => {
    const ao2 = new AO() // mainnet
    const { pid } = ok(
      await ao2.spwn({
        boot: "Y0FZa1vyn-Azx0o48odlw8UJxVT5XmggZqJa8Jw9RW8",
      }),
    )
    ok(await ao2.wait({ pid }))
    const { out } = await ao2.dry({
      pid,
      act: "Get",
      get: { data: true },
      check: true,
    })
    expect(out).to.eql("Bob")
  })

  it.only("should spawn aos2.0", async () => {
    const { pid: pid3 } = ok(await ao2.deploy({ src_data: src.data("aos2") }))
    const { pid } = ok(await ao2.deploy({ src_data: src.data("aos2") }))
    const { pid: pid2 } = ok(await ao2.deploy({ src_data: src.data("aos2") }))
    const ar2 = new AR(opt.ar)
    await ar2.gen()
    const a = ao2.p(pid)
    const a2 = ao2.p(pid2)
    const { out: out2, res } = ok(
      await a.msg(
        "Print",
        { Addr: pid2, Addr2: pid3 },
        {
          get: ["To", { print: false }],
          check: [
            /printed/,
            /Bob/,
            /Alice/,
            { To2: pid3, To: true, Origin: true },
          ],
        },
      ),
    )
    expect(out2).to.eql({ print: "Bob2 printed!", To: pid2 })
    expect(res.Output.data).to.eql("Hello World!")
    const out = await a2.d("Get", null, { get: false, check: true })
    expect(out).to.eql("Bob3")
    const out3 = await a2.d("Get2", null, { get: false, check: true })
    expect(out3).to.eql("Alice3")
  })

  it("should upload atomic assets", async () => {
    const asset = new Asset(opt.asset)
    await asset.ar.gen("100")
    const { pid: profile_pid } = ok(
      await asset.profile.createProfile({ profile: prof }),
    )
    expect((await asset.profile.profile()).DisplayName).to.eql(prof.DisplayName)
    ok(
      await asset.create({
        data: thumbnail,
        content_type: "image/png",
        info: note_tags,
        token: { fraction: "100" },
        udl: genUDL(asset.ar.addr),
      }),
    )
  })

  it("should auto-load ArConnect wallet", async () => {
    const _jwk = ar.jwk
    const arconnect = new AR(opt.ar)
    const { addr, jwk, pub } = await arconnect.gen("10")
    globalThis.window = {
      arweaveWallet: {
        walletName: "ArConnect",
        test: true,
        jwk,
        connect: async () => {},
        getActiveAddress: async () => addr,
        getActivePublicKey: async () => pub,
        sign: async tx => {
          await arconnect.arweave.transactions.sign(tx, jwk)
          return tx
        },
      },
    }
    globalThis.arweaveWallet = globalThis.window.arweaveWallet

    const ar2 = await new AR(opt.ar).init()
    expect((await ar2.checkWallet()).addr).to.eql(addr)

    const ar3 = new AR(opt.ar)
    const { addr: addr2, jwk: jwk2, pub: pub2 } = await ar3.gen()

    const ar4 = await new AR(opt.ar).init()
    expect((await ar4.balance()) * 1).to.eql(10)

    const ar5 = await new AR(opt.ar).init()
    await ar5.transfer("5", ar3.addr)
    expect((await ar5.balance()) * 1).to.eql(5)

    const pr6 = await new Profile({ ...opt.profile, ao }).init()
    await pr6.createProfile({ profile: prof })
    expect((await pr6.profile()).DisplayName).to.eql(prof.DisplayName)

    const pr7 = await new Profile({ ...opt.profile, ao }).init()
    globalThis.window = {
      arweaveWallet: {
        walletName: "ArConnect",
        test: true,
        jwk,
        connect: async () => {},
        getActiveAddress: async () => addr2,
        getActivePublicKey: async () => pub2,
        sign: async tx => {
          await arconnect.arweave.transactions.sign(tx, jwk2)
          return tx
        },
      },
    }
    globalThis.arweaveWallet = globalThis.window.arweaveWallet
    expect((await pr7.createProfile({ profile: prof })).err).to.eql(
      "the wrong wallet",
    )
    await pr7.init(arweaveWallet)
    expect((await pr7.createProfile({ profile: prof })).err).to.eql(null)
    await ar.init(_jwk)
  })

  it("should create an AO profile", async () => {
    ;({ pid: profile_pid } = ok(await profile.createProfile({ profile: prof })))
    expect((await profile.profile()).DisplayName).to.eql(prof.DisplayName)
  })

  it("should create a notebook", async () => {
    notebook = new Notebook({ ...opt.notebook, profile })
    ;({ pid: notebook_pid } = ok(
      await notebook.create({
        info: {
          title: "title",
          description: "desc",
          thumbnail_data: thumbnail,
          thumbnail_type: "image/png",
          banner_data: banner,
          banner_type: "image/png",
        },
        bazar: true,
      }),
    ))
    expect((await notebook.get(profile.id)).Collections[0].Id).to.eql(
      notebook_pid,
    )
    expect((await notebook.info()).Name).to.eql("title")
  })

  it("should update a notebook", async () => {
    ok(
      await notebook.updateInfo({
        title: "title2",
        thumbnail_data: thumbnail,
        thumbnail_type: "image/png",
        banner_data: banner,
        banner_type: "image/png",
      }),
    )
    expect((await notebook.info()).Name).to.eql("title2")
  })

  it("should create a note", async () => {
    let res = null
    note = new Note({ ...opt.note, profile })
    const src_data = src.data("atomic-note")
    ;({ pid: note_pid, res } = ok(
      await note.create({
        src_data,
        data: v1,
        info: {
          ...note_tags,
          thumbnail_data: thumbnail,
          thumbnail_type: "image/png",
        },
        token: { fraction: "100" },
        udl: {
          payment: { mode: "single", recipient: ao.ar.addr },
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
      }),
    ))
    expect((await note.info()).Name).to.eql("title")
  })

  it("should update a note", async () => {
    ok(
      await note.updateInfo({
        title: "title2",
        thumbnail_data: thumbnail,
        thumbnail_type: "image/png",
      }),
    )
    expect((await note.info()).Name).to.eql("title2")
  })

  it("should add a note to a notebook", async () => {
    ok(await notebook.addNote(note.pid))
    expect((await notebook.info()).Assets).to.eql([note.pid])
  })

  it("should remove a note from a notebook", async () => {
    ok(await notebook.removeNote(note.pid))
    expect((await notebook.info()).Assets).to.eql([])
  })

  it("should add notes to a notebook", async () => {
    ok(await notebook.addNotes([note.pid]))
    expect((await notebook.info()).Assets).to.eql([note.pid])
  })

  it("should remove notes from a notebook", async () => {
    ok(await notebook.removeNotes([note.pid]))
    expect((await notebook.info()).Assets).to.eql([])
  })

  it("should update the version with new content", async () => {
    expect((await note.get()).data).to.eql(v1)
    expect((await note.list())[0].version).to.eql("0.0.1")
    ok(await note.update(v2, "0.0.2"))
    expect((await note.get()).data).to.eql(v2)
    expect((await note.list())[1].version).to.eql("0.0.2")
  })

  it("should add an editor", async () => {
    expect((await note.get("0.0.1")).data).to.eql(v1)
    expect(await note.editors()).to.eql([ar.addr])
    ar2 = new AR(opt.ar)
    await ar2.gen("10")
    await ar2.transfer("5", ar.addr)
    const _ao2 = new AO({ ...opt.ao, ar: ar2 })
    const _pr2 = new Profile({ ...opt.profile, ao: _ao2 })
    note2 = new Note({ pid: note_pid, ...opt.note, profile: _pr2 })
    ok(await note.addEditor(ar2.addr))
    expect(await note.editors()).to.eql([ar.addr, ar2.addr])
    ok(await note2.update(v3, "0.0.3"))
    expect((await note.get()).data).to.eql(v3)
    expect((await note.list())[2].version).to.eql("0.0.3")
  })

  it("should remove an editor", async () => {
    ok(await note.removeEditor(ar2.addr))
    expect(await note.editors()).to.eql([ar.addr])
    fail(await note2.update(v4, "0.0.4"))
    expect((await note.get()).data).to.eql(v3)
  })

  it("should bump with major/minor/patch", async () => {
    ok(await note.update(v4, "minor"))
    expect((await note.get()).version).to.eql("0.1.0")
    ok(await note.update(v5, "patch"))
    expect((await note.get()).version).to.eql("0.1.1")
    ok(await note.update(v6, "major"))
    expect((await note.get()).version).to.eql("1.0.0")
  })

  it("should return the correct notebook info", async () => {
    const info = await profile.info()
    expect(info.Collections[0].Id).to.eql(notebook_pid)
    expect(info.Assets[0].Id).to.eql(note_pid)
    expect(info.Owner).to.eql(ar.addr)
    expect(info.Id).to.eql(profile.id)
  })

  it("should init AR with an existing jwk", async () => {
    const _ar = await new AR(opt.ar).init(ar.jwk)
    expect(_ar.jwk).to.eql(ar.jwk)
    expect(_ar.addr).to.eql(ar.addr)
    const _ao = new AO({ ...opt.ao, ar: _ar })
    expect(_ao.ar.jwk).to.eql(ar.jwk)
    expect(_ao.ar.addr).to.eql(ar.addr)
    const _pr = new Profile({ ...opt.pr, ao: _ao })
    expect(_pr.ar.jwk).to.eql(ar.jwk)
    expect(_pr.ar.addr).to.eql(ar.addr)
  })

  it("should transfer tokens", async () => {
    const { out: balances } = await note.balances()
    const { out: balance } = await note.balance({ target: note.profile.id })
    expect(balance).to.eql("100")
    expect(balances).to.eql({ [note.profile.id]: "100" })
    ok(await note.mint({ quantity: "100" }))
    ok(await note.transfer({ recipient: note.profile.id, quantity: "10" }))
    const { out: balances2 } = await note.balances()
    expect(balances2).to.eql({
      [note.profile.id]: "110",
      [note.ar.addr]: "90",
    })
    const acc = new AR()
    await acc.gen("100")
    const { out: balance3 } = await note.balance({ target: acc.addr })
    expect(balance3).to.eql("0")
    ok(
      await note.transfer({
        recipient: note.ar.addr,
        quantity: "10",
        profile: true,
      }),
    )
    await wait(1000)
    const { out: balances3 } = await note.balances()
    expect(balances3).to.eql({
      [note.profile.id]: "100",
      [note.ar.addr]: "100",
    })
  })
})
