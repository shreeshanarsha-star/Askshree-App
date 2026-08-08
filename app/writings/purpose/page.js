'use client';

const TOPICS = [
  { label: 'Purpose', href: '/writings/purpose', active: true },
  { label: 'Leadership', href: '/writings/leadership' },
  { label: 'Strategy', href: '/writings/strategy' },
  { label: 'Artificial Intelligence', href: '/writings/artificial-intelligence' },
  { label: 'Spirituality', href: '/writings/spirituality' },
];

export default function PurposeWritingPage() {
  return (
    <div style={{ position: 'relative' }}>
      <div className="nav">
        <div className="logo"><a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Ask <span>Shree</span></a></div>
        <a href="/" style={{ fontSize: 13, color: 'var(--slate)', textDecoration: 'none' }}>&larr; back to home</a>
      </div>

      <div style={{ padding: '56px 24px 80px', maxWidth: 760, margin: '0 auto' }}>
        <div className="eyebrow" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, letterSpacing: '0.08em', color: 'var(--amber)', marginBottom: 14 }}>WRITINGS</div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, fontSize: 32, color: 'var(--cream)', margin: '0 0 32px' }}>Purpose</h1>

        <div
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          style={{
            width: '100%', maxWidth: 794, margin: '0 auto',
            background: 'var(--navy-2)', border: '1px solid var(--line)', borderRadius: 6,
            padding: '64px 48px', boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
            WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none', userSelect: 'none',
          }}
        >
          <div style={{ padding: '0 0 36px', textAlign: 'center' }}>
            <img
              src="/writings/purpose-idol.jpg"
              alt="Deity idol"
              draggable={false}
              style={{ maxWidth: 320, width: '100%', borderRadius: 6, border: '1px solid var(--line)', boxShadow: '0 12px 32px rgba(0,0,0,0.45)' }}
            />
          </div>

          <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, fontSize: 26, color: 'var(--cream)', margin: '0 0 8px', textAlign: 'center' }}>
            What Is the Purpose of Life?
          </div>
          <div style={{ width: 48, height: 2, background: 'var(--amber-dim)', margin: '0 auto 40px' }}></div>

          <div style={{ fontSize: '15.5px', lineHeight: 1.85, color: 'var(--cream)' }}>
            <p style={{ margin: '0 0 4px', textAlign: 'justify' }}>Have you ever paused and asked yourself:</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>Who am I? Why am I here? What is the purpose of my life? What am I here to do?</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>These questions have crossed my mind many times.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>There are countless philosophies, theories and answers to the purpose of life. I explored many of them. Somewhere along the way, I realised that perhaps the answer isn&rsquo;t something I need to find outside myself.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>The answer may already be within me.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>It may be in my nature, my DNA, and in the ancient lineage from which I emerged.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>I began looking at my father, my forefathers and my ancestors&mdash;not just to know their names, but to understand who they were, what they valued, how they lived, what they created, what they learned and what they carried forward.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>In the Indian tradition, our ancient lineage is connected to the Sapta Rishis&mdash;the seven great seers, representing profound streams of knowledge and consciousness.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>That made me look at myself differently.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>Perhaps I am not an isolated individual who simply arrived in this world. Perhaps I am an expression of an ancient lineage&mdash;an expansion of something that began long before me and continues through me.</p>

            <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, fontSize: 19, color: 'var(--amber)', margin: '44px 0 18px' }}>The Code I Was Given</h3>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>In my community, we have the tradition of Upanayanam, through which a child is initiated into a deeper spiritual and cultural lineage.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>For me, it feels like more than a ceremony.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>It is a code&mdash;a connection to identity, lineage, knowledge and something much larger than myself.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>The words passed down to me are:</p>

            <blockquote style={{ margin: '28px 0', padding: '18px 24px', borderLeft: '2px solid var(--amber-dim)', background: 'rgba(232,163,61,0.04)', fontStyle: 'italic', color: 'var(--slate)' }}>
              <p style={{ margin: '0 0 4px', fontSize: 14.5 }}>Akashat patitam toyam</p>
              <p style={{ margin: '0 0 4px', fontSize: 14.5 }}>yatha gachhati sagaram,</p>
              <p style={{ margin: '0 0 4px', fontSize: 14.5 }}>sarva deva namaskaram</p>
              <p style={{ margin: '0 0 4px', fontSize: 14.5 }}>Keshavam pratigachhati.</p>
              <p style={{ margin: '12px 0 0', fontSize: 14.5, fontStyle: 'normal', color: 'var(--cream)' }}>
                In English:<br />&ldquo;Just as water that falls from the sky ultimately flows towards the ocean, salutations offered to all the divine forms ultimately reach the Supreme.&rdquo;
              </p>
            </blockquote>

            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>Along with this comes the invocation of my lineage:</p>

            <blockquote style={{ margin: '28px 0', padding: '18px 24px', borderLeft: '2px solid var(--amber-dim)', background: 'rgba(232,163,61,0.04)', fontStyle: 'italic', color: 'var(--slate)' }}>
              <p style={{ margin: '0 0 4px', fontSize: 14.5 }}>Vasishtha gotra, Kaundinya pravara,</p>
              <p style={{ margin: '0 0 4px', fontSize: 14.5 }}>Ashvalayana sutra, Rigveda shakha,</p>
              <p style={{ margin: '0 0 4px', fontSize: 14.5 }}>Shreesha Sharmanah aham abhivadayet.</p>
            </blockquote>

            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>In essence, this invocation identifies the gotra, pravara, sutra and Vedic tradition from which I come and places me within that lineage.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>For me, this was more than a set of words.</p>
            <p style={{ margin: '0 0 4px', textAlign: 'justify' }}>It made me ask:</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>What exactly has been passed down to me?</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>What is my code?</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>What is my lineage?</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>What knowledge am I carrying?</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>And what am I supposed to carry forward?</p>

            <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, fontSize: 19, color: 'var(--amber)', margin: '44px 0 18px' }}>When Alignment Begins</h3>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>Then something else began happening.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>As I started becoming more conscious of this journey and more aligned with what I felt was my true direction, I began noticing numbers everywhere.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>111. 222. 333. 444.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>I would see them on clocks, receipts, vehicles, screens&mdash;almost everywhere.</p>
            <p style={{ margin: '0 0 4px', textAlign: 'justify' }}>At first, I wondered:</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>Why am I suddenly seeing these numbers so often?</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>Over time, I began to see them as a personal reassurance of alignment&mdash;a reminder that I was moving in the direction I was meant to move.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>I don&rsquo;t claim that these numbers are scientifically proven messages from the universe.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>But the experience became meaningful to me.</p>
            <p style={{ margin: '0 0 4px', textAlign: 'justify' }}>Whether they are signs from the universe or patterns that become more visible once our attention is tuned to them, I began experiencing them as a quiet reassurance:</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>&ldquo;You are getting aligned. Keep going.&rdquo;</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>And then the questions began connecting.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>Who am I?</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>Where do I belong?</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>What do I carry?</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>What do I create?</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>Why do I create it?</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>How should I live?</p>
            <p style={{ margin: '0 0 4px', textAlign: 'justify' }}>And with those answers came something I had been searching for:</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>Alignment.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>When you understand yourself, your roots, your lineage and your place in the larger creation, life begins to make a different kind of sense.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>You feel connected.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>You feel peaceful.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>You feel purposeful.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>Perhaps the purpose of life is something we discover, understand, and then consciously choose to walk towards.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>And perhaps, when we realign with our true nature and the ancient stream from which we emerged, the energy to create, contribute and continue becomes natural.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>Maybe our purpose is not something we invent.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>Maybe it is something we remember.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>Something that was already within us&mdash;encoded in our nature, carried through our lineage, awakened through our experiences, and revealed when we finally become aligned with who we truly are.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>This helped me find my direction.</p>
            <p style={{ margin: '0 0 22px', textAlign: 'justify' }}>Perhaps it might help you find yours too.</p>
          </div>

          <div style={{ marginTop: 56, paddingTop: 24, borderTop: '1px solid var(--line)', fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 16, color: 'var(--cream)' }}>
            Best,<br />Shreesha Narsha
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 40, flexWrap: 'wrap', maxWidth: 794, marginLeft: 'auto', marginRight: 'auto' }}>
          {TOPICS.map((t) => (
            <a
              key={t.href}
              href={t.href}
              style={{
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, textDecoration: 'none',
                border: '1px solid ' + (t.active ? 'var(--amber-dim)' : 'var(--line)'),
                color: t.active ? 'var(--amber)' : 'var(--slate)',
                borderRadius: 20, padding: '6px 14px',
              }}
            >
              {t.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
