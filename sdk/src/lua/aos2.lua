local count = 0

Handlers.add(
  "Print",
  "Print",
  function (msg)
    print('Hello World!')
    local name = Send({Target = msg.Addr, Action = "Get", Tags = { Origin = msg.From, To = msg.Addr, ID = "1" } }).receive().Data
    local name2 = Send({Target = msg.Addr2, Action = "Get2", Tags = { Origin = msg.From, To = msg.Addr } }).receive().Data
    local name3 = Send({Target = msg.Addr, Action = "Get", Tags = { Origin = msg.From, To = msg.Addr, ID = "3" } }).receive().Data
    local name4 = Send({Target = msg.Addr2, Action = "Get2", Tags = { Origin = msg.From, To = msg.Addr } }).receive().Data
    msg.reply({ Data = name4 .. " printed!"})
  end
)


Handlers.add(
  "Get",
  "Get",
  function (msg)
    count = count + 1
    msg.reply({ Data = "Bob" .. count, Tags = { Ret = msg.From, Origin = msg.Origin, To = msg.To } })
  end
)

Handlers.add(
  "Get2",
  "Get2",
  function (msg)
    count = count + 1
    msg.reply({ Data = "Alice" .. count, Tags = { Ret = msg.From, Origin = msg.Origin, To = msg.To } })
  end
)
