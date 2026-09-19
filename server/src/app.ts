import express, { type Request, type Response, type NextFunction } from "express";
import { errorHandler } from "./middleware/error.middleware";


export function createApp() {
    const app = express();
    app.use(express.json());

    app.get("/health", (req: Request, res: Response) => {
        res.status(200).json({ status: "ok" });
    });
    
    app.use((req: Request, res: Response) => {
        res.status(404).json({ error: "Not found", path: req.originalUrl });
    });

    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        console.error(err);
        res.status(500).json({ error: "Internal server error", message: err.message });
    });

    app.use((err: unknown, req: Request, res: Response, next: NextFunction) => errorHandler(err, res));

    return app;
}