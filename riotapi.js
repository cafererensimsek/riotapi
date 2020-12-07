const { LolApi, Constants } = require("twisted");
const axios = require("axios");
const { match } = require("assert");
const { Champions } = require("twisted/dist/constants");
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

const getChampionNameFromId = (championId, data) => {
  const championKeys = {};

  for (let [key, value] of Object.entries(data.data)) {
    championKeys[value["key"]] = key;
  }
  return championKeys[championId];
};

const getSummonerStats = async (matches, data, summonerId, server) => {
  const frequency = {};
  const favoriteChampions = {};
  const favoriteChampionsById = [];
  const lanes = {};

  for (let match of matches) {
    if (match["champion"] in frequency) {
      frequency[match["champion"]] = frequency[match["champion"]] + 1;
    } else {
      frequency[match["champion"]] = 1;
    }

    if (match["lane"] in lanes) {
      lanes[match["lane"]] = lanes[match["lane"]] + 1;
    } else {
      lanes[match["lane"]] = 1;
    }
  }

  for (let [champion, freq] of Object.entries(frequency)) {
    if (freq > 4) {
      favoriteChampions[getChampionNameFromId(champion, data)] = {};
      favoriteChampions[getChampionNameFromId(champion, data)][
        "frequency"
      ] = freq;
      favoriteChampionsById.push(champion);
      const mastery = await Twisted.Champion.masteryBySummonerChampion(
        summonerId,
        champion,
        server
      );
      favoriteChampions[getChampionNameFromId(champion, data)][
        "championLevel"
      ] = mastery.response.championLevel;
      favoriteChampions[getChampionNameFromId(champion, data)][
        "championPoints"
      ] = mastery.response.championPoints;
    }
  }

  const matchesOfFavoriteChampions = matches.filter((match) =>
    favoriteChampionsById.includes(match["champion"].toString())
  );

  const mastery = await Twisted.Champion.championsScore(summonerId, server);

  return {
    favorites: favoriteChampions,
    lanes: lanes,
    matchesOfFavoriteChampions: matchesOfFavoriteChampions,
    totalMastery: mastery,
  };
};

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
    const summonerData = {};
    const data = await Twisted.DataDragon.getChampion();
    const summoner = await Twisted.Summoner.getByName(
      "Coulrophobic",
      serverTransformer("tr")
    );

    const matches = await Twisted.Match.list(
      summoner.response.accountId,
      serverTransformer("Tr")
    );

    const summonerStats = await getSummonerStats(
      matches.response.matches,
      data,
      summoner.response.id,
      serverTransformer("tr")
    );

    for (let match of summonerStats.matchesOfFavoriteChampions) {
      stats[match.gameId] = await getStatsOfMatch(
        summoner,
        "Tr",
        match.gameId,
        data
      );
    }

    for (let stat of Object.values(stats)) {
    }

    summonerData.favoriteChampions = summonerStats.favorites;
    summonerData.lanes = summonerStats.lanes;
    summonerData.favoriteStats = stats;
    summonerData.name = summoner.response.name;
    summonerData.level = summoner.response.summonerLevel;
    summonerData.icon = summoner.response.profileIconId;
    summonerData.mastery = summonerStats.totalMastery.score;

    const response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "http://localhost:3000",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      },
      body: JSON.stringify(summonerData),
    };

    console.log(response);
  } catch (err) {
    console.log(err);
  }
})();
