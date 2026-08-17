'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CallsBarChart, CostLineChart, CreditsByOperationChart } from '@/components/admin/AdminCharts';
import { AdminShell, type AdminTab } from '@/components/admin/AdminShell';
import { formatCount, formatDateTime, formatUsdAmount } from '@/lib/admin/format';
import { LEDGER_POOL_LABELS, LEDGER_TYPE_LABELS, operationCode, operationTitle } from '@/lib/admin/labels';
import type { AiUsageDashboard, AiUsageRange } from '@/lib/admin/ai-usage-stats';
import { USER_FEEDBACK_KIND_LABELS, type UserFeedbackKind } from '@/lib/feedback/kinds';

type UserListItem = {
  id: string;
  emailMasked: string;
  role: string;
  status: string;
  freeCredits: number;
  paidCredits: number;
  lastActivityAt: string | null;
  recentCreditsCharged: number;
};

type UserDetail = {
  id: string;
  email: string;
  emailMasked: string;
  role: string;
  status: string;
  emailVerified: boolean;
  banned: boolean;
  createdAt: string;
  balance: { freeCredits: number; paidCredits: number; totalCredits: number };
  aiSummary?: { calls: number; creditsCharged: number; estimatedCostNanodollars: number };
  recentUsage: Array<{
    id: string;
    operation: string;
    status: string;
    creditsCharged: number;
    createdAt: string;
    estimatedCostNanodollars?: number;
  }>;
  purchases: Array<{
    id: string;
    amount: number;
    packId: string | null;
    label: string;
    createdAt: string;
  }>;
};

type LedgerEntry = {
  id: string;
  amount: number;
  pool: string | null;
  type: string;
  reason: string | null;
  createdAt: string;
};

type FeedbackRow = {
  id: string;
  userId: string;
  emailMasked: string;
  dossierId: string | null;
  operation: string | null;
  kind: UserFeedbackKind;
  rating: string | null;
  comment: string;
  createdAt: string;
};

const RANGE_LABELS: Record<AiUsageRange, string> = {
  today: 'Aujourd’hui',
  '7d': '7 jours',
  '30d': '30 jours',
};

function statusLabel(status: string): string {
  if (status === 'banned') return 'Bloqué';
  if (status === 'unverified') return 'Non vérifié';
  return 'Actif';
}

function roleLabel(role: string): string {
  if (role === 'admin') return 'Admin';
  return 'Utilisateur';
}

function statusClass(status: string): string {
  if (status === 'banned') return 'bg-accent/12 text-accent';
  if (status === 'unverified') return 'bg-desk text-muted';
  return 'bg-primary/10 text-primary';
}

function RangeToggle({
  value,
  onChange,
}: {
  value: AiUsageRange;
  onChange: (range: AiUsageRange) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-line bg-paper p-0.5">
      {(['today', '7d', '30d'] as const).map((range) => (
        <button
          key={range}
          type="button"
          onClick={() => onChange(range)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            value === range ? 'bg-primary text-paper' : 'text-muted hover:text-ink'
          } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
        >
          {RANGE_LABELS[range]}
        </button>
      ))}
    </div>
  );
}

function Kpi({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper px-4 py-3.5 shadow-[0_10px_24px_-22px_rgba(28,25,21,0.45)]">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 font-serif text-[1.65rem] leading-none tracking-tight text-ink">{value}</p>
      {unit ? <p className="mt-1.5 font-mono text-[0.65rem] text-muted">{unit}</p> : null}
    </div>
  );
}

function PaperSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-paper p-5 shadow-[0_10px_24px_-22px_rgba(28,25,21,0.45)]">
      <h2 className="font-serif text-xl font-semibold tracking-tight text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [amount, setAmount] = useState('10');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [feedbackRating, setFeedbackRating] = useState('');
  const [feedbackKind, setFeedbackKind] = useState('');
  const [aiRange, setAiRange] = useState<AiUsageRange>('7d');
  const [ai, setAi] = useState<AiUsageDashboard | null>(null);
  const [usersLoaded, setUsersLoaded] = useState(false);

  const loadAi = useCallback(async (range: AiUsageRange) => {
    const response = await fetch(`/api/admin/ai-usage?range=${range}`);
    const data = (await response.json()) as AiUsageDashboard & { error?: string };
    if (!response.ok) {
      setMessage(data.error || 'Lecture impossible.');
      return;
    }
    setAi(data);
  }, []);

  async function searchUsers(search = query, status = statusFilter, role = roleFilter) {
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (status) params.set('status', status);
    if (role) params.set('role', role);
    const response = await fetch(`/api/admin/users?${params.toString()}`);
    const data = (await response.json()) as { users?: UserListItem[]; error?: string };
    if (!response.ok) {
      setMessage(data.error || 'Recherche impossible.');
      return;
    }
    setUsers(data.users || []);
    setUsersLoaded(true);
  }

  async function loadLedger(userId: string) {
    const response = await fetch(`/api/admin/credits/ledger?userId=${encodeURIComponent(userId)}`);
    const data = (await response.json()) as { ledger?: LedgerEntry[]; error?: string };
    if (!response.ok) {
      setMessage(data.error || 'Lecture du ledger impossible.');
      return;
    }
    setLedger(data.ledger || []);
  }

  async function loadUser(id: string) {
    setSelectedId(id);
    setLedger([]);
    const response = await fetch(`/api/admin/users/${id}`);
    const data = (await response.json()) as { user?: UserDetail; error?: string };
    if (!response.ok || !data.user) {
      setMessage(data.error || 'Lecture impossible.');
      return;
    }
    setDetail(data.user);
    setMessage('');
    await loadLedger(id);
  }

  async function postCredits(path: string, body: Record<string, unknown>) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as { error?: string; balance?: UserDetail['balance'] };
    if (!response.ok) {
      throw new Error(data.error || 'Action impossible.');
    }
    if (data.balance && detail) {
      setDetail({ ...detail, balance: data.balance });
    }
  }

  async function gift() {
    if (!detail) return;
    setMessage('');
    try {
      await postCredits('/api/admin/credits/gift', {
        userId: detail.id,
        amount: Number(amount),
        reason,
      });
      setMessage('Cadeau enregistré sur les crédits achetés.');
      await loadUser(detail.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erreur.');
    }
  }

  async function adjust(sign: 1 | -1) {
    if (!detail) return;
    setMessage('');
    try {
      await postCredits('/api/admin/credits/adjust', {
        userId: detail.id,
        amount: sign * Math.abs(Number(amount)),
        pool: 'PAID',
        reason,
      });
      setMessage('Ajustement enregistré.');
      await loadUser(detail.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erreur.');
    }
  }

  async function loadFeedback() {
    const response = await fetch('/api/admin/feedback');
    const data = (await response.json()) as { feedbacks?: FeedbackRow[]; error?: string };
    if (!response.ok) {
      setMessage(data.error || 'Lecture impossible.');
      return;
    }
    setFeedbacks(data.feedbacks || []);
  }

  function selectTab(next: AdminTab) {
    setTab(next);
    setMessage('');
    if (next === 'users' && !usersLoaded) {
      void searchUsers(query);
    }
    if (next === 'feedback' && feedbacks.length === 0) {
      void loadFeedback();
    }
    if ((next === 'overview' || next === 'ai') && !ai) {
      void loadAi(aiRange);
    }
  }

  useEffect(() => {
    // GET initial de la vue d’ensemble ; setState uniquement après la réponse.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAi('7d');
  }, [loadAi]);

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((row) => {
      if (feedbackRating && row.rating !== feedbackRating) return false;
      if (feedbackKind && row.kind !== feedbackKind) return false;
      return true;
    });
  }, [feedbacks, feedbackKind, feedbackRating]);

  return (
    <AdminShell tab={tab} onTabChange={selectTab}>
      {tab === 'overview' ? (
        <OverviewPanel
          ai={ai}
          range={aiRange}
          onRangeChange={(range) => {
            setAiRange(range);
            void loadAi(range);
          }}
        />
      ) : null}

      {tab === 'ai' ? (
        <AiPanel
          ai={ai}
          range={aiRange}
          onRangeChange={(range) => {
            setAiRange(range);
            void loadAi(range);
          }}
        />
      ) : null}

      {tab === 'users' ? (
        <UsersPanel
          query={query}
          statusFilter={statusFilter}
          roleFilter={roleFilter}
          users={users}
          selectedId={selectedId}
          detail={detail}
          amount={amount}
          reason={reason}
          ledger={ledger}
          onQuery={setQuery}
          onStatusFilter={setStatusFilter}
          onRoleFilter={setRoleFilter}
          onSearch={() => void searchUsers()}
          onSelect={(id) => void loadUser(id)}
          onBack={() => {
            setSelectedId('');
            setDetail(null);
            setLedger([]);
          }}
          onAmount={setAmount}
          onReason={setReason}
          onGift={() => void gift()}
          onAdjust={(sign) => void adjust(sign)}
        />
      ) : null}

      {tab === 'feedback' ? (
        <FeedbackPanel
          rows={filteredFeedbacks}
          rating={feedbackRating}
          kind={feedbackKind}
          onRating={setFeedbackRating}
          onKind={setFeedbackKind}
        />
      ) : null}

      {message ? (
        <p className="mt-4 text-sm text-ink" role="status">
          {message}
        </p>
      ) : null}
    </AdminShell>
  );
}

function OverviewPanel({
  ai,
  range,
  onRangeChange,
}: {
  ai: AiUsageDashboard | null;
  range: AiUsageRange;
  onRangeChange: (range: AiUsageRange) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[1.85rem] font-semibold tracking-tight text-ink">Administration</h1>
          <p className="mt-1 text-sm text-muted">Utilisateurs, crédits et activité d’Assistant.</p>
        </div>
        <RangeToggle value={range} onChange={onRangeChange} />
      </div>

      {ai ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Appels IA" value={formatCount(ai.totals.calls)} />
            <Kpi label="Coût IA" value={formatUsdAmount(ai.totals.estimatedCostNanodollars)} unit="USD provider" />
            <Kpi label="Crédits consommés" value={formatCount(ai.totals.creditsCharged)} />
            <Kpi label="Utilisateurs actifs" value={formatCount(ai.totals.activeUsers)} unit="avec usage IA" />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <UnitCard label="Coût provider" value={formatUsdAmount(ai.totals.estimatedCostNanodollars)} unit="USD estimé" />
            <UnitCard label="Utilisation IA" value={formatCount(ai.totals.totalTokens)} unit="tokens" />
            <UnitCard label="Facturation interne" value={formatCount(ai.totals.creditsCharged)} unit="crédits" />
          </div>

          <div className="rounded-xl border border-line bg-paper p-5 shadow-[0_10px_24px_-22px_rgba(28,25,21,0.45)]">
            <CallsBarChart series={ai.series} />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted">Chargement de l’activité…</p>
      )}
    </div>
  );
}

function UnitCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper px-4 py-4">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-accent">{label}</p>
      <p className="mt-2 font-serif text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-xs text-muted">{unit}</p>
    </div>
  );
}

function AiPanel({
  ai,
  range,
  onRangeChange,
}: {
  ai: AiUsageDashboard | null;
  range: AiUsageRange;
  onRangeChange: (range: AiUsageRange) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[1.85rem] font-semibold tracking-tight text-ink">IA & consommation</h1>
          <p className="mt-1 text-sm text-muted">Coût provider, tokens et crédits restent des unités distinctes.</p>
        </div>
        <RangeToggle value={range} onChange={onRangeChange} />
      </div>

      {ai ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <UnitCard label="Coût provider" value={formatUsdAmount(ai.totals.estimatedCostNanodollars)} unit="USD estimé" />
            <UnitCard label="Utilisation IA" value={formatCount(ai.totals.totalTokens)} unit="tokens" />
            <UnitCard label="Facturation interne" value={formatCount(ai.totals.creditsCharged)} unit="crédits" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Appels" value={formatCount(ai.totals.calls)} />
            <Metric label="Tokens in" value={formatCount(ai.totals.inputTokens)} />
            <Metric label="Tokens out" value={formatCount(ai.totals.outputTokens)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-line bg-paper p-5">
              <CallsBarChart series={ai.series} />
            </div>
            <div className="rounded-xl border border-line bg-paper p-5">
              <CostLineChart series={ai.series} />
            </div>
          </div>

          <div className="rounded-xl border border-line bg-paper p-5">
            <CreditsByOperationChart rows={ai.byOperation} />
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-line bg-paper lg:block">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[0.68rem] uppercase tracking-[0.12em] text-muted">
                <tr className="border-b border-line">
                  <th className="px-4 py-3 font-medium">Opération</th>
                  <th className="px-4 py-3 font-medium">Appels</th>
                  <th className="px-4 py-3 font-medium">Tokens</th>
                  <th className="px-4 py-3 font-medium">Coût USD</th>
                  <th className="px-4 py-3 font-medium">Crédits</th>
                </tr>
              </thead>
              <tbody>
                {ai.byOperation.map((row) => (
                  <tr key={row.operation} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{operationTitle(row.operation)}</p>
                      <p className="font-mono text-[0.65rem] text-muted">{operationCode(row.operation)}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{formatCount(row.calls)}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatCount(row.inputTokens + row.outputTokens)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatUsdAmount(row.estimatedCostNanodollars)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{formatCount(row.creditsCharged)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 lg:hidden">
            {ai.byOperation.map((row) => (
              <li key={row.operation} className="rounded-xl border border-line bg-paper p-4">
                <p className="font-medium text-ink">{operationTitle(row.operation)}</p>
                <p className="font-mono text-[0.65rem] text-muted">{operationCode(row.operation)}</p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Appels</dt>
                    <dd className="font-mono text-ink">{formatCount(row.calls)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Tokens</dt>
                    <dd className="font-mono text-ink">{formatCount(row.inputTokens + row.outputTokens)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Coût</dt>
                    <dd className="font-mono text-ink">{formatUsdAmount(row.estimatedCostNanodollars)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Crédits</dt>
                    <dd className="font-mono text-ink">{formatCount(row.creditsCharged)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            Coûts en USD (nanodollars convertis). Pas de taux EUR ni de marge commerciale pour le moment.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted">Chargement…</p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-mono text-sm text-ink">{value}</p>
    </div>
  );
}

function UsersPanel({
  query,
  statusFilter,
  roleFilter,
  users,
  selectedId,
  detail,
  amount,
  reason,
  ledger,
  onQuery,
  onStatusFilter,
  onRoleFilter,
  onSearch,
  onSelect,
  onBack,
  onAmount,
  onReason,
  onGift,
  onAdjust,
}: {
  query: string;
  statusFilter: string;
  roleFilter: string;
  users: UserListItem[];
  selectedId: string;
  detail: UserDetail | null;
  amount: string;
  reason: string;
  ledger: LedgerEntry[];
  onQuery: (value: string) => void;
  onStatusFilter: (value: string) => void;
  onRoleFilter: (value: string) => void;
  onSearch: () => void;
  onSelect: (id: string) => void;
  onBack: () => void;
  onAmount: (value: string) => void;
  onReason: (value: string) => void;
  onGift: () => void;
  onAdjust: (sign: 1 | -1) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-[1.85rem] font-semibold tracking-tight text-ink">Utilisateurs</h1>
        <p className="mt-1 text-sm text-muted">E-mails masqués dans la liste. Les actions crédits passent par le ledger.</p>
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <label className="min-w-0 flex-1 text-sm">
          <span className="mb-1 block text-xs text-muted">Recherche</span>
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="E-mail (début ou fragment)"
            className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-hidden focus:border-primary"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted">Statut</span>
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilter(event.target.value)}
            className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-hidden focus:border-primary sm:w-40"
          >
            <option value="">Tous</option>
            <option value="active">Actif</option>
            <option value="unverified">Non vérifié</option>
            <option value="banned">Bloqué</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted">Rôle</span>
          <select
            value={roleFilter}
            onChange={(event) => onRoleFilter(event.target.value)}
            className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-hidden focus:border-primary sm:w-36"
          >
            <option value="">Tous</option>
            <option value="user">Utilisateur</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-paper hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Chercher
        </button>
      </form>

      <div className="lg:grid lg:grid-cols-[minmax(280px,42%)_minmax(0,1fr)] lg:gap-5">
        <section className={detail ? 'hidden lg:block' : 'block'}>
          <div className="hidden overflow-hidden rounded-xl border border-line bg-paper lg:block">
            <table className="w-full text-left text-sm">
              <thead className="text-[0.65rem] uppercase tracking-[0.12em] text-muted">
                <tr className="border-b border-line">
                  <th className="px-3 py-2.5 font-medium">Utilisateur</th>
                  <th className="px-3 py-2.5 font-medium">Statut</th>
                  <th className="px-3 py-2.5 font-medium">Gratuits</th>
                  <th className="px-3 py-2.5 font-medium">Achetés</th>
                  <th className="px-3 py-2.5 font-medium">Récent</th>
                  <th className="px-3 py-2.5 font-medium">Activité</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className={`cursor-pointer border-b border-line/70 last:border-0 hover:bg-ivory ${
                      selectedId === user.id ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => onSelect(user.id)}
                  >
                    <td className="px-3 py-2.5">
                      <p className="font-mono text-[0.78rem] text-ink">{user.emailMasked}</p>
                      <p className="text-[0.65rem] text-muted">{roleLabel(user.role)}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(user.status)}`}>
                        {statusLabel(user.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">{formatCount(user.freeCredits)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{formatCount(user.paidCredits)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{formatCount(user.recentCreditsCharged)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted">
                      {user.lastActivityAt ? formatDateTime(user.lastActivityAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 ? <p className="px-4 py-6 text-sm text-muted">Aucun compte pour cette recherche.</p> : null}
          </div>

          <ul className="space-y-2 lg:hidden">
            {users.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => onSelect(user.id)}
                  className={`w-full rounded-xl border border-line bg-paper p-4 text-left ${
                    selectedId === user.id ? 'border-primary/40' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-mono text-sm text-ink">{user.emailMasked}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(user.status)}`}>
                      {statusLabel(user.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {roleLabel(user.role)} · {formatCount(user.freeCredits)} gratuit · {formatCount(user.paidCredits)}{' '}
                    achetés
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {formatCount(user.recentCreditsCharged)} cr. récents ·{' '}
                    {user.lastActivityAt ? formatDateTime(user.lastActivityAt) : 'pas d’usage IA'}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className={!detail ? 'mt-4 hidden lg:mt-0 lg:block' : 'mt-4 lg:mt-0'}>
          {detail ? (
            <UserDetailCard
              detail={detail}
              amount={amount}
              reason={reason}
              ledger={ledger}
              onBack={onBack}
              onAmount={onAmount}
              onReason={onReason}
              onGift={onGift}
              onAdjust={onAdjust}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-line bg-paper px-5 py-10 text-sm text-muted">
              Sélectionnez un utilisateur pour ouvrir la fiche.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function UserDetailCard({
  detail,
  amount,
  reason,
  ledger,
  onBack,
  onAmount,
  onReason,
  onGift,
  onAdjust,
}: {
  detail: UserDetail;
  amount: string;
  reason: string;
  ledger: LedgerEntry[];
  onBack: () => void;
  onAmount: (value: string) => void;
  onReason: (value: string) => void;
  onGift: () => void;
  onAdjust: (sign: 1 | -1) => void;
}) {
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm text-muted hover:text-ink lg:hidden">
        ← Liste
      </button>

      <PaperSection title="Compte">
        <p className="font-mono text-sm text-ink">{detail.email}</p>
        <p className="mt-1 text-xs text-muted">{detail.emailMasked}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted">Rôle</dt>
            <dd>{roleLabel(detail.role)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Statut</dt>
            <dd>
              <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(detail.status)}`}>
                {statusLabel(detail.status)}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Vérification</dt>
            <dd>{detail.emailVerified ? 'E-mail vérifié' : 'E-mail non vérifié'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Créé</dt>
            <dd>{formatDateTime(detail.createdAt)}</dd>
          </div>
        </dl>
      </PaperSection>

      <PaperSection title="Crédits">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-ivory px-2 py-3">
            <p className="text-[0.65rem] uppercase tracking-wide text-muted">Gratuits</p>
            <p className="mt-1 font-serif text-xl text-ink">{formatCount(detail.balance.freeCredits)}</p>
          </div>
          <div className="rounded-lg bg-ivory px-2 py-3">
            <p className="text-[0.65rem] uppercase tracking-wide text-muted">Achetés</p>
            <p className="mt-1 font-serif text-xl text-ink">{formatCount(detail.balance.paidCredits)}</p>
          </div>
          <div className="rounded-lg bg-ivory px-2 py-3">
            <p className="text-[0.65rem] uppercase tracking-wide text-muted">Total</p>
            <p className="mt-1 font-serif text-xl text-ink">{formatCount(detail.balance.totalCredits)}</p>
          </div>
        </div>
        {detail.purchases.length > 0 ? (
          <ul className="mt-4 space-y-1 text-xs text-muted">
            {detail.purchases.map((row) => (
              <li key={row.id}>
                {formatDateTime(row.createdAt)} · {row.label} · +{row.amount}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-muted">Aucun achat Stripe listé.</p>
        )}
      </PaperSection>

      <PaperSection title="Activité IA">
        {detail.aiSummary ? (
          <p className="text-sm text-ink">
            {formatCount(detail.aiSummary.calls)} appels · {formatCount(detail.aiSummary.creditsCharged)} crédits ·{' '}
            {formatUsdAmount(detail.aiSummary.estimatedCostNanodollars)} provider
          </p>
        ) : null}
        {detail.recentUsage.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Aucune consommation récente.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {detail.recentUsage.map((row) => (
              <li key={row.id} className="flex flex-wrap justify-between gap-2 border-b border-line/70 py-2 last:border-0">
                <span>
                  {operationTitle(row.operation)}
                  <span className="ml-2 font-mono text-[0.65rem] text-muted">{row.operation}</span>
                </span>
                <span className="text-xs text-muted">
                  {formatDateTime(row.createdAt)} · {row.creditsCharged} cr.
                  {typeof row.estimatedCostNanodollars === 'number'
                    ? ` · ${formatUsdAmount(row.estimatedCostNanodollars)}`
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PaperSection>

      <PaperSection title="Ledger">
        {ledger.length === 0 ? (
          <p className="text-sm text-muted">Aucune écriture pour le moment.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[0.65rem] uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Type</th>
                    <th className="py-2 pr-3 font-medium">Montant</th>
                    <th className="py-2 pr-3 font-medium">Pool</th>
                    <th className="py-2 font-medium">Raison</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((entry) => (
                    <tr key={entry.id} className="border-t border-line/70">
                      <td className="py-2 pr-3 text-xs text-muted">{formatDateTime(entry.createdAt)}</td>
                      <td className="py-2 pr-3">{LEDGER_TYPE_LABELS[entry.type] || entry.type}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{entry.amount}</td>
                      <td className="py-2 pr-3 text-xs">{entry.pool ? LEDGER_POOL_LABELS[entry.pool] || entry.pool : '—'}</td>
                      <td className="py-2 text-xs text-muted">{entry.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="space-y-2 lg:hidden">
              {ledger.map((entry) => (
                <li key={entry.id} className="rounded-lg bg-ivory px-3 py-2 text-sm">
                  <p className="font-medium text-ink">
                    {LEDGER_TYPE_LABELS[entry.type] || entry.type} · {entry.amount}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDateTime(entry.createdAt)} · {entry.pool ? LEDGER_POOL_LABELS[entry.pool] || entry.pool : '—'}
                    {entry.reason ? ` · ${entry.reason}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </PaperSection>

      <PaperSection title="Actions administrateur">
        <p className="text-xs text-muted">
          Un cadeau durable va dans les crédits achetés. Toute mutation écrit le ledger. Pas de modification directe
          de la base.
        </p>
        <div className="mt-3 grid gap-2">
          <input
            value={amount}
            onChange={(event) => onAmount(event.target.value)}
            placeholder="Montant"
            className="rounded-xl border border-line px-3 py-2 text-sm outline-hidden focus:border-primary"
          />
          <input
            value={reason}
            onChange={(event) => onReason(event.target.value)}
            placeholder="Raison obligatoire"
            className="rounded-xl border border-line px-3 py-2 text-sm outline-hidden focus:border-primary"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onGift}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-paper hover:bg-primary-hover"
          >
            Offrir des crédits
          </button>
          <button type="button" onClick={() => onAdjust(1)} className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-ivory">
            Ajuster +
          </button>
          <button type="button" onClick={() => onAdjust(-1)} className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-ivory">
            Ajuster −
          </button>
        </div>
      </PaperSection>
    </div>
  );
}

function FeedbackPanel({
  rows,
  rating,
  kind,
  onRating,
  onKind,
}: {
  rows: FeedbackRow[];
  rating: string;
  kind: string;
  onRating: (value: string) => void;
  onKind: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-[1.85rem] font-semibold tracking-tight text-ink">Feedback</h1>
        <p className="mt-1 text-sm text-muted">Sans lettre ni prompt complets — uniquement le commentaire saisi.</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={rating}
          onChange={(event) => onRating(event.target.value)}
          className="rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-hidden focus:border-primary"
        >
          <option value="">Utile et pas utile</option>
          <option value="USEFUL">Utile</option>
          <option value="NOT_USEFUL">Pas utile</option>
        </select>
        <select
          value={kind}
          onChange={(event) => onKind(event.target.value)}
          className="rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-hidden focus:border-primary"
        >
          <option value="">Toutes les catégories</option>
          {Object.entries(USER_FEEDBACK_KIND_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">Aucun retour pour ce filtre.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-line bg-paper p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    row.rating === 'USEFUL' ? 'bg-primary/10 text-primary' : 'bg-accent/12 text-accent'
                  }`}
                >
                  {row.rating === 'USEFUL' ? 'Utile' : row.rating === 'NOT_USEFUL' ? 'Pas utile' : 'Sans note'}
                </span>
                <span className="rounded-full bg-desk px-2 py-0.5 text-xs text-ink">
                  {USER_FEEDBACK_KIND_LABELS[row.kind]}
                </span>
                <span className="text-xs text-muted">{formatDateTime(row.createdAt)}</span>
              </div>
              <p className="mt-2 font-mono text-xs text-muted">{row.emailMasked}</p>
              <p className="mt-1 text-xs text-muted">
                {row.operation ? operationTitle(row.operation) : 'Opération non précisée'}
                {row.operation ? ` · ${row.operation}` : ''}
                {row.dossierId ? ` · dossier ${row.dossierId.slice(-6)}` : ''}
              </p>
              {row.comment ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink">{row.comment}</p>
              ) : (
                <p className="mt-3 text-sm text-muted">Pas de commentaire.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
