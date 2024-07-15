import { useState, useEffect } from "react"
import { Input, Flex, Box, Image } from "@chakra-ui/react"
import { useParams } from "react-router-dom"
import { Link } from "react-router-dom"
import { map } from "ramda"
import dayjs from "dayjs"
import tomo from "/tomo.png"
import {
  createDataItemSigner,
  message,
  dryrun,
  result,
} from "@permaweb/aoconnect"

const getArticles = async () => {
  const result = await dryrun({
    process: import.meta.env.VITE_PROCESS_ID,
    tags: [{ name: "Action", value: "List" }],
  })
  return JSON.parse(result.Messages[0].Tags[6].value)
}
function Admin(a) {
  const [articles, setArticles] = useState([])
  const [title, setTitle] = useState("")
  const [id, setId] = useState("")
  const [txid, setTxid] = useState("")

  useEffect(() => {
    ;(async () => {
      try {
        const _articles = await getArticles()
        setArticles(_articles)
      } catch (e) {
        console.log(e)
      }
    })()
  }, [])
  const ok =
    !/^\s*$/.test(title) &&
    !/^\s*$/.test(id) &&
    !/^\s*$/.test(txid) &&
    txid.length === 43
  return (
    <Flex minH="100%" direction="column">
      <Flex justify="center">
        <Flex
          maxW="830px"
          width="100%"
          align="center"
          height="50px"
          fontSize="14px"
          justify="center"
        >
          <Box>
            AO Process ID:{" "}
            <Box
              as="a"
              target="_blank"
              href={`https://www.ao.link/#/entity/${import.meta.env.VITE_PROCESS_ID}`}
              sx={{ textDecoration: "underline" }}
            >
              {import.meta.env.VITE_PROCESS_ID}
            </Box>
          </Box>
        </Flex>
      </Flex>
      <Flex justify="center" flex={1}>
        <Flex direction="column" h="100%" w="100%" maxW="830px">
          <Box w="100%" flex={1}>
            <Box
              p={6}
              fontSize="12px"
              bg="#f0f0f0"
              sx={{ borderRadius: "10px" }}
            >
              <Box mb={4}>
                <Box mb={2}>Title</Box>
                <Input
                  bg="white"
                  value={title}
                  sx={{ border: "1px solid #999" }}
                  onChange={e => setTitle(e.target.value)}
                />
              </Box>
              <Flex>
                <Box mb={4} mr={2}>
                  <Box mb={2}>Page ID</Box>
                  <Input
                    value={id}
                    bg="white"
                    sx={{ border: "1px solid #999" }}
                    onChange={e => setId(e.target.value)}
                  />
                </Box>
                <Box mb={4} flex={1} ml={2}>
                  <Box mb={2}>Markdown Arweave TxID</Box>
                  <Input
                    value={txid}
                    bg="white"
                    sx={{ border: "1px solid #999" }}
                    onChange={e => setTxid(e.target.value)}
                  />
                </Box>
              </Flex>
              <Flex
                fontSize="14px"
                justify="center"
                px={4}
                py={2}
                sx={{
                  opacity: ok ? 1 : 0.5,
                  borderRadius: "3px",
                  cursor: ok ? "pointer" : "default",
                  ":hover": { opacity: 0.75 },
                  border: "1px solid #999",
                  bg: "white",
                }}
                onClick={async () => {
                  if (!ok) return
                  let text = null
                  try {
                    const r = await fetch(`https://arweave.net/${txid}`)
                    if (r.status === 200) text = await r.text()
                  } catch (e) {
                    console.log(e)
                  }
                  if (text === null) {
                    alert("Markdown File coundn't be found")
                    return

                    return
                  }
                  await window.arweaveWallet.connect([
                    "ACCESS_ADDRESS",
                    "SIGN_TRANSACTION",
                  ])
                  const tags = [
                    { name: "Action", value: "Add" },
                    { name: "title", value: title },
                    { name: "id", value: id },
                    { name: "txid", value: txid },
                    { name: "date", value: Date.now().toString() },
                  ]
                  const messageId = await message({
                    process: import.meta.env.VITE_PROCESS_ID,
                    signer: createDataItemSigner(window.arweaveWallet),
                    tags,
                  })
                  let res = await result({
                    message: messageId,
                    process: import.meta.env.VITE_PROCESS_ID,
                  })
                  if (res.Messages[0]) {
                    const _articles = await getArticles()
                    setArticles(_articles)
                    setTitle("")
                    setId("")
                    setTxid("")
                  } else {
                    console.log(res)
                    alert("something went wrong!")
                  }
                }}
              >
                Add New Article
              </Flex>
            </Box>
          </Box>
          <Box w="100%" flex={1}>
            {map(v => {
              return (
                <>
                  <Flex pt={4} px={6} fontSize="20px" align="center">
                    <Link to={`../a/${v.id}`}>
                      <Box as="u">{v.title}</Box>
                    </Link>
                    <Box flex={1}></Box>
                    <Box mx={4} as="span" fontSize="14px">
                      {dayjs(v.date).format("YYYY MM/DD mm:HH")}
                    </Box>
                    <Box fontSize="12px" as="span">
                      <Flex
                        justify="center"
                        px={4}
                        py={1}
                        sx={{
                          borderRadius: "3px",
                          cursor: "pointer",
                          ":hover": { opacity: 0.5 },
                          border: "1px solid #999",
                        }}
                        onClick={async () => {
                          if (!confirm("Would you like to delete it?")) {
                            return
                          }
                          await window.arweaveWallet.connect([
                            "ACCESS_ADDRESS",
                            "SIGN_TRANSACTION",
                          ])
                          const tags = [
                            { name: "Action", value: "Delete" },
                            { name: "id", value: v.id },
                          ]
                          const messageId = await message({
                            process: import.meta.env.VITE_PROCESS_ID,
                            signer: createDataItemSigner(window.arweaveWallet),
                            tags,
                          })
                          let res = await result({
                            message: messageId,
                            process: import.meta.env.VITE_PROCESS_ID,
                          })
                          if (res.Messages[0]) {
                            const _articles = await getArticles()
                            setArticles(_articles)
                          } else {
                            console.log(res)
                            alert("something went wrong!")
                          }
                        }}
                      >
                        Delete
                      </Flex>
                    </Box>
                  </Flex>
                </>
              )
            })(articles)}
          </Box>
        </Flex>
      </Flex>
      <Flex direction="column" align="center">
        <Flex
          maxW="830px"
          align="center"
          justify="center"
          sx={{ borderTop: "1px solid #ddd" }}
          p={4}
          width="100%"
        >
          <Link to="/">
            <Flex>
              <Flex justify="center" mr={2}>
                <Image src={tomo} boxSize="25px" />
              </Flex>
              <Box>
                <Box>TOMO</Box>
              </Box>
            </Flex>
          </Link>
        </Flex>
      </Flex>
    </Flex>
  )
}

export default Admin
