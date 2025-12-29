import { existsSync } from "fs";
import fs from "fs/promises";

export async function increment() {
	await fs.writeFile("counter", String(1 + (await get())), "utf-8");
}

export async function get() {
	return Number(await fs.readFile("counter", "utf-8"));
}

export async function initDB() {
	if (!existsSync("counter")) {
		await fs.writeFile("counter", "1");
	}
}
