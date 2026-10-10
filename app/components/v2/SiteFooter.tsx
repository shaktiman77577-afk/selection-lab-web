import Link from "next/link";

const LEARN = [
  ["/courses", "Courses"],
  ["/mock-tests", "Mock Tests"],
  ["/descriptive", "Descriptive"],
  ["/tier2", "Typing / Skill Test"],
  ["/blog", "Blog"],
];
const COMPANY = [
  ["/about", "About"],
  ["/contact", "Contact"],
  ["/support", "Help & Support"],
  ["/partner", "Become a Partner"],
];
const LEGAL = [
  ["/privacy", "Privacy"],
  ["/terms", "Terms"],
];

function Col({ title, items }: { title: string; items: string[][] }) {
  return (
    <div>
      <h3>{title}</h3>
      <ul>
        {items.map(([href, label]) => (
          <li key={href}>
            <Link href={href}>{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SiteFooter() {
  return (
    <footer className="v2-ftr">
      <div className="v2-wrap v2-ftr-in">
        <div className="v2-ftr-brand">
          <div className="v2-brand" style={{ fontSize: 19 }}>
            <span>
              Selection <b>Lab</b>
            </span>
          </div>
          <p className="v2-sub" style={{ maxWidth: 320 }}>
            Your selection, our mission. Courses, mock tests and skill tests for government exams — in Hindi and English.
          </p>
        </div>
        <Col title="LEARN" items={LEARN} />
        <Col title="COMPANY" items={COMPANY} />
        <Col title="LEGAL" items={LEGAL} />
      </div>
      <div className="v2-wrap v2-copy">© {new Date().getFullYear()} Selection Lab</div>
    </footer>
  );
}
