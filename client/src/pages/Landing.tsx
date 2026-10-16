import { Link, Navigate } from "react-router";
import { useMe } from "../hooks/useMe";

export default function Landing() {
    const { data: me, isPending } = useMe();

    if (isPending) {
        return (
            <div className="min-h-screen flex items-center justify-center text-ink-muted text-sm">
                Loading...
            </div>
        );
    }

    if (me) {
        return <Navigate to="/rooms" replace />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 font-sans">
            <div className="w-full max-w-sm p-8 rounded-lg bg-surface-1 border border-line">
                <div className="text-center space-y-2">
                    <h1 className="text-lg font-display tracking-tight text-accent">
                        Welcome to <span className="font-display font-semibold text-ink"> wirechat</span>
                    </h1>
                    <p className="text-sm text-ink-muted">
                        Real-time messaging for teams and communities
                    </p>
                </div>

                <div className="mt-8 space-y-3">
                    <Link
                        to="/login"
                        className="block w-full py-2.5 px-4 rounded-md bg-accent hover:bg-accent-hover text-surface-0 font-medium text-center text-sm transition-colors"
                    >
                        Sign In
                    </Link>

                    <Link
                        to="/register"
                        className="block w-full py-2.5 px-4 rounded-md border border-line hover:border-line-hover bg-surface-2 hover:bg-surface-3 text-ink font-medium text-center text-sm transition-colors"
                    >
                        Create Account
                    </Link>
                </div>
            </div>
        </div>
    );
}
