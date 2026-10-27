import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router";
import { loginSchema, type LoginInput } from "../../validation";
import { useLogin } from "../../hooks/useAuth";
import { messageFor } from "../../api/errors";
import { EyeIcon } from "../../components/icons";
import { useState } from "react";

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
    });
    const login = useLogin();

    function onSubmit(data: LoginInput) {
        login.mutate(data);
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 font-sans">
            <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm p-8 rounded-lg bg-surface-1 border border-line space-y-3 text-ink">
                <h1 className="text-lg font-display tracking-tight text-ink">Sign in to wirechat</h1>

                <div className="space-y-1">
                    <label className="text-xs text-ink-muted">Email</label>
                    <input
                        {...register("email")}
                        type="email"
                        placeholder="Email"
                        className={`w-full rounded-md bg-surface-3 px-3 py-2 ${errors.email ? "border border-red-500" : ""}`}
                    />
                    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-ink-muted">Password</label>
                    <div className="relative">
                        <input
                            {...register("password")}
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            className={`w-full rounded-md bg-surface-3 px-3 py-2 pr-8 ${errors.password ? "border border-red-500" : ""}`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-2 rounded text-ink-muted"
                        >
                            <EyeIcon size={16} color="#8b8b9e" />
                        </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                </div>

                {login.error && <p className="text-sm text-red-400">{messageFor(login.error)}</p>}

                <button disabled={login.isPending} className="w-full py-2.5 rounded-md bg-accent hover:bg-accent-hover text-surface-0 font-medium text-sm transition-colors">
                    {login.isPending ? "Signing in..." : "Sign in"}
                </button>
                <Link to="/register" className="block text-sm text-ink-muted text-center mt-4">
                    Don't have an account? Create one.
                </Link>
            </form>
        </div>
    );
}
