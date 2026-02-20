import React from 'react';
import { Menu, LayoutDashboard } from 'lucide-react';

interface MobileHeaderProps {
  setIsMobileMenuOpen: (isOpen: boolean) => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ setIsMobileMenuOpen }) => {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-surface-container-low shadow-sm z-10 flex items-center justify-between px-4 border-b border-outline-variant/30">
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="p-2 text-on-surface hover:bg-surface-container-highest rounded-full transition-colors"
        title="Abrir menu"
      >
        <Menu className="w-6 h-6" />
      </button>
      <span className="font-bold text-lg text-primary flex items-center gap-2">
        <LayoutDashboard className="w-5 h-5" /> Rota de Vendas
      </span>
      <div className="w-10"></div> {/* Spacer for center alignment */}
    </header>
  );
};

export default MobileHeader;
