import { fromPairs, map } from "ramda"

const action = value => tag("Action", value)
const tag = (name, value) => ({ name, value })
const wait = ms => new Promise(res => setTimeout(() => res(), ms))

const tags = tags => fromPairs(map(v => [v.name, v.value])(tags))
const ltags = tags => fromPairs(map(v => [v.name.toLowerCase(), v.value])(tags))

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

export { gTag, tagEq, searchTag, validAddress, ltags, tags, wait, action, tag }
