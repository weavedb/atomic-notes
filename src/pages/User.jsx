import { useNavigate, useParams } from "react-router-dom"
import Notebook from "../lib/notebook"
import { Link } from "react-router-dom"
import { useState, useEffect } from "react"
import Header from "../components/Header"
import { AddIcon } from "@chakra-ui/icons"
import {
  getBooks,
  getNotes,
  getInfo,
  getAddr,
  getProf,
  ltags,
  tags,
  badWallet,
} from "../lib/utils"
import dayjs from "dayjs"
import {
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
import { o, sortBy, map, pluck, fromPairs, clone, difference } from "ramda"
function User({}) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [address, setAddress] = useState(null)
  const [profile, setProfile] = useState(null)
  const [init, setInit] = useState(false)
  const [user, setUser] = useState(null)
  const [notes, setNotes] = useState([])
  const [books, setBooks] = useState([])
  const [bookmap, setBookMap] = useState({})
  const [notemap, setNoteMap] = useState({})
  useEffect(() => getAddr({ setAddress, setInit }), [])
  useEffect(
    () => getProf({ address, setProfile, setInit, setAddress }),
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
        bookmap[v.id] = await getInfo(v.id)
        for (let v2 of bookmap[v.id].Assets || []) {
          notemap[v2] ??= []
          notemap[v2].push(v.id)
        }
      }
      setNoteMap(notemap)
      setBookMap(bookmap)
    })()
  }, [books])

  const isCreator = id === profile?.ProfileId
  return (
    <>
      <Header
        {...{ address, setAddress, profile, setProfile, init, setInit }}
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
                        src={`https://arweave.net/${user.ProfileImage}`}
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
                          to={`https://ao-bazar.arweave.net/#/profile/${profile.ProfileId}`}
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
                      return (
                        <Flex
                          p={4}
                          sx={{
                            borderBottom: "1px solid rgb(226,232,240)",
                            cursor: "pointer",
                          }}
                        >
                          <Link to={`/n/${v.id}`}>
                            <Card variant="unstyled">
                              <CardHeader>
                                <Flex spacing="4">
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
                                      <Flex align="center" mt={2}>
                                        <Text color="#999" fontSize="xs">
                                          {dayjs(v["date-created"] * 1).format(
                                            "MMM DD",
                                          )}
                                        </Text>
                                        {map(v2 => {
                                          const _book = bookmap[v2]
                                          return !_book ? null : (
                                            <Tag
                                              size="sm"
                                              ml={4}
                                              sx={{
                                                ":hover": { opacity: 0.75 },
                                              }}
                                              onClick={e => {
                                                e.preventDefault()
                                                navigate(`/b/${v2}`)
                                              }}
                                            >
                                              {_book.Name}
                                            </Tag>
                                          )
                                        })(notemap[v.id] ?? [])}
                                      </Flex>
                                    </Box>
                                  </Flex>
                                </Flex>
                              </CardHeader>
                            </Card>
                          </Link>
                          <Link to={`/n/${v.id}`} style={{ flex: 1 }}>
                            <Box />
                          </Link>
                          {!isCreator || diff.length === 0 ? null : (
                            <Box>
                              <Menu>
                                <MenuButton
                                  size="sm"
                                  colorScheme="gray"
                                  variant="outline"
                                  as={IconButton}
                                  icon={<AddIcon />}
                                  sx={{
                                    ":hover": {
                                      cursor: "pointer",
                                      opacity: 0.75,
                                    },
                                  }}
                                />
                                <MenuList>
                                  {map(v3 => {
                                    const v2 = bookmap[v3]
                                    return !v2 ? null : (
                                      <MenuItem
                                        onClick={async () => {
                                          if (await badWallet(address)) return
                                          const book = new Notebook({
                                            wallet: window.arweaveWallet,
                                            pid: v3,
                                          })
                                          const { res, error } =
                                            await book.update(v.id)
                                          const status = tags(
                                            res?.Tags || [],
                                          ).Status
                                          if (status === "Success") {
                                            let _map = clone(notemap)
                                            let _bmap = clone(bookmap)
                                            _map[v.id] ??= []
                                            _map[v.id].push(v3)
                                            setNoteMap(_map)
                                            if (_bmap[v3]) {
                                              _bmap[v3].Assets.push(v.id)
                                              setBookMap(_bmap)
                                            }
                                          } else {
                                            alert("something went wrong")
                                          }
                                        }}
                                      >
                                        <Box
                                          fontSize="12px"
                                          mr={4}
                                          my={1}
                                          pr={3}
                                        >
                                          {v2.Name}
                                        </Box>
                                      </MenuItem>
                                    )
                                  })(diff)}
                                </MenuList>
                              </Menu>
                            </Box>
                          )}
                        </Flex>
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
                                      name={user.DisplayName}
                                      src={`https://arweave.net/${bmap.Thumbnail}`}
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
