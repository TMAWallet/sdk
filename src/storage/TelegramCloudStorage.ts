import WebApp from '@twa-dev/sdk';
import { AbstractStorage } from './AbstractStorage';

type Callback<T> = (err: any, result: T) => void;

function promisify<TArgs extends any[], TResult>(
	fn: (...args: [...TArgs, Callback<TResult>]) => void,
): (...args: TArgs) => Promise<TResult> {
	return (...args: TArgs) =>
		new Promise<TResult>((resolve, reject) => {
			fn(...args, (err: any, result: TResult) => {
				if (err) {
					reject(err);
				} else {
					resolve(result);
				}
			});
		});
}

export class TelegramCloudStorage extends AbstractStorage {
	private _getItem = promisify(WebApp.CloudStorage.getItem).bind(WebApp.CloudStorage);
	private _getItems = promisify(WebApp.CloudStorage.getItems).bind(WebApp.CloudStorage);
	private _setItem = promisify(WebApp.CloudStorage.setItem).bind(WebApp.CloudStorage);
	private _removeItem = promisify(WebApp.CloudStorage.removeItem).bind(WebApp.CloudStorage);
	private _removeItems = promisify(WebApp.CloudStorage.removeItems).bind(WebApp.CloudStorage);
	private _getKeys = promisify(WebApp.CloudStorage.getKeys).bind(WebApp.CloudStorage);

	async getItem(key: string) {
		const result = await this._getItem(key);
		return result ?? '';
	}

	async getItems(keys: string[]) {
		const result = await this._getItems(keys);
		return keys.reduce((acc, key) => {
			acc[key] = result?.[key] ?? '';
			return acc;
		}, {} as Record<string, string>);
	}

	async setItem(key: string, value: string) {
		await this._setItem(key, value);
	}

	async setItems(items: Record<string, string>) {
		for (const [key, value] of Object.entries(items)) {
			await this._setItem(key, value);
		}
	}

	async removeItem(key: string) {
		await this._removeItem(key);
	}

	async removeItems(keys: string[]) {
		await this._removeItems(keys);
	}

	async getKeys() {
		const result = await this._getKeys();
		return result ?? [];
	}
}
