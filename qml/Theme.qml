pragma Singleton
import QtQuick
QtObject {
    readonly property color a1: "#00e0c6"      // --a1 primary accent
    readonly property color a2: "#ff3da6"      // --a2 secondary accent
    readonly property color bg: "#07070b"
    readonly property color fg: "#ffffff"
    readonly property color muted: "#a0a0b0"
    readonly property color panel: "#0a0a10"
    // size tokens (px at the authored 1920x1080)
    readonly property int xxl: 84
    readonly property int xl: 56
    readonly property int lg: 40
    readonly property int md: 30
    readonly property int sm: 24
    readonly property int pad: 56
    readonly property int radius: 24
}
