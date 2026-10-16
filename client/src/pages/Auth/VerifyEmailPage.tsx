import { Link, useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { verifyEmail } from "../../api/auth";
import { messageFor } from "../../api/errors";

export default function VerifyEmailPage() {
    const [params] = useSearchParams();
    const token = params.get("token");
    const qc = useQueryClient();

    const verify = useQuery({
        queryKey: ["verify-email", token],
        queryFn: async () =>  {
            await verifyEmail(token!);
            await qc.invalidateQueries({ queryKey: ["me"] });
            return true;
        },
        enabled: !!token,
        retry: false,
        staleTime: Infinity
    });

    if (!token) return (
        <div className="min-h-screen flex items-center justify-center px-4 font-sans">
            <div className="w-full max-w-sm p-8 rounded-lg bg-surface-1 border border-line space-y-3 text-ink">
                <img src="/error.svg" alt="Error" className="w-12 h-12 mx-auto" />
                <p className="text-sm text-ink-muted text-center">
                    Verification link is missing its token.
                </p>
            </div>
        </div>
    );
    if (verify.isPending) return (
        <div className="min-h-screen flex items-center justify-center px-4 font-sans">
            <div className="w-full max-w-sm p-8 rounded-lg bg-surface-1 border border-line space-y-3 text-ink">
                <img src="/error.svg" alt="Verifying" className="w-12 h-12 mx-auto" />
                <p className="text-sm text-ink-muted text-center">
                    Verifying your email..
                </p>
            </div>
        </div>
    );

    if (verify.isError) return (
        <div className="min-h-screen flex items-center justify-center px-4 font-sans">
            <div className="w-full max-w-sm p-8 rounded-lg bg-surface-1 border border-line space-y-3 text-ink">
                <img src="/error.svg" alt="Error" className="w-12 h-12 mx-auto" />
                <p className="text-sm text-ink-muted text-center">
                    {messageFor(verify.error)}
                </p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center px-4 font-sans">
            <div className="w-full max-w-sm p-8 rounded-lg bg-surface-1 border border-line space-y-3 text-ink">
                <img src="/success.svg" alt="Success" className="w-12 h-12 mx-auto" />
                <p className="text-sm text-ink-muted text-center">
                    Email verified. <Link to="/" className="text-accent hover:text-accent-hover font-medium">Continue to wirechat</Link>
                </p>
            </div>
        </div>
    )
}