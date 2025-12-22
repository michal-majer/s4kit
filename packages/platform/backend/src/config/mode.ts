export type DeploymentMode = 'selfhost' | 'saas';

const mode = (process.env.MODE || 'selfhost') as DeploymentMode;

export const config = {
  mode,

  get isSelfHosted() {
    return mode === 'selfhost';
  },

  get isSaaS() {
    return mode === 'saas';
  },

  features: {
    get signup() {
      return mode === 'saas';
    },
    get socialLogin() {
      return mode === 'saas';
    },
    get billing() {
      return mode === 'saas';
    },
    get multiOrg() {
      return mode === 'saas';
    },
    get emailVerification() {
      return mode === 'saas';
    },
  },
};
