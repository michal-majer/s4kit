import { Hono } from 'hono'

type Platform = 'sap-btp' | 'cloud-foundry' | 'standalone'

interface PlatformInfo {
  platform: Platform
  space?: string
  organization?: string
  appName?: string
}

interface VcapApplication {
  application_name?: string
  space_name?: string
  organization_name?: string
  cf_api?: string
  // SAP BTP specific
  xsappname?: string
}

function detectPlatform(): PlatformInfo {
  const vcapAppRaw = process.env.VCAP_APPLICATION

  if (!vcapAppRaw) {
    return { platform: 'standalone' }
  }

  try {
    const vcapApp: VcapApplication = JSON.parse(vcapAppRaw)

    // Check if it's SAP BTP (has xsappname or SAP-specific CF API)
    const isSapBtp =
      vcapApp.xsappname ||
      vcapApp.cf_api?.includes('sap') ||
      process.env.VCAP_SERVICES?.includes('xsuaa')

    return {
      platform: isSapBtp ? 'sap-btp' : 'cloud-foundry',
      space: vcapApp.space_name,
      organization: vcapApp.organization_name,
      appName: vcapApp.application_name,
    }
  } catch {
    // VCAP_APPLICATION exists but couldn't parse - likely CF
    return { platform: 'cloud-foundry' }
  }
}

const platformInfoRoute = new Hono()

platformInfoRoute.get('/', (c) => {
  const info = detectPlatform()
  return c.json(info)
})

export default platformInfoRoute
