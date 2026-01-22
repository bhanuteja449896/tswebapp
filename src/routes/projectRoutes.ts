import { Router } from 'express';
import { body } from 'express-validator';

import { projectController } from '../controllers/projectController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

/* =========================
   Global Middleware
========================= */

router.use(authenticate);

/* =========================
   Validation Rules
========================= */

const createProjectValidation = [
  body('name')
    .notEmpty()
    .withMessage('Project name is required'),

  body('key')
    .optional()
    .matches(/^[A-Z]{2,10}$/)
    .withMessage('Project key must be 2-10 uppercase letters'),
];

/* =========================
   Project Routes
========================= */

router.post(
  '/',
  validate(createProjectValidation),
  projectController.createProject
);

router.get(
  '/',
  projectController.getAllProjects
);

router.get(
  '/:id',
  projectController.getProjectById
);

router.put(
  '/:id',
  projectController.updateProject
);

router.delete(
  '/:id',
  projectController.deleteProject
);

router.post(
  '/:id/members',
  projectController.addMember
);

router.delete(
  '/:id/members/:userId',
  projectController.removeMember
);

router.put(
  '/:id/members/:userId/role',
  projectController.updateMemberRole
);

router.get(
  '/:id/members',
  projectController.getProjectMembers
);

router.get(
  '/:id/tasks',
  projectController.getProjectTasks
);

router.get(
  '/:id/stats',
  projectController.getProjectStats
);

export default router;
