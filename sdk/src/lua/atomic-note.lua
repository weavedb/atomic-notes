if Name ~= '<NAME>' then Name = '<NAME>' end
if Description ~= '<DESCRIPTION>' then Description = '<DESCRIPTION>' end
if Thumbnail ~= '<THUMBNAIL>' then Thumbnail = '<THUMBNAIL>' end
if Creator ~= '<CREATOR>' then Creator = '<CREATOR>' end
if Ticker ~= '<TICKER>' then Ticker = '<TICKER>' end
if Denomination ~= '<DENOMINATION>' then Denomination = '<DENOMINATION>' end
if not Balances then Balances = { ['<CREATOR>'] = '<BALANCE>' } end
if DateCreated ~= '<DATECREATED>' then DateCreated = '<DATECREATED>' end
if not Collections then Collections = {} end

ao.addAssignable("LIBRARY", { Id = '<LIBRARY>' })
