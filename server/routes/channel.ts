import express, { Request, Response } from "express"
import axios from "axios"
import { validateToken } from "../middleware/validateToken"
import { Channel } from "../models/Channel"
import { ChannelMessage } from "../models/ChannelMessage"

const router = express.Router()

const formatChannelMessage = (message: any) => ({
  _id: message._id,
  sender: message.sender?._id ? String(message.sender._id) : String(message.sender),
  senderNickname: message.sender?.nickname || "Unknown",
  channel: message.channel,
  content: message.content,
  createdAt: message.createdAt,
})

router.post("/create", validateToken, async (req: Request, res: Response) => {
  try {
    const { name } = req.body

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Channel name is required" })
    }

    const trimmedName = String(name).trim()
    const existing = await Channel.findOne({ name: trimmedName })
    if (existing) {
      return res.status(409).json({ error: "Channel already exists" })
    }

    const userId = (req as any).user._id
    const channel = await Channel.create({
      name: trimmedName,
      members: [userId],
    })

    return res.status(201).json({
      success: true,
      channel: { id: channel._id, name: channel.name },
    })
  } catch (err) {
    return res.status(500).json({ error: "Failed to create channel" })
  }
})

router.get("/list", validateToken, async (req: Request, res: Response) => {
  try {
    const userId = String((req as any).user._id)
    const channels = await Channel.find({}).sort({ name: 1 })

    return res.status(200).json({
      success: true,
      channels: channels.map((channel) => ({
        id: channel._id,
        name: channel.name,
        memberCount: channel.members.length,
        joined: channel.members.some((memberId) => String(memberId) === userId),
      })),
    })
  } catch (err) {
    return res.status(500).json({ error: "Failed to list channels" })
  }
})

router.post("/join", validateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id
    const { channelId } = req.body

    if (!channelId) {
      return res.status(400).json({ error: "channelId is required" })
    }

    const channel = await Channel.findByIdAndUpdate(
      channelId,
      { $addToSet: { members: userId } },
      { new: true },
    )

    if (!channel) {
      return res.status(404).json({ error: "Channel not found" })
    }

    return res.status(200).json({
      success: true,
      channel: {
        id: channel._id,
        name: channel.name,
        memberCount: channel.members.length,
      },
    })
  } catch (err) {
    return res.status(500).json({ error: "Failed to join channel" })
  }
})

router.get("/messages", validateToken, async (req: Request, res: Response) => {
  try {
    const userId = String((req as any).user._id)
    const channelId = String(req.query.channelId || "")

    if (!channelId) {
      return res.status(400).json({ error: "channelId query is required" })
    }

    const channel = await Channel.findById(channelId)
    if (!channel) {
      return res.status(404).json({ error: "Channel not found" })
    }

    const isMember = channel.members.some((memberId) => String(memberId) === userId)
    if (!isMember) {
      return res.status(403).json({ error: "Join the channel first" })
    }

    const messages = await ChannelMessage.find({ channel: channelId })
      .populate("sender", "nickname")
      .sort({ createdAt: 1 })

    return res.status(200).json(messages.map(formatChannelMessage))
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch channel messages" })
  }
})

router.post("/send", validateToken, async (req: Request, res: Response) => {
  try {
    const sender = String((req as any).user._id)
    const { channelId, content } = req.body

    if (!channelId || !content) {
      return res.status(400).json({ error: "channelId and content are required" })
    }

    const channel = await Channel.findById(channelId)
    if (!channel) {
      return res.status(404).json({ error: "Channel not found" })
    }

    const isMember = channel.members.some((memberId) => String(memberId) === sender)
    if (!isMember) {
      return res.status(403).json({ error: "Join the channel first" })
    }

    const message = await ChannelMessage.create({
      sender,
      channel: channelId,
      content,
    })

    const populatedMessage = await ChannelMessage.findById(message._id).populate("sender", "nickname")
    if (!populatedMessage) {
      return res.status(500).json({ error: "Failed to load channel message" })
    }

    const formattedMessage = formatChannelMessage(populatedMessage)

    await axios.post("http://localhost:4000/emit-channel", {
      channelId,
      message: formattedMessage,
    })

    return res.status(201).json(formattedMessage)
  } catch (err) {
    return res.status(500).json({ error: "Failed to send channel message" })
  }
})

export default router
