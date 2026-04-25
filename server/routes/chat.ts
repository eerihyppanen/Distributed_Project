import express, { Request, Response } from "express"
import { IMessage, Message } from "../models/Message"
import { validateToken } from "../middleware/validateToken"
import axios from "axios"

const router = express.Router()

router.post("/send",validateToken, async (req: Request, res: Response) => {
  try {
    const sender = (req as any).user._id
    const { receiver, content } = req.body

    if (!sender || !receiver || !content) {
      return res.status(400).json({ error: "Missing fields" })
    }

    const message = new Message({
      sender,
      receiver,
      content,
    })

    await message.save()

    await axios.post("http://localhost:4000/emit", {message})

    res.status(201).json(message)
  } catch (err) {
    res.status(500).json({ error: "Failed to send message" })
  }
})


router.get("/history", validateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id
    const { user2 } = req.query

    if (!user2) {
      return res.status(400).json({ error: "Missing users" })
    }

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: user2 },
        { sender: user2, receiver: userId },
      ],
    }).sort({ createdAt: 1 })

    res.json(messages)
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" })
  }
})

export default router