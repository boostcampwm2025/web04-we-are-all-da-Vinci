export type { Similarity } from './model/similarity';
export type { PreprocessedStrokeData } from './model/preprocessedStrokeData';
export {
  preprocessStrokes,
  calculateFinalSimilarityByStrokes,
  calculateFinalSimilarityByPreprocessed,
} from './lib/calculateFinalSimilarity';
