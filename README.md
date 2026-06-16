# FreshStart Co.™ Discord Bot

A Discord operations bot for FreshStart Co.™ service requests, add-ons, scheduling, job board, completed jobs, client notes, checklists, safety rules, training, and money tracking.

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
```

6. In the Discord Developer Portal, enable **Server Members Intent**.
7. Invite the bot with `bot` and `applications.commands` scopes.
8. Run:

```bash
npm run deploy
npm start
```

## Main setup command

Inside your server, run:

```text
/setup-panels panel:all
```

That updates the service panel, cleaning checklists, and safety panel.

## Core pricing rule

No package has a strict time limit, but every package has a scope limit.

Customers are not paying by the hour, but they also do not get unlimited bedrooms, unlimited laundry, unlimited dishes, unlimited garage work, unsafe work, or unlimited add-ons. Heavy messes, oversized jobs, unsafe conditions, or anything outside the listed scope needs a custom quote.

## One-time service packages

### Quick Fresh Reset — $95

Best for a light home reset or smaller mess.

- Kitchen clean
- Dishes loaded and washed
- Counters wiped
- Trash taken out
- Living room pickup
- Vacuum
- Any light organizing

This package is for basic upkeep, not deep cleaning, heavy laundry, garage work, or full-house resets.

### Standard Home Reset — $149

Best for families who need the main parts of the home fully reset.

- Kitchen done
- Living room done
- Bathrooms done
- Floors vacuumed and mopped
- Trash taken out
- Laundry done using the client’s washer and dryer
- Light organizing
- Completion update with photos if approved

This package is stronger than Quick because it includes bathrooms, floors, laundry, and updates.

### Full FreshStart — $230

Best for bigger homes, heavier messes, or clients who want inside and light outside help.

- Kitchen done
- Living room done
- All bathrooms done
- All bedrooms done
- Laundry fully finished
- Floors mopped and vacuumed
- Dishes completed and put away
- Cleaned fridge and pantry
- Patio blow
- Trash bins taken in or out
- Light garage cleanup

This package is for a more complete reset of the home, including more rooms, more laundry, and light exterior help.

### First-Time Deep Reset — $299–$399

Best for first-time clients, homes that need extra work, or larger cleanups before starting regular service.

- Deep kitchen cleanup
- More organizing, including cups, pans, fridge, freezer, and cabinets
- Pantry clean and reset
- Bedroom cleaning
- All bathrooms
- Laundry fully done
- Garage fully done
- Patio fully done

Final price depends on home size, amount of laundry, amount of organizing, garage condition, patio size, and how heavy the reset is.

## Monthly plans

### FreshStart Weekly — $299/month

Best for clients who want basic weekly maintenance.

- One Quick Fresh Reset every week
- Light trash/bin help
- Text update after every visit
- Priority scheduling over one-time clients
- Light organizing
- Best for basic weekly upkeep

This plan does not include deep cleaning, full garage work, heavy laundry, or full-house resets.

### FreshStart Plus — $429/month

Best for busy families who need more than basic upkeep.

- One Standard Home Reset every week
- Kitchen, living room, bathrooms, and floors
- Laundry using the client’s washer and dryer
- Trash taken out
- Monthly fridge OR pantry reset
- Monthly patio/porch sweep or blow
- Trash bins to curb and back
- Photo/text update after each visit
- Priority scheduling

This plan gives more than Weekly because it includes bathrooms, floors, laundry, monthly fridge/pantry help, patio/porch help, and trash bin service.

### FreshStart Complete — $599/month

Best for clients who want the most help and the highest priority.

- One weekly home reset
- Kitchen, living room, bathrooms, and bedrooms reset
- Laundry
- Floors vacuumed and mopped
- Dishes completed and put away
- Inside + outside light help
- Trash bins
- Porch/patio help
- Garage entry light reset
- One monthly organizing project
- One monthly Full FreshStart upgrade
- Highest priority scheduling

This plan gives the most because it includes inside help, outside light help, bedrooms, laundry, organizing, garage entry, patio/porch help, trash bins, and one bigger monthly reset.

## Add-ons included

- Extra laundry folding — $5–$15/load depending on amount
- Fridge cleanout — $45 depending on whether it is already included
- Freezer cleanout — $45 depending on whether it is already included
- Pantry reset — $30–$80 depending on size and whether it is included
- Closet reset — $75–$150 depending on laundry, folding, and organizing needed
- Room resets — $45–$100 depending on number of rooms and washing needed
- Extra bathroom cleanups — $35–$60 depending on number of bathrooms and whether included
- Heavy dishes fee — $20–$40 depending on amount and whether included
- Bedroom reset — $20–$35 per bedroom depending on whether included
- Move-in/move-out help — $150–$350
- Trash bins to curb/back — $50/month or $20 per visit
- Trash bin cleaning — $10 per bin
- Porch sweep/blow — $20 per visit
- Lanai/patio reset — $50–$125 depending on size, furniture, and pool area
- Garage reset — $125–$350 depending on size, item amount, condition, and priority
- Car interior cleanout — $60–$100; basic vacuum, dusting, and trash pickup only. No detailing included.
- Yard debris pickup — $50–$150
- Tree/weeds cleanup — $40–$60 depending on whether included
- Hurricane prep help — $75–$200 depending on house size and staff availability
- Post-storm reset — $100–$300

## Digital agreement signatures

This version includes an agreement signing panel for channel `1516513348777283707`.

How it works:

1. Run `/setup-panels panel:all` or `/setup-panels panel:agreement`.
2. The bot posts the FreshStart Co.™ Service Agreement panel.
3. A user clicks **Read + Sign Agreement**.
4. The bot gives them a private signing link.
5. They read the agreement, type their printed name, and draw their signature with a finger or mouse.
6. The bot creates a signed PDF and DMs it to Owner/Admin users.
7. The signature event is posted in logs.

### Required `.env` setting

Agreement signatures require a public web URL:

```env
PUBLIC_BASE_URL=https://your-public-bot-url.com
PORT=3000
```

`PUBLIC_BASE_URL` cannot be `localhost` for real clients. Use a hosting platform like Replit, Render, Railway, or a temporary ngrok URL if testing locally.

### New dependencies

This version uses:

- `express` for the signing webpage
- `pdfkit` for signed PDF creation

After updating files, run:

```bash
npm install
npm run deploy
npm start
```

### Agreement note

This is a practical service agreement and safety acknowledgement template. Have a trusted adult or local professional review it before relying on it as a legal contract.
