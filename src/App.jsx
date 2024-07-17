import { useEffect, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTwitter, faGithub } from "@fortawesome/free-brands-svg-icons"
import dayjs from "dayjs"
import "./App.css"
import { Image, Flex, Box } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { map } from "ramda"
import { dryrun } from "@permaweb/aoconnect"
import {
  defaultProfile,
  getProfile,
  getArticles,
  arweave_logo,
} from "./lib/utils"
import { circleNotch } from "./lib/svgs.jsx"
const limit = 10
function App() {
  const [articles, setArticles] = useState([])
  const [profile, setProfile] = useState(null)
  const [init, setInit] = useState(false)
  const [error, setError] = useState(false)
  const [address, setAddress] = useState(null)
  const [next, setNext] = useState(false)
  const [count, setCount] = useState(0)
  const [skip, setSkip] = useState(0)
  useEffect(() => {
    ;(async () => {
      try {
        const {
          count: _count,
          next: _next,
          articles: _articles,
        } = await getArticles({ limit, skip })
        setArticles(_articles)
        setCount(_count)
        setNext(_next)
        setSkip(skip + _articles.length)
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
    <>
      <Flex justify="center">
        <Flex direction="column" h="100%" w="100%" maxW="830px">
          <Flex align="center" p={6}>
            <Flex justify="center" mr={4}>
              <Image
                src={_profile.image ?? arweave_logo}
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
                  <FontAwesomeIcon icon={faTwitter} fontSize="25px" />
                </Box>
              )}
              {!_profile.github ? null : (
                <>
                  <Box
                    mr={2}
                    as="a"
                    target="_blank"
                    href={`https://github.com/${_profile.github}`}
                  >
                    <FontAwesomeIcon icon={faGithub} fontSize="25px" />
                  </Box>
                </>
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
              <Box mr={2}>{circleNotch}</Box>
              fetching articles...
            </Flex>
          ) : (
            <Box w="100%" flex={1} sx={{ borderTop: "1px solid #333" }}>
              {map(v => {
                return (
                  <Flex w="100%" pt={4} px={6} fontSize="20px" align="center">
                    <Link to={`./a/${v.id}`}>
                      <Box as="u">{v.title}</Box>
                    </Link>
                    <Box flex={1} />
                    <Box ml={4} as="span" fontSize="12px">
                      {dayjs(v.date).format("YYYY MM/DD HH:mm")}
                    </Box>
                  </Flex>
                )
              })(articles)}
              {!next ? null : (
                <Flex justify="center" mt={6}>
                  <Flex
                    px={4}
                    py={2}
                    w="200px"
                    sx={{
                      border: "1px solid #999",
                      borderRadius: "5px",
                      cursor: "pointer",
                      ":hover": { opacity: 0.5 },
                    }}
                    justify="center"
                    onClick={async () => {
                      try {
                        const {
                          count: _count,
                          next: _next,
                          articles: _articles,
                        } = await getArticles({ limit, skip })
                        setArticles([...articles, ..._articles])
                        setCount(_count)
                        setNext(_next)
                        setSkip(skip + _articles.length)
                      } catch (e) {
                        console.log(e)
                      }
                    }}
                  >
                    Load More ( {count - skip} )
                  </Flex>
                </Flex>
              )}
            </Box>
          )}
        </Flex>
      </Flex>
    </>
  )
}

export default App
