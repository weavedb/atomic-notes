import { useNavigate, useParams } from "react-router-dom"
import { Link } from "react-router-dom"
import { useState, useEffect } from "react"
import { Notebook } from "aonote"
import Header from "../components/Header"
import NoteCard from "../components/NoteCard"
import { Helmet } from "react-helmet"
import {
  getInfo,
  getNotes,
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
  useToast,
} from "@chakra-ui/react"
import { o, sortBy, map, pluck, fromPairs, clone, reject } from "ramda"

function User({}) {
  const { id } = useParams()
  const navigate = useNavigate()
  const t = useToast()
  const [address, setAddress] = useState(null)
  const [profile, setProfile] = useState(null)
  const [init, setInit] = useState(false)
  const [user, setUser] = useState(null)
  const [notes, setNotes] = useState([])
  const [book, setBook] = useState(null)
  const [assetmap, setAssetMap] = useState({})

  useEffect(() => getAddr({ setAddress, setInit, t }), [])
  useEffect(
    () => getProf({ address, setProfile, setInit, setAddress, t }),
    [address],
  )

  useEffect(() => {
    ;(async () => {
      const info = await getBookInfo(id)
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
        {...{ address, setAddress, profile, setProfile, init, setInit, t }}
      />
      {!book ? null : (
        <Helmet>
          <title>
            {book.Name}
            {!user ? "" : ` | ${user.DisplayName}`}
          </title>
          <meta name="description" content={book.Description} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta
            name="twitter:title"
            content={`${book.Name}${!user ? "" : ` | ${user.DisplayName}`}`}
          />
          <meta name="twitter:description" content={book.Description} />
          <meta
            name="twitter:image"
            content={`https://arweave.net/${book.Thumbnail}`}
          />
          <meta
            property="og:title"
            content={`${book.Name}${!user ? "" : ` | ${user.DisplayName}`}`}
          />
          <meta name="og:description" content={book.Description} />
          <meta
            name="og:image"
            content={`https://arweave.net/${book.Thumbnail}`}
          />
        </Helmet>
      )}

      {!book ? null : (
        <Flex justify="center" pt="60px">
          <Box w="100%" maxW="854px" px={3} pt={4}>
            <>
              {!book.Banner ? null : (
                <Box
                  w="100%"
                  h={["120px", "200px"]}
                  mt={4}
                  mb={8}
                  sx={{
                    backgroundImage: `url(${gateway_url}/${book.Banner})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                ></Box>
              )}
              <Card variant="unstyled">
                <CardHeader>
                  <Flex spacing="4">
                    <Flex flex="1" gap="4" alignItems="center" flexWrap="wrap">
                      <Avatar
                        mr={2}
                        name={book.Name}
                        src={getThumb(book)}
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
                              <Image mr={2} src={getPFP(user)} boxSize="24px" />
                              <Text>{user.DisplayName}</Text>
                            </Flex>
                          </Link>
                        )}
                      </Box>
                      <Box flex={1} />
                      <Link
                        target="_blank"
                        to={`https://bazar.arweave.dev/#/collection/${id}`}
                      >
                        <Button
                          ml={3}
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
                          onClick={e => {
                            e.stopPropagation()
                          }}
                        >
                          BazAR
                        </Button>
                      </Link>
                      {!isCreator ? null : (
                        <Link to={`/b/${id}/edit`}>
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
                            Edit
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
                        e.stopPropagation()
                        if (await badWallet(t, address)) return
                        if (
                          confirm(
                            "Would you like to remove the note from this notebook?",
                          )
                        ) {
                          const book = await new Notebook({
                            ...opt.notebook,
                            pid: id,
                          }).init()
                          const { err: _err } = await book.removeNote(
                            v.id,
                            true,
                          )
                          if (!_err) {
                            let _notes = clone(notes)
                            setNotes(reject(v2 => v2.id === v.id)(_notes))
                            msg(t, "Note removed!")
                          } else {
                            err(t, "something went wrong")
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
                          isCreator={isCreator}
                          notebooks={[{ ...book, id }]}
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
