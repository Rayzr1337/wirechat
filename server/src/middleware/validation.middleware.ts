import { AppError } from './error.middleware'
import { Request, Response, NextFunction } from 'express'
import { ZodType } from 'zod'

export function validate(schema: ZodType) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            return next(new AppError(
                400,
                "VALIDATION_ERROR",
                "Request body failed validation.",
                result.error.flatten().fieldErrors
            ));
        }
        req.body = result.data;
        next();
    };
}

export function validateQuery(schema: ZodType) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.query);
        if (!result.success) {
            return next(new AppError(
                400,
                "VALIDATION_ERROR",
                "Query parameters failed validation.",
                result.error.flatten().fieldErrors
            ));
        }
        req.parseQuery = result.data as any;
        next();
    };
}