import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Flex, Box, Image, Spinner } from "@chakra-ui/react"
import markdownIt from "markdown-it"
import Note from "../lib/note"
import { toHtml } from "hast-util-to-html"
import "../github-markdown.css"
import { common, createStarryNight } from "@wooorm/starry-night"
import { Link } from "react-router-dom"
import { dryrun } from "@permaweb/aoconnect"
import { circleNotch } from "../lib/svgs.jsx"
import Header from "../components/Header"
import NoteCard from "../components/NoteCard"
import { getAoProf, getNotes, tags, getAddr, getProf } from "../lib/utils"
import Notebook from "../lib/notebook"

function Article(a) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [address, setAddress] = useState(null)
  const [profile, setProfile] = useState(null)
  const [init, setInit] = useState(false)
  const [error, setError] = useState(false)
  const [md, setMD] = useState(null)
  const [note, setNote] = useState(null)
  const [user, setuser] = useState(null)
  const [initNote, setInitNote] = useState(false)
  const [pubmap, setPubmap] = useState({})
  useEffect(() => getAddr({ setAddress, setInit }), [])
  useEffect(
    () => getProf({ address, setProfile, setInit, setAddress }),
    [address],
  )
  useEffect(() => {
    ;(async () => {
      const _note = new Note({ pid: id })
      const { error, res } = await _note.info()
      if (!error) {
        setNote({
          id: id,
          title: res.Name,
          description: res.Description,
          thumbnail: res.Thumbnail,
          collections: res.Collections || [],
        })
        let pubmap = {}
        for (let v of res.Collections || []) {
          const nb = new Note({ pid: v })
          const { error: error2, res: info } = await nb.info()
          if (!error2) pubmap[v] = info
        }
        setPubmap(pubmap)
      }
    })()
  }, [md])
  useEffect(() => {
    ;(async () => {
      try {
        const result = await dryrun({
          process: id,
          tags: [{ name: "Action", value: "Get" }],
        })
        const _article = tags(result.Messages[0].Tags || [])["Data"]
        if (_article) {
          try {
            const creator = tags((await getNotes([id]))[0]?.tags).Creator
            setuser(await getAoProf(creator))
          } catch (e) {}
          const text = _article
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
          const html = markdownItInstance.render(text)
          setMD(html)
          setError(false)
        }
      } catch (e) {
        setError(true)
        console.log(e)
      }
      setInitNote(true)
    })()
  }, [id])
  const isCreator = user && user?.ProfileId === profile?.ProfileId
  let notebooks = []
  for (let v of note?.collections || []) {
    if (pubmap[v]) notebooks.push({ ...pubmap[v], id: v })
  }
  return (
    <>
      <Header
        {...{ address, setAddress, profile, setProfile, init, setInit }}
      />
      <Flex
        minH="100%"
        direction="column"
        align="center"
        px={[4, 6, 10]}
        pt="60px"
        h="100%"
      >
        <Box pt={6} width="100%" maxW="854px" px={4} h="calc(100% - 60px)">
          {error ? (
            <Flex
              w="100%"
              flex={1}
              justify="center"
              align="center"
              color="crimson"
              fontSize="20px"
            >
              <Box as="i" className="fas fa-exclamation" mr={2} />
              something went wrong
            </Flex>
          ) : !initNote ? (
            <Flex
              w="100%"
              minH="100%"
              flex={1}
              justify="center"
              align="center"
              fontSize="20px"
            >
              <Spinner mr={4} />
              Fetching Note...
            </Flex>
          ) : (
            <Box
              className="markdown-body"
              minH="calc(100% - 145px)"
              maxW="830px"
              width="100%"
              dangerouslySetInnerHTML={{ __html: md }}
            />
          )}
          {!note || !user ? null : (
            <Box py={4}>
              <NoteCard
                notebooks={notebooks}
                bazar={true}
                profile={user}
                note={note}
                navigate={navigate}
                isCreator={isCreator}
              />
            </Box>
          )}
        </Box>
      </Flex>
    </>
  )
}

export default Article
