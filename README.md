# Upful website monitoring tool

Monitors your websites, alerts via Telegram with a screenshot.

You'll need a Telegram bot for this. It's stupidly easy. Read: https://core.telegram.org/bots#3-how-do-i-create-a-bot  
For alerts, you'll also need a chat ID. To get this, just send "hello" to the bot and it'll respond with the id.  
There is also a simple API `GET /sites` that responds with the website data in JSON.

Warning: This is still a very early pre-alpha level of crap, only use if you believe in yourself and your abilities to cope with crashes.

### Example configuration file.
_config.yml_

```yaml
interval: 60

api:
  port: 3000

notifications:
  telegram:
    token: 123123:ASDFGHJ
    chats:
      - 1234

sites:

  cloudflare:
    url: https://cloudflare.com
    expect:
      status: 200
      headers:
        server: /(cl|pr)oudflare/ # Supports regex with /ium flags
        cf-cache-status: HIT

  example:
    url: https://example.com
    expect:
      status: 403
      headers:
        server: ExampleFailer

  google:
    url: https://google.com
  
  # There is also support for a shorter config
  xkcd.com:
  theonion.com:
```

### Commands

`/screenshot website` - Returns the latest screenshot for "website".  
`/status` - Returns the status of each tested site.  
`/all` - Returns all the test data.  
`hello` - Responds with the chat ID.  

### Install

1. `git clone` this repository (or download the zip)
2. Make sure Node.js is installed
3. Run `npm install`
4. Make sure Puppeteer dependencies are installed. For Ubuntu, this will work: `apt install gconf-service libasound2 libatk1.0-0 libatk-bridge2.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget`
5. Create a `config.yml`
6. `node index.js`

### TODO

1. Actual logging and sane output
2. Error handling
3. Better formatting
4. More commands
