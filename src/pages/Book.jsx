import { useParams } from "react-router-dom"
import { EditIcon, DeleteIcon } from "@chakra-ui/icons"
import { Link } from "react-router-dom"
import { useState, useEffect } from "react"
import Notebook from "../lib/notebook"
import Header from "../components/Header"
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
import { o, sortBy, map, pluck, fromPairs, clone, reject } from "ramda"
function User({}) {
  const { id } = useParams()

  const [address, setAddress] = useState(null)
  const [profile, setProfile] = useState(null)
  const [init, setInit] = useState(false)
  const [user, setUser] = useState(null)
  const [notes, setNotes] = useState([])
  const [book, setBook] = useState(null)

  useEffect(() => getAddr({ setAddress, setInit }), [])
  useEffect(
    () => getProf({ address, setProfile, setInit, setAddress }),
    [address],
  )

  useEffect(() => {
    ;(async () => {
      const info = await getInfo(id)
      if (info) {
        setBook(info)
        setNotes(
          o(
            sortBy(v => v["date-created"] * -1),
            map(v => {
              return { ...ltags(v.tags), id: v.id, owner: v.owner.address }
            }),
          )(await getNotes(info.Assets)),
        )
        let _user = await getInfo(info.Creator)
        if (_user) setUser({ ..._user.Profile, id: info.Creator })
      }
    })()
  }, [id])
  const isCreator = book && book?.Creator === profile?.ProfileId
  return (
    <>
      <Header
        {...{ address, setAddress, profile, setProfile, init, setInit }}
      />
      {!book ? null : (
        <Flex justify="center" pt="60px">
          <Box w="100%" maxW="854px" px={3} pt={4}>
            <>
              <Box
                w="100%"
                h={["120px", "200px"]}
                mt={4}
                mb={8}
                sx={{
                  backgroundImage: `url(https://arweave.net/${book.Banner})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              ></Box>
              <Card variant="unstyled">
                <CardHeader>
                  <Flex spacing="4">
                    <Flex flex="1" gap="4" alignItems="center" flexWrap="wrap">
                      <Avatar
                        name={book.Name}
                        src={`https://arweave.net/${book.Thumbnail}`}
                        size="xl"
                      />
                      <Box>
                        <Heading size="lg">{book.Name}</Heading>
                        {!user ? null : (
                          <Link to={`/u/${user.id}`}>
                            <Flex align="center" mt={1}>
                              <Image
                                mr={2}
                                src={`https://arweave.net/${user.ProfileImage}`}
                                boxSize="24px"
                              />
                              <Text>{user.DisplayName}</Text>
                              <Text ml={4} fontSize="xs" color="#999">
                                {dayjs(book["DateCreated"] * 1).format(
                                  "MMM DD",
                                )}
                              </Text>
                            </Flex>
                          </Link>
                        )}
                      </Box>
                    </Flex>
                  </Flex>
                </CardHeader>
              </Card>
              <Tabs my={4} colorScheme="gray">
                <TabList>
                  <Tab>Notes</Tab>
                  <Tab>About</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel>
                    {map(v => {
                      return (
                        <Link to={`/n/${v.id}`}>
                          <Flex
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
                                      <Text color="#999" fontSize="xs">
                                        {dayjs(v["date-created"] * 1).format(
                                          "MMM DD",
                                        )}
                                      </Text>
                                    </Box>
                                  </Flex>
                                </Flex>
                              </CardHeader>
                            </Card>
                            <Box flex={1} />
                            {!isCreator ? null : (
                              <Box>
                                <Link to={`/n/${v.id}/edit`}>
                                  <Button
                                    title="Edit"
                                    size="xs"
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
                                    <EditIcon />
                                  </Button>
                                </Link>
                                <Button
                                  ml={3}
                                  size="xs"
                                  title="Remove"
                                  colorScheme="gray"
                                  variant="outline"
                                  sx={{
                                    border: "1px solid #222326",
                                    ":hover": {
                                      bg: "white",
                                      opacity: 0.75,
                                    },
                                  }}
                                  onClick={async e => {
                                    e.preventDefault()
                                    if (await badWallet(address)) return
                                    if (
                                      confirm(
                                        "Would you like to remove the note from this notebook?",
                                      )
                                    ) {
                                      const book = new Notebook({
                                        wallet: window.arweaveWallet,
                                        pid: id,
                                      })
                                      const { res, error } = await book.update(
                                        v.id,
                                        true,
                                      )
                                      const status = tags(
                                        res?.Tags || [],
                                      ).Status
                                      if (status === "Success") {
                                        let _notes = clone(notes)
                                        setNotes(
                                          reject(v2 => v2.id === v.id)(_notes),
                                        )
                                      } else {
                                        alert("something went wrong")
                                      }
                                    }
                                  }}
                                >
                                  <DeleteIcon />
                                </Button>
                              </Box>
                            )}
                          </Flex>
                        </Link>
                      )
                    })(notes)}
                  </TabPanel>
                  <TabPanel>{book.Description}</TabPanel>
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
