export interface ApiRequestLog {
	id: string;
	timestamp: number;
	method: string;
	path: string;
	status: 'success' | 'error';
	statusCode?: number;
	duration: number;
	error?: string;
}

export interface ScreenCaptureConfig {
	enabled: boolean;
	intervalMinutes: number;
}

interface ElectronAPI {
	platform: string;
	getRequestLogs: () => Promise<ApiRequestLog[]>;
	clearRequestLogs: () => Promise<void>;
	getScreenCaptureConfig: () => Promise<ScreenCaptureConfig>;
	setScreenCaptureConfig: (config: Partial<ScreenCaptureConfig>) => Promise<void>;
	getServerUrl: () => Promise<string>;
	setServerUrl: (url: string) => Promise<void>;
}

declare global {
	interface Window {
		electron: ElectronAPI;
	}
}
