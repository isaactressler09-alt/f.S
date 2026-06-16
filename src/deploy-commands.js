require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const serviceChoices = [
  { name: 'Quick Fresh Reset — $95', value: 'quick' },
  { name: 'Standard Home Reset — $149', value: 'standard' },
  { name: 'Full FreshStart — $230', value: 'full' },
  { name: 'First-Time Deep Reset — $299-$399', value: 'deep' },
  { name: 'FreshStart Weekly — $299/month', value: 'weekly' },
  { name: 'FreshStart Plus — $429/month', value: 'plus' },
  { name: 'FreshStart Complete — $599/month', value: 'complete' },
  { name: 'Hurricane Prep Help — $75-$200', value: 'hurricane_prep' },
  { name: 'Post-Storm Reset — $100-$300', value: 'post_storm' }
];

const commands = [
  new SlashCommandBuilder()
    .setName('setup-panels')
    .setDescription('Post FreshStart Co. panels into the correct channels.')
    .addStringOption(option => option
      .setName('panel')
      .setDescription('Which panel to post')
      .setRequired(true)
      .addChoices(
        { name: 'All panels', value: 'all' },
        { name: 'Agreement signing panel', value: 'agreement' },
        { name: 'Service request panel', value: 'services' },
        { name: 'Cleaning checklists panel', value: 'checklists' },
        { name: 'Safety rules panel', value: 'safety' }
      )),

  new SlashCommandBuilder()
    .setName('hours')
    .setDescription('Toggle daily open/close announcements.')
    .addBooleanOption(option => option
      .setName('enabled')
      .setDescription('Turn daily announcements on or off')
      .setRequired(true)),

  new SlashCommandBuilder()
    .setName('schedule-add')
    .setDescription('Add a client or worker schedule entry.')
    .addUserOption(option => option
      .setName('person')
      .setDescription('Worker or client Discord user')
      .setRequired(true))
    .addStringOption(option => option
      .setName('kind')
      .setDescription('What kind of schedule entry is this?')
      .setRequired(true)
      .addChoices(
        { name: 'Client Job', value: 'client' },
        { name: 'Worker Shift / On Call', value: 'worker' }
      ))
    .addStringOption(option => option
      .setName('date')
      .setDescription('Date in YYYY-MM-DD format')
      .setRequired(true))
    .addStringOption(option => option
      .setName('time')
      .setDescription('Time, for example 9:30 AM or 14:00')
      .setRequired(true))
    .addStringOption(option => option
      .setName('service')
      .setDescription('Service or task')
      .setRequired(true)
      .addChoices(...serviceChoices))
    .addStringOption(option => option
      .setName('location')
      .setDescription('Client location/address/area or shift location')
      .setRequired(false))
    .addStringOption(option => option
      .setName('irl-name')
      .setDescription('Client or worker real name, if needed')
      .setRequired(false))
    .addNumberOption(option => option
      .setName('estimated-price')
      .setDescription('Estimated price for money tracker')
      .setRequired(false))
    .addStringOption(option => option
      .setName('notes')
      .setDescription('Extra schedule notes')
      .setRequired(false)),

  new SlashCommandBuilder()
    .setName('schedule-update')
    .setDescription('Update a schedule entry.')
    .addStringOption(option => option
      .setName('schedule-id')
      .setDescription('Schedule ID, for example SCH-ABC123')
      .setRequired(true))
    .addStringOption(option => option
      .setName('status')
      .setDescription('New status')
      .setRequired(false)
      .addChoices(
        { name: 'Scheduled', value: 'scheduled' },
        { name: 'In Progress', value: 'in_progress' },
        { name: 'Completed', value: 'completed' },
        { name: 'Cancelled', value: 'cancelled' }
      ))
    .addStringOption(option => option
      .setName('date')
      .setDescription('New date in YYYY-MM-DD format')
      .setRequired(false))
    .addStringOption(option => option
      .setName('time')
      .setDescription('New time')
      .setRequired(false))
    .addStringOption(option => option
      .setName('location')
      .setDescription('New location')
      .setRequired(false))
    .addNumberOption(option => option
      .setName('estimated-price')
      .setDescription('New estimated price')
      .setRequired(false))
    .addStringOption(option => option
      .setName('notes')
      .setDescription('New notes')
      .setRequired(false)),

  new SlashCommandBuilder()
    .setName('schedule-remove')
    .setDescription('Cancel/remove a schedule entry.')
    .addStringOption(option => option
      .setName('schedule-id')
      .setDescription('Schedule ID')
      .setRequired(true))
    .addStringOption(option => option
      .setName('reason')
      .setDescription('Reason for removing/cancelling')
      .setRequired(false)),

  new SlashCommandBuilder()
    .setName('schedule-list')
    .setDescription('List schedules by day, week, or 2-month board.')
    .addStringOption(option => option
      .setName('range')
      .setDescription('Time range')
      .setRequired(true)
      .addChoices(
        { name: 'Today', value: 'today' },
        { name: 'This Week', value: 'week' },
        { name: 'Next 2 Months', value: 'months' }
      )),

  new SlashCommandBuilder()
    .setName('oncall')
    .setDescription('Check if you or another worker is on call / scheduled.')
    .addUserOption(option => option
      .setName('person')
      .setDescription('Optional user to check')
      .setRequired(false)),

  new SlashCommandBuilder()
    .setName('completed')
    .setDescription('Mark or record a completed job.')
    .addUserOption(option => option
      .setName('client')
      .setDescription('Client Discord user')
      .setRequired(true))
    .addStringOption(option => option
      .setName('irl-name')
      .setDescription('Client real name')
      .setRequired(true))
    .addStringOption(option => option
      .setName('location')
      .setDescription('Client location/address/area')
      .setRequired(true))
    .addStringOption(option => option
      .setName('service')
      .setDescription('Service completed')
      .setRequired(true)
      .addChoices(...serviceChoices))
    .addNumberOption(option => option
      .setName('amount')
      .setDescription('Amount paid or charged')
      .setRequired(false))
    .addStringOption(option => option
      .setName('schedule-id')
      .setDescription('Optional schedule ID to mark completed')
      .setRequired(false))
    .addStringOption(option => option
      .setName('notes')
      .setDescription('Completion notes')
      .setRequired(false)),

  new SlashCommandBuilder()
    .setName('training')
    .setDescription('Move staff through training, raises, stop, or fire actions.')
    .addUserOption(option => option
      .setName('person')
      .setDescription('Person to update')
      .setRequired(true))
    .addStringOption(option => option
      .setName('action')
      .setDescription('Training action')
      .setRequired(true)
      .addChoices(
        { name: 'Client -> Trial Helper', value: 'make_trial' },
        { name: 'Raise Trial Helper -> Helper', value: 'raise_helper' },
        { name: 'Stop / Pause Staff', value: 'stop' },
        { name: 'Fire Staff', value: 'fire' }
      ))
    .addStringOption(option => option
      .setName('reason')
      .setDescription('Reason or notes')
      .setRequired(false)),

  new SlashCommandBuilder()
    .setName('money')
    .setDescription('Check FreshStart Co. money tracker.')
    .addStringOption(option => option
      .setName('view')
      .setDescription('Money view')
      .setRequired(true)
      .addChoices(
        { name: 'Summary', value: 'summary' },
        { name: 'Completed Jobs', value: 'completed' },
        { name: 'In Progress / Upcoming Estimates', value: 'upcoming' },
        { name: 'Cancelled', value: 'cancelled' }
      )),

  new SlashCommandBuilder()
    .setName('supplies')
    .setDescription('Post a supplies/restock panel for a job.')
    .addStringOption(option => option
      .setName('service')
      .setDescription('Service or job type')
      .setRequired(true))
    .addStringOption(option => option
      .setName('supplies-needed')
      .setDescription('Supplies needed')
      .setRequired(true))
    .addBooleanOption(option => option
      .setName('restock-needed')
      .setDescription('Does anything need to be restocked/refilled?')
      .setRequired(true))
    .addStringOption(option => option
      .setName('notes')
      .setDescription('Extra notes')
      .setRequired(false)),

  new SlashCommandBuilder()
    .setName('cancel-request')
    .setDescription('Cancel a FreshStart service request.')
    .addStringOption(option => option
      .setName('request-id')
      .setDescription('Request ID, for example FS-ABC123')
      .setRequired(true))
    .addStringOption(option => option
      .setName('reason')
      .setDescription('Cancellation reason')
      .setRequired(false))
].map(command => command.toJSON());

async function main() {
  if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
    throw new Error('Missing DISCORD_TOKEN, CLIENT_ID, or GUILD_ID in .env');
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  console.log(`Deploying ${commands.length} commands to guild ${process.env.GUILD_ID}...`);
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );
  console.log('FreshStart Co. slash commands deployed.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
