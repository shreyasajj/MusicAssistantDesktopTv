from __future__ import annotations
import sys
from pathlib import Path
from PySide6.QtGui import QGuiApplication
from PySide6.QtQml import QQmlApplicationEngine
from PySide6.QtCore import QObject, Signal, Property, Slot
from .config import load_settings, default_config_path
from .ma_client import MaClient
from .audio_analysis import AudioAnalyzer
from .guest_server import GuestServer

QML_DIR = Path(__file__).resolve().parent.parent.parent / "qml"


class GuestController(QObject):
    enabledChanged = Signal()

    def __init__(self, ma, settings):
        super().__init__()
        self._ma = ma
        self._settings = settings
        self._enabled = False
        self._url = ""
        self._qr = ""
        self._server = None

    @Slot()
    def toggle(self):
        # Live start/stop is driven from the asyncio loop in Task 14; here we flip state.
        self._enabled = not self._enabled
        self.enabledChanged.emit()

    enabled = Property(bool, lambda s: s._enabled, notify=enabledChanged)
    joinUrl = Property(str, lambda s: s._url, notify=enabledChanged)
    qrUri = Property(str, lambda s: s._qr, notify=enabledChanged)


def main() -> int:
    app = QGuiApplication(sys.argv)
    engine = QQmlApplicationEngine()
    engine.addImportPath(str(QML_DIR))

    settings = load_settings(default_config_path())
    ma = MaClient(settings)
    analyzer = AudioAnalyzer()
    guest = GuestController(ma, settings)

    engine.rootContext().setContextProperty("maClient", ma)
    engine.rootContext().setContextProperty("audioAnalyzer", analyzer)
    engine.rootContext().setContextProperty("guestController", guest)

    engine.load(QML_DIR / "main.qml")
    if not engine.rootObjects():
        return 1
    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())
