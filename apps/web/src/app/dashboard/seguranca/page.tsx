"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { FormInput } from "@/components/form-input";

export default function SegurancaPage() {
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeDataUrl: string } | null>(
    null,
  );
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    api.me(accessToken).then((data) => setTwoFactorEnabled(data.user.twoFactorEnabled));
  }, [accessToken]);

  async function handleStartSetup() {
    if (!accessToken) return;
    setError(null);
    try {
      const data = await api.setupTwoFactor(accessToken);
      setSetupData(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao iniciar configuração.");
    }
  }

  async function handleConfirmEnable(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError(null);
    setIsSubmitting(true);

    try {
      await api.enableTwoFactor(accessToken, code);
      setTwoFactorEnabled(true);
      setSetupData(null);
      setCode("");
      setMessage("Autenticação em duas etapas ativada com sucesso.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Código inválido.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDisable(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError(null);
    setIsSubmitting(true);

    try {
      await api.disableTwoFactor(accessToken, code);
      setTwoFactorEnabled(false);
      setCode("");
      setMessage("Autenticação em duas etapas desativada.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Código inválido.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || !user) return null;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-xl">
        <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">
          ← Voltar
        </Link>

        <div className="mt-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <h1 className="text-2xl font-semibold text-brand-900">Segurança</h1>
          <p className="mt-1 text-sm text-gray-500">
            Autenticação em duas etapas (2FA) com aplicativo autenticador.
          </p>

          {message && (
            <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {/* Estado: 2FA já ativo -> permite desativar */}
          {twoFactorEnabled && !setupData && (
            <form onSubmit={handleDisable} className="mt-6 flex flex-col gap-4">
              <p className="text-sm text-gray-700">
                2FA está <strong>ativo</strong> na sua conta. Digite um código atual para
                desativar.
              </p>
              <FormInput
                id="disableCode"
                label="Código"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                minLength={6}
                maxLength={6}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-fit rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                {isSubmitting ? "Desativando..." : "Desativar 2FA"}
              </button>
            </form>
          )}

          {/* Estado: 2FA desativado, sem setup em andamento */}
          {!twoFactorEnabled && !setupData && (
            <div className="mt-6">
              <p className="text-sm text-gray-700">2FA está desativado nesta conta.</p>
              <button
                onClick={handleStartSetup}
                className="mt-3 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-500"
              >
                Ativar 2FA
              </button>
            </div>
          )}

          {/* Estado: setup em andamento -> mostra QR code + pede confirmação */}
          {setupData && (
            <form onSubmit={handleConfirmEnable} className="mt-6 flex flex-col gap-4">
              <p className="text-sm text-gray-700">
                Escaneie o QR code com o Google Authenticator, Authy ou similar:
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={setupData.qrCodeDataUrl}
                alt="QR code para configurar 2FA"
                className="h-48 w-48 self-center"
              />
              <p className="text-center text-xs text-gray-400">
                Ou digite manualmente: <code className="font-mono">{setupData.secret}</code>
              </p>
              <FormInput
                id="confirmCode"
                label="Digite o código gerado pelo app para confirmar"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                minLength={6}
                maxLength={6}
                autoFocus
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
              >
                {isSubmitting ? "Confirmando..." : "Confirmar e ativar"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
