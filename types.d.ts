interface ObjectConstructor {
	entries<K extends string | number | symbol, V>(o: Record<K, V>): [K, V][];
	keys<K extends string | number | symbol>(o: Record<K, unknown>): K[];
	values<V>(o: Record<string | number | symbol, V>): V[];
}
interface Array<T> {
	includes(value: unknown): value is T;
}
interface ReadonlyArray<T> {
	includes(value: unknown): value is T;
}

interface Provider {
	init(): Promise<unknown>;
	login(): Promise<void>;
	post(text: string, imagePath: string, i?: number): Promise<void>;
	cleanup?(): Promise<void>;
}
