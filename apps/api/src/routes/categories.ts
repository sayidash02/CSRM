import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory
} from '../controllers/CategoriesController';

const router = Router();

// Category CRUD
router.get('/', getCategories);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

// Sub-Category CRUD
router.post('/:categoryId/sub-categories', createSubCategory);
router.post('/sub-categories', createSubCategory);
router.put('/sub-categories/:id', updateSubCategory);
router.delete('/sub-categories/:id', deleteSubCategory);

export default router;
