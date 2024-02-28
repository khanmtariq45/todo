import express from 'express';
import { TaskController } from '../controllers/TaskController';
import { Request, Response } from 'express';

const router = express.Router();

router.post('/create', async (req: Request, res: Response) => {
  try {
    const result = await TaskController.createTask(req, res);
    res.status(201).json(result);
  } catch (error) {
    console.error('Create task route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/update/:taskId', async (req: Request, res: Response) => {
  try {
    const result = await TaskController.updateTask(req, res);
    res.json(result);
  } catch (error) {
    console.error('Update task route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/delete/:taskId', async (req: Request, res: Response) => {
  try {
    const result = await TaskController.deleteTask(req, res);
    res.json(result);
  } catch (error) {
    console.error('Delete task route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
