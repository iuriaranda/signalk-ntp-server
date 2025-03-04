# SignalK NTP Server

Starts an NTP server that serves the current time based on the SignalK datetime value at the specified path. If the data in the specified SignalK path is considered stale, the current server time is provided instead.

This plugin will start a server that listens on port 123 UDP, which is the default NTP port. The port number is configurable via the plugin settings. Note that 123 is a privileged port in Linux systems, so you will need to grant the binary running SignalK special permissions to listen on it. Otherwise you can configure the plugin to listen on a non-privileged port (> 1023).
