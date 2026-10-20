import React from 'react';
import { PlazzioLogo } from '../common/PlazzioLogo';
import { ShieldCheck, Heart, MapPin } from 'lucide-react';

interface FooterProps {
  onNavigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Brand & Identity */}
          <div className="space-y-3">
            <PlazzioLogo light size="md" />
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              Conectando consumidores a pequenos empreendedores locais com pedidos transparentes, cardápios digitais e gestão descomplicada.
            </p>
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] pt-1">
              <MapPin className="w-3.5 h-3.5 text-orange-500" />
              <span>Fuso Operacional: America/Sao_Paulo (BR)</span>
            </div>
          </div>

          {/* Col 2: Para Consumidores */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Consumidor
            </h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => onNavigate('/')} className="hover:text-white transition-colors cursor-pointer">
                  Início
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/explorar')} className="hover:text-white transition-colors cursor-pointer">
                  Explorar Estabelecimentos
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/meus-pedidos')} className="hover:text-white transition-colors cursor-pointer">
                  Acompanhar Meus Pedidos
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Para Empreendedores */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Empreendedores
            </h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => onNavigate('/parceiro/cadastro')} className="hover:text-white transition-colors cursor-pointer">
                  Cadastrar Estabelecimento
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/painel')} className="hover:text-white transition-colors cursor-pointer">
                  Painel de Pedidos & Kanban
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/painel/cardapio')} className="hover:text-white transition-colors cursor-pointer">
                  Gestão de Cardápio Digital
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/painel/relatorios')} className="hover:text-white transition-colors cursor-pointer">
                  Relatórios de Vendas
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Confiança e Segurança */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Segurança & Plataforma
            </h4>
            <p className="text-slate-400 text-xs mb-3 leading-relaxed">
              Pagamentos diretos ao lojista com Pix e maquininha no ato da entrega. Isolamento e proteção de dados comerciais.
            </p>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-[11px] leading-tight">
                Regras e auditoria de estabelecimentos verificadas no servidor.
              </span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} Plazzio Marketplace e Plataforma de Gestão. Todos os direitos reservados.</p>
          <div className="flex items-center gap-1">
            <span>Desenvolvido para pequenos e médios negócios do Brasil</span>
            <Heart className="w-3.5 h-3.5 text-orange-500 fill-orange-500 ml-1 inline" />
          </div>
        </div>
      </div>
    </footer>
  );
};
