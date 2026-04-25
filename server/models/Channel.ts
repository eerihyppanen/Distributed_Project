import { Schema, model, Document, Types } from "mongoose"

export interface IChannel extends Document {
  name: string
  members: Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const ChannelSchema = new Schema<IChannel>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
  },
)

export const Channel = model<IChannel>("Channel", ChannelSchema)
