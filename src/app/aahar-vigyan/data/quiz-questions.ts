import { QuizQuestion } from '../models/aahar-vigyan.model';

export const AAHAR_VIGYAN_QUIZ: QuizQuestion[] = [
  {
    question: 'How does your body respond after meals?',
    hindi: 'भोजन के बाद आपका शरीर कैसा महसूस करता है?',
    hint: 'Think about your most typical experience',
    options: [
      { dosha: 'v', emoji: '🌬️', title: 'Variable & Unpredictable', subtitle: 'Sometimes light, sometimes bloated. Digestion feels unreliable.' },
      { dosha: 'p', emoji: '🔥', title: 'Efficient & Warm', subtitle: 'Digest quickly. Feel ready for the next meal soon. Strong appetite.' },
      { dosha: 'k', emoji: '🌿', title: 'Slow & Satisfied', subtitle: 'Feel pleasantly full for hours. Steady and unhurried digestion.' },
    ],
  },
  {
    question: 'Your skin without products feels...',
    hindi: 'बिना उत्पादों के आपकी त्वचा कैसी लगती है?',
    hint: 'Focus on your most natural state',
    options: [
      { dosha: 'v', emoji: '🍂', title: 'Dry or Flaky', subtitle: 'Especially in cold or dry weather. Fine-pored and thin.' },
      { dosha: 'p', emoji: '💧', title: 'Oily or Reactive', subtitle: 'Prone to redness or heat. Warm to the touch. Sensitive.' },
      { dosha: 'k', emoji: '🪷', title: 'Smooth & Moist', subtitle: 'Rarely problematic. Soft, lustrous, cool to the touch.' },
    ],
  },
  {
    question: 'Your energy through the day...',
    hindi: 'दिन भर आपकी ऊर्जा का स्वभाव कैसा रहता है?',
    hint: 'Your most honest default pattern',
    options: [
      { dosha: 'v', emoji: '⚡', title: 'Bursts then Crashes', subtitle: 'Creative highs followed by sudden exhaustion. Very variable.' },
      { dosha: 'p', emoji: '🎯', title: 'Intense & Focused', subtitle: 'Work with great drive and precision. Push hard until burnout.' },
      { dosha: 'k', emoji: '🐘', title: 'Slow to Start, Steady', subtitle: 'Needs a long warm-up but sustains energy well once moving.' },
    ],
  },
  {
    question: 'Your natural appetite feels...',
    hindi: 'आपकी भूख का स्वभाव आमतौर पर कैसा रहता है?',
    hint: 'Think about your default hunger pattern',
    options: [
      { dosha: 'v', emoji: '🎲', title: 'Irregular & Variable', subtitle: 'Forget meals or crave snacks at odd hours. Unpredictable.' },
      { dosha: 'p', emoji: '🌋', title: 'Strong & Sharp', subtitle: 'Get irritable if meals are delayed. Intense urgent hunger.' },
      { dosha: 'k', emoji: '🪨', title: 'Mild & Steady', subtitle: 'Could skip meals without distress. Hunger is gentle and consistent.' },
    ],
  },
  {
    question: 'In cold or dry weather, your body...',
    hindi: 'ठंडे या शुष्क मौसम में आपका शरीर कैसा महसूस करता है?',
    hint: 'Your natural weather preference',
    options: [
      { dosha: 'v', emoji: '🥶', title: 'Feels Depleted Fast', subtitle: 'Uncomfortable, anxious, scattered quickly. Dislike cold strongly.' },
      { dosha: 'p', emoji: '😌', title: 'Actually Enjoys It', subtitle: 'Run warm internally. Cold is a relief. Dislike hot summers.' },
      { dosha: 'k', emoji: '💨', title: 'Dislike Cold Damp', subtitle: 'Prefer warm and dry. Cold wet weather causes congestion.' },
    ],
  },
  {
    question: 'Under significant stress, you tend to...',
    hindi: 'गहरे तनाव में आप स्वाभाविक रूप से क्या करते हैं?',
    hint: 'Your instinctive stress response',
    options: [
      { dosha: 'v', emoji: '🌪️', title: 'Become Anxious', subtitle: 'Overthink, lose sleep, scatter focus. Mind races through worries.' },
      { dosha: 'p', emoji: '⚔️', title: 'Become Critical', subtitle: 'Perfectionist, sharp-tongued, controlling. Intensify effort.' },
      { dosha: 'k', emoji: '🐢', title: 'Withdraw & Slow', subtitle: 'Overeat for comfort. Become stubborn and retreat inward.' },
    ],
  },
  {
    question: 'Your natural body frame is...',
    hindi: 'आपकी प्राकृतिक शारीरिक बनावट कैसी है?',
    hint: 'Your natural build without effort',
    options: [
      { dosha: 'v', emoji: '🪶', title: 'Light & Lean', subtitle: 'Naturally slender. Hard to gain weight even when eating well.' },
      { dosha: 'p', emoji: '💪', title: 'Medium & Athletic', subtitle: 'Moderate build. Gain and lose weight with relative ease.' },
      { dosha: 'k', emoji: '🌰', title: 'Broader & Heavier', subtitle: 'Naturally larger frame. Weight comes easily, leaves slowly.' },
    ],
  },
  {
    question: 'Your sleep pattern is usually...',
    hindi: 'आपकी नींद का स्वभाव आमतौर पर कैसा रहता है?',
    hint: 'How you sleep most nights',
    options: [
      { dosha: 'v', emoji: '🌙', title: 'Light & Interrupted', subtitle: 'Wake easily, vivid dreams, difficulty falling back asleep.' },
      { dosha: 'p', emoji: '😴', title: 'Moderate but Hot', subtitle: 'Sleep soundly but wake warm. May need less sleep than others.' },
      { dosha: 'k', emoji: '🛏️', title: 'Deep & Long', subtitle: 'Hard to wake up. Love sleeping in. Very restorative sleep.' },
    ],
  },
  {
    question: 'Your hair naturally tends to be...',
    hindi: 'आपके बाल स्वाभाविक रूप से कैसे होते हैं?',
    hint: 'Without styling products',
    options: [
      { dosha: 'v', emoji: '💨', title: 'Dry, Thin or Frizzy', subtitle: 'Breaks easily. Needs oil and moisture.' },
      { dosha: 'p', emoji: '🔴', title: 'Fine but Early Greying', subtitle: 'Oily scalp possible. Warm-toned. May thin with stress.' },
      { dosha: 'k', emoji: '✨', title: 'Thick, Lustrous, Wavy', subtitle: 'Strong and abundant. Oily if not washed regularly.' },
    ],
  },
  {
    question: 'When speaking or debating, you are...',
    hindi: 'बातचीत या बहस में आप कैसे होते हैं?',
    hint: 'Your natural communication style',
    options: [
      { dosha: 'v', emoji: '💬', title: 'Quick & Animated', subtitle: 'Talk fast, jump topics, expressive gestures. Words flow easily.' },
      { dosha: 'p', emoji: '🎤', title: 'Sharp & Persuasive', subtitle: 'Direct, logical, competitive. Speak with conviction and heat.' },
      { dosha: 'k', emoji: '🤫', title: 'Calm & Measured', subtitle: 'Speak slowly, choose words carefully. Prefer listening.' },
    ],
  },
  {
    question: 'Your preferred exercise style is...',
    hindi: 'आप किस प्रकार की व्यायाम पसंद करते हैं?',
    hint: 'What feels natural to your body',
    options: [
      { dosha: 'v', emoji: '🏃', title: 'Varied & Spontaneous', subtitle: 'Dance, yoga, walking — light movement. Dislike rigid routines.' },
      { dosha: 'p', emoji: '🏋️', title: 'Intense & Competitive', subtitle: 'Running, sports, strength training. Push limits.' },
      { dosha: 'k', emoji: '🚶', title: 'Steady & Endurance', subtitle: 'Long walks, swimming, gentle consistent activity.' },
    ],
  },
  {
    question: 'Your memory and learning style...',
    hindi: 'आपकी स्मृति और सीखने की शैली कैसी है?',
    hint: 'How you absorb and retain information',
    options: [
      { dosha: 'v', emoji: '📚', title: 'Quick but Scattered', subtitle: 'Grasp fast, forget fast. Creative learner. Many interests.' },
      { dosha: 'p', emoji: '🧠', title: 'Sharp & Analytical', subtitle: 'Excellent focus. Remember details. Learn by understanding why.' },
      { dosha: 'k', emoji: '🐌', title: 'Slow but Permanent', subtitle: 'Take time to learn but never forget. Prefer repetition.' },
    ],
  },
  {
    question: 'Your bowel movements are typically...',
    hindi: 'आपकी मल त्याग की आदत आमतौर पर कैसी होती है?',
    hint: 'Your most common pattern',
    options: [
      { dosha: 'v', emoji: '🎢', title: 'Irregular or Dry', subtitle: 'Constipation, gas, or variable. Sensitive to travel and stress.' },
      { dosha: 'p', emoji: '🔥', title: 'Regular but Soft', subtitle: 'Often 1–2 times daily. Can be loose when stressed or overheated.' },
      { dosha: 'k', emoji: '🌊', title: 'Slow & Heavy', subtitle: 'Once daily, well-formed but sluggish. Mucous when imbalanced.' },
    ],
  },
  {
    question: 'Your internal body temperature feels...',
    hindi: 'आपके शरीर का आंतरिक तापमान कैसा महसूस होता है?',
    hint: 'Hands, feet, and general warmth',
    options: [
      { dosha: 'v', emoji: '❄️', title: 'Often Cold', subtitle: 'Cold hands and feet. Seek warmth. Sensitive to drafts.' },
      { dosha: 'p', emoji: '☀️', title: 'Naturally Warm', subtitle: 'Run hot. Sweat easily. Prefer cool environments.' },
      { dosha: 'k', emoji: '🌡️', title: 'Cool & Stable', subtitle: 'Neither too hot nor cold. Steady internal temperature.' },
    ],
  },
  {
    question: 'Your emotional temperament is...',
    hindi: 'आपका भावनात्मक स्वभाव कैसा है?',
    hint: 'Your default emotional landscape',
    options: [
      { dosha: 'v', emoji: '🎭', title: 'Changeable & Sensitive', subtitle: 'Mood shifts quickly. Empathic. Prone to worry and excitement.' },
      { dosha: 'p', emoji: '👑', title: 'Passionate & Driven', subtitle: 'Strong emotions. Leadership instinct. Can be impatient or angry.' },
      { dosha: 'k', emoji: '🕊️', title: 'Calm & Forgiving', subtitle: 'Slow to anger, slow to excite. Steady affection. Can hold grudges quietly.' },
    ],
  },
];

export const QUIZ_TIME_ESTIMATES = [
  '~12 min', '~11 min', '~10 min', '~9 min', '~8 min', '~7 min',
  '~6 min', '~5 min', '~4 min', '~3 min', '~2 min', '~1 min',
  'Almost done', 'Almost done', 'Last one',
];
