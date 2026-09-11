import type {
  AboutDocument,
  FaqsDocument,
  GlobalDocument,
  HomeDocument,
  SermonsPageDocument,
  ServicesDocument,
} from "@/content/website/schemas";

/** Verified fallbacks. Hub payloads overlay these; missing keys keep these values. */

export const defaultHomeDocument: HomeDocument = {
  heroKicker: "KCMI · Rehoboth Christian Center",
  heroHeadline: "Raising Kings To Build The Kingdom",
  heroSupporting:
    "Using every creative biblical means, we disciple individuals, strengthen families, and transform communities—until a nation is won for Christ!",
  heroPrimaryCtaLabel: "Plan a Visit",
  heroPrimaryCtaHref: "#worship",
  heroSecondaryCtaLabel: "Watch Live",
  heroSecondaryCtaHref: "/livestream",
  heroMediaId: null,
  welcomeEyebrow: "Discover KCMI",
  welcomeHeading: "Welcome to Kingdom Covenant Ministries International",
  welcomeBody:
    "We are committed to serving God faithfully, and we invite you to be part of this great mission. Discover ways to connect, grow, and serve with us.",
  welcomeMediaId: null,
  prayerHeading: "Prayer Requests",
  prayerVerse:
    "The effective, fervent prayer of a righteous man avails much.",
  prayerVerseReference: "James 5:16",
  prayerBody: [
    "We believe in the power of prayer and invite you to share your requests with us. Our dedicated prayer team is committed to lifting up your needs and concerns before the Lord.",
    "No matter what you're facing, know that you're not alone.",
  ],
  prayerCtaLabel: "Submit Prayer Request",
  prayerCtaHref: "https://forms.gle/gKTwNc9gNiVCWWrJ6",
  givingHeading: "Give to KCMI",
  givingVerse:
    "Whoever brings blessing will be enriched, and one who waters will himself be watered.",
  givingVerseReference: "Proverbs 11:25",
  givingCtaLabel: "Give Now",
  givingCtaHref: "/giving",
  sermonFallbackTitle: "Sermons & media",
  sermonFallbackDescription:
    "Watch and listen to messages from Rehoboth Wells and KCMI gatherings on our YouTube channel.",
  sermonFallbackCtaLabel: "Listen now",
  sermonFallbackCtaHref: "/sermons",
  sermonFallbackYoutubeUrl: "https://www.youtube.com/@rehoboth-tv",
  sermonFallbackYoutubeLabel: "YouTube · @rehoboth-tv",
  featuredProgramId: null,
  locationsHeading: "One church · Multiple locations",
  locationsSupporting:
    "Find a KCMI family near you — worship with us in person across our locations.",
  spotlightTakeoverEnabled: false,
  spotlightTakeoverMode: "once_per_browser",
  spotlightPromoVideoUrl: null,
  spotlightWindowStart: null,
  spotlightWindowEnd: null,
};

export const defaultAboutDocument: AboutDocument = {
  whoWeAre: [
    "Kingdom Covenant Ministries International (Rehoboth Christian Center) has its headquarters in Port Harcourt, Nigeria.",
    "Using every creative biblical means, we disciple individuals, strengthen families, and transform communities—until a nation is won for Christ!",
  ],
  vision: "Raising Kings To Build The Kingdom",
  missionParagraphs: [
    "Use all creative biblical means to bring people into relationship with Christ.",
    "Prayerfully disciple them, helping them to find their ministries and encouraging them to fulfill their calling.",
    "This we do one person at a time, then to the family, then to the community. Until a Nation is won for Christ!",
  ],
  leadershipName: "Apostle Philemon Frank Aikins",
  leadershipRole: "Senior Pastor and Founder",
  leadershipOrgLine:
    "Kingdom Covenant Ministries International (Rehoboth Christian Center)",
  leadershipHeadquarters: "Port Harcourt, Nigeria",
  leadershipPreview:
    "Apostle Philemon Frank Aikins is the Senior Pastor and Founder of Kingdom Covenant Ministries International (Rehoboth Christian Center), with its headquarters in Port Harcourt, Nigeria.",
  portraitMediaId: null,
  portraitAlt: "Apostle Philemon Frank Aikins",
  bioParagraphs: [
    "Apostle Philemon Frank Aikins is the Senior Pastor and Founder of Kingdom Covenant Ministries International (Rehoboth Christian Center), with its headquarters in Port Harcourt, Nigeria.",
    "He has been in full-time ministry since March 1984. He has held several ministerial positions in the body of Christ, including being the Regional Overseer (East) of Christ Chapel International Churches, during which he pioneered, grew, and oversaw several churches. He has also served two terms as Deputy General Secretary of the Pentecostal Fellowship of Nigeria, Rivers State, and two terms as President of Friends in Gospel Ministries International. Additionally, he is the Commandant of CILCORP Chaplains Rivers Chapter.",
    "He is an internationally well-traveled conference speaker who brings a message of hope with passion, humor, and compassion. He is a member of the Board of Directors of Kingdom Global Ministries, headquartered in Dallas, USA, and serves as the African Director of the same. He is also a member of the board of trustees of FIGMI, House of Destiny Foundation, Smile Dental Foundation (SDF), and the Great Commission Advocacy and Mobilization Initiative (GCAMI).",
    "He is happily married to Rev. Prof. Elfleda Aikins, and they are blessed with four adult children: three boys and a girl.",
  ],
};

export const defaultServicesDocument: ServicesDocument = {
  intro:
    "Worship, cell fellowships, and service teams at Kingdom Covenant Ministries International. Headquarters times are listed below; other locations are on the Locations page.",
  cellTitle: "Cell Fellowships",
  cellBody:
    "Join a smaller group for fellowship, Bible study, and prayer. Connect with others in a supportive environment.",
  cellCta: {
    label: "Join a Cell Fellowship",
    href: "https://forms.gle/ogHw37wRpx9HC2bs5",
  },
  teamsTitle: "Service Teams",
  teamsBody:
    "Use your gifts and talents to serve God and our community. Find a place to make a difference.",
  teamsCta: {
    label: "Join a Service Team",
    href: "https://forms.gle/Xo3rbm2rFaidrqCbA",
  },
  mediaTitle: "Sermons and media",
  mediaBody:
    "Watch and listen to messages from KCMI gatherings and Rehoboth Wells.",
  careTitle: "Prayer and care requests",
  careBody:
    "Prayer, counselling, welfare and celebration requests are available through the forms below.",
  careLinks: [
    {
      label: "Prayer request form",
      href: "https://forms.gle/gKTwNc9gNiVCWWrJ6",
      external: true,
    },
    {
      label: "Counselling request form",
      href: "https://forms.gle/L6DyfegmTCGHuSBk6",
      external: true,
    },
    {
      label: "Welfare request form",
      href: "https://forms.gle/NcScEq6WFDeBankw5",
      external: true,
    },
    {
      label: "Celebrations form",
      href: "https://forms.gle/QxiASWogkGFamvEJ8",
      external: true,
    },
  ],
};

export const defaultGlobalDocument: GlobalDocument = {
  contactEmail: "contact@kcmi-rcc.org",
  contactEmailLabel: "Email KCMI",
  contactPhoneDisplay: "+234 9134 44 8322",
  contactPhoneTel: "+2349134448322",
  contactIntro:
    "Write or call the church office. Prayer, counselling, and other pastoral-care requests use the forms on the Services page.",
  dfrHeading: "Daily Faith Recharge",
  dfrBody: "Short daily encouragement to strengthen your walk with Christ.",
  dfrSpotifyLabel: "Listen on Spotify",
  dfrSpotifyHref: "https://open.spotify.com/show/6xYjccKxPNSCbBHbnPiEQq",
  livestreamHeading: "KCMI Live Stream",
  livestreamNotLiveMessage:
    "We're not live right now. Follow KCMI on Facebook for live services and recent broadcasts.",
  livestreamLiveMessage: "A service is live now. Open Facebook to watch with us.",
  socialLinks: [
    { label: "YouTube", href: "https://www.youtube.com/@rehoboth-tv" },
    {
      label: "Facebook",
      href: "https://www.facebook.com/share/18bfxXA9Sj/?mibextid=LQQJ4d",
    },
    { label: "Instagram", href: "https://www.instagram.com/kcmiworldwide" },
    { label: "X (Twitter)", href: "https://twitter.com/kcmi_official" },
    {
      label: "Apostle Frank on TikTok",
      href: "https://www.tiktok.com/@frank.aikins",
    },
  ],
};

export const defaultFaqsDocument: FaqsDocument = {
  items: [
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
        'You can submit a prayer request through our online form. Click "Submit Prayer Request" and it will take you to a Google Form where you can share your request.',
      ],
      links: [
        {
          label: "Submit Prayer Request",
          href: "https://forms.gle/gKTwNc9gNiVCWWrJ6",
          external: true,
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
  ],
};

export const defaultSermonsPageDocument: SermonsPageDocument = {
  headline: "KCMI sermons and Rehoboth Wells",
  sub: "Watch messages from Apostle Philemon Frank Aikins and KCMI gatherings on YouTube, Silverbird, and TikTok. Join us in person at a church location.",
  sectionTitle: "Where to watch and listen",
  emptyState:
    "Individual sermon recordings are published here when they are available. Until then, use the platforms below.",
  platforms: [
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
      href: "https://silverbirdtv.com",
      external: true,
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
  ],
};
