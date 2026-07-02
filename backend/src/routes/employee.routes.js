import express from 'express';
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  deactivateEmployee,
  activateEmployee,
} from '../controllers/employee.controller.js';
import { verifyToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', verifyToken, authorizeRoles('admin', 'hr'), createEmployee);
router.get('/', verifyToken, getEmployees);
router.get('/:id', verifyToken, getEmployeeById);
router.put('/:id', verifyToken, authorizeRoles('admin', 'hr'), updateEmployee);
router.delete('/:id', verifyToken, authorizeRoles('admin'), deleteEmployee);
router.patch('/:id/deactivate', verifyToken, authorizeRoles('admin'), deactivateEmployee);
router.patch('/:id/activate', verifyToken, authorizeRoles('admin'), activateEmployee);

export default router;
