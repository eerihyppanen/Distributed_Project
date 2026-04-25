import { Document, Types } from "mongoose";
export interface IChannelMessage extends Document {
    sender: Types.ObjectId;
    channel: Types.ObjectId;
    content: string;
    createdAt: Date;
}
export declare const ChannelMessage: import("mongoose").Model<IChannelMessage, {}, {}, {}, Document<unknown, {}, IChannelMessage, {}, import("mongoose").DefaultSchemaOptions> & IChannelMessage & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IChannelMessage>;
//# sourceMappingURL=ChannelMessage.d.ts.map