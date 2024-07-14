import { useEffect, useState } from "react"
import dayjs from "dayjs"
import "./App.css"
import tomo from "/tomo.png"
import { Image, Flex, Box } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { map } from "ramda"
import { dryrun } from "@permaweb/aoconnect"
const pid = "6Z6aOJ7N2IJsVd7yNJrdw5eH_Ccy06cc7lWtu3SvhSA"

function App() {
  const [articles, setArticles] = useState([])
  useEffect(() => {
    ;(async () => {
      const result = await dryrun({
        process: import.meta.env.VITE_PROCESS_ID,
        tags: [{ name: "Action", value: "List" }],
      })
      try {
        const _articles = JSON.parse(result.Messages[0].Tags[6].value)
        setArticles(_articles)
      } catch (e) {
        console.log(e)
      }
    })()
  }, [])
  const url = new URL(location.href)
  const image = url.origin + "/cover.png"
  return (
    <Flex justify="center">
      <Flex direction="column" h="100%" w="100%" maxW="830px">
        <Flex align="center" p={6}>
          <Flex justify="center" mr={4}>
            <Image src={tomo} boxSize="100px" />
          </Flex>
          <Box>
            <Box fontSize="25px" fontWeight="bold">
              TOMO
            </Box>
            <Box fontSize="16px" mb={2}>
              Permaweb Hacker
            </Box>
            <Box mr={2} as="a" target="_blank" href="https://x.com/0xTomo">
              <Box fontSize="25px" as="i" className="fab fa-twitter" />
            </Box>
            <Box
              mr={2}
              as="a"
              target="_blank"
              href="https://github.com/ocrybit"
            >
              <Box fontSize="25px" as="i" className="fab fa-github" />
            </Box>
          </Box>
        </Flex>
        <Box w="100%" flex={1} style={{ borderTop: "1px solid #333" }}>
          {map(v => {
            return (
              <>
                <Box pt={4} px={6} fontSize="20px">
                  <Link to={`./a/${v.id}`}>
                    <Box as="u">{v.title}</Box>
                  </Link>
                  <Box ml={4} as="span" fontSize="14px">
                    {dayjs(v.date).format("YYYY MM/DD mm:HH")}
                  </Box>
                </Box>
              </>
            )
          })(articles)}
        </Box>
      </Flex>
    </Flex>
  )
}

export default App
