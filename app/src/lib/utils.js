import { dryrun } from "@permaweb/aoconnect"
import lf from "localforage"
import { fromPairs, map, prop, includes } from "ramda"
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

const getAoProf = async prid => {
  let pr = null
  const _res2 = await dryrun({
    process: "SNy4m-DrqxWl01YqGM4sxI8qCni-58re8uuJLvZPypY",
    tags: [action("Get-Metadata-By-ProfileIds")],
    data: JSON.stringify({ ProfileIds: [prid] }),
  })
  if (_res2?.Messages?.[0]?.Data) {
    const profiles = JSON.parse(_res2.Messages[0].Data)
    pr = fromPairs(profiles.map(obj => [obj.ProfileId, obj]))[prid]
  }
  return pr
}

const getInfo = async prid => {
  const res = await dryrun({
    process: prid,
    tags: [action("Info")],
  })
  try {
    return JSON.parse(res?.Messages?.[0]?.Data)
  } catch (e) {}
  return null
}

const getAoProfile = async address => {
  let pr = await getProfileId(address)
  const prid = await getProfileId(address)
  if (prid) {
    const _res2 = await dryrun({
      process: "SNy4m-DrqxWl01YqGM4sxI8qCni-58re8uuJLvZPypY",
      tags: [action("Get-Metadata-By-ProfileIds")],
      data: JSON.stringify({ ProfileIds: [prid] }),
    })
    if (_res2?.Messages?.[0]?.Data) {
      const profiles = JSON.parse(_res2.Messages[0].Data)
      pr = fromPairs(profiles.map(obj => [obj.ProfileId, obj]))[prid]
    }
  }
  return pr
}
const getProfileId = async address => {
  let pr = null
  const _res = await dryrun({
    process: "SNy4m-DrqxWl01YqGM4sxI8qCni-58re8uuJLvZPypY",
    tags: [action("Get-Profiles-By-Delegate")],
    data: JSON.stringify({ Address: address }),
  })
  if (_res?.Messages?.[0]?.Data) {
    const profile = JSON.parse(_res.Messages[0].Data)
    if (profile[0]) {
      pr = profile[0].ProfileId
    }
  }
  return pr
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
        err(
          t,
          "Wallet Connected!",
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
  const res = await fetch("https://arweave.net/graphql", {
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
  const res = await fetch("https://arweave.net/graphql", {
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
    ? "/arweave.png"
    : `https://arweave.net/${profile.ProfileImage}`

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

let opt = { ar: {}, ao: {}, profile: {}, note: {}, notebook: {} }
opt.ar = env.ar

export {
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
  getAoProf,
  getInfo,
  getPFP,
}
