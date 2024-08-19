import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import NotebookCard from "../components/NotebookCard"
import lf from "localforage"
import {
  Select,
  Textarea,
  Input,
  Button,
  Flex,
  Spinner,
  useToast,
  Box,
  Image,
  FormControl,
  FormLabel,
  Switch,
} from "@chakra-ui/react"
import { useParams } from "react-router-dom"
import { Link } from "react-router-dom"
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
  err,
  msg,
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

function App(a) {
  const { pid } = useParams()
  const navigate = useNavigate()
  const t = useToast()
  const [address, setAddress] = useState(null)
  const [profile, setProfile] = useState(null)
  const [init, setInit] = useState(false)
  const [initNote, setInitNote] = useState(false)
  useEffect(() => getAddr({ setAddress, setInit, t }), [])
  useEffect(
    () => getProf({ address, setProfile, setInit, setAddress, t }),
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

  const [notes, setNotes] = useState([])
  const [changed, setChanged] = useState(false)
  const [versions, setVersions] = useState([])
  const [editors, setEditors] = useState([])
  const [newEditor, setNewEditor] = useState("")
  const [newEditorProfile, setNewEditorProfile] = useState(null)
  const [registered, setRegistered] = useState([])
  useEffect(() => {
    ;(async () => setNotes((await lf.getItem("notes")) ?? []))()
  }, [])

  useEffect(() => {
    ;(async () => {
      if (pid !== "new") {
        const info = await getInfo(pid)
        if (info) {
          setMetadata(info)
          setTitle(info.Name)
          setDesc(info.Description)
          setBanner(info.Banner)
          setThumbnail(info.Thumbnail)
          setNotes(
            o(
              sortBy(v => v["date-created"] * -1),
              map(v => {
                return { ...ltags(v.tags), id: v.id, owner: v.owner.address }
              }),
            )(await getNotes(info.Assets)),
          )
          setInitNote(true)
          const book = new Notebook({ pid, wallet: window.arweaveWallet })
          const { res, error } = await book.get(info.Creator)
          if (!error) {
            setRegistered(pluck("Id")(res.Collections || []))
          }
        }
      } else {
        setInitNote(true)
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

  const ok =
    !/^\s*$/.test(title) &&
    (thumbnail === "" || validAddress(thumbnail)) &&
    (banner === "" || validAddress(banner))

  const isCreator =
    profile && (pid === "new" || profile.ProfileId === metadata?.Creator)
  const isBazar = includes(pid, registered)
  return (
    <>
      <Header
        {...{ t, address, setAddress, profile, setProfile, init, setInit }}
      />
      {!initNote ? (
        <Flex
          minH="100%"
          direction="column"
          pt="70px"
          justify="center"
          align="center"
        >
          <Flex minH="100%">
            <Spinner mr={4} />
            Fetching Note...
          </Flex>
        </Flex>
      ) : !isCreator ? (
        <Flex
          minH="100%"
          direction="column"
          pt="70px"
          justify="center"
          align="center"
        >
          <Flex minH="100%">You don't have the right to edit this note.</Flex>
        </Flex>
      ) : (
        <>
          <Flex minH="100%" direction="column" pt="60px">
            <>
              <Flex justify="center" flex={1} mt={6}>
                <Flex direction="column" h="100%" w="100%" maxW="830px">
                  <Box w="100%" flex={1}>
                    <Box
                      p={6}
                      fontSize="12px"
                      bg="#f0f0f0"
                      sx={{ borderRadius: "10px" }}
                    >
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
                          {isBazar ? (
                            <FormLabel
                              htmlFor="email-alerts"
                              mb="0"
                              fontSize="12px"
                              sx={{ textDecoration: "underline" }}
                            >
                              <Link
                                to={`https://ao-bazar.arweave.dev/#/collection/${pid}`}
                                target="_blank"
                              >
                                Already on BazAR
                              </Link>
                            </FormLabel>
                          ) : (
                            <>
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
                            </>
                          )}
                        </FormControl>
                      </>
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
                        if (await badWallet(t, address)) return
                        setUpdatingArticle(true)
                        let to = false
                        if (pid === "new") {
                          try {
                            let token = await fetch("./collection.lua").then(
                              r => r.text(),
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
                            token = token.replace(
                              /\<CREATOR\>/g,
                              prid ?? address,
                            )
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
                                      tag(
                                        "DateCreated",
                                        Number(date).toString(),
                                      ),
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
                        } else {
                          const wait = ms =>
                            new Promise(res => setTimeout(() => res(), ms))
                          try {
                            let tokens = [
                              `Name = '${title.replace(/'/g, "\\'")}'`,
                              `Description = '${desc.replace(/'/g, "\\'")}'`,
                              `Thumbnail = '${thumbnail}'`,
                              `Banner = '${banner}'`,
                            ]
                            const book = new Notebook({
                              wallet: window.arweaveWallet,
                              pid,
                            })
                            const { error, res } = await book.eval(
                              tokens.join("\n"),
                            )
                            if (error) {
                              err(t)
                            } else {
                              if (bazar) {
                                let tags2 = [
                                  tag("Name", title),
                                  tag("Description", desc),
                                  tag("Thumbnail", thumbnail),
                                  tag("Banner", banner),
                                  tag("DateCreated", metadata.DateCreated),
                                  action("Add-Collection"),
                                  tag("Creator", profile.ProfileId),
                                  tag("CollectionId", pid),
                                ]

                                const { error: error4, res: res4 } =
                                  await book.register(tags2)
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
                                  const { res: info } = await book.info("Info")
                                  console.log(info)
                                  msg(t, "Notebook info updated!")
                                }, 2000)
                              }
                            }
                          } catch (e) {
                            console.log(e)
                            err(t)
                          }
                        }
                        setUpdatingArticle(to)
                      }}
                    >
                      {updatingArticle
                        ? circleNotch
                        : pid !== "new"
                          ? "Update Notebook Info"
                          : "Create New Notebook"}
                    </Button>
                  </Box>
                </Flex>
              </Flex>
            </>
          </Flex>
        </>
      )}
    </>
  )
}

export default App
