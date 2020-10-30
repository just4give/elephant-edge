/* Edge Impulse Arduino examples
   Copyright (c) 2020 EdgeImpulse Inc.

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in
   all copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   SOFTWARE.
*/

/* Includes ---------------------------------------------------------------- */
#include <elephant_edge_inference.h>
#include <Arduino_LSM9DS1.h>
#include <Arduino_HTS221.h>

/* Constant defines -------------------------------------------------------- */
#define CONVERT_G_TO_MS2    9.80665f

/* Private variables ------------------------------------------------------- */
static bool debug_nn = false; // Set this to true to see e.g. features generated from the raw signal


int counter = 0;
int scores[4] = {0, 0, 0, 0};
int max_index = 0;
int temperature = 0;
int humidity = 0;

/**
  @brief      Arduino setup function
*/
void setup()
{
  // put your setup code here, to run once:
  Serial.begin(9600);
  Serial1.begin(115200);
  delay(5000);

  digitalWrite(LED_PWR, LOW);
  //digitalWrite(PIN_ENABLE_SENSORS_3V3, LOW);
  //digitalWrite(PIN_ENABLE_I2C_PULLUP, LOW);

  Serial.println("Edge Impulse Inferencing Demo");

  if (!HTS.begin()) {
    ei_printf("Failed to initialize humidity temperature sensor!\n");
    while (1);

  }

  ei_printf("HTS initialized\r\n");

  if (!IMU.begin()) {
    ei_printf("Failed to initialize IMU!\r\n");
  }
  else {
    ei_printf("IMU initialized\r\n");
  }

  if (EI_CLASSIFIER_RAW_SAMPLES_PER_FRAME != 3) {
    ei_printf("ERR: EI_CLASSIFIER_RAW_SAMPLES_PER_FRAME should be equal to 3 (the 3 sensor axes)\n");
    return;
  }
}

/**
  @brief      Printf function uses vsnprintf and output using Arduino Serial

  @param[in]  format     Variable argument list
*/
void ei_printf(const char *format, ...) {
  static char print_buf[1024] = { 0 };

  va_list args;
  va_start(args, format);
  int r = vsnprintf(print_buf, sizeof(print_buf), format, args);
  va_end(args);

  if (r > 0) {
    Serial.write(print_buf);
  }
}

/**
  @brief      Get data and run inferencing

  @param[in]  debug  Get debug info if true
*/
void loop()
{
  ei_printf("\nStarting inferencing in 5 seconds...\n");

  delay(2000);
  counter = counter + 1;

  //ei_printf("Sampling...\n");

  // Allocate a buffer here for the values we'll read from the IMU
  float buffer[EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE] = { 0 };

  for (size_t ix = 0; ix < EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE; ix += 3) {
    // Determine the next tick (and then sleep later)
    uint64_t next_tick = micros() + (EI_CLASSIFIER_INTERVAL_MS * 1000);

    IMU.readAcceleration(buffer[ix], buffer[ix + 1], buffer[ix + 2]);

    buffer[ix + 0] *= CONVERT_G_TO_MS2;
    buffer[ix + 1] *= CONVERT_G_TO_MS2;
    buffer[ix + 2] *= CONVERT_G_TO_MS2;

    delayMicroseconds(next_tick - micros());
  }

  // Turn the raw buffer in a signal which we can the classify
  signal_t signal;
  int err = numpy::signal_from_buffer(buffer, EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE, &signal);
  if (err != 0) {
    ei_printf("Failed to create signal from buffer (%d)\n", err);
    return;
  }

  // Run the classifier
  ei_impulse_result_t result = { 0 };

  err = run_classifier(&signal, &result, debug_nn);
  if (err != EI_IMPULSE_OK) {
    ei_printf("ERR: Failed to run classifier (%d)\n", err);
    return;
  }

  // print the predictions
  float max_prediction = 0.0;
  int predicted_label = -1;

  ei_printf("Predictions (DSP: %d ms., Classification: %d ms., Anomaly: %d ms.): \n",
            result.timing.dsp, result.timing.classification, result.timing.anomaly);
  for (size_t ix = 0; ix < EI_CLASSIFIER_LABEL_COUNT; ix++) {
    ei_printf("    %s: %.5f\n", result.classification[ix].label, result.classification[ix].value);
    if ( result.classification[ix].value >= max_prediction) {
      max_prediction = result.classification[ix].value;
      predicted_label = ix;
    }
  }

  ei_printf("Predicted activity = %d \n", predicted_label);

#if EI_CLASSIFIER_HAS_ANOMALY == 1
  ei_printf("    anomaly score: %.3f\n", result.anomaly);
#endif

  //get other sensor values
  scores[predicted_label] = scores[predicted_label] + 1;
  ei_printf("Array { %d, %d, %d, %d} \n", scores[0], scores[1], scores[2], scores[3]);

  //sample the activies recorded and find most occurrance
  if (counter > 5) {
    counter = 0;



    int max_score = 0;


    for (int idx = 0; idx < 4; idx++) {

      if (scores[idx] > max_score ) {
        max_score = scores[idx];
        max_index = idx;
      }
      scores[idx] = 0;
    }


  }

  temperature = HTS.readTemperature(FAHRENHEIT);
  humidity = HTS.readHumidity();



  ei_printf("Temperature %d Humidity %d  Activity: %d \n", temperature, humidity, max_index);

  char buf[12];
  sprintf(buf, "%d;%d;%d;", max_index, temperature, humidity);
  Serial1.println(buf);




}

#if !defined(EI_CLASSIFIER_SENSOR) || EI_CLASSIFIER_SENSOR != EI_CLASSIFIER_SENSOR_ACCELEROMETER
#error "Invalid model for current sensor"
#endif