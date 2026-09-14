export const PORTAL_URL = import.meta.env.VITE_PORTAL_URL?.trim() || "https://elhedaya.clemmonsislamiccenter.org/";

export const school = {
  name: "EL Hedaya Islamic School",
  organization: "Clemmons Islamic Center",
  address: "1435 Lake Cottage Road, Clemmons, NC 27012",
  phone: "336-766-0824",
  email: "cicenter1435@gmail.com",
  mission:
    "Islamic education gives children the opportunity to learn the concepts, values, and ethics of Islam while building a foundation for lifelong faith, knowledge, and service.",
};

export const programs = [
  {
    number: "01",
    title: "Quran & Tajweed",
    text: "Build confidence in Quran recitation through guided practice, Tajweed, and a consistent Sunday learning rhythm.",
  },
  {
    number: "02",
    title: "Islamic Studies",
    text: "Learn the essential concepts, values, and ethics of Islam in a structured environment designed for young learners.",
  },
  {
    number: "03",
    title: "Akhlaq & Character",
    text: "Connect knowledge to everyday conduct through respect, responsibility, good manners, and care for the community.",
  },
  {
    number: "04",
    title: "Faith & Identity",
    text: "Help students grow into confident Muslim community members who value learning, worship, and service.",
  },
];

export const policies = [
  {
    id: "dress",
    title: "Dress Code",
    short: "Modest Islamic clothing is required.",
    details: [
      "Female students are expected to wear hijab and loose, modest clothing.",
      "Male students are expected to wear clothing that covers the knees.",
      "Students who do not meet the dress requirements may be sent home.",
    ],
  },
  {
    id: "attendance",
    title: "Attendance & Punctuality",
    short: "Regular school begins promptly at 10:25 AM.",
    details: [
      "Students should arrive by 10:25 AM and be ready for class.",
      "Three late arrivals constitute one absence.",
      "Three unexcused absences may result in removal from the school roster.",
    ],
  },
  {
    id: "safety",
    title: "Safety & Snacks",
    short: "Simple guidelines help keep the school day safe.",
    details: [
      "Healthy snacks are allowed.",
      "Please do not bring food that requires heating.",
      "Drop-off and pickup use the first driveway behind the Masjid.",
    ],
  },
];
