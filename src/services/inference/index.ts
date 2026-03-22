/**
 * Note Type Inference + Confidence Detail
 * 「写す」の核心：書いた瞬間に「これは判断だ」と映し出す
 */

type NoteType = "decision" | "learning" | "scratch" | "emotion" | "log";
type DecayProfile = "stable" | "exploratory" | "situational";

export interface InferenceResult {
  type: NoteType;
  confidenceStructural: number;
  confidenceExperiential: number;
  confidenceTemporal: number;
  decayProfile: DecayProfile;
}

// 判断を示すパターン（断定的表現）
const DECISION_PATTERNS = [
  /に決めた/,
  /にする$/m,
  /を選ぶ/,
  /を採用/,
  /にした$/m,
  /ことにする/,
  /方針として/,
  /結論として/,
  /判断した/,
  /決定した/,
  /I decided/i,
  /I('ll| will) go with/i,
  /decision:/i,
  /conclusion:/i,
  /we('ll| will) use/i,
  /let's go with/i,
];

// 学びを示すパターン
const LEARNING_PATTERNS = [
  /わかった/,
  /理解した/,
  /学んだ/,
  /知った/,
  /だと気づ/,
  /ということ/,
  /TIL/i,
  /I learned/i,
  /turns out/i,
  /realized/i,
  /now I understand/i,
];

// 感情を示すパターン
const EMOTION_PATTERNS = [
  /嬉しい|楽しい|悲しい|辛い|怒り|不安|焦り|安心|感動/,
  /モヤモヤ|イライラ|ワクワク|ドキドキ/,
  /気持ち|感じ/,
  /I feel/i,
  /frustrated|excited|happy|sad|anxious|relieved/i,
];

// ログを示すパターン
const LOG_PATTERNS = [
  /^\d{1,2}:\d{2}/m,
  /作業ログ|日報|進捗/,
  /やったこと|Done:|TODO:/i,
  /完了|対応済み/,
];

function countMatches(content: string, patterns: RegExp[]): number {
  return patterns.reduce((count, pattern) => {
    const matches = content.match(new RegExp(pattern, "g"));
    return count + (matches ? matches.length : 0);
  }, 0);
}

function computeStructuralConfidence(content: string, type: NoteType): number {
  const patterns =
    type === "decision" ? DECISION_PATTERNS :
    type === "learning" ? LEARNING_PATTERNS :
    type === "emotion" ? EMOTION_PATTERNS :
    type === "log" ? LOG_PATTERNS :
    [];

  const matches = countMatches(content, patterns);
  // 1マッチで0.4、2で0.6、3以上で0.8+
  return Math.min(0.95, 0.2 + matches * 0.2);
}

function inferDecayProfile(type: NoteType, content: string): DecayProfile {
  if (type === "decision") {
    // 原則・方針系は stable
    if (/方針|原則|ルール|policy|principle|always|never/i.test(content)) {
      return "stable";
    }
    return "exploratory";
  }
  if (type === "learning") return "exploratory";
  return "situational";
}

export function inferNoteType(content: string): InferenceResult {
  const scores: Record<NoteType, number> = {
    decision: countMatches(content, DECISION_PATTERNS) * 1.0,
    learning: countMatches(content, LEARNING_PATTERNS) * 0.6,
    emotion: countMatches(content, EMOTION_PATTERNS) * 0.4,
    log: countMatches(content, LOG_PATTERNS) * 0.3,
    scratch: 0.1, // baseline
  };

  // 最高スコアのタイプを選択
  const type = (Object.entries(scores) as [NoteType, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  const structural = computeStructuralConfidence(content, type);

  // experiential / temporal は初回作成時は低い（蓄積で上がる）
  const experiential = 0.1;
  const temporal = 0.1;

  return {
    type,
    confidenceStructural: Math.round(structural * 100) / 100,
    confidenceExperiential: Math.round(experiential * 100) / 100,
    confidenceTemporal: Math.round(temporal * 100) / 100,
    decayProfile: inferDecayProfile(type, content),
  };
}
