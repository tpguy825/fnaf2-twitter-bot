/// <reference path="../../types.d.ts" />
import { createRestAPIClient } from "masto";
import type { Client } from "masto/mastodon/rest/client.js";
import { reportError } from "../hidden";
import { appendFileSync } from "fs";

export class MastodonProvider implements Provider {
	masto: Client | null = null;

	async init() {
		if (!process.env.MASTODON_URL || !process.env.MASTODON_TOKEN)
			throw new Error("You must provide a Mastodon URL and Token. Check your .env file");
		this.masto = createRestAPIClient({
			url: process.env.MASTODON_URL,
			accessToken: process.env.MASTODON_TOKEN,
		});
	}
	/** @deprecated NOT USED DO NOT RUN */
	login(): Promise<void> {
		throw new Error("Method not implemented.");
	}
	async post(text: string, imagePath: string, framenum: number): Promise<string> {
		if (!this.masto) throw new Error("Mastodon not initialized, did you call init before posting?");
		try {
			console.log("Attempting to post on Mastadon");
			// Create media from a local file
			const attachment1 = await this.masto.v2.media.create({
				file: await fetch("file://" + imagePath).then((r) => r.blob()),
				// TODO on screen captions?
				// description: "Some image",
			});

			// Publish!
			const status = await this.masto.v1.statuses.create({
				status: text,
				visibility: "public",
				mediaIds: [attachment1.id],
			});
			if (!status.url) throw new Error("No URL returned");
			console.log("Posted to mastodon:", status.url);
			appendFileSync("posts.txt", "mastodon;" + framenum + ";" + status.url + "\n");

			return status.url;
		} catch (e) {
			// if (i < 3) return await this.post(text, imagePath, i+1);
			reportError(e as Error);
			return "[error]";
		}
	}
	cleanup?(): Promise<void> {
		throw new Error("Method not implemented.");
	}
}
