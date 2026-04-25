import { Document, Types } from "mongoose";
export interface IChannel extends Document {
    name: string;
    members: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const Channel: import("mongoose").Model<IChannel, {}, {}, {}, Document<unknown, {}, IChannel, {}, import("mongoose").DefaultSchemaOptions> & IChannel & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IChannel>;
//# sourceMappingURL=Channel.d.ts.map