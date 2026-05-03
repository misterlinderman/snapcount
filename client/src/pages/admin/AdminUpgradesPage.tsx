import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import type { CardType } from '@/game/types';
import DataTable, { type DataTableColumn, type DataTableFilterDef } from '@/components/admin/DataTable';
import EditModal from '@/components/admin/EditModal';
import { adminApi, type AdminUpgradeRow } from '@/services/adminApi';
import AdminAuditFooter from './AdminAuditFooter';
import { ALL_CARD_TYPES } from './constants';
import { adminUpgradeFormCreateSchema, adminUpgradeFormUpdateSchema, zodErrorMessage } from './formSchemas';

function emptyForm(): {
  _id: string;
  baseCardId: string;
  name: string;
  dpCost: string;
  powerOverride: string;
  bonusVsType: string;
  bonusVsAmount: string;
  sideEffect: string;
  isActive: boolean;
} {
  return {
    _id: '',
    baseCardId: '',
    name: '',
    dpCost: '1',
    powerOverride: '',
    bonusVsType: '',
    bonusVsAmount: '',
    sideEffect: '',
    isActive: true,
  };
}

function buildEffectFromForm(form: ReturnType<typeof emptyForm>): AdminUpgradeRow['effect'] {
  const effect: AdminUpgradeRow['effect'] = {};
  if (form.powerOverride.trim() !== '') {
    const n = Number(form.powerOverride);
    if (Number.isFinite(n)) effect.powerOverride = n;
  }
  if (form.bonusVsType && form.bonusVsAmount.trim() !== '') {
    const n = Number(form.bonusVsAmount);
    if (Number.isFinite(n)) {
      effect.bonusVs = { type: form.bonusVsType as CardType, bonus: n };
    }
  }
  if (form.sideEffect.trim()) {
    effect.sideEffect = form.sideEffect.trim();
  }
  return effect;
}

function AdminUpgradesPage(): JSX.Element {
  const qc = useQueryClient();
  const [modalMode, setModalMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(() => emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin', 'upgrades', 'all'],
    queryFn: () => adminApi.upgrades.list({ includeInactive: true }),
  });

  const { data: cardOptions = [] } = useQuery({
    queryKey: ['admin', 'cards', 'selector'],
    queryFn: () => adminApi.cards.list({ includeInactive: true }),
  });

  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'upgrades'] });
    void qc.invalidateQueries({ queryKey: ['content', 'bundle'] });
    void qc.invalidateQueries({ queryKey: ['admin', 'audit', 'latest', 'upgrades'] });
  };

  const createMut = useMutation({
    mutationFn: adminApi.upgrades.create,
    onSuccess: () => {
      invalidateAll();
      setModalMode('closed');
    },
    onError: (e) => {
      if (isAxiosError(e)) setFormError(e.response?.data?.message || e.message);
      else setFormError('Save failed');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<AdminUpgradeRow> }) => adminApi.upgrades.update(id, body),
    onSuccess: () => {
      invalidateAll();
      setModalMode('closed');
      setEditingId(null);
    },
    onError: (e) => {
      if (isAxiosError(e)) setFormError(e.response?.data?.message || e.message);
      else setFormError('Save failed');
    },
  });

  const deactivateMut = useMutation({
    mutationFn: adminApi.upgrades.deactivate,
    onSuccess: () => {
      invalidateAll();
    },
  });

  const filters = useMemo((): DataTableFilterDef<AdminUpgradeRow>[] => {
    return [
      {
        id: 'status',
        label: 'Status',
        options: [
          { value: 'all', label: 'Active + inactive' },
          { value: 'active', label: 'Active only' },
          { value: 'inactive', label: 'Inactive only' },
        ],
        match: (row, v) => {
          if (v === 'all') return true;
          if (v === 'active') return row.isActive;
          return !row.isActive;
        },
      },
    ];
  }, []);

  const columns = useMemo((): DataTableColumn<AdminUpgradeRow>[] => {
    const cardLabel = (id: string): string => {
      const c = cardOptions.find((x) => x._id === id);
      return c ? `${c.name} (${id})` : id;
    };
    return [
      {
        id: '_id',
        header: 'Id',
        sortable: true,
        sortValue: (r) => r._id,
        cell: (r) => <span className="font-mono text-xs">{r._id}</span>,
      },
      {
        id: 'base',
        header: 'Base card',
        sortable: true,
        sortValue: (r) => r.baseCardId,
        cell: (r) => <span className="font-mono text-xs">{cardLabel(r.baseCardId)}</span>,
      },
      {
        id: 'name',
        header: 'Upgrade',
        sortable: true,
        sortValue: (r) => r.name,
        cell: (r) => (
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>{r.name}</span>
        ),
      },
      {
        id: 'dp',
        header: 'DP',
        sortable: true,
        sortValue: (r) => r.dpCost,
        cell: (r) => r.dpCost,
      },
      {
        id: 'active',
        header: 'Active',
        sortable: true,
        sortValue: (r) => (r.isActive ? 1 : 0),
        cell: (r) => (r.isActive ? 'Yes' : 'No'),
      },
    ];
  }, [cardOptions]);

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setModalMode('create');
    setEditingId(null);
  };

  const openEdit = (row: AdminUpgradeRow) => {
    const bv = row.effect?.bonusVs;
    setForm({
      _id: row._id,
      baseCardId: row.baseCardId,
      name: row.name,
      dpCost: String(row.dpCost),
      powerOverride: row.effect?.powerOverride != null ? String(row.effect.powerOverride) : '',
      bonusVsType: bv?.type ?? '',
      bonusVsAmount: bv != null ? String(bv.bonus) : '',
      sideEffect: row.effect?.sideEffect ?? '',
      isActive: row.isActive,
    });
    setFormError(null);
    setModalMode('edit');
    setEditingId(row._id);
  };

  const submitForm = () => {
    setFormError(null);
    const dpCost = Number(form.dpCost);
    const effect = buildEffectFromForm(form);

    if (modalMode === 'create') {
      const parsed = adminUpgradeFormCreateSchema.safeParse({
        _id: form._id.trim(),
        baseCardId: form.baseCardId.trim(),
        name: form.name.trim(),
        dpCost,
        effect,
        isActive: form.isActive,
      });
      if (!parsed.success) {
        setFormError(zodErrorMessage(parsed.error));
        return;
      }
      createMut.mutate(parsed.data);
    } else if (modalMode === 'edit' && editingId) {
      const parsed = adminUpgradeFormUpdateSchema.safeParse({
        baseCardId: form.baseCardId.trim(),
        name: form.name.trim(),
        dpCost,
        effect,
        isActive: form.isActive,
      });
      if (!parsed.success) {
        setFormError(zodErrorMessage(parsed.error));
        return;
      }
      updateMut.mutate({ id: editingId, body: parsed.data });
    }
  };

  const busy = createMut.isPending || updateMut.isPending;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl" style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}>
            Upgrades
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>
            Base cards, DP cost, and structured effects.
          </p>
        </div>
        <button
          type="button"
          className="min-h-11 rounded border px-4 text-sm font-semibold"
          style={{
            fontFamily: 'var(--font-playfair-sc)',
            borderColor: 'var(--green-turf)',
            backgroundColor: 'var(--green-field)',
            color: 'var(--white)',
          }}
          onClick={openCreate}
        >
          New upgrade
        </button>
      </div>

      <DataTable<AdminUpgradeRow>
        rows={rows}
        columns={columns}
        rowKey={(r) => r._id}
        isLoading={isLoading}
        searchPlaceholder="Search id, base card, or name…"
        searchMatch={(r, q) =>
          r._id.toLowerCase().includes(q) ||
          r.baseCardId.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q)
        }
        filters={filters}
        onEdit={openEdit}
        onDeactivate={(row) => {
          if (window.confirm(`Retire upgrade "${row.name}"?`)) {
            deactivateMut.mutate(row._id);
          }
        }}
        deactivateLabel="Retire"
        deactivateDisabled={(row) => !row.isActive || deactivateMut.isPending}
      />

      <AdminAuditFooter scope="upgrades" />

      <EditModal
        open={modalMode !== 'closed'}
        title={modalMode === 'create' ? 'New upgrade' : 'Edit upgrade'}
        titleId="admin-up-modal"
        onClose={() => !busy && setModalMode('closed')}
        onSave={submitForm}
        saveDisabled={busy}
        error={formError}
      >
        <div className="grid gap-3">
          <label className="text-xs" style={{ color: 'var(--muted)' }}>
            Id (slug)
            <input
              className="mt-1 block w-full min-h-10 rounded border px-2 text-sm"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
              value={form._id}
              onChange={(e) => setForm((f) => ({ ...f, _id: e.target.value }))}
              disabled={modalMode === 'edit'}
            />
          </label>
          <label className="text-xs" style={{ color: 'var(--muted)' }}>
            Base card
            <select
              className="mt-1 block w-full min-h-10 rounded border px-2 text-sm"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
              value={form.baseCardId}
              onChange={(e) => setForm((f) => ({ ...f, baseCardId: e.target.value }))}
            >
              <option value="">— Select —</option>
              {[...cardOptions]
                .sort((a, b) => a._id.localeCompare(b._id))
                .map((c) => (
                  <option key={c._id} value={c._id}>
                    [{c.side}] {c.name} ({c._id})
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs" style={{ color: 'var(--muted)' }}>
            Upgrade name
            <input
              className="mt-1 block w-full min-h-10 rounded border px-2 text-sm"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="text-xs" style={{ color: 'var(--muted)' }}>
            DP cost
            <input
              type="number"
              className="mt-1 block w-full min-h-10 rounded border px-2 text-sm"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
              value={form.dpCost}
              onChange={(e) => setForm((f) => ({ ...f, dpCost: e.target.value }))}
            />
          </label>
          <p className="text-xs font-semibold" style={{ color: 'var(--ink2)', fontFamily: 'var(--font-serif)' }}>
            Effect
          </p>
          <label className="text-xs" style={{ color: 'var(--muted)' }}>
            Power override
            <input
              type="number"
              className="mt-1 block w-full min-h-10 rounded border px-2 text-sm"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
              value={form.powerOverride}
              onChange={(e) => setForm((f) => ({ ...f, powerOverride: e.target.value }))}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs" style={{ color: 'var(--muted)' }}>
              Bonus vs type
              <select
                className="mt-1 block w-full min-h-10 rounded border px-2 text-sm"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
                value={form.bonusVsType}
                onChange={(e) => setForm((f) => ({ ...f, bonusVsType: e.target.value }))}
              >
                <option value="">—</option>
                {ALL_CARD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs" style={{ color: 'var(--muted)' }}>
              Bonus amount
              <input
                type="number"
                className="mt-1 block w-full min-h-10 rounded border px-2 text-sm"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
                value={form.bonusVsAmount}
                onChange={(e) => setForm((f) => ({ ...f, bonusVsAmount: e.target.value }))}
              />
            </label>
          </div>
          <label className="text-xs" style={{ color: 'var(--muted)' }}>
            Side effect text
            <input
              className="mt-1 block w-full min-h-10 rounded border px-2 text-sm"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
              value={form.sideEffect}
              onChange={(e) => setForm((f) => ({ ...f, sideEffect: e.target.value }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink)', fontFamily: 'var(--font-serif)' }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Active
          </label>
        </div>
      </EditModal>
    </div>
  );
}

export default AdminUpgradesPage;
