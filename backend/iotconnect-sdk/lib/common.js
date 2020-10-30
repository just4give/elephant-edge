'use strict';

var request = require('request');
var cache = require('memory-cache');
var async = require('async');
var jsonQuery = require('json-query');
var mqtt = require('mqtt');
var intervalValue = "";
var config = require('../config/config');
var cnter = 0;
var globalClientConnection = "";
var intervalObj = [];
var _ = require('lodash');
var fs = require('fs-extra');
// var offlineDataFile = './offlineData.json';
var offlineDataFile = './offlineData.json';
var sslCertificationFiles = "";
var globalCPID = "";
var globalUNIQUEID = '';
var logArray = {};

/*
   Module : Device 
   Author : Mayank [SOFTWEB]
   Inputs : cpid, uniqueId (Device serial number)
   Output : Device detail with all atrributes
   Date   : 2018-01-24
*/
var getBaseUrl = function getBaseUrl(callback) {
    request.get({
            url: config.discoveryBaseUrl,
            json: true
        },
        function (error, response, body) {
            if (error) {
                if (error.code == "EAI_AGAIN") {
                    var message = config.errorCode.e0105;
                    var response = null;
                    writeLog("e0105", message, response);
                    setTimeout(() => {
                        callback(false, config.errorCode.e0105);
                    }, 5000);
                } else {
                    var message = config.errorCode.e0104;
                    var response = null;
                    writeLog("e0104", error.message, error);
                    setTimeout(() => {
                        callback(false, error.message);
                    }, 100);
                }
            } else {
                if (response && response.statusCode == 200) {
                    callback(true, body);
                } else {
                    var message = config.errorCode.e0100;
                    var response = null;
                    writeLog("e0100", message, response);
                    setTimeout(() => {
                        callback(false, config.errorCode.e0100); // Temp
                    }, 100);
                }
            }
        });
}


/*
   Module : Device 
   Author : Mayank [SOFTWEB]
   Inputs : cpid, uniqueId (Device serial number)
   Output : Device detail with all atrributes
   Date   : 2018-01-24
*/
var syncDevice = function syncDevice(cpid, uniqueId, params, callback) {
    globalCPID = cpid;
    globalUNIQUEID = uniqueId;
    try {
        getBaseUrl(function (status, responseData) {
            if (status == true) {
                var storeSensorArray = {
                    "cpId": cpid,
                    "uniqueId": uniqueId,
                    "option": params
                };
                request.post({
                        url: responseData.baseUrl + "sync",
                        body: storeSensorArray,
                        json: true
                    },
                    function (error, response, body) {
                        try {
                            if (error) {
                                if (error.code == "EAI_AGAIN") {
                                    // var message = config.errorCode.e0105;
                                    // var response = null;
                                    // writeLog("e0105" ,message, response); 
                                    callback({
                                        status: false,
                                        data: null,
                                        message: message
                                    });
                                } else {
                                    // var message = config.errorCode.e0104;
                                    // var response = error;
                                    //// writeLog("e0104" ,error.message, error);
                                    callback({
                                        status: false,
                                        data: null,
                                        message: error.message
                                    });
                                }
                            } else {
                                if (response && response.statusCode == 200) {
                                    // console.log("body.d ==> ", JSON.stringify(body.d));
                                    var resultData = body.d;
                                    resultData['edgeData'] = "";
                                    resultData['rulesData'] = "";
                                    if (resultData.ee == config.edgeEnableStatus.enabled) {
                                        async.series([
                                            function (cb_series) {
                                                try {
                                                    setEdgeConfiguration(resultData.att, uniqueId, resultData.d, function (edgeData) {
                                                        resultData.edgeData = edgeData;
                                                        cb_series();
                                                    });
                                                } catch (err) {
                                                    cb_series();
                                                }
                                            },
                                            function (cb_series) {
                                                try {
                                                    setRuleaConfiguration(resultData.r, uniqueId, function (rulesData) {
                                                        resultData.rulesData = rulesData;
                                                        cb_series();
                                                    });
                                                } catch (err) {
                                                    cb_series();
                                                }
                                            }
                                        ], function (err, response) {
                                            callback({
                                                status: true,
                                                data: resultData,
                                                message: config.errorCode.e0106
                                            })
                                        })
                                    } else {
                                        callback({
                                            status: true,
                                            data: resultData,
                                            message: config.errorCode.e0106
                                        })
                                    }
                                } else {
                                    if (body.status == 53) {
                                        // var message = config.errorCode.e0106;
                                        // var response = body.message;
                                        //writeLog("e0106" ,message, response);
                                        callback({
                                            status: false,
                                            data: error,
                                            message: body.message
                                        });
                                    } else {
                                        // var message = config.errorCode.e0107;
                                        // var response = error;
                                        //writeLog("e0107" ,message, response);
                                        callback({
                                            status: false,
                                            data: error,
                                            message: config.errorCode.e0107
                                        })
                                    }
                                }
                            }
                        } catch (e) {
                            // var message = config.errorCode.e0104;
                            // var response = e;
                            //writeLog("e0104", message, response);
                            callback({
                                status: false,
                                data: e,
                                message: e.message
                            })
                        }
                    });
            } else {
                callback({
                    status: false,
                    data: [],
                    message: responseData
                })
            }
        })
    } catch (err) {
        // var message = config.errorCode.e0104;
        // var response = err;
        //writeLog("e0104", message, response);
        // console.log("Hello Here ====== ");
        callback({
            status: false,
            data: err.message,
            message: config.errorCode.e0104
        })
    }
}


/*
   Module : Device 
   Author : Mayank [SOFTWEB]
   Inputs : cpid, uniqueId (Device serial number)
   Output : Device detail with all atrributes
   Date   : 2018-01-24
*/
var syncDeviceByParam = function syncDeviceByParam(cpid, uniqueId, params, callback) {
    try {
        getBaseUrl(function (status, responseData) {
            if (status == true) {
                var storeSensorArray = {
                    "cpId": cpid,
                    "uniqueId": uniqueId,
                    "option": params
                };
                request.post({
                        url: responseData.baseUrl + "sync",
                        body: storeSensorArray,
                        json: true
                    },
                    function (error, response, body) {
                        if (error) {
                            if (error.code == "EAI_AGAIN") {
                                callback({
                                    status: false,
                                    data: null,
                                    message: "Network connection error"
                                });
                            } else {
                                callback({
                                    status: false,
                                    data: null,
                                    message: error.message
                                });
                            }
                        } else {
                            if (response && response.statusCode == 200) {
                                // ****** DO NOT DELETE ******
                                var resultData = body.d;
                                if (resultData.ee == config.edgeEnableStatus.enabled) {
                                    async.series([
                                        function (cb_series) {
                                            if (params.rule == true) {
                                                try {
                                                    setRuleaConfiguration(resultData.r, uniqueId, function (rulesData) {
                                                        resultData.rulesData = rulesData;
                                                        cb_series();
                                                    });
                                                } catch (err) {
                                                    //console.log("---Rule update Error ----"+err);
                                                }
                                            } else if (params.attribute == true) {
                                                //console.log("Attribute update start...");
                                                try {
                                                    setEdgeConfiguration(resultData.att, uniqueId, resultData.d, function (edgeData) {
                                                        resultData.edgeData = edgeData;
                                                        cb_series();
                                                    });
                                                } catch (err) {
                                                    //console.log("---Attribute update Error ----"+err);
                                                }
                                            } else if (params.setting == true) {
                                                //console.log("Setting update start...");
                                                cb_series();
                                            } else if (params.protocol == true) {
                                                //console.log("Protocol update start...");
                                                cb_series();
                                            } else if (params.device == true) {
                                                //console.log("Device update start...");
                                                cb_series();
                                            }
                                        }
                                    ], function (err, response) {
                                        //console.log("In-->",resultData);
                                        callback({
                                            status: true,
                                            data: resultData,
                                            message: "Data sync successfully."
                                        })
                                    })
                                } else {
                                    //console.log("else-->",resultData);
                                    callback({
                                        status: true,
                                        data: resultData,
                                        message: "Data sync successfully."
                                    })
                                }
                            } else {
                                callback({
                                    status: false,
                                    data: error,
                                    message: "No data found."
                                })
                            }
                        }
                    });
            } else {
                callback({
                    status: false,
                    data: [],
                    message: "Try again"
                })
            }
        })
    } catch (err) {
        console.log("err=>", err);
        callback({
            status: false,
            data: err.message,
            message: "Something went wrong."
        })
    }
}


/*
   Module : Device 
   Author : Mayank [SOFTWEB]
   Inputs : Attribute data 
   Output : Set Edge configuration for attriibute value
   Date   : 2018-02-20
*/

function setEdgeConfiguration(attributes, uniqueId, devices, callback) {
    var mainObj = {};
    async.forEachSeries(attributes, function (attribute, cb_main) {
        if (attribute.p == "") {
            async.forEachSeries(attribute.d, function (attr, cb_pc) {
                var edgeAttributeKey = attr.ln + "-" + attr.tg;
                var attrTag = attr.tg;
                var attrObj = {};
                attrObj.parent = attribute.p;
                attrObj.sTime = "";
                attrObj.data = [];

                var dataSendFrequency = attr.tw;
                var lastChar = dataSendFrequency.substring(dataSendFrequency.length, dataSendFrequency.length - 1);
                var strArray = ['s', 'm', 'h'];
                var strArrayStr = strArray.toString();
                if (strArrayStr.indexOf(lastChar) != -1) // Check the Tumbling Window validation
                {
                    var tumblingWindowTime = dataSendFrequency.substring(0, dataSendFrequency.length - 1);
                    setIntervalForEdgeDevice(tumblingWindowTime, lastChar, edgeAttributeKey, uniqueId, attrTag, devices);
                } else {
                    console.log("Tumbling Window Format does not match with 's' or 'm' or 'h'");
                }

                var setAttributeObj = {};
                async.forEachSeries(Object.keys(config.aggrigateType), function (key, cb) {
                    var val = config.aggrigateType[key];
                    setAttributeObj.localName = attr.ln;
                    if (val & attr.agt) {
                        if (key == "count") {
                            setAttributeObj[key] = 0;
                        } else {
                            setAttributeObj[key] = "";
                        }
                    }
                    cb()
                }, function () {
                    attrObj.data.push(setAttributeObj);
                    mainObj[edgeAttributeKey] = attrObj;
                    cb_pc()
                });
            }, function () {
                cb_main();
            });
        } else {
            //console.log("==== In parent Child ====");
            var attrObj = {};
            attrObj.parent = attribute.p;
            attrObj.sTime = "";
            attrObj.data = [];
            var edgeAttributeKey = attribute.p + "-" + attribute.tg;
            var attrTag = attribute.tg;
            var dataSendFrequency = attribute.tw;
            var lastChar = dataSendFrequency.substring(dataSendFrequency.length, dataSendFrequency.length - 1);
            var tumblingWindowTime = dataSendFrequency.substring(0, dataSendFrequency.length - 1);
            async.forEachSeries(attribute.d, function (attr, cb_pc) {
                var setAttributeObj = {};
                async.forEachSeries(Object.keys(config.aggrigateType), function (key, cb) {
                    var val = config.aggrigateType[key];
                    setAttributeObj.localName = attr.ln;
                    if (val & attribute.agt) {
                        if (key == "count") {
                            setAttributeObj[key] = 0;
                        } else {
                            setAttributeObj[key] = "";
                        }
                    }
                    cb()
                }, function () {
                    attrObj.data.push(setAttributeObj);
                    cb_pc()
                });
            }, function () {
                mainObj[edgeAttributeKey] = attrObj;
                var strArray = ['s', 'm', 'h'];
                var strArrayStr = strArray.toString();
                if (strArrayStr.indexOf(lastChar) != -1) // Check the Tumbling Window validation
                {
                    setIntervalForEdgeDevice(tumblingWindowTime, lastChar, edgeAttributeKey, uniqueId, attrTag, devices);
                } else {
                    console.log("Tumbling Window Format does not match with 's' or 'm' or 'h'");
                }
                cb_main();
            });
        }
    }, function () {
        callback(mainObj);
    });
}


/*
   Module : Device 
   Author : Mayank [SOFTWEB]
   Inputs : Attribute data 
   Output : Set Edge configuration for attriibute value
   Date   : 2018-02-20
*/
function setRuleaConfiguration(rules, uniqueId, callback) {
    var ruleData = [];
    async.forEachSeries(rules, function (rulesData, cb_main) {
        async.forEachSeries(rulesData.att, function (attributes, cb_attr) {
            if (_.isArray(attributes.g)) // Its Parent
            {
                var objData = {};
                async.forEachSeries(attributes.g, function (ids, cb_inner) {
                    var atId = ids;
                    objData[atId] = rulesData;
                    cb_inner();
                }, function () {
                    ruleData.push(objData);
                    cb_attr();
                });
            } else {
                var objData = {};
                var atId = attributes.g;
                objData[atId] = rulesData;
                ruleData.push(objData);
                cb_attr();
            }
        }, function () {
            cb_main();
        });
    }, function () {
        callback(ruleData);
    });
}

/*
   Module : Device 
   Author : Mayank [SOFTWEB]
   Inputs : Sensor data 
   Output : Sensor data send with all attributes on iotHub
   Date   : 2018-01-25
*/
function setIntervalForEdgeDevice(tumblingWindowTime, timeType, edgeAttributeKey, uniqueId, attrTag, devices) {
    console.log("uniqueId ==> ", uniqueId);
    try {
        async.series([
            function (cb_series) {
                var tagArray = [];
                async.forEachSeries(devices, function (device, cbdevice) {
                    if (tagArray.indexOf(device.tg) == -1 && device.tg == attrTag) {
                        tagArray.push(device.tg);
                        uniqueId = device.id;
                        cbdevice()
                    } else {
                        cbdevice()
                    }
                }, function () {
                    cb_series();
                });
            }
        ], function (err, response) {
            var cnt = 0;
            if (timeType == 's') {
                var duration = parseInt(tumblingWindowTime) * 1000;
            } else if (timeType == 'm') {
                var duration = parseInt(tumblingWindowTime) * 1000 * 60;
            } else if (timeType == 'h') {
                var duration = parseInt(tumblingWindowTime) * 1000 * 60 * 60;
            }
            var objInt = {};
            var intervalFlag = 0;
            async.forEachSeries(intervalObj, function (interval, data_cb) {
                if (edgeAttributeKey in interval) {
                    intervalFlag = 1;
                }
                data_cb();
            }, function () {
                if (intervalFlag == 0) {
                    var newInterval = setInterval(function () {
                        cnt++;
                        var deviceSyncRes = cache.get("deviceSyncRes");
                        var edgeDatObj = deviceSyncRes.edgeData;
                        var edgeObj = edgeDatObj[edgeAttributeKey];
                        if (edgeDatObj[edgeAttributeKey] != undefined) {
                            if (edgeObj.parent != "" && edgeObj.parent != undefined) { // Its Parent - child attribute
                                var deviceInputData = {
                                    "id": uniqueId,
                                    "t": new Date(),
                                    "d": []
                                }
                                var inputData = {};
                                var inputDataObj = {};
                                var objParentName = edgeObj.parent;
                                async.forEachSeries(edgeObj.data, function (attrObj, cbfirst) {
                                    var dataSendFlag = 0;
                                    var agtObjEEArray = [];
                                    agtObjEEArray.push(attrObj.agt);
                                    var localnameVar = "";
                                    async.forEachSeries(Object.keys(attrObj), function (key, cb) {
                                        if (attrObj.localName) {
                                            localnameVar = attrObj.localName;
                                        }
                                        if (key == config.aggrigateTypeLablel.min) {
                                            agtObjEEArray.push(parseFloat(attrObj.min));
                                        } else if (key == config.aggrigateTypeLablel.max) {
                                            agtObjEEArray.push(parseFloat(attrObj.max));
                                        } else if (key == config.aggrigateTypeLablel.sum) {
                                            agtObjEEArray.push(parseFloat(attrObj.sum));
                                        } else if (key == config.aggrigateTypeLablel.avg) {
                                            agtObjEEArray.push(parseFloat(attrObj.sum) / parseInt(attrObj.count));
                                        } else if (key == config.aggrigateTypeLablel.count && attrObj.count > 0) {
                                            agtObjEEArray.push(parseFloat(attrObj.count));
                                            dataSendFlag = 1;
                                        } else if (key == config.aggrigateTypeLablel.lv) {
                                            agtObjEEArray.push(parseFloat(attrObj.lv));
                                        }
                                        cb()
                                    }, function () {
                                        if (dataSendFlag == 1) {
                                            inputData[localnameVar] = agtObjEEArray;
                                        }
                                    });
                                    cbfirst()
                                }, function () {
                                    if (Object.keys(inputData).length > 0) {
                                        inputDataObj[objParentName] = inputData;
                                        deviceInputData.d.push(inputDataObj);
                                        var newObj = _.cloneDeep(deviceInputData);
                                        edgeDataEvaluation(newObj);
                                        refreshEdgeObj(edgeAttributeKey);
                                    }
                                });
                            } else { // Its Non Parent Attriobute 
                                var deviceInputData = {
                                    "id": uniqueId,
                                    "t": new Date(),
                                    "d": []
                                }
                                var inputData = {};
                                async.forEachSeries(edgeObj.data, function (attrObj, cbfirst) {
                                    var dataSendFlag = 0;
                                    var agtObjEEArray = [];
                                    agtObjEEArray.push(attrObj.agt);
                                    var localnameVar = "";
                                    async.forEachSeries(Object.keys(attrObj), function (key, cb) {
                                        if (attrObj.localName) {
                                            localnameVar = attrObj.localName;
                                        }
                                        if (key == config.aggrigateTypeLablel.min) {
                                            agtObjEEArray.push(parseFloat(attrObj.min));
                                        } else if (key == config.aggrigateTypeLablel.max) {
                                            agtObjEEArray.push(parseFloat(attrObj.max));
                                        } else if (key == config.aggrigateTypeLablel.sum) {
                                            agtObjEEArray.push(parseFloat(attrObj.sum));
                                        } else if (key == config.aggrigateTypeLablel.avg) {
                                            agtObjEEArray.push(parseFloat(attrObj.sum) / parseInt(attrObj.count));
                                        } else if (key == config.aggrigateTypeLablel.count && attrObj.count > 0) {
                                            agtObjEEArray.push(parseFloat(attrObj.count));
                                            dataSendFlag = 1;
                                        } else if (key == config.aggrigateTypeLablel.lv) {
                                            agtObjEEArray.push(parseFloat(attrObj.lv));
                                        }
                                        cb()
                                    }, function () {
                                        if (dataSendFlag == 1) {
                                            inputData[localnameVar] = agtObjEEArray;
                                        }
                                    });
                                    cbfirst()
                                }, function () {
                                    if (Object.keys(inputData).length > 0) {
                                        deviceInputData.d.push(inputData);
                                        var newObj = _.cloneDeep(deviceInputData);
                                        edgeDataEvaluation(newObj);
                                        refreshEdgeObj(edgeAttributeKey);
                                    }
                                });
                            }
                        }
                    }, duration);
                    objInt[edgeAttributeKey] = newInterval;
                    intervalObj.push(objInt);
                } else {
                    //console.log(edgeAttributeKey+"--- Duplicate Found ----",intervalFlag)
                }
            });
        })
    } catch (error) {
        console.log("setIntervalForEdgeDevice ERROR :: ", error.message);
    }
}

function refreshEdgeObj(edgeAttributeKey) {
    var deviceSyncRes = cache.get("deviceSyncRes");
    var edgeDatObj = deviceSyncRes.edgeData;
    var edgeObj = edgeDatObj[edgeAttributeKey];
    async.forEachSeries(edgeObj.data, function (obj, cb) {
        async.forEachSeries(Object.keys(obj), function (key, cb1) {
            // console.log("key => ", key);
            if (key == config.aggrigateTypeLablel.sum) {
                obj[key] = "";
            }
            if (key == config.aggrigateTypeLablel.min) {
                obj[key] = "";
            }
            if (key == config.aggrigateTypeLablel.max) {
                obj[key] = "";
            }
            if (key == config.aggrigateTypeLablel.count) {
                obj[key] = 0;
            }
            if (key == config.aggrigateTypeLablel.avg) {
                obj[key] = "";
            }
            if (key == config.aggrigateTypeLablel.lv) {
                obj[key] = "";
            }
            if (key == config.aggrigateTypeLablel.agt) {
                obj[key] = "";
            }
            cb1()
        }, function () {
            cb();
        });
    }, function () {

    });
}

function edgeDataEvaluation(deviceInputData) {
    var uniqueId = deviceInputData.id;
    var deviceSendTime = deviceInputData.t;
    var tag = "";
    var deviceEdgeData = deviceInputData.d;
    var deviceData = cache.get("deviceSyncRes");

    var dataObj = {
        "cpId": deviceData.cpId,
        "dtg": deviceData.dtg,
        "t": new Date(),
        "mt": config.messageType.rptEdge,
        "sdk": {
            "l": config.sdkLanguage,
            "v": config.sdkVersion,
            "e": ENV_GLOBAL
        },
        "d": []
    };

    var attributeObj = {};
    var attributeObjFLT = {};
    async.series([
        function (cb_series) {
            var sendArray = {};
            var resultDevice = jsonQuery('d[*id=' + uniqueId + ']', {
                data: deviceData
            })
            attributeObj["id"] = uniqueId;
            attributeObj["dt"] = deviceSendTime;
            attributeObj["tg"] = resultDevice.value[0].tg;
            attributeObj["d"] = [];
            cb_series();
        },
        function (cb_series) {
            var withoutParentAttrObj = "";
            async.forEachSeries(deviceEdgeData, function (data, cb_fl_dData) {
                attributeObj.d.push(data);
                cb_fl_dData();
            }, function () {
                cb_series();
            });
        }
    ], function (err, response) {
        if (deviceData.ee == config.edgeEnableStatus.enabled) {
            dataObj.d.push(attributeObj);
            sendDataOnAzureMQTT(dataObj);
        }
    })
}

/*
   Module : Device 
   Author : Mayank [SOFTWEB]
   Inputs : Sensor data 
   Output : Sensor data send with all attributes on iotHub
   Date   : 2018-01-25
*/
var SendDataToHub = function SendDataToHub(offlineData, cb) {
    var deviceSyncRes = cache.get("deviceSyncRes");
    try {
        if ((deviceSyncRes != undefined || deviceSyncRes != "") && (typeof deviceSyncRes == 'object')) {
            setSendDataFormat(offlineData);
            cb({
                status: true,
                data: [],
                message: 'Sensor information has been sent to cloud.'
            })
        } else {
            cb({
                status: false,
                data: [],
                message: 'Device information has not found. Please call Init() method first.'
            })
        }
    } catch (error) {
        console.log("SendDataToHub :: error  ==> ", error)
    }
}


/*
   Module : Device 
   Author : Mayank [SOFTWEB]
   Inputs : Sensor data 
   Output : Sensor data send with all attributes on iotHub
   Date   : 2018-01-25
*/
var setSendDataFormat = function setSendDataFormat(offlineData) {
    var deviceSyncRes = cache.get("deviceSyncRes");
    var deviceData = deviceSyncRes;
    var dataObj = {
        "cpId": deviceData.cpId,
        "dtg": deviceData.dtg,
        "t": new Date(),
        "mt": config.messageType.rpt,
        "sdk": {
            "l": config.sdkLanguage,
            "v": config.sdkVersion,
            "e": ENV_GLOBAL
        },
        "d": []
    };

    var dataObjFLT = {
        "cpId": deviceData.cpId,
        "dtg": deviceData.dtg,
        "t": new Date(),
        "mt": config.messageType.flt,
        "sdk": {
            "l": config.sdkLanguage,
            "v": config.sdkVersion,
            "e": ENV_GLOBAL
        },
        "d": []
    };
    async.forEachSeries(offlineData, function (deviceInputData, cb_fl_dData) {
        if (deviceInputData) {
            var uniqueId = deviceInputData.uniqueId;
            var deviceSendTime = deviceInputData.time;
            var tag = null;
            var data = deviceInputData.data;
            if ((data != undefined || data != "") && (typeof deviceSyncRes == 'object')) {
                var cntRPT = 0;
                var cntFLT = 0;
                var attributeObj = {};
                var attributeObjFLT = {};
                async.series([
                    function (cb_series) {
                        var sendArray = {};
                        var resultDevice = jsonQuery('d[*id=' + uniqueId + ']', {
                            data: deviceData
                        })
                        //console.log("Error 03 ");
                        tag = resultDevice.value[0].tg;
                        attributeObj["id"] = uniqueId;
                        attributeObj["dt"] = deviceSendTime;
                        attributeObj["tg"] = tag;
                        attributeObj["d"] = [];

                        attributeObjFLT["id"] = uniqueId;
                        attributeObjFLT["dt"] = deviceSendTime;
                        attributeObjFLT["tg"] = tag;
                        attributeObjFLT["d"] = [];
                        cb_series();
                    },
                    function (cb_series) {
                        var withoutParentAttrObj = {};
                        var withoutParentAttrObjFLT = {};
                        async.forEachSeries(Object.keys(data), function (attributeKey, cb_fl_dData) {
                            var parentAttrObj = {}
                            var parentAttrObjFLT = {}
                            if (typeof data[attributeKey] == "object") // true = Parent attribute
                            {
                                var parentChildArray = data[attributeKey];
                                var deviceSyncRes = cache.get("deviceSyncRes");
                                var deviceData = deviceSyncRes;
                                var resultDevice = jsonQuery('att[*p=' + attributeKey + ' & tg=' + tag + ']', {
                                    data: deviceData
                                })
                                if (resultDevice.value.length > 0) {
                                    //console.log("Error 08 ");
                                    async.forEachSeries(resultDevice.value, function (parentdeviceInfo, cb_fl_pdi) {
                                        var parentAttributeName = parentdeviceInfo.p;
                                        var parentDeviceAttributeInfo = [];
                                        var ruleValueFlag = 0;
                                        //console.log("Error 09 ");
                                        async.forEachSeries(parentdeviceInfo.d, function (childDeviceInfo, cb_fl_cdi) {
                                            async.forEachSeries(Object.keys(parentChildArray), function (parentChildKey, cb_fl_child) {
                                                var msgTypeStatus = 0;
                                                var attrValue = 0;
                                                if (parentChildKey == childDeviceInfo.ln) {
                                                    var dataType = childDeviceInfo.dt;
                                                    var dataValidation = childDeviceInfo.dv;
                                                    attrValue = parentChildArray[parentChildKey];
                                                    if (attrValue != "") {
                                                        // console.log("Error 010 ",childDeviceInfo);
                                                        dataValidationTest(dataType, dataValidation, attrValue, childDeviceInfo, msgTypeStatus, function (childAttrObj) {
                                                            if (childAttrObj.msgTypeStatus == 1) //msgTypeStatus = 1 (Validation Failed)
                                                            {
                                                                if (!parentAttrObjFLT[parentAttributeName])
                                                                    parentAttrObjFLT[parentAttributeName] = {};
                                                                //console.log("Error 011 ");
                                                                delete childAttrObj['msgTypeStatus'];
                                                                parentAttrObjFLT[parentAttributeName][childAttrObj.ln] = childAttrObj.v;
                                                                cntFLT++;
                                                            } else {
                                                                //console.log("Error 012 ");
                                                                if (deviceData.ee == config.edgeEnableStatus.enabled && dataType == config.dataType.number) // Its Edge Enable Device
                                                                {
                                                                    ruleValueFlag = 1;
                                                                    childDeviceInfo.parentGuid = parentdeviceInfo.guid;
                                                                    childDeviceInfo.p = parentAttributeName;
                                                                    childDeviceInfo.value = attrValue;
                                                                    parentDeviceAttributeInfo.push(childDeviceInfo);
                                                                    setEdgeVal(childDeviceInfo, attrValue);
                                                                } else {
                                                                    if (!parentAttrObj[parentAttributeName])
                                                                        parentAttrObj[parentAttributeName] = {};
                                                                    delete childAttrObj['msgTypeStatus'];
                                                                    parentAttrObj[parentAttributeName][childAttrObj.ln] = childAttrObj.v;
                                                                    cntRPT++;
                                                                }
                                                            }
                                                            cb_fl_child();
                                                        })
                                                    } else {
                                                        cb_fl_child();
                                                    }
                                                } else {
                                                    cb_fl_child();
                                                }
                                            }, function () {
                                                cb_fl_cdi();
                                            });
                                        }, function () {
                                            if (deviceData.ee == config.edgeEnableStatus.enabled && ruleValueFlag == 1) // Its Edge Enable Device
                                            {
                                                setRuleVal(parentDeviceAttributeInfo, null, attributeObj);
                                            }
                                            cb_fl_pdi();
                                        });
                                    }, function () {
                                        if (parentAttrObjFLT) {
                                            attributeObjFLT.d.push(parentAttrObjFLT);
                                        }
                                        if (parentAttrObj) {
                                            attributeObj.d.push(parentAttrObj);
                                        }
                                        cb_fl_dData();
                                    });
                                } else {
                                    cb_fl_dData();
                                }
                            } else // No Parent
                            {
                                var deviceSyncRes = cache.get("deviceSyncRes");
                                var deviceData = deviceSyncRes;
                                async.forEachSeries(deviceData.att, function (noParentDeviceInfo, cb_fl_npdi) {
                                    if (noParentDeviceInfo.p == "") {
                                        var parentAttributeName = noParentDeviceInfo.p;
                                        async.forEachSeries(noParentDeviceInfo.d, function (childDeviceInfo, cb_fl_cdi) {
                                            var msgTypeStatus = 0;
                                            if (childDeviceInfo.tg == tag && attributeKey == childDeviceInfo.ln) {
                                                var attrValue = data[attributeKey];
                                                var dataType = childDeviceInfo.dt;
                                                var dataValidation = childDeviceInfo.dv;
                                                if (attrValue != "") {
                                                    dataValidationTest(dataType, dataValidation, attrValue, childDeviceInfo, msgTypeStatus, function (childAttrObj) {
                                                        if (childAttrObj.msgTypeStatus == 1) //msgTypeStatus = 1 (Validation Failed)
                                                        {
                                                            delete childAttrObj['msgTypeStatus'];
                                                            withoutParentAttrObjFLT[childAttrObj.ln] = childAttrObj.v;
                                                            cntFLT++;
                                                        } else {
                                                            if (deviceData.ee == config.edgeEnableStatus.enabled && dataType == config.dataType.number) // Its Edge Enable Device
                                                            {
                                                                childDeviceInfo.parentGuid = noParentDeviceInfo.guid;
                                                                childDeviceInfo.p = parentAttributeName;
                                                                setEdgeVal(childDeviceInfo, attrValue);
                                                                setRuleVal(childDeviceInfo, attrValue, attributeObj);
                                                            } else {
                                                                delete childAttrObj['msgTypeStatus'];
                                                                withoutParentAttrObj[childAttrObj.ln] = childAttrObj.v;
                                                                cntRPT++;
                                                            }
                                                        }
                                                        cb_fl_cdi();
                                                    })
                                                } else {
                                                    cb_fl_cdi();
                                                }
                                            } else {
                                                cb_fl_cdi();
                                            }
                                        }, function () {
                                            cb_fl_npdi();
                                        });
                                    } else {
                                        cb_fl_npdi();
                                    }
                                }, function () {
                                    cb_fl_dData();
                                });
                            }
                        }, function () {
                            if (withoutParentAttrObjFLT) {
                                attributeObjFLT.d.push(withoutParentAttrObjFLT);
                            }
                            if (withoutParentAttrObj) {
                                attributeObj.d.push(withoutParentAttrObj);
                            }
                            cb_series();
                        });
                    }
                ], function (err, response) {
                    if (cntFLT > 0 && deviceData.ee == config.edgeEnableStatus.disabled) {
                        attributeObjFLT.d = [_.reduce(attributeObjFLT.d, _.extend)];
                        dataObjFLT.d.push(attributeObjFLT)
                    }
                    if (cntRPT > 0 && deviceData.ee == config.edgeEnableStatus.disabled) {
                        attributeObj.d = [_.reduce(attributeObj.d, _.extend)];
                        dataObj.d.push(attributeObj);
                    }
                    cb_fl_dData();
                })
            } else {
                console.log("----- deviceSyncRes not available ---- \n----- need to call Init() the method first ----");
                cb_fl_dData();
            }
        } else {
            console.log("Device data not found");
            cb_fl_dData();
        }
    }, function () {
        if (dataObjFLT.d.length > 0 && deviceData.ee == config.edgeEnableStatus.disabled) {
            sendDataOnAzureMQTT(dataObjFLT);
        }
        if (dataObj.d.length > 0 && deviceData.ee == config.edgeEnableStatus.disabled) {
            sendDataOnAzureMQTT(dataObj);
        }
    });
}


function setEdgeVal(attributeInfo, attrValue) {
    var deviceSyncRes = cache.get("deviceSyncRes");
    var edgeDatObj = deviceSyncRes.edgeData;
    if (attributeInfo.p != "" && attributeInfo.p != undefined) // If Parent attribute
    {
        //console.log("---- its parent ----");
        var eekey = attributeInfo.p + "-" + attributeInfo.tg
        var edgeObj = edgeDatObj[eekey];
        async.forEachSeries(edgeObj.data, function (atrributeData, cb) {
            atrributeData["agt"] = attributeInfo.agt;
            if (attributeInfo.ln == atrributeData.localName) {
                var newAtrrValue = atrributeData;
                var inputCounter = parseInt(atrributeData.count) + 1;
                newAtrrValue.count = inputCounter;
                async.forEachSeries(Object.keys(newAtrrValue), function (key, cb_atr) {
                    if (key == config.aggrigateTypeLablel.min) {
                        if (newAtrrValue[key] == "" || isNaN(newAtrrValue[key])) {
                            newAtrrValue[key] = attrValue;
                        } else if (parseFloat(newAtrrValue[key]) > parseFloat(attrValue)) {
                            newAtrrValue[key] = attrValue;
                        } else {
                            newAtrrValue[key] = atrributeData[key];
                        }
                    }
                    if (key == config.aggrigateTypeLablel.max) {
                        if (newAtrrValue[key] == "" || isNaN(newAtrrValue[key])) {
                            newAtrrValue[key] = attrValue;
                        } else if (parseFloat(newAtrrValue[key]) < parseFloat(attrValue)) {
                            newAtrrValue[key] = attrValue;
                        } else {
                            newAtrrValue[key] = newAtrrValue[key];
                        }
                    }
                    if (key == config.aggrigateTypeLablel.sum) {
                        if (newAtrrValue[key] == "" || isNaN(newAtrrValue[key])) {
                            newAtrrValue[key] = attrValue;
                        } else {
                            newAtrrValue[key] = parseFloat(newAtrrValue[key]) + parseFloat(attrValue);
                        }
                    }
                    if (key == config.aggrigateTypeLablel.lv) {
                        newAtrrValue[key] = attrValue;
                    }
                    cb_atr()
                }, function () {
                    cb()
                });
            } else {
                cb();
            }
        }, function () {
            var deviceSyncRes = cache.get("deviceSyncRes");
            deviceSyncRes = deviceSyncRes.edgeData[attributeInfo.parentGuid];
        });
    } else { // No parent attribute
        //console.log("=== Non Parent ===");
        var eekey = attributeInfo.ln + "-" + attributeInfo.tg
        var edgeObj = edgeDatObj[eekey];
        async.forEachSeries(edgeObj.data, function (atrributeData, cb) {
            atrributeData["agt"] = attributeInfo.agt;
            var newAtrrValue = atrributeData;
            var inputCounter = parseInt(atrributeData.count) + 1;
            newAtrrValue.count = inputCounter;
            async.forEachSeries(Object.keys(newAtrrValue), function (key, cb_atr) {

                if (key == config.aggrigateTypeLablel.min) {
                    if (newAtrrValue[key] == "" || isNaN(newAtrrValue[key])) {
                        newAtrrValue[key] = attrValue;
                    } else if (parseFloat(newAtrrValue[key]) > parseFloat(attrValue)) {
                        newAtrrValue[key] = attrValue;
                    } else {
                        newAtrrValue[key] = atrributeData[key];
                    }
                }
                if (key == config.aggrigateTypeLablel.max) {
                    if (newAtrrValue[key] == "" || isNaN(newAtrrValue[key])) {
                        newAtrrValue[key] = attrValue;
                    } else if (parseFloat(newAtrrValue[key]) < parseFloat(attrValue)) {
                        newAtrrValue[key] = attrValue;
                    } else {
                        newAtrrValue[key] = newAtrrValue[key];
                    }
                }
                if (key == config.aggrigateTypeLablel.sum) {
                    if (newAtrrValue[key] == "" || isNaN(newAtrrValue[key])) {
                        newAtrrValue[key] = attrValue;
                    } else {
                        if (attributeInfo.dt == config.dataType.number) {
                            newAtrrValue[key] = parseFloat(newAtrrValue[key]) + parseFloat(attrValue);
                        } else if (attributeInfo.dt == config.dataType.float) {
                            newAtrrValue[key] = parseFloat(newAtrrValue[key]) + parseFloat(attrValue);
                        }
                    }
                }
                if (key == config.aggrigateTypeLablel.lv) {
                    newAtrrValue[key] = attrValue;
                }
                cb_atr()
            }, function () {
                cb()
            });
        }, function () {
            var deviceSyncRes = cache.get("deviceSyncRes");
            deviceSyncRes = deviceSyncRes.edgeData[attributeInfo.guid];
        });
    }
}


function setRuleVal(attributeInfo, attrVal, attributeObj) {
    var ruleData = [];
    var deviceSyncRes = cache.get("deviceSyncRes");
    var rules = deviceSyncRes.r;
    // console.log("attributeInfo ==> ",attributeInfo)
    if (_.isArray(attributeInfo)) //Parent attributes
    {
        // console.log("//Parent attributes");
        var attributeArrayObj = {
            "data": []
        }
        async.forEachSeries(rules, function (rulesData, cb_main) {
            var conditionText = rulesData.con;
            async.forEachSeries(rulesData.att, function (attributes, cb_attr) {
                if (_.isArray(attributes.g)) // Its Child
                {
                    attributeArrayObj["parentFlag"] = 1;
                    var countSq = 1;
                    async.forEachSeries(attributes.g, function (ids, cb_inner) {
                        var atId = ids;
                        async.forEachSeries(attributeInfo, function (attrInfo, cb_attrInfo) {
                            attributeArrayObj["parentGuid"] = attrInfo.parentGuid;
                            var attrValue = attrInfo.value;
                            var attPname = attrInfo.p;
                            try {
                                splitCondition(conditionText, attPname, function (conditionResponse) {
                                    var myObj = {};
                                    var countSqAtt = 1;
                                    async.forEachSeries(conditionResponse, function (response, cb_lnv) {
                                        if (attrInfo.ln == response.localNameChild && response.localNameParent == response.currentAttParent && countSq == countSqAtt) {
                                            myObj[atId] = {
                                                "guid": rulesData.g, //FD143FA6-D15F-4BBF-BC49-7876FB2E9C6
                                                "eventSubscriptionGuid": rulesData.es, //"C360A375-9B93-4F54-ACD4-EAF6C2EE54C5",
                                                "conditionText": response.condition, //"Gyro.X > 20 AND Gyro.Y > 50",
                                                "conditionTextMain": rulesData.con, //"Gyro.X > 20 AND Gyro.Y > 50",
                                                "commandText": rulesData.cmd, //"reboot"
                                                "value": attrInfo.value,
                                                "attGuid": atId, //attribute Guid
                                                "localName": attrInfo.ln, //"reboot"
                                                "localNameParent": response.localNameParent, //"Parent attribute name"
                                                "currentAttParent": response.currentAttParent //"Current Parent attribute need to match
                                            };
                                        }
                                        countSqAtt++;
                                        cb_lnv()
                                    }, function () {
                                        // console.log("========= myObj ========", myObj);
                                        if (Object.entries(myObj).length != 0) {
                                            attributeArrayObj.data.push(myObj);
                                        }
                                        cb_attrInfo();
                                    });
                                })
                            } catch (error) {
                                cb_attrInfo();
                            }
                        }, function () {
                            countSq++;
                            cb_inner();
                        });
                    }, function () {
                        cb_attr();
                    });
                } else {
                    cb_attr();
                }

            }, function () {
                cb_main();
            });
        }, function () {
            evaluateRule(attributeArrayObj, attributeObj, attrVal);
        });
    } else // Non Parent Attributes
    {
        // console.log("//Non Parent attributes");
        // console.log("=== In Rule evaluation ====")
        var attributeArrayObj = {
            "data": []
        }

        async.forEachSeries(rules, function (rulesData, cb_main) {
            // console.log("=============================== start Non Parent ==============================");
            var conditionText = rulesData.con;
            async.forEachSeries(rulesData.att, function (attributes, cb_attr) {
                if (_.isArray(attributes.g)) // Its Child
                {
                    var objData = {};
                    var atId = attributes.g;
                    attributeArrayObj["parentFlag"] = 0;
                    var attributeInfo1 = [attributeInfo];
                    async.forEachSeries(attributeInfo1, function (attrInfo, cb_attrInfo) {
                        attributeArrayObj["parentGuid"] = attrInfo.parentGuid;
                        var attrValue = attrVal;
                        var attPname = attrInfo.p;
                        splitCondition(conditionText, attPname, function (conditionResponse) {
                            var myObj = {}
                            async.forEachSeries(conditionResponse, function (response, cb_lnv) {
                                if (attrInfo.ln == response.localNameParent) {
                                    myObj = {
                                        "guid": rulesData.g, //FD143FA6-D15F-4BBF-BC49-7876FB2E9C6
                                        "eventSubscriptionGuid": rulesData.es, //"C360A375-9B93-4F54-ACD4-EAF6C2EE54C5",
                                        "conditionText": response.condition, //"Gyro.X > 20 AND Gyro.Y > 50",
                                        "conditionTextMain": rulesData.con, //"Gyro.X > 20 AND Gyro.Y > 50",
                                        "commandText": rulesData.cmd, //"reboot"
                                        "value": attrValue, //"reboot"
                                        "localName": attrInfo.ln,
                                        "localNameParent": response.localNameParent //"Parent attribute name"
                                    };
                                    attributeArrayObj.data.push(myObj);
                                }
                                cb_lnv()
                            }, function () {
                                cb_attrInfo();
                            });
                        })
                    }, function () {
                        cb_attr();
                    });
                } else {
                    cb_attr();
                }
            }, function () {
                cb_main();
            });

        }, function () {
            evaluateRule(attributeArrayObj, attributeObj, attrVal);
        });

    }
}

function splitCondition(conditionText, attPname, callback) {
    // console.log("conditionText==========>",conditionText);
    var ruleCondition = conditionText.trim();
    if (ruleCondition.indexOf("=") != -1) {
        ruleCondition = ruleCondition.replace("=", "==");
    }
    var resArray = ruleCondition.split("AND");
    var parentObj = [];
    async.forEachSeries(resArray, function (conditions, cb_cond) {
        conditions = conditions.trim();
        // console.log("conditionText==========>", conditions);
        var res = conditions.split(" ");
        // console.log(res);

        var localName = res[0];
        // console.log("localName ==> ", localName);
        // localName= localName.split(".");
        // var obj = {
        //     "localNameParent" : localName[0],
        //     "localNameChild" : localName[1],
        //     "condition" : conditions
        // }
        // parentObj.push(obj);
        // cb_cond();


        if (localName.indexOf("#") != -1) {
            // console.log("innnn");
            var lnp = localName.split("#");
            // console.log("innnn", lnp);
            var lnpTag = lnp[0];
            var lnpAttName = lnp[1];
            if (lnpAttName.indexOf(".") != -1) {
                var localNamearray = lnpAttName.split(".");
                var parentName = localNamearray[0];
                var childName = localNamearray[1];
            } else {
                var parentName = lnpAttName;
                var childName = "";
            }


            var obj = {
                "localNameParent": parentName,
                "localNameChild": childName,
                "condition": conditions,
                "tag": lnpTag,
                "currentAttParent": attPname
            }
            // console.log("obj ==> ", obj);
            parentObj.push(obj);
            cb_cond();
        } else {
            // console.log("Outtt");
            // var localNamearray= localName.split(".");

            if (localName.indexOf(".") != -1) {
                var localNamearray = localName.split(".");
                var parentName = localNamearray[0];
                var childName = localNamearray[1];
            } else {
                var parentName = localName;
                var childName = "";
            }
            var obj = {
                "localNameParent": parentName,
                "localNameChild": childName,
                "condition": conditions,
                "tag": "",
                "currentAttParent": attPname
            }
            parentObj.push(obj);
            cb_cond();
        }
    }, function () {
        // console.log(parentObj);
        callback(parentObj);
    });

}

function evaluateRule(ruleEvaluationData, attributeObjOld, attrValue) {

    //  console.log("================================================")
    //  console.log("attributeArrayObj==>",attributeObjOld);
    //  console.log("attrValue ==>",attrValue);
    //  //console.log(ruleEvaluationData)
    //  console.log("================================================")

    var deviceSyncRes = cache.get("deviceSyncRes");
    var deviceData = deviceSyncRes;
    var newObj = {
        "cpId": deviceData.cpId,
        "dtg": deviceData.dtg,
        //"company": deviceData.company,
        "t": new Date(),
        "mt": config.messageType.ruleMatchedEdge,
        //"deviceTemplateGuid": deviceData.deviceTemplateGuid,
        "sdk": {
            "l": config.sdkLanguage,
            "v": config.sdkVersion,
            "e": ENV_GLOBAL
        },
        "d": []
    };

    var ruledataObj = [];
    // console.log("---- ruleEvaluationData -----", ruleEvaluationData);
    var ruleEvaluationDataLength = ruleEvaluationData.data;
    try {
        if(ruleEvaluationDataLength.length > 0){
            if (ruleEvaluationData.parentFlag == 1 ) // Its parent
            {
                // console.log("---- PPPPPPP -----");
                var attributeLevel = {};
                var attributeParentGuid = ruleEvaluationData.parentGuid;
                var attributeObj = {};
                attributeObj['id'] = attributeObjOld.id; //attributeObjOld.uniqueId;
                // attributeObj['guid'] = attributeObjOld.guid;
                attributeObj['dt'] = new Date();
                attributeObj['d'] = [];
                var ruleFlag = 0;
                var thirdLevelObj = {
                    "parent": "",
                    "guid": attributeParentGuid,
                    "sTime": new Date(),
                    "data": []
                };
                var ruleCommandText = "";
                var attParentName = "";
                var thirdLevelChildObj; 
                var ruleAttObj = [];
                var fullCondition = "";
                // console.log(ruleEvaluationData.data);
                var temp = [];
                var attConditionFlag = 0;
                async.forEachSeries(ruleEvaluationData.data, function (ruleData, cb_rl) {
                    // console.log("ruleData==============>", ruleData);
        
                    var childAttribute = Object.keys(ruleData);
                    childAttribute = childAttribute[0];
                    //console.log(childAttribute);   
                    //console.log(childAttribute);  
                    //console.log(Object.keys(childAttribute));
                    var ruleCondition = ruleData[childAttribute].conditionText.trim();
                    var conditionTextMain = ruleData[childAttribute].conditionTextMain.trim();
                    attributeObj['rg'] = ruleData[childAttribute].guid;
                    attributeObj['ct'] = conditionTextMain;
                    fullCondition = conditionTextMain;
                    attributeObj['sg'] = ruleData[childAttribute].eventSubscriptionGuid;
                    ruleCommandText = ruleData[childAttribute].commandText;
                    attrValue = ruleData[childAttribute].value;
                    var attrLocalName = ruleData[childAttribute].localName;
                    var localNameParent = ruleData[childAttribute].localNameParent;
                    attParentName = localNameParent;
                    var currentAttParent = ruleData[childAttribute].currentAttParent;
                    // console.log('currentAttParent ==> ', currentAttParent);
                    if (conditionTextMain.indexOf(">=") != -1 || conditionTextMain.indexOf("<=") != -1 || ruleCondition.indexOf("!=") != -1) {
                    } else {
                        // console.log("ruleCondition==>",conditionTextMain);
                        // console.log("ruleCondition==>",conditionTextMain.indexOf("="));
                        if (conditionTextMain.indexOf("=") != -1) {
                            conditionTextMain = conditionTextMain.replace("=", "==");
                        }
                    }
                    var resArray = conditionTextMain.split("AND");
                    // console.log("TCL: evaluateRule -> resArray", resArray)
                    thirdLevelChildObj = {};
                    thirdLevelChildObj[localNameParent] = {};
                    async.forEachSeries(resArray, function (conditions, cb_cond) {
                        conditions = conditions.trim();
        
                        // console.log("conditions ==> ", conditions)
        
                        var res = conditions.split(" ");
        
                        var localName = res[0];
                        // console.log(localName);
                        localName = localName.split(".");
                        // console.log("localName[0] ==> ",localName[0])
                        thirdLevelObj.parent = localName[0];
                        var localNameChild = localName[1];
                        // console.log("attrLocalName == localNameChild " + attrLocalName + "==" + localNameChild)
                        // console.log("attrLocalName == localNameParent " + localNameParent + "==" + currentAttParent)
                        
                        if (localNameParent == currentAttParent && attrLocalName == localNameChild) {
                            //console.log("-- Condition ---"+conditions+"==>"+ attrValue);
                            
                            //thirdLevelChildObj[localNameParent][localNameChild] = attrValue;
                            var tempObj = {};
                            // console.log('localNameChild => ', localNameChild);
                            // console.log('tempObj => ', tempObj);
                            tempObj[localNameChild] = attrValue;
                            ruleAttObj.push(tempObj)
        
                            var actualConditions = conditions.replace(res[0], attrValue);
                            temp.push(actualConditions);
                            attConditionFlag = 1;
                            cb_cond();
                        } else {
                            cb_cond();
                        }
        
                    }, function () {
                        //console.log("actual temp==",temp);
                        
        
                        cb_rl();
                    });
        
                }, function () {
        
                    // console.log("--- completed ====", ruleAttObj);
                    var ruleAttObjUpdated = _.reduce(ruleAttObj, _.extend)
                    // console.log("--- completed ====", ruleAttObjUpdated);
                    thirdLevelChildObj[attParentName] = ruleAttObjUpdated;
                    // thirdLevelChildObj[localNameChild] = attrValue;
                    // thirdLevelObj.data.push(thirdLevelChildObj);
                    attributeObj.d.push(thirdLevelChildObj);
        
                    //console.log("--- completed ====", ruleFlag)
                    // console.log("TCL: evaluateRule -> attConditionFlag", attConditionFlag)
                    if(attConditionFlag == 1){
                        attConditionFlag = 0;
                        var evalCondition = temp.join(' && ');
                        // console
                        console.log("\nCondition :: "+ evalCondition + " ["+ fullCondition +"]");
                        //console.log(eval(evalCondition));
                        if (eval(evalCondition) == true) {
                            ruleFlag = 1;
                            console.log("---- Rule Matched --- ");
                            var cmdObj = {
                                cpid: deviceData.cpId,
                                guid: deviceData.company,
                                cmdType: config.commandType.CORE_COMMAND,
                                uniqueId: attributeObjOld.id,
                                command: ruleCommandText,
                                ack: true,
                                ackId: null
                            }
            
                            sendCommand(cmdObj);
                            //attributeObj.data.push(thirdLevelObj)
                            newObj.d.push(attributeObj);
                            console.log(JSON.stringify(newObj));
                            sendDataOnAzureMQTT(newObj);
                            //console.log(thirdLevelObj);
                        } else {
                            console.log("--- Rule not Matched --- ");
                        }
                        //dataObj.data.push(attributeObj)
                    }
                });
            } else {
                // console.log("---- NO PPPPPPP -----");
                var attributeLevel = {};
                //var attributeGuid = ruleEvaluationData.data;
                var attributeGuid = "";
                //console.log(attributeGuid);
                var attributeObj = {};
                attributeObj['id'] = attributeObjOld.id; //attributeObjOld.uniqueId;
                // attributeObj['guid'] = attributeObjOld.guid;
                attributeObj['dt'] = new Date();
                attributeObj['d'] = [];
                fullCondition = "";
                async.forEachSeries(ruleEvaluationData.data, function (ruleData, cb_rl) {
                    // console.log("====== cnt ==== ",ruleData);
        
                    var childAttribute = Object.keys(ruleData);
                    attributeGuid = childAttribute[0];
                    // console.log("====== attributeGuid ==== ",childAttribute[0]);
                    // console.log("====== attributeGuid ==== ",ruleData.guid);
                    // console.log("====== attributeGuid ==== ",ruleData[attributeGuid].conditionText);
                    //console.log(childAttribute);
                    //var ruleGuid = ruleDate.guid;
        
                    // ------------- Original ------------------
                    // var ruleCondition = ruleData[attributeGuid].conditionText.trim();
                    // var conditionTextMain = ruleData[attributeGuid].conditionTextMain.trim();
                    // attributeObj['ruleGuid'] = ruleData[attributeGuid].guid;
                    // attributeObj['conditionText'] = conditionTextMain;
                    // attributeObj['subscription'] = ruleData[attributeGuid].eventSubscriptionGuid;
                    // ruleCommandText = ruleData[attributeGuid].commandText;
                    // attrValue = ruleData[attributeGuid].value;
                    // var attrLocalName = ruleData[attributeGuid].localName;
                    // ------------- Original ------------------
        
                    var ruleCondition = ruleData.conditionText.trim();
                    var conditionTextMain = ruleData.conditionTextMain.trim();
                    attributeObj['rg'] = ruleData.guid;
                    attributeObj['ct'] = conditionTextMain;
                    fullCondition = conditionTextMain;
                    attributeObj['sg'] = ruleData.eventSubscriptionGuid;
                    ruleCommandText = ruleData.commandText;
                    attrValue = ruleData.value;
                    var attrLocalName = ruleData.localName;
        
                    // console.log("ruleCondition 1 ==> ",ruleCondition);
                    if (ruleCondition.indexOf(">=") != -1 || ruleCondition.indexOf("<=") != -1 || ruleCondition.indexOf("!=") != -1) {
                        // console.log("--- in ---");
                        // console.log("--- in else ---");
                        if (ruleCondition.indexOf("==") != -1) {
                            ruleCondition = ruleCondition.replace("==", "=");
                        }
                    } else {
                        // console.log("--- in else ---");
                        if (ruleCondition.indexOf("=") != -1) {
                            ruleCondition = ruleCondition.replace("=", "==");
                        }
                    }
                    // console.log("ruleCondition ==> ",ruleCondition);
        
                    // ruleCondition = (ruleCondition.indexOf("=") == -1 ? ruleCondition : ;
        
                    var res = ruleCondition.split(" ");
                    // console.log("res ==> ",res);
                    //console.log(res);
                    var localName = res[0];
                    // console.log("localName ==> ",localName);
        
                    if (localName.indexOf("#") != -1) {
                        var attlocalName = localName.split("#");
                        // console.log("attlocalName ==> ",attlocalName);
                        attlocalName = attlocalName[1];
                        // console.log("attlocalName ==> ",attlocalName);
                    } else {
                        attlocalName = localName;
                    }
        
                    var actualConditions = ruleCondition.replace(res[0], attrValue);
                    // console.log(actualConditions);
                    // console.log("\nCondition :: ", actualConditions + " ["+ fullCondition +"] ");
                    // console.log(eval(actualConditions));
        
                    if (eval(actualConditions.toString()) == true) {
                        console.log("--- Rule Matched --- ");
                        ruleFlag = 1
        
                        // var thirdLevelObj = {
                        //     "parent": "",
                        //     "guid": attributeGuid,
                        //     "sTime": new Date(),
                        //     "data": [{
                        //         "guid": ruleData.attGuid,
                        //         "localName": localName,
                        //         "value": attrValue
                        //     }]
                        // };
                        var thirdLevelObj = {};
                        thirdLevelObj[attlocalName] = attrValue;
                        attributeObj.d.push(thirdLevelObj)
                        //var abc = attributeObj;
                        newObj.d.push(attributeObj);
        
                        var cmdObj = {
                            cpid: deviceData.cpId,
                            guid: deviceData.company,
                            cmdType: config.commandType.CORE_COMMAND,
                            uniqueId: attributeObjOld.id,
                            command: ruleCommandText,
                            ack: true,
                            ackId: null
                        }
                        sendCommand(cmdObj);
        
                        //console.log(attributeObj);
                        //console.log(dataObj.data.push(attributeObj));
                        //console.log(newObj);
                        //console.log(JSON.stringify(newObj));
                    } else {
                        console.log("---- Rule not Matched --- ");
                    }
                    cb_rl();
                }, function () {
                    if (ruleFlag == 1) {
                        //console.log(JSON.stringify(newObj));
                        sendDataOnAzureMQTT(newObj);
                    }
                    //dataObj.data.push(attributeObj)
                });
            }
        }
    } catch (error) { }
}

function sendCommand(obj) {
    GLOBAL_CALLBACK(obj);
}


function dataValidationTest(dataType, dataValidation, attrValue, childDeviceInfo, msgTypeStatus, cb) {
    //console.log("childDeviceInfo==>")
    var childAttrObj = {};
    if (dataType == config.dataType.number) {
        var valueArray = dataValidation.split(",");
        // console.log("valueArray ==> ",valueArray)
        var attrValue = attrValue.toString();
        // console.log("attrValue ==> ",attrValue)
        var numbersInt = /^[-+]?[0-9]+$/;
        var numbersFloat = /^[-+]?[0-9]+\.[0-9]+$/;
        if (attrValue.match(numbersInt) != null || attrValue.match(numbersFloat) != null) {
            var isNumber = true;
        } else {
            var isNumber = false;
        }

        if (dataValidation != "" && dataValidation != null) {
            if (valueArray.indexOf(attrValue) == -1) {

                var validationFlag = 1;
                async.forEachSeries(valueArray, function (restrictedValue, cbValue) {
                    // console.log("restrictedValue ==>",restrictedValue.trim())
                    if (restrictedValue.indexOf("to") == -1) {
                        if (attrValue == parseInt(restrictedValue.trim())) {
                            validationFlag = 0;
                        }
                        cbValue();
                    } else {
                        var valueRangeArray = restrictedValue.split("to");
                        // console.log("valueRangeArray[0].trim() ==>", valueRangeArray[0].trim());
                        // console.log("valueRangeArray[1].trim() ==>", valueRangeArray[1].trim());
                        if (attrValue >= parseInt(valueRangeArray[0].trim()) && attrValue <= parseInt(valueRangeArray[1].trim())) {
                            validationFlag = 0;
                        }
                        cbValue();
                    }

                }, function () {
                    if (validationFlag == 1 || isNumber == false) {
                        msgTypeStatus = 1;
                    }

                    //childAttrObj["guid"] = childDeviceInfo.guid;
                    //console.log(childDeviceInfo.localName)
                    //console.log(childDeviceInfo.ln)
                    childAttrObj["ln"] = childDeviceInfo.ln;
                    childAttrObj["v"] = attrValue;
                    childAttrObj["msgTypeStatus"] = msgTypeStatus;
                });
            } else {
                if (isNumber == false) {
                    msgTypeStatus = 1;
                }
                // childAttrObj["guid"] = childDeviceInfo.guid;
                childAttrObj["ln"] = childDeviceInfo.ln;
                childAttrObj["v"] = attrValue;
                childAttrObj["msgTypeStatus"] = msgTypeStatus;
            }
        } else {
            if (isNumber == false) {
                msgTypeStatus = 1;
            }
            // childAttrObj["guid"] = childDeviceInfo.guid;
            childAttrObj["ln"] = childDeviceInfo.ln;
            childAttrObj["v"] = attrValue;
            childAttrObj["msgTypeStatus"] = msgTypeStatus;
        }
    } else if (dataType == config.dataType.string && (dataValidation != "" && dataValidation != null)) {
        dataValidation = dataValidation.replace(/ /g, "");
        var valueArray = dataValidation.split(",");
        
        if (valueArray.indexOf(attrValue) == -1) {
            msgTypeStatus = 1;
        }

        // childAttrObj["guid"] = childDeviceInfo.guid;
        childAttrObj["ln"] = childDeviceInfo.ln;
        childAttrObj["v"] = attrValue;
        childAttrObj["msgTypeStatus"] = msgTypeStatus;
        // console.log(childAttrObj)
    } else {
        // childAttrObj["guid"] = childDeviceInfo.guid;
        childAttrObj["ln"] = childDeviceInfo.ln;
        childAttrObj["v"] = attrValue;
        childAttrObj["msgTypeStatus"] = msgTypeStatus;
    }
    cb(childAttrObj);
}

/* 
 * Azure Receiver
 * @author : MK
 * Send data using MQTT to MQTT topic
 * @param: mqttTopic = MQTT Topic
 * @param: data_array = Receive Data
 */
function sendDataOnAzureMQTT(offlineData) {
    // console.log("offlineData ==> ",JSON.stringify(offlineData))
    var deviceSyncRes = cache.get("deviceSyncRes");
    var brokerConfiguration = deviceSyncRes.p;
    var protocoalName = brokerConfiguration.n;
    if (protocoalName.toLowerCase() == "mqtt") {
        var mqttHost = brokerConfiguration.h; //"demohub.azure-devices.net";
        var mqttUrl = 'mqtts://' + mqttHost;
        var mqttOption = {
            clientId: brokerConfiguration.id, //"520uta-sdk003",
            port: brokerConfiguration.port, //8883,
            username: brokerConfiguration.un, //"demohub.azure-devices.net/520uta-sdk003",
            password: brokerConfiguration.pwd, //"HostName=demohub.azure-devices.net;DeviceId=520uta-sdk003;SharedAccessSignature=SharedAccessSignature sr=demohub.azure-devices.net%2Fdevices%2F520uta-sdk003&sig=9ckd1upGemFSHYkWnaxWiKqh7CsQhsjY%2F49KM42Na3Y%3D&se=1518083719",
            rejectUnauthorized: true
            // rejectUnauthorized: true,
            // reconnecting: true,
            // reconnectPeriod: 100,
            // pingTimer: 10
        };
        mqttPublishData(mqttUrl, mqttHost, mqttOption, brokerConfiguration.pub, offlineData);
    } else if (protocoalName.toLowerCase() == "http" || protocoalName.toLowerCase() == "https") {
        var headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "authorization": brokerConfiguration.pwd
        };
        request.post({
                url: "https://" + brokerConfiguration.h + "/devices/" + brokerConfiguration.id + "/messages/events?api-version=" + config.httpAPIVersion,
                headers: headers,
                body: offlineData,
                json: true
            },
            function (error, response, body) {
                //console.log("Sensor data has been sent..!");
            });
    } else {
        console.log("Unknown protocol...");
    }
}


function reConnectMqttInfo(offlineData) {
    var deviceSyncRes = cache.get("deviceSyncRes");
    var brokerConfiguration = deviceSyncRes.p;
    var protocoalName = brokerConfiguration.n;
    if (protocoalName.toLowerCase() == "mqtt") {
        var mqttHost = brokerConfiguration.h; //"demohub.azure-devices.net";
        var mqttUrl = 'mqtts://' + mqttHost;
        var mqttOption = {
            clientId: brokerConfiguration.id, //"520uta-sdk003",
            port: brokerConfiguration.port, //8883,
            username: brokerConfiguration.un, //"demohub.azure-devices.net/520uta-sdk003",
            password: brokerConfiguration.pwd, //"HostName=demohub.azure-devices.net;DeviceId=520uta-sdk003;SharedAccessSignature=SharedAccessSignature sr=demohub.azure-devices.net%2Fdevices%2F520uta-sdk003&sig=9ckd1upGemFSHYkWnaxWiKqh7CsQhsjY%2F49KM42Na3Y%3D&se=1518083719",
            rejectUnauthorized: true,
            // ,
            // reconnecting: true,
            // reconnectPeriod: 100,
            // pingTimer: 10
        };
        mqttPublishData(mqttUrl, mqttHost, mqttOption, brokerConfiguration.pub, offlineData);
    } else {
        console.log("Protocol not matched.");
    }
}


function offlineProcess(offlineData, callback) {
    // console.log("offlineData===>",offlineData);    
    fs.exists(offlineDataFile, (exists) => {
        if (exists) {
            // console.log("File already exist");
            //var a = fs.readJson("./offlineData.json");

            const packageObj = fs.readJsonSync(offlineDataFile);
            // console.log("packageObj ==> ", packageObj);
            fs.readJson(offlineDataFile, (err, packageObj) => {
                if (err) console.error(err)
                packageObj.push(offlineData);
                console.log("Offline data saved..." + new Date());
                fs.writeJsonSync(offlineDataFile, packageObj, function (err) {
                    if (err) {
                        console.log(err);
                        callback(true);
                    } else {
                        callback(false);
                        console.log('Data has been appended');
                    }
                });
            })
        } else {
            console.log("Need to create a file");
            offlineData = [offlineData];
            fs.writeJsonSync(offlineDataFile, offlineData, function (err) {
                if (err) {
                    console.log(err);
                    callback(true);
                } else {
                    console.log('File has been created');
                    callback(true);
                }
            });
        }
    });
}

var offlineFlag = 0;

function checkAndSendOfflineData(mqttUrl, mqttOption, topic, callback) {
    //console.log("Hello offline ==> ", globalClientConnection);
    if (offlineFlag == 0) {
        offlineFlag = 1;
        try {
            fs.exists(offlineDataFile, (exists) => {
                if (exists) {
                    fs.readJson(offlineDataFile, (err, offDataObj) => {
                        if (err) {
                            console.error(err)
                            callback(true);
                        } else {
                            if (offDataObj.length > 0) {
                                var offlineData = _.cloneDeep(offDataObj);
                                async.forEachSeries(offlineData, function (offlineDataResult, off_cb) {
                                    //console.log("========= offlineData ========");
                                    //console.log(offlineDataResult.t)
                                    //globalClientConnection
                                    globalClientConnection.publish(topic, JSON.stringify(offlineDataResult));
                                    console.log("Offline message published...", new Date());
                                    var index = offDataObj.findIndex(obj => obj.time == offlineDataResult.time);
                                    if (index > -1) {
                                        offDataObj.splice(index, 1);
                                    }
                                    off_cb();
                                }, function () {
                                    // console.log("==== Updated list ===== offDataObj", offDataObj);
                                    try {
                                        fs.writeJsonSync(offlineDataFile, offDataObj, function (err) {
                                            if (err) {
                                                return console.log(err);
                                            } else {
                                                console.log('Data added in offline JSON file.');
                                            }
                                        });
                                    } catch (error) {
                                        console.log("error ===> ", error);
                                    }
                                    offlineFlag = 0;
                                    setTimeout(() => {
                                        callback(true);
                                    }, 1000);
                                });
                            } else {
                                offlineFlag = 0;
                                callback(true);
                            }
                        }
                    })
                } else {
                    offlineFlag = 0;
                    //console.log("File not exist");
                    callback(true);
                }
            });
        } catch (error) {
            offlineFlag = 0;
            console.log("Error : ", error.message);
            callback(true);
        }
    } else {
        offlineFlag = 0;
        console.log("Error : ", error.message);
        callback(true);
    }
}


function mqttPublishData(mqttUrl, mqttHost, mqttOption, topic, sensorData) {
    //  console.log("=======================================================")
    //  console.log(JSON.stringify(sensorData))
    // console.log("=======================================================")
    require('dns').resolve(mqttHost, function (err) {
        if (err) {
            if (sensorData.mt == 1) {
                setTimeout(() => {
                    offlineProcess(sensorData, function (result) {
                        console.log("Offline Data saved");
                    })
                }, 100);
            } else {
                offlineProcess(sensorData, function (result) {
                    console.log("Offline Data saved");
                })
            }
        } else {
            async.series([
                function (cb_series) { // Check for offline data exist or not
                    try {
                        //console.log("offlineFlag ==> ",offlineFlag);
                        checkAndSendOfflineData(mqttUrl, mqttOption, topic, function (result) {
                            //console.log("CB ==> ", offlineFlag)
                            cb_series();
                        });
                    } catch (err) {
                        // console.log("offline data process error : ", err.message);
                        cb_series();
                    }
                }
            ], function (err, response) {
                try {
                    globalClientConnection.publish(topic, JSON.stringify(sensorData));
                    console.log("Message published...", new Date());
                    //console.log(JSON.stringify(offlineData));
                } catch (err) {
                    console.log("mqttClient error : ", err.message);
                }
            })
        }
    });
}


function mqttSubscribeData(client, topic, cb) {
    //console.log("1.0");
    if (globalClientConnection != "" && globalClientConnection != undefined) {
        globalClientConnection.end(); // End the previous connection
        DEVICE_CONNECTED = false;
    }

    //console.log("2.0");
    //var client  = mqtt.connect(mqttUrl, mqttOption);
    globalClientConnection = client;

    //console.log("3.0 --- ",globalClientConnection);
    if (DEVICE_CONNECTED == false) {
        //console.log("3.0 --- ",globalClientConnection);
        var cnt = 0;
        var reConnectFlag = 0;
        globalClientConnection.on('connect', function () {
            DEVICE_CONNECTED = true;
            STOP_SDK_CONNECTION = true;
            cnt++;
            if (cnt == 1) {
                var deviceCommandAck = {
                    "cmdType": null,
                    "uniqueId": null,
                    "command": "device_connected",
                    "ack": null,
                    "ackId": null
                }
                GLOBAL_CALLBACK(deviceCommandAck)
            }
            //mqttConnectionStatus = true;
            var twinPropertySubTopic = config.twinPropertySubTopic;
            var twinResponseSubTopic = config.twinResponseSubTopic;
            globalClientConnection.publish(config.twinResponsePubTopic, "");
            client.on("message", function (topic, payload) {
                if (topic.indexOf(twinPropertySubTopic.substring(0, twinPropertySubTopic.length - 1)) != -1 || topic.indexOf(twinResponseSubTopic.substring(0, twinResponseSubTopic.length - 1)) != -1) {
                    try {
                        GLOBAL_CALLBACK_TWIN(JSON.parse(payload));
                    } catch (error) {}
                } else {
                    cb(JSON.parse(payload));
                }
            })
        })
        globalClientConnection.subscribe(topic);
        globalClientConnection.subscribe(config.twinPropertySubTopic);
        globalClientConnection.subscribe(config.twinResponseSubTopic);
        globalClientConnection.on('error', function (err) {

            if (reConnectFlag == 0) {
                console.log("Error : [ " + new Date() + "] :: " + err);
                // console.log("Error message : "+err);
                // console.log("---- MQTT SUbscriber Error ----"+err);
                reConnectFlag = 1;
                var syncInfo = cache.get("deviceSyncRes");
                var cpid = syncInfo.cpId;
                var uniqueId = syncInfo.id;
                var requestedParams = config.protocolParams;

                // console.log("0x12 => Password change.");

                var cmdType = config.commandType.PASSWORD_INFO_UPDATE;
                var syncInfo = cache.get("deviceSyncRes");

                // console.log(syncInfo.p);
                //console.log("BEFORE :: syncInfo1.protocol ==> ",syncInfo.p);

                syncDeviceOnDemand(cpid, uniqueId, requestedParams, cmdType, function () {
                    var syncInfo1 = cache.get("deviceSyncRes");
                    // console.log("AFTER :: syncInfo1.protocol ==> ",syncInfo1);
                    startCommandSubsriber(function (result) {
                        if (result.status == true) {
                            console.log("Reconnecting...", new Date());
                            //manageCommand()
                            manageCommand(cpid, uniqueId, result, function (result) {
                                // console.log("--- command received ---");
                                GLOBAL_CALLBACK(result)
                            })
                        } else {
                            GLOBAL_CALLBACK(result)
                            // console.log("startCommandSubsriber ==> ",result);
                            reConnectFlag = 0;
                        }
                    })
                })
            }
            globalClientConnection.end();
            client.end();
        });
    }
}


var mqttConnection = function mqttConnection(cb) {
    var deviceSyncRes = cache.get("deviceSyncRes");
    var authType = deviceSyncRes.at;
    var brokerConfiguration = deviceSyncRes.p;
    // console.log("brokerConfiguration :: ",brokerConfiguration)
    var protocoalName = brokerConfiguration.n;
    var host = brokerConfiguration.h; //"demohub.azure-devices.net";
    var mqttUrl = 'mqtts://' + host;
    // var mqttUrl = 'mqtts://swdemohub.azure-devices.net';
    // authType = 3;
    //console.log(authType);
    if (authType == config.authType.KEY) {
        try {
            if (brokerConfiguration) {
                console.log("Connecting...");
                var mqttOption = {
                    clientId: brokerConfiguration.id, //"520uta-sdk003",
                    port: brokerConfiguration.p, //8883,
                    username: brokerConfiguration.un, //"demohub.azure-devices.net/520uta-sdk003",
                    password: brokerConfiguration.pwd, //"HostName=demohub.azure-devices.net;DeviceId=520uta-sdk003;SharedAccessSignature=SharedAccessSignature sr=demohub.azure-devices.net%2Fdevices%2F520uta-sdk003&sig=9ckd1upGemFSHYkWnaxWiKqh7CsQhsjY%2F49KM42Na3Y%3D&se=1518083719",
                    rejectUnauthorized: false,
                    // rejectUnauthorized: true,
                    reconnecting: true,
                    reconnectPeriod: 25000,
                    // pingTimer: 10
                };
                // console.log("mqttOption ==> ", mqttOption);
                var mqttClient = mqtt.connect(mqttUrl, mqttOption);
                mqttClient.on('close', function () {
                    console.log("\nconnection closed")
                })
                var result = {
                    status: true,
                    data: mqttClient,
                    message: "Connection Established"
                }
                // console.log(result)
                cb(result);
            } else {
                console.log("Failed Connecting...");
                var result = {
                    status: false,
                    data: null,
                    message: "Device broker information not found"
                }
                cb(result);
            }
        } catch (e) {
            var result = {
                status: false,
                data: e,
                message: "There is issue in broker information."
            }
            cb(result);
        }
    } else if (authType == config.authType.CA_SIGNED) {
        //console.log("CA signed")
        try {
            if (brokerConfiguration) {
                console.log("Connecting...");
                var mqttOption = {
                    clientId: brokerConfiguration.id,
                    port: brokerConfiguration.p, //8883,
                    username: brokerConfiguration.un,
                    key: fs.readFileSync(SDK_OPTIONS.certificate.SSLKeyPath),
                    cert: fs.readFileSync(SDK_OPTIONS.certificate.SSLCertPath),
                    //ca: fs.readFileSync(SDK_OPTIONS.certificate.SSLCaPath),
                    rejectUnauthorized: true,
                    reconnecting: true
                };
                var mqttClient = mqtt.connect(mqttUrl, mqttOption);
                mqttClient.on('close', function () {
                    console.log("\nconnection closed")
                })
                var result = {
                    status: true,
                    data: mqttClient,
                    message: "Secure Connection Established"
                }
                cb(result);
            } else {
                var result = {
                    status: false,
                    data: null,
                    message: "Device broker information not found"
                }
                cb(result);
            }
        } catch (e) {
            var result = {
                status: false,
                data: e,
                message: "There is issue in broker informtion or missing the certificate file"
            }
            cb(result);
        }
    } else if (authType == config.authType.CA_SELF_SIGNED) {
        try {
            if (brokerConfiguration) {
                console.log("Connecting...");
                var mqttOption = {
                    clientId: brokerConfiguration.id,
                    port: brokerConfiguration.p, //8883,
                    username: brokerConfiguration.un,
                    key: fs.readFileSync(SDK_OPTIONS.certificate.SSLKeyPath),
                    cert: fs.readFileSync(SDK_OPTIONS.certificate.SSLCertPath),
                    //ca: fs.readFileSync(SDK_OPTIONS.certificate.SSLCaPath),
                    rejectUnauthorized: true,
                    reconnecting: true
                };
                //console.log(mqttOption)
                var mqttClient = mqtt.connect(mqttUrl, mqttOption);
                mqttClient.on('close', function () {
                    console.log("\nconnection closed")
                })
                var result = {
                    status: true,
                    data: mqttClient,
                    message: "Secure Connection Established"
                }
                cb(result);
            } else {
                var result = {
                    status: false,
                    data: null,
                    message: "Device broker information not found"
                }
                cb(result);
            }
        } catch (e) {
            var result = {
                status: false,
                data: e,
                message: "There is issue in broker info or missing the certificate file"
            }
            cb(result);
        }
    }
}


var startCommandSubsriber = function startCommandSubsriber(cb) {
    var deviceSyncRes = cache.get("deviceSyncRes");
    var brokerConfiguration = deviceSyncRes.p;
    try {
        if (brokerConfiguration) {
            mqttConnection(function (result) {
                // console.log(" Connection result ---> ", result);
                var mqttClient = result.data;
                if (result.status) {
                    mqttSubscribeData(mqttClient, brokerConfiguration.sub, function (response) {
                        // console.log(" mqttSubscribeData ---> ", response);
                        var uniqueIdFromCtoDCommand = response.data.uniqueId;
                        var resultDevice = jsonQuery('d[*id=' + uniqueIdFromCtoDCommand + ']', {
                            data: deviceSyncRes
                        });
                        // console.log("HEllo 123 ==> ",resultDevice);
                        // console.log("HEllo 123 ==> ",resultDevice.value.length);
                        if (resultDevice.value.length > 0) {
                            cb({
                                status: true,
                                data: response,
                                message: "Command get successfully."
                            })
                        } else {
                            cb({
                                status: false,
                                data: [],
                                message: "Message from unknown device. Kindly check the process..!"
                            })
                        }
                    });
                } else {
                    cb({
                        status: false,
                        data: [],
                        message: result.message
                    })
                }
            });
        } else {
            cb({
                status: false,
                data: brokerConfiguration,
                message: "Device Protocol information not found."
            })
        }
    } catch (e) {
        cb({
            status: false,
            data: e.message,
            message: "MQTT connection error"
        })
    }
}

/*
   Module : Offline data 
   Author : Mayank [SOFTWEB]
   Inputs : uniqueId
   Output : check simulator health
   Date   : 2019-05-17
*/
var startHeartBeat = function startHeartBeat() {
    var deviceSyncRes = cache.get("deviceSyncRes");
    if (deviceSyncRes.sc) {
        var sdkConfig = deviceSyncRes.sc;
        if (intervalValue != '') {
            clearInterval(intervalValue);
        }
        if (sdkConfig.hb && sdkConfig.hb != null) {
            try {
                var pingFrequency = sdkConfig.hb.fq * 1000;
                var brokerConfiguration = deviceSyncRes.p;
                var protocoalName = brokerConfiguration.n;
                var host = sdkConfig.hb.h; //"demohub.azure-devices.net";
                var mqttUrl = 'mqtts://' + host;
                var mqttOption = {
                    port: 8883, //8883,
                    username: sdkConfig.hb.un, //"demohub.azure-devices.net/520uta-sdk003",
                    password: sdkConfig.hb.pwd, //"HostName=demohub.azure-devices.net;DeviceId=520uta-sdk003;SharedAccessSignature=SharedAccessSignature sr=demohub.azure-devices.net%2Fdevices%2F520uta-sdk003&sig=9ckd1upGemFSHYkWnaxWiKqh7CsQhsjY%2F49KM42Na3Y%3D&se=1518083719",
                    rejectUnauthorized: true
                };
                var v = 0;
                intervalValue = setInterval(function () {
                    v++;
                    var offlineData = {
                        "data": {
                            "number": v,
                            "temp": 10,
                            "humidity": 50,
                            "power": 150
                        }
                    }
                    //HeartBeat publisher
                    //mqttPublishData(mqttUrl, mqttOption,  sdkConfig.hb.pub, offlineData);
                }, pingFrequency);
            } catch (error) {
                console.log("HB Error : ", error);
            }
        } else {
            console.log("HB :: Data missing");
        }
    } else {
        console.log("SDKCONFIG :: Data missing");
    }
}

var getAttributes = function getAttributes(callback) {
    var deviceSyncRes = cache.get("deviceSyncRes");
    var deviceData = deviceSyncRes;
    var newAttributeObj = _.cloneDeep(deviceData.att);
    var newDeviceObj = _.cloneDeep(deviceData.d);

    async.series([
        function (cb_series) {
            try {
                async.forEachSeries(newAttributeObj, function (attributes, mainAttributes_cb) {
                    delete attributes.tw;
                    delete attributes.agt;
                    async.forEachSeries(attributes.d, function (data, data_cb) {
                        delete data.tw;
                        delete data.agt;
                        delete data.sq;
                        data_cb();
                    }, function () {
                        mainAttributes_cb();
                    });
                }, function () {
                    cb_series()
                });
            } catch (err) {
                cb_series();
            }
        },
        function (cb_series) {
            try {
                async.forEachSeries(newDeviceObj, function (devices, mainDevices_cb) {
                    delete devices.s;
                    mainDevices_cb();
                }, function () {
                    cb_series()
                });
            } catch (err) {
                cb_series();
            }
        }
    ], function (err, response) {
        var resultData = {
            "attribute": newAttributeObj,
            "device": newDeviceObj
        }
        callback({
            status: true,
            data: resultData,
            message: "Data sync successfully."
        })
    })
}

var syncDeviceOnDemand = function syncDeviceOnDemand(cpid, uniqueId, requestedParams, cmdType, cb) {
    // console.log("requestedParams==>",requestedParams);
    // console.log("cmdType==>",cmdType);
    if (cmdType == config.commandType.ATTRIBUTE_INFO_UPDATE) {
        var cnt = 0;
        //console.log("Length==>"+intervalObj.length);
        async.forEachSeries(intervalObj, function (interval, data_cb) {
            cnt++;
            var x = Object.keys(intervalObj);
            var key = x[0];
            clearInterval(interval[key]);
            delete interval[key];
            //console.log("------------------------------- ---->");
            data_cb();
        }, function () {
            // console.log(cnt)
            // console.log("completed---",cnt)
            // console.log("Length==>"+intervalObj.length);
            // console.log(intervalObj);
            intervalObj = [];
            //console.log(intervalObj);

            try {
                console.log(cmdType + "==" + requestedParams);
                syncDeviceByParam(cpid, uniqueId, requestedParams, function (response) {
                    if (response.status) {
                        //console.log("Length==>"+intervalObj.length);
                        var syncInfo = cache.get("deviceSyncRes");
                        //console.log(JSON.stringify(syncInfo));
                        if (cmdType == config.commandType.ATTRIBUTE_INFO_UPDATE) {
                            syncInfo.att = response.data.att;
                            syncInfo.edgeData = response.data.edgeData;
                            //console.log("Updated Cache-----",JSON.stringify(syncInfo));
                            //console.log("Updated Cache-----",syncInfo.attributes);
                            //console.log("Updated Cache-----",syncInfo.edgeData);
                        }
                        cb({
                            status: true,
                            data: [],
                            message: response.message
                        })
                    } else {
                        cb({
                            status: false,
                            data: [],
                            message: response.message
                        })
                    }
                })
            } catch (err) {
                cb({
                    status: false,
                    data: err.message,
                    message: err.message
                })
            }
        });
    } else {
        //console.log("Non attribute command -----------");
        try {
            //console.log(cmdType +"=="+ config.commandType.PASSWORD_INFO_UPDATE);
            syncDeviceByParam(cpid, uniqueId, requestedParams, function (response) {
                // console.log("syncDeviceByParam ==> ",response)
                if (response.status) {
                    //console.log(cmdType +"=="+ config.commandType.PASSWORD_INFO_UPDATE);
                    var syncInfo = cache.get("deviceSyncRes");
                    if (cmdType == config.commandType.SETTING_INFO_UPDATE) {
                        syncInfo.set = response.data.set;
                    } else if (cmdType == config.commandType.PASSWORD_INFO_UPDATE) {
                        // console.log("--- Protocol sync updated -----");
                        syncInfo.p = response.data.p;
                    } else if (cmdType == config.commandType.DEVICE_INFO_UPDATE) {
                        syncInfo.d = response.data.d;
                    } else if (cmdType == config.commandType.RULE_INFO_UPDATE) {
                        //console.log("--- Rule sync updated -----");
                        syncInfo.r = response.data.r;
                        syncInfo.rulesData = response.data.rulesData;

                        //console.log(syncInfo.rules);
                        //console.log(syncInfo.rulesData);
                    }
                    //console.log("syncInfo ==> ", syncInfo);
                    //setTimeout(() => {
                    //cache.put('deviceSyncRes', syncInfo);
                    cb({
                        status: true,
                        data: [],
                        message: response.message
                    })
                    //}, 500);
                } else {
                    cb({
                        status: false,
                        data: [],
                        message: response.message
                    })
                }
            })
        } catch (err) {
            cb({
                status: false,
                data: err.message,
                message: err.message
            })
        }
    }
};

var manageCommand = function manageCommand(cpid, uniqueId, response, callback) {
    var cmdType = response.data.cmdType;
    // console.log("Command : "+cmdType);
    switch (response.data.cmdType) {
        case config.commandType.CORE_COMMAND: //1 - Ok device
            console.log("CMD :: " + cmdType + " :: COMMAND_FOR_DEVICE");
            var data = response.data.data;
            //console.log(data);
            var deviceCommandAck = {
                "cmdType": cmdType,
                "uniqueId": data.uniqueId,
                "command": data.command,
                "ack": data.ack,
                "ackId": data.ackId
            }
            callback(deviceCommandAck);
            break;

        case config.commandType.FIRMWARE_UPDATE: //2 - Firmware update
            console.log("CMD :: " + cmdType + " :: FIRMWARE_UPDATE");
            var data = response.data.data;
            //console.log(data);
            var deviceCommandAck = {
                "cpId":data.cpid,
                "guid":data.guid,
                "cmdType": data.cmdType,
                "value":data.value,
                "uniqueId": data.uniqueId,
                "command": data.command,
                "ack": data.ack,
                "ackId": data.ackId,
                "urls": data.urls
            }
            callback(deviceCommandAck);
            break;

        case config.commandType.ATTRIBUTE_INFO_UPDATE: //10 - Attribute Changed
            console.log("CMD :: " + cmdType + " :: ATTRIBUTE_INFO_UPDATE");
            var requestedParams = config.attributeParams;
            break;

        case config.commandType.SETTING_INFO_UPDATE: //11 - Setting Changed
            console.log("CMD :: " + cmdType + " :: SETTING_INFO_UPDATE");
            var requestedParams = config.settingeParams;
            break;

        case config.commandType.PASSWORD_INFO_UPDATE: //12 - Password Changed
            console.log("CMD :: " + cmdType + " :: PASSWORD_INFO_UPDATE");
            var requestedParams = config.protocolParams;
            break;

        case config.commandType.DEVICE_INFO_UPDATE: //13 - Device Changed
            console.log("CMD :: " + cmdType + " :: DEVICE_INFO_UPDATE");
            var requestedParams = config.deviceParams;
            break;

        case config.commandType.RULE_INFO_UPDATE: //15 - Rule Changed
            console.log("CMD :: " + cmdType + " :: RULE_INFO_UPDATE");
            var requestedParams = config.ruleParams;
            break;

        case config.commandType.STOP_SDK_CONNECTION: //99 - STOP SDK CONNECTION
            console.log("CMD :: " + cmdType + " :: STOP_SDK_CONNECTION");
            var requestedParams = undefined;
            break;

        default:
            console.log("CMD :: " + cmdType + " :: UNKNOWN_COMMAND_FOUND");
            break;
    }

    if (requestedParams != "" && requestedParams != undefined) {
        syncDeviceOnDemand(cpid, uniqueId, requestedParams, cmdType, function (response) {
            if (cmdType == config.commandType.PASSWORD_INFO_UPDATE) {
                var deviceSyncRes = cache.get("deviceSyncRes");
                subscriberProcess(cpid, uniqueId, function(res){
                    GLOBAL_CALLBACK(res);
                });
            }
        });
    } else {
        if(config.commandType.STOP_SDK_CONNECTION == cmdType) {
            mqttConnectionEnd(function (response) {
                if (response.status) {
                    console.log("Device connection stopped...");
                } else {
                    console.log(response);
                }
            });
        }
    }
}

var subscriberProcess = function subscriberProcess(cpid, uniqueId, callback) {
    startCommandSubsriber(function (response) {
        if (response.status = true) {
            manageCommand(cpid, uniqueId, response, function (deviceCommandAck) {
                callback(deviceCommandAck);
            })
        } else {
            console.log("Message from unknown device. Kindly check the process..!");
        }
    });
}


var UpdateTwin = function UpdateTwin(obj, callback) {
    try {
        globalClientConnection.publish(config.twinPropertyPubTopic, JSON.stringify(obj));
        callback({
            status: true,
            data: null,
            message: "Twin updated successfully"
        });
    } catch (err) {
        callback({
            status: false,
            data: err,
            message: err.message
        });
    }
};

var writeLog = function writeLog(errcode, message, res) {
    try {
        // console.log("errcode ==> ", errcode);
        // console.log("message ==> ", message);
        // console.log("res ==> ", res);
        var deviceData = cache.get("deviceSyncRes");
        var logarray = "";
        var abc = "";
        async.series([
            function (cb_series) {
                try {
                    if (!logArray && deviceData) {
                        // console.log("Innnnn")
                        logarray = {
                            "cpId": deviceData.cpId,
                            "dtg": deviceData.dtg,
                            "t": new Date(),
                            "mt": config.messageType.log,
                            "sdk": {
                                "l": config.sdkLanguage,
                                "v": config.sdkVersion,
                                "e": ENV_GLOBAL
                            },
                            "d": []
                        };
                        cb_series();
                    } else {
                        // console.log("outttt")
                        logarray = {
                            "cpId": globalCPID,
                            "dtg": "",
                            "t": new Date(),
                            "mt": config.messageType.log,
                            "sdk": {
                                "l": config.sdkLanguage,
                                "v": config.sdkVersion,
                                "e": ENV_GLOBAL
                            },
                            "d": []
                        };
                        cb_series();
                    }
                } catch (err) {
                    console.log("ex ", err)
                    cb_series();
                }
            }
        ], function (err, response) {
            var errorData = {
                "time": new Date(),
                "errcode": errcode,
                "message": message,
                "response": res ? res : null
            };
            logarray.d.push(errorData);
            console.log(logarray);
        })
    } catch (err) {
        console.log("Log error :: ", err);
    }
};

/* 
 * Device disconnect
 * @author : MK
 * Device disconnected
 * @param: 
 */
var mqttConnectionEnd = function mqttConnectionEnd(callback) {
    try {
        globalClientConnection.end();
        fs.exists(offlineDataFile, (exists) => {
            if (exists) {
                var packageObj = [];
                fs.writeJsonSync(offlineDataFile, packageObj, function (err) {
                    if (err) {
                        console.log('Error while truncate the offline data file.');
                    } else {
                        console.log('Offline data file has been truncated.');
                    }
                });
            }
        });
        DEVICE_CONNECTED = false;
        STOP_SDK_CONNECTION = false;
        callback({
            status: true,
            data: null,
            message: "Device disconnected successfully."
        });
    } catch (err) {
        callback({
            status: false,
            data: err,
            message: "Can't able to disconnect the device."
        });
    }
};

/* 
 * send command ack
 * @author : MK
 * send command ack
 * @param: 
 */
var sendCommandAck = function sendCommandAck(objdata, time, mt, callback) {
    if (time == null || time == undefined || time == "")
        time = new Date();
    try {
        var obj = {
            "uniqueid": UNIQUE_ID,
            "d": objdata,
            "cpid": CPID_GLOBAL,
            "t": time,
            "mt": mt,
            "sdk": {
                "l": config.sdkLanguage,
                "v": config.sdkversion,
                "e": ENV_GLOBAL
            }
        }
        sendDataOnAzureMQTT(obj)
        callback({
            status: true,
            data: null,
            message: "command ack success"
        })
    } catch (error) {
        callback({
            status: false,
            data: error,
            message: error.message
        })
    }
}

module.exports = {
    syncDevice: syncDevice,
    SendDataToHub: SendDataToHub,
    startHeartBeat: startHeartBeat,
    startCommandSubsriber: startCommandSubsriber,
    getAttributes: getAttributes,
    syncDeviceOnDemand: syncDeviceOnDemand,
    subscriberProcess: subscriberProcess,
    UpdateTwin: UpdateTwin,
    writeLog: writeLog,
    mqttConnectionEnd: mqttConnectionEnd,
    sendCommandAck: sendCommandAck
}