import { Router } from "express";
import {
  createCategory,
  getCategoryByID,
  updateCategory,
  getCategories,
  deleteCategory,
  deleteMultipleCategory,
  searchCategory,
  createMultipleChildCategory
} from "../controllers/categoryController";

import {validateCategory} from "../validation/validationSchema";

const router: Router = Router();

// Routes for category management
router.post("/createCategory",validateCategory, createCategory);
router.post("/createChildCategory", createMultipleChildCategory);
router.get("/getParentById/:id", getCategoryByID);
router.patch("/updateCategory/:id",validateCategory, updateCategory);
router.get("/allCategories", getCategories);
router.delete("/deleteCategoryById/:id", deleteCategory);
router.post("/deleteCategoriesById", deleteMultipleCategory);
router.get("/searchByChildName/:key", searchCategory);

export default router;
