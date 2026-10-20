import React from 'react';
import { Home, Compass, ShoppingBag, User } from 'lucide-react';

interface BottomNavProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentRoute, onNavigate }) => {
  const navItems = [
    { label: 'Início', route: '/', icon: Home },
    { label: 'Explorar', route: '/explorar', icon: Compass },
    { label: 'Pedidos', route: '/meus-pedidos', icon: ShoppingBag },
    { label: 'Perfil', route: '/perfil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 md:hidden" aria-label="Navegação inferior">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = currentRoute === item.route;
          const Icon = item.icon;
          return (
            <button
              key={item.route}
              onClick={() => onNavigate(item.route)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 cursor-pointer transition-colors ${
                isActive ? 'text-orange-600' : 'text-slate-500 hover:text-slate-900'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
