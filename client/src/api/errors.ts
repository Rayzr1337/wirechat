import { ApiError } from "./client";

export function messageFor(err: unknown): string {
    if (err instanceof ApiError) {
        if (err.code === "VALIDATION_ERROR") return "Please check the fields and try again.";
        return err.message;
    }

    return "Could not reach the server. Try again.";
}

