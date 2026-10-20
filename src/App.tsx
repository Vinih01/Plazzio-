import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { BottomNav } from './components/layout/BottomNav';
import { CartDrawer } from './components/cart/CartDrawer';
import { CartConflictModal } from './components/cart/CartConflictModal';

// Pages
import { HomePage } from './features/marketplace/HomePage';
import { ExplorePage } from './features/marketplace/ExplorePage';
import { StorePage } from './features/marketplace/StorePage';
import { CheckoutPage } from './features/marketplace/CheckoutPage';
import { OrderPage } from './features/marketplace/OrderPage';
import { CustomerOrdersPage } from './features/marketplace/CustomerOrdersPage';
import { MerchantOnboardingPage } from './features/merchant/MerchantOnboardingPage';
import { MerchantDashboard } from './features/merchant/MerchantDashboard';
import { MerchantOrdersKanban } from './features/merchant/MerchantOrdersKanban';
import { MerchantMenuPage } from './features/merchant/MerchantMenuPage';
import { MerchantSettingsPage } from './features/merchant/MerchantSettingsPage';
import { MerchantReportsPage } from './features/merchant/MerchantReportsPage';
import { MerchantFinancePage } from './features/merchant/MerchantFinancePage';
import { SejaParceiroPage } from './features/commercial/SejaParceiroPage';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { Store } from './types';
import { DEMO_STORES } from './services/mockDemoData';
import { getMerchantStores, getStoreById } from './services/storeService';

function AppContent() {
  const { currentUser, role } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || '/';
  });

  const [activeMerchantStore, setActiveMerchantStore] = useState<Store>(DEMO_STORES[0]);

  // Synchronize activeMerchantStore with the authenticated merchant's real stores
  useEffect(() => {
    if (currentUser?.uid) {
      getMerchantStores(currentUser.uid).then(userStores => {
        if (userStores.length > 0) {
          // If current active store is a demo store or does not belong to user, select user's store
          setActiveMerchantStore(prev => {
            if (prev.ownerUid !== currentUser.uid) {
              return userStores[0];
            }
            return prev;
          });
        }
      });
    }
  }, [currentUser?.uid]);

  // Sync hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      setCurrentRoute(hash || '/');
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (route: string) => {
    window.location.hash = route;
    setCurrentRoute(route);
    window.scrollTo(0, 0);
  };

  // Parse path and query parameters
  const [pathname, queryString] = currentRoute.split('?');
  const queryParams = new URLSearchParams(queryString || '');

  const renderCurrentView = () => {
    // 1. Storefront: /loja/:slug
    if (pathname.startsWith('/loja/')) {
      const slug = pathname.replace('/loja/', '');
      return (
        <StorePage
          slug={slug}
          onBack={() => navigate('/explorar')}
        />
      );
    }

    // 2. Order Tracking: /pedido/:id
    if (pathname.startsWith('/pedido/')) {
      const orderId = pathname.replace('/pedido/', '');
      return (
        <OrderPage
          orderId={orderId}
          onBack={() => navigate('/meus-pedidos')}
          onNavigateHome={() => navigate('/')}
        />
      );
    }

    // 3. Checkout: /checkout
    if (pathname === '/checkout') {
      return (
        <CheckoutPage
          onBack={() => navigate('/')}
          onOrderSuccess={(orderId) => navigate(`/pedido/${orderId}`)}
        />
      );
    }

    // 4. Explore: /explorar
    if (pathname === '/explorar') {
      return (
        <ExplorePage
          initialSearchQuery={queryParams.get('q') || ''}
          initialCategory={queryParams.get('cat') || ''}
          onSelectStore={(slug) => navigate(`/loja/${slug}`)}
        />
      );
    }

    // 5. Customer Orders: /meus-pedidos
    if (pathname === '/meus-pedidos') {
      return (
        <CustomerOrdersPage
          onSelectOrder={(orderId) => navigate(`/pedido/${orderId}`)}
          onNavigateExplore={() => navigate('/explorar')}
        />
      );
    }

    // 5.b. Commercial /seja-parceiro landing page
    if (pathname === '/seja-parceiro') {
      return (
        <SejaParceiroPage
          onNavigate={navigate}
          onSelectPlanAndRegister={(planId) => navigate(`/parceiro/cadastro?plan=${planId}`)}
        />
      );
    }

    // 6. Merchant Onboarding: /parceiro/cadastro
    if (pathname === '/parceiro/cadastro') {
      return (
        <MerchantOnboardingPage
          initialPlan={queryParams.get('plan') || undefined}
          onSuccess={async (storeId) => {
            const created = await getStoreById(storeId);
            if (created) {
              setActiveMerchantStore(created);
            }
            navigate('/painel');
          }}
          onCancel={() => navigate('/')}
        />
      );
    }

    // 7. Merchant Kanban: /painel/pedidos
    if (pathname === '/painel/pedidos') {
      return (
        <MerchantOrdersKanban
          storeId={activeMerchantStore.id}
          storeName={activeMerchantStore.name}
          onBackToDashboard={() => navigate('/painel')}
        />
      );
    }

    // 8. Merchant Menu CRUD: /painel/cardapio
    if (pathname === '/painel/cardapio') {
      return (
        <MerchantMenuPage
          storeId={activeMerchantStore.id}
          storeName={activeMerchantStore.name}
          onBackToDashboard={() => navigate('/painel')}
        />
      );
    }

    // 9. Merchant Settings: /painel/loja
    if (pathname === '/painel/loja') {
      return (
        <MerchantSettingsPage
          store={activeMerchantStore}
          onBackToDashboard={() => navigate('/painel')}
          onStoreUpdated={(updated) => setActiveMerchantStore(updated)}
        />
      );
    }

    // 10. Merchant Reports: /painel/relatorios
    if (pathname === '/painel/relatorios') {
      return (
        <MerchantReportsPage
          storeId={activeMerchantStore.id}
          storeName={activeMerchantStore.name}
          onBackToDashboard={() => navigate('/painel')}
        />
      );
    }

    // 10.b. Merchant Finance: /painel/financeiro
    if (pathname === '/painel/financeiro') {
      return (
        <MerchantFinancePage
          storeId={activeMerchantStore.id}
          storeName={activeMerchantStore.name}
          onBackToDashboard={() => navigate('/painel')}
        />
      );
    }

    // 11. Merchant Main Dashboard: /painel
    if (pathname === '/painel') {
      return (
        <MerchantDashboard
          activeStore={activeMerchantStore}
          onSelectStore={(st) => setActiveMerchantStore(st)}
          onNavigateTab={(tab) => {
            if (tab === 'kanban') navigate('/painel/pedidos');
            else if (tab === 'menu') navigate('/painel/cardapio');
            else if (tab === 'settings') navigate('/painel/loja');
            else if (tab === 'reports') navigate('/painel/relatorios');
            else if (tab === 'financeiro') navigate('/painel/financeiro');
          }}
          onSelectOrder={(orderId: string) => navigate(`/pedido/${orderId}`)}
          onPreviewStore={(slug: string) => navigate(`/loja/${slug}`)}
        />
      );
    }

    // 12. Admin Dashboard: /admin
    if (pathname === '/admin') {
      return (
        <AdminDashboard
          onSelectOrder={(orderId: string) => navigate(`/pedido/${orderId}`)}
          onPreviewStore={(slug: string) => navigate(`/loja/${slug}`)}
        />
      );
    }

    // Default: Home Page
    return (
      <HomePage
        onNavigate={navigate}
        onSelectStore={(slug) => navigate(`/loja/${slug}`)}
      />
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased selection:bg-orange-100 selection:text-orange-900">
      <Navbar currentRoute={pathname} onNavigate={navigate} />

      <main className="flex-1">
        {renderCurrentView()}
      </main>

      <div className="hidden md:block">
        <Footer onNavigate={navigate} />
      </div>

      {pathname === '/' && <BottomNav currentRoute={pathname} onNavigate={navigate} />}

      {/* Global Slide-over Cart & Conflict Resolution Modal */}
      <CartDrawer onNavigateToCheckout={() => navigate('/checkout')} />
      <CartConflictModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}
