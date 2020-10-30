'use strict';

global.hbStatusFlag = 0;

var defaultParams = {
    "attribute": true,
    "setting": true,
    "protocol": true,
    "device": true,
    "rule": true,
    "sdkConfig": true
};

var attributeParams = {
	"attribute": true
};
var settingeParams = {
	"setting": true
};
var protocolParams = {
	"protocol": true
};
var deviceParams = {
	"device": true
};
var ruleParams = {
	"rule": true
};

var messageType = {
	"rpt" : 0,
	"flt" : 1,
	"rptEdge" : 2,
	"ruleMatchedEdge" : 3,	
	"log" : 4,
	"ack" : 5,
	"ota" : 6,
	"custom" : 7,
	"ping" : 8,
	"deviceCreated" : 9,
	"deviceStatus" : 10
}

var commandType = {
	"CORE_COMMAND" : "0x01",
	"FIRMWARE_UPDATE" : "0x02",
	"ATTRIBUTE_INFO_UPDATE" : "0x10",
	"SETTING_INFO_UPDATE" : "0x11",	
	"PASSWORD_INFO_UPDATE" : "0x12", 	
	"DEVICE_INFO_UPDATE" : "0x13",
	"RULE_INFO_UPDATE" : "0x15",
	"LOG_ON_DEMAND" : "0x16",	
	"STOP_SDK_CONNECTION" : "0x99"	
}

var responseCode = {
	"OK" : 0,
	"DEVICE_NOT_REGISTERED" : 1,
	"AUTO_REGISTER" : 2,	
	"DEVICE_NOT_FOUND" : 3, 	
	"DEVICE_INACTIVE" : 4,
	"OBJECT_MOVED" : 5,	
	"CPID_NOT_FOUND" : 6	
}

var aggrigateType = {
	"min" 	: 1,
	"max" 	: 2,	
	"sum" 	: 4, 	
	"avg" 	: 8, 	
	"count" : 16,
	"lv"	: 32
}

var aggrigateTypeLablel = {
	"min" 	: "min",
	"max" 	: "max",	
	"sum" 	: "sum", 	
	"avg" 	: "avg", 	
	"count" : "count",
	"lv" 	: "lv",
	"agt" 	: "agt"
}

var dataType = {
	"number" : 0,
	"string" : 1,	
	"object" : 2,
	"float"  : 3
}

var edgeEnableStatus = {
	"enabled"  : true,
	"disabled" : false
}

var authType = {
	"KEY"  : 1,
	"CA_SIGNED" : 2,
	"CA_SELF_SIGNED" : 3
}

var errorCode = {
	//Device information
	"e0100" : "Unable to get baseUrl.",
	"e0101" : "Sync response not found.",
	"e0102" : "Sync response invalid.",
	"e0103" : "CPID not found.",
	"e0104" : "HTTP/HTTPS request exception error.",
	"e0105" : "Network connection error.",
	"e0106" : "Device sync successfully.",
	"e0107" : "Device data not found.",

	//Device connection
	"e0200" : "Device uniqueid not found.",
	"e0201" : "Device connected successfully.",
	"e0202" : "Device connection failed.",
	"e0203" : "MQTT exception error.",
	"e0204" : "Device is publishing data.",
	"e0205" : "Device receive command.",
	
	//Device Twin Property
	"e0300" : "Twin property updated successfully.",
	"e0301" : "Device receive twin message.",
	
	//Offline data storage
	"e0400" : "Offline data storage started.",
	"e0401" : "Offline data has started sending data.",
	
	//SSL/c509 certificate configuraation
	"e0500" : "Property file not available."
}

if(ENV_GLOBAL != "")
{
	var url = "https://discovery.iotconnect.io/api/sdk/cpid/"+CPID_GLOBAL+"/lang/node/ver/2.0/env/"+ENV_GLOBAL;
}
else
{
	var url = "https://discovery.iotconnect.io/api/sdk/cpid/"+CPID_GLOBAL+"/lang/node/ver/2.0";
}

module.exports = {
	discoveryBaseUrl: url,
	commandType: commandType,
	responseCode: responseCode,
	defaultParams: defaultParams,
	attributeParams: attributeParams,
	settingeParams: settingeParams,
	protocolParams: protocolParams,
	deviceParams: deviceParams,
	ruleParams: ruleParams,
	aggrigateType: aggrigateType,
	aggrigateTypeLablel: aggrigateTypeLablel,
	dataType: dataType,
	edgeEnableStatus: edgeEnableStatus,
	messageType: messageType,
	authType: authType,
	httpAPIVersion: "2016-02-03",
	sdkVersion: "2.0",
	sdkLanguage: "M_Node",
	twinPropertyPubTopic: "$iothub/twin/PATCH/properties/reported/?$rid=1",
	twinPropertySubTopic: "$iothub/twin/PATCH/properties/desired/#",
	twinResponsePubTopic: "$iothub/twin/GET/?$rid=0",
	twinResponseSubTopic: "$iothub/twin/res/#",
	errorCode: errorCode
}