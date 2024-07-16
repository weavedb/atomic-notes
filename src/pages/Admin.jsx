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

import { defaultProfile, getProfile, getArticles } from "../lib/utils"

function Admin(a) {
  const [articles, setArticles] = useState([])
  const [title, setTitle] = useState("")
  const [id, setId] = useState("")
  const [txid, setTxid] = useState("")
  const [profile, setProfile] = useState(null)
  const [tab, setTab] = useState("New")
  const [update, setUpdate] = useState(null)
  const tabs = ["New", "Articles", "Profile"]
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [image, setImage] = useState("")
  const [cover, setCover] = useState("")
  const [x, setX] = useState("")
  const [github, setGithub] = useState("")
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
  useEffect(() => {
    ;(async () => {
      try {
        const _profile = await getProfile()
        setProfile(_profile)
        if (_profile) {
          if (_profile.name) setName(_profile.name)
          if (_profile.description) setDescription(_profile.description)
          if (_profile.image) setImage(_profile.image)
          if (_profile.cover) setCover(_profile.cover)
          if (_profile.x) setX(_profile.x)
          if (_profile.github) setGithub(_profile.github)
        }
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

  const ok_profile = !/^\s*$/.test(name)
  const _profile = defaultProfile(profile)
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
      <Flex mb={4} justify="center">
        <Flex maxW="830px" width="100%">
          {map(v => {
            return (
              <Flex
                w="85px"
                mr={4}
                bg={tab === v ? "#f0f0f0" : "white"}
                justify="center"
                px={4}
                py={1}
                sx={{
                  borderRadius: "3px",
                  cursor: "pointer",
                  ":hover": { opacity: 0.5 },
                  border: "1px solid #999",
                }}
                onClick={() => setTab(v)}
              >
                {update !== null && v === "New" ? "Update" : v}
              </Flex>
            )
          })(tabs)}
          <Flex flex={1} />
        </Flex>
      </Flex>
      <Flex justify="center" flex={1}>
        <Flex direction="column" h="100%" w="100%" maxW="830px">
          {tab !== "Profile" ? null : (
            <Box w="100%" flex={1}>
              <Box
                p={6}
                fontSize="12px"
                bg="#f0f0f0"
                sx={{ borderRadius: "10px" }}
              >
                <Box mb={4}>
                  <Box mb={2}>Name</Box>
                  <Input
                    bg="white"
                    value={name}
                    sx={{ border: "1px solid #999" }}
                    onChange={e => setName(e.target.value)}
                  />
                </Box>
                <Box mb={4}>
                  <Box mb={2}>Description</Box>
                  <Input
                    bg="white"
                    value={description}
                    sx={{ border: "1px solid #999" }}
                    onChange={e => setDescription(e.target.value)}
                  />
                </Box>
                <Box mb={4}>
                  <Box mb={2}>Image</Box>
                  <Input
                    bg="white"
                    value={image}
                    sx={{ border: "1px solid #999" }}
                    onChange={e => setImage(e.target.value)}
                  />
                </Box>
                <Box mb={4}>
                  <Box mb={2}>Cover</Box>
                  <Input
                    bg="white"
                    value={cover}
                    sx={{ border: "1px solid #999" }}
                    onChange={e => setCover(e.target.value)}
                  />
                </Box>
                <Flex>
                  <Box mb={4} mr={2} flex={1}>
                    <Box mb={2}>Twitter / X</Box>
                    <Input
                      value={x}
                      bg="white"
                      sx={{ border: "1px solid #999" }}
                      onChange={e => setX(e.target.value)}
                    />
                  </Box>
                  <Box mb={4} ml={2} flex={1}>
                    <Box mb={2}>Github</Box>
                    <Input
                      value={github}
                      bg="white"
                      sx={{ border: "1px solid #999" }}
                      onChange={e => setGithub(e.target.value)}
                    />
                  </Box>
                </Flex>
                <Flex
                  fontSize="14px"
                  justify="center"
                  px={4}
                  py={2}
                  sx={{
                    opacity: ok_profile ? 1 : 0.5,
                    borderRadius: "3px",
                    cursor: ok_profile ? "pointer" : "default",
                    ":hover": { opacity: 0.75 },
                    border: "1px solid #999",
                    bg: "white",
                  }}
                  onClick={async () => {
                    if (!ok_profile) return
                    await window.arweaveWallet.connect([
                      "ACCESS_ADDRESS",
                      "SIGN_TRANSACTION",
                    ])
                    let tags = [
                      { name: "Action", value: "Set-Profile" },
                      { name: "name", value: name },
                    ]
                    if (!/^\s*$/.test(description)) {
                      tags.push({ name: "description", value: description })
                    }
                    if (!/^\s*$/.test(image)) {
                      tags.push({ name: "image", value: image })
                    }
                    if (!/^\s*$/.test(cover)) {
                      tags.push({ name: "cover", value: cover })
                    }
                    if (!/^\s*$/.test(x)) {
                      tags.push({ name: "x", value: x })
                    }
                    if (!/^\s*$/.test(github)) {
                      tags.push({ name: "github", value: github })
                    }
                    const messageId = await message({
                      process: import.meta.env.VITE_PROCESS_ID,
                      signer: createDataItemSigner(window.arweaveWallet),
                      tags,
                    })
                    const res = await result({
                      message: messageId,
                      process: import.meta.env.VITE_PROCESS_ID,
                    })
                    if (res.Messages[0]) {
                      const _profile = await getProfile()
                      setProfile(_profile)
                    } else {
                      console.log(res)
                      alert("something went wrong!")
                    }
                  }}
                >
                  Update Profile
                </Flex>
              </Box>
            </Box>
          )}
          {tab !== "New" ? null : (
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
                      disabled={update === null ? "" : true}
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
                    }
                    await window.arweaveWallet.connect([
                      "ACCESS_ADDRESS",
                      "SIGN_TRANSACTION",
                    ])
                    let tags = [
                      {
                        name: "Action",
                        value: update === null ? "Add" : "Update",
                      },
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
                    const res = await result({
                      message: messageId,
                      process: import.meta.env.VITE_PROCESS_ID,
                    })
                    if (res.Messages[0]) {
                      const _articles = await getArticles()
                      setArticles(_articles)
                      setTitle("")
                      setId("")
                      setTxid("")
                      setUpdate(null)
                    } else {
                      console.log(res)
                      alert("something went wrong!")
                    }
                  }}
                >
                  {update === null ? "Add New Article" : "Update Article"}
                </Flex>
              </Box>
            </Box>
          )}
          {tab !== "Articles" ? null : (
            <Box w="100%" flex={1}>
              {map(v => {
                return (
                  <>
                    <Flex py={2} px={6} fontSize="20px" align="center">
                      <Link to={`../a/${v.id}`}>
                        <Box as="u">{v.title}</Box>
                      </Link>
                      <Box flex={1}></Box>
                      <Box mx={3} as="span" fontSize="14px">
                        {dayjs(v.date).format("YYYY MM/DD mm:HH")}
                      </Box>
                      <Box fontSize="12px" as="span">
                        <Flex
                          bg={update === v.id ? "#f0f0f0" : "white"}
                          justify="center"
                          px={2}
                          py={1}
                          sx={{
                            borderRadius: "3px",
                            cursor: "pointer",
                            ":hover": { opacity: 0.5 },
                            border: "1px solid #999",
                          }}
                          onClick={async () => {
                            if (update === v.id) {
                              setUpdate(null)
                              setTitle("")
                              setId("")
                              setTxid("")
                            } else {
                              setUpdate(v.id)
                              setTitle(v.title)
                              setId(v.id)
                              setTxid(v.txid)
                              setTab("New")
                            }
                          }}
                        >
                          Update
                        </Flex>
                      </Box>
                      <Box fontSize="12px" as="span" ml={3}>
                        <Flex
                          justify="center"
                          px={2}
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
                              signer: createDataItemSigner(
                                window.arweaveWallet,
                              ),
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
          )}
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
                <Image
                  src={_profile.image}
                  boxSize="25px"
                  sx={{ borderRadius: "50%" }}
                />
              </Flex>
              <Box>
                <Box>{_profile.name}</Box>
              </Box>
            </Flex>
          </Link>
        </Flex>
      </Flex>
    </Flex>
  )
}

export default Admin
