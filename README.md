# מכונת הפלאים ⚙️

משחק פאזל פיזיקלי לילדים בסגנון "מכונות שרשרת": גוררים חלקים (קרשים, טרמפולינה, מאוורר, מסוע, נדנדה, סיכה…), לוחצים **הפעל** – ומסתכלים אם הכדור מגיע לדלי.

- 10 שלבים (כל אחד נבדק אוטומטית שהוא פתיר) + **משחק חופשי** ללא הגבלות.
- עברית, מותאם למגע (טלפון/טאבלט) ולעכבר.
- עובד גם בלי אינטרנט (PWA) – אפשר "להתקין" אותו על אנדרואיד מהדפדפן.
- בלי שרת ובלי build: HTML + JavaScript + [Matter.js](https://brm.io/matter-js/) לפיזיקה.

## הרצה מקומית
```bash
npm start          # http://localhost:8080
npm test           # בודק שכל השלבים פתירים
```

## העלאה ל-Firebase Hosting (CLI)
```bash
npm install -g firebase-tools
firebase login
firebase projects:create wonder-machine-<משהו-ייחודי>   # או פרויקט קיים
firebase use --add                                      # לבחור את הפרויקט
firebase deploy --only hosting
```
בסוף תקבלו כתובת בסגנון `https://<project-id>.web.app`.

## אנדרואיד
- **מהיר:** לפתוח את הכתובת בכרום בטלפון ← תפריט ⋮ ← "הוספה למסך הבית". המשחק נפתח במסך מלא ועובד אופליין.
- **אפליקציה אמיתית (APK / Google Play):** לעטוף עם Capacitor – השלב הבא.

## מבנה
```
public/
  index.html, css/style.css
  js/parts.js    – החלקים: פיזיקה + ציור
  js/sim.js      – מנוע הסימולציה, מטרות וניצחון
  js/levels.js   – השלבים (כולל פתרון לכל שלב – משמש לבדיקות ולכפתור הרמז)
  js/game.js     – ממשק: מגש, גרירה, כפתורים, ציור
  sw.js, manifest.webmanifest, icons/ – PWA
tests/
  run.js         – בדיקת כל השלבים
  search.js, try.js – כלי עזר לעיצוב שלבים חדשים
```
