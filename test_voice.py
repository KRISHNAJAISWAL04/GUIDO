"""
Standalone Voice Interaction Engine Testing Utility.
Run this script to test Text-To-Speech (TTS) audio answers and
Microphone Speech Recognition in isolation.

Options:
  1. Test Speech Synthesis (TTS)
  2. Test Microphone Voice Input
  3. Toggle Mute
  4. Exit Sandbox
"""

from __future__ import annotations

import sys
import time

from voice_engine import VoiceEngine
import config


def main() -> None:
    print("=" * 60)
    print(" VOICE ENGINE INTERACTION TEST SANDBOX")
    print("=" * 60)

    voice = VoiceEngine()

    sample_phrases = [
        "Welcome to RBMI Group of Institutions.",
        "OpenCV object detection is currently online.",
        "Please choose a topic or speak into your microphone.",
    ]

    while True:
        print("\n--- MENU ---")
        print("1. Speak Sample Phrases (TTS)")
        print("2. Speak Custom Text (TTS)")
        print("3. Test Microphone Speech Input")
        print("4. Toggle Mute")
        print("5. Exit Sandbox")

        try:
            choice = input("Select an option (1-5): ").strip()
        except EOFError:
            break

        if choice == "1":
            print("[TEST] Speaking sample phrases...")
            for text in sample_phrases:
                print(f"  -> {text}")
                voice.speak(text)
                time.sleep(1.5)

        elif choice == "2":
            text = input("Enter text to speak: ").strip()
            if text:
                print(f"[TEST] Queuing: '{text}'")
                voice.speak(text)

        elif choice == "3":
            print("[TEST] Microphone test starting... Speak now!")

            def on_match(topic: str | None, phrase: str):
                print(f"\n[MIC RESULT] Heard: '{phrase}'")
                if topic:
                    print(f"[MIC RESULT] Matched Topic: {topic}")
                    resp = config.TOPICS.get(topic, "Topic information ready.")
                    voice.speak(f"You asked about {topic}. {resp}")
                else:
                    print("[MIC RESULT] No matching topic keyword found.")
                    voice.speak(f"I heard you say: {phrase}")

            voice.listen_in_background(callback=on_match)

            # Wait briefly for mic thread
            while voice.is_listening:
                time.sleep(0.2)

        elif choice == "4":
            muted = voice.toggle_mute()
            print(f"[TEST] Audio Muted: {muted}")

        elif choice == "5":
            break

    voice.close()
    print("[TEST] Voice Sandbox Closed.")


if __name__ == "__main__":
    main()
