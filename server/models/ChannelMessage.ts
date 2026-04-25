import { Schema, model, Document, Types } from "mongoose"

export interface IChannelMessage extends Document {
  sender: Types.ObjectId
  channel: Types.ObjectId
  content: string
  createdAt: Date
}

const ChannelMessageSchema = new Schema<IChannelMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    channel: { type: Schema.Types.ObjectId, ref: "Channel", required: true },
    content: { type: String, required: true },
  },
  {
    timestamps: true,
  },
)

export const ChannelMessage = model<IChannelMessage>("ChannelMessage", ChannelMessageSchema)
