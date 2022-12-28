import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";

const channels = {
  qa: "1032309212149186610",
  frontLogs: "1024377496998793237",
  frontResults: "1032301162436767754",
  management: "1032314788119846973",
};

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

bot.login(process.env.DCTOKEN);

bot.on("ready", () => {
  console.log("Alpinho está pronto!");
});

const branchesObj = (description) => {
  const branches = [
    { label: "master", channels: [channels.management] },
    { label: "homolog", channels: [channels.management, channels.qa] },
    { label: "develop", channels: [channels.frontResults] },
  ];
  const roles = [
    { id: "994681551948365824", name: "@everyone" },
    { id: "1017859182860447766", name: "frontend" },
    { id: "1017859348027932813", name: "backend" },
    { id: "1017859574696513607", name: "negócio" },
    { id: "1017859858516689077", name: "qa" },
    { id: "1024024621625901086", name: "designer" },
    { id: "1024376815172730900", name: "admin" },
    { id: "1031988401576099985", name: "Alpinho" },
  ];

  let currentBranch = {};
  branches.every((branch) => {
    if (description.includes(branch.label)) {
      currentBranch = branch;
      return false;
    }
    return true;
  });
  const isNotEmpty = !!Object.keys(currentBranch).length;

  return isNotEmpty
    ? currentBranch
    : { label: "uma branch", channels: [channels.frontResults] };
};

const newEmbed = (title, description) => ({
  content: `||@here||\n`,
  embeds: [
    {
      title,
      description,
      thumbnail: {
        url: "https://gitlab.com/uploads/-/system/project/avatar/278964/project_avatar.png",
      },
    },
  ],
});
const embedWithoutNotification = (title, description) => ({
  content: `\n`,
  embeds: [
    {
      title,
      description,
      thumbnail: {
        url: "https://gitlab.com/uploads/-/system/project/avatar/278964/project_avatar.png",
      },
    },
  ],
});

const actions = [
  {
    keywords: ["merge request", "opened"],
    title: ({ author }) => `${author.name} criou um novo Merge Request!`,
    sendNotification: true,
  },
  {
    keywords: ["merge request", " approved"],
    title: ({ author }) => `${author.name} aprovou um Merge Request!`,
    sendNotification: false,
  },
  {
    keywords: ["merge request", "unapproved"],
    title: ({ author }) => `${author.name} desaprovou um Merge Request!`,
    sendNotification: false,
  },
  {
    keywords: ["Pipeline", "passed"],
    title: ({ description }) =>
      `Uma nova versão está disponível em ${branchesObj(description).label}!`,
    alias: (description) => {
      const currentBranch = branchesObj(description);
      currentBranch.channels.map((channel) => {
        const branchChannel = bot.channels.cache.get(currentBranch.channel);
        if (currentBranch.label === "uma branch") {
          branchChannel.send(
            embedWithoutNotification(
              `Uma nova versão está disponível em ${currentBranch.label}!`,
              description
            )
          );
        } else {
          branchChannel.send(
            newEmbed(
              `Uma nova versão está disponível em ${currentBranch.label}!`,
              description
            )
          );
        }
      });
    },
  },
  {
    keywords: ["Pipeline", "failed"],
    title: ({ description }) =>
      `Uma falha ocorreu ao subir uma nova versão em ${
        branchesObj(description).label
      }!`,
    sendNotification: true,
  },
];

bot.on("messageCreate", async (message) => {
  const { channelId, content } = message;

  if (message.embeds.length) {
    const { author, description } = message.embeds[0].data;
    if (channelId === channels.frontLogs) {
      actions.map((item) => {
        let matchKeywords = 1;
        item.keywords.map((keyword) => {
          if (!description.includes(keyword)) matchKeywords = 0;
        });

        if (matchKeywords === 1) {
          const logChannel = bot.channels.cache.get(channels.frontResults);
          const title = item.title(message.embeds[0].data);
          if (!item.alias) {
            if (item.sendNotification) {
              logChannel.send(newEmbed(title, description));
            } else {
              logChannel.send(embedWithoutNotification(title, description));
            }
          }
          if (item.alias) item.alias(description);
        }
      });
    }
  }
});
