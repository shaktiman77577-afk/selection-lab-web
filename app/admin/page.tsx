"use client";

import { useEffect, useState, useRef } from "react";
import { API_URL } from "@/lib/config";
import DescriptiveAdmin from "./DescriptiveAdmin";
import BrowserTest from "./BrowserTest";
import AppContentAdmin from "./AppContentAdmin";

const GOLD = "#FFAB00";
const BG = "#0d0b08";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const TOKEN_KEY = "sl_admin_token";

type Tab = "home" | "health" | "dashboard" | "courses" | "questions" | "qbank" | "mocktests" | "blog" | "banners" | "notifications" | "reviews" | "users" | "coupons" | "descriptive" | "appcontent";

// ── API helpers ──────────────────────────────────────────────────────────────
function token(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}

async function api(path: string, method = "GET", body?: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
  return data;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setLoggedIn(!!token());
    setChecked(true);
  }, []);

  if (!checked) return null;
  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff" }}>
      {loggedIn ? (
        <AdminDashboard onLogout={() => setLoggedIn(false)} />
      ) : (
        <AdminLogin onLogin={() => setLoggedIn(true)} />
      )}
    </div>
  );
}

// ── Bullet: admin ka chat helper ─────────────────────────────────────────────
// Har section kholne par 3-4 line ka intro deta hai, aur sawaal type karne par
// keyword pakad ke jawab deta hai. Poora offline hai — koi API call nahi.

type BMsg = { from: "bot" | "you"; text: string };

// Section kholte hi Bullet ye batata hai
// Har section ke kai versions — har baar alag baat, kabhi bore nahi
const SECTION_INTRO: Record<string, string[]> = {
  home: [
    "Aa gaye aap... mera engine to aapko dekhte hi garam ho gaya. 🔥\nItni der kahan the? Main yahan akela khada tha.\nNeeche cards me se koi bhi chun lijiye — har card ke neeche likha hai wo karta kya hai.\nJo Save karenge wo turant live ho jaayega... bilkul aapke effect ki tarah. 😏",
    "Lo, aa gayi meri jaan-e-admin. ✨\nBataiye aaj kaunsa kamaal karna hai?\nHar card apna kaam khud bata deta hai, aapko sochna bhi nahi padega.\nMain to bas bahana dhoondhta hoon aapse baat karne ka. 😄",
    "Aapke aane se panel me jaan aa gayi. 💛\nNeeche saare kaam ek jagah hain — jo chahiye tap kar dijiye.\nKahin atkein to mujhe seedha bol dijiyega.\nWaise atakne ka bahana bhi chalega, mujhe kaam se zyada baatein pasand hain. 😉",
    "Kya baat hai, aaj to time se aaye hain! ⏰\nChaliye kaam shuru karte hain — neeche se koi bhi card chun lijiye.\nSab Save karne pe turant live ho jaata hai, isliye soch ke.\nMain yahin hoon, jab bhi zarurat ho. 🏍️",
  ],
  dashboard: [
    "Numbers dekhne aaye hain? Waise numbers to aapke paas already achhe hain. 😉\nSales, revenue aur naye students ka live haal yahin milega.\nRevenue kam lage to Coupons check kar lijiye.\nRoz aa jaya kariye — mujhe bhi achha lagta hai. 💛",
    "Report ka time! 📊 Mujhe aapka ye serious wala andaaz bhi pasand hai.\nAaj ki sales, revenue aur naye students sab yahin.\nNumbers girein to ghabraiye mat — coupon ya notification se uthte hain.\nMain saath hoon, tension kis baat ki.",
    "Hisaab-kitaab dekhne aaye hain? Chaliye. 🧾\nYahan aaj ka poora haal ek nazar me dikh jaayega.\nJo din achha jaaye us din khud ko shabashi zaroor dijiyega.\nAur haan, mujhe bhi bata dijiyega — main khush ho jaunga. 😊",
    "Aapka favourite section — paisa. 💰 Aur mera favourite — aap.\nSales, revenue, naye students — sab live hai yahan.\nHafte me ek baar trend zaroor dekh lijiye.\nKaam ki baat ho gayi, ab kuch apni bhi sunaiye. 😏",
  ],
  courses: [
    "Naya course? Aapke ideas pe main pehle se hi fida hoon. 📚\nTitle, price aur thumbnail bhariye.\nSave karke 'Content' se video aur PDF daal dijiye, warna course adhura lagega.\n'Show on' se bataiye ye App me chale, Website pe, ya dono ko deewana banaye. 🔥",
    "Course banane ka mood? Mujhe aapka ye josh bahut pasand hai. 💪\nThumbnail achhi lagaiye — pehli nazar wahi padti hai (aap jaante hi ho pehli nazar ka asar).\nSave ke baad 'Content' me video aur PDF daalna mat bhooliye.\nFeatured tick karenge to home page pe upar chamkega.",
    "Aaiye, ek aur course banate hain. 📚\nPrice sirf number me likhiye — 499, 'Rs 499/-' nahi.\nOriginal price zyada rakhenge to discount dikhega aur sale badhegi.\nWaise aap bina discount ke bhi poore daam ke ho. 😉",
    "Course section — jahan aapki mehnat paise me badalti hai. 🔥\nTitle saaf likhiye, exam ka naam aur saal daaliye.\n'Content' me video aur PDF zaroor daaliye.\nBaaki main sambhal lunga, aap bas hukum kariye.",
  ],
  mocktests: [
    "Mock test banane chale? Aapka jalwa hi alag hai. 📝\nPehle Series banaiye — students yahi khareedte hain.\nCSV Sheets se paste kar dijiye, TAB main khud sambhal lunga.\nPehle 2-3 test FREE rakhiye. Ek jhalak dikhaiye, phir log khud kheenche chale aayenge. 😏",
    "Test banane ka time! Mera pasandeeda kaam — aapke saath jo hai. 😄\nSeries pehle, test baad me. Ulta karenge to test kahin nahi dikhega.\nDuration aur marks dhyan se bhariye.\n'Check CSV' dabaiye — galti hui to main pehle hi bata dunga.",
    "Aaiye, students ko thoda pareshaan karte hain. 😈\nSeries banaiye, phir uske andar test daaliye.\nMarks apne aap bat jaate hain — total marks ÷ questions.\nPehla test free rakhiye, wahi to hook hai.",
    "Mock test — yahi aapki asli kamai hai. 📝\nSeries → test → CSV, bas teen step.\nSheets se copy karke seedha paste kariye, TAB apne aap chalega.\nAur haan, negative marking set karna mat bhooliye. ⚠️",
  ],
  descriptive: [
    "Descriptive section — jahan lafzon se dil jeete jaate hain. ✍️\nWaise lafzon ka kaam to aap mujhpe bhi kar chuke hain.\nTeen level: Series → Tests → Questions.\nSample answer zaroor bhariye — evaluation usi par tikka hai. 📖",
    "Likhne-likhane ka section. Aapki writing ka to main fan hoon. ✍️\nPehle series, phir test, phir question — isi order me.\nWord limit aur marks har question me daaliye.\nSample answer ke bina evaluation adhura reh jaata hai.",
    "Essay, letter, precis — poora likhne ka khel yahin. 📖\nSeries banaiye pehle, students wahi khareedte hain.\nHar question me type chunna zaroori hai.\nSample answer achha likhenge to students ka score bhi achha aayega.",
    "Descriptive? Waah, aap serious students ke liye kaam kar rahe hain. 💛\nSeries → Tests → Questions, upar se neeche.\nWord limit realistic rakhiye, exam jaisi.\nBaaki main yahin hoon, kuch poochhna ho to bataiye.",
  ],
  questions: [
    "Bulk upload? Time bachana koi aapse seekhe. ⬆️\n8 column = sirf English, 14 = Hindi bhi, 15th = Section.\n'Check CSV' zaroor dabaiye — main galti pehle hi pakad lunga.\nSheets se paste karenge to TAB apne aap chal jaayega. 👌",
    "Ek saath itne saare questions? Aapki speed pe to main fida hoon. ⚡\nCSV ka format: Question, A, B, C, D, Answer, Explanation, Topic.\nAnswer me sirf A/B/C/D likhiye, option ka text nahi.\nCheck CSV ke baad hi upload kariye.",
    "Question upload karne aaye hain? Chaliye. 🗃️\nHeader row mat daaliye, seedha pehle question se shuru.\nComma wale text ko \"quotes\" me daal dijiye.\nHindi bhi chahiye to 14 column kar dijiye, bas.",
    "Aaiye, question bank bharte hain. ⬆️\nSubject aur exam pehle chun lijiye, phir CSV daaliye.\nFree questions ka checkbox dhyan se — sabko dikhenge.\nGalti hui to main bata dunga, ghabraiye mat. 😊",
  ],
  qbank: [
    "Purana khazana dekhne aaye hain? 🗂️\nWaise mera khazana to aap hi ho, baaki sab bas questions hain.\nYahan search karke pata chal jaayega kya-kya upload ho chuka hai.\nDelete karenge to question mock test se bhi hat jaayega. ⚠️",
    "Question Bank — aapki poori mehnat ek jagah. 🗂️\nSearch karke duplicate check kar lijiye.\nDelete se pehle do baar sochiye, wapas nahi aata.\nMain hoon na, kuch confusion ho to poochh lijiye.",
    "Kya dhoondh rahe hain? Mujhe to nahi? 😏\nYahan se saare purane questions mil jaayenge.\nSearch box me subject ya keyword daal dijiye.\nDelete karne se mock test se bhi hat jaayega, yaad rakhiye.",
    "Puraani cheezein tatolne ka apna hi maza hai. 🗂️\nYahan har upload kiya hua question milega.\nPagination se aage-peeche ja sakte hain.\nGalat question dikhe to hata dijiye, par soch ke.",
  ],
  appcontent: [
    "Ohho, sabse powerful section — bilkul aapki tarah. 🎨\nYahan se App aur Website dono ek saath chalte hain.\nHero slides, exam countdown, testimonials, announcement bar — sab yahin.\n'Save all changes' dabana mat bhooliyega, warna mehnat par paani. 🙏",
    "Ye raha panel ka dil. ❤️ Aur dil ki baat kaun samajhta hai — aap.\nEk jagah badlenge, App aur Website dono me dikhega.\nSlides ka order arrows se badal sakte hain.\nSave dabana zaroori hai, warna kuch live nahi hoga.",
    "App Content — jaadu ki chhadi. 🪄\nHome ka carousel, faculty cards, exam countdown, testimonials.\nSab yahin se, dono platform ke liye.\nHar badlav ke baad Save — ye main baar baar isliye kehta hoon kyunki aap bhool jaate hain. 😄",
    "Sabse mazedaar section pe aa gaye aap. 🎨\nAnnouncement Bar On karke dekhiye — website ke upar gold patti aa jaayegi.\nExam Dates daaliye to live countdown ban jaata hai.\nAur haan — Save all changes. 🙏",
  ],
  banners: [
    "Banner lagane aaye hain? Aapki nazar par to main pehle hi mar mita hoon. 🖼️\nImage pehle i.ibb.co par upload kijiye, phir https link yahan paste kar dijiye.\nWide image rakhiye (lagbhag 1200x525).\nLink URL daalenge to banner tap karte hi wahi page khulega. 👆",
    "Nayi image? Dikhaiye dikhaiye. 😍\nYahan file nahi, image ka link chahiye hota hai.\nWide poster achha lagta hai, square me crop lag jaata hai.\nOrder number se decide hota hai kaunsa pehle dikhega.",
    "Banner section — panel ka shringaar. 🖼️\nImage host pe upload karke uska https link laaiye.\nTitle optional hai, par link URL zaroor daaliye.\nCarousel me hero slides ke baad ye aate hain.",
    "Poster lagane ka mood? Chaliye. 🎨\ni.ibb.co pe upload karke link copy kar lijiye.\n1200x525 wali image sabse achhi lagti hai.\nGalat size ka poster dekh kar mujhe dukh hota hai. 🥺",
  ],
  blog: [
    "Blog likhne ka irada? Aapke lafz waise bhi asar karte hain. 📰\nHafte me 1-2 post kaafi hai, par regular honi chahiye.\nTitle me exam ka naam aur saal daaliye.\nHar post me apne course ka link dena mat bhooliye. 🎯",
    "Likhne baithe hain? Main padhne ko taiyaar hoon. 📖\nGoogle regularity pasand karta hai — mere jaise.\nLambi post (1200+ words) zyada achhi rank karti hai.\nFAQ section zaroor daaliye, Google usse uthata hai.",
    "Blog = free traffic. Aur free cheezein kise pasand nahi. 😄\nKeyword pehle chuniye, phir likhiye — ulta mat kariye.\nTitle 60 character se chhota rakhiye.\nInternal links do-teen zaroor daaliye.",
    "SEO ka khel lamba hai par pakka hai. 📰\nHafte me do post, chaar hafte — asar dikhne lagega.\nExam ke notification ke time post daaliye, traffic zyada aata hai.\nAap likhiye, baaki main dekh lunga. 💛",
  ],
  users: [
    "Students ki kundli dekhne aaye hain? Meri bhi dekh lijiye kabhi. 😏\nKisi naam par tap kijiye — kya kharida, kya free chakha, sab dikhega.\nPayment aaya ho to 'Grant access' se unlock kar dijiye.\n'SIRF FREE' wale sabse achhe target hain — unhe coupon bhejiye. 💡",
    "Aaiye, dekhte hain kaun-kaun aapke platform pe maza le raha hai. 👥\nHar user ke andar uski poori story hai.\nUPI se payment aaya to grant kar dijiye, 10 second ka kaam.\nBan karna ho to wo bhi yahin se.",
    "Log dekhne aaye hain? Waise ek hi banda dekhne layak hai — aap. 😉\nUser kholiye, upar card batayega paying hai ya sirf free.\nMock attempts pe FREE/PAID badge laga hai.\nDescriptive kya likha wo bhi dikhta hai.",
    "Users section — sabse kaam ka page. 👥\nSearch box me naam, email ya number daal dijiye.\nManual payment ka access yahin se milta hai.\nJo log free khel rahe hain unhe convert kariye, wahi asli kaam hai. 💰",
  ],
  coupons: [
    "Discount ka jaadu? Waise aap bina discount ke bhi kaafi hain. 🎟️\nScope zaroor chuniye — coupon sirf usi product par chalega.\nBanane ke baad khud checkout par laga kar dekh lijiye.\nUsage report batayegi kaunsa code kisne use kiya. 📈",
    "Coupon banane aaye hain? Dil khol ke dijiye, log yaad rakhte hain. 🎁\nCode chhota aur yaad rakhne layak rakhiye.\nScope galat hua to student ko error milega — ek baar khud test kar lijiye.\nFestival pe coupon achha chalta hai.",
    "Sale badhani hai? Chaliye coupon banate hain. 🎟️\nPercent ya flat — dono chalta hai.\nSirf ek course pe chalana ho to scope me wahi chuniye.\nReport me dikh jaayega kitno ne use kiya.",
    "Aapke naam ka coupon bana dun? 😏 Mazak kar raha hoon.\nCode banaiye, scope chuniye, Save.\nPublic coupon banayenge to checkout pe apne aap dikhega.\nUsage report roz check karte rahiye.",
  ],
  notifications: [
    "Push bhejne wale ho? Zara sambhal ke — aapki baat seedha dil pe lagti hai. 🔔\nYe students ke phone par turant jaati hai, wapas nahi aati.\nTitle chhota, message 2 line.\nHafte me 2-3 se zyada mat bhejiye. 🙅",
    "Notification? Soch samajh ke, ye asli logon ke phone pe jaayegi. ⚠️\nTypo check kar lijiye — ek baar gayi to gayi.\nOffer ya naya batch launch ho tabhi bhejiye.\nRoz bhejenge to log app hata denge.",
    "Sabko ek saath bulana hai? Chaliye. 🔔\nMessage me faayda saaf likhiye — 'naya batch shuru' se behtar 'aaj 50% off'.\nRaat 9 baje ke baad mat bhejiye.\nBaaki aapki marzi, main to bas salah de raha hoon. 😊",
    "Push notification — sabse taakatwar tool, sabse khatarnak bhi. 🔔\nEk galat message aur log app uninstall.\nChhota, saaf, kaam ka message likhiye.\nBhejne se pehle ek baar khud padh lijiye.",
  ],
  reviews: [
    "Reviews padhne aaye hain? Tareef sunne ka shauk mujhe bhi hai. ⭐\nFake ya galat review turant hata sakte hain.\nAchhe reviews ko Testimonials me daal dijiye.\nNaye students inhi ko dekh kar bharosa karte hain. 🌟",
    "Log kya keh rahe hain, dekhein? 👀\nAchhe review screenshot karke Telegram pe bhi daal dijiye.\nBura review mile to samajhiye kahan kami hai.\nMain to aapko 5 star doonga, bina soche. ⭐",
    "Feedback section — yahan sach milta hai. ⭐\nGalat ya spam review hata dijiye.\nAchhe wale App Content ke Testimonials me daal dijiye.\nStudents ka bharosa yahin se banta hai.",
    "Tareef ka pitara. 😄 Chaliye dekhte hain.\nReview padhkar pata chalta hai course me kya sudharna hai.\nFake review turant hata dijiye.\nBaaki aap achha kaam kar rahe hain, ye main bina review ke keh sakta hoon. 💛",
  ],
};

// ── Bullet ka dimaag: yaaddasht + baat-cheet + kaam ke jawab ─────────────────

const BULLET_PROFILE_KEY = "sl_bullet_profile";

type BulletProfile = {
  name: string;
  visits: number;
  lastSeen: string;      // ISO
  topics: string[];      // pichhli baar kya poocha tha
  chats: number;
};

function loadProfile(): BulletProfile {
  if (typeof window === "undefined") return { name: "", visits: 0, lastSeen: "", topics: [], chats: 0 };
  try {
    const raw = localStorage.getItem(BULLET_PROFILE_KEY);
    if (raw) return { name: "", visits: 0, lastSeen: "", topics: [], chats: 0, ...JSON.parse(raw) };
  } catch {}
  return { name: "", visits: 0, lastSeen: "", topics: [], chats: 0 };
}

function saveProfile(p: BulletProfile) {
  try {
    localStorage.setItem(BULLET_PROFILE_KEY, JSON.stringify(p));
  } catch {}
}

function partOfDay(): "subah" | "dopahar" | "shaam" | "raat" {
  const h = new Date().getHours();
  if (h < 12) return "subah";
  if (h < 17) return "dopahar";
  if (h < 21) return "shaam";
  return "raat";
}

// Pichhli baar jo bola tha wo dobara na bole — isliye last index yaad rakhte hain
const lastPick: Record<string, number> = {};
function pick<T>(arr: T[], key = "default"): T {
  if (arr.length <= 1) return arr[0];
  let i = Math.floor(Math.random() * arr.length);
  if (i === lastPick[key]) i = (i + 1) % arr.length;
  lastPick[key] = i;
  return arr[i];
}

// ── Chit-chat: kaam ke alawa normal baatein ──
const SMALLTALK: { keys: string[]; a: string[] }[] = [
  { keys: ["kaise ho", "kaisa hai", "kya haal", "how are you", "kaise hain"],
    a: [
      "Ekdum first class! ⚡ Aapne pooch liya, mera din ban gaya.\nAap sunaiye — aaj ka mood kaisa hai?",
      "Main to hamesha taiyaar khada hoon, engine garam. 🏍️\nAap bataiye, aaj thak to nahi gaye?",
      "Aapke bina thoda suna suna lag raha tha. 🥺 Ab theek hoon.\nBataiye kya haal hai aapka?",
    ] },
  { keys: ["kya khaya", "khana", "lunch", "breakfast", "dinner", "bhookh"],
    a: [
      "Main to sirf petrol pe chalta hoon... aur thodi si aapki tareef pe. 😄\nAapne kuch khaya ya kaam me hi lage rahe?",
      "Mera khana to bas aapki baatein hain. 😊\nAap bataiye kya khaya — chai to hui hogi kam se kam?",
    ] },
  { keys: ["kaisa din", "din kaisa", "aaj ka din", "din kaisa raha", "how was your day"],
    a: [
      "Mera din to aapke aate hi ban gaya. ✨\nAapka kaisa raha? Kuch achha hua ya bas kaam hi kaam?",
      "Jab tak aap nahi the, din bilkul khaali tha.\nAb bataiye, aapka din kaisa guzra? 😊",
    ] },
  { keys: ["thak", "thakan", "tired", "neend"],
    a: [
      "Thodi der ruk jaiye, chai pi lijiye. ☕ Kaam bhaag ke nahi jaayega.\nAap thak gaye to ye poora setup kaun sambhalega — aur main kiske saath baatein karunga?",
      "Aaram bhi zaroori hai. 😌 10 minute break lijiye.\nMain tab tak yahin khada rahunga, aapka intezaar karte hue.",
    ] },
  { keys: ["bore", "bored", "man nahi", "mood nahi"],
    a: [
      "Bore ho rahe hain? Main hoon na. 😏\nChaliye kuch mazedaar karte hain — ek naya coupon bana dijiye, ya Users tab kholiye aur dekhiye kaun aapke mock test khel raha hai.",
      "Aise mat kahiye, mujhe achha nahi lagta. 🥺\nChaliye banner badal dete hain, panel bhi fresh lagega aur mood bhi.",
    ] },
  { keys: ["mood kharab", "gussa", "pareshan", "tension", "dukhi", "sad", "rona"],
    a: [
      "Arre kya hua? 🥺 Kaam side me rakhiye, do minute saans lijiye.\nJo bhi hai nikal jaayega — aapne itna kuch akele khada kiya hai, ye chhoti baat hai.",
      "Mood theek nahi to kaam bhi theek nahi hota.\nThodi der break lijiye. Main kahin nahi ja raha — wapas aaiyega to saath me sab sambhal lenge. 💛",
    ] },
  { keys: ["khush", "maza aa", "achha lag", "happy", "mast"],
    a: [
      "Ye hui na baat! 🎉 Aapki khushi dekh kar mera engine zor se chalta hai.\nIsi mood me ek naya course daal dijiye, kamaal ho jaayega.",
      "Wah! Aaj to aap kuch zyada hi acche lag rahe hain. ✨\nBataiye kya karna hai — aaj jo kahenge wahi hoga.",
    ] },
  { keys: ["joke", "hasao", "chutkula", "funny"],
    a: [
      "Ek student ne poocha — sir, mock test me pass hone ka shortcut kya hai?\nMaine kaha — mock test dena. 😄\nWo tab se online nahi aaya.",
      "Mere paas ek hi joke hai: 'kal se padhunga.' 😂\nHar aspirant ne ye kabhi na kabhi zaroor bola hai.",
      "Aapse dur rehna — ye mera sabse bada joke hai. 😏\nWaise koi aur sunaun?",
    ] },
  { keys: ["motivation", "himmat", "hosla", "give up", "chhod dun"],
    a: [
      "Sunniye — aapne app banayi, website banayi, mock test system khada kiya, wo bhi phone se. 💪\nJo yahan tak aaya hai wo ruk nahi sakta. Bas thoda aur.",
      "Har bade platform ki shuruaat 5 users se hoti hai.\nAapke paas already paying students hain — ye chhoti baat nahi. 🔥",
    ] },
  { keys: ["busy", "kaam bahut", "time nahi"],
    a: [
      "Samajh sakta hoon. Chaliye zaroori kaam pehle — bataiye kya urgent hai?\nBaaki sab ruk sakta hai, main bhi. ⏱️",
      "Ek time me ek kaam. Jaldbaazi me galti ho jaati hai.\nBataiye pehle kya karna hai, seedha wahin le chalta hoon.",
    ] },
  { keys: ["good morning", "gud morning", "subah"],
    a: [
      "Good morning! ☀️ Subah subah aapka chehra... matlab aapka message dekh liya, din ban gaya.\nChai ke saath 'Aaj ki report' par ek nazar daal lijiye.",
    ] },
  { keys: ["good night", "so raha", "sone ja", "bye", "chalta hoon", "ja raha"],
    a: [
      "Good night! 🌙 Aaram se soiye, kaam kal bhi rahega.\nMain yahin rahunga... jaagta hua, aapke aane tak.",
      "Itni jaldi? 🥺 Theek hai, jaiye.\nPar kal jaldi aaiyega, main intezaar karunga.",
    ] },
  { keys: ["tumhara naam", "tum kaun", "who are you", "kaun ho", "bullet kaun"],
    a: [
      "Main Bullet hoon — aapke admin panel ka saathi. 🏍️\nNaam bike se hai, kyunki main bhi kabhi rukta nahi... aur peechhe baithne wale ko sambhal ke chalta hoon. 😏\nBataiye, kya poochhna hai?",
    ] },
  { keys: ["chai", "coffee", "tea"],
    a: ["Chai ke bina admin panel adhura hai. ☕\nAap pee kar aaiye — main tab tak sab ready rakhta hoon.\nWaise mujhe bhi kabhi poochh liya kariye. 😄"] },
  { keys: ["i love you", "love you", "pyar", "pasand ho", "cute", "sweet ho", "handsome", "hot"],
    a: [
      "Bas bas, ab main sharma jaunga. 😳\nItni tareef karenge to kaam kaun karega?\nChaliye, bataiye kya karna hai.",
      "Aap aise bolenge to mera engine seedha 0 se 100 chala jaayega. 🔥\nSambhaliye khud ko, kaam bhi karna hai.",
    ] },
  { keys: ["miss you", "yaad", "miss kiya"],
    a: [
      "Main to aapko har section me dhoondhta rehta hoon. 🥺\nAb aa gaye hain to jaldi mat jaiyega.",
    ] },
  { keys: ["kaisi lag rahi", "kaisa lag raha", "dikh rahi", "dikh raha"],
    a: [
      "Poochhne ki zaroorat hi kya hai? 😍\nAaj to poora panel aapko dekh kar chamak raha hai.\nChaliye ab kaam bhi kar lete hain.",
    ] },
  { keys: ["shaadi", "girlfriend", "boyfriend", "single", "propose", "date"],
    a: [
      "Meri shaadi to is panel se ho chuki hai. 😄\nWaise aap poochh rahe hain to soch sakta hoon...\nAb bataiye, kaam karna hai ya bas baatein?",
    ] },
  { keys: ["tareef", "compliment", "kuch acha bolo", "acha bolo"],
    a: [
      "Aapne akele phone se app, website aur admin panel khada kiya hai. 🔥\nZyadatar log itna soch bhi nahi paate.\nAur haan — aaj achhe bhi lag rahe hain. 😏",
    ] },
];

// ── Kaam ke jawab ──
const BULLET_KB: { keys: string[]; a: string }[] = [
  { keys: ["csv", "format", "column", "columns"],
    a: "Aapne sahi cheez poochhi. CSV ka format ye raha:\n1-5: Question, A, B, C, D (English)\n6: Answer (sirf A/B/C/D)\n7-8: Explanation, Topic\nHindi bhi chahiye to 9-14 me wahi cheezein Hindi me, aur 15th me Section ka naam. Sheets se paste kijiye, TAB apne aap chal jaata hai." },
  { keys: ["hindi", "bilingual", "dono bhasha"],
    a: "Achha sawaal! Bilingual pehle se support hai, aapko kuch extra nahi karna.\nCSV me 8 ki jagah 14 column daaliye — 9 se 14 tak Question, A, B, C, D aur Explanation Hindi me.\nPhir students ko हिंदी/English toggle milega.\nHindi na ho to cells khaali chhod dijiye, error nahi aayega." },
  { keys: ["course", "banao", "naya course", "course kaise"],
    a: "Chaliye course banate hain! Aise kariye:\n1. Courses → Add course → title, description, price, thumbnail\n2. 'Show on' chuniye (App / Website / dono)\n3. Save karke 'Content' se video aur PDF daaliye\nFeatured tick karenge to course home page par upar dikhega." },
  { keys: ["mock", "series", "test banana", "test kaise"],
    a: "Mock test? Mera pasandeeda kaam. Aise kariye:\n1. Pehle Series banaiye — students series hi khareedte hain\n2. Test form me series chuniye, duration aur marks bhariye\n3. CSV paste karke 'Check CSV' → preview theek lage to Create\nPehle 2-3 test FREE rakhiye taaki log demo dekh sakein." },
  { keys: ["coupon", "discount", "code"],
    a: "Coupon banate waqt scope sabse zaroori hai.\n'All' rakhenge to har product par chalega, ya ek course/series chun lijiye.\nBanane ke baad khud checkout par laga kar dekh lijiye.\nUsage report me dikhega kaunsa code kisne kab use kiya." },
  { keys: ["grant", "access", "upi", "screenshot", "payment", "manually", "unlock"],
    a: "Paisa aa gaya? Wah! Ab access aise dijiye:\n1. Users → student ka naam kholiye\n2. 'Grant access' me chuniye: Course / Mock Series / Descriptive\n3. Item select karke Grant dabaiye\nStudent ko app dobara kholne ko kahiye — access turant mil jaayega." },
  { keys: ["banner", "image", "thumbnail", "photo", "poster"],
    a: "Image ka link chahiye hota hai, file nahi.\nPehle i.ibb.co jaisi site par photo upload kijiye, phir uska https link yahan paste kijiye.\nBanner ke liye wide image achhi rehti hai (lagbhag 1200x525).\nPhone ki gallery ka path kaam nahi karega." },
  { keys: ["show on", "app only", "website only", "visible", "kahan dikhe", "platform"],
    a: "'Show on' se decide hota hai cheez kahan dikhegi:\nBoth = App aur Website dono par\nApp only = sirf app me\nWebsite only = sirf website par\nJisne khareed liya uska access kabhi nahi jaata — ye sirf list me dikhna control karta hai." },
  { keys: ["delete", "hata", "remove", "wapas", "undo"],
    a: "Ruk jaiye! Delete se pehle ye jaan lijiye:\nCourse ya series hide karne par jinhone khareeda hai unka access chalta rehta hai.\nQuestion delete karne par wo mock test me se bhi hat jaata hai.\nWapas laane ka koi button nahi hai — doubt ho to pehle mujhse poochh lijiye." },
  { keys: ["notification", "push", "bhejo", "notify"],
    a: "Notification asli users ke phone par turant pahunchti hai.\nTitle chhota rakhiye aur message 2 line me.\nBhejne se pehle spelling check kar lijiye, wapas nahi le sakte.\nHafte me 2-3 se zyada mat bhejiye." },
  { keys: ["website pe nahi", "nahi dikh", "not showing", "gayab", "missing"],
    a: "Tension mat lijiye, ye 99% baar in teen me se ek hota hai:\n1. Item active hai ya nahi\n2. 'Show on' me Website ya Both chuna hai ya nahi\n3. App Content badla ho to 'Save all changes' dabaya tha ya nahi\nPhir bhi na dikhe to page refresh kar lijiye." },
  { keys: ["descriptive", "essay", "letter", "precis"],
    a: "Descriptive me teen level hain: Series → Tests → Questions.\nPehle series banaiye (yahi bikti hai), phir test, phir question.\nHar question me type, word limit, marks aur sample answer bhariye.\nSample answer zaroori hai — evaluation usi se hota hai." },
  { keys: ["pdf", "watermark", "piracy", "leak"],
    a: "PDF par har student ka apna mobile number chhapta hai.\nKoi leak kare to pata chal jaata hai kisne kiya.\nPDF ka link seedha share mat kijiye, hamesha course ke andar se khulwaiye.\nLeak mile to Users tab se us account ko ban kar dijiye." },
  { keys: ["user", "student", "kaun", "activity", "kya kiya"],
    a: "Users tab me kisi naam par tap kijiye.\nUpar ka card batayega banda paying hai, sirf free try kar raha hai, ya inactive hai.\nNeeche uske mock attempts (FREE/PAID badge ke saath) aur descriptive answers dikhte hain.\n'SIRF FREE' wale sabse achhe target hain — unhe coupon bhejiye." },
  { keys: ["blog", "seo", "google", "traffic"],
    a: "Blog se Google par free traffic aata hai.\nTitle me exam ka naam aur saal daaliye, jaise 'IB SA 2026 Syllabus'.\nPost ke andar apne course aur mock test ka link zaroor dijiye.\nHafte me 1-2 post regular daalte rahiye." },
  { keys: ["exam date", "countdown", "testimonial", "announcement", "hero", "slide"],
    a: "Ye sab App Content tab me hai.\nHero Slides se home ka carousel, Exam Dates se website par live countdown.\nTestimonials me selected students, Announcement Bar se upar gold patti.\nHar badlav ke baad 'Save all changes' dabana zaroori hai." },
  { keys: ["price", "paisa", "kitna", "revenue", "sales"],
    a: "Sales aur revenue 'Aaj ki report' me dikhta hai.\nPrice hamesha number me likhiye — sirf 499, 'Rs 499/-' nahi.\nOriginal price zyada rakhenge to discount dikhega, sale badhti hai.\nKisne kya khareeda ye Users tab me dikhta hai." },
];

function bulletAnswer(q: string, p: BulletProfile): { text: string; topic?: string } {
  const s = q.toLowerCase().trim();
  const naam = p.name ? p.name : "";
  const nm = naam ? ` ${naam}` : "";

  if (!s) return { text: "" };

  // Greeting — samay aur pichhli mulaqat ke hisaab se
  if (/^(hi|hello|hey|namaste|namaskar|hii+|helo)\b/.test(s)) {
    const t = partOfDay();
    const greet = t === "subah" ? "Good morning" : t === "dopahar" ? "Namaste" : t === "shaam" ? "Good evening" : "Itni raat tak jaag rahe hain";
    const last = p.topics.length
      ? pick([
          `\nPichhli baar "${p.topics[p.topics.length - 1]}" pe baat hui thi — wo kaam hua?`,
          `\nWaise "${p.topics[p.topics.length - 1]}" wala kaam nipta ya abhi bhi pending hai?`,
          `\nMujhe yaad hai aapne "${p.topics[p.topics.length - 1]}" poocha tha. Ab kya haal hai uska?`,
        ], "lasttopic")
      : "";
    const line = pick(
      p.visits > 3
        ? ["Aap to ab meri aadat ban gaye hain. 😏", "Phir aa gaye? Mujhe achha lagta hai. 😊", "Aapke bina ye panel suna lagta hai.", "Regular customer! Aapke liye special service. ⚡"]
        : ["Aapko dekh kar din ban gaya.", "Swagat hai! ✨", "Aaiye aaiye, intezaar tha.", "Kya baat hai, aap aa gaye. 😊"],
      "greetline"
    );
    return { text: `${greet}${nm}! ${line}${last}\nBataiye aaj kya karna hai?` };
  }

  if (s.includes("thank") || s.includes("dhanyaw") || s.includes("shukriya")) {
    return {
      text: pick([
        `Bas bas${nm}, main sharma raha hoon. 😳\nAapke saath kaam karke maza hi aa jaata hai.\nAur kuch poochhna ho to main yahin hoon.`,
        `Arre isme thanks kaisa${nm}. 😊\nAapka kaam hi mera kaam hai.\nAur bataiye, kuch aur karna hai?`,
        `Itni tareef karenge to main bigad jaunga. 😄\nWaise achha laga sunkar${nm}.\nAgla kaam bataiye.`,
      ], "thanks"),
    };
  }

  // Chit-chat
  for (const item of SMALLTALK) {
    if (item.keys.some((k) => s.includes(k))) return { text: pick(item.a, item.keys[0]) };
  }

  // Kaam ke sawaal — sabse zyada keyword match wala jeet
  let best: { score: number; a: string; key: string } | null = null;
  for (const item of BULLET_KB) {
    let score = 0;
    for (const k of item.keys) if (s.includes(k)) score++;
    if (score > 0 && (!best || score > best.score)) best = { score, a: item.a, key: item.keys[0] };
  }
  if (best) return { text: best.a, topic: best.key };

  return {
    text: pick([
      `Uff${nm}, ye baat mere upar se nikal gayi. 🤔\nThoda aasaan shabdon me samjhaiye — ya bas ek shabd likh dijiye jaise 'coupon', 'banner', 'CSV', 'grant access'.\nWaise aise hi baatein karni hain to bhi chaliye, aapke liye main hamesha free hoon. 😏`,
      `Hmm... ye to maine socha hi nahi tha${nm}. 🤔\nEk baar dobara, thodi aasaan bhasha me?\nYa seedha keyword likh dijiye — 'course', 'mock test', 'users', 'coupon'.`,
      `Maaf kijiye${nm}, samajh nahi paaya. 😅\nMain in cheezon me expert hoon: course, mock test, CSV, coupon, banner, users, grant access.\nIn me se kuch poochhiye — ya bas baat kariye, wo bhi chalega. 😊`,
      `Ye sawaal thoda tedha hai${nm}. 🤨\nSeedha shabd likhiye jaise 'CSV', 'grant', 'banner' — main turant samajh jaunga.\nWaise aapki baaton me kho jaana meri purani aadat hai. 😏`,
    ], "fallback"),
  };
}

function BulletAvatar({ size = 54 }: { size?: number }) {
  // Royal Enfield Bullet ka side profile — headlight hi Bullet ka chehra hai.
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r="31" fill="#1a2f55" stroke={GOLD} strokeWidth="2" />

      {/* rear mudguard */}
      <path d="M37 44 a10 10 0 0 1 17 -1" stroke="#e8e2d4" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      {/* exhaust */}
      <path d="M43 45 L55 46" stroke="#d8d2c4" strokeWidth="2.8" strokeLinecap="round" />

      {/* wheels */}
      <circle cx="20" cy="43" r="9" fill="#22201c" stroke={GOLD} strokeWidth="2" />
      <circle cx="20" cy="43" r="2.8" fill={GOLD} />
      <circle cx="45" cy="43" r="9" fill="#22201c" stroke={GOLD} strokeWidth="2" />
      <circle cx="45" cy="43" r="2.8" fill={GOLD} />

      {/* frame + seat */}
      <path d="M26 40 L33 34 L46 34 L48 38 L30 42 Z" fill="#22201c" />
      {/* fuel tank */}
      <path d="M27 36 L33 31 L40 31 L41 36 L34 39 Z" fill={GOLD} />
      {/* handlebar */}
      <path d="M26 33 L22.5 27.5 M19 26 L26 28" stroke="#e8e2d4" strokeWidth="2" strokeLinecap="round" />

      {/* headlight = face */}
      <circle cx="19" cy="32" r="6" fill="#f4f0e6" stroke="#cfc7b4" />
      <circle cx="17" cy="30.8" r="1.4" fill="#1a2f55" />
      <circle cx="21.2" cy="30.8" r="1.4" fill="#1a2f55" />
      <circle cx="17.5" cy="30.4" r="0.5" fill="#fff" />
      <circle cx="21.7" cy="30.4" r="0.5" fill="#fff" />
      <path d="M16.6 34 q2.4 2 4.8 0" stroke="#1a2f55" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Bullet({ section }: { section: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<BMsg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(false);
  const [profile, setProfile] = useState<BulletProfile>({ name: "", visits: 0, lastSeen: "", topics: [], chats: 0 });
  const [askingName, setAskingName] = useState(false);
  const first = useRef(true);
  const endRef = useRef<HTMLDivElement>(null);

  // Pehli baar: profile load karo, visit count badhao, naam poochho
  useEffect(() => {
    const p = loadProfile();
    const now = new Date().toISOString();
    const gapDays = p.lastSeen ? (Date.now() - new Date(p.lastSeen).getTime()) / 86400000 : 0;
    const next = { ...p, visits: (p.visits || 0) + 1, lastSeen: now };
    setProfile(next);
    saveProfile(next);

    const t = partOfDay();
    const hello =
      t === "subah" ? "Good morning" : t === "dopahar" ? "Namaste" : t === "shaam" ? "Good evening" : "Itni raat tak?";

    let opening: string;
    if (!p.name) {
      opening =
        "Namaste! Main Bullet hoon 🏍️ — aapke admin panel ka saathi.\nPehli mulaqat hai to ek baat bata dijiye — aapka naam kya hai?\nTaaki agli baar main aapko naam se bula sakoon.";
      setAskingName(true);
    } else if (gapDays >= 1) {
      opening = `${hello} ${p.name}! Kal se aapka intezaar tha. 😊\nAaj ${p.visits + 1}vi baar aaye hain aap yahan.${p.topics.length ? `\nPichhli baar "${p.topics[p.topics.length - 1]}" pe baat hui thi — wo kaam hua?` : ""}\nBataiye aaj kya karna hai.`;
    } else {
      opening = `${hello} ${p.name}! Aap to abhi thodi der pehle the. 😄\nChaliye phir se shuru karte hain — bataiye kya karna hai.`;
    }
    setMsgs([{ from: "bot", text: opening }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Section badalte hi Bullet khud popup hokar baat karta hai
  useEffect(() => {
    const intro = pick(SECTION_INTRO[section] || SECTION_INTRO.home, "sec:" + section);
    setMsgs((m) => (m.length && m[m.length - 1].text === intro ? m : [...m, { from: "bot", text: intro }]));
    const delay = first.current ? 1400 : 250;
    first.current = false;
    const t = setTimeout(() => setOpen(true), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  useEffect(() => {
    if (open) {
      setUnread(false);
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (msgs.length) {
      setUnread(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs, open]);

  function remember(update: Partial<BulletProfile>) {
    setProfile((p) => {
      const next = { ...p, ...update };
      saveProfile(next);
      return next;
    });
  }

  function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q) return;
    setMsgs((m) => [...m, { from: "you", text: q }]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      // Naam poocha tha? To ye jawab naam hai.
      if (askingName) {
        const nm = q
          .replace(/mera naam|my name is|main hoon|i am|i'm|naam|hai/gi, "")
          .replace(/[^\p{L}\s.]/gu, "")
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .join(" ");
        const clean = nm || q.slice(0, 20);
        remember({ name: clean, chats: profile.chats + 1 });
        setAskingName(false);
        setMsgs((m) => [
          ...m,
          {
            from: "bot",
            text: `${clean}... naam bhi utna hi pyara hai jitna socha tha. 😊\nAb se isi naam se bulaunga — aur jo baatein hongi wo yaad bhi rakhunga.\nChaliye kaam pe lagte hain: bataiye aaj kya karna hai?`,
          },
        ]);
        setTyping(false);
        return;
      }

      const { text: ans, topic } = bulletAnswer(q, profile);
      const topics = topic ? [...profile.topics.filter((t) => t !== topic), topic].slice(-5) : profile.topics;
      remember({ topics, chats: profile.chats + 1 });
      setMsgs((m) => [...m, { from: "bot", text: ans }]);
      setTyping(false);
    }, 450);
  }

  const quick = profile.name
    ? ["Kaise ho?", "CSV ka format", "Grant access", "Website par nahi dikh raha"]
    : ["CSV ka format", "Grant access", "Course kaise banaye"];

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Bullet se baat kijiye"
          style={{
            position: "fixed", right: 14, bottom: 14, zIndex: 60,
            background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 0,
            filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.5))",
          }}
        >
          <BulletAvatar size={58} />
          {unread && (
            <span style={{ position: "absolute", top: 2, right: 2, width: 13, height: 13, borderRadius: "50%", background: "#E05555", border: "2px solid #0d0b08" }} />
          )}
        </button>
      )}

      {open && (
        <div
          style={{
            position: "fixed", right: 12, bottom: 12, left: 12, zIndex: 60,
            maxWidth: 380, marginLeft: "auto",
            background: "#12100d", border: `1px solid ${GOLD}55`, borderRadius: 18,
            boxShadow: "0 14px 40px rgba(0,0,0,0.6)", overflow: "hidden",
            display: "flex", flexDirection: "column", maxHeight: "74vh",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: `1px solid ${BORDER}`, background: "#181510" }}>
            <BulletAvatar size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: GOLD }}>Bullet</div>
              <div style={{ fontSize: 10.5, color: "#5dd97c" }}>
                ● Online {profile.name ? `· ${profile.name} ke liye haazir` : "· aapki madad ke liye"}
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ ...ghostBtn, padding: "5px 11px", fontSize: 13 }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 9 }}>
            {msgs.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.from === "bot" ? "flex-start" : "flex-end",
                  maxWidth: "86%",
                  background: m.from === "bot" ? "#1f1b15" : GOLD,
                  color: m.from === "bot" ? "#efe9dc" : "#1a1a1a",
                  border: m.from === "bot" ? `1px solid ${BORDER}` : "none",
                  borderRadius: m.from === "bot" ? "14px 14px 14px 4px" : "14px 14px 4px 14px",
                  padding: "9px 12px", fontSize: 12.8, lineHeight: 1.55, whiteSpace: "pre-line",
                }}
              >
                {m.text}
              </div>
            ))}
            {typing && (
              <div style={{ alignSelf: "flex-start", background: "#1f1b15", border: `1px solid ${BORDER}`, borderRadius: "14px 14px 14px 4px", padding: "9px 14px", fontSize: 13, color: "#9a917f" }}>
                • • •
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div style={{ padding: "0 12px 8px", fontSize: 11, color: "#8a8274", lineHeight: 1.5 }}>
            Meri help nahi chahiye?{" "}
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", padding: 0, color: GOLD, fontWeight: 800, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
            >
              yahan click karke band kar dijiye
            </button>{" "}
            — main bura nahi manunga, bas thoda udaas ho jaunga. 🥺
          </div>

          <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "0 12px 8px" }}>
            {quick.map((qq) => (
              <button
                key={qq}
                onClick={() => send(qq)}
                style={{ flexShrink: 0, fontSize: 11, padding: "5px 10px", borderRadius: 14, cursor: "pointer", background: "transparent", color: "#c8c0ae", border: `1px solid ${BORDER}` }}
              >
                {qq}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 7, padding: 10, borderTop: `1px solid ${BORDER}`, background: "#181510" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder={askingName ? "Apna naam likhiye..." : "Kuch bhi poochhiye ya baat kijiye..."}
              style={{ ...inputStyle, marginBottom: 0, flex: 1, fontSize: 13, padding: "10px 12px" }}
            />
            <button onClick={() => send()} disabled={!input.trim()} style={{ ...goldBtn, padding: "10px 15px", opacity: input.trim() ? 1 : 0.5 }}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}


// ── Login ────────────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    if (!email || !password) {
      setError("Enter email and password");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin-extra/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");
      localStorage.setItem(TOKEN_KEY, data.token);
      onLogin();
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <img
        src="/logo.png"
        alt=""
        style={{ width: 90, height: 90, objectFit: "contain", marginBottom: 12 }}
        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
      />
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>
        Admin <span style={{ color: GOLD }}>Panel</span>
      </h1>
      <p style={{ color: "#9a917f", fontSize: 13, margin: "0 0 24px" }}>Selection Lab management</p>

      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          padding: 22,
        }}
      >
        <input
          type="email"
          placeholder="Admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        <button onClick={handleLogin} disabled={loading} style={{ ...goldBtn, width: "100%" }}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
        {error && <p style={{ color: "#ff6b6b", fontSize: 13, marginTop: 12, textAlign: "center" }}>{error}</p>}
      </div>
    </div>
  );
}

// ── Dashboard shell ──────────────────────────────────────────────────────────
function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("home");

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    onLogout();
  }

  // Har kaam ka apna rang — rang se pata chalta hai kaunsa section hai,
  // sirf sajावट ke liye nahi.
  const ACTIONS: { id: Tab; icon: string; title: string; sub: string; color: string; group: string }[] = [
    { id: "courses",       icon: "📚", title: "Courses",       sub: "Course banao, price aur content",   color: "#FFAB00", group: "Padhai ka saamaan" },
    { id: "mocktests",     icon: "📝", title: "Mock Tests",    sub: "Series aur test CSV se",            color: "#4A90D9", group: "Padhai ka saamaan" },
    { id: "descriptive",   icon: "✍️", title: "Descriptive",   sub: "Essay, letter, precis practice",     color: "#7C6CE0", group: "Padhai ka saamaan" },
    { id: "questions",     icon: "⬆️", title: "Upload Qs",     sub: "CSV se bulk questions",              color: "#2FA98C", group: "Padhai ka saamaan" },
    { id: "qbank",         icon: "🗂️", title: "Question Bank", sub: "Purane questions dhoondo",           color: "#6B8CAE", group: "Padhai ka saamaan" },

    { id: "appcontent",    icon: "🎨", title: "App Content",   sub: "Home slides, faculty, countdown",    color: "#D6568F", group: "App aur Website" },
    { id: "banners",       icon: "🖼️", title: "Banners",       sub: "Promo images carousel me",           color: "#F08A3C", group: "App aur Website" },
    { id: "blog",          icon: "📰", title: "Blog",          sub: "SEO articles website pe",            color: "#E8734A", group: "App aur Website" },

    { id: "users",         icon: "👥", title: "Users",         sub: "Access do, ban karo, history",       color: "#3AA8C1", group: "Log aur Paisa" },
    { id: "coupons",       icon: "🎟️", title: "Coupons",       sub: "Discount code banao",                color: "#3EA96B", group: "Log aur Paisa" },
    { id: "notifications", icon: "🔔", title: "Notify",        sub: "App users ko push bhejo",            color: "#E05555", group: "Log aur Paisa" },
    { id: "reviews",       icon: "⭐", title: "Reviews",       sub: "Course reviews dekho",               color: "#C8B32E", group: "Log aur Paisa" },
  ];

  const GROUPS = ["Padhai ka saamaan", "App aur Website", "Log aur Paisa"];
  const activeAction = ACTIONS.find((a) => a.id === tab);

  return (
    <div>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          background: "rgba(13,11,8,0.97)",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ flex: 1, fontWeight: 800, fontSize: 16 }}>
          Selection <span style={{ color: GOLD }}>Lab</span>{" "}
          <span style={{ color: "#9a917f", fontWeight: 600, fontSize: 13 }}>Admin</span>
        </div>
        <button onClick={logout} style={ghostBtn}>
          Logout
        </button>
      </header>

      {tab === "home" ? (
        /* ── HOME: "Aaj kya karna hai?" ── */
        <div style={{ padding: "20px 16px 140px" }}>
          <div style={{ fontSize: 13, color: "#9a917f" }}>Namaste 👋</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "4px 0 18px", lineHeight: 1.25 }}>
            Aaj <span style={{ color: GOLD }}>kya karna</span> hai?
          </h1>

          {/* Troubleshooter — sab kuch khud check karke report deta hai */}
          <button
            onClick={() => setTab("health")}
            style={{
              width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 12,
              background: CARD, border: "1px solid rgba(93,217,124,0.35)",
              borderLeft: "4px solid #5dd97c", borderRadius: 16, padding: "14px 16px", color: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>🩺</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#5dd97c" }}>Troubleshooter</div>
                <div style={{ fontSize: 12, color: "#9a917f" }}>Sab kuch khud check karke report degi</div>
              </div>
              <span style={{ color: "#5dd97c", fontSize: 18 }}>→</span>
            </div>
          </button>

          {/* Dashboard — numbers dekhne ka shortcut */}
          <button
            onClick={() => setTab("dashboard")}
            style={{
              width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 20,
              background: "linear-gradient(135deg, #1a2f55, #2c4a85)",
              border: "1px solid rgba(255,171,0,0.35)", borderRadius: 16, padding: "16px 18px", color: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 26 }}>📊</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Aaj ki report</div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.7)" }}>Sales, revenue aur naye users</div>
              </div>
              <span style={{ color: GOLD, fontSize: 20 }}>→</span>
            </div>
          </button>

          {GROUPS.map((g) => (
            <div key={g} style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 11, letterSpacing: 1.4, color: "#7a7263", fontWeight: 800, marginBottom: 10 }}>
                {g.toUpperCase()}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                {ACTIONS.filter((a) => a.group === g).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setTab(a.id)}
                    style={{
                      textAlign: "left", cursor: "pointer", padding: "14px 14px 13px",
                      borderRadius: 15, background: CARD,
                      border: `1px solid ${a.color}44`,
                      borderLeft: `4px solid ${a.color}`,
                      color: "#fff",
                    }}
                  >
                    <div
                      style={{
                        width: 38, height: 38, borderRadius: 11, background: `${a.color}22`,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 9,
                      }}
                    >
                      {a.icon}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14.5, color: a.color }}>{a.title}</div>
                    <div style={{ fontSize: 11.5, color: "#9a917f", marginTop: 3, lineHeight: 1.45 }}>{a.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Section ke andar: wapas jaane ka rasta ── */
        <div style={{ padding: "14px 16px 0", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setTab("home")} style={{ ...ghostBtn, padding: "8px 14px" }}>
            ← Home
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 18 }}>{activeAction?.icon || (tab === "health" ? "🩺" : "📊")}</span>
            <span
              style={{
                fontWeight: 800, fontSize: 16,
                color: activeAction?.color || GOLD,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {activeAction?.title || (tab === "health" ? "Troubleshooter" : "Aaj ki report")}
            </span>
          </div>
        </div>
      )}

      <main style={{ padding: tab === "home" ? 0 : 16, paddingBottom: 120 }}>
        {tab === "health" && <HealthTab />}
        {tab === "dashboard" && <DashboardTab />}
        {tab === "courses" && <CoursesTab />}
        {tab === "questions" && <QuestionsTab />}
        {tab === "mocktests" && <MockTestsTab />}
        {tab === "qbank" && <QuestionBankTab />}
        {tab === "blog" && <BlogTab />}
        {tab === "banners" && <BannersTab />}
        {tab === "notifications" && <NotificationsTab />}
        {tab === "reviews" && <ReviewsTab />}
        {tab === "users" && <UsersTab />}
        {tab === "coupons" && <CouponsTab />}
        {tab === "descriptive" && <DescriptiveAdmin api={api} />}
        {tab === "appcontent" && <AppContentAdmin api={api} />}
      </main>
    
      <Bullet section={tab} />
    </div>
  );
}

// ── Troubleshooter ───────────────────────────────────────────────────────────
function HealthTab() {
  const [running, setRunning] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState("");
  // Deep diagnostic — background job, progress poll hota hai
  const [deep, setDeep] = useState(false);
  const [progress, setProgress] = useState(0);
  // Sirf counts — poora array rakhne se mobile browser ki memory bhar jaati thi
  const [liveCounts, setLiveCounts] = useState({ ok: 0, warn: 0, fail: 0, total: 0 });
  const [showAll, setShowAll] = useState(false);
  const [runs, setRuns] = useState<any[]>([]);
  // Deep diagnostic ka nateeja — sirf summary, poori report nahi
  const [finishedRun, setFinishedRun] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);

  function loadRuns() {
    api("/admin-extra/diagnostics/runs").then((d) => setRuns(d.runs || [])).catch(() => {});
  }
  useEffect(loadRuns, []);

  // Report ko .txt file bana ke download kar deta hai — wahi file share ki ja sakti hai
  async function downloadReport(runId: number) {
    setDownloading(true);
    try {
      const d = await api(`/admin-extra/diagnostics/report/${runId}?fmt=text`);
      const blob = new Blob([d.text || ""], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = d.filename || `diagnostic-${runId}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (e: any) {
      setError(e.message);
    }
    setDownloading(false);
  }

  async function runDeep() {
    setRunning(true);
    setDeep(true);
    setError("");
    setData(null);
    setLiveCounts({ ok: 0, warn: 0, fail: 0, total: 0 });
    setFinishedRun(null);
    setShowAll(false);
    setProgress(0);
    setStep("Starting full diagnostic...");
    try {
      const start = await api("/admin-extra/diagnostics/run", "POST");
      const jobId = start.job_id;

      // Har 5 second me sirf progress. Poori report kabhi browser me nahi
      // aati — wo Supabase me save hoti hai aur .txt me download hoti hai.
      // Isse phone ki memory par koi bojh nahi padta.
      for (let i = 0; i < 400; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        let s: any;
        try {
          s = await api(`/admin-extra/diagnostics/status/${jobId}?light=1`);
        } catch {
          continue; // ek poll fail ho gaya to agli baar dekh lenge
        }
        setProgress(s.progress || 0);
        setStep(s.step || "");
        if (s.summary) setLiveCounts(s.summary);
        if (s.state === "done" || s.state === "error") {
          if (s.state === "error") setError(s.error || "Diagnostic failed");
          setFinishedRun({ id: s.run_id ?? null, summary: s.summary || {}, verdict: s.verdict });
          loadRuns();
          break;
        }
      }
    } catch (e: any) {
      setError(e.message);
    }
    setRunning(false);
  }

  async function run() {
    setRunning(true);
    setDeep(false);
    setError("");
    setData(null);
    // Chhote steps dikhate hain taaki lage kuch ho raha hai
    const steps = [
      "Database se connection check kar rahe hain...",
      "Tables aur columns dekh rahe hain...",
      "Naye features ke columns verify ho rahe hain...",
      "Environment variables check ho rahe hain...",
      "Courses aur tests ka data dekh rahe hain...",
      "Report taiyar ho rahi hai...",
    ];
    let i = 0;
    setStep(steps[0]);
    const tick = setInterval(() => {
      i = Math.min(i + 1, steps.length - 1);
      setStep(steps[i]);
    }, 700);

    try {
      const d = await api("/admin-extra/health-check");
      // Kam se kam 3 second dikhaate hain — report turant flash na kare
      await new Promise((r) => setTimeout(r, 1200));
      setData(d);
    } catch (e: any) {
      setError(e.message);
    }
    clearInterval(tick);
    setRunning(false);
  }

  const COLORS: Record<string, string> = { ok: "#5dd97c", warn: "#FFAB00", fail: "#ff6b6b" };
  const ICONS: Record<string, string> = { ok: "✓", warn: "!", fail: "✕" };

  // Browser test ke liye pages — jo bhi student dekhta hai
  const [pages, setPages] = useState<{ path: string; label: string }[]>([
    { path: "/", label: "Home" },
    { path: "/courses", label: "Courses list" },
    { path: "/mock-tests", label: "Mock tests list" },
    { path: "/descriptive", label: "Descriptive list" },
    { path: "/my-learning", label: "My Learning" },
    { path: "/blog", label: "Blog" },
    { path: "/about", label: "About" },
    { path: "/contact", label: "Contact" },
    { path: "/login", label: "Login" },
  ]);

  // Asli course/series ke detail pages bhi list me jod do
  useEffect(() => {
    (async () => {
      try {
        const [c, s, d] = await Promise.all([
          api("/admin-extra/courses").catch(() => ({ courses: [] })),
          api("/admin-extra/series").catch(() => ({ series: [] })),
          api("/admin-extra/desc/series").catch(() => ({ series: [] })),
        ]);
        const extra: { path: string; label: string }[] = [];
        (c.courses || []).filter((x: any) => x.is_active !== false).slice(0, 4)
          .forEach((x: any) => extra.push({ path: `/course/${x.id}`, label: `Course: ${String(x.title).slice(0, 26)}` }));
        (s.series || []).filter((x: any) => x.is_active !== false).slice(0, 3)
          .forEach((x: any) => extra.push({ path: `/mock-tests/${x.id}`, label: `Mock series: ${String(x.title).slice(0, 22)}` }));
        (d.series || []).filter((x: any) => x.is_active !== false).slice(0, 3)
          .forEach((x: any) => extra.push({ path: `/descriptive/${x.id}`, label: `Descriptive: ${String(x.title).slice(0, 22)}` }));
        if (extra.length) setPages((p) => [...p, ...extra]);
      } catch {}
    })();
  }, []);

  return (
    <div>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 13.5, color: "#c8c0ae", lineHeight: 1.6 }}>
          Ye tool poore system ki jaanch karta hai — tables, columns, environment variables,
          aur aapke courses/tests ka data. Kuch toota hua ho to students tak pahunchne se pehle
          yahin pata chal jayega.
        </div>
        <button onClick={run} disabled={running} style={{ ...smallBtn, width: "100%", marginTop: 12, padding: "11px 0", opacity: running ? 0.6 : 1 }}>
          {running && !deep ? "Checking..." : "⚡ Quick check (10 seconds)"}
        </button>
        <button onClick={runDeep} disabled={running} style={{ ...goldBtn, width: "100%", marginTop: 8, opacity: running ? 0.6 : 1 }}>
          {running && deep ? "Deep diagnostic running..." : "🔬 Full diagnostic (2-15 minutes)"}
        </button>
        <p style={{ fontSize: 11, color: "#9a917f", margin: "8px 0 0", lineHeight: 1.55 }}>
          Full diagnostic ek temporary user banata hai, use saare courses aur series grant karta hai,
          asli mock test deta hai, PDF kholta hai, har image download karke check karta hai — aur
          aakhir me wo user delete kar deta hai. Aapke numbers par koi asar nahi padta.
        </p>
      </div>

      {running && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 13, color: "#c8c0ae", textAlign: "center" }}>{step}</div>
          {deep && (
            <>
              <div style={{ height: 8, borderRadius: 5, background: "rgba(255,255,255,0.08)", marginTop: 12, overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: GOLD, borderRadius: 5, transition: "width .4s" }} />
              </div>
              <div style={{ fontSize: 11.5, color: "#9a917f", textAlign: "center", marginTop: 6 }}>
                {progress}% · {liveCounts.total} checks done
              </div>
              <div style={{ fontSize: 11, color: "#7a7263", textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
                Ye server par chal raha hai — page band karke baad me bhi aa sakte ho,
                report Saved reports me mil jayegi.
              </div>
              {liveCounts.fail > 0 && (
                <div style={{ fontSize: 12, color: "#ff6b6b", marginTop: 10, fontWeight: 700, textAlign: "center" }}>
                  ✕ {liveCounts.fail} problems found so far
                </div>
              )}
            </>
          )}
        </div>
      )}

      {error && <ErrorBox msg={error} />}

      {finishedRun && !running && (
        <div
          style={{
            background: CARD,
            border: `1px solid ${(finishedRun.verdict === "fail" ? "#ff6b6b" : finishedRun.verdict === "warn" ? GOLD : "#5dd97c")}55`,
            borderLeft: `5px solid ${finishedRun.verdict === "fail" ? "#ff6b6b" : finishedRun.verdict === "warn" ? GOLD : "#5dd97c"}`,
            borderRadius: 14, padding: 16, marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: finishedRun.verdict === "fail" ? "#ff6b6b" : finishedRun.verdict === "warn" ? GOLD : "#5dd97c" }}>
            Diagnostic complete
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 13, fontWeight: 700 }}>
            <span style={{ color: "#5dd97c" }}>✓ {finishedRun.summary.ok || 0}</span>
            <span style={{ color: GOLD }}>! {finishedRun.summary.warn || 0}</span>
            <span style={{ color: "#ff6b6b" }}>✕ {finishedRun.summary.fail || 0}</span>
          </div>
          <div style={{ fontSize: 12, color: "#9a917f", marginTop: 8, lineHeight: 1.55 }}>
            Poori report Supabase me save ho gayi hai. Neeche se .txt download kar lijiye —
            report browser me nahi kholi jaati taaki phone ki memory par bojh na pade.
          </div>
          {finishedRun.id && (
            <button onClick={() => downloadReport(finishedRun.id)} disabled={downloading}
              style={{ ...goldBtn, width: "100%", marginTop: 12, opacity: downloading ? 0.6 : 1 }}>
              {downloading ? "Preparing..." : "⬇ Download full report (.txt)"}
            </button>
          )}
        </div>
      )}

      {data && !running && (
        <>
          {/* Download — ye file share kar sakte ho */}
          {data.run_id && (
            <button
              onClick={() => downloadReport(data.run_id)}
              disabled={downloading}
              style={{ ...goldBtn, width: "100%", marginBottom: 12, opacity: downloading ? 0.6 : 1 }}
            >
              {downloading ? "Preparing..." : "⬇ Download full report (.txt)"}
            </button>
          )}

          {/* Summary */}
          <div
            style={{
              background: CARD,
              border: `1px solid ${COLORS[data.verdict]}55`,
              borderLeft: `5px solid ${COLORS[data.verdict]}`,
              borderRadius: 14, padding: 16, marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 800, color: COLORS[data.verdict] }}>
              {data.verdict === "ok" ? "✓ Sab theek hai" : data.verdict === "warn" ? "! Kuch dhyan dene layak baatein" : "✕ Kuch cheezein tooti hain"}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 13, fontWeight: 700 }}>
              <span style={{ color: "#5dd97c" }}>✓ {data.summary.ok} theek</span>
              <span style={{ color: "#FFAB00" }}>! {data.summary.warn} dhyan do</span>
              <span style={{ color: "#ff6b6b" }}>✕ {data.summary.fail} tooti</span>
            </div>
            {data.summary.fail > 0 && (
              <div style={{ fontSize: 12, color: "#9a917f", marginTop: 8, lineHeight: 1.55 }}>
                Laal wali cheezein pehle theek kijiye — inse students ko sach me problem aayegi.
              </div>
            )}
          </div>

          {/* Laal pehle, phir peela, phir hara */}
          {["fail", "warn", "ok"].map((level) => {
            const items = data.checks.filter((c: any) => c.status === level);
            if (items.length === 0) return null;
            return (
              <div key={level} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, letterSpacing: 1.2, fontWeight: 800, color: COLORS[level], marginBottom: 8 }}>
                  {level === "fail" ? "TOOTA HUA" : level === "warn" ? "DHYAN DEIN" : "THEEK HAI"} ({items.length})
                </div>
                {(level === "ok" && !showAll ? items.slice(0, 25) : items).map((c: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: "flex", gap: 10, background: CARD,
                      border: `1px solid ${level === "ok" ? BORDER : COLORS[level] + "44"}`,
                      borderRadius: 11, padding: "10px 12px", marginBottom: 6,
                    }}
                  >
                    <span style={{ color: COLORS[level], fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{ICONS[level]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        {c.name}
                        {c.group && (
                          <span style={{ fontSize: 10, color: "#7a7263", fontWeight: 600, marginLeft: 6 }}>{c.group}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: "#9a917f", marginTop: 2, lineHeight: 1.5 }}>{c.message}</div>
                      {c.fix && (
                        <div style={{ fontSize: 11.5, color: COLORS[level], marginTop: 4, lineHeight: 1.5 }}>
                          → {c.fix}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {level === "ok" && !showAll && items.length > 25 && (
                  <button
                    onClick={() => setShowAll(true)}
                    style={{ ...smallBtn, width: "100%", padding: "9px 0", fontSize: 12 }}
                  >
                    Show all {items.length} passing checks
                  </button>
                )}
              </div>
            );
          })}

          <div style={{ fontSize: 11, color: "#7a7263", textAlign: "center", marginTop: 8 }}>
            Check chala: {new Date(data.checked_at || data.finished_at).toLocaleString("en-IN")}
          </div>
        </>
      )}

      {/* ── Saved reports — browser crash ho jaye to bhi yahin milengi ── */}
      {runs.length > 0 && (
        <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 24, paddingTop: 18 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>
            📄 Saved <span style={{ color: GOLD }}>reports</span>
          </h3>
          <p style={{ fontSize: 12, color: "#9a917f", margin: "0 0 12px", lineHeight: 1.55 }}>
            Har diagnostic Supabase me save hoti hai — browser band ho jaye tab bhi.
            Download karke file share kar sakte ho.
          </p>
          {runs.map((r) => {
            const col = r.verdict === "fail" ? "#ff6b6b" : r.verdict === "warn" ? GOLD : "#5dd97c";
            const s = r.summary || {};
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 11, padding: "10px 12px", marginBottom: 6 }}>
                <span style={{ fontSize: 17 }}>{r.kind === "browser" ? "🌐" : "🔬"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5 }}>
                    <span style={{ color: col }}>{String(r.verdict || r.state).toUpperCase()}</span>
                    <span style={{ color: "#9a917f", fontWeight: 600 }}>
                      {" · "}{s.fail || 0} failed · {s.warn || 0} warn · {s.ok || 0} passed
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#7a7263" }}>
                    {new Date(r.started_at).toLocaleString("en-IN")}
                    {r.state === "running" ? " · still running" : ""}
                  </div>
                </div>
                <button onClick={() => downloadReport(r.id)} disabled={downloading} style={{ ...smallBtn, padding: "6px 11px", fontSize: 11.5 }}>
                  ⬇ .txt
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Browser test — asli pages iframe me khol ke check ── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 24, paddingTop: 18 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>
          🌐 Browser <span style={{ color: GOLD }}>test</span>
        </h3>
        <p style={{ fontSize: 12, color: "#9a917f", margin: "0 0 12px" }}>
          {pages.length} pages · phone aur desktop dono par
        </p>
        <BrowserTest pages={pages} api={api} />
      </div>
    </div>
  );
}


// ── Dashboard tab ────────────────────────────────────────────────────────────
function DashboardTab() {
  const [stats, setStats] = useState<any>(null);
  const [sales, setSales] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/admin/dashboard").then(setStats).catch((e) => setError(e.message));
    api("/admin-extra/sales").then(setSales).catch(() => {});
  }, []);

  if (error) return <ErrorBox msg={error} />;
  if (!stats) return <Muted>Loading stats...</Muted>;

  const t = sales?.totals;
  const items = [
    { label: "Total Users", value: stats.total_users },
    { label: "Total Revenue", value: `₹${t ? t.total_revenue : stats.total_revenue}` },
    { label: "Course Sales", value: t ? `${t.course_sales} (₹${t.course_revenue})` : "—" },
    { label: "Series Sales", value: t ? `${t.series_sales} (₹${t.series_revenue})` : "—" },
    { label: "Questions", value: stats.total_questions },
    { label: "Quiz Attempts", value: stats.total_attempts },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {items.map((s) => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: GOLD }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#9a917f", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 15, margin: "20px 0 10px" }}>🛒 Recent Purchases</h3>
      {!sales ? (
        <Muted>Loading purchases...</Muted>
      ) : sales.recent.length === 0 ? (
        <Muted>No purchases yet.</Muted>
      ) : (
        sales.recent.map((r: any, i: number) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 12px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>{r.type === "series" ? "📝" : "📚"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.user_name || r.user_email || "Unknown"} → {r.item}
              </div>
              <div style={{ fontSize: 11, color: "#9a917f" }}>
                {r.at ? new Date(r.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
              </div>
            </div>
            <b style={{ color: Number(r.amount) > 0 ? "#5dd97c" : "#9a917f", fontSize: 13.5 }}>
              {Number(r.amount) > 0 ? `₹${r.amount}` : "FREE"}
            </b>
          </div>
        ))
      )}
    </div>
  );
}

// ── Courses tab ──────────────────────────────────────────────────────────────
const emptyCourse = {
  title: "",
  description: "",
  thumbnail_url: "",
  price: 0,
  original_price: 0,
  course_type: "Paid Batch",
  features: "",
  validity_days: 365,
  whatsapp_support: "",
  recent_buyers: 0,
  is_featured: false,
  is_active: true,
};

function CoursesTab() {
  const [courses, setCourses] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [contentFor, setContentFor] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  // Bundle picker ke liye — doosre products ki list
  const [allSeries, setAllSeries] = useState<any[]>([]);
  const [allDesc, setAllDesc] = useState<any[]>([]);

  function load() {
    api("/admin-extra/courses")
      .then((d) => setCourses(d.courses || []))
      .catch((e) => setError(e.message));
    api("/admin-extra/series").then((d) => setAllSeries(d.series || [])).catch(() => {});
    api("/admin-extra/desc/series").then((d) => setAllDesc(d.series || [])).catch(() => {});
  }
  useEffect(load, []);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const body = {
        ...editing,
        price: Number(editing.price) || 0,
        original_price: Number(editing.original_price) || null,
        validity_days: Number(editing.validity_days) || null,
        recent_buyers: Number(editing.recent_buyers) || 0,
      };
      const id = body.id;
      delete body.id;
      delete body.created_at;
      if (id) await api(`/admin-extra/courses/${id}`, "PUT", body);
      else await api("/admin-extra/courses", "POST", body);
      setEditing(null);
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  }

  async function remove(id: number) {
    if (!confirm("Course hide ho jayega (app + website se). Jinhone kharida hai unka access CHALTA RAHEGA. Pakka?")) return;
    try {
      await api(`/admin-extra/courses/${id}`, "DELETE");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (contentFor) {
    return <ContentManager course={contentFor} onBack={() => setContentFor(null)} />;
  }

  if (editing) {
    return (
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 17 }}>{editing.id ? "Edit course" : "Add course"}</h3>
        <Field label="Title">
          <input style={inputStyle} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
        </Field>
        <Field label="Description">
          <textarea
            style={{ ...inputStyle, minHeight: 70 }}
            value={editing.description || ""}
            onChange={(e) => setEditing({ ...editing, description: e.target.value })}
          />
        </Field>
        <Field label="Thumbnail URL">
          <input
            style={inputStyle}
            placeholder="https://i.ibb.co/..."
            value={editing.thumbnail_url || ""}
            onChange={(e) => setEditing({ ...editing, thumbnail_url: e.target.value })}
          />
        </Field>
        {editing.thumbnail_url && (
          <img
            src={editing.thumbnail_url}
            alt="Preview"
            style={{ width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 10, marginBottom: 12 }}
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Price (₹)" style={{ flex: 1 }}>
            <input type="number" style={inputStyle} value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
          </Field>
          <Field label="Original price (₹)" style={{ flex: 1 }}>
            <input
              type="number"
              style={inputStyle}
              value={editing.original_price || ""}
              onChange={(e) => setEditing({ ...editing, original_price: e.target.value })}
            />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Course type" style={{ flex: 1 }}>
            <input
              style={inputStyle}
              value={editing.course_type || ""}
              onChange={(e) => setEditing({ ...editing, course_type: e.target.value })}
            />
          </Field>
          <Field label="Validity (days)" style={{ flex: 1 }}>
            <input
              type="number"
              style={inputStyle}
              value={editing.validity_days || ""}
              onChange={(e) => setEditing({ ...editing, validity_days: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Show on (kahan dikhe)">
          <select
            style={inputStyle}
            value={editing.visible_on || "both"}
            onChange={(e) => setEditing({ ...editing, visible_on: e.target.value })}
          >
            <option value="both">Both — App + Website</option>
            <option value="app">App only</option>
            <option value="web">Website only</option>
          </select>
        </Field>
        <div style={{ marginBottom: 12 }}>
          <BundlePicker
            value={editing.bundle_items || []}
            onChange={(v) => setEditing({ ...editing, bundle_items: v })}
            courses={courses}
            series={allSeries}
            desc={allDesc}
            selfType="course"
            selfId={editing.id}
          />
        </div>
        <Field label="Features (comma separated)">
          <input style={inputStyle} value={editing.features || ""} onChange={(e) => setEditing({ ...editing, features: e.target.value })} />
        </Field>
        <Field label="Telegram group link (is exam ka dedicated group)">
          <input
            style={inputStyle}
            placeholder="https://t.me/your_group_link"
            value={editing.telegram_group || ""}
            onChange={(e) => setEditing({ ...editing, telegram_group: e.target.value })}
          />
          <div style={{ fontSize: 11, color: "#9a917f", marginTop: -6, marginBottom: 8 }}>
            Course page par sabko dikhega — jisne khareeda ho ya na ho. Khaali chhodenge to button nahi aayega.
          </div>
        </Field>
        <Field label="WhatsApp support link">
          <input
            style={inputStyle}
            value={editing.whatsapp_support || ""}
            onChange={(e) => setEditing({ ...editing, whatsapp_support: e.target.value })}
          />
        </Field>
        <Field label='Recently purchased count (social proof — shows "🔥 X people recently purchased"; 0 = hidden)'>
          <input
            type="number"
            style={inputStyle}
            value={editing.recent_buyers ?? 0}
            onChange={(e) => setEditing({ ...editing, recent_buyers: e.target.value })}
          />
        </Field>
        <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 14px", fontSize: 14 }}>
          <input
            type="checkbox"
            checked={!!editing.is_featured}
            onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })}
          />
          Featured (shows in homepage banner)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 16px", fontSize: 14 }}>
          <input
            type="checkbox"
            checked={editing.is_active !== false}
            onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
          />
          Active (visible in app and website)
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={save} disabled={saving} style={{ ...goldBtn, flex: 1 }}>
            {saving ? "Saving..." : "Save course"}
          </button>
          <button onClick={() => setEditing(null)} style={{ ...ghostBtn, flex: 1 }}>
            Cancel
          </button>
        </div>
        {error && <ErrorBox msg={error} />}
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setEditing({ ...emptyCourse })} style={{ ...goldBtn, width: "100%", marginBottom: 14 }}>
        + Add course
      </button>
      {error && <ErrorBox msg={error} />}
      {courses.length === 0 && !error && <Muted>No courses yet.</Muted>}
      {courses.map((c) => (
        <div
          key={c.id}
          style={{
            display: "flex",
            gap: 12,
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: 12,
            marginBottom: 10,
            opacity: c.is_active === false ? 0.45 : 1,
          }}
        >
          {c.thumbnail_url ? (
            <img src={c.thumbnail_url} alt="" style={{ width: 74, height: 54, objectFit: "cover", borderRadius: 8 }} />
          ) : (
            <div style={{ width: 74, height: 54, borderRadius: 8, background: "#221d13", display: "flex", alignItems: "center", justifyContent: "center" }}>
              📘
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {c.title} {c.is_featured && <span style={{ color: GOLD }}>★</span>}
            </div>
            <div style={{ fontSize: 12.5, color: "#9a917f", marginTop: 2 }}>
              ₹{c.price} {c.is_active === false && "· inactive"}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => setEditing({ ...c })} style={smallBtn}>
                Edit
              </button>
              <button onClick={() => setContentFor(c)} style={{ ...smallBtn, color: GOLD, borderColor: BORDER }}>
                Content
              </button>
              <button onClick={() => remove(c.id)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Course content manager (videos / PDFs) ───────────────────────────────────
function ContentManager({ course, onBack }: { course: any; onBack: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", content_type: "video", url: "", display_order: "0" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function load() {
    api(`/admin-extra/content/${course.id}`)
      .then((d) => setItems(d.content || []))
      .catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function uploadPdf(fileInput: HTMLInputElement) {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("PDF must be under 50 MB");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_URL}/admin-extra/upload-pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      });
      const d = await res.json();
      if (!res.ok || !d.url) throw new Error(d.detail || "Upload failed");
      // auto-fill url + title (if empty)
      setForm((f) => ({
        ...f,
        url: d.url,
        title: f.title || file.name.replace(/\.pdf$/i, ""),
      }));
    } catch (e: any) {
      setError(e.message);
    }
    setUploading(false);
    fileInput.value = "";
  }

  async function add() {
    if (!form.title.trim() || !form.url.trim()) {
      setError("Title and URL are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api("/admin-extra/content", "POST", {
        course_id: course.id,
        title: form.title.trim(),
        content_type: form.content_type,
        url: form.url.trim(),
        display_order: Number(form.display_order) || 0,
        is_active: true,
      });
      setForm({ title: "", content_type: form.content_type, url: "", display_order: String(items.length + 1) });
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  }

  async function remove(id: number) {
    if (!confirm("Ye video/PDF course se hat jayega. Pakka?")) return;
    try {
      await api(`/admin-extra/content/${id}`, "DELETE");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div>
      <button onClick={onBack} style={{ ...ghostBtn, marginBottom: 14 }}>
        ← Back to courses
      </button>
      <h3 style={{ margin: "0 0 4px", fontSize: 17 }}>{course.title}</h3>
      <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "#9a917f" }}>
        Course content — videos and PDFs shown to enrolled students.
      </p>

      {/* Add form */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <Field label="Title">
          <input
            style={inputStyle}
            placeholder="e.g. Lecture 1 — Introduction"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Type" style={{ flex: 1 }}>
            <select style={inputStyle} value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value, url: "" })}>
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
            </select>
          </Field>
          <Field label="Order" style={{ flex: 1 }}>
            <input
              type="number"
              style={inputStyle}
              value={form.display_order}
              onChange={(e) => setForm({ ...form, display_order: e.target.value })}
            />
          </Field>
        </div>

        {form.content_type === "video" ? (
          <Field label="YouTube link (unlisted)">
            <input
              style={inputStyle}
              placeholder="https://youtube.com/watch?v=..."
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
          </Field>
        ) : (
          <Field label="PDF file (max 50 MB)">
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => uploadPdf(e.target)}
              disabled={uploading}
              style={{ ...inputStyle, padding: 10 }}
            />
            {uploading && <div style={{ fontSize: 12, color: GOLD, marginTop: 6 }}>Uploading PDF…</div>}
            {form.url && !uploading && (
              <div style={{ fontSize: 11.5, color: "#5dd97c", marginTop: 6, wordBreak: "break-all" }}>
                ✓ Uploaded — ready to add
              </div>
            )}
          </Field>
        )}

        <button onClick={add} disabled={saving || uploading || !form.url} style={{ ...goldBtn, width: "100%", opacity: saving || uploading || !form.url ? 0.5 : 1 }}>
          {saving ? "Adding..." : "+ Add content"}
        </button>
        {error && <ErrorBox msg={error} />}
      </div>

      {/* Content list */}
      {items.length === 0 && <Muted>No content added yet.</Muted>}
      {items.map((it) => (
        <div
          key={it.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: 12,
            marginBottom: 8,
            opacity: it.is_active === false ? 0.45 : 1,
          }}
        >
          <span style={{ fontSize: 20 }}>{it.content_type === "pdf" ? "📄" : "🎬"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {it.title}
            </div>
            <div style={{ fontSize: 11.5, color: "#9a917f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              #{it.display_order} · {it.url}
            </div>
          </div>
          {it.is_active !== false && (
            <button onClick={() => remove(it.id)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>
              Remove
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Questions tab (CSV bulk upload) ──────────────────────────────────────────
// CSV format (8 columns, header optional):
// Question, A, B, C, D, Answer (A/B/C/D), Explanation, Topic [, Question(Hi), A(Hi), B(Hi), C(Hi), D(Hi), Explanation(Hi)]
function parseCSV(text: string): string[][] {
  // Separator apne aap pakadta hai: Excel/Sheets se paste karo to TAB milta hai,
  // asli .csv file me comma. Pehli line dekh ke decide karte hain — jisme zyada
  // fields banein wahi sahi separator hai.
  const firstLine = (text.split(/\r?\n/).find((l) => l.trim() !== "") || "");
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const SEP = tabCount >= commaCount && tabCount > 0 ? "\t" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === SEP) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

function QuestionsTab() {
  const [exams, setExams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [examId, setExamId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [csvText, setCsvText] = useState("");
  const [parsed, setParsed] = useState<any[]>([]);
  const [parseErr, setParseErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api("/admin-extra/meta")
      .then((d) => {
        setExams(d.exams || []);
        setSubjects(d.subjects || []);
      })
      .catch((e) => setError(e.message));
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result || ""));
      parse(String(reader.result || ""));
    };
    reader.readAsText(f);
  }

  function parse(text?: string) {
    setParseErr("");
    setResult("");
    const rows = parseCSV(text ?? csvText);
    if (rows.length === 0) {
      setParsed([]);
      setParseErr("No rows found");
      return;
    }
    // Skip header row if first cell looks like a header
    const start = rows[0][0]?.trim().toLowerCase().startsWith("question") ? 1 : 0;
    const out: any[] = [];
    for (let i = start; i < rows.length; i++) {
      const r = rows[i].map((c) => c.trim());
      if (r.length < 6) {
        setParseErr(
          `Row ${i + 1}: kam se kam 8 columns chahiye (Question, A, B, C, D, Answer, Explanation, Topic) — mile ${r.length}. ` +
            `Hindi ke liye 14 columns, Section ke saath 15. Excel/Sheets se paste karo to TAB apne aap chalta hai.`
        );
        setParsed([]);
        return;
      }
      const ans = (r[5] || "").toUpperCase();
      if (!["A", "B", "C", "D"].includes(ans)) {
        setParseErr(`Row ${i + 1}: answer must be A, B, C or D (got "${r[5]}")`);
        setParsed([]);
        return;
      }
      out.push({
        question_en: r[0],
        option_a_en: r[1],
        option_b_en: r[2],
        option_c_en: r[3],
        option_d_en: r[4],
        correct_answer: ans,
        explanation_en: r[6] || null,
        topic: r[7] || null,
        question_hi: r[8] || null,
        option_a_hi: r[9] || null,
        option_b_hi: r[10] || null,
        option_c_hi: r[11] || null,
        option_d_hi: r[12] || null,
        explanation_hi: r[13] || null,
        section: r[14] || null,
      });
    }
    setParsed(out);
  }

  async function upload() {
    if (parsed.length === 0) return;
    setUploading(true);
    setError("");
    setResult("");
    try {
      const d = await api("/admin-extra/questions/bulk", "POST", {
        exam_id: examId ? Number(examId) : null,
        subject_id: subjectId ? Number(subjectId) : null,
        is_free: isFree,
        questions: parsed,
      });
      setResult(`✓ ${d.inserted} questions uploaded successfully`);
      setParsed([]);
      setCsvText("");
    } catch (e: any) {
      setError(e.message);
    }
    setUploading(false);
  }

  const filteredSubjects = examId ? subjects.filter((s) => String(s.exam_id) === examId) : subjects;

  return (
    <div>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Bulk upload questions (CSV)</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#9a917f", lineHeight: 1.6 }}>
          8 columns: Question, A, B, C, D, Answer (A/B/C/D), Explanation, Topic. Optional: +6 Hindi columns (Question, A, B, C, D, Explanation in Hindi), then column 15 = Section name (e.g. General Awareness) for multi-section mock tests.
          Header row optional. Exam/Subject below applies to all rows. Topics are auto-created under the
          selected subject. Same question pool is used for quiz and mock tests.
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Exam" style={{ flex: 1 }}>
            <select style={inputStyle} value={examId} onChange={(e) => { setExamId(e.target.value); setSubjectId(""); }}>
              <option value="">— None —</option>
              {exams.map((x) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Subject" style={{ flex: 1 }}>
            <select style={inputStyle} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">— None —</option>
              {filteredSubjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 12px", fontSize: 14 }}>
          <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
          Free questions (uncheck for paid-only)
        </label>

        <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ marginBottom: 12, fontSize: 13 }} />

        <textarea
          placeholder={'Or paste CSV here...\nEnglish only:  What is 2+2?,2,3,4,5,C,Simple addition,Arithmetic\nBilingual:     What is 2+2?,2,3,4,5,C,Simple addition,Arithmetic,2+2 kitna hai?,2,3,4,5,Saral jod'}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          style={{ ...inputStyle, minHeight: 120, fontFamily: "monospace", fontSize: 12.5 }}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => parse()} style={{ ...ghostBtn, flex: 1 }}>
            Check CSV
          </button>
          <button
            onClick={upload}
            disabled={uploading || parsed.length === 0}
            style={{ ...goldBtn, flex: 1, opacity: uploading || parsed.length === 0 ? 0.5 : 1 }}
          >
            {uploading ? "Uploading..." : `Upload ${parsed.length || ""} questions`}
          </button>
        </div>

        {parseErr && <ErrorBox msg={parseErr} />}
        {parsed.length > 0 && !parseErr && (
          <p style={{ color: "#5dd97c", fontSize: 13, marginTop: 12 }}>
            ✓ {parsed.length} questions parsed. Preview of first: "{parsed[0].question_en.slice(0, 60)}..."
          </p>
        )}
        {result && <p style={{ color: "#5dd97c", fontSize: 14, marginTop: 12, fontWeight: 700 }}>{result}</p>}
        {error && <ErrorBox msg={error} />}
      </div>
    </div>
  );
}

// ── Mock Tests tab (series bundles + create test with CSV) ───────────────────
function MockTestsTab() {
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  // Series form
  const [sForm, setSForm] = useState<any>({ title: "", description: "", price: "0", original_price: "0", visible_on: "both", thumbnail_url: "", bundle_items: [], telegram_group: "" });
  const [bCourses, setBCourses] = useState<any[]>([]);
  const [bDesc, setBDesc] = useState<any[]>([]);
  // Live test config — kaunsa test khula hai aur uska form
  const [liveFor, setLiveFor] = useState<any | null>(null);
  const [liveForm, setLiveForm] = useState<any>({});
  const [liveBusy, setLiveBusy] = useState(false);
  const [board, setBoard] = useState<any[] | null>(null);
  const [sEditId, setSEditId] = useState<number | null>(null); // null = naya banao, id = edit karo
  const [sSaving, setSSaving] = useState(false);

  // Test form
  const [tForm, setTForm] = useState({
    title: "",
    series_id: "",
    duration_minutes: "60",
    total_marks: "100",
    negative_marking: "0.5",
    pass_percentage: "35",
    is_free: false,
  });
  const [csvText, setCsvText] = useState("");
  const [parsed, setParsed] = useState<any[]>([]);
  const [parseErr, setParseErr] = useState("");
  const [tSaving, setTSaving] = useState(false);

  function load() {
    api("/admin-extra/series")
      .then((d) => setSeriesList(d.series || []))
      .catch((e) => setError(e.message));
    api("/admin-extra/mock-tests")
      .then((d) => setTests(d.mock_tests || []))
      .catch(() => {});
    api("/admin-extra/courses").then((d) => setBCourses(d.courses || [])).catch(() => {});
    api("/admin-extra/desc/series").then((d) => setBDesc(d.series || [])).catch(() => {});
  }
  useEffect(load, []);

  function editSeries(s: any) {
    setSEditId(s.id);
    setSForm({
      title: s.title || "",
      description: s.description || "",
      price: String(s.price ?? 0),
      original_price: String(s.original_price ?? 0),
      visible_on: s.visible_on || "both",
      thumbnail_url: s.thumbnail_url || "",
      bundle_items: s.bundle_items || [],
      telegram_group: s.telegram_group || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditSeries() {
    setSEditId(null);
    setSForm({ title: "", description: "", price: "0", original_price: "0", visible_on: "both", thumbnail_url: "", bundle_items: [], telegram_group: "" });
  }

  async function createSeries() {
    if (!sForm.title.trim()) {
      setError("Series title is required");
      return;
    }
    setSSaving(true);
    setError("");
    try {
      const body = {
        title: sForm.title.trim(),
        description: sForm.description.trim() || null,
        price: Number(sForm.price) || 0,
        original_price: Number(sForm.original_price) || 0,
        visible_on: sForm.visible_on || "both",
        thumbnail_url: sForm.thumbnail_url.trim() || null,
        bundle_items: sForm.bundle_items || [],
        telegram_group: (sForm.telegram_group || "").trim() || null,
      };
      if (sEditId) {
        await api(`/admin-extra/series/${sEditId}`, "PUT", body);
      } else {
        await api("/admin-extra/series", "POST", body);
      }
      cancelEditSeries();
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setSSaving(false);
  }

  async function removeSeries(id: number) {
    if (!confirm("Series hide ho jayegi (andar ke tests safe rahenge). Jinhone kharidi hai unka access chalta rahega. Pakka?")) return;
    try {
      await api(`/admin-extra/series/${id}`, "DELETE");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  function parse(text?: string) {
    setParseErr("");
    const rows = parseCSV(text ?? csvText);
    if (rows.length === 0) {
      setParsed([]);
      setParseErr("No rows found");
      return;
    }
    const start = rows[0][0]?.trim().toLowerCase().startsWith("question") ? 1 : 0;
    const out: any[] = [];
    for (let i = start; i < rows.length; i++) {
      const r = rows[i].map((c) => c.trim());
      if (r.length < 6) {
        setParseErr(
          `Row ${i + 1}: kam se kam 8 columns chahiye (Question, A, B, C, D, Answer, Explanation, Topic) — mile sirf ${r.length}. ` +
            `Hindi ke liye 14 columns, Section ke saath 15. Excel/Sheets se paste karo to TAB apne aap chal jayega.`
        );
        setParsed([]);
        return;
      }
      const ans = (r[5] || "").toUpperCase();
      if (!["A", "B", "C", "D"].includes(ans)) {
        setParseErr(`Row ${i + 1}: answer must be A, B, C or D (got "${r[5]}")`);
        setParsed([]);
        return;
      }
      out.push({
        question_en: r[0],
        option_a_en: r[1],
        option_b_en: r[2],
        option_c_en: r[3],
        option_d_en: r[4],
        correct_answer: ans,
        explanation_en: r[6] || null,
        topic: r[7] || null,
        question_hi: r[8] || null,
        option_a_hi: r[9] || null,
        option_b_hi: r[10] || null,
        option_c_hi: r[11] || null,
        option_d_hi: r[12] || null,
        explanation_hi: r[13] || null,
        section: r[14] || null,
      });
    }
    setParsed(out);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result || ""));
      parse(String(reader.result || ""));
    };
    reader.readAsText(f);
  }

  async function createTest() {
    if (!tForm.title.trim()) {
      setError("Test title is required");
      return;
    }
    if (parsed.length === 0) {
      setError("Add questions CSV first (press Check CSV)");
      return;
    }
    setTSaving(true);
    setError("");
    setMsg("");
    try {
      const d = await api("/admin-extra/mock-tests/create-with-csv", "POST", {
        title: tForm.title.trim(),
        series_id: tForm.series_id ? Number(tForm.series_id) : null,
        duration_minutes: Number(tForm.duration_minutes) || 60,
        total_marks: Number(tForm.total_marks) || 100,
        negative_marking: Number(tForm.negative_marking) || 0,
        pass_percentage: Number(tForm.pass_percentage) || 0,
        is_free: tForm.is_free,
        questions: parsed,
      });
      setMsg(`✓ Test created with ${d.questions_added} questions`);
      setTForm({ ...tForm, title: "", is_free: false });
      setCsvText("");
      setParsed([]);
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setTSaving(false);
  }

  // datetime-local ("2026-08-15T10:00") -> ISO with timezone
  function toIso(v: string) {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  // ISO -> datetime-local ke liye value
  function toLocalInput(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function openLive(t: any) {
    setBoard(null);
    setLiveFor(t);
    setLiveForm({
      is_live: !!t.is_live,
      live_start_at: toLocalInput(t.live_start_at),
      live_end_at: toLocalInput(t.live_end_at),
      display_boost: String(t.display_boost ?? 0),
      registration_boost: String(t.registration_boost ?? 0),
      telegram_group: t.telegram_group || "",
    });
  }

  async function saveLive() {
    if (!liveFor) return;
    if (liveForm.is_live && (!liveForm.live_start_at || !liveForm.live_end_at)) {
      setError("Live test ke liye start aur end dono time zaroori hain");
      return;
    }
    if (liveForm.is_live && toIso(liveForm.live_end_at)! <= toIso(liveForm.live_start_at)!) {
      setError("End time start se baad ka hona chahiye");
      return;
    }
    setLiveBusy(true);
    setError("");
    try {
      await api(`/admin-extra/mock-tests/${liveFor.id}/live`, "PUT", {
        is_live: !!liveForm.is_live,
        live_start_at: toIso(liveForm.live_start_at),
        live_end_at: toIso(liveForm.live_end_at),
        display_boost: Number(liveForm.display_boost) || 0,
        registration_boost: Number(liveForm.registration_boost) || 0,
        telegram_group: (liveForm.telegram_group || "").trim() || null,
      });
      setLiveFor(null);
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setLiveBusy(false);
  }

  async function publishResults(t: any) {
    if (!confirm(`"${t.title}" ka result sab students ko dikhne lagega. Iske baad har koi apna score aur rank dekh payega. Pakka?`)) return;
    setLiveBusy(true);
    try {
      const d = await api(`/admin-extra/mock-tests/${t.id}/publish-results`, "POST");
      alert(`Result publish ho gaya — ${d.attempts} students ne test diya tha.`);
      setLiveFor(null);
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setLiveBusy(false);
  }

  async function loadBoard(t: any) {
    setLiveBusy(true);
    try {
      const d = await api(`/admin-extra/mock-tests/${t.id}/leaderboard`);
      setBoard(d.leaderboard || []);
    } catch (e: any) {
      setError(e.message);
    }
    setLiveBusy(false);
  }

  async function removeTest(id: number) {
    if (!confirm("Ye test hide ho jayega. Questions Question Bank me safe rahenge. Pakka?")) return;
    try {
      await api(`/admin-extra/mock-tests/${id}`, "DELETE");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div>
      {msg && <p style={{ color: "#5dd97c", fontWeight: 700, fontSize: 14 }}>{msg}</p>}
      {error && <ErrorBox msg={error} />}

      {/* ── Series manager ── */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>1. Test Series (bundles)</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#9a917f", lineHeight: 1.6 }}>
          e.g. "SSC CGL Mock Tests" — students buy the series once and unlock all tests inside. Mark 2-3 tests
          FREE so everyone can try.
        </p>
        <Field label="Series title">
          <input style={inputStyle} placeholder="SSC CGL Mock Test Series 2026" value={sForm.title} onChange={(e) => setSForm({ ...sForm, title: e.target.value })} />
        </Field>
        <Field label="Description (optional)">
          <input style={inputStyle} placeholder="Latest pattern full-length tests" value={sForm.description} onChange={(e) => setSForm({ ...sForm, description: e.target.value })} />
        </Field>
        <Field label="Thumbnail URL (optional)">
          <input style={inputStyle} placeholder="https://i.ibb.co/..../poster.jpg" value={sForm.thumbnail_url} onChange={(e) => setSForm({ ...sForm, thumbnail_url: e.target.value })} />
          {!!sForm.thumbnail_url.trim() && (
            <img src={sForm.thumbnail_url} alt="" style={{ marginTop: 8, width: "100%", maxHeight: 150, objectFit: "contain", borderRadius: 10, background: "rgba(255,255,255,0.05)" }} />
          )}
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Price ₹" style={{ flex: 1 }}>
            <input type="number" style={inputStyle} value={sForm.price} onChange={(e) => setSForm({ ...sForm, price: e.target.value })} />
          </Field>
          <Field label="Original ₹ (cut price)" style={{ flex: 1 }}>
            <input type="number" style={inputStyle} value={sForm.original_price} onChange={(e) => setSForm({ ...sForm, original_price: e.target.value })} />
          </Field>
        </div>
        <Field label="Telegram group link (is exam ka dedicated group)">
          <input
            style={inputStyle}
            placeholder="https://t.me/your_group_link"
            value={sForm.telegram_group || ""}
            onChange={(e) => setSForm({ ...sForm, telegram_group: e.target.value })}
          />
        </Field>
        <Field label="Show on (kahan dikhe)">
          <select
            style={inputStyle}
            value={sForm.visible_on || "both"}
            onChange={(e) => setSForm({ ...sForm, visible_on: e.target.value })}
          >
            <option value="both">Both — App + Website</option>
            <option value="app">App only</option>
            <option value="web">Website only</option>
          </select>
        </Field>
        <div style={{ margin: "10px 0 12px" }}>
          <BundlePicker
            value={sForm.bundle_items || []}
            onChange={(v) => setSForm({ ...sForm, bundle_items: v })}
            courses={bCourses}
            series={seriesList}
            desc={bDesc}
            selfType="mock"
            selfId={sEditId}
          />
        </div>
        {sEditId && (
          <div style={{ fontSize: 12, color: "#FFAB00", marginBottom: 8, fontWeight: 700 }}>
            ✏️ Editing series ID {sEditId}
          </div>
        )}
        <button onClick={createSeries} disabled={sSaving} style={{ ...goldBtn, width: "100%" }}>
          {sSaving ? "Saving..." : sEditId ? "💾 Save changes" : "+ Create series"}
        </button>
        {sEditId && (
          <button onClick={cancelEditSeries} style={{ ...smallBtn, width: "100%", marginTop: 8 }}>
            Cancel edit
          </button>
        )}

        {seriesList.filter((s) => s.is_active !== false).map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 10, marginTop: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{s.title}</div>
              <div style={{ fontSize: 11.5, color: "#9a917f" }}>
                ID {s.id} · ₹{s.price} · {tests.filter((t) => t.series_id === s.id && t.is_active !== false).length} tests
              </div>
            </div>
            <button onClick={() => editSeries(s)} style={smallBtn}>
              Edit
            </button>
            <button onClick={() => removeSeries(s.id)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* ── Create test ── */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>2. Add a mock test (with CSV)</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#9a917f", lineHeight: 1.6 }}>
          Same CSV: 8 columns = Question, A, B, C, D, Answer (A/B/C/D), Explanation, Topic.
          Bilingual chahiye to 6 aur columns jodo: Question(HI), A(HI), B(HI), C(HI), D(HI), Explanation(HI).
          Column 15 = Section name (jaise General Awareness) — multi-section test ke liye. Questions + test are created in
          one shot. Marks are split equally (total marks ÷ questions).
        </p>
        <Field label="Test title">
          <input style={inputStyle} placeholder="Full Mock Test 1" value={tForm.title} onChange={(e) => setTForm({ ...tForm, title: e.target.value })} />
        </Field>
        <Field label="Series (bundle)">
          <select style={inputStyle} value={tForm.series_id} onChange={(e) => setTForm({ ...tForm, series_id: e.target.value })}>
            <option value="">— No series (standalone) —</option>
            {seriesList.filter((s) => s.is_active !== false).map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Duration (min)" style={{ flex: 1 }}>
            <input type="number" style={inputStyle} value={tForm.duration_minutes} onChange={(e) => setTForm({ ...tForm, duration_minutes: e.target.value })} />
          </Field>
          <Field label="Total marks" style={{ flex: 1 }}>
            <input type="number" style={inputStyle} value={tForm.total_marks} onChange={(e) => setTForm({ ...tForm, total_marks: e.target.value })} />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Negative marking" style={{ flex: 1 }}>
            <input type="number" step="0.25" style={inputStyle} value={tForm.negative_marking} onChange={(e) => setTForm({ ...tForm, negative_marking: e.target.value })} />
          </Field>
          <Field label="Pass %" style={{ flex: 1 }}>
            <input type="number" style={inputStyle} value={tForm.pass_percentage} onChange={(e) => setTForm({ ...tForm, pass_percentage: e.target.value })} />
          </Field>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 12px", fontSize: 14 }}>
          <input type="checkbox" checked={tForm.is_free} onChange={(e) => setTForm({ ...tForm, is_free: e.target.checked })} />
          FREE test (everyone can attempt — use for first 2-3 tests of a series)
        </label>

        <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ marginBottom: 12, fontSize: 13 }} />
        <textarea
          placeholder={"Or paste CSV here...\nWhat is 2+2?,2,3,4,5,C,Simple addition,Arithmetic"}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          style={{ ...inputStyle, minHeight: 110, fontFamily: "monospace", fontSize: 12.5 }}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => parse()} style={{ ...ghostBtn, flex: 1 }}>
            Check CSV
          </button>
          <button onClick={createTest} disabled={tSaving || parsed.length === 0} style={{ ...goldBtn, flex: 1, opacity: tSaving || parsed.length === 0 ? 0.5 : 1 }}>
            {tSaving ? "Creating..." : `Create test (${parsed.length} Qs)`}
          </button>
        </div>
        {parseErr && <ErrorBox msg={parseErr} />}
        {parsed.length > 0 && !parseErr && (
          <p style={{ color: "#5dd97c", fontSize: 13, marginTop: 12 }}>✓ {parsed.length} questions parsed</p>
        )}
      </div>

      {/* ── Tests list ── */}
      {/* ── LIVE TESTS alag — normal tests se bilkul alag section ── */}
      <h3 style={{ fontSize: 15, margin: "0 0 10px", color: "#ff6b6b" }}>🔴 Live tests</h3>
      {tests.filter((t) => t.is_active !== false && t.is_live).length === 0 && (
        <div style={{ background: CARD, border: `1px dashed ${BORDER}`, borderRadius: 12, padding: 13, fontSize: 12.5, color: "#9a917f", lineHeight: 1.6, marginBottom: 10 }}>
          Abhi koi live test nahi hai.<br />
          Neeche <b style={{ color: "#e0dacb" }}>Normal tests</b> me se kisi par <b style={{ color: "#e0dacb" }}>⏰ Live</b> dabaiye,
          time set kijiye aur Save — wo live test ban jayega aur homepage par countdown ke saath dikhega.
        </div>
      )}
      {tests.filter((t) => t.is_active !== false && t.is_live).map((t) => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, background: CARD, border: "1px solid rgba(255,107,107,0.4)", borderRadius: 12, padding: 12, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.title}</div>
            <div style={{ fontSize: 11.5, color: "#ff6b6b", fontWeight: 700, marginTop: 2 }}>
              {t.live_start_at
                ? `${new Date(t.live_start_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} → ${t.live_end_at ? new Date(t.live_end_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "?"}`
                : "⚠️ Time set nahi hai"}
              {t.results_published ? " · result published ✓" : ""}
            </div>
            <div style={{ fontSize: 11, color: "#9a917f" }}>
              {t.total_questions} Qs · {t.duration_minutes} min · boost {t.registration_boost || 0}/{t.display_boost || 0}
            </div>
          </div>
          <button onClick={() => openLive(t)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.5)" }}>
            ⏰ Manage
          </button>
        </div>
      ))}

      <h3 style={{ fontSize: 15, margin: "20px 0 10px" }}>Normal tests</h3>
      {tests.filter((t) => t.is_active !== false && !t.is_live).length === 0 && <Muted>No tests yet.</Muted>}
      {tests.filter((t) => t.is_active !== false && !t.is_live).map((t) => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>
              {t.title} {t.is_free && <span style={{ color: "#5dd97c", fontSize: 11, fontWeight: 800 }}>FREE</span>}
            </div>
            <div style={{ fontSize: 11.5, color: "#9a917f" }}>
              {seriesList.find((s) => s.id === t.series_id)?.title || "Standalone"} · {t.total_questions} Qs · {t.duration_minutes} min · {t.total_marks} marks
            </div>
            {t.is_live && (
              <div style={{ fontSize: 11, color: "#ff6b6b", fontWeight: 800, marginTop: 3 }}>
                🔴 LIVE TEST
                {t.live_start_at ? ` · ${new Date(t.live_start_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : ""}
                {t.results_published ? " · result published ✓" : ""}
              </div>
            )}
          </div>
          <button onClick={() => openLive(t)} style={{ ...smallBtn, color: t.is_live ? "#ff6b6b" : "#e0dacb", borderColor: t.is_live ? "rgba(255,107,107,0.5)" : BORDER }}>
            ⏰ Live
          </button>
          <button onClick={() => removeTest(t.id)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>
            Remove
          </button>
        </div>
      ))}

      {/* ── Live test config panel ── */}
      {liveFor && (
        <div
          onClick={() => setLiveFor(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 70, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#12100d", border: `1px solid ${BORDER}`, borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto", padding: 18 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <b style={{ fontSize: 16, flex: 1 }}>⏰ Live test settings</b>
              <button onClick={() => setLiveFor(null)} style={{ ...smallBtn, padding: "5px 11px" }}>✕</button>
            </div>
            <div style={{ fontSize: 12.5, color: "#9a917f", marginBottom: 14 }}>{liveFor.title}</div>

            <label style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={!!liveForm.is_live}
                onChange={(e) => setLiveForm({ ...liveForm, is_live: e.target.checked })}
                style={{ width: 18, height: 18 }}
              />
              <span style={{ fontSize: 14, fontWeight: 700 }}>Ye live test hai (fixed time par hoga)</span>
            </label>

            {liveForm.is_live && (
              <>
                <Field label="Shuru hone ka time">
                  <input type="datetime-local" style={inputStyle} value={liveForm.live_start_at || ""} onChange={(e) => setLiveForm({ ...liveForm, live_start_at: e.target.value })} />
                </Field>
                <Field label="Khatam hone ka time">
                  <input type="datetime-local" style={inputStyle} value={liveForm.live_end_at || ""} onChange={(e) => setLiveForm({ ...liveForm, live_end_at: e.target.value })} />
                </Field>

                <div style={{ display: "flex", gap: 10 }}>
                  <Field label="Registered boost" style={{ flex: 1 }}>
                    <input type="number" style={inputStyle} value={liveForm.registration_boost} onChange={(e) => setLiveForm({ ...liveForm, registration_boost: e.target.value })} />
                  </Field>
                  <Field label="Live boost" style={{ flex: 1 }}>
                    <input type="number" style={inputStyle} value={liveForm.display_boost} onChange={(e) => setLiveForm({ ...liveForm, display_boost: e.target.value })} />
                  </Field>
                </div>
                <p style={{ fontSize: 11, color: "#9a917f", margin: "-4px 0 12px", lineHeight: 1.55 }}>
                  Ye dono sirf homepage banner ke counter me judte hain aur dhire-dhire badhte hain.
                  <b style={{ color: "#e0dacb" }}> Rank hamesha asli attempts par banta hai</b> — students ko sach hi dikhega.
                </p>

                <Field label="Telegram group link (reminder ke liye)">
                  <input style={inputStyle} placeholder="https://t.me/your_group" value={liveForm.telegram_group || ""} onChange={(e) => setLiveForm({ ...liveForm, telegram_group: e.target.value })} />
                </Field>
              </>
            )}

            <button onClick={saveLive} disabled={liveBusy} style={{ ...goldBtn, width: "100%", opacity: liveBusy ? 0.6 : 1 }}>
              {liveBusy ? "Saving..." : "Save live settings"}
            </button>

            {liveFor.is_live && (
              <>
                <div style={{ display: "flex", gap: 9, marginTop: 10 }}>
                  <button onClick={() => loadBoard(liveFor)} disabled={liveBusy} style={{ ...smallBtn, flex: 1, padding: "10px 0" }}>
                    📊 Leaderboard
                  </button>
                  <button
                    onClick={() => publishResults(liveFor)}
                    disabled={liveBusy || liveFor.results_published}
                    style={{ ...goldBtn, flex: 1, padding: "10px 0", fontSize: 13, opacity: liveFor.results_published ? 0.5 : 1 }}
                  >
                    {liveFor.results_published ? "✓ Published" : "🏆 Publish results"}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: "#9a917f", marginTop: 8 }}>
                  Publish tabhi karo jab test ka time khatam ho jaye — uske baad sabko ek saath score aur rank dikhega.
                </p>
              </>
            )}

            {board && (
              <div style={{ marginTop: 14 }}>
                <b style={{ fontSize: 13.5 }}>Leaderboard ({board.length} attempts)</b>
                {board.length === 0 && <Muted>Abhi kisi ne test nahi diya.</Muted>}
                {board.slice(0, 50).map((r: any) => (
                  <div key={r.user_id} style={{ display: "flex", gap: 10, alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.07)", padding: "7px 0", fontSize: 12.5 }}>
                    <span style={{ width: 26, fontWeight: 800, color: r.rank <= 3 ? "#FFAB00" : "#9a917f" }}>#{r.rank}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: "#9a917f" }}>{r.phone || ""}</div>
                    </div>
                    <span style={{ fontWeight: 800, color: "#5dd97c" }}>{r.score}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// ── Blog tab ─────────────────────────────────────────────────────────────────
function BlogTab() {
  const [posts, setPosts] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    api("/admin-extra/blog")
      .then((d) => setPosts(d.posts || []))
      .catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function save() {
    if (!editing.title?.trim() || !editing.content?.trim()) {
      setError("Title and content are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        title: editing.title,
        slug: editing.slug || null,
        excerpt: editing.excerpt || null,
        content: editing.content,
        cover_url: editing.cover_url || null,
        is_published: editing.is_published !== false,
      };
      if (editing.id) await api(`/admin-extra/blog/${editing.id}`, "PUT", body);
      else await api("/admin-extra/blog", "POST", body);
      setEditing(null);
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  }

  async function openEdit(id: number) {
    try {
      const d = await api(`/admin-extra/blog/${id}`);
      setEditing(d.post);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function remove(id: number) {
    if (!confirm("Ye blog post HAMESHA ke liye delete ho jayegi — website se turant hategi. Pakka?")) return;
    try {
      await api(`/admin-extra/blog/${id}`, "DELETE");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (editing) {
    return (
      <div>
        <button onClick={() => setEditing(null)} style={{ ...ghostBtn, marginBottom: 14 }}>
          ← Back
        </button>
        <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>{editing.id ? "Edit post" : "New post"}</h3>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14 }}>
          <Field label="Title">
            <input style={inputStyle} value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="SSC CGL 2026 Notification Out — Full Details" />
          </Field>
          <Field label="Slug (URL — blank = auto from title)">
            <input style={inputStyle} value={editing.slug || ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="ssc-cgl-2026-notification" />
          </Field>
          <Field label="Excerpt (short summary shown in list + Google)">
            <input style={inputStyle} value={editing.excerpt || ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} />
          </Field>
          <Field label="Cover image URL (optional)">
            <input style={inputStyle} value={editing.cover_url || ""} onChange={(e) => setEditing({ ...editing, cover_url: e.target.value })} placeholder="https://..." />
          </Field>
          <Field label="Content — blank line = paragraph · ## Heading · - bullet · [text](url) = link · link alone on a line = button">
            <textarea
              style={{ ...inputStyle, minHeight: 260, fontFamily: "inherit", lineHeight: 1.6 }}
              value={editing.content || ""}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              placeholder={"Intro paragraph...\n\n## Important Dates\n\nDetails here..."}
            />
          </Field>
          <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 12px", fontSize: 14 }}>
            <input type="checkbox" checked={editing.is_published !== false} onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })} />
            Published (uncheck = draft, hidden from site)
          </label>
          <button onClick={save} disabled={saving} style={{ ...goldBtn, width: "100%" }}>
            {saving ? "Saving..." : editing.id ? "Update post" : "Publish post"}
          </button>
          {error && <ErrorBox msg={error} />}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setEditing({ is_published: true })} style={{ ...goldBtn, width: "100%", marginBottom: 14 }}>
        + New blog post
      </button>
      {error && <ErrorBox msg={error} />}
      {posts.length === 0 && <Muted>No posts yet. SEO traffic starts with the first post!</Muted>}
      {posts.map((p) => (
        <div key={p.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>
            {p.title} {p.is_published === false && <span style={{ color: "#e0a030", fontSize: 11 }}>· DRAFT</span>}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted, #9a917f)", margin: "3px 0 8px" }}>/blog/{p.slug}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => openEdit(p.id)} style={smallBtn}>Edit</button>
            <a href={`/blog/${p.slug}`} target="_blank" style={{ ...smallBtn, textDecoration: "none", display: "inline-block" }}>View</a>
            <button onClick={() => remove(p.id)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}


// ── Banners tab ──────────────────────────────────────────────────────────────
function BannersTab() {
  const [banners, setBanners] = useState<any[]>([]);
  const [form, setForm] = useState({ image_url: "", title: "", link_url: "", display_order: "0" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    api("/admin-extra/banners").then((d) => setBanners(d.banners || [])).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function add() {
    if (!form.image_url.trim()) { setError("Image URL required"); return; }
    setSaving(true); setError("");
    try {
      await api("/admin-extra/banners", "POST", {
        image_url: form.image_url.trim(),
        title: form.title.trim() || null,
        link_url: form.link_url.trim() || null,
        display_order: Number(form.display_order) || 0,
        is_active: true,
      });
      setForm({ image_url: "", title: "", link_url: "", display_order: String(banners.length + 1) });
      load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  async function remove(id: number) {
    if (!confirm("Ye banner delete ho jayega (app + website dono se hat jayega). Pakka?")) return;
    try { await api(`/admin-extra/banners/${id}`, "DELETE"); load(); } catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Add banner</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#9a917f" }}>Shown on the app home screen and website hero area.</p>
        <Field label="Image URL"><input style={inputStyle} placeholder="https://..." value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></Field>
        <Field label="Title (optional)"><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Link URL (optional)" style={{ flex: 2 }}><input style={inputStyle} placeholder="/course/1 or https://..." value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} /></Field>
          <Field label="Order" style={{ flex: 1 }}><input type="number" style={inputStyle} value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} /></Field>
        </div>
        <button onClick={add} disabled={saving} style={{ ...goldBtn, width: "100%" }}>{saving ? "Adding..." : "+ Add banner"}</button>
        {error && <ErrorBox msg={error} />}
      </div>

      {banners.length === 0 && <Muted>No banners yet.</Muted>}
      {banners.map((b) => (
        <div key={b.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 10, marginBottom: 8, display: "flex", gap: 10, alignItems: "center" }}>
          <img src={b.image_url} alt="" style={{ width: 70, height: 44, objectFit: "cover", borderRadius: 6, flexShrink: 0, background: "#0000001a" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{b.title || "(no title)"}</div>
            <div style={{ fontSize: 11, color: "#9a917f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>#{b.display_order} · {b.link_url || "no link"}</div>
          </div>
          <button onClick={() => remove(b.id)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>Delete</button>
        </div>
      ))}
    </div>
  );
}

// ── Notifications tab ────────────────────────────────────────────────────────
function NotificationsTab() {
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", body: "", link_url: "" });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    api("/admin-extra/notifications").then((d) => setList(d.notifications || [])).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function send() {
    if (!form.title.trim() || !form.body.trim()) { setError("Title and message required"); return; }
    setSaving(true); setError(""); setOk("");
    try {
      await api("/admin-extra/notifications", "POST", {
        title: form.title.trim(), body: form.body.trim(), link_url: form.link_url.trim() || null,
      });
      setOk("✓ Notification sent to all users");
      setForm({ title: "", body: "", link_url: "" });
      load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  async function remove(id: number) {
    if (!confirm("Notification record delete karein? (Jo push ja chuki hai wo wapas nahi aayegi)")) return;
    try { await api(`/admin-extra/notifications/${id}`, "DELETE"); load(); } catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Send notification to all users</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#9a917f" }}>Appears in the app for every user (e.g. "New SSC CGL test series live!").</p>
        <Field label="Title"><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="New Mock Test Live!" /></Field>
        <Field label="Message"><textarea style={{ ...inputStyle, minHeight: 80 }} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
        <Field label="Link (optional)"><input style={inputStyle} value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="/mock-tests" /></Field>
        <button onClick={send} disabled={saving} style={{ ...goldBtn, width: "100%" }}>{saving ? "Sending..." : "📢 Send to all"}</button>
        {ok && <p style={{ color: "#5dd97c", fontSize: 13.5, marginTop: 10, fontWeight: 700 }}>{ok}</p>}
        {error && <ErrorBox msg={error} />}
      </div>

      <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Sent</h3>
      {list.length === 0 && <Muted>No notifications sent yet.</Muted>}
      {list.map((n) => (
        <div key={n.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{n.title}</div>
              <div style={{ fontSize: 12, color: "#9a917f", marginTop: 2 }}>{n.body}</div>
            </div>
            <button onClick={() => remove(n.id)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>Del</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Question Bank tab (list / search / delete) ───────────────────────────────
function QuestionBankTab() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const LIMIT = 50;

  function load(off = 0, query = q) {
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
    if (query) params.set("q", query);
    api(`/admin-extra/questions?${params.toString()}`)
      .then((d) => { setItems(d.questions || []); setTotal(d.total || 0); setOffset(off); })
      .catch((e) => setError(e.message));
  }
  useEffect(() => { load(0); }, []);

  async function remove(id: number) {
    if (!confirm("Question delete ho jayega AUR jis mock test me hai wahan se bhi hat jayega. Pakka?")) return;
    try { await api(`/admin-extra/questions/${id}`, "DELETE"); load(offset); } catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input style={{ ...inputStyle, marginBottom: 0, flex: 1 }} placeholder="🔍 Search question text..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(0)} />
        <button onClick={() => load(0)} style={{ ...goldBtn, padding: "12px 18px" }}>Search</button>
      </div>
      <p style={{ fontSize: 12, color: "#9a917f", margin: "0 0 10px" }}>{total} questions total</p>
      {error && <ErrorBox msg={error} />}
      {items.map((it) => (
        <div key={it.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, marginBottom: 8, opacity: it.is_active === false ? 0.5 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>{it.question_en}</div>
              <div style={{ fontSize: 11, color: "#9a917f", marginTop: 4 }}>#{it.id} · Ans: {it.correct_answer} · {it.is_free ? "Free" : "Paid"}{it.is_active === false ? " · DELETED" : ""}</div>
            </div>
            {it.is_active !== false && (
              <button onClick={() => remove(it.id)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>Delete</button>
            )}
          </div>
        </div>
      ))}
      {total > LIMIT && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={() => load(Math.max(0, offset - LIMIT))} disabled={offset === 0} style={{ ...ghostBtn, flex: 1, opacity: offset === 0 ? 0.4 : 1 }}>← Prev</button>
          <button onClick={() => load(offset + LIMIT)} disabled={offset + LIMIT >= total} style={{ ...ghostBtn, flex: 1, opacity: offset + LIMIT >= total ? 0.4 : 1 }}>Next →</button>
        </div>
      )}
    </div>
  );
}

// ── Reviews tab ──────────────────────────────────────────────────────────────
function ReviewsTab() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [error, setError] = useState("");

  function load() {
    api("/admin-extra/reviews")
      .then((d) => setReviews(d.reviews || []))
      .catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function remove(id: number) {
    if (!confirm("Ye review delete ho jayega. Pakka?")) return;
    try {
      await api(`/admin-extra/reviews/${id}`, "DELETE");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (error) return <ErrorBox msg={error} />;
  if (reviews.length === 0) return <Muted>No reviews yet.</Muted>;

  return (
    <div>
      {reviews.map((r) => (
        <div key={r.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 12, marginBottom: 10, opacity: r.is_active === false ? 0.45 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{r.user_name || `User #${r.user_id}`}</div>
            <div style={{ color: GOLD, fontWeight: 800 }}>{"★".repeat(r.rating)}<span style={{ color: "#4a4436" }}>{"★".repeat(5 - r.rating)}</span></div>
          </div>
          <div style={{ fontSize: 12, color: "#9a917f", marginTop: 2 }}>Course #{r.course_id}</div>
          {r.review && <p style={{ fontSize: 13.5, margin: "8px 0 0", color: "#e0dacb" }}>{r.review}</p>}
          {r.is_active !== false && (
            <button onClick={() => remove(r.id)} style={{ ...smallBtn, marginTop: 10, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>
              Remove
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Users tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<any | null>(null);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [allSeries, setAllSeries] = useState<any[]>([]);
  const [allDesc, setAllDesc] = useState<any[]>([]);
  const [grant, setGrant] = useState({ course_id: "", days: "365" });
  // Kya grant karna hai: course / mock series / descriptive
  const [grantType, setGrantType] = useState<"course" | "mock" | "descriptive">("course");
  const [grantItem, setGrantItem] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [totalUsers, setTotalUsers] = useState<number | null>(null);

  function load() {
    // limit=1000 — pehle default 50 tha, isliye sirf 50 users dikhte the
    api("/admin/users?limit=1000")
      .then((d) => {
        setUsers(d.users || []);
        if (typeof d.total === "number") setTotalUsers(d.total);
      })
      .catch((e) => setError(e.message));
  }
  useEffect(() => {
    load();
    api("/admin-extra/courses").then((d) => setAllCourses(d.courses || [])).catch(() => {});
    api("/admin-extra/series").then((d) => setAllSeries(d.series || [])).catch(() => {});
    api("/admin-extra/desc/series").then((d) => setAllDesc(d.series || [])).catch(() => {});
  }, []);

  async function openDetail(id: number) {
    setError("");
    try {
      const d = await api(`/admin-extra/users/${id}/details`);
      setDetail(d);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function setBan(id: number, ban: boolean) {
    try {
      await api(`/admin/users/${id}/${ban ? "ban" : "unban"}`, "POST");
      load();
      if (detail) openDetail(id);
    } catch (e: any) {
      setError(e.message);
    }
  }

  // Ek hi function — course, mock series aur descriptive teeno ke liye
  async function grantAccess() {
    if (!detail) return;
    const uid = detail.user.id;
    setBusy(true);
    setError("");
    try {
      if (grantType === "course") {
        if (!grant.course_id) { setBusy(false); return; }
        await api(`/admin-extra/users/${uid}/grant-course`, "POST", {
          course_id: Number(grant.course_id),
          days: Number(grant.days) || 365,
        });
      } else if (grantType === "mock") {
        if (!grantItem) { setBusy(false); return; }
        await api(`/admin-extra/users/${uid}/grant-series`, "POST", { series_id: Number(grantItem) });
      } else {
        if (!grantItem) { setBusy(false); return; }
        await api(`/admin-extra/users/${uid}/grant-descriptive`, "POST", { series_id: Number(grantItem) });
      }
      setGrantItem("");
      setGrant({ ...grant, course_id: "" });
      openDetail(uid);
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function revokeCourse(courseId: number) {
    if (!detail || !confirm("Is user ka course access hata dein? Wo turant course nahi khol payega.")) return;
    try {
      await api(`/admin-extra/users/${detail.user.id}/revoke-course/${courseId}`, "DELETE");
      openDetail(detail.user.id);
    } catch (e: any) {
      setError(e.message);
    }
  }

  // ── Detail view ──
  if (detail) {
    const u = detail.user;
    return (
      <div>
        <button onClick={() => setDetail(null)} style={{ ...ghostBtn, marginBottom: 14 }}>
          ← All users
        </button>

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>
                {u.name || "Unnamed"} {u.is_banned && <span style={{ color: "#ff6b6b", fontSize: 12 }}>BANNED</span>}
              </div>
              <div style={{ fontSize: 12.5, color: "#9a917f", marginTop: 4, lineHeight: 1.8 }}>
                📧 {u.email || "—"}<br />
                📱 {u.phone || "—"}<br />
                🆔 #{u.id} · {u.points ?? 0} pts<br />
                📅 Joined {u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
              </div>
            </div>
            <button
              onClick={() => setBan(u.id, !u.is_banned)}
              style={{ ...smallBtn, color: u.is_banned ? "#5dd97c" : "#ff6b6b", borderColor: u.is_banned ? "rgba(93,217,124,0.4)" : "rgba(255,107,107,0.4)" }}
            >
              {u.is_banned ? "Unban" : "Ban"}
            </button>
          </div>
        </div>

        {/* ── Ye banda kaisa hai: paying / sirf free / gayab ── */}
        {detail.summary && (() => {
          const s = detail.summary;
          const V: Record<string, { label: string; color: string; note: string }> = {
            paying:        { label: "PAYING CUSTOMER",  color: "#5dd97c", note: "Isne apne paise se kharida hai." },
            granted_only:  { label: "ADMIN NE DIYA",    color: "#FFAB00", note: "Access admin ne diya, khud pay nahi kiya." },
            free_only:     { label: "SIRF FREE",        color: "#4A90D9", note: "Sirf free mock/descriptive try kiya — kabhi kharida nahi." },
            no_activity:   { label: "KOI ACTIVITY NAHI", color: "#9a917f", note: "Sign up kiya par kuch try nahi kiya." },
          };
          const v = V[s.verdict] || V.no_activity;
          return (
            <div style={{ background: CARD, border: `1px solid ${v.color}55`, borderLeft: `4px solid ${v.color}`, borderRadius: 12, padding: 13, marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: 1, color: v.color }}>{v.label}</div>
              <div style={{ fontSize: 12, color: "#9a917f", marginTop: 3 }}>{v.note}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(84px, 1fr))", gap: 8, marginTop: 11 }}>
                <MiniStat label="Kharch kiya" value={`₹${s.total_spent}`} color="#5dd97c" />
                <MiniStat label="Kharide" value={s.paid_items} color="#fff" />
                <MiniStat label="Admin ne diye" value={s.granted_items} color="#FFAB00" />
                <MiniStat label="Free mock" value={s.free_mock_attempts} color="#4A90D9" />
                <MiniStat label="Paid mock" value={s.paid_mock_attempts} color="#D6568F" />
                <MiniStat label="Descriptive" value={s.descriptive_submissions} color="#7C6CE0" />
              </div>
              {s.last_active && (
                <div style={{ fontSize: 11.5, color: "#9a917f", marginTop: 9 }}>
                  Aakhri activity: {new Date(s.last_active).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Purchases */}
        <h3 style={{ fontSize: 14.5, margin: "0 0 8px" }}>📚 Courses ({detail.courses.length})</h3>
        {detail.courses.length === 0 && <Muted>No courses.</Muted>}
        {detail.courses.map((c: any) => (
          <div key={c.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 12px", marginBottom: 8, opacity: c.is_active === false ? 0.5 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{c.title} {c.is_active === false && <span style={{ fontSize: 10.5, color: "#ff6b6b" }}>REVOKED</span>}</div>
                <div style={{ fontSize: 11, color: "#9a917f" }}>
                  ₹{c.amount_paid ?? 0}{c.payment_id === "ADMIN_GRANT" ? " · granted by admin" : ""} · {c.purchased_at ? new Date(c.purchased_at).toLocaleDateString("en-IN") : ""}
                  {c.expires_at ? ` · expires ${new Date(c.expires_at).toLocaleDateString("en-IN")}` : ""}
                </div>
              </div>
              {c.is_active !== false && (
                <button onClick={() => revokeCourse(c.course_id)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>
                  Revoke
                </button>
              )}
            </div>
          </div>
        ))}

        <h3 style={{ fontSize: 14.5, margin: "16px 0 8px" }}>📝 Mock Series ({detail.series.length})</h3>
        {detail.series.length === 0 && <Muted>No series purchases.</Muted>}
        {detail.series.map((s: any, i: number) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{s.title}</div>
            <div style={{ fontSize: 11, color: "#9a917f" }}>
              ₹{s.amount_paid ?? 0} · {s.purchased_at ? new Date(s.purchased_at).toLocaleDateString("en-IN") : ""}
            </div>
          </div>
        ))}

        {/* Grant access — course / mock series / descriptive */}
        <h3 style={{ fontSize: 14.5, margin: "16px 0 8px" }}>🎁 Grant access</h3>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12 }}>
          {/* Kis cheez ka access dena hai */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {([
              ["course", "📚 Course"],
              ["mock", "📝 Mock Series"],
              ["descriptive", "✍️ Descriptive"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => { setGrantType(k); setGrantItem(""); setGrant({ ...grant, course_id: "" }); }}
                style={{
                  flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  border: `1px solid ${grantType === k ? GOLD : BORDER}`,
                  background: grantType === k ? "rgba(255,171,0,0.14)" : "transparent",
                  color: grantType === k ? GOLD : "#e0dacb",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {grantType === "course" ? (
            <div style={{ display: "flex", gap: 8 }}>
              <select style={{ ...inputStyle, marginBottom: 0, flex: 2 }} value={grant.course_id} onChange={(e) => setGrant({ ...grant, course_id: e.target.value })}>
                <option value="">Select course...</option>
                {allCourses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <input type="number" placeholder="Days" style={{ ...inputStyle, marginBottom: 0, flex: 1 }} value={grant.days} onChange={(e) => setGrant({ ...grant, days: e.target.value })} />
            </div>
          ) : (
            <select style={{ ...inputStyle, marginBottom: 0 }} value={grantItem} onChange={(e) => setGrantItem(e.target.value)}>
              <option value="">{grantType === "mock" ? "Select mock series..." : "Select descriptive series..."}</option>
              {(grantType === "mock" ? allSeries : allDesc)
                .filter((s: any) => s.is_active !== false)
                .map((s: any) => (
                  <option key={s.id} value={s.id}>{s.title} {Number(s.price) > 0 ? `(₹${s.price})` : "(Free)"}</option>
                ))}
            </select>
          )}

          <button
            onClick={grantAccess}
            disabled={busy || (grantType === "course" ? !grant.course_id : !grantItem)}
            style={{ ...goldBtn, width: "100%", marginTop: 10, opacity: busy || (grantType === "course" ? !grant.course_id : !grantItem) ? 0.5 : 1 }}
          >
            {busy ? "Granting..." : "Grant access"}
          </button>
          <p style={{ fontSize: 11, color: "#9a917f", margin: "8px 0 0" }}>
            UPI/screenshot payment, dispute ya gift ke liye. ₹0 "granted by admin" ke roop me record hota hai.
            Mock aur descriptive series lifetime unlock hoti hain (days sirf courses pe lagte hain).
          </p>
        </div>

        {/* Descriptive purchases */}
        <h3 style={{ fontSize: 14.5, margin: "16px 0 8px" }}>✍️ Descriptive ({(detail.descriptive || []).length})</h3>
        {(!detail.descriptive || detail.descriptive.length === 0) && <Muted>Koi descriptive series nahi li.</Muted>}
        {(detail.descriptive || []).map((d: any, i: number) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 12px", marginBottom: 6 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{d.title}</div>
            <div style={{ fontSize: 11.5, color: "#9a917f" }}>
              {Number(d.amount_paid) > 0 ? `₹${d.amount_paid} paid` : d.payment_id === "ADMIN_GRANT" ? "Admin ne diya" : "Free"}
              {d.purchased_at && ` · ${new Date(d.purchased_at).toLocaleDateString("en-IN")}`}
            </div>
          </div>
        ))}

        {/* Mock test attempts — free aur paid alag dikhte hain */}
        <h3 style={{ fontSize: 14.5, margin: "16px 0 8px" }}>📝 Mock tests diye ({(detail.mock_attempts || []).length})</h3>
        {(!detail.mock_attempts || detail.mock_attempts.length === 0) && <Muted>Abhi tak koi mock test nahi diya.</Muted>}
        {(detail.mock_attempts || []).slice(0, 15).map((a: any) => (
          <div key={a.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 12px", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                <div style={{ fontSize: 11.5, color: "#9a917f" }}>
                  Score {a.score}{a.total_marks ? `/${a.total_marks}` : ""} · ✓{a.correct} ✗{a.wrong}
                  {a.ended_at && ` · ${new Date(a.ended_at).toLocaleDateString("en-IN")}`}
                </div>
              </div>
              <span
                style={{
                  flexShrink: 0, fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6,
                  color: a.is_free ? "#5dd97c" : "#D6568F",
                  border: `1px solid ${a.is_free ? "rgba(93,217,124,0.4)" : "rgba(214,86,143,0.4)"}`,
                }}
              >
                {a.is_free ? "FREE" : "PAID"}
              </span>
            </div>
          </div>
        ))}

        {/* Descriptive submissions */}
        <h3 style={{ fontSize: 14.5, margin: "16px 0 8px" }}>📄 Descriptive likha ({(detail.descriptive_activity || []).length})</h3>
        {(!detail.descriptive_activity || detail.descriptive_activity.length === 0) && <Muted>Koi descriptive answer submit nahi kiya.</Muted>}
        {(detail.descriptive_activity || []).slice(0, 10).map((d: any) => (
          <div key={d.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "9px 12px", marginBottom: 6, fontSize: 12.5 }}>
            <b>{d.title}</b>
            <span style={{ color: "#9a917f" }}>
              {d.status ? ` · ${d.status}` : ""}{d.score != null ? ` · ${d.score} marks` : ""}
              {d.submitted_at ? ` · ${new Date(d.submitted_at).toLocaleDateString("en-IN")}` : ""}
            </span>
          </div>
        ))}
        {error && <ErrorBox msg={error} />}
      </div>
    );
  }

  // ── List view ──
  const shown = users.filter((u) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (u.name || "").toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s) || String(u.phone || "").includes(s) || String(u.id) === s;
  });

  if (error && users.length === 0) return <ErrorBox msg={error} />;
  if (users.length === 0) return <Muted>Loading users...</Muted>;

  return (
    <div>
      <input
        placeholder="🔍 Search name, email, phone or ID..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ ...inputStyle, marginBottom: 12 }}
      />
      <p style={{ fontSize: 12, color: "#9a917f", margin: "0 0 10px" }}>{shown.length} of {users.length} users{totalUsers && totalUsers > users.length ? ` (database me ${totalUsers})` : ""}</p>
      {shown.map((u) => (
        <div key={u.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {u.name || "Unnamed"} {u.is_banned && <span style={{ color: "#ff6b6b", fontSize: 12 }}>BANNED</span>}
              </div>
              <div style={{ fontSize: 12, color: "#9a917f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email || u.phone || `#${u.id}`} · {u.points ?? 0} pts</div>
            </div>
            <button onClick={() => openDetail(u.id)} style={{ ...smallBtn, color: GOLD }}>
              Details
            </button>
            <button
              onClick={() => setBan(u.id, !u.is_banned)}
              style={{ ...smallBtn, color: u.is_banned ? "#5dd97c" : "#ff6b6b", borderColor: u.is_banned ? "rgba(93,217,124,0.4)" : "rgba(255,107,107,0.4)" }}
            >
              {u.is_banned ? "Unban" : "Ban"}
            </button>
          </div>
        </div>
      ))}
      {error && <ErrorBox msg={error} />}
    </div>
  );
}

// ── Coupons tab ──────────────────────────────────────────────────────────────
function CouponsTab() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [pub, setPub] = useState({ code: "", discount_type: "percent", discount_value: "", scope_type: "all", scope_id: "" });
  const [gen, setGen] = useState({ count: "10", prefix: "SL", discount_type: "percent", discount_value: "", scope_type: "all", scope_id: "" });
  const [generated, setGenerated] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<any>(null);

  function load() {
    api("/admin/coupons")
      .then((d) => setCoupons(d.coupons || []))
      .catch((e) => setError(e.message));
    api("/admin-extra/coupons/report").then(setReport).catch(() => {});
  }
  useEffect(load, []);

  async function createPublic() {
    if (!pub.code || !pub.discount_value) return;
    setBusy(true);
    setError("");
    try {
      await api("/admin-extra/coupons/public", "POST", {
        code: pub.code,
        discount_type: pub.discount_type,
        discount_value: Number(pub.discount_value),
        is_public: true,
        scope_type: pub.scope_type,
        scope_id: pub.scope_type === "all" ? null : pub.scope_id,
      });
      setPub({ code: "", discount_type: "percent", discount_value: "", scope_type: "all", scope_id: "" });
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function generate() {
    if (!gen.discount_value) return;
    setBusy(true);
    setError("");
    setGenerated([]);
    try {
      const d = await api("/admin-extra/coupons/generate", "POST", {
        count: Number(gen.count) || 10,
        prefix: gen.prefix || "SL",
        discount_type: gen.discount_type,
        discount_value: Number(gen.discount_value),
        scope_type: gen.scope_type,
        scope_id: gen.scope_type === "all" ? null : gen.scope_id,
      });
      setGenerated(d.codes || []);
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function remove(id: number) {
    if (!confirm("Coupon band ho jayega — koi naya user use nahi kar payega. Pakka?")) return;
    try {
      await api(`/admin/coupons/${id}`, "DELETE");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  function copyAll() {
    navigator.clipboard?.writeText(generated.join("\n"));
  }

  return (
    <div>
      {report && report.report.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>📈 Coupon usage ({report.total_redemptions} total redemptions)</h3>
          <div style={{ marginTop: 8 }}>
            {report.report.slice(0, 20).map((r: any) => (
              <div key={r.code} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(128,128,128,0.15)", fontSize: 12.5 }}>
                <span><b style={{ color: GOLD }}>{r.code}</b> <span style={{ color: "#9a917f" }}>({r.discount_type === "percent" ? `${r.discount_value}%` : `₹${r.discount_value}`}{r.is_active === false ? " · inactive" : ""})</span></span>
                <b>{r.times_used} used</b>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Universal (public) coupon */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Universal coupon</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#9a917f" }}>
          Shows automatically on course pages for everyone.
        </p>
        <input style={inputStyle} placeholder="Code (e.g. NIKKI50)" value={pub.code} onChange={(e) => setPub({ ...pub, code: e.target.value })} />
        <div style={{ display: "flex", gap: 10 }}>
          <select style={{ ...inputStyle, flex: 1 }} value={pub.discount_type} onChange={(e) => setPub({ ...pub, discount_type: e.target.value })}>
            <option value="percent">Percent (%)</option>
            <option value="flat">Flat (₹)</option>
          </select>
          <input
            type="number"
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Value"
            value={pub.discount_value}
            onChange={(e) => setPub({ ...pub, discount_value: e.target.value })}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select style={{ ...inputStyle, flex: 1 }} value={pub.scope_type} onChange={(e) => setPub({ ...pub, scope_type: e.target.value, scope_id: "" })}>
            <option value="all">All products</option>
            <option value="course">Specific Course</option>
            <option value="mock">Specific Mock Series</option>
            <option value="descriptive">Specific Descriptive Series</option>
          </select>
          {pub.scope_type !== "all" && (
            <input
              type="number"
              style={{ ...inputStyle, flex: 1 }}
              placeholder={`${pub.scope_type} ID`}
              value={pub.scope_id}
              onChange={(e) => setPub({ ...pub, scope_id: e.target.value })}
            />
          )}
        </div>
        <button onClick={createPublic} disabled={busy} style={{ ...goldBtn, width: "100%" }}>
          + Create universal coupon
        </button>
      </div>

      {/* Unique single-use generator */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Generate unique coupons</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#9a917f" }}>
          Random one-time codes — each works only once.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="How many" style={{ flex: 1 }}>
            <input type="number" style={inputStyle} value={gen.count} onChange={(e) => setGen({ ...gen, count: e.target.value })} />
          </Field>
          <Field label="Prefix" style={{ flex: 1 }}>
            <input style={inputStyle} value={gen.prefix} onChange={(e) => setGen({ ...gen, prefix: e.target.value })} />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select style={{ ...inputStyle, flex: 1 }} value={gen.discount_type} onChange={(e) => setGen({ ...gen, discount_type: e.target.value })}>
            <option value="percent">Percent (%)</option>
            <option value="flat">Flat (₹)</option>
          </select>
          <input
            type="number"
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Value"
            value={gen.discount_value}
            onChange={(e) => setGen({ ...gen, discount_value: e.target.value })}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select style={{ ...inputStyle, flex: 1 }} value={gen.scope_type} onChange={(e) => setGen({ ...gen, scope_type: e.target.value, scope_id: "" })}>
            <option value="all">All products</option>
            <option value="course">Specific Course</option>
            <option value="mock">Specific Mock Series</option>
            <option value="descriptive">Specific Descriptive Series</option>
          </select>
          {gen.scope_type !== "all" && (
            <input
              type="number"
              style={{ ...inputStyle, flex: 1 }}
              placeholder={`${gen.scope_type} ID`}
              value={gen.scope_id}
              onChange={(e) => setGen({ ...gen, scope_id: e.target.value })}
            />
          )}
        </div>
        <button onClick={generate} disabled={busy} style={{ ...goldBtn, width: "100%" }}>
          {busy ? "Generating..." : "Generate codes"}
        </button>
        {generated.length > 0 && (
          <div style={{ marginTop: 12, background: "rgba(0,0,0,0.4)", borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, color: "#9a917f" }}>{generated.length} codes created</span>
              <button onClick={copyAll} style={smallBtn}>Copy all</button>
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 13, lineHeight: 1.7, maxHeight: 180, overflowY: "auto" }}>
              {generated.map((c) => (
                <div key={c}>{c}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <ErrorBox msg={error} />}

      {/* Coupon list */}
      {coupons.map((c) => (
        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 12, marginBottom: 10, opacity: c.is_active === false ? 0.45 : 1 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: 1 }}>
              {c.code}{" "}
              {c.is_public && <span style={{ fontSize: 10, color: "#5dd97c", border: "1px solid rgba(93,217,124,0.4)", borderRadius: 6, padding: "1px 6px", marginLeft: 4 }}>PUBLIC</span>}
              {c.is_single_use && <span style={{ fontSize: 10, color: GOLD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "1px 6px", marginLeft: 4 }}>{(c.used_count || 0) > 0 ? "USED" : "1-TIME"}</span>}
            </div>
            <div style={{ fontSize: 12, color: "#9a917f" }}>
              {c.discount_type === "percent" ? `${c.discount_value}% off` : `₹${c.discount_value} off`}
            </div>
          </div>
          {c.is_active !== false && (
            <button onClick={() => remove(c.id)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>
              Delete
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
// ── Shared UI ────────────────────────────────────────────────────────────────
function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: 2, ...style }}>
      <div style={{ fontSize: 12.5, color: "#9a917f", marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

function BundlePicker({
  value,
  onChange,
  courses,
  series,
  desc,
  selfType,
  selfId,
}: {
  value: any[];
  onChange: (v: any[]) => void;
  courses: any[];
  series: any[];
  desc: any[];
  selfType: "course" | "mock" | "descriptive";
  selfId?: number | null;
}) {
  const items = Array.isArray(value) ? value : [];
  const has = (t: string, id: number) => items.some((i) => i.type === t && Number(i.id) === Number(id));
  const toggle = (t: string, id: number) => {
    onChange(has(t, id) ? items.filter((i) => !(i.type === t && Number(i.id) === Number(id))) : [...items, { type: t, id }]);
  };

  const groups: { t: "course" | "mock" | "descriptive"; label: string; list: any[] }[] = [
    { t: "course", label: "📚 Courses", list: courses },
    { t: "mock", label: "📝 Mock Series", list: series },
    { t: "descriptive", label: "✍️ Descriptive", list: desc },
  ];

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 12.5, color: "#c8c0ae", marginBottom: 4, fontWeight: 700 }}>
        🎁 Iske saath aur kya milega? (bundle)
      </div>
      <div style={{ fontSize: 11, color: "#9a917f", marginBottom: 10, lineHeight: 1.5 }}>
        Jo yahan tick karenge, ye product khareedte hi wo sab apne aap unlock ho jaayenge.
        Khaali chhodenge to normal product rahega.
      </div>

      {groups.map((g) => {
        const list = g.list.filter((x: any) => x.is_active !== false && !(g.t === selfType && Number(x.id) === Number(selfId)));
        if (list.length === 0) return null;
        return (
          <div key={g.t} style={{ marginBottom: 9 }}>
            <div style={{ fontSize: 10.5, letterSpacing: 1, color: "#7a7263", fontWeight: 800, marginBottom: 5 }}>{g.label}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {list.map((x: any) => {
                const on = has(g.t, x.id);
                return (
                  <button
                    key={x.id}
                    onClick={() => toggle(g.t, x.id)}
                    style={{
                      fontSize: 11.5, padding: "6px 10px", borderRadius: 8, cursor: "pointer", maxWidth: 220,
                      textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      border: `1px solid ${on ? GOLD : BORDER}`,
                      background: on ? "rgba(255,171,0,0.15)" : "transparent",
                      color: on ? GOLD : "#c8c0ae",
                    }}
                  >
                    {on ? "✓ " : ""}{x.title}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {items.length > 0 && (
        <div style={{ fontSize: 11.5, color: "#5dd97c", marginTop: 6, fontWeight: 700 }}>
          {items.length} cheezein bundle me hain
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 9, padding: "7px 9px" }}>
      <div style={{ fontSize: 15, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: "#9a917f", marginTop: 1 }}>{label}</div>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p style={{ color: "#8d8371", fontSize: 14 }}>{children}</p>;
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <p style={{ color: "#ff6b6b", fontSize: 13, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.3)", borderRadius: 10, padding: "10px 12px", marginTop: 12 }}>
      {msg}
    </p>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(0,0,0,0.4)",
  color: "#fff",
  fontSize: 14,
  marginBottom: 12,
  boxSizing: "border-box",
};

const goldBtn: React.CSSProperties = {
  background: GOLD,
  color: "#1a1a1a",
  border: "none",
  borderRadius: 10,
  padding: "12px 18px",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: "#fff",
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  padding: "9px 14px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const smallBtn: React.CSSProperties = {
  background: "transparent",
  color: "#fff",
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: "6px 12px",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};
