import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { UserModel, User } from '../models/UserModel';

export class UserService {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      const user = await UserModel.findOne({ username });

      if (!user) {
        res.status(401).json({ message: 'Invalid credentials' });
        return;
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        res.status(401).json({ message: 'Invalid credentials' });
        return;
      }

      const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET || 'your_secret_key', {
        expiresIn: '1h',
      });

      res.status(200).json({ token });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getUserByUsername(username: string): Promise<User | null> {
    try {
      const user = await UserModel.findOne({ username });
      return user;
    } catch (error) {
      console.error('Error fetching user by username:', error);
      return null;
    }
  }

  static async signUp(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      const existingUser = await UserModel.findOne({ username });

      if (existingUser) {
        res.status(409).json({ message: 'UserModel already exists' });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await UserModel.create({
        username,
        password: hashedPassword,
        role: 'Client',
      });

      res.status(201).json({ message: 'UserModel created successfully', userId: newUser._id });
    } catch (error) {
      console.error('SignUp error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async sendInvite(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      const inviteToken = 'your_generated_token';

      const user = await UserModel.findOneAndUpdate({ email }, { inviteToken, inviteTokenExpiration: Date.now() + 24 * 60 * 60 * 1000 });

      if (!user) {
        res.status(404).json({ message: 'UserModel not found' });
        return;
      }

      console.log('Invite Token:', inviteToken);

      res.status(200).json({ message: 'Invitation sent successfully' });
    } catch (error) {
      console.error('SendInvite error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}





