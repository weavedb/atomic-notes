import { useEffect, useState } from "react"
import dayjs from "dayjs"
import "./App.css"
import { Image, Flex, Box } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { map } from "ramda"
import { dryrun } from "@permaweb/aoconnect"
import { defaultProfile, getProfile, getArticles } from "./lib/utils"

function App() {
  const [articles, setArticles] = useState([])
  const [profile, setProfile] = useState(null)
  const [init, setInit] = useState(false)
  const [error, setError] = useState(false)
  useEffect(() => {
    ;(async () => {
      try {
        const _articles = await getArticles()
        setArticles(_articles)
        setError(false)
      } catch (e) {
        console.log(e)
        setError(true)
      }
      setInit(true)
    })()
  }, [])
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

  const url = new URL(location.href)
  const image = url.origin + "/cover.png"
  const _profile = defaultProfile(profile)
  return (
    <Flex justify="center">
      <Flex direction="column" h="100%" w="100%" maxW="830px">
        <Flex align="center" p={6}>
          <Flex justify="center" mr={4}>
            <Image
              src={_profile.image ?? "https://picsum.photos/200"}
              boxSize="100px"
              sx={{ borderRadius: "50%" }}
            />
          </Flex>
          <Box>
            <Box fontSize="25px" fontWeight="bold">
              {_profile.name}
            </Box>
            <Box fontSize="16px" mb={2}>
              {_profile.description}
            </Box>
            {!_profile.x ? null : (
              <Box
                mr={2}
                as="a"
                target="_blank"
                href={`https://x.com/${_profile.x}`}
              >
                <Box fontSize="25px" as="i" className="fab fa-twitter" />
              </Box>
            )}
            {!_profile.github ? null : (
              <Box
                mr={2}
                as="a"
                target="_blank"
                href={`https://github.com/${_profile.github}`}
              >
                <Box fontSize="25px" as="i" className="fab fa-github" />
              </Box>
            )}
          </Box>
        </Flex>
        {error ? (
          <Flex
            w="100%"
            flex={1}
            sx={{ borderTop: "1px solid #333" }}
            justify="center"
            p={8}
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
            sx={{ borderTop: "1px solid #333" }}
            justify="center"
            p={8}
            align="center"
            fontSize="20px"
          >
            <Box as="i" className="fas fa-circle-notch fa-spin" mr={2} />
            fetching articles...
          </Flex>
        ) : (
          <Box w="100%" flex={1} sx={{ borderTop: "1px solid #333" }}>
            {map(v => {
              return (
                <>
                  <Box pt={4} px={6} fontSize="20px">
                    <Link to={`./a/${v.id}`}>
                      <Box as="u">{v.title}</Box>
                    </Link>
                    <Box ml={4} as="span" fontSize="14px">
                      {dayjs(v.date).format("YYYY MM/DD HH:mm")}
                    </Box>
                  </Box>
                </>
              )
            })(articles)}
          </Box>
        )}
      </Flex>
    </Flex>
  )
}

export default App
