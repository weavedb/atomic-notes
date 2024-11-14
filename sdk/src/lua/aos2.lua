Handlers.add(
  "Print",
  "Print",
  function (msg)
    print('Hello World!')
    local name = Send({ Target = ao.id, Action = "Get" }).receive()
    msg.reply({Data = "Hello ".. name.Data .. "!"})
  end
)


Handlers.add(
  "Get",
  "Get",
  function (msg)
    Send({Target = msg.From, Data = "Bob"})
  end
)
