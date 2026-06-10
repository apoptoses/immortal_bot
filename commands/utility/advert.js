const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const DEFAULT_COOLDOWN = 7200; // Default cooldown in seconds (2 hours)

const whitelistedRoleIds = new Set([ 
    '1503420214157508678', // QI role        
]);

// Cooldown is in seconds
const ROLE_COOLDOWNS = {
    '1503420200471629988': 6570, // 1:49:30 // Insight role
    '1503420832012042260': 5940, // 1:39:00 // Essence role
    '1503420561471312022': 5310, // 1:28:30 // Soulfire role
    '1503420966964039845': 4680, // 1:18:00 // Karma role
    '1510731847783551227': 4050, // 1:07:30 // Star role
    '1511275339521855538': 3420, // 0:57:00 // Nebula role
    '1512792882443059230': 2790, // 0:46:30 // Quasar role
    'ROLE_ID_8': 2160, // 0:36:00 // Miasma role
    'ROLE_ID_9': 1520, // 0:25:20
    'ROLE_ID_10': 900, // 0:15:00
};

const ADVERT_CHANNEL_ID = '1513575723128983552';

const cooldowns = new Map();

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [
        h > 0 ? `${h}h` : null,
        m > 0 ? `${m}m` : null,
        s > 0 ? `${s}s` : null,
    ]
        .filter(Boolean)
        .join(' ') || '0s';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('advert')
        .setDescription('Post a sect advertisement in the advertisement channel.')
        .addStringOption(option =>
            option
                .setName('advert')
                .setDescription('Your advertisement message')
                .setRequired(true)
        ),

    async execute(interaction) {
        const userId = interaction.user.id;
        const member = interaction.member;

        const hasWhitelistedRole = member.roles.cache.some(role => whitelistedRoleIds.has(role.id));
        if (!hasWhitelistedRole) {
            return interaction.reply({
                content: '❌ You do not have permission to use this command.',
                ephemeral: true,
            });
        }

        if (interaction.channelId !== ADVERT_CHANNEL_ID) {
            return interaction.reply({
                content: `❌ This command can only be used in <#${ADVERT_CHANNEL_ID}>.`,
                ephemeral: true,
            });
        }

        let cooldown = DEFAULT_COOLDOWN;
        for (const [roleId, roleCooldown] of Object.entries(ROLE_COOLDOWNS)) {
            if (member.roles.cache.has(roleId)) {
                cooldown = Math.min(cooldown, roleCooldown);
            }
        }

        const now = Date.now();
        const expirationTime = cooldowns.get(userId) ?? 0;

        if (now < expirationTime) {
            const remaining = Math.ceil((expirationTime - now) / 1000);
            return interaction.reply({
                content: `⏳ You're on cooldown. You can advertise again in **${formatDuration(remaining)}**.`,
                ephemeral: true,
            });
        }

        const advertMessage = interaction.options.getString('advert');
        const avatarURL = interaction.user.displayAvatarURL({ dynamic: true, size: 256 });

        const embed = new EmbedBuilder()
            .setColor('#E8E3D5')
            .setAuthor({
                name: member.displayName,
                iconURL: avatarURL,
            })
            .setTitle('Sect Advertisement')
            .setDescription(
                [
                    advertMessage,
                    '',
                    '─────────────────────────',
                    `> 📢 DM <@${userId}> if you're interested!`,
                ].join('\n')
            )
            .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }))
            .setFooter({
                text: `${interaction.guild.name}  ·  Sect Adverts`,
                iconURL: interaction.guild.iconURL({ size: 64 }),
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        cooldowns.set(userId, now + cooldown * 1000);
        setTimeout(() => cooldowns.delete(userId), cooldown * 1000);
    },
};