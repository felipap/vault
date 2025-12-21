import { app, BrowserWindow, ipcMain } from 'electron';
import { createMainWindow } from './windows/settings';
import { initTray, destroyTray } from './tray';
import { startScreenCapture, stopScreenCapture, restartScreenCapture } from './screen-capture';
import { store, getRequestLogs, clearRequestLogs } from './store';

function registerIpcHandlers(): void {
	ipcMain.handle('get-request-logs', () => {
		return getRequestLogs();
	});

	ipcMain.handle('clear-request-logs', () => {
		clearRequestLogs();
	});

	ipcMain.handle('get-screen-capture-config', () => {
		return store.get('screenCapture');
	});

	ipcMain.handle('set-screen-capture-config', (_event, config: { enabled?: boolean; intervalMinutes?: number }) => {
		const current = store.get('screenCapture');
		store.set('screenCapture', { ...current, ...config });
		restartScreenCapture();
	});

	ipcMain.handle('get-server-url', () => {
		return store.get('serverUrl');
	});

	ipcMain.handle('set-server-url', (_event, url: string) => {
		store.set('serverUrl', url);
	});
}

app.on('ready', () => {
	registerIpcHandlers();
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
