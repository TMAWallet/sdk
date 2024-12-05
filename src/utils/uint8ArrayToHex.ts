export const uint8ArrayToHex = (arr: Uint8Array) => {
	return [...arr].map(b => b.toString(16).padStart(2, '0')).join('');
};
