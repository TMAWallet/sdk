/**
 * Simple async key-value storage.
 * All values are strings. If you try to get non-existent key, you'll get empty string ('').
 *
 * Up to 128 keys, up to 1024 bytes per key.
 */
export abstract class AbstractStorage {
	abstract getItem(key: string): Promise<string>;
	abstract getItems(keys: string[]): Promise<Record<string, string>>;

	abstract setItem(key: string, value: string): Promise<void>;
	abstract setItems(items: Record<string, string>): Promise<void>;

	abstract removeItem(key: string): Promise<void>;
	abstract removeItems(keys: string[]): Promise<void>;

	abstract getKeys(): Promise<string[]>;
}
