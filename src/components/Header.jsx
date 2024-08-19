import {
  Button,
  Spinner,
  Image,
  Flex,
  Box,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuItemOption,
  MenuGroup,
  MenuOptionGroup,
  MenuDivider,
} from "@chakra-ui/react"
import { msg, ao, getAoProfile, getAddr, getProf, getPFP } from "../lib/utils"
import { useParams } from "react-router-dom"
import { Link } from "react-router-dom"
import { useState, useEffect } from "react"
import lf from "localforage"

function Header({
  children,
  address,
  profile,
  init,
  setAddress,
  setProfile,
  setInit,
  t,
}) {
  return (
    <Flex
      bg="white"
      justify="center"
      w="100%"
      sx={{
        borderBottom: children ? "" : "1px solid #ddd",
        position: "fixed",
        x: 0,
        y: 0,
        zIndex: 1,
      }}
      mb={4}
    >
      <style>{`
body, html, #root{
  height: 100%;
}`}</style>

      <Flex
        px={3}
        maxW="854px"
        width="100%"
        align="center"
        height="60px"
        fontSize="14px"
      >
        {children ? (
          children
        ) : (
          <Link to="/">
            <Flex align="center">
              <Image src={ao} mr={2} />
              <Box as="span">Atomic Notes</Box>
            </Flex>
          </Link>
        )}
        <Box flex={1} />
        {!init ? (
          <Spinner />
        ) : profile ? (
          <>
            <Menu>
              <MenuButton
                sx={{
                  ":hover": { cursor: "pointer", opacity: 0.75 },
                }}
              >
                <>
                  {profile ? (
                    <Link to={`/u/${profile.ProfileId}`}>
                      <Flex align="center">
                        <Box>{profile.DisplayName}</Box>
                        <Image
                          title={address}
                          ml={4}
                          src={getPFP(profile)}
                          sx={{ borderRadius: "50%" }}
                          boxSize="30px"
                        />
                      </Flex>
                    </Link>
                  ) : (
                    <Box
                      fontSize="12px"
                      px={4}
                      py={1}
                      sx={{
                        cursor: "pointer",
                        ":hover": { opacity: 0.75 },
                        borderRadius: "3px",
                        border: "1px solid #999",
                      }}
                    >
                      {address.slice(0, 5)}...{address.slice(-5)}
                    </Box>
                  )}
                </>
              </MenuButton>
              <MenuList>
                <Link to={`/u/${profile.ProfileId}`}>
                  <MenuItem>
                    <Box fontSize="12px" mr={4} my={1} pr={3}>
                      Profile
                    </Box>
                  </MenuItem>
                </Link>
                <Link to={`/n/new/edit`}>
                  <MenuItem>
                    <Box fontSize="12px" mr={4} my={1} pr={3}>
                      Create Note
                    </Box>
                  </MenuItem>
                </Link>
                <Link to={`/b/new/edit`}>
                  <MenuItem>
                    <Box fontSize="12px" mr={4} my={1} pr={3}>
                      Create Notebook
                    </Box>
                  </MenuItem>
                </Link>
                <MenuItem
                  onClick={async () => {
                    setAddress(null)
                    setProfile(null)
                    await lf.removeItem("address")
                    await lf.removeItem(`profile-${address}`)
                    msg(t, "Wallet Disconnected!", null, "info")
                  }}
                >
                  <Box fontSize="12px" mr={4} my={1} pr={3}>
                    Sign Out
                  </Box>
                </MenuItem>
              </MenuList>
            </Menu>
          </>
        ) : (
          <Button
            size="sm"
            colorScheme="gray"
            variant="outline"
            fontWeight="normal"
            ml={4}
            sx={{
              border: "1px solid #222326",
              ":hover": { bg: "white", opacity: 0.75 },
            }}
            onClick={async () => {
              await window.arweaveWallet.connect(["ACCESS_ADDRESS"])
              const addr = await window.arweaveWallet.getActiveAddress()
              if (addr) {
                setInit(false)
                setAddress(addr)
                await lf.setItem("address", addr)
              } else {
                toast({
                  title: "Something Went Wrong!",
                  status: "error",
                  isClosable: true,
                })
              }
            }}
          >
            Connect Wallet
          </Button>
        )}
      </Flex>
    </Flex>
  )
}

export default Header
