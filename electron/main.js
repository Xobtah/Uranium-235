require('./../uranium-235');
const electron = require('electron');
const app = electron.app;
const Menu = electron.Menu;
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');

let mainWindow;

function createWindow() {
	let screenDimensions = electron.screen.getPrimaryDisplay().size;

	mainWindow = new BrowserWindow({
		width: screenDimensions.width * 0.75,
		height: screenDimensions.height * 0.75,
		webPreferences: {
            webSecurity: false,
            webgl: true
        }
	});
	mainWindow.webContents.openDevTools();
	mainWindow.setMenu(null);
	mainWindow.loadURL(url.format({
		pathname: path.join(__dirname, '..', 'public', 'index.html'),
		protocol: 'file:',
		slashes: true
	}));
	mainWindow.on('closed', function () {
		mainWindow = null;
	});
	//require('./menu');
	Menu.setApplicationMenu(Menu.buildFromTemplate({
		label: 'Reload',
		accelerator: 'CmdOrCtrl+R',
		click (item, focusedWindow) { if (focusedWindow) focusedWindow.reload(); }
	}, {
		label: 'Toggle Developer Tools',
		accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
		click (item, focusedWindow) { if (focusedWindow) focusedWindow.webContents.toggleDevTools(); }
	}));
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
	if (process.platform !== 'darwin')
		app.quit();
});

app.on('activate', function () {
	if (!mainWindow)
		createWindow();
});
