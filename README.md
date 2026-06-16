# FreshStart Co.™ Discord Bot

A Discord operations bot for FreshStart Co.™ service requests, add-ons, agreement signing, scheduling, calendar views, job boards, completed jobs, client notes, checklists, safety rules, training, and money tracking.

## Start the bot

1. Install Node.js 20 or newer.
2. Extract this ZIP and open the `freshstart-bot` folder.
3. Run:

```bash
npm install
```

4. Copy `.env.example` to `.env`.
5. Fill in:

```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_application_id
GUILD_ID=your_server_id
PUBLIC_BASE_URL=https://your-public-render-replit-or-ngrok-url
```

6. In the Discord Developer Portal, enable **Server Members Intent**.
7. Invite the bot with `bot` and `applications.commands` scopes.
8. Deploy commands and start:

```bash
npm run deploy
npm start
```

## Main setup command

Inside your server, run:

```text
/setup-panels panel:all
```

That updates the agreement, service, cleaning checklist, and safety panels.

## Scheduling + calendar commands

```text
/schedule-add
/schedule-update
/schedule-remove
/schedule-remove-person
/schedule-list
/oncall
```

New calendar commands:

```text
/calendar-post
/calendar-view
/calendar-day
/calendar-close
/calendar-open
```

### What changed in this version

- Added `/schedule-remove-person` so managers/admins can remove/cancel upcoming entries for a specific person.
- Added a calendar dashboard that posts into the scheduling channel.
- Added `/calendar-close` and `/calendar-open` for holidays, closed days, and no-booking days.
- Added `/calendar-day` for detailed daily jobs, workers, closures, completed jobs, and cancelled jobs.
- Fixed the schedule spam issue by making schedule commands update dashboards instead of posting multiple public schedule messages.
- Added a small duplicate-interaction guard to reduce accidental double-processing inside one bot instance.

## Important duplicate warning

If one slash command creates the same schedule 2, 3, or 4 times, you probably have multiple copies of the bot running at once. For example:

- one running on your computer
- one running on Render
- one running on Replit
- an old terminal still open

Only keep **one** bot instance running.

## Updated service pricing included

- Quick Fresh Reset — $95
- Standard Home Reset — $149
- Full FreshStart — $230
- First-Time Deep Reset — $299–$399
- FreshStart Weekly — $299/month
- FreshStart Plus — $429/month
- FreshStart Complete — $599/month

## Add-ons included

- Extra laundry folding — $5–$15/load
- Fridge cleanout — $45
- Freezer cleanout — $45
- Pantry reset — $30–$80
- Closet reset — $75–$150
- Room resets — $45–$100
- Extra bathroom cleanups — $35–$60
- Heavy dishes fee — $20–$40
- Bedroom reset — $20–$35 per bedroom
- Move-in/move-out help — $150–$350
- Trash bins to curb/back — $50/month or $20/visit
- Trash bin cleaning — $10 per bin
- Porch sweep/blow — $20 each visit
- Lanai/patio reset — $50–$125
- Garage reset — $125–$350
- Car interior cleanout — $60–$100
- Yard debris pickup — $50–$150
- Tree/weeds cleanup — $40–$60
- Hurricane prep help — $75–$200
- Post-storm reset — $100–$300
