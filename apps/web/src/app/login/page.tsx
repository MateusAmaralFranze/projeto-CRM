"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, WorkspaceChoice } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { FormInput } from "@/components/form-input";

type Step =
  | { name: "credentials" }
  | { name: "twoFactor"; twoFaToken: string }
  | { name: "chooseWorkspace"; preAuthToken: string; workspaces: WorkspaceChoice[] };

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<Step>({ name: "credentials" });

  // Se o Google redirecionou pra cá com múltiplos workspaces, já busca a lista
  useEffect(() => {
    const preAuthToken = searchParams.get("preAuthToken");
    if (!preAuthToken) return;

    api
      .getWorkspacesForPreAuthToken(preAuthToken)
      .then((workspaces) => setStep({ name: "chooseWorkspace", preAuthToken, workspaces }))
      .catch(() => setError("Sessão expirada. Faça login novamente."));
  }, [searchParams]);

  async function handleCredentialsSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await api.login({ email, password });

      if (result.requires2FA) {
        setStep({ name: "twoFactor", twoFaToken: result.twoFaToken });
      } else if (result.requiresWorkspaceSelection) {
        setStep({
          name: "chooseWorkspace",
          preAuthToken: result.preAuthToken,
          workspaces: result.workspaces,
        });
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

  async function handleTwoFactorSubmit(e: FormEvent) {
    e.preventDefault();
    if (step.name !== "twoFactor") return;
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await api.verifyLoginTwoFactor(step.twoFaToken, code);
      if (result.requiresWorkspaceSelection) {
        setStep({
          name: "chooseWorkspace",
          preAuthToken: result.preAuthToken,
          workspaces: result.workspaces,
        });
      } else {
        setSession(result);
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Código inválido.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSelectWorkspace(workspaceId: string) {
    if (step.name !== "chooseWorkspace") return;
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await api.selectWorkspace(step.preAuthToken, workspaceId);
      setSession(result);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao selecionar workspace.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ---- Tela: escolher workspace ----
  if (step.name === "chooseWorkspace") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <h1 className="text-2xl font-semibold text-brand-900">Escolha o workspace</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sua conta tem acesso a mais de uma empresa.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            {step.workspaces.map((ws) => (
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

  // ---- Tela: código 2FA ----
  if (step.name === "twoFactor") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <h1 className="text-2xl font-semibold text-brand-900">Verificação em duas etapas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Digite o código de 6 dígitos do seu aplicativo autenticador.
          </p>

          <form onSubmit={handleTwoFactorSubmit} className="mt-6 flex flex-col gap-4">
            <FormInput
              id="code"
              label="Código"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={6}
              minLength={6}
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
              {isSubmitting ? "Verificando..." : "Verificar"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ---- Tela: e-mail/senha (padrão) ----
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <h1 className="text-2xl font-semibold text-brand-900">Entrar</h1>
        <p className="mt-1 text-sm text-gray-500">Acesse sua conta AdTrack.</p>

        <a
          href={api.googleLoginUrl()}
          className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Continuar com Google
        </a>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">ou</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-4">
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
