import { useState } from "react"
import "./App.css"
import tomo from "/tomo.png"
import { Image, Flex, Box } from "@chakra-ui/react"

function App() {
  const url = new URL(location.href)
  const image = url.origin + "/cover.png"
  return (
    <>
      <Flex align="center" justify="center" h="100%">
        <Box textAlign="center" pb={6}>
          <Flex justify="center">
            <Image src={tomo} boxSize="200px" />
          </Flex>
          <Box fontSize="75px" fontWeight="bold">
            TOMO
          </Box>
          <Box fontSize="25px" mb={4}>
            Permaweb Hacker
          </Box>
          <Box mx={2} as="a" target="_blank" href="https://x.com/0xTomo">
            <Box fontSize="30px" as="i" className="fab fa-twitter" />
          </Box>
          <Box mx={2} as="a" target="_blank" href="https://github.com/ocrybit">
            <Box fontSize="30px" as="i" className="fab fa-github" />
          </Box>
        </Box>
      </Flex>
    </>
  )
}

export default App
