export interface Activity {
  id: string
  name: string
  duration: number // in minutes
  startTime?: Date
  endTime?: Date
  completed: boolean
  order: number
}

export interface DayTemplate {
  id: string
  name: string
  activities: Omit<Activity, "startTime" | "endTime" | "completed">[]
}

export const DEFAULT_TEMPLATES: DayTemplate[] = [
  {
    id: "work-day",
    name: "Рабочий день",
    activities: [
      { id: "1", name: "Утренний ритуал", duration: 30, order: 0, completed: false },
      { id: "2", name: "Глубокая работа", duration: 120, order: 1, completed: false },
      { id: "3", name: "Обед", duration: 60, order: 2, completed: false },
      { id: "4", name: "Встречи", duration: 90, order: 3, completed: false },
      { id: "5", name: "Фокусная работа", duration: 90, order: 4, completed: false },
      { id: "6", name: "Спорт", duration: 60, order: 5, completed: false },
      { id: "7", name: "Вечерний ритуал", duration: 30, order: 6, completed: false },
    ],
  },
  {
    id: "creative-day",
    name: "Творческий день",
    activities: [
      { id: "1", name: "Утренние страницы", duration: 30, order: 0, completed: false },
      { id: "2", name: "Творческая сессия", duration: 150, order: 1, completed: false },
      { id: "3", name: "Прогулка", duration: 45, order: 2, completed: false },
      { id: "4", name: "Обед", duration: 60, order: 3, completed: false },
      { id: "5", name: "Вдохновение", duration: 90, order: 4, completed: false },
      { id: "6", name: "Рефлексия", duration: 30, order: 5, completed: false },
    ],
  },
  {
    id: "weekend",
    name: "Выходной",
    activities: [
      { id: "1", name: "Медленное утро", duration: 60, order: 0, completed: false },
      { id: "2", name: "Хобби", duration: 120, order: 1, completed: false },
      { id: "3", name: "Обед с семьей", duration: 90, order: 2, completed: false },
      { id: "4", name: "Отдых", duration: 120, order: 3, completed: false },
      { id: "5", name: "Вечерняя прогулка", duration: 45, order: 4, completed: false },
    ],
  },
  {
    id: "creative-flow",
    name: "Творческий поток",
    activities: [
      { id: "1", name: "Утренние страницы", duration: 30, order: 0, completed: false },
      { id: "2", name: "Творческая сессия", duration: 150, order: 1, completed: false },
      { id: "3", name: "Прогулка", duration: 45, order: 2, completed: false },
      { id: "4", name: "Обед", duration: 60, order: 3, completed: false },
      { id: "5", name: "Вдохновение", duration: 90, order: 4, completed: false },
      { id: "6", name: "Рефлексия", duration: 30, order: 5, completed: false },
    ],
  },
  {
    id: "rest-day",
    name: "День отдыха",
    activities: [
      { id: "1", name: "Медленное утро", duration: 60, order: 0, completed: false },
      { id: "2", name: "Хобби", duration: 120, order: 1, completed: false },
      { id: "3", name: "Обед с семьей", duration: 90, order: 2, completed: false },
      { id: "4", name: "Отдых", duration: 120, order: 3, completed: false },
      { id: "5", name: "Вечерняя прогулка", duration: 45, order: 4, completed: false },
    ],
  },
  {
    id: "intensive",
    name: "Интенсивный",
    activities: [
      { id: "1", name: "Быстрый старт", duration: 15, order: 0, completed: false },
      { id: "2", name: "Спринт 1", duration: 90, order: 1, completed: false },
      { id: "3", name: "Короткий перерыв", duration: 15, order: 2, completed: false },
      { id: "4", name: "Спринт 2", duration: 90, order: 3, completed: false },
      { id: "5", name: "Обед", duration: 45, order: 4, completed: false },
      { id: "6", name: "Спринт 3", duration: 90, order: 5, completed: false },
      { id: "7", name: "Финальный рывок", duration: 60, order: 6, completed: false },
      { id: "8", name: "Восстановление", duration: 30, order: 7, completed: false },
    ],
  },
  {
    id: "study-day",
    name: "День учебы",
    activities: [
      { id: "1", name: "Подъем и завтрак", duration: 45, order: 0, completed: false },
      { id: "2", name: "Учеба", duration: 120, order: 1, completed: false },
      { id: "3", name: "Перерыв", duration: 15, order: 2, completed: false },
      { id: "4", name: "Учеба", duration: 120, order: 3, completed: false },
      { id: "5", name: "Обед", duration: 60, order: 4, completed: false },
      { id: "6", name: "Учеба", duration: 60, order: 5, completed: false },
      { id: "7", name: "Перерыв", duration: 15, order: 6, completed: false },
      { id: "8", name: "Повторение и закрепление", duration: 60, order: 7, completed: false },
      { id: "9", name: "Подведение итогов", duration: 15, order: 8, completed: false },
      { id: "10", name: "Свободное время", duration: 120, order: 9, completed: false },
      { id: "11", name: "Ужин", duration: 60, order: 10, completed: false },
      { id: "12", name: "Развитие/отдых", duration: 120, order: 11, completed: false },
      { id: "13", name: "Подготовка ко сну", duration: 60, order: 12, completed: false },
    ],
  },
  {
    id: "order-reading-day",
    name: "День порядка и чтения",
    activities: [
      { id: "1", name: "Подъём и завтрак", duration: 45, order: 0, completed: false },
      { id: "2", name: "Уборка по дому", duration: 120, order: 1, completed: false },
      { id: "3", name: "Перерыв", duration: 15, order: 2, completed: false },
      { id: "4", name: "Организация вещей / стирка / мелкие дела", duration: 90, order: 3, completed: false },
      { id: "5", name: "Обед", duration: 60, order: 4, completed: false },
      { id: "6", name: "Чтение (основное, с конспектом)", duration: 120, order: 5, completed: false },
      { id: "7", name: "Перерыв", duration: 15, order: 6, completed: false },
      { id: "8", name: "Разбор заметок / рефлексия / запись инсайтов", duration: 60, order: 7, completed: false },
      { id: "9", name: "Подведение итогов дня", duration: 15, order: 8, completed: false },
      { id: "10", name: "Свободное время", duration: 120, order: 9, completed: false },
      { id: "11", name: "Ужин", duration: 60, order: 10, completed: false },
      { id: "12", name: "Лёгкое чтение или просмотр видео по теме книги", duration: 120, order: 11, completed: false },
      { id: "13", name: "Подготовка ко сну", duration: 60, order: 12, completed: false },
    ],
  },
  {
    id: "project-training-day",
    name: "День проекта и тренировок",
    activities: [
      { id: "1", name: "Подъём и завтрак", duration: 45, order: 0, completed: false },
      { id: "2", name: "Тренировка (силовая / функциональная)", duration: 90, order: 1, completed: false },
      { id: "3", name: "Перерыв / душ / восстановление", duration: 30, order: 2, completed: false },
      { id: "4", name: "Работа над проектом (основная сессия)", duration: 120, order: 3, completed: false },
      { id: "5", name: "Обед", duration: 60, order: 4, completed: false },
      { id: "6", name: "Продолжение проекта (кодинг / тестирование)", duration: 120, order: 5, completed: false },
      { id: "7", name: "Перерыв", duration: 15, order: 6, completed: false },
      { id: "8", name: "Планирование, документация или обучение по проекту", duration: 60, order: 7, completed: false },
      { id: "9", name: "Подведение итогов / фиксация прогресса", duration: 15, order: 8, completed: false },
      { id: "10", name: "Свободное время", duration: 120, order: 9, completed: false },
      { id: "11", name: "Ужин", duration: 60, order: 10, completed: false },
      { id: "12", name: "Отдых / прогулка / расслабление", duration: 120, order: 11, completed: false },
      { id: "13", name: "Подготовка ко сну", duration: 60, order: 12, completed: false },
    ],
  },
]
