
#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <ESP32_LoRaWAN.h>
#include "Arduino.h"
#include <ArduinoJson.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>

#define BLENAME "ElephantEdge"
#define SCAN_TIME  5 // seconds
#define VEXT_PIN 21                               // the board's VExt pin, used to power our sensors
#define BATT_VOLTAGE_PIN 13
#define LED_PIN 4
#define Fbattery    3700  //The default battery is 3700mv when the battery is fully charged.

float XS = 0.00225;      //The returned reading is multiplied by this XS to get the battery voltage.
uint16_t MUL = 1000;
uint16_t MMUL = 100;


/*license for Heltec ESP32 LoRaWan, quary your ChipID relevant license: http://resource.heltec.cn/search */
uint32_t  license[4] = {0xC2090A24, 0x2B58148E, 0x8E2C7494, 0x4F4EAE8C};

/* OTAA para*/
uint8_t DevEui[] = { };
uint8_t AppEui[] = { };
uint8_t AppKey[] = { };

/* ABP para*/
uint8_t NwkSKey[] = { 0x15, 0xb1, 0xd0, 0xef, 0xa4, 0x63, 0xdf, 0xbe, 0x3d, 0x11, 0x18, 0x1e, 0x1e, 0xc7, 0xda, 0x85 };
uint8_t AppSKey[] = { 0xd7, 0x2c, 0x78, 0x75, 0x8c, 0xdc, 0xca, 0xbf, 0x55, 0xee, 0x4a, 0x77, 0x8d, 0x16, 0xef, 0x67 };
uint32_t DevAddr =  ( uint32_t )0x007e6ae1;



/*LoraWan Class, Class A and Class C are supported*/
DeviceClass_t  loraWanClass = CLASS_A;  //CLASS_A for battery powered device

/*the application data transmission duty cycle.  value in [ms].*/
uint32_t appTxDutyCycle = 120000;

/*OTAA or ABP*/
bool overTheAirActivation = true;

/*ADR enable*/
bool loraWanAdr = false;

/* Indicates if the node is sending confirmed or unconfirmed messages */
bool isTxConfirmed = false;

/* Application port */
uint8_t appPort = 2;


/*!
  Number of trials to transmit the frame, if the LoRaMAC layer did not
  receive an acknowledgment. The MAC performs a datarate adaptation,
  according to the LoRaWAN Specification V1.0.2, chapter 18.4, according
  to the following table:

  Transmission nb | Data Rate
  ----------------|-----------
  1 (first)       | DR
  2               | DR
  3               | max(DR-1,0)
  4               | max(DR-1,0)
  5               | max(DR-2,0)
  6               | max(DR-2,0)
  7               | max(DR-3,0)
  8               | max(DR-3,0)

  Note, that if NbTrials is set to 1 or 2, the MAC will not decrease
  the datarate, in case the LoRaMAC layer did not receive an acknowledgment
*/
uint8_t confirmedNbTrials = 8;

/*LoraWan debug level, select in arduino IDE tools.
  None : print basic info.
  Freq : print Tx and Rx freq, DR info.
  Freq && DIO : print Tx and Rx freq, DR, DIO0 interrupt and DIO1 interrupt info.
  Freq && DIO && PW: print Tx and Rx freq, DR, DIO0 interrupt, DIO1 interrupt and MCU deepsleep info.
*/
uint8_t debugLevel = LoRaWAN_DEBUG_LEVEL;

/*LoraWan region, select in arduino IDE tools*/
LoRaMacRegion_t loraWanRegion = ACTIVE_REGION;


TinyGPSPlus  gps;
HardwareSerial GPSSerial(1);
float latitude , longitude;
String date_str , time_str , lat_str , lng_str;
BLEScan* pBLEScan;


const size_t capacity = JSON_OBJECT_SIZE(5) + 30;
DynamicJsonDocument payload(capacity);

static void prepareTxFrame( uint8_t port )
{

  Serial.println("prepareTxFrame");
  digitalWrite(LED_PIN, HIGH);
  BLEScanResults foundDevices = pBLEScan->start(SCAN_TIME, false);
  int count = foundDevices.getCount() ;
  Serial.printf("Devices found: %d \n", count);
  pBLEScan->clearResults();


  payload["d"] = count;
  digitalWrite(LED_PIN, LOW);

  //  while (GPSSerial.available()) {
  //    gps.encode(GPSSerial.read());
  //
  //  }

  while (!gps.location.isValid())
  {

    do
    {
      if (GPSSerial.available())
      {
        gps.encode(GPSSerial.read());
      }
    } while (gps.charsProcessed() < 100);


  }

  latitude  = gps.location.lat();
  longitude = gps.location.lng();

  //if (latitude && longitude) {
  long lat = (long) (latitude * 10000L);
  latitude = (float) lat / 10000.0;

  long lon = (long) (longitude * 10000L);
  longitude = (float) lon / 10000.0;

  payload["l"] = latitude, 6;
  payload["t"] = longitude, 6;


  //}

  if (Serial2.available() > 0) {
    Serial.print("Received data");
    char bfr[501];
    memset(bfr, 0, 501);
    Serial2.readBytesUntil( '\n', bfr, 500);

    Serial.println(bfr);
    payload["s"] = bfr;
  }

  serializeJsonPretty(payload, Serial);
  serializeMsgPack(payload, appData);
  appDataSize = measureMsgPack(payload);//AppDataSize max value is 64


}


class EdgeBLEAdvertisedDeviceCallbacks : public BLEAdvertisedDeviceCallbacks
{
    void onResult(BLEAdvertisedDevice advertisedDevice)
    {
      if (advertisedDevice.haveManufacturerData() == true) {


      }
    }
};




void setup() {

  Serial.println("Setup method called");

  pinMode(VEXT_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(VEXT_PIN, LOW);
  delay(1000);
  
  Serial.begin(9600);
  Serial2.begin(115200, SERIAL_8N1, 2, 15);   
  GPSSerial.begin(9600, SERIAL_8N1, 22, 23);  
  
  delay(2000);
  


  BLEDevice::init(BLENAME);
  // put your main code here, to run repeatedly:
  pBLEScan = BLEDevice::getScan(); //create new scan
  pBLEScan->setAdvertisedDeviceCallbacks(new EdgeBLEAdvertisedDeviceCallbacks());
  pBLEScan->setActiveScan(true); //active scan uses more power, but get results faster
  pBLEScan->setInterval(1000);
  pBLEScan->setWindow(999);

  payload["l"] = 0;
  payload["t"] = 0;
  payload["d"] = 0;  //No of BLE devices
  payload["s"] = "";  //data from Nano Serial

  //payload["b"] = ReadVoltage(BATT_VOLTAGE_PIN) * 2.3857143;  //Battery voltage


  SPI.begin(SCK, MISO, MOSI, SS);
  Mcu.init(SS, RST_LoRa, DIO0, DIO1, license);
  deviceState = DEVICE_STATE_INIT;
  delay(100);
  
//  adcAttachPin(BATT_VOLTAGE_PIN);
//  analogSetClockDiv(255); // 1338mS
  //uint16_t c  =  analogRead(BATT_VOLTAGE_PIN);  // * XS * MUL;
  payload["b"] = ReadVoltage(BATT_VOLTAGE_PIN) * 2.3857143;  //c ; //remaining battery in mV
  

}

double ReadVoltage(byte pin) {
  double reading = analogRead(pin);
  return -0.000000000000016 * pow(reading, 4) + 0.000000000118171 * pow(reading, 3) - 0.000000301211691 * pow(reading, 2) + 0.001109019271794 * reading + 0.034143524634089;
}

void low_power() {
  // go to sleep:
  // change pins to input
  // turn off power to sensors and radio
  digitalWrite(VEXT_PIN, HIGH);
  pinMode(VEXT_PIN, INPUT);
  pinMode(2, INPUT);
  pinMode(15, INPUT);
  pinMode(22, INPUT);
  pinMode(23, INPUT);

}

void loop() {


  switch ( deviceState )
  {
    case DEVICE_STATE_INIT:
      {
        LoRaWAN.init(loraWanClass, loraWanRegion);
        break;
      }
    case DEVICE_STATE_JOIN:
      {
        LoRaWAN.join();
        break;
      }
    case DEVICE_STATE_SEND:
      {
        prepareTxFrame( appPort );
        LoRaWAN.send(loraWanClass);
        deviceState = DEVICE_STATE_CYCLE;
        break;
      }
    case DEVICE_STATE_CYCLE:
      {
        // Schedule next packet transmission
        txDutyCycleTime = appTxDutyCycle + randr( -APP_TX_DUTYCYCLE_RND, APP_TX_DUTYCYCLE_RND );
        LoRaWAN.cycle(txDutyCycleTime);
        deviceState = DEVICE_STATE_SLEEP;

        Serial.println("schedule next cycle");
        break;
      }
    case DEVICE_STATE_SLEEP:
      {
        low_power();
        LoRaWAN.sleep(loraWanClass, debugLevel);
        break;
      }
    default:
      {
        deviceState = DEVICE_STATE_INIT;
        break;
      }
  }


}