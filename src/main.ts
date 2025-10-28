import "reflect-metadata";
import express from 'express';
import dotenv from 'dotenv';
import countryRoutes from './routes';
import { AppDataSource } from "./configuration";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use('/', countryRoutes);

AppDataSource.initialize()
  .then(() => {
    console.log("Connected to DB");

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((error) => console.log(error));

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});