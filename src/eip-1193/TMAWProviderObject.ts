import EventEmitter from 'eventemitter3';
import {
	Address,
	EIP1193Provider,
	ProviderConnectInfo,
	ProviderMessage,
	ProviderRpcError,
	RequestArguments,
} from 'eip1193-types';

import { EIP1193Controller, EIP1193Events } from './EIP1193Controller';

export class TMAWProviderObject extends EventEmitter implements EIP1193Provider {
	constructor(private readonly controller: EIP1193Controller) {
		super();
		// Bind request method for EIP-1193 compliance
		this.request = this.request.bind(this);
	}

	on(event: 'connect', listener: (info: ProviderConnectInfo) => void): this;
	on(event: 'disconnect', listener: (error: ProviderRpcError) => void): this;
	on(event: 'close', listener: (error: Error) => void): this;
	on(event: 'chainChanged', listener: (chainId: string) => void): this;
	on(event: 'networkChanged', listener: (networkId: string) => void): this;
	on(event: 'accountsChanged', listener: (accounts: Address[]) => void): this;
	on(event: 'message', listener: (message: ProviderMessage) => void): this;
	on(event: 'notification', listener: (payload: ProviderMessage) => void): this;
	on(event: string, listener: (...args: any[]) => void): this {
		this.controller.on(event as keyof EIP1193Events, listener);
		if (event === 'connect') {
			setTimeout(async () => {
				this.emit('connect', { chainId: await this.controller.getChainId() });
			}, 0);
		}
		return this;
	}

	send(..._args: any[]): any {
		throw new Error('Method is deprecated.');
	}

	sendAsync(_request: Object, _callback: Function): void {
		throw new Error('Method is deprecated.');
	}

	// EIP-1193 request method
	async request({ method, params }: RequestArguments): Promise<any> {
		if (!method) {
			throw new Error('Method is required');
		}
		const paramArray = params || [];
		try {
			const result = await this.controller.handleRequest(method, paramArray);
			return result;
		} catch (error) {
			throw error;
		}
	}

	// Add convenience methods
	async enable(): Promise<string[]> {
		return this.request({ method: 'eth_requestAccounts' });
	}
}
