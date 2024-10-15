import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useToast, Flex, Box, Image, Spinner } from "@chakra-ui/react"
import markdownIt from "markdown-it"
import { Profile, Note } from "aonote"
import { toHtml } from "hast-util-to-html"
import "../github-markdown.css"
import { common, createStarryNight } from "@wooorm/starry-night"
import { Link } from "react-router-dom"
import Header from "../components/Header"
import NoteCard from "../components/NoteCard"
import { msg, err, getNotes, tags, getAddr, getProf, opt } from "../lib/utils"
import { Helmet } from "react-helmet"

function Article(a) {
  const { id } = useParams()
  const navigate = useNavigate()
  const t = useToast()
  const [address, setAddress] = useState(null)
  const [profile, setProfile] = useState(null)
  const [init, setInit] = useState(false)
  const [error, setError] = useState(false)
  const [md, setMD] = useState(null)
  const [note, setNote] = useState(null)
  const [user, setUser] = useState(null)
  const [initNote, setInitNote] = useState(false)
  const [pubmap, setPubmap] = useState({})
  useEffect(() => getAddr({ setAddress, setInit, t }), [])
  useEffect(
    () => getProf({ address, setProfile, setInit, setAddress, t }),
    [address],
  )
  useEffect(() => {
    ;(async () => {
      const _note = new Note({ ...opt.note, pid: id })
      const res = await _note.info()
      if (res) {
        setNote({
          id: id,
          title: res.Name,
          description: res.Description,
          thumbnail: res.Thumbnail,
          collections: res.Collections || [],
        })
        let pubmap = {}
        for (let v of res.Collections || []) {
          const nb = new Note({ ...opt.note, pid: v })
          const info = await nb.info()
          if (info) pubmap[v] = info
        }
        setPubmap(pubmap)
      }
    })()
  }, [md])

  useEffect(() => {
    ;(async () => {
      try {
        const note = new Note({ pid: id, ...opt.note })
        const out = await note.get()
        if (out) {
          const _article = out.data
          try {
            const creator = tags((await getNotes([id]))[0]?.tags).Creator
            const _prof = new Profile(opt.profile)
            setUser(await _prof.profile({ id: creator }))
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
        {...{ address, setAddress, profile, setProfile, init, setInit, t }}
      />
      {!note ? null : (
        <Helmet>
          <title>
            {note.title}
            {!user ? "" : ` | ${user.DisplayName}`}
          </title>
          <meta name="description" content={note.description} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta
            name="twitter:title"
            content={`${note.title}${!user ? "" : ` | ${user.DisplayName}`}`}
          />
          <meta name="twitter:description" content={note.description} />
          <meta
            name="twitter:image"
            content={`https://arweave.net/${note.thumbnail}`}
          />
          <meta
            property="og:title"
            content={`${note.title}${!user ? "" : ` | ${user.DisplayName}`}`}
          />
          <meta name="og:description" content={note.description} />
          <meta
            name="og:image"
            content={`https://arweave.net/${note.thumbnail}`}
          />
        </Helmet>
      )}
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
