/* eslint-disable no-loop-func */
const path = require('path');
const lt = require('long-timeout');
const { get: getStack } = require('method-stack');

const { getNext, getTime } = require('./expression');

let clients = null;
let pending = [];
const timeouts = {};

const callFunc = (func, data, modules) => {
  data = data instanceof Map ? Object.fromEntries(data) : data;
  modules = modules instanceof Map ? Object.fromEntries(modules) : modules;
  const keys = Object.keys(modules);
  for (let k = 0; k < keys.length; k += 1) modules[keys[k]] = require(modules[keys[k]]);
  if (typeof func === 'string') return eval(`(${func})`)(data, modules);
  func(data, modules);
};
const defineTimeout = (id, func, time, data, modules, Client) => {
  const after = () => {
    delete timeouts[id];
    callFunc(func, data, modules);
    clients[Client].delete({ id });
  };
  if (time <= 0) return after();
  timeouts[id] = lt.setTimeout(after, time);
};

module.exports = (clientPromises, SetClients) => {
  /**
   * Specifies the client to store data on
   * @typedef {object} On
   * @property {Function} On.on - 'redis' or 'mongodb'
   */
  /**
   * Schedules a function for being executed once after a specified time
   * @param {object} options - Schedule options
   * @param {Function} options.func - Function to be called after the time specified
   * @param {object} options.expression - Time expression: it can be a cron, a date or an object where the keys are the units of time.
   * @param {Number} options.expression.millisecond - Millisecond unit.
   * @param {Number} options.expression.milliseconds - Millisecond unit.
   * @param {Number} options.expression.second - Second unit.
   * @param {Number} options.expression.seconds - Second unit.
   * @param {Number} options.expression.minute - Minute unit.
   * @param {Number} options.expression.minutes - Minute unit.
   * @param {Number} options.expression.hour - Hour unit.
   * @param {Number} options.expression.hours - Hour unit.
   * @param {Number} options.expression.day - Day unit.
   * @param {Number} options.expression.days - Day unit.
   * @param {Number} options.expression.week - Week unit.
   * @param {Number} options.expression.weeks - Week unit.
   * @param {Number} options.expression.month - Month unit.
   * @param {Number} options.expression.months - Month unit.
   * @param {Number} options.expression.quarter - Quarter unit.
   * @param {Number} options.expression.quarters - Quarter unit.
   * @param {Number} options.expression.year - Year unit.
   * @param {Number} options.expression.years - Year unit.
   * @param {object} options.data - Store data for using when the function is called.
   * @param {object} options.modules - Object where values are package names or absolute paths that will be required on execution.
   * @returns {On}
   */
  const schedule = (options = {}) => {
    const callerPath = getStack()[1].file;
    const { id, func, expression, data } = options;
    let { modules } = options;
    const on = Client => {
      const typeOfFunc = typeof func;
      if (typeOfFunc !== 'function') {
        console.error("Expected 'func' param to be of type function, but is", typeOfFunc);
        return false;
      }
      const typeOfExpression = typeof expression;
      if (!['string', 'object'].includes(typeOfExpression)) {
        let errorString =
          "PersistentScheduler: expected 'expression' param to be of type object or string, but is ";
        errorString += typeOfExpression;
        console.error(`\n${new Error(errorString).stack}`);
        return false;
      }
      const afterConnect = () => {
        const client = clients[Client];
        if (!client) {
          console.error(`Client ${client} was not configured.`);
          return null;
        }
        if (timeouts[id]) {
          console.error(`Timeout with id '${id}' already exists.`);
          return null;
        }
        modules = modules || {};
        const mKeys = Object.keys(modules);
        for (let k = 0; k < mKeys.length; k += 1) {
          const key = mKeys[k];

          if (modules[key][0] === '.') modules[key] = path.join(callerPath, '..', modules[key]);
        }
        defineTimeout(id, func, getTime(expression), data, modules, Client);

        return client.save(id, func, getNext(expression), data, modules, Client);
      };
      if (!clients) {
        return new Promise(resolve => {
          pending.push({ ...options, callback: () => resolve(afterConnect()) });
        });
      }
      return afterConnect();
    };
    return { on };
  };

  (async () => {
    clients = SetClients(await Promise.all(clientPromises));
    const names = Object.keys(clients);
    let clientTimeouts = [];
    for (let k = 0; k < names.length; k += 1) clientTimeouts.push(clients[names[k]].get({}));
    clientTimeouts = await Promise.all(clientTimeouts);
    clientTimeouts = [].concat(...clientTimeouts);
    for (let k = 0; k < clientTimeouts.length; k += 1) {
      const { id, func, nextExecution, data, modules, Client } = clientTimeouts[k];

      defineTimeout(id, func, getTime(nextExecution), data, modules, Client);
    }
    for (let k = 0; k < pending.length; k += 1) pending[k].callback();
    pending = [];
  })();
  return { schedule };
};
