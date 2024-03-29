const fs = require("fs");
const YAML = require("yaml");
const puppeteer = require("puppeteer");
const express = require("express");
const Telegraf = require("telegraf");
const configFile = "./config.yml";
const data = {};
const configFileData = fs.readFileSync(configFile, 'utf8');
const config = YAML.parse(configFileData);
const port = config.api.port

const app = express();
app.use(express.static('cache'));
app.get('/sites', (req, res) => res.json(data));
app.listen(port, () => console.log(`Listening on port ${port}!`));

for(const site of Object.keys(config.sites)) {
	if(config.sites[site] === null) {
		config.sites[site] = {
			url: "http://"+site
		}
	}
}

let telegram = undefined;

if(typeof config.notifications.telegram === "object") {
	console.log("Starting Telegram bot");
	telegram = new Telegraf(config.notifications.telegram.token);
	telegram.start(ctx => ctx.reply("Welcome!"));
	telegram.hears("hello", ctx => ctx.reply("Ohai! Yer chat id is: " + ctx.chat.id));
	telegram.help(ctx => ctx.reply("Help? Use /status to get.. you know.. the status. /screenshot siteId to get a screenshot"));
	telegram.command("all", ctx => {
		ctx.reply(YAML.stringify(data));
	});
	telegram.command("screenshot", ctx => {
		const command = ctx.message.text.split(" ");
		if(typeof command[1] === "string" && typeof data[command[1]] === "object") {
			ctx.reply(`Screenshot for "${command[1]} coming up..."`);
			ctx.replyWithPhoto({source: `cache/${command[1]}.png`});
		} else {
			ctx.reply("Invalid site");
		}
	});
	telegram.command("status", ctx => {
		let response = {}
		for(const [site, siteData] of Object.entries(data)) {
			response[site] = {
				url: config.sites[site].url,
				status: (typeof siteData.headers !== "undefined")?parseInt(siteData.status):0,
				server: siteData.headers.server
			}
			if(Array.isArray(siteData.errors)) {
				response[site].errors = siteData.errors;
			}
		}
		ctx.reply(YAML.stringify(response));
	});
	telegram.launch();
}

const monitor = async () => {
	console.log("Monitoring...",new Date());
	for(const [site, options] of Object.entries(config.sites)) {
		console.log("Testing:",site,options.url);
		if(typeof data[site] !== "undefined" && data[site].errors !== "undefined") {
			delete data[site].errors;
		}
		const browser = await puppeteer.launch({args:["--no-sandbox"]});
		try {
			const page = await browser.newPage();
			await page.setViewport({ width: 1280, height: 800 });
			const response = await page.goto(options.url, {waitUntil: 'networkidle2'});
			await page.screenshot({ path: `cache/${site}.png`, fullPage: false });
			const headers = await response.headers();
			const status = await response.status();
			let errors = undefined;
			try {
				await test(status, headers, options);
				console.log("All good...");
			} catch(testErrors) {
				errors = testErrors;
				alert(site);
				console.log(YAML.stringify(errors));
			}
			data[site] = {
				errors,
				status,
				headers
			}
		} catch(e) {
			console.error("Catching from Puppeteer",e);
			if(typeof data[site] === "undefined") {
				data[site] = {};
			}
			if(!Array.isArray(data[site].errors)) {
				data[site].errors = [];
			}
			data[site].errors.push(e.message);
			alert(site);
		}
		await browser.close();
	}
	setTimeout(monitor, parseInt(config.interval)*60000);
}

const test = (status, headers, siteOptions) => {
	return new Promise((resolve, reject) => {
		let expectStatus = 200;
		let errors = [];
		if(typeof siteOptions.expect === "object") {
			if(typeof siteOptions.expect.status !== "undefined") {
				expectStatus = parseInt(siteOptions.expect.status);
			}
			if(typeof siteOptions.expect.headers === "object") {
				for(const [header, expectValue] of Object.entries(siteOptions.expect.headers)) {
					if(typeof headers[header] === "undefined") {
						errors.push(`Header \`${header}\` is missing from the response.`);
					} else {
						if((/^s?\/(.+)\/([ium]*)$/i).test(expectValue)) {
							const regexMatches = expectValue.match(/^s?\/(.+)\/([ium]*$)/i);
							const regex = new RegExp(regexMatches[1],regexMatches[2]);
							if(!regex.test(headers[header])) {
								errors.push(`Header \`${header}\` does not match RegExp \`${expectValue}\`. Response value was \`${headers[header]}\``);
							}
						} else {
							if(headers[header] !== expectValue.toString()) {
								errors.push(`header \`${header}\` does not match string \`${expectValue}\`. Response value was \`${headers[header]}\``);
							}
						}
					}
				}
			}
		}
		if(expectStatus !== parseInt(status)) {
			errors.push(`Expected status ${expectStatus}, got ${status}`);
		}
		if(errors.length > 0) {
			return reject(errors);
		} else {
			return resolve();
		}
	});
}

const alert = async site => {
	if(typeof telegram !== "undefined") {
		for(const chat of config.notifications.telegram.chats) {
			try {
				await telegram.telegram.sendPhoto(chat, {source: `cache/${site}.png`});
			} catch(e) {
				console.error("Failed to send photo");
			}
			await telegram.telegram.sendMessage(chat, `Website "${site}" is having some issues...`);
			await telegram.telegram.sendMessage(chat, YAML.stringify(data[site]));
		}
	}
}

monitor();
