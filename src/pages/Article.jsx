import { useState, useEffect } from "react"
import { Flex, Box, Image } from "@chakra-ui/react"
import { useParams } from "react-router-dom"
import markdownIt from "markdown-it"
import { toHtml } from "hast-util-to-html"
import "../github-markdown.css"
import { common, createStarryNight } from "@wooorm/starry-night"
import tomo from "/tomo.png"
import { Link } from "react-router-dom"
import { dryrun } from "@permaweb/aoconnect"

function Article(a) {
  const { id } = useParams()
  const [article, setArticle] = useState(null)
  const [md, setMD] = useState(null)
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
        }
      } catch (e) {
        console.log(e)
      }
    })()
  }, [id])
  return (
    <>
      <Flex direction="column" align="center" p={[4, 6, 10]}>
        <Box
          className="markdown-body"
          maxW="830px"
          width="100%"
          dangerouslySetInnerHTML={{ __html: md }}
        />
      </Flex>
      <Flex direction="column" align="center">
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
                <Image src={tomo} boxSize="25px" />
              </Flex>
              <Box>
                <Box>TOMO</Box>
              </Box>
            </Flex>
          </Link>
        </Flex>
      </Flex>
    </>
  )
}

export default Article
