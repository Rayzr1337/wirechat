import express, { type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middleware/error.middleware";
import { AppError } from "./middleware/error.middleware";

import { authRouter } from "./routes/auth.routes";
import { usersRouter } from "./routes/user.routes";
import { messagesRouter } from "./routes/messages.routes";
import { roomsRouter } from "./routes/rooms.routes";

import rateLimit from "express-rate-limit";
import helmet from "helmet";


export function createApp() {
    const app = express();
    app.set('trust proxy', 1);
    app.use(helmet());


    app.use(express.json());
    app.use(cookieParser());

    const apiLimit = rateLimit({
      windowMs: 15 * 60 * 1000, 
      max: 100, 
      standardHeaders: 'draft-7', 
      legacyHeaders: false, 
      message: {
        status: 429,
        message: 'Too many requests from this IP, please try again later.'
      }
    });

    const authLimit = rateLimit({
      windowMs: 15 * 60 * 1000, 
      max: 10, 
      standardHeaders: 'draft-7', 
      legacyHeaders: false, 
      message: {
        status: 429,
        message: 'Too many authentication attempts from this IP, please try again later.'
      }
    });

    app.use("/api", apiLimit);

    app.get("/health", (req: Request, res: Response) => {
        res.status(200).json({ status: "ok" });
    });

    app.use("/api/auth", authLimit, authRouter);
    app.use("/api/users", usersRouter);
    app.use("/api/messages", messagesRouter);
    app.use("/api/rooms", roomsRouter);

    app.use((req: Request, res: Response, next: NextFunction) => {
        next(new AppError(404, "NOT_FOUND", `Cannot ${req.method} ${req.originalUrl}`));
    });

    app.use((err: unknown, req: Request, res: Response, next: NextFunction) => errorHandler(err, res));

    return app;
}