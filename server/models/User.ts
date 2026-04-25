import { Schema, model, Document } from "mongoose";

export interface IUser extends Document{
    nickname: string,
    password: string,
}

const UserSchema = new Schema<IUser>({
    nickname: {type: String, required: true, unique: true},
    password: {type: String, required: true},
})

export const User = model<IUser>("User", UserSchema)