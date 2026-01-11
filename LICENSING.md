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
- Source code is available
- Free for internal use, development, testing
- Free for your own SAP integrations
- **Requires commercial license** to:
  - Offer as hosted service to others
  - Build competing products
  - Resell or white-label

### After Change Date (2030-01-01)
Platform code becomes Apache 2.0 (fully open source).

## Per-Client Licensing

**Each end-client (legal entity) requires a separate license.**

| Scenario | Licenses Required |
|----------|-------------------|
| 1 company, 3 SAP systems (dev/qa/prod) | 1 |
| Consultant, 5 clients | 5 (one per client) |
| Agency hosting for 10 customers | 10 |

One license = one organization, unlimited SAP systems.
Sharing a license across multiple clients is prohibited.

## Commercial Licensing

Need a commercial license? Contact: hello@s4kit.dev

Commercial licenses include:
- Self-hosted deployment rights
- Priority support
- Custom SLA options

## FAQ

**Can I use S4Kit SDK in my company's project?**
Yes. MIT license allows any use.

**Can I self-host the platform for my company?**
Yes, for internal use. No license needed.

**Can I offer S4Kit as a service to my clients?**
No. This requires a commercial license.

**Can consulting firms use S4Kit for client projects?**
SDK: Yes (MIT). Platform hosting for clients: Requires commercial license.
