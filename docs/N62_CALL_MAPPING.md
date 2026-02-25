# N62 Device Data Call Mapping (JT808 + ULV)

This document lists the **data-only** calls for the N62 device, plus how to test each one with `curl`.
It focuses on **reading/receiving data** and avoids any **device updates**.

Sources:
- `docs/JT808.md`
- `docs/JT808-protocol.pdf`
- `docs/ULV network protocol_V2.0.0-2019-20240924.pdf`

## Scope
- Device: N62 (JT/T 808)
- Transport: TCP on `JT808_LISTEN_PORT` (default `6608`)
- API for commands: `POST /api/units/:serial/command`
- Dashboard resolver key: `mvr_devices.protocol = jt808`
- Serial format: `JT808_<terminalPhoneDigits>`
  - Example: `JT808_100000000327`

## Auth headers (all API calls)
Use either of these:
- `Authorization: Bearer <API_KEY>`
- `X-API-Key: <API_KEY>`

## Data flows (device → platform)
These are **push messages** from the device. They do not have `curl` commands.

- **`0x0100` Terminal registration**
  - Platform responds with `0x8100` and `0x8001` (compat ACK).
- **`0x0102` Terminal authentication**
  - Platform responds with `0x8001`.
- **`0x0002` Heartbeat**
  - Platform responds with `0x8001`.
- **`0x0200` Location report**
  - Parsed + forwarded to `/webhooks/device-messages`.
  - Includes standard fields + a subset of common additional info TLVs.
- **`0x0704` Batch location report**
  - May be retried if the terminal expects an ACK.
- **`0x0001` Terminal general response**
  - Logged only, no response required.

## Data calls (platform → device)
These are **explicit requests** you can run with `curl` to retrieve data.
All of these return the device data directly in the HTTP response.

### 1) Terminal attributes (JT808)
- **Request**: `0x8107` query terminal attributes
- **Response**: `0x0107` terminal attributes
- **API type**: `request_environment`

```bash
curl -X POST http://localhost:9000/api/units/JT808_100000000327/command \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "type": "request_environment" }'
```

### 2) ULV configuration (Get only)
- **Request**: `0xB050` with `CmdType = "Get"`
- **Response**: `0xB051` parameter response (JSON payload)
- **API type**: `request_config`

Example (request a single parameter group):
```bash
curl -X POST http://localhost:9000/api/units/JT808_100000000327/command \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "request_config",
    "payload": { "paramType": "VehBaseInfo" }
  }'
```

Full ParamType list (ULV spec Table 3.17.4):
- `GenDevInfo` - MDVR basic information
- `GenDateTime` - system time
- `GenDst` - daylight saving time
- `GenStartUp` - power configuration parameters
- `GenUser` - administrator account/password
- `VehBaseInfo` - vehicle and driver information
- `VehPosition` - GPS information parameters
- `VehMileage` - vehicle mileage
- `RecAttr` - recording attribute parameters
- `RecStream_M` - main code stream parameters
- `RecStream_S` - sub-code stream parameters
- `ReCamAttr` - camera attribute parameters
- `ReCapAttr` - image capture interval
- `AlmIoIn` - IO alarm input parameters
- `AlmSpd` - speed limit information parameters
- `AlmGsn` - G-sensor alarm parameters
- `Driving` - fatigue driving parameters
- `NetWired` - wired network parameters
- `NetWifi` - WiFi parameters
- `NetXg` - 4G parameters
- `NetCms` - CMS parameters
- `NetFtp` - FTP parameters
- `PerUart` - serial port parameters
- `PerIoOutput` - IO output parameters

Curl examples (Get-only, one per ParamType):

Single ParamType:
```bash
curl -X POST http://185.202.223.35:9000/api/units/JT808_100000000327/command \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "type":"request_config", "payload": { "paramType":"VehBaseInfo" } }'
```

Batch all ParamTypes:
```bash
BASE_URL="http://185.202.223.35:9000"
SERIAL="JT808_100000000327"
API_KEY="YOUR_API_KEY"
PARAM_TYPES="GenDevInfo GenDateTime GenDst GenStartUp GenUser VehBaseInfo VehPosition VehMileage RecAttr RecStream_M RecStream_S ReCamAttr ReCapAttr AlmIoIn AlmSpd AlmGsn Driving NetWired NetWifi NetXg NetCms NetFtp PerUart PerIoOutput"

for PARAM in $PARAM_TYPES; do
  echo "--- request_config ParamType=$PARAM ---"
  curl -s -X POST "$BASE_URL/api/units/$SERIAL/command" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"request_config\",\"payload\":{\"paramType\":\"$PARAM\"}}"
  echo
  echo
done
```

Captured payloads (2026-02-09, device `JT808_100000000327`):
Note: passwords are redacted for safety.

`GenDevInfo`
```json
{
  "AiStatus": "OFF",
  "AlgVer": "N6_T2025091799",
  "ChipId": "e3ce16900012a898",
  "DevId": "100000000327",
  "DevName": "Dashcam",
  "McuVer": "N9x_M25021201_P25021203",
  "ParamType": "GenDevInfo",
  "ResVer": "N6_Normal_T2025011499",
  "SoftVer": "N6_T2025091999"
}
```

`GenDateTime`
```json
{
  "DateFormat": 1,
  "DateTime": "2026/02/09 10:19:28",
  "GpsSync": 1,
  "NtpSync": "1,1",
  "ParamType": "GenDateTime",
  "TimeFormat": 0,
  "Zone": "14,0"
}
```

`GenDst`
```json
{
  "Enable": 0,
  "EndTime": "10,0,0,02:00:00",
  "Mode": 1,
  "OffsetTime": 0,
  "ParamType": "GenDst",
  "StartTime": "2,1,0,02:00:00"
}
```

`GenStartUp`
```json
{
  "DelayTime": 10,
  "Mode": 2,
  "ParamType": "GenStartUp",
  "PwrProtect12": "1,90",
  "PwrProtect24": "1,220",
  "RebootTime": "1,02:00:00",
  "RunTime": "06:00:00,23:00:00",
  "WakeUpInteval": 15
}
```

`GenUser`
```json
{
  "ChnNum": 2,
  "Enable": 1,
  "ParamType": "GenUser",
  "User_00": {
    "Name": "Admin",
    "Password": "<redacted>"
  },
  "User_01": {
    "Name": "Guest",
    "Password": "<redacted>"
  }
}
```

`VehBaseInfo`
```json
{
  "AssemblyDate": "2023/05/26",
  "CarPlate": "",
  "Company": "",
  "DriverLic": "",
  "DriverName": "No Login",
  "ParamType": "VehBaseInfo",
  "PhoneNum": "",
  "ShortName": 0
}
```

`VehPosition`
```json
{
  "GpsBatchNum": 1,
  "GpsMode": 3,
  "GpsUpInterval": 30,
  "ParamType": "VehPosition",
  "SpdCorrV": 6,
  "SpdFilter": 5
}
```

`VehMileage`
```json
{
  "BaseV": 0,
  "ParamType": "VehMileage"
}
```

`RecAttr`
```json
{
  "Duration": 10,
  "Encrypt": "0,0",
  "FileFormat": 0,
  "Mode": 0,
  "ParamType": "RecAttr",
  "PreDuration": 5,
  "SaveDays": 7,
  "StreamType": 0,
  "VencFormat": 0
}
```

`RecStream_M`
```json
{
  "ChnNum": 4,
  "Chn_00": {
    "AudioEn": 1,
    "Enable": 0,
    "FrmRate": 15,
    "Qp": 1,
    "Res": 5
  },
  "Chn_01": {
    "AudioEn": 1,
    "Enable": 0,
    "FrmRate": 15,
    "Qp": 1,
    "Res": 3
  },
  "Chn_02": {
    "AudioEn": 1,
    "Enable": 0,
    "FrmRate": 15,
    "Qp": 1,
    "Res": 3
  },
  "Chn_03": {
    "AudioEn": 1,
    "Enable": 0,
    "FrmRate": 15,
    "Qp": 1,
    "Res": 3
  },
  "ParamType": "RecStream_M"
}
```

`RecStream_S`
```json
{
  "ChnNum": 4,
  "Chn_00": {
    "AudioEn": 1,
    "Enable": 0,
    "FrmRate": 15,
    "Qp": 1,
    "Res": 1
  },
  "Chn_01": {
    "AudioEn": 1,
    "Enable": 0,
    "FrmRate": 15,
    "Qp": 1,
    "Res": 1
  },
  "Chn_02": {
    "AudioEn": 1,
    "Enable": 0,
    "FrmRate": 15,
    "Qp": 1,
    "Res": 1
  },
  "Chn_03": {
    "AudioEn": 1,
    "Enable": 0,
    "FrmRate": 15,
    "Qp": 1,
    "Res": 1
  },
  "ParamType": "RecStream_S"
}
```

`ReCamAttr`
```json
{
  "ChnNum": 4,
  "Chn_00": {
    "Direction": 0,
    "Enable": 1,
    "FrmRate": 0,
    "Mode": 0,
    "Res": 5,
    "Type": 4
  },
  "Chn_01": {
    "Direction": 0,
    "Enable": 1,
    "FrmRate": 0,
    "Mode": 0,
    "Res": 3,
    "Type": 0
  },
  "Chn_02": {
    "Direction": 0,
    "Enable": 1,
    "FrmRate": 0,
    "Mode": 0,
    "Res": 3,
    "Type": 0
  },
  "Chn_03": {
    "Direction": 0,
    "Enable": 1,
    "FrmRate": 0,
    "Mode": 0,
    "Res": 3,
    "Type": 0
  },
  "ParamType": "ReCamAttr"
}
```

`ReCapAttr`
```json
{
  "CapRes": 0,
  "ChnMask": 65519,
  "ChnNum": 4,
  "Enable": 0,
  "Inteval": 300,
  "Inteval_P": 300,
  "ParamType": "ReCapAttr",
  "SaveDays": 30
}
```

`AlmIoIn`
```json
{
  "ChnNum": 1028,
  "Chn_00": {
    "En": 0,
    "LnkParam": "1,15|0,0|0,0,0|0,0,0|0,0|0,0|",
    "Thr": 0,
    "Type": 2
  },
  "Chn_01": {
    "En": 0,
    "LnkParam": "0,15|0,0|0,0,0|0,0,0|0,0|0,0|",
    "Thr": 0,
    "Type": 0
  },
  "Chn_02": {
    "En": 0,
    "LnkParam": "0,15|0,0|0,0,0|0,0,0|0,0|0,0|",
    "Thr": 0,
    "Type": 0
  },
  "Chn_03": {
    "En": 0,
    "LnkParam": "0,15|0,0|0,0,0|0,0,0|0,0|0,0|",
    "Thr": 0,
    "Type": 0
  },
  "ParamType": "AlmIoIn"
}
```

`AlmSpd`
```json
{
  "ChnNum": 4,
  "MaxSpd": {
    "Duration": 3,
    "En": false,
    "LnkParam": "0,15|0,0|0,0,0|0,0,0|0,0|1,10|",
    "Thr": 120
  },
  "MinSpd": {
    "Duration": 3,
    "En": false,
    "LnkParam": "0,15|0,0|0,0,0|0,0,0|0,0|0,0|",
    "Thr": 30
  },
  "ParamType": "AlmSpd",
  "Parking": {
    "Duration": 0,
    "En": false,
    "LnkParam": "0,15|0,0|0,0,0|0,0,0|0,0|0,0|",
    "Thr": 30
  }
}
```

`AlmGsn`
```json
{
  "ChnNum": 4,
  "Collision": {
    "En": false,
    "LnkParam": "0,0|0,0|0,0,0|0,0,0|0,0|1,0|",
    "Thr": 60
  },
  "Incline": {
    "En": false,
    "LnkParam": "0,0|0,0|0,0,0|0,0,0|0,0|1,0|",
    "Thr": 30
  },
  "Install": 3,
  "Mode": 0,
  "ParamType": "AlmGsn",
  "SlwDown": {
    "En": false,
    "LnkParam": "0,0|0,0|0,0,0|0,0,0|0,0|1,0|",
    "Thr": 20
  },
  "SpdUp": {
    "En": false,
    "LnkParam": "0,0|0,0|0,0,0|0,0,0|0,0|1,0|",
    "Thr": 20
  },
  "Turn": {
    "En": false,
    "LnkParam": "0,0|0,0|0,0,0|0,0,0|0,0|1,0|",
    "Thr": 20
  }
}
```

`Driving`
```json
{
  "ChnNum": 4,
  "MinRest": 15,
  "ParamType": "Driving",
  "PreTimeOut": {
    "En": 0,
    "LnkParam": "0,15|0,0|0,0,0|0,0,0|0,0|1,60|",
    "Thr": 585
  },
  "PreTired": {
    "En": 0,
    "LnkParam": "0,15|0,0|0,0,0|0,0,0|0,0|1,10|",
    "Thr": 225
  },
  "TimeOut": {
    "En": 0,
    "LnkParam": "0,15|0,0|0,0,0|0,0,0|0,0|1,60|",
    "Thr": 600
  },
  "Tired": {
    "En": 0,
    "LnkParam": "0,15|0,0|0,0,0|0,0,0|0,0|1,60|",
    "Thr": 240
  }
}
```

`NetWired`
```json
{
  "DNS1": "114.114.114.114",
  "DNS2": "",
  "DhcpEn": 0,
  "Enable": 0,
  "Gateway": "192.168.000.001",
  "IP": "192.168.000.108",
  "ParamType": "NetWired",
  "SubMask": "255.255.255.000"
}
```

`NetWifi`
```json
{
  "DhcpEn": 1,
  "Enable": 1,
  "EncryptType": 2,
  "Mode": 2,
  "ParamType": "NetWifi",
  "Pwd": "<redacted>",
  "SSID": "N6_Dashcam_3.0_194538"
}
```

`NetXg`
```json
{
  "APN": "internet ",
  "AbRestartEn": 0,
  "AuthType": 0,
  "CenterNum": "*99#",
  "Enable": 1,
  "Mode": 0,
  "ParamType": "NetXg",
  "Pwd": "",
  "RedialInter": 10,
  "User": ""
}
```

`NetCms`
```json
{
  "ChnNum": 2,
  "ParamType": "NetCms",
  "Server_00": {
    "Enable": 1,
    "Protocol": 3,
    "ServersAddr": "185.202.223.35:6608",
    "VisitType": 0
  },
  "Server_01": {
    "Enable": 1,
    "Protocol": 2,
    "ServersAddr": "156.38.206.106:6608",
    "VisitType": 0
  }
}
```

`NetFtp`
```json
{
  "Enable": 0,
  "ParamType": "NetFtp",
  "Pwd": "<redacted>",
  "ServersAddr": "120.79.58.1:2121",
  "User": "admin",
  "VisitType": 0
}
```

`PerUart`
```json
{
  "ParamType": "PerUart",
  "Uart_00": {
    "BaudRate": 3,
    "DataBit": 0,
    "DevType": 0,
    "Enable": 0,
    "IntfType": 0,
    "StopBit": 0,
    "Verify": 0
  },
  "Uart_01": {
    "BaudRate": 3,
    "DataBit": 0,
    "DevType": 0,
    "Enable": 0,
    "IntfType": 1,
    "StopBit": 0,
    "Verify": 0
  },
  "Uart_02": {
    "BaudRate": 3,
    "DataBit": 0,
    "DevType": 0,
    "Enable": 0,
    "IntfType": 2,
    "StopBit": 0,
    "Verify": 0
  },
  "Uart_03": {
    "BaudRate": 3,
    "DataBit": 0,
    "DevType": 0,
    "Enable": 0,
    "IntfType": 3,
    "StopBit": 0,
    "Verify": 0
  }
}
```

`PerIoOutput`
```json
{
  "IoOut_1": 0,
  "ParamType": "PerIoOutput"
}
```

### 3) Vehicle info (JT808 + ULV)
- **Request**: `0xB040` vehicle info query
- **Response**: `0x4040` vehicle info response
- **API type**: `request_vehicle_info`

```bash
curl -X POST http://localhost:9000/api/units/JT808_100000000327/command \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "type": "request_vehicle_info" }'
```

### 4) SD card health (JT808-only endpoint path)
- **Transport source**: JT808 `0x0900` transparent uplink (`ULV`), parsed from Disk Status (ULV Table 3.10.19).
- **Request model**: push + cache. The endpoint returns the latest cached snapshot from telemetry.
- **API endpoint**: `GET /api/units/:serial/sd-health`
- **Notes**:
  - If no transparent telemetry has been received yet, endpoint returns `503`.
  - Response includes `stale` and `age_ms`.

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:9000/api/units/JT808_100000000327/sd-health
```

Example response shape:
```json
{
  "ok": true,
  "serial": "JT808_100000000327",
  "data": {
    "source": "jt808_0x0900_ulv",
    "sd_cards": {
      "count": 1,
      "total_mb": [30720],
      "remaining_mb": [11264]
    },
    "hard_drives": {
      "count": 0,
      "total_mb": [],
      "remaining_mb": []
    }
  },
  "receivedAt": "2026-02-11T08:20:00.000Z",
  "stale": false,
  "age_ms": 430
}
```

## Live data streaming (video)
This is a data-only flow (no device updates). It returns live video via HLS.

### 5) Start live stream
- **Request**: `0x9101` real-time video/audio request
- **Response**: ULV-framed RTP/PS packets on the stream socket
- **API**: `POST /api/units/:serial/stream/start`

```bash
curl -X POST http://localhost:9000/api/units/JT808_100000000327/stream/start \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "camera": 0, "profile": 1 }'
```

HLS playback URL:
```
http://localhost:9000/hls/JT808_100000000327/0/1/stream.m3u8
```

### 6) Stop live stream
- **Request**: `0x9102` stop real-time video/audio
- **API**: `POST /api/units/:serial/stream/stop`

```bash
curl -X POST http://localhost:9000/api/units/JT808_100000000327/stream/stop \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "camera": 0, "profile": 1 }'
```

## Response shape (generic)
Most command responses follow this shape:
```json
{
  "ok": true,
  "serial": "JT808_100000000327",
  "command_type": "request_environment",
  "data": { },
  "receivedAt": "2026-02-09T10:00:00.000Z"
}
```

## Commissioning write/update support
The commissioning tool now supports N62 write flows through `update_config` using section-scoped payloads.

### 7) Update configuration (ULV Set)
- **Request**: `0xB050` with `CmdType = "Set"`
- **Response**: `0xB051` parameter response (JSON payload)
- **API type**: `update_config`

Example (update one ParamType section):
```bash
curl -X POST http://localhost:9000/api/units/JT808_100000000327/command \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "update_config",
    "payload": {
      "VehBaseInfo": {
        "ParamType": "VehBaseInfo",
        "DriverName": "Commissioning Driver"
      }
    }
  }'
```

Notes:
- Send only changed sections where possible.
- The unit may reboot after successful updates, depending on firmware behavior.
- Keep write payloads aligned with the latest read shape returned by `request_config`.

## Still excluded from this mapping
- `reboot_unit` (JT808 control)
