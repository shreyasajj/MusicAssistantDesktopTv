// qml/GuestOverlay.qml — corner QR card matching .qr-card in styles.css (white card, dark text)
import QtQuick
import QtQuick.Layouts

Rectangle {
    visible: guestController.enabled
    width: 212
    height: overlayCol.implicitHeight + 36
    radius: 20
    color: "#ffffff"

    ColumnLayout {
        id: overlayCol
        anchors.centerIn: parent
        spacing: 13
        width: parent.width - 36

        Image {
            Layout.alignment: Qt.AlignHCenter
            Layout.preferredWidth: 176
            Layout.preferredHeight: 176
            source: guestController.qrUri
            fillMode: Image.PreserveAspectFit
        }
        Text {
            text: "Scan to add songs"
            color: "#14141a"
            font.pixelSize: 21
            font.bold: true
            Layout.alignment: Qt.AlignHCenter
            horizontalAlignment: Text.AlignHCenter
            wrapMode: Text.WordWrap
            Layout.fillWidth: true
        }
        Text {
            text: guestController.joinUrl
            color: "#0a8f80"
            font.pixelSize: 16
            Layout.alignment: Qt.AlignHCenter
            horizontalAlignment: Text.AlignHCenter
            wrapMode: Text.WordWrap
            Layout.fillWidth: true
        }
    }
}
