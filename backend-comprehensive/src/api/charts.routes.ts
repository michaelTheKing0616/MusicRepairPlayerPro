/**
 * Music Charts routes
 */

import {Router} from 'express';
import {authenticate} from '../middleware/auth';
import {chartsController} from '../controllers/charts.controller';

export const chartsRoutes = Router();

// Get charts by region and genre
chartsRoutes.get('/', authenticate, chartsController.getCharts);

// Get specific chart
chartsRoutes.get('/:id', authenticate, chartsController.getChart);

