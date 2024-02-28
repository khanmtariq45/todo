import { Request, Response } from 'express';
import { TaskService } from '../services/TaskService';

export class TaskController {
  static async createTask(req: Request, res: Response) {
    try {
      const { userId, description }  = req.body;

      const createdTask = await TaskService.createTask(userId, description);

      res.status(201).json({ message: 'Task created successfully', task: createdTask });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateTask(req: Request, res: Response) {
    try {
      const taskId = req.params.taskId;

      const updatedDetails = req.body;

      const updatedTask = await TaskService.updateTask(taskId, updatedDetails);

      res.status(200).json({ message: 'Task updated successfully', task: updatedTask });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteTask(req: Request, res: Response) {
    try {
      const taskId = req.params.taskId;

      await TaskService.deleteTask(taskId);

      res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
