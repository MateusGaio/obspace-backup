"use strict";

const path = require("path");
const os = require("os");
const fs = require("fs");
const { spawnSync } = require("child_process");

const projectDir = path.resolve(__dirname, "..", "..");
const shortcutPath = path.join(os.homedir(), "Desktop", "Obspace.lnk");
const desktopExePath = path.join(os.homedir(), "Desktop", "Obspace.exe");
const electronPath = path.join(projectDir, "node_modules", "electron", "dist", "electron.exe");
const releaseExePath = path.join(projectDir, "release", "Obspace.exe");
const icon = path.join(projectDir, "assets", "icon.ico");
const targetPath = fs.existsSync(desktopExePath) ? desktopExePath : fs.existsSync(releaseExePath) ? releaseExePath : electronPath;
const targetArgs = fs.existsSync(releaseExePath) ? "" : `"${projectDir}"`;
const workingDirectory = fs.existsSync(desktopExePath) ? path.dirname(desktopExePath) : fs.existsSync(releaseExePath) ? path.dirname(releaseExePath) : projectDir;

const script = `
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut('${shortcutPath.replace(/'/g, "''")}')
$shortcut.TargetPath = '${targetPath.replace(/'/g, "''")}'
$shortcut.Arguments = '${targetArgs.replace(/'/g, "''")}'
$shortcut.WorkingDirectory = '${workingDirectory.replace(/'/g, "''")}'
$shortcut.IconLocation = '${icon.replace(/'/g, "''")},0'
$shortcut.Description = 'Obspace desktop'
$shortcut.Save()
`;

const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
  stdio: "inherit"
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log(`Atalho criado: ${shortcutPath}`);
