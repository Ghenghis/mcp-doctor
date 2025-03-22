// scripts/notarize.js
const { notarize } = require('@electron/notarize');
const path = require('path');
const fs = require('fs');
const packageJson = require('../package.json');

exports.default = async function notarizing(context) {
  // Only notarize the app on macOS
  if (process.platform !== 'darwin') {
    console.log('Skipping notarization: not macOS');
    return;
  }

  // Check if we should skip notarization (e.g., for development builds)
  if (process.env.SKIP_NOTARIZE === 'true') {
    console.log('Skipping notarization: SKIP_NOTARIZE is true');
    return;
  }

  console.log('Notarizing macOS application...');

  const appBundleId = context.packager.appInfo.info._configuration.appId;
  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  if (!fs.existsSync(appPath)) {
    console.error(`Cannot find application at: ${appPath}`);
    return;
  }

  // Get Apple ID credentials from environment variables
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_ID_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.warn('Skipping notarization: Missing Apple ID credentials in environment variables');
    return;
  }

  try {
    await notarize({
      appBundleId,
      appPath,
      appleId,
      appleIdPassword,
      teamId,
    });
    console.log(`Successfully notarized ${appName}`);
  } catch (error) {
    console.error('Notarization failed:', error);
    throw error;
  }
};
