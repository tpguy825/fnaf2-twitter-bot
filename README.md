# fnaf2-twitter-bot

A Twitter bot that tweets a Five Nights at Freddy's 2 movie frame every 5 minutes.

This is a heavily modified version of the code used to run the [original fnaf_frames bot](https://twitter.com/fnaf_frames)

Tested on both Linux (Ubuntu 22.04 + 25.10) and Windows (Win11 23H2)

## Installing

Requires bun. If not installed:

- Linux/Mac

```bash
# on debian/ubuntu: sudo apt install unzip
curl -fsSL https://bun.sh/install | bash
```

- Windows (using [scoop](https://scoop.sh))

```bash
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

scoop install bun
```

### Setting up the bot

```bash
git clone https://github.com/tpguy825/fnaf2-twitter-bot.git
cd fnaf2-twitter-bot
bun i

# download chromium here - see below

cp .env.example .env && nano .env

# login to twitter here - see below

# obtain frames here - see below

bun src/index.ts
```

## Downloading chromium

Quick setup for linux:

```bash
wget -O chrome-linux.zip https://download-chromium.appspot.com/dl/Linux_x64?type=snapshots
unzip chrome-linux.zip
# edit .env to set CHROME_PATH to "chrome-linux/chrome"
```

Other platforms (e.g. windows):

1. Download chromium: <https://download-chromium.appspot.com>
2. Extract it into this directory (so you get something like fnaf2-twitter-bot/chrome-win/chrome.exe)
3. Set CHROME_PATH in .env to the path to the chrome executable (e.g. "chrome-win/chrome.exe")

NOTE: CHROME_PATH in .env is relative to the fnaf2-twitter-bot directory

## Logging into Twitter

1. Login to twitter on your normal browser
2. Use a cookie exporting extension to export to a Netscape cookies file - [extension I used](https://github.com/rotemdan/ExportCookies)
3. Place in cookies.txt

## How to get the frames?

1. Get a copy of the FNAF2 movie (up to you how)
2. Extract subtitles:

```bash
# fnaf2.mkv is your copy of the movie
ffprobe fnaf2.mkv
```

Look for the subtitles stream that you want, will look something like this:

```text
...
  Stream #0:2(eng): Subtitle: subrip (srt)
      Metadata:
        title           : English (CC)
...
```

In this case, stream 0:2 has them (use other streams if you want a different languague)

Extract them into a srt file

```bash
# srt -> srt so copy is fastest
# if your ffprobe says anything different to "subrip (srt)" then remove the "-c copy"
ffmpeg -i fnaf2.mkv -map 0:2 -c copy fnaf2.srt
```

And then convert to frames:

<!--
	todo this has shit visual quality???? for decent quality do ffmpeg -> png -> magick convert -> jpeg
	the reason for using jpeg is because bsky has 1mb file limit and some pngs are like 1.4mb
 -->

```bash
# for more subtitle options: https://trac.ffmpeg.org/wiki/HowToBurnSubtitlesIntoVideo
mkdir frames
ffmpeg -i fnaf2.mkv -vf "fps=5,subtitles=fnaf2.srt" frames/%04d.jpg
```

You can optionally add `-ss <time>` to remove any blank time at the start (e.g. for 7s use `-ss 00:07`)

### Other config when using custom frames

1. Change src/index.ts:30 to have the correct total frames
2. Customise tweet message at src/index.ts:42
3. If not using ./frames, set frame location in src/index.ts:48
