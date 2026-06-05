require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
    new SlashCommandBuilder()
        .setName("help")
        .setDescription("Shows commands"),

    new SlashCommandBuilder()
        .setName("info")
        .setDescription("Fetches name, level, etc. for any DDR song")
        .addStringOption(option =>
            option
                .setName("song")
                .setDescription("Song name")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("random")
        .setDescription("Fetches a random chart")
        .addStringOption(option =>
    option
        .setName("type")
        .setDescription("Singles or Doubles")
        .setRequired(false)
        .addChoices(
            { name: "Singles", value: "single" },
            { name: "Doubles", value: "double" }
        )
)

        .addIntegerOption(option =>
    option
        .setName("min_level")
        .setDescription("Minimum chart level")
        .setRequired(false)
)

.addIntegerOption(option =>
    option
        .setName("max_level")
        .setDescription("Maximum chart level")
        .setRequired(false)
),
    

    new SlashCommandBuilder()
    .setName("chart")
    .setDescription("Searches for a specific chart on youtube")
    .addStringOption(option =>
    option.setName("song")
        .setDescription("Song name")
        .setRequired(true)
)
.addStringOption(option =>
    option.setName("type")
        .setDescription("Singles or Doubles")
        .setRequired(true)
        .addChoices(
            { name: "Singles", value: "single" },
            { name: "Doubles", value: "double" }
        )
)
.addStringOption(option =>
    option.setName("difficulty")
        .setDescription("Chart difficulty")
        .setRequired(true)
        .addChoices(
            { name: "Beginner", value: "beginner" },
            { name: "Basic", value: "basic" },
            { name: "Difficult", value: "difficult" },
            { name: "Expert", value: "expert" },
            { name: "Challenge", value: "challenge" }
        )
),

new SlashCommandBuilder()
    .setName("add-alias")
    .setDescription("Add an alias to make it easier to search for a song")
    .addStringOption(option =>
        option.setName("song")
            .setDescription("Song title (HAS TO BE EXACT)")
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName("alias")
            .setDescription("What should this song be known as?")
            .setRequired(true)
    ),

new SlashCommandBuilder()
    .setName("farm")
    .setDescription("Shows a range of charts for a target rating")
    .addIntegerOption(option =>
        option
            .setName("target")
            .setDescription("Target flare rating")
            .setRequired(true)
    ),


    new SlashCommandBuilder()
    .setName("flarerating")
    .setDescription("Calculate flare rating from level and flare gauge")
    .addIntegerOption(option =>
        option
            .setName("level")
            .setDescription("Chart level (1–19)")
            .setRequired(true)
    )
    .addStringOption(option =>
    option
        .setName("flare")
            .setDescription("Flare gauge (0–10)")
            .setRequired(true)
    ),

    new SlashCommandBuilder()
    .setName("dan")
    .setDescription("Fetches the songs for a specific Dan Course")

    .addStringOption(option =>
        option
            .setName("type")
            .setDescription("Singles or Doubles")
            .setRequired(true)
            .addChoices(
                { name: "Singles", value: "SP" },
                { name: "Doubles", value: "DP" }
            )
    )

    .addStringOption(option =>
        option
            .setName("dan")
            .setDescription("Select a Dan Course")
            .setRequired(true)
            .addChoices(
                { name: "1st Dan", value: "1st Dan" },
                { name: "2nd Dan", value: "2nd Dan" },
                { name: "3rd Dan", value: "3rd Dan" },
                { name: "4th Dan", value: "4th Dan" },
                { name: "5th Dan", value: "5th Dan" },
                { name: "6th Dan", value: "6th Dan" },
                { name: "7th Dan", value: "7th Dan" },
                { name: "8th Dan", value: "8th Dan" },
                { name: "9th Dan", value: "9th Dan" },
                { name: "10th Dan", value: "10th Dan" },
                { name: "Master", value: "Master" },
                { name: "Secret Master", value: "Secret Master" },
                { name: "Grand Master", value: "Grand Master" },
                { name: "Step Dragon", value: "Step Dragon" },
                { name: "Step Legend", value: "Step Legend" },
                { name: "True Step Legend", value: "True Step Legend" }
            )
    ),

    new SlashCommandBuilder()
    .setName("sanbai-login")
    .setDescription("Links your Sanbai Ice Cream account"

    ),

    new SlashCommandBuilder()
    .setName("sanbai-profile")
    .setDescription("Views your linked Sanbai Ice Cream profile"

    ),

    new SlashCommandBuilder()
    .setName("sanbai-top")
    .setDescription("Views your top 90 scores from Sanbai Icecream")
    .addStringOption(option =>
        option
            .setName("type")
            .setDescription("Singles or Doubles")
            .setRequired(true)
            .addChoices(
                { name: "Singles", value: "single" },
                { name: "Doubles", value: "double" }
            )
    ),

    new SlashCommandBuilder()
    .setName("sanbai-score")
    .setDescription("View your Sanbai Ice Cream score for a song")
    .addStringOption(option =>
        option
            .setName("song")
            .setDescription("Song name")
            .setRequired(true)
    ),
];

const commandData = commands.map(command => command.toJSON());

const rest = new REST({ version: "10" })
    .setToken(process.env.TOKEN);

(async () => {
    try {
        console.log("Registering slash commands...");

        await rest.put(
    Routes.applicationCommands("1494317894295748680"),
    { body: commandData }
);

        console.log("Done!");
    } catch (error) {
        console.error(error);
    }
}

)();