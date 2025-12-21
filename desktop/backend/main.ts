import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './windows/settings';
import { initTray, destroyTray } from './tray';
import { startScreenCapture, stopScreenCapture } from './screen-capture';

app.on('ready', () => {
	createMainWindow();
	initTray();
	startScreenCapture();
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createMainWindow();
	}
});

app.on('before-quit', () => {
	stopScreenCapture();
	destroyTray();
});
