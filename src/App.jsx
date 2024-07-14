import { useState } from "react"
import "./App.css"
import tomo from "/tomo.png"
import { Image, Flex, Box } from "@chakra-ui/react"
import { Link } from "react-router-dom"

function App() {
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
          <Box p={4} fontSize="20px">
            <Link to="./a/1">
              <Box as="u">Deploy PermaApp on Arweave</Box>
            </Link>
          </Box>
        </Box>
      </Flex>
    </Flex>
  )
}

export default App
