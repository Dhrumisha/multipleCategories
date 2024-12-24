import { Router } from "express";
import {
  createCategory,
  getCategoryByID,
  updateCategory,
  getCategories,
  deleteCategory,
  deleteMultipleCategory,
  searchCategory
} from "../controllers/categoryController";

const router: Router = Router();

// Routes for category management
router.post("/createCategory", createCategory);
router.get("/getParentById/:id", getCategoryByID);
router.patch("/updateCategory/:id", updateCategory);
router.get("/allCategories", getCategories);
router.delete("/deleteCategoryById/:id", deleteCategory);
router.post("/deleteCategoriesById", deleteMultipleCategory);
router.get("/searchByChildName/:key", searchCategory);

export default router;
