"use client";

import { useState, useEffect, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  api,
  ApiError,
  CheckoutConnection,
  CreateConnectionResult,
  SaleSummary,
} from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { FormInput } from "@/components/form-input";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  paid: { label: "Pago", className: "bg-green-50 text-green-700" },
  pending: { label: "Pendente", className: "bg-amber-50 text-amber-700" },
  refunded: { label: "Reembolsado", className: "bg-gray-100 text-gray-600" },
  chargeback: { label: "Chargeback", className: "bg-red-50 text-red-700" },
  canceled: { label: "Cancelado", className: "bg-gray-100 text-gray-600" },
};

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CheckoutIntegrationPage() {
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();

  const [connections, setConnections] = useState<CheckoutConnection[]>([]);
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [label, setLabel] = useState("");
  const [newConnection, setNewConnection] = useState<CreateConnectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    const [connectionsData, salesData] = await Promise.all([
      api.listCheckoutConnections(accessToken),
      api.listRecentSales(accessToken),
    ]);
    setConnections(connectionsData);
    setSales(salesData);
  }, [accessToken]);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await api.createCheckoutConnection(accessToken, label);
      setNewConnection(result);
      setLabel("");
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar conexão.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!accessToken) return;
    if (!confirm("Remover esta conexão? Vendas já registradas não são apagadas.")) return;

    try {
      await api.deleteCheckoutConnection(accessToken, id);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao remover conexão.");
    }
  }

  async function handleTestEvent(id: string) {
    if (!accessToken) return;
    setError(null);
    setTestMessage(null);

    try {
      await api.sendTestEvent(accessToken, id);
      setTestMessage("Evento de teste enviado! Atualizando lista de vendas em 2s...");
      setTimeout(loadData, 2000); // dá tempo do worker processar antes de recarregar
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao enviar evento de teste.");
    }
  }

  if (isLoading || !user) return null;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">
          ← Voltar
        </Link>

        <div className="mt-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <h1 className="text-2xl font-semibold text-brand-900">Integração de Checkout</h1>
          <p className="mt-1 text-sm text-gray-500">
            Webhook genérico — conecte qualquer plataforma de checkout customizada.
          </p>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
          {testMessage && (
            <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">
              {testMessage}
            </p>
          )}

          {/* Conexão recém-criada — mostra URL + secret UMA vez */}
          {newConnection && (
            <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm">
              <p className="font-medium text-brand-900">
                Conexão criada! Guarde o secret abaixo — ele não será mostrado de novo.
              </p>
              <p className="mt-2">
                <span className="text-gray-500">Webhook URL:</span>{" "}
                <code className="break-all">{newConnection.webhookUrl}</code>
              </p>
              <p className="mt-1">
                <span className="text-gray-500">Secret:</span>{" "}
                <code className="break-all">{newConnection.webhookSecret}</code>
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Assine cada requisição com HMAC-SHA256 do corpo (JSON) usando esse secret, e
                envie no header <code>x-adtrack-signature</code> (em hex).
              </p>
            </div>
          )}

          {/* Lista de conexões */}
          <ul className="mt-6 flex flex-col divide-y divide-gray-100">
            {connections.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {c.label || "Webhook genérico"}
                  </p>
                  <p className="text-xs text-gray-400">{c.id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleTestEvent(c.id)}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Enviar evento de teste
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
            {connections.length === 0 && (
              <li className="py-3 text-sm text-gray-400">Nenhuma conexão criada ainda.</li>
            )}
          </ul>

          {/* Criar nova conexão */}
          <form onSubmit={handleCreate} className="mt-8 flex items-end gap-3 border-t border-gray-100 pt-6">
            <div className="flex-1">
              <FormInput
                id="label"
                label="Rótulo (opcional)"
                placeholder="Ex: Checkout da loja principal"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
            >
              {isSubmitting ? "Criando..." : "Nova conexão"}
            </button>
          </form>
        </div>

        {/* Vendas recentes */}
        <div className="mt-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-lg font-semibold text-brand-900">Vendas recentes</h2>
          <p className="mt-1 text-sm text-gray-500">
            Últimas 20 vendas registradas via webhook (qualquer conexão).
          </p>

          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th className="pb-2">Pedido</th>
                <th className="pb-2">Produto</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Valor</th>
                <th className="pb-2">Origem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sales.map((s) => {
                const statusInfo = STATUS_LABELS[s.status] ?? {
                  label: s.status,
                  className: "bg-gray-100 text-gray-600",
                };
                return (
                  <tr key={s.id}>
                    <td className="py-2 font-mono text-xs text-gray-500">{s.externalId}</td>
                    <td className="py-2">{s.productName ?? "—"}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="py-2">{formatCurrency(s.amountCents)}</td>
                    <td className="py-2 text-xs text-gray-500">
                      {s.utmSource ?? "—"}
                      {s.utmCampaign ? ` / ${s.utmCampaign}` : ""}
                    </td>
                  </tr>
                );
              })}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-sm text-gray-400">
                    Nenhuma venda registrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
