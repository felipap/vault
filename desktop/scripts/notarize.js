/* eslint-disable @typescript-eslint/no-var-requires */
// https://kilianvalkhof.com/2019/electron/notarizing-your-electron-application/

const { notarize } = require('@electron/notarize')

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context
  if (electronPlatformName !== 'darwin') {
    return
  }

  // Skip notarization if SKIP_NOTARIZE is set
  if (process.env.SKIP_NOTARIZE === 'true') {
    console.log('Skipping notarization (SKIP_NOTARIZE=true)')
    return
  }

  // Skip notarization if credentials are not provided
  if (
    !process.env.APPLE_TEAM_ID ||
    !process.env.APPLE_ID ||
    !process.env.APPLE_APP_SPECIFIC_PASSWORD
  ) {
    console.log('Skipping notarization (credentials not provided)')
    return
  }

  const appName = context.packager.appInfo.productFilename

  return await notarize({
    tool: 'notarytool',
    teamId: process.env.APPLE_TEAM_ID,
    appBundleId: 'com.github.faragaop.vaulty',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
  })
}
