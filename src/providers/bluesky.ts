/// <reference path="../../types.d.ts" />
import { reportError } from "../hidden";
import {
	type $Typed,
	Agent,
	AppBskyEmbedImages,
	AppBskyFeedPost,
	BlobRef,
	CredentialSession,
	RichText,
} from "@atproto/api";

export class BlueskyProvider implements Provider {
	session: CredentialSession | null = null;
	agent: Agent | null = null;

	async init() {
		if (!process.env.BSKY_URL) throw new Error("You must provide a Bluesky URL. Check your .env file");
		this.session = new CredentialSession(new URL(process.env.BSKY_URL));
		this.agent = new Agent(this.session);
	}
	async login(): Promise<void> {
		if (!process.env.BSKY_IDENTIFIER || !process.env.BSKY_PASSWORD)
			throw new Error("Bluesky identifier and password not provided.");
		await this.session?.login({
			identifier: process.env.BSKY_IDENTIFIER,
			password: process.env.BSKY_PASSWORD,
		});
	}
	async post(text: string, imagePath: string, i = 0): Promise<void> {
		if (!this.agent || !this.session)
			throw new Error("Bluesky not initialized, did you call init before posting?");
		try {
			console.log("Attempting to post on Bluesky");

			const blob = await this.agent.uploadBlob(await fetch("file://" + imagePath).then((r) => r.blob()), {
				// headers: { "Content-Type": "image/jpeg" },
				// encoding: "image/jpeg",
			});

			const postData = await buildPost(this.agent, text, buildImageEmbed(blob.data.blob, 1920, 956));
			const resp = await this.agent.post(postData);
			if (resp.cid)
				return console.log(
					"Posted to Bluesky: https://bsky.app/profile/fnaf2-frames.bsky.social/post/" +
						resp.uri.split("/").pop(),
				);
			else throw resp;
		} catch (e) {
			// if (i < 3) return await this.post(text, imagePath, i + 1);
			reportError(e as Error);
		}
	}
	cleanup?(): Promise<void> {
		throw new Error("Method not implemented.");
	}
}

// https://github.com/mplewis/photolog/blob/60e6bf5b2de74da514b29f3efbe9469d97c5fe42/src/netlify/functions/index.mts#L68-L101
/** Build the embed data for an image. */
function buildImageEmbed(imgBlob: BlobRef, width: number, height: number): $Typed<AppBskyEmbedImages.Main> {
	const image = {
		image: imgBlob,
		aspectRatio: { width, height },
		alt: "",
	};
	return {
		$type: "app.bsky.embed.images",
		images: [image],
	};
}

/** Build the post data for an image. */
async function buildPost(
	agent: Agent,
	rawText: string,
	imageEmbed: $Typed<AppBskyEmbedImages.Main>,
): Promise<AppBskyFeedPost.Record> {
	const rt = new RichText({ text: rawText });
	await rt.detectFacets(agent);
	const { text, facets } = rt;
	return {
		text,
		facets,
		$type: "app.bsky.feed.post",
		createdAt: new Date().toISOString(),
		embed: imageEmbed,
	};
}
