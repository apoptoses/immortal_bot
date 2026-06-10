const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const DEFAULT_COOLDOWN = 7200; // Default cooldown in seconds (2 hours)

// Cooldown is in seconds
const ROLE_COOLDOWNS = {
    'ROLE_ID_1': 60,
    'ROLE_ID_2': 120,
    'ROLE_ID_3': 180,
    'ROLE_ID_4': 240,
    'ROLE_ID_5': 300,
};

const ADVERT_CHANNEL_ID = 'ADVERT_CHANNEL_ID_HERE';

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