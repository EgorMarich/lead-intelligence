export type DiscoveryLogic = 'AND' | 'OR';

export type DiscoveryField =
  | 'city'
  | 'category'
  | 'hasWebsite'
  | 'hasPhone'
  | 'hasEmail'
  | 'hasTelegram'
  | 'hasVk'
  | 'hasWhatsapp'
  | 'hasInstagram'
  | 'onlineBooking'
  | 'technology'
  | 'rating'
  | 'reviewsCount'
  | 'employeeCount'
  | 'score'
  | 'grade';

export type DiscoveryOperator = 'eq' | 'neq' | 'gte' | 'lte' | 'contains' | 'in' | 'isTrue' | 'isFalse';

export interface DiscoveryCondition {
  field: DiscoveryField;
  operator: DiscoveryOperator;
  value?: string | number | boolean | string[] | number[];
}

export interface DiscoveryFilterGroup {
  logic: DiscoveryLogic;
  conditions: DiscoveryCondition[];
  groups?: DiscoveryFilterGroup[];
}

export interface DiscoveryFilters {
  version: 1;
  root: DiscoveryFilterGroup;
}

export const DISCOVERY_FIELDS: { value: DiscoveryField; label: string; operators: DiscoveryOperator[]; valueType: 'text' | 'number' | 'boolean' | 'select' }[] = [
  { value: 'city', label: 'Город', operators: ['eq', 'neq', 'contains'], valueType: 'text' },
  { value: 'category', label: 'Категория', operators: ['eq', 'neq', 'contains'], valueType: 'text' },
  { value: 'hasWebsite', label: 'Есть сайт', operators: ['isTrue', 'isFalse'], valueType: 'boolean' },
  { value: 'hasPhone', label: 'Есть телефон', operators: ['isTrue', 'isFalse'], valueType: 'boolean' },
  { value: 'hasEmail', label: 'Есть email', operators: ['isTrue', 'isFalse'], valueType: 'boolean' },
  { value: 'hasTelegram', label: 'Telegram', operators: ['isTrue', 'isFalse'], valueType: 'boolean' },
  { value: 'hasVk', label: 'VK', operators: ['isTrue', 'isFalse'], valueType: 'boolean' },
  { value: 'hasWhatsapp', label: 'WhatsApp', operators: ['isTrue', 'isFalse'], valueType: 'boolean' },
  { value: 'hasInstagram', label: 'Instagram', operators: ['isTrue', 'isFalse'], valueType: 'boolean' },
  { value: 'onlineBooking', label: 'Онлайн-запись', operators: ['isTrue', 'isFalse'], valueType: 'boolean' },
  { value: 'technology', label: 'Технология', operators: ['eq', 'neq', 'contains'], valueType: 'text' },
  { value: 'rating', label: 'Рейтинг', operators: ['gte', 'lte', 'eq'], valueType: 'number' },
  { value: 'reviewsCount', label: 'Отзывы', operators: ['gte', 'lte', 'eq'], valueType: 'number' },
  { value: 'employeeCount', label: 'Сотрудники', operators: ['gte', 'lte', 'eq'], valueType: 'number' },
  { value: 'score', label: 'Lead score', operators: ['gte', 'lte', 'eq'], valueType: 'number' },
  { value: 'grade', label: 'Грейд', operators: ['eq', 'neq', 'in'], valueType: 'select' },
];

export const DISCOVERY_OPERATORS: Record<DiscoveryOperator, string> = {
  eq: 'равно', neq: 'не равно', gte: '≥', lte: '≤', contains: 'содержит', in: 'входит в', isTrue: 'да', isFalse: 'нет',
};
