import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import NoteCard from "../components/NoteCard"
import lf from "localforage"
import Arweave from "arweave"
import "@mdxeditor/editor/style.css"
import "../github-markdown.css"
import markdownIt from "markdown-it"
import { toHtml } from "hast-util-to-html"
import { common, createStarryNight } from "@wooorm/starry-night"
import { AddIcon, EditIcon } from "@chakra-ui/icons"
import {
  Spinner,
  AbsoluteCenter,
  Divider,
  Table,
  Thead,
  Tbody,
  Tfoot,
  Tr,
  Th,
  Td,
  TableCaption,
  TableContainer,
  Tag,
  Text,
  Card,
  CardHeader,
  Button,
  Heading,
  Step,
  StepDescription,
  StepIcon,
  StepIndicator,
  StepNumber,
  StepSeparator,
  StepStatus,
  StepTitle,
  Stepper,
  useSteps,
  TabPanels,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Select,
  Textarea,
  Input,
  Flex,
  Box,
  Image,
  useToast,
} from "@chakra-ui/react"
import { useParams } from "react-router-dom"
import { Link } from "react-router-dom"
import Note from "../lib/note"
import Notebook from "../lib/notebook"
const action = value => tag("Action", value)
const tag = (name, value) => ({ name, value })
import {
  last,
  map,
  clone,
  sortBy,
  o,
  reverse,
  includes,
  fromPairs,
  mergeLeft,
  filter,
  pluck,
  indexOf,
  indexBy,
  prop,
} from "ramda"
import dayjs from "dayjs"
import {
  createDataItemSigner,
  message,
  dryrun,
  result,
} from "@permaweb/aoconnect"

import {
  defaultProfile,
  getProfile,
  getArticles,
  ao,
  getAddr,
  getProf,
  getBooks,
  ltags,
  getInfo as getInfo2,
  badWallet,
  validAddress,
  msg,
  err,
} from "../lib/utils"
import { circleNotch } from "../lib/svgs.jsx"
import {
  diffSourcePlugin,
  MDXEditor,
  DiffSourceToggleWrapper,
} from "@mdxeditor/editor"

const allPlugins = diffMarkdown => [
  diffSourcePlugin({ viewMode: "source", diffMarkdown }),
]
const getProcess = async pid => {
  const query = `query {
    transactions(ids: ["${pid}"]) {
        edges {
            node {
                id
                owner { address }
                tags { name value }
            }
        }
    }
}`
  const res = await fetch("https://arweave.net/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  }).then(r => r.json())
  const tags = res?.data?.transactions?.edges?.[0].node.tags ?? null
  const owner = res?.data?.transactions?.edges?.[0].node.owner.address
  if (tags) {
    let _tags = fromPairs(tags.map(({ name, value }) => [name, value]))
    _tags.Owner = owner
    return _tags
  } else {
    return null
  }
}
const limit = 10
const getHTML = async md => {
  try {
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
    return markdownItInstance.render(md)
  } catch (e) {}
  return null
}

const getAoProfile = async address => {
  let pr = await getProfileId(address)
  const prid = await getProfileId(address)
  if (prid) {
    const _res2 = await dryrun({
      process: "SNy4m-DrqxWl01YqGM4sxI8qCni-58re8uuJLvZPypY",
      tags: [action("Get-Metadata-By-ProfileIds")],
      data: JSON.stringify({ ProfileIds: [prid] }),
    })
    if (_res2?.Messages?.[0]?.Data) {
      const profiles = JSON.parse(_res2.Messages[0].Data)
      pr = fromPairs(profiles.map(obj => [obj.ProfileId, obj]))[prid]
    }
  }
  return pr
}

const getAoProfiles = async ids => {
  let prs = {}
  try {
    const _res2 = await dryrun({
      process: "SNy4m-DrqxWl01YqGM4sxI8qCni-58re8uuJLvZPypY",
      tags: [action("Get-Metadata-By-ProfileIds")],
      data: JSON.stringify({ ProfileIds: ids }),
    })
    if (_res2?.Messages?.[0]?.Data) {
      const profiles = JSON.parse(_res2.Messages[0].Data)
      prs = fromPairs(profiles.map(obj => [obj.ProfileId, obj]))
    }
  } catch (e) {}
  return prs
}

const getProfileId = async address => {
  let pr = null
  const _res = await dryrun({
    process: "SNy4m-DrqxWl01YqGM4sxI8qCni-58re8uuJLvZPypY",
    tags: [action("Get-Profiles-By-Delegate")],
    data: JSON.stringify({ Address: address }),
  })
  if (_res?.Messages?.[0]?.Data) {
    const profile = JSON.parse(_res.Messages[0].Data)
    if (profile[0]) {
      pr = profile[0].ProfileId
    }
  }
  return pr
}
const steps = [
  { description: "Atomic Note Info", title: "Step 1" },
  { description: "Ownership Tokens", title: "Step 2" },
  { description: "Universal Data License", title: "Step 3" },
]

function AtomicNote(a) {
  const { pid } = useParams()
  const navigate = useNavigate()
  const t = useToast()
  const fileInputRef = useRef(null)

  const [address, setAddress] = useState(null)
  const [profile, setProfile] = useState(null)
  const [init, setInit] = useState(false)
  const [initNote, setInitNote] = useState(false)

  useEffect(() => getAddr({ setAddress, setInit, t }), [])
  useEffect(
    () => getProf({ setAddress, address, setProfile, setInit, t }),
    [address],
  )

  const { activeStep, setActiveStep } = useSteps({
    index: 0,
    count: steps.length,
  })

  const ref = useRef(null)
  const [pub, setPub] = useState("None")
  const [metadata, setMetadata] = useState(null)
  const [uploadingArweave, setUploadingArweave] = useState(false)
  const [updatingArticle, setUpdatingArticle] = useState(false)
  const [updatingProf, setUpdatingProf] = useState(false)
  const [editorInit, setEditorInit] = useState(false)
  const [aoProfile, setAoProfile] = useState(null)
  const [aoProfiles, setAoProfiles] = useState({})
  const [editTitle, setEditTitle] = useState(null)
  const [editID, setEditID] = useState(null)
  const [editTxid, setEditTxid] = useState(null)
  const [addTxid, setAddTxid] = useState(null)
  const [md, setMD] = useState("")
  const [currentMD, setCurrentMD] = useState("")
  const [currentVersion, setCurrentVersion] = useState("")
  const [selectedMD, setSelectedMD] = useState(null)
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [preview, setPreview] = useState("")
  const [articles, setArticles] = useState([])
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [thumbnail, setThumbnail] = useState(
    "eXCtpVbcd_jZ0dmU2PZ8focaKxBGECBQ8wMib7sIVPo",
  )
  const [id, setId] = useState("")
  const [txid, setTxid] = useState("")
  const first = pid === "new" ? "Editor" : "Info"
  const [tab, setTab] = useState(first)
  const [tab2, setTab2] = useState("Markdown")
  const [tab3, setTab3] = useState("Note")
  const [tab4, setTab4] = useState("Main")
  const [update, setUpdate] = useState(null)
  const [name, setName] = useState("")
  const [image, setImage] = useState("")
  const [cover, setCover] = useState("")
  const [x, setX] = useState("")
  const [github, setGithub] = useState("")
  const [next, setNext] = useState(false)
  const [count, setCount] = useState(0)
  const [notes, setNotes] = useState([])
  const [skip, setSkip] = useState(0)
  const [changed, setChanged] = useState(false)
  const [draftID, setDraftID] = useState(null)
  const [drafts, setDrafts] = useState([])
  const [versions, setVersions] = useState([])
  const [editors, setEditors] = useState([])
  const [newEditor, setNewEditor] = useState("")
  const [newEditorProfile, setNewEditorProfile] = useState(null)
  const [isFractional, setIsFractional] = useState("yes")
  const [fraction, setFraction] = useState(100)
  const [access, setAccess] = useState("none")
  const [accessFee, setAccessFee] = useState("0.1")
  const [derivationFee, setDerivationFee] = useState("0.1")
  const [derivationTerm, setDerivationTerm] = useState("one-time")
  const [commercialTerm, setCommercialTerm] = useState("one-time")
  const [trainingTerm, setTrainingTerm] = useState("one-time")
  const [commercialFee, setCommercialFee] = useState("0.1")
  const [commercialShare, setCommercialShare] = useState("5.0")
  const [derivationShare, setDerivationShare] = useState("5.0")
  const [trainingFee, setTrainingFee] = useState("0.1")
  const [derivations, setDerivations] = useState("disallowed")
  const [commercial, setCommercial] = useState("disallowed")
  const [training, setTraining] = useState("disallowed")
  const [payment, setPayment] = useState("single")
  const [recipient, setRecipient] = useState("")
  const [books, setBooks] = useState([])
  const [date, setDate] = useState(null)

  const fractionals = [
    { key: "yes", val: "YES" },
    { key: "no", val: "NO" },
  ]
  const allows = [
    { key: "allowed", val: "Allowed" },
    { key: "disallowed", val: "Disallowed" },
  ]
  const allowsMap = fromPairs(allows.map(({ key, val }) => [key, val]))
  const accesses = [
    { key: "none", val: "None" },
    { key: "one-time", val: "One-Time" },
  ]
  const accessesMap = fromPairs(accesses.map(({ key, val }) => [key, val]))
  const payments = [
    { key: "single", val: "Single" },
    { key: "random", val: "Random" },
    { key: "global", val: "Global" },
  ]
  const paymentsMap = fromPairs(payments.map(({ key, val }) => [key, val]))
  const dTerms = [
    { key: "credit", val: "With Credit" },
    { key: "indication", val: "With Indication" },
    { key: "passthrought", val: "With License Passthrough" },
    { key: "revenue", val: "With Revenue Share" },
    { key: "monthly", val: "With Monthly Fee" },
    { key: "one-time", val: "With One-Time Fee" },
  ]
  const dtMap = fromPairs(dTerms.map(({ key, val }) => [key, val]))
  const cTerms = [
    { key: "revenue", val: "With Revenue Share" },
    { key: "monthly", val: "With Monthly Fee" },
    { key: "one-time", val: "With One-Time Fee" },
  ]
  const ctMap = fromPairs(cTerms.map(({ key, val }) => [key, val]))
  const tTerms = [
    { key: "monthly", val: "With Monthly Fee" },
    { key: "one-time", val: "With One-Time Fee" },
  ]
  const ttMap = fromPairs(tTerms.map(({ key, val }) => [key, val]))
  const getInfo = async () => {
    const note = new Note({ pid })
    const { error, res } = await note.get()
    if (!error) {
      setCurrentMD(await getHTML(res.data))
      setCurrentVersion(res.version)
      const { error: error2, res: list } = await note.list()
      setVersions(reverse(list))
      const { res: _editors } = await note.editors()
      setEditors(_editors)
      setMetadata(await getProcess(pid))
      const { erro: error3, res: info } = await note.info()
      if (!error3) {
        setThumbnail(info.Thumbnail ?? "")
        setDesc(info.Description ?? "")
        setTitle(info.Name ?? "")
        setDate((info.dateCraeted ?? Date.now()) * 1)
      }
    }
    setInitNote(true)
  }
  useEffect(() => {
    ;(async () => setNotes((await lf.getItem("notes")) ?? []))()
  }, [])

  useEffect(() => {
    ;(async () => {
      let ids = []
      let idmap = {}
      for (let v of editors) {
        if (!aoProfiles[v]) {
          const id = await getProfileId(v)
          if (id) {
            idmap[id] = v
            ids.push(id)
          }
        }
      }
      if (ids.length > 0) {
        const newIds = await getAoProfiles(ids)
        const _ids = clone(aoProfiles)
        for (const k in newIds) _ids[idmap[k]] = newIds[k]
        setAoProfiles(_ids)
      }
    })()
  }, [editors])

  useEffect(() => {
    ;(async () => {
      setSelectedMD(null)
      setSelectedVersion(null)
      if (pid !== "new") {
        await getInfo()
      } else {
        setInitNote(true)
      }
    })()
  }, [pid])

  useEffect(() => {
    ;(async () => {
      const _drafts = (await lf.getItem(`drafts-${pid}`)) ?? []
      setDrafts(_drafts)
    })()
  }, [pid])

  useEffect(() => {
    ;(async () => {
      const userAddress = await lf.getItem("address")
      if (userAddress) {
        setAddress(userAddress)
        setRecipient(userAddress)
      }
    })()
  }, [pid])

  useEffect(() => {
    ;(async () => {
      if (address) {
        setRecipient(address)
        const _profile = await getAoProfile(address)
        setAoProfile(_profile)
        const id = _profile.ProfileId
        const info = await getInfo2(id)
        if (info) {
          setBooks(
            o(
              sortBy(v => v["date-created"] * -1),
              map(v => {
                return { ...ltags(v.tags), id: v.id, owner: v.owner.address }
              }),
            )(await getBooks(pluck("Id", info.Collections))),
          )
        }
      }
    })()
  }, [address])

  useEffect(() => {
    ;(async () => {
      const _draft = await lf.getItem(`draft-${pid}`)
      if (_draft) {
        setMD(_draft.body)
        if (_draft.txid) setEditTxid(_draft.txid)
        if (_draft.id) setEditID(_draft.id)
        if (_draft.title) setEditTitle(_draft.title)
        if (_draft.draftID) {
          setDraftID(_draft.draftID)
        } else {
          setDraftID(Date.now())
        }
      } else {
        setDraftID(Date.now())
      }
    })()
  }, [pid])

  useEffect(() => {
    ;(async () => {
      if (tab2 === "Preview") {
        const html = await getHTML(md)
        setPreview(html)
      }
    })()
  }, [tab2])
  const pubmap = map(v => {
    v.Name = v.title
    return v
  })(indexBy(prop("id"))(books))

  const isEditor = address && includes(address, editors)
  const isOwner = (address && metadata && metadata.Owner === address) ?? false
  const tabs =
    pid === "new"
      ? ["Editor", "Create", "Drafts"]
      : isEditor
        ? [first, "Versions", "Drafts", "Editor"]
        : [first]
  const tabs2 = ["Markdown", "Preview"]
  const tabs3 = ["Note", "Tokens", "License"]

  const ok =
    !/^\s*$/.test(title) && (thumbnail === "" || validAddress(thumbnail))
  const ok_editor = validAddress(newEditor)
  const ok_profile = !/^\s*$/.test(name)
  const _profile = defaultProfile(profile)
  let access_text = "-"
  let derivations_text = "-"
  let commercial_text = "-"
  let training_text = "-"
  let payment_text = "-"
  if (metadata) {
    if (metadata["Access-Fee"]) {
      if (metadata["Access-Fee"] === "None") {
        access_text = metadata["Access-Fee"]
      } else if (/^One-Time-[0-9.]+$/.test(metadata["Access-Fee"])) {
        access_text =
          "One Time: " + metadata["Access-Fee"].split("-")[2] + " AR"
      } else {
        access_text = metadata["Access-Fee"]
      }
    }
    if (metadata["Derivations"]) {
      if (metadata["Derivations"] === "Disallowed") {
        derivations_text = metadata["Derivations"]
      } else {
        const sp = metadata["Derivations"].split("-")
        if (
          /^Allowed-With-Revenue-Share-[0-9.]+$/.test(metadata["Derivations"])
        ) {
          derivations_text = sp.slice(0, -1).join(" ") + ": " + last(sp) + " %"
        } else {
          derivations_text = sp.slice(0, -1).join(" ") + ": " + last(sp) + " AR"
        }
      }
    }
    if (metadata["Commercial-Use"]) {
      if (metadata["Commercial-Use"] === "Disallowed") {
        commercial_text = metadata["Commercial-Use"]
      } else {
        const sp = metadata["Commercial-Use"].split("-")
        if (
          /^Allowed-With-Revenue-Share-[0-9.]+$/.test(
            metadata["Commercial-Use"],
          )
        ) {
          commercial_text = sp.slice(0, -1).join(" ") + ": " + last(sp) + " %"
        } else {
          commercial_text = sp.slice(0, -1).join(" ") + ": " + last(sp) + " AR"
        }
      }
    }
    if (metadata["Data-Model-Training"]) {
      if (metadata["Data-Model-Training"] === "Disallowed") {
        training_text = metadata["Data-Model-Training"]
      } else {
        const sp = metadata["Data-Model-Training"].split("-")
        training_text = sp.slice(0, -1).join(" ") + ": " + last(sp) + " AR"
      }
    }
    if (metadata["Payment-Mode"]) payment_text = metadata["Payment-Mode"]
  }
  let ok3 = ok && (payment !== "single" || validAddress(recipient))
  let oks = [ok, true, ok3]

  const isCreator = profile && (pid === "new" || isEditor)
  return (
    <>
      <Header
        {...{ address, setAddress, profile, setProfile, init, setInit, t }}
      >
        <Tabs
          index={indexOf(tab, tabs)}
          onChange={index => {
            const v = tabs[index]
            if (v === "Drafts") {
              setDrafts(
                o(
                  reverse,
                  sortBy(v => v.update),
                )(drafts),
              )
            }
            setTab(v)
            if (v === "Editor") setTab2("Markdown")
          }}
          variant="line"
          colorScheme="gray"
        >
          <TabList>{map(v => <Tab>{v}</Tab>)(tabs)}</TabList>
        </Tabs>
      </Header>
      {!initNote ? (
        <Flex
          minH="100%"
          direction="column"
          pt="70px"
          justify="center"
          align="center"
        >
          <Flex minH="100%">
            <Spinner mr={4} />
            Fetching Note...
          </Flex>
        </Flex>
      ) : !isCreator ? (
        <Flex
          minH="100%"
          direction="column"
          pt="70px"
          justify="center"
          align="center"
        >
          <Flex minH="100%">You don't have the right to edit this note.</Flex>
        </Flex>
      ) : (
        <>
          <Flex minH="100%" direction="column" pt="70px">
            <>
              {tab !== "Editor" ? null : (
                <>
                  <Flex mb={4} justify="center">
                    <Flex maxW="830px" width="100%">
                      <Tabs
                        size="xs"
                        index={indexOf(tab2, tabs2)}
                        onChange={index => {
                          const v = tabs2[index]
                          setTab2(v)
                        }}
                        variant="solid-rounded"
                        colorScheme="gray"
                      >
                        <TabList>
                          {map(v => (
                            <Tab px={3} ml={4} fontSize="12px">
                              {v}
                            </Tab>
                          ))(tabs2)}
                        </TabList>
                      </Tabs>
                      <Box flex={1} />
                      {pid === "new" ? null : (
                        <Flex
                          fontSize="12px"
                          mr={4}
                          justify="center"
                          sx={{
                            borderRadius: "3px",
                            cursor: "pointer",
                            ":hover": { opacity: 0.5 },
                          }}
                          onClick={async () => {
                            if (uploadingArweave) return
                            if (await badWallet(t, address)) return
                            const version = prompt(
                              `Enter a new version higher than ${currentVersion}`,
                            )
                            if (!version) {
                              setUploadingArweave(false)
                              return
                            }
                            setUploadingArweave(true)
                            try {
                              const note = new Note({
                                wallet: window.arweaveWallet,
                                pid,
                              })
                              const { res: patches } = await note.patches(md)
                              const { error, res } = await note.update(
                                patches,
                                version,
                              )
                              if (!error) {
                                setChanged(false)
                                const _draft = {
                                  title: editTitle,
                                  id: editID,
                                  body: md,
                                  changed: false,
                                  draftID,
                                }
                                await lf.setItem(`draft-${pid}`, _draft)
                                await lf.setItem("draft-" + draftID, _draft)
                                let _drafts = []
                                for (let v of drafts) {
                                  if (v.draftID !== draftID) _drafts.push(v)
                                }
                                await lf.setItem(`drafts-${pid}`, _drafts)
                                await getInfo()
                                setTab("Info")
                                msg(t, `New version v${version} uploaded!`)
                              } else {
                                err(t)
                              }
                            } catch (e) {
                              err(t)
                            }
                            setUploadingArweave(false)
                          }}
                        >
                          {updatingArticle ? circleNotch : ""}
                          <Box as="span" ml={2}>
                            Post New Version
                          </Box>
                        </Flex>
                      )}
                      <Flex
                        fontSize="12px"
                        mr={4}
                        justify="center"
                        sx={{
                          borderRadius: "3px",
                          cursor: "pointer",
                          ":hover": { opacity: 0.5 },
                        }}
                        onClick={() => {
                          fileInputRef.current.click()
                        }}
                      >
                        <Input
                          type="file"
                          display="none"
                          accept=".md"
                          ref={fileInputRef}
                          onChange={e => {
                            const file = e.target.files[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onload = e => {
                                const text = e.target.result
                                if (tab2 === "Markdown") setTab2("Preview")
                                ref.current?.setMarkdown("")
                                setMD(text)
                                setEditTitle("")
                                setEditID("")
                                setEditTxid("")
                                setDraftID(Date.now())
                                setTimeout(() => {
                                  setTab2("Markdown")
                                  msg(t, "MD imported!", null, "info")
                                }, 0)
                              }
                              reader.readAsText(file)
                            }
                          }}
                        />{" "}
                        Import MD
                      </Flex>
                      <Flex
                        fontSize="12px"
                        mr={4}
                        justify="center"
                        sx={{
                          borderRadius: "3px",
                          cursor: "pointer",
                          ":hover": { opacity: 0.5 },
                        }}
                        onClick={async () => {
                          const blob = new Blob([md], { type: "text/markdown" })
                          const link = document.createElement("a")
                          link.href = URL.createObjectURL(blob)
                          link.download = `${Date.now()}.md`
                          link.click()
                          URL.revokeObjectURL(link.href)
                          msg(t, "MD downloaded!")
                        }}
                      >
                        Download MD
                      </Flex>
                      {!editTxid ? null : (
                        <Flex
                          fontSize="12px"
                          mr={4}
                          justify="center"
                          sx={{
                            borderRadius: "3px",
                            cursor: "pointer",
                            ":hover": { opacity: 0.5 },
                          }}
                          onClick={async () => {
                            setAddTxid(editTxid)
                            setTxid(editTxid)
                            setTitle(editTitle)
                            if (editID !== "") {
                              setUpdate(editID)
                              setId(editID)
                            }
                            setTab("Create")
                          }}
                        >
                          Add to AO
                        </Flex>
                      )}
                      <Flex
                        fontSize="12px"
                        mr={4}
                        justify="center"
                        sx={{
                          borderRadius: "3px",
                          cursor: "pointer",
                          ":hover": { opacity: 0.5 },
                        }}
                        onClick={async () => {
                          if (confirm("Would you like to reset the editor?")) {
                            if (tab2 === "Markdown") setTab2("Preview")
                            ref.current?.setMarkdown("")
                            setMD("")
                            setEditTitle("")
                            setEditID("")
                            setEditTxid("")
                            setDraftID(Date.now())
                            setTimeout(() => {
                              setTab2("Markdown")
                              msg(t, "Content cleared!", null, "info")
                            }, 0)
                          }
                        }}
                      >
                        Reset
                      </Flex>
                    </Flex>
                  </Flex>
                  <Flex mb={4} justify="center">
                    <Flex
                      h="40px"
                      align="center"
                      maxW="830px"
                      width="100%"
                      fontSize="12px"
                      py={2}
                      px={4}
                      sx={{ borderRadius: "3px", border: "1px solid #4A5568" }}
                    >
                      {editTxid ? (
                        <Flex w="100%" align="center">
                          {!editTitle ? null : (
                            <Box as="b" mr={4}>
                              {editTitle}
                            </Box>
                          )}
                          <Box as="span" mr={4}>
                            Draft ID: #{draftID}
                          </Box>
                          {!editID ? null : (
                            <Box as="span" mr={4}>
                              Page ID: {editID}
                            </Box>
                          )}
                          <Box flex={1} />
                          <Box color="crimson" mr={1}>
                            {changed ? "*draft changed" : ""}
                          </Box>
                        </Flex>
                      ) : (
                        <Flex w="100%" align="center">
                          <Box as="span" mr={4}>
                            Draft ID: #{draftID}
                          </Box>
                          <Box flex={1}></Box>
                        </Flex>
                      )}
                    </Flex>
                  </Flex>
                </>
              )}
              <Flex justify="center" flex={1}>
                <Flex direction="column" h="100%" w="100%" maxW="830px">
                  {tab !== "Info" ? null : (
                    <>
                      <Flex mb={4} justify="center">
                        <Flex maxW="830px" width="100%">
                          <Tabs
                            size="xs"
                            index={indexOf(tab4, [
                              "Main",
                              "License",
                              "Info",
                              "Editors",
                            ])}
                            onChange={index => {
                              const v = tabs2[index]
                              setTab2(v)
                            }}
                            variant="solid-rounded"
                            colorScheme="gray"
                          >
                            <TabList>
                              <Tab
                                px={3}
                                ml={4}
                                fontSize="12px"
                                onClick={() => setTab4("Main")}
                              >
                                v {selectedVersion ?? currentVersion}
                              </Tab>
                              {map(v => (
                                <Tab
                                  fontSize="12px"
                                  px={3}
                                  ml={4}
                                  onClick={() => setTab4(v)}
                                >
                                  {v}
                                </Tab>
                              ))(["License", "Info", "Editors"])}
                            </TabList>
                          </Tabs>
                          <Box flex={1} />
                          {selectedVersion &&
                          currentVersion !== selectedVersion ? (
                            <Flex
                              sx={{
                                cursor: "pointer",
                                ":hover": { opacity: 0.75 },
                              }}
                              fontSize="12px"
                              ml={4}
                              justify="center"
                              onClick={() => {
                                setSelectedMD(null)
                                setSelectedVersion(null)
                              }}
                            >
                              Latest Version
                            </Flex>
                          ) : null}
                        </Flex>
                      </Flex>
                      {tab4 === "Editors" ? (
                        <>
                          {!isOwner ? null : (
                            <Box
                              mb={4}
                              p={6}
                              fontSize="12px"
                              bg="#f0f0f0"
                              sx={{ borderRadius: "10px" }}
                            >
                              <Flex>
                                <Box flex={2} mr={2}>
                                  <Box mb={2}>New Editor Address</Box>
                                  <Input
                                    color={
                                      validAddress(newEditor) ? "" : "crimson"
                                    }
                                    placeholder=""
                                    bg="white"
                                    value={newEditor}
                                    sx={{ border: "1px solid #999" }}
                                    onChange={async e => {
                                      setNewEditor(e.target.value)
                                      if (validAddress(e.target.value)) {
                                        setNewEditorProfile(
                                          await getAoProfile(e.target.value),
                                        )
                                      } else {
                                        setNewEditorProfile(null)
                                      }
                                    }}
                                  />
                                </Box>
                                <Box flex={1} ml={2}>
                                  <Box mb={2}>AO Profile</Box>
                                  <Flex height="40px" align="center">
                                    {newEditorProfile ? (
                                      <Box
                                        as="a"
                                        display="frex"
                                        alignItems="center"
                                        target="_blank"
                                        href={`https://ao-bazar.arweave.net/#/profile/${newEditorProfile.ProfileId}`}
                                      >
                                        <Image
                                          title={newEditorProfile.ProfileId}
                                          mr={3}
                                          src={`https://arweave.net/${newEditorProfile.ProfileImage}`}
                                          boxSize="30px"
                                          sx={{ borderRadius: "50%" }}
                                        />
                                        <Box fontSize="16px" as="span">
                                          {newEditorProfile.Username}
                                        </Box>
                                      </Box>
                                    ) : null}
                                  </Flex>
                                </Box>
                              </Flex>
                              <Flex
                                mt={5}
                                fontSize="14px"
                                height="35px"
                                align="center"
                                justify="center"
                                px={4}
                                py={2}
                                sx={{
                                  opacity: ok_editor ? 1 : 0.5,
                                  borderRadius: "3px",
                                  cursor: ok_editor ? "pointer" : "default",
                                  ":hover": { opacity: 0.75 },
                                  border: "1px solid #999",
                                  bg: "white",
                                }}
                                onClick={async () => {
                                  if (!ok_editor) return
                                  if (await badWallet(t, address)) return
                                  const note = new Note({
                                    wallet: window.arweaveWallet,
                                    pid,
                                  })
                                  const { error, res } =
                                    await note.addEditor(newEditor)
                                  if (error) {
                                    err(t)
                                    return
                                  }
                                  setNewEditor("")
                                  setNewEditorProfile(null)
                                  const { res: _editors } = await note.editors()
                                  setEditors(_editors)
                                  msg(t, "Editor added!")
                                }}
                              >
                                Add New Editor
                              </Flex>
                            </Box>
                          )}
                          <Box w="100%" flex={1}>
                            {map(v => {
                              return (
                                <>
                                  <Flex
                                    py={2}
                                    px={6}
                                    fontSize="16px"
                                    align="center"
                                  >
                                    {aoProfiles[v] ? (
                                      <Box
                                        display="flex"
                                        alignItems="center"
                                        sx={{ textDecoration: "underline" }}
                                      >
                                        <Image
                                          mr={3}
                                          src={`https://arweave.net/${aoProfiles[v].ProfileImage}`}
                                          boxSize="30px"
                                        />
                                        <Box
                                          fontSize="16px"
                                          mr={3}
                                          as="a"
                                          target="_blank"
                                          href={`https://ao-bazar.arweave.net/#/profile/${aoProfiles[v].ProfileId}`}
                                        >
                                          {aoProfiles[v].Username}
                                        </Box>
                                        (
                                        <Box
                                          mx={2}
                                          fontSize="12px"
                                          as="a"
                                          target="_blank"
                                          href={`https://ao.link/#/entity/${v}`}
                                        >
                                          {v}
                                        </Box>
                                        )
                                      </Box>
                                    ) : (
                                      <Box
                                        as="a"
                                        target="_blank"
                                        href={`https://ao.link/#/entity/${v}`}
                                        sx={{ textDecoration: "underline" }}
                                      >
                                        {v}
                                      </Box>
                                    )}
                                    <Box flex={1}></Box>
                                    {!isOwner ? null : (
                                      <Box fontSize="12px" as="span" ml={3}>
                                        <Flex
                                          bg={
                                            editTxid === v.txid
                                              ? "#f0f0f0"
                                              : "white"
                                          }
                                          justify="center"
                                          px={2}
                                          py={1}
                                          sx={{
                                            borderRadius: "3px",
                                            cursor: "pointer",
                                            ":hover": { opacity: 0.5 },
                                            border: "1px solid #999",
                                          }}
                                          onClick={async () => {
                                            if (
                                              confirm(
                                                `Would you like to remove ${v}?`,
                                              )
                                            ) {
                                              if (await badWallet(t, address))
                                                return
                                              const note = new Note({
                                                wallet: window.arweaveWallet,
                                                pid,
                                              })
                                              const { error, res } =
                                                await note.removeEditor(v)
                                              if (error) {
                                                err(t)
                                                return
                                              }
                                              const { res: _editors } =
                                                await note.editors()
                                              setEditors(_editors)
                                              msg(t, "Editor removed!")
                                            }
                                          }}
                                        >
                                          Remove
                                        </Flex>
                                      </Box>
                                    )}
                                  </Flex>
                                </>
                              )
                            })(editors)}
                          </Box>
                        </>
                      ) : tab4 === "License" ? (
                        !metadata ? null : (
                          <>
                            <TableContainer
                              sx={{ borderTop: "1px solid rgb(237, 242, 247)" }}
                            >
                              <Table variant="simple">
                                <Tbody>
                                  {map(v => (
                                    <Tr>
                                      <Th>{v.key}</Th>
                                      <Td>{v.val}</Td>
                                    </Tr>
                                  ))([
                                    {
                                      key: "License",
                                      val: (
                                        <Box
                                          as="a"
                                          target="_blank"
                                          sx={{ textDecoration: "underline" }}
                                          href={`https://arweave.net/${metadata["License"]}`}
                                        >
                                          Universal Data License
                                        </Box>
                                      ),
                                    },
                                    {
                                      key: "Access Fee",
                                      val: access_text,
                                    },
                                    {
                                      key: "Derivations",
                                      val: derivations_text,
                                    },
                                    {
                                      key: "Commercial Use",
                                      val: commercial_text,
                                    },
                                    {
                                      key: "Data Model Training",
                                      val: training_text,
                                    },
                                    {
                                      key: "Payment Mode",
                                      val: payment_text,
                                    },
                                    {
                                      key: "Payment Address",
                                      val: metadata?.["Payment-Address"] ? (
                                        <Box
                                          as="a"
                                          target="_blank"
                                          sx={{ textDecoration: "underline" }}
                                          href={`https://ao.link/#/entity/${metadata["Payment-Address"]}`}
                                        >
                                          {metadata["Payment-Address"]}
                                        </Box>
                                      ) : (
                                        ""
                                      ),
                                    },
                                    {
                                      key: "Currency",
                                      val: metadata?.["Currency"] ? (
                                        <Box
                                          as="a"
                                          target="_blank"
                                          sx={{ textDecoration: "underline" }}
                                          href={`https://ao.link/#/token/${metadata["Currency"]}`}
                                        >
                                          {metadata["Currency"]}
                                        </Box>
                                      ) : (
                                        ""
                                      ),
                                    },
                                  ])}
                                </Tbody>
                              </Table>
                            </TableContainer>
                          </>
                        )
                      ) : tab4 === "Main" ? (
                        <>
                          <Box position="relative" mb={4}>
                            <Divider />
                            <AbsoluteCenter
                              bg="white"
                              px="4"
                              fontSize="14px"
                              color="#aaa"
                            >
                              Note Preview
                            </AbsoluteCenter>
                          </Box>
                          <Box mb={2} sx={{ overflowY: "auto" }}>
                            <Box
                              mb={4}
                              className="markdown-body"
                              width="100%"
                              dangerouslySetInnerHTML={{
                                __html: selectedMD ?? currentMD,
                              }}
                            />
                          </Box>
                        </>
                      ) : (
                        <>
                          <Box
                            p={6}
                            fontSize="12px"
                            bg="#f0f0f0"
                            sx={{ borderRadius: "10px" }}
                          >
                            <>
                              <Box mb={4}>
                                <Box mb={2}>Title</Box>
                                <Input
                                  bg="white"
                                  value={title}
                                  sx={{ border: "1px solid #999" }}
                                  onChange={e => setTitle(e.target.value)}
                                />
                              </Box>
                              <Box mb={4}>
                                <Box mb={2}>Description</Box>
                                <Textarea
                                  bg="white"
                                  rows="2"
                                  value={desc}
                                  sx={{ border: "1px solid #999" }}
                                  onChange={e => setDesc(e.target.value)}
                                />
                              </Box>
                              <Box mb={4}>
                                <Box mb={2}>Thumbnail (Arweave TxID)</Box>
                                <Input
                                  bg="white"
                                  value={thumbnail}
                                  color={
                                    thumbnail === "" || validAddress(thumbnail)
                                      ? ""
                                      : "crimson"
                                  }
                                  sx={{
                                    border: `1px solid ${thumbnail === "" || validAddress(thumbnail) ? "#999" : "crimson"}`,
                                  }}
                                  onChange={e => setThumbnail(e.target.value)}
                                />
                              </Box>
                            </>
                          </Box>
                          <NoteCard
                            nolinks={true}
                            note={{ date, title, description: desc, thumbnail }}
                            notebooks={pubmap[pub] ? [pubmap[pub]] : []}
                            profile={profile}
                          />
                          <Button
                            mt={5}
                            w="100%"
                            sx={{
                              opacity: ok ? 1 : 0.5,
                              borderRadius: "3px",
                              cursor: ok ? "pointer" : "default",
                              border: "1px solid #222326",
                              ":hover": { bg: "#f6f6f7" },
                              bg: "white",
                            }}
                            onClick={async () => {
                              const wait = ms =>
                                new Promise(res => setTimeout(() => res(), ms))
                              if (!ok || updatingArticle) return
                              if (await badWallet(t, address)) return
                              setUpdatingArticle(true)
                              let to = false
                              try {
                                let tokens = [
                                  `Name = '${title.replace(/'/g, "\\'")}'`,
                                  `Description = '${desc.replace(/'/g, "\\'")}'`,
                                  `Thumbnail = '${thumbnail}'`,
                                ]
                                const note = new Note({
                                  wallet: window.arweaveWallet,
                                  pid,
                                })
                                const { error, res } = await note.eval(
                                  tokens.join("\n"),
                                )
                                if (error) {
                                  err(t)
                                } else {
                                  setTimeout(async () => {
                                    const { res: info } =
                                      await note.info("Info")
                                    console.log(info)
                                    msg(t, "Note info updated!")
                                  }, 2000)
                                }
                              } catch (e) {
                                console.log(e)
                                err(t)
                              }
                              setUpdatingArticle(to)
                            }}
                          >
                            {updatingArticle ? circleNotch : "Update Note Info"}
                          </Button>
                        </>
                      )}
                    </>
                  )}
                  {tab !== "Editor" ? null : (
                    <Box
                      mb={2}
                      height={tab2 === "Preview" ? "" : "calc(100vh - 175px)"}
                      sx={{ overflowY: "auto" }}
                    >
                      {tab2 === "Preview" ? (
                        <Box
                          mb={4}
                          className="markdown-body"
                          width="100%"
                          dangerouslySetInnerHTML={{ __html: preview }}
                        />
                      ) : (
                        <MDXEditor
                          markdown={md}
                          contentEditableClassName="prose max-w-full font-sans"
                          plugins={allPlugins("")}
                          ref={ref}
                          onChange={async v => {
                            let change = changed
                            if (
                              editorInit &&
                              v !== "" &&
                              md !== "" &&
                              md !== v
                            ) {
                              change = true
                              setChanged(true)
                            }
                            setMD(v)
                            setEditorInit(true)
                            const _draft = {
                              title: editTitle,
                              txid: editTxid,
                              id: editID,
                              body: v,
                              changed: change,
                              draftID,
                            }
                            await lf.setItem(`draft-${pid}`, _draft)
                            await lf.setItem("draft-" + draftID, _draft)
                            let _drafts = [
                              { draftID, update: Date.now(), title: editTitle },
                            ]
                            for (let v of drafts) {
                              if (v.draftID !== draftID) _drafts.push(v)
                            }
                            setDrafts(_drafts)
                            await lf.setItem(`drafts-${pid}`, _drafts)
                          }}
                        />
                      )}
                    </Box>
                  )}
                  {tab !== "Create" ? null : (
                    <Box w="100%" flex={1}>
                      <Flex mb={4} justify="center">
                        <Flex maxW="830px" width="100%">
                          <Stepper
                            index={activeStep}
                            size="sm"
                            w="100%"
                            colorScheme="gray"
                          >
                            {steps.map((step, index) => (
                              <Step
                                key={index}
                                onClick={() => {
                                  if (index > 0 && !ok) return
                                  setTab3(tabs3[index])
                                  setActiveStep(index)
                                }}
                                sx={{
                                  cursor: "pointer",
                                  ":hover": { opacity: 0.75 },
                                }}
                              >
                                <StepIndicator>
                                  <StepStatus
                                    complete={<StepIcon />}
                                    incomplete={<StepNumber />}
                                    active={<StepNumber />}
                                  />
                                </StepIndicator>

                                <Box flexShrink="0">
                                  <StepTitle>{step.title}</StepTitle>
                                  <StepDescription>
                                    {step.description}
                                  </StepDescription>
                                </Box>

                                <StepSeparator />
                              </Step>
                            ))}
                          </Stepper>
                        </Flex>
                      </Flex>
                      <Box
                        mt={6}
                        p={6}
                        fontSize="12px"
                        bg="#f0f0f0"
                        sx={{ borderRadius: "10px" }}
                      >
                        {tab3 !== "Note" ? null : (
                          <>
                            <Box mb={4}>
                              <Box mb={2}>Title</Box>
                              <Input
                                bg="white"
                                value={title}
                                sx={{ border: "1px solid #999" }}
                                onChange={e => setTitle(e.target.value)}
                              />
                            </Box>
                            <Box mb={4}>
                              <Box mb={2}>Description</Box>
                              <Textarea
                                bg="white"
                                rows="2"
                                value={desc}
                                sx={{ border: "1px solid #999" }}
                                onChange={e => setDesc(e.target.value)}
                              />
                            </Box>
                            <Box mb={4}>
                              <Box mb={2}>Thumbnail (Arweave TxID)</Box>
                              <Input
                                color={
                                  thumbnail === "" || validAddress(thumbnail)
                                    ? ""
                                    : "crimson"
                                }
                                bg="white"
                                value={thumbnail}
                                sx={{
                                  border: `1px solid ${thumbnail === "" || validAddress(thumbnail) ? "#999" : "crimson"}`,
                                }}
                                onChange={e => setThumbnail(e.target.value)}
                              />
                            </Box>

                            <Box>
                              <Box mb={2}>Notebook</Box>
                              <Select
                                value={pub}
                                bg="white"
                                sx={{ border: "1px solid #999" }}
                                onChange={e => setPub(e.target.value)}
                              >
                                <option value="None">None</option>
                                {map(v => (
                                  <option value={v.id}>{v.title}</option>
                                ))(books)}
                              </Select>
                            </Box>
                          </>
                        )}
                        {tab3 !== "Tokens" ? null : (
                          <>
                            <Flex>
                              <Box flex={1} mr={2}>
                                <Box mb={2}>Fractionalized Tokens</Box>
                                <Select
                                  bg="white"
                                  value={isFractional}
                                  sx={{ border: "1px solid #999" }}
                                  onChange={e =>
                                    setIsFractional(e.target.value)
                                  }
                                >
                                  {map(v => (
                                    <option value={v.key}>{v.val}</option>
                                  ))(fractionals)}
                                </Select>
                              </Box>
                              <Box flex={1} ml={2}>
                                <Box mb={2}>Fractional Tokens</Box>
                                <Input
                                  disabled={isFractional === "no"}
                                  placeholder="100"
                                  bg="white"
                                  value={fraction}
                                  sx={{ border: "1px solid #999" }}
                                  onChange={e => {
                                    if (!Number.isNaN(+e.target.value)) {
                                      setFraction(Math.floor(+e.target.value))
                                    }
                                  }}
                                />
                              </Box>
                            </Flex>
                          </>
                        )}
                        {tab3 !== "License" ? null : (
                          <>
                            <Flex mb={4}>
                              <Box flex={1} mr={2}>
                                <Box mb={2}>Access Fee</Box>
                                <Select
                                  bg="white"
                                  value={access}
                                  sx={{ border: "1px solid #999" }}
                                  onChange={e => setAccess(e.target.value)}
                                >
                                  {map(v => (
                                    <option value={v.key}>{v.val}</option>
                                  ))(accesses)}
                                </Select>
                              </Box>
                              <Box flex={1} ml={2}>
                                <Box mb={2}>Fee (AR)</Box>
                                <Input
                                  disabled={access === "none"}
                                  placeholder="0.1"
                                  bg="white"
                                  value={accessFee}
                                  sx={{ border: "1px solid #999" }}
                                  onChange={e => {
                                    if (!Number.isNaN(+e.target.value)) {
                                      setAccessFee(e.target.value)
                                    }
                                  }}
                                />
                              </Box>
                            </Flex>
                            <Flex mb={4}>
                              <Box flex={1} mr={2}>
                                <Box mb={2}>Derivations</Box>
                                <Select
                                  bg="white"
                                  value={derivations}
                                  sx={{ border: "1px solid #999" }}
                                  onChange={e => setDerivations(e.target.value)}
                                >
                                  {map(v => (
                                    <option value={v.key}>{v.val}</option>
                                  ))(allows)}
                                </Select>
                              </Box>
                              <Box flex={1} mx={2}>
                                <Box mb={2}>Terms</Box>
                                <Select
                                  disabled={derivations === "disallowed"}
                                  bg="white"
                                  value={derivationTerm}
                                  sx={{ border: "1px solid #999" }}
                                  onChange={e =>
                                    setDerivationTerm(e.target.value)
                                  }
                                >
                                  {map(v => (
                                    <option value={v.key}>{v.val}</option>
                                  ))(dTerms)}
                                </Select>
                              </Box>
                              {derivationTerm === "revenue" ? (
                                <Box flex={1} ml={2}>
                                  <Box mb={2}>Share (%)</Box>
                                  <Input
                                    disabled={derivations === "disallowed"}
                                    placeholder="0.1"
                                    bg="white"
                                    value={derivationShare}
                                    sx={{ border: "1px solid #999" }}
                                    onChange={e => {
                                      if (!Number.isNaN(+e.target.value)) {
                                        setDerivationShare(e.target.value)
                                      }
                                    }}
                                  />
                                </Box>
                              ) : (
                                <Box flex={1} ml={2}>
                                  <Box mb={2}>Fee (AR)</Box>
                                  <Input
                                    disabled={
                                      derivations === "disallowed" ||
                                      (derivationTerm !== "monthly" &&
                                        derivationTerm !== "one-time")
                                    }
                                    placeholder="0.1"
                                    bg="white"
                                    value={derivationFee}
                                    sx={{ border: "1px solid #999" }}
                                    onChange={e => {
                                      if (!Number.isNaN(+e.target.value)) {
                                        setDerivationFee(e.target.value)
                                      }
                                    }}
                                  />
                                </Box>
                              )}
                            </Flex>
                            <Flex mb={4}>
                              <Box flex={1} mr={2}>
                                <Box mb={2}>Commercial Use</Box>
                                <Select
                                  bg="white"
                                  value={commercial}
                                  sx={{ border: "1px solid #999" }}
                                  onChange={e => setCommercial(e.target.value)}
                                >
                                  {map(v => (
                                    <option value={v.key}>{v.val}</option>
                                  ))(allows)}
                                </Select>
                              </Box>
                              <Box flex={1} mx={2}>
                                <Box mb={2}>Terms</Box>
                                <Select
                                  disabled={commercial === "disallowed"}
                                  bg="white"
                                  value={commercialTerm}
                                  sx={{ border: "1px solid #999" }}
                                  onChange={e =>
                                    setCommercialTerm(e.target.value)
                                  }
                                >
                                  {map(v => (
                                    <option value={v.key}>{v.val}</option>
                                  ))(cTerms)}
                                </Select>
                              </Box>
                              {commercialTerm === "revenue" ? (
                                <Box flex={1} ml={2}>
                                  <Box mb={2}>Share (%)</Box>
                                  <Input
                                    disabled={derivations === "disallowed"}
                                    placeholder="0.1"
                                    bg="white"
                                    value={commercialShare}
                                    sx={{ border: "1px solid #999" }}
                                    onChange={e => {
                                      if (!Number.isNaN(+e.target.value)) {
                                        setCommercialShare(e.target.value)
                                      }
                                    }}
                                  />
                                </Box>
                              ) : (
                                <Box flex={1} ml={2}>
                                  <Box mb={2}>Fee (AR)</Box>
                                  <Input
                                    disabled={commercial === "disallowed"}
                                    placeholder="0.1"
                                    bg="white"
                                    value={commercialFee}
                                    sx={{ border: "1px solid #999" }}
                                    onChange={e => {
                                      if (!Number.isNaN(+e.target.value)) {
                                        setCommercialFee(e.target.value)
                                      }
                                    }}
                                  />
                                </Box>
                              )}
                            </Flex>
                            <Flex mb={4}>
                              <Box flex={1} mr={2}>
                                <Box mb={2}>Data Model Training</Box>
                                <Select
                                  bg="white"
                                  value={training}
                                  sx={{ border: "1px solid #999" }}
                                  onChange={e => setTraining(e.target.value)}
                                >
                                  {map(v => (
                                    <option value={v.key}>{v.val}</option>
                                  ))(allows)}
                                </Select>
                              </Box>
                              <Box flex={1} mx={2}>
                                <Box mb={2}>Terms</Box>
                                <Select
                                  disabled={training === "disallowed"}
                                  bg="white"
                                  value={trainingTerm}
                                  sx={{ border: "1px solid #999" }}
                                  onChange={e =>
                                    setTrainingTerm(e.target.value)
                                  }
                                >
                                  {map(v => (
                                    <option value={v.key}>{v.val}</option>
                                  ))(tTerms)}
                                </Select>
                              </Box>
                              <Box flex={1} ml={2}>
                                <Box mb={2}>Fee (AR)</Box>
                                <Input
                                  disabled={training === "disallowed"}
                                  placeholder="0.1"
                                  bg="white"
                                  value={trainingFee}
                                  sx={{ border: "1px solid #999" }}
                                  onChange={e => {
                                    if (!Number.isNaN(+e.target.value)) {
                                      setTrainingFee(e.target.value)
                                    }
                                  }}
                                />
                              </Box>
                            </Flex>
                            <Flex>
                              <Box flex={1} mr={2}>
                                <Box mb={2}>Payment Mode</Box>
                                <Select
                                  bg="white"
                                  value={payment}
                                  sx={{ border: "1px solid #999" }}
                                  onChange={e => setPayment(e.target.value)}
                                >
                                  {map(v => (
                                    <option value={v.key}>{v.val}</option>
                                  ))(payments)}
                                </Select>
                              </Box>
                              <Box flex={1} ml={2}>
                                <Box mb={2}>Recipient</Box>
                                <Input
                                  disabled={payment !== "single"}
                                  placeholder=""
                                  bg="white"
                                  value={recipient}
                                  color={
                                    validAddress(recipient) ? "" : "crimson"
                                  }
                                  sx={{
                                    border: `1px solid ${validAddress(recipient) ? "#999" : "crimson"}`,
                                  }}
                                  onChange={e => setRecipient(e.target.value)}
                                />
                              </Box>
                            </Flex>
                          </>
                        )}
                      </Box>
                      <NoteCard
                        nolinks={true}
                        note={{ title, description: desc, thumbnail }}
                        notebooks={pubmap[pub] ? [pubmap[pub]] : []}
                        profile={profile}
                      />
                      <Flex>
                        {activeStep === 0 ? null : (
                          <Button
                            mt={5}
                            mr={4}
                            w="100%"
                            sx={{
                              borderRadius: "3px",
                              cursor: "pointer",
                              border: "1px solid #222326",
                              ":hover": { bg: "#f6f6f7" },
                              bg: "white",
                            }}
                            onClick={async () => {
                              setActiveStep(activeStep - 1)
                              setTab3(tabs3[activeStep - 1])
                            }}
                          >
                            Previous Step
                          </Button>
                        )}
                        {tab3 !== "License" ? (
                          <Button
                            ml={activeStep === 0 ? 0 : 4}
                            mt={5}
                            w="100%"
                            sx={{
                              opacity: oks[activeStep] ? 1 : 0.5,
                              borderRadius: "3px",
                              cursor: oks[activeStep] ? "pointer" : "default",
                              border: "1px solid #222326",
                              ":hover": { bg: "#f6f6f7" },
                              bg: "white",
                            }}
                            onClick={async () => {
                              if (oks[activeStep]) {
                                setActiveStep(activeStep + 1)
                                setTab3(tabs3[activeStep + 1])
                              }
                            }}
                          >
                            Next Step
                          </Button>
                        ) : (
                          <Button
                            ml={4}
                            mt={5}
                            w="100%"
                            sx={{
                              opacity: ok3 ? 1 : 0.5,
                              borderRadius: "3px",
                              cursor: ok3 ? "pointer" : "default",
                              border: "1px solid #222326",
                              ":hover": { bg: "#f6f6f7" },
                              bg: "white",
                            }}
                            onClick={async () => {
                              const wait = ms =>
                                new Promise(res => setTimeout(() => res(), ms))
                              if (!ok3 || updatingArticle) return
                              if (await badWallet(t, address)) return
                              setUpdatingArticle(true)
                              let to = false
                              try {
                                let token = await fetch(
                                  "./atomic-asset.lua",
                                ).then(r => r.text())
                                token = token.replace(
                                  /\<NAME\>/g,
                                  title.replace(/'/g, "\\'"),
                                )
                                token = token.replace(/\<TICKER\>/g, "ATOMIC")
                                token = token.replace(/\<DENOMINATION\>/g, "1")
                                const prid = await getProfileId(address)
                                token = token.replace(
                                  /\<CREATOR\>/g,
                                  prid ?? address,
                                )
                                token = token.replace(
                                  /\<THUMBNAIL\>/g,
                                  thumbnail,
                                )
                                token = token.replace(/\<DESCRIPTION\>/g, desc)
                                const date = Date.now()
                                token = token.replace(/\<DATECREATED\>/g, date)

                                const note = new Note({
                                  wallet: window.arweaveWallet,
                                })
                                let tags = [
                                  tag("Title", title),
                                  tag("Description", desc),
                                  tag("Date-Created", Number(date).toString()),
                                  tag("Implements", "ANS-110"),
                                  tag(
                                    "License",
                                    "dE0rmDfl9_OWjkDznNEXHaSO_JohJkRolvMzaCroUdw",
                                  ),
                                  tag(
                                    "Currency",
                                    "xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQD6dh10",
                                  ),
                                  tag("Asset-Type", "Atomic-Note"),
                                ]
                                if (!/^\s*$/.test(thumbnail)) {
                                  tag("Thumbnail", thumbnail)
                                }
                                if (prid) tags.push(tag("Creator", prid))
                                tags.push(
                                  tag("Payment-Mode", paymentsMap[payment]),
                                )
                                if (payment === "single") {
                                  tags.push(tag("Payment-Address", recipient))
                                }
                                let _fraction = "1"
                                if (isFractional === "yes") {
                                  _fraction = Number(fraction).toString()
                                }
                                token = token.replace(/\<BALANCE\>/g, _fraction)
                                let _access = accessesMap[access]
                                if (access === "one-time")
                                  _access += "-" + accessFee
                                tags.push(tag("Access-Fee", _access))

                                let _derivations = allowsMap[derivations]
                                if (derivations === "allowed") {
                                  if (derivationTerm === "revenue") {
                                    _derivations += `-${dtMap[derivationTerm].split(" ").join("-")}-${derivationShare}`
                                  } else if (
                                    derivationTerm === "monthly" ||
                                    derivationTerm === "one-time"
                                  ) {
                                    _derivations += `-${dtMap[derivationTerm].split(" ").join("-")}-${derivationFee}`
                                  } else {
                                    _derivations += `-${dtMap[derivationTerm].split(" ").join("-")}-0`
                                  }
                                }
                                tags.push(tag("Derivations", _derivations))
                                let _commercial = allowsMap[commercial]
                                if (commercial === "allowed") {
                                  if (commercialTerm === "revenue") {
                                    _commercial += `-${ctMap[commercialTerm].split(" ").join("-")}-${commercialShare}`
                                  } else {
                                    _commercial += `-${ctMap[commercialTerm].split(" ").join("-")}-${commercialFee}`
                                  }
                                }
                                tags.push(tag("Commercial-Use", _commercial))
                                let _training = allowsMap[training]
                                if (training === "allowed") {
                                  _training += `-${ttMap[trainingTerm].split(" ").join("-")}-${trainingFee}`
                                }
                                tags.push(tag("Data-Model-Training", _training))
                                tags.push(
                                  tag(
                                    "Render-With",
                                    "yXXAop3Yxm8QlZRzP46oRxZjCBp88YTpoSTPlTr4TcQ",
                                  ),
                                )
                                const { error, pid } = await note.spawn(
                                  md,
                                  tags,
                                )
                                if (error) {
                                  err(t)
                                } else {
                                  await wait(5000)
                                  let data = await fetch(
                                    "./atomic-note.lua",
                                  ).then(r => r.text())
                                  data += "\n" + token
                                  const { error, res } = await note.eval(data)
                                  if (error) {
                                    err(t)
                                  } else {
                                    const { error: error1, res: res1 } =
                                      await note.allow()
                                    if (error1) {
                                      err(t)
                                    } else {
                                      const { error: error2, res: res2 } =
                                        await note.init()
                                      if (error2) {
                                        err(t)
                                      } else {
                                        let _notes =
                                          (await lf.getItem("notes")) ?? []
                                        _notes.unshift({
                                          id: pid,
                                          title: title,
                                          date,
                                        })
                                        await lf.setItem("notes", _notes)
                                        setNotes(_notes)
                                        to = true
                                        if (prid) {
                                          const { error: error3, res: res3 } =
                                            await note.add(prid)
                                        }
                                        if (pub !== "None") {
                                          const book = new Notebook({
                                            wallet: window.arweaveWallet,
                                            pid: pub,
                                          })
                                          const { res: res4, error: error4 } =
                                            await book.update(pid)
                                        }
                                        setTimeout(() => {
                                          setTab("Info")
                                          setUpdatingArticle(false)
                                          navigate(`/n/${pid}`)
                                          msg(t, "Note craeted!")
                                        }, 2000)
                                      }
                                    }
                                  }
                                }
                              } catch (e) {
                                console.log(e)
                                err(t)
                              }
                              setUpdatingArticle(to)
                            }}
                          >
                            {updatingArticle
                              ? circleNotch
                              : "Create New Atomic Note"}
                          </Button>
                        )}
                      </Flex>
                    </Box>
                  )}
                  {tab !== "Versions" ? null : (
                    <Box w="100%" flex={1}>
                      {map(v => {
                        return (
                          <>
                            <Flex
                              py={3}
                              px={6}
                              fontSize="16px"
                              align="center"
                              sx={{ borderBottom: "1px solid #ddd" }}
                            >
                              <Box as="u">v {v.version}</Box>
                              <Box
                                fontSize="14px"
                                as="span"
                                ml={4}
                                title={v.editor}
                              >
                                {v.editor ? (
                                  <Box as="span">
                                    by {v.editor.slice(0, 5)}...
                                    {v.editor.slice(-5)}
                                  </Box>
                                ) : null}
                              </Box>
                              <Box flex={1}></Box>
                              <Box mx={3} as="span" fontSize="14px">
                                {v.date
                                  ? dayjs(v.date).format("YYYY MM/DD HH:mm")
                                  : metadata?.["Date-Created"]
                                    ? dayjs(+metadata["Date-Created"]).format(
                                        "YYYY MM/DD HH:mm",
                                      )
                                    : ""}
                              </Box>
                              <Box fontSize="12px" as="span" ml={3}>
                                <Flex
                                  bg={
                                    (selectedVersion ?? currentVersion) ===
                                    v.version
                                      ? "#f0f0f0"
                                      : "white"
                                  }
                                  justify="center"
                                  px={2}
                                  py={1}
                                  sx={{
                                    borderRadius: "3px",
                                    cursor: "pointer",
                                    ":hover": { opacity: 0.5 },
                                    border: "1px solid #999",
                                  }}
                                  onClick={async () => {
                                    if (
                                      (selectedVersion ?? currentVersion) ===
                                      v.version
                                    ) {
                                      setTab("Info")
                                      setTab4("Main")
                                    } else {
                                      const note = new Note({
                                        wallet: window.arweaveWallet,
                                        pid,
                                      })
                                      const { error, res } = await note.get(
                                        v.version,
                                      )
                                      if (error) {
                                        err(t)
                                        return
                                      }
                                      setSelectedMD(await getHTML(res.data))
                                      setSelectedVersion(v.version)
                                      setTab("Info")
                                      setTab4("Main")
                                    }
                                    msg(
                                      t,
                                      `Version ${v.version} loaded!`,
                                      null,
                                      "info",
                                    )
                                  }}
                                >
                                  View
                                </Flex>
                              </Box>
                              <Box fontSize="12px" as="span" ml={3}>
                                <Flex
                                  bg={editTxid === v.txid ? "#f0f0f0" : "white"}
                                  justify="center"
                                  px={2}
                                  py={1}
                                  sx={{
                                    borderRadius: "3px",
                                    cursor: "pointer",
                                    ":hover": { opacity: 0.5 },
                                    border: "1px solid #999",
                                  }}
                                  onClick={async () => {
                                    const note = new Note({
                                      wallet: window.arweaveWallet,
                                      pid,
                                    })
                                    const { error, res } = await note.get(
                                      v.version,
                                    )
                                    if (error) {
                                      err(t)
                                      return
                                    }
                                    setTab2("Markdown")
                                    ref.current?.setMarkdown("")
                                    setChanged(false)
                                    setEditorInit(false)
                                    ref.current?.setMarkdown(res.data)
                                    setDraftID(Date.now())
                                    setMD(res.data)
                                    setTab("Editor")
                                    msg(t, "New draft created!", null, "info")
                                  }}
                                >
                                  Edit
                                </Flex>
                              </Box>
                            </Flex>
                          </>
                        )
                      })(versions)}
                    </Box>
                  )}
                  {tab !== "Notes" ? null : (
                    <Box w="100%" flex={1}>
                      {map(v => {
                        return (
                          <>
                            <Flex
                              w="100%"
                              py={2}
                              px={6}
                              fontSize="16px"
                              align="center"
                            >
                              <Link to={`/atomic-note/${v.id}`}>
                                <Box
                                  as="u"
                                  onClick={() => setTab("Info")}
                                  sx={{ textDecoration: "underline" }}
                                >
                                  {v.title}
                                </Box>
                              </Link>
                              <Box flex={1} />
                              <Box
                                as="span"
                                onClick={() => setTab("Info")}
                                fontSize="14px"
                              >
                                {dayjs(v.date).format("MM/DD HH:mm")}
                              </Box>
                              <Box fontSize="12px" as="span" ml={4}>
                                <Flex
                                  bg={editTxid === v.txid ? "#f0f0f0" : "white"}
                                  justify="center"
                                  px={2}
                                  py={1}
                                  sx={{
                                    borderRadius: "3px",
                                    cursor: "pointer",
                                    ":hover": { opacity: 0.5 },
                                    border: "1px solid #999",
                                  }}
                                  onClick={async () => {
                                    if (
                                      confirm(
                                        `Would you like to remove the note from your local list?`,
                                      )
                                    ) {
                                      const _notes = filter(
                                        v2 => v2.id !== v.id,
                                      )(notes)
                                      setNotes(_notes)
                                      await lf.setItem("notes", _notes)
                                    }
                                  }}
                                >
                                  Remove
                                </Flex>
                              </Box>
                            </Flex>
                          </>
                        )
                      })(notes)}
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
                  {tab !== "Drafts" ? null : (
                    <Box w="100%" flex={1}>
                      <Flex justify="center" fontSize="12px" mb={4}>
                        <i>
                          Drafts are only stored on your local computer.
                          Download MD files if you need access from other
                          environments.
                        </i>
                      </Flex>
                      {map(v => {
                        return (
                          <>
                            <Flex
                              py={3}
                              px={6}
                              fontSize="16px"
                              align="center"
                              sx={{ borderTop: "1px solid #ddd" }}
                            >
                              <Box as="u">
                                {v.title ?? ""}#{v.draftID}
                              </Box>
                              <Box flex={1}></Box>
                              <Box mx={3} as="span" fontSize="14px">
                                updated {dayjs(v.update).format("MM/DD HH:mm")}
                              </Box>
                              <Box fontSize="12px" as="span">
                                <Flex
                                  bg={editTxid === v.txid ? "#f0f0f0" : "white"}
                                  justify="center"
                                  px={2}
                                  py={1}
                                  sx={{
                                    borderRadius: "3px",
                                    cursor: "pointer",
                                    ":hover": { opacity: 0.5 },
                                    border: "1px solid #999",
                                  }}
                                  onClick={async () => {
                                    const _draft = await lf.getItem(
                                      "draft-" + v.draftID,
                                    )
                                    if (_draft) {
                                      if (_draft.txid) setEditTxid(_draft.txid)
                                      if (_draft.title)
                                        setEditTitle(_draft.title)
                                      if (_draft.id) setEditID(_draft.id)
                                      setMD("")
                                      ref.current?.setMarkdown("")
                                      setChanged(_draft.changed)
                                      setEditorInit(false)
                                      setTab2("Markdown")
                                      setTimeout(() => {
                                        ref.current?.setMarkdown(_draft.body)
                                        setDraftID(_draft.draftID)
                                        setMD(_draft.body)
                                        setTab("Editor")
                                      }, 0)
                                    }
                                  }}
                                >
                                  Edit
                                </Flex>
                              </Box>
                              <Box fontSize="12px" as="span" ml={3}>
                                <Flex
                                  justify="center"
                                  px={2}
                                  py={1}
                                  sx={{
                                    borderRadius: "3px",
                                    cursor: "pointer",
                                    ":hover": { opacity: 0.5 },
                                    border: "1px solid #999",
                                  }}
                                  onClick={async () => {
                                    if (
                                      !confirm("Would you like to delete it?")
                                    ) {
                                      return
                                    }
                                    let _drafts = []
                                    for (let v2 of drafts) {
                                      if (v.draftID !== v2.draftID)
                                        _drafts.push(v2)
                                    }
                                    setDrafts(_drafts)
                                    await lf.setItem(`drafts-${pid}`, _drafts)
                                    await lf.removeItem("draft-" + v.draftID)
                                    msg(t, "Draft Deleted!")
                                  }}
                                >
                                  Delete
                                </Flex>
                              </Box>
                            </Flex>
                          </>
                        )
                      })(drafts)}
                    </Box>
                  )}
                </Flex>
              </Flex>
            </>
          </Flex>
        </>
      )}
    </>
  )
}

export default AtomicNote
