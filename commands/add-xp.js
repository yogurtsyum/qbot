const roblox = require('noblox.js');
const Discord = require('discord.js');
const path = require('path');
require('dotenv').config();

const config = {
    description: 'Increases a user\'s XP count.',
    aliases: ['addxp'],
    usage: '<username> <increment>',
    rolesRequired: ['Ranking Permissions', 'XP Permissions'],
    category: 'XP System'
}

module.exports = {
    config,
    run: async (client, message, args) => {
        let embed = new Discord.MessageEmbed();

        if(!client.constants.xpRankup.enabled) {
            embed.setDescription(`The XP Rankup system must be enabled in the bot configuration.`);
            embed.setColor(client.constants.colors.error);
            embed.setAuthor(message.author.tag, message.author.displayAvatarURL());
            return message.channel.send(embed);
        }

        let username = args[0];
        if(!username) {
            embed.setDescription(`Missing arguments.\n\nUsage: \`${process.env.prefix}${path.basename(__filename).split('.')[0]}${' ' + config.usage || ''}\``);
            embed.setColor(client.constants.colors.error);
            embed.setAuthor(message.author.tag, message.author.displayAvatarURL());
            return message.channel.send(embed);
        }
        
        let id;
        try {
            id = await roblox.getIdFromUsername(username);
        } catch (err) {
            embed.setDescription(`${username} is not a Roblox user.`);
            embed.setColor(client.constants.colors.error);
            embed.setAuthor(message.author.tag, message.author.displayAvatarURL());
            return message.channel.send(embed);
        }

        let rankInGroup = await roblox.getRankInGroup(Number(process.env.groupId), id);

        if(process.env.verificationChecks === 'true') {
            let linkedUser = await client.utils.getLinkedUser(message.author.id, message.guild.id);
            if(!linkedUser) {
                embed.setDescription('You must be verified on either of the sites below to use this command.\n\n**Bloxlink:** https://blox.link\n**RoVer:** https://verify.eryn.io');
                embed.setColor(client.constants.colors.error);
                embed.setAuthor(message.author.tag, message.author.displayAvatarURL());
                return message.channel.send(embed);
            }

            if(linkedUser === 'RATE_LIMITS') {
                embed.setDescription('Verification checks are currently on cooldown.');
                embed.setColor(client.constants.colors.error);
                embed.setAuthor(message.author.tag, message.author.displayAvatarURL());
                return message.channel.send(embed);
            }

            if(linkedUser === id) {
                embed.setDescription('You can\'t rank yourself!');
                embed.setColor(client.constants.colors.error);
                embed.setAuthor(message.author.tag, message.author.displayAvatarURL());
                return message.channel.send(embed);
            }

            let linkedUserRankInGroup = await roblox.getRankInGroup(Number(process.env.groupId), linkedUser);
            if(rankInGroup >= linkedUserRankInGroup) {
                embed.setDescription('You can only change the XP count of people with a rank lower than yours.');
                embed.setColor(client.constants.colors.error);
                embed.setAuthor(message.author.tag, message.author.displayAvatarURL());
                return message.channel.send(embed);
            }
        }

        let increment = args[1];
        if(!increment) {
            embed.setDescription(`Missing arguments.\n\nUsage: \`${process.env.prefix}${path.basename(__filename).split('.')[0]}${' ' + config.usage || ''}\``);
            embed.setColor(client.constants.colors.error);
            embed.setAuthor(message.author.tag, message.author.displayAvatarURL());
            return message.channel.send(embed);
        }

        let xpInfo = await client.databases.xp.findOrCreate({
            where: {
                userId: id
            },
            defaults: {
                userId: id,
                xp: 0
            }
        });

        let beforeChangeXP = Number(xpInfo[0].dataValues.xp);
        xpInfo[0].increment('xp', { by: increment });
        let afterChangeXP = Number(xpInfo[0].dataValues.xp) + Number(increment);

        let displayUsername = await roblox.getUsernameFromId(id);
        embed.setDescription(`Added \`${increment}xp\` to ${displayUsername}'s XP count. They now have \`${afterChangeXP}xp\`.`);
        embed.setColor(client.constants.colors.success);
        embed.setAuthor(message.author.tag, message.author.displayAvatarURL());
        message.channel.send(embed);

        if(process.env.logChannelId !== 'false') {
            let logEmbed = new Discord.MessageEmbed();
            let logChannel = await client.channels.fetch(process.env.logChannelId);
            logEmbed.setDescription(`**Moderator:** <@${message.author.id}> (\`${message.author.id}\`)\n**Action:** Add XP\n**User:** ${username} (\`${id}\`)\n**XP Change:** ${beforeChangeXP} -> ${afterChangeXP} (added ${increment})`);
            logEmbed.setColor(client.constants.colors.info);
            logEmbed.setAuthor(message.author.tag, message.author.displayAvatarURL());
            logEmbed.setTimestamp();
            logEmbed.setThumbnail(`https://www.roblox.com/Thumbs/Avatar.ashx?x=150&y=150&format=png&username=${username}`);
            return logChannel.send(logEmbed);
        } else {
            return;
        }
    }
}
