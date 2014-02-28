// client.js
//
// A simple test client for the echo server

'use strict';

var restify = require('../spatial/lib/external/restify');
var config = require('../config.js');
var clientlib = require('../spatial/lib/common/clientlib.js'); 

// CREATE CLIENT

var serverBaseURL = 'http://localhost:' + config.serverPort;
var privatekey = '4qgCyF0qQrdyj34/g+C7dGfjJ7A=';
var client = restify.createJsonClient({
  url: serverBaseURL
});

// INIT CLIENTLIB

var clientlib = clientlib(privatekey, serverBaseURL);

var getServer = function(urlPath) {
  var fullURLObj = clientlib.getPathWithSignature(urlPath);
  client.get(fullURLObj.path, function(err, req, res, obj) {
    if (err) {
      console.log(err);
    }else{ 
      console.log(JSON.stringify(obj, null, 2));
    }
  });
};

// SHOW OUTPUT

getServer('/v1/permissions/425032B8C0FB434992F69370FED9D071');
getServer('/v1/info/425032B8C0FB434992F69370FED9D071');
