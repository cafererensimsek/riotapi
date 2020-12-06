const { LolApi, Constants } = require("twisted");
const axios = require("axios");
require("dotenv").config();

const Twisted = new LolApi({ key: process.env.API_KEY });

const serverTransformer = (serverName) => {
  switch (serverName.toLowerCase().replace(" ", "")) {
    case "turkey":
    case "tr":
      return Constants.Regions.TURKEY;
    case "euw":
    case "euwest":
      return Constants.Regions.EU_WEST;
    case "eueast":
      return Constants.Regions.EU_EAST;
    case "na":
    case "northamerica":
      return Constants.Regions.AMERICA_NORTH;
    case "korea":
      return Constants.Regions.KOREA;
    case "jp":
    case "japan":
      return Constants.Regions.JAPAN;
    case "rus":
    case "russia":
      return Constants.Regions.RUSSIA;
  }
};

const getChampionNameFromId = async (championId, data) => {
  const championKeys = {};

  for (let [key, value] of Object.entries(data.data)) {
    championKeys[value["key"]] = key;
  }
  return championKeys[championId];
};

const getFavoriteChampions = (matches) => {};

const getStatsOfMatch = async (summoner, server, matchId, data) => {
  let id;
  let kda;
  let win;
  let totalDamage;
  let visionScore;
  let champion;
  const matchData = await Twisted.Match.get(matchId, serverTransformer(server));

  matchData.response.participantIdentities.forEach((participant) => {
    if (participant.player.summonerName == summoner.response.name) {
      id = participant.participantId;
    }
  });

  for (participant of matchData.response.participants) {
    if (participant.participantId == id) {
      kda = (
        (participant.stats.kills + participant.stats.assists) /
        participant.stats.deaths
      ).toFixed(2);
      win = participant.stats.win;
      totalDamage = participant.stats.totalDamageDealtToChampions;
      visionScore = participant.stats.visionScore;
      champion = await getChampionNameFromId(participant.championId, data);
    }
  }
  return {
    kda: kda,
    win: win,
    totalDamage: totalDamage,
    visionScore: visionScore,
    champion: champion,
  };
};

(async () => {
  try {
    const stats = {};
    const data = await Twisted.DataDragon.getChampion();
    const summoner = await Twisted.Summoner.getByName(
      "Coulrophobic",
      serverTransformer("tr")
    );
    const matches = await Twisted.Match.list(
      summoner.response.accountId,
      serverTransformer("Tr")
    );

    for (match of matches.response.matches) {
      stats[match.gameId] = await getStatsOfMatch(
        summoner,
        "Tr",
        match.gameId,
        data
      );
    }

    console.log(matches);

    /* const response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "http://localhost:3000",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      },
      body: JSON.stringify({ deneme }),
    };

    console.log(response); */
  } catch (err) {
    console.log(err);
  }
})();
