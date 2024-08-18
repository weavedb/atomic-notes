import { useNavigate, useParams } from "react-router-dom"
import { EditIcon, DeleteIcon } from "@chakra-ui/icons"
import { Link } from "react-router-dom"
import { useState, useEffect } from "react"
import Notebook from "../lib/notebook"
import Header from "../components/Header"
import NoteCard from "../components/NoteCard"
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
  const navigate = useNavigate()
  const [address, setAddress] = useState(null)
  const [profile, setProfile] = useState(null)
  const [init, setInit] = useState(false)
  const [user, setUser] = useState(null)
  const [notes, setNotes] = useState([])
  const [book, setBook] = useState(null)
  const [assetmap, setAssetMap] = useState({})

  useEffect(() => getAddr({ setAddress, setInit }), [])
  useEffect(
    () => getProf({ address, setProfile, setInit, setAddress }),
    [address],
  )

  /*
  useEffect(() => {
    ;(async () => {
      let assetmap = {}
      for (let v of notes) {
        assetmap[v.id] = await getInfo(v.id)
        setAssetMap(assetmap)
      }
    })()
  }, [notes])
*/
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
                        mr={2}
                        name={book.Name}
                        src={`https://arweave.net/${book.Thumbnail}`}
                        size="xl"
                      />
                      <Box>
                        <Heading size="lg">{book.Name}</Heading>
                        <Text mb={2} mt={1}>
                          {book.Description}
                        </Text>
                        {!user ? null : (
                          <Link to={`/u/${user.id}`}>
                            <Flex align="center" mt={1}>
                              <Text mr={4} fontSize="xs" color="#999">
                                {dayjs(book["DateCreated"] * 1).format(
                                  "MMM DD",
                                )}
                              </Text>
                              <Image
                                mr={2}
                                src={`https://arweave.net/${user.ProfileImage}`}
                                boxSize="24px"
                              />
                              <Text>{user.DisplayName}</Text>
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
                </TabList>
                <TabPanels>
                  <TabPanel>
                    {map(v => {
                      let _note = v
                      if (assetmap[v.id]) {
                        _note.thumbnail = assetmap[v.id].Thumbnail
                      }

                      const deleteFromNotebook = v => async e => {
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
                          const { res, error } = await book.update(v.id, true)
                          const status = tags(res?.Tags || []).Status
                          if (status === "Success") {
                            let _notes = clone(notes)
                            setNotes(reject(v2 => v2.id === v.id)(_notes))
                          } else {
                            alert("something went wrong")
                          }
                        }
                      }
                      return (
                        <NoteCard
                          navigate={navigate}
                          deleteFromNotebook={deleteFromNotebook}
                          note={_note}
                          profile={profile}
                          variant="line"
                        />
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
