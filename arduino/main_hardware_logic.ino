#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h> 
#include <SPI.h>
#include <MFRC522.h>
#include <Adafruit_Fingerprint.h>
#include <ESP32Servo.h>

const char* ssid = "mokshsamsung";
const char* password = "mokshxyz";

const String SERVER_URL = "https://smart-campus-system-87sd.onrender.com/api/hardware"; 

#define SS_PIN 5       
#define RST_PIN 22     
#define BUZZER_PIN 4   
#define SERVO_PIN 13   

MFRC522 rfid(SS_PIN, RST_PIN);
HardwareSerial mySerial(2); 
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);
Servo gateServo;

String currentMode = "GATE";
unsigned long lastPollTime = 0;

void setup() {
  Serial.begin(115200);
  
  pinMode(BUZZER_PIN, OUTPUT);
  gateServo.setPeriodHertz(50); 
  gateServo.attach(SERVO_PIN, 500, 2400);
  gateServo.write(0); 

  SPI.begin();
  rfid.PCD_Init();
  
  mySerial.begin(57600, SERIAL_8N1, 16, 17);
  finger.begin(57600);
  if (finger.verifyPassword()) {
    Serial.println("✅ Fingerprint sensor found!");
  } else {
    Serial.println("❌ Fingerprint sensor NOT found!");
  }

  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected!");
  successBeep();
}

void loop() {
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    String rfidTag = getRFIDString();
    Serial.println("\n--- CARD DETECTED ---");
    Serial.println("ID: " + rfidTag);
    beep(1, 100); 

    if (currentMode == "ENROLL") {
      Serial.println("Mode: ENROLL. Waiting for new fingerprint (15s limit)...");
      updateServerStatus("RFID Scanned! Place finger on scanner...");
      
      int newFingerID = enrollNewFingerprintWithTimeouts(); 
      
      if (newFingerID > 0) {
         Serial.println("Enrollment Complete! Sending to server...");
         sendDataToServer(rfidTag, newFingerID);
         successBeep();
      } else if (newFingerID == -2) {
         Serial.println("Timeout: User took longer than 15 seconds.");
         updateServerStatus("⏱️ Enrollment Timed Out. Please try again.");
         errorBeep();
      } else {
         Serial.println("Enrollment Failed.");
         updateServerStatus("❌ Fingerprint enrollment failed. Try again.");
         errorBeep();
      }
    } 
    else {
      Serial.println("Mode: GATE. Waiting for fingerprint (15s limit)...");
      int matchedFingerID = waitForFingerprintMatch(15000); 
      
      if (matchedFingerID > 0) {
         Serial.println("Access Granted! Sending to server...");
         if (sendDataToServer(rfidTag, matchedFingerID)) {
            successBeep();
            openGate();
         } else {
            Serial.println("Server rejected access.");
            errorBeep(); 
         }
      } else {
         Serial.println("Timeout or No Match.");
         errorBeep(); 
      }
    }

    rfid.PICC_HaltA();
    delay(1000); 
  }

  if (millis() - lastPollTime > 2000) {
    pollServerMode();
    lastPollTime = millis();
  }
}

void pollServerMode() {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure client;
    client.setInsecure(); 
    HTTPClient http;
    http.begin(client, SERVER_URL + "/mode"); 
    http.setTimeout(1500); 
    
    int httpCode = http.GET();
    if (httpCode == 200) {
      String payload = http.getString();
      String newMode = (payload.indexOf("ENROLL") > 0) ? "ENROLL" : "GATE";
      
      if (currentMode != newMode) {
        currentMode = newMode;
        Serial.println("\n[SYSTEM] Switched to: " + currentMode + " Mode");
      }
    }
    http.end();
  }
}

void updateServerStatus(String message) {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure client;
    client.setInsecure(); 
    HTTPClient http;
    http.begin(client, SERVER_URL + "/enroll-update"); 
    http.addHeader("Content-Type", "application/json");
    
    String payload = "{\"message\":\"" + message + "\"}";
    http.POST(payload);
    http.end();
  }
}

bool sendDataToServer(String rfidTag, int fingerId) {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure client;
    client.setInsecure(); 
    HTTPClient http;
    http.begin(client, SERVER_URL + "/scan"); 
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"rfidTag\":\"" + rfidTag + "\",\"fingerId\":" + String(fingerId) + "}";

    int httpCode = http.POST(payload);
    http.end();
    return (httpCode == 200 || httpCode == 201); 
  }
  return false;
}

String getRFIDString() {
  String content = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    content.concat(String(rfid.uid.uidByte[i] < 0x10 ? " 0" : " "));
    content.concat(String(rfid.uid.uidByte[i], HEX));
  }
  content.toUpperCase();
  return content.substring(1); 
}

int waitForFingerprintMatch(int timeoutMs) {
  unsigned long startTime = millis();
  while (millis() - startTime < timeoutMs) {
    uint8_t p = finger.getImage();
    if (p == FINGERPRINT_OK) {
      p = finger.image2Tz();
      if (p == FINGERPRINT_OK) {
        p = finger.fingerSearch();
        if (p == FINGERPRINT_OK) {
          return finger.fingerID; 
        }
      }
    }
    delay(50);
  }
  return -1; 
}

int enrollNewFingerprintWithTimeouts() {
  finger.getTemplateCount();
  int id = finger.templateCount + 1;
  if (id > 127) return -1; 

  unsigned long startTime = millis();
  int p = -1;
  while (p != FINGERPRINT_OK) { 
    p = finger.getImage(); 
    if (millis() - startTime > 15000) return -2; 
    delay(50);
  }
  p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) return -1;
  
  beep(1, 100); 
  updateServerStatus("Remove finger, then place it again...");
  delay(2000); 

  startTime = millis();
  p = -1;
  while (p != FINGERPRINT_OK) { 
    p = finger.getImage(); 
    if (millis() - startTime > 15000) return -2; 
    delay(50);
  }
  p = finger.image2Tz(2);
  if (p != FINGERPRINT_OK) return -1;

  p = finger.createModel();
  if (p != FINGERPRINT_OK) return -1;

  p = finger.storeModel(id);
  if (p == FINGERPRINT_OK) return id; 

  return -1;
}

void openGate() {
  gateServo.write(90); 
  delay(3000);         
  gateServo.write(0);  
}

void beep(int times, int duration) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(duration);
    digitalWrite(BUZZER_PIN, LOW);
    delay(duration);
  }
}

void successBeep() {
  digitalWrite(BUZZER_PIN, HIGH); delay(100);
  digitalWrite(BUZZER_PIN, LOW); delay(50);
  digitalWrite(BUZZER_PIN, HIGH); delay(300);
  digitalWrite(BUZZER_PIN, LOW);
}

void errorBeep() {
  digitalWrite(BUZZER_PIN, HIGH); delay(1000); 
  digitalWrite(BUZZER_PIN, LOW);
}