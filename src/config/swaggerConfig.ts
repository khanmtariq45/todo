import express from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import cors from 'cors';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());


const swaggerOptions = {
  swaggerDefinition: {
    info: {
      title: 'Your API Title',
      description: 'Your API Description',
      version: '1.0.0',
    },
  },
  apis: ['src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
