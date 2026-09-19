import express, { type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middleware/error.middleware";
import { AppError } from "./middleware/error.middleware";
import { authRouter } from "./routes/auth.routes";


export function createApp() {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());

    app.get("/health", (req: Request, res: Response) => {
        res.status(200).json({ status: "ok" });
    });

    app.use("/api/auth", authRouter);
    
    app.use((req: Request, res: Response, next: NextFunction) => {
        next(new AppError(404, "NOT_FOUND", `Cannot ${req.method} ${req.originalUrl}`));
    });

    app.use((err: unknown, req: Request, res: Response, next: NextFunction) => errorHandler(err, res));

    return app;
}