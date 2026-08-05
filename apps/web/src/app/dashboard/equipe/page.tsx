"use client";

import { useState, useEffect, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError, MemberSummary } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { FormInput } from "@/components/form-input";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  traffic_manager: "Gestor de Tráfego",
  closer: "Closer / Vendedor",
  viewer: "Visualizador",
};

export default function EquipePage() {
  const router = useRouter();
  const { user, role, accessToken, isLoading } = useAuth();

  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [inviteRole, setInviteRole] = useState("traffic_manager");
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = role === "owner" || role === "admin";

  const loadMembers = useCallback(async () => {
    if (!accessToken) return;
    const data = await api.listMembers(accessToken);
    setMembers(data);
  }, [accessToken]);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError(null);
    setInviteLink(null);
    setIsSubmitting(true);

    try {
      const result = await api.inviteMember(accessToken, { email, name, role: inviteRole });
      if (result.status === "invited") {
        setInviteLink(result.inviteUrl);
      }
      setEmail("");
      setName("");
      await loadMembers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao convidar membro.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove(membershipId: string) {
    if (!accessToken) return;
    if (!confirm("Remover este membro do workspace?")) return;

    try {
      await api.removeMember(accessToken, membershipId);
      await loadMembers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao remover membro.");
    }
  }

  if (isLoading || !user) return null;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">
          ← Voltar
        </Link>

        <div className="mt-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <h1 className="text-2xl font-semibold text-brand-900">Equipe</h1>
          <p className="mt-1 text-sm text-gray-500">Membros deste workspace e seus papéis.</p>

          {/* Lista de membros */}
          <ul className="mt-6 flex flex-col divide-y divide-gray-100">
            {members.map((m) => (
              <li key={m.membershipId} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-400">{m.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{ROLE_LABELS[m.role] ?? m.role}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      m.status === "active"
                        ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {m.status === "active" ? "Ativo" : "Convite pendente"}
                  </span>
                  {canManage && m.role !== "owner" && (
                    <button
                      onClick={() => handleRemove(m.membershipId)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Formulário de convite — só owner/admin */}
          {canManage && (
            <form onSubmit={handleInvite} className="mt-8 flex flex-col gap-4 border-t border-gray-100 pt-6">
              <h2 className="text-sm font-semibold text-gray-900">Convidar novo membro</h2>

              <FormInput
                id="inviteName"
                label="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
              <FormInput
                id="inviteEmail"
                label="E-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div className="flex flex-col gap-1.5">
                <label htmlFor="inviteRole" className="text-sm font-medium text-gray-700">
                  Papel
                </label>
                <select
                  id="inviteRole"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="admin">Admin</option>
                  <option value="traffic_manager">Gestor de Tráfego</option>
                  <option value="closer">Closer / Vendedor</option>
                  <option value="viewer">Visualizador</option>
                </select>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}

              {inviteLink && (
                <div className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-900">
                  Convite criado! Como ainda não temos envio automático de e-mail, copie e
                  mande este link manualmente:
                  <br />
                  <code className="break-all">{inviteLink}</code>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-fit rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
              >
                {isSubmitting ? "Convidando..." : "Convidar"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
