'use strict';

var cache = require('memory-cache');
global.CPID_GLOBAL = "";
global.ENV_GLOBAL = "";
global.DEVICE_CONNECTED = false;
global.GLOBAL_CALLBACK = "";
global.GLOBAL_CALLBACK_TWIN = "";
global.SDK_OPTIONS = "";
global.UNIQUE_ID = "";
global.STOP_SDK_CONNECTION = false;

//Node Constructor initiator
module.exports = Init;

function Init (cpid, uniqueId, callback, twinCallback, env="", sdkOptions = "") {
  if(env == "")
    var env = "PROD";

  SDK_OPTIONS = sdkOptions;
  UNIQUE_ID = uniqueId;
  init(cpid, uniqueId, env, function(response){
    GLOBAL_CALLBACK = callback
    GLOBAL_CALLBACK_TWIN = twinCallback
    callback(response)
  })
}

/*
   Module : Device 
   Author : Mayank [SOFTWEB]
   Inputs : cpid, uniqueId (Device serial number)
   Output : Device detail with all atrributes
   Date   : 2018-01-24
*/
function init(cpid, uniqueId, env, callback){
    if((cpid != "" || cpid != undefined || cpid != null) && (uniqueId != "" || uniqueId != undefined || uniqueId != null) && (env != "" || env != undefined || env != null))
    {
      CPID_GLOBAL = cpid;
      ENV_GLOBAL = env;
      
      var config = require('./config/config');
      var commonLib = require('./lib/common');

        try{
            var initialParams = config.defaultParams;
            commonLib.syncDevice(cpid, uniqueId, initialParams, function(response){
              if(response.status)
              {
                matchResponse(response, uniqueId, cpid);
                if(response.data.rc == 0) {
                  callback({status: true, data: response.data, message: response.message}) 
                } else {
                  var message = "";
                  switch (response.data.rc) {
                    case config.responseCode.DEVICE_NOT_REGISTERED : // 1 - Device Not Registered
                        var message = "DEVICE_NOT_REGISTERED";
                        break;
                        
                    case config.responseCode.AUTO_REGISTER : // 2 - Auto Register
                        var message = "AUTO_REGISTER";
                        break;
                        
                    case config.responseCode.DEVICE_NOT_FOUND : // 3 - Device Not Found
                        var message = "DEVICE_NOT_FOUND";
                        break;
                
                    case config.responseCode.DEVICE_INACTIVE: // 4 - Device InActive
                        var message = "DEVICE_INACTIVE";
                        break;
                    
                    case config.responseCode.OBJECT_MOVED : // 5 - Object Moved
                        var message = "OBJECT_MOVED";
                        break;
                
                    case config.responseCode.CPID_NOT_FOUND: // 6 - Device InActive
                        var message = "CPID_NOT_FOUND";
                        break;
                
                    default:
                        var message = "NO_RESPONSE_CODE_MATCHED";
                        break;
                  }
                  callback({status: false, data: [], message: message})
                }
              }
              else
              {
                process.exit();
                callback({status: false, data: response.data, message: response.message})
              }
            })
        }
        catch(err)
        {
            callback({status: false, data: err.message, message: "Something  went wrong."})
        }
    }
    else
    {
        callback({status: false, data: [], message: "Required parameter missing."})
    }
}


var matchResponse = function matchResponse(response, uniqueId, cpid){
  
  var commonLib = require('./lib/common');
  var config = require('./config/config');
  
  switch (response.data.rc) {

    case config.responseCode.OK: // 0 - Ok device
        cache.clear();
        response.data["id"] = uniqueId
        cache.put("deviceSyncRes", response.data);
        DEVICE_CONNECTED = false;
        if(hbStatusFlag == 0)
        {
          hbStatusFlag = 1;
          commonLib.startHeartBeat();
          commonLib.subscriberProcess(cpid, uniqueId, function(cb){
            GLOBAL_CALLBACK(cb);
            //callback(cb);
          });
        }
        break;
    
    case config.responseCode.DEVICE_NOT_REGISTERED : // 1 - Device Not Registered
        // console.log("RC CODE : "+config.responseCode.DEVICE_NOT_REGISTERED+ " (DEVICE_NOT_REGISTERED)");
        if(response.data.sc)
        {
          var duration = parseInt(response.data.sc.sf) * 1000;
        }
        else
        {
          var duration = 10000;
        }
        setTimeout(() => {
          console.log("Rechecking...");
          console.log("RC CODE : "+config.responseCode.DEVICE_NOT_REGISTERED+ " (DEVICE_NOT_REGISTERED)");
          init(cpid, uniqueId, ENV_GLOBAL, function(cb){ 
            GLOBAL_CALLBACK(cb);
          });
        }, duration);
        break;

    case config.responseCode.AUTO_REGISTER : // 2 - Auto Register
        // console.log("RC CODE : "+config.responseCode.AUTO_REGISTER+ " (AUTO_REGISTER)");
        break;

    case config.responseCode.DEVICE_NOT_FOUND : // 3 - Device Not Found
        // console.log("RC CODE : "+config.responseCode.DEVICE_NOT_FOUND+ " (DEVICE_NOT_FOUND)");
        if(response.data.sc)
        {
          var duration = parseInt(response.data.sc.sf) * 1000;
        }
        else
        {
          var duration = 10000;
        }
        setTimeout(() => {
          console.log("Rechecking... ");
          console.log("RC CODE : "+config.responseCode.DEVICE_NOT_FOUND+ " (DEVICE_NOT_FOUND)");
          init(cpid, uniqueId, ENV_GLOBAL, function(cb){ 
            GLOBAL_CALLBACK(cb);
          });
        }, duration);
        break;

    case config.responseCode.DEVICE_INACTIVE: // 4 - Device InActive
        // console.log("RC CODE : "+config.responseCode.DEVICE_INACTIVE+ " (DEVICE_INACTIVE)");
        hbStatusFlag = 0;
        if(response.data.sc)
        {
          var duration = parseInt(response.data.sc.sf) * 1000;
        }
        else
        {
          var duration = 10000;
        }
        setTimeout(() => {
          console.log("Rechecking...");
          console.log("RC CODE : "+config.responseCode.DEVICE_INACTIVE+ " (DEVICE_INACTIVE)");
          init(cpid, uniqueId, ENV_GLOBAL, function(cb){ 
            GLOBAL_CALLBACK(cb);
          });
        }, duration);
        break;
    
    case config.responseCode.OBJECT_MOVED : // 5 - Object Moved
        // console.log("RC CODE : "+config.responseCode.OBJECT_MOVED+ "(OBJECT_MOVED)");
        break;

    case config.responseCode.CPID_NOT_FOUND: // 6 - Device InActive
        console.log("RC CODE : "+config.responseCode.CPID_NOT_FOUND+ " (CPID_NOT_FOUND)");
        //console.log(response.data)
        break;

    default:
        // console.log("RC CODE : "+null+ "(NO_RESPONSE_CODE_MATCHED)");
        break;
  }
}


/*
   Module : Device 
   Author : Mayank [SOFTWEB]
   Inputs : cpid, uniqueId (Device serial number)
   Output : Device detail with all atrributes
   Date   : 2018-01-24
*/
Init.prototype.SendData  =  function SendData(data){
  
    var commonLib = require('./lib/common');
    if(data != "" && data.length > 0)
    {
        try{
          if (STOP_SDK_CONNECTION == true) {
            commonLib.SendDataToHub(data, function(response){
                if(response.status){
                  // callback(response)
                }
            })
          } else {
            console.log("The device is not available on the cloud.");
            //callback({status: false, data: [], message: "The device is not available on the cloud."})  
          }
        }
        catch(err)
        {
          // callback({status: false, data: err, message: err.message});
        }
    }
    else
    {
        // callback({status: false, data: [], message: "Required parameter missing."})
    }
}

/*
   Module : Device 
   Author : Mayank [SOFTWEB]
   Inputs : cpid, uniqueId (Device serial number)
   Output : Device detail with all atrributes
   Date   : 2018-04-06
*/
Init.prototype.getAttributes  =  function getAttributes(callback){
  
  var commonLib = require('./lib/common');
  try{
        commonLib.getAttributes(function(response){
          callback({status: true, data: response.data, message: "Attribute get successfully."});
        })
    }
    catch(err)
    {
      callback({status: false, data: err, message: err.message});
    }
}

/*
   Module : Device 
   Author : Mayank [SOFTWEB]
   Inputs : 
   Output : Device list
   Date   : 2018-04-06
*/
Init.prototype.getDevices  =  function getDevices(callback){
  try{
      var responseData = cache.get("deviceSyncRes");
      callback({status: true, data: responseData.d, message: "Devices get successfully."});
    }
    catch(err)
    {
      callback({status: false, data: err, message: err.message});
    }
}

/*
   Module : Device 
   Author : Mayank [SOFTWEB]
   Inputs : Key, Value
   Output : Device list
   Date   : 2019-06-11
*/
Init.prototype.UpdateTwin  =  function UpdateTwin(key, value, callback){
  try{
    if (STOP_SDK_CONNECTION == true) {
      var commonLib = require('./lib/common');
      var obj = {};
      obj[key] = value;
      commonLib.UpdateTwin(obj, function(response){
        callback({status: true, data: response.data, message: response.message});
      })
    } else {
      console.log("The device is not available on the cloud.");
      callback({status: false, data: [], message: "The device is not available on the cloud so, it has been stopped the device connection forcefully."})  
    }
  }
  catch(err)
  {
    callback({status: false, data: err, message: err.message});
  }
}


/* 
 * Device disconnect
 * @author : MK
 * Device disconnected
 * @param: 
 */
Init.prototype.disconnectDevice = function disconnectDevice(callback) {
  var commonLib = require('./lib/common');
  try {
    commonLib.mqttConnectionEnd(function (response) {
      callback(response)
    })
  } catch (error) {
    callback({
      status: false,
      data: error,
      message: error.message
    })
  }
}

/* 
 * Send Command Ack
 * @author : MK
 * Send Command Ack
 * @param: 
 */
Init.prototype.sendAck = function sendAck(objdata, time, mt, callback) {
  var commonLib = require('./lib/common');
  try {
    if (STOP_SDK_CONNECTION == true) {
      commonLib.sendCommandAck(objdata, time, mt, function (response) {
        callback(response)
      })
    } else {
      console.log("The device is not available on the cloud.");
      callback({status: false, data: [], message: "The device is not available on the cloud."})  
    }
  } catch (error) {
    console.log(error)
    callback({
      status: false,
      data: error,
      message: error.message
    })
  }
}