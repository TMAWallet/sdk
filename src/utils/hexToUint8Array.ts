export const hexToUint8Array = (hex: string) => {
	const bytes = hex.match(/../g);
	if (!bytes) {
		throw new Error('Invalid hex string');
	}
	return new Uint8Array(bytes.map(byte => parseInt(byte, 16)));
};
