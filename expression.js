const moment = require('moment');
const { parseExpression } = require('cron-parser');

const isValidCron = expression => {
  try {
    parseExpression(expression);
    return true;
  } catch (error) {
    return false;
  }
};

const getNext = expression => {
  switch (typeof expression) {
    case 'object':
      return (() => {
        if (expression instanceof Date) return expression.toISOString();
        const keys = Object.keys(expression);
        let date = moment();
        for (let k = 0; k < keys.length; k += 1) date = date.add(expression[keys[k]], keys[k]);
        return date.toISOString();
      })();
    case 'string':
      return (() => {
        if (isValidCron(expression))
          return parseExpression(expression)
            .next()
            ._date.toISOString();
        const date = new Date(expression);
        if (date.toString() !== 'Invalid Date') return date.toISOString();
        return null;
      })();
    default:
      return null;
  }
};

const getTime = expression => moment(getNext(expression)) - moment();

module.exports = { getNext, getTime };
