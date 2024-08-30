import { includes, fromPairs, map } from "ramda"

const allows = [
  { key: "allowed", val: "Allowed" },
  { key: "disallowed", val: "Disallowed" },
]
const allowsMap = fromPairs(allows.map(({ key, val }) => [key, val]))
const accesses = [
  { key: "none", val: "None" },
  { key: "one-time", val: "One-Time" },
]
const accessesMap = fromPairs(accesses.map(({ key, val }) => [key, val]))
const payments = [
  { key: "single", val: "Single" },
  { key: "random", val: "Random" },
  { key: "global", val: "Global" },
]
const paymentsMap = fromPairs(payments.map(({ key, val }) => [key, val]))
const dTerms = [
  { key: "credit", val: "With Credit" },
  { key: "indication", val: "With Indication" },
  { key: "passthrought", val: "With License Passthrough" },
  { key: "revenue", val: "With Revenue Share" },
  { key: "monthly", val: "With Monthly Fee" },
  { key: "one-time", val: "With One-Time Fee" },
]
const dtMap = fromPairs(dTerms.map(({ key, val }) => [key, val]))
const cTerms = [
  { key: "revenue", val: "With Revenue Share" },
  { key: "monthly", val: "With Monthly Fee" },
  { key: "one-time", val: "With One-Time Fee" },
]
const ctMap = fromPairs(cTerms.map(({ key, val }) => [key, val]))
const tTerms = [
  { key: "monthly", val: "With Monthly Fee" },
  { key: "one-time", val: "With One-Time Fee" },
]
const ttMap = fromPairs(tTerms.map(({ key, val }) => [key, val]))

const action = value => tag("Action", value)
const tag = (name, value) => ({ name, value })

const wait = ms => new Promise(res => setTimeout(() => res(), ms))

const tags = tags => fromPairs(map(v => [v.name, v.value])(tags))
const ltags = tags => fromPairs(map(v => [v.name.toLowerCase(), v.value])(tags))

const validAddress = addr => /^[a-zA-Z0-9_-]{43}$/.test(addr)

const getTag = (_tags, name) => {
  return tags(_tags)[name] ?? null
}

const tagEq = (tags, name, val = null) => {
  const tag = getTag(tags, name)
  if (val === true) {
    return tag !== null
  } else {
    return tag === val
  }
}

const searchTag = (res, name, val) => {
  for (let v of res.Messages || []) {
    if (tagEq(v.Tags || {}, name, val)) return v
  }
  return null
}

const query = txid => `query {
  transactions(ids: ["${txid}"]) {
    edges { node { id tags { name value } owner { address } } }
  }
}`

const isLocalhost = v => includes(v, ["localhost", "127.0.0.1"])

const udl = ({
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
}) => {
  let tags = [
    tag("License", "dE0rmDfl9_OWjkDznNEXHaSO_JohJkRolvMzaCroUdw"),
    tag("Currency", "xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQD6dh10"),
  ]
  tags.push(tag("Payment-Mode", paymentsMap[payment]))
  if (payment === "single") tags.push(tag("Payment-Address", recipient))
  let _access = accessesMap[access]
  if (access === "one-time") _access += "-" + accessFee
  tags.push(tag("Access-Fee", _access))

  let _derivations = allowsMap[derivations]
  if (derivations === "allowed") {
    if (derivationTerm === "revenue") {
      _derivations += `-${dtMap[derivationTerm].split(" ").join("-")}-${derivationShare}`
    } else if (derivationTerm === "monthly" || derivationTerm === "one-time") {
      _derivations += `-${dtMap[derivationTerm].split(" ").join("-")}-${derivationFee}`
    } else {
      _derivations += `-${dtMap[derivationTerm].split(" ").join("-")}-0`
    }
  }
  tags.push(tag("Derivations", _derivations))
  let _commercial = allowsMap[commercial]
  if (commercial === "allowed") {
    if (commercialTerm === "revenue") {
      _commercial += `-${ctMap[commercialTerm].split(" ").join("-")}-${commercialShare}`
    } else {
      _commercial += `-${ctMap[commercialTerm].split(" ").join("-")}-${commercialFee}`
    }
  }
  tags.push(tag("Commercial-Use", _commercial))
  let _training = allowsMap[training]
  if (training === "allowed") {
    _training += `-${ttMap[trainingTerm].split(" ").join("-")}-${trainingFee}`
  }
  tags.push(tag("Data-Model-Training", _training))
  return tags
}

const isData = (data, res) => {
  let exists = false
  for (const v of res.Messages ?? []) {
    if (data === true || v.Data === data) {
      exists = true
      break
    }
  }
  return exists
}

const getTagVal = (get, res) => {
  let out = null
  if (typeof get === "object" && get.obj) {
    out = {}
    for (const k in get.obj ?? {}) out[k] = getTagVal(get.obj[k], res)
  } else {
    for (const v of res.Messages ?? []) {
      if (typeof get === "object" && get.data) {
        if (v.Data) out = v.Data
        try {
          if (get.json) out = JSON.parse(out)
        } catch (e) {}
      } else if (typeof get === "object" && typeof get.name === "string") {
        out = getTag(v.Tags ?? [], get.name)
        try {
          if (get.json) out = JSON.parse(out)
        } catch (e) {}
      } else {
        out = getTag(v.Tags ?? [], get)
      }
      if (out) break
    }
  }
  return out
}

const scripts = {
  "atomic-note-library": "XnV_WEZVaw9D_GiDPg6kydbIhErdTYm6GKlSO1pyfsI",
  collection: "NKISXnq5XseLQd_u-lfO6ThBLuikLoontY47UlONrB4",
  "atomic-note": "8ItY-41YrV5D286SpqNH2DGbVO4kWpcY5Rcs7w2SCC0",
}

export {
  scripts,
  getTagVal,
  isData,
  query,
  getTag,
  tagEq,
  searchTag,
  validAddress,
  ltags,
  tags,
  wait,
  action,
  tag,
  isLocalhost,
  udl,
}
