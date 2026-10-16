import { Navigate, Outlet } from "react-router";
import { useMe } from "../hooks/useMe";

export default function PublicOnly() {
    const { data: me, isPending } = useMe();

    if (isPending) {
        return <p className="p-6 text-ink-muted"> Loading...</p>;
    }

    if (me) return <Navigate to="/" replace />;
    return <Outlet />;
}

