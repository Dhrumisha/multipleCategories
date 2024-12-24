import { Request, Response, NextFunction } from "express";
import Category from "../models/categoryModel";
import APIFeatures from "../utils/APIFeatures";
import AppError from "../utils/AppError";
import mongoose from "mongoose";
import { categoryValidationSchema } from "../validation/validationSchema";

const catchAsync = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

// Create a category
export const createCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { error } = categoryValidationSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return next(error); // Pass Joi validation errors to the error handler
  }

  const { parentId } = req.body;
  const parentDoc = parentId ? await Category.findById(parentId) : null;

  if (parentId && !parentDoc) {
    return next(new AppError("No parent found, please check parentId", 404));
  }

  const category = await Category.create({ ...req.body, parentId });

  if (parentId || parentId === null) {
    await Category.findByIdAndUpdate(parentId, { $push: { children: category._id } }, { new: true, runValidators: true });
  }
  else {
    return next(new AppError("please provide valid parentId and if you want to create main category then give parentId as null", 400));

  }

  res.status(201).json({ status: "Success", data: category });
});

// Get all categories
export const getCategories = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const features = new APIFeatures(req.query).Filtering().paginate().fieldLimit().sorting();

  const categories = await Category.aggregate([
    { $match: { parentId: null } },
    {
      $lookup: {
        from: "categories",
        localField: "children",
        foreignField: "_id",
        as: "children",
        pipeline: [
          {
            $lookup: {
              from: "categories",
              localField: "children",
              foreignField: "_id",
              as: "children",
            },
          },
        ],
      },
    },
    ...features.getPipeline(),
  ]);

  if (!categories.length) {
    return next(new AppError("No categories found", 404));
  }

  res.status(200).json({ status: "Success", results: categories.length, data: categories });
});

// Get category by ID
export const getCategoryByID = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const category = await Category.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
    {
      $lookup: {
        from: "categories",
        localField: "children",
        foreignField: "_id",
        as: "children",
        pipeline: [
          {
            $lookup: {
              from: "categories",
              localField: "children",
              foreignField: "_id",
              as: "children",
            },
          },
        ],
      },
    },
  ]);

  if (!category.length) {
    return next(new AppError("Category not found with the provided ID.", 404));
  }

  res.status(200).json({ status: "Success", data: category });
});

// Function to update a category
export const updateCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

  const { error } = categoryValidationSchema.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  const { parentId } = req.body;

  // Find the current category and the new parent (if specified)
  const currDoc = await Category.findById(req.params.id);
  const newParentDoc = await Category.findById(parentId);

  if (!currDoc) {
    return next(new AppError("Category not found", 404));
  }

  // Prevent self-referencing or circular references
  if (parentId === req.params.id) {
    return next(new AppError("A category cannot be its own parent", 400));
  }

  // Handle category updates
  if (parentId) {
    if (!newParentDoc) {
      return next(new AppError("Parent category not found. Provide a valid parentId.", 400));
    }

    // Pull from the old parent's children array (if parentId changes)
    if (currDoc.parentId && currDoc.parentId.toString() !== parentId || currDoc.parentId === null) {
      await Category.findByIdAndUpdate(
        currDoc.parentId,
        { $pull: { children: currDoc._id } },
        { new: true, runValidators: true }
      );

      // Push into the new parent's children array
      if (!newParentDoc.children.includes(currDoc._id as mongoose.Types.ObjectId)) {
        await Category.findByIdAndUpdate(
          parentId,
          { $push: { children: currDoc._id } },
          { new: true, runValidators: true }
        );
      }
    }
  } else if (parentId === null) {
    // Handle making a category a top-level category (no parent)
    if (currDoc.parentId) {
      await Category.findByIdAndUpdate(
        currDoc.parentId,
        { $pull: { children: currDoc._id } },
        { new: true, runValidators: true }
      );
    }
  }

  // Update the category itself with the provided fields
  const updatedCategory = await Category.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: "Success",
    data: ["Updated successfully", updatedCategory],
  });
});


// Delete a category
export const deleteCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const category = await Category.findById(req.params.id);
  if (!category) return next(new AppError("Category not found", 404));

  if (category.children?.length) {
    return next(new AppError("This category has child categories. Please delete the children first.", 400));
  }

  if (category.parentId) {
    await Category.findByIdAndUpdate(category.parentId, { $pull: { children: category._id } }, { new: true });
  }

  await Category.findByIdAndDelete(req.params.id);

  res.status(200).json({ status: "Success", message: ["Deleted successfully", category] });
});

// Delete multiple category
export const deleteMultipleCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return next(new AppError("Please provide an array of category IDs to delete.", 400));
  }
 
  const category = await Category.find({ _id: { $in: ids } });

  if (!category.length && category.some((cat) => !cat.id.length)) {
    return next(new AppError("No categories found with the provided IDs", 404));
  }

  if (category.some((cat) => cat.children?.length)) {
    return next(new AppError("Some categories have child categories. Please delete the children first.", 400));
  }

  const parentUpdates = category
  .filter((cat) => cat.parentId) // Only update parents for categories with a parentId
  .map((cat) => ({
    updateOne: {
      filter: { _id: cat.parentId },
      update: { $pull: { children: cat._id } },
    },
  }));

    if (parentUpdates.length > 0) {
      await Category.bulkWrite(parentUpdates);
    }
  
    // Delete the categories
    await Category.deleteMany({ _id: { $in: ids } });

  res.status(200).json({ status: "Success", message: ["Deleted successfully", category] });
  });

// Search for categories
export const searchCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { key } = req.params;

  if (typeof key !== "string" || !isNaN(Number(key))) {
    return next(new AppError(`The ${key} query parameter must be a string`, 400));
  }

  const regex = new RegExp(key, "i");
  const category = await Category.aggregate([
    {
      $lookup: {
        from: "categories",
        localField: "children",
        foreignField: "_id",
        as: "children",
      },
    },
    { $match: { name: regex } },
  ]);

  if (!category.length) {
    return next(new AppError(`No categories found matching the search criteria`, 400));
  }

  res.status(200).json({ status: "Success", data: category });
});
