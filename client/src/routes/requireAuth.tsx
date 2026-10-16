import { Navigate, Outlet } from "react-router";
import { useMe } from "../hooks/useMe";

export default function RequireAuth() {
    const { data: me, isPending, isError, refetch } = useMe();

    if (isPending) {
        return <p className="p-6 text-ink-muted"> Loading...</p>;
    }

    if (isError) {
        return(
            <div className="p-6 text-ink">
                <p>Cannot reach the server.</p>
                <button onClick={() => refetch()}>Retry</button>
            </div>
        );
    }

    if (me === null) return <Navigate to="/login" replace />;
    return <Outlet />;
}
