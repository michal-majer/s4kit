'use client';

import { createContext, useContext, ReactNode } from 'react';

export type UserRole = 'owner' | 'admin' | 'developer';

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  emailVerified: boolean;
}

export interface AuthContextType {
  user: User;
  organizationId: string;
  organizationName: string;
  userRole: UserRole;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  user: User;
  organizationId: string;
  organizationName: string;
  userRole: UserRole;
}

export function AuthProvider({
  children,
  user,
  organizationId,
  organizationName,
  userRole,
}: AuthProviderProps) {
  return (
    <AuthContext.Provider
      value={{
        user,
        organizationId,
        organizationName,
        userRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Permission definitions per role
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  owner: ['*'],
  admin: [
    'organization:read',
    'organization:update',
    'member:read',
    'member:create',
    'member:update',
    'member:delete',
    'invitation:read',
    'invitation:create',
    'invitation:delete',
    'system:read',
    'system:create',
    'system:update',
    'system:delete',
    'instance:read',
    'instance:create',
    'instance:update',
    'instance:delete',
    'service:read',
    'service:create',
    'service:update',
    'service:delete',
    'apiKey:read',
    'apiKey:create',
    'apiKey:update',
    'apiKey:delete',
    'logs:read',
  ],
  developer: [
    'organization:read',
    'member:read',
    'system:read',
    'system:create',
    'system:update',
    'instance:read',
    'instance:create',
    'instance:update',
    'instance:delete',
    'service:read',
    'service:create',
    'service:update',
    'service:delete',
    'apiKey:read',
    'logs:read',
  ],
};

export function usePermission(permission: string): boolean {
  const { userRole } = useAuth();
  return hasPermission(userRole, permission);
}

export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];

  // Check for wildcard
  if (permissions.includes('*')) return true;

  // Check exact match
  if (permissions.includes(permission)) return true;

  // Check wildcard for resource (e.g., "system:*" matches "system:read")
  const [resource] = permission.split(':');
  if (permissions.includes(`${resource}:*`)) return true;

  return false;
}

// Hook to check if user can perform action (returns null if no permission)
export function useCanAccess(permission: string): boolean {
  try {
    return usePermission(permission);
  } catch {
    // Not within AuthProvider, assume no permission
    return false;
  }
}
