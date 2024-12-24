import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";

interface ErrorHandler extends Error {
  isJoi: any;
  statusCode?: number;
  status?: string;
  errmsg?: string;
  path?: string;
  value?: string;
  errors?: Record<string, { message: string }>;
  code?: number;
  isOperational: boolean;
}

// Handle various DB errors
const handleCastErrorDB = (err: any): AppError => {
  const message = `Invalid ${err.path}: ${err.value}. Please provide a valid value.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err: any): AppError => {
  const value = err.keyValue ? JSON.stringify(err.keyValue) : "Duplicate value";
  const message = `Duplicate field value: ${value}. Please use another value.`;
  return new AppError(message, 400);
};

// Handle Joi validation errors
const handleJoiValidationError = (err: any): AppError => {
  const errorMessages = err.details.map((el: any) => el.message); // Extract messages
  const message = `Validation error: ${errorMessages.join(". ")}`;
  return new AppError(message, 400);
};

// Handle Mongoose validation errors
const handleValidationErrorDB = (err: any): AppError => {
  if (!err.errors || typeof err.errors !== "object") {
    return new AppError("Validation error structure is invalid.", 400);
  }

  const errorMessages = Object.values(err.errors).map((el: any) => el.message);
  const message = `Invalid input data: ${errorMessages.join(". ")}`;
  return new AppError(message, 400);
};

// Development Error Response
const sendErrorDev = (err: ErrorHandler, res: Response) => {
  res.status(err.statusCode || 500).json({
    status: err.status || "error",
    message: err.message,
    error: err  
  });
};

// Main Error Handling Middleware
export default (err: ErrorHandler, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  
  if (err.name === "CastError") err = handleCastErrorDB(err);
  if (err.code === 11000) err = handleDuplicateFieldsDB(err);
  if (err.name === "ValidationError") {
    err = handleValidationErrorDB(err);
  } else if (err.isJoi) {
    err = handleJoiValidationError(err);
  }
    
    sendErrorDev(err, res);
};
