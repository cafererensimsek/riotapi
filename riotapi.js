const League = require('leagueapiwrapper');
const fetch = require('node-fetch');
require('dotenv').config();


const LeagueAPI = new League(process.env.API_KEY, Region.TR);

const championFrequencies = {};
const championKeys = {};


fetch('http://ddragon.leagueoflegends.com/cdn/10.24.1/data/en_US/champion.json').then(res => res.json().then(champions => {
    for (let [key, value] of Object.entries(champions['data'])) {
        championKeys[key] = value['key'];
    }
}).then(() => {
    LeagueAPI.getSummonerByName('KILLEREREN').then(accountInfo => {
        return LeagueAPI.getMatchList(accountInfo);
    }).then((activeGames) => {
        const frequencies = {};
        for (game of activeGames['matches']) {
            if (game['champion'] in championFrequencies) {
                championFrequencies[game['champion']] = championFrequencies[game['champion']] + 1;
            } else {
                championFrequencies[game['champion']] = 1;
            }
        }
        for (let [key1, freq] of Object.entries(championFrequencies)) {
            for (let [champion, key2] of Object.entries(championKeys)) {
                if (key1 === key2) {
                    frequencies[champion] = freq;
                    continue;
                }
            }
        }
        return frequencies;
    }).then(res => console.log(res));
})).catch(err => console.log(err));

