"""
Voice Interaction Engine for Hologram Car Simulation.
Provides non-blocking background Text-To-Speech (pyttsx3) with
Windows COM thread safety and Microphone Voice Command Recognition.
"""

from __future__ import annotations

import queue
import threading
import time
from typing import Optional, Tuple, Callable

import pyttsx3
import speech_recognition as sr

# Windows COM Thread Initialization
try:
    import pythoncom
    HAS_PYTHONCOM = True
except ImportError:
    HAS_PYTHONCOM = False

import config


class VoiceEngine:
    def __init__(
        self,
        enabled: bool = config.TTS_ENABLED,
        rate: int = config.TTS_RATE,
        volume: float = config.TTS_VOLUME,
    ):
        self.enabled = enabled
        self.rate = rate
        self.volume = volume
        self.muted = False

        # State Telemetry
        self.is_speaking = False
        self.is_listening = False
        self.last_spoken_text = ""
        self.last_heard_text = ""
        self.status_message = "Voice Engine Ready"

        # Queue and Threading setup for non-blocking speech
        self.speech_queue: queue.Queue[str] = queue.Queue()
        self.stop_event = threading.Event()
        self.worker_thread = threading.Thread(target=self._tts_worker, daemon=True)
        self.worker_thread.start()

        # Speech Recognition setup
        self.recognizer = sr.Recognizer()
        self.recognizer.energy_threshold = 300
        self.recognizer.dynamic_energy_threshold = True

    def _tts_worker(self) -> None:
        """Dedicated background thread worker executing TTS speech non-blockingly."""
        if HAS_PYTHONCOM:
            try:
                pythoncom.CoInitialize()
            except Exception:
                pass

        engine: Optional[pyttsx3.Engine] = None
        try:
            engine = pyttsx3.init()
            engine.setProperty("rate", self.rate)
            engine.setProperty("volume", self.volume)
        except Exception as e:
            self.status_message = f"TTS Init Warning: {e}"

        while not self.stop_event.is_set():
            try:
                text = self.speech_queue.get(timeout=0.2)
            except queue.Empty:
                continue

            if not self.muted and self.enabled and engine:
                self.is_speaking = True
                self.last_spoken_text = text
                try:
                    engine.say(text)
                    engine.runAndWait()
                except Exception as ex:
                    self.status_message = f"TTS Error: {ex}"
                finally:
                    self.is_speaking = False

            self.speech_queue.task_done()

        if HAS_PYTHONCOM:
            try:
                pythoncom.CoUninitialize()
            except Exception:
                pass

    def speak(self, text: str, priority: bool = True) -> None:
        """Queue text response for voice playback."""
        if not self.enabled or self.muted:
            return

        if priority:
            # Clear pending items so new speech takes precedence
            with self.speech_queue.mutex:
                self.speech_queue.queue.clear()

        self.speech_queue.put(text)

    def toggle_mute(self) -> bool:
        """Toggle audio muting."""
        self.muted = not self.muted
        if self.muted:
            with self.speech_queue.mutex:
                self.speech_queue.queue.clear()
            self.status_message = "Voice Output Muted"
        else:
            self.status_message = "Voice Output Active"
        return self.muted

    def listen_in_background(
        self, callback: Optional[Callable[[Optional[str], str], None]] = None
    ) -> None:
        """Listen to microphone input in a separate thread to detect visitor commands."""
        if self.is_listening:
            return

        def _listen_job() -> None:
            if HAS_PYTHONCOM:
                try:
                    pythoncom.CoInitialize()
                except Exception:
                    pass

            self.is_listening = True
            self.status_message = "Listening for microphone speech command..."

            try:
                with sr.Microphone() as source:
                    self.recognizer.adjust_for_ambient_noise(source, duration=0.4)
                    audio = self.recognizer.listen(
                        source, timeout=config.MIC_TIMEOUT, phrase_time_limit=5.0
                    )

                text = self.recognizer.recognize_google(audio).lower()
                self.last_heard_text = text
                matched_topic = self._match_voice_command(text)

                if matched_topic:
                    self.status_message = f"Heard: '{text}' -> Matched: {matched_topic}"
                    if callback:
                        callback(matched_topic, text)
                else:
                    self.status_message = f"Heard: '{text}' (No topic matched)"
                    if callback:
                        callback(None, text)

            except sr.WaitTimeoutError:
                self.status_message = "Voice input timed out."
            except sr.UnknownValueError:
                self.status_message = "Could not understand audio speech."
            except Exception as e:
                self.status_message = f"Mic Error: {e}"
            finally:
                self.is_listening = False
                if HAS_PYTHONCOM:
                    try:
                        pythoncom.CoUninitialize()
                    except Exception:
                        pass

        threading.Thread(target=_listen_job, daemon=True).start()

    def _match_voice_command(self, phrase: str) -> Optional[str]:
        """Match recognized voice phrase to predefined college topics."""
        phrase = phrase.lower()
        for keyword, topic in config.VOICE_KEYWORDS.items():
            if keyword in phrase:
                return topic
        return None

    def close(self) -> None:
        """Stop background worker thread."""
        self.stop_event.set()
