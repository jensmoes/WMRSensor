# WMRSensor
ZWay Sensors for the WMR 968 Oregon Scientific weather station to work with RazBerry.
This is a ZWay module for the RazBerry ZWay home automation which integrates the Oregon Scientific WMR series weather station data into the ZWay HA.
As input it uses XML data generated using this driver I made: https://github.com/jensmoes/wmr
Drop the folder in to userModules and restart zway. It is found under the Devices group.

It currently supports rain total (reset daily at midnight) and temp/humidity/pressure for indoor and outdoor sensors on the main channels as well as the 3 auxillary channels.
