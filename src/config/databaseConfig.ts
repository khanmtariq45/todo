import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

interface EnvVariables {
  DB_HOST: string;
  DB_PORT: string;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_NAME: string;
}

const envVariables: EnvVariables = {
  DB_HOST: process.env.DB_HOST!,
  DB_PORT: process.env.DB_PORT!,
  DB_USERNAME: process.env.DB_USERNAME!,
  DB_PASSWORD: process.env.DB_PASSWORD!,
  DB_NAME: process.env.DB_NAME!,
};

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: envVariables.DB_HOST,
  port: parseInt(envVariables.DB_PORT, 10),
  username: envVariables.DB_USERNAME,
  password: envVariables.DB_PASSWORD,
  database: envVariables.DB_NAME,
  define: {
    timestamps: false,
  },
});

export default sequelize;
