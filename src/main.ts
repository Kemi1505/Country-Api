import express from 'express';
import dotenv from 'dotenv';
import countryRoutes from './routes';
import pool from './configuration';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use('/', countryRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Country Currency Exchange API is running!' });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

pool.getConnection()
    .then((connection) => {
        console.log('Successfully connected to the database pool.');
        connection.release();
    })
    .catch((error) => {
        console.error('Error connecting to the database pool:', error);
        process.exit(1);
    });