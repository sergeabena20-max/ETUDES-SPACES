type QuizTarget = {
  academicLevelId: string | null;
  programId: string | null;
};

type UserProfile = {
  academicLevelId?: string | null;
  programId?: string | null;
  academicLevel?: { id: string } | null;
  program?: { id: string } | null;
};

export function canAccessQuiz(user: UserProfile, quiz: QuizTarget) {
  const userAcademicLevelId =
    user.academicLevelId ?? user.academicLevel?.id ?? null;
  const userProgramId = user.programId ?? user.program?.id ?? null;

  if (
    quiz.academicLevelId &&
    quiz.academicLevelId !== userAcademicLevelId
  ) {
    return false;
  }

  if (quiz.programId && quiz.programId !== userProgramId) {
    return false;
  }

  return true;
}
