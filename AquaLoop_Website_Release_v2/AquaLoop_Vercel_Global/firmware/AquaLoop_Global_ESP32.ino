/*
  AquaLoop Global + Local ESP32 Firmware
  ======================================
  Global path:
    Sensors -> ESP32 -> HTTPS -> Vercel /api/telemetry -> Supabase -> AquaLoop dashboard

  Local fallback:
    Sensors -> ESP32 hotspot -> http://192.168.4.1

  No Blynk.

  IMPORTANT
  - Each physical unit needs a unique DEVICE_ID and DEVICE_SECRET.
  - Set HOME_WIFI_SSID/HOME_WIFI_PASSWORD so the ESP32 can reach the internet.
  - Set CLOUD_ENDPOINT to your deployed Vercel URL + /api/telemetry.
  - Confirm GPIO pins and calibrate your actual sensors.
  - Never put >3.3 V into an ESP32 ADC/GPIO.
*/

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Preferences.h>

// ============================================================
// 1) GLOBAL DEVICE SETTINGS — CHANGE THESE
// ============================================================
const char* DEVICE_ID = "AC-PK-001";
const char* DEVICE_SECRET = "PASTE_SECRET_FROM_AQUALOOP_DASHBOARD";
const char* CLOUD_ENDPOINT = "https://YOUR-PROJECT.vercel.app/api/telemetry";

// Internet Wi-Fi used for GLOBAL access.
const char* HOME_WIFI_SSID = "YOUR_WIFI_NAME";
const char* HOME_WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// The ESP32 keeps this local hotspot active at the same time.
const char* LOCAL_AP_PASSWORD = "AquaLoop2026"; // 8+ characters

// ============================================================
// 2) SENSOR PINS — CONFIRM AGAINST YOUR WIRING
// ============================================================
constexpr int TDS_PIN = 34;          // ESP32 ADC1
constexpr int TURBIDITY_PIN = 35;    // ESP32 ADC1
constexpr int FLOW_PIN = 27;         // digital interrupt

// ============================================================
// 3) CALIBRATION — REPLACE WITH YOUR MEASURED VALUES
// ============================================================
constexpr float WATER_TEMPERATURE_C = 25.0f;
constexpr float TDS_CALIBRATION_FACTOR = 1.00f;
constexpr float TDS_OFFSET_PPM = 0.0f;

constexpr float TURBIDITY_CLEAR_V = 2.80f;
constexpr float TURBIDITY_DIRTY_V = 0.80f;
constexpr float TURBIDITY_MAX_NTU = 1000.0f;

// Common starting value for YF-S201-type meters. Calibrate your exact sensor.
constexpr float FLOW_CALIBRATION_FACTOR = 7.50f;

// Cloud transmission: latest every 3 s; history point every 15 s.
constexpr uint32_t CLOUD_POST_INTERVAL_MS = 3000;
constexpr uint8_t HISTORY_EVERY_N_POSTS = 5;

WebServer server(80);
Preferences prefs;

volatile uint32_t flowPulseCount = 0;
float tdsVoltage = 0.0f;
float turbidityVoltage = 0.0f;
float tdsPpm = 0.0f;
float turbidityNtu = 0.0f;
float flowRateLMin = 0.0f;
float flowHz = 0.0f;
double totalLitres = 0.0;
double lastPersistedLitres = 0.0;

uint32_t lastAnalogMs = 0;
uint32_t lastFlowMs = 0;
uint32_t lastCloudPostMs = 0;
uint32_t lastWifiRetryMs = 0;
uint8_t postCounter = 0;
String localSSID;

IRAM_ATTR void onFlowPulse() {
  flowPulseCount++;
}

float averageAdcVoltage(int pin, int samples = 18) {
  uint32_t totalMv = 0;
  for (int i = 0; i < samples; i++) {
    totalMv += analogReadMilliVolts(pin);
    delayMicroseconds(220);
  }
  return (totalMv / (float)samples) / 1000.0f;
}

float calculateTds(float measuredVoltage) {
  float compensationCoefficient = 1.0f + 0.02f * (WATER_TEMPERATURE_C - 25.0f);
  float v = measuredVoltage / compensationCoefficient;
  float ppm = (133.42f * v * v * v - 255.86f * v * v + 857.39f * v) * 0.5f;
  ppm = ppm * TDS_CALIBRATION_FACTOR + TDS_OFFSET_PPM;
  return max(0.0f, ppm);
}

float calculateTurbidity(float measuredVoltage) {
  float denom = TURBIDITY_CLEAR_V - TURBIDITY_DIRTY_V;
  if (fabs(denom) < 0.001f) return 0.0f;
  float fraction = (TURBIDITY_CLEAR_V - measuredVoltage) / denom;
  return constrain(fraction * TURBIDITY_MAX_NTU, 0.0f, TURBIDITY_MAX_NTU);
}

void updateAnalogSensors() {
  if (millis() - lastAnalogMs < 500) return;
  lastAnalogMs = millis();

  float newTdsV = averageAdcVoltage(TDS_PIN);
  float newTurbV = averageAdcVoltage(TURBIDITY_PIN);
  float newTds = calculateTds(newTdsV);
  float newTurb = calculateTurbidity(newTurbV);

  static bool initialized = false;
  if (!initialized) {
    tdsVoltage = newTdsV;
    turbidityVoltage = newTurbV;
    tdsPpm = newTds;
    turbidityNtu = newTurb;
    initialized = true;
  } else {
    constexpr float alpha = 0.28f;
    tdsVoltage = alpha * newTdsV + (1.0f - alpha) * tdsVoltage;
    turbidityVoltage = alpha * newTurbV + (1.0f - alpha) * turbidityVoltage;
    tdsPpm = alpha * newTds + (1.0f - alpha) * tdsPpm;
    turbidityNtu = alpha * newTurb + (1.0f - alpha) * turbidityNtu;
  }
}

void persistLifetimeVolumeIfNeeded() {
  // Save every additional 1 L. This limits flash writes while surviving reboots.
  if (totalLitres - lastPersistedLitres >= 1.0) {
    prefs.putDouble("totalL", totalLitres);
    lastPersistedLitres = totalLitres;
  }
}

void updateFlow() {
  uint32_t now = millis();
  if (now - lastFlowMs < 1000) return;

  float elapsedSeconds = (now - lastFlowMs) / 1000.0f;
  lastFlowMs = now;

  noInterrupts();
  uint32_t pulses = flowPulseCount;
  flowPulseCount = 0;
  interrupts();

  flowHz = pulses / elapsedSeconds;
  flowRateLMin = FLOW_CALIBRATION_FACTOR > 0 ? flowHz / FLOW_CALIBRATION_FACTOR : 0;
  if (flowRateLMin < 0) flowRateLMin = 0;

  totalLitres += (flowRateLMin / 60.0) * elapsedSeconds;
  persistLifetimeVolumeIfNeeded();
}

String jsonStatus() {
  String json = "{";
  json += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  json += "\"tds\":" + String(tdsPpm, 1) + ",";
  json += "\"turbidity\":" + String(turbidityNtu, 1) + ",";
  json += "\"flowRate\":" + String(flowRateLMin, 3) + ",";
  json += "\"totalLitres\":" + String(totalLitres, 3) + ",";
  json += "\"internetConnected\":" + String(WiFi.status() == WL_CONNECTED ? "true" : "false") + ",";
  json += "\"localIp\":\"" + WiFi.softAPIP().toString() + "\",";
  json += "\"uptimeMs\":" + String(millis());
  json += "}";
  return json;
}

const char LOCAL_HTML[] PROGMEM = R"HTML(
<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>AquaLoop Local</title>
<style>body{font-family:system-ui;margin:0;background:#f4f8f7;color:#10242a}.wrap{max-width:820px;margin:auto;padding:28px}.top{display:flex;justify-content:space-between;align-items:center}.brand{font-weight:900;font-size:24px}.badge{font-size:11px;font-weight:800;background:#e8f7f4;padding:9px 12px;border-radius:999px}.hero{background:#071d25;color:#fff;border-radius:26px;padding:25px;margin-top:22px}.hero h1{font-size:34px;margin:6px 0}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px}.card{background:#fff;color:#10242a;border-radius:18px;padding:18px}.card span{font-size:10px;color:#687d82;font-weight:800;text-transform:uppercase}.card strong{display:block;font-size:30px;margin:12px 0 3px}.foot{font-size:12px;color:#9bb5b9;margin-top:18px}@media(max-width:600px){.grid{grid-template-columns:1fr}}</style></head>
<body><div class="wrap"><div class="top"><div class="brand">↻ AquaLoop</div><div class="badge">LOCAL FALLBACK</div></div><div class="hero"><small>DIRECT ESP32 DIAGNOSTICS</small><h1 id="device">AquaLoop</h1><p>Live readings from the device hotspot. The global dashboard remains on your Vercel domain when the ESP32 has internet access.</p><div class="grid"><div class="card"><span>TDS</span><strong id="tds">—</strong><small>ppm</small></div><div class="card"><span>Turbidity</span><strong id="turb">—</strong><small>NTU</small></div><div class="card"><span>Flow rate</span><strong id="flow">—</strong><small>L/min</small></div></div><div class="foot" id="status">Connecting…</div></div></div>
<script>async function tick(){try{const r=await fetch('/api/local/status',{cache:'no-store'});const d=await r.json();device.textContent=d.deviceId;tds.textContent=Number(d.tds).toFixed(0);turb.textContent=Number(d.turbidity).toFixed(1);flow.textContent=Number(d.flowRate).toFixed(2);status.textContent=(d.internetConnected?'Global cloud connected':'No internet — local dashboard still active')+' · '+new Date().toLocaleTimeString()}catch(e){status.textContent='Local sensor API unavailable'}}tick();setInterval(tick,1000)</script></body></html>
)HTML";

void startLocalServer() {
  server.on("/", HTTP_GET, [](){ server.send_P(200, "text/html", LOCAL_HTML); });
  server.on("/api/local/status", HTTP_GET, [](){
    server.sendHeader("Cache-Control", "no-store");
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", jsonStatus());
  });
  server.onNotFound([](){ server.sendHeader("Location", "/", true); server.send(302, "text/plain", ""); });
  server.begin();
}

void connectInternet() {
  WiFi.mode(WIFI_AP_STA);
  localSSID = "AquaLoop-" + String(DEVICE_ID);
  WiFi.softAP(localSSID.c_str(), LOCAL_AP_PASSWORD);

  Serial.println("Local hotspot: " + localSSID);
  Serial.println("Local dashboard: http://192.168.4.1");

  if (strlen(HOME_WIFI_SSID) > 0 && String(HOME_WIFI_SSID) != "YOUR_WIFI_NAME") {
    WiFi.begin(HOME_WIFI_SSID, HOME_WIFI_PASSWORD);
    Serial.print("Connecting to internet Wi-Fi");
    uint32_t start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 12000) {
      delay(400);
      Serial.print(".");
    }
    Serial.println();
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("Global internet connected. STA IP: " + WiFi.localIP().toString());
    } else {
      Serial.println("Internet unavailable. AquaLoop local hotspot remains active.");
    }
  }
}

void retryWifiIfNeeded() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - lastWifiRetryMs < 15000) return;
  lastWifiRetryMs = millis();
  if (String(HOME_WIFI_SSID) == "YOUR_WIFI_NAME") return;
  WiFi.disconnect();
  WiFi.begin(HOME_WIFI_SSID, HOME_WIFI_PASSWORD);
}

bool postTelemetry() {
  if (WiFi.status() != WL_CONNECTED) return false;
  if (String(CLOUD_ENDPOINT).indexOf("YOUR-PROJECT") >= 0) return false;
  if (String(DEVICE_SECRET).indexOf("PASTE_SECRET") >= 0) return false;

  WiFiClientSecure secureClient;
  // MVP: encrypted HTTPS, certificate validation disabled for easiest deployment.
  // For production, pin/validate the CA certificate instead of setInsecure().
  secureClient.setInsecure();

  HTTPClient http;
  if (!http.begin(secureClient, CLOUD_ENDPOINT)) return false;
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-ID", DEVICE_ID);
  http.addHeader("X-Device-Secret", DEVICE_SECRET);

  postCounter++;
  bool recordHistory = (postCounter % HISTORY_EVERY_N_POSTS) == 0;

  String body = "{";
  body += "\"tds\":" + String(tdsPpm, 1) + ",";
  body += "\"turbidity\":" + String(turbidityNtu, 1) + ",";
  body += "\"flowRate\":" + String(flowRateLMin, 3) + ",";
  body += "\"totalLitres\":" + String(totalLitres, 3) + ",";
  body += "\"uptimeMs\":" + String(millis()) + ",";
  body += "\"recordHistory\":" + String(recordHistory ? "true" : "false");
  body += "}";

  int code = http.POST(body);
  if (code >= 200 && code < 300) {
    Serial.printf("Cloud telemetry OK (%d)\n", code);
  } else {
    Serial.printf("Cloud telemetry failed (%d): %s\n", code, http.getString().c_str());
  }
  http.end();
  return code >= 200 && code < 300;
}

void setup() {
  Serial.begin(115200);
  delay(350);

  analogReadResolution(12);
  pinMode(TDS_PIN, INPUT);
  pinMode(TURBIDITY_PIN, INPUT);
  pinMode(FLOW_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), onFlowPulse, FALLING);

  prefs.begin("aqualoop", false);
  totalLitres = prefs.getDouble("totalL", 0.0);
  lastPersistedLitres = totalLitres;

  lastFlowMs = millis();
  connectInternet();
  startLocalServer();

  Serial.println("AquaLoop ready.");
}

void loop() {
  server.handleClient();
  updateAnalogSensors();
  updateFlow();
  retryWifiIfNeeded();

  if (millis() - lastCloudPostMs >= CLOUD_POST_INTERVAL_MS) {
    lastCloudPostMs = millis();
    postTelemetry();
  }

  delay(2);
}
