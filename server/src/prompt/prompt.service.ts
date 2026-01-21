import * as fs from 'fs/promises';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { Stroke } from 'src/common/types';

@Injectable()
export class PromptService {
  constructor() {}

  async getPromptForRound(
    promptId: number,
    round: number,
  ): Promise<Stroke[] | null> {
    const promptStrokesData = await this.loadPromptStrokes();
    const index = (promptId + round - 1) % promptStrokesData.length;
    if (index < 0 || index >= promptStrokesData.length) {
      return null;
    }
    return promptStrokesData[index];
  }

  async getRandomPromptId(): Promise<number> {
    const promptStrokesData = await this.loadPromptStrokes();

    const id = Math.floor(Math.random() * promptStrokesData.length);
    return id;
  }

  private async loadPromptStrokes(): Promise<Stroke[][]> {
    const promptPath = path.join(process.cwd(), 'data', 'promptStrokes.json');
    const data = await fs.readFile(promptPath, 'utf-8');
    const promptStrokesData = JSON.parse(data) as Stroke[][];
    return promptStrokesData;
  }
}
