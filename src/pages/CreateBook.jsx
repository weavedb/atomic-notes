import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import NotebookCard from "../components/NotebookCard"
import lf from "localforage"
import Arweave from "arweave"
import "@mdxeditor/editor/style.css"
import "../github-markdown.css"
import markdownIt from "markdown-it"
import { toHtml } from "hast-util-to-html"
import { common, createStarryNight } from "@wooorm/starry-night"
import {
  Select,
  Textarea,
  Input,
  Button,
  Flex,
  Box,
  Image,
  FormControl,
  FormLabel,
  Switch,
} from "@chakra-ui/react"
import { useParams } from "react-router-dom"
import { Link } from "react-router-dom"
import Note from "../lib/note"
import Notebook from "../lib/notebook"
import {
  ltags,
  getNotes,
  getAoProfile,
  getProfileId,
  getAddr,
  getProf,
  getInfo,
  wait,
  action,
  tag,
  badWallet,
  validAddress,
} from "../lib/utils"

import {
  last,
  map,
  clone,
  sortBy,
  o,
  reverse,
  includes,
  fromPairs,
  mergeLeft,
  filter,
  pluck,
  prop,
} from "ramda"

import dayjs from "dayjs"
import {
  createDataItemSigner,
  message,
  dryrun,
  result,
} from "@permaweb/aoconnect"

import { defaultProfile, getProfile, getArticles, ao } from "../lib/utils"
import { circleNotch } from "../lib/svgs.jsx"

import {
  diffSourcePlugin,
  MDXEditor,
  DiffSourceToggleWrapper,
} from "@mdxeditor/editor"

const allPlugins = diffMarkdown => [
  diffSourcePlugin({ viewMode: "source", diffMarkdown }),
]
const getProcess = async pid => {
  const query = `query {
    transactions(ids: ["${pid}"]) {
        edges {
            node {
                id
                owner { address }
                tags { name value }
            }
        }
    }
}`
  const res = await fetch("https://arweave.net/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  }).then(r => r.json())
  const tags = res?.data?.transactions?.edges?.[0].node.tags ?? null
  const owner = res?.data?.transactions?.edges?.[0].node.owner.address
  if (tags) {
    let _tags = fromPairs(tags.map(({ name, value }) => [name, value]))
    _tags.Owner = owner
    return _tags
  } else {
    return null
  }
}
const getProcesses = async pids => {
  const query = `query {
    transactions(ids: [${map(v => `"${v}"`)(pids).join(",")}], tags: { name: "Content-Type", values: ["text/markdown"]}) {
        edges {
            node {
                id
                owner { address }
                tags { name value }
            }
        }
    }
}`
  const res = await fetch("https://arweave.net/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  }).then(r => r.json())
  return map(prop("node"))(res?.data?.transactions?.edges ?? [])
}

const limit = 10
const getHTML = async md => {
  try {
    const starryNight = await createStarryNight(common)
    const markdownItInstance = markdownIt({
      highlight(value, lang) {
        const scope = starryNight.flagToScope(lang)
        return toHtml({
          type: "element",
          tagName: "pre",
          properties: {
            className: scope
              ? [
                  "highlight",
                  "highlight-" +
                    scope.replace(/^source\./, "").replace(/\./g, "-"),
                ]
              : undefined,
          },
          children: scope
            ? /** @type {Array<ElementContent>} */ (
                starryNight.highlight(value, scope).children
              )
            : [{ type: "text", value }],
        })
      },
    })
    return markdownItInstance.render(md)
  } catch (e) {}
  return null
}

function App(a) {
  const { pid } = useParams()
  const navigate = useNavigate()

  const [address, setAddress] = useState(null)
  const [profile, setProfile] = useState(null)
  const [init, setInit] = useState(false)
  useEffect(() => getAddr({ setAddress, setInit }), [])
  useEffect(
    () => getProf({ address, setProfile, setInit, setAddress }),
    [address],
  )

  const [metadata, setMetadata] = useState(null)

  const [updatingArticle, setUpdatingArticle] = useState(false)

  const [aoProfile, setAoProfile] = useState(null)
  const [aoProfiles, setAoProfiles] = useState({})
  const [editTitle, setEditTitle] = useState(null)
  const [editID, setEditID] = useState(null)
  const [editTxid, setEditTxid] = useState(null)
  const [addTxid, setAddTxid] = useState(null)

  const [articles, setArticles] = useState([])
  const [title, setTitle] = useState("")
  const [bazar, setBazar] = useState(false)
  const [desc, setDesc] = useState("")
  const [banner, setBanner] = useState(
    "eXCtpVbcd_jZ0dmU2PZ8focaKxBGECBQ8wMib7sIVPo",
  )
  const [thumbnail, setThumbnail] = useState(
    "lJovHqM9hwNjHV5JoY9NGWtt0WD-5D4gOqNL2VWW5jk",
  )
  const [id, setId] = useState("")
  const [txid, setTxid] = useState("")

  const first = pid === "new" ? "Create" : "Info"
  const [tab, setTab] = useState(first)
  const [tab2, setTab2] = useState("Markdown")
  const [tab3, setTab3] = useState("Publication")
  const [tab4, setTab4] = useState("Notes")
  const [notes, setNotes] = useState([])
  const [changed, setChanged] = useState(false)
  const [versions, setVersions] = useState([])
  const [editors, setEditors] = useState([])
  const [newEditor, setNewEditor] = useState("")
  const [newEditorProfile, setNewEditorProfile] = useState(null)

  useEffect(() => {
    ;(async () => setNotes((await lf.getItem("notes")) ?? []))()
  }, [])

  useEffect(() => {
    ;(async () => {
      if (pid !== "new") {
        const info = await getInfo(pid)
        if (info) {
          setMetadata(info)
          setNotes(
            o(
              sortBy(v => v["date-created"] * -1),
              map(v => {
                return { ...ltags(v.tags), id: v.id, owner: v.owner.address }
              }),
            )(await getNotes(info.Assets)),
          )
        }
      }
    })()
  }, [pid])
  useEffect(() => {
    ;(async () => {
      if (address) {
        const _profile = await getAoProfile(address)
        setAoProfile(_profile)
        if (_profile.ProfileId) {
          const info = await dryrun({
            process: _profile.ProfileId,
            tags: [action("Info")],
          })
          try {
            const data = JSON.parse(info?.Messages?.[0]?.Data)
            const ids = pluck("Id", data.Assets)
            setNotes(data.Collections)
          } catch (e) {}
        }
      }
    })()
  }, [address])

  const isEditor = address && includes(address, editors)
  const isOwner = (address && metadata && metadata.Owner === address) ?? false
  const tabs = pid === "new" ? ["Create"] : [first]
  const tabs3 = ["Publication"]

  const ok =
    !/^\s*$/.test(title) &&
    (thumbnail === "" || validAddress(thumbnail)) &&
    (banner === "" || validAddress(banner))

  return (
    <>
      <Header
        {...{ address, setAddress, profile, setProfile, init, setInit }}
      />
      <Flex minH="100%" direction="column" pt="60px">
        <>
          <Flex justify="center" flex={1} mt={6}>
            <Flex direction="column" h="100%" w="100%" maxW="830px">
              {tab !== "Info" ? null : (
                <>
                  <Flex mb={4} justify="center">
                    <Flex maxW="830px" width="100%">
                      <Flex
                        fontWeight={tab4 === "Notes" ? "bold" : "normal"}
                        textDecoration={tab4 === "Notes" ? "underline" : "none"}
                        sx={{ cursor: "pointer", ":hover": { opacity: 0.75 } }}
                        fontSize="12px"
                        ml={4}
                        justify="center"
                        onClick={() => setTab4("Notes")}
                      >
                        Notes
                      </Flex>
                      <Box flex={1} />
                    </Flex>
                  </Flex>
                  <>
                    <Flex mb={4} justify="center">
                      <Flex
                        align="center"
                        maxW="830px"
                        width="100%"
                        fontSize="12px"
                        bg="#f0f0f0"
                        py={2}
                        px={4}
                        sx={{ borderRadius: "3px" }}
                      >
                        <Flex w="100%" align="center">
                          <Box as="b" mr={4}>
                            {metadata?.Title ? metadata.Title : pid}
                          </Box>
                          <Box flex={1} />
                          <Box
                            as="a"
                            target="_blank"
                            href={`https://arweave.net/${pid}`}
                            ml={4}
                            sx={{ textDecoration: "underline" }}
                          >
                            Arweave Data
                          </Box>
                          <Box
                            as="a"
                            target="_blank"
                            href={`https://www.ao.link/#/entity/${pid}`}
                            ml={4}
                            sx={{ textDecoration: "underline" }}
                          >
                            AO Process
                          </Box>
                        </Flex>
                      </Flex>
                    </Flex>
                  </>
                </>
              )}
              {tab !== "Create" ? null : (
                <Box w="100%" flex={1}>
                  <Box
                    p={6}
                    fontSize="12px"
                    bg="#f0f0f0"
                    sx={{ borderRadius: "10px" }}
                  >
                    {tab3 !== "Publication" ? null : (
                      <>
                        <Box mb={4}>
                          <Box mb={2}>Title</Box>
                          <Input
                            bg="white"
                            value={title}
                            sx={{ border: "1px solid #999" }}
                            onChange={e => setTitle(e.target.value)}
                          />
                        </Box>
                        <Box mb={4}>
                          <Box mb={2}>Description</Box>
                          <Textarea
                            bg="white"
                            rows="2"
                            value={desc}
                            sx={{ border: "1px solid #999" }}
                            onChange={e => setDesc(e.target.value)}
                          />
                        </Box>
                        <Box mb={4}>
                          <Box mb={2}>Banner (Arweave TxID)</Box>
                          <Input
                            bg="white"
                            value={banner}
                            color={
                              banner === "" || validAddress(banner)
                                ? ""
                                : "crimson"
                            }
                            sx={{
                              border: `1px solid ${banner === "" || validAddress(banner) ? "#999" : "crimson"}`,
                            }}
                            onChange={e => setBanner(e.target.value)}
                          />
                        </Box>
                        <Box>
                          <Box mb={2}>Thumbnail (Arweave TxID)</Box>
                          <Input
                            bg="white"
                            value={thumbnail}
                            color={
                              thumbnail === "" || validAddress(thumbnail)
                                ? ""
                                : "crimson"
                            }
                            sx={{
                              border: `1px solid ${thumbnail === "" || validAddress(thumbnail) ? "#999" : "crimson"}`,
                            }}
                            onChange={e => setThumbnail(e.target.value)}
                          />
                        </Box>
                        <FormControl display="flex" alignItems="center" mt={4}>
                          <FormLabel
                            htmlFor="email-alerts"
                            mb="0"
                            fontSize="12px"
                          >
                            Add to BazAR registry?
                          </FormLabel>
                          <Switch
                            colorScheme="gray"
                            isChecked={bazar}
                            onChange={e => setBazar(!bazar)}
                          />
                        </FormControl>
                      </>
                    )}
                  </Box>
                  {!banner ? null : (
                    <Box
                      h="200px"
                      mt={6}
                      bg="#f6f6f7"
                      sx={{
                        backgroundImage: `url(https://arweave.net/${banner})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    ></Box>
                  )}
                  {!profile ? null : (
                    <NotebookCard
                      nolinks={true}
                      note={{ title, description: desc, banner, thumbnail }}
                    />
                  )}

                  <Button
                    mb={6}
                    w="100%"
                    mt={5}
                    sx={{
                      opacity: ok ? 1 : 0.5,
                      borderRadius: "3px",
                      cursor: ok ? "pointer" : "default",
                      border: "1px solid #222326",
                      ":hover": { bg: "#f6f6f7" },
                      bg: "white",
                    }}
                    onClick={async () => {
                      if (!ok || updatingArticle) return
                      if (await badWallet(address)) return
                      setUpdatingArticle(true)
                      let to = false
                      try {
                        let token = await fetch("./collection.lua").then(r =>
                          r.text(),
                        )
                        token = token.replace(
                          /\<NAME\>/g,
                          title.replace(/'/g, "\\'"),
                        )
                        token = token.replace(
                          /\<DESCRIPTION\>/g,
                          desc.replace(/'/g, "\\'"),
                        )
                        const date = Date.now()
                        token = token.replace(/\<DATECREATED\>/g, date)
                        token = token.replace(/\<LASTUPDATE\>/g, date)
                        const prid = await getProfileId(address)
                        if (!prid) {
                          alert("AO Profile not found")
                          setUpdatingArticle(false)
                          return
                        }
                        token = token.replace(/\<CREATOR\>/g, prid ?? address)
                        token = token.replace(/\<BANNER\>/g, banner)
                        token = token.replace(/\<THUMBNAIL\>/g, thumbnail)
                        const pub = new Notebook({
                          wallet: window.arweaveWallet,
                        })
                        let tags = [
                          tag("Title", title),
                          tag("Description", desc),
                          tag("Thumbnail", thumbnail),
                          tag("Banner", banner),
                          tag("Date-Created", Number(date).toString()),
                          action("Add-Collection"),
                          tag("Profile-Creator", prid),
                          tag("Creator", address),
                          tag("Collection-Type", "Atomic-Notes"),
                        ]
                        if (!/^\s*$/.test(thumbnail)) {
                          tag("Thumbnail", thumbnail)
                        }
                        if (!/^\s*$/.test(banner)) {
                          tag("Banner", banner)
                        }

                        const { error, pid } = await pub.spawn(tags)
                        if (error) {
                          alert("something went wrong")
                        } else {
                          await wait(5000)
                          const { error, res } = await pub.eval(token)
                          if (error) {
                            alert("something went wrong")
                          } else {
                            to = true
                            const { error: error3, res: res3 } =
                              await pub.add(prid)
                            if (error3) {
                              alert("something went wrong")
                            } else {
                              if (bazar) {
                                let tags2 = [
                                  tag("Name", title),
                                  tag("Description", desc),
                                  tag("Thumbnail", thumbnail),
                                  tag("Banner", banner),
                                  tag("DateCreated", Number(date).toString()),
                                  action("Add-Collection"),
                                  tag("Creator", prid),
                                  tag("CollectionId", pid),
                                ]

                                const { error: error4, res: res4 } =
                                  await pub.register(tags2)
                                if (error4) {
                                  alert("something went wrong")
                                } else {
                                  setTimeout(async () => {
                                    navigate(`/b/${pid}`)
                                    setUpdatingArticle(false)
                                  }, 2000)
                                }
                              } else {
                                setTimeout(async () => {
                                  navigate(`/b/${pid}`)
                                  setUpdatingArticle(false)
                                }, 2000)
                              }
                            }
                          }
                        }
                      } catch (e) {
                        console.log(e)
                        alert("something went wrong")
                      }
                      setUpdatingArticle(to)
                    }}
                  >
                    {updatingArticle ? circleNotch : "Create New Notebook"}
                  </Button>
                </Box>
              )}
            </Flex>
          </Flex>
        </>
      </Flex>
    </>
  )
}

export default App
