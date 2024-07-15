local json = require("json")
local ao = require('ao')

Articles = Articles or {}

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
      table.sort(arr, function(a, b)
		    return a.date > b.date
      end)
      ao.send({
	    Target = msg.From,
	    Articles = json.encode(arr)
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
