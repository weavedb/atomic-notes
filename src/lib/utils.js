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
const ao =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMTEuOTciIHZpZXdCb3g9IjAgMCA0MjkgMjE0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMCAyMTRINzEuMzc2M0w4NS45NDI5IDE3NC42MUw1My4xNjgxIDEwNy41TDAgMjE0WiIgZmlsbD0iYmxhY2siLz4KPHBhdGggZD0iTTE4OS4zNjYgMTYwLjc1TDEwOS45NzggMUw4NS45NDI5IDU1LjcwODlMMTYwLjk2MSAyMTRIMjE1TDE4OS4zNjYgMTYwLjc1WiIgZmlsbD0iYmxhY2siLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0zMjIgMjE0QzM4MS4wOTQgMjE0IDQyOSAxNjYuMDk0IDQyOSAxMDdDNDI5IDQ3LjkwNTUgMzgxLjA5NCAwIDMyMiAwQzI2Mi45MDYgMCAyMTUgNDcuOTA1NSAyMTUgMTA3QzIxNSAxNjYuMDk0IDI2Mi45MDYgMjE0IDMyMiAyMTRaTTMyMiAxNzJDMzU3Ljg5OSAxNzIgMzg3IDE0Mi44OTkgMzg3IDEwN0MzODcgNzEuMTAxNSAzNTcuODk5IDQyIDMyMiA0MkMyODYuMTAxIDQyIDI1NyA3MS4xMDE1IDI1NyAxMDdDMjU3IDE0Mi44OTkgMjg2LjEwMSAxNzIgMzIyIDE3MloiIGZpbGw9ImJsYWNrIi8+Cjwvc3ZnPg=="

export { getArticles, getProfile, defaultProfile, ao }
