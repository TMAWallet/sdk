export function simpleHash(data: Uint8Array) {
	const sum = data.reduce((acc, byte) => acc + byte, 0);
	return sum % 1000000;
}
