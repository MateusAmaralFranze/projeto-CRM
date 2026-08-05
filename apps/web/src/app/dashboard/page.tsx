"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const router = useRouter();
  const { user, workspace, role, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">Carregando...</p>
      </main>
    );
  }

  if (!user) return null; // evita flash de conteúdo antes do redirect

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-brand-900">
            Bem-vindo, {user.name}
          </h1>
          <button
            onClick={logout}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Sair
          </button>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-400">Workspace</dt>
            <dd className="font-medium text-gray-900">{workspace?.name}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Papel</dt>
            <dd className="font-medium text-gray-900">{role}</dd>
          </div>
          <div>
            <dt className="text-gray-400">E-mail</dt>
            <dd className="font-medium text-gray-900">{user.email}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Slug</dt>
            <dd className="font-medium text-gray-900">{workspace?.slug}</dd>
          </div>
        </dl>

        <p className="mt-8 text-sm text-gray-400">
          Este é um dashboard temporário — o dashboard real (KPIs, gráficos, filtros)
          chega na Etapa 7.
        </p>

        <div className="mt-4 flex gap-4 border-t border-gray-100 pt-4">
          <Link href="/dashboard/seguranca" className="text-sm text-brand-600 hover:underline">
            Segurança (2FA)
          </Link>
          <Link href="/dashboard/equipe" className="text-sm text-brand-600 hover:underline">
            Equipe
          </Link>
        </div>
      </div>
    </main>
  );
}
