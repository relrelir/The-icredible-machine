/* מכונת הפלאים – השלבים */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WMLevels = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const D = Math.PI / 180;
  const F = (o) => Object.assign({ fixed: true }, o); // חלק קבוע בשלב
  // גובה מרכז של עצם ברדיוס r שמונח על קיר/קרש בנקודה x
  const on = (b, x, r) => {
    const a = b.angle || 0, h = b.type === 'ramp' ? 12 : 22;
    return b.y - h / 2 / Math.cos(a) + (x - b.x) * Math.tan(a) - r / Math.cos(a);
  };

  const L1 = { ledge: { type: 'brick', x: 150, y: 220, w: 220, angle: 15 * D } };
  const L4 = { shelf: { type: 'brick', x: 200, y: 300, w: 260 } };
  const L5 = { top: { type: 'brick', x: 120, y: 150, w: 200, angle: 15 * D }, shelf: { type: 'brick', x: 450, y: 400, w: 400 } };
  const L6 = { top: { type: 'brick', x: 110, y: 140, w: 180, angle: 15 * D } };
  const L7 = { top: { type: 'brick', x: 200, y: 160, w: 200, angle: 12 * D } };
  const L8 = { top: { type: 'brick', x: 120, y: 200, w: 200, angle: 15 * D } };
  const L9 = { top: { type: 'brick', x: 840, y: 180, w: 220, angle: -15 * D } };
  const L10 = { shelf: { type: 'brick', x: 150, y: 160, w: 260 } };

  return [
    {
      title: 'גלגול ראשון',
      text: 'עזרו לכדור הכחול ליפול לתוך הדלי. גררו קרש משופע ללוח.',
      fixed: [
        F(L1.ledge),
        F({ type: 'bowling', x: 70, y: on(L1.ledge, 70, 18), tag: 'ball' }),
        F({ type: 'bucket', x: 600, y: 588, tag: 'bk' }),
      ],
      tray: { ramp: 2 },
      goals: [{ type: 'zone', tag: 'ball', bucket: 'bk' }],
      solution: [{ type: 'ramp', x: 380, y: 400, angle: 20 * D }],
    },
    {
      title: 'פוף!',
      text: 'הבלון בורח למעלה! שימו סיכה כדי לפוצץ אותו.',
      fixed: [
        F({ type: 'brick', x: 440, y: 450, w: 300, angle: 90 * D }),
        F({ type: 'brick', x: 560, y: 450, w: 300, angle: 90 * D }),
        F({ type: 'balloon', x: 500, y: 570, tag: 'bal' }),
      ],
      tray: { pin: 1 },
      goals: [{ type: 'pop', tag: 'bal' }],
      solution: [{ type: 'pin', x: 500, y: 200, angle: 180 * D }],
    },
    {
      title: 'בלון לכוכב',
      text: 'הבלון תקוע מתחת למדף. עזרו לו לעוף אל הכוכב.',
      fixed: [
        F({ type: 'brick', x: 300, y: 300, w: 240 }),
        F({ type: 'balloon', x: 300, y: 570, tag: 'bal' }),
        F({ type: 'brick', x: 700, y: 260, w: 160, angle: 90 * D }),
      ],
      tray: { ramp: 2 },
      goals: [{ type: 'zone', tag: 'bal', zone: { x: 460, y: 20, w: 220, h: 140 }, star: true }],
      solution: [{ type: 'ramp', x: 335, y: 469, angle: -25 * D }],
    },
    {
      title: 'רוח גבית',
      text: 'כדור הים קל מאוד. מאוורר יכול לדחוף אותו אל הדלי.',
      fixed: [
        F(L4.shelf),
        F({ type: 'beachball', x: 150, y: on(L4.shelf, 150, 22), tag: 'ball' }),
        F({ type: 'bucket', x: 560, y: 588, tag: 'bk' }),
      ],
      tray: { fan: 1 },
      goals: [{ type: 'zone', tag: 'ball', bucket: 'bk' }],
      solution: [{ type: 'fan', x: 62, y: 262 }],
    },
    {
      title: 'דומינו',
      text: 'הפילו את שורת הדומינו כדי שהכדורסל ייפול לדלי.',
      fixed: [
        F(L5.top),
        F({ type: 'bowling', x: 50, y: on(L5.top, 50, 18), tag: 'heavy' }),
        F(L5.shelf),
        ...[340, 375, 410, 445, 480, 515, 550].map((x) => F({ type: 'domino', x, y: on(L5.shelf, x, 26) })),
        F({ type: 'basketball', x: 592, y: on(L5.shelf, 592, 16), tag: 'ball' }),
        F({ type: 'bucket', x: 780, y: 588, tag: 'bk' }),
      ],
      tray: { ramp: 2 },
      goals: [{ type: 'zone', tag: 'ball', bucket: 'bk' }],
      solution: [{ type: 'ramp', x: 309, y: 250, angle: 30 * D }],
    },
    {
      title: 'נדנדה',
      text: 'כשהכדור הכבד ינחת על הנדנדה, הכדורסל יעוף למעלה – עד הכוכב!',
      fixed: [
        F(L6.top),
        F({ type: 'bowling', x: 40, y: on(L6.top, 40, 18), tag: 'heavy' }),
        F({ type: 'seesaw', x: 520, y: 588 }),
        F({ type: 'brick', x: 622, y: 600, w: 40, angle: 90 * D }),
        F({ type: 'basketball', x: 585, y: 585, tag: 'ball' }),
      ],
      tray: { ramp: 2 },
      goals: [{ type: 'zone', tag: 'ball', zone: { x: 480, y: 130, w: 110, h: 110 }, star: true, touch: true }],
      solution: [{ type: 'ramp', x: 240, y: 242, angle: 20 * D }],
    },
    {
      title: 'מסוע',
      text: 'מסוע מסיע דברים. לחצו "הפוך" כדי לשנות כיוון.',
      fixed: [
        F(L7.top),
        F({ type: 'bowling', x: 120, y: on(L7.top, 120, 18), tag: 'ball' }),
        F({ type: 'brick', x: 620, y: 520, w: 200, angle: 90 * D }),
        F({ type: 'bucket', x: 800, y: 588, tag: 'bk' }),
      ],
      tray: { conveyor: 1, ramp: 1 },
      goals: [{ type: 'zone', tag: 'ball', bucket: 'bk' }],
      solution: [{ type: 'conveyor', x: 430, y: 281 }],
    },
    {
      title: 'קפיצה גבוהה',
      text: 'הדלי גבוה מדי... אולי טרמפולינה תעזור?',
      fixed: [
        F(L8.top),
        F({ type: 'basketball', x: 50, y: on(L8.top, 50, 16), tag: 'ball' }),
        F({ type: 'brick', x: 640, y: 340, w: 140 }),
        F({ type: 'bucket', x: 640, y: 297, tag: 'bk' }),
      ],
      tray: { trampoline: 1, ramp: 1 },
      goals: [{ type: 'zone', tag: 'ball', bucket: 'bk' }],
      solution: [{ type: 'trampoline', x: 302, y: 382 }, { type: 'ramp', x: 357, y: 231, angle: -10 * D }],
    },
    {
      title: 'שתי משימות',
      text: 'גם לפוצץ את הבלון וגם להכניס את הכדור לדלי!',
      fixed: [
        F(L9.top),
        F({ type: 'bowling', x: 930, y: on(L9.top, 930, 18), tag: 'ball' }),
        F({ type: 'bucket', x: 380, y: 588, tag: 'bk' }),
        F({ type: 'brick', x: 120, y: 450, w: 300, angle: 90 * D }),
        F({ type: 'brick', x: 220, y: 450, w: 300, angle: 90 * D }),
        F({ type: 'balloon', x: 170, y: 570, tag: 'bal' }),
      ],
      tray: { pin: 1, ramp: 2 },
      goals: [{ type: 'pop', tag: 'bal' }, { type: 'zone', tag: 'ball', bucket: 'bk' }],
      solution: [{ type: 'pin', x: 179, y: 105, angle: 180 * D }, { type: 'ramp', x: 602, y: 370, angle: -25 * D }],
    },
    {
      title: 'המכונה הגדולה',
      text: 'מאוורר, קרש וטרמפולינה – בנו מכונה שלמה!',
      fixed: [
        F(L10.shelf),
        F({ type: 'beachball', x: 120, y: on(L10.shelf, 120, 22), tag: 'ball' }),
        F({ type: 'brick', x: 500, y: 520, w: 200, angle: 90 * D }),
        F({ type: 'brick', x: 800, y: 480, w: 140 }),
        F({ type: 'bucket', x: 800, y: 437, tag: 'bk' }),
      ],
      tray: { fan: 1, ramp: 2, trampoline: 1 },
      goals: [{ type: 'zone', tag: 'ball', bucket: 'bk' }],
      solution: [{ type: 'fan', x: 65, y: 122 }, { type: 'trampoline', x: 585, y: 513 }],
    },
  ];
});
