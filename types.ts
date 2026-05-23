export type Category = 'clothes' | 'accessories' | 'pose' | 'background';

export interface AppOption {
  id: string;
  name: string;
  imageUrl: string;
  refUrl?: string;
  poseText?: string;
  promptText?: string;
}

export interface SelectionState {
  clothes: string;
  accessories: string[];
  pose: string;
  background: string;
}

export interface PhotoAnalysisResult {
    isAllowed: boolean;
    reason?: string;
    score?: number;
    qualityMessage?: string;
}
