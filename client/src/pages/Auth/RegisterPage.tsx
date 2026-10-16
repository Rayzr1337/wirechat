import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router";
import { registerSchema, type RegisterInput } from "../../validation";
import { useRegister } from "../../hooks/useAuth";
import { messageFor } from "../../api/errors";

export default function RegisterPage() {
    const { register: registerField, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
        resolver: zodResolver(registerSchema),
    });

    const registerMutation = useRegister();

    function onSubmit(data: RegisterInput) {
        registerMutation.mutate({ username: data.username, email: data.email, password: data.password });
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 font-sans">
            <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm p-8 rounded-lg bg-surface-1 border border-line space-y-3 text-ink">
                <h1 className="text-lg font-display tracking-tight text-ink">Create your account</h1>

                <div className="space-y-1">
                    <label className="text-xs text-ink-muted">Username</label>
                    <input
                        {...registerField("username")}
                        type="text"
                        placeholder="Username"
                        className={`w-full rounded-md bg-surface-3 px-3 py-2 ${errors.username ? "border border-red-500" : ""}`}
                    />
                    {errors.username && <p className="text-xs text-red-500">{errors.username.message}</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-ink-muted">Email</label>
                    <input
                        {...registerField("email")}
                        type="email"
                        placeholder="Email"
                        className={`w-full rounded-md bg-surface-3 px-3 py-2 ${errors.email ? "border border-red-500" : ""}`}
                    />
                    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-ink-muted">Password</label>
                    <input
                        {...registerField("password")}
                        type="password"
                        placeholder="Password"
                        className={`w-full rounded-md bg-surface-3 px-3 py-2 ${errors.password ? "border border-red-500" : ""}`}
                    />
                    {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-ink-muted">Confirm Password</label>
                    <input
                        {...registerField("confirmPassword")}
                        type="password"
                        placeholder="Confirm Password"
                        className={`w-full rounded-md bg-surface-3 px-3 py-2 ${errors.confirmPassword ? "border border-red-500" : ""}`}
                    />
                    {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
                </div>

                {registerMutation.error && <p className="text-sm text-red-400">{messageFor(registerMutation.error)}</p>}

                <button disabled={registerMutation.isPending} className="w-full py-2.5 rounded-md bg-accent hover:bg-accent-hover text-surface-0 font-medium text-sm transition-colors">
                    {registerMutation.isPending ? "Creating account..." : "Create account"}
                </button>
                <Link to="/login" className="block text-sm text-ink-muted text-center mt-4">
                    Already have an account? Sign in.
                </Link>
            </form>
        </div>
    );
}
