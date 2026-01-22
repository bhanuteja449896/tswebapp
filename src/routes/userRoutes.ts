import { Router } from 'express';

import { userController } from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

/* =========================
   Global Middleware
========================= */

router.use(authenticate);

/* =========================
   User Routes
========================= */

router.get(
  '/',
  userController.getAllUsers
);

router.get(
  '/search',
  userController.searchUsers
);

router.get(
  '/:id',
  userController.getUserById
);

router.put(
  '/:id',
  userController.updateUser
);

router.delete(
  '/:id',
  authorize('admin'),
  userController.deleteUser
);

router.get(
  '/:id/stats',
  userController.getUserStats
);

router.get(
  '/:id/projects',
  userController.getUserProjects
);

router.get(
  '/:id/tasks',
  userController.getUserTasks
);

export default router;
