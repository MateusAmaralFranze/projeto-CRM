"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, AuthWorkspace } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { FormInput } from "@/components/form-input";

type WorkspaceChoice = AuthWorkspace & { role: string };

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preenchido apenas quando o usuário pertence a mais de 1 workspace
  const [pendingChoice, setPendingChoice] = useState<{
    preAuthToken: string;
    workspaces: WorkspaceChoice[];
  } | null>(null);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await api.login({ email, password });

      if (result.requiresWorkspaceSelection) {
        setPendingChoice({ preAuthToken: result.preAuthToken, workspaces: result.workspaces });
      } else {
        setSession(result);
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao entrar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSelectWorkspace(workspaceId: string) {
    if (!pendingChoice) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await api.selectWorkspace(pendingChoice.preAuthToken, workspaceId);
      setSession(result);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao selecionar workspace.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Tela 2: escolher qual workspace usar
  if (pendingChoice) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <h1 className="text-2xl font-semibold text-brand-900">Escolha o workspace</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sua conta tem acesso a mais de uma empresa.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            {pendingChoice.workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => handleSelectWorkspace(ws.id)}
                disabled={isSubmitting}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm transition hover:border-brand-500 hover:bg-brand-50 disabled:opacity-60"
              >
                <span className="font-medium text-gray-900">{ws.name}</span>
                <span className="text-xs uppercase text-gray-400">{ws.role}</span>
              </button>
            ))}
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
        </div>
      </main>
    );
  }

  // Tela 1: e-mail/senha
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <h1 className="text-2xl font-semibold text-brand-900">Entrar</h1>
        <p className="mt-1 text-sm text-gray-500">Acesse sua conta AdTrack.</p>

        <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-4">
          <FormInput
            id="email"
            label="E-mail"
            type="email"
            placeholder="voce@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <FormInput
            id="password"
            label="Senha"
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-60"
          >
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-brand-600 hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}
