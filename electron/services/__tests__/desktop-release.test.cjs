"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const { resolveDesktopReleasePaths } = require("../../../scripts/windows/publish-desktop-release.cjs");

test("resolveDesktopReleasePaths aponta release e desktop exe esperados", () => {
  const paths = resolveDesktopReleasePaths({
    projectDir: "C:\\repo\\obspace-desktop",
    homeDir: "C:\\Users\\Example"
  });

  assert.equal(paths.releaseExePath, "C:\\repo\\obspace-desktop\\release\\Obspace.exe");
  assert.equal(paths.desktopExePath, "C:\\Users\\Example\\Desktop\\Obspace.exe");
  assert.equal(paths.desktopShortcutPath, "C:\\Users\\Example\\Desktop\\Obspace.lnk");
  assert.equal(paths.releaseDir, path.dirname(paths.releaseExePath));
});
