// After-sign hook: re-sign the app with --deep to fix "sealed resource" errors
// This is needed because electron-builder's ad-hoc signing doesn't always cover all frameworks
const { execSync } = require("child_process");
const path = require("path");

exports.default = async function afterSign(context) {
  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);

  console.log(`[after-sign] Re-signing ${appPath} with --deep --force`);
  try {
    execSync(`codesign --force --deep --sign - "${appPath}"`, {
      stdio: "inherit",
    });
    console.log("[after-sign] Signing complete");
  } catch (err) {
    console.warn("[after-sign] Signing failed (non-fatal):", err.message);
  }
};
