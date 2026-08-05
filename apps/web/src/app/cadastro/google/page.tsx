"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { FormInput } from "@/components/form-input";

export default function CadastroGooglePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const googleToken = searchParams.get("token");

  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!googleToken) {
      setError("Sessão do Google expirada. Volte e tente novamente.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const result = await api.signupWithGoogle(workspaceName, googleToken);
      setSession(result);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar conta.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!googleToken) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <p className="text-sm text-red-600">Sessão do Google expirada.</p>
          <a href="/login" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
            Voltar para o login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <h1 className="text-2xl font-semibold text-brand-900">Quase lá</h1>
        <p className="mt-1 text-sm text-gray-500">
          Como sua empresa/agência se chama? Isso cria seu workspace no AdTrack.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <FormInput
            id="workspaceName"
            label="Nome da empresa/agência"
            placeholder="Minha Agência"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            required
            minLength={2}
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
            {isSubmitting ? "Criando..." : "Criar workspace"}
          </button>
        </form>
      </div>
    </main>
  );
}
