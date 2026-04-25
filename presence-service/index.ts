import express, { Request, Response } from "express"
import cors from "cors"

const app = express()
const port = 5000

app.use(cors())
app.use(express.json())

const onlineUsers = new Map<string, string>()
const channelMembers = new Map<string, Set<string>>()

app.get("/health", (_req: Request, res: Response) => {
  return res.status(200).json({
    ok: true,
    onlineUsers: onlineUsers.size,
    channelsTracked: channelMembers.size,
  })
})

app.post("/user/online", (req: Request, res: Response) => {
  const { userId, nickname } = req.body

  if (!userId || !nickname) {
    return res.status(400).json({ error: "userId and nickname are required" })
  }

  onlineUsers.set(String(userId), String(nickname))
  return res.sendStatus(204)
})

app.post("/user/offline", (req: Request, res: Response) => {
  const { userId } = req.body

  if (!userId) {
    return res.status(400).json({ error: "userId is required" })
  }

  const userIdStr = String(userId)
  onlineUsers.delete(userIdStr)

  for (const members of channelMembers.values()) {
    members.delete(userIdStr)
  }

  return res.sendStatus(204)
})

app.post("/channel/join", (req: Request, res: Response) => {
  const { userId, channelId } = req.body

  if (!userId || !channelId) {
    return res.status(400).json({ error: "userId and channelId are required" })
  }

  const channelIdStr = String(channelId)
  const userIdStr = String(userId)
  const currentMembers = channelMembers.get(channelIdStr) || new Set<string>()
  currentMembers.add(userIdStr)
  channelMembers.set(channelIdStr, currentMembers)

  return res.sendStatus(204)
})

app.post("/channel/leave", (req: Request, res: Response) => {
  const { userId, channelId } = req.body

  if (!userId || !channelId) {
    return res.status(400).json({ error: "userId and channelId are required" })
  }

  const channelIdStr = String(channelId)
  const userIdStr = String(userId)
  const currentMembers = channelMembers.get(channelIdStr)

  if (currentMembers) {
    currentMembers.delete(userIdStr)
    if (currentMembers.size === 0) {
      channelMembers.delete(channelIdStr)
    }
  }

  return res.sendStatus(204)
})

app.get("/online-users", (_req: Request, res: Response) => {
  const users = Array.from(onlineUsers.entries()).map(([id, nickname]) => ({
    id,
    nickname,
  }))

  return res.status(200).json({
    success: true,
    users,
  })
})

app.get("/channel/:channelId/members", (req: Request, res: Response) => {
  const channelId = String(req.params.channelId || "")

  if (!channelId) {
    return res.status(400).json({ error: "channelId is required" })
  }

  const members = Array.from(channelMembers.get(channelId) || []).map((userId) => ({
    id: userId,
    nickname: onlineUsers.get(userId) || "Offline",
    online: onlineUsers.has(userId),
  }))

  return res.status(200).json({
    success: true,
    channelId,
    members,
  })
})

app.listen(port, () => {
  console.log(`Presence service running on port ${port}`)
})
