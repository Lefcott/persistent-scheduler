# Persistent Scheduler
Schedules functions with long timeouts that persists when server is restarted.
Now it stores data on mongodb. Redis and memcached connections comming soon!

### Usage:
```js
const { schedule } = require('persistent-scheduler')({
  mongodb: { url: process.env.MONGODB_URL, helloMessage: true }
});

  (async () => {
    // Returns true if it was scheduled OK and null for error.
    const result = await schedule({
      id: 'Schedule Test 3',
      func: (data, modules) => {
        console.log('Function running!');
        console.log('data', data);
        console.log('modules', modules);
        // Using an example package
        console.log(modules.deepSpread.inject({ b: 2 }).to({ a: 1 }));
      },
      expression: { hours: 2, minutes: 30 },
      // expression: '0 */10 * ? * *',
      // expression: new Date(),
      // expression: 'Thu Apr 09 2020 18:00:00 GMT-0300',
      data: {
        test: 1,
        test2: true
      },
      // You can include external modules with relative or absolute paths.
      // You can also include npm packages for using inside the scheduled function.
      modules: { flow: '../server/commons/flow', deepSpread: 'deep-spread' }
    }).on('mongodb');
    console.log(result);
  })();
```