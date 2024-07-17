local json = require("json")
local ao = require('ao')

Articles = Articles or {}
Profile = Profile or nil

Handlers.add(
   "Set-Profile",
   Handlers.utils.hasMatchingTag("Action", "Set-Profile"),
   function (msg)
      assert(msg.From == Owner, 'only owner can execute!')
      assert(type(msg.name) == 'string', 'name is required!')
      local profile = {	name = msg.name }
      if msg.description then
	 profile.description = msg.description
      end
      if msg.x then
	 profile.x = msg.x
      end
      if msg.github then
	 profile.github = msg.github
      end
      if msg.image then
	 profile.image = msg.image
      end
      if msg.cover then
	 profile.cover = msg.cover
      end
      Profile = profile
      Handlers.utils.reply("profile updated!")(msg)
   end
)

Handlers.add(
   "Get-Profile",
   Handlers.utils.hasMatchingTag("Action", "Get-Profile"),
   function (msg)
      ao.send({
	    Target = msg.From,
	    Article = json.encode(Profile)
      })
   end
)

Handlers.add(
   "Add",
   Handlers.utils.hasMatchingTag("Action", "Add"),
   function (msg)
      assert(msg.From == Owner, 'only owner can execute!')
      assert(type(msg.title) == 'string', 'title is required!')
      assert(type(msg.id) == 'string', 'id is required!')
      assert(type(msg.txid) == 'string', 'txid is required!')
      assert(0 < tonumber(msg.date), 'date must be greater than 0')
      assert(not Articles[msg.id], 'article exists!')      
      local article = {
	 title = msg.title,
	 txid = msg.txid,
	 id = msg.id,
	 date = tonumber(msg.date)
      }
      
      Articles[msg.id] = article
      Handlers.utils.reply("article added!")(msg)
   end
)

Handlers.add(
   "Update",
   Handlers.utils.hasMatchingTag("Action", "Update"),
   function (msg)
      assert(msg.From == Owner, 'only owner can execute!')
      assert(type(msg.txid) == 'string', 'txid is required!')
      assert(type(msg.id) == 'string', 'id is required!')
      assert(Articles[msg.id], 'article does not exist!')
      assert(0 < tonumber(msg.date), 'date must be greater than 0')
      local article = Articles[msg.id]
      if msg.title then
	 assert(type(msg.title) == 'string', 'title must be string!')
	 article.title = msg.title
      end
      article.txid = msg.txid
      article.update = tonumber(msg.date)
      Articles[msg.id] = article
      Handlers.utils.reply("article updated!")(msg)
   end
)

Handlers.add(
   "Delete",
   Handlers.utils.hasMatchingTag("Action", "Delete"),
   function (msg)
      assert(msg.From == Owner, 'only owner can execute!')
      assert(type(msg.id) == 'string', 'id is required!')
      assert(Articles[msg.id], 'article doesn\'t exist!')
      Articles[msg.id] = nil
      Handlers.utils.reply("article deleted!")(msg)
   end
)

Handlers.add(
   "List",
   Handlers.utils.hasMatchingTag("Action", "List"),
   function (msg)
      local arr = {}
      for _, article in pairs(Articles) do
	 table.insert(arr, article)
      end

      local order = msg.order or "desc"
      local limit = msg.limit or #arr
      local skip = msg.skip or 0

      table.sort(arr, function(a, b)
         if order == "asc" then
            return a.date < b.date
         else
            return a.date > b.date
         end
      end)

      local start = skip + 1
      local finish = start + limit - 1
      finish = math.min(finish, #arr)

      local slicedArr = {}
      for i = start, finish do
         table.insert(slicedArr, arr[i])
      end
      local isNext = (finish < #arr) and "true" or "false"
      ao.send({
	    Target = msg.From,
	    Articles = json.encode(slicedArr),
	    Count = tostring(#arr),
	    Next  = isNext
      })
   end
)

Handlers.add(
   "Get",
   Handlers.utils.hasMatchingTag("Action", "Get"),
   function (msg)
      assert(type(msg.id) == 'string', 'id is required!')
      ao.send({
	    Target = msg.From,
	    Article = json.encode(Articles[msg.id])
      })
   end
)

