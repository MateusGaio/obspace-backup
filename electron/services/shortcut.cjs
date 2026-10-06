"use strict";

const path = require("path");
const { shell } = require("electron");

async function createShortcut({ app, name, iconPath, devProjectPath }) {
  const desktopPath = app.getPath("desktop");
  const shortcutPath = path.join(desktopPath, `${name}.lnk`);
  const isPackaged = app.isPackaged;
  const portableExecutable = process.env.PORTABLE_EXECUTABLE_FILE;

  const target = isPackaged ? portableExecutable || process.execPath : process.execPath;
  const args = isPackaged ? "" : `"${devProjectPath}"`;

  const ok = shell.writeShortcutLink(shortcutPath, "create", {
    target,
    args,
    cwd: isPackaged ? path.dirname(target) : devProjectPath,
    description: "Obspace desktop",
    icon: iconPath,
    iconIndex: 0,
    appUserModelId: "com.obspace.desktop"
  });

  return {
    ok,
    shortcutPath,
    target,
    packaged: isPackaged
  };
}

module.exports = {
  createShortcut
};
