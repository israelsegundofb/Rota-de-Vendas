import { UserRole, AppUser } from '../types';

export const ROLE_LABELS: Record<UserRole, string> = {
    admin_dev: '🛠️ Admin DEV',
    admin_general: '👨‍💼 Admin Geral',
    general_manager: '👔 Gerente Geral',
    sales_manager: '📈 Gerente de Vendas',
    sales_supervisor: '📋 Supervisor de Vendas',
    general_viewer: '👁️ Visualizador Geral',
    sales_internal: '🏢 Vendedor Interno',
    sales_external: '🚗 Vendedor Externo',
    admin: '👑 Admin (Legado)',
    salesperson: '👤 Vendedor (Legado)'
};

// Menor número = Maior Poder
export const ROLE_HIERARCHY: Record<UserRole, number> = {
    admin_dev: 1,
    admin: 1, // Legacy treats as top level
    admin_general: 2,
    general_manager: 3,
    sales_manager: 4,
    sales_supervisor: 5,
    general_viewer: 6,
    sales_internal: 7,
    sales_external: 8,
    salesperson: 8 // Legacy treats as lowest level
};

export const getRoleLabel = (role: UserRole) => ROLE_LABELS[role] || role;

/**
 * Normaliza roles legados para os novos roles equivalentes
 */
export const normalizeRole = (role: UserRole): UserRole => {
    if (role === 'admin') return 'admin_dev';
    if (role === 'salesperson') return 'sales_external';
    return role;
};

/**
 * Retorna lista de cargos que o usuário atual pode gerenciar (criar/editar).
 * Regra: Só pode criar cargos com nível HIERÁRQUICO MAIOR (número maior) que o seu.
 * Ex: Nível 2 cria 3, 4, 5... mas não cria 1 ou 2.
 */
export const getAvailableRoles = (currentUserRole: UserRole): UserRole[] => {
    const currentLevel = ROLE_HIERARCHY[currentUserRole];

    // Lista de novos roles (excluindo legados)
    const newRoles: UserRole[] = [
        'admin_dev',
        'admin_general',
        'general_manager',
        'sales_manager',
        'sales_supervisor',
        'general_viewer',
        'sales_internal',
        'sales_external'
    ];

    if (currentLevel === 1) return newRoles; // Admin DEV pode tudo

    return newRoles.filter(role => ROLE_HIERARCHY[role] > currentLevel);
};

export const canManageRole = (currentUserRole: UserRole, targetUserRole: UserRole): boolean => {
    const currentLevel = ROLE_HIERARCHY[currentUserRole];
    const targetLevel = ROLE_HIERARCHY[targetUserRole];

    // Regra Exceção Admin DEV:
    // Se o alvo é Admin DEV (nível 1), APENAS outro Admin DEV (nível 1) pode editar.
    if (targetLevel === 1) {
        return currentLevel === 1;
    }

    // Regra Geral: Pode gerenciar se tiver nível hierárquico SUPERIOR (menor número)
    return currentLevel < targetLevel;
};

/**
 * Verifica se tem permissão de Admin (Nível 1 ou 2)
 */
export const isAdmin = (role: UserRole): boolean => {
    return ROLE_HIERARCHY[role] <= 5;
};

/**
 * Verifica se é da área de Vendas (Managers pra baixo -> Nível 3+)
 * Exclui Visualizadores (são apenas observadores)
 */
export const isSalesTeam = (role: UserRole): boolean => {
    return ROLE_HIERARCHY[role] >= 3 && role !== 'general_viewer';
};

/**
 * Verifica se tem visibilidade total dos dados (Todos os pinos/clientes).
 * Inclui: Admin DEV, Admin Geral, Gerente Geral, Gerente de Vendas, Supervisor de Vendas e Visualizador Geral.
 * (Níveis 1 a 6)
 */
export const hasFullDataVisibility = (role: UserRole): boolean => {
    return ROLE_HIERARCHY[role] <= 6;
};
/**
 * Migra roles legados e garante propriedades específicas para o Administrador principal.
 */
export const migrateUsers = (users: AppUser[]): AppUser[] => {
    return users.map(u => {
        // Garante as propriedades do Admin DEV para o administrador principal
        if (u.id === 'admin' || u.username === 'admin') {
            return { ...u, role: 'admin_dev', name: 'Admin DEV', salesCategory: 'N/A' };
        }
        // Migra roles legados para os novos equivalentes
        if (u.role === 'admin') return { ...u, role: 'admin_dev' };
        if (u.role === 'salesperson') return { ...u, role: 'sales_external' };

        return u;
    });
};
