// server.js
//
// Our spatial server
//
// Todo:
//
// 1. Merge with restify errors
// 2. Add logging for errors with stack trace
// 3. Use async.waterfall


'use strict';

var restify = require('./lib/external/restify');
var async = require('./lib/external/async');
var Utils = require('util');
var config = require('../config.js');
var userlib = require('./lib/common/userlib.js');
var exception = require('./lib/common/exception.js');
var status = require('./lib/common/status.js');
var authenticator = require('./lib/common/authenticator.js');
var logger = config.logger;
var userlib = userlib(config);
var authenticator = authenticator(config);

// SERVER INIT

var server = restify.createServer({name: config.appName});
server.use(restify.queryParser());
server.use(restify.gzipResponse());


// PRIVATE HELPER FUNCTIONS

var getElapsedTime = function(timeEnd){
  return Number(timeEnd[0]+timeEnd[1]*1.0e-9).toFixed(3);
};

var findMissingParam = function(queryParams){
  var missing = [];

  if(!queryParams.timestamp){
    missing.push('timestamp');
  }
  if(!queryParams.signature){
    missing.push('signature');
  }
  
  return missing;
};



var handleAuthentication = function(request, callback){

 // Verify if parameters are present
 // Verify if it maches 

  var queryParams = request.query;
    
  if(!(queryParams.timestamp && queryParams.signature)){

    var missingParamStr = findMissingParam(queryParams).join(",");
    return callback(new exception.MissingParameter(missingParamStr), null);

  }else{
 
   // Get PrivateKey
    userlib.getPrivateKey(request.params.publickey, function(err, privatekey){
      if(err){
        return callback(err, null);
      }else{
        authenticator.validateRequest(request, privatekey, function(err, authenticated){
          if(err){
            return callback(err, null);
          }else{
            return callback(null, authenticated);
          }
        });
      }
    });
  }
};

var handleError = function(err,response){

  // All exception that we "throw" are of type defined in exception.js
  // All our exception are derived from Error
  // All exception defined by us have an ENUM for status
  // If case it is unhandled error, we set status to SERVER_ERROR
  
  if(err){
    response.send({
      status : err.status || status.SERVER_ERROR.toString(),
      message: err.message,
      result : {}
    });
  }
};

// API FUNCTIONS

var getPermissions = function(request, response, next){
  var startTime = process.hrtime();
  var callId = logger.getId();

  logger.verbose(Utils.format("%d getPermissions(publickey=%s) entry", callId, request.params.publickey));

  async.series({
    auth: function(callback){
            handleAuthentication(request, callback);
          },
    action: function(callback){
              console.log("getauthtoken");
              userlib.getAuthToken(request.params.publickey, function(err, permissions){
                if(err){
                  return callback(err, null);
                }else{
                  return callback(null, {
                    status: 'OK',
                    message:'',
                    result: permissions
                  });
                }
              });   
            }
  },
  function(err, results){
    if(err){
      handleError(err, response);
    }else{
      response.send(results.action);
    }
    
    var endTime = process.hrtime(startTime);
    logger.verbose(Utils.format("%d getPermissions() elapsed=%ds", callId, getElapsedTime(endTime))); 

    return next();      
  });
};

var getAccountInfo = function(request, response, next){
  var startTime = process.hrtime();
  var callId = logger.getId();
 
  logger.verbose(Utils.format("%d getAccountInfo(publickey=%s) entry", callId, request.params.publickey));

  async.series({
    auth: function(callback){ 
            handleAuthentication(request, callback); 
          },
    action: function(callback){
              userlib.getAccountInfo(request.params.publickey, function(err, info){
                if(err){
                  return callback(err, null);
                }else{
                  return callback(null, {
                    status: 'OK',
                    message:'',
                    result: info
                  });
                }
              });   
            }
  },
  function(err, results){
    if(err){
      handleError(err, response);
    }else{
      response.send(results.action);
    }

    var endTime = process.hrtime(startTime);
    logger.verbose(Utils.format("%d getAccountInfo() elapsed=%ds", callId, getElapsedTime(endTime))); 

    return next();      
  });
};


// ROUTE
server.get('/v1/permissions/:publickey', getPermissions);
server.get('/v1/info/:publickey', getAccountInfo);


// SERVER LAUNCH

server.listen(config.serverPort, function(){
  var listenStr = Utils.format('%s listening at %s', server.name, server.url);
  logger.notice(listenStr);
});
