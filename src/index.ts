import express from 'express';
require('dotenv').config();
import sequelize from './config/databaseConfig';
import userRoutes from './routes/userRoutes';
import taskRoutes from './routes/taskRoutes';
import { setupSwagger } from './swagger';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

sequelize
  .authenticate()
  .then(() => {
    console.log('Connected to the SQL database');
  })
  .catch((error) => {
    console.error('Error connecting to the SQL database:', error.message);
  });

app.use('/users', userRoutes);
app.use('/tasks', taskRoutes);

setupSwagger(app);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
