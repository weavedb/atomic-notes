semver = {  _VERSION     = '1.2.1' }

local function checkPositiveInteger(number, name)
  assert(number >= 0, name .. ' must be a valid positive number')
  assert(math.floor(number) == number, name .. ' must be an integer')
end

local function present(value)
  return value and value ~= ''
end

local function splitByDot(str)
  str = str or ""
  local t, count = {}, 0
  str:gsub("([^%.]+)", function(c)
    count = count + 1
    t[count] = c
  end)
  return t
end

local function parsePrereleaseAndBuildWithSign(str)
  local prereleaseWithSign, buildWithSign = str:match("^(-[^+]+)(+.+)$")
  if not (prereleaseWithSign and buildWithSign) then
    prereleaseWithSign = str:match("^(-.+)$")
    buildWithSign      = str:match("^(+.+)$")
  end
  assert(prereleaseWithSign or buildWithSign, ("The parameter %q must begin with + or - to denote a prerelease or a build"):format(str))
  return prereleaseWithSign, buildWithSign
end

local function parsePrerelease(prereleaseWithSign)
  if prereleaseWithSign then
    local prerelease = prereleaseWithSign:match("^-(%w[%.%w-]*)$")
    assert(prerelease, ("The prerelease %q is not a slash followed by alphanumerics, dots and slashes"):format(prereleaseWithSign))
    return prerelease
  end
end

local function parseBuild(buildWithSign)
  if buildWithSign then
    local build = buildWithSign:match("^%+(%w[%.%w-]*)$")
    assert(build, ("The build %q is not a + sign followed by alphanumerics, dots and slashes"):format(buildWithSign))
    return build
  end
end

local function parsePrereleaseAndBuild(str)
  if not present(str) then return nil, nil end

  local prereleaseWithSign, buildWithSign = parsePrereleaseAndBuildWithSign(str)

  local prerelease = parsePrerelease(prereleaseWithSign)
  local build = parseBuild(buildWithSign)

  return prerelease, build
end

local function parseVersion(str)
  local sMajor, sMinor, sPatch, sPrereleaseAndBuild = str:match("^(%d+)%.?(%d*)%.?(%d*)(.-)$")
  assert(type(sMajor) == 'string', ("Could not extract version number(s) from %q"):format(str))
  local major, minor, patch = tonumber(sMajor), tonumber(sMinor), tonumber(sPatch)
  local prerelease, build = parsePrereleaseAndBuild(sPrereleaseAndBuild)
  return major, minor, patch, prerelease, build
end

local function compare(a,b)
  return a == b and 0 or a < b and -1 or 1
end

local function compareIds(myId, otherId)
  if myId == otherId then return  0
  elseif not myId    then return -1
  elseif not otherId then return  1
  end

  local selfNumber, otherNumber = tonumber(myId), tonumber(otherId)

  if selfNumber and otherNumber then
    return compare(selfNumber, otherNumber)
  elseif selfNumber then
    return -1
  elseif otherNumber then
    return 1
  else
    return compare(myId, otherId)
  end
end

local function smallerIdList(myIds, otherIds)
  local myLength = #myIds
  local comparison

  for i=1, myLength do
    comparison = compareIds(myIds[i], otherIds[i])
    if comparison ~= 0 then
      return comparison == -1
    end
  end

  return myLength < #otherIds
end

local function smallerPrerelease(mine, other)
  if mine == other or not mine then return false
  elseif not other then return true
  end

  return smallerIdList(splitByDot(mine), splitByDot(other))
end

local methods = {}

function methods:nextMajor()
  return semver(self.major + 1, 0, 0)
end
function methods:nextMinor()
  return semver(self.major, self.minor + 1, 0)
end
function methods:nextPatch()
  return semver(self.major, self.minor, self.patch + 1)
end

local mt = { __index = methods }
function mt:__eq(other)
  return self.major == other.major and
         self.minor == other.minor and
         self.patch == other.patch and
         self.prerelease == other.prerelease
end
function mt:__lt(other)
  if self.major ~= other.major then return self.major < other.major end
  if self.minor ~= other.minor then return self.minor < other.minor end
  if self.patch ~= other.patch then return self.patch < other.patch end
  return smallerPrerelease(self.prerelease, other.prerelease)

end

function mt:__pow(other)
  if self.major == 0 then
    return self == other
  end
  return self.major == other.major and
         self.minor <= other.minor
end
function mt:__tostring()
  local buffer = { ("%d.%d.%d"):format(self.major, self.minor, self.patch) }
  if self.prerelease then table.insert(buffer, "-" .. self.prerelease) end
  if self.build      then table.insert(buffer, "+" .. self.build) end
  return table.concat(buffer)
end

local function new(major, minor, patch, prerelease, build)
  assert(major, "At least one parameter is needed")

  if type(major) == 'string' then
    major,minor,patch,prerelease,build = parseVersion(major)
  end
  patch = patch or 0
  minor = minor or 0

  checkPositiveInteger(major, "major")
  checkPositiveInteger(minor, "minor")
  checkPositiveInteger(patch, "patch")

  local result = {major=major, minor=minor, patch=patch, prerelease=prerelease, build=build}
  return setmetatable(result, mt)
end

setmetatable(semver, { __call = function(_, ...) return new(...) end })
semver._VERSION= semver(semver._VERSION)

local band, bor, lshift
    = bit32.band, bit32.bor, bit32.lshift
local type, setmetatable, ipairs, select
    = type, setmetatable, ipairs, select
local unpack, tonumber, error
    = unpack, tonumber, error
local strsub, strbyte, strchar, gmatch, gsub
    = string.sub, string.byte, string.char, string.gmatch, string.gsub
local strmatch, strfind, strformat
    = string.match, string.find, string.format
local tinsert, tremove, tconcat
    = table.insert, table.remove, table.concat
local max, min, floor, ceil, abs
    = math.max, math.min, math.floor, math.ceil, math.abs
local clock = os.clock

local percentEncode_pattern = '[^A-Za-z0-9%-=;\',./~!@#$%&*%(%)_%+ %?]'
local function percentEncode_replace(v)
  return strformat('%%%02X', strbyte(v))
end

local function indexOf(a, b, start)
  if (#b == 0) then
    return nil
  end
  return strfind(a, b, start, true)
end

local htmlEncode_pattern = '[&<>\n]'
local htmlEncode_replace = {
  ['&'] = '&amp;', ['<'] = '&lt;', ['>'] = '&gt;', ['\n'] = '&para;<br>'
}

local diff_main,
      diff_cleanupSemantic,
      diff_cleanupEfficiency,
      diff_levenshtein,
      diff_prettyHtml

local match_main

local patch_make,
      patch_toText,
      patch_fromText,
      patch_apply

local DIFF_DELETE = -1
local DIFF_INSERT = 1
local DIFF_EQUAL = 0

local Diff_Timeout = 1.0
local Diff_EditCost = 4
local Match_Threshold = 0.5
local Match_Distance = 1000
local Patch_DeleteThreshold = 0.5
local Patch_Margin = 4
local Match_MaxBits = 32

function settings(new)
  if new then
    Diff_Timeout = new.Diff_Timeout or Diff_Timeout
    Diff_EditCost = new.Diff_EditCost or Diff_EditCost
    Match_Threshold = new.Match_Threshold or Match_Threshold
    Match_Distance = new.Match_Distance or Match_Distance
    Patch_DeleteThreshold = new.Patch_DeleteThreshold or Patch_DeleteThreshold
    Patch_Margin = new.Patch_Margin or Patch_Margin
    Match_MaxBits = new.Match_MaxBits or Match_MaxBits
  else
    return {
      Diff_Timeout = Diff_Timeout;
      Diff_EditCost = Diff_EditCost;
      Match_Threshold = Match_Threshold;
      Match_Distance = Match_Distance;
      Patch_DeleteThreshold = Patch_DeleteThreshold;
      Patch_Margin = Patch_Margin;
      Match_MaxBits = Match_MaxBits;
    }
  end
end

local _diff_compute,
      _diff_bisect,
      _diff_halfMatchI,
      _diff_halfMatch,
      _diff_cleanupSemanticScore,
      _diff_cleanupSemanticLossless,
      _diff_cleanupMerge,
      _diff_commonPrefix,
      _diff_commonSuffix,
      _diff_commonOverlap,
      _diff_xIndex,
      _diff_text1,
      _diff_text2,
      _diff_toDelta,
      _diff_fromDelta

function diff_main(text1, text2, opt_checklines, opt_deadline)
  if opt_deadline == nil then
    if Diff_Timeout <= 0 then
      opt_deadline = 2 ^ 31
    else
      opt_deadline = clock() + Diff_Timeout
    end
  end
  local deadline = opt_deadline

  if text1 == nil or text1 == nil then
    error('Null inputs. (diff_main)')
  end

  if text1 == text2 then
    if #text1 > 0 then
      return {{DIFF_EQUAL, text1}}
    end
    return {}
  end

  local checklines = false

  local commonlength = _diff_commonPrefix(text1, text2)
  local commonprefix
  if commonlength > 0 then
    commonprefix = strsub(text1, 1, commonlength)
    text1 = strsub(text1, commonlength + 1)
    text2 = strsub(text2, commonlength + 1)
  end

  commonlength = _diff_commonSuffix(text1, text2)
  local commonsuffix
  if commonlength > 0 then
    commonsuffix = strsub(text1, -commonlength)
    text1 = strsub(text1, 1, -commonlength - 1)
    text2 = strsub(text2, 1, -commonlength - 1)
  end

  local diffs = _diff_compute(text1, text2, checklines, deadline)

  if commonprefix then
    tinsert(diffs, 1, {DIFF_EQUAL, commonprefix})
  end
  if commonsuffix then
    diffs[#diffs + 1] = {DIFF_EQUAL, commonsuffix}
  end

  _diff_cleanupMerge(diffs)
  return diffs
end

function diff_cleanupSemantic(diffs)
  local changes = false
  local equalities = {}
  local equalitiesLength = 0
  local lastEquality = nil
  local pointer = 1
  local length_insertions1 = 0
  local length_deletions1 = 0
  local length_insertions2 = 0
  local length_deletions2 = 0

  while diffs[pointer] do
    if diffs[pointer][1] == DIFF_EQUAL then
      equalitiesLength = equalitiesLength + 1
      equalities[equalitiesLength] = pointer
      length_insertions1 = length_insertions2
      length_deletions1 = length_deletions2
      length_insertions2 = 0
      length_deletions2 = 0
      lastEquality = diffs[pointer][2]
    else
      if diffs[pointer][1] == DIFF_INSERT then
        length_insertions2 = length_insertions2 + #(diffs[pointer][2])
      else
        length_deletions2 = length_deletions2 + #(diffs[pointer][2])
      end
      if lastEquality
          and (#lastEquality <= max(length_insertions1, length_deletions1))
          and (#lastEquality <= max(length_insertions2, length_deletions2)) then
        tinsert(diffs, equalities[equalitiesLength],
         {DIFF_DELETE, lastEquality})
        diffs[equalities[equalitiesLength] + 1][1] = DIFF_INSERT
        equalitiesLength = equalitiesLength - 1
        equalitiesLength = equalitiesLength - 1
        pointer = (equalitiesLength > 0) and equalities[equalitiesLength] or 0
        length_insertions1, length_deletions1 = 0, 0
        length_insertions2, length_deletions2 = 0, 0
        lastEquality = nil
        changes = true
      end
    end
    pointer = pointer + 1
  end

  if changes then
    _diff_cleanupMerge(diffs)
  end
  _diff_cleanupSemanticLossless(diffs)

  pointer = 2
  while diffs[pointer] do
    if (diffs[pointer - 1][1] == DIFF_DELETE and
        diffs[pointer][1] == DIFF_INSERT) then
      local deletion = diffs[pointer - 1][2]
      local insertion = diffs[pointer][2]
      local overlap_length1 = _diff_commonOverlap(deletion, insertion)
      local overlap_length2 = _diff_commonOverlap(insertion, deletion)
      if (overlap_length1 >= overlap_length2) then
        if (overlap_length1 >= #deletion / 2 or
            overlap_length1 >= #insertion / 2) then
          tinsert(diffs, pointer,
              {DIFF_EQUAL, strsub(insertion, 1, overlap_length1)})
          diffs[pointer - 1][2] =
              strsub(deletion, 1, #deletion - overlap_length1)
          diffs[pointer + 1][2] = strsub(insertion, overlap_length1 + 1)
          pointer = pointer + 1
        end
      else
        if (overlap_length2 >= #deletion / 2 or
            overlap_length2 >= #insertion / 2) then
          tinsert(diffs, pointer,
              {DIFF_EQUAL, strsub(deletion, 1, overlap_length2)})
          diffs[pointer - 1] = {DIFF_INSERT,
              strsub(insertion, 1, #insertion - overlap_length2)}
          diffs[pointer + 1] = {DIFF_DELETE,
              strsub(deletion, overlap_length2 + 1)}
          pointer = pointer + 1
        end
      end
      pointer = pointer + 1
    end
    pointer = pointer + 1
  end
end

function diff_cleanupEfficiency(diffs)
  local changes = false
  local equalities = {}
  local equalitiesLength = 0
  local lastEquality = nil
  local pointer = 1
  local pre_ins = 0
  local pre_del = 0
  local post_ins = 0
  local post_del = 0

  while diffs[pointer] do
    if diffs[pointer][1] == DIFF_EQUAL then 
      local diffText = diffs[pointer][2]
      if (#diffText < Diff_EditCost) and (post_ins == 1 or post_del == 1) then
        equalitiesLength = equalitiesLength + 1
        equalities[equalitiesLength] = pointer
        pre_ins, pre_del = post_ins, post_del
        lastEquality = diffText
      else
        equalitiesLength = 0
        lastEquality = nil
      end
      post_ins, post_del = 0, 0
    else
      if diffs[pointer][1] == DIFF_DELETE then
        post_del = 1
      else
        post_ins = 1
      end
      if lastEquality and (
          (pre_ins+pre_del+post_ins+post_del == 4)
          or
          (
            (#lastEquality < Diff_EditCost / 2)
            and
            (pre_ins+pre_del+post_ins+post_del == 3)
          )) then
        tinsert(diffs, equalities[equalitiesLength],
            {DIFF_DELETE, lastEquality})
        diffs[equalities[equalitiesLength] + 1][1] = DIFF_INSERT
        equalitiesLength = equalitiesLength - 1
        lastEquality = nil
        if (pre_ins == 1) and (pre_del == 1) then
          post_ins, post_del = 1, 1
          equalitiesLength = 0
        else
          equalitiesLength = equalitiesLength - 1
          pointer = (equalitiesLength > 0) and equalities[equalitiesLength] or 0
          post_ins, post_del = 0, 0
        end
        changes = true
      end
    end
    pointer = pointer + 1
  end

  if changes then
    _diff_cleanupMerge(diffs)
  end
end

function diff_levenshtein(diffs)
  local levenshtein = 0
  local insertions, deletions = 0, 0
  for x, diff in ipairs(diffs) do
    local op, data = diff[1], diff[2]
    if (op == DIFF_INSERT) then
      insertions = insertions + #data
    elseif (op == DIFF_DELETE) then
      deletions = deletions + #data
    elseif (op == DIFF_EQUAL) then
      levenshtein = levenshtein + max(insertions, deletions)
      insertions = 0
      deletions = 0
    end
  end
  levenshtein = levenshtein + max(insertions, deletions)
  return levenshtein
end

function diff_prettyHtml(diffs)
  local html = {}
  for x, diff in ipairs(diffs) do
    local op = diff[1]
    local data = diff[2]
    local text = gsub(data, htmlEncode_pattern, htmlEncode_replace)
    if op == DIFF_INSERT then
      html[x] = '<ins style="background:#e6ffe6;">' .. text .. '</ins>'
    elseif op == DIFF_DELETE then
      html[x] = '<del style="background:#ffe6e6;">' .. text .. '</del>'
    elseif op == DIFF_EQUAL then
      html[x] = '<span>' .. text .. '</span>'
    end
  end
  return tconcat(html)
end

function _diff_compute(text1, text2, checklines, deadline)
  if #text1 == 0 then
    return {{DIFF_INSERT, text2}}
  end

  if #text2 == 0 then
    return {{DIFF_DELETE, text1}}
  end

  local diffs

  local longtext = (#text1 > #text2) and text1 or text2
  local shorttext = (#text1 > #text2) and text2 or text1
  local i = indexOf(longtext, shorttext)

  if i ~= nil then
    diffs = {
      {DIFF_INSERT, strsub(longtext, 1, i - 1)},
      {DIFF_EQUAL, shorttext},
      {DIFF_INSERT, strsub(longtext, i + #shorttext)}
    }
    if #text1 > #text2 then
      diffs[1][1], diffs[3][1] = DIFF_DELETE, DIFF_DELETE
    end
    return diffs
  end

  if #shorttext == 1 then
    return {{DIFF_DELETE, text1}, {DIFF_INSERT, text2}}
  end

  do
    local
     text1_a, text1_b,
     text2_a, text2_b,
     mid_common        = _diff_halfMatch(text1, text2)

    if text1_a then
      local diffs_a = diff_main(text1_a, text2_a, checklines, deadline)
      local diffs_b = diff_main(text1_b, text2_b, checklines, deadline)
      local diffs_a_len = #diffs_a
      diffs = diffs_a
      diffs[diffs_a_len + 1] = {DIFF_EQUAL, mid_common}
      for i, b_diff in ipairs(diffs_b) do
        diffs[diffs_a_len + 1 + i] = b_diff
      end
      return diffs
    end
  end

  return _diff_bisect(text1, text2, deadline)
end

function _diff_bisect(text1, text2, deadline)
  local text1_length = #text1
  local text2_length = #text2
  local _sub, _element
  local max_d = ceil((text1_length + text2_length) / 2)
  local v_offset = max_d
  local v_length = 2 * max_d
  local v1 = {}
  local v2 = {}
  for x = 0, v_length - 1 do
    v1[x] = -1
    v2[x] = -1
  end
  v1[v_offset + 1] = 0
  v2[v_offset + 1] = 0
  local delta = text1_length - text2_length
  local front = (delta % 2 ~= 0)
  local k1start = 0
  local k1end = 0
  local k2start = 0
  local k2end = 0
  for d = 0, max_d - 1 do
    if clock() > deadline then
      break
    end
    for k1 = -d + k1start, d - k1end, 2 do
      local k1_offset = v_offset + k1
      local x1
      if (k1 == -d) or ((k1 ~= d) and
          (v1[k1_offset - 1] < v1[k1_offset + 1])) then
        x1 = v1[k1_offset + 1]
      else
        x1 = v1[k1_offset - 1] + 1
      end
      local y1 = x1 - k1
      while (x1 <= text1_length) and (y1 <= text2_length)
          and (strsub(text1, x1, x1) == strsub(text2, y1, y1)) do
        x1 = x1 + 1
        y1 = y1 + 1
      end
      v1[k1_offset] = x1
      if x1 > text1_length + 1 then
        k1end = k1end + 2
      elseif y1 > text2_length + 1 then
        k1start = k1start + 2
      elseif front then
        local k2_offset = v_offset + delta - k1
        if k2_offset >= 0 and k2_offset < v_length and v2[k2_offset] ~= -1 then
          local x2 = text1_length - v2[k2_offset] + 1
          if x1 > x2 then
            return _diff_bisectSplit(text1, text2, x1, y1, deadline)
          end
        end
      end
    end

    for k2 = -d + k2start, d - k2end, 2 do
      local k2_offset = v_offset + k2
      local x2
      if (k2 == -d) or ((k2 ~= d) and
          (v2[k2_offset - 1] < v2[k2_offset + 1])) then
        x2 = v2[k2_offset + 1]
      else
        x2 = v2[k2_offset - 1] + 1
      end
      local y2 = x2 - k2
      while (x2 <= text1_length) and (y2 <= text2_length)
          and (strsub(text1, -x2, -x2) == strsub(text2, -y2, -y2)) do
        x2 = x2 + 1
        y2 = y2 + 1
      end
      v2[k2_offset] = x2
      if x2 > text1_length + 1 then
        k2end = k2end + 2
      elseif y2 > text2_length + 1 then
        k2start = k2start + 2
      elseif not front then
        local k1_offset = v_offset + delta - k2
        if k1_offset >= 0 and k1_offset < v_length and v1[k1_offset] ~= -1 then
          local x1 = v1[k1_offset]
          local y1 = v_offset + x1 - k1_offset
          x2 = text1_length - x2 + 1
          if x1 > x2 then
            return _diff_bisectSplit(text1, text2, x1, y1, deadline)
          end
        end
      end
    end
  end
  return {{DIFF_DELETE, text1}, {DIFF_INSERT, text2}}
end

function _diff_bisectSplit(text1, text2, x, y, deadline)
  local text1a = strsub(text1, 1, x - 1)
  local text2a = strsub(text2, 1, y - 1)
  local text1b = strsub(text1, x)
  local text2b = strsub(text2, y)

  local diffs = diff_main(text1a, text2a, false, deadline)
  local diffsb = diff_main(text1b, text2b, false, deadline)

  local diffs_len = #diffs
  for i, v in ipairs(diffsb) do
    diffs[diffs_len + i] = v
  end
  return diffs
end

function _diff_commonPrefix(text1, text2)
  if (#text1 == 0) or (#text2 == 0) or (strbyte(text1, 1) ~= strbyte(text2, 1))
      then
    return 0
  end
  local pointermin = 1
  local pointermax = min(#text1, #text2)
  local pointermid = pointermax
  local pointerstart = 1
  while (pointermin < pointermid) do
    if (strsub(text1, pointerstart, pointermid)
        == strsub(text2, pointerstart, pointermid)) then
      pointermin = pointermid
      pointerstart = pointermin
    else
      pointermax = pointermid
    end
    pointermid = floor(pointermin + (pointermax - pointermin) / 2)
  end
  return pointermid
end

function _diff_commonSuffix(text1, text2)
  if (#text1 == 0) or (#text2 == 0)
      or (strbyte(text1, -1) ~= strbyte(text2, -1)) then
    return 0
  end
  local pointermin = 1
  local pointermax = min(#text1, #text2)
  local pointermid = pointermax
  local pointerend = 1
  while (pointermin < pointermid) do
    if (strsub(text1, -pointermid, -pointerend)
        == strsub(text2, -pointermid, -pointerend)) then
      pointermin = pointermid
      pointerend = pointermin
    else
      pointermax = pointermid
    end
    pointermid = floor(pointermin + (pointermax - pointermin) / 2)
  end
  return pointermid
end

function _diff_commonOverlap(text1, text2)
  local text1_length = #text1
  local text2_length = #text2
  if text1_length == 0 or text2_length == 0 then
    return 0
  end
  if text1_length > text2_length then
    text1 = strsub(text1, text1_length - text2_length + 1)
  elseif text1_length < text2_length then
    text2 = strsub(text2, 1, text1_length)
  end
  local text_length = min(text1_length, text2_length)
  if text1 == text2 then
    return text_length
  end

  local best = 0
  local length = 1
  while true do
    local pattern = strsub(text1, text_length - length + 1)
    local found = strfind(text2, pattern, 1, true)
    if found == nil then
      return best
    end
    length = length + found - 1
    if found == 1 or strsub(text1, text_length - length + 1) ==
                     strsub(text2, 1, length) then
      best = length
      length = length + 1
    end
  end
end

function _diff_halfMatchI(longtext, shorttext, i)
  local seed = strsub(longtext, i, i + floor(#longtext / 4))
  local j = 0
  local best_common = ''
  local best_longtext_a, best_longtext_b, best_shorttext_a, best_shorttext_b
  while true do
    j = indexOf(shorttext, seed, j + 1)
    if (j == nil) then
      break
    end
    local prefixLength = _diff_commonPrefix(strsub(longtext, i),
        strsub(shorttext, j))
    local suffixLength = _diff_commonSuffix(strsub(longtext, 1, i - 1),
        strsub(shorttext, 1, j - 1))
    if #best_common < suffixLength + prefixLength then
      best_common = strsub(shorttext, j - suffixLength, j - 1)
          .. strsub(shorttext, j, j + prefixLength - 1)
      best_longtext_a = strsub(longtext, 1, i - suffixLength - 1)
      best_longtext_b = strsub(longtext, i + prefixLength)
      best_shorttext_a = strsub(shorttext, 1, j - suffixLength - 1)
      best_shorttext_b = strsub(shorttext, j + prefixLength)
    end
  end
  if #best_common * 2 >= #longtext then
    return {best_longtext_a, best_longtext_b,
            best_shorttext_a, best_shorttext_b, best_common}
  else
    return nil
  end
end

function _diff_halfMatch(text1, text2)
  if Diff_Timeout <= 0 then
    return nil
  end
  local longtext = (#text1 > #text2) and text1 or text2
  local shorttext = (#text1 > #text2) and text2 or text1
  if (#longtext < 4) or (#shorttext * 2 < #longtext) then
    return nil
  end

  local hm1 = _diff_halfMatchI(longtext, shorttext, ceil(#longtext / 4))
  local hm2 = _diff_halfMatchI(longtext, shorttext, ceil(#longtext / 2))
  local hm
  if not hm1 and not hm2 then
    return nil
  elseif not hm2 then
    hm = hm1
  elseif not hm1 then
    hm = hm2
  else
    hm = (#hm1[5] > #hm2[5]) and hm1 or hm2
  end

  local text1_a, text1_b, text2_a, text2_b
  if (#text1 > #text2) then
    text1_a, text1_b = hm[1], hm[2]
    text2_a, text2_b = hm[3], hm[4]
  else
    text2_a, text2_b = hm[1], hm[2]
    text1_a, text1_b = hm[3], hm[4]
  end
  local mid_common = hm[5]
  return text1_a, text1_b, text2_a, text2_b, mid_common
end

function _diff_cleanupSemanticScore(one, two)
  if (#one == 0) or (#two == 0) then
    return 6
  end

  local char1 = strsub(one, -1)
  local char2 = strsub(two, 1, 1)
  local nonAlphaNumeric1 = strmatch(char1, '%W')
  local nonAlphaNumeric2 = strmatch(char2, '%W')
  local whitespace1 = nonAlphaNumeric1 and strmatch(char1, '%s')
  local whitespace2 = nonAlphaNumeric2 and strmatch(char2, '%s')
  local lineBreak1 = whitespace1 and strmatch(char1, '%c')
  local lineBreak2 = whitespace2 and strmatch(char2, '%c')
  local blankLine1 = lineBreak1 and strmatch(one, '\n\r?\n$')
  local blankLine2 = lineBreak2 and strmatch(two, '^\r?\n\r?\n')

  if blankLine1 or blankLine2 then
    return 5
  elseif lineBreak1 or lineBreak2 then
    return 4
  elseif nonAlphaNumeric1 and not whitespace1 and whitespace2 then
    return 3
  elseif whitespace1 or whitespace2 then
    return 2
  elseif nonAlphaNumeric1 or nonAlphaNumeric2 then
    return 1
  end
  return 0
end

function _diff_cleanupSemanticLossless(diffs)
  local pointer = 2
  while diffs[pointer + 1] do
    local prevDiff, nextDiff = diffs[pointer - 1], diffs[pointer + 1]
    if (prevDiff[1] == DIFF_EQUAL) and (nextDiff[1] == DIFF_EQUAL) then
      local diff = diffs[pointer]

      local equality1 = prevDiff[2]
      local edit = diff[2]
      local equality2 = nextDiff[2]

      local commonOffset = _diff_commonSuffix(equality1, edit)
      if commonOffset > 0 then
        local commonString = strsub(edit, -commonOffset)
        equality1 = strsub(equality1, 1, -commonOffset - 1)
        edit = commonString .. strsub(edit, 1, -commonOffset - 1)
        equality2 = commonString .. equality2
      end

      local bestEquality1 = equality1
      local bestEdit = edit
      local bestEquality2 = equality2
      local bestScore = _diff_cleanupSemanticScore(equality1, edit)
          + _diff_cleanupSemanticScore(edit, equality2)

      while strbyte(edit, 1) == strbyte(equality2, 1) do
        equality1 = equality1 .. strsub(edit, 1, 1)
        edit = strsub(edit, 2) .. strsub(equality2, 1, 1)
        equality2 = strsub(equality2, 2)
        local score = _diff_cleanupSemanticScore(equality1, edit)
            + _diff_cleanupSemanticScore(edit, equality2)
        if score >= bestScore then
          bestScore = score
          bestEquality1 = equality1
          bestEdit = edit
          bestEquality2 = equality2
        end
      end
      if prevDiff[2] ~= bestEquality1 then
        if #bestEquality1 > 0 then
          diffs[pointer - 1][2] = bestEquality1
        else
          tremove(diffs, pointer - 1)
          pointer = pointer - 1
        end
        diffs[pointer][2] = bestEdit
        if #bestEquality2 > 0 then
          diffs[pointer + 1][2] = bestEquality2
        else
          tremove(diffs, pointer + 1, 1)
          pointer = pointer - 1
        end
      end
    end
    pointer = pointer + 1
  end
end

function _diff_cleanupMerge(diffs)
  diffs[#diffs + 1] = {DIFF_EQUAL, ''}
  local pointer = 1
  local count_delete, count_insert = 0, 0
  local text_delete, text_insert = '', ''
  local commonlength
  while diffs[pointer] do
    local diff_type = diffs[pointer][1]
    if diff_type == DIFF_INSERT then
      count_insert = count_insert + 1
      text_insert = text_insert .. diffs[pointer][2]
      pointer = pointer + 1
    elseif diff_type == DIFF_DELETE then
      count_delete = count_delete + 1
      text_delete = text_delete .. diffs[pointer][2]
      pointer = pointer + 1
    elseif diff_type == DIFF_EQUAL then
      if count_delete + count_insert > 1 then
        if (count_delete > 0) and (count_insert > 0) then
          commonlength = _diff_commonPrefix(text_insert, text_delete)
          if commonlength > 0 then
            local back_pointer = pointer - count_delete - count_insert
            if (back_pointer > 1) and (diffs[back_pointer - 1][1] == DIFF_EQUAL)
                then
              diffs[back_pointer - 1][2] = diffs[back_pointer - 1][2]
                  .. strsub(text_insert, 1, commonlength)
            else
              tinsert(diffs, 1,
                  {DIFF_EQUAL, strsub(text_insert, 1, commonlength)})
              pointer = pointer + 1
            end
            text_insert = strsub(text_insert, commonlength + 1)
            text_delete = strsub(text_delete, commonlength + 1)
          end
          commonlength = _diff_commonSuffix(text_insert, text_delete)
          if commonlength ~= 0 then
            diffs[pointer][2] =
                strsub(text_insert, -commonlength) .. diffs[pointer][2]
            text_insert = strsub(text_insert, 1, -commonlength - 1)
            text_delete = strsub(text_delete, 1, -commonlength - 1)
          end
        end
        pointer = pointer - count_delete - count_insert
        for i = 1, count_delete + count_insert do
          tremove(diffs, pointer)
        end
        if #text_delete > 0 then
          tinsert(diffs, pointer, {DIFF_DELETE, text_delete})
          pointer = pointer + 1
        end
        if #text_insert > 0 then
          tinsert(diffs, pointer, {DIFF_INSERT, text_insert})
          pointer = pointer + 1
        end
        pointer = pointer + 1
      elseif (pointer > 1) and (diffs[pointer - 1][1] == DIFF_EQUAL) then
        diffs[pointer - 1][2] = diffs[pointer - 1][2] .. diffs[pointer][2]
        tremove(diffs, pointer)
      else
        pointer = pointer + 1
      end
      count_insert, count_delete = 0, 0
      text_delete, text_insert = '', ''
    end
  end
  if diffs[#diffs][2] == '' then
    diffs[#diffs] = nil
  end

  local changes = false
  pointer = 2
  while pointer < #diffs do
    local prevDiff, nextDiff = diffs[pointer - 1], diffs[pointer + 1]
    if (prevDiff[1] == DIFF_EQUAL) and (nextDiff[1] == DIFF_EQUAL) then
      local diff = diffs[pointer]
      local currentText = diff[2]
      local prevText = prevDiff[2]
      local nextText = nextDiff[2]
      if #prevText == 0 then
        tremove(diffs, pointer - 1)
        changes = true
      elseif strsub(currentText, -#prevText) == prevText then
        diff[2] = prevText .. strsub(currentText, 1, -#prevText - 1)
        nextDiff[2] = prevText .. nextDiff[2]
        tremove(diffs, pointer - 1)
        changes = true
      elseif strsub(currentText, 1, #nextText) == nextText then
        prevDiff[2] = prevText .. nextText
        diff[2] = strsub(currentText, #nextText + 1) .. nextText
        tremove(diffs, pointer + 1)
        changes = true
      end
    end
    pointer = pointer + 1
  end

  if changes then
    return _diff_cleanupMerge(diffs)
  end
end

function _diff_xIndex(diffs, loc)
  local chars1 = 1
  local chars2 = 1
  local last_chars1 = 1
  local last_chars2 = 1
  local x
  for _x, diff in ipairs(diffs) do
    x = _x
    if diff[1] ~= DIFF_INSERT then 
      chars1 = chars1 + #diff[2]
    end
    if diff[1] ~= DIFF_DELETE then
      chars2 = chars2 + #diff[2]
    end
    if chars1 > loc then 
      break
    end
    last_chars1 = chars1
    last_chars2 = chars2
  end
  if diffs[x + 1] and (diffs[x][1] == DIFF_DELETE) then
    return last_chars2
  end
  return last_chars2 + (loc - last_chars1)
end

function _diff_text1(diffs)
  local text = {}
  for x, diff in ipairs(diffs) do
    if diff[1] ~= DIFF_INSERT then
      text[#text + 1] = diff[2]
    end
  end
  return tconcat(text)
end

function _diff_text2(diffs)
  local text = {}
  for x, diff in ipairs(diffs) do
    if diff[1] ~= DIFF_DELETE then
      text[#text + 1] = diff[2]
    end
  end
  return tconcat(text)
end

function _diff_toDelta(diffs)
  local text = {}
  for x, diff in ipairs(diffs) do
    local op, data = diff[1], diff[2]
    if op == DIFF_INSERT then
      text[x] = '+' .. gsub(data, percentEncode_pattern, percentEncode_replace)
    elseif op == DIFF_DELETE then
      text[x] = '-' .. #data
    elseif op == DIFF_EQUAL then
      text[x] = '=' .. #data
    end
  end
  return tconcat(text, '\t')
end

function _diff_fromDelta(text1, delta)
  local diffs = {}
  local diffsLength = 0 
  local pointer = 1 
  for token in gmatch(delta, '[^\t]+') do
    local tokenchar, param = strsub(token, 1, 1), strsub(token, 2)
    if (tokenchar == '+') then
      local invalidDecode = false
      local decoded = gsub(param, '%%(.?.?)',
          function(c)
            local n = tonumber(c, 16)
            if (#c ~= 2) or (n == nil) then
              invalidDecode = true
              return ''
            end
            return strchar(n)
          end)
      if invalidDecode then
        error('Illegal escape in _diff_fromDelta: ' .. param)
      end
      diffsLength = diffsLength + 1
      diffs[diffsLength] = {DIFF_INSERT, decoded}
    elseif (tokenchar == '-') or (tokenchar == '=') then
      local n = tonumber(param)
      if (n == nil) or (n < 0) then
        error('Invalid number in _diff_fromDelta: ' .. param)
      end
      local text = strsub(text1, pointer, pointer + n - 1)
      pointer = pointer + n
      if (tokenchar == '=') then
        diffsLength = diffsLength + 1
        diffs[diffsLength] = {DIFF_EQUAL, text}
      else
        diffsLength = diffsLength + 1
        diffs[diffsLength] = {DIFF_DELETE, text}
      end
    else
      error('Invalid diff operation in _diff_fromDelta: ' .. token)
    end
  end
  if (pointer ~= #text1 + 1) then
    error('Delta length (' .. (pointer - 1)
        .. ') does not equal source text length (' .. #text1 .. ').')
  end
  return diffs
end

local _match_bitap, _match_alphabet

function match_main(text, pattern, loc)
  if text == nil or pattern == nil or loc == nil then
    error('Null inputs. (match_main)')
  end

  if text == pattern then
    return 1
  elseif #text == 0 then
    return -1
  end
  loc = max(1, min(loc, #text))
  if strsub(text, loc, loc + #pattern - 1) == pattern then
    return loc
  else
    return _match_bitap(text, pattern, loc)
  end
end

function _match_alphabet(pattern)
  local s = {}
  local i = 0
  for c in gmatch(pattern, '.') do
    s[c] = bor(s[c] or 0, lshift(1, #pattern - i - 1))
    i = i + 1
  end
  return s
end

function _match_bitap(text, pattern, loc)
  if #pattern > Match_MaxBits then
    error('Pattern too long.')
  end

  local s = _match_alphabet(pattern)

  local function _match_bitapScore(e, x)
    local accuracy = e / #pattern
    local proximity = abs(loc - x)
    if (Match_Distance == 0) then
      return (proximity == 0) and 1 or accuracy
    end
    return accuracy + (proximity / Match_Distance)
  end

  local score_threshold = Match_Threshold
  local best_loc = indexOf(text, pattern, loc)
  if best_loc then
    score_threshold = min(_match_bitapScore(0, best_loc), score_threshold)
  end

  local matchmask = lshift(1, #pattern - 1)
  best_loc = -1

  local bin_min, bin_mid
  local bin_max = #pattern + #text
  local last_rd
  for d = 0, #pattern - 1, 1 do
    bin_min = 0
    bin_mid = bin_max
    while (bin_min < bin_mid) do
      if (_match_bitapScore(d, loc + bin_mid) <= score_threshold) then
        bin_min = bin_mid
      else
        bin_max = bin_mid
      end
      bin_mid = floor(bin_min + (bin_max - bin_min) / 2)
    end
    bin_max = bin_mid
    local start = max(1, loc - bin_mid + 1)
    local finish = min(loc + bin_mid, #text) + #pattern

    local rd = {}
    for j = start, finish do
      rd[j] = 0
    end
    rd[finish + 1] = lshift(1, d) - 1
    for j = finish, start, -1 do
      local charMatch = s[strsub(text, j - 1, j - 1)] or 0
      if (d == 0) then 
        rd[j] = band(bor((rd[j + 1] * 2), 1), charMatch)
      else
        rd[j] = bor(
                band(
                  bor(
                    lshift(rd[j + 1], 1),
                    1
                  ),
                  charMatch
                ),
                bor(
                  bor(
                    lshift(bor(last_rd[j + 1], last_rd[j]), 1),
                    1
                  ),
                  last_rd[j + 1]
                )
              )
      end
      if (band(rd[j], matchmask) ~= 0) then
        local score = _match_bitapScore(d, j - 1)
        if (score <= score_threshold) then
          score_threshold = score
          best_loc = j - 1
          if (best_loc > loc) then
            start = max(1, loc * 2 - best_loc)
          else
            break
          end
        end
      end
    end
    if (_match_bitapScore(d + 1, loc) > score_threshold) then
      break
    end
    last_rd = rd
  end
  return best_loc
end

local _patch_addContext,
      _patch_deepCopy,
      _patch_addPadding,
      _patch_splitMax,
      _patch_appendText,
      _new_patch_obj

function patch_make(a, opt_b, opt_c)
  local text1, diffs
  local type_a, type_b, type_c = type(a), type(opt_b), type(opt_c)
  if (type_a == 'string') and (type_b == 'string') and (type_c == 'nil') then
    text1 = a
    diffs = diff_main(text1, opt_b, true)
    if (#diffs > 2) then
      diff_cleanupSemantic(diffs)
      diff_cleanupEfficiency(diffs)
    end
  elseif (type_a == 'table') and (type_b == 'nil') and (type_c == 'nil') then
    diffs = a
    text1 = _diff_text1(diffs)
  elseif (type_a == 'string') and (type_b == 'table') and (type_c == 'nil') then
    text1 = a
    diffs = opt_b
  elseif (type_a == 'string') and (type_b == 'string') and (type_c == 'table')
      then
    text1 = a
    diffs = opt_c
  else
    error('Unknown call format to patch_make.')
  end

  if (diffs[1] == nil) then
    return {}
  end

  local patches = {}
  local patch = _new_patch_obj()
  local patchDiffLength = 0 
  local char_count1 = 0 
  local char_count2 = 0
  local prepatch_text, postpatch_text = text1, text1
  for x, diff in ipairs(diffs) do
    local diff_type, diff_text = diff[1], diff[2]

    if (patchDiffLength == 0) and (diff_type ~= DIFF_EQUAL) then
      patch.start1 = char_count1 + 1
      patch.start2 = char_count2 + 1
    end

    if (diff_type == DIFF_INSERT) then
      patchDiffLength = patchDiffLength + 1
      patch.diffs[patchDiffLength] = diff
      patch.length2 = patch.length2 + #diff_text
      postpatch_text = strsub(postpatch_text, 1, char_count2)
          .. diff_text .. strsub(postpatch_text, char_count2 + 1)
    elseif (diff_type == DIFF_DELETE) then
      patch.length1 = patch.length1 + #diff_text
      patchDiffLength = patchDiffLength + 1
      patch.diffs[patchDiffLength] = diff
      postpatch_text = strsub(postpatch_text, 1, char_count2)
          .. strsub(postpatch_text, char_count2 + #diff_text + 1)
    elseif (diff_type == DIFF_EQUAL) then
      if (#diff_text <= Patch_Margin * 2)
          and (patchDiffLength ~= 0) and (#diffs ~= x) then
        patchDiffLength = patchDiffLength + 1
        patch.diffs[patchDiffLength] = diff
        patch.length1 = patch.length1 + #diff_text
        patch.length2 = patch.length2 + #diff_text
      elseif (#diff_text >= Patch_Margin * 2) then
        if (patchDiffLength ~= 0) then
          _patch_addContext(patch, prepatch_text)
          patches[#patches + 1] = patch
          patch = _new_patch_obj()
          patchDiffLength = 0
          prepatch_text = postpatch_text
          char_count1 = char_count2
        end
      end
    end

    if (diff_type ~= DIFF_INSERT) then
      char_count1 = char_count1 + #diff_text
    end
    if (diff_type ~= DIFF_DELETE) then
      char_count2 = char_count2 + #diff_text
    end
  end

  if (patchDiffLength > 0) then
    _patch_addContext(patch, prepatch_text)
    patches[#patches + 1] = patch
  end

  return patches
end

function patch_apply(patches, text)
  if patches[1] == nil then
    return text, {}
  end

  patches = _patch_deepCopy(patches)

  local nullPadding = _patch_addPadding(patches)
  text = nullPadding .. text .. nullPadding

  _patch_splitMax(patches)
  local delta = 0
  local results = {}
  for x, patch in ipairs(patches) do
    local expected_loc = patch.start2 + delta
    local text1 = _diff_text1(patch.diffs)
    local start_loc
    local end_loc = -1
    if #text1 > Match_MaxBits then
      start_loc = match_main(text,
          strsub(text1, 1, Match_MaxBits), expected_loc)
      if start_loc ~= -1 then
        end_loc = match_main(text, strsub(text1, -Match_MaxBits),
            expected_loc + #text1 - Match_MaxBits)
        if end_loc == -1 or start_loc >= end_loc then
          start_loc = -1
        end
      end
    else
      start_loc = match_main(text, text1, expected_loc)
    end
    if start_loc == -1 then
      results[x] = false
      delta = delta - patch.length2 - patch.length1
    else
      results[x] = true
      delta = start_loc - expected_loc
      local text2
      if end_loc == -1 then
        text2 = strsub(text, start_loc, start_loc + #text1 - 1)
      else
        text2 = strsub(text, start_loc, end_loc + Match_MaxBits - 1)
      end
      if text1 == text2 then
        text = strsub(text, 1, start_loc - 1) .. _diff_text2(patch.diffs)
            .. strsub(text, start_loc + #text1)
      else
        local diffs = diff_main(text1, text2, false)
        if (#text1 > Match_MaxBits)
            and (diff_levenshtein(diffs) / #text1 > Patch_DeleteThreshold) then
          results[x] = false
        else
          _diff_cleanupSemanticLossless(diffs)
          local index1 = 1
          local index2
          for y, mod in ipairs(patch.diffs) do
            if mod[1] ~= DIFF_EQUAL then
              index2 = _diff_xIndex(diffs, index1)
            end
            if mod[1] == DIFF_INSERT then
              text = strsub(text, 1, start_loc + index2 - 2)
                  .. mod[2] .. strsub(text, start_loc + index2 - 1)
            elseif mod[1] == DIFF_DELETE then
              text = strsub(text, 1, start_loc + index2 - 2) .. strsub(text,
                  start_loc + _diff_xIndex(diffs, index1 + #mod[2] - 1))
            end
            if mod[1] ~= DIFF_DELETE then
              index1 = index1 + #mod[2]
            end
          end
        end
      end
    end
  end
  text = strsub(text, #nullPadding + 1, -#nullPadding - 1)
  return text, results
end

function patch_toText(patches)
  local text = {}
  for x, patch in ipairs(patches) do
    _patch_appendText(patch, text)
  end
  return tconcat(text)
end

function patch_fromText(textline)
  local patches = {}
  if (#textline == 0) then
    return patches
  end
  local text = {}
  for line in gmatch(textline, '([^\n]*)') do
    text[#text + 1] = line
  end
  local textPointer = 1
  while (textPointer <= #text) do
    local start1, length1, start2, length2
     = strmatch(text[textPointer], '^@@ %-(%d+),?(%d*) %+(%d+),?(%d*) @@$')
    if (start1 == nil) then
      error('Invalid patch string: "' .. text[textPointer] .. '"')
    end
    local patch = _new_patch_obj()
    patches[#patches + 1] = patch

    start1 = tonumber(start1)
    length1 = tonumber(length1) or 1
    if (length1 == 0) then
      start1 = start1 + 1
    end
    patch.start1 = start1
    patch.length1 = length1

    start2 = tonumber(start2)
    length2 = tonumber(length2) or 1
    if (length2 == 0) then
      start2 = start2 + 1
    end
    patch.start2 = start2
    patch.length2 = length2

    textPointer = textPointer + 1

    while true do
      local line = text[textPointer]
      if (line == nil) then
        break
      end
      local sign; sign, line = strsub(line, 1, 1), strsub(line, 2)

      local invalidDecode = false
      local decoded = gsub(line, '%%(.?.?)',
          function(c)
            local n = tonumber(c, 16)
            if (#c ~= 2) or (n == nil) then
              invalidDecode = true
              return ''
            end
            return strchar(n)
          end)
      if invalidDecode then
        error('Illegal escape in patch_fromText: ' .. line)
      end

      line = decoded

      if (sign == '-') then
        patch.diffs[#patch.diffs + 1] = {DIFF_DELETE, line}
      elseif (sign == '+') then
        patch.diffs[#patch.diffs + 1] = {DIFF_INSERT, line}
      elseif (sign == ' ') then
        patch.diffs[#patch.diffs + 1] = {DIFF_EQUAL, line}
      elseif (sign == '@') then
        break
      elseif (sign == '') then
      else
        error('Invalid patch mode "' .. sign .. '" in: ' .. line)
      end
      textPointer = textPointer + 1
    end
  end
  return patches
end

local patch_meta = {
  __tostring = function(patch)
    local buf = {}
    _patch_appendText(patch, buf)
    return tconcat(buf)
  end
}

function _new_patch_obj()
  return setmetatable({
    diffs = {};
    start1 = 1; 
    start2 = 1; 
    length1 = 0;
    length2 = 0;
  }, patch_meta)
end

function _patch_addContext(patch, text)
  if (#text == 0) then
    return
  end
  local pattern = strsub(text, patch.start2, patch.start2 + patch.length1 - 1)
  local padding = 0

  local firstMatch = indexOf(text, pattern)
  local secondMatch = nil
  if (firstMatch ~= nil) then
    secondMatch = indexOf(text, pattern, firstMatch + 1)
  end
  while (#pattern == 0 or secondMatch ~= nil)
      and (#pattern < Match_MaxBits - Patch_Margin - Patch_Margin) do
    padding = padding + Patch_Margin
    pattern = strsub(text, max(1, patch.start2 - padding),
    patch.start2 + patch.length1 - 1 + padding)
    firstMatch = indexOf(text, pattern)
    if (firstMatch ~= nil) then
      secondMatch = indexOf(text, pattern, firstMatch + 1)
    else
      secondMatch = nil
    end
  end
  padding = padding + Patch_Margin

  local prefix = strsub(text, max(1, patch.start2 - padding), patch.start2 - 1)
  if (#prefix > 0) then
    tinsert(patch.diffs, 1, {DIFF_EQUAL, prefix})
  end

  local suffix = strsub(text, patch.start2 + patch.length1,
  patch.start2 + patch.length1 - 1 + padding)
  if (#suffix > 0) then
    patch.diffs[#patch.diffs + 1] = {DIFF_EQUAL, suffix}
  end

  patch.start1 = patch.start1 - #prefix
  patch.start2 = patch.start2 - #prefix
  patch.length1 = patch.length1 + #prefix + #suffix
  patch.length2 = patch.length2 + #prefix + #suffix
end

function _patch_deepCopy(patches)
  local patchesCopy = {}
  for x, patch in ipairs(patches) do
    local patchCopy = _new_patch_obj()
    local diffsCopy = {}
    for i, diff in ipairs(patch.diffs) do
      diffsCopy[i] = {diff[1], diff[2]}
    end
    patchCopy.diffs = diffsCopy
    patchCopy.start1 = patch.start1
    patchCopy.start2 = patch.start2
    patchCopy.length1 = patch.length1
    patchCopy.length2 = patch.length2
    patchesCopy[x] = patchCopy
  end
  return patchesCopy
end

function _patch_addPadding(patches)
  local paddingLength = Patch_Margin
  local nullPadding = ''
  for x = 1, paddingLength do
    nullPadding = nullPadding .. strchar(x)
  end

  for x, patch in ipairs(patches) do
    patch.start1 = patch.start1 + paddingLength
    patch.start2 = patch.start2 + paddingLength
  end

  local patch = patches[1]
  local diffs = patch.diffs
  local firstDiff = diffs[1]
  if (firstDiff == nil) or (firstDiff[1] ~= DIFF_EQUAL) then
    tinsert(diffs, 1, {DIFF_EQUAL, nullPadding})
    patch.start1 = patch.start1 - paddingLength 
    patch.start2 = patch.start2 - paddingLength 
    patch.length1 = patch.length1 + paddingLength
    patch.length2 = patch.length2 + paddingLength
  elseif (paddingLength > #firstDiff[2]) then
    local extraLength = paddingLength - #firstDiff[2]
    firstDiff[2] = strsub(nullPadding, #firstDiff[2] + 1) .. firstDiff[2]
    patch.start1 = patch.start1 - extraLength
    patch.start2 = patch.start2 - extraLength
    patch.length1 = patch.length1 + extraLength
    patch.length2 = patch.length2 + extraLength
  end

  patch = patches[#patches]
  diffs = patch.diffs
  local lastDiff = diffs[#diffs]
  if (lastDiff == nil) or (lastDiff[1] ~= DIFF_EQUAL) then
    diffs[#diffs + 1] = {DIFF_EQUAL, nullPadding}
    patch.length1 = patch.length1 + paddingLength
    patch.length2 = patch.length2 + paddingLength
  elseif (paddingLength > #lastDiff[2]) then
    local extraLength = paddingLength - #lastDiff[2]
    lastDiff[2] = lastDiff[2] .. strsub(nullPadding, 1, extraLength)
    patch.length1 = patch.length1 + extraLength
    patch.length2 = patch.length2 + extraLength
  end

  return nullPadding
end

function _patch_splitMax(patches)
  local patch_size = Match_MaxBits
  local x = 1
  while true do
    local patch = patches[x]
    if patch == nil then
      return
    end
    if patch.length1 > patch_size then
      local bigpatch = patch
      tremove(patches, x)
      x = x - 1
      local start1 = bigpatch.start1
      local start2 = bigpatch.start2
      local precontext = ''
      while bigpatch.diffs[1] do
        local patch = _new_patch_obj()
        local empty = true
        patch.start1 = start1 - #precontext
        patch.start2 = start2 - #precontext
        if precontext ~= '' then
          patch.length1, patch.length2 = #precontext, #precontext
          patch.diffs[#patch.diffs + 1] = {DIFF_EQUAL, precontext}
        end
        while bigpatch.diffs[1] and (patch.length1 < patch_size-Patch_Margin) do
          local diff_type = bigpatch.diffs[1][1]
          local diff_text = bigpatch.diffs[1][2]
          if (diff_type == DIFF_INSERT) then
            patch.length2 = patch.length2 + #diff_text
            start2 = start2 + #diff_text
            patch.diffs[#(patch.diffs) + 1] = bigpatch.diffs[1]
            tremove(bigpatch.diffs, 1)
            empty = false
          elseif (diff_type == DIFF_DELETE) and (#patch.diffs == 1)
           and (patch.diffs[1][1] == DIFF_EQUAL)
           and (#diff_text > 2 * patch_size) then
            patch.length1 = patch.length1 + #diff_text
            start1 = start1 + #diff_text
            empty = false
            patch.diffs[#patch.diffs + 1] = {diff_type, diff_text}
            tremove(bigpatch.diffs, 1)
          else
            diff_text = strsub(diff_text, 1,
            patch_size - patch.length1 - Patch_Margin)
            patch.length1 = patch.length1 + #diff_text
            start1 = start1 + #diff_text
            if (diff_type == DIFF_EQUAL) then
              patch.length2 = patch.length2 + #diff_text
              start2 = start2 + #diff_text
            else
              empty = false
            end
            patch.diffs[#patch.diffs + 1] = {diff_type, diff_text}
            if (diff_text == bigpatch.diffs[1][2]) then
              tremove(bigpatch.diffs, 1)
            else
              bigpatch.diffs[1][2]
                  = strsub(bigpatch.diffs[1][2], #diff_text + 1)
            end
          end
        end
        precontext = _diff_text2(patch.diffs)
        precontext = strsub(precontext, -Patch_Margin)
        local postcontext = strsub(_diff_text1(bigpatch.diffs), 1, Patch_Margin)
        if postcontext ~= '' then
          patch.length1 = patch.length1 + #postcontext
          patch.length2 = patch.length2 + #postcontext
          if patch.diffs[1]
              and (patch.diffs[#patch.diffs][1] == DIFF_EQUAL) then
            patch.diffs[#patch.diffs][2] = patch.diffs[#patch.diffs][2]
                .. postcontext
          else
            patch.diffs[#patch.diffs + 1] = {DIFF_EQUAL, postcontext}
          end
        end
        if not empty then
          x = x + 1
          tinsert(patches, x, patch)
        end
      end
    end
    x = x + 1
  end
end

function _patch_appendText(patch, text)
  local coords1, coords2
  local length1, length2 = patch.length1, patch.length2
  local start1, start2 = patch.start1, patch.start2
  local diffs = patch.diffs

  if length1 == 1 then
    coords1 = start1
  else
    coords1 = ((length1 == 0) and (start1 - 1) or start1) .. ',' .. length1
  end

  if length2 == 1 then
    coords2 = start2
  else
    coords2 = ((length2 == 0) and (start2 - 1) or start2) .. ',' .. length2
  end
  text[#text + 1] = '@@ -' .. coords1 .. ' +' .. coords2 .. ' @@\n'

  local op
  for x, diff in ipairs(patch.diffs) do
    local diff_type = diff[1]
    if diff_type == DIFF_INSERT then
      op = '+'
    elseif diff_type == DIFF_DELETE then
      op = '-'
    elseif diff_type == DIFF_EQUAL then
      op = ' '
    end
    text[#text + 1] = op
        .. gsub(diffs[x][2], percentEncode_pattern, percentEncode_replace)
        .. '\n'
  end

  return text
end

local _M = {}

_M.DIFF_DELETE = DIFF_DELETE
_M.DIFF_INSERT = DIFF_INSERT
_M.DIFF_EQUAL = DIFF_EQUAL

_M.diff_main = diff_main
_M.diff_cleanupSemantic = diff_cleanupSemantic
_M.diff_cleanupEfficiency = diff_cleanupEfficiency
_M.diff_levenshtein = diff_levenshtein
_M.diff_prettyHtml = diff_prettyHtml

_M.match_main = match_main

_M.patch_make = patch_make
_M.patch_toText = patch_toText
_M.patch_fromText = patch_fromText
_M.patch_apply = patch_apply

_M.diff_commonPrefix = _diff_commonPrefix
_M.diff_commonSuffix = _diff_commonSuffix
_M.diff_commonOverlap = _diff_commonOverlap
_M.diff_halfMatch = _diff_halfMatch
_M.diff_bisect = _diff_bisect
_M.diff_cleanupMerge = _diff_cleanupMerge
_M.diff_cleanupSemanticLossless = _diff_cleanupSemanticLossless
_M.diff_text1 = _diff_text1
_M.diff_text2 = _diff_text2
_M.diff_toDelta = _diff_toDelta
_M.diff_fromDelta = _diff_fromDelta
_M.diff_xIndex = _diff_xIndex
_M.match_alphabet = _match_alphabet
_M.match_bitap = _match_bitap
_M.new_patch_obj = _new_patch_obj
_M.patch_addContext = _patch_addContext
_M.patch_splitMax = _patch_splitMax
_M.patch_addPadding = _patch_addPadding
_M.settings = settings

dmp = _M
