require('../server/commons/env');

const { schedule } = require('.')({ mongodb: { url: process.env.MONGODB_URL } });

if (process.argv[2] !== 'no') {
  (async () => {
    const result = await schedule({
      id: 'Schedule Test 3',
      func: (data, modules) => {
        console.log('This is the schedule 2');
        console.log('data', data);
        console.log('modules', modules);
        console.log(modules.deepSpread.inject({ b: 2 }).to({ a: 1 }));
        modules.flow.get('user').then(console.log);
      },
      expression: { seconds: 30 },
      // expression: '0 */10 * ? * *',
      // expression: new Date(),
      // expression: 'Thu Apr 09 2020 18:00:00 GMT-0300',
      data: {
        test: 1,
        test2: true
      },
      modules: { flow: '../server/commons/flow', deepSpread: 'deep-spread' }
    }).on('mongodb');
    console.log(result);
  })();
}
