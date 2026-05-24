require("dotenv").config();
const axios = require("axios");
const aliases = require("./aliases");
const fs = require("fs");
const flareRatings = require("./flare-data");

const {
    Client,
    GatewayIntentBits,
    Events,
    EmbedBuilder
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

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "help") {
        await interaction.reply(`
DDR Bot Commands ⬅️ ⬇️ ⬆️ ➡️

/add-alias - Adds another term used to search for a song
/chart - Searches for a specific chart video on Youtube
/help - Shows this menu.
/info - Fetches song title, artist, version and difficulties.
/random - Picks a random chart, you can also filter by Doubles/Singles or by level range.
/flarerating - Calculates what level charts you would need to clear with which Flare Gauge to obtain a specific rating
`);
    }

if (interaction.commandName === "info") {

    const songName = interaction.options.getString("song");

    const aliasTitle = aliases[songName.toLowerCase()];

    const response = await axios.get(
    "https://dp4p6x0xfi5o9.cloudfront.net/ddr/data.json"
);

const songs = response.data.songs;



    const song = songs.find(s => {
    if (aliasTitle) {
        return s.title === aliasTitle;
    }

    const title = s.title.toLowerCase();

    const search = songName.toLowerCase();

    return title.includes(search);
});

if (!song) {
    await interaction.reply("Song not found, please add this song with /add-alias.");
    return;
}

const colors = {
    beginner: "🟦",
    basic: "🟧",
    difficult: "🟥",
    expert: "🟩",
    challenge: "🟪"
};

const formatSheets = (type) =>
    song.sheets
        .filter(sheet => sheet.type === type)
        .map(sheet => {
            const difficultyRaw = sheet.difficulty.toLowerCase();

            const icon = colors[difficultyRaw] || "⬜";

            const difficulty =
                difficultyRaw.charAt(0).toUpperCase() +
                difficultyRaw.slice(1);

            return `${icon} ${difficulty}: ${sheet.level}`;
        })
        .join("\n");

const singles = formatSheets("std");
const doubles = formatSheets("dbl");

const difficulties = `**Single:**\n${singles || "None"}\n\n**Double:**\n${doubles || "None"}`;

const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(song.title + " DDR")}`;

const embed = new EmbedBuilder()
    .setTitle(song.title)
    .setThumbnail(`https://dp4p6x0xfi5o9.cloudfront.net/ddr/img/cover/${song.imageName}`)
    .setDescription(difficulties)
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
            name: "Song/Charts on YouTube",
            value: `[${song.title}](${youtubeUrl})`,
            inline: false
        }
    );

await interaction.reply({
    embeds: [embed]
});;

}

if (interaction.commandName === "random") {

    const response = await axios.get(
        "https://dp4p6x0xfi5o9.cloudfront.net/ddr/data.json"
    );

    const songs = response.data.songs;

    const type = interaction.options.getString("type");
    
    const minLevel = interaction.options.getInteger("min_level");
    
    const maxLevel = interaction.options.getInteger("max_level");

    // build full chart list first
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

const colors = {
    beginner: "🟦",
    basic: "🟧",
    difficult: "🟥",
    expert: "🟩",
    challenge: "🟪"
};

const difficultyRaw = sheet.difficulty.toLowerCase();

const icon = colors[difficultyRaw] || "⬜";

const difficulty =
    difficultyRaw.charAt(0).toUpperCase() +
    difficultyRaw.slice(1);

const chartType = sheet.type === "std" ? "Single" : "Double";

const diffText = sheet.difficulty.charAt(0).toUpperCase() + sheet.difficulty.slice(1);

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
        value: `[Chart Video](${youtubeUrl})`,
        inline: false
    }
);

await interaction.reply({ embeds: [embed] });

}

if (interaction.commandName === "chart") {

    const song = interaction.options.getString("song");
    const type = interaction.options.getString("type");
    const difficulty = interaction.options.getString("difficulty");

    const query = encodeURIComponent(
        `${song} DDR ${difficulty} ${type}`
    );

    const youtubeSearch = `https://www.youtube.com/results?search_query=${query}`;

    const typeText = type.charAt(0).toUpperCase() + type.slice(1);

await interaction.reply({
    content: `[YouTube search for "${song} ${typeText} ${difficulty} "](${youtubeSearch})`
});

}

if (interaction.commandName === "add-alias") {

    const song = interaction.options.getString("song");
    const alias = interaction.options.getString("alias");

    const line = `"${alias}": "${song}",\n`;

    fs.appendFileSync("user aliases.txt", line);

    await interaction.reply(
        `Alias submitted!\n${song} -> ${alias}`
    );
}

if (interaction.commandName === "farm") {

    const target = interaction.options.getInteger("target");
    const average = target / 90;

    const flareNames = [
        "0","I","II","III","IV","V","VI","VII","VIII","IX","X"
    ];

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

        // only include levels that can actually reach the target
        if (best) {
            results.push(
                `Lv. ${best.level} Flare ${flareNames[best.flare]} (${best.value})`
            );
        }
    }

    if (results.length === 0) {
        return interaction.reply("No levels can reach that target.");
    }

    await interaction.reply(
        `To achieve **${target}** flare rating across your top 90,\nYou would need to average:\n` +
        results.join("\n")
    );
}

if (interaction.commandName === "flarerating") {

    const level = interaction.options.getInteger("level");
    const flare = interaction.options.getInteger("flare");

    const value = flareRatings[level]?.[flare];

    if (value === undefined) {
        return interaction.reply("Invalid level or flare value.");
    }

    const flareNames = [
        "0","I","II","III","IV","V","VI","VII","VIII","IX","X"
    ];

    await interaction.reply(
        `A Flare ${flareNames[flare]} clear on Level ${level} would get you **${value}** rating`
    );
}

});

client.login(process.env.TOKEN);