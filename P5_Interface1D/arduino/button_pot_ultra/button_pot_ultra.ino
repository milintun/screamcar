#include "Keyboard.h"

// constants
const int buttonPin = 14;   // A0 on many boards
const int potPin = 21;
const int trigPin = 7;
const int echoPin = 8;



// variables
int buttonState = 0;
int potVal = 0;
float duration, distance;



void setup() {
  pinMode(buttonPin, INPUT);
  pinMode(potPin, INPUT);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  Serial.begin(9600);
}

void loop() {
  buttonState = digitalRead(buttonPin);
  potVal = analogRead(potPin);

  // Serial.print("1: ");
  // Serial.println(buttonState);

  // Serial.print("2: ");
  // Serial.println(potVal);

  // ultrasonic
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  duration = pulseIn(echoPin, HIGH);
  distance = (duration*.0343)/2;
  
  Serial.print("1: ");
  Serial.println(distance);

  
  delay(100);  // small delay to prevent spamming too fast

}
