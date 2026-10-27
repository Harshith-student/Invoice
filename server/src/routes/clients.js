import { Router } from 'express';
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  clientSchema,
} from '../controllers/clientController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(protect); // all client routes require auth

router.get('/', getClients);
router.get('/:id', getClient);
router.post('/', validate(clientSchema), createClient);
router.put('/:id', validate(clientSchema), updateClient);
router.delete('/:id', deleteClient);

export default router;
