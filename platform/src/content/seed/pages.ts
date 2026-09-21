import type {
  AboutLeadPastor,
  FaqItem,
  LivestreamPublic,
  MissionContent,
  SermonPlatform,
  ServiceOffering,
} from "@/content/types";

/** VERIFIED mission-kcmi.html */
export const missionContent: MissionContent = {
  vision: "Raising Kings To Build The Kingdom",
  missionParagraphs: [
    "Use all creative biblical means to bring people into relationship with Christ.",
    "Prayerfully disciple them, helping them to find their ministries and encouraging them to fulfill their calling.",
    "This we do one person at a time, then to the family, then to the community. Until a Nation is won for Christ!",
  ],
};

/** VERIFIED about-apostle-aikins.html — no added statistics */
export const aboutLeadPastor: AboutLeadPastor = {
  name: "Apostle Philemon Frank Aikins",
  role: "Senior Pastor and Founder",
  orgLine:
    "Kingdom Covenant Ministries International (Rehoboth Christian Center)",
  headquarters: "Port Harcourt, Nigeria",
  portraitSrc: "/media/about/apostle-aikins.webp",
  portraitAlt: "Apostle Philemon Frank Aikins",
  portraitWidth: 900,
  portraitHeight: 1350,
  bioParagraphs: [
    "Apostle Philemon Frank Aikins is the Senior Pastor and Founder of Kingdom Covenant Ministries International (Rehoboth Christian Center), with its headquarters in Port Harcourt, Nigeria.",
    "He has been in full-time ministry since March 1984. He has held several ministerial positions in the body of Christ, including being the Regional Overseer (East) of Christ Chapel International Churches, during which he pioneered, grew, and oversaw several churches. He has also served two terms as Deputy General Secretary of the Pentecostal Fellowship of Nigeria, Rivers State, and two terms as President of Friends in Gospel Ministries International. Additionally, he is the Commandant of CILCORP Chaplains Rivers Chapter.",
    "He is an internationally well-traveled conference speaker who brings a message of hope with passion, humor, and compassion. He is a member of the Board of Directors of Kingdom Global Ministries, headquartered in Dallas, USA, and serves as the African Director of the same. He is also a member of the board of trustees of FIGMI, House of Destiny Foundation, Smile Dental Foundation (SDF), and the Great Commission Advocacy and Mobilization Initiative (GCAMI).",
    "He is happily married to Rev. Prof. Elfleda Aikins, and they are blessed with four adult children: three boys and a girl.",
  ],
};

/** VERIFIED services.html */
export const serviceOfferings: ServiceOffering[] = [
  {
    id: "cell-fellowships",
    title: "Cell Fellowships",
    body: "Join a smaller group for fellowship, Bible study, and prayer. Connect with others in a supportive environment. Interested in joining a Cell Fellowship? Contact us and we will help you connect.",
    kind: "ministry",
    cta: {
      label: "Contact Us",
      href: "/contact?topic=cell-fellowship",
      external: false,
    },
  },
  {
    id: "service-teams",
    title: "Service Teams",
    body: "Use your gifts and talents to serve God and our community. Interested in serving with a KCMI team? Contact us to find out where you can get involved.",
    kind: "ministry",
    cta: {
      label: "Contact Us",
      href: "/contact?topic=service-team",
      external: false,
    },
  },
  {
    id: "media",
    title: "Sermons and media",
    body: "Watch and listen to messages from KCMI gatherings and Rehoboth Wells.",
    kind: "media",
    links: [{ label: "Sermons", href: "/sermons" }],
  },
  {
    id: "care",
    title: "Prayer and care requests",
    body: "Share a prayer request, ask for Pastoral Care, or request Welfare support through the KCMI website.",
    kind: "care",
    links: [
      {
        label: "Prayer requests",
        href: "/prayer",
        external: false,
      },
      {
        label: "Pastoral Care",
        href: "/pastoral-care",
        external: false,
      },
      {
        label: "Welfare support",
        href: "/welfare",
        external: false,
      },
    ],
  },
  {
    id: "testimonies",
    title: "Testimonies & Thanksgiving",
    body: "Testimonies and thanksgiving are shared during services. If you would like to get in touch about giving thanks with the church family, you are welcome to contact us.",
    kind: "ministry",
    cta: {
      label: "Contact Us",
      href: "/contact?topic=testimony",
      external: false,
    },
  },
];

export const servicesPageIntro =
  "Worship, cell fellowships, and service teams at Kingdom Covenant Ministries International. Headquarters times are listed below; other locations are on the Locations page.";

/**
 * VERIFIED sermons.html — no individual sermon catalog in legacy HTML.
 * Prefer outbound links / cards; avoid eager YouTube iframes.
 */
export const sermonPlatforms: SermonPlatform[] = [
  {
    id: "youtube",
    name: "YouTube",
    description:
      "Watch full sermons and special teachings on our official YouTube channel.",
    href: "https://www.youtube.com/@rehoboth-tv",
    external: true,
  },
  {
    id: "silverbird",
    name: "Silverbird · Rehoboth Wells",
    description:
      "Rehoboth Wells airs on Silverbird Television. Broadcast times will be listed here when they are confirmed.",
    href: "",
    external: false,
  },
  {
    id: "tiktok",
    name: "Apostle Frank on TikTok",
    description:
      "Sermon highlights and short clips from Apostle Philemon Frank Aikins.",
    href: "https://www.tiktok.com/@frank.aikins",
    external: true,
  },
  {
    id: "locations",
    name: "Join us in person",
    description: "Join us in person at any of our church locations.",
    href: "/locations",
    external: false,
  },
];

export const sermonsPageHeader = {
  headline: "KCMI sermons and Rehoboth Wells",
  sub: "Watch messages from Apostle Philemon Frank Aikins and KCMI gatherings on YouTube, Silverbird, and TikTok. Join us in person at a church location.",
  sectionTitle: "Where to watch and listen",
  emptyState:
    "Individual sermon recordings are published here when they are available. Until then, use the platforms below.",
} as const;

/**
 * VERIFIED facebook page share URL from livestream.html / site footers.
 * No verified facebook.com/.../videos/... URL exists in repo HTML.
 * Manual is_live seed for C2 — not connected to production MySQL.
 */
export const livestreamPublic: LivestreamPublic = {
  facebookPageUrl: "https://www.facebook.com/share/18bfxXA9Sj/?mibextid=LQQJ4d",
  isLive: false,
  heading: "KCMI Live Stream",
  notLiveMessage:
    "We're not live right now. Follow KCMI on Facebook for live services and recent broadcasts.",
  liveMessage:
    "A service is live now. Open Facebook to watch with us.",
};

/** VERIFIED faqs.html — seven items */
export const faqs: FaqItem[] = [
  {
    id: "born-again",
    question: "How can I be born again?",
    answerParagraphs: [
      "Being born again is a spiritual rebirth, a transformation that happens when you accept Jesus Christ as your Lord and Savior. Here are the steps:",
      "1. Acknowledge: Recognize that you are a sinner and need God's forgiveness. (Romans 3:23)",
      "2. Repent: Turn away from your sins and commit to living a life that pleases God. (Acts 3:19)",
      "3. Believe: Believe that Jesus Christ is the Son of God, that He died for your sins, and that He rose again. (John 3:16)",
      "4. Confess: Confess with your mouth that Jesus is Lord and believe in your heart that God raised Him from the dead. (Romans 10:9-10)",
      '5. Pray: Pray a simple prayer like this: "Dear God, I am a sinner. I believe Jesus died for my sins and rose again. I repent of my sins and ask You to forgive me. Come into my life, Lord Jesus, and be my Savior. Amen."',
      "If you've taken these steps, welcome to the family of God! We encourage you to find a Bible-believing church (like KCMI!) to grow in your faith.",
    ],
  },
  {
    id: "attend",
    question: "How can I attend a KCMI service?",
    answerParagraphs: [
      "We'd love to have you join us! You can attend a service at any of our KCMI branches. Please visit our Locations page to find the branch nearest to you, along with service times and directions.",
    ],
    links: [{ label: "Locations", href: "/locations" }],
  },
  {
    id: "watch-online",
    question: "How can I watch KCMI services online?",
    answerParagraphs: [
      "We provide online service viewing through these platforms:",
      "• Facebook: Follow Kingdom Covenant Ministries International on Facebook to watch live services and recent broadcasts.",
      "• Livestream page: Check our livestream page whenever you want to see whether a service is live.",
    ],
    links: [
      {
        label: "Facebook",
        href: "https://www.facebook.com/share/18bfxXA9Sj/?mibextid=LQQJ4d",
        external: true,
      },
      { label: "Livestream page", href: "/livestream" },
    ],
  },
  {
    id: "give",
    question: "How can I give to KCMI?",
    answerParagraphs: [
      "You can give to KCMI in several ways:",
      "• In Person: During our services, offering envelopes are available.",
      "• Online / Bank Transfer: Visit our Giving page for bank transfer details.",
      "The Giving page lists verified account names, banks, and account numbers. Thank you for your generous support!",
    ],
    links: [{ label: "Giving", href: "/giving" }],
  },
  {
    id: "prayer",
    question: "How can I submit a prayer request?",
    answerParagraphs: [
      "You can submit a prayer request on the Prayer page of this website. Our Prayer and Care team reviews requests shared there.",
    ],
    links: [
      {
        label: "Submit Prayer Request",
        href: "/prayer",
        external: false,
      },
    ],
  },
  {
    id: "contact",
    question: "How can I contact KCMI?",
      answerParagraphs: [
        "You can reach us through the following methods:",
        "• Email: contact@kcmi-rcc.org",
        "• Phone: +234 9134 44 8322",
        "• Visit our Contact Us page or Locations page.",
      ],
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Locations", href: "/locations" },
    ],
  },
  {
    id: "past-sermons",
    question: "Where can I find past sermons?",
      answerParagraphs: [
        "You can find past sermons on our YouTube channel, on Apostle Frank’s TikTok, and on the Sermons page.",
      ],
    links: [
      {
        label: "YouTube",
        href: "https://www.youtube.com/@rehoboth-tv",
        external: true,
      },
      { label: "Sermons page", href: "/sermons" },
    ],
  },
];
