import {
  Tag,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Text,
  Flex,
  Input,
  Box,
  Image,
  Card,
  CardHeader,
  Avatar,
  Heading,
} from "@chakra-ui/react"
import { validAddress, getPFP, gateway_url } from "../lib/utils"
import { Link } from "react-router-dom"
import { DeleteIcon, AddIcon, EditIcon } from "@chakra-ui/icons"
import dayjs from "dayjs"
import { map } from "ramda"

const NoteCard = ({
  note,
  bazar = false,
  addToNotebook = () => {},
  deleteFromNotebook,
  profile,
  notebooks = [],
  nolinks,
  variant = "enclosed",
  navigate,
  diff = [],
  isCreator,
  bookmap = {},
  fileInputRef,
  thumb64,
  onChange,
}) => {
  const props =
    variant === "enclosed"
      ? {
          mt: 6,
          mb: 2,
          p: 4,
          sx: { border: "1px solid #222326", borderRadius: "5px" },
        }
      : {
          p: 4,
          sx: {
            borderBottom: "1px solid rgb(226,232,240)",
            cursor: "pointer",
          },
        }
  return (
    <Flex
      minH="132px"
      {...props}
      onClick={() => {
        if (!nolinks) navigate(`/n/${note.id}`)
      }}
    >
      <Flex flex={1} direction="column">
        <Card variant="unstyled">
          <CardHeader>
            <Flex spacing="4">
              <Flex flex="1" gap="4" alignItems="center" flexWrap="wrap">
                <Flex direction="column" w="100%">
                  <Heading mb={1} size="md">
                    {note.title ?? "No Title"}
                  </Heading>
                  <Text mt={1}>{note.description}</Text>
                </Flex>
              </Flex>
            </Flex>
          </CardHeader>
        </Card>
        <Box flex={1} />
        <Flex align="center">
          <Text color="#999" fontSize="xs" mr={4}>
            {dayjs((note.date ?? Date.now()) * 1).format("MMM DD")}
          </Text>
          <Flex
            align="center"
            mr={4}
            sx={{ ":hover": { opacity: 0.75 }, cursor: "pointer" }}
            onClick={e => {
              e.stopPropagation()
              if (!nolinks) navigate(`/u/${profile.ProfileId}`)
            }}
          >
            <Image mr={2} boxSize="24px" src={getPFP(profile)} />
            <Text fontSize="xs" sx={{}}>
              {profile.DisplayName}
            </Text>
          </Flex>

          {map(v => (
            <Tag
              mr={2}
              colorScheme="gray"
              size="sm"
              sx={{
                cursor: "pointer",
                ":hover": { opacity: 0.75 },
              }}
              onClick={e => {
                e.stopPropagation()
                if (!nolinks) navigate(`/b/${v.id}`)
              }}
            >
              {v.Name}
            </Tag>
          ))(notebooks)}

          <Box flex={1} />
          {nolinks || !isCreator || diff.length === 0 ? null : (
            <Menu>
              <MenuButton
                onClick={e => e.stopPropagation()}
                size="xs"
                colorScheme="gray"
                variant="outline"
                as={IconButton}
                icon={<AddIcon />}
                sx={{
                  border: "1px solid #222326",
                  ":hover": {
                    cursor: "pointer",
                    opacity: 0.75,
                  },
                }}
              />
              <MenuList onClick={e => e.stopPropagation()}>
                {map(v3 => {
                  const v2 = bookmap[v3]
                  return !v2 ? null : (
                    <MenuItem onClick={addToNotebook(v3)}>
                      <Box fontSize="12px" mr={4} my={1} pr={3}>
                        {v2.Name}
                      </Box>
                    </MenuItem>
                  )
                })(diff)}
              </MenuList>
            </Menu>
          )}
          {!bazar ? null : (
            <>
              <Link
                target="_blank"
                to={`https://www.ao.link/#/entity/${note.id}`}
              >
                <Button
                  ml={3}
                  title="Edit"
                  size="xs"
                  colorScheme="gray"
                  variant="outline"
                  sx={{
                    border: "1px solid #222326",
                    ":hover": {
                      bg: "white",
                      opacity: 0.75,
                    },
                  }}
                  onClick={e => {
                    e.stopPropagation()
                  }}
                >
                  AO
                </Button>
              </Link>
              <Link target="_blank" to={`${gateway_url}/${note.id}`}>
                <Button
                  ml={3}
                  title="Edit"
                  size="xs"
                  colorScheme="gray"
                  variant="outline"
                  sx={{
                    border: "1px solid #222326",
                    ":hover": {
                      bg: "white",
                      opacity: 0.75,
                    },
                  }}
                  onClick={e => {
                    e.stopPropagation()
                  }}
                >
                  Arwave
                </Button>
              </Link>
              <Link
                target="_blank"
                to={`https://ao-bazar.arweave.dev/#/asset/${note.id}`}
              >
                <Button
                  ml={3}
                  title="Edit"
                  size="xs"
                  colorScheme="gray"
                  variant="outline"
                  sx={{
                    border: "1px solid #222326",
                    ":hover": {
                      bg: "white",
                      opacity: 0.75,
                    },
                  }}
                  onClick={e => {
                    e.stopPropagation()
                  }}
                >
                  BazAR
                </Button>
              </Link>
            </>
          )}
          {nolinks || !isCreator ? null : (
            <Button
              ml={3}
              title="Edit"
              size="xs"
              colorScheme="gray"
              variant="outline"
              sx={{
                border: "1px solid #222326",
                ":hover": {
                  bg: "white",
                  opacity: 0.75,
                },
              }}
              onClick={e => {
                e.stopPropagation()
                if (!nolinks) navigate(`/n/${note.id}/edit`)
              }}
            >
              <EditIcon />
            </Button>
          )}
          {nolinks || !isCreator || !deleteFromNotebook ? null : (
            <Button
              ml={3}
              size="xs"
              title="Remove"
              colorScheme="gray"
              variant="outline"
              sx={{
                border: "1px solid #222326",
                ":hover": {
                  bg: "white",
                  opacity: 0.75,
                },
              }}
              onClick={deleteFromNotebook(note)}
            >
              <DeleteIcon />
            </Button>
          )}
        </Flex>
      </Flex>
      {onChange ? (
        <Flex
          h="100px"
          w="150px"
          ml={5}
          bg="#f6f6f7"
          sx={{
            borderRadius: "5px",
            backgroundImage:
              note.thumb64 ??
              (note.thumbnail ? `url(${gateway_url}/${note.thumbnail})` : ""),
            backgroundSize: "cover",
            backgroundPosition: "center",
            cursor: "pointer",
            ":hover": { opacity: 0.75 },
          }}
          onClick={() => fileInputRef.current.click()}
          size="xl"
          align="center"
          justify="center"
        >
          <Input
            display="none"
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={onChange}
          />
          {note.thumb64 || validAddress(note.thumbnail) ? null : (
            <AddIcon boxSize="20px" />
          )}
        </Flex>
      ) : !note.thumbnail ? null : (
        <Box
          h="100px"
          w="150px"
          ml={5}
          sx={{
            borderRadius: "5px",
            backgroundImage: note.thumbnail
              ? `url(${gateway_url}/${note.thumbnail})`
              : "",
            backgroundSize: note.thumbnail ? "cover" : "50px",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      )}
    </Flex>
  )
}

export default NoteCard
