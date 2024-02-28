import { TaskService } from '../services/TaskService';

export async function seedTasks(userId: string) {
  await TaskService.createTask(userId, 'Task 1 description');
  await TaskService.createTask(userId, 'Task 2 description');
  console.log('Tasks seeded successfully');
}
