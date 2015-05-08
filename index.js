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
WMRSensor.vDevId;
WMRSensor.vDevBattId;
// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

WMRSensor.prototype.init = function (config) {
    WMRSensor.super_.prototype.init.call(this, config);

    var self = this,
        icon = "flood",
        sensorType = this.config.sensorType,
        battery =  "_",
        titleText = sensorType  + " " + this.id,
        scaleText = this.config.scale;

        if(this.config.battery){
            icon = "battery";
            titleText = "Battery " + this.id;
        }else if(sensorType === "Temperature"){
            icon = "temperature";
        }else if(sensorType === "Rain"){
            icon = "flood";
            if(scaleText === null) this.config.scale = "mm";
        }else if(sensorType === "Humidity"){
            icon = "humidity";
            if(scaleText === null) this.config.scale = "%";
        }else if(sensorType === "Pressure"){
            icon = "meter";
            if(scaleText === null) this.config.scale = "hPa";
        }
    var vDev = self.controller.devices.create({
        deviceId: "WMRSensor" + "_" + this.config.sensorType + "_" + this.id,
        defaults: {
            metrics: {
                icon: icon,
                title: titleText,
                probeTitle: this.config.sensorType
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
    if(this.config.battery){
        var vDevBatt = self.controller.devices.create({
            deviceId: "WMRSensor" + "_" + this.config.sensorType + "_battery_" + this.id,
            defaults: {
                metrics: {
                    icon: icon,
                    title: titleText,
                    probeTitle: "Battery"
                }
            },
            overlay: {
                deviceType: "battery",
                metrics: { scaleTitle: "" }
            },
            handler: function (command, args) {

                if (command === "update" ) {
                    self.update(this);
                }

            },
            moduleId: this.id
        }); 

    }
    if (vDev && this.config.pollInterval) {
        this.timer = setInterval(function() {
            self.update(vDev);
            if(vDevBatt)
                self.update(vDevBatt);
        }, this.config.pollInterval * 1000);
    }
    
    if(vDev){
        this.vDevId = vDev.id//For removing
        this.update(vDev);//First read
    }
    if(vDevBatt){
        this.vDevBattId = vDevBatt.id//For removing
        this.update(vDevBatt);//First read
    }
    // set up cron handler
    this.runMidnight = function() {
        if (vDev) {
            console.log("WMR: Midnight run on", vDev.id.toString(), Number(self.config.midnightRainLevel));
            setTotalRain(self);
        }
    };

    if(this.config.sensorType === "Rain"){
        this.controller.on("midNight.reset."+self.id, this.runMidnight);
        this.controller.emit("cron.addTask", "midNight.reset."+self.id, {
            minute: 0,
            hour: 0,
            weekDay: null,
            day: null,
            month: null
        });
        
    }

};

WMRSensor.prototype.stop = function () {
    if (this.timer) {
        clearInterval(this.timer);
    }
    
    this.controller.devices.remove(this.vDevId);
    if(this.vDevBattId)
        this.controller.devices.remove(this.vDevBattId);
    
    if(this.config.sensorType === "Rain"){
        this.controller.emit("cron.removeTask", "midNight.reset."+this.id);
        this.controller.off("midNight.reset."+this.id, this.runMidnight);
    }
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
                var batt = self.vDevBattId === vDev.id;
                data = parseValue(response.data, self, batt);
                if(!batt && sensor === "Rain"){
                    data -= self.config.midnightRainLevel;
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

function parseValue(xml, self, batt) {
//    console.log("WMR: ", xml.toString());
    if(xml === null || xml.isXML ===false) return 0;
//    xml = new ZXmlDocument(data);
//    var sensors = xml.getElementsByTagName("sensor");
    var parseExp;
    var sens = self.config.sensorType;
//    console.log("WMR: Sensor is ", sens);
    if(sens === "Temperature"){
        var sensorName = "thermohygro";
        if(self.config.channel === "indoor")
            sensorName = "barothermohygro";
        if(batt)
            parseExp = '/station/sensor[@name="' + sensorName + '" and @type="' + self.config.channel + '"]/battery/text()';
        else
            parseExp = '/station/sensor[@name="' + sensorName + '" and @type="' + self.config.channel + '"]/temperature[@name="temperature"]/text()';
    }else if(sens === "Rain"){
        var sensorName = "rain";
        if(batt)
            parseExp = '/station/sensor[@name="' + sensorName + '"]/battery/text()';
        else {
            parseExp = '/station/sensor[@name="' + sensorName + '"]/rain[@name="total"]/text()';
        }
    }else if(sens === "Humidity"){
        var sensorName = "thermohygro";
        if(self.config.channel === "indoor")
            sensorName = "barothermohygro";
        if(batt)
            parseExp = '/station/sensor[@name="' + sensorName + '" and @type="' + self.config.channel + '"]/battery/text()';
        else
            parseExp = '/station/sensor[@name="' + sensorName + '" and @type="' + self.config.channel + '"]/humidity/text()';
    }else if(sens === "Pressure"){
        var sensorName = "barothermohygro";
        if(batt)
            parseExp = '/station/sensor[@name="' + sensorName + '" and @type="' + self.config.channel + '"]/battery/text()';
        else
            parseExp = '/station/sensor[@name="' + sensorName + '" and @type="' + self.config.channel + '"]/pressure[@name="sealevel"]/text()';
    }
//    console.log("WMR: Parsing ", parseExp.toString());
    var value = xml.findOne(parseExp);
//    console.log("WMR: ", value.toString());
//    for(var i =0 ; i<sensors.length ; i++) {
//        var sensor = sensors[i];
//        if(sensor.getAttribute("name") === "thermohygro" && sensor.getAttribute("type") === "outdoor"){
//            var temp = sensor.getElementsByTagName("temperature")[0].firstChild.data;
//            return temp;
//        }
//    }
    return value;
};

function setTotalRain(self){
    
    var url = self.config.source;

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
                var parseExp = '/station/sensor[@name="rain"]/rain[@name="total"]/text()';
                data = response.data.findOne(parseExp);
                if (data !== null) {
                    console.log("WMR: Saving total rain", data, Number(self.config.midnightRainLevel));
                    self.config.midnightRainLevel = data;
                }
            },
            error: function(response) {
                console.log("Can not make request: " + response.statusText); // don't add it to notifications, since it will fill all the notifcations on error
            } 
        });
    }
    
};
