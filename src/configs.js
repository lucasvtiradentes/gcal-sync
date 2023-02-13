/*eslint no-undef: "off"*/
/*eslint no-unused-vars: "off"*/

this.TickSync = {};

this.CONFIGS = {
  email: 'lucasvtiradentes@gmail.com',
  ticktickCallendars: [['webcal://ticktick.com/pub/calendar/feeds/vvl0cw34vamw/basic.ics', 'ticktick']],
  updateFrequency: 15,
  getOnlyFutureEvents: false,
  startUpdateTime: '',
  addEventsToCalendar: true,
  modifyExistingEvents: true,
  removeEventsFromCalendar: true,
  addAlerts: 'yes',
  addOrganizerToTitle: false,
  descriptionAsTitles: false,
  addCalToTitle: false,
  addAttendees: false,
  defaultAllDayReminder: -1,
  overrideVisibility: '',
  addTasks: false,
  emailSummary: false,
  defaultMaxRetries: 10
};

this.CALENDAR = {
  calendarEvents: [],
  calendarEventsIds: [],
  icsEventsIds: [],
  calendarEventsMD5s: [],
  recurringEvents: [],
  targetCalendarId: '',
  targetCalendarName: ''
};

this.SESSION = {
  addedEvents: [],
  modifiedEvents: [],
  removedEvents: []
};

// var howFrequent = 15; // What interval (minutes) to run this script on to check for new events
// var sourceCalendars = [['webcal://ticktick.com/pub/calendar/feeds/vvl0cw34vamw/basic.ics', 'ticktick']];
// var onlyFutureEvents = false; // If you turn this to "true", past events will not be synced (this will also removed past events from the target calendar if removeEventsFromCalendar is true)
// var addEventsToCalendar = true; // If you turn this to "false", you can check the log (View > Logs) to make sure your events are being read correctly before turning this on
// var modifyExistingEvents = true; // If you turn this to "false", any event in the feed that was modified after being added to the calendar will not update
// var removeEventsFromCalendar = true; // If you turn this to "true", any event created by the script that is not found in the feed will be removed.
// var addAlerts = 'yes'; // Whether to add the ics/ical alerts as notifications on the Google Calendar events or revert to the calendar's default reminders ("yes", "no", "default").
// var addOrganizerToTitle = false; // Whether to prefix the event name with the event organiser for further clarity
// var descriptionAsTitles = false; // Whether to use the ics/ical descriptions as titles (true) or to use the normal titles as titles (false)
// var addCalToTitle = false; // Whether to add the source calendar to title
// var addAttendees = false; // Whether to add the attendee list. If true, duplicate events will be automatically added to the attendees' calendar.
// var defaultAllDayReminder = -1; // Default reminder for all day events in minutes before the day of the event (-1 = no reminder, the value has to be between 0 and 40320)
// var overrideVisibility = ''; // Changes the visibility of the event ("default", "public", "private", "confidential"). Anything else will revert to the class value of the ICAL event.
// var addTasks = false;
// var emailSummary = false; // Will email you when an event is added/modified/removed to your calendar
// var email = ''; // OPTIONAL: If "emailSummary" is set to true or you want to receive update notifications, you will need to provide your email address
// var defaultMaxRetries = 10; // Maximum number of retries for api functions (with exponential backoff)

// -----------------------------------------------------------------------------

// Per-calendar global variables (must be reset before processing each new calendar!)
// var calendarEvents = [];
// var calendarEventsIds = [];
// var icsEventsIds = [];
// var calendarEventsMD5s = [];
// var recurringEvents = [];
// var targetCalendarId;
// var targetCalendarName;

// -----------------------------------------------------------------------------

// Per-session global variables (must NOT be reset before processing each new calendar!)
// var addedEvents = [];
// var modifiedEvents = [];
// var removedEvents = [];

this.TZIDS = [
  'Africa/Abidjan',
  'Africa/Accra',
  'Africa/Addis_Ababa',
  'Africa/Algiers',
  'Africa/Asmara',
  'Africa/Bamako',
  'Africa/Bangui',
  'Africa/Banjul',
  'Africa/Bissau',
  'Africa/Blantyre',
  'Africa/Brazzaville',
  'Africa/Bujumbura',
  'Africa/Cairo',
  'Africa/Casablanca',
  'Africa/Ceuta',
  'Africa/Conakry',
  'Africa/Dakar',
  'Africa/Dar_es_Salaam',
  'Africa/Djibouti',
  'Africa/Douala',
  'Africa/El_Aaiun',
  'Africa/Freetown',
  'Africa/Gaborone',
  'Africa/Harare',
  'Africa/Johannesburg',
  'Africa/Juba',
  'Africa/Kampala',
  'Africa/Khartoum',
  'Africa/Kigali',
  'Africa/Kinshasa',
  'Africa/Lagos',
  'Africa/Libreville',
  'Africa/Lome',
  'Africa/Luanda',
  'Africa/Lubumbashi',
  'Africa/Lusaka',
  'Africa/Malabo',
  'Africa/Maputo',
  'Africa/Maseru',
  'Africa/Mbabane',
  'Africa/Mogadishu',
  'Africa/Monrovia',
  'Africa/Nairobi',
  'Africa/Ndjamena',
  'Africa/Niamey',
  'Africa/Nouakchott',
  'Africa/Ouagadougou',
  'Africa/Porto-Novo',
  'Africa/Sao_Tome',
  'Africa/Timbuktu',
  'Africa/Tripoli',
  'Africa/Tunis',
  'Africa/Windhoek',
  'America/Adak',
  'America/Anchorage',
  'America/Anguilla',
  'America/Antigua',
  'America/Araguaina',
  'America/Argentina/Buenos_Aires',
  'America/Argentina/Catamarca',
  'America/Argentina/ComodRivadavia',
  'America/Argentina/Cordoba',
  'America/Argentina/Jujuy',
  'America/Argentina/La_Rioja',
  'America/Argentina/Mendoza',
  'America/Argentina/Rio_Gallegos',
  'America/Argentina/Salta',
  'America/Argentina/San_Juan',
  'America/Argentina/San_Luis',
  'America/Argentina/Tucuman',
  'America/Argentina/Ushuaia',
  'America/Aruba',
  'America/Asuncion',
  'America/Atikokan',
  'America/Atka',
  'America/Bahia',
  'America/Bahia_Banderas',
  'America/Barbados',
  'America/Belem',
  'America/Belize',
  'America/Blanc-Sablon',
  'America/Boa_Vista',
  'America/Bogota',
  'America/Boise',
  'America/Buenos_Aires',
  'America/Cambridge_Bay',
  'America/Campo_Grande',
  'America/Cancun',
  'America/Caracas',
  'America/Catamarca',
  'America/Cayenne',
  'America/Cayman',
  'America/Chicago',
  'America/Chihuahua',
  'America/Coral_Harbour',
  'America/Cordoba',
  'America/Costa_Rica',
  'America/Creston',
  'America/Cuiaba',
  'America/Curacao',
  'America/Danmarkshavn',
  'America/Dawson',
  'America/Dawson_Creek',
  'America/Denver',
  'America/Detroit',
  'America/Dominica',
  'America/Edmonton',
  'America/Eirunepe',
  'America/El_Salvador',
  'America/Ensenada',
  'America/Fort_Nelson',
  'America/Fort_Wayne',
  'America/Fortaleza',
  'America/Glace_Bay',
  'America/Godthab',
  'America/Goose_Bay',
  'America/Grand_Turk',
  'America/Grenada',
  'America/Guadeloupe',
  'America/Guatemala',
  'America/Guayaquil',
  'America/Guyana',
  'America/Halifax',
  'America/Havana',
  'America/Hermosillo',
  'America/Indiana/Indianapolis',
  'America/Indiana/Knox',
  'America/Indiana/Marengo',
  'America/Indiana/Petersburg',
  'America/Indiana/Tell_City',
  'America/Indiana/Vevay',
  'America/Indiana/Vincennes',
  'America/Indiana/Winamac',
  'America/Indianapolis',
  'America/Inuvik',
  'America/Iqaluit',
  'America/Jamaica',
  'America/Jujuy',
  'America/Juneau',
  'America/Kentucky/Louisville',
  'America/Kentucky/Monticello',
  'America/Knox_IN',
  'America/Kralendijk',
  'America/La_Paz',
  'America/Lima',
  'America/Los_Angeles',
  'America/Louisville',
  'America/Lower_Princes',
  'America/Maceio',
  'America/Managua',
  'America/Manaus',
  'America/Marigot',
  'America/Martinique',
  'America/Matamoros',
  'America/Mazatlan',
  'America/Mendoza',
  'America/Menominee',
  'America/Merida',
  'America/Metlakatla',
  'America/Mexico_City',
  'America/Miquelon',
  'America/Moncton',
  'America/Monterrey',
  'America/Montevideo',
  'America/Montreal',
  'America/Montserrat',
  'America/Nassau',
  'America/New_York',
  'America/Nipigon',
  'America/Nome',
  'America/Noronha',
  'America/North_Dakota/Beulah',
  'America/North_Dakota/Center',
  'America/North_Dakota/New_Salem',
  'America/Ojinaga',
  'America/Panama',
  'America/Pangnirtung',
  'America/Paramaribo',
  'America/Phoenix',
  'America/Port_of_Spain',
  'America/Port-au-Prince',
  'America/Porto_Acre',
  'America/Porto_Velho',
  'America/Puerto_Rico',
  'America/Punta_Arenas',
  'America/Rainy_River',
  'America/Rankin_Inlet',
  'America/Recife',
  'America/Regina',
  'America/Resolute',
  'America/Rio_Branco',
  'America/Rosario',
  'America/Santa_Isabel',
  'America/Santarem',
  'America/Santiago',
  'America/Santo_Domingo',
  'America/Sao_Paulo',
  'America/Scoresbysund',
  'America/Shiprock',
  'America/Sitka',
  'America/St_Barthelemy',
  'America/St_Johns',
  'America/St_Kitts',
  'America/St_Lucia',
  'America/St_Thomas',
  'America/St_Vincent',
  'America/Swift_Current',
  'America/Tegucigalpa',
  'America/Thule',
  'America/Thunder_Bay',
  'America/Tijuana',
  'America/Toronto',
  'America/Tortola',
  'America/Vancouver',
  'America/Virgin',
  'America/Whitehorse',
  'America/Winnipeg',
  'America/Yakutat',
  'America/Yellowknife',
  'Antarctica/Casey',
  'Antarctica/Davis',
  'Antarctica/DumontDUrville',
  'Antarctica/Macquarie',
  'Antarctica/Mawson',
  'Antarctica/McMurdo',
  'Antarctica/Palmer',
  'Antarctica/Rothera',
  'Antarctica/South_Pole',
  'Antarctica/Syowa',
  'Antarctica/Troll',
  'Antarctica/Vostok',
  'Arctic/Longyearbyen',
  'Asia/Aden',
  'Asia/Almaty',
  'Asia/Amman',
  'Asia/Anadyr',
  'Asia/Aqtau',
  'Asia/Aqtobe',
  'Asia/Ashgabat',
  'Asia/Ashkhabad',
  'Asia/Atyrau',
  'Asia/Baghdad',
  'Asia/Bahrain',
  'Asia/Baku',
  'Asia/Bangkok',
  'Asia/Barnaul',
  'Asia/Beirut',
  'Asia/Bishkek',
  'Asia/Brunei',
  'Asia/Calcutta',
  'Asia/Chita',
  'Asia/Choibalsan',
  'Asia/Chongqing',
  'Asia/Chungking',
  'Asia/Colombo',
  'Asia/Dacca',
  'Asia/Damascus',
  'Asia/Dhaka',
  'Asia/Dili',
  'Asia/Dubai',
  'Asia/Dushanbe',
  'Asia/Famagusta',
  'Asia/Gaza',
  'Asia/Harbin',
  'Asia/Hebron',
  'Asia/Ho_Chi_Minh',
  'Asia/Hong_Kong',
  'Asia/Hovd',
  'Asia/Irkutsk',
  'Asia/Istanbul',
  'Asia/Jakarta',
  'Asia/Jayapura',
  'Asia/Jerusalem',
  'Asia/Kabul',
  'Asia/Kamchatka',
  'Asia/Karachi',
  'Asia/Kashgar',
  'Asia/Kathmandu',
  'Asia/Katmandu',
  'Asia/Khandyga',
  'Asia/Kolkata',
  'Asia/Krasnoyarsk',
  'Asia/Kuala_Lumpur',
  'Asia/Kuching',
  'Asia/Kuwait',
  'Asia/Macao',
  'Asia/Macau',
  'Asia/Magadan',
  'Asia/Makassar',
  'Asia/Manila',
  'Asia/Muscat',
  'Asia/Novokuznetsk',
  'Asia/Novosibirsk',
  'Asia/Omsk',
  'Asia/Oral',
  'Asia/Phnom_Penh',
  'Asia/Pontianak',
  'Asia/Pyongyang',
  'Asia/Qatar',
  'Asia/Qyzylorda',
  'Asia/Rangoon',
  'Asia/Riyadh',
  'Asia/Saigon',
  'Asia/Sakhalin',
  'Asia/Samarkand',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Srednekolymsk',
  'Asia/Taipei',
  'Asia/Tashkent',
  'Asia/Tbilisi',
  'Asia/Tehran',
  'Asia/Tel_Aviv',
  'Asia/Thimbu',
  'Asia/Thimphu',
  'Asia/Tokyo',
  'Asia/Tomsk',
  'Asia/Ujung_Pandang',
  'Asia/Ulaanbaatar',
  'Asia/Ulan_Bator',
  'Asia/Urumqi',
  'Asia/Ust-Nera',
  'Asia/Vientiane',
  'Asia/Vladivostok',
  'Asia/Yakutsk',
  'Asia/Yangon',
  'Asia/Yekaterinburg',
  'Asia/Yerevan',
  'Atlantic/Azores',
  'Atlantic/Bermuda',
  'Atlantic/Canary',
  'Atlantic/Cape_Verde',
  'Atlantic/Faeroe',
  'Atlantic/Faroe',
  'Atlantic/Jan_Mayen',
  'Atlantic/Madeira',
  'Atlantic/Reykjavik',
  'Atlantic/South_Georgia',
  'Atlantic/St_Helena',
  'Atlantic/Stanley',
  'Australia/ACT',
  'Australia/Adelaide',
  'Australia/Brisbane',
  'Australia/Broken_Hill',
  'Australia/Canberra',
  'Australia/Currie',
  'Australia/Darwin',
  'Australia/Eucla',
  'Australia/Hobart',
  'Australia/LHI',
  'Australia/Lindeman',
  'Australia/Lord_Howe',
  'Australia/Melbourne',
  'Australia/North',
  'Australia/NSW',
  'Australia/Perth',
  'Australia/Queensland',
  'Australia/South',
  'Australia/Sydney',
  'Australia/Tasmania',
  'Australia/Victoria',
  'Australia/West',
  'Australia/Yancowinna',
  'Brazil/Acre',
  'Brazil/DeNoronha',
  'Brazil/East',
  'Brazil/West',
  'Canada/Atlantic',
  'Canada/Central',
  'Canada/Eastern',
  'Canada/Mountain',
  'Canada/Newfoundland',
  'Canada/Pacific',
  'Canada/Saskatchewan',
  'Canada/Yukon',
  'CET',
  'Chile/Continental',
  'Chile/EasterIsland',
  'CST6CDT',
  'Cuba',
  'EET',
  'Egypt',
  'Eire',
  'EST',
  'EST5EDT',
  'Etc/GMT',
  'Etc/GMT+0',
  'Etc/GMT+1',
  'Etc/GMT+10',
  'Etc/GMT+11',
  'Etc/GMT+12',
  'Etc/GMT+2',
  'Etc/GMT+3',
  'Etc/GMT+4',
  'Etc/GMT+5',
  'Etc/GMT+6',
  'Etc/GMT+7',
  'Etc/GMT+8',
  'Etc/GMT+9',
  'Etc/GMT0',
  'Etc/GMT-0',
  'Etc/GMT-1',
  'Etc/GMT-10',
  'Etc/GMT-11',
  'Etc/GMT-12',
  'Etc/GMT-13',
  'Etc/GMT-14',
  'Etc/GMT-2',
  'Etc/GMT-3',
  'Etc/GMT-4',
  'Etc/GMT-5',
  'Etc/GMT-6',
  'Etc/GMT-7',
  'Etc/GMT-8',
  'Etc/GMT-9',
  'Etc/Greenwich',
  'Etc/UCT',
  'Etc/Universal',
  'Etc/UTC',
  'Etc/Zulu',
  'Europe/Amsterdam',
  'Europe/Andorra',
  'Europe/Astrakhan',
  'Europe/Athens',
  'Europe/Belfast',
  'Europe/Belgrade',
  'Europe/Berlin',
  'Europe/Bratislava',
  'Europe/Brussels',
  'Europe/Bucharest',
  'Europe/Budapest',
  'Europe/Busingen',
  'Europe/Chisinau',
  'Europe/Copenhagen',
  'Europe/Dublin',
  'Europe/Gibraltar',
  'Europe/Guernsey',
  'Europe/Helsinki',
  'Europe/Isle_of_Man',
  'Europe/Istanbul',
  'Europe/Jersey',
  'Europe/Kaliningrad',
  'Europe/Kiev',
  'Europe/Kirov',
  'Europe/Lisbon',
  'Europe/Ljubljana',
  'Europe/London',
  'Europe/Luxembourg',
  'Europe/Madrid',
  'Europe/Malta',
  'Europe/Mariehamn',
  'Europe/Minsk',
  'Europe/Monaco',
  'Europe/Moscow',
  'Asia/Nicosia',
  'Europe/Oslo',
  'Europe/Paris',
  'Europe/Podgorica',
  'Europe/Prague',
  'Europe/Riga',
  'Europe/Rome',
  'Europe/Samara',
  'Europe/San_Marino',
  'Europe/Sarajevo',
  'Europe/Saratov',
  'Europe/Simferopol',
  'Europe/Skopje',
  'Europe/Sofia',
  'Europe/Stockholm',
  'Europe/Tallinn',
  'Europe/Tirane',
  'Europe/Tiraspol',
  'Europe/Ulyanovsk',
  'Europe/Uzhgorod',
  'Europe/Vaduz',
  'Europe/Vatican',
  'Europe/Vienna',
  'Europe/Vilnius',
  'Europe/Volgograd',
  'Europe/Warsaw',
  'Europe/Zagreb',
  'Europe/Zaporozhye',
  'Europe/Zurich',
  'GB',
  'GB-Eire',
  'GMT',
  'GMT+0',
  'GMT0',
  'GMT−0',
  'Hongkong',
  'HST',
  'Iceland',
  'Indian/Antananarivo',
  'Indian/Chagos',
  'Indian/Christmas',
  'Indian/Cocos',
  'Indian/Comoro',
  'Indian/Kerguelen',
  'Indian/Mahe',
  'Indian/Maldives',
  'Indian/Mauritius',
  'Indian/Mayotte',
  'Indian/Reunion',
  'Iran',
  'Israel',
  'Jamaica',
  'Japan',
  'Kwajalein',
  'Libya',
  'MET',
  'Mexico/BajaNorte',
  'Mexico/BajaSur',
  'Mexico/General',
  'MST',
  'MST7MDT',
  'Navajo',
  'NZ',
  'NZ-CHAT',
  'Pacific/Apia',
  'Pacific/Auckland',
  'Pacific/Bougainville',
  'Pacific/Chatham',
  'Pacific/Chuuk',
  'Pacific/Easter',
  'Pacific/Efate',
  'Pacific/Enderbury',
  'Pacific/Fakaofo',
  'Pacific/Fiji',
  'Pacific/Funafuti',
  'Pacific/Galapagos',
  'Pacific/Gambier',
  'Pacific/Guadalcanal',
  'Pacific/Guam',
  'Pacific/Honolulu',
  'Pacific/Johnston',
  'Pacific/Kiritimati',
  'Pacific/Kosrae',
  'Pacific/Kwajalein',
  'Pacific/Majuro',
  'Pacific/Marquesas',
  'Pacific/Midway',
  'Pacific/Nauru',
  'Pacific/Niue',
  'Pacific/Norfolk',
  'Pacific/Noumea',
  'Pacific/Pago_Pago',
  'Pacific/Palau',
  'Pacific/Pitcairn',
  'Pacific/Pohnpei',
  'Pacific/Ponape',
  'Pacific/Port_Moresby',
  'Pacific/Rarotonga',
  'Pacific/Saipan',
  'Pacific/Samoa',
  'Pacific/Tahiti',
  'Pacific/Tarawa',
  'Pacific/Tongatapu',
  'Pacific/Truk',
  'Pacific/Wake',
  'Pacific/Wallis',
  'Pacific/Yap',
  'Poland',
  'Portugal',
  'PRC',
  'PST8PDT',
  'ROC',
  'ROK',
  'Singapore',
  'Turkey',
  'UCT',
  'Universal',
  'US/Alaska',
  'US/Aleutian',
  'US/Arizona',
  'US/Central',
  'US/Eastern',
  'US/East-Indiana',
  'US/Hawaii',
  'US/Indiana-Starke',
  'US/Michigan',
  'US/Mountain',
  'US/Pacific',
  'US/Pacific-New',
  'US/Samoa',
  'UTC',
  'WET',
  'W-SU',
  'Zulu'
];

//Windows Timezone names to IANA, according https://github.com/unicode-org/cldr/blob/master/common/supplemental/windowsZones.xml
this.TZID_REPLACE = {
  'Dateline Standard Time': 'Etc/GMT+12',
  'UTC-11': 'Etc/GMT+11',
  'Aleutian Standard Time': 'America/Adak',
  'Hawaiian Standard Time': 'Pacific/Honolulu',
  'Marquesas Standard Time': 'Pacific/Marquesas',
  'Alaskan Standard Time': 'America/Anchorage',
  'UTC-09': 'Pacific/Gambier',
  'Pacific Standard Time (Mexico)': 'America/Tijuana',
  'UTC-08': 'Pacific/Pitcairn',
  'Pacific Standard Time': 'America/Los_Angeles',
  'US Mountain Standard Time': 'America/Phoenix',
  'Mountain Standard Time (Mexico)': 'America/Chihuahua',
  'Mountain Standard Time': 'America/Denver',
  'Central America Standard Time': 'America/Guatemala',
  'Central Standard Time': 'America/Chicago',
  'Easter Island Standard Time': 'Pacific/Easter',
  'Central Standard Time (Mexico)': 'America/Mexico_City',
  'Canada Central Standard Time': 'America/Regina',
  'SA Pacific Standard Time': 'America/Bogota',
  'Eastern Standard Time (Mexico)': 'America/Cancun',
  'Eastern Standard Time': 'America/New_York',
  'Haiti Standard Time': 'America/Port-au-Prince',
  'Cuba Standard Time': 'America/Havana',
  'US Eastern Standard Time': 'America/Indianapolis',
  'Paraguay Standard Time': 'America/Asuncion',
  'Atlantic Standard Time': 'America/Halifax',
  'Venezuela Standard Time': 'America/Caracas',
  'Central Brazilian Standard Time': 'America/Cuiaba',
  'SA Western Standard Time': 'America/La_Paz',
  'Pacific SA Standard Time': 'America/Santiago',
  'Turks And Caicos Standard Time': 'America/Grand_Turk',
  'Newfoundland Standard Time': 'America/St_Johns',
  'Tocantins Standard Time': 'America/Araguaina',
  'E. South America Standard Time': 'America/Sao_Paulo',
  'SA Eastern Standard Time': 'America/Cayenne',
  'Argentina Standard Time': 'America/Buenos_Aires',
  'Greenland Standard Time': 'America/Godthab',
  'Montevideo Standard Time': 'America/Montevideo',
  'Magallanes Standard Time': 'America/Punta_Arenas',
  'Saint Pierre Standard Time': 'America/Miquelon',
  'Bahia Standard Time': 'America/Bahia',
  'UTC-02': 'America/Noronha',
  'Azores Standard Time': 'Atlantic/Azores',
  'Cape Verde Standard Time': 'Atlantic/Cape_Verde',
  UTC: 'Etc/GMT',
  'GMT Standard Time': 'Europe/London',
  'Greenwich Standard Time': 'Atlantic/Reykjavik',
  'W. Europe Standard Time': 'Europe/Berlin',
  'Central Europe Standard Time': 'Europe/Budapest',
  'Romance Standard Time': 'Europe/Paris',
  'Morocco Standard Time': 'Africa/Casablanca',
  'Sao Tome Standard Time': 'Africa/Sao_Tome',
  'Central European Standard Time': 'Europe/Warsaw',
  'W. Central Africa Standard Time': 'Africa/Lagos',
  'Jordan Standard Time': 'Asia/Amman',
  'GTB Standard Time': 'Europe/Bucharest',
  'Middle East Standard Time': 'Asia/Beirut',
  'Egypt Standard Time': 'Africa/Cairo',
  'E. Europe Standard Time': 'Europe/Chisinau',
  'Syria Standard Time': 'Asia/Damascus',
  'West Bank Standard Time': 'Asia/Hebron',
  'South Africa Standard Time': 'Africa/Johannesburg',
  'FLE Standard Time': 'Europe/Kiev',
  'Israel Standard Time': 'Asia/Jerusalem',
  'Kaliningrad Standard Time': 'Europe/Kaliningrad',
  'Sudan Standard Time': 'Africa/Khartoum',
  'Libya Standard Time': 'Africa/Tripoli',
  'Namibia Standard Time': 'Africa/Windhoek',
  'Arabic Standard Time': 'Asia/Baghdad',
  'Turkey Standard Time': 'Europe/Istanbul',
  'Arab Standard Time': 'Asia/Riyadh',
  'Belarus Standard Time': 'Europe/Minsk',
  'Russian Standard Time': 'Europe/Moscow',
  'E. Africa Standard Time': 'Africa/Nairobi',
  'Iran Standard Time': 'Asia/Tehran',
  'Arabian Standard Time': 'Asia/Dubai',
  'Astrakhan Standard Time': 'Europe/Astrakhan',
  'Azerbaijan Standard Time': 'Asia/Baku',
  'Russia Time Zone 3': 'Europe/Samara',
  'Mauritius Standard Time': 'Indian/Mauritius',
  'Saratov Standard Time': 'Europe/Saratov',
  'Georgian Standard Time': 'Asia/Tbilisi',
  'Caucasus Standard Time': 'Asia/Yerevan',
  'Afghanistan Standard Time': 'Asia/Kabul',
  'West Asia Standard Time': 'Asia/Tashkent',
  'Ekaterinburg Standard Time': 'Asia/Yekaterinburg',
  'Pakistan Standard Time': 'Asia/Karachi',
  'India Standard Time': 'Asia/Calcutta',
  'Sri Lanka Standard Time': 'Asia/Colombo',
  'Nepal Standard Time': 'Asia/Katmandu',
  'Central Asia Standard Time': 'Asia/Almaty',
  'Bangladesh Standard Time': 'Asia/Dhaka',
  'Omsk Standard Time': 'Asia/Omsk',
  'Myanmar Standard Time': 'Asia/Rangoon',
  'SE Asia Standard Time': 'Asia/Bangkok',
  'Altai Standard Time': 'Asia/Barnaul',
  'W. Mongolia Standard Time': 'Asia/Hovd',
  'North Asia Standard Time': 'Asia/Krasnoyarsk',
  'N. Central Asia Standard Time': 'Asia/Novosibirsk',
  'Tomsk Standard Time': 'Asia/Tomsk',
  'China Standard Time': 'Asia/Shanghai',
  'North Asia East Standard Time': 'Asia/Irkutsk',
  'Singapore Standard Time': 'Asia/Singapore',
  'W. Australia Standard Time': 'Australia/Perth',
  'Taipei Standard Time': 'Asia/Taipei',
  'Ulaanbaatar Standard Time': 'Asia/Ulaanbaatar',
  'Aus Central W. Standard Time': 'Australia/Eucla',
  'Transbaikal Standard Time': 'Asia/Chita',
  'Tokyo Standard Time': 'Asia/Tokyo',
  'North Korea Standard Time': 'Asia/Pyongyang',
  'Korea Standard Time': 'Asia/Seoul',
  'Yakutsk Standard Time': 'Asia/Yakutsk',
  'Cen. Australia Standard Time': 'Australia/Adelaide',
  'AUS Central Standard Time': 'Australia/Darwin',
  'E. Australia Standard Time': 'Australia/Brisbane',
  'AUS Eastern Standard Time': 'Australia/Sydney',
  'West Pacific Standard Time': 'Pacific/Port_Moresby',
  'Tasmania Standard Time': 'Australia/Hobart',
  'Vladivostok Standard Time': 'Asia/Vladivostok',
  'Lord Howe Standard Time': 'Australia/Lord_Howe',
  'Bougainville Standard Time': 'Pacific/Bougainville',
  'Russia Time Zone 10': 'Asia/Srednekolymsk',
  'Magadan Standard Time': 'Asia/Magadan',
  'Norfolk Standard Time': 'Pacific/Norfolk',
  'Sakhalin Standard Time': 'Asia/Sakhalin',
  'Central Pacific Standard Time': 'Pacific/Guadalcanal',
  'Russia Time Zone 11': 'Asia/Kamchatka',
  'New Zealand Standard Time': 'Pacific/Auckland',
  'UTC+12': 'Pacific/Wallis',
  'Fiji Standard Time': 'Pacific/Fiji',
  'Chatham Islands Standard Time': 'Pacific/Chatham',
  'UTC+13': 'Pacific/Enderbury',
  'Tonga Standard Time': 'Pacific/Tongatapu',
  'Samoa Standard Time': 'Pacific/Apia',
  'Line Islands Standard Time': 'Pacific/Kiritimati',
  Z: 'Etc/GMT'
};

/* ========================================================================== */
