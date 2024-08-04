local ao = require("ao")
Handlers.add(
   "allow",
   Handlers.utils.hasMatchingTag("Action", "Allow"),
   function (msg)
      ao.addAssignable({ From = msg.From })
      Handlers.utils.reply("allowed!")(msg)
   end
)

Handlers.add(
   "assign",
   Handlers.utils.hasMatchingTag("Type", "Process"),
   function (msg)
      assert(msg.From == msg.Owner, 'only process owner can execute!')
      assert(msg.Tags["Content-Type"] == "text/markdown" or msg.Tags["Content-Type"] == "text/plain", 'only markdown and text are allowed!')
      ao.send({
	    Target = msg.Id,
	    Data = msg.Data,
	    Tags = { Action = "Assigned" }
      })
   end
)
