'use strict';

const Path = require('path');
const Hapi = require('hapi');
const Hoek = require('hoek');
const azure = require('azure-storage');
var storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=cerrsdevtestipam;AccountKey=f9Idp9aj1iVew5XTMLavwON21acuTaDehVWAWYnIlqWHMutI0xPoHt93uqmZtEOSOuP4PLrjTArnVUNniDQOMQ==;EndpointSuffix=core.usgovcloudapi.net'
const storage = require('./utility/storage');
const tableService = azure.createTableService(storageConnectionString);

const server = new Hapi.Server();
server.connection({ port: process.env.PORT || 3000, host: 'localhost' })

server.register(require('inert'), (err) => {
  server.route({
    method: 'GET',
    path: '/css/{param*}',
    handler: {
        directory: {
            path: 'public/css'
        }
    }
  });

  server.route({
    method: 'GET',
    path: '/fonts/{param*}',
    handler: {
        directory: {
            path: 'public/fonts'
        }
    }
  });
});

server.register(require('vision'), (err) => {

  Hoek.assert(!err, err);

  server.views({
    engines: {
        html: require('handlebars')
    },
    relativeTo: __dirname,
      path: './templates',
    layoutPath: './templates/layout'
  });

  server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
      const numRows = request.query.rows ? request.query.rows : 100;
      const columns = process.env.TABLE_COLUMNS.split(',').map(c => c.trim());
      const sort = request.query.sort && columns.includes(request.query.sort) ? request.query.sort : 'Column';

      storage.getLastNRows(azure, tableService, columns, numRows, sort, function(error, rows) {
        if (error) {
          console.log(error);
          return reply(error);
        }
        
        const viewData = {
          rows: rows,
          storageName: 'cerrsdevtestipam',
          tableName: 'AzureIPAMTable'
        };

        reply.view('index', viewData, { layout: 'main'});
      });
    }
  });
});

server.start((err) => {
  if (err) { throw err; }
  console.log(`Server running at: ${server.info.uri}`);
});
