// Ye page jaan-boojh kar SERVER component hai — sirf isliye taaki metadata
// export ho sake. Score checker ek SEO page hai: log Google par "answer key
// score calculator" dhoondte hain. Baaki site ke pages client component hain
// kyunki unhe metadata ki zarurat nahi thi.
//
// Asli kaam ScoreCheckerForm karta hai, jo client component hai.

import type { Metadata } from "next";
import ScoreCheckerForm from "./ScoreCheckerForm";

export const metadata: Metadata = {
  title: "Answer Key Score Calculator | SelectionLab",
  description:
    "Paste your official response sheet link and get your exact score, section by section, with a question-wise review of every answer.",
  alternates: { canonical: "https://selectionlab.in/score-checker" },
};

export default function ScoreCheckerPage() {
  return <ScoreCheckerForm />;
}
