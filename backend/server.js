'use strict';

const sdk = require('iotconnect-sdk');
const async = require('async');
const GeoJsonGeometriesLookup = require('geojson-geometries-lookup');
const config = require('./config.json');
const MessagePack = require('./msgpack');
const { encode, decode } = MessagePack.initialize(2 ** 22); // 4MB
const fs = require('fs');
const uniqueId = config.uniqueId;
const cpid = config.cpid;
const env = config.env;
const mqtt_topic = config.mqtt;

// change based on how frequently you uplink data from collar, I am sending every 60 seconds from Heltec board
const ONLINE_INTERVAL_IN_MINUTE = 5 ; 

const mqtt = require('mqtt')
const client = mqtt.connect('mqtt://broker.hivemq.com')
let rawdata = JSON.parse(fs.readFileSync('data.json'));
let sensordata = JSON.parse(fs.readFileSync('sensordata.json'));
var connected = false;
var iotConnectSDK;


const geojson = {
    type: 'FeatureCollection',
    features: [{
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [
                [
                    [-72.2168093, 41.3762073],
                    [-72.2167289, 41.374895],
                    [-72.2145831, 41.3744603],
                    [-72.2133815, 41.3761831],
                    [-72.215597, 41.3768433],
                    [-72.2168093, 41.3762073]
                ]
            ]
        },
        properties: { prop2: 'value2' }
    }]
};



var callbackMessage = function callbackMessage(data) {

    console.log('callbackMessage');
    if (data != null && data != undefined && data.ack != undefined && data.cmdType != null) {
        if (data.cmdType == '0x01') {
            console.log("\n" + "--- Command Received ---");
            console.log(data.ack);
            console.log(data.ackId);
            console.log(data.command);
            console.log(data.uniqueId);
            var obj = {
                "ackId": data.ackId,
                "st": 6,
                "msg": "",
                "childId": ""
            }
            var mt = 5;
            if (data.ackId != null)
                sendAck(obj, null, mt);
        } else if (data.cmdType == '0x02') {
            console.log("\n" + "--- Firmware Command Received ---");
            console.log(data);
            var obj = {
                "ackId": data.ackId,
                "st": 7,
                "msg": "",
                "childId": ""
            }
            var mt = 11;
            if (data.ackId != null)
                sendAck(obj, null, mt);
        }
    }
    else {
        if (data.cmdType == null && data.command == "device_connected") {
            try {
                console.log("Device connected...", new Date());
                connected = true;

            } catch (error) {
                console.log("Error while getting attributes :: ", error.message);
            }
        } else {
            //console.log(data);
        }
    }
}



var sendOfflineData = function (payloadJson) {

    
    var sensorData = [{
        "uniqueId": uniqueId,
        "time": new Date(),
        "data": {
            "Temperature": payloadJson.temperature,
            "Air": payloadJson.air,
            "Online": payloadJson.online,
            "Location": {
                "lat": payloadJson.l,
                "lon": payloadJson.t
            }
        }
    }];

    iotConnectSDK.SendData(sensorData);
    
}

var activities=["Musth","Resting","Running","Walking"];
var sendSensorDate = function (payloadJson) {

    rawdata.lastUpdated = new Date().getTime();
    fs.writeFileSync('data.json',JSON.stringify(rawdata));
    
    let activity = "Walking";
    

    let data = {
        "Fence": payloadJson.fence? "0":"1",
        "Battery": payloadJson.b,
        "Human": payloadJson.d,
        "Risk": payloadJson.r ? "1":"0",
        "Activity": activity,
        "Temperature":80,
        "Air": payloadJson.air,
        "Online": payloadJson.online,
        "Location": {
            "lat": payloadJson.l,
            "lon": payloadJson.t
        }
    }

    if(payloadJson.s && payloadJson.s.length> 3){
        let splitted = payloadJson.s.split(";");
        data["Activity"] = activities[splitted[0]];
        data["Temperature"] =  splitted[1];
        data["Air"] =  splitted[2];
    }
    
    var sensorData = [{
        "uniqueId": uniqueId,
        "time": new Date(),
        "data": data
    }];

    

    iotConnectSDK.SendData(sensorData);
    
}



var checkDeviceOnlineStatus = function(){
    let lastUpdated = rawdata.lastUpdated;
    console.log(`Last updated ${lastUpdated}`);
    let now = new Date().getTime();
    if(now - lastUpdated > ONLINE_INTERVAL_IN_MINUTE*60*1000){
        console.log("Device is offline. Send data to IOT Connect at "+new Date());
        
        
        sensordata.online="0";
        sendOfflineData(sensordata);
    }
}

var listen = async function () {
    console.log("Initializing IOT Connect SDK...");
    iotConnectSDK = new sdk(cpid, uniqueId, callbackMessage, null, env);

    client.on('connect', () => {
        console.log("Connected to MQTT ...");
        client.subscribe('edge/helium/f7fa936b-790d-4350-ae2a-8ca5421e7df9/rx')
    })

    setInterval(checkDeviceOnlineStatus, 60*1000);

    client.on('message', (topic, message) => {

        try {

            if (topic === 'edge/helium/f7fa936b-790d-4350-ae2a-8ca5421e7df9/rx') {
                //  console.log('Message received from MQTT', message.toString());

                let messageJson = JSON.parse(message.toString());

                let payloadJson = decode(Buffer.from(messageJson.payload, 'base64'))
                //let payloadJson = messageJson.payload;
                console.log(payloadJson);

                if(payloadJson.l ==0 ){
                    console.log("Ignore as location is empty");
                    payloadJson.l = 41.375701904296875;
                    payloadJson.t =  -72.2155990600586;
                    //return ;
                }

                payloadJson.l = parseFloat(payloadJson.l);
                payloadJson.t = parseFloat(payloadJson.t);
                
                


                const glookup = new GeoJsonGeometriesLookup(geojson);
                const point1 = { type: "Point", coordinates: [payloadJson.t, payloadJson.l] };

                let insideFence = glookup.hasContainers(point1, { ignorePoints: true, ignoreLines: true });
                payloadJson.fence = insideFence;
                payloadJson.r = 0;
                payloadJson.temperature = Math.floor(Math.random() * 20)+50;
                payloadJson.air = Math.floor(Math.random() * 500)+200;
                payloadJson.online = "1";

                console.log("location inside geofencing? ", insideFence);

                fs.writeFileSync('sensordata.json',JSON.stringify(sensordata));

                sendSensorDate(payloadJson);
            }

        } catch (error) {
            console.log("onMessage error: ", error.message);
        }

    })


}

listen();