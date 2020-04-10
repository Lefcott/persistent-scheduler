const mongoose = require('mongoose');

const expression = require('../expression');

const { connect, model, Schema } = mongoose;

module.exports = config =>
  new Promise(resolve => {
    connect(config.url, { useNewUrlParser: true, useUnifiedTopology: true }, async error => {
      if (error) {
        console.error(error);
        return resolve(null);
      }
      config.helloMessage && console.log('Connected to MongoDB!');

      const SchedulerJob = model(
        config.collection,
        new Schema(
          {
            id: String,
            func: String,
            nextExecution: Date,
            data: mongoose.Mixed,
            modules: Map,
            Client: String
          },
          { collection: config.collection }
        )
      );
      const job = new SchedulerJob();

      const save = (id, func, expressionObj, data, modules, Client) =>
        new Promise(resolveSave => {
          job.id = id;
          job.func = func.toString();
          job.nextExecution = expression.getNext(expressionObj);
          job.data = data;
          job.modules = modules;
          job.Client = Client;
          job.save(saveError => {
            if (saveError) {
              console.error(saveError);
              return resolveSave(null);
            }
            resolveSave(true);
          });
        });
      const get = where =>
        new Promise(resolveGet => {
          SchedulerJob.find(where, (findError, docs) => {
            if (findError) {
              console.error(findError);
              return resolve(null);
            }
            resolveGet(docs);
          });
        });
      const Delete = where =>
        new Promise(resolveGet => {
          SchedulerJob.deleteMany(where, deleteError => {
            if (deleteError) {
              console.error(deleteError);
              return resolve(null);
            }
            resolveGet(true);
          });
        });
      resolve({ save, get, delete: Delete });
    });
  });
