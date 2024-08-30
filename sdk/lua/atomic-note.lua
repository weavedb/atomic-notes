local bint = require('.bint')(256)
local json = require('json')
local base64 = require(".base64")
local ao = require("ao")

if Name ~= '<NAME>' then Name = '<NAME>' end
if Description ~= '<DESCRIPTION>' then Description = '<DESCRIPTION>' end
if Thumbnail ~= '<THUMBNAIL>' then Thumbnail = '<THUMBNAIL>' end
--if Collection ~= '<COLLECTION>' then Collection = '<COLLECTION>' end
if Creator ~= '<CREATOR>' then Creator = '<CREATOR>' end
if Ticker ~= '<TICKER>' then Ticker = '<TICKER>' end
if Denomination ~= '<DENOMINATION>' then Denomination = '<DENOMINATION>' end
if not Balances then Balances = { ['<CREATOR>'] = '<BALANCE>' } end
if DateCreated ~= '<DATECREATED>' then DateCreated = '<DATECREATED>' end
if not Collections then Collections = {} end

Transferable = true

local function checkValidAddress(address)
	if not address or type(address) ~= 'string' then
		return false
	end

	return string.match(address, "^[%w%-_]+$") ~= nil and #address == 43
end

local function checkValidAmount(data)
	return (math.type(tonumber(data)) == 'integer' or math.type(tonumber(data)) == 'float') and bint(data) > 0
end

local function decodeMessageData(data)
	local status, decodedData = pcall(json.decode, data)

	if not status or type(decodedData) ~= 'table' then
		return false, nil
	end

	return true, decodedData
end

-- Read process state
Handlers.add('Info', Handlers.utils.hasMatchingTag('Action', 'Info'), function(msg)
	ao.send({
		Target = msg.From,
		Action = 'Read-Success',
		Data = json.encode({
		        Name = Name,
		        Description = Description,
			Ticker = Ticker,
			Denomination = Denomination,
			Balances = Balances,
			Transferable = Transferable,
			Thumbnail = Thumbnail,
			Collections = Collections
		})
	})
end)

-- Transfer balance to recipient (Data - { Recipient, Quantity })
Handlers.add('Transfer', Handlers.utils.hasMatchingTag('Action', 'Transfer'), function(msg)
	if not Transferable then
		ao.send({ Target = msg.From, Action = 'Validation-Error', Tags = { Status = 'Error', Message = 'Transfers are not allowed' } })
		return
	end

	local data = {
		Recipient = msg.Tags.Recipient,
		Quantity = msg.Tags.Quantity
	}

	if checkValidAddress(data.Recipient) and checkValidAmount(data.Quantity) then
		-- Transfer is valid, calculate balances
		if not Balances[data.Recipient] then
			Balances[data.Recipient] = '0'
		end

		Balances[msg.From] = tostring(bint(Balances[msg.From]) - bint(data.Quantity))
		Balances[data.Recipient] = tostring(bint(Balances[data.Recipient]) + bint(data.Quantity))

		-- If new balance zeroes out then remove it from the table
		if bint(Balances[msg.From]) <= 0 then
			Balances[msg.From] = nil
		end
		if bint(Balances[data.Recipient]) <= 0 then
			Balances[data.Recipient] = nil
		end

		local debitNoticeTags = {
			Status = 'Success',
			Message = 'Balance transferred, debit notice issued',
			Recipient = msg.Tags.Recipient,
			Quantity = msg.Tags.Quantity,
		}

		local creditNoticeTags = {
			Status = 'Success',
			Message = 'Balance transferred, credit notice issued',
			Sender = msg.From,
			Quantity = msg.Tags.Quantity,
		}

		for tagName, tagValue in pairs(msg) do
			if string.sub(tagName, 1, 2) == 'X-' then
				debitNoticeTags[tagName] = tagValue
				creditNoticeTags[tagName] = tagValue
			end
		end

		-- Send a debit notice to the sender
		ao.send({
			Target = msg.From,
			Action = 'Debit-Notice',
			Tags = debitNoticeTags,
			Data = json.encode({
				Recipient = data.Recipient,
				Quantity = tostring(data.Quantity)
			})
		})

		-- Send a credit notice to the recipient
		ao.send({
			Target = data.Recipient,
			Action = 'Credit-Notice',
			Tags = creditNoticeTags,
			Data = json.encode({
				Sender = msg.From,
				Quantity = tostring(data.Quantity)
			})
		})
	end
end)

-- Mint new tokens (Data - { Quantity })
Handlers.add('Mint', Handlers.utils.hasMatchingTag('Action', 'Mint'), function(msg)
	local decodeCheck, data = decodeMessageData(msg.Data)

	if decodeCheck and data then
		-- Check if quantity is present
		if not data.Quantity then
			ao.send({ Target = msg.From, Action = 'Input-Error', Tags = { Status = 'Error', Message = 'Invalid arguments, required { Quantity }' } })
			return
		end

		-- Check if quantity is a valid integer greater than zero
		if not checkValidAmount(data.Quantity) then
			ao.send({ Target = msg.From, Action = 'Validation-Error', Tags = { Status = 'Error', Message = 'Quantity must be an integer greater than zero' } })
			return
		end

		-- Check if owner is sender
		if msg.From ~= Owner then
			ao.send({ Target = msg.From, Action = 'Validation-Error', Tags = { Status = 'Error', Message = 'Only the process owner can mint new tokens' } })
			return
		end

		-- Mint request is valid, add tokens to the pool
		if not Balances[Owner] then
			Balances[Owner] = '0'
		end

		Balances[Owner] = tostring(bint(Balances[Owner]) + bint(data.Quantity))

		ao.send({ Target = msg.From, Action = 'Mint-Success', Tags = { Status = 'Success', Message = 'Tokens minted' } })
	else
		ao.send({
			Target = msg.From,
			Action = 'Input-Error',
			Tags = {
				Status = 'Error',
				Message = string.format('Failed to parse data, received: %s. %s', msg.Data,
					'Data must be an object - { Quantity }')
			}
		})
	end
end)

-- Read balance (Data - { Target })
Handlers.add('Balance', Handlers.utils.hasMatchingTag('Action', 'Balance'), function(msg)
	local decodeCheck, data = decodeMessageData(msg.Data)

	if decodeCheck and data then
		-- Check if target is present
		if not data.Target then
			ao.send({ Target = msg.From, Action = 'Input-Error', Tags = { Status = 'Error', Message = 'Invalid arguments, required { Target }' } })
			return
		end

		-- Check if target is a valid address
		if not checkValidAddress(data.Target) then
			ao.send({ Target = msg.From, Action = 'Validation-Error', Tags = { Status = 'Error', Message = 'Target is not a valid address' } })
			return
		end

		-- Check if target has a balance
		if not Balances[data.Target] then
			ao.send({ Target = msg.From, Action = 'Read-Error', Tags = { Status = 'Error', Message = 'Target does not have a balance' } })
			return
		end

		ao.send({
			Target = msg.From,
			Action = 'Read-Success',
			Tags = { Status = 'Success', Message = 'Balance received' },
			Data =
				Balances[data.Target]
		})
	else
		ao.send({
			Target = msg.From,
			Action = 'Input-Error',
			Tags = {
				Status = 'Error',
				Message = string.format('Failed to parse data, received: %s. %s', msg.Data,
					'Data must be an object - { Target }')
			}
		})
	end
end)

-- Read balances
Handlers.add('Balances', Handlers.utils.hasMatchingTag('Action', 'Balances'),
	function(msg) ao.send({ Target = msg.From, Action = 'Read-Success', Data = json.encode(Balances) }) end)

-- Initialize a request to add the uploaded asset to a profile
Handlers.add('Add-Asset-To-Profile', Handlers.utils.hasMatchingTag('Action', 'Add-Asset-To-Profile'), function(msg)
	if checkValidAddress(msg.Tags.ProfileProcess) then
		-- ao.assign({ Processes = { msg.Tags.ProfileProcess }, Message = ao.id })
		ao.send({
			Target = msg.Tags.ProfileProcess,
			Action = 'Add-Uploaded-Asset',
			Data = json.encode({
				Id = ao.id,
				Quantity = msg.Tags.Quantity or '0'
			})
		})
	else
		ao.send({
			Target = msg.From,
			Action = 'Input-Error',
			Tags = {
				Status = 'Error',
				Message = 'ProfileProcess tag not specified or not a valid Process ID'
			}
		})
	end
end)

Handlers.add('Add-To-Collection-Success', Handlers.utils.hasMatchingTag('Action', 'Add-To-Collection-Success'), function(msg)
		local exists = false
		for i, id in ipairs(Collections) do
		   if id == msg.From then
		      exists = true
		      break
		   end
		end
		
		if not exists then
		   table.insert(Collections, msg.From)
		end
end)

Handlers.add('Remove-From-Collection-Success', Handlers.utils.hasMatchingTag('Action', 'Remove-From-Collection-Success'), function(msg)
		for i, id in ipairs(Collections) do
		   if id == msg.From then
		      table.remove(Collections, i)
		      break
		   end
		end
end)


if not data then
   data = nil
end

if not version then
   version = "0.0.1"
end

if not versions then
   versions = {}
end

if not editors then
   editors = { ao.env.Process.Owner }
end

local function reverse_patch(patch)
    local reversed_patch = {}
    for _, p in ipairs(patch) do
        local diffs = p.diffs
        local reversed_diffs = {}
        for _, diff in ipairs(diffs) do
            local op, text = diff[1], diff[2]
            table.insert(reversed_diffs, { -op, text })
        end
        table.insert(reversed_patch, {
            diffs = reversed_diffs,
            start1 = p.start2,
            start2 = p.start1,
            length1 = p.length2,
            length2 = p.length1
        })
    end
    return reversed_patch
end

local function is_editor(from)
   for _, editor in ipairs(editors) do
      if from == editor then
	 return true
      end
   end
   return false
end

local function checkValidAddress(address)
	if not address or type(address) ~= 'string' then
		return false
	end

	return string.match(address, "^[%w%-_]+$") ~= nil and #address == 43
end

Handlers.add(
   "get",
   Handlers.utils.hasMatchingTag("Action", "Get"),
   function (msg)
      if msg.Tags.Version then
	 local __patches = nil
	 for j = #versions, 1, -1 do
	    local v = versions[j]
	    local _data = data
	    if __patches then
	       local _patches = dmp.patch_fromText(base64.decode(__patches))
	       local reversed = reverse_patch(_patches)
	       _data = dmp.patch_apply(reversed, _data)
	    end
	    __patches = v.patches
	    if v.version == msg.Tags.Version then
	       ao.send({
		     Target = msg.From,
		     Tags = {
			Data = _data,
			Version = v.version,
			Date = tostring(v.date)
		     }
	       })
	    end
	 end
      else
	 ao.send({
	       Target = msg.From,
	       Tags = {
		  Data = data,
		  Version = version
	       }
	 })
      end
   end
)

Handlers.add(
   "list",
   Handlers.utils.hasMatchingTag("Action", "List"),
   function (msg)
      ao.send({Target = msg.From, Tags = {
		  Versions = json.encode(versions)
		  
      }})
   end
)

Handlers.add(
   "editors",
   Handlers.utils.hasMatchingTag("Action", "Editors"),
   function (msg)
      ao.send({Target = msg.From, Tags = {
		  Editors = json.encode(editors)
		  
      }})
   end
)

Handlers.add(
   "add-editor",
   Handlers.utils.hasMatchingTag("Action", "Add-Editor"),
   function (msg)
      assert(type(msg.Tags.Editor) == "string" and checkValidAddress(msg.Tags.Editor), 'A valid editor is required!')
      local exists = false
      for _, editor in ipairs(editors) do
	 if msg.Tags.Editor == editor then
	    exists = true
            break
	 end
      end
      assert(exists == false, 'Editor already exists!')
      table.insert(editors,msg.Tags.Editor)
      ao.send({
	    Target = msg.From,
	    Data = "editor added!",
	    Tags = {
		  Editors = json.encode(editors)
		  
	    }
      })
   end
)

Handlers.add(
   "remove-editor",
   Handlers.utils.hasMatchingTag("Action", "Remove-Editor"),
   function (msg)
      assert(type(msg.Tags.Editor) == "string" and checkValidAddress(msg.Tags.Editor), 'A valid editor is required!')
      local exists = false
      for i, editor in ipairs(editors) do
	 if msg.Tags.Editor == editor then
	    exists = true
            table.remove(editors, i)
            break
	 end
      end
      assert(exists == true, 'Editor does not exist!')
      ao.send({
	    Target = msg.From,
	    Data = "editor removed!",
	    Tags = {
	       Editors = json.encode(editors)
		  
	    }
      })
   end
)

Handlers.add(
   "update",
   Handlers.utils.hasMatchingTag("Action", "Update"),
   function (msg)
      assert(type(msg.Tags.Version) == "string", 'Version is required!')
      assert(type(msg.Data) == "string", 'Data is required!')
      assert(semver(msg.Tags.Version) > semver(version), "Version must be higher!")
      assert(is_editor(msg.From), 'sender is not an editor!')
      local _patches = dmp.patch_fromText(base64.decode(msg.Data))
      data = dmp.patch_apply(_patches, data)
      version = msg.Tags.Version
      table.insert(versions, { version = msg.Tags.Version, date = msg.Timestamp, patches = msg.Data, editor = msg.From })
      Handlers.utils.reply("updated!")(msg)
   end
)

Handlers.add(
   "patches",
   Handlers.utils.hasMatchingTag("Action", "Patches"),
   function (msg)
      local patches = dmp.patch_make(data, msg.Data)
      ao.send({
	    Target = msg.From,
	    Tags = {
	       Patches = base64.encode(dmp.patch_toText(patches)),
	    }
      })
   end
)

Handlers.add(
   "assigned",
   Handlers.utils.hasMatchingTag("Action", "Assigned"),
   function (msg)
      data = msg.Data
      table.insert(versions, { version = version, date = nil, patches = nil, editor = ao.env.Process.Owner })
   end
)
