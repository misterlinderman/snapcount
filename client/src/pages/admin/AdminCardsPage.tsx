import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import type { CardType, CardRarity } from '@/game/types';
import DataTable, { type DataTableColumn, type DataTableFilterDef } from '@/components/admin/DataTable';
import EditModal from '@/components/admin/EditModal';
import { adminApi, type AdminCardRow } from '@/services/adminApi';
import AdminAuditFooter from './AdminAuditFooter';
import { ALL_CARD_TYPES, CARD_RARITIES } from './constants';
import { adminCardFormCreateSchema, adminCardFormUpdateSchema, zodErrorMessage } from './formSchemas';

function emptyForm(): {
  _id: string;
  side: 'offense' | 'defense';
  type: CardType;
  name: string;
  basePower: string;
  notes: string;
  rarity: CardRarity;
  draftCost: string;
  isActive: boolean;
} {
  return {
    _id: '',
    side: 'offense',
    type: 'run-in',
    name: '',
    basePower: '5',
    notes: '',
    rarity: 'common',
    draftCost: '',
    isActive: true,
  };
}

function AdminCardsPage(): JSX.Element {
  const qc = useQueryClient();
  const [modalMode, setModalMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(() => emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin', 'cards', 'all'],
    queryFn: () => adminApi.cards.list({ includeInactive: true }),
  });

  const bumpAudit = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'audit', 'latest', 'cards'] });
  };

  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'cards'] });
    void qc.invalidateQueries({ queryKey: ['content', 'bundle'] });
    bumpAudit();
  };

  const createMut = useMutation({
    mutationFn: adminApi.cards.create,
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
    mutationFn: ({ id, body }: { id: string; body: Partial<AdminCardRow> }) => adminApi.cards.update(id, body),
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
    mutationFn: adminApi.cards.deactivate,
    onSuccess: () => {
      invalidateAll();
    },
  });

  const filters = useMemo((): DataTableFilterDef<AdminCardRow>[] => {
    return [
      {
        id: 'side',
        label: 'Side',
        options: [
          { value: 'all', label: 'All sides' },
          { value: 'offense', label: 'Offense' },
          { value: 'defense', label: 'Defense' },
        ],
        match: (row, v) => (v === 'all' ? true : row.side === v),
      },
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

  const columns = useMemo((): DataTableColumn<AdminCardRow>[] => {
    return [
      {
        id: '_id',
        header: 'Id',
        sortable: true,
        sortValue: (r) => r._id,
        cell: (r) => <span className="font-mono text-xs">{r._id}</span>,
      },
      {
        id: 'side',
        header: 'Side',
        sortable: true,
        sortValue: (r) => r.side,
        cell: (r) => r.side,
      },
      {
        id: 'type',
        header: 'Type',
        sortable: true,
        sortValue: (r) => r.type,
        cell: (r) => r.type,
      },
      {
        id: 'name',
        header: 'Name',
        sortable: true,
        sortValue: (r) => r.name,
        cell: (r) => (
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>{r.name}</span>
        ),
      },
      {
        id: 'basePower',
        header: 'Pwr',
        sortable: true,
        sortValue: (r) => r.basePower,
        cell: (r) => r.basePower,
      },
      {
        id: 'active',
        header: 'Active',
        sortable: true,
        sortValue: (r) => (r.isActive ? 1 : 0),
        cell: (r) => (r.isActive ? 'Yes' : 'No'),
      },
    ];
  }, []);

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setModalMode('create');
    setEditingId(null);
  };

  const openEdit = (row: AdminCardRow) => {
    setForm({
      _id: row._id,
      side: row.side,
      type: row.type,
      name: row.name,
      basePower: String(row.basePower),
      notes: row.notes ?? '',
      rarity: row.rarity,
      draftCost: row.draftCost != null ? String(row.draftCost) : '',
      isActive: row.isActive,
    });
    setFormError(null);
    setModalMode('edit');
    setEditingId(row._id);
  };

  const submitForm = () => {
    setFormError(null);
    const basePower = Number(form.basePower);
    const draftCostNum = form.draftCost.trim() === '' ? undefined : Number(form.draftCost);

    if (modalMode === 'create') {
      const parsed = adminCardFormCreateSchema.safeParse({
        _id: form._id.trim(),
        side: form.side,
        type: form.type,
        name: form.name.trim(),
        basePower,
        notes: form.notes.trim() || undefined,
        rarity: form.rarity,
        draftCost: draftCostNum,
        isActive: form.isActive,
      });
      if (!parsed.success) {
        setFormError(zodErrorMessage(parsed.error));
        return;
      }
      createMut.mutate(parsed.data);
    } else if (modalMode === 'edit' && editingId) {
      const parsed = adminCardFormUpdateSchema.safeParse({
        side: form.side,
        type: form.type,
        name: form.name.trim(),
        basePower,
        notes: form.notes.trim() || undefined,
        rarity: form.rarity,
        draftCost: draftCostNum,
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
            Cards
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>
            Catalog editor — retire sets inactive; sessions keep stable ids.
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
          New card
        </button>
      </div>

      <DataTable<AdminCardRow>
        rows={rows}
        columns={columns}
        rowKey={(r) => r._id}
        isLoading={isLoading}
        searchPlaceholder="Search id or name…"
        searchMatch={(r, q) =>
          r._id.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.type.includes(q)
        }
        filters={filters}
        onEdit={openEdit}
        onDeactivate={(row) => {
          if (window.confirm(`Retire card "${row.name}"?`)) {
            deactivateMut.mutate(row._id);
          }
        }}
        deactivateLabel="Retire"
        deactivateDisabled={(row) => !row.isActive || deactivateMut.isPending}
      />

      <AdminAuditFooter scope="cards" />

      <EditModal
        open={modalMode !== 'closed'}
        title={modalMode === 'create' ? 'New card' : 'Edit card'}
        titleId="admin-card-modal"
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
              autoComplete="off"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs" style={{ color: 'var(--muted)' }}>
              Side
              <select
                className="mt-1 block w-full min-h-10 rounded border px-2 text-sm"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
                value={form.side}
                onChange={(e) => setForm((f) => ({ ...f, side: e.target.value as 'offense' | 'defense' }))}
              >
                <option value="offense">offense</option>
                <option value="defense">defense</option>
              </select>
            </label>
            <label className="text-xs" style={{ color: 'var(--muted)' }}>
              Type
              <select
                className="mt-1 block w-full min-h-10 rounded border px-2 text-sm"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CardType }))}
              >
                {ALL_CARD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="text-xs" style={{ color: 'var(--muted)' }}>
            Name
            <input
              className="mt-1 block w-full min-h-10 rounded border px-2 text-sm"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs" style={{ color: 'var(--muted)' }}>
              Base power
              <input
                type="number"
                className="mt-1 block w-full min-h-10 rounded border px-2 text-sm"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
                value={form.basePower}
                onChange={(e) => setForm((f) => ({ ...f, basePower: e.target.value }))}
              />
            </label>
            <label className="text-xs" style={{ color: 'var(--muted)' }}>
              Rarity
              <select
                className="mt-1 block w-full min-h-10 rounded border px-2 text-sm"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
                value={form.rarity}
                onChange={(e) => setForm((f) => ({ ...f, rarity: e.target.value as CardRarity }))}
              >
                {CARD_RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="text-xs" style={{ color: 'var(--muted)' }}>
            Draft cost (optional)
            <input
              type="number"
              className="mt-1 block w-full min-h-10 rounded border px-2 text-sm"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
              value={form.draftCost}
              onChange={(e) => setForm((f) => ({ ...f, draftCost: e.target.value }))}
            />
          </label>
          <label className="text-xs" style={{ color: 'var(--muted)' }}>
            Notes
            <textarea
              className="mt-1 block w-full rounded border px-2 py-2 text-sm"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
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

export default AdminCardsPage;
