import { ApiKeyFormPage } from '@/components/api-keys/api-key-form-page';
import { api } from '@/lib/api';
import { withServerCookies } from '@/lib/server-api';

export default async function NewApiKeyPage() {
  const [instanceServices, systems, instances, systemServices] = await withServerCookies(() =>
    Promise.all([
      api.instanceServices.list().catch(() => []),
      api.systems.list().catch(() => []),
      api.instances.list().catch(() => []),
      api.systemServices.list().catch(() => []),
    ])
  );

  return (
    <ApiKeyFormPage
      mode="create"
      instanceServices={instanceServices}
      systems={systems}
      instances={instances}
      systemServices={systemServices}
    />
  );
}
