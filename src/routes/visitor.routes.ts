import { Router } from 'express';
import { submitRegistration } from '../controllers/visitorController';

const router = Router();

router.post('/register', submitRegistration);

export default router;