require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const aliases = require("./js/aliases");
const flareRatings = require("./js/flare-data");
const danCourses = require("./js/dan-courses");
const ranks = require("./js/flare-ranks");
const sanbaiAccounts = require("./js/sanbai-accounts");
const { scoreRankEmojis, getScoreGrade } = require("./js/score-ranks");

const {
    Client,
    GatewayIntentBits,
    Events,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once(Events.ClientReady, () => {

    

    console.log(`Logged in as ${client.user.tag}`);

    client.user.setActivity("Dance Dance Revolution WORLD", {
        type: 0
    });
});

const sanbaiVersionNames = {
    1: "1st",
    2: "2nd",
    3: "3rd",
    4: "4th",
    5: "5th",
    6: "MAX",
    7: "MAX2",
    8: "EXTREME",
    9: "SuperNOVA",
    10: "SuperNOVA2",
    11: "X",
    12: "X2",
    13: "X3 vs 2ndMIX",
    14: "DDR 2013",
    15: "DDR 2014",
    16: "DDR A",
    17: "DDR A20",
    18: "DDR A20 PLUS",
    19: "DDR A3",
    20: "DDR WORLD"
};

const lampEmojis = {
    3: "<:fc:1512258657767919719>",
    4: "<:gfc:1512258659596632164>",
    5: "<:pfc:1512258661651841054>",
    6: "<:mfc:1512258663245676785>"
};

function getSanbaiEra(versionNum) {
    if (versionNum >= 1 && versionNum <= 13) return "CLASSIC";
    if (versionNum >= 14 && versionNum <= 16) return "WHITE";
    if (versionNum >= 17 && versionNum <= 20) return "GOLD";
    return "UNKNOWN";
}

const arrows = {
    left: "<:arrow_left:1508320578707394690>",
    down: "<:arrow_down:1508320576509579296>",
    up: "<:arrow_up:1508320580544237624>",
    right: "<:arrow_right:1508320574588588203>"
};

const difficultyColors = {
    beginner: "🟦",
    basic: "🟧",
    difficult: "🟥",
    expert: "🟩",
    challenge: "🟪"
};

const scoreButtonSongs = new Map();
let scoreButtonCounter = 0;

async function buildSanbaiTopEmbed(username, type, category) {
    const profileUrl =
        `https://3icecream.com/profile/${encodeURIComponent(username)}`;

    const response = await axios.get(profileUrl);
    const html = response.data;

    const scoreDataMatch = html.match(/let SCORE_DATA = (\{[\s\S]*?\});/);

    if (!scoreDataMatch) {
        const embed = new EmbedBuilder()
            .setTitle(`${username}'s Sanbai Scores`)
            .setURL(profileUrl)
            .setDescription("Please link your account using `/sanbai-login` and make sure to disable **Private Profile**.");

        return { embed };
    }

    const compressedScoreData = JSON.parse(scoreDataMatch[1]);

    const songDataResponse = await axios.get("https://3icecream.com/js/songdata.js");
    const songDataJs = songDataResponse.data;

    const songDataMatch = songDataJs.match(/var ALL_SONG_DATA=(\[[\s\S]*?\]);/);

    if (!songDataMatch) {
        const embed = new EmbedBuilder()
            .setTitle("Could not load Sanbai song data.");

        return { embed };
    }

    const allSongs = JSON.parse(songDataMatch[1]);

    const charts = [];

    for (const song of allSongs) {
        for (let diff = 0; diff < song.ratings.length; diff++) {
            const rating = song.ratings[diff];

            if (!rating) continue;

            charts.push({
                songId: song.song_id,
                title: song.song_name,
                difficulty: diff,
                rating,
                tier: song.tiers?.[diff] || 0,
                versionNum: song.version_num,
                deleted: song.deleted
            });
        }
    }

    const scores = [];

    for (const compressedSongId of Object.keys(compressedScoreData)) {
        const song = allSongs.find(s =>
            s.song_id.startsWith(compressedSongId)
        );

        if (!song) continue;

        for (const rawScore of compressedScoreData[compressedSongId]) {
            const split = rawScore.split("/");

    scores.push({
    songId: song.song_id,
    difficulty: Number(split[0]),
    flare: Number(split[3])
});
        }
    }

    const eraWanted =
        category === "classic" ? 0 :
        category === "white" ? 1 :
        2;

    const typeWanted =
        type === "single" ? 0 : 1;

    const getEra = (versionNum) => {
        if (versionNum >= 1 && versionNum <= 13) return 0;
        if (versionNum >= 14 && versionNum <= 16) return 1;
        if (versionNum >= 17 && versionNum <= 20) return 2;
        return 2;
    };

    const flareNames = flareRatings.names;
    const flareEmojis = flareRatings.emojis;

    const topScores = scores
        .map(score => {
            const chart = charts.find(chart =>
                chart.songId === score.songId &&
                chart.difficulty === score.difficulty
            );

            if (!chart) return null;
            if (chart.deleted) return null;
            if (score.flare < 0) return null;

            const era = getEra(chart.versionNum);
            const spdp = score.difficulty <= 4 ? 0 : 1;

            if (era !== eraWanted) return null;
            if (spdp !== typeWanted) return null;

            const flareSkill =
                flareRatings[chart.rating]?.[score.flare] || 0;

            return {
                title: chart.title,
                level: chart.rating,
                flare: score.flare,
                flareSkill,
                tier: chart.tier
            };
        })
        .filter(score => score)
        .sort((a, b) => {
            if (b.flareSkill !== a.flareSkill) {
                return b.flareSkill - a.flareSkill;
            }

            return b.tier - a.tier;
        })
        .slice(0, 30);

    const list = topScores.length
        ? topScores
            .map((score, index) =>
                `**${index + 1}.** ${score.title} Lv.${score.level} ` +
                `${flareEmojis[score.flare]} Flare ${flareNames[score.flare]} — **${score.flareSkill}**`
            )
            .join("\n")
        : "No Flare Skill scores found for this category.";

    const embed = new EmbedBuilder()
        .setTitle(`${username}'s ${category.toUpperCase()} ${type === "single" ? "Singles" : "Doubles"} Flare Scores`)
        .setURL(profileUrl)
        .setDescription(list)
        .setFooter({
            text: "Sanbai Ice Cream"
        });

    return { embed };
}

async function buildSanbaiScoreEmbed(username, songSearch) {
    const profileUrl =
        `https://3icecream.com/profile/${encodeURIComponent(username)}`;

    let html;

    const response = await axios.get(profileUrl);
    html = response.data;

    const songDataResponse = await axios.get("https://3icecream.com/js/songdata.js");
    const songDataJs = songDataResponse.data;

    const songDataMatch = songDataJs.match(/var ALL_SONG_DATA=(\[[\s\S]*?\]);/);

    if (!songDataMatch) {
        const embed = new EmbedBuilder()
            .setTitle("Could not load Sanbai song data.");

        return { embed };
    }

    const allSongs = JSON.parse(songDataMatch[1]);

    const searchLower = songSearch.toLowerCase();

    const song = allSongs.find(song =>
        song.song_name.toLowerCase() === searchLower ||
        song.alternate_name?.toLowerCase() === searchLower
    );

    if (!song) {
        const embed = new EmbedBuilder()
            .setTitle("Song not found.")
            .setDescription(`Could not find **${songSearch}**.`);

        return { embed };
    }

    const scoreDataMatch = html.match(/let SCORE_DATA = (\{[\s\S]*?\});/);

    if (!scoreDataMatch) {
        const embed = new EmbedBuilder()
            .setTitle(`${username}'s Sanbai Scores`)
            .setDescription("Please link your account using `/sanbai-login` and make sure to disable **Private Profile**.");

        return { embed };
    }

    const compressedScoreData = JSON.parse(scoreDataMatch[1]);

    const compressedSongId = Object.keys(compressedScoreData).find(id =>
        song.song_id.startsWith(id)
    );

    if (!compressedSongId) {
        const embed = new EmbedBuilder()
            .setTitle(`${username}'s scores for ${song.song_name}`)
            .setURL(profileUrl)
            .setThumbnail(`https://3icecream.com/img/banners/${song.song_id}.jpg`)
            .setDescription(`No scores found for **${song.song_name}**.`)
            .setFooter({
                text: "Sanbai Ice Cream"
            });

        return { embed };
    }

    const rawScores = compressedScoreData[compressedSongId];

    const flareNames = flareRatings.names;
    const flareEmojis = flareRatings.emojis;

    const embed = new EmbedBuilder()
        .setTitle(`${username}'s scores for ${song.song_name}`)
        .setURL(profileUrl)
        .setThumbnail(`https://3icecream.com/img/banners/${song.song_id}.jpg`)
        .setFooter({
            text: "Sanbai Ice Cream"
        });

    const sortedScores = rawScores.sort((a, b) => {
        const diffA = Number(a.split("/")[0]);
        const diffB = Number(b.split("/")[0]);

        return diffA - diffB;
    });

    sortedScores.forEach(rawScore => {
        const split = rawScore.split("/");

const difficulty = Number(split[0]);
const score = 1000000 - Number(split[1]);
const flare = Number(split[3]);
const lamp = Number(split[2]);

const grade = lamp === 0
    ? "E"
    : getScoreGrade(score);

const gradeEmoji = scoreRankEmojis[grade] || "";
const level = song.ratings[difficulty];

        const flareText =
            flare > 0
                ? `${flareEmojis[flare]} **${flareNames[flare]}**`
                : flare === 0
                    ? "**None**"
                    : "**No Flare Clear**";

const lampText = lampEmojis[lamp]
    ? `\nLamp: ${lampEmojis[lamp]}`
    : "";
                    
        const chartType =
            difficulty <= 4
                ? "Single"
                : "Double";

        const difficultyEmojis = {
            0: "🟦",
            1: "🟧",
            2: "🟥",
            3: "🟩",
            4: "🟪",
            5: "🟧",
            6: "🟥",
            7: "🟩",
            8: "🟪"
        };

        const difficultyEmoji = difficultyEmojis[difficulty] || "⬜";

        embed.addFields({
            name: `${chartType} ${difficultyEmoji} Lv. ${level}`,
            value:
    `Score: ${gradeEmoji} **${score.toLocaleString()}**\n` +
    `Flare: ${flareText}` +
    lampText,
            inline: sortedScores.length <= 2
        });
    });

    return { embed };
}

client.on(Events.InteractionCreate, async interaction => {
    if (
        !interaction.isChatInputCommand() &&
        !interaction.isButton() &&
        !interaction.isModalSubmit()
    ) return;

    if (interaction.isButton()) {

        if (interaction.customId === "sanbai_login_next") {

            const modal = new ModalBuilder()
                .setCustomId("sanbai_login_modal")
                .setTitle("Sanbai Ice Cream Login");

            const usernameInput = new TextInputBuilder()
                .setCustomId("sanbai_username")
                .setLabel("Sanbai Ice Cream username")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const row = new ActionRowBuilder()
                .addComponents(usernameInput);

            modal.addComponents(row);

            await interaction.showModal(modal);
        }

if (interaction.customId.startsWith("sanbai_profile_top_")) {
    await interaction.deferReply();

    const parts = interaction.customId.split("_");

    const type = parts[3];
    const discordId = parts[4];

    const username = sanbaiAccounts[discordId];

    if (!username) {
        return interaction.editReply({
            content: "Please link your account using `/sanbai-login` and make sure to disable **Private Profile**."
        });
    }

    const category = "gold";

    const { embed } = await buildSanbaiTopEmbed(username, type, category);

    const backButton = new ButtonBuilder()
        .setCustomId(`sanbai_top_prev_${type}_${category}_${discordId}`)
        .setLabel("←")
        .setStyle(ButtonStyle.Secondary);

    const nextButton = new ButtonBuilder()
        .setCustomId(`sanbai_top_next_${type}_${category}_${discordId}`)
        .setLabel("→")
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder()
        .addComponents(backButton, nextButton);

    await interaction.editReply({
        embeds: [embed],
        components: [row]
    });
}

        if (interaction.customId.startsWith("sanbai_top_")) {

    await interaction.deferUpdate();

    const parts = interaction.customId.split("_");

const direction = parts[2];
const type = parts[3];
const category = parts[4];
const ownerId = parts[5];

if (interaction.user.id !== ownerId) {
    return interaction.followUp({
        content: "These buttons are for someone else's Sanbai profile.",
        ephemeral: true
    });
}

    const categories = ["gold", "white", "classic"];
    const currentIndex = categories.indexOf(category);

    let newIndex = direction === "next"
        ? currentIndex + 1
        : currentIndex - 1;

    if (newIndex >= categories.length) newIndex = 0;
    if (newIndex < 0) newIndex = categories.length - 1;

    const newCategory = categories[newIndex];

    const discordId = ownerId;
    const username = sanbaiAccounts[discordId];

    if (!username) {
        return interaction.reply({
            content: "Please link your account using `/sanbai-login` and make sure to disable **Private Profile**.",
            ephemeral: true
        });
    }

    const { embed } = await buildSanbaiTopEmbed(username, type, newCategory);

const backButton = new ButtonBuilder()
    .setCustomId(`sanbai_top_prev_${type}_${newCategory}_${discordId}`)
    .setLabel("←")
    .setStyle(ButtonStyle.Secondary);

const nextButton = new ButtonBuilder()
    .setCustomId(`sanbai_top_next_${type}_${newCategory}_${discordId}`)
    .setLabel("→")
    .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder()
        .addComponents(backButton, nextButton);

    await interaction.editReply({
    embeds: [embed],
    components: [row]
});

}

if (interaction.customId.startsWith("sanbai_score_song_")) {
    const scoreButtonId = interaction.customId.replace("sanbai_score_song_", "");
const songTitle = scoreButtonSongs.get(scoreButtonId);

if (!songTitle) {
    return interaction.reply({
        content: "This score button expired. Please run `/info` again.",
        ephemeral: true
    });
}

    const discordId = interaction.user.id;
    const username = sanbaiAccounts[discordId];

    if (!username) {
        return interaction.reply({
            content: "Please link your account using `/sanbai-login` and make sure to disable **Private Profile**.",
            ephemeral: true
        });
    }

    await interaction.deferReply();

    const { embed } = await buildSanbaiScoreEmbed(username, songTitle);

    await interaction.editReply({
        embeds: [embed]
    });
}

        return;
    }

if (interaction.isModalSubmit()) {

    if (interaction.customId === "sanbai_login_modal") {

        const username =
            interaction.fields.getTextInputValue("sanbai_username");

        const discordId = interaction.user.id;

        sanbaiAccounts[discordId] = username;

        const fileContent =
            "module.exports = " +
            JSON.stringify(sanbaiAccounts, null, 4) +
            ";\n";

        fs.writeFileSync("./js/sanbai-accounts.js", fileContent);

        await interaction.reply({
            content: `Linked your Sanbai Ice Cream account as **${username}**`,
            ephemeral: true
        });
    }

    return;
}

if (interaction.commandName === "help") {
       await interaction.reply(`
**DDR Bot Commands ${arrows.left} ${arrows.down} ${arrows.up} ${arrows.right}**

/add-alias - Adds another term used to search for a song.\n
/chart - Searches for a specific chart video on Youtube.\n
/dan - Shows the songs for a specific Dan Course.\n
/farm - Calculates what level charts you would need to clear with which Flare Gauge to obtain a specific rating.\n
/flarerating - Calculates how much flare rating you would get from clearing a specific level chart on a specific flare gauge.\n
/help - Shows this menu.\n
/info - Fetches song title, artist, version and difficulties.\n
/random - Picks a random chart, you can also filter by Doubles/Singles or by level range.\n
**Sanbai Ice Cream Score Linking Commands**\n
/sanbai-login - Links your Sanbai Ice Cream account to your Discord account.\n
/sanbai-profile - Shows your Sanbai Ice Cream profile picture, DDR username and flare rating/ranks\n
/sanbai-score - Shows your Singles/Doubles scores on every difficulty for a specific song\n
/sanbai-top - Shows your top charts for Singles/Doubles
`);
    }

if (interaction.commandName === "info") {

    await interaction.deferReply();

    const songName = interaction.options.getString("song");

    const aliasTitle = aliases[songName.toLowerCase()];

const response = await axios.get("https://3icecream.com/js/songdata.js");
const songDataJs = response.data;

const songDataMatch = songDataJs.match(/var ALL_SONG_DATA=(\[[\s\S]*?\]);/);

if (!songDataMatch) {
    return interaction.editReply("Could not load Sanbai song data.");
}

const songs = JSON.parse(songDataMatch[1]);



    const searchName = aliasTitle || songName;
const searchLower = searchName.toLowerCase();

const song = songs.find(s => {
    const mainName = s.song_name.toLowerCase();
    const altName = s.alternate_name?.toLowerCase();

    if (aliasTitle) {
        return mainName === searchLower || altName === searchLower;
    }

    return mainName.includes(searchLower) || altName?.includes(searchLower);
});

if (!song) {
await interaction.editReply("Song not found, please add this song with /add-alias.");
return;
}

let songDetailText = "";

try {
    const detailResponse = await axios.get(
        `https://3icecream.com/ddr/song_details/${song.song_id}`
    );

    songDetailText = detailResponse.data
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
} catch (error) {
    console.error("Could not load Sanbai song detail page:", error.message);
}

let sanbaiArtist = "Unknown";

const bpmIndex = songDetailText.indexOf("BPM");

if (bpmIndex !== -1) {
    const beforeBpm = songDetailText.slice(0, bpmIndex);
    const titleIndex = beforeBpm.lastIndexOf(song.song_name);

    if (titleIndex !== -1) {
        sanbaiArtist = beforeBpm
            .slice(titleIndex + song.song_name.length)
            .trim();
    }
}

if (!sanbaiArtist || sanbaiArtist.length > 100) {
    sanbaiArtist = "Unknown";
}

const sanbaiDifficulties = [
    { name: "Beginner", type: "Single", icon: "🟦", index: 0 },
    { name: "Basic", type: "Single", icon: "🟧", index: 1 },
    { name: "Difficult", type: "Single", icon: "🟥", index: 2 },
    { name: "Expert", type: "Single", icon: "🟩", index: 3 },
    { name: "Challenge", type: "Single", icon: "🟪", index: 4 },

    { name: "Basic", type: "Double", icon: "🟧", index: 5 },
    { name: "Difficult", type: "Double", icon: "🟥", index: 6 },
    { name: "Expert", type: "Double", icon: "🟩", index: 7 },
    { name: "Challenge", type: "Double", icon: "🟪", index: 8 }
];

const singles = sanbaiDifficulties
    .filter(diff => diff.type === "Single" && song.ratings[diff.index])
    .map(diff => `${diff.icon} ${diff.name}: ${song.ratings[diff.index]}`)
    .join("\n");

const doubles = sanbaiDifficulties
    .filter(diff => diff.type === "Double" && song.ratings[diff.index])
    .map(diff => `${diff.icon} ${diff.name}: ${song.ratings[diff.index]}`)
    .join("\n");

const difficulties = `**Single:**\n${singles || "None"}\n\n**Double:**\n${doubles || "None"}`;

const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(song.song_name + " DDR")}`;

const embed = new EmbedBuilder()
    .setTitle(song.song_name)
    .setThumbnail(`https://3icecream.com/img/banners/${song.song_id}.jpg`)
    .setDescription(difficulties)
    .addFields(
        {
    name: "Artist",
    value: sanbaiArtist || "Unknown",
    inline: true
},
{
    name: "Version",
    value: `${sanbaiVersionNames[song.version_num] || String(song.version_num ?? "Unknown")} (${getSanbaiEra(song.version_num)})`,
    inline: true
},
{
    name: "Song/Charts on YouTube",
    value: `[${song.song_name}](${youtubeUrl})`,
    inline: false
}
    );

const scoreButtonId = String(scoreButtonCounter++);
scoreButtonSongs.set(scoreButtonId, song.song_name);

const checkScoresButton = new ButtonBuilder()
    .setCustomId(`sanbai_score_song_${scoreButtonId}`)
    .setLabel("Check Scores")
    .setStyle(ButtonStyle.Primary);

const row = new ActionRowBuilder()
    .addComponents(checkScoresButton);

await interaction.editReply({
    embeds: [embed],
    components: [row]
});

}

if (interaction.commandName === "random") {

    const response = await axios.get(
        "https://dp4p6x0xfi5o9.cloudfront.net/ddr/data.json"
    );

    const songs = response.data.songs;

    const type = interaction.options.getString("type");
    
    const minLevel = interaction.options.getInteger("min_level");
    
    const maxLevel = interaction.options.getInteger("max_level");

    let allCharts = [];

    songs.forEach(song => {
        song.sheets.forEach(sheet => {
            allCharts.push({
                song,
                sheet
            });
        });
    });

    let charts = allCharts;

if (type) {
    const mapType = type.toLowerCase() === "double" ? "dbl" : "std";
    charts = charts.filter(c => c.sheet.type === mapType);
}

if (minLevel !== null) {
    charts = charts.filter(c =>
        Number(c.sheet.level) >= minLevel
    );
}

if (maxLevel !== null) {
    charts = charts.filter(c =>
        Number(c.sheet.level) <= maxLevel
    );
}

if (charts.length === 0) {
    return interaction.reply("No charts found for that combination.");
}

const picked = charts[Math.floor(Math.random() * charts.length)];

const song = picked.song;
const sheet = picked.sheet;

const difficultyRaw = sheet.difficulty.toLowerCase();

const icon = difficultyColors[difficultyRaw] || "⬜";

const difficulty =
    difficultyRaw.charAt(0).toUpperCase() +
    difficultyRaw.slice(1);

const chartType = sheet.type === "std" ? "Single" : "Double";

const diffText = sheet.difficulty.toUpperCase();

const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(song.title + " DDR " + diffText + " " + chartType)}`;

const embed = new EmbedBuilder()
    .setTitle(song.title)
    .setThumbnail(`https://dp4p6x0xfi5o9.cloudfront.net/ddr/img/cover/${song.imageName}`)
    .setDescription(`**${chartType} ${icon} ${difficulty}**: ${sheet.level}`)
    .addFields(
    {
        name: "Artist",
        value: song.artist || "Unknown",
        inline: true
    },
    {
        name: "Version",
        value: song.version || "Unknown",
        inline: true
    },
    {
        name: "Chart on YouTube",
        value: `[${song.title} ${diffText}](${youtubeUrl})`,
        inline: false
    }
);

await interaction.reply({ embeds: [embed] });

}

if (interaction.commandName === "add-alias") {

    const song = interaction.options.getString("song");
    const alias = interaction.options.getString("alias");

    const line = `"${alias}": "${song}",\n`;

    fs.appendFileSync("./js/user-aliases.txt", line);

    await interaction.reply(
        `Alias submitted!\n**${song}** -> **${alias}**\n\nThank you for your contribution 💙🩷\nNote: **Please do not submit any joke submissions or misspelt titles.**`
    );
}

if (interaction.commandName === "chart") {

    await interaction.deferReply();

    const songName = interaction.options.getString("song");
    const type = interaction.options.getString("type");
    const difficulty = interaction.options.getString("difficulty");

    const aliasTitle = aliases[songName.toLowerCase()];

    const response = await axios.get("https://3icecream.com/js/songdata.js");
const songDataJs = response.data;

const songDataMatch = songDataJs.match(/var ALL_SONG_DATA=(\[[\s\S]*?\]);/);

if (!songDataMatch) {
    return interaction.editReply("Could not load Sanbai song data.");
}

const songs = JSON.parse(songDataMatch[1]);

    const searchName = aliasTitle || songName;
const searchLower = searchName.toLowerCase();

const song = songs.find(s => {
    const mainName = s.song_name.toLowerCase();
    const altName = s.alternate_name?.toLowerCase();

    if (aliasTitle) {
        return mainName === searchLower || altName === searchLower;
    }

    return mainName.includes(searchLower) || altName?.includes(searchLower);
});

    if (!song) {
        return interaction.editReply("Song not found.");
    }

    let songDetailText = "";

try {
    const detailResponse = await axios.get(
        `https://3icecream.com/ddr/song_details/${song.song_id}`
    );

    songDetailText = detailResponse.data
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
} catch (error) {
    console.error("Could not load Sanbai song detail page:", error.message);
}

let sanbaiArtist = "Unknown";

const bpmIndex = songDetailText.indexOf("BPM");

if (bpmIndex !== -1) {
    const beforeBpm = songDetailText.slice(0, bpmIndex);
    const titleIndex = beforeBpm.lastIndexOf(song.song_name);

    if (titleIndex !== -1) {
        sanbaiArtist = beforeBpm
            .slice(titleIndex + song.song_name.length)
            .trim();
    }
}

if (!sanbaiArtist || sanbaiArtist.length > 100) {
    sanbaiArtist = "Unknown";
}

    const icon =
    difficultyColors[difficulty.toLowerCase()] || "⬜";

const chartType = type === "double" ? "Double" : "Single";

const difficultyMap = {
    single: {
        beginner: 0,
        basic: 1,
        difficult: 2,
        expert: 3,
        challenge: 4
    },
    double: {
        basic: 5,
        difficult: 6,
        expert: 7,
        challenge: 8
    }
};

const difficultyLower = difficulty.toLowerCase();
const difficultyIndex = difficultyMap[type]?.[difficultyLower];

if (difficultyIndex === undefined) {
    return interaction.editReply("That difficulty does not exist for that play style.");
}

const level = song.ratings[difficultyIndex];

if (!level) {
    return interaction.editReply("That chart does not exist for this song.");
}

const diffText = difficulty.toUpperCase();

    const youtubeUrl =
    `https://www.youtube.com/results?search_query=${
        encodeURIComponent(
            `${song.song_name} DDR ${diffText} ${chartType}`
        )
    }`;

    const embed = new EmbedBuilder()
    .setTitle(song.song_name)
    .setThumbnail(
        `https://3icecream.com/img/banners/${song.song_id}.jpg`
    )
    .setDescription(
        `**${chartType} ${icon} ${diffText}**: ${level}`
    )
        .addFields(
{
    name: "Artist",
    value: sanbaiArtist || "Unknown",
    inline: true
},
{
    name: "Version",
    value: `${sanbaiVersionNames[song.version_num] || String(song.version_num ?? "Unknown")} (${getSanbaiEra(song.version_num)})`,
    inline: true
},
{
    name: "Chart on YouTube",
    value: `[${song.song_name} ${diffText}](${youtubeUrl})`,
    inline: false
}
        );

    await interaction.editReply({
    embeds: [embed]
});

}


if (interaction.commandName === "farm") {

    const target = interaction.options.getInteger("target");
    const average = target / 90;

let targetRank = ranks[0];

for (const rank of ranks) {
    if (target >= rank.min) {
        targetRank = rank;
    }
}

const flareNames = flareRatings.names;
const flareEmojis = flareRatings.emojis;

    let results = [];

    for (const level in flareRatings) {

        let best = null;

        for (const flare in flareRatings[level]) {

            const value = flareRatings[level][flare];

            if (value >= average) {

                if (!best || value < best.value) {
                    best = { level, flare, value };
                }
            }
        }
        
        if (best) {
            results.push(
                `Lv. ${best.level} Flare ${flareNames[best.flare]} ${flareEmojis[best.flare]} (${best.value})`
            );
        }
    }

    if (results.length === 0) {
        return interaction.reply("No levels can reach that target.");
    }

    await interaction.reply(
    `To achieve **${target}** (${targetRank.name} ${ranks.emojis[targetRank.name]}) flare rating across your top 90,\n` +
    `You would need to average:\n\n` +
    results.join("\n")
);

}

if (interaction.commandName === "flarerating") {

    const level = interaction.options.getInteger("level");
    const flareInput =
    interaction.options.getString("flare").toUpperCase();

const flareMap = {
    "0": 0,
    "I": 1,
    "II": 2,
    "III": 3,
    "IV": 4,
    "V": 5,
    "VI": 6,
    "VII": 7,
    "VIII": 8,
    "IX": 9,
    "EX": 10
};

const flare = flareMap[flareInput];

    const value = flareRatings[level]?.[flare];

    if (value === undefined) {
        return interaction.reply("Invalid level or flare value.");
    }

const flareNames = flareRatings.names;
const flareEmojis = flareRatings.emojis;

const totalRating = value * 90;

let achievedRank = ranks[0];

for (const rank of ranks) {
    if (totalRating >= rank.min) {
        achievedRank = rank;
    }
}

    await interaction.reply(
    `A Flare ${flareNames[flare]} ${flareEmojis[flare]} clear on Level ${level} would get you **${value}** rating\n\n` +
    `If your top 90 was filled with Flare ${flareNames[flare]} ${flareEmojis[flare]} clears on Level ${level},\n` +
    `you would achieve rank **${achievedRank.name}** ${ranks.emojis[achievedRank.name]}`
);

}

if (interaction.commandName === "dan") {

    const type = interaction.options.getString("type");
    const danName = interaction.options.getString("dan");

    const dan = danCourses.find(d =>
        d.name.startsWith(type) &&
        d.name.includes(danName)
    );

    if (!dan) {
        return interaction.reply("DAN course not found.");
    }

    const response = await axios.get(
        "https://dp4p6x0xfi5o9.cloudfront.net/ddr/data.json"
    );

    const songs = response.data.songs;

    const embeds = [];

    const titleEmbed = new EmbedBuilder()
        .setTitle(`${dan.name}`)
        .setDescription(
            dan.songs.join("\n")
        );

    embeds.push(titleEmbed);

    for (let i = 0; i < dan.songs.length; i++) {

        const entry = dan.songs[i];

        const parts = entry.split(" ");

        const level = parts[parts.length - 1];
        const difficulty = parts[parts.length - 2];

        const title =
            parts.slice(0, parts.length - 2).join(" ");

        const song = songs.find(s =>
            s.title.toLowerCase() === title.toLowerCase()
        );

        const icon =
    difficultyColors[difficulty.toLowerCase()] || "⬜";

        const embed = new EmbedBuilder()
            .setAuthor({
    name:
        i === dan.songs.length - 1
            ? "Final Stage"
            : `Stage ${i + 1}`
})

            .setDescription(
                `${icon} **${title}**\n${difficulty} ${level}`
            );

        if (song) {

            embed.setThumbnail(
                `https://dp4p6x0xfi5o9.cloudfront.net/ddr/img/cover/${song.imageName}`
            );

            const youtubeUrl =
    `https://www.youtube.com/results?search_query=${
        encodeURIComponent(
            `${title} DDR ${difficulty} ${type === "sp" ? "Single" : "Double"}`
        )
    }`;

embed.addFields(
    {
        name: "Artist",
        value: song.artist || "Unknown",
        inline: true
    },
    {
        name: "Version",
        value: song.version || "Unknown",
        inline: true
    },
    {
        name: "Chart on YouTube",
        value: `[${title} ${difficulty}](${youtubeUrl})`,
        inline: false
    }
);
        }

        embeds.push(embed);
    }

    await interaction.reply({
        embeds
    });
}

if (interaction.commandName === "sanbai-login") {

    const embed = new EmbedBuilder()
        .setTitle("Link Sanbai Ice Cream Account")
        .setDescription(
            "First follow the Sanbai Ice Cream tutorial:\n" +
            "https://3icecream.com/tutorial/\n\n" +
            "Then upload your scores to the Sanbai Ice Cream app.\n\n" +
            "When you're done, press **Next**."
        );

    const button = new ButtonBuilder()
        .setCustomId("sanbai_login_next")
        .setLabel("Next")
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder()
        .addComponents(button);

    await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });
}

if (interaction.commandName === "sanbai-profile") {

    const discordId = interaction.user.id;
    const username = sanbaiAccounts[discordId];

    if (!username) {
    return interaction.followUp({
        content: "Please link your account using `/sanbai-login` and make sure to disable **Private Profile**.",
        ephemeral: true
    });
}

await interaction.deferReply();

    const profileUrl = `https://3icecream.com/profile/${encodeURIComponent(username)}`;

    let html;

try {
    const response = await axios.get(profileUrl);
    html = response.data;

} catch (error) {
    console.error("Sanbai fetch failed:", error.message);

    return interaction.editReply(
        "Please link your account using `/sanbai-login` and make sure to disable **Private Profile**."
    );
}

const pageText = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const ddrNameMatch = pageText.match(/DDR\s+(.+?)\s+国・地域/);

const ddrName = ddrNameMatch
    ? ddrNameMatch[1]
    : username;

const imageUrls = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/g)]
    .map(match => match[1]);

const profileImage = imageUrls.find(url =>
    url.startsWith("/uploads/")
);

const profileImageUrl = profileImage
    ? `https://3icecream.com${profileImage}`
    : interaction.user.displayAvatarURL();

const singleMatch = pageText.match(
    /フレアランクシングル\s+([A-Z+]+)\s*\(([\d,]+)\)/
);

const doubleMatch = pageText.match(
    /フレアランクダブル\s+([A-Z+]+)\s*\(([\d,]+)\)/
);

const singleRank = singleMatch ? singleMatch[1] : "No Single data";
const singleRating = singleMatch ? singleMatch[2] : "No Single data";

const doubleRank = doubleMatch ? doubleMatch[1] : "No Double data";
const doubleRating = doubleMatch ? doubleMatch[2] : "No Double data";

const singleRankDisplay = ranks.emojis[singleRank]
    ? `${ranks.emojis[singleRank]} **${singleRank}**`
    : singleRank;

const doubleRankDisplay = ranks.emojis[doubleRank]
    ? `${ranks.emojis[doubleRank]} **${doubleRank}**`
    : doubleRank;

const embed = new EmbedBuilder()
    .setTitle(`${interaction.member?.nickname || interaction.user.globalName || interaction.user.username}'s Sanbai Profile`)
    .setURL(profileUrl)
    .setThumbnail(profileImageUrl)
    .addFields(
        {
            name: "DDR Username",
            value: `**${ddrName}**`,
            inline: false
        },

        {
            name: "Single Flare Rank",
            value: singleRankDisplay,
            inline: true
        },
        {
            name: "Double Flare Rank",
            value: doubleRankDisplay,
            inline: true
        },
        {
            name: "\u200B",
            value: "\u200B",
            inline: true
        },

        {
            name: "Single Flare Rating",
            value: `**${singleRating}**`,
            inline: true
        },
        {
            name: "Double Flare Rating",
            value: `**${doubleRating}**`,
            inline: true
        },
        {
            name: "\u200B",
            value: "\u200B",
            inline: true
        }
    )
    .setFooter({
        text: "Data from Sanbai Ice Cream"
    });

const singlesButton = new ButtonBuilder()
    .setCustomId(`sanbai_profile_top_single_${discordId}`)
    .setLabel("Top Singles Scores")
    .setStyle(ButtonStyle.Primary);

const doublesButton = new ButtonBuilder()
    .setCustomId(`sanbai_profile_top_double_${discordId}`)
    .setLabel("Top Doubles Scores")
    .setStyle(ButtonStyle.Primary);

const row = new ActionRowBuilder()
    .addComponents(singlesButton, doublesButton);

    await interaction.editReply({
    embeds: [embed],
    components: [row]
});

}

if (interaction.commandName === "sanbai-top") {

    const discordId = interaction.user.id;
    const username = sanbaiAccounts[discordId];
    const type = interaction.options.getString("type");
    const category = "gold";

    if (!username) {
        return interaction.reply({
            content: "Please link your account using `/sanbai-login` and make sure to disable **Private Profile**.",
            ephemeral: true
        });
    }

    await interaction.deferReply();

    const { embed } = await buildSanbaiTopEmbed(username, type, category);

    const backButton = new ButtonBuilder()
        .setCustomId(`sanbai_top_prev_${type}_${category}_${discordId}`)
        .setLabel("←")
        .setStyle(ButtonStyle.Secondary);

    const nextButton = new ButtonBuilder()
        .setCustomId(`sanbai_top_next_${type}_${category}_${discordId}`)
        .setLabel("→")
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder()
        .addComponents(backButton, nextButton);

    await interaction.editReply({
        embeds: [embed],
        components: [row]
    });
}

if (interaction.commandName === "sanbai-score") {

    const discordId = interaction.user.id;
    const username = sanbaiAccounts[discordId];

    const songInput = interaction.options.getString("song");
    const aliasTitle = aliases[songInput.toLowerCase()];
    const songSearch = aliasTitle || songInput;

    if (!username) {
        return interaction.reply({
            content: "Please link your account using `/sanbai-login` and make sure to disable **Private Profile**.",
            ephemeral: true
        });
    }

    await interaction.deferReply();

    const { embed } = await buildSanbaiScoreEmbed(username, songSearch);

    await interaction.editReply({
        embeds: [embed]
    });
}

});

client.login(process.env.TOKEN);
