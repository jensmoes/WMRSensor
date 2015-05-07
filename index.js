/* global http */

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function WMRSensor (id, controller) {
    // Call superconstructor first (AutomationModule)
    WMRSensor.super_.call(this, id, controller);
}

inherits(WMRSensor, AutomationModule);

_module = WMRSensor;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

WMRSensor.prototype.init = function (config) {
    WMRSensor.super_.prototype.init.call(this, config);

    var self = this,
        icon = "temperature",
        sensorType = this.config.sensorType;
            

    var vDev = self.controller.devices.create({
        deviceId: "WMRSensor" + sensorType + "_" + this.id,
        defaults: {
            metrics: {
                icon: icon,
                title: 'WMR ' + sensorType + this.id
            }
        },
        overlay: {
            deviceType: "sensorMultilevel",
            metrics: { scaleTitle: this.config.scale || "" }
        },
        handler: function (command, args) {

            if (command === "update" ) {
                self.update(this);
            }

        },
        moduleId: this.id
    });
    
    if (vDev && this.config.pollInterval) {
        this.timer = setInterval(function() {
            self.update(vDev);
        }, this.config.pollInterval * 1000);
    }
};

WMRSensor.prototype.stop = function () {
    if (this.timer) {
        clearInterval(this.timer);
    }
    
    this.controller.devices.remove("WMRSensor" + this.config.sensorType + "_" + this.id);
    
    WMRSensor.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

WMRSensor.prototype.update = function (vDev) {
    var self = this,
        url = this.config.source;
        sensor = this.config.sensorType;
    
    if (url) {
        http.request({
            url: url,
            method: 'GET',
            async: true,
            headers: {
                'Content−Type' : 'text/xml'
            },
            success: function(response) {
                var data = null;
                if(sensor === "temperature"){
                    data = parseTemp(response.data);
                }
                if (data !== null) {
                    vDev.set("metrics:level", data);
                }
            },
            error: function(response) {
                console.log("Can not make request: " + response.statusText); // don't add it to notifications, since it will fill all the notifcations on error
            } 
        });
    }
};

function parseTemp(xml) {
//    console.log("WMR: ", xml.toString());
    if(xml === null || xml.isXML ===false) return 0;
//    xml = new ZXmlDocument(data);
//    var sensors = xml.getElementsByTagName("sensor");
    var value = xml.findOne('/station/sensor[@name="thermohygro"]/temperature[@name="temperature"]/text()');
    console.log("WMR: ", value.toString());
//    for(var i =0 ; i<sensors.length ; i++) {
//        var sensor = sensors[i];
//        if(sensor.getAttribute("name") === "thermohygro" && sensor.getAttribute("type") === "outdoor"){
//            var temp = sensor.getElementsByTagName("temperature")[0].firstChild.data;
//            return temp;
//        }
//    }
    return value;
};

