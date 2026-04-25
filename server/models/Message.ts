import { Schema, model, Document, Types } from "mongoose"

export interface IMessage extends Document {
    sender: Types.ObjectId,
    receiver: Types.ObjectId,
    content: string,
    createdAt: Date,
}

const MessageSchema = new Schema<IMessage>({
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
},{ 
    timestamps: true 
})

export const Message = model<IMessage>("Message", MessageSchema)
