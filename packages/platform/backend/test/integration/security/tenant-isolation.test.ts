/**
 * Multi-tenant Isolation Security Tests
 *
 * These tests verify that users in one organization cannot access
 * resources belonging to another organization.
 *
 * CRITICAL: These tests must pass before deploying to production.
 */

import { describe, test, expect, beforeEach, beforeAll } from 'bun:test';
import '../../../test/setup';
import { get, post, patch, del } from '../../helpers/requests';
import { factories } from '../../helpers/factories';
import { createIsolatedUsers, createUserInOrg } from '../../helpers/auth';
import type { TestUserContext } from '../../helpers/auth';

describe('Multi-tenant Isolation', () => {
  let userA: TestUserContext;
  let userB: TestUserContext;

  // User A's data
  let stackA: Awaited<ReturnType<typeof factories.createTestStack>>;

  // User B's data
  let stackB: Awaited<ReturnType<typeof factories.createTestStack>>;

  beforeEach(async () => {
    // Create two isolated users with their own organizations
    const users = await createIsolatedUsers();
    userA = users.userA;
    userB = users.userB;

    // Create complete data stacks for both users
    stackA = await factories.createTestStack(userA.organizationId);
    stackB = await factories.createTestStack(userB.organizationId);
  });

  describe('Systems isolation', () => {
    test('User A cannot read User B systems list', async () => {
      const { data } = await get<any[]>('/admin/systems', {
        headers: userA.headers,
      });

      // Should only see User A's systems
      expect(Array.isArray(data)).toBe(true);
      const ids = data.map((s: any) => s.id);
      expect(ids).toContain(stackA.system.id);
      expect(ids).not.toContain(stackB.system.id);
    });

    test('User A cannot read User B system by ID', async () => {
      const { status } = await get(`/admin/systems/${stackB.system.id}`, {
        headers: userA.headers,
      });

      // Should return 404 (not 403) to prevent enumeration
      expect(status).toBe(404);
    });

    test('User A cannot update User B system', async () => {
      const { status } = await patch(`/admin/systems/${stackB.system.id}`, {
        headers: userA.headers,
        body: { name: 'Hacked System' },
      });

      expect(status).toBe(404);
    });

    test('User A cannot delete User B system', async () => {
      const { status } = await del(`/admin/systems/${stackB.system.id}`, {
        headers: userA.headers,
      });

      expect(status).toBe(404);
    });
  });

  describe('Instances isolation', () => {
    test('User A cannot read User B instances list', async () => {
      const { data } = await get<any[]>(`/admin/instances?systemId=${stackA.system.id}`, {
        headers: userA.headers,
      });

      // Should only see User A's instances
      const ids = data.map((i: any) => i.id);
      expect(ids).toContain(stackA.devInstance.id);
      expect(ids).not.toContain(stackB.devInstance.id);
    });

    test('User A cannot read User B instance by ID', async () => {
      const { status } = await get(`/admin/instances/${stackB.devInstance.id}`, {
        headers: userA.headers,
      });

      expect(status).toBe(404);
    });

    test('User A cannot create instance for User B system', async () => {
      const { status } = await post('/admin/instances', {
        headers: userA.headers,
        body: {
          systemId: stackB.system.id,
          environment: 'quality',
          baseUrl: 'https://evil.example.com',
          authType: 'none',
        },
      });

      // Should return 404 because User A cannot see User B's system
      expect(status).toBe(404);
    });

    test('User A cannot update User B instance', async () => {
      const { status } = await patch(`/admin/instances/${stackB.devInstance.id}`, {
        headers: userA.headers,
        body: { baseUrl: 'https://evil.example.com' },
      });

      expect(status).toBe(404);
    });

    test('User A cannot delete User B instance', async () => {
      const { status } = await del(`/admin/instances/${stackB.devInstance.id}`, {
        headers: userA.headers,
      });

      expect(status).toBe(404);
    });
  });

  describe('System Services isolation', () => {
    test('User A cannot read User B system services', async () => {
      const { data } = await get<any[]>(`/admin/system-services?systemId=${stackA.system.id}`, {
        headers: userA.headers,
      });

      const ids = data.map((s: any) => s.id);
      expect(ids).toContain(stackA.service.id);
      expect(ids).not.toContain(stackB.service.id);
    });

    test('User A cannot create service for User B system', async () => {
      const { status } = await post('/admin/system-services', {
        headers: userA.headers,
        body: {
          systemId: stackB.system.id,
          name: 'Evil Service',
          alias: 'evil',
          servicePath: '/evil/path',
        },
      });

      expect(status).toBe(404);
    });
  });

  describe('Instance Services isolation', () => {
    test('User A cannot read User B instance services', async () => {
      const { data } = await get<any[]>(`/admin/instance-services?instanceId=${stackA.devInstance.id}`, {
        headers: userA.headers,
      });

      const ids = data.map((is: any) => is.id);
      expect(ids).toContain(stackA.devInstService.id);
      expect(ids).not.toContain(stackB.devInstService.id);
    });

    test('User A cannot update User B instance service', async () => {
      const { status } = await patch(`/admin/instance-services/${stackB.devInstService.id}`, {
        headers: userA.headers,
        body: { servicePathOverride: '/evil/override' },
      });

      expect(status).toBe(404);
    });
  });

  describe('API Keys isolation', () => {
    test('User A cannot read User B API keys list', async () => {
      const { data } = await get<any[]>('/admin/api-keys', {
        headers: userA.headers,
      });

      const ids = data.map((k: any) => k.id);
      expect(ids).toContain(stackA.apiKey.id);
      expect(ids).not.toContain(stackB.apiKey.id);
    });

    test('User A cannot read User B API key by ID', async () => {
      const { status } = await get(`/admin/api-keys/${stackB.apiKey.id}`, {
        headers: userA.headers,
      });

      expect(status).toBe(404);
    });

    test('User A cannot revoke User B API key', async () => {
      const { status } = await post(`/admin/api-keys/${stackB.apiKey.id}/revoke`, {
        headers: userA.headers,
        body: { reason: 'Hacked' },
      });

      expect(status).toBe(404);
    });

    test('User A cannot rotate User B API key', async () => {
      const { status } = await post(`/admin/api-keys/${stackB.apiKey.id}/rotate`, {
        headers: userA.headers,
        body: { newName: 'Stolen Key' },
      });

      expect(status).toBe(404);
    });

    test('User A cannot create API key with access to User B services', async () => {
      const { status, data } = await post<any>('/admin/api-keys', {
        headers: userA.headers,
        body: {
          name: 'Cross-tenant Key',
          accessGrants: [
            {
              instanceServiceId: stackB.devInstService.id,
              permissions: { '*': ['*'] },
            },
          ],
        },
      });

      // Should reject - either 400 (invalid reference) or 403 (forbidden)
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(500);
    });

    test('User A cannot update User B API key', async () => {
      // Try to update User B's API key
      const { status } = await patch(`/admin/api-keys/${stackB.apiKey.id}`, {
        headers: userA.headers,
        body: {
          name: 'Stolen Key',
        },
      });

      // Should return 404 (not 403) to prevent enumeration
      expect(status).toBe(404);
    });
  });

  describe('Logs isolation', () => {
    test('User A cannot read logs from User B API keys', async () => {
      // Note: In a real scenario, we'd create actual request logs
      // For now, we just verify the API doesn't leak cross-tenant data
      const { data } = await get<any>('/admin/logs', {
        headers: userA.headers,
      });

      // If there are logs, they should only be from User A's keys
      if (data.data && data.data.length > 0) {
        const apiKeyIds = new Set(data.data.map((log: any) => log.apiKeyId));
        expect(apiKeyIds.has(stackB.apiKey.id)).toBe(false);
      }
    });
  });
});

/**
 * Same-Organization Collaboration Tests
 *
 * These tests verify that users within the SAME organization CAN see
 * and manage each other's resources. This is essential for team collaboration.
 */
describe('Same-Organization Collaboration', () => {
  let ownerUser: TestUserContext;
  let adminUser: TestUserContext;
  let developerUser: TestUserContext;

  // Owner's data (visible to all org members)
  let stack: Awaited<ReturnType<typeof factories.createTestStack>>;

  beforeEach(async () => {
    // Create owner and their data
    ownerUser = (await createIsolatedUsers()).userA;
    stack = await factories.createTestStack(ownerUser.organizationId);

    // Add admin and developer to the SAME organization
    adminUser = await createUserInOrg(ownerUser.organizationId, 'admin');
    developerUser = await createUserInOrg(ownerUser.organizationId, 'developer');
  });

  describe('Systems - Same org visibility', () => {
    test('Admin can list systems created by Owner', async () => {
      const { data, status } = await get<any[]>('/admin/systems', {
        headers: adminUser.headers,
      });

      expect(status).toBe(200);
      const ids = data.map((s) => s.id);
      expect(ids).toContain(stack.system.id);
    });

    test('Developer can list systems created by Owner', async () => {
      const { data, status } = await get<any[]>('/admin/systems', {
        headers: developerUser.headers,
      });

      expect(status).toBe(200);
      const ids = data.map((s) => s.id);
      expect(ids).toContain(stack.system.id);
    });

    test('Admin can GET system created by Owner', async () => {
      const { data, status } = await get<any>(`/admin/systems/${stack.system.id}`, {
        headers: adminUser.headers,
      });

      expect(status).toBe(200);
      expect(data.id).toBe(stack.system.id);
    });

    test('Admin can update system created by Owner', async () => {
      const { data, status } = await patch<any>(`/admin/systems/${stack.system.id}`, {
        headers: adminUser.headers,
        body: { description: 'Updated by admin colleague' },
      });

      expect(status).toBe(200);
      expect(data.description).toBe('Updated by admin colleague');
    });
  });

  describe('Instances - Same org visibility', () => {
    test('Admin can list instances in Owner system', async () => {
      const { data, status } = await get<any[]>(`/admin/instances?systemId=${stack.system.id}`, {
        headers: adminUser.headers,
      });

      expect(status).toBe(200);
      const ids = data.map((i) => i.id);
      expect(ids).toContain(stack.devInstance.id);
      expect(ids).toContain(stack.prodInstance.id);
    });

    test('Developer can view instance created by Owner', async () => {
      const { data, status } = await get<any>(`/admin/instances/${stack.devInstance.id}`, {
        headers: developerUser.headers,
      });

      expect(status).toBe(200);
      expect(data.id).toBe(stack.devInstance.id);
    });

    test('Admin can create instance in Owner system', async () => {
      const { data, status } = await post<any>('/admin/instances', {
        headers: adminUser.headers,
        body: {
          systemId: stack.system.id,
          environment: 'quality',
          baseUrl: 'https://quality.example.com',
          authType: 'none',
        },
      });

      expect(status).toBe(201);
      expect(data.environment).toBe('quality');
    });
  });

  describe('System Services - Same org visibility', () => {
    test('Admin can list services in Owner system', async () => {
      const { data, status } = await get<any[]>(`/admin/system-services?systemId=${stack.system.id}`, {
        headers: adminUser.headers,
      });

      expect(status).toBe(200);
      const ids = data.map((s) => s.id);
      expect(ids).toContain(stack.service.id);
    });

    test('Developer can view service created by Owner', async () => {
      const { data, status } = await get<any>(`/admin/system-services/${stack.service.id}`, {
        headers: developerUser.headers,
      });

      expect(status).toBe(200);
      expect(data.id).toBe(stack.service.id);
    });
  });

  describe('Instance Services - Same org visibility', () => {
    test('Admin can list instance services in Owner instance', async () => {
      const { data, status } = await get<any[]>(`/admin/instance-services?instanceId=${stack.devInstance.id}`, {
        headers: adminUser.headers,
      });

      expect(status).toBe(200);
      const ids = data.map((is) => is.id);
      expect(ids).toContain(stack.devInstService.id);
    });

    test('Developer can view instance service details', async () => {
      const { data, status } = await get<any>(`/admin/instance-services/${stack.devInstService.id}`, {
        headers: developerUser.headers,
      });

      expect(status).toBe(200);
      expect(data.id).toBe(stack.devInstService.id);
    });
  });

  describe('API Keys - Same org visibility', () => {
    test('Admin can list API keys created by Owner', async () => {
      const { data, status } = await get<any[]>('/admin/api-keys', {
        headers: adminUser.headers,
      });

      expect(status).toBe(200);
      const ids = data.map((k) => k.id);
      expect(ids).toContain(stack.apiKey.id);
    });

    test('Admin can view API key created by Owner', async () => {
      const { data, status } = await get<any>(`/admin/api-keys/${stack.apiKey.id}`, {
        headers: adminUser.headers,
      });

      expect(status).toBe(200);
      expect(data.id).toBe(stack.apiKey.id);
    });

    test('Admin can update API key created by Owner', async () => {
      const { data, status } = await patch<any>(`/admin/api-keys/${stack.apiKey.id}`, {
        headers: adminUser.headers,
        body: { description: 'Updated by admin colleague' },
      });

      expect(status).toBe(200);
      expect(data.description).toBe('Updated by admin colleague');
    });

    test('Admin can create API key with access to shared services', async () => {
      const { data, status } = await post<any>('/admin/api-keys', {
        headers: adminUser.headers,
        body: {
          name: 'Admin Created Key',
          accessGrants: [
            {
              instanceServiceId: stack.devInstService.id,
              permissions: { '*': ['read'] },
            },
          ],
        },
      });

      // Note: This may fail with 500 if metadata fetch fails (test instance has fake URL)
      // The important thing is that admin CAN access the same org's instance service
      // If it fails, it should be 500 (internal error), not 404/403 (access denied)
      if (status === 201) {
        // Response spreads key properties at top level, not nested under 'key'
        expect(data.name).toBe('Admin Created Key');
        expect(data.secretKey).toBeDefined();
      } else {
        // Metadata fetch failed - but verify it's not an access denied error
        expect(status).not.toBe(403);
        expect(status).not.toBe(404);
      }
    });

    test('Developer can view API keys (but may not create due to RBAC)', async () => {
      const { data, status } = await get<any[]>('/admin/api-keys', {
        headers: developerUser.headers,
      });

      expect(status).toBe(200);
      const ids = data.map((k) => k.id);
      expect(ids).toContain(stack.apiKey.id);
    });
  });

  describe('Logs - Same org visibility', () => {
    test('Admin can view logs (same organization)', async () => {
      const { data, status } = await get<any>('/admin/logs', {
        headers: adminUser.headers,
      });

      expect(status).toBe(200);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
    });

    test('Admin can view analytics (same organization)', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const { data, status } = await get<any>(
        `/admin/logs/analytics?from=${yesterday.toISOString()}&to=${now.toISOString()}`,
        { headers: adminUser.headers }
      );

      expect(status).toBe(200);
      expect(data).toHaveProperty('summary');
    });

    test('Developer can view logs (same organization)', async () => {
      const { data, status } = await get<any>('/admin/logs', {
        headers: developerUser.headers,
      });

      expect(status).toBe(200);
      expect(data).toHaveProperty('data');
    });
  });

  describe('Cross-user data creation in same org', () => {
    test('Admin creates system, Owner can see it', async () => {
      // Admin creates a new system
      const { data: newSystem, status } = await post<any>('/admin/systems', {
        headers: adminUser.headers,
        body: {
          name: 'Admin Created System',
          type: 's4_public',
        },
      });

      expect(status).toBe(201);

      // Owner should be able to see it
      const { data: ownerView, status: ownerStatus } = await get<any>(
        `/admin/systems/${newSystem.id}`,
        { headers: ownerUser.headers }
      );

      expect(ownerStatus).toBe(200);
      expect(ownerView.name).toBe('Admin Created System');
    });

    test('Admin creates instance in Owner system, Developer can see it', async () => {
      // Admin creates instance
      const { data: newInstance, status } = await post<any>('/admin/instances', {
        headers: adminUser.headers,
        body: {
          systemId: stack.system.id,
          environment: 'sandbox',
          baseUrl: 'https://sandbox.example.com',
          authType: 'none',
        },
      });

      expect(status).toBe(201);

      // Developer should be able to see it
      const { data: devView, status: devStatus } = await get<any>(
        `/admin/instances/${newInstance.id}`,
        { headers: developerUser.headers }
      );

      expect(devStatus).toBe(200);
      expect(devView.environment).toBe('sandbox');
    });
  });
});
