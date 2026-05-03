import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import type { CardType, PlaymakerRarity } from '@/game/types';
import DataTable, { type DataTableColumn, type DataTableFilterDef } from '@/components/admin/DataTable';
import EditModal from '@/components/admin/EditModal';
import { adminApi, type AdminPlaymakerRow } from '@/services/adminApi';
import AdminAuditFooter from './AdminAuditFooter';
import { ALL_CARD_TYPES, PLAYMAKER_RARITIES } from './constants';
import { adminPlaymakerFormCreateSchema, adminPlaymakerFormUpdateSchema, zodErrorMessage } from './formSchemas';

function emptyForm(): {
  _id: string;
  side: 'offense' | 'defense';
  position: string;
  name: string;
  baseBoost: string;
  affinityTypes: CardType[];
  rarity: PlaymakerRarity;
  recruitCost: string;
  specialEffect: string;
  isActive: boolean;
} {
  return {
    _id: '',
    side: 'offense',
    position: 'WR1',
    name: '',
    baseBoost: '1',
    affinityTypes: [],
    rarity: 'recruit-uncommon',
    recruitCost: '',
    specialEffect: '',
    isActive: true,
  };
}

function AdminPlaymakersPage(): JSX.Element {
  const qc = useQueryClient();
  const [modalMode, setModalMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(() => emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin', 'playmakers', 'all'],
    queryFn: () => adminApi.playmakers.list({ includeInactive: true }),
  });

  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'playmakers'] });
    void qc.invalidateQueries({ queryKey: ['content', 'bundle'] });
    void qc.invalidateQueries({ queryKey: ['admin', 'audit', 'latest', 'playmakers'] });
  };

  const createMut = useMutation({
    mutationFn: adminApi.playmakers.create,
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
    mutationFn: ({ id, body }: { id: string; body: Partial<AdminPlaymakerRow> }) =>
      adminApi.playmakers.update(id, body),
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
    mutationFn: adminApi.playmakers.deactivate,
    onSuccess: () => {
      invalidateAll();
    },
  });

  const filters = useMemo((): DataTableFilterDef<AdminPlaymakerRow>[] => {
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
        id: 'affinity',
        label: 'Affinity type',
        options: [
          { value: 'all', label: 'Any' },
          ...ALL_CARD_TYPES.map((t) => ({ value: t, label: t })),
        ],
        match: (row, v) => (v === 'all' ? true : row.affinityTypes.includes(v as CardType)),
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

  const columns = useMemo((): DataTableColumn<AdminPlaymakerRow>[] => {
    return [
      {
        id: '_id',
        header: 'Id',
        sortable: true,
        sortValue: (r) => r._id,
        cell: (r) => <span className="font-mono text-xs">{r._id}</span>,
      },
      { id: 'side', header: 'Side', sortable: true, sortValue: (r) => r.side, cell: (r) => r.side },
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
        id: 'position',
        header: 'Position',
        sortable: true,
        sortValue: (r) => r.position,
        cell: (r) => r.position,
      },
      {
        id: 'baseBoost',
        header: 'Boost',
        sortable: true,
        sortValue: (r) => r.baseBoost,
        cell: (r) => r.baseBoost,
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

  const openEdit = (row: AdminPlaymakerRow) => {
    setForm({
      _id: row._id,
      side: row.side,
      position: row.position,
      name: row.name,
      baseBoost: String(row.baseBoost),
      affinityTypes: [...row.affinityTypes],
      rarity: row.rarity,
      recruitCost: row.recruitCost != null ? String(row.recruitCost) : '',
      specialEffect: row.specialEffect ?? '',
      isActive: row.isActive,
    });
    setFormError(null);
    setModalMode('edit');
    setEditingId(row._id);
  };

  const toggleAffinity = (t: CardType) => {
    setForm((f) => {
      const has = f.affinityTypes.includes(t);
      return {
        ...f,
        affinityTypes: has ? f.affinityTypes.filter((x) => x !== t) : [...f.affinityTypes, t],
      };
    });
  };

  const submitForm = () => {
    setFormError(null);
    const baseBoost = Number(form.baseBoost);
    const recruitCostNum = form.recruitCost.trim() === '' ? undefined : Number(form.recruitCost);

    if (modalMode === 'create') {
      const parsed = adminPlaymakerFormCreateSchema.safeParse({
        _id: form._id.trim(),
        side: form.side,
        position: form.position.trim(),
        name: form.name.trim(),
        baseBoost,
        affinityTypes: form.affinityTypes,
        rarity: form.rarity,
        recruitCost: recruitCostNum,
        specialEffect: form.specialEffect.trim() || undefined,
        isActive: form.isActive,
      });
      if (!parsed.success) {
        setFormError(zodErrorMessage(parsed.error));
        return;
      }
      createMut.mutate(parsed.data);
    } else if (modalMode === 'edit' && editingId) {
      const parsed = adminPlaymakerFormUpdateSchema.safeParse({
        side: form.side,
        position: form.position.trim(),
        name: form.name.trim(),
        baseBoost,
        affinityTypes: form.affinityTypes,
        rarity: form.rarity,
        recruitCost: recruitCostNum,
        specialEffect: form.specialEffect.trim() || undefined,
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
            Playmakers
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>
            Position labels, boosts, affinities, and recruit metadata.
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
          New playmaker
        </button>
      </div>

      <DataTable<AdminPlaymakerRow>
        rows={rows}
        columns={columns}
        rowKey={(r) => r._id}
        isLoading={isLoading}
        searchPlaceholder="Search id or name…"
        searchMatch={(r, q) => r._id.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)}
        filters={filters}
        onEdit={openEdit}
        onDeactivate={(row) => {
          if (window.confirm(`Retire playmaker "${row.name}"?`)) {
            deactivateMut.mutate(row._id);
          }
        }}
        deactivateLabel="Retire"
        deactivateDisabled={(row) => !row.isActive || deactivateMut.isPending}
      />

      <AdminAuditFooter scope="playmakers" />

      <EditModal
        open={modalMode !== 'closed'}
        title={modalMode === 'create' ? 'New playmaker' : 'Edit playmaker'}
        titleId="admin-pm-modal"
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
              Position label
              <input
                className="mt-1 block w-full min-h-10 rounded border px-2 text-sm"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
                value={form.position}
                onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              />
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
              Base boost
              <input
                type="number"
                className="mt-1 block w-full min-h-10 rounded border px-2 text-sm"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
                value={form.baseBoost}
                onChange={(e) => setForm((f) => ({ ...f, baseBoost: e.target.value }))}
              />
            </label>
            <label className="text-xs" style={{ color: 'var(--muted)' }}>
              Rarity
              <select
                className="mt-1 block w-full min-h-10 rounded border px-2 text-sm"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
                value={form.rarity}
                onChange={(e) => setForm((f) => ({ ...f, rarity: e.target.value as PlaymakerRarity }))}
              >
                {PLAYMAKER_RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="text-xs" style={{ color: 'var(--muted)' }}>
            Recruit cost (optional)
            <input
              type="number"
              className="mt-1 block w-full min-h-10 rounded border px-2 text-sm"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
              value={form.recruitCost}
              onChange={(e) => setForm((f) => ({ ...f, recruitCost: e.target.value }))}
            />
          </label>
          <fieldset className="rounded border p-3" style={{ borderColor: 'var(--rule)' }}>
            <legend className="px-1 text-xs" style={{ color: 'var(--muted)' }}>
              Affinity types
            </legend>
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
              {ALL_CARD_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-1 text-xs" style={{ color: 'var(--ink)' }}>
                  <input type="checkbox" checked={form.affinityTypes.includes(t)} onChange={() => toggleAffinity(t)} />
                  {t}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="text-xs" style={{ color: 'var(--muted)' }}>
            Special effect (optional)
            <input
              className="mt-1 block w-full min-h-10 rounded border px-2 text-sm"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
              value={form.specialEffect}
              onChange={(e) => setForm((f) => ({ ...f, specialEffect: e.target.value }))}
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

export default AdminPlaymakersPage;
