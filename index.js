require('dotenv/config');
const { Client, GatewayIntentBits } = require('discord.js')

const channels = {
    qa: '1032309212149186610',
    frontLogs: '1024377496998793237',
    frontResults: '1032301162436767754',
    management: '1032314788119846973',
}

const bot = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
})

bot.login(process.env.DCTOKEN)

bot.on('ready', () => {
    console.log('Alpinho está pronto!');
})

const branchesObj = (description) => {
    const branches = [
        { label: 'master', channel: channels.management },
        { label: 'homolog', channel: channels.management },
        { label: 'develop', channel: channels.qa },
    ]

    let currentBranch = {};
    branches.every(branch => {
        if (description.includes(branch.label)) {
            currentBranch = branch;
            return false
        }
        return true
    })

    return currentBranch
}

const newEmbed = (title, description) => ({
    content: `||@here||\n`, embeds: [{
        title,
        description,
        thumbnail: {
            url: 'https://gitlab.com/uploads/-/system/project/avatar/278964/project_avatar.png'
        }
    }]
})

const actions = [
    {
        keywords: ['merge request', 'opened'],
        title: ({ author }) => `${author} criou um novo Merge Request!`
    },
    {
        keywords: ['merge request', ' approved'],
        title: ({ author }) => `${author} aprovou um Merge Request!`
    },
    {
        keywords: ['merge request', 'unapproved'],
        title: ({ author }) => `${author} desaprovou um Merge Request!`
    },
    {
        keywords: ['Pipeline', 'passed'],
        title: ({ description }) => `Uma nova versão está disponível em "${branchesObj(description).label}!"`,
        alias: (description) => {
            const currentBranch = branchesObj(description)
            const branchChannel = bot.channels.cache.get(currentBranch.channel)
            branchChannel.send(newEmbed())
        }
    },
    {
        keywords: ['Pipeline', 'failed'],
        title: ({ description }) => `Uma falha ocorreu ao subir uma nova versão em "${branchesObj(description).label}!"`,
    },
]

bot.on('messageCreate', async (message) => {
    const { channelId, content } = message;
    const { author, description } = message.embeds[0].data
    if (channelId === channels.frontLogs) {
        actions.map(item => {
            let matchKeywords = 1
            item.keywords.map(keyword => {
                if (!description.includes(keyword)) matchKeywords = 0
            })

            if (matchKeywords === 1) {
                const logChannel = bot.channels.cache.get(channels.frontResults)
                const title = item.title(message.embeds[0])
                logChannel.send(newEmbed(title, description))
                if (item.alias) item.alias(title, description)
            }
        })
    }
})