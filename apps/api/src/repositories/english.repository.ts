import { db } from "../utils/db";

/**
 * English repository — SpeakingAttempt (TASK-004, S_E1).
 */

export type SpeakingAttemptRow = {
  id: string;
  userId: string;
  prompt: string;
  audioUrl: string;
  modelAudioUrl: string;
  selfScore: number | null;
  createdAt: Date;
};

export interface IEnglishRepository {
  createSpeakingAttempt(data: {
    userId: string;
    prompt: string;
    audioUrl: string;
    modelAudioUrl: string;
  }): Promise<SpeakingAttemptRow>;
}

export class EnglishRepository implements IEnglishRepository {
  async createSpeakingAttempt(data: {
    userId: string;
    prompt: string;
    audioUrl: string;
    modelAudioUrl: string;
  }): Promise<SpeakingAttemptRow> {
    return db.speakingAttempt.create({
      data,
      select: {
        id: true,
        userId: true,
        prompt: true,
        audioUrl: true,
        modelAudioUrl: true,
        selfScore: true,
        createdAt: true,
      },
    });
  }
}
