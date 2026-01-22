import { Router } from 'express';
import { body } from 'express-validator';

import { taskController } from '../controllers/taskController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { uploadSingle } from '../middleware/upload';

const router = Router();

/* =========================
   Global Middleware
========================= */

router.use(authenticate);

/* =========================
   Validation Rules
========================= */

const createTaskValidation = [
  body('title')
    .notEmpty()
    .withMessage('Task title is required'),

  body('project')
    .notEmpty()
    .withMessage('Project is required'),
];

/* =========================
   Task Routes
========================= */

router.post(
  '/',
  validate(createTaskValidation),
  taskController.createTask
);

router.get(
  '/',
  taskController.getAllTasks
);

router.get(
  '/:id',
  taskController.getTaskById
);

router.put(
  '/:id',
  taskController.updateTask
);

router.delete(
  '/:id',
  taskController.deleteTask
);

router.post(
  '/:id/assign',
  taskController.assignTask
);

router.post(
  '/:id/watchers',
  taskController.addWatcher
);

router.delete(
  '/:id/watchers/:userId',
  taskController.removeWatcher
);

router.post(
  '/:id/attachments',
  uploadSingle('file'),
  taskController.addAttachment
);

router.delete(
  '/:id/attachments/:attachmentId',
  taskController.deleteAttachment
);

export default router;
