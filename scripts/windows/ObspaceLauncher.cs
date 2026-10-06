using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace ObspaceLauncher
{
    internal static class Program
    {
        [STAThread]
        private static void Main()
        {
            string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string portableTarget = Path.Combine(desktop, "Obspace.exe");
            string installedTarget = Path.Combine(localAppData, "Obspace", "app", "Obspace.exe");
            string target = File.Exists(portableTarget) ? portableTarget : installedTarget;

            if (!File.Exists(target))
            {
                MessageBox.Show(
                    "Obspace nao foi encontrado em nenhum dos caminhos esperados:\n\n" +
                    portableTarget +
                    "\n\n" +
                    installedTarget,
                    "Obspace",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            ProcessStartInfo info = new ProcessStartInfo
            {
                FileName = target,
                WorkingDirectory = Path.GetDirectoryName(target),
                UseShellExecute = true
            };

            Process.Start(info);
        }
    }
}
