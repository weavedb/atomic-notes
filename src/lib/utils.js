import { dryrun } from "@permaweb/aoconnect"

const getArticles = async ({ limit, skip } = {}) => {
  let tags = [{ name: "Action", value: "List" }]
  if (limit) tags.push({ name: "limit", value: limit.toString() })
  if (skip) tags.push({ name: "skip", value: skip.toString() })
  const result = await dryrun({
    process: import.meta.env.VITE_PROCESS_ID,
    tags,
  })
  return {
    articles: JSON.parse(result.Messages[0].Tags[6].value),
    next: JSON.parse(result.Messages[0].Tags[7].value),
    count: JSON.parse(result.Messages[0].Tags[8].value),
  }
}

const getProfile = async () => {
  const result = await dryrun({
    process: import.meta.env.VITE_PROCESS_ID,
    tags: [{ name: "Action", value: "Get-Profile" }],
  })
  return JSON.parse(result.Messages[0].Tags[6].value)
}

const ao =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMTEuOTciIHZpZXdCb3g9IjAgMCA0MjkgMjE0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMCAyMTRINzEuMzc2M0w4NS45NDI5IDE3NC42MUw1My4xNjgxIDEwNy41TDAgMjE0WiIgZmlsbD0iYmxhY2siLz4KPHBhdGggZD0iTTE4OS4zNjYgMTYwLjc1TDEwOS45NzggMUw4NS45NDI5IDU1LjcwODlMMTYwLjk2MSAyMTRIMjE1TDE4OS4zNjYgMTYwLjc1WiIgZmlsbD0iYmxhY2siLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0zMjIgMjE0QzM4MS4wOTQgMjE0IDQyOSAxNjYuMDk0IDQyOSAxMDdDNDI5IDQ3LjkwNTUgMzgxLjA5NCAwIDMyMiAwQzI2Mi45MDYgMCAyMTUgNDcuOTA1NSAyMTUgMTA3QzIxNSAxNjYuMDk0IDI2Mi45MDYgMjE0IDMyMiAyMTRaTTMyMiAxNzJDMzU3Ljg5OSAxNzIgMzg3IDE0Mi44OTkgMzg3IDEwN0MzODcgNzEuMTAxNSAzNTcuODk5IDQyIDMyMiA0MkMyODYuMTAxIDQyIDI1NyA3MS4xMDE1IDI1NyAxMDdDMjU3IDE0Mi44OTkgMjg2LjEwMSAxNzIgMzIyIDE3MloiIGZpbGw9ImJsYWNrIi8+Cjwvc3ZnPg=="

const arweave_logo =
  "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI0LjEuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAxMzQuOSAxMzUuNCIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMTM0LjkgMTM1LjQ7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbDojMjIyMzI2O30KCS5zdDF7ZmlsbDpub25lO3N0cm9rZTojMjIyMzI2O3N0cm9rZS13aWR0aDo5LjY1MjE7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fQo8L3N0eWxlPgo8Zz4KCTxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik03Ny42LDkxLjVjLTAuMy0wLjYtMC42LTEuMy0wLjgtMi4xYy0wLjItMC44LTAuNC0xLjYtMC41LTIuNWMtMC43LDAuOC0xLjUsMS41LTIuNCwyLjIKCQljLTAuOSwwLjctMS45LDEuMy0zLDEuOGMtMS4xLDAuNS0yLjMsMC45LTMuNywxLjJjLTEuMywwLjMtMi44LDAuNC00LjQsMC40Yy0yLjUsMC00LjktMC40LTctMS4xYy0yLjEtMC43LTMuOS0xLjgtNS41LTMuMQoJCWMtMS41LTEuMy0yLjctMi45LTMuNi00LjdjLTAuOS0xLjgtMS4zLTMuOC0xLjMtNS45YzAtNS4yLDEuOS05LjMsNS44LTEyLjFjMy45LTIuOSw5LjctNC4zLDE3LjQtNC4zaDcuMXYtMi45CgkJYzAtMi40LTAuOC00LjMtMi4zLTUuN2MtMS42LTEuNC0zLjgtMi4xLTYuNy0yLjFjLTIuNiwwLTQuNSwwLjYtNS43LDEuN2MtMS4yLDEuMS0xLjgsMi42LTEuOCw0LjVINDYuNWMwLTIuMSwwLjUtNC4xLDEuNC02CgkJYzAuOS0xLjksMi4zLTMuNiw0LjEtNWMxLjgtMS40LDQtMi42LDYuNi0zLjRjMi42LTAuOCw1LjUtMS4zLDguOS0xLjNjMywwLDUuOCwwLjQsOC40LDEuMWMyLjYsMC43LDQuOCwxLjgsNi43LDMuMwoJCWMxLjksMS40LDMuNCwzLjIsNC40LDUuNGMxLjEsMi4yLDEuNiw0LjcsMS42LDcuNnYyMS4zYzAsMi43LDAuMiw0LjksMC41LDYuNmMwLjMsMS43LDAuOCwzLjIsMS41LDQuNXYwLjhINzcuNnogTTY1LjUsODIuNgoJCWMxLjMsMCwyLjUtMC4yLDMuNi0wLjVjMS4xLTAuMywyLjEtMC43LDMtMS4yYzAuOS0wLjUsMS42LTEsMi4zLTEuN2MwLjYtMC42LDEuMS0xLjMsMS41LTEuOXYtOC41aC02LjVjLTIsMC0zLjcsMC4yLTUuMSwwLjYKCQljLTEuNCwwLjQtMi42LDAuOS0zLjQsMS42Yy0wLjksMC43LTEuNSwxLjUtMiwyLjVjLTAuNCwxLTAuNiwyLTAuNiwzLjFjMCwxLjcsMC42LDMuMSwxLjgsNC4zQzYxLjIsODIsNjMsODIuNiw2NS41LDgyLjZ6Ii8+CjwvZz4KPGNpcmNsZSBjbGFzcz0ic3QxIiBjeD0iNjcuMyIgY3k9IjY4LjEiIHI9IjYxLjciLz4KPC9zdmc+Cg=="

const defaultProfile = profile => {
  return (
    profile ?? {
      name: import.meta.env.VITE_PROFILE_NAME ?? "John Doe",
      description:
        import.meta.env.VITE_PROFILE_DESCRIPTION ?? "Set up your profile",
      image: import.meta.env.VITE_PROFILE_IMAGE ?? arweave_logo,
      x: import.meta.env.VITE_PROFILE_X ?? null,
      github: import.meta.env.VITE_PROFILE_GITHUB ?? null,
    }
  )
}

export { getArticles, getProfile, defaultProfile, ao, arweave_logo }
