import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app";

dotenv.config();

const port: number = parseInt(process.env.PORT || "5000", 10);

mongoose
  .connect(process.env.MONGODB_URL as string)
  .then(() => {
    console.log("Database connection successful...");
  })
  .catch((err: Error) => {
    console.error("Database connection error:", err.message);
  });

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
