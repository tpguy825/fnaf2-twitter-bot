/// <reference path="../node_modules/typescript/lib/lib.dom.d.ts" />
import * as fs from "fs";
import { join } from "path";
import { reportError } from "./hidden.js";
import { get, increment, initDB } from "./utils.js";
import { TwitterProvider } from "./providers/twitter.js";
import { MastodonProvider } from "./providers/mastodon.js";
import { BlueskyProvider } from "./providers/bluesky.js";

export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

function round(num: number, dp: number) {
	const factor = 10 ** dp;
	return Math.round(num * factor) / factor;
}

const twitter = new TwitterProvider();
const mastodon = new MastodonProvider();
const bsky = new BlueskyProvider();

export let quit: (reason: string) => void = () => process.exit();

if (import.meta.dirname)
	(async () => {
		try {
			await initDB();
			await twitter.init();
			await mastodon.init();
			await bsky.init();
		} catch (e) {
			quit("Failed to init");
		}

		quit = cleanup;

		const totalFrames = 31193;

		await delay(2500);
		console.log("Starting to log in");
		try {
			await twitter.login();
			await bsky.login();
		} catch (e) {
			quit("Failed to log in");
		}

		await delay(2500);

		const run = async (i: number) => {
			if (i > totalFrames) throw new Error("Requesting too large frame");
			const path = await getPath(i),
				text = `Frame ${i} of ${totalFrames} (${round((i / totalFrames) * 100, 2)}%) #FNAF2Movie #FNAF2 #FNAF `;
			await twitter.post(text, path);
			await bsky.post(text, path);
			await mastodon.post(text, path);
		};

		const base_frames_path = `${process.cwd()}/frames/`;

		async function getPath(i: number) {
			const filepath = join(base_frames_path, String(i).padStart(4, "0") + ".jpg");
			if (fs.existsSync(filepath)) {
				return filepath;
			}
			reportError(new Error("File doesn't exist: " + filepath));
			return cleanup("file doesn't exist: " + filepath);
		}

		const current = await get();

		console.log("Starting at", current);

		// initial run
		await run(current);
		await increment();

		console.timeEnd("startup and tweet");
		const interval = setInterval(
			async () => {
				try {
					console.time("run");
					const current = await get();

					await run(current);
					await increment();
					console.log(new Date());
					console.timeEnd("run");
					if (current >= totalFrames) {
						cleanup("finished");
					}
				} catch (e) {
					reportError(e as Error);
				}
			},
			5 * 60 * 1000,
		);

		function cleanup(why: string) {
			console.log("Cleaning up, reason:", why);
			if (interval) clearInterval(interval);
			reportError(new Error("Cleaning up: " + why));
			twitter.cleanup().catch(reportError);
			return process.exit(0);
		}
	})().catch((e) => {
		reportError(e as Error);
		// if (twitter.browser) {
		// 	twitter.browser.close().catch(reportError);
		// }
	});

// bun bugged as hell
process.stdin.on("data", (t) => {
	if (t.equals(new Uint8Array([0x03]))) quit("Ctrl+C pressed");
});
process.stdin.setRawMode(true);
process.on("uncaughtException", (e) => {
	reportError(e);
});
process.on("unhandledRejection", (e) => {
	reportError(new Error(String(e)));
});
