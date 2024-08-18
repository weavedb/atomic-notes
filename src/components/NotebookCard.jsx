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
  Box,
  Image,
  Card,
  CardHeader,
  Avatar,
  Heading,
} from "@chakra-ui/react"
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
            {!note.thumbnail ? null : (
              <Avatar
                mr={4}
                src={`https://arweave.net/${note.thumbnail}`}
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
