import { Hono } from 'hono'
import { config } from '../../config/mode'

type Platform = 'sap-btp' | 'cloud-foundry' | 'standalone'
type DeploymentMode = 'selfhost' | 'saas'

interface PlatformInfo {
  platform: Platform
  mode: DeploymentMode
  features: {
    signup: boolean
    socialLogin: boolean
    billing: boolean
    multiOrg: boolean
  }
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

  // Base info with mode and features
  const baseInfo = {
    mode: config.mode,
    features: {
      signup: config.features.signup,
      socialLogin: config.features.socialLogin,
      billing: config.features.billing,
      multiOrg: config.features.multiOrg,
    },
  }

  if (!vcapAppRaw) {
    return { platform: 'standalone', ...baseInfo }
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
      ...baseInfo,
    }
  } catch {
    // VCAP_APPLICATION exists but couldn't parse - likely CF
    return { platform: 'cloud-foundry', ...baseInfo }
  }
}

const platformInfoRoute = new Hono()

platformInfoRoute.get('/', (c) => {
  const info = detectPlatform()
  return c.json(info)
})

export default platformInfoRoute
