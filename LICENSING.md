# S4Kit Licensing

S4Kit uses a dual-license model: **Open Core**.

## License Structure

| Package | License | Use |
|---------|---------|-----|
| `packages/sdk` | MIT | Client library, CLI, type generation |
| `packages/shared` | MIT | Shared utilities for SDK |
| `packages/platform/*` | BSL 1.1 | Backend, Proxy, Frontend |

## What This Means

### SDK (MIT)
- Use freely in any project
- Modify, distribute, sell
- No attribution required (but appreciated)
- Commercial use allowed

### Platform (BSL 1.1)

**Free to self-host** for your own organization:
- 1 SAP system landscape
- Up to 5 environments (sandbox/dev/qa/prod/training)
- Internal business use (commercial or non-profit)
- No license required

**Requires commercial license** to:
- Connect more than 1 SAP system
- Offer as hosted service to others
- Build competing products
- Resell or white-label
- Deploy for clients/customers

### After Change Date (2030-01-01)
Platform code becomes Apache 2.0 (fully open source).

## Free vs Commercial

| Scenario | License Required? |
|----------|-------------------|
| Your company, 1 SAP system (5 envs) | **FREE** |
| Your company, 3 SAP systems | Commercial |
| Startup, 1 SAP system | **FREE** |
| Enterprise, 1 SAP system | **FREE** |
| Consultant, own internal use | **FREE** |
| Consultant deploys for 5 clients | 5x Commercial |
| MSP hosting for customers | Commercial per customer |

## Commercial Licensing

Need a commercial license? Contact: contact@s4kit.com

Commercial licenses include:
- Multiple SAP system support
- Multi-client deployment rights
- Priority support
- Custom SLA options

## FAQ

**Can I use S4Kit SDK in my company's project?**
Yes. MIT license allows any use.

**Can I self-host the platform for my company?**
Yes, for free! One SAP system with up to 5 environments, no license needed.

**We're a large enterprise - is it still free?**
Yes. Company size doesn't matter. 1 SAP system = free.

**We have 3 SAP systems (different business units). Is it free?**
No. More than 1 SAP system requires a commercial license.

**Can I offer S4Kit as a service to my clients?**
No. This requires a commercial license per client.

**Can consulting firms use S4Kit for client projects?**
SDK: Yes (MIT). Platform hosting for clients: Requires commercial license per client.

**What counts as "1 SAP system"?**
One SAP system landscape - typically one S/4HANA instance with its environments
(sandbox, development, quality, production, training). If you have separate
SAP systems for different business units or subsidiaries, each counts separately.
