import { Router } from 'express';
import { refreshCountries, getAllCountries, getCountryByName, deleteCountryByName, getStatus, getSummaryImage } from './countryController';

const router = Router();

// POST /countries/refresh
router.post('/countries/refresh', refreshCountries);

// GET /countries
router.get('/countries', getAllCountries);

// GET /countries/image
router.get('/countries/image', getSummaryImage);

// GET /countries/:name
router.get('/countries/:name', getCountryByName);

// DELETE /countries/:name
router.delete('/countries/:name', deleteCountryByName);

// GET /status
router.get('/status', getStatus);

export default router;