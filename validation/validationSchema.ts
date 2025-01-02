import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import AppError from '../utils/AppError';

// Define the Joi schema
export const categoryValidationSchema = Joi.object({
  parentId: Joi.string().default("0").allow("0").optional().messages({
    "string.base": "Parent ID must be a string.",
  }),
  name: Joi.string()
    .required()
    .min(3)
    .max(50)
    .trim()
    .regex(/^[A-Za-z\s]+$/)
    .messages({
      "string.min": "Name must be at least 3 characters long.",
      "string.max": "Name cannot exceed 50 characters.",
      "string.pattern.base": "Special characters are not allowed in the name.",
    }),
    
  description: Joi.string()
    .min(10)
    .max(500)
    .messages({
      "string.min": "Description must be at least 10 characters long.",
      "string.max": "Description cannot exceed 500 characters.",
    }),
    
  status: Joi.string()
    .required()
    .valid("active", "inactive")
    .messages({
      "any.only": "Status must be either 'active' or 'inactive'.",
    }),
    
  stock_availability: Joi.boolean().messages({
    "boolean.base": "Stock availability must be a boolean.",
  }),
});

// Middleware for validation
export const validateCategory = (req: Request, res: Response, next: NextFunction) => {
  const { error } = categoryValidationSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const message = error.details.map((detail) => detail.message).join(". ");
    return next(new AppError(message, 400));
  }

  next();
};     
