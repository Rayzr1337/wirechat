import { Link } from "react-router";
import { MailIcon, WarningIcon } from "../../components/icons";
import { useResendVerification } from "../../hooks/useAuth";

export default function VerificationSentPage() {
    const { mutate: resendVerification, isPending: resendPending } = useResendVerification();

    return (
        <div className="min-h-screen flex items-center justify-center px-4 font-sans">
            <div className="w-full max-w-sm p-8 rounded-lg bg-surface-1 border border-line space-y-4 text-ink">
                <div className="flex items-center justify-center space-y-2">
                    <MailIcon size={40} color="#7c6ff0" />
                </div>
                <h1 className="text-lg font-display tracking-tight text-ink text-center">Verification email sent</h1>
                <p className="text-sm text-ink-muted text-center leading-relaxed">
                    We’ve sent a verification link to your email address. Please verify your email to unlock group
                    rooms and start chatting.
                </p>
                <div className="flex items-center gap-2 text-xs text-ink-muted">
                    <WarningIcon size={14} color="#e0b64f" />
                    <span>Check your spam or junk folder if you don’t see it within a few minutes.</span>
                </div>
                <button
                    onClick={() => resendVerification()}
                    disabled={resendPending}
                    className="w-full py-2.5 rounded-md border border-line text-sm text-ink hover:bg-surface-2 disabled:opacity-50"
                >
                    {resendPending ? "Sending..." : "Resend verification email"}
                </button>
                <p className="text-xs text-ink-muted text-center">
                    Already verified?{" "}
                    <Link to="/login" className="text-accent hover:text-accent-hover font-medium">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
