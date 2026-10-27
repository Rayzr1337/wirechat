import { Navigate, Outlet } from "react-router";
import { useMe } from "../hooks/useMe";

export default function RequireAuth() {
    const { data: me, isPending, isError, refetch } = useMe();

    if (isPending) {
        return <p className="p-6 text-ink-muted"> Loading...</p>;
    }

    if (isError) {
        return(
            <div className="min-h-screen flex items-center justify-center px-4 font-sans">
                <div className="w-full max-w-sm p-8 rounded-lg bg-surface-1 border border-line space-y-3 text-ink">
                    <img src="/error.svg" alt="Error" className="w-12 h-12 mx-auto" />
                    <h1 className="text-lg font-display tracking-tight text-ink">Unable to connect to server</h1>
                    <p className="text-sm text-ink-muted text-center">
                        wirechat is having trouble connecting to the server. Please check your connection or try again later.
                    </p>
                    <button onClick={() => refetch()}
                            className="w-full py-2.5 rounded-md bg-accent hover:bg-accent-hover text-surface-0 font-medium text-sm transition-colors">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (me === null) return <Navigate to="/login" replace />;
    return <Outlet />;
}
