import express, { Express } from "express"
import ChatService from "./routes/chat"
import ChannelService from "./routes/channel"
import UserService from "./routes/user"
import mongoose, {Connection} from "mongoose"
import dotenv from "dotenv"
import cors from "cors"
import axios from "axios"

dotenv.config()
const app: Express = express()
const port = 1234

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.use("/api/user", UserService)
app.use("/api/chat", ChatService)
app.use("/api/channel", ChannelService)


const mongoDB: string = "mongodb://127.0.0.1:27017/application"
mongoose.connect(mongoDB)
mongoose.Promise = Promise
const db: Connection = mongoose.connection
db.on("error", console.error.bind(console, "MongoDB connection error"))

const dbStateLabel = (state: number): string => {
    switch (state) {
        case 0:
            return "disconnected"
        case 1:
            return "connected"
        case 2:
            return "connecting"
        case 3:
            return "disconnecting"
        default:
            return "unknown"
    }
}

const probeService = async (name: string, url: string) => {
    try {
        const response = await axios.get(url, { timeout: 1500 })
        return {
            name,
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            data: response.data,
        }
    } catch (error: any) {
        return {
            name,
            ok: false,
            status: error?.response?.status || null,
            error: error?.message || "service probe failed",
        }
    }
}

app.get("/api/system/health", async (_req, res) => {
    const dbState = mongoose.connection.readyState
    const dependencies = await Promise.all([
        probeService("socket-server", "http://localhost:4000/health"),
        probeService("presence-service", "http://localhost:5000/health"),
    ])

    const ok = dbState === 1 && dependencies.every((service) => service.ok)

    return res.status(ok ? 200 : 503).json({
        ok,
        service: "api-server",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
            state: dbStateLabel(dbState),
            readyState: dbState,
        },
        dependencies,
    })
})

app.listen(port, () => {
    console.log(`Server started on port ${port}`)
})