import { useState, useEffect, useRef } from "react"
import Arweave from "arweave"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import NotebookCard from "../components/NotebookCard"
import { AddIcon } from "@chakra-ui/icons"
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
import { Notebook } from "aonote"

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
  opt,
  default_thumbnail,
  default_banner,
  gateway_url,
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
import { defaultProfile, getProfile, getArticles, ao } from "../lib/utils"
import { circleNotch } from "../lib/svgs.jsx"

function App(a) {
  const { pid } = useParams()
  const navigate = useNavigate()
  const t = useToast()
  const fileInputRef = useRef(null)
  const fileInputRef2 = useRef(null)

  const [address, setAddress] = useState(null)
  const [profile, setProfile] = useState(null)
  const [init, setInit] = useState(false)
  const [initNote, setInitNote] = useState(false)
  useEffect(() => getAddr({ setAddress, setInit, t }), [])
  useEffect(
    () => getProf({ address, setProfile, setInit, setAddress, t }),
    [address],
  )
  const [uploadStats, setUploadStats] = useState(null)
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
  const [banner, setBanner] = useState(default_banner)
  const [banner64, setBanner64] = useState(null)
  const [banner8, setBanner8] = useState(null)

  const [thumb64, setThumb64] = useState(null)
  const [thumb8, setThumb8] = useState(null)

  const [thumbnail, setThumbnail] = useState(default_thumbnail)
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
          const book = new Notebook({ ...opt.notebook, pid })
          const out = await book.get(info.Creator)
          if (out) setRegistered(pluck("Id")(out.Collections || []))
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
        if (_profile?.ProfileId) {
          const data = await getInfo(_profile.ProfileId)
          const ids = pluck("Id", data.Assets)
          setNotes(data.Collections)
        }
      }
    })()
  }, [address])

  const ok =
    !/^\s*$/.test(title) &&
    (thumbnail === "" || validAddress(thumbnail)) &&
    (banner64 || banner === "" || validAddress(banner))

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
                      bg="#f6f6f7"
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
                          <Flex mb={2}>
                            <Box>Banner (Arweave TxID)</Box>
                            <Box flex={1} />
                            {!banner64 ? null : (
                              <Box
                                sx={{
                                  textDecoration: "underline",
                                  cursor: "pointer",
                                  ":hover": { opacity: 0.75 },
                                }}
                                onClick={() => {
                                  setBanner64(null)
                                  setBanner8(null)
                                  fileInputRef2.current.value = ""
                                }}
                              >
                                clear the banner
                              </Box>
                            )}
                          </Flex>
                          <Input
                            disabled={banner64}
                            bg="white"
                            value={
                              banner64 ? banner64.slice(0, 60) + "..." : banner
                            }
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
                          <Flex mb={2}>
                            <Box>Thumbnail (Arweave TxID)</Box>
                            <Box flex={1} />
                            {!thumb64 ? null : (
                              <Box
                                sx={{
                                  textDecoration: "underline",
                                  cursor: "pointer",
                                  ":hover": { opacity: 0.75 },
                                }}
                                onClick={() => {
                                  setThumb64(null)
                                  setThumb8(null)
                                  fileInputRef2.current.value = ""
                                }}
                              >
                                clear the thumbnail
                              </Box>
                            )}
                          </Flex>
                          <Input
                            disabled={thumb64}
                            bg="white"
                            value={
                              thumb64 ? thumb64.slice(0, 60) + "..." : thumbnail
                            }
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
                                isChecked={bazar}
                                onChange={e => setBazar(!bazar)}
                              />
                            </>
                          )}
                        </FormControl>
                      </>
                    </Box>
                    <Flex
                      h="200px"
                      mt={6}
                      bg="#f6f6f7"
                      sx={{
                        backgroundImage:
                          banner64 ??
                          (banner ? `url(${gateway_url}/${banner})` : ""),
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        cursor: "pointer",
                        ":hover": { opacity: 0.75 },
                      }}
                      onClick={() => fileInputRef.current.click()}
                      align="center"
                      justify="center"
                    >
                      <Input
                        display="none"
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={e => {
                          const image = e.target.files[0]
                          if (image) {
                            const reader = new FileReader()
                            reader.onload = e => setBanner64(e.target.result)
                            reader.readAsDataURL(image)

                            const reader2 = new FileReader()
                            reader2.onload = e => {
                              setBanner8({ image, data: e.target.result })
                            }
                            reader2.readAsArrayBuffer(image)
                          }
                        }}
                      />
                      {banner64 || validAddress(banner) ? null : (
                        <AddIcon boxSize="30px" />
                      )}
                    </Flex>
                    {!profile ? null : (
                      <NotebookCard
                        fileInputRef={fileInputRef2}
                        nolinks={true}
                        note={{
                          thumb64,
                          title,
                          description: desc,
                          banner,
                          thumbnail,
                        }}
                        onChange={e => {
                          const image = e.target.files[0]
                          if (image) {
                            const reader = new FileReader()
                            reader.onload = e => setThumb64(e.target.result)
                            reader.readAsDataURL(image)

                            const reader2 = new FileReader()
                            reader2.onload = e => {
                              setThumb8({ image, data: e.target.result })
                            }
                            reader2.readAsArrayBuffer(image)
                          }
                        }}
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
                        setUploadStats(null)
                        setUpdatingArticle(true)
                        const notebook = await new Notebook({
                          ...opt.notebook,
                          pid: pid === "new" ? null : pid,
                        }).init()
                        let to = false
                        try {
                          let _thumb = thumbnail
                          let thumbnail_data = null
                          let thumbnail_type = null
                          if (thumb8) {
                            _thumb = null
                            thumbnail_data = thumb8.data
                            thumbnail_type = thumb8.image.type
                          }
                          let _banner = banner
                          let banner_data = null
                          let banner_type = null
                          if (banner8) {
                            _banner = null
                            banner_data = banner8.data
                            banner_type = banner8.image.type
                          }
                          if (pid === "new") {
                            const { err: _err, pid } = await notebook.create({
                              cb: ({ i, fns }) => {
                                setUploadStats([i, fns.length])
                              },
                              info: {
                                title,
                                description: desc,
                                thumbnail: _thumb,
                                banner: _banner,
                                thumbnail_data,
                                thumbnail_type,
                                banner_data,
                                banner_type,
                              },
                              bazar,
                            })
                            if (_err) {
                              err(t)
                            } else {
                              let stats = uploadStats
                              setUploadStats([stats[1], stats[1]])
                              navigate(`/b/${pid}`)
                              setUpdatingArticle(false)
                            }
                          } else {
                            const { err: _err, res } =
                              await notebook.updateInfo({
                                title,
                                description: desc,
                                thumbnail: _thumb,
                                banner: _banner,
                                thumbnail_data,
                                thumbnail_type,
                                banner_data,
                                banner_type,
                              })
                            if (_err) {
                              err(t)
                            } else {
                              let stats = uploadStats ?? [0, 0]
                              setUploadStats([stats[1], stats[1]])
                              navigate(`/b/${pid}`)
                              setUpdatingArticle(false)
                              msg(t, "Notebook info updated!")
                            }
                          }
                        } catch (e) {
                          console.log(e)
                          alert("something went wrong")
                        }

                        setUpdatingArticle(to)
                      }}
                    >
                      {updatingArticle ? (
                        <Flex align="center">
                          {circleNotch}
                          <Flex ml={3} align="center">
                            {uploadStats ? (
                              <Box>
                                {uploadStats[0]} / {uploadStats[1]}
                              </Box>
                            ) : (
                              "preparing..."
                            )}
                          </Flex>
                        </Flex>
                      ) : pid !== "new" ? (
                        "Update Notebook Info"
                      ) : (
                        "Create New Notebook"
                      )}
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
