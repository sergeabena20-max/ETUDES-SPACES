type QuizTarget = {
  academicLevelId: string | null;
  programId: string | null;
};

type UserProfile = {
  academicLevelId: string | null;
  programId: string | null;
};

export function canAccessQuiz(user: UserProfile, quiz: QuizTarget) {
  if (quiz.academicLevelId && quiz.academicLevelId !== user.academicLevelId) return false;
  if (quiz.programId && quiz.programId !== user.programId) return false;
  return true;
}
