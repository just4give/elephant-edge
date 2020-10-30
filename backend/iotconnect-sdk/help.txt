# Softweb Solutions Inc
## IOT Connect SDK : Software Development Kit 2.3.0

**Prerequisite tools:**

1. NodeJs : Node version v8.9.1 and above
2. Npm : NPM is compatible to the node version 5.5.1

**Installation :** 

1. Extract the "iotconnect-sdk-node-v2.3.0.zip"

2. To install the required libraries use the below command:
	- Goto SDK directory path using terminal/Command prompt
	- cd iotconnect-sdk-node-v2.3.0/
	- npm install (Install prerequisite nodejs library)
	- npm install iotconnect-sdk (Install the 'iotconnect-sdk' package in nodejs library)

3. Using terminal/command prompt goto sample folder
	- cd sample 

4. Update firmware.js file with following details
	- Prerequisite input data as explained in usage section as below
	- Update sensor attributes according to added in iotconnect cloud platform
	- If your device is secure then need to configure the certificate path as like sdkOptions given below otherwise leave as it is..

5. Ready to go:
	- node firmware.js (This script send the data on cloud as per configured device details)
	- node example.js *<<env>>* (This script can send the data to given input(uniqueid, cpid) device by command prompt)
	- Note : //env should be "DEV, QA, POC, AVNETPOC, PROD" - (Default env = PROD)
	
**Usage :**

Declare Iot Connect SDK which has placed in node_modules directory
```node
var sdk = require('iotconnect-sdk');
```

Prerequisite input data 
```node
var uniqueId = <<uniqueId>>;
var cpid = <<CPID>>; 
var env = <<env>>; // DEV, QA, POC, AVNETPOC, PROD(Default)
```
- To configure the secure SSL/x509 connection follow below step for CA or CA Selfsiged certificate
	- Set SSL/x509 certificate path for CA sign and Selfsign certificate like as below
```json
var sdkOptions = {
    "certificate" : { 
        "SSLKeyPath"	: "<< SystemPath >>/key.pem",
		"SSLCertPath"   : "<< SystemPath >>/cert.pem",
		"SSLCaPath"     : "<< SystemPath >>/ms.pem"
	}
}
```

To get the device information and connect to the device
```node
var iotConnectSDK = new sdk(cpid, uniqueId, callbackMessage, twinCallbackMessage, env, sdkOptions);

Note : "sdkOptions" is optional param
```

To receive the command from Cloud to Device(C2D)	
```node
var callbackMessage = function callbackMessage(data){
	console.log(data);
	if(data.cmdType == '0x01') { // Device command
		var obj = {
			"ackId": data.ackId,
			"st": 6,
			"msg": "",
			"childId": ""
		}
		var mt = 5;
		if(data.ackId != null)
			sendAck(obj, null, mt);
	} else if(data.cmdType == '0x02') { // Firmware OTA command
		var obj = {
			"ackId": data.ackId,
			"st": 7,
			"msg": "",
			"childId": ""
		}
		var mt = 11;
		if(data.ackId != null)
			sendAck(obj, null, mt);
	}
}
```

To receive the twin from Cloud to Device(C2D)

```node
var twinCallbackMessage = function twinCallbackMessage(data){
    console.log(data);
}
```

To get the list of attributes
```node
iotConnectSDK.getAttributes(function(response){
	console.log("Attributed :: "+ response);
});
```

Data input format
```json
var sendSensordata = [{
    "uniqueId": "123456",
    "time" : '2019-12-24T10:06:17.857Z', //Date format should be as defined
    "data": {
        "temperature": 15.55,
        "humidity" : 27.97,
        "weight" : 36,
        "gyroscope" : {
            'x' : -1.2,
            'y' : 0.25,
            'z' : 1.1,
        }
    }
}];
```

To send the data from Device To Cloud(D2C)
```node
iotConnectSDK.SendData(sendSensordata);
```

To disconnect the device from hub

```node
iotConnectSDK.disconnectDevice(function (response) {
	if(response.status){
		console.log("\nDevice disconnected :: ", new Date());
		process.exit();
	} else {
		console.log("Device disconnection :: ", response);
	}
})
```

To update the Twin Property

```node
var key = "firmware_version";
var value = "4.0";
iotConnectSDK.UpdateTwin(key,value, function (response) {
	console.log("Twin update :: ",response);
})
```

To send the acknowledgement to cloud for Device command and Firmware OTA command

```node
function sendAck(jsonObj, time, mt){
    iotConnectSDK.sendAck(jsonObj, time, mt, function (response) {
        if(response.status){
            console.log("\nCommand acknowledgement sent :: SUCCESS:: ", new Date());
        } else {
            console.log("\nCommand acknowledgement sent :: FAILED :: ", new Date());
        }
    })
}
```