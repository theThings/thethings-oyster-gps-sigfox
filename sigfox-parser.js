// Oyster Sigfox Battery Powered GPS Tracker
// Documentation
// https://www.digitalmatter.com/DigitalMatter/media/documents/Devices/Sigfox/Oyster-Sigfox-Brochure-A4.pdf
// https://support.digitalmatter.com/support/solutions/articles/16000061215-decoding-the-oyster-sigfox-payload-examples
// https://support.digitalmatter.com/support/solutions/articles/16000062989-decoding-the-oyster-sigfox-payload-javascript-example-code


function main(params,callback){
    var buffer = hex2Bytes(params.data);

    if (!buffer) {
        return null;
    }

    var recordType = buffer[0] & 0x0f;

    switch (recordType) {
        case 0: //positional data
            parsePositionalData(buffer,callback);

        //case 1: //downlink ACK
        //    return parseDownlinkAck(buffer);

        case 2: //device data
            parseDeviceStats(buffer,callback);

        default:
            var result = [
                {  
                    "key": "MessageType",
                    "value": 'others'
                }
            ]
            return callback(null, result) 
    }
}


function hex2Bytes(val) {

    if (!val) {
        return [];
    }
    
    val = val.trim();
    if (val.startsWith('0x')) { 
        val = val.substring(2); //get rid of starting '0x'
    }


    var numBytes = val.length / 2;
    var bytes = [];


    for (var i = 0; i < numBytes; i++) {
        bytes.push(parseInt(val.substring(i*2, (i*2) + 2), 16));
    }

    return bytes;
}

function parseLittleEndianInt32(buffer, offset) {
    return (buffer[offset + 3] << 24) +
        (buffer[offset + 2] << 16) +
        (buffer[offset + 1] << 8) +
        (buffer[offset]);
}

function parseLittleEndianInt16(buffer, offset) {
    return (buffer[offset + 1] << 8) +
        (buffer[offset]);
}

function parseLittleEndianInt16Bits(buffer, offset, bitOffset, bitLength) {
    var temp = parseLittleEndianInt16(buffer, offset);
    temp = temp >> bitOffset;
    var mask = 0xffff >> (16 - bitLength);
    return temp & mask;
}

function parsePositionalData(buffer,callback) {
    var flags = buffer[0] & 0xF0;
    var inTrip = (flags & 0x10) > 0;
    var lastFixFailed = (flags & 0x20) > 0;

    var latitudeRaw = parseLittleEndianInt32(buffer, 1)*1e-7;
    var longitudeRaw = parseLittleEndianInt32(buffer, 5)*1e-7;
    var headingRaw = buffer[9]*2;
    var speedRaw = buffer[10];
    var batteryRaw = (buffer[11] * 25) / 1000.0;
  
  	let minBatteryLevel = 3.3; // In Alkaline batteries // in Lithium 4.5v
  	let maxBatteryLevel = 4.4
    let percentage = batteryRaw > maxBatteryLevel ? 100 : (((batteryRaw-minBatteryLevel)/(maxBatteryLevel-minBatteryLevel))*100).toFixed(0)
    percentage = percentage < 0 ? 0 : percentage;

    var result = [
        {  
            "key": "MessageType",
            "value": 0
        },
        {  
            "key": "InTrip",
            "value": inTrip
        },
        {  
            "key": "lastFixFailed",
            "value": lastFixFailed
        },
        {
            'key': 'geolocation',
            'value': 1,
            'geo': {'lat': latitudeRaw, 'long': longitudeRaw }
        },
        {
            'key': '$geo',
            'value': [longitudeRaw, latitudeRaw]
        },
        {  
            "key": "Heading",
            "value": headingRaw 
        },
        {  
            "key": "SpeedKmH",
            "value": speedRaw
        },
        {  
            "key": "BatteryVoltage",
            "value": batteryRaw 
        },
        {  
            "key": "BatteryPercentage",
            "value": percentage 
        }
    ]
    return callback(null, result) 
}

// function parseDownlinkAck(buffer) {
//     var flags = buffer[0] & 0xF0;
//     var downlinkAccepted = (flags & 0x10) > 0;

//     var firmwareMajor = buffer[2];
//     var firmwareMinor = buffer[3];

//     var data = [];
//     for (var i = 0; i < 8; i++) {
//         data.push(i + 4);
//     }

//     return {
//         MessageType: 1,
//         DownlinkAccepted: downlinkAccepted,
//         FirmwareVersion: firmwareMajor + '.' + firmwareMinor,
//         DownlinkData: data
//     };
// }

function parseDeviceStats(buffer,callback) {
    var uptimeWeeks = parseLittleEndianInt16Bits(buffer, 0, 4, 9/*bits*/);
    var txCountRaw = parseLittleEndianInt16Bits(buffer, 1, 5, 11 /*bits*/) * 32;
    var rxCountRaw = buffer[3] * 32;
    var tripCountRaw = parseLittleEndianInt16Bits(buffer, 4, 0, 13 /*bits*/);
    var gpsSuccessRaw = parseLittleEndianInt16Bits(buffer, 5, 5, 10 /*bits*/) * 32;
    var gpsFailuresRaw = parseLittleEndianInt16Bits(buffer, 6, 7, 8 /*bits*/) * 32;
    var averageFixTime = parseLittleEndianInt16Bits(buffer, 7, 7, 9/*bits*/);
    var averageFailTime = parseLittleEndianInt16Bits(buffer, 9, 0, 9/*bits*/);
    var averageFreshenTime = parseLittleEndianInt16Bits(buffer, 10, 1, 8/*bits*/);
    var wakeupsPerTrip = buffer[11] >> 1;

    var result = [
        {  
            "key": "MessageType",
            "value": 2
        },
        {  
            "key": "UptimeWeeks",
            "value": uptimeWeeks
        },
        {  
            "key": "TxCount",
            "value": txCountRaw
        },
        {  
            "key": "RxCount",
            "value": rxCountRaw
        },
        {  
            "key": "TripCount",
            "value": tripCountRaw 
        },
        {  
            "key": "GpsSuccessCount",
            "value": gpsSuccessRaw 
        },
        {  
            "key": "GpsFailureCount",
            "value": gpsFailuresRaw
        },
        {  
            "key": "AverageFixTimeSeconds",
            "value": averageFixTime 
        },
        {  
            "key": "AverageFailTimeSeconds",
            "value": averageFailTime 
        },
        {  
            "key": "AverageFreshenTimeSeconds",
            "value": averageFreshenTime 
        },
        {  
            "key": "WakeUpsPerTrip",
            "value": wakeupsPerTrip
        }
    ]
    return callback(null, result);
}
