import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    ColumnLayout {
        anchors.centerIn: parent; spacing: 24; width: 900
        Text { text: "Settings"; color: Theme.fg; font.pixelSize: Theme.xl; font.bold: true }
        TextField { id: host; placeholderText: "MA host"; text: "localhost"; font.pixelSize: Theme.md; Layout.fillWidth: true }
        TextField { id: port; placeholderText: "MA port"; text: "8095"; font.pixelSize: Theme.md; Layout.fillWidth: true }
        TextField { id: token; placeholderText: "MA token (optional)"; font.pixelSize: Theme.md; Layout.fillWidth: true }
        TextField { id: gport; placeholderText: "Guest port"; text: "8950"; font.pixelSize: Theme.md; Layout.fillWidth: true }
        Button {
            text: "Save"; font.pixelSize: Theme.md
            onClicked: settingsController.save(host.text, parseInt(port.text), token.text, parseInt(gport.text))
        }
    }
}
