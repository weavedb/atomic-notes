import { dryrun } from "@permaweb/aoconnect"
import lf from "localforage"
import { fromPairs, map, prop, includes, clone } from "ramda"
import { AR, Profile, Notebook, Note } from "aonote"

let graphql_url = "https://arweave.net/graphql"
let default_thumbnail = "9v2GrtXpVpPWf9KBuTBdClARjjcDA3NqxFn8Kbn1f2M"
let default_banner = "UuEwLRmuNmqLTDcKqgcxDEV1CWIR_uZ6rxzmKjODlrg"
let gateway_url = "https://arweave.net"

const genOpt = () => {
  let env = { ar: {}, ao: {}, profile: {}, note: {}, notebook: {} }
  for (const k in import.meta.env) {
    if (k.match(/^VITE_/)) {
      const k2 = k.replace(/^VITE_/, "").toLowerCase()
      const k3 = k2.split("_")
      if (
        includes(k3[0], ["ar", "ao", "profile", "note", "notebook"]) &&
        import.meta.env[k].match(/^\s*$/) === null
      ) {
        env[k3[0]][k3.slice(1).join("_")] = import.meta.env[k]
      }
    }
  }
  let link = {
    ar: [],
    ao: ["module", "scheduler"],
    profile: ["registry", "src"],
    note: ["proxy", "src", "lib_src"],
    notebook: ["registry", "src"],
  }
  let namemap = {
    ar: {},
    ao: {},
    profile: { src: "profile_src" },
    note: { src: "note_src", lib_src: "notelib_src" },
    notebook: { src: "notebook_src" },
  }
  let opt = { ar: {}, ao: {}, profile: {}, note: {}, notebook: {} }
  opt.ar = env.ar
  for (const k in link) {
    for (const v of link[k]) {
      if (env[k][v]) opt[k][namemap[k][v] ?? v] = env[k][v]
    }
  }
  if (env.ao.mu || env.ao.cu || env.ao.gateway) {
    opt.ao.aoconnect = {}
    if (env.ao.mu) opt.ao.aoconnect.MU_URL = env.ao.mu
    if (env.ao.cu) opt.ao.aoconnect.CU_URL = env.ao.cu
    if (env.ao.gateway) opt.ao.aoconnect.GATEWAY_URL = env.ao.gateway
  }
  if (import.meta.env.VITE_THUMBNAIL) {
    opt.note.thumbnail = import.meta.env.VITE_THUMBNAIL
    opt.notebook.thumbnail = import.meta.env.VITE_THUMBNAIL
  }
  if (import.meta.env.VITE_BANNER) {
    opt.note.banner = import.meta.env.VITE_BANNER
    opt.notebook.banner = import.meta.env.VITE_BANNER
  }

  const _ar = clone(opt.ar)
  const _ao = clone(opt.ao)
  const _profile = clone(opt.profile)
  const _note = clone(opt.ntoe)
  const _notebook = clone(opt.ntoebook)

  opt.ao.ar = _ar

  opt.profile.ao = _ao
  opt.profile.ar = _ar

  opt.notebook.ao = _ao
  opt.notebook.ar = _ar
  opt.notebook.profile = _profile

  opt.note.ao = _ao
  opt.note.ar = _ar
  opt.note.profile = _profile
  return opt
}

const opt = genOpt()

const _nb = new Notebook(opt.notebook)

graphql_url = `${_nb.ar.protocol}://${_nb.ar.host}:${_nb.ar.port}/graphql`
gateway_url = `${_nb.ar.protocol}://${_nb.ar.host}:${_nb.ar.port}`
default_thumbnail = _nb.thumbnail
default_banner = _nb.banner

const getArticles = async ({ limit, skip } = {}) => {
  let tags = [{ name: "Action", value: "List" }]
  if (limit) tags.push({ name: "limit", value: limit.toString() })
  if (skip) tags.push({ name: "skip", value: skip.toString() })
  const result = await dryrun({
    process: import.meta.env.VITE_PROCESS_ID,
    tags,
  })
  return {
    articles: JSON.parse(result.Messages[0].Tags[6].value),
    next: JSON.parse(result.Messages[0].Tags[7].value),
    count: JSON.parse(result.Messages[0].Tags[8].value),
  }
}

const getProfile = async () => {
  const result = await dryrun({
    process: import.meta.env.VITE_PROCESS_ID,
    tags: [{ name: "Action", value: "Get-Profile" }],
  })
  return JSON.parse(result.Messages[0].Tags[6].value)
}

const ao =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMTEuOTciIHZpZXdCb3g9IjAgMCA0MjkgMjE0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMCAyMTRINzEuMzc2M0w4NS45NDI5IDE3NC42MUw1My4xNjgxIDEwNy41TDAgMjE0WiIgZmlsbD0iYmxhY2siLz4KPHBhdGggZD0iTTE4OS4zNjYgMTYwLjc1TDEwOS45NzggMUw4NS45NDI5IDU1LjcwODlMMTYwLjk2MSAyMTRIMjE1TDE4OS4zNjYgMTYwLjc1WiIgZmlsbD0iYmxhY2siLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0zMjIgMjE0QzM4MS4wOTQgMjE0IDQyOSAxNjYuMDk0IDQyOSAxMDdDNDI5IDQ3LjkwNTUgMzgxLjA5NCAwIDMyMiAwQzI2Mi45MDYgMCAyMTUgNDcuOTA1NSAyMTUgMTA3QzIxNSAxNjYuMDk0IDI2Mi45MDYgMjE0IDMyMiAyMTRaTTMyMiAxNzJDMzU3Ljg5OSAxNzIgMzg3IDE0Mi44OTkgMzg3IDEwN0MzODcgNzEuMTAxNSAzNTcuODk5IDQyIDMyMiA0MkMyODYuMTAxIDQyIDI1NyA3MS4xMDE1IDI1NyAxMDdDMjU3IDE0Mi44OTkgMjg2LjEwMSAxNzIgMzIyIDE3MloiIGZpbGw9ImJsYWNrIi8+Cjwvc3ZnPg=="

const arweave_logo =
  "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI0LjEuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAxMzQuOSAxMzUuNCIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMTM0LjkgMTM1LjQ7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbDojMjIyMzI2O30KCS5zdDF7ZmlsbDpub25lO3N0cm9rZTojMjIyMzI2O3N0cm9rZS13aWR0aDo5LjY1MjE7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fQo8L3N0eWxlPgo8Zz4KCTxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik03Ny42LDkxLjVjLTAuMy0wLjYtMC42LTEuMy0wLjgtMi4xYy0wLjItMC44LTAuNC0xLjYtMC41LTIuNWMtMC43LDAuOC0xLjUsMS41LTIuNCwyLjIKCQljLTAuOSwwLjctMS45LDEuMy0zLDEuOGMtMS4xLDAuNS0yLjMsMC45LTMuNywxLjJjLTEuMywwLjMtMi44LDAuNC00LjQsMC40Yy0yLjUsMC00LjktMC40LTctMS4xYy0yLjEtMC43LTMuOS0xLjgtNS41LTMuMQoJCWMtMS41LTEuMy0yLjctMi45LTMuNi00LjdjLTAuOS0xLjgtMS4zLTMuOC0xLjMtNS45YzAtNS4yLDEuOS05LjMsNS44LTEyLjFjMy45LTIuOSw5LjctNC4zLDE3LjQtNC4zaDcuMXYtMi45CgkJYzAtMi40LTAuOC00LjMtMi4zLTUuN2MtMS42LTEuNC0zLjgtMi4xLTYuNy0yLjFjLTIuNiwwLTQuNSwwLjYtNS43LDEuN2MtMS4yLDEuMS0xLjgsMi42LTEuOCw0LjVINDYuNWMwLTIuMSwwLjUtNC4xLDEuNC02CgkJYzAuOS0xLjksMi4zLTMuNiw0LjEtNWMxLjgtMS40LDQtMi42LDYuNi0zLjRjMi42LTAuOCw1LjUtMS4zLDguOS0xLjNjMywwLDUuOCwwLjQsOC40LDEuMWMyLjYsMC43LDQuOCwxLjgsNi43LDMuMwoJCWMxLjksMS40LDMuNCwzLjIsNC40LDUuNGMxLjEsMi4yLDEuNiw0LjcsMS42LDcuNnYyMS4zYzAsMi43LDAuMiw0LjksMC41LDYuNmMwLjMsMS43LDAuOCwzLjIsMS41LDQuNXYwLjhINzcuNnogTTY1LjUsODIuNgoJCWMxLjMsMCwyLjUtMC4yLDMuNi0wLjVjMS4xLTAuMywyLjEtMC43LDMtMS4yYzAuOS0wLjUsMS42LTEsMi4zLTEuN2MwLjYtMC42LDEuMS0xLjMsMS41LTEuOXYtOC41aC02LjVjLTIsMC0zLjcsMC4yLTUuMSwwLjYKCQljLTEuNCwwLjQtMi42LDAuOS0zLjQsMS42Yy0wLjksMC43LTEuNSwxLjUtMiwyLjVjLTAuNCwxLTAuNiwyLTAuNiwzLjFjMCwxLjcsMC42LDMuMSwxLjgsNC4zQzYxLjIsODIsNjMsODIuNiw2NS41LDgyLjZ6Ii8+CjwvZz4KPGNpcmNsZSBjbGFzcz0ic3QxIiBjeD0iNjcuMyIgY3k9IjY4LjEiIHI9IjYxLjciLz4KPC9zdmc+Cg=="

const defaultProfile = profile => {
  return (
    profile ?? {
      name: import.meta.env.VITE_PROFILE_NAME ?? "John Doe",
      description:
        import.meta.env.VITE_PROFILE_DESCRIPTION ?? "Set up your profile",
      image: import.meta.env.VITE_PROFILE_IMAGE ?? arweave_logo,
      x: import.meta.env.VITE_PROFILE_X ?? null,
      github: import.meta.env.VITE_PROFILE_GITHUB ?? null,
    }
  )
}
const action = value => tag("Action", value)
const tag = (name, value) => ({ name, value })
const wait = ms => new Promise(res => setTimeout(() => res(), ms))

const getInfo = async prid => {
  const prof = new Profile(opt.profile)
  return await prof.info({ id: prid })
}

const getBookInfo = async pid => {
  const book = new Notebook({ pid, ...opt.notebook })
  return await book.info()
}

const getAoProfile = async address => {
  let prof = null
  const prid = await getProfileId(address)
  if (prid) {
    const _prof = new Profile(opt.profile)
    prof = await _prof.profile({ id: prid })
  }
  return prof
}

const getProfileId = async address => {
  const prof = new Profile(opt.profile)
  return (await prof.ids({ addr: address }))[0] ?? null
}

const getAoProfiles = async ids => {
  const prof = new Profile({ ...opt.profile })
  return await prof.profiles({ ids })
}

const getProf = ({ address, setAddress, setProfile, setInit, t }) => {
  ;(async () => {
    if (address) {
      let _profile = await lf.getItem(`profile-${address}`)
      let isCache = false
      if (_profile) {
        setProfile(_profile)
        setInit(true)
        isCache = true
      }
      _profile = await getAoProfile(address)
      setProfile(_profile)
      if (_profile) {
        await lf.setItem(`profile-${address}`, _profile)
        if (!isCache) msg(t, "Wallet Connected!")
      } else {
        const prof = await new Profile(opt.profile).init()
        err(
          t,
          "No Profile Found!",
          "You have no AO profile. Create one on BazAR.",
        )
        await lf.removeItem(`address`)
        setAddress(null)
      }
      setInit(true)
    }
  })()
}
const getAddr = ({ setAddress, setInit }) => {
  ;(async () => {
    const userAddress = await lf.getItem("address")
    if (userAddress) {
      setAddress(userAddress)
    } else {
      setInit(true)
    }
  })()
}

const getNotes = async pids => {
  const query = `query {
    transactions(ids: [${map(v => `"${v}"`)(pids).join(",")}], tags: { name: "Asset-Type", values: ["Atomic-Note"]}) {
        edges {
            node {
                id
                owner { address }
                tags { name value }
            }
        }
    }
}`
  const res = await fetch(graphql_url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  }).then(r => r.json())
  return map(prop("node"))(res?.data?.transactions?.edges ?? [])
}
const getBooks = async pids => {
  const query = `query {
    transactions(ids: [${map(v => `"${v}"`)(pids).join(",")}], tags: { name: "Collection-Type", values: ["Atomic-Notes"]}) {
        edges {
            node {
                id
                owner { address }
                tags { name value }
            }
        }
    }
}`
  const res = await fetch(graphql_url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  }).then(r => r.json())
  return map(prop("node"))(res?.data?.transactions?.edges ?? [])
}

const tags = tags => fromPairs(map(v => [v.name, v.value])(tags))
const ltags = tags => fromPairs(map(v => [v.name.toLowerCase(), v.value])(tags))
const badWallet = async (t, addr) => {
  let isValid = false
  try {
    await window.arweaveWallet.connect(["ACCESS_ADDRESS", "SIGN_TRANSACTION"])
    const addr2 = await window.arweaveWallet.getActiveAddress()
    isValid = addr === addr2
  } catch (e) {}
  if (!isValid)
    err(t, "The wrong wallet", `use ${addr} or reconnect the wallet.`)
  return !isValid
}
const validAddress = addr => /^[a-zA-Z0-9_-]{43}$/.test(addr)

const gTag = (_tags, name) => {
  const __tags = tags(_tags)
  return __tags[name] ?? null
}

const tagEq = (tags, name, val = null) => {
  const _tags = gTag(tags, name)
  return _tags === val
}

const searchTag = (res, name, val) => {
  for (let v of res.Messages || []) {
    if (tagEq(v.Tags || {}, name, val)) return v
  }
  return null
}

const msg = (t, title = "Success!", description, status = "success") => {
  t({
    title,
    description,
    status,
    isClosable: true,
  })
}

const err = (
  t,
  title = "something went wrong!",
  description,
  status = "success",
) => msg(t, title, description, "error")

const getPFP = profile =>
  profile.ProfileImage === "None"
    ? "./logo.png"
    : `${gateway_url}/${profile.ProfileImage}`
const getThumb = book =>
  book.Thumbnail === "None" || !book.Thumbnail === "" || !book.Thumbnail
    ? "/logo.png"
    : `${gateway_url}/${book.Thumbnail}`

const note_src_data = `if Name ~= '<NAME>' then Name = '<NAME>' end
if Description ~= '<DESCRIPTION>' then Description = '<DESCRIPTION>' end
if Thumbnail ~= '<THUMBNAIL>' then Thumbnail = '<THUMBNAIL>' end
if Creator ~= '<CREATOR>' then Creator = '<CREATOR>' end
if Ticker ~= '<TICKER>' then Ticker = '<TICKER>' end
if Denomination ~= '<DENOMINATION>' then Denomination = '<DENOMINATION>' end
if not Balances then Balances = { ['<CREATOR>'] = '<BALANCE>' } end
if DateCreated ~= '<DATECREATED>' then DateCreated = '<DATECREATED>' end
if not Collections then Collections = {} end

ao.addAssignable("LIBRARY", { Id = '<LIBRARY>' })
`
export {
  note_src_data,
  getThumb,
  default_thumbnail,
  default_banner,
  opt,
  err,
  msg,
  gTag,
  tagEq,
  searchTag,
  validAddress,
  badWallet,
  getBooks,
  ltags,
  tags,
  getNotes,
  getAddr,
  getAoProfile,
  getProf,
  wait,
  getArticles,
  getProfile,
  getProfileId,
  defaultProfile,
  ao,
  arweave_logo,
  action,
  tag,
  getInfo,
  getBookInfo,
  getPFP,
  graphql_url,
  gateway_url,
  getAoProfiles,
}
