/// <reference path="../../types.d.ts" />
import { createRestAPIClient } from "masto";
import type { Client } from "masto/mastodon/rest/client.js";
import { reportError } from "../hidden";

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
	async post(text: string, imagePath: string, i = 0): Promise<void> {
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
			console.log("Posted to mastodon:", status.url);

			return;
		} catch (e) {
			// if (i < 3) return await this.post(text, imagePath, i+1);
			reportError(e as Error);
		}
	}
	cleanup?(): Promise<void> {
		throw new Error("Method not implemented.");
	}
}
