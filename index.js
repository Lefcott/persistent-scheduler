const { inject } = require('deep-spread');

const schedule = require('./schedule');

const clientNames = ['mongodb', 'redis'];
/**
 * Initializate Persistent-Scheduler:
 * @param {object} Config - Configuration for Persistent-Scheduler.
 * @param {object} Config.redis - Redis configuration.
 * @param {String} Config.redis.url - URL for Redis connection.
 * @param {Boolean} [Config.redis.helloMessage=true] - true for showing a message when connected to Redis.
 * @param {object} Config.mongodb - MongoDB configuration.
 * @param {String} Config.mongodb.url - URL for MongoDB connection.
 * @param {String} [Config.mongodb.collection="SchedulerJobs"] - Name of the collection for storing functions.
 * @param {Boolean} [Config.mongodb.helloMessage=true] - true for showing a message when connected to MongoDB.
 */
module.exports = (Config = {}) => {
  let config = {
    redis: { helloMessage: true },
    mongodb: { helloMessage: true, collection: 'SchedulerJobs' }
  };
  config = inject(Config).to(config);

  const clientPromises = [];
  let foundUrl = false;

  for (let k = 0; k < clientNames.length; k += 1) {
    if (config[clientNames[k]].url) {
      foundUrl = true;
      clientPromises[k] = require(`./clients/${clientNames[k]}`)(config[clientNames[k]]);
    }
  }
  if (!foundUrl) {
    console.error('Error: please specify a connection url for mongodb or redis!');
    return {};
  }
  const setClients = resolvedPromises => {
    const clients = {};
    for (let k = 0; k < clientNames.length; k += 1)
      resolvedPromises[k] && (clients[clientNames[k]] = resolvedPromises[k]);
    return clients;
  };
  return schedule(clientPromises, setClients);
};
