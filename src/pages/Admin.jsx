import { useState, useEffect, useRef } from "react"
import lf from "localforage"
import Arweave from "arweave"
import "@mdxeditor/editor/style.css"
import "../github-markdown.css"
import markdownIt from "markdown-it"
import { toHtml } from "hast-util-to-html"
import { common, createStarryNight } from "@wooorm/starry-night"
import { Input, Flex, Box, Image } from "@chakra-ui/react"
import { useParams } from "react-router-dom"
import { Link } from "react-router-dom"
import { map, clone, sortBy, o, reverse } from "ramda"
import dayjs from "dayjs"
import tomo from "/tomo.png"
import {
  createDataItemSigner,
  message,
  dryrun,
  result,
} from "@permaweb/aoconnect"

import { defaultProfile, getProfile, getArticles, ao } from "../lib/utils"
import {
  diffSourcePlugin,
  MDXEditor,
  DiffSourceToggleWrapper,
} from "@mdxeditor/editor"

const allPlugins = diffMarkdown => [
  diffSourcePlugin({ viewMode: "source", diffMarkdown }),
]
const getOwner = async () => {
  const query = `query {
    transactions(ids: ["${import.meta.env.VITE_PROCESS_ID}"]) {
        edges {
            node {
                id
                owner { address }
            }
        }
    }
}`
  const res = await fetch("https://arweave.net/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  }).then(r => r.json())
  return res?.data?.transactions?.edges?.[0].node?.owner?.address ?? null
}
const limit = 10

function Admin(a) {
  const ref = useRef(null)
  const [uploadingArweave, setUploadingArweave] = useState(false)
  const [updatingArticle, setUpdatingArticle] = useState(false)
  const [updatingProf, setUpdatingProf] = useState(false)
  const [editorInit, setEditorInit] = useState(false)
  const [address, setAddress] = useState(null)
  const [editTitle, setEditTitle] = useState(null)
  const [editID, setEditID] = useState(null)
  const [editTxid, setEditTxid] = useState(null)
  const [addTxid, setAddTxid] = useState(null)
  const [md, setMD] = useState("")
  const [preview, setPreview] = useState("")
  const [articles, setArticles] = useState([])
  const [title, setTitle] = useState("")
  const [id, setId] = useState("")
  const [txid, setTxid] = useState("")
  const [profile, setProfile] = useState(null)
  const [tab, setTab] = useState("Add")
  const [tab2, setTab2] = useState("Markdown")
  const [update, setUpdate] = useState(null)
  const tabs = ["Add", "Articles", "Drafts", "Editor", "Profile"]
  const tabs2 = ["Markdown", "Preview"]
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [image, setImage] = useState("")
  const [cover, setCover] = useState("")
  const [x, setX] = useState("")
  const [github, setGithub] = useState("")
  const [next, setNext] = useState(false)
  const [count, setCount] = useState(0)
  const [skip, setSkip] = useState(0)
  const [changed, setChanged] = useState(false)
  const [draftID, setDraftID] = useState(null)
  const [drafts, setDrafts] = useState([])

  useEffect(() => {
    ;(async () => {
      const _drafts = (await lf.getItem("drafts")) ?? []
      setDrafts(_drafts)
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      const userAddress = await lf.getItem("address")
      if (userAddress) {
        const owner = await getOwner()
        if (owner === userAddress) setAddress(userAddress)
      }
    })()
  }, [])

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
      } catch (e) {
        console.log(e)
      }
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      const _draft = await lf.getItem("draft")
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
  }, [])

  useEffect(() => {
    ;(async () => {
      if (tab2 === "Preview") {
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
          const html = markdownItInstance.render(md)
          setPreview(html)
        } catch (e) {
          console.log(e)
        }
      }
    })()
  }, [tab2])

  useEffect(() => {
    ;(async () => {
      try {
        const _profile = await getProfile()
        setProfile(_profile)
        if (_profile) {
          if (_profile.name) setName(_profile.name)
          if (_profile.description) setDescription(_profile.description)
          if (_profile.image) setImage(_profile.image)
          if (_profile.cover) setCover(_profile.cover)
          if (_profile.x) setX(_profile.x)
          if (_profile.github) setGithub(_profile.github)
        }
      } catch (e) {
        console.log(e)
      }
    })()
  }, [])

  const ok =
    !/^\s*$/.test(title) &&
    !/^\s*$/.test(id) &&
    !/^\s*$/.test(txid) &&
    txid.length === 43

  const ok_profile = !/^\s*$/.test(name)
  const _profile = defaultProfile(profile)
  return (
    <Flex minH="100%" direction="column">
      <Flex justify="center" sx={{ borderBottom: "1px solid #ddd" }} mb={4}>
        <Flex
          maxW="830px"
          width="100%"
          align="center"
          height="50px"
          fontSize="14px"
        >
          <Flex align="center">
            <Image src={ao} mr={2} />
            <Box
              fontSize="12px"
              as="a"
              target="_blank"
              href={`https://www.ao.link/#/entity/${import.meta.env.VITE_PROCESS_ID}`}
            >
              {import.meta.env.VITE_PROCESS_ID.slice(0, 10)}...
              {import.meta.env.VITE_PROCESS_ID.slice(-10)}
            </Box>
          </Flex>
          <Box flex={1} />
          {address ? (
            <>
              <Box
                fontSize="12px"
                mx={4}
                my={1}
                sx={{
                  cursor: "pointer",
                  ":hover": { opacity: 0.75 },
                }}
                onClick={async () => {
                  setAddress(null)
                  await lf.removeItem("address")
                }}
              >
                Sign Out
              </Box>
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
            </>
          ) : (
            <Box
              fontSize="12px"
              px={4}
              py={1}
              href={`https://www.ao.link/#/entity/${import.meta.env.VITE_PROCESS_ID}`}
              sx={{
                cursor: "pointer",
                ":hover": { opacity: 0.75 },
                borderRadius: "3px",
                border: "1px solid #999",
              }}
              onClick={async () => {
                await window.arweaveWallet.connect([
                  "ACCESS_ADDRESS",
                  "SIGN_TRANSACTION",
                ])
                const userAddress =
                  await window.arweaveWallet.getActiveAddress()
                if (userAddress) {
                  const owner = await getOwner()
                  if (!owner) {
                    alert("AO process not found.")
                  } else if (owner === userAddress) {
                    setAddress(userAddress)
                    await lf.setItem("address", userAddress)
                  } else {
                    alert("You are not the owner of the AO process.")
                  }
                }
              }}
            >
              Connect Wallet
            </Box>
          )}
        </Flex>
      </Flex>
      {!address ? (
        <Flex mb={4} justify="center">
          <Flex
            maxW="830px"
            width="100%"
            justify="center"
            align="center"
            height="calc(100vh - 145px)"
          >
            <Box as="i" className="fas fa-exclamation" mr={2} />
            Connect AO Process Owner Wallet
          </Flex>
        </Flex>
      ) : (
        <>
          <Flex mb={4} justify="center">
            <Flex maxW="830px" width="100%">
              {map(v => {
                return (
                  <Flex
                    fontSize="14px"
                    w="75px"
                    mr={4}
                    bg={tab === v ? "#f0f0f0" : "white"}
                    justify="center"
                    px={4}
                    py={1}
                    sx={{
                      borderRadius: "3px",
                      cursor: "pointer",
                      ":hover": { opacity: 0.5 },
                      border: "1px solid #999",
                    }}
                    onClick={() => {
                      if (v === "Drafts") {
                        setDrafts(
                          o(
                            reverse,
                            sortBy(v => v.update),
                          )(drafts),
                        )
                      }
                      setTab(v)
                    }}
                  >
                    {update !== null && v === "Add" ? "Update" : v}
                  </Flex>
                )
              })(tabs)}
              <Flex flex={1} />
            </Flex>
          </Flex>
          {tab !== "Editor" ? null : (
            <>
              <Flex mb={4} justify="center">
                <Flex maxW="830px" width="100%">
                  {map(v => (
                    <Flex
                      fontSize="12px"
                      ml={4}
                      justify="center"
                      sx={{
                        borderRadius: "3px",
                        cursor: "pointer",
                        ":hover": { opacity: 0.5 },
                        textDecoration: tab2 === v ? "underline" : "",
                        fontWeight: tab2 === v ? "bold" : "",
                      }}
                      onClick={() => setTab2(v)}
                    >
                      {v}
                    </Flex>
                  ))(tabs2)}
                  <Box flex={1} />
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
                    }}
                  >
                    Download MD
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
                      if (uploadingArweave) return
                      setUploadingArweave(true)
                      try {
                        const arweave = Arweave.init({})
                        const transaction = await arweave.createTransaction({
                          data: md,
                        })
                        transaction.addTag("Content-Type", "text/markdown")
                        await window.arweaveWallet.connect(["SIGN_TRANSACTION"])
                        await arweave.transactions.sign(transaction)
                        const response =
                          await arweave.transactions.post(transaction)
                        if (response.status === 200) {
                          setEditTxid(transaction.id)
                          setChanged(false)
                          const _draft = {
                            title: editTitle,
                            txid: transaction.id,
                            id: editID,
                            body: md,
                            changed: false,
                            draftID,
                          }
                          await lf.setItem("draft", _draft)
                          await lf.setItem("draft-" + draftID, _draft)
                          let _drafts = []
                          for (let v of drafts) {
                            if (v.draftID !== draftID) _drafts.push(v)
                          }
                          await lf.setItem("drafts", _drafts)
                        } else {
                          alert("File upload failed.")
                        }
                      } catch (e) {}
                      setUploadingArweave(false)
                    }}
                  >
                    Upload to Arweave
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
                        setTab("Add")
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
                        setTab2("Markdown")
                        ref.current?.setMarkdown("")
                        setMD("")
                        setEditTitle("")
                        setEditID("")
                        setEditTxid("")
                        setDraftID(Date.now())
                      }
                    }}
                  >
                    Reset
                  </Flex>
                </Flex>
              </Flex>
              <Flex mb={4} justify="center">
                <Flex
                  align="center"
                  maxW="830px"
                  width="100%"
                  fontSize="12px"
                  bg="#f0f0f0"
                  py={2}
                  px={4}
                  sx={{ borderRadius: "3px" }}
                >
                  {editTxid ? (
                    <Flex w="100%" align="center">
                      {!editTitle ? null : (
                        <Box as="b" mr={4}>
                          {editTitle}
                        </Box>
                      )}
                      <Box as="span" mr={4}>
                        Draft ID: {draftID}
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
                      {uploadingArweave ? (
                        <>
                          <Box
                            as="i"
                            className={"fas fa-circle-notch fa-spin"}
                            mr={2}
                          />
                          uploading to Arweave...
                        </>
                      ) : (
                        <Box
                          as="a"
                          target="_blank"
                          href={`https://arweave.net/${editTxid}`}
                          sx={{ textDecoration: "underline" }}
                        >
                          {editTxid.slice(0, 5)}...{editTxid.slice(-5)}
                        </Box>
                      )}
                    </Flex>
                  ) : (
                    <Flex w="100%" align="center">
                      <Box as="span" mr={4}>
                        Draft ID: {draftID}
                      </Box>
                      <Box flex={1}></Box>
                      {uploadingArweave ? (
                        <>
                          <Box
                            as="i"
                            className={"fas fa-circle-notch fa-spin"}
                            mr={2}
                          />
                          uploading to Arweave...
                        </>
                      ) : (
                        <Box>Not Uploaded to Arweave Yet</Box>
                      )}
                    </Flex>
                  )}
                </Flex>
              </Flex>
            </>
          )}
          <Flex justify="center" flex={1}>
            <Flex direction="column" h="100%" w="100%" maxW="830px">
              {tab !== "Profile" ? null : (
                <Box w="100%" flex={1}>
                  <Box
                    p={6}
                    fontSize="12px"
                    bg="#f0f0f0"
                    sx={{ borderRadius: "10px" }}
                  >
                    <Box mb={4}>
                      <Box mb={2}>Name</Box>
                      <Input
                        bg="white"
                        value={name}
                        sx={{ border: "1px solid #999" }}
                        onChange={e => setName(e.target.value)}
                      />
                    </Box>
                    <Box mb={4}>
                      <Box mb={2}>Description</Box>
                      <Input
                        bg="white"
                        value={description}
                        sx={{ border: "1px solid #999" }}
                        onChange={e => setDescription(e.target.value)}
                      />
                    </Box>
                    <Box mb={4}>
                      <Box mb={2}>Image</Box>
                      <Input
                        bg="white"
                        value={image}
                        sx={{ border: "1px solid #999" }}
                        onChange={e => setImage(e.target.value)}
                      />
                    </Box>
                    <Box mb={4}>
                      <Box mb={2}>Cover</Box>
                      <Input
                        bg="white"
                        value={cover}
                        sx={{ border: "1px solid #999" }}
                        onChange={e => setCover(e.target.value)}
                      />
                    </Box>
                    <Flex>
                      <Box mb={4} mr={2} flex={1}>
                        <Box mb={2}>Twitter / X</Box>
                        <Input
                          value={x}
                          bg="white"
                          sx={{ border: "1px solid #999" }}
                          onChange={e => setX(e.target.value)}
                        />
                      </Box>
                      <Box mb={4} ml={2} flex={1}>
                        <Box mb={2}>Github</Box>
                        <Input
                          value={github}
                          bg="white"
                          sx={{ border: "1px solid #999" }}
                          onChange={e => setGithub(e.target.value)}
                        />
                      </Box>
                    </Flex>
                    <Flex
                      align="center"
                      height="35px"
                      fontSize="14px"
                      justify="center"
                      px={4}
                      py={2}
                      sx={{
                        opacity: ok_profile ? 1 : 0.5,
                        borderRadius: "3px",
                        cursor: ok_profile ? "pointer" : "default",
                        ":hover": { opacity: 0.75 },
                        border: "1px solid #999",
                        bg: "white",
                      }}
                      onClick={async () => {
                        if (!ok_profile || updatingProf) return
                        try {
                          setUpdatingProf(true)
                          await window.arweaveWallet.connect([
                            "ACCESS_ADDRESS",
                            "SIGN_TRANSACTION",
                          ])
                          let tags = [
                            { name: "Action", value: "Set-Profile" },
                            { name: "name", value: name },
                          ]
                          if (!/^\s*$/.test(description)) {
                            tags.push({
                              name: "description",
                              value: description,
                            })
                          }
                          if (!/^\s*$/.test(image)) {
                            tags.push({ name: "image", value: image })
                          }
                          if (!/^\s*$/.test(cover)) {
                            tags.push({ name: "cover", value: cover })
                          }
                          if (!/^\s*$/.test(x)) {
                            tags.push({ name: "x", value: x })
                          }
                          if (!/^\s*$/.test(github)) {
                            tags.push({ name: "github", value: github })
                          }
                          const messageId = await message({
                            process: import.meta.env.VITE_PROCESS_ID,
                            signer: createDataItemSigner(window.arweaveWallet),
                            tags,
                          })
                          const res = await result({
                            message: messageId,
                            process: import.meta.env.VITE_PROCESS_ID,
                          })
                          if (res.Messages[0]) {
                            const _profile = await getProfile()
                            setProfile(_profile)
                          } else {
                            console.log(res)
                            alert("something went wrong!")
                          }
                        } catch (e) {}
                        setUpdatingProf(false)
                      }}
                    >
                      {updatingProf ? (
                        <Box as="i" className={"fas fa-circle-notch fa-spin"} />
                      ) : (
                        "Update Profile"
                      )}
                    </Flex>
                  </Box>
                </Box>
              )}
              {tab !== "Editor" ? null : (
                <Box
                  mb={2}
                  height={tab2 === "Preview" ? "" : "calc(100vh - 275px)"}
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
                        if (editorInit && v !== "" && md !== "" && md !== v) {
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
                        await lf.setItem("draft", _draft)
                        await lf.setItem("draft-" + draftID, _draft)
                        let _drafts = [
                          { draftID, update: Date.now(), title: editTitle },
                        ]
                        for (let v of drafts) {
                          if (v.draftID !== draftID) _drafts.push(v)
                        }
                        setDrafts(_drafts)
                        await lf.setItem("drafts", _drafts)
                      }}
                    />
                  )}
                </Box>
              )}
              {tab !== "Add" ? null : (
                <Box w="100%" flex={1}>
                  <Box
                    p={6}
                    fontSize="12px"
                    bg="#f0f0f0"
                    sx={{ borderRadius: "10px" }}
                  >
                    <Flex
                      justify="flex-end"
                      mt="-10px"
                      sx={{
                        cursor: "pointer",
                        ":hover": { opacity: 0.75 },
                      }}
                      onClick={() => {
                        setUpdate(null)
                        setAddTxid(null)
                        setTitle("")
                        setId("")
                        setTxid("")
                      }}
                    >
                      Clear
                    </Flex>
                    <Box mb={4}>
                      <Box mb={2}>Title</Box>
                      <Input
                        bg="white"
                        value={title}
                        sx={{ border: "1px solid #999" }}
                        onChange={e => setTitle(e.target.value)}
                      />
                    </Box>
                    <Flex>
                      <Box mb={4} mr={2}>
                        <Box mb={2}>Page ID</Box>
                        <Input
                          disabled={update === null ? "" : true}
                          value={id}
                          bg="white"
                          sx={{ border: "1px solid #999" }}
                          onChange={e => setId(e.target.value)}
                        />
                      </Box>
                      <Box mb={4} flex={1} ml={2}>
                        <Box mb={2}>Markdown Arweave TxID</Box>
                        <Input
                          disabled={addTxid === null ? "" : true}
                          value={txid}
                          bg="white"
                          sx={{ border: "1px solid #999" }}
                          onChange={e => setTxid(e.target.value)}
                        />
                      </Box>
                    </Flex>
                    <Flex
                      fontSize="14px"
                      height="35px"
                      align="center"
                      justify="center"
                      px={4}
                      py={2}
                      sx={{
                        opacity: ok ? 1 : 0.5,
                        borderRadius: "3px",
                        cursor: ok ? "pointer" : "default",
                        ":hover": { opacity: 0.75 },
                        border: "1px solid #999",
                        bg: "white",
                      }}
                      onClick={async () => {
                        if (!ok || updatingArticle) return
                        setUpdatingArticle(true)
                        try {
                          let text = null
                          try {
                            const r = await fetch(`https://arweave.net/${txid}`)
                            if (r.status === 200) text = await r.text()
                          } catch (e) {
                            console.log(e)
                          }
                          if (text === null) {
                            alert("Markdown File coundn't be found")
                            return
                          }
                          await window.arweaveWallet.connect([
                            "ACCESS_ADDRESS",
                            "SIGN_TRANSACTION",
                          ])
                          const date = Date.now().toString()
                          let tags = [
                            {
                              name: "Action",
                              value: update === null ? "Add" : "Update",
                            },
                            { name: "title", value: title },
                            { name: "id", value: id },
                            { name: "txid", value: txid },
                            { name: "date", value: date },
                          ]
                          const messageId = await message({
                            process: import.meta.env.VITE_PROCESS_ID,
                            signer: createDataItemSigner(window.arweaveWallet),
                            tags,
                          })
                          const res = await result({
                            message: messageId,
                            process: import.meta.env.VITE_PROCESS_ID,
                          })
                          if (res.Messages[0]) {
                            const article = { id, txid, title, date }
                            if (update === null) {
                              setSkip(skip + 1)
                              setArticles([article, ...articles])
                              if (txid === editTxid) {
                                if (editID === "") setEditID(id)
                                setEditTitle(title)
                                const draft = {
                                  title,
                                  txid,
                                  id,
                                  body: md,
                                  draftID,
                                  update: Date.now(),
                                }
                                await lf.setItem("draft", draft)
                                await lf.setItem("draft-" + draftID, draft)
                                let _drafts = []
                                for (let v of drafts) {
                                  if (v.draftID === draftID) v.title = title
                                  _drafts.push(v)
                                }
                                await setDrafts(_drafts)
                                await lf.setItem("drafts", _drafts)
                              }
                            } else {
                              let _articles = clone(articles)
                              let i = 0
                              for (let v of _articles) {
                                if (v.id === id) {
                                  _articles[i] = article
                                  break
                                }
                                i++
                              }
                              setArticles(_articles)
                            }

                            setTitle("")
                            setId("")
                            setTxid("")
                            setUpdate(null)
                            setAddTxid(null)
                            setTab("Articles")
                          } else {
                            console.log(res)
                            alert("something went wrong!")
                          }
                        } catch (e) {}
                        setUpdatingArticle(false)
                      }}
                    >
                      {updatingArticle ? (
                        <Box as="i" className={"fas fa-circle-notch fa-spin"} />
                      ) : update === null ? (
                        "Add New Article"
                      ) : (
                        "Update Article"
                      )}
                    </Flex>
                  </Box>
                </Box>
              )}
              {tab !== "Articles" ? null : (
                <Box w="100%" flex={1}>
                  {map(v => {
                    return (
                      <>
                        <Flex py={2} px={6} fontSize="16px" align="center">
                          <Box as="u">{v.title}</Box>
                          <Box flex={1}></Box>
                          <Box mx={3} as="span" fontSize="14px">
                            {dayjs(v.date).format("YYYY MM/DD HH:mm")}
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
                                setEditTxid(v.txid)
                                setEditTitle(v.title)
                                setEditID(v.id)
                                setTab2("Markdown")
                                setMD("")
                                ref.current?.setMarkdown("")
                                setChanged(false)
                                setEditorInit(false)
                                const text = await fetch(
                                  `https://arweave.net/${v.txid}`,
                                ).then(r => r.text())
                                ref.current?.setMarkdown(text)
                                setDraftID(Date.now())
                                setMD(text)
                                setTab("Editor")
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
                                if (!confirm("Would you like to delete it?")) {
                                  return
                                }
                                await window.arweaveWallet.connect([
                                  "ACCESS_ADDRESS",
                                  "SIGN_TRANSACTION",
                                ])
                                const tags = [
                                  { name: "Action", value: "Delete" },
                                  { name: "id", value: v.id },
                                ]
                                const messageId = await message({
                                  process: import.meta.env.VITE_PROCESS_ID,
                                  signer: createDataItemSigner(
                                    window.arweaveWallet,
                                  ),
                                  tags,
                                })
                                let res = await result({
                                  message: messageId,
                                  process: import.meta.env.VITE_PROCESS_ID,
                                })
                                if (res.Messages[0]) {
                                  let _articles = []
                                  for (let v2 of articles) {
                                    if (v.id !== v2.id) _articles.push(v2)
                                  }
                                  setSkip(skip - 1)
                                  setArticles(_articles)
                                } else {
                                  console.log(res)
                                  alert("something went wrong!")
                                }
                              }}
                            >
                              Delete
                            </Flex>
                          </Box>
                        </Flex>
                      </>
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
              {tab !== "Drafts" ? null : (
                <Box w="100%" flex={1}>
                  <Flex justify="center" fontSize="12px">
                    <i>
                      Drafts are only stored on your local computer. Download MD
                      files if you need access from other environments.
                    </i>
                  </Flex>
                  {map(v => {
                    return (
                      <>
                        <Flex py={2} px={6} fontSize="16px" align="center">
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
                                  if (_draft.title) setEditTitle(_draft.title)
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
                                if (!confirm("Would you like to delete it?")) {
                                  return
                                }
                                let _drafts = []
                                for (let v2 of drafts) {
                                  if (v.draftID !== v2.draftID) _drafts.push(v2)
                                }
                                setDrafts(_drafts)
                                await lf.setItem("drafts", _drafts)
                                await lf.removeItem("draft-" + v.draftID)
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
      )}
      <Flex direction="column" align="center">
        <Flex
          maxW="830px"
          align="center"
          justify="center"
          sx={{ borderTop: "1px solid #ddd" }}
          p={4}
          width="100%"
        >
          <Link to="/">
            <Flex>
              <Flex justify="center" mr={2}>
                <Image
                  src={_profile.image}
                  boxSize="25px"
                  sx={{ borderRadius: "50%" }}
                />
              </Flex>
              <Box>
                <Box>{_profile.name}</Box>
              </Box>
            </Flex>
          </Link>
        </Flex>
      </Flex>
    </Flex>
  )
}

export default Admin
