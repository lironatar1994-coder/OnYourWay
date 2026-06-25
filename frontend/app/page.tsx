import { LeadForm } from '@/components/LeadForm';

export default function Home() {
  return (
    <>
      <header className="hero">
        <div className="wrap">
          <nav className="nav">
            <div className="logo">
              <span className="mark">↗</span>
              On The Way
            </div>
            <span className="nav-cta">בעלי מקצוע מקומיים ואמינים · מהיר בוואטסאפ</span>
          </nav>

          <div className="hero-grid">
            <div>
              <span className="eyebrow">● מתחברים תוך דקות</span>
              <h1>
                בעל מקצוע מקומי ואמין, <span className="accent">כבר בדרך אליכם</span>.
              </h1>
              <p className="lede">
                ספרו לנו מה צריך — אינסטלציה, חשמל, מנעולן, מיזוג ועוד. אנחנו מנתבים את הבקשה שלכם
                מיד לבעל המקצוע המתאים באזור, ישירות בוואטסאפ.
              </p>
              <div className="trust">
                <div className="item">
                  <b>דקות</b>
                  <span>עד למענה ראשון</span>
                </div>
                <div className="item">
                  <b>מאומתים</b>
                  <span>מומחים מקומיים</span>
                </div>
                <div className="item">
                  <b>חינם</b>
                  <span>לשליחת בקשה</span>
                </div>
              </div>
            </div>

            <LeadForm />
          </div>
        </div>
      </header>

      <section className="steps">
        <div className="wrap">
          <h2>איך זה עובד</h2>
          <p className="sub">שלושה צעדים מהבעיה ועד לבעל המקצוע.</p>
          <div className="steps-grid">
            <div className="step">
              <div className="num">1</div>
              <h3>ספרו לנו מה צריך</h3>
              <p>תארו את העבודה במשפט אחד והשאירו פרטים ליצירת קשר. לוקח 30 שניות.</p>
            </div>
            <div className="step">
              <div className="num">2</div>
              <h3>אנחנו מתאימים מיד</h3>
              <p>
                המערכת מדרגת מומחים מקומיים לפי ההתאמה המדויקת ביותר לבקשה שלכם ומנתבת אותה בזמן אמת.
              </p>
            </div>
            <div className="step">
              <div className="num">3</div>
              <h3>בעל המקצוע יוצר קשר</h3>
              <p>בעל המקצוע המתאים מקבל התראה בוואטסאפ ויוצר אתכם קשר ישירות.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap" style={{ display: 'contents' }}>
          <span>© {new Date().getFullYear()} On The Way</span>
          <span>ניתוב פניות בזמן אמת · שיגור בוואטסאפ</span>
        </div>
      </footer>
    </>
  );
}
