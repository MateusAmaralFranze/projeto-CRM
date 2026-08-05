"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { FormInput } from "@/components/form-input";

export default function ConvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const inviteToken = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!inviteToken) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const result = await api.acceptInvite(inviteToken, password);
      setSession(result);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Convite inválido ou expirado.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!inviteToken) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <p className="text-sm text-red-600">Link de convite inválido.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <h1 className="text-2xl font-semibold text-brand-900">Você foi convidado!</h1>
        <p className="mt-1 text-sm text-gray-500">
          Defina sua senha para ativar sua conta no workspace.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <FormInput
            id="password"
            label="Crie uma senha"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoFocus
          />

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-60"
          >
            {isSubmitting ? "Ativando..." : "Ativar conta e entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
