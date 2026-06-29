pragma Singleton
import QtQuick

// Runtime visualizer state shared between the Visualizer screen and the
// "behind lyrics" background (so they show the same mode / beat scaling).
QtObject {
    property string mode: "radial"        // radial | flow | bars
    property real beatMul: 1.0             // BEAT slider multiplier
}
