
import express, { Request, Response } from 'express';
import { UserService } from '../services/UserService';

const router = express.Router();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const result = await UserService.login(req, res);
    res.json(result);
  } catch (error) {
    console.error('Login route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const result = await UserService.signUp(req, res);
    res.status(201).json(result);
  } catch (error) {
    console.error('SignUp route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/send-invite', async (req: Request, res: Response) => {
  try {
    const result = await UserService.sendInvite(req, res);
    res.json(result);
  } catch (error) {
    console.error('SendInvite route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
