export const UserRole = {
    SUPERVISOR: 'Supervisor',
    MANAGER: 'Manager',
    ADMIN: 'Admin',
    DEO: 'DEO',
    PPC_PLANNER: 'PPC_Planner',
    STORE_KEEPER: 'Store_Keeper',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
