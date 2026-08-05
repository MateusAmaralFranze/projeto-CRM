"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithTokens } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");

    if (!accessToken || !refreshToken) {
      setError("Não foi possível concluir o login com Google.");
      return;
    }

    loginWithTokens(accessToken, refreshToken)
      .then(() => router.push("/dashboard"))
      .catch(() => setError("Sessão do Google inválida ou expirada. Tente novamente."));
  }, [searchParams, loginWithTokens, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-sm text-red-600">{error}</p>
            <a href="/login" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
              Voltar para o login
            </a>
          </>
        ) : (
          <p className="text-sm text-gray-500">Finalizando login com Google...</p>
        )}
      </div>
    </main>
  );
}
