/// <reference path="../../types.d.ts" />
import fs from "fs/promises";
import puppeteer, { Browser, type CookieData, ElementHandle, Page } from "puppeteer";
import { delay, quit } from "..";
import path from "path";
import { existsSync } from "fs";

const headless = false;

// download from https://download-chromium.appspot.com/
const chromePath = process.env.CHROME_PATH
	? path.join(import.meta.dirname, "../..", process.env.CHROME_PATH)
	: undefined; //"/usr/bin/google-chrome-stable";
const loginManually = true;

async function getByText(page: Page, text: string) {
	return (await page.mainFrame().$$("xpath///span[contains(., '" + text + "')]"))[0] as
		| ElementHandle<HTMLSpanElement>
		| undefined;
}

export class TwitterProvider implements Provider {
	browser: null | Browser = null;
	page: null | Page = null;

	async init() {
		console.time("startup and tweet");
		console.log("Launching browser", chromePath);
		this.browser = await puppeteer.launch(
			!headless
				? {
						// [416506:416506:1229/201309.538489:FATAL:content/browser/zygote_host/zygote_host_impl_linux.cc:128] No usable sandbox! If you are running on Ubuntu 23.10+ or another Linux distro that has disabled unprivileged user namespaces with AppArmor, see https://chromium.googlesource.com/chromium/src/+/main/docs/security/apparmor-userns-restrictions.md. Otherwise see https://chromium.googlesource.com/chromium/src/+/main/docs/linux/suid_sandbox_development.md for more information on developing with the (older) SUID sandbox. If you want to live dangerously and need an immediate workaround, you can try using --no-sandbox.
						args: ["--no-sandbox"],
						headless: false,
						executablePath: chromePath,
					}
				: {
						args: ["--no-sandbox"],
						headless: true,
						executablePath: chromePath,
					},
		);
		const { pid } = this.browser.process() || { pid: null };
		console.log(`Browser PID:`, pid);
		await fs.writeFile("pid", String(pid), "utf-8");
		this.page = await this.browser.newPage();
		await this.page.goto("https://x.com/i/flow/login?redirect_after_login=%2Fcompose%2Fpost");
		console.log(this.page.url());
		await delay(5000); // slow ass website
	}

	async login() {
		if (!this.browser || !this.page) throw new Error("Page must be defined, did you call init before login?");
		const cookie = path.join(import.meta.dirname, "../../cookies.txt");
		if (!existsSync(cookie)) throw new Error("cookies.txt is missing, check README.md on how to generate it");
		const cookies = (await fs.readFile(cookie, "utf8"))
			.split("\n")
			.filter((t) => t.trim().length > 0 && (t.startsWith(".x.com") || t.startsWith("x.com")))
			.map((t) => t.split("\t"))
			.map(
				([domain, _inclsub, path, secure, expires, name, value]): CookieData => ({
					name,
					value,
					secure: secure == "TRUE",
					domain,
					expires: Number(expires),
					path,
				}),
			);
		await this.browser.setCookie(...cookies);
		await this.page.goto("https://x.com/compose/tweet");
	}

	/** @deprecated might explode */
	async OLD_login() {
		if (!this.browser || !this.page) throw new Error("Page must be defined, did you call init before login?");
		if (!process.env.TWITTER_USERNAME || !process.env.TWITTER_PASSWORD)
			throw new Error("You must provide a Twitter username and password. Check your .env file");
		await this.page.waitForSelector('input[name="text"]', { visible: true });
		if (!loginManually) await this.page.type('input[name="text"]', process.env.TWITTER_USERNAME);
		console.log("Inputted username");
		await delay(500);
		const button = await getByText(this.page, "Next");
		if (!loginManually) {
			if (button) {
				await button.click();
				console.log("Clicked next button");
			} else {
				throw new Error("Next button not found");
			}
			// twitter is balls
		} else console.log("Please move your mouse around and press the next button to avoid bot detection.");

		await this.page.waitForSelector('input[name="password"]', { visible: true });
		if (!loginManually) await this.page.type('input[name="password"]', process.env.TWITTER_PASSWORD);
		console.log("Inputted password");
		await delay(500);
		if (!loginManually) await this.page.click(`div[data-testid="LoginForm_Login_Button"]`);
		console.log("Logged in");
		if (loginManually) await this.page.waitForNavigation();
	}

	async post(text: string, imagePath: string, i = 0): Promise<void> {
		if (!this.page || !this.browser)
			throw new Error("Browser and page must be defined, did you call init before tweet?");
		if (this.page.isClosed()) return quit("Chromium page closed, somethings gone horribly wrong...")
		try {
			await this.page.goto("https://twitter.com/compose/tweet");

			const tweetBox = await this.page.waitForSelector(`div > div[class=""]`, { visible: true });
			if (!tweetBox) {
				throw new Error("Tweet box not found");
			}
			await delay(1000);
			await tweetBox.click();
			// Type the tweet text into the tweet box
			const k = this.page.keyboard;
			await k.type(text, { delay: 30 }); // 30 delay because stupid
			console.log("Typed tweet text");

			await delay(1000);

			const waiting = this.page.waitForFileChooser().then(async (filechoice) => {
				// typescript moment
				if (!this.page || !this.browser)
					throw new Error("Browser and page must be defined, did you call init before tweet?");

				await filechoice.accept([imagePath]);
				console.log("Chosen file", imagePath);

				// give it time to upload the frame
				await delay(5000);

				await this.page.click(`button[type="button"][data-testid="tweetButton"]`);
				console.log("Clicked tweet button");

				try {
					(await (await this.page.waitForSelector('[data-testid="toast"] a'))?.getProperty("href"))
						?.jsonValue()
						.then((u) => console.log("Posted to Twitter:", u));
				} catch (e) {
					console.warn("Toast not found - not sure if tweet was sent");
				}
			});

			await this.page.click(`button[aria-label="Add photos or video"][type="button"]`);
			console.log("Clicked image button");
			await waiting;
		} catch (e) {
			// if (i < 3) return await this.post(text, imagePath, i++);
			reportError(e as Error);
			return;
		}
	}

	async cleanup() {
		await this.browser?.close();
	}
}
