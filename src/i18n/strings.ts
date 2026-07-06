// AUTO-GENERATED port of lib/i18n/strings.dart (StudyFlow mobile app).
// key -> { langCode -> text }. Do not hand-edit structure; regenerate from the
// Dart source if it changes.

export interface AppLanguage {
  code: string;
  label: string;
  flag: string;
  isRtl: boolean;
}

export const LANGUAGES: AppLanguage[] = [
  { code: 'he', label: 'עברית', flag: '🇮🇱', isRtl: true },
  { code: 'en', label: 'English', flag: '🇺🇸', isRtl: false },
];

export const translations: Record<string, Record<string, string>> = {
  // --- onboarding ---
  'app_tagline': {
    'he': 'הסטודנט שבך — מאורגן ✨\nתכנון, מיקוד והרגלים במקום אחד 📚',
    'en':
      'The student in you — organized ✨\nPlanning, focus and habits in one place 📚',
  },
  'lets_start': { 'he': '🚀 בוא נתחיל', 'en': "🚀 Let's start" },
  'choose_language': { 'he': '🌍 בחירת שפה', 'en': '🌍 Choose your language' },
  'choose_language_sub': {
    'he': 'Choose your language 🗣️',
    'en': 'בחירת שפה 🗣️',
  },
  'choose_style': { 'he': '🎨 בחר/י סגנון', 'en': '🎨 Choose a style' },
  'choose_style_sub': {
    'he': '✨ אפשר לשנות בכל רגע בהגדרות',
    'en': '✨ You can change this anytime in settings',
  },
  'continue': { 'he': 'המשך ←', 'en': 'Continue →' },
  'almost_ready': { 'he': '🎉 כמעט מוכנים!', 'en': '🎉 Almost ready!' },
  'almost_ready_sub': {
    'he': '🔐 התחבר/י כדי לשמור את התוכנית שלך ולסנכרן בין מכשירים',
    'en': '🔐 Sign in to save your plan and sync across devices',
  },
  'continue_google': { 'he': 'המשך עם Google', 'en': 'Continue with Google' },
  'continue_apple': { 'he': 'התחבר עם Apple', 'en': 'Sign in with Apple' },
  'sign_in_error': {
    'he': 'ההתחברות נכשלה, נסה/י שוב',
    'en': 'Sign-in failed, please try again',
  },
  'logout_confirm_title': { 'he': 'להתנתק?', 'en': 'Log out?' },
  'logout_confirm_body': {
    'he': 'הנתונים נשארים על המכשיר. תוכל/י להתחבר שוב בכל עת.',
    'en': 'Your data stays on this device. You can sign back in anytime.',
  },
  'cancel': { 'he': 'ביטול', 'en': 'Cancel' },

  // --- nav ---
  'nav_home': { 'he': 'בית', 'en': 'Home' },
  'nav_calendar': { 'he': 'לו״ז', 'en': 'Calendar' },
  'nav_tasks': { 'he': 'משימות', 'en': 'Tasks' },
  'nav_stats': { 'he': 'סטטס', 'en': 'Stats' },
  'nav_tasks_courses': { 'he': 'משימות וקורסים', 'en': 'Tasks & Courses' },
  'nav_profile': { 'he': 'פרופיל', 'en': 'Profile' },
  'nav_chat': { 'he': 'צ׳אט AI', 'en': 'AI Chat' },

  // --- home ---
  'today_str': { 'he': 'היום', 'en': 'Today' },
  'greeting': { 'he': 'בוקר טוב 👋', 'en': 'Good morning 👋' },
  'ai_daily_summary': { 'he': 'סיכום AI יומי', 'en': 'Daily AI summary' },
  'home_ai_text': {
    'he': 'יש לך משימות ואירועים היום — בוא/י נתכנן יחד 🧠',
    'en': 'You have tasks and events today — let\'s plan together 🧠',
  },
  'home_ai_empty': {
    'he': 'עדיין אין משימות או אירועים — לחץ/י ➕ כדי להתחיל ✨',
    'en': 'No tasks or events yet — tap ➕ to get started ✨',
  },
  'open_chat': { 'he': 'פתח/י צ׳אט', 'en': 'Open chat' },
  'streak_days': { 'he': 'ימי רצף 🔥', 'en': 'day streak 🔥' },
  'tasks_today': { 'he': 'משימות', 'en': 'tasks' },
  'urgent_today': { 'he': 'מה דחוף היום', 'en': "Today's urgent" },
  'see_all': { 'he': 'הכל ←', 'en': 'All →' },
  'today_schedule': { 'he': 'הלו״ז של היום', 'en': "Today's schedule" },
  'empty_urgent_tasks': {
    'he': 'אין משימות דחופות — נהדר! 🎉',
    'en': 'No urgent tasks — nice! 🎉',
  },
  'empty_schedule': {
    'he': 'אין אירועים היום — הוסף/י דרך ➕',
    'en': 'No events today — add one via ➕',
  },
  'keep_going': {
    'he': '💪 את/ה בדרך הנכונה!',
    'en': '💪 You\'re on the right track!',
  },

  // --- tasks ---
  'my_tasks': { 'he': '✅ כל המשימות שלי', 'en': '✅ All my tasks' },
  'active_count': { 'he': '💪 {count} פעילות', 'en': '💪 {count} active' },
  'filter_all': { 'he': '📋 הכל', 'en': '📋 All' },
  'filter_urgent': { 'he': '🔥 דחוף', 'en': '🔥 Urgent' },
  'filter_today': { 'he': '☀️ היום', 'en': '☀️ Today' },
  'filter_done': { 'he': '✨ הושלם', 'en': '✨ Done' },
  'swipe_hint': {
    'he': '👆 ← החלק/י משימה למחיקה או שכפול',
    'en': '👆 ← Swipe a task to delete or duplicate',
  },
  'pr_high': { 'he': '🔴 דחוף', 'en': '🔴 Urgent' },
  'pr_med': { 'he': '🟡 בינוני', 'en': '🟡 Medium' },
  'pr_low': { 'he': '🟢 רגיל', 'en': '🟢 Normal' },
  'task_done': { 'he': 'כל הכבוד! 🎉', 'en': 'Well done! 🎉' },

  // --- calendar ---
  'cal_day': { 'he': '📅 יום', 'en': '📅 Day' },
  'cal_week': { 'he': '📅 שבוע', 'en': '📅 Week' },
  'cal_month': { 'he': '📅 חודש', 'en': '📅 Month' },
  'cal_year': { 'he': '🎯 שנה', 'en': '🎯 Year' },
  'cal_no_events': { 'he': 'אין אירועים ביום זה', 'en': 'No events this day' },
  'month_name': { 'he': '📅 יוני 2026', 'en': '📅 June 2026' },
  'events_suffix': { 'he': 'אירועים', 'en': 'events' },

  // --- stats ---
  'stats_title': { 'he': '📊 סטטיסטיקות', 'en': '📊 Statistics' },
  'range_week': { 'he': '📅 השבוע', 'en': '📅 This week' },
  'range_month': { 'he': '📅 החודש', 'en': '📅 This month' },
  'total_study_time': { 'he': '⏱️ סה״כ זמן למידה', 'en': '⏱️ Total study time' },
  'hours': { 'he': 'שעות', 'en': 'hours' },
  'minutes': { 'he': 'דקות', 'en': 'minutes' },
  'vs_prev_period': {
    'he': 'אין נתונים מהתקופה הקודמת',
    'en': 'No data from the previous period yet',
  },
  'vs_prev_up': { 'he': '↑ {pct}% לעומת {period}', 'en': '↑ {pct}% vs {period}' },
  'vs_prev_down': {
    'he': '↓ {pct}% לעומת {period}',
    'en': '↓ {pct}% vs {period}',
  },
  'vs_prev_same': { 'he': 'זהה ל{period}', 'en': 'Same as {period}' },
  'period_last_week': { 'he': 'שבוע שעבר', 'en': 'last week' },
  'period_last_month': { 'he': 'חודש שעבר', 'en': 'last month' },
  'stat_insight_streak': {
    'he': 'רצף פעילות של {n} ימים — כל הכבוד! 🔥',
    'en': '{n}-day activity streak — keep it up! 🔥',
  },
  'stat_insight_opens': {
    'he': 'נכנסת לאפליקציה {n} פעמים — מעולה! 📱',
    'en': 'You opened the app {n} times — nice! 📱',
  },
  'stat_insight_focus': {
    'he': 'השלמת {n} סשני מיקוד — המשך/י כך! 🎯',
    'en': 'You completed {n} focus sessions — keep going! 🎯',
  },
  'cal_sync_btn': { 'he': 'סנכרון יומן', 'en': 'Sync calendar' },
  'cal_sync_cta': { 'he': 'סנכרון עם היומן', 'en': 'Sync with calendar' },
  'hours_by_day': { 'he': '📈 שעות לפי יום', 'en': '📈 Hours by day' },
  'tasks_trend': { 'he': '📉 מגמת משימות', 'en': '📉 Tasks trend' },
  'study_consistency': { 'he': '🔥 עקביות לימוד', 'en': '🔥 Study consistency' },
  'ai_insight': { 'he': '💡 תובנת AI', 'en': '💡 AI insight' },
  'stat_insight_text': {
    'he': 'הוסף/י משימות וסשני מיקוד כדי לקבל תובנות מותאמות אישית 💡',
    'en': 'Add tasks and focus sessions to get personalized insights 💡',
  },
  'ring_tasks': { 'he': '✅ משימות', 'en': '✅ Tasks' },
  'ring_habits': { 'he': '🔥 הרגלים', 'en': '🔥 Habits' },
  'ring_focus': { 'he': '🎯 מיקוד', 'en': '🎯 Focus' },

  // --- profile ---
  'profile_name_placeholder': { 'he': 'השם שלך', 'en': 'Your name' },
  'profile_role': { 'he': 'סטודנט/ית', 'en': 'Student' },
  'profile_streak': { 'he': '🔥 רצף', 'en': '🔥 Streak' },
  'profile_hours': { 'he': '⏱️ שעות', 'en': '⏱️ Hours' },
  'profile_tasks': { 'he': '✅ משימות', 'en': '✅ Tasks' },
  'profile_shortcuts': { 'he': '⚡ קיצורים מהירים', 'en': '⚡ Quick shortcuts' },
  // ---- rewarded ads (watch a video to top up chat credits) ----
  'reward_card_title': {
    'he': 'נגמרו קרדיטי השיחה?',
    'en': 'Out of chat credits?',
  },
  'reward_card_sub': {
    'he': 'צפו בפרסומת וקבלו 10,000 קרדיטי שיחה נוספים.',
    'en': 'Watch an ad for 10,000 extra chat credits.',
  },
  'reward_watch_cta': {
    'he': '🎬 צפו בפרסומת וקבלו קרדיטי שיחה',
    'en': '🎬 Watch an ad for chat credits',
  },
  'reward_balance': {
    'he': 'יתרת קרדיטי שיחה: {n}',
    'en': 'Chat credits: {n}',
  },
  'reward_wait_cta': {
    'he': '⏳ ממתין… {s}s',
    'en': '⏳ Wait… {s}s',
  },
  'reward_loading': {
    'he': 'הסרטון נטען, נסה שוב בעוד רגע…',
    'en': 'Loading the video, try again in a moment…',
  },
  'reward_cooldown': {
    'he': 'אפשר לצפות בסרטון נוסף בעוד {s} שניות',
    'en': 'You can watch another video in {s}s',
  },
  'reward_earned': {
    'he': '🎉 מעולה! 10,000 קרדיטי שיחה בדרך אליך',
    'en': '🎉 Nice! 10,000 chat credits are on the way',
  },
  'reward_error': {
    'he': 'משהו השתבש עם הסרטון, נסה שוב מאוחר יותר',
    'en': 'Something went wrong with the video, try again later',
  },

  // ---- chat-credits purchases ----
  'menu_buy_credits': { 'he': '💎 קרדיטי שיחה', 'en': '💎 Chat credits' },
  'menu_buy_credits_sub': {
    'he': 'רכשו חבילות קרדיטים לסוכן',
    'en': 'Buy credit packages for the agent',
  },
  'purchases_title': {
    'he': 'בחרו חבילת קרדיטי שיחה',
    'en': 'Choose a chat-credits package',
  },
  'purchases_subtitle': {
    'he': 'המשיכו לדבר עם הסוכן האישי שלכם',
    'en': 'Keep talking with your personal agent',
  },
  'purchases_explain': {
    'he':
      'קרדיטי שיחה מאפשרים לכם לשלוח הודעות, לבנות לו״ז, לפרק משימות ולקבל עזרה חכמה בלימודים.',
    'en':
      'Chat credits let you send messages, build your schedule, break down tasks and get smart study help.',
  },
  'purchases_balance': {
    'he': 'יתרת קרדיטי שיחה: {n}',
    'en': 'Chat credits balance: {n}',
  },
  'pkg_credits': { 'he': '{n} קרדיטי שיחה', 'en': '{n} chat credits' },
  'pkg_buy': { 'he': 'רכישה', 'en': 'Buy' },
  'pkg_recommended_badge': { 'he': '⭐ הכי משתלם', 'en': '⭐ Best value' },
  'pkg_basic_name': { 'he': 'החבילה הבסיסית', 'en': 'Basic pack' },
  'pkg_recommended_name': { 'he': 'החבילה המומלצת', 'en': 'Recommended pack' },
  'pkg_daily_name': {
    'he': 'מומלץ לשימוש יומיומי בסוכן',
    'en': 'Great for daily agent use',
  },
  'pkg_serious_name': { 'he': 'ללומדים רציניים', 'en': 'For serious learners' },
  'purchase_processing': { 'he': 'מבצע רכישה…', 'en': 'Processing…' },
  'purchase_success': {
    'he': '🎉 נוספו {n} קרדיטי שיחה לחשבונך!',
    'en': '🎉 {n} chat credits added to your account!',
  },
  'purchase_error': {
    'he': 'הרכישה נכשלה, נסו שוב',
    'en': 'Purchase failed, please try again',
  },

  // ---- out of credits prompt ----
  'out_of_credits_title': { 'he': 'נגמרו הקרדיטים', 'en': 'Out of credits' },
  'out_of_credits_body': {
    'he':
      'אין לך מספיק קרדיטי שיחה כדי להמשיך. ניתן לצפות בפרסומת או לרכוש חבילה.',
    'en':
      'You don\'t have enough chat credits to continue. Watch an ad or buy a package.',
  },
  'out_of_credits_buy': { 'he': '💎 לרכישת חבילה', 'en': '💎 Buy a package' },
  'out_of_credits_watch': {
    'he': '🎬 צפייה בפרסומת',
    'en': '🎬 Watch an ad',
  },
  'menu_habits': { 'he': '🔥 הרגלים', 'en': '🔥 Habits' },
  'menu_habits_sub': { 'he': 'עקוב אחרי הרגלים', 'en': 'Track your habits' },
  'menu_focus': { 'he': '🎯 מצב מיקוד', 'en': '🎯 Focus mode' },
  'menu_focus_sub': { 'he': '⏱️ פומודורו', 'en': '⏱️ Pomodoro' },
  'menu_courses': { 'he': '📚 הקורסים שלי', 'en': '📚 My courses' },
  'menu_courses_sub': { 'he': 'נהל/י קורסים', 'en': 'Manage courses' },
  'menu_notebook': { 'he': '📓 Google NotebookLM', 'en': '📓 Google NotebookLM' },
  'menu_notebook_sub': { 'he': '✅ מחובר', 'en': '✅ Connected' },
  'menu_settings': { 'he': '⚙️ הגדרות', 'en': '⚙️ Settings' },
  'menu_settings_sub': {
    'he': 'שפה · עיצוב · התראות',
    'en': 'Language · Theme · Notifications',
  },
  'menu_logout': { 'he': '🚪 התנתקות', 'en': '🚪 Log out' },
  'menu_smart_notif': { 'he': '🔔 התראות חכמות', 'en': '🔔 Smart notifications' },
  'menu_smart_notif_sub': {
    'he': 'תזכורות לטלפון בזמן שתבחר/י',
    'en': 'Phone reminders at a time you choose',
  },
  'menu_agent_memory': { 'he': 'זיכרון הסוכן', 'en': 'Agent memory' },
  'menu_agent_memory_sub': {
    'he': 'מה הסוכן זוכר עליך',
    'en': 'What the agent remembers about you',
  },
  'opening_notebook': {
    'he': '📓 פותח NotebookLM…',
    'en': '📓 Opening NotebookLM…',
  },

  // --- generic ---
  'saved': { 'he': '✅ נשמר', 'en': '✅ Saved' },
  'edit': { 'he': 'עריכה', 'en': 'Edit' },
  'save_changes': { 'he': '💾 שמירת שינויים', 'en': '💾 Save changes' },
  'edit_task_title': { 'he': 'עריכת משימה', 'en': 'Edit task' },
  'edit_course_title': { 'he': 'עריכת קורס', 'en': 'Edit course' },
  'edit_event_title': { 'he': 'עריכת אירוע', 'en': 'Edit event' },

  // --- smart notifications ---
  'smart_notif_title': { 'he': 'התראות חכמות', 'en': 'Smart notifications' },
  'smart_notif_master': { 'he': 'התראות חכמות', 'en': 'Smart notifications' },
  'smart_notif_master_hint': {
    'he': 'תזכורות לטלפון בזמן שתבחר/י',
    'en': 'Phone reminders at a time you choose',
  },
  'smart_notif_empty': {
    'he': 'אין עדיין התראות.\nהוסף/י אחת עם הכפתור למטה.',
    'en': 'No reminders yet.\nAdd one with the button below.',
  },
  'smart_notif_disabled_hint': {
    'he': 'ההתראות החכמות כבויות — הדלק/י כדי שיצלצלו.',
    'en': 'Smart notifications are off — turn them on to get alerts.',
  },
  'smart_notif_add': { 'he': '➕ התראה חדשה', 'en': '➕ New reminder' },
  'smart_notif_new': { 'he': 'התראה חדשה', 'en': 'New reminder' },
  'smart_notif_edit': { 'he': 'עריכת התראה', 'en': 'Edit reminder' },
  'smart_notif_title_ph': {
    'he': 'על מה להזכיר?',
    'en': 'What should I remind you about?',
  },
  'smart_notif_desc_ph': {
    'he': 'תיאור (אופציונלי)',
    'en': 'Description (optional)',
  },
  'smart_notif_when': { 'he': 'מתי', 'en': 'When' },
  'smart_notif_link_q': {
    'he': 'לקשר למשימה או לאירוע?',
    'en': 'Link to a task or event?',
  },
  'smart_notif_link_none': { 'he': 'בלי קישור', 'en': 'None' },
  'smart_notif_link_task': { 'he': 'משימה', 'en': 'Task' },
  'smart_notif_link_schedule': { 'he': 'אירוע בלו״ז', 'en': 'Schedule' },
  'smart_notif_pick_task': { 'he': 'בחר/י משימה', 'en': 'Pick a task' },
  'smart_notif_pick_schedule': { 'he': 'בחר/י אירוע', 'en': 'Pick an event' },
  'smart_notif_no_tasks': { 'he': 'אין משימות', 'en': 'No tasks' },
  'smart_notif_no_schedule': { 'he': 'אין אירועים בלו״ז', 'en': 'No events' },
  'smart_notif_save': { 'he': '🔔 שמירת התראה', 'en': '🔔 Save reminder' },
  'smart_notif_delete': { 'he': 'מחיקה', 'en': 'Delete' },
  'smart_notif_default_body': { 'he': 'תזכורת', 'en': 'Reminder' },
  'smart_notif_need_title': {
    'he': 'צריך כותרת להתראה',
    'en': 'A reminder needs a title',
  },
  'smart_notif_added': { 'he': '🔔 התראה נוספה', 'en': '🔔 Reminder added' },
  'smart_notif_saved': { 'he': '✅ ההתראה עודכנה', 'en': '✅ Reminder updated' },
  'smart_notif_deleted': {
    'he': '🗑️ ההתראה נמחקה',
    'en': '🗑️ Reminder deleted',
  },

  // --- chat ---
  'chat_assistant': { 'he': 'העוזר של StudyFlow', 'en': 'StudyFlow Assistant' },
  // --- AI agent identity / renaming ---
  'agent_default_name': { 'he': 'הסוכן האישי שלי', 'en': 'My personal agent' },
  'agent_rename_title': { 'he': 'שם הסוכן', 'en': 'Agent name' },
  'agent_rename_hint': {
    'he': 'תן שם לסוכן (השאר ריק לאיפוס)',
    'en': 'Name your agent (leave blank to reset)',
  },
  'agent_rename_save': { 'he': 'שמירה', 'en': 'Save' },
  'agent_renamed': {
    'he': 'מעכשיו קוראים לי {name} 😊',
    'en': 'From now on, call me {name} 😊',
  },
  'chat_online': { 'he': '🟢 מקוון', 'en': '🟢 Online' },
  'chat_new': { 'he': 'צ׳אט חדש', 'en': 'New chat' },
  'chat_hide_keyboard': { 'he': 'סגור מקלדת', 'en': 'Hide keyboard' },
  'chat_placeholder': { 'he': '💬 כתוב/י הודעה…', 'en': '💬 Type a message…' },
  'chat_today': { 'he': '✨ היום', 'en': '✨ Today' },
  // Local opening greeting (no AI call). {name} = the agent's display name.
  'chat_greeting': {
    'he':
      'היי! אני {name}, העוזר האישי שלך 🎓 אפשר ליצור קורסים ומשימות, ' +
      'לבנות ולערוך לך את הלו"ז ועוד. במה נתחיל?',
    'en':
      "Hi! I'm {name}, your personal assistant 🎓 I can create courses and " +
      'tasks, build and edit your schedule, and more. What shall we start with?',
  },
  'chat_welcome': {
    'he':
      'היי! 👋 אני העוזר האישי שלך. אפשר לבקש ממני לבנות לו״ז, לשנות אירוע או ליצור משימות — פשוט כתוב לי.',
    'en':
      'Hi! 👋 I\'m your personal assistant. Ask me to build your schedule, change an event, or create tasks — just type.',
  },
  'chat_btn_schedule': {
    'he': 'שינוי / הוספת לו״ז',
    'en': 'Add / change schedule',
  },
  'chat_btn_task': { 'he': 'הוספת משימה', 'en': 'Add task' },
  'chat_mode_task': {
    'he': '✅ מצב הוספת משימה — ספר לי על המשימה ואסדר אותה לך.',
    'en': '✅ Add-task mode — tell me about the task and I\'ll set it up.',
  },
  'chat_mode_course': {
    'he': '📚 מצב הוספת קורס — איך נקרא לקורס?',
    'en': '📚 Add-course mode — what should we call the course?',
  },
  'chat_mode_schedule': {
    'he': '📅 מצב לו״ז — מה תרצה לקבוע או לשנות?',
    'en': '📅 Schedule mode — what would you like to set or change?',
  },
  'chat_attached_tasks': { 'he': '📎 צירפתי משימות', 'en': '📎 Attached tasks' },
  'chat_pick_tasks': {
    'he': '📎 בחר משימות לשליחה',
    'en': '📎 Pick tasks to send',
  },
  'chat_attach_file': {
    'he': '📎 צרף קובץ (Excel, PDF, CSV, טקסט)',
    'en': '📎 Attach file (Excel, PDF, CSV, text)',
  },
  'chat_file_remove': { 'he': 'הסר קובץ', 'en': 'Remove file' },
  'chat_file_parsing': { 'he': '⏳ מנתח קובץ…', 'en': '⏳ Parsing file…' },
  'chat_file_caption_placeholder': {
    'he': '💬 מה לעשות עם הקובץ? (אופציונלי)',
    'en': '💬 What to do with the file? (optional)',
  },
  'chat_file_parse_error': {
    'he': '📎 לא הצלחתי לקרוא את הקובץ. נסה קובץ אחר.',
    'en': '📎 I couldn\'t read that file. Try a different one.',
  },
  'chat_attach_send': { 'he': '🤖 שלח ל-AI', 'en': '🤖 Send to AI' },
  'chat_task_created': { 'he': '✅ יצרתי את המשימה', 'en': '✅ Task created' },
  'chat_task_updated': { 'he': '✅ עדכנתי את המשימה', 'en': '✅ Task updated' },
  'chat_task_deleted': { 'he': '🗑️ מחקתי את המשימה', 'en': '🗑️ Task deleted' },
  'chat_task_not_found': {
    'he': '🔎 לא מצאתי את המשימה הזאת',
    'en': '🔎 I could not find that task',
  },
  'chat_course_created': { 'he': '📚 יצרתי את הקורס', 'en': '📚 Course created' },
  'chat_course_updated': {
    'he': '📚 עדכנתי את הקורס',
    'en': '📚 Course updated',
  },
  'chat_course_deleted': {
    'he': '🗑️ מחקתי את הקורס',
    'en': '🗑️ Course deleted',
  },
  'chat_course_not_created': {
    'he': 'צריך כותרת כדי ליצור קורס',
    'en': 'A title is required to create a course',
  },
  'chat_course_not_found': {
    'he': '🔎 לא מצאתי את הקורס הזה',
    'en': '🔎 I could not find that course',
  },
  'chat_event_created': { 'he': '📅 הוספתי ללו״ז', 'en': '📅 Added to schedule' },
  'chat_event_updated': {
    'he': '📅 עדכנתי את הלו״ז',
    'en': '📅 Schedule updated',
  },
  'chat_event_deleted': {
    'he': '🗑️ מחקתי מהלו״ז',
    'en': '🗑️ Removed from schedule',
  },
  'chat_event_not_found': {
    'he': '🔎 לא מצאתי את האירוע הזה בלו״ז',
    'en': '🔎 I could not find that schedule event',
  },
  'chat_error': {
    'he': '🙏 אופס, משהו השתבש. נסה שוב',
    'en': '🙏 Oops, something went wrong. Try again',
  },
  'chat_empty_reply': {
    'he': '🤔 לא הצלחתי לקבל תשובה. נסה שוב?',
    'en': '🤔 I couldn\'t get a reply. Try again?',
  },
  'chat_schedule_lookup_found': {
    'he': '📅 מצאתי {count} אירועים ב-{date}',
    'en': '📅 Found {count} events on {date}',
  },
  'chat_schedule_lookup_empty': {
    'he': '📅 אין כלום בלו״ז ב-{date} — היום פנוי',
    'en': '📅 Nothing on the schedule for {date} — free day',
  },
  'chat_quota_exhausted': {
    'he': '🪙 אין לך מספיק קרדיטי שיחה כדי להמשיך. ניתן לצפות בפרסומת או לרכוש חבילה.',
    'en': '🪙 You don\'t have enough chat credits to continue. Watch an ad or buy a package.',
  },

  // --- chat: multi-action summary ---
  'chat_actions_done': { 'he': '✅ סיימתי!', 'en': '✅ Done!' },
  'chat_actions_created': { 'he': 'נוצרו {count}', 'en': 'created {count}' },
  'chat_actions_updated': { 'he': 'עודכנו {count}', 'en': 'updated {count}' },
  'chat_actions_deleted': { 'he': 'נמחקו {count}', 'en': 'deleted {count}' },
  'chat_actions_none': {
    'he': '🤔 לא הצלחתי לבצע את הפעולות',
    'en': '🤔 I couldn\'t apply those changes',
  },
  'chat_focus_started': {
    'he': '🎯 הפעלתי מיקוד ל-{min} דק׳',
    'en': '🎯 Started a {min}-min focus',
  },
  'chat_smart_notif_on': {
    'he': '🔔 הדלקתי התראות חכמות',
    'en': '🔔 Smart notifications on',
  },
  'chat_smart_notif_off': {
    'he': '🔕 כיביתי התראות חכמות',
    'en': '🔕 Smart notifications off',
  },
  'chat_pending_change': {
    'he': 'אני עומד לבצע {count} שינוי/ים. לא אשנה כלום עד שתאשר/י.',
    'en':
      'I’m about to make {count} change(s). Nothing will change until you approve.',
  },
  'chat_details_header': {
    'he': '🔍 פירוט מדויק ({count} שינויים):',
    'en': '🔍 Exact breakdown ({count} changes):',
  },
  'chat_detail_create': { 'he': '➕ יצירת', 'en': '➕ Create' },
  'chat_detail_update': { 'he': '✏️ עדכון', 'en': '✏️ Update' },
  'chat_detail_delete': { 'he': '🗑️ מחיקת', 'en': '🗑️ Delete' },
  'chat_noun_course': { 'he': 'קורס', 'en': 'course' },
  'chat_noun_task': { 'he': 'משימה', 'en': 'task' },
  'chat_noun_schedule': { 'he': 'פריט לו"ז', 'en': 'schedule item' },
  'chat_noun_reminder': { 'he': 'התראה חכמה', 'en': 'smart reminder' },
  'chat_detail_all_day': { 'he': 'כל היום', 'en': 'all day' },
  'chat_detail_weekly': { 'he': 'חוזר כל שבוע', 'en': 'repeats weekly' },
  'chat_detail_due': { 'he': 'דדליין', 'en': 'due' },
  'chat_detail_task_slots_too': {
    'he': 'כולל משבצות הלו"ז המקושרות',
    'en': 'including its linked schedule slots',
  },
  'chat_detail_focus': {
    'he': '🎯 הפעלת מצב מיקוד ל-{min} דקות',
    'en': '🎯 Start a {min}-minute focus',
  },
  'chat_detail_yes': { 'he': 'כן', 'en': 'yes' },
  'chat_detail_no': { 'he': 'לא', 'en': 'no' },
  'chat_field_title': { 'he': 'שם', 'en': 'title' },
  'chat_field_name': { 'he': 'שם', 'en': 'name' },
  'chat_field_description': { 'he': 'תיאור', 'en': 'description' },
  'chat_field_startDate': { 'he': 'תאריך התחלה', 'en': 'start date' },
  'chat_field_endDate': { 'he': 'תאריך סיום', 'en': 'end date' },
  'chat_field_courseId': { 'he': 'קורס', 'en': 'course' },
  'chat_field_dueDateTime': { 'he': 'דדליין', 'en': 'due' },
  'chat_field_urgency': { 'he': 'דחיפות', 'en': 'urgency' },
  'chat_field_estimatedDurationMinutes': { 'he': 'משך משוער (דק׳)', 'en': 'estimated minutes' },
  'chat_field_isCompleted': { 'he': 'הושלמה', 'en': 'completed' },
  'chat_field_taskId': { 'he': 'משימה מקושרת', 'en': 'linked task' },
  'chat_field_type': { 'he': 'סוג', 'en': 'type' },
  'chat_field_weeklyRepeat': { 'he': 'חזרה שבועית', 'en': 'weekly repeat' },
  'chat_field_allDay': { 'he': 'כל היום', 'en': 'all day' },
  'chat_field_dateTime': { 'he': 'מועד', 'en': 'time' },
  'chat_confirm_change': { 'he': 'מאשר', 'en': 'Approve' },
  'chat_reject_change': { 'he': 'לא מאשר', 'en': 'Reject' },
  'chat_change_rejected_followup': {
    'he': 'ראיתי שלא אישרת. תרצה להסביר מה לא דייקתי ואדייק?',
    'en':
      'I saw you didn’t approve. Want to explain what I missed so I can adjust?',
  },

  // --- chat: reasoning / thinking depth ---
  'chat_thinking_title': { 'he': 'עומק חשיבה', 'en': 'Thinking depth' },
  'chat_thinking_desc': {
    'he': 'כמה לעומק לחשוב לפני התשובה',
    'en': 'How deeply to think before answering',
  },
  'reasoning_minimal': { 'he': 'מהיר', 'en': 'Fast' },
  'reasoning_minimal_hint': {
    'he': 'תשובות מיידיות, בלי חשיבה מורחבת',
    'en': 'Instant replies, no extended thinking',
  },
  'reasoning_medium': { 'he': 'חכם', 'en': 'Smart' },
  'reasoning_medium_hint': {
    'he': 'איזון טוב בין מהירות לאיכות',
    'en': 'A good balance of speed and quality',
  },
  'reasoning_high': { 'he': 'מעמיק', 'en': 'Deep' },
  'reasoning_high_hint': {
    'he': 'חשיבה מעמיקה למשימות מורכבות',
    'en': 'Deep reasoning for complex tasks',
  },
  'reasoning_cheap': { 'he': 'מהיר וזול', 'en': 'Fast & cheap' },
  'reasoning_cheap_hint': {
    'he': 'הכי חסכוני — מודל קל (Mistral)',
    'en': 'Most economical — a light model (Mistral)',
  },
  'reasoning_expert': { 'he': 'מומחה', 'en': 'Expert' },
  'reasoning_expert_hint': {
    'he': 'החשיבה המקסימלית של דיפסיק — למשימות הכי מורכבות',
    'en': 'DeepSeek\'s maximum reasoning — for the hardest tasks',
  },
  'reasoning_max': { 'he': 'מקסימלי', 'en': 'Maximum' },
  'reasoning_max_hint': {
    'he': 'עומק החשיבה הגבוה ביותר למשימות הכי מורכבות',
    'en': 'The highest reasoning depth for the hardest tasks',
  },
  'chat_model_deepseek': { 'he': 'מודלי DeepSeek', 'en': 'DeepSeek models' },
  'chat_model_gpt': { 'he': 'מודלי GPT', 'en': 'GPT models' },
  'chat_model_gemini': { 'he': 'מודלי Gemini', 'en': 'Gemini models' },

  // --- chat: Pro mode (premium models) ---
  'chat_pro_activate': { 'he': 'הפעל פרו', 'en': 'Go Pro' },
  'chat_pro_on': { 'he': 'פרו פעיל', 'en': 'Pro on' },
  'chat_pro_desc': {
    'he': 'מודלים חזקים במיוחד — איכות מקסימלית במחיר גבוה יותר',
    'en': 'Extra-powerful models — top quality at a higher rate',
  },
  'chat_gpt_desc': {
    'he': 'GPT-5.4 mini עם כל רמות החשיבה — עולה פי 2.5',
    'en': 'GPT-5.4 mini with every reasoning depth — costs 2.5x',
  },
  'chat_gemini_desc': {
    'he': 'Gemini Flash-Lite עם רמות חשיבה נתמכות',
    'en': 'Gemini Flash-Lite with supported reasoning depths',
  },
  'chat_gemini_pro_desc': {
    'he': 'Gemini 3.5 Flash עם חשיבה עמוקה יותר — עולה פי 2.5',
    'en': 'Gemini 3.5 Flash with deeper reasoning — costs 2.5x',
  },
  'chat_model_switch_title': { 'he': 'לעבור למודל אחר?', 'en': 'Switch models?' },
  'chat_model_switch_body': {
    'he': 'מעבר למודל אחר בשיחה פתוחה דורש פתיחת שיחה חדשה.',
    'en': 'Switching to a different model in an open chat requires starting a new chat.',
  },
  'chat_model_switch_confirm': { 'he': 'מעבר לשיחה חדשה', 'en': 'Start new chat' },
  'chat_model_switch_cancel': { 'he': 'ביטול', 'en': 'Cancel' },
  'reasoning_pro_smart': { 'he': 'חכם', 'en': 'Smart' },
  'reasoning_pro_smart_hint': {
    'he': 'DeepSeek V4 Pro עם חשיבה קלה — חכם ומהיר',
    'en': 'DeepSeek V4 Pro with light thinking — smart and fast',
  },
  'reasoning_pro_deep': { 'he': 'מעמיק', 'en': 'Deep' },
  'reasoning_pro_deep_hint': {
    'he': 'DeepSeek V4 Pro עם חשיבה עמוקה — לתכנון רציני',
    'en': 'DeepSeek V4 Pro with deep thinking — for serious planning',
  },
  'reasoning_pro_expert': { 'he': 'מומחה', 'en': 'Expert' },
  'reasoning_pro_expert_hint': {
    'he': 'DeepSeek V4 Pro בחשיבה המקסימלית — למשימות הכי מורכבות',
    'en': 'DeepSeek V4 Pro at maximum reasoning — for the hardest tasks',
  },
  // --- chat: chat credits & history ---
  'chat_tokens': { 'he': '{count} קרדיטי שיחה', 'en': '{count} chat credits' },
  'chat_tokens_info_title': { 'he': 'פירוט קרדיטי שיחה', 'en': 'Chat credit breakdown' },
  'chat_tokens_prompt': { 'he': 'קרדיטי קלט (prompt)', 'en': 'Prompt chat credits' },
  'chat_tokens_prompt_read': { 'he': 'קריאת פרומפט', 'en': 'Prompt read' },
  'chat_tokens_prompt_read_reason': {
    'he': 'ה-AI קרא {items}, לכן הקלט קפץ ב-{count} קרדיטי שיחה',
    'en': 'AI read {items}, so the prompt increased by {count} chat credits',
  },
  'chat_tokens_completion': {
    'he': 'קרדיטי תשובה (completion)',
    'en': 'Completion chat credits',
  },
  'chat_tokens_reasoning': {
    'he': 'קרדיטי חשיבה (reasoning)',
    'en': 'Reasoning chat credits',
  },
  'chat_tokens_writing_output': {
    'he': 'קרדיטי כתיבה / פלט',
    'en': 'Writing/output chat credits',
  },
  'chat_tokens_output_total': { 'he': 'סה״כ פלט', 'en': 'Total output chat credits' },
  'chat_tokens_instruction_context': {
    'he': 'קרדיטי הוראות/מידע רקע עבור {item}',
    'en': 'Instruction/background input chat credits for {item}',
  },
  'chat_tokens_total': { 'he': 'סה״כ קרדיטי שיחה', 'en': 'Total chat credits' },
  'chat_memory_label': { 'he': 'זיכרון שיחה', 'en': 'Chat memory' },
  'chat_context_title': { 'he': 'זיכרון שיחה', 'en': 'Chat memory' },
  'chat_context_left_short': { 'he': 'נשאר', 'en': 'left' },
  'chat_context_remaining': {
    'he': 'נשאר {percent}% · {used} מתוך {limit} טוקנים בזיכרון השיחה',
    'en': '{percent}% left · {used} of {limit} chat-memory tokens',
  },
  'chat_memory_explain': {
    'he': 'זה המקום שנשאר ל-AI לזכור את ההודעות בשיחה הזאת. כשהוא מתמלא, אפשר לסכם את השיחה ולפנות מקום להמשך.',
    'en': 'This is how much room the AI has left to remember this conversation. When it fills up, summarize the chat to free room for more messages.',
  },
  'chat_context_warning': {
    'he': 'מעל 70% שימוש — אפשר לסכם ולפנות מקום.',
    'en': 'Over 70% used — you can summarize and free space.',
  },
  'chat_context_critical': {
    'he': 'כמעט מלא — מומלץ לסכם עכשיו.',
    'en': 'Almost full — summarizing now is recommended.',
  },
  'chat_memory_near': {
    'he': 'השיחה מתקרבת לגבול הזיכרון — כדאי לסכם ולפנות מקום בקרוב.',
    'en': 'This chat is nearing its memory limit — consider summarizing it soon.',
  },
  'chat_memory_full': {
    'he': '🧠 זיכרון השיחה מלא. כדי להמשיך, אפשר לסכם ולפנות מקום או לפתוח שיחה חדשה — השיחה הנוכחית תישמר בהיסטוריה.',
    'en': '🧠 This chat\'s memory is full. Summarize it to free space or start a new chat — this one is saved in your history.',
  },
  'chat_memory_new_chat': { 'he': '✨ שיחה חדשה', 'en': '✨ New chat' },
  'chat_memory_summarize': {
    'he': '📋 סכם שיחה ופנה מקום',
    'en': '📋 Summarize & free space',
  },
  'chat_memory_summarize_now': {
    'he': 'סכם עכשיו',
    'en': 'Summarize now',
  },
  'chat_summary_prefix': {
    'he': '📋 סיכום השיחה עד כה:',
    'en': '📋 Summary of the conversation so far:',
  },
  'chat_status_summarizing': {
    'he': 'מסכם את השיחה ומפנה מקום...',
    'en': 'Summarizing the conversation…',
  },
  'chat_history_title': { 'he': '📝 היסטוריית שיחות', 'en': '📝 Chat history' },
  'chat_history_empty': { 'he': 'אין שיחות שמורות', 'en': 'No saved chats' },
  'chat_history_restore': { 'he': 'פתח שיחה', 'en': 'Open chat' },
  'chat_history_delete': { 'he': 'מחק שיחה', 'en': 'Delete chat' },
  'chat_token_limit': {
    'he': '⚠️ הגעת למכסת קרדיטי השיחה שלך (10,000).',
    'en': '⚠️ You reached your chat credit quota (10,000).',
  },
  'chat_token_limit_hint': {
    'he': '💡 מכסת קרדיטי השיחה שלך נגמרה.',
    'en': '💡 Your chat credit quota is exhausted.',
  },
  'chat_tokens_user_input_line': {
    'he': '{count} קרדיטי קלט',
    'en': '{count} input chat credits',
  },
  'chat_tokens_ai_output_line': {
    'he': '{count} קרדיטי פלט',
    'en': '{count} output chat credits',
  },
  'chat_tokens_ai_output_with_instruction': {
    'he': '{output} קרדיטי פלט + {instruction} קרדיטי הוראות',
    'en': '{output} output chat credits + {instruction} instruction input chat credits',
  },
  'chat_tokens_this_reply': {
    'he': 'תשובה זו: {count} קרדיטי שיחה',
    'en': 'This reply: {count} chat credits',
  },
  'chat_tokens_total_conv': {
    'he': '🪙 {count} קרדיטי שיחה בשיחה',
    'en': '🪙 {count} conversation chat credits',
  },
  'chat_tokens_quota_remaining': {
    'he': '🪙 נשארו לך {remaining} קרדיטי שיחה',
    'en': '🪙 {remaining} chat credits left',
  },
  'chat_tokens_label': { 'he': 'קרדיטי שיחה', 'en': 'Chat credits' },
  'chat_tokens_info_remaining': {
    'he': 'קרדיטי שיחה שנותרו',
    'en': 'Chat credits remaining',
  },
  'chat_tokens_info_session': {
    'he': 'קרדיטי שיחה שחויבו בשיחה',
    'en': 'Chat credits charged this session',
  },
  'chat_tokens_info_history': {
    'he': 'מתוכם על היסטוריית שיחה (10%)',
    'en': 'Of which chat history (10%)',
  },
  'chat_tokens_session_spent': {
    'he': '🪙 {count} קרדיטי שיחה חויבו בשיחה הזו',
    'en': '🪙 {count} chat credits charged this chat',
  },
  'chat_tokens_message_body': {
    'he': 'קרדיטי תוכן (message)',
    'en': 'Message chat credits',
  },
  'chat_tokens_this_reply_total': {
    'he': 'סה״כ תשובה זו',
    'en': 'Total this reply',
  },
  'chat_tokens_this_request_total': {
    'he': 'סה״כ קריאה זו',
    'en': 'Total this request',
  },
  'chat_output_tokens': { 'he': 'קרדיטי פלט', 'en': 'output credits' },
  'chat_input_tokens': { 'he': 'קרדיטי קלט', 'en': 'input credits' },
  'chat_instruction_tokens': { 'he': 'קרדיטי הוראה', 'en': 'instruction credits' },
  'chat_reasoning_tokens': { 'he': '🧠 קרדיטי חשיבה', 'en': '🧠 Reasoning credits' },
  'chat_total_output': { 'he': '📊 סה״כ פלט', 'en': '📊 Total output' },
  'chat_instruction_context': { 'he': '📖 תוכן הוראות', 'en': '📖 Instruction context' },
  'chat_multiplier': { 'he': '🔢 מכפיל', 'en': '🔢 Multiplier' },
  'chat_history_portion': { 'he': '📝 היסטוריית שיחה (10%)', 'en': '📝 Chat history (10%)' },
  'chat_charged': { 'he': '💰 חויב', 'en': '💰 Charged' },
  'chat_status_prompt_system': {
    'he': 'ה-AI קורא את הפורמט הראשוני וההנחיות',
    'en': 'AI is reading the initial format and instructions',
  },
  'chat_status_prompt_action': {
    'he': 'ה-AI קורא איך לבצע שינויים באפליקציה',
    'en': 'AI is reading how to make app changes',
  },
  'chat_status_prompt_tasks': {
    'he': 'ה-AI קורא את הוראות המשימות שלך',
    'en': 'AI is reading your task instructions',
  },
  'chat_status_prompt_courses': {
    'he': 'ה-AI קורא את הוראות הקורסים שלך',
    'en': 'AI is reading your course instructions',
  },
  'chat_status_prompt_schedule': {
    'he': 'ה-AI לומד איך לקרוא את הלו״ז שלך',
    'en': 'AI is learning how to read your schedule',
  },
  'chat_status_prompt_schedule_write': {
    'he': 'ה-AI לומד איך לשנות את הלו״ז שלך',
    'en': 'AI is learning how to edit your schedule',
  },
  'chat_status_prompt_misc': {
    'he': 'ה-AI קורא את הוראות המיקוד, ההתראות והזיכרון',
    'en': 'AI is reading the focus, reminders and memory instructions',
  },
  'chat_status_prompt_focus': {
    'he': 'ה-AI קורא איך להפעיל מצב פוקוס',
    'en': 'AI is reading how to start focus mode',
  },
  'chat_status_prompt_smart_notifications': {
    'he': 'ה-AI קורא איך לנהל את ההתראות שלך',
    'en': 'AI is reading how to manage your reminders',
  },
  'chat_status_prompt_identity': {
    'he': 'ה-AI קורא איך לשנות את שם הסוכן',
    'en': 'AI is reading how to rename the agent',
  },
  'chat_status_prompt_memory': {
    'he': 'ה-AI קורא איך לעדכן זיכרון אישי',
    'en': 'AI is reading how to update personal memory',
  },
  'chat_status_prompt_app_data': {
    'he': 'ה-AI קורא את נתוני המשימות והלו״ז שלך',
    'en': 'AI is reading your tasks and schedule context',
  },
  'chat_status_prompt_schedule_result': {
    'he': 'ה-AI קורא את הלו״ז שמצא לאותו יום',
    'en': 'AI is reading the schedule it found for that day',
  },
  'chat_prompt_read_system': {
    'he': 'את הפורמט הראשוני וההנחיות',
    'en': 'the initial format and instructions',
  },
  'chat_prompt_read_action': {
    'he': 'את פרוטוקול הפעולות',
    'en': 'the action protocol',
  },
  'chat_prompt_read_tasks': {
    'he': 'את הוראות המשימות',
    'en': 'the task instructions',
  },
  'chat_prompt_read_courses': {
    'he': 'את הוראות הקורסים',
    'en': 'the course instructions',
  },
  'chat_prompt_read_schedule': {
    'he': 'את ההוראות איך לקרוא לו״ז',
    'en': 'the instructions for reading schedules',
  },
  'chat_prompt_read_schedule_write': {
    'he': 'את ההוראות איך לשנות לו״ז',
    'en': 'the instructions for editing schedules',
  },
  'chat_prompt_read_misc': {
    'he': 'את הוראות המיקוד, ההתראות והזיכרון',
    'en': 'the focus, reminders and memory instructions',
  },
  'chat_prompt_read_focus': {
    'he': 'את ההוראות איך להפעיל מצב פוקוס',
    'en': 'the instructions for starting focus mode',
  },
  'chat_prompt_read_smart_notifications': {
    'he': 'את הוראות ההתראות החכמות',
    'en': 'the smart reminder instructions',
  },
  'chat_prompt_read_identity': {
    'he': 'את הוראות שינוי שם הסוכן',
    'en': 'the agent rename instructions',
  },
  'chat_prompt_read_memory': {
    'he': 'את הוראות הזיכרון האישי',
    'en': 'the personal memory instructions',
  },
  'chat_prompt_read_app_data': {
    'he': 'את נתוני המשימות, הקורסים וההתראות',
    'en': 'your tasks, courses, and reminder data',
  },
  'chat_prompt_read_schedule_result': {
    'he': 'את תוצאת קריאת הלו״ז',
    'en': 'the schedule lookup result',
  },

  // --- focus ---
  'focus_mode': { 'he': '🎯 מצב מיקוד', 'en': '🎯 Focus mode' },
  'focus_task': { 'he': 'סימולציה מלאה מס׳ 2', 'en': 'Full simulation #2' },
  'focus_minutes': { 'he': '⏱️ דקות מיקוד', 'en': '⏱️ focus minutes' },
  'focus_start': { 'he': '▶️ התחל', 'en': '▶️ Start' },
  'focus_stop': { 'he': '⏸️ עצור', 'en': '⏸️ Stop' },
  'focus_complete': {
    'he': '🎉 סשן מיקוד הושלם! כל הכבוד!',
    'en': '🎉 Focus session complete! Great job!',
  },

  // --- habits ---
  'my_habits': { 'he': '🔥 ההרגלים שלי', 'en': '🔥 My habits' },
  'last_12_weeks': { 'he': '📊 12 השבועות האחרונים', 'en': '📊 Last 12 weeks' },
  'add_habit': { 'he': '✨ ＋ הוסף הרגל חדש', 'en': '✨ ＋ Add a new habit' },
  'habit_practice': { 'he': '30 דק׳ תרגול', 'en': '30 min practice' },
  'habit_vocab': { 'he': 'אוצר מילים', 'en': 'Vocabulary' },
  'habit_water': { 'he': 'שתיית מים', 'en': 'Drink water' },
  'habit_sport': { 'he': 'ספורט', 'en': 'Sport' },

  // --- settings ---
  'settings_title': { 'he': '⚙️ הגדרות', 'en': '⚙️ Settings' },
  'settings_language': { 'he': '🌐 שפה', 'en': '🌐 Language' },
  'settings_theme': { 'he': '🎨 ערכת נושא', 'en': '🎨 Theme' },
  'settings_dark_mode': { 'he': '🌙 מצב כהה', 'en': '🌙 Dark mode' },
  'settings_dark_label': { 'he': 'מצב כהה', 'en': 'Dark mode' },
  'settings_notifications': { 'he': '🔔 התראות', 'en': '🔔 Notifications' },
  'notif_enable': { 'he': 'הפעל התראות', 'en': 'Enable notifications' },
  'notif_enabled': { 'he': 'פעיל', 'en': 'On' },
  'notif_disabled': { 'he': 'כבוי', 'en': 'Off' },

  // --- course ---
  'back': { 'he': 'חזרה', 'en': 'Back' },
  'course_label': { 'he': 'קורס', 'en': 'Course' },
  'course_name': { 'he': 'הקורסים שלי', 'en': 'My courses' },
  'ct_title': { 'he': 'משימות וקורסים', 'en': 'Tasks & Courses' },
  'ct_tab_courses': { 'he': 'קורסים', 'en': 'Courses' },
  'ct_tab_tasks': { 'he': 'משימות', 'en': 'Tasks' },
  'course_teacher': {
    'he': 'הוסף/י קורסים דרך משימות',
    'en': 'Add courses via tasks',
  },
  'course_completed': { 'he': '0% הושלם', 'en': '0% complete' },
  'empty_habits': {
    'he': 'עדיין אין הרגלים — לחץ/י ➕ כדי להוסיף',
    'en': 'No habits yet — tap ➕ to add one',
  },
  'empty_courses': {
    'he': 'עדיין אין קורסים — לחץ/י ➕ כדי ליצור קורס',
    'en': 'No courses yet — tap ➕ to create a course',
  },
  'course_tasks': { 'he': '📝 משימות בקורס', 'en': '📝 Course tasks' },
  'course_no_tasks': {
    'he': 'אין עדיין משימות שמקושרות לקורס הזה',
    'en': 'No tasks are linked to this course yet',
  },
  'course_sessions': { 'he': '🎬 המפגשים הקרובים', 'en': '🎬 Upcoming sessions' },

  // --- quick add ---
  'new_task': { 'he': '✨ משימה חדשה', 'en': '✨ New task' },
  'task_title_ph': { 'he': '📝 כותרת המשימה…', 'en': '📝 Task title…' },
  'course': { 'he': '📚 קורס', 'en': '📚 Course' },
  'course_default': { 'he': 'כללי', 'en': 'General' },
  'priority': { 'he': '🎯 עדיפות', 'en': '🎯 Priority' },
  'priority_high': { 'he': '🔴 גבוהה', 'en': '🔴 High' },
  'priority_med': { 'he': '🟡 בינונית', 'en': '🟡 Medium' },
  'priority_low': { 'he': '🟢 נמוכה', 'en': '🟢 Low' },
  'add_task': { 'he': '➕ הוסף משימה', 'en': '➕ Add task' },
  'task_added': { 'he': '🎉 המשימה נוספה!', 'en': '🎉 Task added!' },
  'task_deleted': { 'he': '🗑️ המשימה נמחקה', 'en': '🗑️ Task deleted' },
  'task_need_title': {
    'he': '✏️ כתוב/י כותרת למשימה',
    'en': '✏️ Enter a task title',
  },
  'course_title_ph': { 'he': '📚 כותרת הקורס…', 'en': '📚 Course title…' },
  'course_desc_ph': {
    'he': 'תיאור קצר (אופציונלי)…',
    'en': 'Short description (optional)…',
  },
  'course_dates': { 'he': 'תאריכים (אופציונלי)', 'en': 'Dates (optional)' },
  'course_start': { 'he': 'התחלה', 'en': 'Start' },
  'course_end': { 'he': 'סיום', 'en': 'End' },
  'course_add_start': { 'he': 'הוסף התחלה', 'en': 'Add start' },
  'course_add_end': { 'he': 'הוסף סיום', 'en': 'Add end' },
  'add_course': { 'he': '➕ הוסף קורס', 'en': '➕ Add course' },
  'course_added': { 'he': '🎉 הקורס נוסף!', 'en': '🎉 Course added!' },
  'course_need_title': {
    'he': '✏️ כתוב/י כותרת לקורס',
    'en': '✏️ Enter a course title',
  },
  'course_end_before_start': {
    'he': 'תאריך הסיום חייב להיות אחרי ההתחלה',
    'en': 'End date must be after the start date',
  },

  // --- quick add: chooser ---
  'quick_add_title': { 'he': 'מה נוסיף?', 'en': 'What to add?' },
  'quick_opt_ai': { 'he': 'הוספה עם AI', 'en': 'Add with AI' },
  'quick_opt_ai_sub': {
    'he': 'שוחח עם העוזר החכם',
    'en': 'Chat with the smart assistant',
  },
  'quick_opt_manual': { 'he': 'הוספה ידנית', 'en': 'Manual add' },
  'quick_opt_manual_sub': {
    'he': 'משימה, קורס או אירוע בלו״ז',
    'en': 'A task, course or schedule event',
  },
  'quick_opt_task': { 'he': 'משימה חדשה', 'en': 'New task' },
  'quick_opt_task_sub': {
    'he': 'תכנון משימה לפי קורס ועדיפות',
    'en': 'Plan a task by course and priority',
  },
  'quick_opt_course': { 'he': 'קורס חדש', 'en': 'New course' },
  'quick_opt_course_sub': {
    'he': 'כותרת, תיאור קצר ותאריכים',
    'en': 'Title, short description and dates',
  },
  'quick_opt_event': { 'he': 'אירוע / שיעור בלו״ז', 'en': 'Event / class' },
  'quick_opt_event_sub': {
    'he': 'שיעור, מבחן, הגשה או אירוע אישי',
    'en': 'Class, exam, submission or personal',
  },
  'quick_opt_focus': { 'he': 'מצב פוקוס', 'en': 'Focus mode' },
  'quick_opt_focus_sub': {
    'he': 'טיימר פומודורו לסשן ריכוז',
    'en': 'Pomodoro timer for a focus session',
  },

  // --- quick add: AI task ---
  'ai_task_title': { 'he': '✨ משימה חדשה עם AI', 'en': '✨ New task with AI' },
  'ai_task_hint': {
    'he':
      'כתוב לי מה צריך… למשל: "להגיש תרגיל 3 בסטטיסטיקה עד יום חמישי, עדיפות גבוהה"',
    'en':
      'Tell me what you need… e.g. "Submit exercise 3 in statistics by Thursday, high priority"',
  },
  'ai_create_task': { 'he': '✨ צור משימה עם AI', 'en': '✨ Create task with AI' },
  'ai_thinking': { 'he': '🤖 חושב…', 'en': '🤖 Thinking…' },
  'ai_add_manual': { 'he': '✍️ הוספה ידנית', 'en': '✍️ Add manually' },
  'ai_empty_prompt': {
    'he': '✏️ כתוב/י תיאור קצר של המשימה',
    'en': '✏️ Write a short description of the task',
  },

  // --- quick add: event / class ---
  'event_title': { 'he': '📅 אירוע חדש', 'en': '📅 New event' },
  'event_type': { 'he': '🗂️ סוג', 'en': '🗂️ Type' },
  'event_type_class': { 'he': '📚 שיעור', 'en': '📚 Class' },
  'event_type_exam': { 'he': '📝 מבחן', 'en': '📝 Exam' },
  'event_type_submission': { 'he': '📤 הגשה', 'en': '📤 Submission' },
  'event_type_personal': { 'he': '🙂 אישי', 'en': '🙂 Personal' },
  'event_title_ph': { 'he': '✏️ כותרת האירוע…', 'en': '✏️ Event title…' },
  'event_source_free': { 'he': '✏️ טקסט חופשי', 'en': '✏️ Free text' },
  'event_source_task': { 'he': '✅ משימה קיימת', 'en': '✅ Existing task' },
  'event_pick_task': { 'he': '✅ בחר/י משימה', 'en': '✅ Pick a task' },
  'event_datetime': { 'he': '🕒 תאריך ושעה', 'en': '🕒 Date & time' },
  'event_pick_date': { 'he': '📅 בחר/י תאריך', 'en': '📅 Pick a date' },
  'event_pick_time': { 'he': '🕒 בחר/י שעה', 'en': '🕒 Pick a time' },
  'event_weekly_repeat': { 'he': '🔁 חזרה שבועית', 'en': '🔁 Weekly repeat' },
  'event_all_day': { 'he': '🗓️ יום שלם', 'en': '🗓️ All day' },
  'event_from': { 'he': 'מ־', 'en': 'From' },
  'event_until': { 'he': 'עד', 'en': 'Until' },
  'event_calendar': { 'he': '📆 יומן', 'en': '📆 Calendar' },
  'event_calendar_default': { 'he': 'יומן ברירת מחדל', 'en': 'Default calendar' },
  'event_add': { 'he': '➕ הוסף ללו״ז', 'en': '➕ Add to calendar' },
  'event_added': { 'he': '🎉 האירוע נוסף ללו״ז!', 'en': '🎉 Event added!' },
  'event_need_title': {
    'he': '✏️ כתוב/י כותרת לאירוע',
    'en': '✏️ Enter an event title',
  },

  // --- focus (redesign) ---
  'focus_custom': { 'he': '⚙️ מותאם', 'en': '⚙️ Custom' },
  'focus_custom_title': { 'he': '⚙️ זמן מותאם', 'en': '⚙️ Custom time' },
  'focus_hours_label': { 'he': '⏱️ שעות', 'en': '⏱️ Hours' },
  'focus_minutes_label': { 'he': '⏱️ דקות', 'en': '⏱️ Minutes' },
  'focus_seconds_label': { 'he': '⏱️ שניות', 'en': '⏱️ Seconds' },
  'focus_apply': { 'he': '✅ החל', 'en': '✅ Apply' },
  'focus_cancel': { 'he': '↩️ ביטול', 'en': '↩️ Cancel' },
  'focus_reset': { 'he': '🔄 איפוס', 'en': '🔄 Reset' },
  'focus_sounds': { 'he': '🎧 רעשי רקע', 'en': '🎧 Background sounds' },
  'focus_sound_off': { 'he': 'כבוי', 'en': 'Off' },
  'sound_airplane': { 'he': '✈️ מטוס', 'en': '✈️ Airplane' },
  'sound_rain': { 'he': '🌧️ גשם', 'en': '🌧️ Rain' },
  'sound_white': { 'he': '⚪ רעש לבן', 'en': '⚪ White noise' },
  'sound_fire': { 'he': '🔥 אש', 'en': '🔥 Fire' },
  'focus_music': { 'he': '🎵 מוזיקה', 'en': '🎵 Music' },
  'focus_open_spotify': { 'he': '🎵 Spotify', 'en': '🎵 Spotify' },
  'focus_open_ytmusic': { 'he': '▶️ YouTube Music', 'en': '▶️ YouTube Music' },
  'focus_notif_title': {
    'he': '🎯 סשן מיקוד הושלם!',
    'en': '🎯 Focus session done!',
  },
  'focus_notif_body': {
    'he': 'כל הכבוד — סיימת את הסשן. זמן להפסקה ☕',
    'en': 'Great job — your session is complete. Time for a break ☕',
  },

  // --- theme names ---
  'theme_glass': { 'he': 'זכוכית', 'en': 'Glass' },
  'theme_min': { 'he': 'מינימל', 'en': 'Minimal' },
  'theme_pastel': { 'he': 'פסטל', 'en': 'Pastel' },
  'theme_brutal': { 'he': 'ברוטל', 'en': 'Brutal' },
  'theme_nature': { 'he': 'טבע', 'en': 'Nature' },
  'theme_cyber': { 'he': 'נאון', 'en': 'Neon' },

  // --- tasks & courses page (bottom-nav screen) ---
  'tc_title': { 'he': 'המשימות שלי', 'en': 'My tasks' },
  'tc_search_ph': { 'he': 'חיפוש משימות...', 'en': 'Search tasks...' },
  'tc_sort': { 'he': 'מיון', 'en': 'Sort' },
  'tc_group_course': { 'he': 'לפי קורס', 'en': 'By course' },
  'tc_group_urgency': { 'he': 'לפי דחיפות', 'en': 'By urgency' },
  'tc_sort_az': { 'he': 'א־ב', 'en': 'A–Z' },
  'tc_sort_due': { 'he': 'תאריך', 'en': 'Due date' },
  'tc_urgency_high': { 'he': 'דחוף', 'en': 'Urgent' },
  'tc_urgency_med': { 'he': 'בינוני', 'en': 'Medium' },
  'tc_urgency_low': { 'he': 'רגיל', 'en': 'Low' },
  'tc_no_course': { 'he': 'ללא קורס', 'en': 'No course' },
  'tc_count': { 'he': '{count} משימות', 'en': '{count} tasks' },
  'tc_empty': { 'he': 'אין משימות עדיין', 'en': 'No tasks yet' },
  'tc_no_results': { 'he': 'לא נמצאו תוצאות', 'en': 'No results found' },

  // --- tasks + schedule system ---
  'yes': { 'he': 'כן', 'en': 'Yes' },
  'no': { 'he': 'לא', 'en': 'No' },
  'due_today': { 'he': 'היום', 'en': 'Today' },
  'unit_h': { 'he': "שע'", 'en': 'h' },
  'unit_m': { 'he': "דק'", 'en': 'm' },
  'dur_hours': { 'he': '{h} שעות', 'en': '{h}h' },
  'dur_minutes': { 'he': '{m} דקות', 'en': '{m}m' },
  // urgency
  'urgency': { 'he': 'דחיפות', 'en': 'Urgency' },
  'urgency_not_urgent': { 'he': 'לא דחוף', 'en': 'Not urgent' },
  'urgency_urgent': { 'he': 'דחוף', 'en': 'Urgent' },
  'urgency_very_urgent': { 'he': 'דחוף מאוד', 'en': 'Very urgent' },
  // manual task form
  'task_due': { 'he': 'מועד הגשה (אופציונלי)', 'en': 'Due date (optional)' },
  'task_add_due': { 'he': '➕ הוסף מועד הגשה', 'en': '➕ Add due date' },
  'task_estimate': {
    'he': 'זמן משוער (אופציונלי)',
    'en': 'Estimated time (optional)',
  },
  'task_desc_ph': { 'he': 'תיאור (אופציונלי)…', 'en': 'Description (optional)…' },
  // schedule item form
  'event_link_q': {
    'he': 'מקושר למשימה קיימת?',
    'en': 'Linked to an existing task?',
  },
  'event_no_tasks': { 'he': 'אין משימות לקישור', 'en': 'No tasks to link' },
  'event_desc_ph': {
    'he': 'תיאור (אופציונלי)…',
    'en': 'Description (optional)…',
  },
  'event_start': { 'he': 'התחלה', 'en': 'Start' },
  'event_end': { 'he': 'סיום', 'en': 'End' },
  'event_end_after_start': {
    'he': 'שעת הסיום חייבת להיות אחרי ההתחלה',
    'en': 'End time must be after start',
  },
  'event_not_found': { 'he': 'הפריט לא נמצא', 'en': 'Item not found' },
  // task detail
  'task_not_found': { 'he': 'המשימה לא נמצאה', 'en': 'Task not found' },
  'td_estimated': { 'he': 'זמן משוער', 'en': 'Estimated' },
  'td_scheduled': { 'he': 'משובץ בלו"ז', 'en': 'Scheduled' },
  'td_remaining': { 'he': 'נותר לשבץ', 'en': 'Remaining' },
  'td_blocks': { 'he': 'משבצות בלו"ז', 'en': 'Schedule blocks' },
  'td_blocks_total': {
    'he': 'סך זמן משובץ: {time}',
    'en': 'Total scheduled: {time}',
  },
  'td_no_blocks': {
    'he': 'אין עדיין משבצות לו"ז למשימה הזאת',
    'en': 'No schedule blocks for this task yet',
  },
  // schedule detail
  'sd_linked_task': { 'he': 'משימה מקושרת', 'en': 'Linked task' },
  'sd_open_task': { 'he': 'פתח משימה', 'en': 'Open task' },
  'sd_mark_done': { 'he': 'סמן משבצת כהושלמה', 'en': 'Mark block as done' },
  'sd_completed': { 'he': 'הושלם ✓', 'en': 'Completed ✓' },
  'sd_delete': { 'he': 'מחק משבצת', 'en': 'Delete block' },
  // completion prompt
  'complete_prompt': {
    'he': 'סיימת את כל זמני הלמידה שתכננת למשימה הזאת. לסמן את המשימה כהושלמה?',
    'en':
      'You finished all the study time you planned for this task. Mark the task as completed?',
  },
  'complete_prompt_yes': { 'he': 'כן, סמן כהושלמה', 'en': 'Yes, mark completed' },
  'complete_prompt_no': { 'he': 'לא, השאר פתוחה', 'en': 'No, keep it open' },
  // calendar sync
  'cal_sync_title': { 'he': 'סנכרון יומן', 'en': 'Calendar sync' },
  'cal_sync_label': {
    'he': 'סנכרון עם יומן המכשיר',
    'en': 'Sync with device calendar',
  },
  'cal_sync_off': { 'he': 'כבוי', 'en': 'Off' },
  'cal_linked': { 'he': 'מקושר ✓', 'en': 'Linked ✓' },
  'cal_perm_denied': {
    'he': 'נדרשת הרשאת גישה ליומן',
    'en': 'Calendar permission is required',
  },
  'cal_link_q': { 'he': 'לאיזה יומן לקשר?', 'en': 'Which calendar to link?' },
  'cal_link_hint': {
    'he':
      'בחר יומן קיים, או צור יומן חדש. נוסיף אליו אירוע בדיקה כדי לזכור לאן לסנכרן.',
    'en':
      'Pick an existing calendar or create a new one. A test event is added so we remember where to sync.',
  },
  'cal_new_name_ph': { 'he': 'שם ליומן חדש…', 'en': 'New calendar name…' },
  'cal_create_continue': { 'he': 'צור והמשך', 'en': 'Create & continue' },
  'cal_use_existing': {
    'he': 'או בחר יומן קיים',
    'en': 'Or pick an existing one',
  },
  'cal_test_event_title': { 'he': 'בדיקה', 'en': 'Test' },
  'cal_linked_done': { 'he': 'היומן קושר בהצלחה', 'en': 'Calendar linked' },
  'cal_link_failed': {
    'he': 'הקישור נכשל, נסה שוב',
    'en': 'Linking failed, try again',
  },

  // --- calendar header device-events toggle ---
  'cal_show_all': { 'he': 'כל היומן', 'en': 'Whole calendar' },
  'cal_show_mine': { 'he': 'רק שלי', 'en': 'Mine only' },

  // --- generic ---
  'delete': { 'he': 'מחיקה', 'en': 'Delete' },

  // --- agent settings (calendar access + manage calendars) ---
  'menu_agent_settings': { 'he': 'הגדרות סוכן', 'en': 'Agent settings' },
  'menu_agent_settings_sub': {
    'he': 'מה הסוכן רואה ועורך ביומן',
    'en': "What the agent sees & edits in your calendar",
  },
  'agent_settings_title': { 'he': 'הגדרות סוכן', 'en': 'Agent settings' },
  'agent_settings_sub': {
    'he':
      'קבע כמה גישה יש לסוכן ה-AI ליומן האמיתי במכשיר — לראות אירועים, ולערוך/למחוק אותם.',
    'en':
      'Control how much access the AI agent has to your real device calendar — to view events, and to edit/delete them.',
  },
  'agent_settings_link_first': {
    'he': 'כדי לאפשר גישה לסוכן צריך קודם לקשר את יומן המכשיר בהגדרות.',
    'en': 'Link your device calendar in Settings first to grant agent access.',
  },
  'agent_see_cal': { 'he': 'הסוכן רואה את היומן', 'en': 'Agent can see calendar' },
  'agent_see_cal_hint': {
    'he': 'אירועים אמיתיים מהיומן יופיעו לסוכן כשמבקשים ממנו לגבי הלו״ז.',
    'en': "Real calendar events are shown to the agent when you ask about your schedule.",
  },
  'agent_edit_cal': {
    'he': 'הסוכן יכול לערוך את היומן',
    'en': 'Agent can edit calendar',
  },
  'agent_edit_cal_hint': {
    'he': 'הסוכן יוכל לערוך ולמחוק גם אירועים שלא נוצרו דרך האפליקציה.',
    'en': 'The agent can edit and delete events even if they were not created in the app.',
  },
  'agent_edit_cal_warn': {
    'he': 'שינויים שהסוכן מבצע נכתבים ליומן האמיתי. תמיד יוצג לך בדיוק מה הוא עומד לשנות לפני אישור.',
    'en': "The agent's changes are written to your real calendar. You'll always see exactly what it's about to change before you approve.",
  },
  'manage_calendars_title': { 'he': 'ניהול יומנים', 'en': 'Manage calendars' },
  'manage_calendars_sub': {
    'he': 'בחר לאיזה יומן נכתבים אירועים חדשים, או צור/מחק יומנים.',
    'en': 'Choose which calendar new events go into, or create / delete calendars.',
  },
  'manage_calendars_default': { 'he': 'ברירת מחדל', 'en': 'Default' },
  'manage_calendars_add': { 'he': '➕ יומן חדש', 'en': '➕ New calendar' },
  'manage_calendars_new': { 'he': 'יומן חדש', 'en': 'New calendar' },
  'manage_calendars_name_ph': { 'he': 'שם היומן…', 'en': 'Calendar name…' },
  'manage_calendars_create': { 'he': 'צור', 'en': 'Create' },
  'manage_calendars_delete_title': { 'he': 'למחוק יומן?', 'en': 'Delete calendar?' },
  'manage_calendars_delete_body': {
    'he': 'היומן "{name}" וכל האירועים שבו יימחקו מהמכשיר. אי אפשר לבטל.',
    'en': 'The calendar "{name}" and all its events will be removed from the device. This cannot be undone.',
  },
  'calendar_created': { 'he': 'היומן נוצר ✓', 'en': 'Calendar created ✓' },
  'calendar_create_failed': {
    'he': 'יצירת היומן נכשלה',
    'en': 'Could not create calendar',
  },

  // --- chat: agent calendar-access + calendar actions ---
  'chat_agent_cal_off': {
    'he': '🔒 כיביתי לסוכן את הגישה ליומן',
    'en': "🔒 Turned off the agent's calendar access",
  },
  'chat_agent_cal_see': {
    'he': '👀 הסוכן יכול עכשיו לראות את היומן',
    'en': '👀 The agent can now see your calendar',
  },
  'chat_agent_cal_edit': {
    'he': '✏️ הסוכן יכול עכשיו לראות ולערוך את היומן',
    'en': '✏️ The agent can now see and edit your calendar',
  },
  'chat_calendar_created': {
    'he': '📅 יצרתי יומן חדש: {name}',
    'en': '📅 Created a new calendar: {name}',
  },
  'chat_mobile_only_action': {
    'he': 'זמין באפליקציה הניידת',
    'en': 'Available in the mobile app',
  },

  // --- agent memory ---
  'agent_memory_title': { 'he': 'זיכרון הסוכן', 'en': 'Agent memory' },
  'agent_memory_desc': {
    'he': 'סיכום קצר וקבוע שהסוכן מקבל בכל קריאה ל-AI. עד 350 קרדיטי שיחה.',
    'en':
      'A short persistent summary the agent receives on every AI request. Up to 350 chat credits.',
  },
  'agent_memory_empty': {
    'he': 'עדיין אין זיכרון שמור. אפשר לכתוב כאן או לבקש מהסוכן “תזכור ש...”',
    'en':
      'No saved memory yet. You can write here or ask the agent “remember that...”',
  },
  'agent_memory_limit': {
    'he': '{count}/350 קרדיטי שיחה משוערים',
    'en': '~{count}/350 chat credits',
  },
  'agent_memory_clear': { 'he': 'נקה', 'en': 'Clear' },
  'agent_memory_save': { 'he': 'שמור', 'en': 'Save' },
  'agent_memory_saved': {
    'he': 'סבבה, אזכור את זה 👍',
    'en': 'Got it, I’ll remember that 👍',
  },

  // --- chat: undo an applied change ---
  'chat_undo_change': { 'he': 'בטל שינוי', 'en': 'Undo' },
  'chat_change_undone': { 'he': 'השינוי בוטל ↩️', 'en': 'Change undone ↩️' },

  // --- smart notifications (local nudges) ---
  'notif_morning_title': { 'he': '🌅 תכנון הבוקר', 'en': '🌅 Morning plan' },
  'notif_morning_body': {
    'he': 'בוקר טוב! בוא נתכנן את היום שלך 💪',
    'en': 'Good morning! Let’s plan your day 💪',
  },
  'notif_evening_title': { 'he': '🌙 סיכום היום', 'en': '🌙 Day summary' },
  'notif_evening_body': {
    'he': 'איך הלך היום? בוא נסכם',
    'en': 'How did today go? Let’s recap',
  },

  // --- home: daily AI briefing card ---
  'briefing_morning_label': { 'he': '🌅 תכנון הבוקר', 'en': '🌅 Morning plan' },
  'briefing_evening_label': { 'he': '🌙 סיכום היום', 'en': '🌙 Day summary' },
  'briefing_morning_text': {
    'he':
      'בוקר טוב! יש לך {free} שעות פנויות ו-{count} משימות להיום. ממליץ להתחיל ב"{task}".',
    'en':
      'Good morning! You have {free} free hours and {count} tasks today. I’d start with “{task}”.',
  },
  'briefing_morning_empty': {
    'he': 'בוקר טוב! היום נקי ממשימות עם דדליין. רוצה שנתכנן משהו?',
    'en': 'Good morning! No deadlines today. Want to plan something?',
  },
  'briefing_evening_text': {
    'he':
      'השלמת {done} מתוך {total} משימות. נשארו {remaining}. רוצה שאעביר אותן למחר?',
    'en':
      'You finished {done} of {total} tasks. {remaining} left. Want me to move them to tomorrow?',
  },
  'briefing_evening_done': {
    'he': 'כל הכבוד! השלמת את כל {done} המשימות של היום 🎉',
    'en': 'Nice! You finished all {done} of today’s tasks 🎉',
  },
  'briefing_evening_empty': {
    'he': 'איך הלך היום? לא היו משימות עם דדליין להיום.',
    'en': 'How did today go? No deadlines were due today.',
  },
  'briefing_move_tomorrow': {
    'he': 'העבר את הנותרות למחר',
    'en': 'Move the rest to tomorrow',
  },
  'briefing_moved': {
    'he': 'הועברו {count} משימות למחר ✅',
    'en': 'Moved {count} tasks to tomorrow ✅',
  },

  // --- delete account ---
  'menu_delete_account': { 'he': 'מחיקת חשבון', 'en': 'Delete account' },
  'menu_delete_account_sub': {
    'he': 'מחיקה לצמיתות של כל הנתונים',
    'en': 'Permanently erase all your data',
  },
  'delete_account_confirm_title': {
    'he': 'למחוק את החשבון?',
    'en': 'Delete account?',
  },
  'delete_account_confirm_body': {
    'he':
      'כל הנתונים שלך — משימות, קורסים, לו"ז, היסטוריית הצ\'אט והזיכרון של הסוכן — יימחקו לצמיתות מהמכשיר ומהענן. אי אפשר לבטל את הפעולה.',
    'en':
      'All your data — tasks, courses, schedule, chat history and the agent’s memory — will be permanently erased from this device and the cloud. This cannot be undone.',
  },
  'delete_account_cta': { 'he': 'מחק לצמיתות', 'en': 'Delete permanently' },
};

export function translate(key: string, lang: string): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[lang] ?? entry['he'] ?? key;
}
