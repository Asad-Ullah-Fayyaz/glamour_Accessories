import React, { useEffect, useState } from 'react';
import AdminSidebar from '../components/admin/AdminSidebar';
import { ChevronDown, ChevronRight, Package, Plus, Trash2 } from 'lucide-react';
import api from '../services/api';

export default function AdminCategories() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [notification, setNotification] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [l1Name, setL1Name] = useState('');
  const [l1Description, setL1Description] = useState('');
  const [l2Name, setL2Name] = useState('');
  const [l2Parent, setL2Parent] = useState('');
  const [l3Name, setL3Name] = useState('');
  const [l3ParentL1, setL3ParentL1] = useState('');
  const [l3ParentL2, setL3ParentL2] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get('/admin/categories');
      if (res.success) setTree(res.categories || []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const notify = (message) => {
    setNotification(message);
    window.setTimeout(() => setNotification(''), 2500);
  };

  const childrenOf = (parentId) => {
    if (!parentId) return [];
    const walk = (nodes) => {
      for (const node of nodes) {
        if (node._id === parentId) return node.children || [];
        const result = walk(node.children || []);
        if (result) return result;
      }
      return null;
    };
    return walk(tree) || [];
  };

  const createCategory = async (event, payload, successMessage, reset) => {
    event.preventDefault();
    setErrorMsg('');
    try {
      await api.post('/categories', payload);
      reset();
      notify(successMessage);
      await fetchCategories();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create category');
    }
  };

  const handleToggle = async (category) => {
    setBusyId(category._id);
    setErrorMsg('');
    try {
      const res = await api.put(`/admin/categories/${category._id}/toggle`);
      if (res.success) {
        notify(`"${category.name}" ${category.isActive ? 'disabled' : 'enabled'}`);
        await fetchCategories();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Toggle failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Delete "${category.name}" and all descendants?`)) return;
    setBusyId(category._id);
    setErrorMsg('');
    try {
      const res = await api.delete(`/admin/categories/${category._id}`);
      if (res.success) {
        notify(res.message || `"${category.name}" deleted`);
        await fetchCategories();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  const renderRow = (category, indent = 0) => (
    <React.Fragment key={category._id}>
      <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: category.level === 1 ? '#f8f9fa' : '#fff' }}>
        <td style={{ padding: '0.75rem 1rem', paddingLeft: `${1 + indent * 2}rem`, fontWeight: category.level === 1 ? 800 : 600 }}>
          {category.level < 3 && (category.children || []).length > 0 && (
            <button type="button" onClick={() => setCollapsed((prev) => ({ ...prev, [category._id]: !prev[category._id] }))} style={{ background: 'none', border: 0, cursor: 'pointer', marginRight: '0.35rem' }}>
              {collapsed[category._id] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          {category.name}
        </td>
        <td style={{ padding: '0.75rem 1rem' }}><span className="badge badge-dark">L{category.level}</span></td>
        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}><Package size={12} /> {category.productCount || 0}</td>
        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
          <button type="button" onClick={() => handleToggle(category)} disabled={busyId === category._id} className={`badge ${category.isActive ? 'badge-success' : 'badge-danger'}`} style={{ border: 0, cursor: 'pointer', marginRight: '0.5rem' }}>
            {category.isActive ? 'Active' : 'Disabled'}
          </button>
          <button type="button" onClick={() => handleDelete(category)} disabled={busyId === category._id} title="Delete category" style={{ background: 'transparent', border: 0, color: '#c53030', cursor: 'pointer' }}>
            <Trash2 size={14} />
          </button>
        </td>
      </tr>
      {!collapsed[category._id] && (category.children || []).map((child) => renderRow(child, indent + 1))}
    </React.Fragment>
  );

  const l3Options = childrenOf(l3ParentL1);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
      <AdminSidebar />
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', fontWeight: 600 }}>ADMINISTRATION</span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', margin: '0.25rem 0 0.5rem' }}>Category Hierarchy</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Level 1 to Level 2 to Level 3. Products require L1 and L2; L3 is optional.</p>
        </div>
        {notification && <div style={{ backgroundColor: '#e6f4ea', border: '1px solid #b7e4c7', color: '#137333', padding: '0.85rem 1.25rem', marginBottom: '1.5rem' }}>{notification}</div>}
        {errorMsg && <div style={{ backgroundColor: '#fff5f5', border: '1px solid #feb2b2', color: '#c53030', padding: '0.85rem 1.25rem', marginBottom: '1.5rem' }}>{errorMsg}</div>}

        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              <Form title="Main Categories (L1)" onSubmit={(event) => createCategory(event, { name: l1Name.trim(), description: l1Description.trim() }, 'Level 1 category created', () => { setL1Name(''); setL1Description(''); })}>
                <input className="form-input" required placeholder="Name" value={l1Name} onChange={(event) => setL1Name(event.target.value)} />
                <input className="form-input" placeholder="Description (optional)" value={l1Description} onChange={(event) => setL1Description(event.target.value)} />
                <button className="btn btn-primary" type="submit"><Plus size={14} /> Create L1</button>
              </Form>
              <Form title="Subcategories (L2)" onSubmit={(event) => createCategory(event, { name: l2Name.trim(), parent: l2Parent }, 'Level 2 category created', () => { setL2Name(''); })}>
                <select className="form-select" required value={l2Parent} onChange={(event) => setL2Parent(event.target.value)}><option value="">Choose L1 parent...</option>{tree.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select>
                <input className="form-input" required placeholder="Name" value={l2Name} onChange={(event) => setL2Name(event.target.value)} />
                <button className="btn btn-primary" type="submit"><Plus size={14} /> Create L2</button>
              </Form>
              <Form title="Sub-Sub-Categories (L3)" onSubmit={(event) => createCategory(event, { name: l3Name.trim(), parent: l3ParentL2 }, 'Level 3 category created', () => { setL3Name(''); })}>
                <select className="form-select" required value={l3ParentL1} onChange={(event) => { setL3ParentL1(event.target.value); setL3ParentL2(''); }}><option value="">Choose L1 parent...</option>{tree.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select>
                <select className="form-select" required disabled={!l3ParentL1} value={l3ParentL2} onChange={(event) => setL3ParentL2(event.target.value)}><option value="">Choose L2 parent...</option>{l3Options.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select>
                <input className="form-input" required placeholder="Name" value={l3Name} onChange={(event) => setL3Name(event.target.value)} />
                <button className="btn btn-primary" type="submit"><Plus size={14} /> Create L3</button>
              </Form>
            </div>
            <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-light)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead><tr><th style={{ padding: '1rem' }}>Category</th><th style={{ padding: '1rem' }}>Level</th><th style={{ padding: '1rem' }}>Products</th><th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th></tr></thead>
                <tbody>{tree.length ? tree.map((category) => renderRow(category)) : <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center' }}>No categories yet.</td></tr>}</tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Form({ title, onSubmit, children }) {
  return <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-light)', padding: '1.25rem', boxShadow: 'var(--shadow-subtle)' }}><h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', textTransform: 'uppercase' }}>{title}</h3><form onSubmit={onSubmit} style={{ display: 'grid', gap: '0.5rem' }}>{children}</form></div>;
}
