import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import api from '../services/api';

interface Item {
  _id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: string;
}

function Dashboard() {
  const { user } = useAuth0();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ title: '', description: '' });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/items');
      // API returns { items: [...], pagination: {...} }
      setItems(response.data.items || []);
      setError(null);
    } catch (err) {
      setError('Failed to load items. Make sure the server is running.');
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.title.trim()) return;

    try {
      setIsAdding(true);
      const response = await api.post('/items', newItem);
      setItems([response.data, ...items]);
      setNewItem({ title: '', description: '' });
    } catch (err) {
      setError('Failed to add item');
      console.error('Error adding item:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleComplete = async (item: Item) => {
    try {
      const response = await api.put(`/items/${item._id}`, {
        completed: !item.completed,
      });
      setItems(items.map((i) => (i._id === item._id ? response.data : i)));
    } catch (err) {
      setError('Failed to update item');
      console.error('Error updating item:', err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await api.delete(`/items/${id}`);
      setItems(items.filter((i) => i._id !== id));
    } catch (err) {
      setError('Failed to delete item');
      console.error('Error deleting item:', err);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-1">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1
          className="mb-2 text-3xl font-bold font-display uppercase tracking-[0.04em]"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
        >
          Welcome back, {user?.given_name || user?.name || 'User'}!
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
          Manage your items and track your progress from your personal dashboard.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="card">
          <p className="mb-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Total Items
          </p>
          <p className="text-3xl font-bold tabular-nums" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {items.length}
          </p>
        </div>
        <div className="card">
          <p className="mb-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Completed
          </p>
          <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--success-green)' }}>
            {items.filter((i) => i.completed).length}
          </p>
        </div>
        <div className="card">
          <p className="mb-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Pending
          </p>
          <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--gold)' }}>
            {items.filter((i) => !i.completed).length}
          </p>
        </div>
      </div>

      {/* Add New Item Form */}
      <div className="card mb-8">
        <h2 className="mb-4 text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          Add New Item
        </h2>
        <form onSubmit={handleAddItem} className="space-y-4">
          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Title
            </label>
            <input
              type="text"
              id="title"
              value={newItem.title}
              onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              className="input"
              placeholder="Enter item title..."
              required
            />
          </div>
          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Description (optional)
            </label>
            <textarea
              id="description"
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              className="input min-h-[100px]"
              placeholder="Enter item description..."
            />
          </div>
          <button type="submit" className="btn-primary" disabled={isAdding}>
            {isAdding ? 'Adding...' : 'Add Item'}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="mb-6 rounded-lg border px-4 py-3"
          style={{ borderColor: 'var(--blitz-red)', backgroundColor: 'var(--blitz-red-subtle)', color: 'var(--blitz-red-bright)' }}
        >
          {error}
          <button onClick={fetchItems} className="ml-4 underline">
            Retry
          </button>
        </div>
      )}

      {/* Items List */}
      <div className="card">
        <h2 className="mb-4 text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          Your Items
        </h2>
        {loading ? (
          <div className="py-8 text-center">
            <div
              className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-solid"
              style={{ borderColor: 'var(--bg-border)', borderTopColor: 'var(--gold)' }}
            />
            <p style={{ color: 'var(--text-secondary)' }}>Loading items…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center" style={{ color: 'var(--text-muted)' }}>
            <p>No items yet. Add your first item above!</p>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--bg-border)' }}>
            {items.map((item) => (
              <li key={item._id} className="flex items-start gap-4 py-4">
                <button
                  onClick={() => handleToggleComplete(item)}
                  className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
                    item.completed
                      ? 'border-transparent text-white'
                      : ''
                  }`}
                  style={
                    item.completed
                      ? { backgroundColor: 'var(--success-green)', borderColor: 'var(--success-green)' }
                      : { borderColor: 'var(--bg-border)' }
                  }
                >
                  {item.completed && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className="font-medium"
                    style={{
                      color: item.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: item.completed ? 'line-through' : undefined,
                    }}
                  >
                    {item.title}
                  </p>
                  {item.description && (
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {item.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item._id)}
                  className="transition-colors hover:[color:var(--blitz-red-bright)]"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label="Delete item"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
