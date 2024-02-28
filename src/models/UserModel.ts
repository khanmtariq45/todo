import { Document, Schema, model } from 'mongoose';

export interface User extends Document {
  username: string;
  password: string;
  role: 'Admin' | 'Client';
  inviteToken?: string;
  inviteTokenExpiration?: number;
}

const userSchema = new Schema({
  username: String,
  password: String,
  role: String,
  inviteToken: String,
  inviteTokenExpiration: Number,
});

export const UserModel = model<User>('User', userSchema);
