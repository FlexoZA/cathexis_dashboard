// Friendly rendering metadata for Howen 0x40A0 config fields (docs/HOWEN_API.md §3.1).
//
// The device returns every value as a string and the per-field value semantics (enums/ranges)
// are NOT officially decoded yet (§4.2.6). So this layer only does things that PRESERVE the
// stored value:
//   - reformat the raw key into a readable label (acronym-aware), and
//   - render clear on/off "0"/"1" fields as toggles.
// Anything we don't positively recognise falls back to a humanised label + plain text input,
// so we never silently reinterpret an unknown field.

export type HowenControl = "text" | "toggle"

// Faithful relabelings of raw keys — these only reformat the key, they do not reinterpret it.
// Keyed lowercase. Many keys are lower-cased and run together (e.g. "ntpserver"), which the
// generic humaniser can't split, so they are spelled out here.
const LABEL_OVERRIDES: Record<string, string> = {
  // CLOCK / DST
  timezone: "Timezone",
  offset: "Offset",
  ntpserver: "NTP Server",
  ntpport: "NTP Port",
  switch: "Enabled",
  onoff: "Enabled",
  // VERSIONINFO
  app: "App",
  kernel: "Kernel",
  mcu: "MCU",
  boot: "Boot",
  rootfs: "Root FS",
  hardware: "Hardware",
  alg: "Algorithm",
  ext: "Extension",
  modem: "Modem",
  // JTBASE
  phonenum: "Phone Number",
  vehilce_type: "Vehicle Type",
  vehicle_type: "Vehicle Type",
  canvehicletype: "CAN Vehicle Type",
  gpsposmode: "GPS Position Mode",
  gpsinterval1: "GPS Interval 1",
  gpsinterval2: "GPS Interval 2",
  imeilen: "IMEI Length",
  // SERVER
  mainip: "Main IP",
  mainport: "Main Port",
  bakip: "Backup IP",
  bakport: "Backup Port",
  conntype: "Connection Type",
  enable: "Enabled",
  utczone: "UTC Zone",
  // DIALUP
  apn: "APN",
  user: "User",
  passwd: "Password",
  telco: "Telco",
  servercode: "Server Code",
  // WIFI
  ssid: "SSID",
  pwd: "Password",
  authmode: "Auth Mode",
  encrypt: "Encryption",
  dhcp: "DHCP",
  ipaddr: "IP Address",
  gateway: "Gateway",
  isopen: "Open",
  purpose: "Purpose",
  // POWER
  powerofftime: "Power-off Time",
  accoffrectime: "ACC-off Record Time",
  lowpowermodeenable: "Low-power Mode",
  timerebooten: "Timed Reboot",
  reboottime: "Reboot Time",
  // DISPLAY
  brightness: "Brightness",
  contrast: "Contrast",
  saturation: "Saturation",
  sharpness: "Sharpness",
  chnname: "Channel Name",
  preview: "Preview",
  uialpha: "UI Alpha",
  // Alarm-object template (§3.1) — faithful reformats only.
  limit: "Limit",
  delay: "Delay",
  holdtime: "Hold Time",
  keeptime: "Keep Time",
  alarmsource: "Alarm Source",
  alarmreport: "Report Alarm",
  linkbuzzer: "Buzzer",
  linksnapchn: "Snapshot Channels",
  linkuploadchn: "Upload Channels",
  linklockchn: "Lock Channels",
  record: "Record",
  name: "Name",
  enabled: "Enabled",
}

// Keys treated as on/off when their value is clearly boolean ("0"/"1"). We require BOTH the key
// to be in this set AND the value to look boolean (see inferHowenControl) so an enum/bitmask that
// happens to share a name is never collapsed into a toggle.
const BOOLEAN_FIELDS = new Set([
  "enable",
  "enabled",
  "switch",
  "onoff",
  "isopen",
  "record",
  "alarmreport",
  "linkbuzzer",
  "audioen",
  "en",
  "dhcp",
  "dhcpen",
  "voiceonoff",
  "upgradevoice",
  "mounted",
])

// Keys whose boolean value should be hoisted into a section/card header (matches the device's own
// UI, where each named alarm card carries its enable toggle in the title bar).
export const ENABLE_KEYS = new Set(["enable", "enabled", "switch", "onoff", "en", "isopen"])

const ACRONYMS: Record<string, string> = {
  ip: "IP",
  apn: "APN",
  ssid: "SSID",
  ntp: "NTP",
  gps: "GPS",
  dst: "DST",
  dhcp: "DHCP",
  id: "ID",
  sn: "SN",
  imei: "IMEI",
  mcu: "MCU",
  cpu: "CPU",
  chn: "Channel",
  utc: "UTC",
  ftp: "FTP",
  dns: "DNS",
  adas: "ADAS",
  dms: "DMS",
  tts: "TTS",
  osd: "OSD",
  ptz: "PTZ",
  ai: "AI",
  fcw: "FCW",
  hmw: "HMW",
  ldw: "LDW",
  pcw: "PCW",
  psw: "PSW",
}

/** Turn a raw field/segment key into a readable label, expanding known acronyms. */
export function humanizeHowenLabel(key: string): string {
  const override = LABEL_OVERRIDES[key.toLowerCase()]
  if (override) return override

  // Split camelCase, snake_case and digit boundaries into words.
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return key

  return words
    .map((word) => {
      const lower = word.toLowerCase()
      if (ACRONYMS[lower]) return ACRONYMS[lower]
      if (/^\d+$/.test(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(" ")
}

/** Is a leaf value clearly a boolean stored as a string ("0"/"1") or an actual boolean? */
export function isBooleanishValue(value: unknown): boolean {
  if (typeof value === "boolean") return true
  if (value === 0 || value === 1) return true
  if (typeof value === "string") return value === "0" || value === "1" || value === ""
  return false
}

/** Truthiness for a Howen leaf value ("1"/1/true → on). */
export function isHowenOn(value: unknown): boolean {
  if (typeof value === "boolean") return value
  return value === "1" || value === 1
}

/** Choose a control for a leaf field. Defaults to text so unknown values are never reinterpreted. */
export function inferHowenControl(key: string, value: unknown): HowenControl {
  if (BOOLEAN_FIELDS.has(key.toLowerCase()) && isBooleanishValue(value)) return "toggle"
  return "text"
}
