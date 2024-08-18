import { useState, useEffect } from "react"
import { Flex, Box, Image, Spinner } from "@chakra-ui/react"
import { useParams } from "react-router-dom"
import markdownIt from "markdown-it"
import { toHtml } from "hast-util-to-html"
import "../github-markdown.css"
import { common, createStarryNight } from "@wooorm/starry-night"
import { Link } from "react-router-dom"
import { dryrun } from "@permaweb/aoconnect"
import { circleNotch } from "../lib/svgs.jsx"
import Header from "../components/Header"
import { getAoProf, getNotes, tags, getAddr, getProf } from "../lib/utils"

function Article(a) {
  const { id } = useParams()

  const [address, setAddress] = useState(null)
  const [profile, setProfile] = useState(null)
  const [init, setInit] = useState(false)
  const [error, setError] = useState(false)
  const [md, setMD] = useState(null)
  const [user, setuser] = useState(null)
  const [initNote, setInitNote] = useState(false)

  useEffect(() => getAddr({ setAddress, setInit }), [])
  useEffect(
    () => getProf({ address, setProfile, setInit, setAddress }),
    [address],
  )

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
        <Box pt={6} width="100%" maxW="854px" px={4} h="100%">
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
          {!md ? null : (
            <Box
              as="a"
              display="flex"
              mt={8}
              maxW="830px"
              width="100%"
              fontSize="12px"
              justifyContent="center"
              p={4}
              target="_blank"
              href={`https://ao-bazar.arweave.net/#/asset/${id}`}
              sx={{
                borderRadius: "5px",
                border: "1px solid #ddd",
                cursor: "pointer",
                ":hover": { opacity: 0.75 },
              }}
            >
              {id}
            </Box>
          )}
          {!user ? null : (
            <Flex direction="column" align="center" w="100%">
              <Flex
                maxW="830px"
                align="center"
                justify="center"
                p={4}
                width="100%"
              >
                <Link to={`/u/${user.ProfileId}`}>
                  <Flex>
                    <Flex justify="center" mr={2}>
                      <Image
                        src={`https://arweave.net/${user.ProfileImage}`}
                        boxSize="25px"
                        sx={{ borderRadius: "50%" }}
                      />
                    </Flex>
                    <Box>
                      <Box>{user.DisplayName}</Box>
                    </Box>
                  </Flex>
                </Link>
              </Flex>
            </Flex>
          )}
        </Box>
      </Flex>
    </>
  )
}

export default Article
