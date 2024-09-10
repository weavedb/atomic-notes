import { useNavigate, useParams } from "react-router-dom"
import { Notebook } from "aonote"
import { Link } from "react-router-dom"
import { useState, useEffect } from "react"
import Header from "../components/Header"
import NoteCard from "../components/NoteCard"
import lf from "localforage"
import {
  getBooks,
  getNotes,
  getInfo,
  getBookInfo,
  getAddr,
  getProf,
  ltags,
  tags,
  badWallet,
  msg,
  err,
  getPFP,
  opt,
  gateway_url,
  getThumb,
} from "../lib/utils"
import dayjs from "dayjs"
import {
  useToast,
  Tag,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Text,
  Flex,
  Box,
  Image,
  Card,
  CardHeader,
  Avatar,
  Heading,
} from "@chakra-ui/react"
import {
  indexOf,
  without,
  o,
  sortBy,
  map,
  pluck,
  fromPairs,
  clone,
  difference,
} from "ramda"

function User({}) {
  const { id } = useParams()
  const navigate = useNavigate()
  const t = useToast()
  const [address, setAddress] = useState(null)
  const [profile, setProfile] = useState(null)
  const [init, setInit] = useState(false)
  const [user, setUser] = useState(null)
  const [notes, setNotes] = useState([])
  const [books, setBooks] = useState([])
  const [bookmap, setBookMap] = useState({})
  const [notemap, setNoteMap] = useState({})
  const [assetmap, setAssetMap] = useState({})

  useEffect(() => getAddr({ setAddress, setInit, t }), [])
  useEffect(
    () => getProf({ address, setProfile, setInit, setAddress, t }),
    [address],
  )

  useEffect(() => {
    ;(async () => {
      const info = await getInfo(id)
      if (info) {
        setUser(info.Profile)
        setNotes(
          o(
            sortBy(v => v["date-created"] * -1),
            map(v => {
              return { ...ltags(v.tags), id: v.id, owner: v.owner.address }
            }),
          )(await getNotes(pluck("Id", info.Assets))),
        )
        setBooks(
          o(
            sortBy(v => v["date-created"] * -1),
            map(v => {
              return { ...ltags(v.tags), id: v.id, owner: v.owner.address }
            }),
          )(await getBooks(pluck("Id", info.Collections))),
        )
      }
    })()
  }, [id])

  useEffect(() => {
    ;(async () => {
      let bookmap = {}
      let notemap = {}
      for (let v of books) {
        const _info = await lf.getItem(`notebook-${v.id}`)
        if (_info) {
          bookmap[v.id] = _info
          for (let v2 of bookmap[v.id].Assets || []) {
            notemap[v2] ??= []
            notemap[v2].push(v.id)
            setNoteMap(notemap)
          }
        }
        setBookMap(bookmap)
      }
      for (let v of books) {
        const info = await getBookInfo(v.id)
        if (info) await lf.setItem(`notebook-${v.id}`, info)
        let exists = []
        for (let k in notemap) {
          for (let v2 of notemap[k]) {
            if (v2 === v.id) exists.push(k)
          }
        }
        const diff = difference(exists, info.Assets)
        bookmap[v.id] = info
        for (let v2 of diff) {
          notemap[v2] ??= []
          notemap[v2] = without([v.id], notemap[v2])
        }
        for (let v2 of bookmap[v.id].Assets || []) {
          notemap[v2] ??= []
          if (indexOf(v.id, notemap[v2]) === -1) {
            notemap[v2].push(v.id)
            setNoteMap(notemap)
          }
        }
        setBookMap(bookmap)
      }
    })()
  }, [books])
  const isCreator = id === profile?.ProfileId
  return (
    <>
      <Header
        {...{ address, setAddress, profile, setProfile, init, setInit, t }}
      />
      {!user ? null : (
        <Flex justify="center" pt="60px">
          <Box w="100%" maxW="854px" px={3} pt={4}>
            <>
              <Card variant="unstyled">
                <CardHeader>
                  <Flex spacing="4">
                    <Flex flex="1" gap="4" align="center" flexWrap="wrap">
                      <Avatar
                        name={user.DisplayName}
                        src={getPFP(user)}
                        size="xl"
                      />

                      <Box>
                        <Heading size="lg">{user.DisplayName}</Heading>
                        <Text fontSize="xl">{user.Description}</Text>
                      </Box>
                      <Box flex={1} />
                      {!isCreator ? null : (
                        <Link
                          target="_blank"
                          to={`https://bazar.arweave.net/#/profile/${profile.ProfileId}`}
                        >
                          <Button
                            title="Edit"
                            size="sm"
                            colorScheme="gray"
                            variant="outline"
                            sx={{
                              border: "1px solid #222326",
                              ":hover": {
                                bg: "white",
                                opacity: 0.75,
                              },
                            }}
                          >
                            Edit Profile
                          </Button>
                        </Link>
                      )}
                    </Flex>
                  </Flex>
                </CardHeader>
              </Card>
              <Tabs my={4} colorScheme="gray">
                <TabList>
                  <Tab>Notes</Tab>
                  <Tab>Notebooks</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel>
                    {map(v => {
                      const _books = notemap[v.id] ?? []
                      const bids = pluck("id", books)
                      const diff = difference(bids, _books)
                      let notebooks = []
                      for (let v2 of notemap[v.id] ?? []) {
                        if (bookmap[v2])
                          notebooks.push({ id: v2, ...bookmap[v2] })
                      }
                      let _note = v
                      if (assetmap[v.id]) {
                        _note.thumbnail = assetmap[v.id].Thumbnail
                      }
                      const addToNotebook = v3 => async () => {
                        if (await badWallet(t, address)) return
                        const book = await new Notebook({
                          ...opt.notebook,
                          pid: v3,
                        }).init()

                        const { err: _err } = await book.addNote(v.id)
                        if (!_err) {
                          let _map = clone(notemap)
                          let _bmap = clone(bookmap)
                          _map[v.id] ??= []
                          _map[v.id].push(v3)
                          setNoteMap(_map)
                          if (_bmap[v3]) {
                            _bmap[v3].Assets.push(v.id)
                            setBookMap(_bmap)
                          }
                          msg(t, "Note added!")
                        } else {
                          err(t, "something went wrong")
                        }
                      }
                      return (
                        <>
                          <NoteCard
                            addToNotebook={addToNotebook}
                            bookmap={bookmap}
                            diff={diff}
                            isCreator={isCreator}
                            navigate={navigate}
                            notebooks={notebooks}
                            note={_note}
                            profile={user}
                            variant="line"
                          />
                        </>
                      )
                    })(notes)}
                  </TabPanel>
                  <TabPanel>
                    {map(v => {
                      let bmap = bookmap[v.id]
                      return (
                        <Link to={`/b/${v.id}`}>
                          <Box
                            p={4}
                            sx={{
                              borderBottom: "1px solid rgb(226,232,240)",
                              ":hover": { opacity: 0.75 },
                              cursor: "pointer",
                            }}
                          >
                            <Card variant="unstyled">
                              <CardHeader>
                                <Flex spacing="4">
                                  {!bmap ? null : (
                                    <Avatar
                                      mr={4}
                                      src={getThumb(bmap)}
                                      size="xl"
                                    />
                                  )}
                                  <Flex
                                    flex="1"
                                    gap="4"
                                    alignItems="center"
                                    flexWrap="wrap"
                                  >
                                    <Box>
                                      <Heading mb={1} size="md">
                                        {v.title}
                                      </Heading>
                                      <Text mb={1}>{v.description}</Text>
                                      <Flex mt={2}>
                                        <Text color="#999" fontSize="xs" mr={4}>
                                          {dayjs(v["date-created"] * 1).format(
                                            "MMM DD",
                                          )}
                                        </Text>

                                        {!bmap ? null : (
                                          <Tag
                                            size="sm"
                                            sx={{
                                              ":hover": { opacity: 0.75 },
                                            }}
                                          >
                                            {bmap.Assets.length} Notes
                                          </Tag>
                                        )}
                                      </Flex>
                                    </Box>
                                  </Flex>
                                </Flex>
                              </CardHeader>
                            </Card>
                          </Box>
                        </Link>
                      )
                    })(books)}
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </>
          </Box>
        </Flex>
      )}
    </>
  )
}

export default User
