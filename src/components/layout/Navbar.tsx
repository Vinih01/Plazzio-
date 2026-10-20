import React, { useState } from 'react';
import { PlazzioLogo } from '../common/PlazzioLogo';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { ShoppingBag, User as UserIcon, LogOut, Shield, Store as StoreIcon, ChevronDown } from 'lucide-react';

interface NavbarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRoute, onNavigate }) => {
  const { itemCount, setIsCartOpen } = useCart();
  const { currentUser, role, signInWithGoogle, signOut, simulateRole, simulatedRole } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const isActualAdmin = Boolean(currentUser?.email && currentUser.email.toLowerCase() === 'mapwiser@gmail.com');

  const navLinks = [
    { label: 'Início', route: '/' },
    { label: 'Explorar', route: '/explorar' },
    { label: 'Seja Parceiro', route: '/seja-parceiro' },
    ...(role === 'merchant' || isActualAdmin ? [{ label: 'Painel Loja', route: '/painel' }] : []),
    ...(isActualAdmin ? [{ label: 'Administração', route: '/admin' }] : []),
    ...(role === 'consumer' && !isActualAdmin ? [{ label: 'Meus Pedidos', route: '/meus-pedidos' }] : []),
  ];

  const handleRoleSwitch = (newRole: UserRole) => {
    if (!isActualAdmin) return;
    simulateRole(newRole);
    setUserDropdownOpen(false);
    if (newRole === 'merchant') {
      onNavigate('/painel');
    } else if (newRole === 'admin') {
      onNavigate('/admin');
    } else {
      onNavigate('/');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark */}
        <button 
          onClick={() => onNavigate('/')} 
          className="hover:opacity-95 transition-opacity text-left shrink-0 cursor-pointer"
          aria-label="Ir para página inicial do Plazzio"
        >
          <PlazzioLogo size="md" />
        </button>

        {/* Zone 2: 4-5 single-line clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
          {navLinks.slice(0, 5).map(link => {
            const isActive = currentRoute === link.route || (link.route !== '/' && currentRoute.startsWith(link.route));
            return (
              <button
                key={link.route}
                onClick={() => onNavigate(link.route)}
                className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer ${
                  isActive 
                    ? 'text-orange-600 font-bold border-b-2 border-orange-500' 
                    : 'hover:text-slate-900'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action area (Cart + User Account / Role switcher) */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Cart Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label={`Abrir sacola com ${itemCount} itens`}
          >
            <ShoppingBag className="w-5 h-5 text-slate-700" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-in zoom-in">
                {itemCount}
              </span>
            )}
          </button>

          {/* User Auth / Profile Dropdown */}
          <div className="relative">
            {currentUser ? (
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-xs font-medium text-slate-800 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                  {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
            )}

            {/* Account / Role Switcher Popover */}
            {userDropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-xs"
                onMouseLeave={() => setUserDropdownOpen(false)}
              >
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="font-semibold text-slate-900 truncate">
                    {currentUser?.displayName || 'Usuário Autenticado'}
                  </p>
                  <p className="text-slate-500 text-[11px] truncate">
                    {currentUser?.email}
                  </p>
                  {isActualAdmin && (
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-orange-700 font-semibold uppercase tracking-wider">
                      Perfil ativo: {role}
                      {simulatedRole && ' (simulado)'}
                    </div>
                  )}
                </div>

                {/* Role Switcher for MVP Evaluation - ONLY for actual admin */}
                {isActualAdmin && (
                  <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Alternar visão (MVP Demo):
                    </span>
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={() => handleRoleSwitch('consumer')}
                        className={`flex-1 py-1 rounded text-[11px] font-medium transition-colors ${
                          role === 'consumer' ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Cliente
                      </button>
                      <button
                        onClick={() => handleRoleSwitch('merchant')}
                        className={`flex-1 py-1 rounded text-[11px] font-medium transition-colors ${
                          role === 'merchant' ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Lojista
                      </button>
                      <button
                        onClick={() => handleRoleSwitch('admin')}
                        className={`flex-1 py-1 rounded text-[11px] font-medium transition-colors ${
                          role === 'admin' ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Admin
                      </button>
                    </div>
                  </div>
                )}

                <div className="py-1">
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onNavigate('/meus-pedidos');
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 text-slate-700 flex items-center gap-2"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
                    <span>Meus Pedidos</span>
                  </button>

                  {(role === 'merchant' || isActualAdmin) && (
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('/painel');
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 text-slate-700 flex items-center gap-2"
                    >
                      <StoreIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Painel do Comerciante</span>
                    </button>
                  )}

                  {isActualAdmin && (
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('/admin');
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 text-slate-700 flex items-center gap-2"
                    >
                      <Shield className="w-3.5 h-3.5 text-slate-500" />
                      <span>Painel Administrativo</span>
                    </button>
                  )}

                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      signOut();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair da conta</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
