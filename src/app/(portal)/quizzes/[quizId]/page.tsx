import { QuizEngine } from '@/components/assessment/QuizEngine';

export default function QuizPage({ params }: { params: { quizId: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="header-kicker">Assessment</p>
        <h1 className="page-title">Quiz</h1>
        <p className="page-subtitle mt-1">Answer all questions. Multiple-choice will be auto-graded.</p>
      </div>
      <QuizEngine quizId={params.quizId} />
    </div>
  );
}
