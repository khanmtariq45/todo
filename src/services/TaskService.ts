import { TaskModel, Task } from '../models/TaskModel';

export class TaskService {
  static async createTask(userId: string, description: string): Promise<Task> {

    const newTask = new TaskModel({
      userId,
      description,
      status: 'Pending',
    });

    await newTask.save();
    return newTask;
  }

  static async updateTask(taskId: string, status: 'Pending' | 'Completed'): Promise<Task | null> {
    const updatedTask = await TaskModel.findByIdAndUpdate(taskId, { status }, { new: true });
    return updatedTask;
  }

  static async deleteTask(taskId: string): Promise<void> {
    await TaskModel.findByIdAndDelete(taskId);
  }
}
