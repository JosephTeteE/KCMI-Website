import type { Branch, ServiceTime } from "@/content/types";

/** HQ times also listed on services.html as Sunday 08:30 AM / Thursday 5:30 PM */
export const headquartersServiceTimes: ServiceTime[] = [
  { day: "Sunday", time: "08:30 am" },
  { day: "Thursday", time: "05:30 pm" },
];

/**
 * VERIFIED from public/location.html.
 * Conflicts (Togo phones, Accra display spacing, Kasoa missing times, HQ geo/hours JSON-LD)
 * are documented in phoneEvidenceNote / omitted fields — not silently “fixed”.
 */
export const branches: Branch[] = [
  {
    id: "headquarters",
    slug: "headquarters",
    name: "Headquarters",
    cityLabel: "Port Harcourt, Nigeria",
    country: "Nigeria",
    addressLines: [
      "Okuruola Wonodi Close",
      "Off Stadium Road, Port Harcourt",
      "Rivers State, Nigeria",
      "P.O Box 2595, Diobu",
    ],
    phones: [{ display: "+234 9134 44 8322", tel: "+2349134448322" }],
    serviceTimes: headquartersServiceTimes,
    mapsQuery:
      "KINGDOM COVENANT MINISTRIES INTERNATIONAL, Okuruola Wonodi Close, Port Harcourt",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=KINGDOM+COVENANT+MINISTRIES+INTERNATIONAL+Rumuola+Port+Harcourt",
  },
  {
    id: "rumuigbo",
    slug: "rumuigbo",
    name: "Rumuigbo Branch",
    cityLabel: "Rivers State, Nigeria",
    country: "Nigeria",
    addressLines: [
      "Iboloji Multipurpose Hall",
      "19, Egeonu Street",
      "Off Iboloji Street, Rumuigbo",
      "Rivers State, Nigeria",
    ],
    phones: [{ display: "+234 8036 96 3420", tel: "+2348036963420" }],
    serviceTimes: [
      { day: "Sunday", time: "08:30 am" },
      { day: "Wednesday", time: "05:30 pm" },
    ],
    mapsQuery:
      "Iboloji Multipurpose Hall, 19 Egeonu Street, Rumuigbo, Rivers State, Nigeria",
  },
  {
    id: "abia",
    slug: "abia",
    name: "Abia State",
    cityLabel: "Umuahia, Nigeria",
    country: "Nigeria",
    addressLines: [
      "Off National Museum Road",
      "By Nipost Office",
      "Umuagu, Umuahia",
      "Abia State, Nigeria",
    ],
    phones: [{ display: "+234 8052 78 0054", tel: "+2348052780054" }],
    serviceTimes: [
      { day: "Sunday", time: "08:30 am" },
      { day: "Thursday", time: "06:00 pm" },
    ],
    mapsQuery: "Umuagu, Umuahia, Abia State, Nigeria Nipost",
  },
  {
    id: "togo",
    slug: "togo",
    name: "Togo",
    cityLabel: "Lomé, Togo",
    country: "Togo",
    addressLines: [
      "Route Attiegou Cedeao Pres De La Creche",
      "Les Savoir",
      "Lome, Togo",
    ],
    phones: [{ display: "+228 94 43 38 85", tel: "+2289443385" }],
    serviceTimes: [
      { day: "Sunday", time: "08:00 am" },
      { day: "Tuesday", time: "06:00 pm" },
      { day: "Thursday", time: "06:00 pm" },
    ],
    phoneEvidenceNote:
      "Legacy location.html shows tel/display +2289443385 but data-phone +22897817263. Display/tel value used pending EXTERNAL VERIFICATION.",
    mapsQuery: "Route Attiegou Cedeao, Lome, Togo",
  },
  {
    id: "accra",
    slug: "accra",
    name: "Accra",
    cityLabel: "Accra, Ghana",
    country: "Ghana",
    addressLines: [
      "No.6 Mensah Kommy Lane, near 2nd Bus Station",
      "Opetekwe/Ebenezer Down, Dansoman Last Stop",
      "Accra, Ghana",
    ],
    phones: [{ display: "+233 543 340 415", tel: "+233543340415" }],
    emails: ["charamcy@gmail.com"],
    serviceTimes: [
      { day: "Sunday", time: "08:30 am" },
      { day: "Thursday", time: "06:00 pm" },
    ],
    phoneEvidenceNote:
      "Legacy display string used atypical spacing (+23 3543…); tel/data-phone +233543340415 used for dialing.",
    mapsQuery: "Mensah Kommy Lane, Dansoman, Accra, Ghana",
  },
  {
    id: "kasoa",
    slug: "kasoa",
    name: "Kasoa",
    cityLabel: "Kasoa, Ghana",
    country: "Ghana",
    addressLines: [
      "Behind Bennet Clinic",
      "CP Last Stop Kasoa",
      "Kasoa, Ghana",
    ],
    phones: [{ display: "+233 555 582 826", tel: "+233555582826" }],
    serviceTimes: [],
    mapsQuery: "Bennet Clinic, Kasoa, Ghana",
  },
  {
    id: "cape-coast",
    slug: "cape-coast",
    name: "Cape Coast",
    cityLabel: "Cape Coast, Ghana",
    country: "Ghana",
    addressLines: [
      "UCC - Campus Fellowship",
      "School of Business Guest House, Conference Room",
      "UCC, Cape Coast, Ghana",
    ],
    phones: [
      { display: "+233 247 463 818", tel: "+233247463818" },
      { display: "+233 541 418 841", tel: "+233541418841" },
      { display: "+233 553 146 404", tel: "+233553146404" },
    ],
    emails: ["ucckcmi@gmail.com"],
    serviceTimes: [
      { day: "Sunday", time: "01:00 pm" },
      { day: "Friday", time: "06:00 pm" },
    ],
    mapsQuery: "University of Cape Coast School of Business Guest House",
  },
];
