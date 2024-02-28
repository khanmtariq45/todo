import { Request, Response } from 'express';
import { UserService } from '../services/UserService';

export async function seedAdminUser(): Promise<void> {
  const adminUser = {
    username: 'admin',
    password: 'admin123'
  };

  try {
    const existingAdmin = await UserService.getUserByUsername(adminUser.username);

    if (!existingAdmin) {
      const req: Request = {
        body: {
          username: adminUser.username,
          password: adminUser.password,
        },
      } as Request;

      await UserService.signUp(req, {} as Response);
      console.log('Admin user seeded successfully');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
}

