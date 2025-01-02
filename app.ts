import express, {Request, Response, NextFunction, ErrorRequestHandler} from "express";
import categoryRoutes from "./routes/categoryRoute";
import AppError from "./utils/AppError";
import errorHandler from "./controllers/ErrorController"
const app: express.Application = express();

app.use(express.json());

app.use("/api/v1/categories", categoryRoutes);

app.all("*",(req:Request,res:Response,next:NextFunction)=>{
    next(new AppError(`can't find ${req.originalUrl} on this Server`,404));
})

app.use(errorHandler)

export default app;
