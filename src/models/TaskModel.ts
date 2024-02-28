import { Document, Schema, model } from 'mongoose';

export interface Task extends Document {
  userId: string;
  description: string;
  status: 'Pending' | 'Completed';
}

const taskSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  description: String,
  status: String,
});

export const TaskModel = model<Task>('Task', taskSchema);
