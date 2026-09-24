import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ScrollToTop from './components/common/ScrollToTop';

import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import CartDrawer from './components/common/CartDrawer';

import ReturnsPolicy from './pages/ReturnsPolicy';
import ShippingPolicy from './pages/ShippingPolicy';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';

import WhatsAppButton from './components/common/WhatsAppButton';
import NotFound from './pages/NotFound';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import TrackOrder from './pages/TrackOrder';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';

import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminOrders from './pages/AdminOrders';
import AdminProducts from './pages/AdminProducts';
import AdminProductEdit from './pages/AdminProductEdit';
import AdminCategories from './pages/AdminCategories';
import AdminCustomers from './pages/AdminCustomers';
import AdminHomeEditor from './pages/AdminHomeEditor';
import AdminSettings from './pages/AdminSettings';
import AdminManageAdmins from './pages/AdminManageAdmins';
import AdminReviews from './pages/AdminReviews';


// Protected Route for Authenticated Customers
const RequireAuth = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem' }}><div className="spinner"></div></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// Shown to a signed-in customer who reaches an /admin URL.
const NoAccess = () => (
  <div className="container" style={{ padding: '6rem 1.5rem', maxWidth: '520px', textAlign: 'center' }}>
    <span className="text-uppercase-tracking" style={{ color: 'var(--text-muted)' }}>RESTRICTED</span>
    <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginTop: '0.25rem' }}>No access to this area</h1>
    <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', fontSize: '0.9rem', lineHeight: 1.7 }}>
      This section is limited to store administrators. If you believe you should have
      access, please contact the store owner.
    </p>
    <Link to="/" className="btn btn-primary" style={{ marginTop: '2rem' }}>Return to Store</Link>
  </div>
);

// Protected Route for Admin Users
const RequireAdmin = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem' }}><div className="spinner"></div></div>;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  if (!isAdmin) return <NoAccess />;
  return children;
};

// Layout wrapper — decides whether to show the storefront navbar,
// cart drawer, footer, and WhatsApp button based on the current route.
//
// On any /admin/* route: hide the storefront chrome entirely so the
// admin console has a clean, distraction-free surface.
// On all other routes: render the normal storefront chrome.
function Layout({ children }) {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute) {
    // Minimal admin layout — no Navbar, no CartDrawer, no Footer,
    // no WhatsApp button. The admin pages themselves render the
    // AdminSidebar and AdminHeader.
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ flex: 1 }}>{children}</div>
      </div>
    );
  }

  // Storefront layout — full chrome.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <CartDrawer />
            <div style={{ flex: 1, paddingTop: '110px' }}>{children}</div>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <Layout>
          <Routes>

            <Route path="/returns-policy" element={<ReturnsPolicy />} />
            <Route path="/shipping-policy" element={<ShippingPolicy />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />

            {/* Public Storefront Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:slug" element={<ProductDetail />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
            <Route path="/track-order" element={<TrackOrder />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Customer Account Routes */}
            <Route path="/profile" element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            } />

            {/* Admin console */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            } />
            <Route path="/admin/orders" element={
              <RequireAdmin>
                <AdminOrders />
              </RequireAdmin>
            } />
            <Route path="/admin/settings" element={
              <RequireAdmin>
                <AdminSettings />
              </RequireAdmin>
            } />
            <Route path="/admin/products" element={
              <RequireAdmin>
                <AdminProducts />
              </RequireAdmin>
            } />
            <Route path="/admin/products/new" element={
              <RequireAdmin>
                <AdminProductEdit />
              </RequireAdmin>
            } />
            <Route path="/admin/products/edit/:id" element={
              <RequireAdmin>
                <AdminProductEdit />
              </RequireAdmin>
            } />
            <Route path="/admin/categories" element={
              <RequireAdmin>
                <AdminCategories />
              </RequireAdmin>
            } />
            <Route path="/admin/customers" element={
              <RequireAdmin>
                <AdminCustomers />
              </RequireAdmin>
            } />
            <Route path="/admin/reviews" element={
              <RequireAdmin>
                <AdminReviews />
              </RequireAdmin>
            } />
            <Route path="/admin/home" element={
              <RequireAdmin>
                <AdminHomeEditor />
              </RequireAdmin>
            } />
            <Route path="/admin/admins" element={
              <RequireAdmin>
                <AdminManageAdmins />
              </RequireAdmin>
            } />

            {/* 404 Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}