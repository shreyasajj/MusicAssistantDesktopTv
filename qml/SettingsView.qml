// qml/SettingsView.qml — pre-fills current settings so saving never clobbers an
// existing token. Fields seed from settingsController's readable properties.
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root

    function fieldBg(active) {
        return active ? Qt.rgba(1, 1, 1, 0.1) : Qt.rgba(1, 1, 1, 0.06)
    }

    ColumnLayout {
        anchors.centerIn: parent
        spacing: 24
        width: 900

        Text {
            text: "Settings"
            color: Theme.fg
            font.pixelSize: Theme.xl
            font.weight: Font.ExtraBold
        }

        component Field: TextField {
            Layout.fillWidth: true
            font.pixelSize: Theme.md
            color: Theme.fg
            placeholderTextColor: Qt.rgba(1, 1, 1, 0.32)
            leftPadding: 22
            background: Rectangle {
                radius: 14
                color: parent.activeFocus ? Qt.rgba(1, 1, 1, 0.1) : Qt.rgba(1, 1, 1, 0.06)
                border.color: parent.activeFocus ? Theme.a1 : Qt.rgba(1, 1, 1, 0.12)
                border.width: parent.activeFocus ? 2 : 1
            }
        }

        Field { id: host; placeholderText: "MA host"; text: settingsController.host }
        Field { id: port; placeholderText: "MA port"; text: String(settingsController.port) }
        Field { id: token; placeholderText: "MA token (optional)"; text: settingsController.token; echoMode: TextInput.PasswordEchoOnEdit }
        Field { id: gport; placeholderText: "Guest port"; text: String(settingsController.guestPort) }

        component OptionToggle: RowLayout {
            property alias checked: sw.checked
            property string label: ""
            Layout.topMargin: 4
            Layout.fillWidth: true
            spacing: 16
            Switch { id: sw }
            Text {
                text: parent.label
                color: Theme.fg
                font.pixelSize: Theme.sm
                Layout.fillWidth: true
                wrapMode: Text.WordWrap
            }
        }

        OptionToggle { id: lrclibSwitch; checked: settingsController.lrclibFallback
            label: "Fetch lyrics from LRCLIB when Music Assistant has none" }
        OptionToggle { id: compactSwitch; checked: settingsController.compactLyrics
            label: "Compact lyrics — show only the previous, current and next two lines" }
        OptionToggle { id: artPumpSwitch; checked: settingsController.artPump
            label: "Pump the Now Playing artwork with the song's bass" }
        OptionToggle { id: behindSwitch; checked: settingsController.vizBehindLyrics
            label: "Show the visualizer behind the lyrics" }

        Button {
            id: saveBtn
            text: "Save"
            font.pixelSize: Theme.md
            Layout.topMargin: 8
            contentItem: Text {
                text: saveBtn.text
                color: "#06121a"
                font.pixelSize: Theme.md
                font.weight: Font.Bold
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            background: Rectangle {
                implicitWidth: 220
                implicitHeight: 64
                radius: 40
                gradient: Gradient {
                    orientation: Gradient.Horizontal
                    GradientStop { position: 0; color: Theme.a1 }
                    GradientStop { position: 1; color: Theme.a2 }
                }
            }
            onClicked: settingsController.save(host.text, parseInt(port.text) || 0,
                                               token.text, parseInt(gport.text) || 0,
                                               lrclibSwitch.checked, compactSwitch.checked,
                                               artPumpSwitch.checked, behindSwitch.checked)
        }
    }
}
