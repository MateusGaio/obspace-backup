"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

function resolveDesktopReleasePaths(options = {}) {
  const projectDir = options.projectDir || path.resolve(__dirname, "..", "..");
  const homeDir = options.homeDir || os.homedir();
  const desktopDir = path.join(homeDir, "Desktop");
  const releaseExePath = path.join(projectDir, "release", "Obspace.exe");
  const desktopExePath = path.join(desktopDir, "Obspace.exe");
  const desktopShortcutPath = path.join(desktopDir, "Obspace.lnk");

  return {
    projectDir,
    desktopDir,
    releaseDir: path.dirname(releaseExePath),
    releaseExePath,
    desktopExePath,
    desktopShortcutPath,
    iconPath: path.join(projectDir, "assets", "icon.ico")
  };
}

function quotePowerShell(value) {
  return String(value || "").replace(/'/g, "''");
}

function writeShortcut(paths) {
  const script = `
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut('${quotePowerShell(paths.desktopShortcutPath)}')
$shortcut.TargetPath = '${quotePowerShell(paths.desktopExePath)}'
$shortcut.Arguments = ''
$shortcut.WorkingDirectory = '${quotePowerShell(paths.desktopDir)}'
$shortcut.IconLocation = '${quotePowerShell(paths.iconPath)},0'
$shortcut.Description = 'Obspace desktop'
$shortcut.Save()
`;

  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error(`Falha ao criar atalho da Area de Trabalho. Exit code: ${result.status}`);
  }
}

function stopRunningObspace() {
  const script = `
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq 'Obspace.exe' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
`;
  spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
    stdio: "ignore"
  });
}

function publishDesktopRelease(options = {}) {
  const paths = resolveDesktopReleasePaths(options);

  if (!fs.existsSync(paths.releaseExePath)) {
    throw new Error(`Executavel de release nao encontrado: ${paths.releaseExePath}`);
  }

  fs.mkdirSync(paths.desktopDir, { recursive: true });
  stopRunningObspace();

  if (fs.existsSync(paths.desktopExePath) && options.backup !== false) {
    const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
    fs.copyFileSync(paths.desktopExePath, `${paths.desktopExePath}.backup-${stamp}`);
  }

  fs.copyFileSync(paths.releaseExePath, paths.desktopExePath);
  writeShortcut(paths);

  return paths;
}

if (require.main === module) {
  try {
    const paths = publishDesktopRelease();
    console.log(`Desktop exe atualizado: ${paths.desktopExePath}`);
    console.log(`Atalho atualizado: ${paths.desktopShortcutPath}`);
  } catch (error) {
    console.error(String(error.message || error));
    process.exit(1);
  }
}

module.exports = {
  publishDesktopRelease,
  resolveDesktopReleasePaths
};
