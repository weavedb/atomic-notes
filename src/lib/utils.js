import { dryrun } from "@permaweb/aoconnect"

const getArticles = async () => {
  const result = await dryrun({
    process: import.meta.env.VITE_PROCESS_ID,
    tags: [{ name: "Action", value: "List" }],
  })
  return JSON.parse(result.Messages[0].Tags[6].value)
}
const getProfile = async () => {
  const result = await dryrun({
    process: import.meta.env.VITE_PROCESS_ID,
    tags: [{ name: "Action", value: "Get-Profile" }],
  })
  return JSON.parse(result.Messages[0].Tags[6].value)
}

const defaultProfile = profile => {
  return (
    profile ?? {
      name: import.meta.env.VITE_PROFILE_NAME ?? "John Doe",
      description:
        import.meta.env.VITE_PROFILE_DESCRIPTION ?? "Set up your profile",
      image: import.meta.env.VITE_PROFILE_IMAGE ?? "https://picsum.photos/200",
      x: import.meta.env.VITE_PROFILE_X ?? null,
      github: import.meta.env.VITE_PROFILE_GITHUB ?? null,
    }
  )
}
export { getArticles, getProfile, defaultProfile }
