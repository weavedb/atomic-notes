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
import { validAddress, gateway_url } from "../lib/utils"
import { Link } from "react-router-dom"
import { DeleteIcon, AddIcon, EditIcon } from "@chakra-ui/icons"
import dayjs from "dayjs"
import { map } from "ramda"

const NotebookCard = ({
  bmap,
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
    <Box p={4} {...props}>
      <Card variant="unstyled">
        <CardHeader>
          <Flex spacing="4">
            {onChange ? (
              <Flex
                boxSize="96px"
                mr={4}
                bg="#f6f6f7"
                sx={{
                  borderRadius: "50%",
                  backgroundImage:
                    note.thumb64 ??
                    (note.thumbnail
                      ? `url(${gateway_url}/${note.thumbnail})`
                      : ""),
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
              <Avatar
                mr={4}
                src={`${gateway_url}/${note.thumbnail}`}
                size="xl"
              />
            )}
            <Flex flex="1" gap="4" alignItems="center" flexWrap="wrap">
              <Box>
                <Heading mb={1} size="md">
                  {note.title}
                </Heading>
                <Text mb={1}>{note.description}</Text>
                <Flex mt={2}>
                  <Text color="#999" fontSize="xs" mr={4}>
                    {dayjs((note.date ?? Date.now()) * 1).format("MMM DD")}
                  </Text>
                  <Tag
                    size="sm"
                    sx={{
                      ":hover": { opacity: 0.75 },
                    }}
                  >
                    {note.assets?.length ?? 0} Notes
                  </Tag>
                </Flex>
              </Box>
            </Flex>
          </Flex>
        </CardHeader>
      </Card>
    </Box>
  )
}

export default NotebookCard
