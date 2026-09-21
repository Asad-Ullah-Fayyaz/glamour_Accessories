import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Users,
  Home,
  LogOut,
  Settings,
  Shield,
  Star
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isSuperAdmin, logout } = useAuth();

  // Base links every admin can see
  const links = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Orders', path: '/admin/orders', icon: ShoppingBag },
    { label: 'Products', path: '/admin/products', icon: Package },
    { label: 'Categories', path: '/admin/categories', icon: Layers },
    { label: 'Customers', path: '/admin/customers', icon: Users },
    { label: 'Reviews', path: '/admin/reviews', icon: Star },
    { label: 'Edit Homepage', path: '/admin/home', icon: Home },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  // Super-Admin-only link
  if (isSuperAdmin) {
    links.push({ label: 'Manage Admins', path: '/admin/admins', icon: Shield });
  }

  return (
    <aside
      style={{
        width: '250px',
        backgroundColor: 'var(--bg-dark)',
        color: '#fff',
        minHeight: '100vh',
        padding: '2rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <div>
        <div
          style={{
            paddingBottom: '2rem',
            borderBottom: '1px solid #222',
            marginBottom: '2rem'
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.25rem',
              letterSpacing: '0.1em'
            }}
          >
            AXI ADMIN
          </h2>
          <span
            style={{
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: 'var(--accent-gold)'
            }}
          >
            STORE CONSOLE
          </span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 400,
                  backgroundColor: isActive ? '#222' : 'transparent',
                  color: isActive ? '#fff' : '#aaa',
                  transition: 'all 0.2s'
                }}
              >
                <Icon size={18} /> {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div
        style={{
          borderTop: '1px solid #222',
          paddingTop: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}
      >
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.8rem',
            color: '#aaa'
          }}
        >
          <Home size={16} /> View Storefront
        </Link>
         
        <button
          onClick={() => {
            logout();
            navigate('/admin/login', { replace: true });
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.8rem',
            color: '#ff6666',
            textAlign: 'left'
          }}
        >
          <LogOut size={16} /> Exit Admin
        </button>
        
      </div>
    </aside>
  );
}