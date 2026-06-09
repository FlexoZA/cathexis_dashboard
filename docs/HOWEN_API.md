# Howen Device API (H-Protocol)

How the gateway talks to Howen Hero-MC30 (and family) MDVR/dashcam units, every call we can make
to the device to **get info** and **change configuration**, and how each maps to our HTTP API.

Sources:
- `Howen Device Communication Protocol (H-Protocol)-V4.0.0_eng_2026.03.11.pdf`
- `Howen VSS Web API_V2.3.1R2_eng_2025.02.18.pdf`
- Flespi Howen Hero-MC30-01 settings/commands reference
- Gateway code: `src/tcp/howenServer.js`, `src/tcp/howenCodec.js`, `src/core/unitCapabilities.js`, `src/http/app.js`

---

## 1. Architecture

Howen uses two TCP links:

- **Signal link** — the device registers (`0x1001`) and keeps a long-lived TCP socket open.
  All commands (info, config, control) are sent over this existing socket. The gateway keeps the
  approved socket in `activeConnections` (`src/tcp/howenServer.js`).
- **Media link** — a *separate* TCP connection the device opens to an address we hand it (`srv`)
  whenever video/audio/file bytes must flow (live preview, playback, file transfer). Handled by
  `src/tcp/howenMediaServer.js`.

Frame layout (`src/tcp/howenCodec.js`):

```
byte 0      0x48 ('H')   magic
byte 1      0x01         version
byte 2-3    uint16 LE    message type
byte 4-7    uint32 LE    payload length
byte 8..    payload      JSON ("<json>\n\0") for command frames, binary for 0x0011 media
```

Command payloads are JSON with **string** values, every request carries a server-generated session
id `ss`, and the device echoes that `ss` in its response so we can match them. Device responses carry
`err` (see [Error Codes](#9-error-codes)). `fl` lists must never end in `;` (use `1;2`, not `1;2;`).

All HTTP examples below target the live gateway used for testing:

```
BASE = http://185.202.223.35:9000
AUTH = -H "X-API-Key: <key>"   (or Authorization: Bearer <key>)
```

---

## 2. Full device call list (H-Protocol)

Server → device requests and the device → server reply for each. "Implemented" = wired through the
gateway today; "Available" = supported by the device/protocol but not yet exposed by the gateway.

### 2.1 Telemetry / info (mostly automatic)

| Capability | Request | Response | Gateway status | Notes |
| --- | --- | --- | --- | --- |
| Heartbeat | `0x0001` | `0x0001` | Implemented | Auto echo. |
| Signal registration | device `0x1001` | `0x4001` | Implemented | Gate unknown devices, then subscribe. |
| GPS/status subscription | `0x4040` | `0x1040` | Implemented | We subscribe `ct=173` on connect. |
| GPS/status data | device `0x1041` | `0x4041` ack | Implemented | Parsed → universal webhook. |
| Alarm subscription | `0x4050` | `0x1050` | Implemented | We subscribe on connect. |
| Alarm/event data | device `0x1051` | `0x4051` ack | Implemented | Parsed + event-mapped. |
| External module status query | `0x4300` | `0x4301` | Available | Query sub-modules (e.g. AI box) by `mn`. |

### 2.2 Query / get-info (request-response)

| Capability | Request | Response | Gateway status | Notes |
| --- | --- | --- | --- | --- |
| File / recording timeline query | `0x4060` | `0x1060` | Implemented (`query_recordings`) | `err=8` more data, `err=9` finished. |
| **Parameter configuration GET** | `0x40A0` | `0x10A0` | **Implemented (`request_config`)** | Read settings (see §3). |
| GPS optimization GET | `0x42A0` (`act=1`) | `0x12A0` | Available | Turn-based GPS reporting config. |

### 2.3 Parameter configuration SET

| Capability | Request | Response | Gateway status | Notes |
| --- | --- | --- | --- | --- |
| **Parameter configuration SET** | `0x40A0` | `0x10A0` | **Implemented (`update_config`)** | Write settings (see §3). |
| GPS optimization SET | `0x42A0` (`act=0`) | `0x12A0` | Available | Enable/disable + angle. |

### 2.4 Device control (`2.14`, fire-and-forget → answered by `0x1100`)

All of these share one device answer message `0x1100` (matched by session `ss`, carries `err`).
They are **implemented** and exposed through the dedicated audited endpoint
`POST /api/units/:serial/control` (see §4.1) — not the generic `/command` passthrough. The `action`
column is the gateway action name to send.

| Capability | `action` | Request | Danger | Notes |
| --- | --- | --- | --- | --- |
| PTZ control | `ptz_control` | `0x4100` | low | `act` = PTZ code, `ch`, optional `xs`/`ys`/`preset`. |
| **Restart** | `reboot_unit` | `0x4102` | low | Reboot device. |
| **Factory default reset** | `factory_reset` | `0x4103` | **high** | Wipes config. Requires `confirm:true`. |
| Sync time | `sync_time` | `0x4104` | low | `tm` empty = use GPS time. |
| Recording control | `recording_control` | `0x4105` | medium | `open`/`close` channel lists (e.g. `"1;2"`). |
| Clear alarm | `clear_alarm` | `0x4106` | low | |
| Vehicle control | `vehicle_control` | `0x4107` | **high** | `act` 1/2 cut/resume fuel, 3/4 electrics, 5/6 door; `door`. Requires `confirm:true`. |
| **Format disk** | `format_disk` | `0x4108` | **high** | `disk` = `sd1,sd2,hdd1,hdd2`. Destroys footage. Requires `confirm:true`. |
| G-sensor calibration | `gsensor_calibrate` | `0x4109` | low | |
| OSD speed overlay | `osd_speed` | `0x410A` | low | `ods` = `obd`/`gps`. |
| Send short message | `send_message` | `0x410B` | low | `text` ≤1024 chars, `tp` (default `1` = display). |
| Device log | `device_log` | `0x410C` | low | `name` (default `gps`), `dur` minutes. |
| Reset mileage | `reset_mileage` | `0x410D` | medium | `mile` km. |
| TTS audio | `tts_audio` | `0x410E` | low | `num` = preset audio id. |
| Wake from sleep | `wake_device` | `0x410F` | low | |

### 2.5 Media (video / audio / files)

| Capability | Request | Response | Gateway status | Notes |
| --- | --- | --- | --- | --- |
| Media link registration | device `0x1002` | `0x4002` | Implemented | Opens media link to our `srv`. |
| Live preview start/stop | `0x4010` | `0x1010` | Implemented (`stream`) | `on=1/0`, streams `0x0011`. |
| Forced I-frame | `0x4011` | — | Available | |
| Snapshot | `0x4020` | `0x1020` | Available | `take_photo` candidate; upload via FTP/`0x4090`. |
| Audio (talkback/listen) | `0x4030` | `0x1030` | Available | `mic` candidate. |
| Recording playback | `0x4070` | `0x1070` (+`0x1071` end) | Implemented (`request_clip`) | Streams saved footage to `srv`. |
| Playback control | `0x4071` | — | Available | Seek/pause/play/fast. |
| Transparent passthrough | `0x4080` | `0x1080` | Available | |
| File transmission (by path) | `0x4090` | `0x1090` | Available | Download event media / upload config & geofence files. |
| FTP file transmission | `0x4091` | `0x1091` | Available | |

---

## 3. Parameter configuration (`0x40A0` / `0x10A0`) — the config core

This is the message used to **read and write unit configuration**. One message does both:

- **GET**: send a module name with an empty value → device returns current values.
- **SET**: send a module name with a value object → device applies it.

You can batch multiple modules in one `sc` object.

GET request payload:

```json
{
  "ss": "config_<serial>_<hex-ts>",
  "sc": { "CLOCK": "", "VERSIONINFO": "" }
}
```

SET request payload (send only the fields you are changing):

```json
{
  "ss": "config_<serial>_<hex-ts>",
  "sc": {
    "CLOCK": { "timezone": "3", "offset": "3" }
  }
}
```

Device response `0x10A0`:

```json
{ "ss": "0FAA92AB-F3E97890-BDA95976-6752F05C", "err": "0", "sc": { "CLOCK": { "timezone": "3" } } }
```

> ⚠️ **Behavioral quirks confirmed against live Hero-MC30 firmware (`P26012801.3379`):**
>
> 1. **The `0x10A0` response does NOT echo the `ss` we send.** Unlike file-query (`0x4060`), the device
>    replies with its *own* session id. The gateway therefore matches config responses by the **segment
>    names present in the response `sc`** (case-insensitive), not by `ss`
>    (`findPendingHowenEntry()` in `howenServer.js`).
> 2. **Segment names are case-normalized by the device** (request `PRIVACY` → reply `Privacy`,
>    `MotionDetect` → `MOTIONDETECT`). Matching is case-insensitive on both GET and SET.
> 3. **Unknown segments are silently skipped** (returned `sc` simply omits them). A batch with *no* valid
>    segment gets no usable reply and times out — always include at least one known segment when probing.
> 4. **Some string fields are returned with firmware garbage** (uninitialised memory), e.g.
>    `CLOCK.ntpserver="www.ntp.comllll"`, `CLOCK.timezone="140.000000"`, `DISPLAY.chnN.ChnName="/libstdc++."`.
>    → **SET must send only the fields being changed — never a full read-modify-write**, or garbage gets
>    written back verbatim.

### 3.1 Config segments (`sc` keys) — discovered live

The H-Protocol PDF only gives `clock`/`time` examples and points to a separate, **not-shipped**
"Device Parameter Description Document". The list below was enumerated **directly from the live unit
`87845313`** (27 segments). A full raw snapshot is not committed (it contains live WiFi/FTP secrets).

| Segment (`sc` key) | Fields | Purpose / notable keys |
| --- | --- | --- |
| `VERSIONINFO` | 9 | Firmware versions (read-only): `app`, `kernel`, `mcu`, `boot`, `rootfs`, `hardware`, `alg`, `ext`, `Modem` |
| `JTBASE` | 27 | JT808 identity: `phonenum`, `Sn0104`, `ImeiLen`, `SetDeviceID*`, `protocol1..4`, `gpsinterval1/2`, `gpsPosMode`, `CanVehicleType`, `vehilce_type` |
| `SERVER` | 4 | Central servers `server0..server3` → `{mainip, mainport, bakip, bakport, conntype, enable, utczone}` |
| `CLOCK` | 17 | `timezone`, `offset`, `ntpserver`, `ntpport`, `switch`, `onoff`, `sMonth/sWeek/...` |
| `DST` | 10 | Daylight saving window: `onoff`, `offset`, `sMonth/sWeek/sDate/sHour`, `eMonth/...` |
| `DIALUP` | 9 | Mobile network: `apn`, `user`, `passwd`, `type`, `servercode`, `switch`, `Telco` |
| `WIFI` | 14 | `SSID`, `Pwd`, `AuthMode`, `Encrypt`, `Dhcp`, `IpAddr`, `GateWay`, `isOpen`, `Purpose` |
| `ROAMING` | 4 | `RoamSt`, `RoamTime`, `roamon`/`roamoff` (alarm objects) |
| `RECORD` | 20 | Encoders & channels: `MainChn`/`SubChn` (`chn0..chn15`), `IPCChn`, `IPCFUNCTION`, `IPCCOLORSET`, `RecTimers`, `RecMode`, `PackTime`, `AudioEncType`, `EncodeType`, `AutoCover` |
| `DISPLAY` | 18 | Per-channel `chn0..chn15` `{Brightness/Contrast/Saturation/sharpness, ChnName, Preview}`, `uiAlpha` |
| `OSD` | 12 | `region0..region11` `{text, type, sx, sy, width, height}` |
| `MASK` | 8 | `CH0..CH7` → `region0..region3` `{enable, sx, sy, width, height, color}` |
| `Privacy` | 8 | `enable`, `level`, `maskchn`, `speed_limit`, `speed_hold`, `bind_input`/`bind_out` |
| `PTZ` | 16 | Per-channel `chn0..chn15` `{Protocol, Number, Perset}` |
| `MOTIONDETECT` | 16 | Per-channel `chn0..chn15` `{Rect, Sensitivity, alarm}` |
| `POWER` | 25 | Ignition/sleep: `switch`, `delay`, `PowerOffTime`, `AccOffRecTime`, `LowPowerModeEnable`, `TimeRebootEn`, `RebootTime`, `week0..week6` schedules, `volmcu` |
| `IOSET` | 22 | `input` (`chn0..chn31`), `output` (`chn0..chn7`), `sosButtonFun0..9`, `IOMux`, `ibuttonMode` |
| `SPEED` | 13 | `source`, `pulse`, `unit`, `highalarm`/`lowalarm`/`harshacc`/`harshbraking`/`idle`/`stopalarm` (alarm objects) |
| `GSENSOR` | 23 | `switch`, `type`, `correctx/y/z`, `xalarm`/`yalarm`/`zalarm`/`hitalarm`/`tiltalarm`/`turnalarm`/`Acceleration`/`SharpSlowdown` |
| `ACC` | 3 | `accon`/`accoff` (alarm objects), `accreportparam` |
| `VOLTAGE` | 3 | `halarm`/`lalarm` (alarm objects), `powerdelay` |
| `TEMP` | 3 | `halarm`/`lalarm` `{enable, limit, delay, holdtime, linkage, record}`, `unit` |
| `ADAS` | 36 | ADAS alarms: `fcw_alarm`, `hmw_alarm`, `ldw_alarm`, `pcw_alarm`, `psw_alarm`, `os_alarm` + camera geometry |
| `DMS` | 47 | Driver-monitor alarms: `call_alarm`, `yawn_alarm`, `close_eys_alarm`, `smoke_alarm`, `fatigue_driving_alarm`, `seatbelt_unfastened_alarm`, … |
| `PEOPLECOUNT` | 1 | `doorInfo` (`door0..door7` counter config) |
| `LANGUAGE` | 4 | `lang`, `VoiceOnOff`, `VoiceVolume`, `UpgradeVoice` |
| `UPGRADE` | 10 | FTP OTA: `ip`, `port`, `user`, `passwd`, `ftpUpgradeFilePath`, `ftpExt*` |

**Alarm object template** (shared by ACC/ADAS/DMS/GSENSOR/SPEED/VOLTAGE/ROAMING/IOSET/MOTIONDETECT):
`{enable, limit, delay, holdtime, keeptime, alarmSource, alarmReport, linkage, linkBuzzer,
linkSnapChn, linkUploadChn, linkLockChn, record, name, ...}`.

All 27 segments are accepted by `update_config` (SET). Field-level value ranges are still
firmware-specific — send minimal field sets and verify with a follow-up GET.

---

## 4. Gateway HTTP mapping (today)

Commands go through `POST /api/units/:serial/command` (generic), the dedicated control endpoint, or
purpose-built endpoints. The Howen adapter (`src/core/unitCapabilities.js`) advertises:

```
stream, request_clip, query_recordings, request_config, update_config
```

| HTTP | Howen command | H-Protocol |
| --- | --- | --- |
| `POST /api/units/:serial/stream/start` / `stop` | `stream` | `0x4010` |
| `POST /api/units/:serial/clips/request` | `request_clip` | `0x4070` |
| `GET  /api/units/:serial/clips/status` | — (DB + storage) | clip lifecycle / download URL (see §4.3) |
| `GET  /api/units/:serial/recordings` | `query_recordings` | `0x4060` |
| `POST /api/units/:serial/command` `{type:"request_config"}` | `request_config` | `0x40A0` (GET) |
| `POST /api/units/:serial/command` `{type:"update_config"}` | `update_config` | `0x40A0` (SET) |
| `POST /api/units/:serial/control` | device-control actions | `0x4100`–`0x410F` |
| `GET  /api/units` / `details` | — | connection registry |

Device-control actions (`reboot_unit`, `factory_reset`, …) are intentionally **not** accepted by the
generic `/command` endpoint; use `/control` so they are audited and destructive ones are confirm-gated.

### 4.1 `POST /api/units/:serial/control`

Body: `{ "action": "<action>", "confirm": true, "payload": { … } }`

- `action` — one of the device-control actions in §2.4.
- `confirm` — must be `true` for destructive actions (`factory_reset`, `format_disk`, `vehicle_control`).
- `payload` — action-specific fields (see §2.4 Notes).

Every call is audit-logged (`DEBUG::app howen_control_audit` with serial, action, api key). `reboot_unit`
and `factory_reset` treat a drop/timeout as accepted (the device reboots before answering).

Read config:

```bash
curl -X POST http://185.202.223.35:9000/api/units/87845313/command \
  -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"type":"request_config","payload":{"modules":["VERSIONINFO","CLOCK","SERVER"]}}'
```

Write config (send only the fields being changed):

```bash
curl -X POST http://185.202.223.35:9000/api/units/87845313/command \
  -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"type":"update_config","payload":{"sc":{"CLOCK":{"timezone":"2"}}}}'
```

Reboot / format disk (control):

```bash
curl -X POST http://185.202.223.35:9000/api/units/87845313/control \
  -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"action":"reboot_unit"}'

curl -X POST http://185.202.223.35:9000/api/units/87845313/control \
  -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"action":"format_disk","confirm":true,"payload":{"disk":"sd1"}}'
```

---

## 4.2 Frontend integration contract

Everything a frontend needs to build the **Info** and **Config** screens. The shapes below are the
gateway HTTP envelopes (what the browser receives), not the raw device frames.

### 4.2.1 Auth & headers

```
BASE  = http://185.202.223.35:9000        # dev/test gateway
AUTH  = X-API-Key: <key>                  # or Authorization: Bearer <key>
Content-Type: application/json            # on every POST
```

### 4.2.2 Success envelope

`request_config`, and any read/round-trip command, returns **HTTP 200**:

```json
{
  "ok": true,
  "serial": "87845313",
  "command_type": "request_config",
  "data": {
    "session": "config_87845313_19E883549DF",
    "modules": ["VERSIONINFO", "CLOCK"],
    "sc": {
      "VERSIONINFO": { "app": "P26012801.3379", "kernel": "V250621", "...": "..." },
      "CLOCK":       { "timezone": "3", "offset": "3", "...": "..." }
    }
  },
  "receivedAt": "2026-06-02T12:00:54.491Z"
}
```

- **Render from `data.sc`** — it maps `SEGMENT → { field: value }`. All values are **strings**.
- `data.modules` echoes what was requested. Segments the device doesn't recognise are silently
  **omitted** from `data.sc` (no error) — the UI should treat "requested but absent" as "unsupported".

`update_config` (SET) returns **HTTP 200** with the device's post-write echo in `data` (same shape).

### 4.2.3 Error envelope

All failures share `{ "ok": false, "error": "<message>", "serial", "command_type" }` plus the status
codes below. The frontend should branch on **HTTP status**, not on the message string:

| Status | Meaning | Extra fields | Frontend action |
| --- | --- | --- | --- |
| `400` | Validation (bad/missing field, unknown/unsettable segment, unknown command) | `valid_commands`, `supported_commands`, or `validation_errors` | Show inline form error; do not retry |
| `401` | Missing/invalid API key (auth middleware) | — | Re-auth |
| `409` | Unit not approved / quarantined | — | Show "device not provisioned" |
| `429` | Rate limit exceeded | — | Back off & retry |
| `408` | Device didn't answer in time | `timeout` (ms); `update_config` adds `note` | Allow manual retry; for SET, re-GET after ~30–60 s |
| `503` | Unit not connected (offline) | — | Show "device offline", disable controls |
| `500` | Unexpected gateway/device error | — | Generic error toast |

### 4.2.4 Read / write requests

Read (one or many segments — batch freely, ~1–3 s round-trip):

```json
POST /api/units/:serial/command
{ "type": "request_config", "payload": { "modules": ["CLOCK", "SERVER", "WIFI"] } }
```

Write (**send only the fields being changed** — never the whole segment, see §3 quirk #4):

```json
POST /api/units/:serial/command
{ "type": "update_config", "payload": { "sc": { "CLOCK": { "timezone": "2" } } } }
```

Segment names are **case-insensitive** end-to-end; the canonical casing from §3.1 is recommended.

### 4.2.5 Suggested screen model

| Screen | Segments | Notes |
| --- | --- | --- |
| **Info** (read-only) | `VERSIONINFO`, `JTBASE`, `SERVER`, `WIFI` (status), `UPGRADE` (status) | Show firmware, IMEI/`phonenum`, server endpoints, network. No write controls. |
| **Config — General** | `CLOCK`, `DST`, `LANGUAGE`, `POWER`, `DISPLAY`, `OSD` | Safe, high-value editable settings. |
| **Config — Recording** | `RECORD`, `MASK`, `Privacy`, `PTZ`, `MOTIONDETECT` | Per-channel objects (`chn0..chn15`). |
| **Config — Alarms** | `SPEED`, `GSENSOR`, `ACC`, `VOLTAGE`, `TEMP`, `ADAS`, `DMS`, `ROAMING`, `IOSET`, `PEOPLECOUNT` | Share the alarm-object template (§3.1). |
| **Advanced (gated)** | `SERVER`, `JTBASE`, `WIFI` (creds), `UPGRADE`, `DIALUP` | ⚠️ Can disconnect / re-home / misconfigure the unit. Put behind a confirm step. |

Read-only vs editable: `VERSIONINFO` is firmware info (read-only). All other segments are accepted by
SET, but the **Advanced** group above is operationally risky and should be confirm-gated in the UI.

### 4.2.6 Field rendering note

Field **value semantics (enums/ranges/units) are not yet decoded** — e.g. `WIFI.AuthMode="3"`,
`LANGUAGE.lang="1"`, `SERVER.server0.conntype="0"`. Until per-field decode tables exist (§3.1 TBD),
render unknown fields as generic string inputs and build friendly controls (dropdowns/toggles)
incrementally per screen as the meanings are confirmed against the device.

---

## 4.3 Clips — request a clip and download it

Pulling saved footage off a Howen unit is a **two-stage, asynchronous** flow:

1. **Request** the clip (`POST …/clips/request`). The gateway sends `0x4070` over the signal link and
   immediately creates a clip record (status `processing`). The device then opens a **separate media
   link** back to us (`srv = clipReceiverIp:howenMediaListenPort`) and streams the footage as `0x0011`
   frames. The media server (`src/tcp/howenMediaServer.js`) writes them to a temp file, runs FFmpeg,
   uploads the result to Supabase storage, and flips the record to `ready` with a signed URL.
2. **Poll status** (`GET …/clips/status`) until `status: "ready"`, then download from the returned
   `download_url`.

> One camera per request. The H-Protocol `chl` field accepts a `;`-separated channel list, but the
> gateway's clip pipeline is keyed one-camera-per-session (one stored file + one clip record). Request
> each camera separately.

### 4.3.1 Step 1 — request the clip

```
POST /api/units/:serial/clips/request
```

Body:

| Field | Required | Meaning |
| --- | --- | --- |
| `camera` | yes | 0-based camera. `0` = Road, `1` = Cab (→ H-Protocol `chl` = camera + 1). |
| `profile` | yes | `0` = high-res (main stream), `1` = low-res (sub stream). |
| `start_utc` | yes | Window start, Unix seconds (UTC). |
| `end_utc` | yes | Window end, Unix seconds (UTC). |

Constraints enforced by the route: duration (`end_utc - start_utc`) must be **≥ 5 s and ≤ 300 s**
(5 minutes). The upload target (`srv` ip/port) is injected server-side from config — it is **not** part
of the request body.

```bash
curl -s -X POST http://185.202.223.35:9000/api/units/87845313/clips/request \
  -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"camera":0,"profile":1,"start_utc":1780531200,"end_utc":1780531260}'
```

Success (HTTP 200) — the device accepted the playback request and will start uploading:

```json
{
  "ok": true,
  "message": "Howen playback request sent to device (0x4070). Device will open a media link and upload saved footage.",
  "serial": "87845313",
  "camera": 0,
  "profile": 1,
  "start_utc": 1780531200,
  "end_utc": 1780531260,
  "duration": 60,
  "clip_id": 56,
  "session": "playback_87845313_19E8D80FC08",
  "check_status_url": "/api/units/87845313/clips/status?start_utc=1780531200&end_utc=1780531260&camera=0"
}
```

If the device has no footage for that window/camera/profile it rejects with `err=6`, surfaced as
`Howen playback rejected with err=6 (related file does not exist)` (see [Error Codes](#9-error-codes)).
**Always confirm availability first with `query_recordings`** (§5) before requesting a clip.

### 4.3.2 Step 2 — poll status and download

```
GET /api/units/:serial/clips/status?start_utc=<>&end_utc=<>&camera=<>
```

Use the `check_status_url` returned in step 1 (same `start_utc`/`end_utc`/`camera`). Poll every few
seconds; processing typically takes ~30–120 s depending on clip length.

| `status` | `ok` | Meaning | Key fields |
| --- | --- | --- | --- |
| `processing` | true | Request sent, device hasn't started uploading yet | — |
| `receiving` | true | Media is being downloaded from the device | `progress_percent`, `bytes_received`, `file_size` |
| `uploading` | true | Media is being uploaded to storage | `progress_percent`, `bytes_received` |
| `ready` | true | Clip is stored and downloadable | `clip.download_url`, `clip.expires_at`, `clip.file_size` |
| `error` | **false** | Processing failed | `error` (human-readable, e.g. `…err=6 (related file does not exist)`) |

```bash
curl -s "http://185.202.223.35:9000/api/units/87845313/clips/status?start_utc=1780531200&end_utc=1780531260&camera=0" \
  -H "X-API-Key: $KEY"
```

Ready response:

```json
{
  "ok": true,
  "status": "ready",
  "clip": {
    "id": 56,
    "download_url": "https://<supabase>/storage/v1/object/sign/clips/87845313/camera0_profile1_1780531200_1780531260.mp4?token=…",
    "expires_at": "2026-06-05T08:57:41.000Z",
    "duration_seconds": 60,
    "file_size": 5242880,
    "camera": 0,
    "profile": 1,
    "created_at": "2026-06-04T08:57:41.000Z"
  }
}
```

### 4.3.3 Step 3 — fetch the file

`download_url` is a **signed Supabase Storage URL valid for 24 h**. Download it directly (no API key
needed — the signature is in the URL). If it has expired, just call `clips/status` again: the gateway
auto-regenerates a fresh signed URL on the next status check.

```bash
# Pull the download_url out of the status response, then fetch the file
curl -L -o clip.mp4 "<download_url from clips/status>"
```

End-to-end (request → wait → download):

```bash
KEY=<key>
BASE=http://185.202.223.35:9000
SERIAL=87845313

# 1. request
curl -s -X POST $BASE/api/units/$SERIAL/clips/request \
  -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"camera":0,"profile":1,"start_utc":1780531200,"end_utc":1780531260}'

# 2. poll until "status":"ready" (re-run until ready)
curl -s "$BASE/api/units/$SERIAL/clips/status?start_utc=1780531200&end_utc=1780531260&camera=0" \
  -H "X-API-Key: $KEY"

# 3. download the signed URL from the ready response
curl -L -o clip.mp4 "<download_url>"
```

---

## 5. Verified live tests

Against unit `87845313` (IMEI `864312087845313`) on `185.202.223.35:9000`:

```bash
# List connected units → {"units":["87845313"],"count":1}
curl -s http://185.202.223.35:9000/api/units -H "X-API-Key: $KEY"

# Connection details → protocol: "howen", remoteAddress, connectedAt
curl -s http://185.202.223.35:9000/api/units/details -H "X-API-Key: $KEY"

# Recording timeline query (full round-trip to device, err=9 = search finished)
curl -s -X POST http://185.202.223.35:9000/api/units/87845313/command \
  -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"type":"query_recordings","payload":{"camera":0,"profile":1,"start_utc":1780392627,"end_utc":1780399827,"file_type":1}}'
# → {"ok":true,...,"data":{"ss":"timeline_87845313_...","err":"9","files":[],"count":0}}
```

---

## 6. Stream / profile conventions

- `camera` is 0-based in our API; H-Protocol channel `ch`/`chl` is camera **+1** (starts at 1).
- `profile`: `0` = high-res, `1` = low-res. H-Protocol `si`: `1` = main stream, `0` = sub stream
  (so `profile 0 → si 1`, `profile 1 → si 0`).
- `fl` frame list: `1;2` video only, `1;2;3` video + audio.

---

## 7. Date/time format

Device-facing time strings are UTC `YYYY-MM-DD HH:MM:SS` (see `formatHowenUtcDateTime`).
GPS/event timestamps inside binary status blocks are 6-byte `YY MM DD hh mm ss` with year offset 2000.

---

## 8. File type codes (`ft`)

| Value | Meaning |
| --- | --- |
| 0 | unknown |
| 1 | general recording |
| 2 | alarm recording |
| 3 | general snapshot |
| 4 | alarm snapshot |
| 5 | upgrade file |
| 6 | log file |
| 7 | configuration file |
| 8 | black box file |
| 9 | visible alarm video/snapshot |

## 9. Error codes (`err`)

| Value | Meaning |
| --- | --- |
| 0 | success |
| 1 | duplicated id |
| 2 | invalid parameter |
| 3 | invalid command |
| 4 | device busy |
| 5 | connection lost |
| 6 | related file does not exist |
| 7 | disk does not exist |
| 8 | follow-up data (more records coming) |
| 9 | file search finished |
| 10 | device not authorized |
| 15 | access denied |
| 255 | unknown error |

## 10. Network type codes (`at` / status networkType)

| Value | Type |
| --- | --- |
| 0 | unknown |
| 1 | wired |
| 2 | WiFi |
| 3 | 2G |
| 4 | 3G |
| 5 | 4G |
| 6 | 5G |
| 7 | WiFi + cellular proxy |
| 8 | cable + cellular proxy |

---

## 11. Implementation status & remaining work

Implemented (mirrors the Cathexis config model):

- `request_config` / `update_config` (`0x40A0`) wired in `sendCommandToHowen()`, registered in
  `HOWEN_COMMANDS`, validated by `validateHowenConfigPayload()`.
- **Config response matching by `sc` segment names (case-insensitive)** instead of `ss`, because the
  device replies with its own session id (`findPendingHowenEntry()` in `howenServer.js`).
- **Live schema discovered** — all 27 `0x40A0` segments enumerated against `87845313` (§3.1). GET
  passes any segment name through; SET accepts all 27 discovered segments.
- Full device-control surface (`0x4100`–`0x410F`) via the audited `POST /control` endpoint, with
  `confirm:true` required for `factory_reset` / `format_disk` / `vehicle_control`.

Remaining / to verify against the live unit:

1. **Tighten field-level SET validation** — value ranges per field are still firmware-specific;
   `validateHowenConfigPayload()` is structural + segment-level only. Verify each SET with a follow-up GET.
2. **Verify SET (`update_config`) end-to-end** against a low-risk segment (e.g. `CLOCK`/`OSD`) before
   touching `SERVER`/`UPGRADE`/`JTBASE`/`WIFI`, which can disconnect or misconfigure the unit.
3. Confirm `reboot_unit` / `factory_reset` answer-then-disconnect behaviour and tune timeouts.
4. Decide whether reboot should resolve-on-disconnect (as Cathexis `update_config` does) instead of
   relying on the timeout-as-accepted fallback.
5. Optional: expose GPS-optimization (`0x42A0`), snapshot (`0x4020` → `take_photo`), and audio
   (`0x4030` → `mic`) once config/control are validated in the field.

> ⚠️ The stdout discovery log `DEBUG::howenServer / param_config_response` in `howenServer.js` dumps the
> full raw `0x10A0` payload. It is useful during schema discovery but verbose (and includes secrets like
> the WiFi password); consider gating it behind `debug()` once SET is validated in the field.
