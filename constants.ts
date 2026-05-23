import { AppOption, SelectionState } from './types';

export const CLOTHES: AppOption[] = [
  { id: 'hud', name: 'Худи', imageUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/hoodie-prev.jpg', refUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/hoodie.jpg' },
  { id: 'tshirt', name: 'Футболка', imageUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/t-shirt-prev.jpg', refUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/t-shirt.jpg' },
  { id: 'jumpsuit', name: 'Комбинезон', imageUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/coverall-prev.jpg', refUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/coverall.jpg' },
  { id: 'shirt', name: 'Рубашка', imageUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/shirt-prev.jpg', refUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/shirt.jpg' },
  { id: 'suit-male', name: 'Костюм муж', imageUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/suit-male-prev.jpg', refUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/suit-male.jpg', promptText: "Men's smart casual office suit, modern corporate attire, well-fitted" },
  { id: 'suit-female', name: 'Костюм жен', imageUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/suit-female-prev.jpg', refUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/suit-female.jpg', promptText: "Women's smart casual office suit, modern corporate attire, well-fitted blazer with a crisp white shirt underneath" },
];

export const ACCESSORIES_GROUP_1: AppOption[] = [
  { id: 'none1', name: 'Нет', imageUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/placeholder-none.jpg' },
  { id: 'red_helmet', name: 'Каска красная', imageUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/hat-red-prev.jpg', refUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/hat-red.jpg' },
  { id: 'white_helmet', name: 'Каска белая', imageUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/hat-white-prev.jpg', refUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/hat-white.jpg' },
];

export const ACCESSORIES_GROUP_2: AppOption[] = [
  { id: 'none2', name: 'Нет', imageUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/placeholder-none.jpg' },
  { id: 'pendant', name: 'Подвеска', imageUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/pendant.jpg', refUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/pendant.jpg' },
  { id: 'flag', name: 'Флаг', imageUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/flag-prev.jpg', refUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/flag.jpeg' },
];

export const POSES: AppOption[] = [
  { id: 'neutral', name: 'Нейтральная', imageUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/neutral.jpg', poseText: 'standing in a neutral stance, facing forward' },
  { id: 'crossed_arms', name: 'Руки скрещены', imageUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/crossed-arms.jpg', poseText: 'standing confidently with crossed arms' },
  { id: 'hand_heart', name: 'Ладонь на сердце', imageUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/on-heart.jpg', poseText: 'standing with one hand placed gently over the heart' },
  { id: 'interlocked_hands', name: 'Руки сложены', imageUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/folded-arms.jpg', poseText: 'A person is leaning forward with their forearms crossed horizontally across a surface, such as a table or desk edge. The right forearm is positioned directly over the left forearm, with both palms facing down. The fingers are relaxed and slightly curled, resting on the surface. The body is tilted forward, and the head is held straight, looking directly into the camera lens with a steady, confident gaze. Gaze is directed forward.' },
  { id: 'victory', name: 'One love', imageUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/one-love.jpg', poseText: 'showing a heart sign with hands' },
  { id: 'class', name: 'Палец вверх', imageUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/thumb-up.jpg', poseText: 'giving a thumbs up gesture' },
];

export const BACKGROUNDS: AppOption[] = [
  { id: 'studio', name: 'Студийный', imageUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/studio-prev.jpg' },
  { id: 'studio2', name: 'Студийный 2', imageUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/studio2-2-prev.jpg' },
  { id: 'secret', name: 'Случайная локация', imageUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/random.jpg'},
  { id: 'cover', name: 'Обложка журнала', imageUrl: 'https://raw.githubusercontent.com/cerikopik-v2/tryon-v2-asset/refs/heads/main/magazine.jpg'},
];

export const DEFAULT_SELECTION: SelectionState = {
  clothes: 'hud',
  accessories: ['none1', 'none2'], // index 0 for group1, 1 for group2
  pose: 'neutral',
  background: 'studio',
};
