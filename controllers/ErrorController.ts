import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";

interface ErrorHandler extends Error {
  statusCode?: number;
  status?: string;
  errmsg?: string;
  path?: string;
  value?: string;
  errors?: Record<string, { message: string }> | undefined;
  code?: number;
}

// Handle Mongoose validation errors
const handleValidationErrorDB = (err: any): AppError => {
  if (err.errors) {
    const errorMessages = Object.values(err.errors).map((el: any) => el.message);
    const message = `Invalid input data: ${errorMessages.join(". ")}`;
    return new AppError(message, 400);
  }
  return new AppError("Validation failed, but no specific details were provided.", 400);
};


// Handle Mongoose duplicate field errors
const handleDuplicateFieldsDB = (err: any): AppError => {
  const value = err.keyValue ? JSON.stringify(err.keyValue) : "Duplicate value";
  const message = `Duplicate field value: ${value}. Please use another value.`;
  return new AppError(message, 400);
};

// Handle Mongoose cast errors
const handleCastErrorDB = (err: any): AppError => {
  const message = `Invalid ${err.path}: ${err.value}. Please provide a valid value.`;
  return new AppError(message, 400);
};

// Send JSON-based error response
const sendErrorJSON = (err: ErrorHandler, res: Response) => {
  res.status(err.statusCode || 500).json({
    status: err.status || "error",
    message: err.message || "Something went wrong.",
  });
};

// Global Error Middleware
export default (err: ErrorHandler, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Handle specific errors
  if (err.name === "ValidationError") err = handleValidationErrorDB(err);
  if (err.code === 11000) err = handleDuplicateFieldsDB(err);
  if (err.name === "CastError") err = handleCastErrorDB(err);

  // Send error response
  sendErrorJSON(err, res);
};
