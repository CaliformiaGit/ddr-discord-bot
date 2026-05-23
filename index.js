require("dotenv").config();
const axios = require("axios");
const aliases = require("./aliases");
const fs = require("fs");

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
/random - Picks a random chart, you can also filter by double/single or by level.
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
    await interaction.reply("Song not found");
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
    const level = interaction.options.getInteger("level");

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

if (level) {
    charts = charts.filter(c => Number(c.sheet.level) === Number(level));
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

    const line = `${alias} <- ${song}\n`;

    fs.appendFileSync("user aliases.txt", line);

    await interaction.reply(
        `Alias submitted!\n${song} -> ${alias}`
    );
}

});

client.login(process.env.TOKEN);