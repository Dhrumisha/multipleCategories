import Joi from "joi";

export const categoryValidationSchema = Joi.object({
    parentId: Joi.string().allow(null).optional().messages({
      "string.base": "Parent ID must be a string.",
    }),
    name: Joi.string()
      .min(3)
      .max(50)
      .trim()
      .regex(/^[A-Za-z\s]+$/)
      .required()
      .messages({
        "string.min": "Name must be at least 3 characters long.",
        "string.max": "Name cannot exceed 50 characters.",
        "string.pattern.base": "Special characters are not allowed in the name.",
        "any.required": "Name is required.",
      }),
    description: Joi.string()
      .min(10)
      .max(500)
      .required()
      .messages({
        "string.min": "Description must be at least 10 characters long.",
        "string.max": "Description cannot exceed 500 characters.",
      }),
    status: Joi.string()
      .valid("active", "inactive")
      .required()
      .messages({
        "any.only": "Status must be either 'active' or 'inactive'.",
      }),
    stock_availability: Joi.boolean().messages({
      "boolean.base": "Stock availability must be a boolean.",
    }),
  });