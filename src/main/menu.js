import { Menu, app } from 'electron';

/**
 * Create custom application menu
 */
export function createMenu() {
  const template = [
    {
      label: 'My Profile',
      submenu: [
        {
          label: 'Preferences',
          accelerator: 'CmdOrCtrl+,',
          click: (menuItem, browserWindow) => {
            if (browserWindow) {
              browserWindow.webContents.send('open-preferences');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}