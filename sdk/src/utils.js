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
  { key: "passthrough", val: "With License Passthrough" },
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

const udl = ({ payment, access, derivations, commercial, training }) => {
  let tags = {
    License: "dE0rmDfl9_OWjkDznNEXHaSO_JohJkRolvMzaCroUdw",
    Currency: "xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQD6dh10",
  }
  tags["Payment-Mode"] = paymentsMap[payment.mode]
  if (payment === "single") tags.push(tag("Payment-Address", payment.recipient))
  let _access = accessesMap[access.mode]
  if (access === "one-time") _access += "-" + access.fee
  tags["Access-Fee"] = _access

  let _derivations = allowsMap[derivations.mode]
  if (derivations.mode === "allowed") {
    if (derivations.term === "revenue") {
      _derivations += `-${dtMap[derivations.term].split(" ").join("-")}-${derivations.share}`
    } else if (
      derivations.term === "monthly" ||
      derivations.term === "one-time"
    ) {
      _derivations += `-${dtMap[derivations.term].split(" ").join("-")}-${derivations.fee}`
    } else {
      _derivations += `-${dtMap[derivations.term].split(" ").join("-")}-0`
    }
  }
  tags["Derivations"] = _derivations
  let _commercial = allowsMap[commercial.mode]
  if (commercial === "allowed") {
    if (commercial.term === "revenue") {
      _commercial += `-${ctMap[commercial.term].split(" ").join("-")}-${commercial.share}`
    } else {
      _commercial += `-${ctMap[commercial.term].split(" ").join("-")}-${commercial.fee}`
    }
  }
  tags["Commercial-Use"] = _commercial
  let _training = allowsMap[training.mode]
  if (training === "allowed") {
    _training += `-${ttMap[training.term].split(" ").join("-")}-${training.fee}`
  }
  tags["Data-Model-Training"] = _training
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

const srcs = {
  notelib: "XnV_WEZVaw9D_GiDPg6kydbIhErdTYm6GKlSO1pyfsI",
  book: "NKISXnq5XseLQd_u-lfO6ThBLuikLoontY47UlONrB4",
  note: "8ItY-41YrV5D286SpqNH2DGbVO4kWpcY5Rcs7w2SCC0",
  bookreg: "TFWDmf8a3_nw43GCm_CuYlYoylHAjCcFGbgHfDaGcsg",
  bookreg_src: "4Bm1snpCEHIxYMDdAxiFf6ar81gKQHvElDFeDZbSnJU",
  thumb: "9v2GrtXpVpPWf9KBuTBdClARjjcDA3NqxFn8Kbn1f2M",
  banner: "UuEwLRmuNmqLTDcKqgcxDEV1CWIR_uZ6rxzmKjODlrg",
  proxy: "0uboI80S6vMxJD9Yn41Wdwnp9uAHEi4XLGQhBrp3qSQ",
  render: "yXXAop3Yxm8QlZRzP46oRxZjCBp88YTpoSTPlTr4TcQ",
  module: "cNlipBptaF9JeFAf4wUmpi43EojNanIBos3EfNrEOWo",
  scheduler: "_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA",
  registry: "SNy4m-DrqxWl01YqGM4sxI8qCni-58re8uuJLvZPypY",
  profile: "uEtSHyK9yDBABomez6ts3LI_8ULvO-rANSgDN_9OzEc",
  registry_src: "kBk-wRbK5aIZVqDJEzWhjYb5gnydHafrFG3wgItBvuI",
}

export {
  srcs,
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
