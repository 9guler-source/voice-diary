import { getLastSelectedQuestionIds } from "./actions";
import QuestionSelector from "./QuestionSelector";

export default async function SelectQuestionsPage() {
  const lastSelectedIds = await getLastSelectedQuestionIds();

  return <QuestionSelector defaultSelectedIds={lastSelectedIds} />;
}
