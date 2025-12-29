/**
 * Role-Based Access Control (RBAC) Security Tests
 *
 * These tests verify that each role (owner, admin, developer) has
 * the correct permissions as defined in the session-auth middleware.
 *
 * Role permissions:
 * - owner: All permissions (*)
 * - admin: Full CRUD on systems, instances, services, api-keys, logs
 * - developer: Read-only on most, can create/update systems and services
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import '../../../test/setup';
import { get, post, patch, del } from '../../helpers/requests';
import { factories } from '../../helpers/factories';
import { createRoleTestUsers, unauthenticatedHeaders, invalidSessionHeaders } from '../../helpers/auth';
import type { TestUserContext } from '../../helpers/auth';

describe('Role-Based Access Control', () => {
  let owner: TestUserContext;
  let admin: TestUserContext;
  let developer: TestUserContext;
  let stack: Awaited<ReturnType<typeof factories.createTestStack>>;

  beforeEach(async () => {
    // Create users with different roles in the same organization
    const users = await createRoleTestUsers();
    owner = users.owner;
    admin = users.admin;
    developer = users.developer;

    // Create test data in the shared organization
    stack = await factories.createTestStack(owner.organizationId);
  });

  describe('Authentication requirements', () => {
    test('Unauthenticated request is rejected with 401', async () => {
      const { status, data } = await get<any>('/admin/systems', {
        headers: unauthenticatedHeaders(),
      });

      expect(status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    test('Invalid session token is rejected with 401', async () => {
      const { status, data } = await get<any>('/admin/systems', {
        headers: invalidSessionHeaders(),
      });

      expect(status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });
  });

  describe('Owner role permissions', () => {
    test('Owner can read systems', async () => {
      const { status } = await get('/admin/systems', {
        headers: owner.headers,
      });
      expect(status).toBe(200);
    });

    test('Owner can create systems', async () => {
      const { status } = await post('/admin/systems', {
        headers: owner.headers,
        body: {
          name: 'Owner System',
          type: 's4_public',
        },
      });
      expect(status).toBe(201);
    });

    test('Owner can delete systems', async () => {
      const system = await factories.createSystem(owner.organizationId);
      const { status } = await del(`/admin/systems/${system.id}`, {
        headers: owner.headers,
      });
      expect(status).toBe(200);
    });

    test('Owner can create API keys', async () => {
      const { status } = await post('/admin/api-keys', {
        headers: owner.headers,
        body: {
          name: 'Owner Key',
          accessGrants: [
            {
              instanceServiceId: stack.devInstService.id,
              permissions: { '*': ['read'] },
            },
          ],
        },
      });
      expect(status).toBe(201);
    });

    test('Owner can revoke API keys', async () => {
      const { status } = await post(`/admin/api-keys/${stack.apiKey.id}/revoke`, {
        headers: owner.headers,
        body: { reason: 'Test revoke' },
      });
      expect(status).toBe(200);
    });
  });

  describe('Admin role permissions', () => {
    test('Admin can read systems', async () => {
      const { status } = await get('/admin/systems', {
        headers: admin.headers,
      });
      expect(status).toBe(200);
    });

    test('Admin can create systems', async () => {
      const { status } = await post('/admin/systems', {
        headers: admin.headers,
        body: {
          name: 'Admin System',
          type: 's4_public',
        },
      });
      expect(status).toBe(201);
    });

    test('Admin can update systems', async () => {
      const { status } = await patch(`/admin/systems/${stack.system.id}`, {
        headers: admin.headers,
        body: { name: 'Updated by Admin' },
      });
      expect(status).toBe(200);
    });

    test('Admin can delete systems', async () => {
      const system = await factories.createSystem(admin.organizationId);
      const { status } = await del(`/admin/systems/${system.id}`, {
        headers: admin.headers,
      });
      expect(status).toBe(200);
    });

    test('Admin can create API keys', async () => {
      const { status } = await post('/admin/api-keys', {
        headers: admin.headers,
        body: {
          name: 'Admin Key',
          accessGrants: [
            {
              instanceServiceId: stack.devInstService.id,
              permissions: { '*': ['read'] },
            },
          ],
        },
      });
      expect(status).toBe(201);
    });

    test('Admin can revoke API keys', async () => {
      // Create a fresh key to revoke
      const { key } = await factories.createApiKey(admin.organizationId, [
        {
          instanceServiceId: stack.devInstService.id,
          permissions: { '*': ['read'] },
        },
      ]);

      const { status } = await post(`/admin/api-keys/${key.id}/revoke`, {
        headers: admin.headers,
        body: { reason: 'Admin revoke' },
      });
      expect(status).toBe(200);
    });

    test('Admin can read logs', async () => {
      const { status } = await get('/admin/logs', {
        headers: admin.headers,
      });
      expect(status).toBe(200);
    });
  });

  describe('Developer role restrictions', () => {
    test('Developer can read systems', async () => {
      const { status } = await get('/admin/systems', {
        headers: developer.headers,
      });
      expect(status).toBe(200);
    });

    test('Developer can create systems', async () => {
      const { status } = await post('/admin/systems', {
        headers: developer.headers,
        body: {
          name: 'Developer System',
          type: 's4_public',
        },
      });
      expect(status).toBe(201);
    });

    test('Developer can update systems', async () => {
      const { status } = await patch(`/admin/systems/${stack.system.id}`, {
        headers: developer.headers,
        body: { name: 'Updated by Developer' },
      });
      expect(status).toBe(200);
    });

    test('Developer CANNOT delete systems', async () => {
      const { status, data } = await del<any>(`/admin/systems/${stack.system.id}`, {
        headers: developer.headers,
      });
      expect(status).toBe(403);
      expect(data.error).toContain('permission');
    });

    test('Developer can read API keys', async () => {
      const { status } = await get('/admin/api-keys', {
        headers: developer.headers,
      });
      expect(status).toBe(200);
    });

    test('Developer CANNOT create API keys', async () => {
      const { status, data } = await post<any>('/admin/api-keys', {
        headers: developer.headers,
        body: {
          name: 'Developer Key',
          accessGrants: [
            {
              instanceServiceId: stack.devInstService.id,
              permissions: { '*': ['read'] },
            },
          ],
        },
      });
      expect(status).toBe(403);
      expect(data.error).toContain('permission');
    });

    test('Developer CANNOT revoke API keys', async () => {
      const { status, data } = await post<any>(`/admin/api-keys/${stack.apiKey.id}/revoke`, {
        headers: developer.headers,
        body: { reason: 'Developer attempt' },
      });
      expect(status).toBe(403);
      expect(data.error).toContain('permission');
    });

    test('Developer CANNOT rotate API keys', async () => {
      const { status, data } = await post<any>(`/admin/api-keys/${stack.apiKey.id}/rotate`, {
        headers: developer.headers,
        body: { newName: 'Rotated by Developer' },
      });
      expect(status).toBe(403);
      expect(data.error).toContain('permission');
    });

    test('Developer can read logs', async () => {
      const { status } = await get('/admin/logs', {
        headers: developer.headers,
      });
      expect(status).toBe(200);
    });

    test('Developer can create instances', async () => {
      const { status } = await post('/admin/instances', {
        headers: developer.headers,
        body: {
          systemId: stack.system.id,
          environment: 'quality',
          baseUrl: 'https://quality.example.com',
          authType: 'none',
        },
      });
      expect(status).toBe(201);
    });

    test('Developer can update instances', async () => {
      const { status } = await patch(`/admin/instances/${stack.devInstance.id}`, {
        headers: developer.headers,
        body: { baseUrl: 'https://updated.example.com' },
      });
      expect(status).toBe(200);
    });

    test('Developer can delete instances', async () => {
      // Create a fresh instance to delete
      const instance = await factories.createInstance(stack.system.id, { environment: 'sandbox' });

      const { status } = await del(`/admin/instances/${instance.id}`, {
        headers: developer.headers,
      });
      expect(status).toBe(200);
    });

    test('Developer can create services', async () => {
      const { status } = await post('/admin/system-services', {
        headers: developer.headers,
        body: {
          systemId: stack.system.id,
          name: 'Developer Service',
          alias: 'dev_svc',
          servicePath: '/sap/opu/odata/sap/TEST_API',
        },
      });
      expect(status).toBe(201);
    });
  });
});
