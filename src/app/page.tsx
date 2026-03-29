"use client";

import { useState, useEffect } from "react";

type Lang = "lt" | "en" | "es" | "de" | "ru";
type Theme = "light" | "dark" | "system";

const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: "lt", flag: "🇱🇹", label: "LT" },
  { code: "en", flag: "🇬🇧", label: "EN" },
  { code: "es", flag: "🇪🇸", label: "ES" },
  { code: "de", flag: "🇩🇪", label: "DE" },
  { code: "ru", flag: "🇷🇺", label: "RU" },
];

const T: Record<string, Record<Lang, string>> = {
  nav_feat:  { lt:"Funkcijos", en:"Features", es:"Funciones", de:"Funktionen", ru:"Функции" },
  nav_price: { lt:"Kaina", en:"Pricing", es:"Precio", de:"Preise", ru:"Цены" },
  nav_login: { lt:"Prisijungti", en:"Log in", es:"Entrar", de:"Anmelden", ru:"Войти" },
  nav_try:   { lt:"Išbandyti", en:"Try free", es:"Probar", de:"Testen", ru:"Попробовать" },

  h1a: { lt:"Valdyk servisą.", en:"Run your shop.", es:"Gestiona tu taller.", de:"Deine Werkstatt.", ru:"Управляй сервисом." },
  h1b: { lt:"Ne Excel'į.", en:"Not spreadsheets.", es:"No hojas de cálculo.", de:"Nicht Tabellen.", ru:"Не таблицами." },
  h_sub: {
    lt:"Užsakymai, planavimas, meistro lapas, detalių apskaita, analitika — viskas vienoje sistemoje auto servisams.",
    en:"Work orders, scheduling, mechanic sheets, parts tracking, analytics — one system for auto service shops.",
    es:"Órdenes, planificación, mecánicos, piezas, analítica — un sistema para talleres.",
    de:"Aufträge, Planung, Mechaniker, Teile, Analysen — ein System für Werkstätten.",
    ru:"Заказ-наряды, планирование, механики, запчасти, аналитика — одна система для автосервисов."
  },
  h_cta1: { lt:"Pradėti nemokamai", en:"Start for free", es:"Empezar gratis", de:"Kostenlos starten", ru:"Начать бесплатно" },
  h_cta2: { lt:"Žiūrėti demo", en:"See demo", es:"Ver demo", de:"Demo ansehen", ru:"Смотреть демо" },

  s_label: { lt:"Produktas veikime", en:"The product in action", es:"El producto en acción", de:"Das Produkt in Aktion", ru:"Продукт в действии" },
  s1: { lt:"Valdymo skydelis", en:"Dashboard", es:"Panel", de:"Dashboard", ru:"Панель" },
  s2: { lt:"Planuoklė", en:"Scheduler", es:"Planificador", de:"Planer", ru:"Планировщик" },
  s3: { lt:"Meistro lapas", en:"Mechanic view", es:"Vista mecánico", de:"Mechaniker", ru:"Лист механика" },
  s4: { lt:"Kainodara", en:"Pricing rules", es:"Precios", de:"Preisregeln", ru:"Ценообразование" },

  feat_label: { lt:"Galimybės", en:"Capabilities", es:"Capacidades", de:"Funktionen", ru:"Возможности" },
  feat_title: { lt:"Viskas ko reikia servisui valdyti", en:"Everything to run an auto service", es:"Todo para gestionar un taller", de:"Alles für die Werkstattverwaltung", ru:"Всё для управления автосервисом" },

  f1t: { lt:"Užsakymai", en:"Work orders", es:"Órdenes", de:"Aufträge", ru:"Заказы" },
  f1d: { lt:"Sukūrimas, priskyrimas, sekimas, užbaigimas. Automatinis kainų skaičiavimas, detalių marža, darbuotojo atlygis.", en:"Create, assign, track, complete. Auto-calculated pricing, parts margin, worker pay.", es:"Crear, asignar, seguir, completar. Precios automáticos.", de:"Erstellen, zuweisen, verfolgen. Automatische Preisberechnung.", ru:"Создание, назначение, отслеживание. Автоматический расчёт цен." },
  f2t: { lt:"Gantt planuoklė", en:"Gantt scheduler", es:"Planificador Gantt", de:"Gantt-Planer", ru:"Планировщик Gantt" },
  f2d: { lt:"Vilkite operacijas ant laiko juostos. Matykite dienos krūvį kiekvienai darbo vietai.", en:"Drag operations onto the timeline. See daily workload per workshop bay.", es:"Arrastre operaciones. Vea la carga diaria por estación.", de:"Operationen auf die Timeline ziehen. Tägliche Auslastung.", ru:"Перетаскивайте операции. Загрузка по рабочим местам." },
  f3t: { lt:"Meistro lapas", en:"Mechanic sheet", es:"Hoja de mecánico", de:"Mechanikerblatt", ru:"Лист механика" },
  f3d: { lt:"Kiekvienas meistras mato tik savo darbus. Laikmatis, detalių registravimas, komentarai.", en:"Each mechanic sees only their work. Timer, parts logging, comments.", es:"Cada mecánico ve solo sus tareas. Temporizador, piezas.", de:"Jeder Mechaniker sieht nur seine Aufgaben. Timer, Teile.", ru:"Каждый видит только свои задачи. Таймер, учёт деталей." },
  f4t: { lt:"VIN dekoduotojas", en:"VIN decoder", es:"Decodificador VIN", de:"VIN-Decoder", ru:"VIN декодер" },
  f4d: { lt:"Automatinis 30+ laukų užpildymas. Pilna automobilio remonto istorija.", en:"Auto-fill 30+ fields. Complete vehicle repair history.", es:"Relleno automático de 30+ campos. Historial completo.", de:"30+ Felder automatisch. Komplette Reparaturhistorie.", ru:"Авто-заполнение 30+ полей. Полная история ремонтов." },
  f5t: { lt:"Analitika", en:"Analytics", es:"Analítica", de:"Analysen", ru:"Аналитика" },
  f5d: { lt:"Pajamos, pelnas, detalių marža, darbuotojų kaštai. Paslaugų populiarumas.", en:"Revenue, profit, parts margin, labor costs. Service popularity.", es:"Ingresos, beneficio, margen, costos.", de:"Einnahmen, Gewinn, Marge, Kosten.", ru:"Доход, прибыль, маржа, затраты." },
  f6t: { lt:"Komanda ir rolės", en:"Team & roles", es:"Equipo y roles", de:"Team & Rollen", ru:"Команда и роли" },
  f6d: { lt:"Savininkas, vadybininkas, mechanikas — kiekvienas mato tik tai, kas jam priklauso.", en:"Owner, manager, mechanic — each sees only what they should.", es:"Propietario, gerente, mecánico — acceso por rol.", de:"Inhaber, Manager, Mechaniker — rollenbasiert.", ru:"Владелец, менеджер, механик — доступ по ролям." },

  price_label: { lt:"Kainodara", en:"Pricing", es:"Precios", de:"Preise", ru:"Цены" },
  price_title: { lt:"Nuo nulio iki pilno serviso", en:"From zero to full shop", es:"De cero a taller completo", de:"Von null zur vollen Werkstatt", ru:"От нуля до полного сервиса" },
  p_mo: { lt:"mėn.", en:"mo", es:"mes", de:"Mo.", ru:"мес." },
  p_free_d: { lt:"Beta laikotarpiu", en:"During beta", es:"Durante beta", de:"Während Beta", ru:"В период бета" },
  pf1: { lt:"Neriboti užsakymai", en:"Unlimited orders", es:"Órdenes ilimitadas", de:"Unbegrenzte Aufträge", ru:"Безлимитные заказы" },
  pf2: { lt:"Iki 10 darbuotojų", en:"Up to 10 users", es:"Hasta 10 usuarios", de:"Bis 10 Nutzer", ru:"До 10 пользователей" },
  pf3: { lt:"Planuoklė + analitika", en:"Scheduler + analytics", es:"Planificador + analítica", de:"Planer + Analysen", ru:"Планировщик + аналитика" },
  pf4: { lt:"VIN dekoduotojas", en:"VIN decoder", es:"Decodificador VIN", de:"VIN-Decoder", ru:"VIN декодер" },
  pf5: { lt:"5 kalbos", en:"5 languages", es:"5 idiomas", de:"5 Sprachen", ru:"5 языков" },

  cta_t: { lt:"Paruošta naudoti šiandien", en:"Ready to use today", es:"Listo para usar hoy", de:"Heute einsatzbereit", ru:"Готово к использованию" },
  cta_d: { lt:"Registracija užtrunka 2 minutes. Kortelės nereikia.", en:"Sign up takes 2 minutes. No credit card.", es:"Registro en 2 minutos. Sin tarjeta.", de:"2 Minuten. Keine Karte.", ru:"Регистрация за 2 минуты. Без карты." },

  foot_priv: { lt:"Privatumas", en:"Privacy", es:"Privacidad", de:"Datenschutz", ru:"Конфиденциальность" },
  foot_terms: { lt:"Sąlygos", en:"Terms", es:"Términos", de:"Bedingungen", ru:"Условия" },
};

const LEGAL: Record<string, Record<Lang, string>> = {
  privacy: {
    lt:"<p><b>Atnaujinta:</b> 2026-02-20</p><p>VURSO renka: paskyros info, verslo duomenis, naudojimo statistiką. Saugoma ES serveriuose (Supabase). GDPR teisės: kopija, taisymas, trynimas — info@vurso.app. Tik būtini slapukai.</p>",
    en:"<p><b>Updated:</b> 2026-02-20</p><p>VURSO collects: account info, business data, usage stats. Stored on EU servers (Supabase). GDPR rights: copy, correction, deletion — info@vurso.app. Essential cookies only.</p>",
    es:"<p><b>Actualizado:</b> 2026-02-20</p><p>Datos en servidores UE. Derechos GDPR: info@vurso.app. Solo cookies esenciales.</p>",
    de:"<p><b>Stand:</b> 2026-02-20</p><p>EU-Server. DSGVO-Rechte: info@vurso.app. Nur essenzielle Cookies.</p>",
    ru:"<p><b>Обновлено:</b> 2026-02-20</p><p>Серверы ЕС. Права GDPR: info@vurso.app. Только необходимые cookies.</p>",
  },
  terms: {
    lt:"<p><b>Atnaujinta:</b> 2026-02-20</p><p>Paslauga teikiama &bdquo;tokia kokia yra&ldquo;. Jūs atsakote už paskyros saugumą. Duomenų nuosavybė — jūsų. Nedalijame su trečiosiomis šalimis. Uždarymas bet kada, duomenys trinami per 30d.</p>",
    en:"<p><b>Updated:</b> 2026-02-20</p><p>Service provided \"as is\". You own your data. No third-party sharing. Close account anytime, data deleted within 30 days.</p>",
    es:"<p><b>Actualizado:</b> 2026-02-20</p><p>Servicio \"tal cual\". Sus datos son suyos. Sin terceros. Cierre cuando quiera.</p>",
    de:"<p><b>Stand:</b> 2026-02-20</p><p>Dienst &bdquo;wie besehen&ldquo;. Ihre Daten gehören Ihnen. Keine Weitergabe. Kündigung jederzeit.</p>",
    ru:"<p><b>Обновлено:</b> 2026-02-20</p><p>Сервис «как есть». Данные — ваши. Без третьих лиц. Закрытие в любое время.</p>",
  },
};

const _t = (key: string, lang: Lang): string => T[key]?.[lang] || T[key]?.en || key;

const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

:root{--bg:#fff;--bg2:#fafafa;--fg:#111;--fg2:#555;--fg3:#999;--border:#e8e8e8;--card:#fff;--card-h:#fafafa;--r:10px}
[data-theme="dark"]{--bg:#0a0a0a;--bg2:#111;--fg:#eee;--fg2:#999;--fg3:#555;--border:#1e1e1e;--card:#111;--card-h:#171717}

*{box-sizing:border-box;margin:0;padding:0}
.lp{font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--fg);-webkit-font-smoothing:antialiased;min-height:100vh}
.lp a{text-decoration:none}

.n{position:fixed;top:0;left:0;right:0;z-index:100;border-bottom:1px solid var(--border);background:var(--bg);transition:background .2s}
.ni{max-width:1100px;margin:0 auto;padding:0 32px;height:56px;display:flex;align-items:center;justify-content:space-between}
.nl{font-weight:600;font-size:17px;letter-spacing:-.4px}
.nr{display:flex;align-items:center;gap:4px}
.nk{padding:7px 14px;font-size:13px;color:var(--fg2);border-radius:8px;transition:color .15s}
.nk:hover{color:var(--fg)}
.lp .nc{padding:7px 16px;font-size:13px;font-weight:500;background:var(--fg);color:var(--bg);border-radius:8px;transition:opacity .15s}
.lp .nc:hover{opacity:.8}
.nx{display:flex;align-items:center;gap:2px;margin-left:8px}
.ns{height:30px;padding:0 10px;font-size:12px;border:1px solid var(--border);border-radius:7px;background:transparent;color:var(--fg2);cursor:pointer;font-family:inherit;transition:all .15s;display:flex;align-items:center;gap:4px}
.ns:hover{border-color:var(--fg3);color:var(--fg)}
.dd{position:relative}
.dm{position:absolute;top:calc(100% + 6px);right:0;background:var(--card);border:1px solid var(--border);border-radius:var(--r);overflow:hidden;display:none;min-width:130px;z-index:200;box-shadow:0 8px 30px rgba(0,0,0,.06)}
[data-theme="dark"] .dm{box-shadow:0 8px 30px rgba(0,0,0,.4)}
.dm.o{display:block}
.dm button{display:flex;align-items:center;gap:8px;width:100%;padding:8px 14px;border:none;background:none;cursor:pointer;font-size:13px;color:var(--fg2);font-family:inherit;transition:background .1s}
.dm button:hover{background:var(--card-h)}
.dm button.a{color:var(--fg);font-weight:600}

.hero{padding:140px 32px 80px;max-width:680px;margin:0 auto}
.hero h1{font-size:clamp(2.4rem,5vw,3.6rem);font-weight:600;letter-spacing:-1.8px;line-height:1.06;margin-bottom:24px}
.hero h1 span{color:var(--fg3)}
.hero>p{font-size:17px;color:var(--fg2);line-height:1.7;margin-bottom:40px;max-width:500px}
.hb{display:flex;gap:12px;align-items:center}
.lp .bp{padding:11px 26px;font-size:14px;font-weight:500;background:var(--fg);color:var(--bg);border-radius:8px;border:none;cursor:pointer;font-family:inherit;transition:opacity .15s;display:inline-block;text-align:center}
.lp .bp:hover{opacity:.8}
.lp .bg{padding:11px 26px;font-size:14px;font-weight:500;color:var(--fg2);border:1px solid var(--border);border-radius:8px;background:transparent;cursor:pointer;font-family:inherit;transition:all .15s;display:inline-block}
.lp .bg:hover{border-color:var(--fg3);color:var(--fg)}

.ss{padding:0 32px 100px;max-width:1100px;margin:0 auto}
.sl{font-size:11px;font-weight:500;color:var(--fg3);text-transform:uppercase;letter-spacing:1.8px;margin-bottom:20px}
.st{display:flex;gap:2px;margin-bottom:16px}
.stb{padding:7px 16px;font-size:13px;font-weight:500;border-radius:7px;border:none;cursor:pointer;color:var(--fg3);background:transparent;font-family:inherit;transition:all .12s}
.stb:hover{color:var(--fg2)}
.stb.a{background:var(--fg);color:var(--bg)}
.sf{border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--bg2)}
.sf img{width:100%;display:block}

.feat{padding:100px 32px;border-top:1px solid var(--border)}
.fi{max-width:1100px;margin:0 auto}
.fh{margin-bottom:56px}
.fh small{font-size:11px;font-weight:500;color:var(--fg3);text-transform:uppercase;letter-spacing:1.8px;display:block;margin-bottom:10px}
.fh h2{font-size:clamp(1.5rem,3vw,2.1rem);font-weight:600;letter-spacing:-.8px;max-width:440px;line-height:1.2}
.fg{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);border:1px solid var(--border);border-radius:12px;overflow:hidden}
.fc{background:var(--card);padding:28px 28px 32px;transition:background .15s}
.fc:hover{background:var(--card-h)}
.fc h3{font-size:14px;font-weight:600;margin-bottom:8px;letter-spacing:-.1px}
.fc p{font-size:13px;color:var(--fg2);line-height:1.65}

.pr{padding:100px 32px;border-top:1px solid var(--border)}
.pi{max-width:420px;margin:0 auto}
.ph{margin-bottom:40px}
.ph small{font-size:11px;font-weight:500;color:var(--fg3);text-transform:uppercase;letter-spacing:1.8px;display:block;margin-bottom:10px}
.ph h2{font-size:clamp(1.5rem,3vw,2.1rem);font-weight:600;letter-spacing:-.8px;line-height:1.2}
.pc{border:1px solid var(--border);border-radius:12px;padding:36px}
.pp{font-size:44px;font-weight:600;letter-spacing:-2px;margin-bottom:2px}
.pp span{font-size:15px;color:var(--fg3);font-weight:400;margin-left:2px}
.pn{font-size:13px;color:var(--fg3);margin-bottom:24px}
.pl{list-style:none;display:flex;flex-direction:column;gap:12px;margin-bottom:28px}
.pl li{font-size:13.5px;color:var(--fg2);display:flex;align-items:center;gap:10px}
.pl li::before{content:'';width:4px;height:4px;border-radius:50%;background:var(--fg3);flex-shrink:0}

.ct{padding:100px 32px;border-top:1px solid var(--border);text-align:center}
.ct h2{font-size:clamp(1.5rem,3vw,2.1rem);font-weight:600;letter-spacing:-.8px;margin-bottom:10px}
.ct>p{font-size:15px;color:var(--fg2);margin-bottom:28px}

.ft{padding:28px 32px;border-top:1px solid var(--border)}
.fti{max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;align-items:center}
.ftc{font-size:12px;color:var(--fg3)}
.ftl{display:flex;gap:20px}
.ftl button{background:none;border:none;font-size:12px;color:var(--fg3);cursor:pointer;font-family:inherit;transition:color .15s}
.ftl button:hover{color:var(--fg2)}

.mb{position:fixed;inset:0;background:rgba(0,0,0,.35);backdrop-filter:blur(6px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px}
.mo{background:var(--card);border:1px solid var(--border);border-radius:14px;max-width:520px;width:100%;max-height:70vh;overflow-y:auto;padding:32px;position:relative}
.mo h2{font-size:17px;font-weight:600;margin-bottom:14px}
.mo p{font-size:13.5px;color:var(--fg2);line-height:1.8;margin-bottom:8px}
.mx{position:absolute;top:12px;right:12px;width:30px;height:30px;border-radius:8px;border:1px solid var(--border);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;color:var(--fg3);transition:color .15s}
.mx:hover{color:var(--fg)}

@media(max-width:768px){
  .fg{grid-template-columns:1fr}
  .nk{display:none}
  .hero{padding:110px 20px 60px}
  .fti{flex-direction:column;gap:14px;text-align:center}
  .st{overflow-x:auto;-webkit-overflow-scrolling:touch}
}
`;

const SCREENS = [
  { src:"/screenshots/dashboard.png", k:"s1" },
  { src:"/screenshots/scheduler.png", k:"s2" },
  { src:"/screenshots/mechanic.png",  k:"s3" },
  { src:"/screenshots/settings.png",  k:"s4" },
];

const FEATS = [
  { t:"f1t",d:"f1d" },{ t:"f2t",d:"f2d" },{ t:"f3t",d:"f3d" },
  { t:"f4t",d:"f4d" },{ t:"f5t",d:"f5d" },{ t:"f6t",d:"f6d" },
];

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("lt");
  const [theme, setTheme] = useState<Theme>("system");
  const [langOpen, setLangOpen] = useState(false);
  const [ssIdx, setSsIdx] = useState(0);
  const [modal, setModal] = useState<"privacy"|"terms"|null>(null);

  useEffect(() => {
    try {
      const sl = localStorage.getItem("vurso-lp-lang") as Lang;
      if (sl && ["lt","en","es","de","ru"].includes(sl)) setLang(sl);
      const st = localStorage.getItem("vurso-lp-theme") as Theme;
      if (st) setTheme(st);
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("vurso-lp-theme", theme); } catch {}
    const dark = theme === "system"
      ? window.matchMedia("(prefers-color-scheme:dark)").matches
      : theme === "dark";
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme:dark)");
    const fn = () => {
      if (theme === "system")
        document.documentElement.setAttribute("data-theme", mq.matches ? "dark" : "light");
    };
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [theme]);

  const switchLang = (l: Lang) => {
    setLang(l);
    try { localStorage.setItem("vurso-lp-lang", l); } catch {}
    setLangOpen(false);
  };
  const cycleTheme = () =>
    setTheme(({ light:"dark",dark:"system",system:"light" } as Record<Theme,Theme>)[theme]);

  const tIcon = theme === "system" ? "◐" : theme === "dark" ? "●" : "○";
  const L = LANGS.find(l => l.code === lang)!;
  const t = (k: string) => _t(k, lang);

  return (
    <div className="lp" onClick={() => langOpen && setLangOpen(false)}>
      <style dangerouslySetInnerHTML={{ __html: S }} />

      {/* NAV */}
      <nav className="n">
        <div className="ni">
          <div className="nl">VURSO</div>
          <div className="nr">
            <a className="nk" href="#features">{t("nav_feat")}</a>
            <a className="nk" href="#pricing">{t("nav_price")}</a>
            <div className="nx">
              <button className="ns" onClick={cycleTheme}>{tIcon}</button>
              <div className="dd" onClick={e => e.stopPropagation()}>
                <button className="ns" onClick={() => setLangOpen(!langOpen)}>
                  {L.flag} {L.label}
                </button>
                <div className={`dm ${langOpen ? "o" : ""}`}>
                  {LANGS.map(l => (
                    <button key={l.code} className={lang===l.code?"a":""}
                      onClick={() => switchLang(l.code)}>
                      {l.flag} {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <a className="nk" href="/login">{t("nav_login")}</a>
            <a className="nc" href="/login">{t("nav_try")}</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <h1>{t("h1a")}<br/><span>{t("h1b")}</span></h1>
        <p>{t("h_sub")}</p>
        <div className="hb">
          <a href="/login" className="bp">{t("h_cta1")}</a>
          <a href="#screenshots" className="bg">{t("h_cta2")}</a>
        </div>
      </section>

      {/* SCREENSHOTS */}
      <section className="ss" id="screenshots">
        <div className="sl">{t("s_label")}</div>
        <div className="st">
          {SCREENS.map((s,i) => (
            <button key={i} className={`stb ${ssIdx===i?"a":""}`}
              onClick={() => setSsIdx(i)}>{t(s.k)}</button>
          ))}
        </div>
        <div className="sf">
          <img src={SCREENS[ssIdx].src} alt={t(SCREENS[ssIdx].k)} />
        </div>
      </section>

      {/* FEATURES */}
      <section className="feat" id="features">
        <div className="fi">
          <div className="fh">
            <small>{t("feat_label")}</small>
            <h2>{t("feat_title")}</h2>
          </div>
          <div className="fg">
            {FEATS.map((f,i) => (
              <div key={i} className="fc">
                <h3>{t(f.t)}</h3>
                <p>{t(f.d)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pr" id="pricing">
        <div className="pi">
          <div className="ph">
            <small>{t("price_label")}</small>
            <h2>{t("price_title")}</h2>
          </div>
          <div className="pc">
            <div className="pp">€0<span>/{t("p_mo")}</span></div>
            <div className="pn">{t("p_free_d")}</div>
            <ul className="pl">
              {["pf1","pf2","pf3","pf4","pf5"].map(k => <li key={k}>{t(k)}</li>)}
            </ul>
            <a href="/login" className="bp"
              style={{ display:"block",width:"100%",padding:"12px 0" }}>
              {t("h_cta1")}
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ct">
        <h2>{t("cta_t")}</h2>
        <p>{t("cta_d")}</p>
        <a href="/login" className="bp" style={{ padding:"12px 36px" }}>{t("h_cta1")}</a>
      </section>

      {/* FOOTER */}
      <footer className="ft">
        <div className="fti">
          <div className="ftc">© 2026 VURSO</div>
          <div className="ftl">
            <button onClick={() => setModal("privacy")}>{t("foot_priv")}</button>
            <button onClick={() => setModal("terms")}>{t("foot_terms")}</button>
          </div>
        </div>
      </footer>

      {/* MODAL */}
      {modal && (
        <div className="mb" onClick={e => { if(e.target===e.currentTarget) setModal(null); }}>
          <div className="mo">
            <button className="mx" onClick={() => setModal(null)}>×</button>
            <h2>{t(modal==="privacy"?"foot_priv":"foot_terms")}</h2>
            <div dangerouslySetInnerHTML={{ __html: LEGAL[modal][lang] }} />
          </div>
        </div>
      )}
    </div>
  );
}
