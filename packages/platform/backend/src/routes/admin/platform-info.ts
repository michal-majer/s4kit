import { Hono } from 'hono'
import { config } from '../../config/mode'
import { isXsuaaAvailable } from '../../auth/xsuaa-provider'

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
    xsuaaEnabled: boolean
    xsuaaOnly: boolean  // When true, hide email/password and show only SAP login
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

  const xsuaaEnabled = isXsuaaAvailable()
  const isCloudFoundry = !!process.env.VCAP_APPLICATION

  // CF + XSUAA + selfhost = SAP login only (enterprise SSO mode)
  const xsuaaOnly = xsuaaEnabled && isCloudFoundry && config.mode === 'selfhost'

  // Base info with mode and features
  const baseInfo = {
    mode: config.mode,
    features: {
      // When xsuaaOnly, disable signup and social login (Google/GitHub)
      signup: xsuaaOnly ? false : config.features.signup,
      socialLogin: xsuaaOnly ? false : config.features.socialLogin,
      billing: config.features.billing,
      multiOrg: config.features.multiOrg,
      xsuaaEnabled,
      xsuaaOnly,
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
