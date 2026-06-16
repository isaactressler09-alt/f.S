require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const PDFDocument = require('pdfkit');
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionFlagsBits,
  AttachmentBuilder
} = require('discord.js');

const CONFIG = {
  guildId: process.env.GUILD_ID,
  requestCategoryId: process.env.REQUEST_CATEGORY_ID || null,
  publicBaseUrl: process.env.PUBLIC_BASE_URL || null,
  webPort: Number(process.env.PORT || 3000),
  autoSetup: (process.env.AUTO_SETUP || 'false').toLowerCase() === 'true',
  hoursAnnouncementsEnabled: (process.env.HOURS_ANNOUNCEMENTS_ENABLED || 'true').toLowerCase() === 'true',
  channels: {
    agreementPanel: '1516513348777283707',
    servicePanel: '1516520149723775058',
    announcements: '1516520013782061066',
    scheduling: '1516521109565079602',
    jobBoard: '1516521271502831808',
    completedJobs: '1516521450071392346',
    clientNotes: '1516521711237857340',
    cleaningChecklists: '1516523506245046434',
    safetyRules: '1516523351781146855',
    training: '1516523159443214550',
    moneyTracker: '1516527769582829648',
    logs: '1516528400414544094'
  },
  roles: {
    owner: '1516524270564671529',
    admin: '1516524479788880052',
    manager: '1516524580074950787',
    teamLead: '1516525070493810800',
    helper: '1516525118895952042',
    trialHelper: '1516525369052631190',
    client: '1516525464657858611',
    priority: '1516533742909263872',
    newComer: '1516525656773759017'
  }
};

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');
const SIGNATURE_DIR = path.join(DB_DIR, 'signatures');
const AGREEMENT_DIR = path.join(DB_DIR, 'agreements');

const pendingSelections = new Map();

const SERVICES = {
  quick: {
    name: 'Quick Fresh Reset',
    price: '$95',
    estimate: 95,
    includes: [
      'Kitchen clean',
      'Dishes loaded and washed',
      'Counters wiped',
      'Trash taken out',
      'Living room pickup',
      'Vacuum',
      'Any light organizing'
    ]
  },
  standard: {
    name: 'Standard Home Reset',
    price: '$149',
    estimate: 149,
    includes: [
      'Kitchen done',
      'Living room done',
      'Bathrooms done',
      'Floors vacuumed and mopped',
      'Trash taken out',
      'Laundry done using the client\'s washer and dryer',
      'Light organizing',
      'Live updates/photos after completion'
    ]
  },
  full: {
    name: 'Full FreshStart',
    price: '$230',
    estimate: 230,
    includes: [
      'Kitchen done',
      'Living room done',
      'All bathrooms done',
      'All bedrooms done',
      'Laundry fully finished',
      'Floors mopped and vacuumed',
      'Dishes completed and put away',
      'Fridge and pantry cleaned',
      'Patio blow',
      'Trash bins taken in or out',
      'Light garage cleanup'
    ]
  },
  deep: {
    name: 'First-Time Deep Reset',
    price: '$299–$399',
    estimate: 299,
    includes: [
      'Deep kitchen clean up',
      'More organizing: cups, pans, fridge, freezer, and more',
      'Pantry clean and reset',
      'Bedroom cleaning',
      'All bathrooms',
      'Laundry fully done',
      'Garage fully done',
      'Patio fully done'
    ]
  },
  weekly: {
    name: 'FreshStart Weekly',
    price: '$299/month',
    estimate: 299,
    includes: [
      'One Quick Fresh Reset every week',
      'Light trash/bin help',
      'Text update after every visit',
      'Priority scheduling over one-time clients',
      'Light organizing',
      'Best for basic weekly upkeep'
    ]
  },
  plus: {
    name: 'FreshStart Plus',
    price: '$429/month',
    estimate: 429,
    includes: [
      'One Standard Home Reset every week',
      'Kitchen, living room, bathrooms, and floors',
      "Laundry using the client\'s washer and dryer",
      'Trash taken out',
      'Monthly fridge OR pantry reset',
      'Monthly patio/porch sweep or blow',
      'Trash bins to curb and back',
      'Photo/text update after each visit',
      'Priority scheduling'
    ]
  },
  complete: {
    name: 'FreshStart Complete',
    price: '$599/month',
    estimate: 599,
    includes: [
      'One weekly home reset',
      'Kitchen, living room, bathrooms, and bedrooms reset',
      'Laundry',
      'Floors vacuumed and mopped',
      'Dishes completed and put away',
      'Inside + outside light help',
      'Trash bins',
      'Porch/patio help',
      'Garage entry light reset',
      'One monthly organizing project',
      'One monthly Full FreshStart upgrade',
      'Highest priority scheduling'
    ]
  },
  hurricane_prep: {
    name: 'Hurricane Prep Help',
    price: '$75–$200',
    estimate: 75,
    includes: [
      'Bring patio furniture inside',
      'Move loose items',
      'Clear porch/lanai',
      'Take photos of outside areas if requested',
      'Help organize emergency supplies',
      'Take trash/debris to curb'
    ]
  },
  post_storm: {
    name: 'Post-Storm Reset',
    price: '$100–$300',
    estimate: 100,
    includes: [
      'Yard debris pile-up',
      'Patio reset',
      'Garage entry cleanup',
      'Trash removal',
      'Outdoor furniture reset',
      'Light safe cleanup only'
    ]
  }
};

const ADDONS = {
  extra_laundry: {
    name: 'Extra laundry folding',
    price: '$5–$15/load',
    details: 'Depends on the amount.'
  },
  fridge: {
    name: 'Fridge cleanout',
    price: '$45',
    details: 'Depends if the service is included or not.'
  },
  freezer: {
    name: 'Freezer cleanout',
    price: '$45',
    details: 'Depends if the service is included or not.'
  },
  pantry: {
    name: 'Pantry reset',
    price: '$30–$80',
    details: 'Depends if the service is included or not and the size of the pantry.'
  },
  closet: {
    name: 'Closet reset',
    price: '$75–$150',
    details: 'Depends on how many loads of laundry, how much folding, and other priorities.'
  },
  room_resets: {
    name: 'Room resets',
    price: '$45–$100',
    details: 'Depends if the service is included, how many rooms, and if washing is needed.'
  },
  extra_bathroom: {
    name: 'Extra bathroom cleanups',
    price: '$35–$60',
    details: 'Depends if the service is included and how many bathrooms are needed.'
  },
  heavy_dishes: {
    name: 'Heavy dishes fee',
    price: '$20–$40',
    details: 'Depends if the service is included and how many loads need to be done.'
  },
  bedroom: {
    name: 'Bedroom reset',
    price: '$20–$35 per bedroom',
    details: 'Depends if the service is included or not.'
  },
  move_help: {
    name: 'Move-in/move-out help',
    price: '$150–$350',
    details: 'Depends on the amount of items, rooms, and reset work needed.'
  },
  trash_bins: {
    name: 'Trash bins to curb/back',
    price: '$50/month or $20/visit',
    details: 'Depends if the service is included or not.'
  },
  bin_cleaning: {
    name: 'Trash bin cleaning',
    price: '$10 per bin',
    details: 'Basic bin cleaning only.'
  },
  porch: {
    name: 'Porch sweep/blow',
    price: '$20 each visit',
    details: 'Depends if the service is included or not.'
  },
  lanai: {
    name: 'Lanai/patio reset',
    price: '$50–$125',
    details: 'Depends if included, porch size, furniture, and pool area.'
  },
  garage: {
    name: 'Garage reset',
    price: '$125–$350',
    details: 'Depends on package, garage size, amount of items, and priority.'
  },
  car: {
    name: 'Car interior cleanout',
    price: '$60–$100',
    details: 'No detailing. Basic vacuum, dusting, and garbage pickup only.'
  },
  yard_debris: {
    name: 'Yard debris pickup',
    price: '$50–$150',
    details: 'Light yard debris only.'
  },
  tree_weeds: {
    name: 'Tree/weeds cleanup',
    price: '$40–$60',
    details: 'Depends if the service is included or not. No dangerous tree work.'
  },
  hurricane_prep: {
    name: 'Hurricane prep help',
    price: '$75–$200',
    details: 'Depends on house size and the amount of staff available that day.'
  },
  post_storm: {
    name: 'Post-storm reset',
    price: '$100–$300',
    details: 'Light safe cleanup only. No electrical, mold, roof, flood, or hazardous cleanup.'
  }
};


const AGREEMENT_VERSION = 'FreshStart-Co-Service-Agreement-v1-2026-06-16';

const AGREEMENT_SECTIONS = [
  {
    title: '1. Scope-Based Service',
    body: 'FreshStart Co.™ packages do not have strict time limits, but every package has a scope limit. The client agrees that packages include only the listed tasks for the selected service. Oversized jobs, heavy messes, extra rooms, heavy laundry, unsafe conditions, or anything outside the listed scope may require a custom quote before work continues.'
  },
  {
    title: '2. Pricing, Add-ons, and Quotes',
    body: 'Listed prices are starting prices based on normal home conditions. Add-ons, extra work, large homes, heavy dishes, extra laundry, garage resets, move-in/move-out help, hurricane prep, post-storm cleanup, or other larger requests may change the final price. FreshStart Co.™ will confirm pricing before performing work that is outside the selected package.'
  },
  {
    title: '3. Client Responsibilities',
    body: 'The client agrees to provide safe access to the home or service area, working water and electricity when needed, and any washer/dryer access for laundry services. The client agrees to secure pets, valuables, weapons, medications, private papers, confidential items, fragile items, and expensive belongings before service begins.'
  },
  {
    title: '4. Services Not Offered',
    body: 'FreshStart Co.™ does not offer mold removal, heavy-duty mold work, hoarding cleanup, unsanitary or human waste cleanup, heavy chemical cleaning, medical tasks, medication handling, confidential document handling, weapon handling, roof work, electrical work, flood cleanup, hazardous cleanup, or unsafe work. Staff may refuse or stop a job if conditions are unsafe or outside the service scope.'
  },
  {
    title: '5. Property and Belongings',
    body: 'FreshStart Co.™ staff will try to work carefully and respectfully. The client understands that valuables, fragile items, expensive belongings, weapons, medications, and private papers should be moved out of the way before service. FreshStart Co.™ is not responsible for issues involving items the client failed to secure or remove from the work area.'
  },
  {
    title: '6. Photos and Updates',
    body: 'FreshStart Co.™ may send completion updates and photos only when approved or needed for job documentation. Photos are used for service updates, admin review, job proof, and quality tracking. FreshStart Co.™ will not intentionally post a client’s private home photos publicly without permission.'
  },
  {
    title: '7. Scheduling and Cancellation',
    body: 'Requested dates and times are not guaranteed until accepted by FreshStart Co.™. If a job needs to be rescheduled, cancelled, or changed due to weather, staff availability, unsafe conditions, or scope changes, FreshStart Co.™ will notify the client as soon as possible.'
  },
  {
    title: '8. Signature Acknowledgement',
    body: 'By signing, the client confirms that they understand the selected service is scope-based, that add-ons or heavy jobs may cost extra, and that the client is responsible for securing unsafe, private, fragile, valuable, or restricted items before service.'
  }
];

const SAFETY_TEXT = `As of right now, we DO NOT OFFER these items listed below!:

Dealing with mold, or heavy duty mold.
Dealing with any kind of hoarding situations unless it has something to do with a few boxes or items that are in the way and need to be thrown out. NO HOARDING.
Dealing with any kind of unsanitary or human waste environment.
Heavy chemical cleaning. We do NOT offer this service due to pet and human stability and safety. Evacuating homes due to a needed clean is not included in any package, deal, or offer.
Dealing with anything involving medication, giving medication or any medical item, private papers, anything confidential, valuables, or weapons of any kind.
F.S Staff is NOT responsible for any breakage, or valuable item issues or any expensive personal belongings that get ruined. Please, if you request a service, make sure any expensive, valuable, personal belongings are out of the way, weapons included (kitchen knives are an exception). If forgotten, we will try our absolute hardest to NOT mess with any belongings with the exception of moving them for purposeful cleaning like dustings, wipe downs, etc.

These are the services we do NOT offer as of right now, 6/16/2026. Any updates including new services, business, workers, clients, etc. are posted on the announcement page!`;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

function loadDb() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      settings: {
        agreementPanelMessageId: null,
        servicePanelMessageId: null,
        checklistsMessageId: null,
        safetyMessageId: null,
        jobBoardDashboardMessageId: null,
        moneyDashboardMessageId: null,
        hoursAnnouncementsEnabled: CONFIG.hoursAnnouncementsEnabled,
        lastOpenDate: null,
        lastCloseDate: null
      },
      requests: [],
      schedules: [],
      transactions: [],
      agreementTokens: [],
      agreements: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  db.settings ||= {};
  if (!('agreementPanelMessageId' in db.settings)) db.settings.agreementPanelMessageId = null;
  if (!('servicePanelMessageId' in db.settings)) db.settings.servicePanelMessageId = null;
  if (!('checklistsMessageId' in db.settings)) db.settings.checklistsMessageId = null;
  if (!('safetyMessageId' in db.settings)) db.settings.safetyMessageId = null;
  if (!('jobBoardDashboardMessageId' in db.settings)) db.settings.jobBoardDashboardMessageId = null;
  if (!('moneyDashboardMessageId' in db.settings)) db.settings.moneyDashboardMessageId = null;
  if (!('hoursAnnouncementsEnabled' in db.settings)) db.settings.hoursAnnouncementsEnabled = CONFIG.hoursAnnouncementsEnabled;
  db.requests ||= [];
  db.schedules ||= [];
  db.transactions ||= [];
  db.agreementTokens ||= [];
  db.agreements ||= [];
  return db;
}


function saveDb(db) {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function nextId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function fmtList(items, max = 20) {
  if (!items || !items.length) return 'None';
  return items.slice(0, max).map(item => `• ${item}`).join('\n');
}

function formatCurrency(amount) {
  const n = Number(amount || 0);
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function hasRole(member, roleId) {
  return Boolean(member?.roles?.cache?.has(roleId));
}

function hasAnyRole(member, roleIds) {
  return roleIds.some(id => hasRole(member, id));
}

function isOwnerAdmin(member) {
  return hasAnyRole(member, [CONFIG.roles.owner, CONFIG.roles.admin]) || member.permissions?.has(PermissionFlagsBits.Administrator);
}

function isManagerPlus(member) {
  return hasAnyRole(member, [CONFIG.roles.owner, CONFIG.roles.admin, CONFIG.roles.manager]) || member.permissions?.has(PermissionFlagsBits.ManageGuild);
}

function isHelperPlus(member) {
  return hasAnyRole(member, [
    CONFIG.roles.owner,
    CONFIG.roles.admin,
    CONFIG.roles.manager,
    CONFIG.roles.teamLead,
    CONFIG.roles.helper
  ]);
}

function priorityText(member) {
  return hasRole(member, CONFIG.roles.priority) ? '✅ Priority Client' : 'No priority role';
}

function serviceLabel(key) {
  const service = SERVICES[key];
  if (!service) return key || 'Unknown service';
  return `${service.name} — ${service.price}`;
}

function addonShortText(addon) {
  return `${addon.name} (${addon.price})`;
}

function addonFullText(addon) {
  return `**${addon.name}** — ${addon.price}${addon.details ? `\n  _${addon.details}_` : ''}`;
}

function addonMenuDescription(addon) {
  return `${addon.price}${addon.details ? ` — ${addon.details}` : ''}`.slice(0, 100);
}

function addonLabels(addonKeys) {
  if (!addonKeys || !addonKeys.length) return [];
  return addonKeys.map(key => {
    const addon = ADDONS[key];
    return addon ? addonShortText(addon) : key;
  });
}

function requestEmbed(request, guild) {
  const service = SERVICES[request.serviceKey] || {};
  const addons = addonLabels(request.addons);
  return new EmbedBuilder()
    .setTitle(`🧼 FreshStart Request ${request.id}`)
    .setColor(request.priority ? 0xf1c40f : 0x2ecc71)
    .setDescription(request.priority ? '⭐ **PRIORITY CLIENT**' : 'Standard client request')
    .addFields(
      { name: 'Client', value: `<@${request.userId}>\n${request.username}`, inline: true },
      { name: 'Service', value: `${service.name || request.serviceKey}\n${service.price || 'TBD'}`, inline: true },
      { name: 'Status', value: request.status, inline: true },
      { name: 'IRL Name', value: request.irlName || 'Not provided', inline: true },
      { name: 'Location', value: request.location || 'Not provided', inline: true },
      { name: 'Preferred Date/Time', value: request.preferredDateTime || 'Not provided', inline: true },
      { name: 'Add-ons', value: addons.length ? fmtList(addons) : 'None selected' },
      { name: 'Tip', value: request.tip || 'None / not provided', inline: true },
      { name: 'Notes', value: request.notes || 'None' }
    )
    .setFooter({ text: `FreshStart Co.™ • Submitted ${new Date(request.createdAt).toLocaleString()}` });
}

function scheduleEmbed(job) {
  const statusEmoji = {
    scheduled: '📌',
    in_progress: '🕝',
    completed: '✅',
    cancelled: '❌'
  }[job.status] || '📌';

  return new EmbedBuilder()
    .setTitle(`${statusEmoji} Schedule ${job.id}`)
    .setColor(job.status === 'completed' ? 0x2ecc71 : job.status === 'cancelled' ? 0xe74c3c : 0x3498db)
    .addFields(
      { name: 'Kind', value: job.kind, inline: true },
      { name: 'Person', value: `<@${job.userId}>`, inline: true },
      { name: 'Status', value: job.status, inline: true },
      { name: 'Date', value: job.date || 'Not set', inline: true },
      { name: 'Time', value: job.time || 'Not set', inline: true },
      { name: 'Service', value: serviceLabel(job.serviceKey), inline: true },
      { name: 'IRL Name', value: job.irlName || 'Not provided', inline: true },
      { name: 'Location', value: job.location || 'Not provided', inline: true },
      { name: 'Estimated Price', value: job.estimatedPrice ? formatCurrency(job.estimatedPrice) : 'N/A', inline: true },
      { name: 'Notes', value: job.notes || 'None' }
    )
    .setFooter({ text: 'FreshStart Co.™ Scheduling' });
}

async function fetchChannel(guild, channelId) {
  if (!guild || !channelId) return null;
  try {
    return await guild.channels.fetch(channelId);
  } catch {
    return null;
  }
}

async function logEvent(guild, title, description, fields = []) {
  const channel = await fetchChannel(guild, CONFIG.channels.logs);
  if (!channel) return;
  const embed = new EmbedBuilder()
    .setTitle(`📜 ${title}`)
    .setColor(0x95a5a6)
    .setDescription(description || 'No description')
    .addFields(fields.filter(Boolean))
    .setTimestamp();
  await channel.send({ embeds: [embed] }).catch(() => null);
}


function agreementTextForDisplay() {
  return AGREEMENT_SECTIONS.map(section => `**${section.title}**
${section.body}`).join('\n\n');
}

function buildAgreementPanelEmbeds() {
  const embed = new EmbedBuilder()
    .setTitle('📄 FreshStart Co.™ Service Agreement')
    .setColor(0x2ecc71)
    .setDescription([
      'Before requesting or receiving service, please read and sign the FreshStart Co.™ Service Agreement.',
      '',
      '**What this covers:**',
      '• Package scope limits',
      '• Add-ons and pricing changes',
      '• Client responsibilities',
      '• Safety rules and services we do not offer',
      '• Valuables, pets, weapons, medications, and private documents',
      '• Signature acknowledgement',
      '',
      'Click the button below. The bot will give you a private signing link where you can draw your signature with your finger or mouse.'
    ].join('\n'))
    .setFooter({ text: 'FreshStart Co.™ • Digital agreement signature panel' });

  const scopeEmbed = new EmbedBuilder()
    .setTitle('⚠️ Important Agreement Summary')
    .setColor(0xf39c12)
    .setDescription([
      '**No package has a strict time limit, but every package has a scope limit.**',
      '',
      'Heavy messes, oversized jobs, extra rooms, heavy laundry, unsafe conditions, or anything outside the listed package can require a custom quote.',
      '',
      'FreshStart Co.™ does not offer mold removal, hoarding cleanup, human waste cleanup, heavy chemical cleaning, medication handling, confidential paper handling, weapon handling, roof work, electrical work, flood cleanup, hazardous cleanup, or unsafe work.'
    ].join('\n'));

  return [embed, scopeEmbed];
}

function agreementPanelButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('fs_agreement_start')
      .setLabel('Read + Sign Agreement')
      .setEmoji('✍️')
      .setStyle(ButtonStyle.Primary)
  );
}

async function postAgreementPanel(guild) {
  const db = loadDb();
  const channel = await fetchChannel(guild, CONFIG.channels.agreementPanel);
  if (!channel) throw new Error('Agreement panel channel not found.');
  const message = await postOrEditMessage(channel, db.settings.agreementPanelMessageId, {
    embeds: buildAgreementPanelEmbeds(),
    components: [agreementPanelButton()]
  });
  db.settings.agreementPanelMessageId = message.id;
  saveDb(db);
  await logEvent(guild, 'Agreement Panel Posted', `Agreement signing panel posted/updated in <#${channel.id}>.`);
}

function createAgreementToken(user) {
  const db = loadDb();
  const token = crypto.randomBytes(24).toString('hex');
  db.agreementTokens.push({
    token,
    userId: user.id,
    username: user.username,
    createdAt: new Date().toISOString(),
    used: false
  });
  saveDb(db);
  return token;
}

function agreementHtml(token, tokenRecord) {
  const sectionsHtml = AGREEMENT_SECTIONS.map(section => `
    <section>
      <h3>${escapeHtml(section.title)}</h3>
      <p>${escapeHtml(section.body)}</p>
    </section>
  `).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FreshStart Co.™ Agreement</title>
  <style>
    :root { color-scheme: light; font-family: Arial, sans-serif; }
    body { margin: 0; background: #f5f7f8; color: #1f2933; }
    .wrap { max-width: 900px; margin: 0 auto; padding: 24px; }
    .card { background: white; border-radius: 18px; padding: 22px; box-shadow: 0 10px 28px rgba(0,0,0,.08); margin-bottom: 18px; }
    h1 { margin: 0 0 6px; font-size: 28px; }
    .sub { color: #576574; margin-top: 0; }
    section { border-top: 1px solid #e6eaee; padding-top: 14px; margin-top: 14px; }
    p { line-height: 1.55; }
    label { display: block; font-weight: 700; margin: 16px 0 8px; }
    input[type="text"] { width: 100%; box-sizing: border-box; border: 1px solid #cdd6df; border-radius: 10px; padding: 12px; font-size: 16px; }
    canvas { width: 100%; height: 190px; border: 2px dashed #8a98a8; border-radius: 14px; background: #fff; touch-action: none; }
    .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    button { border: 0; border-radius: 12px; padding: 12px 16px; font-weight: 800; cursor: pointer; }
    .primary { background: #2ecc71; color: white; }
    .secondary { background: #e9eef3; color: #1f2933; }
    .warning { background: #fff6db; border-left: 5px solid #f1c40f; padding: 12px; border-radius: 8px; }
    .small { font-size: 13px; color: #576574; }
    .check { display: flex; gap: 10px; align-items: flex-start; margin-top: 12px; }
    .check input { margin-top: 3px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>FreshStart Co.™ Service Agreement</h1>
      <p class="sub">Signing as Discord user: <strong>${escapeHtml(tokenRecord.username)}</strong></p>
      <div class="warning"><strong>Important:</strong> No package has a strict time limit, but every package has a scope limit.</div>
      ${sectionsHtml}
    </div>

    <form class="card" method="post" action="/agreement/${token}" onsubmit="return submitAgreement(event)">
      <h2>Sign Agreement</h2>
      <label for="signerName">Printed legal name / household name</label>
      <input id="signerName" name="signerName" type="text" maxlength="100" required placeholder="Type your name" />

      <label>Draw signature below</label>
      <canvas id="signature"></canvas>
      <input id="signatureData" name="signatureData" type="hidden" />

      <div class="row" style="margin-top: 10px;">
        <button class="secondary" type="button" onclick="clearSignature()">Clear Signature</button>
      </div>

      <label class="check">
        <input id="agree" type="checkbox" required />
        <span>I have read and agree to the FreshStart Co.™ service agreement, safety rules, package scope limits, and client responsibilities.</span>
      </label>

      <p class="small">After you submit, a signed PDF copy is automatically sent to the FreshStart Co.™ Owner/Admin team.</p>
      <button class="primary" type="submit">Submit Signed Agreement</button>
    </form>
  </div>

<script>
const canvas = document.getElementById('signature');
const ctx = canvas.getContext('2d');
let drawing = false;
let hasSigned = false;

function resizeCanvas() {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  ctx.scale(ratio, ratio);
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#111827';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function point(e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches && e.touches[0];
  return {
    x: (touch ? touch.clientX : e.clientX) - rect.left,
    y: (touch ? touch.clientY : e.clientY) - rect.top
  };
}
function start(e) { e.preventDefault(); drawing = true; hasSigned = true; const p = point(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
function move(e) { if (!drawing) return; e.preventDefault(); const p = point(e); ctx.lineTo(p.x, p.y); ctx.stroke(); }
function end(e) { if (!drawing) return; e.preventDefault(); drawing = false; }
canvas.addEventListener('mousedown', start);
canvas.addEventListener('mousemove', move);
canvas.addEventListener('mouseup', end);
canvas.addEventListener('mouseleave', end);
canvas.addEventListener('touchstart', start, { passive: false });
canvas.addEventListener('touchmove', move, { passive: false });
canvas.addEventListener('touchend', end, { passive: false });

function clearSignature() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hasSigned = false;
}
function submitAgreement(e) {
  if (!hasSigned) {
    alert('Please draw your signature before submitting.');
    return false;
  }
  document.getElementById('signatureData').value = canvas.toDataURL('image/png');
  return true;
}
</script>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function successHtml(agreementId) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Agreement Signed</title><style>body{font-family:Arial,sans-serif;background:#f5f7f8;margin:0;padding:24px}.card{max-width:720px;background:white;margin:40px auto;padding:28px;border-radius:18px;box-shadow:0 10px 28px rgba(0,0,0,.08)}h1{color:#27ae60}</style></head><body><div class="card"><h1>✅ Agreement submitted</h1><p>Your signed FreshStart Co.™ agreement was sent to the Owner/Admin team.</p><p><strong>Agreement ID:</strong> ${escapeHtml(agreementId)}</p><p>You can close this page and return to Discord.</p></div></body></html>`;
}

function errorHtml(message) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Agreement Error</title><style>body{font-family:Arial,sans-serif;background:#f5f7f8;margin:0;padding:24px}.card{max-width:720px;background:white;margin:40px auto;padding:28px;border-radius:18px;box-shadow:0 10px 28px rgba(0,0,0,.08)}h1{color:#e74c3c}</style></head><body><div class="card"><h1>Agreement link error</h1><p>${escapeHtml(message)}</p><p>Please return to Discord and press the agreement button again.</p></div></body></html>`;
}

function signatureDataUrlToBuffer(dataUrl) {
  const prefix = 'data:image/png;base64,';
  if (!dataUrl || !dataUrl.startsWith(prefix)) throw new Error('Invalid signature image.');
  return Buffer.from(dataUrl.slice(prefix.length), 'base64');
}

function ensureAgreementDirs() {
  if (!fs.existsSync(SIGNATURE_DIR)) fs.mkdirSync(SIGNATURE_DIR, { recursive: true });
  if (!fs.existsSync(AGREEMENT_DIR)) fs.mkdirSync(AGREEMENT_DIR, { recursive: true });
}

function createAgreementPdf(agreement, signatureBuffer) {
  ensureAgreementDirs();
  const pdfPath = path.join(AGREEMENT_DIR, `${agreement.id}.pdf`);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'LETTER' });
    const stream = fs.createWriteStream(pdfPath);
    stream.on('finish', () => resolve(pdfPath));
    stream.on('error', reject);
    doc.pipe(stream);

    doc.fontSize(20).text('FreshStart Co.™ Service Agreement', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#666').text(`Agreement ID: ${agreement.id}`, { align: 'center' });
    doc.text(`Version: ${AGREEMENT_VERSION}`, { align: 'center' });
    doc.moveDown(1);
    doc.fillColor('#000').fontSize(11);
    doc.text(`Discord User: ${agreement.username} (${agreement.userId})`);
    doc.text(`Printed Name / Household: ${agreement.signerName}`);
    doc.text(`Signed At: ${new Date(agreement.signedAt).toLocaleString('en-US', { timeZone: 'America/New_York' })} EST/EDT`);
    doc.moveDown(1);

    for (const section of AGREEMENT_SECTIONS) {
      doc.fontSize(13).fillColor('#111').text(section.title, { underline: true });
      doc.moveDown(0.25);
      doc.fontSize(10.5).fillColor('#222').text(section.body, { lineGap: 2 });
      doc.moveDown(0.75);
      if (doc.y > 650) doc.addPage();
    }

    if (doc.y > 560) doc.addPage();
    doc.fontSize(13).fillColor('#111').text('Client Signature', { underline: true });
    doc.moveDown(0.5);
    doc.image(signatureBuffer, { fit: [280, 110] });
    doc.moveDown(1);
    doc.fontSize(10).text(`Signed by: ${agreement.signerName}`);
    doc.text(`Date: ${new Date(agreement.signedAt).toLocaleString('en-US', { timeZone: 'America/New_York' })}`);

    doc.end();
  });
}

async function notifyAdminsOfAgreement(guild, agreement, pdfPath) {
  const admins = await getAdminMembers(guild);
  const embed = new EmbedBuilder()
    .setTitle('✍️ FreshStart Agreement Signed')
    .setColor(0x2ecc71)
    .addFields(
      { name: 'Agreement ID', value: agreement.id, inline: true },
      { name: 'Discord User', value: `<@${agreement.userId}>\n${agreement.username}`, inline: true },
      { name: 'Printed Name', value: agreement.signerName, inline: true },
      { name: 'Signed At', value: new Date(agreement.signedAt).toLocaleString('en-US', { timeZone: 'America/New_York' }), inline: true }
    )
    .setFooter({ text: 'Signed PDF attached.' });

  for (const [, member] of admins) {
    const attachment = new AttachmentBuilder(pdfPath, { name: `FreshStart-Agreement-${agreement.id}.pdf` });
    await member.send({ embeds: [embed], files: [attachment] }).catch(() => null);
  }
}

async function handleAgreementStart(interaction) {
  if (!CONFIG.publicBaseUrl) {
    await interaction.reply({
      content: 'Agreement signing needs `PUBLIC_BASE_URL` in the bot `.env` file. This must be a public web URL from Replit, Render, Railway, or ngrok.',
      ephemeral: true
    });
    return;
  }

  const token = createAgreementToken(interaction.user);
  const url = `${CONFIG.publicBaseUrl.replace(/\/$/, '')}/agreement/${token}`;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Open Private Signing Page')
      .setEmoji('✍️')
      .setStyle(ButtonStyle.Link)
      .setURL(url)
  );

  await interaction.reply({
    content: 'Click below to open your private FreshStart Co.™ agreement signing page. You can draw your signature with your finger or mouse.',
    components: [row],
    ephemeral: true
  });
  await logEvent(interaction.guild, 'Agreement Link Created', `${interaction.user} opened an agreement signing link.`).catch(() => null);
}

function startAgreementWebServer() {
  const app = express();
  app.use(express.urlencoded({ extended: true, limit: '12mb' }));
  app.use(express.json({ limit: '12mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'FreshStart Co. agreement server' }));

  app.get('/agreement/:token', (req, res) => {
    const db = loadDb();
    const tokenRecord = db.agreementTokens.find(item => item.token === req.params.token);
    if (!tokenRecord) return res.status(404).send(errorHtml('This agreement link is invalid.'));
    if (tokenRecord.used) return res.status(410).send(errorHtml('This agreement link was already used.'));
    return res.send(agreementHtml(req.params.token, tokenRecord));
  });

  app.post('/agreement/:token', async (req, res) => {
    try {
      const db = loadDb();
      const tokenRecord = db.agreementTokens.find(item => item.token === req.params.token);
      if (!tokenRecord) return res.status(404).send(errorHtml('This agreement link is invalid.'));
      if (tokenRecord.used) return res.status(410).send(errorHtml('This agreement link was already used.'));

      const signerName = String(req.body.signerName || '').trim().slice(0, 100);
      if (!signerName) return res.status(400).send(errorHtml('Printed name is required.'));

      const signatureBuffer = signatureDataUrlToBuffer(req.body.signatureData);
      ensureAgreementDirs();

      const agreement = {
        id: nextId('AGR'),
        version: AGREEMENT_VERSION,
        token: req.params.token,
        userId: tokenRecord.userId,
        username: tokenRecord.username,
        signerName,
        signedAt: new Date().toISOString(),
        signatureImagePath: null,
        pdfPath: null
      };

      const signaturePath = path.join(SIGNATURE_DIR, `${agreement.id}.png`);
      fs.writeFileSync(signaturePath, signatureBuffer);
      agreement.signatureImagePath = signaturePath;
      const pdfPath = await createAgreementPdf(agreement, signatureBuffer);
      agreement.pdfPath = pdfPath;

      tokenRecord.used = true;
      tokenRecord.usedAt = agreement.signedAt;
      db.agreements.push(agreement);
      saveDb(db);

      const guild = await client.guilds.fetch(CONFIG.guildId).catch(() => null);
      if (guild) {
        await notifyAdminsOfAgreement(guild, agreement, pdfPath).catch(() => null);
        await logEvent(guild, 'Agreement Signed', `<@${agreement.userId}> signed the FreshStart Co.™ agreement.`, [
          { name: 'Agreement ID', value: agreement.id, inline: true },
          { name: 'Printed Name', value: signerName, inline: true }
        ]).catch(() => null);
      }

      return res.send(successHtml(agreement.id));
    } catch (error) {
      console.error('Agreement submit failed:', error);
      return res.status(500).send(errorHtml('The agreement could not be submitted. Please try again or contact FreshStart Co.™.'));
    }
  });

  app.listen(CONFIG.webPort, () => {
    console.log(`FreshStart agreement web server running on port ${CONFIG.webPort}`);
    if (!CONFIG.publicBaseUrl) console.warn('PUBLIC_BASE_URL is not set. Agreement links will not be available to clients.');
  });
}

function buildServicePanelEmbeds() {
  const main = new EmbedBuilder()
    .setTitle('🧼 FreshStart Co.™ Services')
    .setColor(0x2ecc71)
    .setDescription('Home resets, inside and out. Choose a package, add extras, leave notes, and our Owner/Admin team will review your request.')
    .addFields(
      { name: 'Quick Fresh Reset — $95', value: fmtList(SERVICES.quick.includes) },
      { name: 'Standard Home Reset — $149', value: fmtList(SERVICES.standard.includes) },
      { name: 'Full FreshStart — $230', value: fmtList(SERVICES.full.includes) },
      { name: 'First-Time Deep Reset — $299–$399', value: fmtList(SERVICES.deep.includes) }
    )
    .setFooter({ text: 'No package has a strict time limit, but every package has a scope limit. Extra-heavy jobs may need a custom quote.' });

  const monthly = new EmbedBuilder()
    .setTitle('📆 Monthly + Seasonal Options')
    .setColor(0x1abc9c)
    .addFields(
      { name: 'FreshStart Weekly — $299/month', value: fmtList(SERVICES.weekly.includes) },
      { name: 'FreshStart Plus — $429/month', value: fmtList(SERVICES.plus.includes) },
      { name: 'FreshStart Complete — $599/month', value: fmtList(SERVICES.complete.includes) },
      { name: 'PSL Seasonal Services', value: `**Hurricane Prep Help — $75–$200**\n${fmtList(SERVICES.hurricane_prep.includes, 6)}\n\n**Post-Storm Reset — $100–$300**\n${fmtList(SERVICES.post_storm.includes, 6)}` }
    );

  const addonText = Object.values(ADDONS).map(addon => `• ${addonFullText(addon)}`).join('\n');
  const addonEmbeds = chunkText(addonText, 3800).map((chunk, index) => new EmbedBuilder()
    .setTitle(index === 0 ? '➕ Add-ons' : '➕ Add-ons Continued')
    .setColor(0xf39c12)
    .setDescription(chunk));

  return [main, monthly, ...addonEmbeds];
}

function servicePanelButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('fs_request_start')
      .setLabel('Request a FreshStart Service')
      .setEmoji('🧼')
      .setStyle(ButtonStyle.Success)
  );
}

function buildRequestComponents(userId) {
  const pending = pendingSelections.get(userId) || { serviceKey: null, addons: [] };
  const serviceMenu = new StringSelectMenuBuilder()
    .setCustomId('fs_select_service')
    .setPlaceholder('Choose a FreshStart service package')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(Object.entries(SERVICES).map(([key, service]) => ({
      label: `${service.name} — ${service.price}`.slice(0, 100),
      value: key,
      description: service.includes[0].slice(0, 100),
      default: pending.serviceKey === key
    })));

  const addonMenu = new StringSelectMenuBuilder()
    .setCustomId('fs_select_addons')
    .setPlaceholder('Optional: choose add-ons')
    .setMinValues(0)
    .setMaxValues(Math.min(Object.keys(ADDONS).length, 20))
    .addOptions(Object.entries(ADDONS).map(([key, addon]) => ({
      label: addon.name.slice(0, 100),
      value: key,
      description: addonMenuDescription(addon),
      default: pending.addons?.includes(key) || false
    })));

  const continueButton = new ButtonBuilder()
    .setCustomId('fs_request_continue')
    .setLabel('Continue to Notes + Location')
    .setEmoji('📝')
    .setStyle(ButtonStyle.Primary);

  return [
    new ActionRowBuilder().addComponents(serviceMenu),
    new ActionRowBuilder().addComponents(addonMenu),
    new ActionRowBuilder().addComponents(continueButton)
  ];
}

async function postOrEditMessage(channel, messageId, payload) {
  if (messageId) {
    try {
      const existing = await channel.messages.fetch(messageId);
      await existing.edit(payload);
      return existing;
    } catch {
      // message was deleted or cannot be fetched; post a new one
    }
  }
  return await channel.send(payload);
}

async function postServicePanel(guild) {
  const db = loadDb();
  const channel = await fetchChannel(guild, CONFIG.channels.servicePanel);
  if (!channel) throw new Error('Service panel channel not found.');
  const message = await postOrEditMessage(channel, db.settings.servicePanelMessageId, {
    embeds: buildServicePanelEmbeds(),
    components: [servicePanelButton()]
  });
  db.settings.servicePanelMessageId = message.id;
  saveDb(db);
  await logEvent(guild, 'Service Panel Posted', `Service request panel posted/updated in <#${channel.id}>.`);
}

function buildChecklistsEmbeds() {
  const packageEmbed = new EmbedBuilder()
    .setTitle('🧼 FreshStart Co.™ Cleaning Checklists')
    .setColor(0x9b59b6)
    .setDescription('Use these checklists during each job. Admins can also post job-specific supplies with `/supplies`.')
    .addFields(
      { name: 'Quick Fresh Reset — $95', value: fmtList(SERVICES.quick.includes) },
      { name: 'Standard Home Reset — $149', value: fmtList(SERVICES.standard.includes) },
      { name: 'Full FreshStart — $230', value: fmtList(SERVICES.full.includes) },
      { name: 'First-Time Deep Reset — $299–$399', value: fmtList(SERVICES.deep.includes) }
    );

  const monthlyEmbed = new EmbedBuilder()
    .setTitle('📆 Monthly + PSL Seasonal Checklists')
    .setColor(0x16a085)
    .addFields(
      { name: 'FreshStart Weekly — $299/month', value: fmtList(SERVICES.weekly.includes) },
      { name: 'FreshStart Plus — $429/month', value: fmtList(SERVICES.plus.includes) },
      { name: 'FreshStart Complete — $599/month', value: fmtList(SERVICES.complete.includes) },
      { name: 'Hurricane Prep Help — $75–$200', value: fmtList(SERVICES.hurricane_prep.includes) },
      { name: 'Post-Storm Reset — $100–$300', value: fmtList(SERVICES.post_storm.includes) }
    );

  const suppliesBase = new EmbedBuilder()
    .setTitle('🧽 Basic Supplies Reminder')
    .setColor(0xf1c40f)
    .setDescription([
      '• Gloves',
      '• Trash bags',
      '• Paper towels or microfiber towels',
      '• All-purpose cleaner approved by the client',
      '• Broom/dustpan',
      '• Vacuum if not provided by client',
      '• Mop if not provided by client',
      '• Phone charged for updates/photos if approved',
      '• Do not use strong chemicals unless approved by client and Admin'
    ].join('\n'));

  const addonText = Object.values(ADDONS).map(addon => `• ${addonFullText(addon)}`).join('\n');
  const addonEmbeds = chunkText(addonText, 3800).map((chunk, index) => new EmbedBuilder()
    .setTitle(index === 0 ? '➕ FreshStart Add-ons' : '➕ FreshStart Add-ons Continued')
    .setColor(0xf39c12)
    .setDescription(chunk));

  return [packageEmbed, monthlyEmbed, ...addonEmbeds, suppliesBase];
}

async function postChecklistsPanel(guild) {
  const db = loadDb();
  const channel = await fetchChannel(guild, CONFIG.channels.cleaningChecklists);
  if (!channel) throw new Error('Cleaning checklists channel not found.');
  const message = await postOrEditMessage(channel, db.settings.checklistsMessageId, {
    embeds: buildChecklistsEmbeds()
  });
  db.settings.checklistsMessageId = message.id;
  saveDb(db);
  await logEvent(guild, 'Checklist Panel Posted', `Cleaning checklist panel posted/updated in <#${channel.id}>.`);
}

async function postSafetyPanel(guild) {
  const db = loadDb();
  const channel = await fetchChannel(guild, CONFIG.channels.safetyRules);
  if (!channel) throw new Error('Safety rules channel not found.');
  const chunks = chunkText(SAFETY_TEXT, 3800);
  const embeds = chunks.map((chunk, index) => new EmbedBuilder()
    .setTitle(index === 0 ? '⚠️ FreshStart Co.™ Safety Rules' : '⚠️ FreshStart Co.™ Safety Rules Continued')
    .setColor(0xe74c3c)
    .setDescription(chunk));
  const message = await postOrEditMessage(channel, db.settings.safetyMessageId, { embeds });
  db.settings.safetyMessageId = message.id;
  saveDb(db);
  await logEvent(guild, 'Safety Panel Posted', `Safety rules panel posted/updated in <#${channel.id}>.`);
}

function chunkText(text, size) {
  const chunks = [];
  let current = '';
  for (const paragraph of text.split('\n')) {
    if ((current + '\n' + paragraph).length > size) {
      chunks.push(current);
      current = paragraph;
    } else {
      current += current ? `\n${paragraph}` : paragraph;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function postPanels(guild, panel) {
  if (panel === 'all' || panel === 'agreement') await postAgreementPanel(guild);
  if (panel === 'all' || panel === 'services') await postServicePanel(guild);
  if (panel === 'all' || panel === 'checklists') await postChecklistsPanel(guild);
  if (panel === 'all' || panel === 'safety') await postSafetyPanel(guild);
}

async function getAdminMembers(guild) {
  await guild.members.fetch();
  return guild.members.cache.filter(member => !member.user.bot && hasAnyRole(member, [CONFIG.roles.owner, CONFIG.roles.admin]));
}

function claimRow(requestId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`fs_claim_request:${requestId}`)
      .setLabel('Claim / Accept Request')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`fs_cancel_request:${requestId}`)
      .setLabel('Decline / Cancel')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger)
  );
}

async function notifyAdminsOfRequest(guild, request) {
  const admins = await getAdminMembers(guild);
  for (const [, member] of admins) {
    await member.send({
      content: `🧼 New FreshStart Co. request${request.priority ? ' — ⭐ PRIORITY' : ''}`,
      embeds: [requestEmbed(request, guild)],
      components: [claimRow(request.id)]
    }).catch(() => null);
  }
}

async function postClientNote(guild, request) {
  const channel = await fetchChannel(guild, CONFIG.channels.clientNotes);
  if (!channel) return null;
  const embed = new EmbedBuilder()
    .setTitle(`☎️ Client Notes • ${request.id}`)
    .setColor(request.priority ? 0xf1c40f : 0x00b894)
    .addFields(
      { name: 'Client', value: `<@${request.userId}>\n${request.username}`, inline: true },
      { name: 'Priority', value: request.priority ? '✅ Yes' : 'No', inline: true },
      { name: 'Service', value: serviceLabel(request.serviceKey), inline: false },
      { name: 'IRL Name', value: request.irlName || 'Not provided', inline: true },
      { name: 'Location', value: request.location || 'Not provided', inline: true },
      { name: 'Preferred Date/Time', value: request.preferredDateTime || 'Not provided', inline: true },
      { name: 'Add-ons', value: addonLabels(request.addons).length ? fmtList(addonLabels(request.addons)) : 'None' },
      { name: 'Tip', value: request.tip || 'None / not provided', inline: true },
      { name: 'Notes', value: request.notes || 'None' }
    )
    .setTimestamp();
  const message = await channel.send({ embeds: [embed] });
  return message.id;
}

function sanitizeChannelName(username) {
  const base = username
    .toLowerCase()
    .replace(/[^a-z0-9\-_ ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 35) || 'client';
  return `${base}-request-channel-🕝📌`;
}

async function createRequestChannel(guild, request, claimedByUser) {
  if (request.requestChannelId) {
    const existing = await fetchChannel(guild, request.requestChannelId);
    if (existing) return existing;
  }

  const clientMember = await guild.members.fetch(request.userId).catch(() => null);
  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: CONFIG.roles.owner,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles]
    },
    {
      id: CONFIG.roles.admin,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles]
    },
    {
      id: guild.client.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
    }
  ];

  if (clientMember) {
    permissionOverwrites.push({
      id: clientMember.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles]
    });
  }

  const createOptions = {
    name: sanitizeChannelName(request.username),
    type: ChannelType.GuildText,
    topic: `FreshStart Co. request ${request.id} for ${request.username}`,
    permissionOverwrites
  };
  if (CONFIG.requestCategoryId) createOptions.parent = CONFIG.requestCategoryId;

  let channel;
  try {
    channel = await guild.channels.create(createOptions);
  } catch (error) {
    createOptions.name = sanitizeChannelName(request.username).replace(/[^a-z0-9\-_]/g, '-').replace(/-+/g, '-');
    channel = await guild.channels.create(createOptions);
  }

  await channel.send({
    content: `<@${request.userId}> <@&${CONFIG.roles.owner}> <@&${CONFIG.roles.admin}>`,
    embeds: [
      new EmbedBuilder()
        .setTitle(`🕝📌 FreshStart Request Channel • ${request.id}`)
        .setColor(request.priority ? 0xf1c40f : 0x2ecc71)
        .setDescription(`This private channel was created for the client and Owner/Admin team.\n\n**Claimed by:** <@${claimedByUser.id}>\n**Priority:** ${request.priority ? '✅ Yes' : 'No'}`),
      requestEmbed(request, guild)
    ]
  });

  return channel;
}

async function updateRequestInDb(requestId, updater) {
  const db = loadDb();
  const index = db.requests.findIndex(req => req.id === requestId);
  if (index === -1) return null;
  const updated = updater(db.requests[index]) || db.requests[index];
  db.requests[index] = updated;
  saveDb(db);
  return updated;
}

async function handleRequestStart(interaction) {
  pendingSelections.set(interaction.user.id, { serviceKey: null, addons: [] });
  await interaction.reply({
    content: 'Choose your package first. Add-ons are optional. Then press **Continue to Notes + Location**.',
    components: buildRequestComponents(interaction.user.id),
    ephemeral: true
  });
}

async function handleSelectService(interaction) {
  const existing = pendingSelections.get(interaction.user.id) || { addons: [] };
  existing.serviceKey = interaction.values[0];
  pendingSelections.set(interaction.user.id, existing);
  await interaction.update({
    content: `Selected service: **${serviceLabel(existing.serviceKey)}**\nAdd-ons are optional.`,
    components: buildRequestComponents(interaction.user.id)
  });
}

async function handleSelectAddons(interaction) {
  const existing = pendingSelections.get(interaction.user.id) || { serviceKey: null, addons: [] };
  existing.addons = interaction.values || [];
  pendingSelections.set(interaction.user.id, existing);
  const labels = addonLabels(existing.addons);
  await interaction.update({
    content: `${existing.serviceKey ? `Selected service: **${serviceLabel(existing.serviceKey)}**\n` : ''}Selected add-ons: ${labels.length ? labels.join(', ') : 'None'}`,
    components: buildRequestComponents(interaction.user.id)
  });
}

async function handleRequestContinue(interaction) {
  const pending = pendingSelections.get(interaction.user.id);
  if (!pending?.serviceKey) {
    await interaction.reply({ content: 'Pick a service package first.', ephemeral: true });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId('fs_request_modal')
    .setTitle('FreshStart Co. Request');

  const irlName = new TextInputBuilder()
    .setCustomId('irlName')
    .setLabel('Your name / household name')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(80);

  const location = new TextInputBuilder()
    .setCustomId('location')
    .setLabel('Location/address/area in PSL')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(120);

  const preferredDateTime = new TextInputBuilder()
    .setCustomId('preferredDateTime')
    .setLabel('Preferred date/time')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(100);

  const tip = new TextInputBuilder()
    .setCustomId('tip')
    .setLabel('Optional tip / budget notes')
    .setPlaceholder('Optional. Example: $20 tip if completed today.')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(100);

  const notes = new TextInputBuilder()
    .setCustomId('notes')
    .setLabel('Additional notes')
    .setPlaceholder('Pets, gate code, rooms to avoid, special instructions, etc.')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(900);

  modal.addComponents(
    new ActionRowBuilder().addComponents(irlName),
    new ActionRowBuilder().addComponents(location),
    new ActionRowBuilder().addComponents(preferredDateTime),
    new ActionRowBuilder().addComponents(tip),
    new ActionRowBuilder().addComponents(notes)
  );

  await interaction.showModal(modal);
}

async function handleRequestModal(interaction) {
  const guild = interaction.guild || await client.guilds.fetch(CONFIG.guildId);
  const member = await guild.members.fetch(interaction.user.id).catch(() => null);
  const pending = pendingSelections.get(interaction.user.id);
  if (!pending?.serviceKey) {
    await interaction.reply({ content: 'Your request session expired. Please press the request button again.', ephemeral: true });
    return;
  }

  const request = {
    id: nextId('FS'),
    userId: interaction.user.id,
    username: interaction.user.username,
    serviceKey: pending.serviceKey,
    addons: pending.addons || [],
    irlName: interaction.fields.getTextInputValue('irlName'),
    location: interaction.fields.getTextInputValue('location'),
    preferredDateTime: interaction.fields.getTextInputValue('preferredDateTime') || '',
    tip: interaction.fields.getTextInputValue('tip') || '',
    notes: interaction.fields.getTextInputValue('notes') || '',
    priority: member ? hasRole(member, CONFIG.roles.priority) : false,
    status: 'pending',
    createdAt: new Date().toISOString(),
    claimedBy: null,
    requestChannelId: null,
    clientNoteMessageId: null
  };

  if (member) {
    await member.roles.add(CONFIG.roles.client, 'FreshStart service request submitted').catch(() => null);
  }

  const clientNoteMessageId = await postClientNote(guild, request).catch(() => null);
  request.clientNoteMessageId = clientNoteMessageId;

  const db = loadDb();
  db.requests.push(request);
  saveDb(db);

  await notifyAdminsOfRequest(guild, request);
  await logEvent(guild, 'New Service Request', `<@${request.userId}> submitted ${serviceLabel(request.serviceKey)}.`, [
    { name: 'Request ID', value: request.id, inline: true },
    { name: 'Priority', value: request.priority ? 'Yes' : 'No', inline: true },
    { name: 'Location', value: request.location, inline: false }
  ]);
  await updateMoneyDashboard(guild).catch(() => null);

  pendingSelections.delete(interaction.user.id);

  await interaction.reply({
    content: `✅ Your FreshStart request was sent to our Owner/Admin team.\n\n**Request ID:** ${request.id}\n**Service:** ${serviceLabel(request.serviceKey)}${request.priority ? '\n⭐ Priority status detected.' : ''}`,
    ephemeral: true
  });
}

async function handleClaimRequest(interaction, requestId) {
  const guild = await client.guilds.fetch(CONFIG.guildId);
  const adminMember = await guild.members.fetch(interaction.user.id).catch(() => null);
  if (!adminMember || !isOwnerAdmin(adminMember)) {
    await interaction.reply({ content: 'Only Owner/Admin can claim requests.' });
    return;
  }

  const db = loadDb();
  const request = db.requests.find(req => req.id === requestId);
  if (!request) {
    await interaction.reply({ content: 'Request not found.' });
    return;
  }
  if (request.status !== 'pending') {
    await interaction.reply({ content: `This request is already ${request.status}${request.claimedBy ? ` by <@${request.claimedBy}>` : ''}.` });
    return;
  }

  request.status = 'claimed';
  request.claimedBy = interaction.user.id;
  request.claimedAt = new Date().toISOString();
  const channel = await createRequestChannel(guild, request, interaction.user);
  request.requestChannelId = channel.id;
  saveDb(db);

  await logEvent(guild, 'Request Claimed', `${interaction.user} claimed request ${request.id}.`, [
    { name: 'Client', value: `<@${request.userId}>`, inline: true },
    { name: 'Channel', value: `<#${channel.id}>`, inline: true },
    { name: 'Priority', value: request.priority ? 'Yes' : 'No', inline: true }
  ]);
  await updateMoneyDashboard(guild).catch(() => null);

  const clientUser = await client.users.fetch(request.userId).catch(() => null);
  if (clientUser) {
    await clientUser.send(`✅ Your FreshStart Co. request **${request.id}** was accepted. A private request channel was created in the server: <#${channel.id}>`).catch(() => null);
  }

  await interaction.reply({ content: `✅ Claimed ${request.id}. Private channel created: <#${channel.id}>` });
}

async function handleCancelRequestButton(interaction, requestId) {
  const guild = await client.guilds.fetch(CONFIG.guildId);
  const adminMember = await guild.members.fetch(interaction.user.id).catch(() => null);
  if (!adminMember || !isOwnerAdmin(adminMember)) {
    await interaction.reply({ content: 'Only Owner/Admin can cancel requests.' });
    return;
  }

  const db = loadDb();
  const request = db.requests.find(req => req.id === requestId);
  if (!request) {
    await interaction.reply({ content: 'Request not found.' });
    return;
  }
  request.status = 'cancelled';
  request.cancelledBy = interaction.user.id;
  request.cancelledAt = new Date().toISOString();
  saveDb(db);

  await logEvent(guild, 'Request Cancelled', `${interaction.user} cancelled request ${request.id}.`, [
    { name: 'Client', value: `<@${request.userId}>`, inline: true },
    { name: 'Service', value: serviceLabel(request.serviceKey), inline: true }
  ]);
  await updateMoneyDashboard(guild).catch(() => null);
  await interaction.reply({ content: `❌ Cancelled request ${request.id}.` });
}

function parseDate(dateString) {
  const [year, month, day] = (dateString || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

function dateKey(date = new Date(), timeZone = 'America/New_York') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function daysFromToday(dateString) {
  const target = parseDate(dateString);
  if (!target) return Infinity;
  const today = parseDate(dateKey());
  return Math.floor((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

async function createOrUpdateJobMessage(guild, job) {
  if (job.kind !== 'client' && job.kind !== 'worker') return;
  const days = daysFromToday(job.date);
  if (days < 0 || days > 60) return;
  const channel = await fetchChannel(guild, CONFIG.channels.jobBoard);
  if (!channel) return;
  const payload = { embeds: [scheduleEmbed(job)] };
  if (job.jobBoardMessageId) {
    try {
      const msg = await channel.messages.fetch(job.jobBoardMessageId);
      await msg.edit(payload);
      return msg.id;
    } catch {
      // repost
    }
  }
  const msg = await channel.send(payload);
  return msg.id;
}

function jobsForRange(range) {
  const db = loadDb();
  const maxDays = range === 'today' ? 0 : range === 'week' ? 7 : 60;
  return db.schedules
    .filter(job => job.status !== 'cancelled' && job.status !== 'completed')
    .filter(job => {
      const days = daysFromToday(job.date);
      return days >= 0 && days <= maxDays;
    })
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function jobLine(job) {
  return `• **${job.date} ${job.time}** — ${job.kind} — <@${job.userId}> — ${serviceLabel(job.serviceKey)}${job.location ? ` — ${job.location}` : ''} \`${job.id}\``;
}

function makeJobBoardEmbed() {
  const today = jobsForRange('today').slice(0, 10);
  const week = jobsForRange('week').slice(0, 15);
  const months = jobsForRange('months').slice(0, 20);
  return new EmbedBuilder()
    .setTitle('📋 FreshStart Co.™ Job Board')
    .setColor(0x3498db)
    .setDescription('Automatically updated from scheduling. Shows jobs and worker shifts up to 2 months ahead.')
    .addFields(
      { name: 'Today', value: today.length ? today.map(jobLine).join('\n').slice(0, 1024) : 'No jobs scheduled today.' },
      { name: 'This Week', value: week.length ? week.map(jobLine).join('\n').slice(0, 1024) : 'No jobs scheduled this week.' },
      { name: 'Next 2 Months', value: months.length ? months.map(jobLine).join('\n').slice(0, 1024) : 'No jobs scheduled in the next 2 months.' }
    )
    .setTimestamp();
}

async function refreshJobBoard(guild) {
  const db = loadDb();
  const channel = await fetchChannel(guild, CONFIG.channels.jobBoard);
  if (!channel) return;
  const message = await postOrEditMessage(channel, db.settings.jobBoardDashboardMessageId, { embeds: [makeJobBoardEmbed()] });
  db.settings.jobBoardDashboardMessageId = message.id;
  saveDb(db);
}

async function handleScheduleAdd(interaction) {
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!isManagerPlus(member)) {
    await interaction.reply({ content: 'Only Manager/Admin/Owner can add schedules.', ephemeral: true });
    return;
  }

  const date = interaction.options.getString('date', true);
  if (!parseDate(date)) {
    await interaction.reply({ content: 'Use date format YYYY-MM-DD.', ephemeral: true });
    return;
  }

  const person = interaction.options.getUser('person', true);
  const kind = interaction.options.getString('kind', true);
  const serviceKey = interaction.options.getString('service', true);
  const job = {
    id: nextId('SCH'),
    kind,
    userId: person.id,
    username: person.username,
    date,
    time: interaction.options.getString('time', true),
    serviceKey,
    location: interaction.options.getString('location') || '',
    irlName: interaction.options.getString('irl-name') || '',
    estimatedPrice: interaction.options.getNumber('estimated-price') ?? SERVICES[serviceKey]?.estimate ?? 0,
    notes: interaction.options.getString('notes') || '',
    status: 'scheduled',
    createdBy: interaction.user.id,
    createdAt: new Date().toISOString(),
    jobBoardMessageId: null
  };

  const msgId = await createOrUpdateJobMessage(interaction.guild, job).catch(() => null);
  job.jobBoardMessageId = msgId;

  const db = loadDb();
  db.schedules.push(job);
  saveDb(db);

  await refreshJobBoard(interaction.guild).catch(() => null);
  await updateMoneyDashboard(interaction.guild).catch(() => null);

  const schedulingChannel = await fetchChannel(interaction.guild, CONFIG.channels.scheduling);
  if (schedulingChannel) await schedulingChannel.send({ embeds: [scheduleEmbed(job)] }).catch(() => null);

  await logEvent(interaction.guild, 'Schedule Added', `${interaction.user} added schedule ${job.id}.`, [
    { name: 'Person', value: `<@${job.userId}>`, inline: true },
    { name: 'Service', value: serviceLabel(job.serviceKey), inline: true },
    { name: 'Date/Time', value: `${job.date} ${job.time}`, inline: true }
  ]);

  await interaction.reply({ content: `✅ Schedule added: \`${job.id}\``, ephemeral: true });
}

async function handleScheduleUpdate(interaction) {
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!isManagerPlus(member)) {
    await interaction.reply({ content: 'Only Manager/Admin/Owner can update schedules.', ephemeral: true });
    return;
  }

  const id = interaction.options.getString('schedule-id', true);
  const db = loadDb();
  const job = db.schedules.find(item => item.id === id);
  if (!job) {
    await interaction.reply({ content: 'Schedule not found.', ephemeral: true });
    return;
  }

  const newDate = interaction.options.getString('date');
  if (newDate && !parseDate(newDate)) {
    await interaction.reply({ content: 'Use date format YYYY-MM-DD.', ephemeral: true });
    return;
  }

  job.status = interaction.options.getString('status') || job.status;
  job.date = newDate || job.date;
  job.time = interaction.options.getString('time') || job.time;
  job.location = interaction.options.getString('location') ?? job.location;
  job.estimatedPrice = interaction.options.getNumber('estimated-price') ?? job.estimatedPrice;
  job.notes = interaction.options.getString('notes') ?? job.notes;
  job.updatedBy = interaction.user.id;
  job.updatedAt = new Date().toISOString();

  const msgId = await createOrUpdateJobMessage(interaction.guild, job).catch(() => null);
  if (msgId) job.jobBoardMessageId = msgId;

  if (job.status === 'completed') {
    db.transactions.push({
      id: nextId('PAY'),
      jobId: job.id,
      requestId: null,
      userId: job.userId,
      irlName: job.irlName || '',
      location: job.location || '',
      serviceKey: job.serviceKey,
      amount: Number(job.estimatedPrice || SERVICES[job.serviceKey]?.estimate || 0),
      status: 'completed',
      completedBy: interaction.user.id,
      completedAt: new Date().toISOString(),
      notes: job.notes || ''
    });
  }

  saveDb(db);
  await refreshJobBoard(interaction.guild).catch(() => null);
  await updateMoneyDashboard(interaction.guild).catch(() => null);
  await logEvent(interaction.guild, 'Schedule Updated', `${interaction.user} updated schedule ${job.id}.`, [
    { name: 'Status', value: job.status, inline: true },
    { name: 'Date/Time', value: `${job.date} ${job.time}`, inline: true }
  ]);
  await interaction.reply({ content: `✅ Schedule updated: \`${job.id}\``, ephemeral: true });
}

async function handleScheduleRemove(interaction) {
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!isManagerPlus(member)) {
    await interaction.reply({ content: 'Only Manager/Admin/Owner can remove schedules.', ephemeral: true });
    return;
  }

  const id = interaction.options.getString('schedule-id', true);
  const reason = interaction.options.getString('reason') || 'No reason provided.';
  const db = loadDb();
  const job = db.schedules.find(item => item.id === id);
  if (!job) {
    await interaction.reply({ content: 'Schedule not found.', ephemeral: true });
    return;
  }
  job.status = 'cancelled';
  job.cancelledBy = interaction.user.id;
  job.cancelledAt = new Date().toISOString();
  job.cancelReason = reason;
  saveDb(db);

  if (job.jobBoardMessageId) {
    const channel = await fetchChannel(interaction.guild, CONFIG.channels.jobBoard);
    const message = await channel?.messages.fetch(job.jobBoardMessageId).catch(() => null);
    await message?.edit({ embeds: [scheduleEmbed(job)] }).catch(() => null);
  }

  await refreshJobBoard(interaction.guild).catch(() => null);
  await updateMoneyDashboard(interaction.guild).catch(() => null);
  await logEvent(interaction.guild, 'Schedule Cancelled', `${interaction.user} cancelled schedule ${job.id}.`, [
    { name: 'Reason', value: reason }
  ]);
  await interaction.reply({ content: `❌ Schedule cancelled: \`${job.id}\``, ephemeral: true });
}

async function handleScheduleList(interaction) {
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!isHelperPlus(member)) {
    await interaction.reply({ content: 'Only Helper or higher can view schedules.', ephemeral: true });
    return;
  }
  const range = interaction.options.getString('range', true);
  const jobs = jobsForRange(range).slice(0, 25);
  const embed = new EmbedBuilder()
    .setTitle(`📆 FreshStart Schedule • ${range}`)
    .setColor(0x3498db)
    .setDescription(jobs.length ? jobs.map(jobLine).join('\n').slice(0, 4000) : 'No jobs found for this range.')
    .setTimestamp();
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleOnCall(interaction) {
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!isHelperPlus(member)) {
    await interaction.reply({ content: 'Only Helper or higher can check on-call status.', ephemeral: true });
    return;
  }
  const user = interaction.options.getUser('person') || interaction.user;
  const db = loadDb();
  const jobs = db.schedules
    .filter(job => job.userId === user.id)
    .filter(job => job.status === 'scheduled' || job.status === 'in_progress')
    .filter(job => daysFromToday(job.date) >= 0 && daysFromToday(job.date) <= 60)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .slice(0, 10);

  const embed = new EmbedBuilder()
    .setTitle(`🕝 On-Call / Schedule Check`)
    .setColor(0x00cec9)
    .setDescription(jobs.length ? jobs.map(jobLine).join('\n') : `${user} has no upcoming on-call/job entries in the next 2 months.`)
    .setFooter({ text: 'Visible to Helper role or higher.' });
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleCompleted(interaction) {
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!isManagerPlus(member)) {
    await interaction.reply({ content: 'Only Manager/Admin/Owner can record completed jobs.', ephemeral: true });
    return;
  }

  const clientUser = interaction.options.getUser('client', true);
  const serviceKey = interaction.options.getString('service', true);
  const amount = interaction.options.getNumber('amount') ?? SERVICES[serviceKey]?.estimate ?? 0;
  const scheduleId = interaction.options.getString('schedule-id');
  const record = {
    id: nextId('PAY'),
    jobId: scheduleId || null,
    requestId: null,
    userId: clientUser.id,
    irlName: interaction.options.getString('irl-name', true),
    location: interaction.options.getString('location', true),
    serviceKey,
    amount: Number(amount),
    status: 'completed',
    completedBy: interaction.user.id,
    completedAt: new Date().toISOString(),
    notes: interaction.options.getString('notes') || ''
  };

  const db = loadDb();
  if (scheduleId) {
    const job = db.schedules.find(item => item.id === scheduleId);
    if (job) {
      job.status = 'completed';
      job.completedBy = interaction.user.id;
      job.completedAt = new Date().toISOString();
      job.estimatedPrice = record.amount;
      if (job.jobBoardMessageId) {
        const board = await fetchChannel(interaction.guild, CONFIG.channels.jobBoard);
        const msg = await board?.messages.fetch(job.jobBoardMessageId).catch(() => null);
        await msg?.edit({ embeds: [scheduleEmbed(job)] }).catch(() => null);
      }
    }
  }
  db.transactions.push(record);
  saveDb(db);

  const completedChannel = await fetchChannel(interaction.guild, CONFIG.channels.completedJobs);
  const embed = new EmbedBuilder()
    .setTitle('✅ Completed FreshStart Job')
    .setColor(0x2ecc71)
    .addFields(
      { name: 'Client', value: `${record.irlName}\n<@${record.userId}>`, inline: true },
      { name: 'Location', value: record.location, inline: true },
      { name: 'Service', value: serviceLabel(record.serviceKey), inline: true },
      { name: 'Amount', value: formatCurrency(record.amount), inline: true },
      { name: 'Completed By', value: `<@${record.completedBy}>`, inline: true },
      { name: 'Notes', value: record.notes || 'None', inline: false }
    )
    .setTimestamp();
  await completedChannel?.send({ embeds: [embed] }).catch(() => null);

  await refreshJobBoard(interaction.guild).catch(() => null);
  await updateMoneyDashboard(interaction.guild).catch(() => null);
  await logEvent(interaction.guild, 'Completed Job Recorded', `${interaction.user} recorded a completed job.`, [
    { name: 'Client', value: `<@${record.userId}>`, inline: true },
    { name: 'Amount', value: formatCurrency(record.amount), inline: true },
    { name: 'Service', value: serviceLabel(record.serviceKey), inline: true }
  ]);

  await interaction.reply({ content: `✅ Completed job posted and tracked: ${formatCurrency(record.amount)}`, ephemeral: true });
}

async function handleTraining(interaction) {
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!isOwnerAdmin(member)) {
    await interaction.reply({ content: 'Only Owner/Admin can use training controls.', ephemeral: true });
    return;
  }

  const targetUser = interaction.options.getUser('person', true);
  const action = interaction.options.getString('action', true);
  const reason = interaction.options.getString('reason') || 'No reason provided.';
  const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!targetMember) {
    await interaction.reply({ content: 'Could not find that member in the server.', ephemeral: true });
    return;
  }

  let description = '';
  if (action === 'make_trial') {
    await targetMember.roles.remove(CONFIG.roles.client, 'Training: moved to Trial Helper').catch(() => null);
    await targetMember.roles.add(CONFIG.roles.trialHelper, 'Training: moved to Trial Helper').catch(() => null);
    description = `${targetUser} was moved from Client to Trial Helper.`;
  } else if (action === 'raise_helper') {
    await targetMember.roles.remove(CONFIG.roles.trialHelper, 'Training: raised to Helper').catch(() => null);
    await targetMember.roles.add(CONFIG.roles.helper, 'Training: raised to Helper').catch(() => null);
    description = `${targetUser} was raised to Helper.`;
  } else if (action === 'stop') {
    await targetMember.roles.remove([CONFIG.roles.helper, CONFIG.roles.trialHelper], 'Training: stopped/paused').catch(() => null);
    description = `${targetUser} was stopped/paused from staff roles.`;
  } else if (action === 'fire') {
    await targetMember.roles.remove([CONFIG.roles.helper, CONFIG.roles.trialHelper, CONFIG.roles.teamLead], 'Training: fired').catch(() => null);
    await targetMember.roles.add(CONFIG.roles.newComer, 'Training: fired/staff access removed').catch(() => null);
    description = `${targetUser} was fired and staff access was removed.`;
  }

  const trainingChannel = await fetchChannel(interaction.guild, CONFIG.channels.training);
  const embed = new EmbedBuilder()
    .setTitle('🎓 FreshStart Training Update')
    .setColor(0x9b59b6)
    .setDescription(description)
    .addFields(
      { name: 'Action', value: action, inline: true },
      { name: 'Handled By', value: `${interaction.user}`, inline: true },
      { name: 'Reason/Notes', value: reason }
    )
    .setTimestamp();
  await trainingChannel?.send({ embeds: [embed] }).catch(() => null);
  await logEvent(interaction.guild, 'Training Updated', description, [
    { name: 'Reason/Notes', value: reason }
  ]);
  await interaction.reply({ content: `✅ ${description}`, ephemeral: true });
}

function moneySummary() {
  const db = loadDb();
  const completed = db.transactions.filter(t => t.status === 'completed');
  const completedTotal = completed.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const upcomingJobs = db.schedules.filter(job => job.status === 'scheduled' || job.status === 'in_progress');
  const upcomingTotal = upcomingJobs.reduce((sum, job) => sum + Number(job.estimatedPrice || SERVICES[job.serviceKey]?.estimate || 0), 0);

  const pendingRequests = db.requests.filter(req => req.status === 'pending' || req.status === 'claimed');
  const pendingTotal = pendingRequests.reduce((sum, req) => sum + Number(SERVICES[req.serviceKey]?.estimate || 0), 0);

  const cancelledJobs = db.schedules.filter(job => job.status === 'cancelled').length;
  const cancelledRequests = db.requests.filter(req => req.status === 'cancelled').length;

  return {
    completedCount: completed.length,
    completedTotal,
    upcomingCount: upcomingJobs.length,
    upcomingTotal,
    pendingRequests: pendingRequests.length,
    pendingTotal,
    cancelledCount: cancelledJobs + cancelledRequests
  };
}

function moneyDashboardEmbed() {
  const summary = moneySummary();
  return new EmbedBuilder()
    .setTitle('💰 FreshStart Co.™ Money Tracker')
    .setColor(0x27ae60)
    .setDescription('Automatically calculated from completed jobs, schedules, and requests. Payment processing is separate.')
    .addFields(
      { name: 'Completed Jobs', value: `${summary.completedCount} jobs\n${formatCurrency(summary.completedTotal)} earned/tracked`, inline: true },
      { name: 'Upcoming/In Progress', value: `${summary.upcomingCount} scheduled\n${formatCurrency(summary.upcomingTotal)} estimated`, inline: true },
      { name: 'Pending/Claimed Requests', value: `${summary.pendingRequests} requests\n${formatCurrency(summary.pendingTotal)} base estimate`, inline: true },
      { name: 'Cancelled', value: `${summary.cancelledCount} cancelled items`, inline: true }
    )
    .setFooter({ text: 'Use /money for private details.' })
    .setTimestamp();
}

async function updateMoneyDashboard(guild) {
  const db = loadDb();
  const channel = await fetchChannel(guild, CONFIG.channels.moneyTracker);
  if (!channel) return;
  const message = await postOrEditMessage(channel, db.settings.moneyDashboardMessageId, { embeds: [moneyDashboardEmbed()] });
  db.settings.moneyDashboardMessageId = message.id;
  saveDb(db);
}

async function handleMoney(interaction) {
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!isManagerPlus(member)) {
    await interaction.reply({ content: 'Only Manager/Admin/Owner can view money tracker.', ephemeral: true });
    return;
  }

  const view = interaction.options.getString('view', true);
  const db = loadDb();
  let description = '';
  if (view === 'summary') {
    await interaction.reply({ embeds: [moneyDashboardEmbed()], ephemeral: true });
    return;
  }
  if (view === 'completed') {
    const items = db.transactions.filter(t => t.status === 'completed').slice(-20).reverse();
    description = items.length ? items.map(t => `• ${formatCurrency(t.amount)} — <@${t.userId}> — ${serviceLabel(t.serviceKey)} — ${new Date(t.completedAt).toLocaleDateString()} \`${t.id}\``).join('\n') : 'No completed jobs tracked yet.';
  } else if (view === 'upcoming') {
    const items = db.schedules.filter(job => job.status === 'scheduled' || job.status === 'in_progress').slice(0, 20);
    description = items.length ? items.map(job => `• ${formatCurrency(job.estimatedPrice || SERVICES[job.serviceKey]?.estimate || 0)} — <@${job.userId}> — ${serviceLabel(job.serviceKey)} — ${job.date} ${job.time} \`${job.id}\``).join('\n') : 'No upcoming/in-progress estimates.';
  } else if (view === 'cancelled') {
    const jobs = db.schedules.filter(job => job.status === 'cancelled').slice(-10).reverse();
    const reqs = db.requests.filter(req => req.status === 'cancelled').slice(-10).reverse();
    description = [
      ...jobs.map(job => `• Cancelled schedule — <@${job.userId}> — ${serviceLabel(job.serviceKey)} \`${job.id}\``),
      ...reqs.map(req => `• Cancelled request — <@${req.userId}> — ${serviceLabel(req.serviceKey)} \`${req.id}\``)
    ].join('\n') || 'No cancelled items.';
  }

  const embed = new EmbedBuilder()
    .setTitle(`💰 Money Tracker • ${view}`)
    .setColor(0x27ae60)
    .setDescription(description.slice(0, 4000));
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleSupplies(interaction) {
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!isManagerPlus(member)) {
    await interaction.reply({ content: 'Only Manager/Admin/Owner can post supplies panels.', ephemeral: true });
    return;
  }

  const service = interaction.options.getString('service', true);
  const supplies = interaction.options.getString('supplies-needed', true);
  const restock = interaction.options.getBoolean('restock-needed', true);
  const notes = interaction.options.getString('notes') || 'None';
  const channel = await fetchChannel(interaction.guild, CONFIG.channels.cleaningChecklists);
  if (!channel) {
    await interaction.reply({ content: 'Cleaning checklists channel not found.', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🧽 Job Supplies / Restock Panel')
    .setColor(restock ? 0xe67e22 : 0x2ecc71)
    .addFields(
      { name: 'Service / Job', value: service, inline: true },
      { name: 'Restock Needed?', value: restock ? '✅ Yes' : 'No', inline: true },
      { name: 'Supplies Needed', value: supplies },
      { name: 'Notes', value: notes },
      { name: 'Posted By', value: `${interaction.user}`, inline: true }
    )
    .setTimestamp();
  await channel.send({ embeds: [embed] });
  await logEvent(interaction.guild, 'Supplies Panel Posted', `${interaction.user} posted supplies for ${service}.`, [
    { name: 'Restock Needed?', value: restock ? 'Yes' : 'No', inline: true }
  ]);
  await interaction.reply({ content: `✅ Supplies panel posted in <#${channel.id}>.`, ephemeral: true });
}

async function handleHours(interaction) {
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!isOwnerAdmin(member)) {
    await interaction.reply({ content: 'Only Owner/Admin can toggle hours announcements.', ephemeral: true });
    return;
  }
  const enabled = interaction.options.getBoolean('enabled', true);
  const db = loadDb();
  db.settings.hoursAnnouncementsEnabled = enabled;
  saveDb(db);
  await logEvent(interaction.guild, 'Hours Announcement Toggle', `${interaction.user} turned daily open/close announcements **${enabled ? 'ON' : 'OFF'}**.`);
  await interaction.reply({ content: `✅ Daily open/close announcements are now **${enabled ? 'ON' : 'OFF'}**.`, ephemeral: true });
}

async function handleCancelRequestCommand(interaction) {
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!isOwnerAdmin(member)) {
    await interaction.reply({ content: 'Only Owner/Admin can cancel requests.', ephemeral: true });
    return;
  }
  const id = interaction.options.getString('request-id', true);
  const reason = interaction.options.getString('reason') || 'No reason provided.';
  const db = loadDb();
  const req = db.requests.find(r => r.id === id);
  if (!req) {
    await interaction.reply({ content: 'Request not found.', ephemeral: true });
    return;
  }
  req.status = 'cancelled';
  req.cancelledBy = interaction.user.id;
  req.cancelledAt = new Date().toISOString();
  req.cancelReason = reason;
  saveDb(db);
  await logEvent(interaction.guild, 'Request Cancelled', `${interaction.user} cancelled request ${id}.`, [{ name: 'Reason', value: reason }]);
  await updateMoneyDashboard(interaction.guild).catch(() => null);
  await interaction.reply({ content: `❌ Request cancelled: \`${id}\``, ephemeral: true });
}

async function checkOpenCloseAnnouncements() {
  const guild = await client.guilds.fetch(CONFIG.guildId).catch(() => null);
  if (!guild) return;
  const db = loadDb();
  if (!db.settings.hoursAnnouncementsEnabled) return;

  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  }).formatToParts(now).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  const time = `${parts.hour}:${parts.minute}`;
  const today = dateKey(now);
  const channel = await fetchChannel(guild, CONFIG.channels.announcements);
  if (!channel) return;

  if (time === '08:00' && db.settings.lastOpenDate !== today) {
    await channel.send('🟢 **FreshStart Co.™ is OPEN.** We are Open from **8:00 AM EST to 8:30 PM EST**.');
    db.settings.lastOpenDate = today;
    saveDb(db);
    await logEvent(guild, 'Open Announcement Sent', 'Daily open message was posted automatically.');
  }

  if (time === '20:30' && db.settings.lastCloseDate !== today) {
    await channel.send('🔴 **FreshStart Co.™ is now CLOSED.** We will reopen at **8:00 AM EST**.');
    db.settings.lastCloseDate = today;
    saveDb(db);
    await logEvent(guild, 'Close Announcement Sent', 'Daily close message was posted automatically.');
  }
}

async function handleClientRoleRevoked(oldMember, newMember) {
  const hadClient = oldMember.roles.cache.has(CONFIG.roles.client);
  const hasClientNow = newMember.roles.cache.has(CONFIG.roles.client);
  if (!hadClient || hasClientNow) return;

  const db = loadDb();
  const affected = db.requests.filter(req => req.userId === newMember.id && req.clientNoteMessageId);
  if (!affected.length) return;

  const channel = await fetchChannel(newMember.guild, CONFIG.channels.clientNotes);
  for (const req of affected) {
    const msg = await channel?.messages.fetch(req.clientNoteMessageId).catch(() => null);
    await msg?.delete().catch(() => null);
    req.clientNoteMessageId = null;
    req.clientNoteDeletedAt = new Date().toISOString();
  }
  saveDb(db);
  await logEvent(newMember.guild, 'Client Notes Removed', `Client role was revoked from <@${newMember.id}>. Client notes were removed.`, [
    { name: 'Notes Removed', value: String(affected.length), inline: true }
  ]);
}

client.once('ready', async () => {
  console.log(`FreshStart Co. bot online as ${client.user.tag}`);
  const guild = await client.guilds.fetch(CONFIG.guildId).catch(() => null);
  if (guild) {
    await refreshJobBoard(guild).catch(error => console.error('Job board refresh failed:', error));
    await updateMoneyDashboard(guild).catch(error => console.error('Money dashboard update failed:', error));
    if (CONFIG.autoSetup) {
      await postPanels(guild, 'all').catch(error => console.error('Auto setup failed:', error));
    }
  }
  setInterval(() => checkOpenCloseAnnouncements().catch(console.error), 60 * 1000);
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
  handleClientRoleRevoked(oldMember, newMember).catch(console.error);
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isButton()) {
      if (interaction.customId === 'fs_request_start') return await handleRequestStart(interaction);
      if (interaction.customId === 'fs_agreement_start') return await handleAgreementStart(interaction);
      if (interaction.customId === 'fs_request_continue') return await handleRequestContinue(interaction);
      if (interaction.customId.startsWith('fs_claim_request:')) {
        return await handleClaimRequest(interaction, interaction.customId.split(':')[1]);
      }
      if (interaction.customId.startsWith('fs_cancel_request:')) {
        return await handleCancelRequestButton(interaction, interaction.customId.split(':')[1]);
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'fs_select_service') return await handleSelectService(interaction);
      if (interaction.customId === 'fs_select_addons') return await handleSelectAddons(interaction);
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'fs_request_modal') return await handleRequestModal(interaction);
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.commandName;
    if (command === 'setup-panels') {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (!isOwnerAdmin(member)) {
        await interaction.reply({ content: 'Only Owner/Admin can post setup panels.', ephemeral: true });
        return;
      }
      const panel = interaction.options.getString('panel', true);
      await postPanels(interaction.guild, panel);
      await interaction.reply({ content: `✅ Posted/updated panel: **${panel}**`, ephemeral: true });
    } else if (command === 'hours') {
      await handleHours(interaction);
    } else if (command === 'schedule-add') {
      await handleScheduleAdd(interaction);
    } else if (command === 'schedule-update') {
      await handleScheduleUpdate(interaction);
    } else if (command === 'schedule-remove') {
      await handleScheduleRemove(interaction);
    } else if (command === 'schedule-list') {
      await handleScheduleList(interaction);
    } else if (command === 'oncall') {
      await handleOnCall(interaction);
    } else if (command === 'completed') {
      await handleCompleted(interaction);
    } else if (command === 'training') {
      await handleTraining(interaction);
    } else if (command === 'money') {
      await handleMoney(interaction);
    } else if (command === 'supplies') {
      await handleSupplies(interaction);
    } else if (command === 'cancel-request') {
      await handleCancelRequestCommand(interaction);
    }
  } catch (error) {
    console.error(error);
    const message = 'Something went wrong. Check the bot console/logs.';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: message, ephemeral: true }).catch(() => null);
    } else {
      await interaction.reply({ content: message, ephemeral: true }).catch(() => null);
    }
  }
});

if (!process.env.DISCORD_TOKEN || !CONFIG.guildId) {
  console.error('Missing DISCORD_TOKEN or GUILD_ID in .env');
  process.exit(1);
}

startAgreementWebServer();
client.login(process.env.DISCORD_TOKEN);
