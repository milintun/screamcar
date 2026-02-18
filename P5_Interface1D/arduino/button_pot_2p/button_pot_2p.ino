#include "Keyboard.h"

// constants
const int buttonPin = 14;   // A0 on many boards
const int potPin = 21;

// variables
int buttonState = 0;
int potVal = 0;


void setup() {
  pinMode(buttonPin, INPUT);
  pinMode(potPin, INPUT);
  Serial.begin(9600);
}

void loop() {
  buttonState = digitalRead(buttonPin);
  potVal = analogRead(potPin);

  Serial.print("1: ");
  Serial.println(buttonState);

  Serial.print("2: ");
  Serial.println(potVal);

  delay(100);  // small delay to prevent spamming too fast
}
