import StarEmbers from '../components/StarEmbers';

export default function Privacy() {
  return (
    <div className="theme-page relative overflow-hidden">
    <StarEmbers />
    <div className="relative max-w-4xl mx-auto px-4 py-16 z-10">
      <EmberField />

      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 rounded-full bg-orange-600/15 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-red-600/15 blur-[100px]" />

      {/* Header */}
      <div className="relative text-center mb-12">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-emerald-700 blur-xl opacity-40 animate-pulse" />
          <div className="absolute inset-0 rounded-full border border-dashed border-yellow-600/60 animate-[spin_18s_linear_infinite]" />
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-700 to-emerald-950 flex items-center justify-center shadow-[0_0_24px_rgba(6,78,59,0.3)] border-2 border-yellow-500/70">
            <span className="text-3xl drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]">🔒</span>
          </div>
        </div>

        <h1 className="font-kanit text-4xl md:text-5xl font-black text-gray-900 drop-shadow-md mb-4 uppercase tracking-wide">
          Privacy Policy
        </h1>
        <div className="h-1 w-24 mx-auto bg-gradient-to-r from-transparent via-gray-900 to-transparent rounded-full" />
      </div>

      {/* Main Content Card (Obsidian Glass) */}
      <div className="obsidian-card theme-card privacy-palette relative">
        <div className="pointer-events-none absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_8px_#facc15] animate-pulse" />
        <div className="pointer-events-none absolute bottom-4 left-4 w-1 h-1 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316] animate-pulse" />

        <article className="
          text-gray-300 leading-relaxed font-medium
          [&_h2]:font-kanit [&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-white
          [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:pb-2
          [&_h2]:border-b [&_h2]:border-yellow-500/30 [&_h2]:uppercase [&_h2]:tracking-wider
          [&_h3]:font-kanit [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-gold
          [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:tracking-wide
          [&_h4]:font-bold [&_h4]:text-yellow-200 [&_h4]:text-lg [&_h4]:mt-6 [&_h4]:mb-2
          [&_p]:text-gray-300 [&_p]:my-4 [&_p]:leading-relaxed
          [&_ul]:list-none [&_ul]:pl-0 [&_ul]:my-6 [&_ul]:space-y-4
          [&_li]:relative [&_li]:pl-6 [&_li]:text-gray-300 [&_li]:leading-relaxed
          [&_li::before]:content-['✦'] [&_li::before]:absolute [&_li::before]:left-0 [&_li::before]:text-yellow-500 [&_li::before]:text-sm
          [&_strong]:text-white [&_strong]:font-black
          [&_em]:text-yellow-500/70 [&_em]:text-sm [&_em]:font-bold [&_em]:uppercase [&_em]:tracking-widest
          [&_em]:not-italic
        ">
          <p><em>Last updated: June 07, 2023</em></p>

          <p>This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.</p>

          <p>We use Your Personal data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.</p>

          <h2>Interpretation and Definitions</h2>

          <h3>Interpretation</h3>
          <p>The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.</p>

          <h3>Definitions</h3>
          <p>For the purposes of this Privacy Policy:</p>

          <ul>
            <li><strong>Account</strong> means a unique account created for You to access our Service or parts of our Service.</li>
            <li><strong>Affiliate</strong> means an entity that controls, is controlled by or is under common control with a party, where "control" means ownership of 50% or more of the shares, equity interest or other securities entitled to vote for election of directors or other managing authority.</li>
            <li><strong>Application</strong> refers to Crore Bet, the software program provided by the Company.</li>
            <li><strong>Company</strong> (referred to as either "the Company", "We", "Us" or "Our" in this Agreement) refers to Crore Bet.</li>
            <li><strong>Country</strong> refers to: Uttar Pradesh, India</li>
            <li><strong>Device</strong> means any device that can access the Service such as a computer, a cellphone or a digital tablet.</li>
            <li><strong>Personal Data</strong> is any information that relates to an identified or identifiable individual.</li>
            <li><strong>Service</strong> refers to the Application.</li>
            <li><strong>Service Provider</strong> means any natural or legal person who processes the data on behalf of the Company. It refers to third-party companies or individuals employed by the Company to facilitate the Service, to provide the Service on behalf of the Company, to perform services related to the Service or to assist the Company in analyzing how the Service is used.</li>
            <li><strong>Usage Data</strong> refers to data collected automatically, either generated by the use of the Service or from the Service infrastructure itself (for example, the duration of a page visit).</li>
            <li><strong>You</strong> means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.</li>
          </ul>

          <h2>Collecting and Using Your Personal Data</h2>

          <h3>Types of Data Collected</h3>

          <h4>Personal Data</h4>
          <p>While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You. Personally identifiable information may include, but is not limited to:</p>
          <ul>
            <li>Email address</li>
            <li>First name and last name</li>
            <li>Phone number</li>
            <li>Usage Data</li>
          </ul>

          <h4>Usage Data</h4>
          <p>Usage Data is collected automatically when using the Service.</p>
          <p>Usage Data may include information such as Your Device's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that You visit, the time and date of Your visit, the time spent on those pages, unique device identifiers and other diagnostic data.</p>
          <p>When You access the Service by or through a mobile device, We may collect certain information automatically, including, but not limited to, the type of mobile device You use, Your mobile device unique ID, the IP address of Your mobile device, Your mobile operating system, the type of mobile Internet browser You use, unique device identifiers and other diagnostic data.</p>
          <p>We may also collect information that Your browser sends whenever You visit our Service or when You access the Service by or through a mobile device.</p>

          <h3>Use of Your Personal Data</h3>
          <p>The Company may use Personal Data for the following purposes:</p>
          <ul>
            <li><strong>To provide and maintain our Service</strong>, including to monitor the usage of our Service.</li>
            <li><strong>To manage Your Account:</strong> to manage Your registration as a user of the Service. The Personal Data You provide can give You access to different functionalities of the Service that are available to You as a registered user.</li>
            <li><strong>For the performance of a contract:</strong> the development, compliance and undertaking of the purchase contract for the products, items or services You have purchased or of any other contract with Us through the Service.</li>
            <li><strong>To contact You:</strong> To contact You by email, telephone calls, SMS, or other equivalent forms of electronic communication, such as a mobile application's push notifications regarding updates or informative communications related to the functionalities, products or contracted services, including the security updates, when necessary or reasonable for their implementation.</li>
            <li><strong>To provide You</strong> with news, special offers and general information about other goods, services and events which we offer that are similar to those that you have already purchased or enquired about unless You have opted not to receive such information.</li>
            <li><strong>To manage Your requests:</strong> To attend and manage Your requests to Us.</li>
            <li><strong>For business transfers:</strong> We may use Your information to evaluate or conduct a merger, divestiture, restructuring, reorganization, dissolution, or other sale or transfer of some or all of Our assets, whether as a going concern or as part of bankruptcy, liquidation, or similar proceeding, in which Personal Data held by Us about our Service users is among the assets transferred.</li>
            <li><strong>For other purposes:</strong> We may use Your information for other purposes, such as data analysis, identifying usage trends, determining the effectiveness of our promotional campaigns and to evaluate and improve our Service, products, services, marketing and your experience.</li>
          </ul>
        </article>
      </div>

      <div className="text-center text-xs text-gray-900 font-bold mt-8">
        Last updated: June 07, 2023
      </div>
    </div>
    </div>
  );
}

// ============================================================
// EmberField — floating ember particles (from Home)
// ============================================================
function EmberField() {
  const sparks = Array.from({ length: 20 });
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      {sparks.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 15;
        const duration = 10 + Math.random() * 15;
        const size = 3 + Math.random() * 6;
        return (
          <span
            key={i}
            className="absolute rounded-full bg-yellow-400 shadow-[0_0_10px_#facc15]"
            style={{
              left: `${left}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              width: `${size}px`,
              height: `${size}px`,
              animation: 'rise-sparkle linear infinite',
            }}
          />
        );
      })}
    </div>
  );
}
