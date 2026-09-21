import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import { DollarSign, ShoppingBag, Package, Users, AlertTriangle, ArrowUpRight } from 'lucide-react';
import api from '../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/dashboard');
        if (res.success) {
          setStats(res.stats);
        }
      } catch (err) {
        // Handle silently
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
      <AdminSidebar />

      <main style={{ flex: 1, padding: '2.5rem' }}>
        <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1.5rem', marginBottom: '2.5rem' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>ADMINISTRATION</span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', marginTop: '2px' }}>Store Overview & Performance</h1>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem' }}>
            <div className="spinner"></div>
          </div>
        ) : stats && (
          <div>
            {/* Top Metrics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div style={{ backgroundColor: '#fff', padding: '1.5rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Revenue</span>
                  <DollarSign size={20} />
                </div>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  PKR {stats.totalRevenue.toLocaleString()}
                </h3>
              </div>

              <div style={{ backgroundColor: '#fff', padding: '1.5rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Orders</span>
                  <ShoppingBag size={20} />
                </div>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {stats.totalOrders}
                </h3>
                <span className="badge badge-warning" style={{ marginTop: '0.4rem' }}>{stats.pendingOrders} Pending</span>
              </div>

              <div style={{ backgroundColor: '#fff', padding: '1.5rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Catalog Items</span>
                  <Package size={20} />
                </div>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {stats.totalProducts}
                </h3>
              </div>

              <div style={{ backgroundColor: '#fff', padding: '1.5rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Registered Clients</span>
                  <Users size={20} />
                </div>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {stats.totalCustomers}
                </h3>
              </div>
            </div>

            {/* Low Stock Warning Box */}
            {stats.lowStockProducts.length > 0 && (
              <div style={{ backgroundColor: '#fef7e0', border: '1px solid #f9e29c', padding: '1.25rem', borderRadius: 'var(--radius-sm)', marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b06000', fontWeight: 700, marginBottom: '0.75rem' }}>
                  <AlertTriangle size={18} /> Low Inventory Alerts ({stats.lowStockProducts.length} items)
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  {stats.lowStockProducts.map(p => (
                    <span key={p._id} style={{ fontSize: '0.85rem' }}>
                      <strong>{p.name}:</strong> only <span style={{ color: 'red', fontWeight: 700 }}>{p.stock}</span> remaining
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Orders Section */}
            <div style={{ backgroundColor: '#fff', padding: '1.75rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem' }}>Recent Storefront Orders</h3>
                <Link to="/admin/orders" className="btn btn-secondary btn-sm">
                  View All Orders <ArrowUpRight size={14} />
                </Link>
              </div>

              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentOrders.map((ord) => (
                      <tr key={ord._id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{ord.orderId}</td>
                        <td>{ord.shippingAddress?.fullName || ord.customerEmail}</td>
                        <td style={{ fontWeight: 700 }}>PKR {ord.totalAmount.toLocaleString()}</td>
                        <td>COD</td>
                        <td>
                          <span className={`badge ${ord.status === 'Pending' ? 'badge-warning' : (ord.status === 'Shipped' ? 'badge-info' : 'badge-dark')}`}>
                            {ord.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(ord.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
