import { useState, useEffect } from "react"
import { Flex, Box, Image } from "@chakra-ui/react"
import { useParams } from "react-router-dom"
import markdownIt from "markdown-it"
import { toHtml } from "hast-util-to-html"
import "../github-markdown.css"
import { common, createStarryNight } from "@wooorm/starry-night"
import { Link } from "react-router-dom"
import { dryrun } from "@permaweb/aoconnect"

import { defaultProfile, getProfile, getArticles } from "../lib/utils"

function Article(a) {
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [article, setArticle] = useState(null)
  const [init, setInit] = useState(false)
  const [error, setError] = useState(false)
  const [md, setMD] = useState(null)
  useEffect(() => {
    ;(async () => {
      try {
        const _profile = await getProfile()
        setProfile(_profile)
      } catch (e) {
        console.log(e)
      }
    })()
  }, [])
  useEffect(() => {
    ;(async () => {
      try {
        const result = await dryrun({
          process: import.meta.env.VITE_PROCESS_ID,
          tags: [
            { name: "Action", value: "Get" },
            { name: "id", value: id },
          ],
        })
        const _article = JSON.parse(result.Messages[0].Tags[6].value)
        if (_article) {
          setArticle(_article)
          const text = await fetch(`https://arweave.net/${_article.txid}`).then(
            r => r.text(),
          )
          const md = markdownIt()
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
      setInit(true)
    })()
  }, [id])

  const _profile = defaultProfile(profile)
  return (
    <>
      <Flex
        minH="100%"
        direction="column"
        align="center"
        px={[4, 6, 10]}
        pt={[4, 6, 10]}
      >
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
        ) : !init ? (
          <Flex
            w="100%"
            flex={1}
            justify="center"
            align="center"
            fontSize="20px"
          >
            <Box as="i" className="fas fa-circle-notch fa-spin" mr={2} />
            fetching article...
          </Flex>
        ) : (
          <Box
            className="markdown-body"
            maxW="830px"
            width="100%"
            dangerouslySetInnerHTML={{ __html: md }}
          />
        )}
        <Flex direction="column" align="center" w="100%" mt={[4, 6, 10]}>
          <Flex
            maxW="830px"
            align="center"
            justify="center"
            sx={{ borderTop: "1px solid #ddd" }}
            p={4}
            width="100%"
          >
            <Link to="/">
              <Flex>
                <Flex justify="center" mr={2}>
                  <Image
                    src={_profile.image}
                    boxSize="25px"
                    sx={{ borderRadius: "50%" }}
                  />
                </Flex>
                <Box>
                  <Box>{_profile.name}</Box>
                </Box>
              </Flex>
            </Link>
          </Flex>
        </Flex>
      </Flex>
    </>
  )
}

export default Article
