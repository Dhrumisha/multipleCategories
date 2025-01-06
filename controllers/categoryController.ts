import e, { Request, Response, NextFunction } from "express";
import Category from "../models/categoryModel";
import APIFeatures from "../utils/APIFeatures";
import AppError from "../utils/AppError";
import mongoose from "mongoose";

const catchAsync = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

// Create a category
export const createCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { parentId } = req.body;
  const parentDoc = await Category.findById(parentId);

  if (parentId && !parentDoc) {
    return next(new AppError("No parent found, please check parentId", 404));
  }

  const category = await Category.create(req.body);

  if (parentId) {
    await Category.findByIdAndUpdate(parentId, { $push: { children: category._id } }, { new: true, runValidators: true });
  }
  else if (!parentId) {
    res.status(201).json({ status: "Success", data: category });
  }
  res.status(201).json({ status: "Success", data: category });
});

// Create multiple category
export const createMultipleChildCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { children } = req.body;

  // Ensure `child` is an array
  if (!Array.isArray(children)) {
    return next(new AppError("Please provide an array of children to create", 400));
  }

  // Check if all child entries have a valid `parentId`
  if (children.some((c: any) => !c.parentId)) {
    return next(new AppError("Please provide a parentId for each child category", 400));
  }

  // Validate all parent categories exist
  const parentIds = children.map((c: any) => c.parentId);
  const parentDocs = await Category.find({ _id: { $in: parentIds } });

  if (parentDocs.length !== new Set(parentIds).size) {
    return next(new AppError("One or more parent categories not found. Please check the parentId values.", 404));
  }

  // Create child categories and update parent documents
  const createdCategories: any[] = [];
  for (const childData of children) {
    const category = await Category.create(childData);

    // Update the parent's children array
    await Category.findByIdAndUpdate(
      childData.parentId,
      { $push: { children: category._id } },
      { new: true, runValidators: true }
    );

    createdCategories.push(category);
  }

  // Respond with all created categories
  res.status(201).json({
    status: "Success",
    data: createdCategories,
  });
});


// Get all categories
export const getCategories = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const features = new APIFeatures(req.query).Filtering().paginate().fieldLimit().sorting();

  const categories = await Category.aggregate([
    { $match: { parentId: "0" } },
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
              pipeline:[
             {   $lookup: {
                  from: "categories",
                  localField: "children",
                  foreignField: "_id",
                  as: "children",
                },}
              ]
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
  const { parentId } = req.body;

  // Find the current category and the new parent (if specified)
  const currDoc = await Category.findById(req.params.id);
  const newParentDoc = parentId ? await Category.findById(parentId) : null;

  if (!currDoc) {
    return next(new AppError("Category not found", 404));
  }

  // Prevent self-referencing or circular references
  if (parentId === req.params.id) {
    return next(new AppError("A category cannot be its own parent", 400));
  }

  // If the parentId is changing
  if (parentId && currDoc.parentId?.toString() !== parentId) {
    // Handle the old parent (remove current category from its children)
    if (currDoc.parentId && currDoc.parentId.toString() !== "0") {
      await Category.findByIdAndUpdate(
        currDoc.parentId,
        { $pull: { children: currDoc._id } },
        { new: true, runValidators: true }
      );
    }

    // Handle the new parent (add current category to its children)
    if (newParentDoc) {
      if (!newParentDoc.children.includes(currDoc._id as mongoose.Types.ObjectId)) {
        await Category.findByIdAndUpdate(
          parentId,
          { $push: { children: currDoc._id } },
          { new: true, runValidators: true }
        );
      }
    } else {
      return next(new AppError("Parent category not found. Provide a valid parentId.", 400));
    }

    // Update the parentId of the current category
    await Category.findByIdAndUpdate(
      currDoc._id,
      { parentId },
      { new: true, runValidators: true }
    );
  } else if (!parentId && currDoc.parentId?.toString() !== "0") {
    // If the parentId is being reset to "0"
    if (currDoc.parentId) {
      await Category.findByIdAndUpdate(
        currDoc.parentId,
        { $pull: { children: currDoc._id } },
        { new: true, runValidators: true }
      );
    }
    await Category.findByIdAndUpdate(
      currDoc._id,
      { parentId: "0" },
      { new: true, runValidators: true }
    );
  }

  // Update other fields in the current category
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
  if (!category) return next(new AppError("Category not found,please provide valid id", 404));

  if (category.children.length) {
    return next(new AppError("This category has child categories. Please delete the children first.", 400));
  }
  if (category.parentId && category.parentId.toString().length > 1) {//because parentId as a 0, it throws error invalid_id because 0 is not a valid id in mongodb
    await Category.findByIdAndUpdate(
      category.parentId,
      { $pull: { children: category._id } },
      { new: true, runValidators: true }
    );
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

  if (category.some((cat) => cat.children.length)) {
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

  res.status(200).json({ status: "Success", deleteCount: category.length, message: ["Deleted successfully", category] });
});

// Search for categories
export const searchCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { key } = req.params;

  if (typeof key !== "string" || !isNaN(Number(key))) {
    return next(new AppError(`The ${key} query parameter must be a string`, 400));
  }

  const regex = new RegExp(key, "i");
  const category = await Category.aggregate([
    
    { $match: { name: regex } },
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
        ],
      },
    },
  ]);

  if (!category.length) {
    return next(new AppError(`No categories found matching the search criteria`, 400));
  }

  res.status(200).json({ status: "Success", data: category });
});
